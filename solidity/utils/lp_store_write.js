const fs = require("fs");
const os = require("os");
const Web3 = require("web3");
const path = require("path");

const NODE_ADDRESS = process.argv[2];
const PRIVATE_KEY  = process.argv[3];

const PROTECTED_LIQUIDITIES_FILE_NAME = "protected_liquidities.csv";
const LOCKED_BALANCES_FILE_NAME       = "locked_balances.csv";
const SYSTEM_BALANCES_FILE_NAME       = "system_balances.csv";

const BATCH_SIZE = 100;

const MIN_GAS_LIMIT = 100000;

const ROLE_OWNER = Web3.utils.keccak256("ROLE_OWNER");
const ROLE_GOVERNOR = Web3.utils.keccak256("ROLE_GOVERNOR");
const ROLE_MINTER = Web3.utils.keccak256("ROLE_MINTER");
const ROLE_MINTED_TOKENS_ADMIN = Web3.utils.keccak256("ROLE_MINTED_TOKENS_ADMIN");

const CFG_FILE_NAME = "migration.json";
const ARTIFACTS_DIR = path.resolve(__dirname, '../build');

function getConfig() {
    return JSON.parse(fs.readFileSync(CFG_FILE_NAME, {encoding: "utf8"}));
}

function setConfig(record) {
    fs.writeFileSync(CFG_FILE_NAME, JSON.stringify({...getConfig(), ...record}, null, 4));
}

async function scan(message) {
    process.stdout.write(message);
    return await new Promise((resolve, reject) => {
        process.stdin.resume();
        process.stdin.once("data", (data) => {
            process.stdin.pause();
            resolve(data.toString().trim());
        });
    });
}

async function getGasPrice(web3) {
    while (true) {
        const nodeGasPrice = await web3.eth.getGasPrice();
        const userGasPrice = await scan(`Enter gas-price or leave empty to use ${nodeGasPrice}: `);
        if (/^\d+$/.test(userGasPrice)) {
            return userGasPrice;
        }
        if (userGasPrice === "") {
            return nodeGasPrice;
        }
        console.log("Illegal gas-price");
    }
}

async function getTransactionReceipt(web3) {
    while (true) {
        const hash = await scan("Enter transaction-hash or leave empty to retry: ");
        if (/^0x([0-9A-Fa-f]{64})$/.test(hash)) {
            const receipt = await web3.eth.getTransactionReceipt(hash);
            if (receipt) {
                return receipt;
            }
            console.log("Invalid transaction-hash");
        }
        else if (hash) {
            console.log("Illegal transaction-hash");
        }
        else {
            return null;
        }
    }
}

async function send(web3, account, gasPrice, transaction, value = 0) {
    while (true) {
        try {
            const tx = {
                to: transaction._parent._address,
                data: transaction.encodeABI(),
                gas: Math.max(await transaction.estimateGas({from: account.address, value: value}), MIN_GAS_LIMIT),
                gasPrice: gasPrice || (await getGasPrice(web3)),
                chainId: await web3.eth.net.getId(),
                value: value
            };
            const signed = await web3.eth.accounts.signTransaction(tx, account.privateKey);
            const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
            return receipt;
        }
        catch (error) {
            console.log(error.message);
            const receipt = await getTransactionReceipt(web3);
            if (receipt) {
                return receipt;
            }
        }
    }
}

async function deploy(web3, account, gasPrice, contractId, contractName, contractArgs) {
    if (getConfig()[contractId] === undefined) {
        const abi = fs.readFileSync(path.join(ARTIFACTS_DIR, contractName + ".abi"), {encoding: "utf8"});
        const bin = fs.readFileSync(path.join(ARTIFACTS_DIR, contractName + ".bin"), {encoding: "utf8"});
        const contract = new web3.eth.Contract(JSON.parse(abi));
        const options = {data: "0x" + bin, arguments: contractArgs};
        const transaction = contract.deploy(options);
        const receipt = await send(web3, account, gasPrice, transaction);
        const args = transaction.encodeABI().slice(options.data.length);
        console.log(`${contractId} deployed at ${receipt.contractAddress}`);
        setConfig({
            [contractId]: {
                name: contractName,
                addr: receipt.contractAddress,
                args: args
            }
        });
    }
    return deployed(web3, contractName, getConfig()[contractId].addr);
}

function deployed(web3, contractName, contractAddr) {
    const abi = fs.readFileSync(path.join(ARTIFACTS_DIR, contractName + ".abi"), {encoding: "utf8"});
    return new web3.eth.Contract(JSON.parse(abi), contractAddr);
}

async function run() {
    const web3 = new Web3(NODE_ADDRESS);

    const gasPrice = await getGasPrice(web3);
    const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
    const web3Func = (func, ...args) => func(web3, account, gasPrice, ...args);

    let phase = 0;
    if (getConfig().phase === undefined) {
        setConfig({phase});
    }

    const execute = async (transaction, ...args) => {
        if (getConfig().phase === phase++) {
            await web3Func(send, transaction, ...args);
            console.log(`phase ${phase} executed`);
            setConfig({phase});
        }
    };

    const store = await web3Func(deploy, 'liquidityProtectionStore', 'LiquidityProtectionStore', []);
    const lines = fs.readFileSync(PROTECTED_LIQUIDITIES_FILE_NAME, {encoding: "utf8"}).split(os.EOL).slice(1, -1);
    for (let i = 0; i < lines.length; i += BATCH_SIZE) {
        const entries = lines.slice(i, i + BATCH_SIZE).map(line => line.split(","));
        const values = [...Array(entries[0].length).keys()].map(n => entries.map(entry => entry[n]));
        await execute(store.methods.seed_protectedLiquidities(...values));
    }
}

run();