import axios from 'axios';
import FormData from 'form-data';

const FILE_VERIFICATION_SERVICE_URL = process.env.FILE_VERIFICATION_SERVICE_URL;

/**
 * Verify file by delegating to file-verification-microservice
 * @param {Buffer} fileBuffer - The file data as a Buffer
 * @param {string} mimeType - The MIME type of the file
 * @param {string} filename - The name of the file
 * @returns {Object} Verification result
 * @returns {boolean} return.isSafe - Whether the file is safe
 * @returns {string} return.filename - Original filename
 * @returns {number} return.size - File size in bytes
 * @returns {string} return.hash - SHA-256 hash of the file
 * @returns {string} return.signature - Digital signature
 * @returns {string} return.mimeType - Detected MIME type
 * @returns {string} return.verifiedAt - ISO timestamp of verification
 * @returns {Array<string>} return.warnings - List of warnings
 * @returns {Array<string>} return.errors - List of errors
 * @returns {Object} return.securityChecks - Security check results
 * @returns {Object} return.securityChecks.sizeCheck - File size validation
 * @returns {Object} return.securityChecks.mimeValidation - MIME type validation
 * @returns {Object} return.securityChecks.steganography - Steganography detection
 * @returns {Object} return.securityChecks.malwareCheck - Malware pattern detection
 */
export async function verifyFile(fileBuffer, mimeType, filename) {
    try {
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: filename,
            contentType: mimeType
        });

        const response = await axios.post(
            `${FILE_VERIFICATION_SERVICE_URL}/api/files/verify`,
            formData,
            {
                headers: formData.getHeaders(),
                maxBodyLength: Infinity,
                timeout: 30000
            }
        );

        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(
                `File verification failed: ${error.response.data.message || error.message}`
            );
        }
        throw new Error(`File verification service unavailable: ${error.message}`);
    }
}

/**
 * Sanitize file by delegating to file-verification-microservice
 * Removes metadata from the file and returns the sanitized buffer
 * @param {Buffer} fileBuffer - The file data as a Buffer
 * @param {string} mimeType - The MIME type of the file
 * @param {string} filename - The name of the file
 * @returns {Buffer} Sanitized file buffer without metadata
 */
export async function sanitizeFile(fileBuffer, mimeType, filename) {
    try {
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: filename,
            contentType: mimeType
        });

        const response = await axios.post(
            `${FILE_VERIFICATION_SERVICE_URL}/api/files/sanitize`,
            formData,
            {
                headers: formData.getHeaders(),
                maxBodyLength: Infinity,
                timeout: 30000
            }
        );

        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(
                `File verification failed: ${error.response.data.message || error.message}`
            );
        }
        throw new Error(`File verification service unavailable: ${error.message}`);
    }
}

/**
 * Calculate file hash
 * @param {Buffer} fileBuffer - The file data as a Buffer
 * @param {string} filename - The name of the file
 * @returns {Object} Hash calculation result
 * @returns {boolean} return.success - Operation success status
 * @returns {string} return.filename - Original filename
 * @returns {number} return.size - File size in bytes
 * @returns {string} return.hash - SHA-256 hash of the file
 * @returns {string} return.algorithm - Hashing algorithm used (SHA-256)
 * @returns {string} return.calculatedAt - ISO timestamp of calculation
 */
export async function calculateHash(fileBuffer, filename) {
    try {
        const formData = new FormData();
        formData.append('file', fileBuffer, { filename });

        const response = await axios.post(
            `${FILE_VERIFICATION_SERVICE_URL}/api/files/hash`,
            formData,
            {
                headers: formData.getHeaders(),
                maxBodyLength: Infinity,
                timeout: 10000
            }
        );

        return response.data;
    } catch (error) {
        throw new Error(`Hash calculation failed: ${error.message}`);
    }
}

/**
 * Verify file signature
 * @param {string} hash - The file hash
 * @param {string} signature - The digital signature to verify
 * @returns {Object} Signature verification result
 * @returns {boolean} return.success - Operation success status
 * @returns {boolean} return.valid - Whether the signature is valid
 * @returns {string} return.verifiedAt - ISO timestamp of verification
 */
export async function verifySignature(hash, signature) {
    try {
        const response = await axios.post(
            `${FILE_VERIFICATION_SERVICE_URL}/api/files/verify-signature`,
            { hash, signature },
            { timeout: 5000 }
        );

        return response.data;
    } catch (error) {
        throw new Error(`Signature verification failed: ${error.message}`);
    }
}

/**
 * Quick check if service is available
 * @returns {boolean} True if service is healthy, false otherwise
 */
export async function healthCheck() {
    try {
        const response = await axios.get(
            `${FILE_VERIFICATION_SERVICE_URL}/health`,
            { timeout: 3000 }
        );
        return response.data.status === 'OK';
    } catch (error) {
        return false;
    }
}

/**
 * Comprehensive security scan of a file
 * Performs all security checks including steganography and malware detection
 * @param {Buffer} fileBuffer - The file data as a Buffer
 * @param {string} mimeType - The MIME type of the file
 * @param {string} filename - The name of the file
 * @returns {Object} Comprehensive scan result
 * @returns {boolean} return.success - Whether the file passed all security checks
 * @returns {string} return.filename - Original filename
 * @returns {Object} return.fileInfo - File information
 * @returns {number} return.fileInfo.size - File size in bytes
 * @returns {string} return.fileInfo.declaredMimeType - MIME type provided by client
 * @returns {string} return.fileInfo.detectedMimeType - MIME type detected by server
 * @returns {string} return.fileInfo.hash - SHA-256 hash
 * @returns {string} return.fileInfo.entropy - File entropy (randomness measure)
 * @returns {Object} return.securityAnalysis - Security analysis results
 * @returns {string} return.securityAnalysis.overallRisk - Risk level (LOW/HIGH)
 * @returns {Object} return.securityAnalysis.checks - Individual security checks
 * @returns {Object} return.securityAnalysis.checks.fileSize - Size validation results
 * @returns {Object} return.securityAnalysis.checks.mimeTypeValidation - MIME type validation
 * @returns {Object} return.securityAnalysis.checks.steganographyDetection - Steganography detection
 * @returns {Object} return.securityAnalysis.checks.malwarePatterns - Malware pattern detection
 * @returns {Array<string>} return.securityAnalysis.warnings - List of warnings
 * @returns {Array<string>} return.securityAnalysis.errors - List of errors
 * @returns {Object} return.verification - Verification metadata
 * @returns {string} return.verification.hash - File hash
 * @returns {string} return.verification.signature - Digital signature
 * @returns {string} return.verification.timestamp - ISO timestamp
 */
export async function comprehensiveScan(fileBuffer, mimeType, filename) {
    try {
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: filename,
            contentType: mimeType
        });

        const response = await axios.post(
            `${FILE_VERIFICATION_SERVICE_URL}/api/files/scan`,
            formData,
            {
                headers: formData.getHeaders(),
                maxBodyLength: Infinity,
                timeout: 30000
            }
        );

        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(
                `Comprehensive scan failed: ${error.response.data.message || error.message}`
            );
        }
        throw new Error(`File verification service unavailable: ${error.message}`);
    }
}

/**
 * Detect real content type of a file buffer
 * @param {Buffer} fileBuffer - The file data as a Buffer
 * @returns {String} - Detected MIME type
*/
export async function detectContentType(fileBuffer) {
    //TODO: Implement MIME type detection logic here
}