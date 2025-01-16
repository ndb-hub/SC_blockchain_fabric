'use strict';

const shim = require('fabric-shim');
const IPFS = require('ipfs-http-client');  // Use IPFS directly
//const ipfs = IPFS.create({ url: 'http://127.0.0.1:5001' });
// const ipfs = IPFS.create({ url: 'https://ipfs.infura.io:5001' });

//const ipfs = IPFS.create({ url: 'http://172.22.67.88:5001'})
//const ipfs = IPFS.create({ url: 'http://ipfs_node:5001' });
const ipfs = IPFS.create({ url: 'http://172.18.0.2:5001' });
const zlib = require('zlib');
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = Buffer.from('2a940d2f513159eee389f27d788aaf23fcad2c751e21cafa102c4a3224fc6c91', 'hex'); 
const iv = Buffer.from('20ddae9f64e26e46c9253fbdf703df36', 'hex'); 
function decompress(text) { 
    return zlib.inflateSync(Buffer.from(text, 'base64')).toString();
}

function decrypt(encryptedData) {
     let encryptedText = Buffer.from(encryptedData, 'base64'); 
     let decipher = crypto.createDecipheriv(algorithm, key, iv); 
     let decrypted = decipher.update(encryptedText); 
     decrypted = Buffer.concat([decrypted, decipher.final()]); 
     const decompressedContent = decompress(decrypted.toString()); 
     return decompressedContent; 
}

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
        }else if (func === 'detectPackagingFraud') {
            // args[0]: batchNumber
            return await this.detectPackagingFraud(stub, args[0]);
        }else if (func === 'detectWarehousingFraud') {
            return await this.detectWarehousingFraud(stub, args);
        }else if (func === 'detectTestingFraud') {
            return await this.detectTestingFraud(stub, args);
        }else if (func === 'detectDistributionFraud') {
            return await this.detectDistributionFraud(stub, args);
        }else if (func === 'detectServiceCenterFraud') {
            return await this.detectServiceCenterFraud(stub, args);
        }else if (func === 'Check_Status') {
            return await this.Check_Status(stub, args);
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
            return shim.error('Incorrect number of arguments. Expecting 3: batchNumber, processingDateTime, report');
        }

        const batchNumber = args[0];
        const processingDateTime = args[1];
        const report = args[2];

        const batchData = {
            batchNumber,
            processingDateTime,
            report,
            step: 'Processing'
        };

        await stub.putState(batchNumber, Buffer.from(JSON.stringify(batchData)));
        console.log('Batch Data Stored:', batchData);
        return shim.success(Buffer.from(JSON.stringify(batchData)));
    }

    async storeQualityControlData(stub, args) {
        if (args.length !== 3) {
            return shim.error('Incorrect number of arguments. Expecting 3: batchNumber, report, testingDateTime');
        }
    
        const batchNumber = args[0];
        const report = args[1];
        const testingDateTime = args[2];
    
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
            report,
            testingDateTime,
            step: 'Quality Control'
        });
    
        // Save updated batch data
        await stub.putState(batchNumber, Buffer.from(JSON.stringify(batchData)));
        console.log('Updated batch data:', batchData);
        return shim.success(Buffer.from(JSON.stringify(batchData)));
    }

    // 3. Packaging Step
    async storePackagingData(stub, args) {
        if (args.length !== 4) {
            return shim.error('Incorrect number of arguments. Expecting 4: batchNumber, packagingDateTime, report, containerIssues');
        }

        const batchNumber = args[0];
        const packagingDateTime = args[1];
        const report = args[2];
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
            report,
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
            return shim.error('Incorrect number of arguments. Expecting 5: batchNumber, packageID, entryTime, warehouse, report');
        }

        const batchNumber = args[0];
        const packageID = args[1];
        const entryTime = args[2];
        const warehouse = args[3];
        const report = args[4]; 

        // Fetch existing batch data
        let batchDataBytes = await stub.getState(batchNumber);
        let batchData;

        if (batchDataBytes && batchDataBytes.length > 0) {
            batchData = JSON.parse(batchDataBytes.toString());
        } else {
            return shim.error(`Batch ${batchNumber} not found. Ensure batch data exists before warehousing.`);
        }

        // Initialize packages if not already present
        if (!batchData.packages) {
            batchData.packages = {};
        }

        // Fetch existing warehouse data (locations are stored separately)
        let warehouseDataBytes = await stub.getState(warehouse);
        let warehouseData;

        if (warehouseDataBytes && warehouseDataBytes.length > 0) {
            warehouseData = JSON.parse(warehouseDataBytes.toString());
        } else {
            // If warehouse data doesn't exist, initialize it with inventory = 0
            warehouseData = { warehouse, inventory: 0 };
        }

        // Increment inventory count for the specific warehouse (e.g., Warehouse B)
        warehouseData.inventory += 1;

        // Add or update package details in the batch
        // Store the Warehousing step
        if (!batchData.packages[packageID]) {
            batchData.packages[packageID] = { steps: [] };
        }
        batchData.packages[packageID].steps.push({
            entryTime,
            warehouse: {
                building: warehouse,
                inventory: warehouseData.inventory
            },
            report,
            step: 'Warehousing'
        });

        // Save updated batch data back to the blockchain
        await stub.putState(batchNumber, Buffer.from(JSON.stringify(batchData)));

        // Save updated warehouse data back to the blockchain (only for the relevant warehouse)
        await stub.putState(warehouse, Buffer.from(JSON.stringify(warehouseData)));

        console.log('Warehousing Data Stored:', batchData);
        return shim.success(Buffer.from(JSON.stringify(batchData)));
    }


    // 5. Testing (Post-Warehouse) Step
    async storeTestingData(stub, args) {
        if (args.length !== 6) {
            return shim.error('Incorrect number of arguments. Expecting 6: batchNumber, packageID,sampleID, testingDate,warehouse, report');
        }

        const batchNumber = args[0];
        const packageID = args[1];
        const sampleID=args[2];
        const testingDate = args[3];
        const warehouse=args[4];
        const report = args[5];
    
        console.log(`Storing Testing Data: Batch: ${batchNumber}, Package: ${packageID}`);
    
        // Retrieve the existing batch data
        let batchDataAsBytes = await stub.getState(batchNumber);
        if (!batchDataAsBytes || batchDataAsBytes.length === 0) {
            return shim.error(`Batch ${batchNumber} not found. Cannot store testing data.`);
        }
    
        let batchData = JSON.parse(batchDataAsBytes.toString());
    
        // Ensure the package exists in the batch
        let packageData = batchData.packages && batchData.packages[packageID];
        if (!packageData) {
            return shim.error(`Package ${packageID} not found in batch ${batchNumber}.`);
        }
    
        // Add the Testing step to the steps array
        packageData.steps.push({
            sampleID,
            testingDate,
            warehouse,
            report,
            step: 'Testing'
        });
    
        // Save the updated batch data back to the ledger
        batchData.packages[packageID] = packageData;
        await stub.putState(batchNumber, Buffer.from(JSON.stringify(batchData)));

        // Retrieve warehouse data
        let warehouseDataBytes = await stub.getState(warehouse);
        if (!warehouseDataBytes || warehouseDataBytes.length === 0) {
            return shim.error(`Warehouse ${warehouse} data not found. Cannot adjust inventory.`);
        }

        let warehouseData = JSON.parse(warehouseDataBytes.toString());

        // Check if Sample PackageID matches PackageID
        if (sampleID === packageID) {
            warehouseData.inventory -= 1;
            console.log(`Decremented inventory for Warehouse ${warehouse}: ${warehouseData.inventory}`);
            // Save updated warehouse data back to the ledger
            await stub.putState(warehouse, Buffer.from(JSON.stringify(warehouseData)));
        } 
        console.log(`Testing data stored successfully for Batch ${batchNumber}, Package ${packageID}.`);
        return shim.success("Testing data stored successfully.");
    }
    

    // 6. Distribution Step
    async storeDistributionData(stub, args) {
        if (args.length !== 7) {
            return shim.error('Incorrect number of arguments. Expecting 7: batchNumber, packageID, warehouse, transportID, destination, dateAndTime, report');
        }
    
        const batchNumber = args[0];
        const packageID = args[1];
        const warehouse = args[2];
        const transportID = args[3];
        const destination = args[4];
        const dateAndTime = args[5];
        const report = args[6];  
    
        console.log(`Storing Distribution Data: Batch: ${batchNumber}, Package: ${packageID}, Transport: ${transportID}, Destination: ${destination}, Date: ${dateAndTime}`);
    
        // Retrieve the existing batch data
        let batchDataAsBytes = await stub.getState(batchNumber);
        if (!batchDataAsBytes || batchDataAsBytes.length === 0) {
            return shim.error(`Batch ${batchNumber} not found. Cannot store distribution data.`);
        }
    
        let batchData = JSON.parse(batchDataAsBytes.toString());
    
        // Ensure the package exists in the batch
        let packageData = batchData.packages && batchData.packages[packageID];
        if (!packageData) {
            return shim.error(`Package ${packageID} not found in batch ${batchNumber}.`);
        }
    
        // Add the Distribution step with the report to the steps array
        packageData.steps.push({
            warehouse,
            transportID,
            destination,
            dateAndTime,
            report,  // Store report information
            step: 'Distribution'
        });
    
        // Save the updated batch data back to the ledger
        batchData.packages[packageID] = packageData;
        await stub.putState(batchNumber, Buffer.from(JSON.stringify(batchData)));
    
        // Retrieve warehouse data
        let warehouseDataBytes = await stub.getState(warehouse);
        if (!warehouseDataBytes || warehouseDataBytes.length === 0) {
            return shim.error(`Warehouse ${warehouse} data not found. Cannot adjust inventory.`);
        }
    
        let warehouseData = JSON.parse(warehouseDataBytes.toString());
    
        // Update inventory at the warehouse (decrement by 1 for this package)
        warehouseData.inventory -= 1;
        console.log(`Decremented inventory for Warehouse ${warehouse}: ${warehouseData.inventory}`);
    
        // Save updated warehouse data back to the ledger
        await stub.putState(warehouse, Buffer.from(JSON.stringify(warehouseData)));
    
        console.log(`Distribution data stored successfully for Batch ${batchNumber}, Package ${packageID}.`);
        return shim.success("Distribution data stored successfully.");
    }
    

    // 7. Car Service Centers
    async storeServiceCenterData(stub, args) {
        if (args.length !== 5) {
            return shim.error('Incorrect number of arguments. Expecting 5: batchNumber, packageID, ServiceCenterID, date, report');
        }
    
        const batchNumber = args[0];
        const packageID = args[1];
        const ServiceCenterID = args[2];
        const date = args[3];
        const report = args[4];  

        // Retrieve the existing batch data
        let batchDataAsBytes = await stub.getState(batchNumber);
        if (!batchDataAsBytes || batchDataAsBytes.length === 0) {
            return shim.error(`Batch ${batchNumber} not found. Cannot store distribution data.`);
        }
    
        let batchData = JSON.parse(batchDataAsBytes.toString());
    
        // Ensure the package exists in the batch
        let packageData = batchData.packages && batchData.packages[packageID];
        if (!packageData) {
            return shim.error(`Package ${packageID} not found in batch ${batchNumber}.`);
        }
    
        // Add the Distribution step with the report to the steps array
        packageData.steps.push({
            ServiceCenterID,
            date,
            report,  // Store report information
            step: 'Car Service Center'
        });
    
        // Save the updated batch data back to the ledger
        batchData.packages[packageID] = packageData;
        await stub.putState(batchNumber, Buffer.from(JSON.stringify(batchData)));

        console.log(`Service Center data stored successfully for Batch ${batchNumber}, Package ${packageID}.`);
        return shim.success("Service Center data stored successfully.");
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

        // Check report validity (example: verify hash pattern)
        if (!batchData.report) {
            return shim.error(`NO report detected for batch ${batchNumber}. Possible fraud.`);
        }

        // Check if the processing timestamp is reasonable (e.g., no future date)
        const currentDate = new Date();
        const processingDate = new Date(batchData.processingDateTime);
        if (processingDate > currentDate) {
            return shim.error(`Processing date is in the future for batch ${batchNumber}. Fraud detected.`);
        }

        console.log(`Fetching data from report: ${batchData.report}`);

        // Step 3: Retrieve data from report
        const encryptedData = batchData.report; 
        const decryptedContent = decrypt(encryptedData); 
        console.log(`Decrypted Content for Batch ${batchNumber}:`, decryptedContent);

        // Step 4: Fraud Detection Logic
        const fraudMessages = [];

        // Example 1: Extract and verify batch number from report
        const batchNumberPattern = /Batch Number:\s*(\d+)/;
        const batchNumberMatch = decryptedContent.match(batchNumberPattern);
        if (!batchNumberMatch || `batch${batchNumberMatch[1]}` !== batchNumber) {
            fraudMessages.push(`Mismatch in batch number: expected ${batchNumber}, found ${batchNumberMatch ? `batch${batchNumberMatch[1]}` : 'none'}.`);
        }

        // Example 2: Verify processing temperature range
        const temperaturePattern = /Heating Temperature:\s*(\d+)\s*°C/;
        const temperatureMatch = decryptedContent.match(temperaturePattern);
        if (temperatureMatch) {
            const temperature = parseInt(temperatureMatch[1], 10);
            if (temperature < 80 || temperature > 90) {
                fraudMessages.push(`Processing temperature out of range: ${temperature}°C.`);
            }
        } else {
            fraudMessages.push('Processing temperature not found in the report.');
        }

        const requiredRoles = ['EMS', 'MHE', 'CQI'];
        const missingRoles = [];

        // Check if each role exists in the report
        for (const role of requiredRoles) {
            if (!decryptedContent.includes(role)) {
                missingRoles.push(role);
            }
        }

        // If any roles are missing, return an error
        if (missingRoles.length > 0) {
            const errorMessage = `Fraud detected in processing: Missing roles in the report: ${missingRoles.join(', ')}.`;
            console.error(errorMessage);
            return shim.error(errorMessage);
        }

        console.log('All required roles are present in the report.');

        // Example 4: Verify material source consistency
        const sourcePattern = /Base Oil Source:\s*(.+)/;
        const sourceMatch = decryptedContent.match(sourcePattern);
        if (sourceMatch && sourceMatch[1] !== 'XYZ Refinery') {
            fraudMessages.push(`Base oil source mismatch: expected "XYZ Refinery", found "${sourceMatch[1]}".`);
        }

        const approvedAdditives = ['Viscosity Modifier', 'Anti-Wear Agent', 'Corrosion Inhibitor'];

        // Helper function to parse base oil
        const parseBaseOil = () => {
            console.log("Parsing Base Oil...");  // Log start of parsing
            const baseOilRegex = /Base Oil:\s*([\w\s\-]+)\s*Quantity:\s*(\d+)\s*liters\s*Source:\s*([\w\s]+)\s*Batch Number:\s*([\w\d]+)\s*Certification:\s*([\w\d\-]+)/g;
            const match = baseOilRegex.exec(decryptedContent);
            if (match) {
                //console.log("Base Oil Match Found:", match);  // Log match result
                return {
                    quantity: parseFloat(match[2]),
                    source: match[3],
                    batchNumber: match[4],
                    certification: match[5],
                };
            }
            console.log("Base Oil Match Not Found");
            return null;
        };

        // Helper function to parse additives
        const parseAdditives = () => {
            console.log("Parsing Additives...");
            const additivesRegex = /Additive Name:\s*([\w\s\-]+)\s*Quantity:\s*(\d+)\s*liters\s*Supplier:\s*([\w\s]+)\s*Batch Number:\s*([\w\d]+)\s*Certification:\s*([\w\d\-]+)/g;
            const matches = [...decryptedContent.matchAll(additivesRegex)];
            //console.log("Additives Matches Found:", matches);  // Log all additive matches
            return matches.map(match => ({
                name: match[1],
                quantity: parseFloat(match[2]),
                supplier: match[3],
                batchNumber: match[4],
                certification: match[5],
            }));
        };

        // Helper function to parse quality tests
        const parseQualityTests = () => {
            console.log("Parsing Quality Tests...");  // Log start of parsing
            const qualityTestsRegex = /Viscosity Check:\s*(\w+)\s*\(viscosity index:\s*([\d\.]+),\s*target:\s*≥([\d\.]+)\)\s*Inspector:\s*([\w\s]+)\s*Contamination Check:\s*(\w+)\s*\(contaminant level:\s*<([\d\.]+)ppm,\s*target:\s*≤([\d\.]+)ppm\)\s*Inspector:\s*([\w\s]+)\s*Certification Issued:\s*([\w\d\-]+)/;
            const match = qualityTestsRegex.exec(decryptedContent);
            
            if (match) {
                //console.log("Quality Tests Match Found:", match);  // Log match result
                return {
                    viscosityCheck: match[1],          // Passed/Failed
                    viscosityIndex: parseFloat(match[2]),  // Viscosity index
                    targetViscosity: parseFloat(match[3]), // Target viscosity
                    viscosityInspector: match[4],      // Inspector name
                    contaminationCheck: match[5],       // Passed/Failed
                    contaminationLevel: parseFloat(match[6]), // Contaminant level
                    targetContamination: parseFloat(match[7]), // Target contaminant level
                    contaminationInspector: match[8],   // Inspector name
                    certification: match[9]             // Certification number
                };
            }
            
            console.log("Quality Tests Match Not Found");
            return null;
        };
        

        // Parsing the report content
        console.log("Starting report parsing...");

        const baseOil = parseBaseOil();
        console.log("Parsed Base Oil:", baseOil);

        const additives = parseAdditives();
        console.log("Parsed Additives:", additives);

        const qualityTests = parseQualityTests();
        console.log("Parsed Quality Tests:", qualityTests);


        // Additive Validation
        additives.forEach(additive => {
            // Trim any extra whitespace and newline characters
            const additiveName = additive.name.trim();

            // Check if the additive is approved
            if (!approvedAdditives.includes(additiveName)) {
                fraudMessages.push(`Unapproved additive detected: ${additive.name}`);
            }

            // Check if the certification is valid
            if (!additive.certification.includes('QC')) {
                fraudMessages.push(`Additive ${additive.name} lacks valid certification.`);
            }
        });

        // Additive Ratio Check
        if (baseOil) {
            const totalAdditiveQuantity = additives.reduce((total, additive) => total + additive.quantity, 0);
            if ((totalAdditiveQuantity / baseOil.quantity) > 0.1) {
                fraudMessages.push('Additive quantity exceeds acceptable ratio to base oil.');
            }
        } else {
            fraudMessages.push('Base oil data is missing from the report.');
        }

        // Quality Test Validation
        if (qualityTests.viscosityIndex < 115) {
            fraudMessages.push('Viscosity index below acceptable standard. Improper labeling suspected.');
        }
        if (qualityTests.contaminationLevel > 5) {
            fraudMessages.push('High contamination level detected. Possible recycled oil dilution.');
        }

        if (fraudMessages.length === 0) {
            return shim.success(Buffer.from('No fraud detected in processing.'));
        } else {
            return shim.error(`Fraud detected in processing: ${fraudMessages.join(', ')}`);
        }
    }

    // Helper function to extract test results and details

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
    
        // Fetch Quality Control-specific details
        const { report, testingDateTime } = qcStep;
    
        // Check if required data is present
        if ( !report || !testingDateTime) {
            return shim.error(`Missing critical Quality Control data for batch ${batchNumber}. Possible fraud.`);
        }

        const fraudMessages = [];
    
        // Validate testing date
        const testingDate = new Date(testingDateTime);
    
        // Ensure the Processing step exists
        if (batchData.step === 'Processing') {
            const processingDate = new Date(batchData.processingDateTime);
            if (testingDate < processingDate) {
                return shim.error(`Testing date is before processing date for batch ${batchNumber}. Fraud detected.`);
            }
        
            if (testingDate > new Date()) {
                return shim.error(`Testing date is in the future for batch ${batchNumber}. Fraud detected.`);
            }
        }
        else{
            return shim.error(`Processing step data not found for batch ${batchNumber}. Cannot validate testing date.`);
        }    

    
        // Decrypt the Quality Control report
        const crypto = require('crypto');
        const decryptedContent = decrypt(report); // Replace with your decryption logic
        console.log(`Decrypted Content for Batch ${batchNumber}:`, decryptedContent);

        // Helper function to extract test results and details
        function extractTestSummary(reportText) {
            const testSummaryRegex = /Tests\sSummary([\s\S]+?)(?=Equipment\sUsed|Security\sand\sLogging|$)/;
            const match = reportText.match(testSummaryRegex);
        
            if (match) {
                const testSummaryText = match[1].trim();
                return parseTestResults(testSummaryText);
            } else {
                return [];
            }
        }
        const extractTestResults = (reportText) => {
            const testSummaryRegex = /Tests\sSummary([\s\S]+?)(?=Equipment\sUsed|Security\sand\sLogging|$)/;
            const match1 = testSummaryRegex.exec(reportText);
            const testSummaryText = match1[1].trim();

            const resultRegex = /([A-Za-z\s]+):\s*(\w+)\s?\(([^)]+)\)/g;
            let testResults = [];
            let match;

            // Use regex to find all matching test results
            while ((match = resultRegex.exec(testSummaryText)) !== null) {
                const testName = match[1].trim();  // Test name (e.g., Viscosity, Metal Wear)
                const testStatus = match[2];  // Test status (e.g., Passed, Failed)
                const testValue = match[3];  // Test value or details (e.g., 67.5 cSt, 4 ppm)

                testResults.push({
                    name: testName,
                    status: testStatus,
                    value: testValue
                });
            }
            return testResults;
        }

        // Extract test results from the decrypted content
        const extractedResults = extractTestResults(decryptedContent);
        console.log("extractedResults:", extractedResults);

        // Define the expected tests
        const expectedTests = [
            "Viscosity", "Metal Wear", "TBN", "TAN", "Flash Point", "Insoluble Matter", "Oxidation"
        ];

        // Check if all expected tests are present
        let missingTests = expectedTests.filter(test => !extractedResults.some(result => result.name === test));
        if (missingTests.length > 0) {
            fraudMessages.push(`The following tests are missing: ${missingTests.join(", ")}`);
        }

        // Validate results for each test
        for (const result of extractedResults) {
            const { name, status, value } = result;

            // Validate Viscosity test
            if (name === 'Viscosity') {
                // Extract viscosity values for both temperatures (40°C and 100°C)
                //const viscosities = value.match(/([\d\.]+)/g).map(Number);
                const viscosities = value.match(/([\d\.]+)\s*cSt/g)?.map(v => parseFloat(v.match(/([\d\.]+)/)[0]));

                // Ensure we have exactly two viscosity values
                if (viscosities.length === 2) {
                    const [temp1, temp2] = viscosities;
                    
                    // Validate 40°C viscosity
                    if (temp1 < 65 || temp1 > 70) {
                        fraudMessages.push(`Viscosity test out of range for 40°C: ${temp1} cSt.`);
                    }
                    
                    // Validate 100°C viscosity
                    if (temp2 < 9.5 || temp2 > 10.5) {
                        fraudMessages.push(`Viscosity test out of range for 100°C: ${temp2} cSt.`);
                    }
                } else {
                    fraudMessages.push(`Viscosity test data is missing or incorrect.`);
                }
            }

            // Validate Metal Wear test
            if (name === 'Metal Wear') {
                const metalWear = parseFloat(value.split(' ')[0]);
                if (metalWear > 5) {
                    fraudMessages.push(`Metal Wear test exceeds acceptable limit: ${metalWear} ppm.`);
                }
            }

            // Validate TBN test
            if (name === 'TBN') {
                const tbnValue = parseFloat(value);
                if (tbnValue < 10) {
                    fraudMessages.push(`TBN test below acceptable value: ${tbnValue} mg KOH/g.`);
                }
            }

            // Validate TAN test
            if (name === 'TAN') {
                const tanValue = parseFloat(value);
                if (tanValue > 2) {
                    fraudMessages.push(`TAN test exceeds acceptable value: ${tanValue} mg KOH/g.`);
                }
            }

            // Validate Flash Point test
            if (name === 'Flash Point') {
                const flashPointValue = parseFloat(value);
                if (flashPointValue < 225) {
                    fraudMessages.push(`Flash Point test below acceptable value: ${flashPointValue} °C.`);
                }
            }

            // Validate Insoluble Matter test
            if (name === 'Insoluble Matter') {
                const insolubleMatter = parseFloat(value);
                if (insolubleMatter > 0.5) {
                    fraudMessages.push(`Insoluble Matter test exceeds acceptable limit: ${insolubleMatter}%.`);
                }
            }

            // Validate Oxidation test
            if (name === 'Oxidation') {
                const oxidationLevel = parseFloat(value);
                if (oxidationLevel > 10) {
                    fraudMessages.push(`Oxidation test exceeds acceptable level: ${oxidationLevel}%.`);
                }
            }
        }

        // If any fraud messages exist, return them, otherwise return success
        if (fraudMessages.length > 0) {
            return shim.error(fraudMessages.join("\n"));
        } else {
            console.log("Quality control checks passed successfully.");
            return shim.success("Quality control checks passed successfully.");
        }
    }

    async detectPackagingFraud(stub, batchNumber) {
        // Retrieve batch data
        let batchDataAsBytes = await stub.getState(batchNumber);
        if (!batchDataAsBytes || batchDataAsBytes.length === 0) {
            return shim.error(`Batch ${batchNumber} not found. Cannot perform fraud detection.`);
        }
    
        let batchData = JSON.parse(batchDataAsBytes.toString());
        
        // Ensure the Packaging step exists
        let packagingStep = batchData.Packaging;
        if (!packagingStep) {
            return shim.error(`Packaging data not found for batch ${batchNumber}.`);
        }
    
        console.log(`Verifying Packaging Step Data for Batch: ${batchNumber}`);
    
        // Fetch Packaging-specific details
        const { packagingDateTime, report, containerIssues } = packagingStep;
    
        // Check if required data is present
        if (!packagingDateTime || !report || !containerIssues) {
            return shim.error(`Missing critical Packaging data for batch ${batchNumber}. Possible fraud.`);
        }
    
        const fraudMessages = [];
    
        // Validate packaging date
        const packagingDate = new Date(packagingDateTime);
        const currentDate = new Date();
    
        // Ensure the Processing step exists
        if (batchData.step === 'Processing') {
            const processingDate = new Date(batchData.processingDateTime);
            if (packagingDate < processingDate) {
                return shim.error(`Packaging date is before processing date for batch ${batchNumber}. Fraud detected.`);
            }
            let qcStep = batchData.steps.find(step => step.step === 'Quality Control');
            if (!qcStep) {
                return shim.error(`Quality Control data not found for batch ${batchNumber}.`);
            }
            // Fetch Quality Control-specific details
            const {  reportqc, testingDateTimeqc } = qcStep;
            if(packagingDate <testingDateTimeqc){
                return shim.error(`Packaging date is before quality control date for batch ${batchNumber}. Fraud detected.`);
            }
    
            if (packagingDate > currentDate) {
                return shim.error(`Packaging date is in the future for batch ${batchNumber}. Fraud detected.`);
            }
        } else {
            return shim.error(`Processing step data not found for batch ${batchNumber}. Cannot validate packaging date.`);
        }
    
        // Decrypt the Packaging report
        const decryptedContent = decrypt(report); // Replace with your decryption logic
        console.log(`Decrypted Content for Batch ${batchNumber}:`, decryptedContent);
    
        // Step 4: Fraud Detection Logic
    
        // Example 1: Extract and verify batch number from report
        const batchNumberPattern = /Batch Number:\s*(\d+)/;
        const batchNumberMatch = decryptedContent.match(batchNumberPattern);
        if (!batchNumberMatch || `batch${batchNumberMatch[1]}` !== batchNumber) {
            fraudMessages.push(`Mismatch in batch number: expected ${batchNumber}, found ${batchNumberMatch ? `batch${batchNumberMatch[1]}` : 'none'}.`);
        }
    
        // Example 2: Verify if container issues are present in the report
        if (containerIssues.includes('underfilling') && !decryptedContent.includes('underfilling')) {
            fraudMessages.push('Reported underfilling issue not found in the packaging report.');
        }
        if (containerIssues.includes('sealing issues') && !decryptedContent.includes('sealing issues')) {
            fraudMessages.push('Reported sealing issue not found in the packaging report.');
        }
    
        // Example 3: Check for required personnel signature
        const requiredRoles = ['Packaging Supervisor', 'Machine Operator', 'Inspector'];
        const missingRoles = [];
    
        // Check if each role exists in the report
        for (const role of requiredRoles) {
            if (!decryptedContent.includes(role)) {
                missingRoles.push(role);
            }
        }
    
        // If any roles are missing, return an error
        if (missingRoles.length > 0) {
            fraudMessages.push(`Missing roles in the report: ${missingRoles.join(', ')}.`);
        }
    
        // Example 4: Verify equipment used and maintenance status 
        //const EquipmentUsedRegex = /Final\sInspection([\s\S]+?)(?=Equipment\sUsed|Security\sand\sLogging|$)/;
        //const match1 = EquipmentUsedRegex.exec(decryptedContent);
        //const EquipmentUsedText = match1[2].trim();
         
        // Example 4: Verify equipment used and maintenance status 
        const EquipmentUsedRegex = /Final\sInspection([\s\S]+?)(?=Security\sand\sLogging)/;
        const match1 = EquipmentUsedRegex.exec(decryptedContent);
        let EquipmentUsedText = '';

        if (!match1 || !match1[1]) {
            fraudMessages.push('Equipment used details not found in the report.');
        } else {
            EquipmentUsedText = match1[1].trim();
            console.log("EquipmentUsedText: ", EquipmentUsedText);

            const equipmentPattern = /([\w\s\-]+):\s*([\w\-]+)\s*\(Calibrated:\s*([\d\-]+),\s*Valid Until:\s*([\d\-]+)\)/g;
            let equipmentMatch;
            const currentDate = new Date();

            while ((equipmentMatch = equipmentPattern.exec(EquipmentUsedText)) !== null) {
                const equipmentName = equipmentMatch[1].trim();
                const calibrationDate = new Date(equipmentMatch[3]);
                const validUntilDate = new Date(equipmentMatch[4]);

                if (validUntilDate < currentDate) {
                    fraudMessages.push(`Equipment "${equipmentName}" calibration expired on ${equipmentMatch[4]}.`);
                }
            }
        }


        // Example 5: Check for counterfeit products 
        const authenticityMarkersPattern = /Certification Issued:\s*(CERTPKG[\d]+)/; 
        const authenticityMarkersMatch = decryptedContent.match(authenticityMarkersPattern); 
        if (!authenticityMarkersMatch) { 
            fraudMessages.push('Authenticity certification not found in the report.'); 
        } // Example 6: Verify label information 
        const labelPattern = /Labeling.*?Result:\s*Passed\s*Details:\s*Labels Printed:\s*(\d+)\s*units.*?Labeling Accuracy:/s;
        const labelMatch = decryptedContent.match(labelPattern); 
        if (!labelMatch) { 
            fraudMessages.push('Labeling information not found in the report.'); 
        }
    
        // If any fraud messages exist, return them, otherwise return success
        if (fraudMessages.length > 0) {
            return shim.error(fraudMessages.join("\n"));
        } else {
            console.log("Packaging checks passed successfully.");
            return shim.success("Packaging checks passed successfully.");
        }
    }

    async detectWarehousingFraud(stub, args) {
        const batchNumber=args[0];
        const packageID=args[1];
        console.log(`batchNumber: ${batchNumber}, packageID: ${packageID}`);
        // Retrieve batch data
        let batchDataAsBytes = await stub.getState(batchNumber);
        if (!batchDataAsBytes || batchDataAsBytes.length === 0) {
            return shim.error(`Batch ${batchNumber} not found. Cannot perform fraud detection.`);
        }
    
        let batchData = JSON.parse(batchDataAsBytes.toString());
    
        // Ensure the Warehousing step exists for the specified package
        let packageData = batchData.packages && batchData.packages[packageID];
        if (!packageData) {
            return shim.error(`Package ${packageID} not found in batch ${batchNumber}.`);
        }
    
        console.log(`Verifying Warehousing Step Data for Batch: ${batchNumber}, Package: ${packageID}`);
    
        // Fetch the Warehousing step details from the steps array
        const warehousingStep = packageData.steps && packageData.steps.find(step => step.step === 'Warehousing');
        if (!warehousingStep) {
            return shim.error(`Warehousing step data not found for Package ${packageID} in Batch ${batchNumber}.`);
        }

        // Fetch Warehousing-specific details
        const { entryTime, warehouse, report } = warehousingStep;
    
        // Check if required data is present
        if ( !entryTime || !warehouse || !report) {
            return shim.error(`Missing critical Warehousing data for batch ${batchNumber}, package ${packageID}. Possible fraud.`);
        }
    
        const fraudMessages = [];
    
        // Validate warehousing entry time
        const warehousingDate = new Date(entryTime);
        const currentDate = new Date();
    
        // Ensure the previous step (Packaging) exists and validate timing
        if (batchData.Packaging) {
            const packagingDate = new Date(batchData.Packaging.packagingDateTime);
            if (warehousingDate < packagingDate) {
                return shim.error(`Warehousing entry time is before packaging date for batch ${batchNumber}, package ${packageID}. Fraud detected.`);
            }
        } else {
            return shim.error(`Packaging step data not found for batch ${batchNumber}. Cannot validate warehousing entry time.`);
        }
        if (warehousingDate > currentDate) {
            return shim.error(`Warehousing entry time is in the future for batch ${batchNumber}, package ${packageID}. Fraud detected.`);
        }
    
        // Decrypt the Warehousing report
        const decryptedContent = decrypt(report); // Replace with your decryption logic
        console.log(`Decrypted Content for Batch ${batchNumber}, Package ${packageID}:`, decryptedContent);
    
        // Step 4: Fraud Detection Logic
    
        // Example 1: Extract and verify batch number from the report
        const batchNumberPattern = /Batch Number:\s*(\d+)/;
        const batchNumberMatch = decryptedContent.match(batchNumberPattern);
        if (!batchNumberMatch || `batch${batchNumberMatch[1]}` !== batchNumber) {
            fraudMessages.push(`Mismatch in batch number: expected ${batchNumber}, found ${batchNumberMatch ? `batch${batchNumberMatch[1]}` : 'none'}.`);
        }
    
        // Example 2: Check for reported warehouse issues (e.g., incorrect inventory)
        const inventoryPattern = /Inventory Count Update[\s\S]*?Total packages in the warehouse after this entry:\s*(\d+)/;
        const inventoryMatch = decryptedContent.match(inventoryPattern);
        if (!inventoryMatch) {
            fraudMessages.push('Inventory count not found in the warehousing report.');
        } else {
            const reportedInventory = parseInt(inventoryMatch[1], 10);
            if (reportedInventory !== warehouse.inventory) {
                fraudMessages.push(`Mismatch in inventory count for package ${packageID} in batch ${batchNumber}. Reported: ${reportedInventory}, Actual: ${packageData.warehouse.inventory}.`);
            }
        }

    
        // Example 3: Check if required personnel are listed in the report
        const requiredRoles = ['PQAO', 'WS'];
        const missingRoles = [];
    
        for (const role of requiredRoles) {
            if (!decryptedContent.includes(role)) {
                missingRoles.push(role);
            }
        }
    
        if (missingRoles.length > 0) {
            fraudMessages.push(`Missing roles in the report: ${missingRoles.join(', ')}.`);
        }

        const cctvPattern = /CCTV Monitoring:[\s\S]*?file reference\s*([\w-]+)/;
        const cctvMatch = decryptedContent.match(cctvPattern);
        if (!cctvMatch) {
            fraudMessages.push('CCTV monitoring details not found in the warehousing report.');
        }
    
        // Example 4: Verify warehouse location
        const LocationPattern = /Warehouse Location:[\s\S]*?Building\s*([\w-]+)/;
        const LocationMatch = decryptedContent.match(LocationPattern);
        const foundBuilding = LocationMatch[1]; 
        if (warehouse.building !== foundBuilding) { 
            fraudMessages.push(`Mismatch in warehouse location for package ${packageID} in batch ${batchNumber}. Expected: ${warehouse.building}, Found: ${foundBuilding}.`);
        }


        const containerIntegrityPattern = /Container integrity: No damage or leakage/;
        if (!containerIntegrityPattern.test(decryptedContent)) {
            fraudMessages.push('Container integrity verification is missing or indicates tampering.');
        }

        const temperaturePattern = /Temperature: Maintained at\s*([\d.]+)/;
        const humidityPattern = /Humidity Level:\s*([\d.]+)/;
        const tempMatch = decryptedContent.match(temperaturePattern);
        const humidityMatch = decryptedContent.match(humidityPattern);

        if (tempMatch && humidityMatch) {
            const temperature = parseFloat(tempMatch[1]);
            const humidity = parseFloat(humidityMatch[1]);

            // Replace these thresholds with the specific storage requirements for motor oil
            const minTemp = 10, maxTemp = 30;
            const minHumidity = 20, maxHumidity = 60;

            if (temperature < minTemp || temperature > maxTemp) {
                fraudMessages.push(`Temperature out of range: ${temperature}°C. Expected: ${minTemp}-${maxTemp}°C.`);
            }
            if (humidity < minHumidity || humidity > maxHumidity) {
                fraudMessages.push(`Humidity out of range: ${humidity}%. Expected: ${minHumidity}-${maxHumidity}%.`);
            }
        } else {
            fraudMessages.push('Temperature and humidity data missing in the warehousing report.');
        }

        const labelIntegrityPattern = /Label condition: Batch details match the blockchain record/;
        if (!labelIntegrityPattern.test(decryptedContent)) {
            fraudMessages.push('Label condition verification is missing or indicates mismatch with blockchain records.');
        }

    
        // If any fraud messages exist, return them, otherwise return success
        if (fraudMessages.length > 0) {
            return shim.error(fraudMessages.join("\n"));
        } else {
            console.log("Warehousing checks passed successfully.");
            return shim.success("Warehousing checks passed successfully.");
        }
    }

    async detectTestingFraud(stub, args) {
        const batchNumber = args[0];
        const packageID = args[1];
        console.log(`batchNumber: ${batchNumber}, packageID: ${packageID}`);
    
        // Retrieve batch data
        let batchDataAsBytes = await stub.getState(batchNumber);
        if (!batchDataAsBytes || batchDataAsBytes.length === 0) {
            return shim.error(`Batch ${batchNumber} not found. Cannot perform fraud detection.`);
        }
    
        let batchData = JSON.parse(batchDataAsBytes.toString());
    
        // Ensure the package exists in the batch
        let packageData = batchData.packages && batchData.packages[packageID];
        if (!packageData) {
            return shim.error(`Package ${packageID} not found in batch ${batchNumber}.`);
        }
    
        // Ensure the Testing step exists
        const TestingStep = packageData.steps && packageData.steps.find(step => step.step === 'Testing');
        if (!TestingStep) {
            return shim.error(`Testing step data not found for Package ${packageID} in Batch ${batchNumber}.`);
        }
        const { sampleID,testingDate, warehouse,report } = TestingStep;        
    
        // Check if required data is present
        if (!testingDate || !report) {
            return shim.error(`Missing critical Testing data for batch ${batchNumber}, package ${packageID}. Possible fraud.`);
        }
    
        const fraudMessages = [];
    
        // Validate Testing date
        const testingDateObj = new Date(testingDate);
        const currentDate = new Date();    
    
        // Ensure the previous step (Warehousing) exists and validate timing
        const warehousingStep = packageData.steps && packageData.steps.find(step => step.step === 'Warehousing');
        if (warehousingStep) {
            const warehousingDate = new Date(warehousingStep.entryTime);
            if (testingDateObj < warehousingDate) {
                return shim.error(`Testing date is before warehousing date for batch ${batchNumber}, package ${packageID}. Fraud detected.`);
            }
        } else {
            return shim.error(`Warehousing step data not found for batch ${batchNumber}. Cannot validate testing date.`);
        }
        if (testingDateObj > currentDate) {
            return shim.error(`Testing date is in the future for batch ${batchNumber}, package ${packageID}. Fraud detected.`);
        }
    
        // Decrypt the Testing report
        const decryptedContent = decrypt(report); // Replace with your decryption logic
        console.log(`Decrypted Content for Batch ${batchNumber}, Package ${packageID}:`, decryptedContent);
    
        // Check for consistency in batch and package details
        const batchNumberPattern = /Batch Number:\s*(\d+)/;
        const batchNumberMatch = decryptedContent.match(batchNumberPattern);
        if (!batchNumberMatch || `batch${batchNumberMatch[1]}` !== batchNumber) {
            fraudMessages.push(`Mismatch in batch number: expected ${batchNumber}, found ${batchNumberMatch ? `batch${batchNumberMatch[1]}` : 'none'}.`);
        }

        // Example 1: Extract and verify packageID from the report
        const packageIDPattern = /(?:^|\n)PackageID:\s*(\d+-\d+-\d+)/;
        const packageIDMatch = decryptedContent.match(packageIDPattern);
        if (!packageIDMatch || packageIDMatch[1] !== packageID) {
            fraudMessages.push(`Mismatch in packageID: expected ${packageID}, found ${packageIDMatch ? `package${packageIDMatch[1]}` : 'none'}.`);
        }

    
        // Example 2: Verify personnel roles are documented in the report
        const requiredRoles = ['CQI', 'ATS', 'LQA'];
        const missingRoles = requiredRoles.filter(role => !decryptedContent.includes(role));
        if (missingRoles.length > 0) {
            fraudMessages.push(`Missing roles in Testing report: ${missingRoles.join(', ')}.`);
        }
    
        // Fetch Quality Control-specific details
        let qcReport;
        let qcStep = batchData.steps.find(step => step.step === 'Quality Control');
        if (!qcStep) {
            return shim.error(`Quality Control data not found for batch ${batchNumber}.`);
        } else {
            qcReport = decrypt(qcStep.report); // Decrypt Quality Control report
            if (!qcReport) {
                fraudMessages.push(`Quality Control report missing for batch ${batchNumber}.`);
            }
        }
        console.log(`qcReport for Batch ${batchNumber}:`, qcReport);
 
        

        const extractTestResults = (reportText) => {
            if (!reportText || typeof reportText !== 'string') {
                throw new Error('Invalid or empty report text provided.');
            }
            
            const testSummaryRegex = /Summary([\s\S]+?)(?=Equipment\sUsed|Security\sand\sLogging|$)/;
            const match1 = testSummaryRegex.exec(reportText);
            const testSummaryText = match1[1].trim();
        
            const resultRegex = /([A-Za-z\s]+):\s*(\w+)\s?\(([^)]+)\)/g;
            let testResults = [];
            let match;
        
            // Use regex to find all matching test results
            while ((match = resultRegex.exec(testSummaryText)) !== null) {
                const testName = match[1].trim();  // Test name
                const testStatus = match[2];  // Test status (e.g., Passed, Failed)
                const testValue = match[3];  // Test value or details
        
                testResults.push({
                    name: testName,
                    status: testStatus,
                    value: testValue
                });
            }
            return testResults;
        };
        
        const compareTestResults = (qualityControlReport, testingReport) => {
            const qcResults = extractTestResults(qualityControlReport);
            const testingResults = extractTestResults(testingReport);
        
            let fraudMessages = [];
        
            // Map QC test results by test name for easier comparison
            let qcResultsMap = {};
            for (const result of qcResults) {
                qcResultsMap[result.name] = parseFloat(result.value.match(/([\d\.]+)/)[0]);
            }
        
            // Compare results with Testing stage
            for (const test of testingResults) {
                const testName = test.name;
                const testValue = parseFloat(test.value.match(/([\d\.]+)/)[0]);
        
                if (qcResultsMap[testName] !== undefined) {
                    const qcValue = qcResultsMap[testName]; 
                    console.log(`Test: ${testName}, QC Value: ${qcValue}, Test Value: ${testValue}, Difference: ${testValue - qcValue}`);
       
                    // Check for discrepancy greater than 1.0
                    if (Math.abs(testValue - qcValue) > 1.0) {
                        fraudMessages.push(
                            `Fraud detected: ${testName} discrepancy between Quality Control (${qcValue}) and Testing (${testValue}) exceeds acceptable limit.`
                        );
                    }
                } else {
                    fraudMessages.push(`Test ${testName} is missing in Quality Control results.`);
                }
            }
        
            return fraudMessages;
        };

        if (!qcReport || !decryptedContent) {
            throw new Error(`Either Quality Control or Testing report is invalid or missing.`);
        }
        const resultMessages = compareTestResults(qcReport, decryptedContent);
        console.log('Result Messages:', resultMessages);

        // Ensure resultMessages is an array and merge it with fraudMessages
        if (resultMessages && Array.isArray(resultMessages)) {
            fraudMessages.push(...resultMessages);
        } else if (resultMessages) {
            // If resultMessages is not an array, push it directly
            fraudMessages.push(resultMessages);
        }

        const cctvPattern = /CCTV Monitoring:[\s\S]*?file reference\s*([\w-]+)/;
        const cctvMatch = decryptedContent.match(cctvPattern);
        if (!cctvMatch) {
            fraudMessages.push('CCTV monitoring details not found in the warehousing report.');
        }

        // Check for Tamper-Seal Verification
        if (!decryptedContent.includes("Tamper-Seal Verification: Verified intact before testing.")) {
            fraudMessages.push("Tamper-Seal Verification is missing or not verified as intact in the report.");
        }

        // Check for warehouse inventory adjustment
        const collectedPattern = /Collected:.*by (.+?) from warehouse ([A-Z])/;
        const collectedMatch = decryptedContent.match(collectedPattern);
        if (collectedMatch) {
            const collector = collectedMatch[1];
            const warehouse = collectedMatch[2];
            console.log(`Collector: ${collector}, Warehouse: ${warehouse}`);

            // Retrieve warehouse data
            let warehouseDataBytes = await stub.getState(warehouse);
            if (!warehouseDataBytes || warehouseDataBytes.length === 0) {
                return shim.error(`Warehouse ${warehouse} data not found. Cannot adjust inventory.`);
            }

            let warehouseData = JSON.parse(warehouseDataBytes.toString());

            // Check if Sample PackageID matches PackageID
            const samplePackageIDPattern = /Sample PackageID:\s*(\S+)/;
            const sampleMatch = decryptedContent.match(samplePackageIDPattern);
            if (sampleMatch) {
                const samplePackageID = sampleMatch[1];
                if (samplePackageID === packageID) {
                    //warehouseData.inventory -= 1;
                    console.log(`This packege was removed from Warehouse ${warehouse}: ${warehouseData.inventory}`);

                    // Save updated warehouse data back to the ledger
                    //await stub.putState(warehouse, Buffer.from(JSON.stringify(warehouseData)));
                }
            } else {
                fraudMessages.push("Sample PackageID not found in the report.");
            }
        } else {
            fraudMessages.push("Collector or warehouse information is missing in the report.");
        }
        
    
        // If any fraud messages exist, return them, otherwise return success
        if (fraudMessages.length > 0) {
            return shim.error(fraudMessages.join("\n"));
        } else {
            console.log("Testing checks passed successfully.");
            return shim.success("Testing checks passed successfully.");
        }
    }

    async detectDistributionFraud(stub, args) {
        try {
            const [batchNumber, packageID] = args;
            console.log(`batchNumber: ${batchNumber}, packageID: ${packageID}`);
    
            // Retrieve and validate batch data
            const batchDataAsBytes = await stub.getState(batchNumber);
            if (!batchDataAsBytes || batchDataAsBytes.length === 0) {
                throw new Error(`Batch ${batchNumber} not found. Cannot perform fraud detection.`);
            }
    
            const batchData = JSON.parse(batchDataAsBytes.toString());
            const packageData = batchData.packages && batchData.packages[packageID];
            if (!packageData) {
                throw new Error(`Package ${packageID} not found in batch ${batchNumber}.`);
            }
    
            const distributionStep = packageData.steps.find(step => step.step === 'Distribution');
            if (!distributionStep) {
                throw new Error(`Distribution step data not found for Package ${packageID} in Batch ${batchNumber}.`);
            }
    
            const { warehouse, transportID, destination, dateAndTime, report } = distributionStep;
            if (!warehouse || !transportID || !destination || !dateAndTime || !report) {
                throw new Error(`Critical Distribution data missing for batch ${batchNumber}, package ${packageID}.`);
            }
    
            const testingStep = packageData.steps.find(step => step.step === 'Testing');
            if (!testingStep) {
                throw new Error(`Testing step data missing for batch ${batchNumber}.`);
            }
    
            // Validate distribution date
            const distributionDateObj = new Date(dateAndTime);
            const testingDate = new Date(testingStep.testingDate);
            const presentDate = new Date();
    
            if (distributionDateObj < testingDate) {
                throw new Error(`Distribution date is before testing date for batch ${batchNumber}, package ${packageID}.`);
            }
    
            if (distributionDateObj > presentDate) {
                throw new Error(`Distribution date is in the future for batch ${batchNumber}, package ${packageID}.`);
            }
    
            // Decrypt Distribution report
            const temp_report="2+R38Tjs591w63u9YUZFK5ENzKKjsyHvETN07Oa/fh3vn76LNG0H6nW/z89biAsigbrnz20zPMJ0ScH1M8pPN/i+SqFJWwb3guhzJrLcvhC/23j4E3R5WepMgBByj7U1XoAoZ0quWnU9hZO5lIsilG5rdOM1I5MYyssTXoxAsHpDSlCKbEyk0g6mUwTiJW5yD+UzrX1k4tTo0ZAAo7SablUIayVk1zZYluRmMM+8EBaQdfclgbA6ZpgyUbj0oO+AfrsgIrndCv7kD3P5IneE8bhmz/JduM06lrBgPmZD56y3WJKKXLbER96Y43q+FhJe01S0C9ABIMoYjSLS6jjMpSGY2g8uKezUqGPTX1n5fKhupaRX1yegMTOE3oXLijJWFRB4US4CqAuWMiAfazC1yVKnO2HVNF9yvBcmI+8hV+QMoQzflrA8nYVKzUkZ1ZhxeTEU4uK25zRYrqPvE74oI325qCmT2R7zj9UqyAl6PyBEM6XRQklxYd+j6b6eG/ehDRCLJKblHrtWm2SbVr3Hsy8xhEKK8lzfqDxW0VbTJFDIZ9J23Tv1KC+O/rfHnmkL4m5z3xrKroYI5b2ZumRkM7GIvqpnTKHn9s8IIIcSTmkc0LgkVLxcXNMfBAJGzWSeD6rhZsTCJMh9+Wxb18S9jIlcI3oFGFjkbBmge4RUCqefSjMlbijuwA4E0vAcT8WOAyZez50JGsTcQ2P9oJqKFVb6izCVH9VTxmuaNc54k607yl+dUkcBo562YGL91geBQ3dsz8aEVAhu/KlZWkln/RmkFNSTiCHOsTd207t69COT9sV1FcIIba+gP2jQqOUyT7/QUDAlMkCaMjukjXjPXL9akZmEBwghdPMXLbZcYup0jqh/pRqwwLm8KeBeTwBjFjAltscpZ7zPLzQz0JGGRylw8AFaZXYpOq9/U4ksGf5WOHYyhVZLBj6MFK/aFWPSWrjBBmKZalSE2LnbGpwRmfPjkjveyYvb4i8pydq3vuK2JNKw0mvW/7rZnELFNnqb8YRunbMfdGdncvKaDAqLlaG7kFiizZceWrBGtc26ZkRy/NcOOgzjxPtJgq04Kv6doGIQc7AmFoy9CFdr9n5VrPBWgunioi6cY+NsmNLhPSaZWPDKRawdwJ9EZ7dAd7IzH1/BRoJJH+jSwvB1ND71Yx/VpuS6QJfWKTrhFFlDh2tTWbQTnwucfNp5U1XjfIQuYIAv+pZaOKkbJt4zQcblFAkguzwSNwAqNPtLk+ukHj4DmmqwKF9Y7DGLmbFV+8kcoCdiu+mGWlz63ZdAoXBjd1x4AkfEMhkhQCWvVZkysfUWL8l7yP8TL79pJBdXf4Ahv9i5mquw1G7Il2amnyACxHfYMK4Eg1AeGNQRNHITc/Op/vQy83TJ9rk43jyRqgaU16RyLmz4svbDPLWVfyi8IKijA7C1l0kuRZP6Zhjx0mktQSc0W/x4hycUWWThlJWbco9TB/YifC653isCihAgAgvAaoDjfKnl1uTlJpovGRnjuOM5TA8go6O9mbeUNWw9JdgZ0p1cJcO6JRjPoCRC/tb8oSOPcVLfBMc+EsUwdl/8xW9QO9OKQX4DoBsf92Z4eLhwX1qggFVWApFYVN0AjSfOy+2yePv6Ty53D8cwXTGkUNCoxUSnNJYr4Aq6Xza92G0lxAvNYenI1qxQusTn2/HkjDsaXQC0OLtfTpp3rmYb9V6l57+VRQfv0iudZcwRP5QbxJ0JJWoaXSsm2LkeYx1oLn5CTn+VTFrhOB2ey7/G7wPnCS9/vCG30nSXcn2hTon8C9aV8McjWtcp/j09ShjQrk66DFRRUZKE5HBZrO9fXQcSvHBKd6DsWSo3oKASHnxjAIjUUR/94WOA7PabmFQ5P3KXHsEF7GPBp5velPJCwSkKDYVrmiSqtEGgewesHFnzruLCf44bD3O5w+V0w9Q94seA2361N7vBVm3p5X+7Yvud14LIxU8xWvVr6VbwkchBSbQ70QlnqwXirKcH2f5nVBvZUerh8964aBMA58nS9txxkXV3stdrsCH6/G65XlMBVTqIFNJ5yq/tAXisgh2uaPd+m4iLkkyuAb3MMYC9ozulpVoxquyOmvhQ89uRtv51kuI2+Zi7WCBuHAgadkA7GxkH2WgwnGMS0W8LB2yQpHlpPNqrX0rcHvuQ2Leq";

            const decryptedContent = decrypt(report); // Replace later
            console.log(`Decrypted Content:`, decryptedContent);
    
            const fraudMessages = [];
    
            // Validate transporter information
            const transporterMatch = decryptedContent.match(/Driver's ID:\s*(\w+)/);
            if (!transporterMatch ) {
                fraudMessages.push("Transporter details do not found in the report.");
            }
            const VehicleMatch = decryptedContent.match(/Vehicle ID:\s*(\w+-[\d.][\d.])/);
            if (!VehicleMatch || VehicleMatch[1] !== transportID) {
                fraudMessages.push("Vehicle details do not match the recorded information.");
            }

            // Check for warehouse inventory adjustment
            const collectedPattern = /collected by (.+?) from warehouse ([A-Za-z0-9]+)/i;
            const collectedMatch = decryptedContent.match(collectedPattern);
            if (collectedMatch) {
                const collector = collectedMatch[1];
                const warehouse_r = collectedMatch[2];
                console.log(`Collector: ${collector}, Warehouse: ${warehouse_r}`);

                // Retrieve warehouse data
                let warehouseDataBytes = await stub.getState(warehouse_r);
                if (!warehouseDataBytes || warehouseDataBytes.length === 0) {
                    return shim.error(`Warehouse ${warehouse} data not found. Cannot adjust inventory.`);
                }
                if (warehouse_r!=warehouse) {
                    fraudMessages.push(`Mismatch in warehouse: expected ${warehouse}, found ${warehouse_r}.`);
                }
            } else {
                fraudMessages.push("Collector or warehouse information is missing in the report.");
            }
    
            // Validate delivery conditions (temperature, vehicle type)
            if (!decryptedContent.includes("Temperature: Maintained within the optimal range (15°C–25°C)")) {
                fraudMessages.push("Temperature control condition not met.");
            }
            if (!decryptedContent.includes("Vehicle Type: Temperature-Controlled Transport Truck")) {
                fraudMessages.push("Incorrect vehicle type for transport.");
            }
    
            // Check for tampering evidence
            if (!decryptedContent.includes("Tamper-Seal Verification: Verified intact after delivery.")) {
                fraudMessages.push("Tamper-Seal Verification missing or not verified as intact after delivery.");
            }
            // Extract the destination from the report
            const destinationPattern = /arrived at (.+?) Car Service Center\./;
            const destinationMatch = decryptedContent.match(destinationPattern);
            if (!destinationMatch) {
                fraudMessages.push("Destination information missing in the report.");
            } else {
                const extractedDestination = destinationMatch[1].trim();
                console.log(`Extracted Destination: ${extractedDestination}`);

                // Compare extracted destination with blockchain destination
                if (extractedDestination !== destination) {
                    fraudMessages.push(`Destination mismatch: Expected ${destination}, found ${extractedDestination}.`);
                }
            }

    
            // Final fraud validation
            if (fraudMessages.length > 0) {
                return shim.error(fraudMessages.join("\n"));
            }
    
            console.log("Distribution checks passed successfully.");
            return shim.success("Distribution checks passed successfully.");
        } catch (error) {
            console.error(`Error in detectDistributionFraud: ${error.message}`);
            return shim.error(error.message);
        }
    }

    async detectServiceCenterFraud(stub, args) {
        if (args.length !== 2) {
            return shim.error('Incorrect number of arguments. Expecting 2: batchNumber, packageID');
        }
    
        const batchNumber = args[0];
        const packageID = args[1];
    
        // Retrieve the existing batch data
        let batchDataAsBytes = await stub.getState(batchNumber);
        if (!batchDataAsBytes || batchDataAsBytes.length === 0) {
            return shim.error(`Batch ${batchNumber} not found. Cannot check service center data.`);
        }
    
        let batchData = JSON.parse(batchDataAsBytes.toString());
    
        // Ensure the package exists in the batch
        let packageData = batchData.packages && batchData.packages[packageID];
        if (!packageData) {
            return shim.error(`Package ${packageID} not found in batch ${batchNumber}.`);
        }
    
        // Check for any service center fraud detected in the steps
        const serviceCenterStep = packageData.steps.find(step => step.step === 'Car Service Center');
        if (!serviceCenterStep) {
            return shim.error(`No service center data found for Package ${packageID} in Batch ${batchNumber}.`);
        }

        const {ServiceCenterID, date, report } = serviceCenterStep;
        if (!ServiceCenterID || !date || !report) {
            throw new Error(`Critical service Center data missing for batch ${batchNumber}, package ${packageID}.`);
        }

        const distributionStep = packageData.steps.find(step => step.step === 'Distribution');
        if (!distributionStep) {
            throw new Error(`Distribution step data not found for Package ${packageID} in Batch ${batchNumber}.`);
        }
    
        // Validate date
        const ServiceCenterObj = new Date(date);
        const distributionDate = new Date(distributionStep.dateAndTime);
        const presentDate = new Date();

        if (ServiceCenterObj < distributionDate) {
            throw new Error(`ServiceCenter date is before Distribution date for batch ${batchNumber}, package ${packageID}.`);
        }

        if (ServiceCenterObj > presentDate) {
            throw new Error(`Distribution date is in the future for batch ${batchNumber}, package ${packageID}.`);
        }
    
        const fraudMessages = [];

        const decryptedContent = decrypt(report); // Replace later with actual decryption logic
        console.log(`Decrypted Content:`, decryptedContent);

        // Check if the service center report contains relevant information (e.g., service center ID, oil type, etc.)
        const serviceCenterIDMatch = decryptedContent.match(/delivered to (.+?) Car Service Center/);
        if (!serviceCenterIDMatch || serviceCenterIDMatch[1] !== ServiceCenterID) {
            fraudMessages.push("Service center ID in the report does not match the provided ServiceCenterID.");
        }

        // Extract Oil Type from report
        const oilTypeMatch = decryptedContent.match(/Oil Type and Grade:\s*(.*?),/);
        if (!oilTypeMatch) {
            fraudMessages.push("Oil type information missing in the report.");
        } else {
            console.log(`Oil Type:`, oilTypeMatch[1]);
        }

        const cctvPattern = /CCTV Monitoring:[\s\S]*?file reference\s*([\w-]+)/;
        const cctvMatch = decryptedContent.match(cctvPattern);
        if (!cctvMatch) {
            fraudMessages.push('CCTV monitoring details not found in the warehousing report.');
        }

        // Extract Pricing Details
        const serviceFeeMatch = decryptedContent.match(/Service Fee:\s*\$(\d+)/);
        const oilCostMatch = decryptedContent.match(/Oil Cost:\s*\$(\d+)/);
        const totalCostMatch = decryptedContent.match(/Total Cost to Customer:\s*\$(\d+)/);
        const invoiceMatch = decryptedContent.match(/Customer Invoice:\s*(.*?provided)/);
        const packagesizeMatch=decryptedContent.match(/Package Size:\s*(\d+)L/);
        

        // Validate Service Fee
        if (!serviceFeeMatch || serviceFeeMatch[1] !== "70") {
            fraudMessages.push("Service fee is not correct. Expected $70.");
        }
        if (!packagesizeMatch) {
            fraudMessages.push("package size is missing.");
        }
        const packageSize = packagesizeMatch ? parseInt(packagesizeMatch[1], 10) : null; // Convert to number

        if (!packageSize) {
            fraudMessages.push("Invalid package size.");
        }

        // Calculate expected oil cost based on package size
        let expectedOilCost;
        if (packageSize === 1) {
            expectedOilCost = 15; // Example: 1L package costs $15
        } else if (packageSize === 4) {
            expectedOilCost = 50; // Example: 4L package costs $50
        } else if (packageSize === 20) {
            expectedOilCost = 200; // Example: 20L package costs $200
        } else {
            fraudMessages.push("Unexpected package size.");
        }

        // Validate Oil Cost based on expected value
        if (!oilCostMatch || parseInt(oilCostMatch[1]) !== expectedOilCost) {
            fraudMessages.push(`Oil cost is not correct for package size ${packageSize}. Expected $${expectedOilCost}.`);
        }

        // Calculate total cost to customer (Service Fee + Oil Cost)
        const expectedTotalCost = 70 + expectedOilCost; // Service Fee ($70) + Oil Cost (calculated above)

        // Validate Total Cost to Customer
        if (!totalCostMatch || parseInt(totalCostMatch[1]) !== expectedTotalCost) {
            fraudMessages.push(`Total cost to customer is not correct. Expected $${expectedTotalCost}.`);
        }

        // Check if Customer Invoice was provided
        if (!invoiceMatch) {
            fraudMessages.push("Customer invoice information is missing in the report.");
        }

        // Check Customer Feedback

        const customerFeedbackMatch = decryptedContent.match(/Customer Feedback:\s*(.*)/);
    
        if (!customerFeedbackMatch) {
            fraudMessages.push("Customer feedback missing in the report.");
        } else {
            const feedbackText = customerFeedbackMatch[1].toLowerCase();
            if (feedbackText.includes("significant improvements") || feedbackText.includes("smoother acceleration") || feedbackText.includes("reduced engine noise")) {
                console.log("Customer feedback is positive.");
            } else {
                return shim.error("Customer feedback indicates dissatisfaction. Fraud detected.");
            }
        }
    
        // If any fraud messages exist, return them, otherwise return success
        if (fraudMessages.length > 0) {
            return shim.error(fraudMessages.join("\n"));
        } else {
            console.log("Service Center checks passed successfully.");
            return shim.success("Service Center checks passed successfully.");
        }
    }

    async Check_Status(stub,args) {
        const batchNumber = args[0];
        const packageID = args[1];

        
        // Retrieve the existing batch data
        let batchDataAsBytes = await stub.getState(batchNumber);
        if (!batchDataAsBytes || batchDataAsBytes.length === 0) {
            return shim.error(`Batch ${batchNumber} not found.`);
        }

        let batchData = JSON.parse(batchDataAsBytes.toString());

        console.log(`Data for batch ${batchNumber} found.`);
    
        // Iterate through the steps
        const steps_1 = batchData.steps || [];
        for (let stepData of steps_1) {    
            // Processing Step
            if (batchData.step === 'Processing') {
                console.log(`--- Step: Processing ---`);
                console.log(`Processing Date: ${batchData.processingDateTime}`);
            }
    
            // Quality Control Step
            if (stepData.step === 'Quality Control') {
                console.log(`--- Step: Quality Control ---`);
                console.log(`Quality Control Date: ${stepData.testingDateTime}`);
            }
    
            // Packaging Step
            if (batchData.Packaging.step === 'Packaging') {
                console.log(`--- Step: Packaging ---`);
                console.log(`Packaging Date: ${batchData.Packaging.packagingDateTime}`);
                console.log(`Container Issues: ${JSON.stringify(batchData.Packaging.containerIssues)}`);
            }
            break;
        }


        const packageData = batchData.packages && batchData.packages[packageID];
        if (!packageData) {
            throw new Error(`Package ${packageID} not found in batch ${batchNumber}.`);
        }
        const steps = packageData.steps || [];
        for (let stepData of steps) {
            console.log(`--- Step: ${stepData.step} ---`);

            // Warehousing Step
            if (stepData.step === 'Warehousing') {
                console.log(`Warehouse entry Date: ${stepData.entryTime}`);
                console.log(`Warehouse building: ${stepData.warehouse.building}`)
            }

            // Testing Step
            if (stepData.step === 'Testing') {
                console.log(`Testing Date: ${stepData.testingDate}`);
                console.log(`warehouse: ${stepData.warehouse}`);
                console.log(`sampleID: ${stepData.sampleID}`);
            }

            // Distribution Step
            if (stepData.step === 'Distribution') {
                console.log(`Distribution Date: ${stepData.dateAndTime}`);
                console.log(`warehouse: ${stepData.warehouse}`);
                console.log(`transportID: ${stepData.transportID}`);
                console.log(`Destination: ${stepData.destination}`);
            }

            // Car Service Center Step
            if (stepData.step === 'Car Service Center') {
                console.log(`Car Service Center Date: ${stepData.date}`);
                console.log(`ServiceCenterID: ${stepData.ServiceCenterID}`)
            }
        }
    
        return shim.success('Check_Status executed successfully.');
    }
    
}    
// Start the chaincode
shim.start(new BatchContract());
