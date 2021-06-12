import { ethers } from 'hardhat';
import { Contract as OldContract, ContractFactory, Overrides as OldOverrides } from '@ethersproject/contracts';
import { Signer } from '@ethersproject/abstract-signer';

import {
    BancorNetwork,
    BancorNetwork__factory,
    BancorX,
    BancorX__factory,
    CheckpointStore,
    CheckpointStore__factory,
    ContractRegistry,
    ContractRegistry__factory,
    ConversionPathFinder,
    ConversionPathFinder__factory,
    ConverterFactory,
    ConverterFactory__factory,
    ConverterRegistry,
    ConverterRegistryData,
    ConverterRegistryData__factory,
    ConverterRegistry__factory,
    ConverterUpgrader,
    ConverterUpgrader__factory,
    ConverterV27OrLowerWithFallback,
    ConverterV27OrLowerWithFallback__factory,
    ConverterV28OrHigherWithFallback,
    ConverterV28OrHigherWithFallback__factory,
    ConverterV28OrHigherWithoutFallback,
    ConverterV28OrHigherWithoutFallback__factory,
    DSToken,
    DSToken__factory,
    ERC20,
    ERC20__factory,
    IConverterAnchor,
    LiquidityProtection,
    LiquidityProtectionSettings,
    LiquidityProtectionSettings__factory,
    LiquidityProtectionStats,
    LiquidityProtectionStats__factory,
    LiquidityProtectionStore,
    LiquidityProtectionStore__factory,
    LiquidityProtectionSystemStore,
    LiquidityProtectionSystemStore__factory,
    LiquidityProtection__factory,
    NetworkSettings,
    NetworkSettings__factory,
    Owned,
    Owned__factory,
    StakingRewards,
    StakingRewardsStore,
    StakingRewardsStore__factory,
    StakingRewards__factory,
    StandardPoolConverter,
    StandardPoolConverterFactory,
    StandardPoolConverterFactory__factory,
    StandardPoolConverter__factory,
    TestBancorNetwork,
    TestBancorNetwork__factory,
    TestCheckpointStore,
    TestCheckpointStore__factory,
    TestContractRegistryClient,
    TestContractRegistryClient__factory,
    TestConverterFactory,
    TestConverterFactory__factory,
    TestConverterRegistry,
    TestConverterRegistry__factory,
    TestLiquidityProtection,
    TestLiquidityProtection__factory,
    TestLiquidityProvisionEventsSubscriber,
    TestLiquidityProvisionEventsSubscriber__factory,
    TestMathEx,
    TestMathEx__factory,
    TestNonStandardToken,
    TestNonStandardToken__factory,
    TestReserveToken,
    TestReserveToken__factory,
    TestSafeERC20Ex,
    TestSafeERC20Ex__factory,
    TestStakingRewards,
    TestStakingRewardsStore,
    TestStakingRewardsStore__factory,
    TestStakingRewards__factory,
    TestStandardPoolConverter,
    TestStandardPoolConverterFactory,
    TestStandardPoolConverterFactory__factory,
    TestStandardPoolConverter__factory,
    TestStandardToken,
    TestStandardToken__factory,
    TestTokenGovernance,
    TestTokenGovernance__factory,
    TestTransferPositionCallback,
    TestTransferPositionCallback__factory,
    TestTypedConverterAnchorFactory,
    TestTypedConverterAnchorFactory__factory,
    TokenGovernance,
    TokenGovernance__factory,
    TokenHolder,
    TokenHolder__factory,
    VortexBurner,
    VortexBurner__factory
} from 'typechain';

// Replace type of the last param of a function
type LastIndex<T extends readonly any[]> = ((...t: T) => void) extends (x: any, ...r: infer R) => void
    ? Exclude<keyof T, keyof R>
    : never;
type ReplaceLastParam<TParams extends readonly any[], TReplace> = {
    [K in keyof TParams]: K extends LastIndex<TParams> ? TReplace : TParams[K];
};
type ReplaceLast<F, TReplace> = F extends (...args: infer T) => infer R
    ? (...args: ReplaceLastParam<T, TReplace>) => R
    : never;

export type Overrides = OldOverrides & { from?: Signer };
export type Contract = OldContract & { __contractName__: string };

const deployOrAttach = <C extends Contract, F extends ContractFactory>(
    deployParamLength: number,
    contractName: string,
    passedSigner?: Signer
) => {
    type ParamsTypes = ReplaceLast<F['deploy'], Overrides>;

    return {
        deploy: async (...args: Parameters<ParamsTypes>): Promise<C> => {
            let defaultSigner = passedSigner ? passedSigner : (await ethers.getSigners())[0];

            // If similar then last param is override
            if (args.length != 0 && args.length === deployParamLength) {
                const overrides = args.pop() as Overrides;

                const contractFactory = await ethers.getContractFactory(
                    contractName,
                    overrides.from ? overrides.from : defaultSigner
                );
                delete overrides.from;

                const contract = (await contractFactory.deploy(...args, overrides)) as C;
                contract.__contractName__ = contractName;
                return contract;
            }
            const contract = (await (
                await ethers.getContractFactory(contractName, defaultSigner)
            ).deploy(...args)) as C;
            contract.__contractName__ = contractName;
            return contract;
        },
        attach: attachOnly<C>(contractName, passedSigner).attach
    };
};

const attachOnly = <C extends Contract>(contractName: string, passedSigner?: Signer) => {
    return {
        attach: async (address: string, signer?: Signer): Promise<C> => {
            let defaultSigner = passedSigner ? passedSigner : (await ethers.getSigners())[0];
            const contract = (await ethers.getContractAt(contractName, address, signer ? signer : defaultSigner)) as C;
            contract.__contractName__ = contractName;
            return contract;
        }
    };
};

export type ContractTypes =
    | Contract
    | BancorNetwork
    | BancorX
    | CheckpointStore
    | ContractRegistry
    | ConversionPathFinder
    | ConverterFactory
    | ConverterRegistry
    | ConverterRegistryData
    | ConverterUpgrader
    | ConverterV27OrLowerWithFallback
    | ConverterV28OrHigherWithFallback
    | ConverterV28OrHigherWithoutFallback
    | DSToken
    | ERC20
    | IConverterAnchor
    | LiquidityProtection
    | LiquidityProtectionSettings
    | LiquidityProtectionStats
    | LiquidityProtectionStore
    | LiquidityProtectionSystemStore
    | NetworkSettings
    | Owned
    | StakingRewards
    | StakingRewardsStore
    | StandardPoolConverter
    | StandardPoolConverterFactory
    | TestBancorNetwork
    | TestCheckpointStore
    | TestContractRegistryClient
    | TestConverterFactory
    | TestConverterRegistry
    | TestLiquidityProtection
    | TestLiquidityProvisionEventsSubscriber
    | TestMathEx
    | TestNonStandardToken
    | TestReserveToken
    | TestSafeERC20Ex
    | TestStakingRewards
    | TestStakingRewardsStore
    | TestStandardPoolConverter
    | TestStandardPoolConverterFactory
    | TestStandardToken
    | TestTokenGovernance
    | TestTransferPositionCallback
    | TestTypedConverterAnchorFactory
    | TokenGovernance
    | TokenHolder
    | VortexBurner;

type ContractName = { __contractName__: string };

const getContracts = (signer?: Signer) => {
    return {
        connect: (signer: Signer) => getContracts(signer),

        BancorNetwork: deployOrAttach<BancorNetwork & ContractName, BancorNetwork__factory>(
            BancorNetwork__factory.prototype.deploy.length,
            'BancorNetwork',
            signer
        ),
        BancorX: deployOrAttach<BancorX & ContractName, BancorX__factory>(
            BancorX__factory.prototype.deploy.length,
            'BancorX',
            signer
        ),
        CheckpointStore: deployOrAttach<CheckpointStore & ContractName, CheckpointStore__factory>(
            CheckpointStore__factory.prototype.deploy.length,
            'CheckpointStore',
            signer
        ),
        ContractRegistry: deployOrAttach<ContractRegistry & ContractName, ContractRegistry__factory>(
            ContractRegistry__factory.prototype.deploy.length,
            'ContractRegistry',
            signer
        ),
        ConversionPathFinder: deployOrAttach<ConversionPathFinder & ContractName, ConversionPathFinder__factory>(
            ConversionPathFinder__factory.prototype.deploy.length,
            'ConversionPathFinder',
            signer
        ),
        ConverterFactory: deployOrAttach<ConverterFactory & ContractName, ConverterFactory__factory>(
            ConverterFactory__factory.prototype.deploy.length,
            'ConverterFactory',
            signer
        ),
        ConverterRegistry: deployOrAttach<ConverterRegistry & ContractName, ConverterRegistry__factory>(
            ConverterRegistry__factory.prototype.deploy.length,
            'ConverterRegistry',
            signer
        ),
        ConverterRegistryData: deployOrAttach<ConverterRegistryData & ContractName, ConverterRegistryData__factory>(
            ConverterRegistryData__factory.prototype.deploy.length,
            'ConverterRegistryData',
            signer
        ),
        ConverterUpgrader: deployOrAttach<ConverterUpgrader & ContractName, ConverterUpgrader__factory>(
            ConverterUpgrader__factory.prototype.deploy.length,
            'ConverterUpgrader',
            signer
        ),
        ConverterV27OrLowerWithFallback: deployOrAttach<
            ConverterV27OrLowerWithFallback & ContractName,
            ConverterV27OrLowerWithFallback__factory
        >(ConverterV27OrLowerWithFallback__factory.prototype.deploy.length, 'ConverterV27OrLowerWithFallback'),
        ConverterV27OrLowerWithoutFallback: deployOrAttach<Contract & ContractName, ContractFactory>(
            ContractFactory.prototype.deploy.length,
            'ConverterV27OrLowerWithoutFallback',
            signer
        ),
        ConverterV28OrHigherWithFallback: deployOrAttach<
            ConverterV28OrHigherWithFallback & ContractName,
            ConverterV28OrHigherWithFallback__factory
        >(
            ConverterV28OrHigherWithFallback__factory.prototype.deploy.length,
            'ConverterV28OrHigherWithFallback',
            signer
        ),
        ConverterV28OrHigherWithoutFallback: deployOrAttach<
            ConverterV28OrHigherWithoutFallback & ContractName,
            ConverterV28OrHigherWithoutFallback__factory
        >(
            ConverterV28OrHigherWithoutFallback__factory.prototype.deploy.length,
            'ConverterV28OrHigherWithoutFallback',
            signer
        ),
        DSToken: deployOrAttach<DSToken & ContractName, DSToken__factory>(
            DSToken__factory.prototype.deploy.length,
            'DSToken',
            signer
        ),
        ERC20: deployOrAttach<ERC20 & ContractName, ERC20__factory>(
            ERC20__factory.prototype.deploy.length,
            'ERC20',
            signer
        ),
        IConverterAnchor: attachOnly<IConverterAnchor & ContractName>('IConverterAnchor', signer),
        LiquidityProtection: deployOrAttach<LiquidityProtection & ContractName, LiquidityProtection__factory>(
            LiquidityProtection__factory.prototype.deploy.length,
            'LiquidityProtection',
            signer
        ),
        LiquidityProtectionSettings: deployOrAttach<
            LiquidityProtectionSettings & ContractName,
            LiquidityProtectionSettings__factory
        >(LiquidityProtectionSettings__factory.prototype.deploy.length, 'LiquidityProtectionSettings', signer),
        LiquidityProtectionStats: deployOrAttach<
            LiquidityProtectionStats & ContractName,
            LiquidityProtectionStats__factory
        >(LiquidityProtectionStats__factory.prototype.deploy.length, 'LiquidityProtectionStats', signer),
        LiquidityProtectionStore: deployOrAttach<
            LiquidityProtectionStore & ContractName,
            LiquidityProtectionStore__factory
        >(LiquidityProtectionStore__factory.prototype.deploy.length, 'LiquidityProtectionStore', signer),
        LiquidityProtectionSystemStore: deployOrAttach<
            LiquidityProtectionSystemStore & ContractName,
            LiquidityProtectionSystemStore__factory
        >(LiquidityProtectionSystemStore__factory.prototype.deploy.length, 'LiquidityProtectionSystemStore', signer),
        NetworkSettings: deployOrAttach<NetworkSettings & ContractName, NetworkSettings__factory>(
            NetworkSettings__factory.prototype.deploy.length,
            'NetworkSettings',
            signer
        ),
        Owned: deployOrAttach<Owned & ContractName, Owned__factory>(
            Owned__factory.prototype.deploy.length,
            'Owned',
            signer
        ),
        StakingRewards: deployOrAttach<StakingRewards & ContractName, StakingRewards__factory>(
            StakingRewards__factory.prototype.deploy.length,
            'StakingRewards',
            signer
        ),
        StakingRewardsStore: deployOrAttach<StakingRewardsStore & ContractName, StakingRewardsStore__factory>(
            StakingRewardsStore__factory.prototype.deploy.length,
            'StakingRewardsStore',
            signer
        ),
        StandardPoolConverter: deployOrAttach<StandardPoolConverter & ContractName, StandardPoolConverter__factory>(
            StandardPoolConverter__factory.prototype.deploy.length,
            'StandardPoolConverter',
            signer
        ),
        StandardPoolConverterFactory: deployOrAttach<
            StandardPoolConverterFactory & ContractName,
            StandardPoolConverterFactory__factory
        >(StandardPoolConverterFactory__factory.prototype.deploy.length, 'StandardPoolConverterFactory', signer),
        TestBancorNetwork: deployOrAttach<TestBancorNetwork & ContractName, TestBancorNetwork__factory>(
            TestBancorNetwork__factory.prototype.deploy.length,
            'TestBancorNetwork',
            signer
        ),
        TestCheckpointStore: deployOrAttach<TestCheckpointStore & ContractName, TestCheckpointStore__factory>(
            TestCheckpointStore__factory.prototype.deploy.length,
            'TestCheckpointStore',
            signer
        ),
        TestContractRegistryClient: deployOrAttach<
            TestContractRegistryClient & ContractName,
            TestContractRegistryClient__factory
        >(TestContractRegistryClient__factory.prototype.deploy.length, 'TestContractRegistryClient', signer),
        TestConverterFactory: deployOrAttach<TestConverterFactory & ContractName, TestConverterFactory__factory>(
            TestConverterFactory__factory.prototype.deploy.length,
            'TestConverterFactory',
            signer
        ),
        TestConverterRegistry: deployOrAttach<TestConverterRegistry & ContractName, TestConverterRegistry__factory>(
            TestConverterRegistry__factory.prototype.deploy.length,
            'TestConverterRegistry',
            signer
        ),
        TestLiquidityProtection: deployOrAttach<
            TestLiquidityProtection & ContractName,
            TestLiquidityProtection__factory
        >(TestLiquidityProtection__factory.prototype.deploy.length, 'TestLiquidityProtection', signer),
        TestLiquidityProvisionEventsSubscriber: deployOrAttach<
            TestLiquidityProvisionEventsSubscriber & ContractName,
            TestLiquidityProvisionEventsSubscriber__factory
        >(
            TestLiquidityProvisionEventsSubscriber__factory.prototype.deploy.length,
            'TestLiquidityProvisionEventsSubscriber',
            signer
        ),
        TestMathEx: deployOrAttach<TestMathEx & ContractName, TestMathEx__factory>(
            TestMathEx__factory.prototype.deploy.length,
            'TestMathEx',
            signer
        ),
        TestNonStandardToken: deployOrAttach<TestNonStandardToken & ContractName, TestNonStandardToken__factory>(
            TestNonStandardToken__factory.prototype.deploy.length,
            'TestNonStandardToken',
            signer
        ),
        TestReserveToken: deployOrAttach<TestReserveToken & ContractName, TestReserveToken__factory>(
            TestReserveToken__factory.prototype.deploy.length,
            'TestReserveToken',
            signer
        ),
        TestSafeERC20Ex: deployOrAttach<TestSafeERC20Ex & ContractName, TestSafeERC20Ex__factory>(
            TestSafeERC20Ex__factory.prototype.deploy.length,
            'TestSafeERC20Ex',
            signer
        ),
        TestStakingRewards: deployOrAttach<TestStakingRewards & ContractName, TestStakingRewards__factory>(
            TestStakingRewards__factory.prototype.deploy.length,
            'TestStakingRewards',
            signer
        ),
        TestStakingRewardsStore: deployOrAttach<
            TestStakingRewardsStore & ContractName,
            TestStakingRewardsStore__factory
        >(TestStakingRewardsStore__factory.prototype.deploy.length, 'TestStakingRewardsStore', signer),
        TestStandardPoolConverter: deployOrAttach<
            TestStandardPoolConverter & ContractName,
            TestStandardPoolConverter__factory
        >(TestStandardPoolConverter__factory.prototype.deploy.length, 'TestStandardPoolConverter', signer),
        TestStandardPoolConverterFactory: deployOrAttach<
            TestStandardPoolConverterFactory & ContractName,
            TestStandardPoolConverterFactory__factory
        >(
            TestStandardPoolConverterFactory__factory.prototype.deploy.length,
            'TestStandardPoolConverterFactory',
            signer
        ),
        TestStandardToken: deployOrAttach<TestStandardToken & ContractName, TestStandardToken__factory>(
            TestStandardToken__factory.prototype.deploy.length,
            'TestStandardToken',
            signer
        ),
        TestTokenGovernance: deployOrAttach<TestTokenGovernance & ContractName, TestTokenGovernance__factory>(
            TestTokenGovernance__factory.prototype.deploy.length,
            'TestTokenGovernance',
            signer
        ),
        TestTransferPositionCallback: deployOrAttach<
            TestTransferPositionCallback & ContractName,
            TestTransferPositionCallback__factory
        >(TestTransferPositionCallback__factory.prototype.deploy.length, 'TestTransferPositionCallback', signer),
        TestTypedConverterAnchorFactory: deployOrAttach<
            TestTypedConverterAnchorFactory & ContractName,
            TestTypedConverterAnchorFactory__factory
        >(TestTypedConverterAnchorFactory__factory.prototype.deploy.length, 'TestTypedConverterAnchorFactory', signer),
        TokenGovernance: deployOrAttach<TokenGovernance & ContractName, TokenGovernance__factory>(
            TokenGovernance__factory.prototype.deploy.length,
            'TokenGovernance',
            signer
        ),
        TokenHolder: deployOrAttach<TokenHolder & ContractName, TokenHolder__factory>(
            TokenHolder__factory.prototype.deploy.length,
            'TokenHolder',
            signer
        ),
        VortexBurner: deployOrAttach<VortexBurner & ContractName, VortexBurner__factory>(
            VortexBurner__factory.prototype.deploy.length,
            'VortexBurner',
            signer
        )
    };
};

export default getContracts();
