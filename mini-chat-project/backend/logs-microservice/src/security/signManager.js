import fs from 'fs';
import crypto from 'crypto';

function loadKey(envPathVar) {
  const path = process.env[envPathVar];
  if (path) {
    try {
      return fs.readFileSync(path, 'utf8');
    } catch (err) {
      console.error(`Error leyendo clave desde ${path}:`, err.message);
      throw err;
    }
  }
  return null;
}

const PRIVATE_KEY = loadKey('PRIVATE_KEY_PATH');
const PUBLIC_KEY = loadKey('PUBLIC_KEY_PATH');

if (!PRIVATE_KEY || !PUBLIC_KEY) {
  console.warn('Signing keys not found in env. Set PRIVATE_KEY_PATH and PUBLIC_KEY_PATH.');
}

/**
 * Firma un hash (hex o string) y devuelve la firma en base64
 * @param {string} dataToSign - el hash o contenido a firmar
 * @returns {string} signatureBase64
 */
export function signHash(dataToSign) {
  if (!PRIVATE_KEY) throw new Error('Private Key Not Found');
  const sign = crypto.createSign('SHA256');
  sign.update(dataToSign);
  sign.end();
  const signature = sign.sign(PRIVATE_KEY);
  return signature.toString('base64');
}

export function verifySignature(data, signatureBase64) {
  if (!PUBLIC_KEY) throw new Error('Public Key Not Found');
  const verify = crypto.createVerify('SHA256');
  verify.update(data);
  verify.end();
  return verify.verify(PUBLIC_KEY, Buffer.from(signatureBase64, 'base64'));
}
