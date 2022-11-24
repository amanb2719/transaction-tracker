
const Web3 = require('web3');
const async = require('async');
const config = require('../config/config');


//creating websocket connection with infura wss
const web3Socket = new Web3(new Web3.providers.WebsocketProvider(config.evmWSLink));



//creating http connection witn infura
const web3 = new Web3(new Web3.providers.HttpProvider(config.evmNodeLink));

//to store transaction temporary for manupulation
const inputDataArray = [];
const inputDataObject = {};

//creating subscription instance
var subscription = web3Socket.eth.subscribe('newBlockHeaders', function(error, result){
    if (error) {
        console.log(error);
    }
})



//turning up the subscription and fetching block object via block number

async function getBlockObject() {
    subscription.on("data", async function(blockHeader){
        console.log(blockHeader.number);
        latestBlockData = await web3.eth.getBlock(blockHeader.number)
        // console.log(latestBlockData,'Current Block Data')
        getTransactionObject(latestBlockData);
    })
}

//traversing the whole transactions of a block and finding the uniswapV2 transaction
async function getTransactionObject(latestBlockData){
    await async.eachLimit(latestBlockData.transactions, 100, async (transactionAddress) => {
        try {
            let transactionDetails = await web3.eth.getTransaction(transactionAddress)
            if ((transactionDetails?.to) == config.dex.UNISWAP.contractID || (transactionDetails?.to) == config.dex.SUSHISWAP.contractID) {
                //console.log(transactionDetails,'************************************************')
                inputDataObject[transactionDetails.hash] = {
                    to: transactionDetails.to,
                    from: transactionDetails.from,
                    input: transactionDetails.input,
                    chainName: config.dex.UNISWAP.chainName,
                    amountIn: web3.utils.fromWei(transactionDetails?.value || 0, 'ether'),
                    transactionHash: transactionDetails.hash,
                    chainId: transactionDetails?.chainId || transactionDetails.v,
                    transactionIndex: transactionDetails.transactionIndex,
                    blockNumber: transactionDetails.blockNumber,
                    dexId: config.dex.UNISWAP.dexId
                };
            }
        } catch (err) {
            console.log({ message: 'async block', err });
        }
    });
    Object.keys(inputDataObject).forEach((key) => {
        inputDataArray.push(inputDataObject[key]);
    })
   // console.log(inputDataArray);
    await dataDecoder();
}

// decoding the transaction input to check transaction is made for only swapping,
// decode the parameters and insert it into database
async function dataDecoder() {
    for (let i = 0; i < inputDataArray.length; i++) {
        let functionHash = await inputDataArray[i].input.substr(0, 10)
        console.log(functionHash,'$$$$$$$$$$')
        let params;
        if (functionHash in config.dex.UNISWAP.method) {
            params = await web3.eth.abi.decodeParameters(config.dex.UNISWAP.method[functionHash], inputDataArray[i].input.substr(10, inputDataArray[i].input.length));
            //console.log(params,'-------++++++++')
            if(functionHash == '0xfb3bdb41' || functionHash == '0x7ff36ab5' || functionHash == '0xb6f9de95'){
                inputDataObject[inputDataArray[i].transactionHash].amountOut = web3.utils.fromWei(params[0], 'ether')
                inputDataObject[inputDataArray[i].transactionHash].initialToken = params[1][0];
                inputDataObject[inputDataArray[i].transactionHash].finalToken = params[1][params[1].length-1]
            }
            else{
               // console.log(params[0],params[1],'params after decode')
                inputDataObject[inputDataArray[i].transactionHash].amountIn = params[0];
                inputDataObject[inputDataArray[i].transactionHash].amountOut = web3.utils.fromWei(params[1], 'ether')
                inputDataObject[inputDataArray[i].transactionHash].initialToken = params[2][0];
                inputDataObject[inputDataArray[i].transactionHash].finalToken = params[2][params[2].length-1]
            }
        }

        console.log('-----',inputDataObject[inputDataArray[i].transactionHash],'------')
    }
}

(async () => {
    await getBlockObject();
})();
