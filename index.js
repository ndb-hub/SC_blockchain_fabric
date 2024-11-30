'use strict';

const shim = require('fabric-shim');

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
        } else if (func === 'getAllKeys') {
            const allKeys = await this.getAllKeys(stub);
            console.log('All keys:', allKeys);
            return shim.success(Buffer.from(JSON.stringify(allKeys)));
        } else {
            console.error(`No function named ${func} found`);
            return shim.error(new Error(`No function named ${func} found`));
        }
    }

    // Function to store batch data (Processing step)
    async storeBatchData(stub, args) {
        if (args.length !== 3) {
            return shim.error('Incorrect number of arguments. Expecting 3: batchNumber, processingDateTime, certificationHash');
        }

        const batchNumber = args[0];
        const processingDateTime = args[1];
        const certificationHash = args[2];

        const batchData = {
            batchNumber,
            processingDateTime,
            certificationHash,
            step: 'Processing'
        };

        await stub.putState(batchNumber, Buffer.from(JSON.stringify(batchData)));
        console.log('Batch Data Stored:', batchData);
        return shim.success(Buffer.from(JSON.stringify(batchData)));
    }

    // 2. Quality Control Step
    async storeQualityControlData(stub, args) {
        if (args.length !== 4) {
            return shim.error('Incorrect number of arguments. Expecting 4: batchNumber, testResultsHash, testerInfo, testingDateTime');
        }

        const batchNumber = args[0];
        const testResultsHash = args[1];
        const IPFS_CID = args[2];
        const testingDateTime = args[3];

        const qualityData = {
            batchNumber,
            testResultsHash,
            IPFS_CID,
            testingDateTime,
            step: 'Quality Control'
        };

        await stub.putState(batchNumber, Buffer.from(JSON.stringify(qualityData)));
        console.log('Quality Control Data Stored:', qualityData);
        return shim.success(Buffer.from(JSON.stringify(qualityData)));
    }

    // 3. Packaging Step
    async storePackagingData(stub, args) {
        if (args.length !== 3) {
            return shim.error('Incorrect number of arguments. Expecting 3: batchNumber, packagingDateTime, personnel');
        }

        const batchNumber = args[0];
        const packagingDateTime = args[1];
        const personnel = args[2];

        const packagingData = {
            batchNumber,
            packagingDateTime,
            personnel,
            step: 'Packaging'
        };

        await stub.putState(batchNumber, Buffer.from(JSON.stringify(packagingData)));
        console.log('Packaging Data Stored:', packagingData);
        return shim.success(Buffer.from(JSON.stringify(packagingData)));
    }

    // 4. Warehousing Step
    async storeWarehousingData(stub, args) {
        if (args.length !== 4) {
            return shim.error('Incorrect number of arguments. Expecting 4: packageNumber, location, entryExitHash, inventoryHash');
        }

        const packageNumber = args[0];
        const location = args[1];
        const entryExitHash = args[2];
        const inventoryHash = args[3];

        const warehousingData = {
            packageNumber,
            location,
            entryExitHash,
            inventoryHash,
            step: 'Warehousing'
        };

        await stub.putState(packageNumber, Buffer.from(JSON.stringify(warehousingData)));
        console.log('Warehousing Data Stored:', warehousingData);
        return shim.success(Buffer.from(JSON.stringify(warehousingData)));
    }

    // 5. Testing (Post-Warehouse) Step
    async storeTestingData(stub, args) {
        if (args.length !== 4) {
            return shim.error('Incorrect number of arguments. Expecting 4: packageNumber, testResultsHash, testerInfo, testingDateTime');
        }

        const packageNumber = args[0];
        const testResultsHash = args[1];
        const testerInfo = args[2];
        const testingDateTime = args[3];

        const testingData = {
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
}

// Start the chaincode
shim.start(new BatchContract());
