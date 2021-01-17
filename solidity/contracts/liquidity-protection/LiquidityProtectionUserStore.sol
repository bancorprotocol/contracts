// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.6.12;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./interfaces/ILiquidityProtectionUserStore.sol";
import "../utility/Utils.sol";

/**
 * @dev This contract aggregates the user balances of the liquidity protection mechanism.
 */
contract LiquidityProtectionUserStore is ILiquidityProtectionUserStore, AccessControl, Utils {
    using SafeMath for uint256;

    uint256 private constant MAX_UINT128 = 2**128 - 1;
    uint256 private constant MAX_UINT112 = 2**112 - 1;
    uint256 private constant MAX_UINT32 = 2**32 - 1;

    bytes32 public constant ROLE_SUPERVISOR = keccak256("ROLE_SUPERVISOR");
    bytes32 public constant ROLE_OWNER = keccak256("ROLE_OWNER");

    struct Position {
        address provider; // liquidity provider
        uint256 index; // index in the provider liquidity ids array
        IDSToken poolToken; // pool token address
        IERC20Token reserveToken; // reserve token address
        uint128 poolAmount; // pool token amount
        uint128 reserveAmount; // reserve token amount
        uint256 reserveRateInfo; // reserve rate details:
        // bits 0...111 represent the numerator of the rate between the protected reserve token and the other reserve token
        // bits 111...223 represent the denominator of the rate between the protected reserve token and the other reserve token
        // bits 224...255 represent the update-time of the rate between the protected reserve token and the other reserve token
        // where `numerator / denominator` gives the worth of one protected reserve token in units of the other reserve token
    }

    struct LockedBalance {
        uint256 amount; // amount of network tokens
        uint256 expirationTime; // lock expiration time
    }

    // position by provider
    uint256 private nextPositionId;
    mapping(address => uint256[]) private positionIdsByProvider;
    mapping(uint256 => Position) private positions;

    // user locked network token balances
    mapping(address => LockedBalance[]) private lockedBalances;

    // allows execution only by an owner
    modifier ownerOnly {
        _hasRole(ROLE_OWNER);
        _;
    }

    // error message binary size optimization
    function _hasRole(bytes32 role) internal view {
        require(hasRole(role, msg.sender), "ERR_ACCESS_DENIED");
    }

    /**
     * @dev triggered when a position is added
     *
     * @param _id              position id
     * @param _provider        liquidity provider
     * @param _poolToken       pool token address
     * @param _reserveToken    reserve token address
     * @param _poolAmount      amount of pool tokens
     * @param _reserveAmount   amount of reserve tokens
     */
    event PositionAdded(
        uint256 _id,
        address indexed _provider,
        IDSToken indexed _poolToken,
        IERC20Token indexed _reserveToken,
        uint256 _poolAmount,
        uint256 _reserveAmount
    );

    /**
     * @dev triggered when a position is updated
     *
     * @param _id                  position id
     * @param _provider            liquidity provider
     * @param _poolToken           pool token address
     * @param _reserveToken        reserve token address
     * @param _deltaPoolAmount     delta amount of pool tokens
     * @param _deltaReserveAmount  delta amount of reserve tokens
     */
    event PositionUpdated(
        uint256 _id,
        address indexed _provider,
        IDSToken indexed _poolToken,
        IERC20Token indexed _reserveToken,
        int256 _deltaPoolAmount,
        int256 _deltaReserveAmount
    );

    /**
     * @dev triggered when a position is removed
     *
     * @param _id              position id
     * @param _provider        liquidity provider
     * @param _poolToken       pool token address
     * @param _reserveToken    reserve token address
     * @param _poolAmount      amount of pool tokens
     * @param _reserveAmount   amount of reserve tokens
     */
    event PositionRemoved(
        uint256 _id,
        address indexed _provider,
        IDSToken indexed _poolToken,
        IERC20Token indexed _reserveToken,
        uint256 _poolAmount,
        uint256 _reserveAmount
    );

    /**
     * @dev triggered when network tokens are locked
     *
     * @param _provider        provider of the network tokens
     * @param _amount          amount of network tokens
     * @param _expirationTime  lock expiration time
     */
    event BalanceLocked(address indexed _provider, uint256 _amount, uint256 _expirationTime);

    /**
     * @dev triggered when network tokens are unlocked
     *
     * @param _provider    provider of the network tokens
     * @param _amount      amount of network tokens
     */
    event BalanceUnlocked(address indexed _provider, uint256 _amount);

    constructor() public {
        // set up administrative roles
        _setRoleAdmin(ROLE_SUPERVISOR, ROLE_SUPERVISOR);
        _setRoleAdmin(ROLE_OWNER, ROLE_SUPERVISOR);

        // allow the deployer to initially govern the contract
        _setupRole(ROLE_SUPERVISOR, msg.sender);
    }

    /**
     * @dev returns the number of positions for the given provider
     *
     * @param _provider    liquidity provider
     * @return number of positions
     */
    function positionCount(address _provider) external view returns (uint256) {
        return positionIdsByProvider[_provider].length;
    }

    /**
     * @dev returns the list of position ids for the given provider
     *
     * @param _provider    liquidity provider
     * @return position ids
     */
    function positionIds(address _provider) external view returns (uint256[] memory) {
        return positionIdsByProvider[_provider];
    }

    /**
     * @dev returns the id of a position for the given provider at a specific index
     *
     * @param _provider    liquidity provider
     * @param _index       position index
     * @return position id
     */
    function positionId(address _provider, uint256 _index) external view returns (uint256) {
        return positionIdsByProvider[_provider][_index];
    }

    /**
     * @dev returns an existing position details
     *
     * @param _id  position id
     *
     * @return liquidity provider
     * @return pool token address
     * @return reserve token address
     * @return pool token amount
     * @return reserve token amount
     * @return rate of 1 protected reserve token in units of the other reserve token (numerator)
     * @return rate of 1 protected reserve token in units of the other reserve token (denominator)
     * @return timestamp
     */
    function position(uint256 _id)
        external
        view
        override
        returns (
            address,
            IDSToken,
            IERC20Token,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        Position storage pos = positions[_id];
        uint256 reserveRateInfo = pos.reserveRateInfo;
        return (
            pos.provider,
            pos.poolToken,
            pos.reserveToken,
            uint256(pos.poolAmount),
            uint256(pos.reserveAmount),
            decodeReserveRateN(reserveRateInfo),
            decodeReserveRateD(reserveRateInfo),
            decodeReserveRateT(reserveRateInfo)
        );
    }

    /**
     * @dev adds a position
     * can be called only by the contract owner
     *
     * @param _provider        liquidity provider
     * @param _poolToken       pool token address
     * @param _reserveToken    reserve token address
     * @param _poolAmount      pool token amount
     * @param _reserveAmount   reserve token amount
     * @param _reserveRateN    rate of 1 protected reserve token in units of the other reserve token (numerator)
     * @param _reserveRateD    rate of 1 protected reserve token in units of the other reserve token (denominator)
     * @param _timestamp       timestamp
     * @return new position id
     */
    function addPosition(
        address _provider,
        IDSToken _poolToken,
        IERC20Token _reserveToken,
        uint256 _poolAmount,
        uint256 _reserveAmount,
        uint256 _reserveRateN,
        uint256 _reserveRateD,
        uint256 _timestamp
    ) external override ownerOnly returns (uint256) {
        // validate input
        require(
            _provider != address(0) &&
                _provider != address(this) &&
                address(_poolToken) != address(0) &&
                address(_poolToken) != address(this) &&
                address(_reserveToken) != address(0) &&
                address(_reserveToken) != address(this),
            "ERR_INVALID_ADDRESS"
        );
        require(
            _poolAmount > 0 && _reserveAmount > 0 && _reserveRateN > 0 && _reserveRateD > 0 && _timestamp > 0,
            "ERR_ZERO_VALUE"
        );

        // add the position
        uint256[] storage ids = positionIdsByProvider[_provider];
        uint256 id = nextPositionId;
        nextPositionId += 1;

        positions[id] = Position({
            provider: _provider,
            index: ids.length,
            poolToken: _poolToken,
            reserveToken: _reserveToken,
            poolAmount: toUint128(_poolAmount),
            reserveAmount: toUint128(_reserveAmount),
            reserveRateInfo: encodeReserveRateInfo(_reserveRateN, _reserveRateD, _timestamp)
        });

        ids.push(id);

        emit PositionAdded(id, _provider, _poolToken, _reserveToken, _poolAmount, _reserveAmount);
        return id;
    }

    /**
     * @dev updates an existing position pool/reserve amounts
     * can be called only by the contract owner
     *
     * @param _id                  position id
     * @param _newPoolAmount       new pool tokens amount
     * @param _newReserveAmount    new reserve tokens amount
     */
    function updatePositionAmounts(
        uint256 _id,
        uint256 _newPoolAmount,
        uint256 _newReserveAmount
    ) external override ownerOnly greaterThanZero(_newPoolAmount) greaterThanZero(_newReserveAmount) {
        // update the position
        Position storage pos = positions[_id];

        // validate input
        require(pos.provider != address(0), "ERR_INVALID_ID");

        IDSToken poolToken = pos.poolToken;
        IERC20Token reserveToken = pos.reserveToken;
        uint256 prevPoolAmount = uint256(pos.poolAmount);
        uint256 prevReserveAmount = uint256(pos.reserveAmount);
        pos.poolAmount = toUint128(_newPoolAmount);
        pos.reserveAmount = toUint128(_newReserveAmount);

        int256 _deltaPoolAmount = int256(prevPoolAmount) - int256(_newPoolAmount);
        int256 _deltaReserveAmount = int256(prevReserveAmount) - int256(_newReserveAmount);

        emit PositionUpdated(_id, pos.provider, poolToken, reserveToken, _deltaPoolAmount, _deltaReserveAmount);
    }

    /**
     * @dev removes a position
     * can be called only by the contract owner
     *
     * @param _id  position id
     */
    function removePosition(uint256 _id) external override ownerOnly {
        // remove the position
        Position storage pos = positions[_id];

        // validate input
        address provider = pos.provider;
        require(provider != address(0), "ERR_INVALID_ID");

        uint256 index = pos.index;
        IDSToken poolToken = pos.poolToken;
        IERC20Token reserveToken = pos.reserveToken;
        uint256 poolAmount = uint256(pos.poolAmount);
        uint256 reserveAmount = uint256(pos.reserveAmount);
        delete positions[_id];

        uint256[] storage ids = positionIdsByProvider[provider];
        uint256 length = ids.length;
        assert(length > 0);

        uint256 lastIndex = length - 1;
        if (index < lastIndex) {
            uint256 lastId = ids[lastIndex];
            ids[index] = lastId;
            positions[lastId].index = index;
        }

        ids.pop();

        emit PositionRemoved(_id, provider, poolToken, reserveToken, poolAmount, reserveAmount);
    }

    /**
     * @dev returns the number of network token locked balances for a given provider
     *
     * @param _provider    locked balances provider
     * @return the number of network token locked balances
     */
    function lockedBalanceCount(address _provider) external view returns (uint256) {
        return lockedBalances[_provider].length;
    }

    /**
     * @dev returns an existing locked network token balance details
     *
     * @param _provider    locked balances provider
     * @param _index       start index
     * @return amount of network tokens
     * @return lock expiration time
     */
    function lockedBalance(address _provider, uint256 _index) external view override returns (uint256, uint256) {
        LockedBalance storage balance = lockedBalances[_provider][_index];
        return (balance.amount, balance.expirationTime);
    }

    /**
     * @dev returns a range of locked network token balances for a given provider
     *
     * @param _provider    locked balances provider
     * @param _startIndex  start index
     * @param _endIndex    end index (exclusive)
     * @return locked amounts
     * @return expiration times
     */
    function lockedBalanceRange(
        address _provider,
        uint256 _startIndex,
        uint256 _endIndex
    ) external view override returns (uint256[] memory, uint256[] memory) {
        // limit the end index by the number of locked balances
        if (_endIndex > lockedBalances[_provider].length) {
            _endIndex = lockedBalances[_provider].length;
        }

        // ensure that the end index is higher than the start index
        require(_endIndex > _startIndex, "ERR_INVALID_INDICES");

        // get the locked balances for the given range and return them
        uint256 length = _endIndex - _startIndex;
        uint256[] memory amounts = new uint256[](length);
        uint256[] memory expirationTimes = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            LockedBalance storage balance = lockedBalances[_provider][_startIndex + i];
            amounts[i] = balance.amount;
            expirationTimes[i] = balance.expirationTime;
        }

        return (amounts, expirationTimes);
    }

    /**
     * @dev adds a locked network token balance
     * can be called only by the contract owner
     *
     * @param _provider        liquidity provider
     * @param _amount          token amount
     * @param _expirationTime  lock expiration time
     * @return new locked balance index
     */
    function addLockedBalance(
        address _provider,
        uint256 _amount,
        uint256 _expirationTime
    )
        external
        override
        ownerOnly
        validAddress(_provider)
        notThis(_provider)
        greaterThanZero(_amount)
        greaterThanZero(_expirationTime)
        returns (uint256)
    {
        lockedBalances[_provider].push(LockedBalance({ amount: _amount, expirationTime: _expirationTime }));

        emit BalanceLocked(_provider, _amount, _expirationTime);
        return lockedBalances[_provider].length - 1;
    }

    /**
     * @dev removes a locked network token balance
     * can be called only by the contract owner
     *
     * @param _provider    liquidity provider
     * @param _index       index of the locked balance
     */
    function removeLockedBalance(address _provider, uint256 _index)
        external
        override
        ownerOnly
        validAddress(_provider)
    {
        LockedBalance[] storage balances = lockedBalances[_provider];
        uint256 length = balances.length;

        // validate input
        require(_index < length, "ERR_INVALID_INDEX");

        uint256 amount = balances[_index].amount;
        uint256 lastIndex = length - 1;
        if (_index < lastIndex) {
            balances[_index] = balances[lastIndex];
        }

        balances.pop();

        emit BalanceUnlocked(_provider, amount);
    }

    function toUint128(uint256 _amount) private pure returns (uint128) {
        require(_amount <= MAX_UINT128, "ERR_AMOUNT_TOO_HIGH");
        return uint128(_amount);
    }

    function encodeReserveRateInfo(
        uint256 _reserveRateN,
        uint256 _reserveRateD,
        uint256 _reserveRateT
    ) private pure returns (uint256) {
        assert(_reserveRateN <= MAX_UINT112 && _reserveRateD <= MAX_UINT112 && _reserveRateT <= MAX_UINT32);
        return _reserveRateN | (_reserveRateD << 112) | (_reserveRateT << 224);
    }

    function decodeReserveRateN(uint256 _reserveRateInfo) private pure returns (uint256) {
        return _reserveRateInfo & MAX_UINT112;
    }

    function decodeReserveRateD(uint256 _reserveRateInfo) private pure returns (uint256) {
        return (_reserveRateInfo >> 112) & MAX_UINT112;
    }

    function decodeReserveRateT(uint256 _reserveRateInfo) private pure returns (uint256) {
        return _reserveRateInfo >> 224;
    }
}
