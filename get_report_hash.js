const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const algorithm = 'aes-256-cbc';
const key = Buffer.from('2a940d2f513159eee389f27d788aaf23fcad2c751e21cafa102c4a3224fc6c91', 'hex');
const iv = Buffer.from('20ddae9f64e26e46c9253fbdf703df36', 'hex');

function compress(text) {
    return zlib.deflateSync(text).toString('base64');
}

function decompress(text) {
    return zlib.inflateSync(Buffer.from(text, 'base64')).toString();
}

function encrypt(stage, batchNumber) {
    const folderPath = __dirname;
    const fileName = `${stage}_B${batchNumber}.txt`;
    const filePath = path.join(folderPath, fileName);

    try {
        const reportContent = fs.readFileSync(filePath, 'utf8');

        // Compress before encryption
        const compressedContent = compress(reportContent);

        let cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(compressedContent);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return encrypted.toString('base64'); // Return only the encrypted data
    } catch (error) {
        console.error('Error reading the file:', error);
        return null;
    }
}

function decrypt(encryptedData) {
    let iv = Buffer.from('20ddae9f64e26e46c9253fbdf703df36', 'hex');
    let encryptedText = Buffer.from(encryptedData, 'base64');
    let decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // Decompress after decryption
    const decompressedContent = decompress(decrypted.toString());

    return decompressedContent;
}

// Example usage:
//const stage = 'Processing';
const stage= 'QualityControl';
const batchNumber = 1;

const encrypted = encrypt(stage, batchNumber);
console.log("Encrypted:", encrypted);

const decrypted = decrypt(encrypted);
console.log("Decrypted:", decrypted);
