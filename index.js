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
        if (args.length !== 4) {
            return shim.error('Incorrect number of arguments. Expecting 4: batchNumber, testResultsHash, report, testingDateTime');
        }
    
        const batchNumber = args[0];
        const testResultsHash = args[1];
        const report = args[2];
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
            
            testResultsHash,
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

        // Example 3: Check for required personnel signature
        // const personnelPattern = /Name:\s*(.+?)\s*Role:\s*(.+?)(?:\n|$)/g; // Updated regex
        // let personnelMatch;
        // let operatorFound = false;

        // while ((personnelMatch = personnelPattern.exec(decryptedContent)) !== null) {
        //     console.log(`Matched Name: ${personnelMatch[1]}`);
        //     console.log(`Matched Role: ${personnelMatch[2]}`);
        //     const name = personnelMatch[1].trim();
        //     const role = personnelMatch[2].trim().toLowerCase(); // Normalize to lowercase
        //     console.log(`Found Personnel - Name: ${name}, Role: ${role}`);
            
        //     // Match role containing 'operator'
        //     if (role.includes('operator')) {
        //         operatorFound = true;
        //         console.log(`Operator role detected: ${name} (${role})`);
        //         break; // Stop as soon as we find an operator
        //     }
        // }

        // // Add fraud message if no operator found
        // if (!operatorFound) {
        //     fraudMessages.push('Operator signature missing in the report.');
        // }
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
        const { testResultsHash, report, testingDateTime } = qcStep;
    
        // Check if required data is present
        if (!testResultsHash || !report || !testingDateTime) {
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

    
        // Recalculate and validate the test results hash
        const recalculatedHash = crypto.createHash('sha256').update(decryptedContent).digest('hex');
        if (recalculatedHash !== testResultsHash) {
            return shim.error(`Test results hash mismatch for batch ${batchNumber}. Possible tampering detected.`);
        }
    
        return shim.success(Buffer.from(`Quality Control data for batch ${batchNumber} passed fraud detection.`));
    }
}    
// Start the chaincode
shim.start(new BatchContract());
