pragma solidity ^0.4.18;
import './Utils.sol';
import './ERC20Token.sol';
import './interfaces/IFinancieCore.sol';
import './interfaces/IFinancieIssuerToken.sol';

/**
* Financie Card Token implementation
*/
contract FinancieCardToken is ERC20Token, IFinancieIssuerToken {
    uint256 private constant FIXED_INITIAL_SUPPLY = 20000000 * 1 ether;

    IFinancieCore core;
    address issuer;

    /**
        @dev constructor

        @param _name        token name
        @param _symbol      token symbol
    */
    function FinancieCardToken(string _name, string _symbol, address _issuer, address _core)
        public
        ERC20Token(_name, _symbol, 18) {
        totalSupply = FIXED_INITIAL_SUPPLY;
        balanceOf[msg.sender] = FIXED_INITIAL_SUPPLY;

        issuer = _issuer;

        core = IFinancieCore(_core);
    }

    function burnFrom(address _from, uint256 _amount) public {
        assert(transferFrom(_from, msg.sender, _amount));
        require(balanceOf[msg.sender] >= _amount);
        balanceOf[msg.sender] = safeSub(balanceOf[msg.sender], _amount);
        totalSupply = safeSub(totalSupply, _amount);

        core.notifyBurnCards(_from, _amount);
    }

    function burn(uint256 _amount) public {
        require(balanceOf[msg.sender] >= _amount);
        balanceOf[msg.sender] = safeSub(balanceOf[msg.sender], _amount);
        totalSupply = safeSub(totalSupply, _amount);

        core.notifyBurnCards(msg.sender, _amount);
    }

    function getIssuer() public returns(address) {
        return issuer;
    }

}
