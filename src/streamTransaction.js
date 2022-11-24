const Web3 = require('web3'); //it is a library to connect and interact with ethereum blockchain
const async = require('async'); // it is a library to create asnychronous threads for loop 

const config = require('../config/config'); //importing config file

let addressToWatch = ['0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D','0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'] // defining some ethereum addressess for tracking transactions

//creating a web3 socket instance 
const web3Socket = new Web3(new Web3.providers.WebsocketProvider(config.evmWSLink));

//creating a http instance of web3
const web3 = new Web3(new Web3.providers.HttpProvider(config.evmNodeLink));

//creating a subscription object of newBlockHeaders 
var subscription = web3Socket.eth.subscribe('newBlockHeaders', function(error, result){
    if(error) {
        console.log(error);
    }
})

//logic for tracing the transaction in ethereum blockchain in realtime

async function main(addressToWatch) {

    //starting the subscription
    subscription.on("data",async function(blockHeader){
        console.log(blockHeader.number);
        //getting the whole transactions in a perticule blockchain
        latestBlockData = await web3.eth.getBlock(blockHeader.number);
        console.log(latestBlockData);
        //traversing the whole transaction
        await async.eachLimit(latestBlockData.transactions, 200,async (transactionAddress) => {
            try {
                //getting whole transaction details by the transaction hash
                let transactionDetails = await web3.eth.getTransaction(transactionAddress);
                //matching the transaction source and destination with our addrresses
                if((transactionDetails.to in addressToWatch) || (transactionDetails.from in addressToWatch)) {
                    console.log(transactionDetails,'Transaction Found for client!!!!!');
                }
            } catch (error) {
                console.log(error);
            }
        })
    })
}

(async () => {
    main(addressToWatch);
})();



