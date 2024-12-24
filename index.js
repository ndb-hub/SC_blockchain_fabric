'use strict';

const shim = require('fabric-shim');
const IPFS = require('ipfs-http-client');  // Use IPFS directly
//const ipfs = IPFS.create({ url: 'http://127.0.0.1:5001' });
// const ipfs = IPFS.create({ url: 'https://ipfs.infura.io:5001' });

//const ipfs = IPFS.create({ url: 'http://172.22.67.88:5001'})
//const ipfs = IPFS.create({ url: 'http://ipfs_node:5001' });
'use strict';

const shim = require('fabric-shim');
const IPFS = require('ipfs-http-client');
const ipfs = IPFS.create({ url: 'http://172.18.0.2:5001' });

class BatchContract {

    // Initialize the ledger (optional)
    async Init(stub) {
        console.log('Chaincode Initialized');
        return shim.success();
    }

    

    // Invoke method for routing the request to the correct function
    async Invoke(stub) {
        const ret = stub.getFunctionAndParameters();
        const func = ret.fcn;
        const args = ret.params;

        console.log(`Function called: ${func}, Arguments: ${JSON.stringify(args)}`);

        if (func === 'storeBatchData') {
            return await this.storeBatchData(stub, args);
        } else if (func === 'storeQualityControlData') {
            return await this.storeQualityControlData(stub, args);
        } else if (func === 'storePackagingData') {
            return await this.storePackagingData(stub, args);
        } else if (func === 'storeWarehousingData') {
            return await this.storeWarehousingData(stub, args);
        } else if (func === 'storeTestingData') {
            return await this.storeTestingData(stub, args);
        } else if (func === 'storeDistributionData') {
            return await this.storeDistributionData(stub, args);
        } else if (func === 'storeServiceCenterData') {
            return await this.storeServiceCenterData(stub, args);
        } else if (func === 'queryBatchData') {
            return await this.queryBatchData(stub, args);
        }else if (func === 'queryPackageData') {
            return await this.queryPackageData(stub, args);
        } else if (func === 'getAllKeys') {
            const allKeys = await this.getAllKeys(stub);
            console.log('All keys:', allKeys);
            return shim.success(Buffer.from(JSON.stringify(allKeys)));
        } else if (func === 'detectProcessingFraud') {
            // args[0]: batchNumber
            return await this.detectProcessingFraud(stub, args[0]);
        } else if (func === 'detectQualityControlFraud') {
            // args[0]: batchNumber
            return await this.detectQualityControlFraud(stub, args[0]);
        } else {
            console.error(`No function named ${func} found`);
            return shim.error(new Error(`No function named ${func} found`));
        }
    }
    async getIPFSFile(cid) {
        try {
            const file = await ipfs.cat(cid);
            let content = '';
            for await (const chunk of file) {
                content += String.fromCharCode(...chunk); 
            }
            return content;
        } catch (error) {
            console.error('Error retrieving file from IPFS:', error);
            return null;
        }
    }

    // Function to store batch data (Processing step)
    async storeBatchData(stub, args) {
        if (args.length !== 3) {
            return shim.error('Incorrect number of arguments. Expecting 3: batchNumber, processingDateTime, IPFS_CID');
        }

        const batchNumber = args[0];
        const processingDateTime = args[1];
        const IPFS_CID = args[2];

        const batchData = {
            batchNumber,
            processingDateTime,
            IPFS_CID,
            step: 'Processing'
        };

        await stub.putState(batchNumber, Buffer.from(JSON.stringify(batchData)));
        console.log('Batch Data Stored:', batchData);
        return shim.success(Buffer.from(JSON.stringify(batchData)));
    }

    async storeQualityControlData(stub, args) {
        if (args.length !== 4) {
            return shim.error('Incorrect number of arguments. Expecting 4: batchNumber, testResultsHash, IPFS_CID, testingDateTime');
        }
    
        const batchNumber = args[0];
        const testResultsHash = args[1];
        const IPFS_CID = args[2];
        const testingDateTime = args[3];
    
        // Fetch existing batch data
        let batchDataAsBytes = await stub.getState(batchNumber);
        let batchData;
    
        if (batchDataAsBytes && batchDataAsBytes.length > 0) {
            // Parse existing data
            batchData = JSON.parse(batchDataAsBytes.toString());
            // Ensure "steps" array exists
            batchData.steps = batchData.steps || [];
        } else {
            //return shim.error(`Batch ${batchNumber} not found. Ensure processing stage data exists.`);
            // Initialize new batch data if it doesn't exist
            batchData = {
                batchNumber,
                steps: [],
            };
        }
    
        // Append Quality Control step data
        batchData.steps.push({
            step: 'Quality Control',
            testResultsHash,
            IPFS_CID,
            testingDateTime,
        });
    
        // Save updated batch data
        await stub.putState(batchNumber, Buffer.from(JSON.stringify(batchData)));
        console.log('Updated batch data:', batchData);
        return shim.success(Buffer.from(JSON.stringify(batchData)));
    }
    


    // 3. Packaging Step
    async storePackagingData(stub, args) {
        if (args.length !== 4) {
            return shim.error('Incorrect number of arguments. Expecting 4: batchNumber, packagingDateTime, IPFS_CID, containerIssues');
        }

        const batchNumber = args[0];
        const packagingDateTime = args[1];
        const IPFS_CID = args[2];
        const containerIssues = JSON.parse(args[3]); // Expecting a JSON array of container issues like underfilling or sealing issues

        // Fetch existing batch data
        let existingDataBytes = await stub.getState(batchNumber);
        let existingData = {};

        if (existingDataBytes && existingDataBytes.length > 0) {
            // Parse existing data if it exists
            existingData = JSON.parse(existingDataBytes.toString());
        }

        // Add/Update Packaging Step Data
        const packagingData = {
            packagingDateTime,
            IPFS_CID,
            containerIssues,
            step: 'Packaging'
        };

        // Merge the data while retaining earlier steps
        existingData['Packaging'] = packagingData;

        // Save the merged data back to the blockchain
        await stub.putState(batchNumber, Buffer.from(JSON.stringify(existingData)));

        console.log('Packaging Data Stored:', packagingData);
        return shim.success(Buffer.from(JSON.stringify(existingData)));
    }


    // 4. Warehousing Step
    async storeWarehousingData(stub, args) {
        if (args.length !== 5) {
            return shim.error('Incorrect number of arguments. Expecting 5: batchNumber, packageNumber, location, entryExitHash, inventoryHash');
        }

        const batchNumber = args[0];
        const packageNumber = args[1];
        const location = args[2];
        const entryExitHash = args[3];
        const inventoryHash = args[4];

        // Fetch existing batch data
        let batchDataBytes = await stub.getState(batchNumber);
        let batchData;

        if (batchDataBytes && batchDataBytes.length > 0) {
            batchData = JSON.parse(batchDataBytes.toString());
        } else {
            return shim.error(`Batch ${batchNumber} not found. Ensure batch data exists before warehousing.`);
        }

        // Initialize the warehousing step if not already present
        if (!batchData.warehousing) {
            batchData.warehousing = {
                packages: {}
            };
        }

        // Add or update package details in the warehousing step
        batchData.warehousing.packages[packageNumber] = {
            packageNumber,
            location,
            entryExitHash,
            inventoryHash,
            step: 'Warehousing'
        };

        // Save updated batch data back to the blockchain
        await stub.putState(batchNumber, Buffer.from(JSON.stringify(batchData)));

        console.log('Warehousing Data Stored:', batchData);
        return shim.success(Buffer.from(JSON.stringify(batchData)));
    }


    // 5. Testing (Post-Warehouse) Step
    async storeTestingData(stub, args) {
        if (args.length !== 5) {
            return shim.error('Incorrect number of arguments. Expecting : batchNumber, packageNumber, testResultsHash, testerInfo, testingDateTime');
        }
        const batchNumber = args[0];
        const packageNumber = args[1];
        const testResultsHash = args[2];
        const testerInfo = args[3];
        const testingDateTime = args[4];

        const testingData = {
            batchNumber,
            packageNumber,
            testResultsHash,
            testerInfo,
            testingDateTime,
            step: 'Testing'
        };

        await stub.putState(packageNumber, Buffer.from(JSON.stringify(testingData)));
        console.log('Testing Data Stored:', testingData);
        return shim.success(Buffer.from(JSON.stringify(testingData)));
    }

    // 6. Distribution Step
    async storeDistributionData(stub, args) {
        if (args.length !== 4) {
            return shim.error('Incorrect number of arguments. Expecting 4: packageNumber, transportDetails, distributionDateTime, distributorInfo');
        }

        const packageNumber = args[0];
        const transportDetails = args[1];
        const distributionDateTime = args[2];
        const distributorInfo = args[3];

        const distributionData = {
            packageNumber,
            transportDetails,
            distributionDateTime,
            distributorInfo,
            step: 'Distribution'
        };

        await stub.putState(packageNumber, Buffer.from(JSON.stringify(distributionData)));
        console.log('Distribution Data Stored:', distributionData);
        return shim.success(Buffer.from(JSON.stringify(distributionData)));
    }

    // 7. Car Service Centers
    async storeServiceCenterData(stub, args) {
        if (args.length !== 4) {
            return shim.error('Incorrect number of arguments. Expecting 4: packageNumber, serviceRecordsHash, serviceDateTime, personnel');
        }

        const packageNumber = args[0];
        const serviceRecordsHash = args[1];
        const serviceDateTime = args[2];
        const personnel = args[3];

        const serviceCenterData = {
            packageNumber,
            serviceRecordsHash,
            serviceDateTime,
            personnel,
            step: 'Car Service Center'
        };

        await stub.putState(packageNumber, Buffer.from(JSON.stringify(serviceCenterData)));
        console.log('Service Center Data Stored:', serviceCenterData);
        return shim.success(Buffer.from(JSON.stringify(serviceCenterData)));
    }

    // Query function to get batch data
    async queryBatchData(stub, args) {
        if (args.length !== 1) {
            return shim.error('Incorrect number of arguments. Expecting Batch Number');
        }

        const batchNumber = args[0];
        const batchDataBytes = await stub.getState(batchNumber);

        if (!batchDataBytes || batchDataBytes.length === 0) {
            return shim.error(`Batch ${batchNumber} does not exist`);
        }

        console.log('Query Result:', batchDataBytes.toString());
        return shim.success(batchDataBytes);
    }

    // Function to get all keys
    async getAllKeys(stub) {
        const iterator = await stub.getStateByRange('', '');
        let allResults = [];
        while (true) {
            let res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                let jsonRes = {};
                jsonRes.Key = res.value.key;
                jsonRes.Record = res.value.value.toString('utf8');
                allResults.push(jsonRes);
            }
            if (res.done) {
                await iterator.close();
                return allResults;
            }
        }
    }
    // Query function to get package data
    async queryPackageData(ctx, batchID, packageID) {
        const batch = await ctx.stub.getState(batchID);
        if (!batch || batch.length === 0) {
            throw new Error(`Batch ${batchID} does not exist`);
        }
    
        const batchData = JSON.parse(batch.toString());
        const packageData = batchData.packages.find(pkg => pkg.packageID === packageID);
    
        if (!packageData) {
            throw new Error(`Package ${packageID} does not exist in batch ${batchID}`);
        }
    
        return packageData;
    }
    

    // Function to verify processing data integrity
    async detectProcessingFraud(stub, batchNumber) {
        // Retrieve batch data
        let batchDataAsBytes = await stub.getState(batchNumber);
        if (!batchDataAsBytes || batchDataAsBytes.length === 0) {
            return shim.error(`Batch ${batchNumber} not found. Cannot perform fraud detection.`);
        }

        let batchData = JSON.parse(batchDataAsBytes.toString());

        // Ensure the processing step exists
        if (batchData.step !== 'Processing') {
            return shim.error(`Processing data not found for batch ${batchNumber}.`);
        }

        console.log(`Verifying Processing Step Data for Batch: ${batchNumber}`);

        // Check IPFS CID validity (example: verify hash pattern)
        if (!batchData.IPFS_CID || !batchData.IPFS_CID.startsWith('Qm')) {
            return shim.error(`Invalid IPFS_CID detected for batch ${batchNumber}. Possible fraud.`);
        }

        // Check if the processing timestamp is reasonable (e.g., no future date)
        const currentDate = new Date();
        const processingDate = new Date(batchData.processingDateTime);
        if (processingDate > currentDate) {
            return shim.error(`Processing date is in the future for batch ${batchNumber}. Fraud detected.`);
        }

        console.log(`Fetching data from IPFS for CID: ${batchData.IPFS_CID}`);

        // Step 3: Retrieve data from IPFS
        const ipfsData = await this.getIPFSFile(batchData.IPFS_CID);
        console.log(`Data retrieved from IPFS: ${ipfsData}`);

        // Parse IPFS data (assume it's JSON)
        // let processingData;
        // try {
        //     processingData = JSON.parse(ipfsData);
        // } catch (error) {
        //     return shim.error(`Failed to parse IPFS data for batch ${batchNumber}: ${error.message}`);
        // }

        // Step 4: Fraud Detection Logic
        const fraudMessages = [];

        // // Substitution of base oils
        // if (processingData.baseOilQuality !== 'High') {
        //     fraudMessages.push('Base oil quality is lower than required.');
        // }

        // // Use of non-standard additives
        // if (processingData.additives.some(additive => !['StandardA', 'StandardB'].includes(additive))) {
        //     fraudMessages.push('Non-standard additives detected.');
        // }

        // // Incorrect additive ratios
        // if (processingData.additiveRatio !== 'ExpectedRatio') {
        //     fraudMessages.push('Incorrect additive ratios detected.');
        // }

        if (fraudMessages.length === 0) {
            return shim.success(Buffer.from('No fraud detected in processing.'));
        } else {
            return shim.error(`Fraud detected in processing: ${fraudMessages.join(', ')}`);
        }
    }


    // Function to verify quality control data integrity
    async detectQualityControlFraud(stub, batchNumber) {
        // Retrieve batch data
        let batchDataAsBytes = await stub.getState(batchNumber);
        if (!batchDataAsBytes || batchDataAsBytes.length === 0) {
            return shim.error(`Batch ${batchNumber} not found. Cannot perform fraud detection.`);
        }

        let batchData = JSON.parse(batchDataAsBytes.toString());

        // Ensure the Quality Control step exists
        let qcStep = batchData.steps.find(step => step.step === 'Quality Control');
        if (!qcStep) {
            return shim.error(`Quality Control data not found for batch ${batchNumber}.`);
        }

        console.log(`Verifying Quality Control Step Data for Batch: ${batchNumber}`);

        // Fetch the report from IPFS
        let ipfsData = '';
        for await (const chunk of ipfs.cat(qcStep.IPFS_CID)) {
            ipfsData += chunk.toString();
        }

        console.log(`Data retrieved from IPFS: ${ipfsData}`);

        // Validate test results hash
        const crypto = require('crypto');
        const recalculatedHash = crypto.createHash('sha256').update(JSON.stringify(testResults)).digest('hex');
        if (recalculatedHash !== qcStep.testResultsHash) {
            return shim.error(`Test results hash mismatch for batch ${batchNumber}. Possible tampering detected.`);
        }

        // Verify IPFS CID existence
        if (!qcStep.IPFS_CID || !qcStep.IPFS_CID.startsWith('Qm')) {
            return shim.error(`Invalid or missing IPFS_CID for Quality Control data in batch ${batchNumber}. Possible fraud.`);
        }

        // Check if testing date is reasonable (e.g., after processing and not in the future)
        const testingDate = new Date(qcStep.testingDateTime);
        const processingStep = batchData.steps.find(step => step.step === 'Processing');
        const processingDate = new Date(processingStep.processingDateTime);

        if (testingDate < processingDate) {
            return shim.error(`Testing date is before processing date for batch ${batchNumber}. Fraud detected.`);
        }

        if (testingDate > new Date()) {
            return shim.error(`Testing date is in the future for batch ${batchNumber}. Fraud detected.`);
        }

        return shim.success(Buffer.from(`Quality Control data for batch ${batchNumber} passed fraud detection.`));
    }


}

// Start the chaincode
shim.start(new BatchContract());
