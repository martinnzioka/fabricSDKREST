const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('./utilities/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('./utilities/AppUtil');

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}

const gateway = new Gateway();

async function connectionGateway() {
    try {
        // setup the gateway instance
        // The user will now be able to create connections to the fabric network and be able to
        // submit transactions and query. All transactions submitted by this gateway will be
        // signed by this user using the credentials stored in the wallet.
        await gateway.connect(ccp, {
            wallet,
            identity: org1UserId,
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
        });
    } catch (error) {
        console.error(`******** FAILED to connect to gateway: ${error}`);
        res.send(`******** FAILED to connect to gateway: ${error}`);
    }
}

connectionGateway();

// Build a network instance based on the channel where the smart contract is deployed
const network = async function() {
    return await gateway.getNetwork(channelName);
};

// Get the contract from the network.
const contract = async function() {
    return network.getContract(chaincodeName);
}

// build an in memory object with the network configuration (also known as a connection profile)
const ccp = buildCCPOrg1();

// build an instance of the fabric ca services client based on
// the information in the network configuration
const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

// pre-requisites:
// - fabric-sample two organization test-network setup with two peers, ordering service,
//   and 2 certificate authorities
//         ===> from directory /fabric-samples/test-network
//         ./network.sh up createChannel -ca
// - Use any of the EvaluationMeeting-transfer-basic chaincodes deployed on the channel "mychannel"
//   with the chaincode name of "basic". The following deploy command will package,
//   install, approve, and commit the javascript chaincode, all the actions it takes
//   to deploy a chaincode to a channel.
//         ===> from directory /fabric-samples/test-network
//         ./network.sh deployCC -ccn basic -ccl javascript
// - Be sure that node.js is installed
//         ===> from directory /fabric-samples/EvaluationMeeting-transfer-basic/application-javascript
//         node -v
// - npm installed code dependencies
//         ===> from directory /fabric-samples/EvaluationMeeting-transfer-basic/application-javascript
//         npm install
// - to run this test application
//         ===> from directory /fabric-samples/EvaluationMeeting-transfer-basic/application-javascript
//         node app.js

// NOTE: If you see  kind an error like these:
/*
    2020-08-07T20:23:17.590Z - error: [DiscoveryService]: send[mychannel] - Channel:mychannel received discovery error:access denied
    ******** FAILED to run the application: Error: DiscoveryService: mychannel error: access denied

   OR

   Failed to register user : Error: fabric-ca request register failed with errors [[ { code: 20, message: 'Authentication failure' } ]]
   ******** FAILED to run the application: Error: Identity not found in wallet: appUser
*/
// Delete the /fabric-samples/EvaluationMeeting-transfer-basic/application-javascript/wallet directory
// and retry this application.
//
// The certificate authority must have been restarted and the saved certificates for the
// admin and application user are not valid. Deleting the wallet store will force these to be reset
// with the new certificate authority.
//

/**
 *  A test application to show basic queries operations with any of the EvaluationMeeting-transfer-basic chaincodes
 *   -- How to submit a transaction
 *   -- How to query and check the results
 *
 * To see the SDK workings, try setting the logging to show on the console before running
 *        export HFC_LOGGING='{"debug":"console"}'
 */

async function enrolladmin(req, res, next) {
    try {
		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);

    } catch (error) {
        console.error(`******** FAILED to enroll admin the application: ${error}`);
        res.send(`******** FAILED to enroll admin the application: ${error}`);
        next();
    }
}

async function enrolluser(req, res, next) {
    try {
		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');
 
    } catch (error) {
        console.error(`******** FAILED to enroll user the application: ${error}`);
        res.send(`******** FAILED to enroll user the application: ${error}`);
        next();
    }
}

async function createEvaluationMeeting(req, res, next) {
    try {
        const {} = req.body
        // Now let's try to submit a transaction.
        // This will be sent to both peers and if both peers endorse the transaction, the endorsed proposal will be sent
        // to the orderer to be committed by each of the peer's to the channel ledger.
        console.log('\n--> Submit Transaction: CreateEvaluationMeeting, creates new EvaluationMeeting');
        result = await contract.submitTransaction('CreateEvaluationMeeting');
        // The "submitTransaction" returns the value generated by the chaincode. Notice how we normally do not
        // look at this value as the chaincodes are not returning a value. So for demonstration purposes we
        // have the javascript version of the chaincode return a value on the function 'CreateEvaluationMeeting'.
        // This value will be the same as the 'ReadEvaluationMeeting' results for the newly created EvaluationMeeting.
        // The other chaincode versions could be updated to also return a value.
        // Having the chaincode return a value after after doing a create or update could avoid the application
        // from making an "evaluateTransaction" call to get information on the EvaluationMeeting added by the chaincode
        // during the create or update.
        console.log(`*** Result committed: ${prettyJSONString(result.toString())}`);
        res.send(`*** Result committed: ${prettyJSONString(result.toString())}`)
        
    } catch (error) {
        console.error(`******** FAILED to create a new evaluation meeting: ${error}`);
        res.send(`******** FAILED to create a new evaluation meeting: ${error}`);
        next();
    }
}

async function getEvaluationMeeting(req, res, next) {
    const {} = req.body;
    console.log('\n--> Evaluate Transaction: ReadEvaluationMeeting, function returns an evaluation meeting with a given evaluation-meetingID');
    result = await contract.evaluateTransaction('ReadAsset', 'asset13');
    console.log(`*** Result: ${prettyJSONString(result.toString())}`);
}

async function getAllEvaluationMeeting(req, res, next) {
    const {} = req.body;
    // Let's try a query type operation (function).
    // This will be sent to just one peer and the results will be shown.
    console.log('\n--> Evaluate Transaction: GetAllEvaluationMeeting, function returns all the current meetings on the ledger');
    let result = await contract.evaluateTransaction('GetAllEvaluationMeeting');
    console.log(`*** Result: ${prettyJSONString(result.toString())}`);
}

async function updateEvaluationMeeting(req, res, next) {
    const {} = req.body;
    console.log('\n--> Submit Transaction: UpdateEvaluationMeeting');
    await contract.submitTransaction('UpdateEvaluationMeeting');
    console.log('*** Result: committed');
}

async function evaluationMeetingExists() {
    const {} = req.body;
    console.log('\n--> Evaluate Transaction: EvaluationMeetingExists, function returns an evaluation meeting with a given evaluation-meetingID');
    result = await contract.evaluateTransaction('EvaluationMeetingExists');
    console.log(`*** Result: ${prettyJSONString(result.toString())}`);
}



module.exports = { 
    enrolladmin,
    enrolluser,
    createEvaluationMeeting,
    getEvaluationMeeting,
    getAllEvaluationMeeting,
    updateEvaluationMeeting,
    evaluationMeetingExists 
}