// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.6.12;
import "../../token/interfaces/IDSToken.sol";
import "../../token/interfaces/IERC20Token.sol";

/*
    Liquidity Protection User Store interface
*/
interface ILiquidityProtectionUserStore {
    function position(uint256 _id)
        external
        view
        returns (
            address,
            IDSToken,
            IERC20Token,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        );

    function addPosition(
        address _provider,
        IDSToken _poolToken,
        IERC20Token _reserveToken,
        uint256 _poolAmount,
        uint256 _reserveAmount,
        uint256 _reserveRateN,
        uint256 _reserveRateD,
        uint256 _timestamp
    ) external returns (uint256);

    function updatePositionAmounts(
        uint256 _id,
        uint256 _poolNewAmount,
        uint256 _reserveNewAmount
    ) external;

    function removePosition(uint256 _id) external;

    function lockedBalance(address _provider, uint256 _index) external view returns (uint256, uint256);

    function lockedBalanceRange(
        address _provider,
        uint256 _startIndex,
        uint256 _endIndex
    ) external view returns (uint256[] memory, uint256[] memory);

    function addLockedBalance(
        address _provider,
        uint256 _reserveAmount,
        uint256 _expirationTime
    ) external returns (uint256);

    function removeLockedBalance(address _provider, uint256 _index) external;
}
