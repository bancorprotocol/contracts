/* global artifacts, contract, before, it, assert */
/* eslint-disable prefer-reflect */

const FinancieBancorConverter = artifacts.require('FinancieBancorConverter.sol');
const SmartToken = artifacts.require('SmartToken.sol');
const BancorFormula = artifacts.require('BancorFormula.sol');
const BancorGasPriceLimit = artifacts.require('BancorGasPriceLimit.sol');
const BancorQuickConverter = artifacts.require('BancorQuickConverter.sol');
const BancorConverterExtensions = artifacts.require('BancorConverterExtensions.sol');
const FinanciePlatformToken = artifacts.require('FinanciePlatformToken.sol');
const FinancieCardToken = artifacts.require('FinancieCardToken.sol');
const utils = require('./helpers/Utils');

const FinancieCore = artifacts.require('FinancieCore.sol');

const DutchAuction = artifacts.require('DutchAuction.sol');
const DutchAuctionPF = artifacts.require('DutchAuctionPF.sol');

const weight10Percent = 100000;
const gasPrice = 22000000000;
const gasPriceBad = 22000000001;

let token;
let tokenAddress;
let converterExtensionsAddress;
let platformToken;
let connectorToken;
let connectorToken2;
let platformTokenAddress;
let connectorTokenAddress;
let connectorTokenAddress2;
let converter;
let financieCore;

var auction;

// used by purchase/sale tests
async function initConverter(accounts, activate, maxConversionFee = 0) {
    platformToken = await FinanciePlatformToken.new('PF Token', 'ERC PF', 10000000000 * (10 ** 18));
    platformTokenAddress = platformToken.address;
    new Promise(() => console.log('[initConverter]PF Token:' + platformTokenAddress));
}

contract('BancorConverter', (accounts) => {
    before(async () => {
        let formula = await BancorFormula.new();
        let gasPriceLimit = await BancorGasPriceLimit.new(gasPrice);
        let quickConverter = await BancorQuickConverter.new();
        let converterExtensions = await BancorConverterExtensions.new(formula.address, gasPriceLimit.address, quickConverter.address);
        converterExtensionsAddress = converterExtensions.address;
        new Promise(() => console.log('[BancorConverter]Converter Extension:' + converterExtensionsAddress));
    });

    it('verifies that getReturn returns a valid amount', async () => {
        converter = await initConverter(accounts, true);
    });

});

contract('FinancieCore', (accounts) => {
    before(async () => {
        financieCore = await FinancieCore.new(platformTokenAddress);
        await financieCore.activateTargetContract(platformTokenAddress, true);
        new Promise(() => console.log('[initFinancier]FinancieCore:' + financieCore.address));
    });

    it('setup financie core', async () => {
        // 実験的販売
        await platformToken.transfer(financieCore.address, 100000000 * (10 ** 18));

    });
});
