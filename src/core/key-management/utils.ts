/**
 * Key Management Utilities
 * 
 * Utility functions for key management operations
 */

import { KeyAlgorithm, KeyFormat, KeyUsage } from './types';

/**
 * Generate a key pair using the specified algorithm
 */
export async function generateKeyPair(algorithm: KeyAlgorithm = KeyAlgorithm.ED25519): Promise<{
  publicKey: string;
  privateKey: string;
  algorithm: KeyAlgorithm;
}> {
  // This is a simplified implementation
  // In a real implementation, you'd use proper cryptographic libraries
  const publicKey = generateRandomKey();
  const privateKey = generateRandomKey();

  return {
    publicKey,
    privateKey,
    algorithm
  };
}

/**
 * Import a key from JWK format
 */
export function importKeyFromJWK(jwk: JsonWebKey, algorithm: KeyAlgorithm): {
  privateKey: string;
  publicKey: string;
} {
  // This is a simplified implementation
  // In a real implementation, you'd properly parse the JWK
  return {
    privateKey: jwk.d || '',
    publicKey: jwk.x || ''
  };
}

/**
 * Export a key to JWK format
 */
export function exportKeyToJWK(privateKey: string, publicKey: string, algorithm: KeyAlgorithm): JsonWebKey {
  // This is a simplified implementation
  // In a real implementation, you'd properly construct the JWK
  return {
    kty: 'EC',
    crv: 'P-256',
    d: privateKey,
    x: publicKey
  };
}

/**
 * Validate key format
 */
export function validateKeyFormat(keyData: string, format: KeyFormat): boolean {
  switch (format) {
    case KeyFormat.JWK:
      try {
        const jwk = JSON.parse(keyData);
        return jwk.kty && jwk.crv;
      } catch {
        return false;
      }
    case KeyFormat.PEM:
      return keyData.includes('-----BEGIN') && keyData.includes('-----END');
    case KeyFormat.RAW:
      return keyData.length > 0;
    case KeyFormat.BASE64:
      try {
        Buffer.from(keyData, 'base64');
        return true;
      } catch {
        return false;
      }
    case KeyFormat.HEX:
      return /^[0-9a-fA-F]+$/.test(keyData);
    default:
      return false;
  }
}

/**
 * Derive a key from a password
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: string,
  algorithm: KeyAlgorithm = KeyAlgorithm.AES_256
): Promise<string> {
  // This is a simplified implementation
  // In a real implementation, you'd use proper key derivation functions
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);
  
  // Simple hash-based derivation (not secure for production)
  const combined = new Uint8Array(passwordBuffer.length + saltBuffer.length);
  combined.set(passwordBuffer);
  combined.set(saltBuffer, passwordBuffer.length);
  
  return Buffer.from(combined).toString('base64');
}

/**
 * Generate a random key
 */
export function generateRandomKey(length: number = 32): string {
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto.getRandomValues
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Buffer.from(array).toString('base64');
}

/**
 * Convert key format
 */
export function convertKeyFormat(
  keyData: string,
  fromFormat: KeyFormat,
  toFormat: KeyFormat
): string {
  // This is a simplified implementation
  // In a real implementation, you'd properly convert between formats
  
  if (fromFormat === toFormat) {
    return keyData;
  }

  switch (fromFormat) {
    case KeyFormat.JWK:
      if (toFormat === KeyFormat.PEM) {
        return jwkToPem(keyData);
      }
      break;
    case KeyFormat.PEM:
      if (toFormat === KeyFormat.JWK) {
        return pemToJwk(keyData);
      }
      break;
    case KeyFormat.RAW:
      if (toFormat === KeyFormat.BASE64) {
        return Buffer.from(keyData, 'hex').toString('base64');
      }
      break;
    case KeyFormat.BASE64:
      if (toFormat === KeyFormat.HEX) {
        return Buffer.from(keyData, 'base64').toString('hex');
      }
      break;
  }

  throw new Error(`Unsupported format conversion: ${fromFormat} to ${toFormat}`);
}

/**
 * Convert JWK to PEM (simplified)
 */
function jwkToPem(jwkData: string): string {
  try {
    const jwk = JSON.parse(jwkData);
    return `-----BEGIN PRIVATE KEY-----
${Buffer.from(JSON.stringify(jwk)).toString('base64')}
-----END PRIVATE KEY-----`;
  } catch {
    throw new Error('Invalid JWK format');
  }
}

/**
 * Convert PEM to JWK (simplified)
 */
function pemToJwk(pemData: string): string {
  // Extract base64 content from PEM
  const base64Content = pemData
    .replace(/-----BEGIN.*-----/, '')
    .replace(/-----END.*-----/, '')
    .replace(/\s/g, '');
  
  try {
    const decoded = Buffer.from(base64Content, 'base64').toString();
    return decoded;
  } catch {
    throw new Error('Invalid PEM format');
  }
}

/**
 * Get algorithm information
 */
export function getAlgorithmInfo(algorithm: KeyAlgorithm): {
  name: string;
  keySize: number;
  signatureSize: number;
  supportedFormats: KeyFormat[];
} {
  switch (algorithm) {
    case KeyAlgorithm.ED25519:
      return {
        name: 'Ed25519',
        keySize: 32,
        signatureSize: 64,
        supportedFormats: [KeyFormat.JWK, KeyFormat.PEM, KeyFormat.RAW]
      };
    case KeyAlgorithm.SECP256K1:
      return {
        name: 'secp256k1',
        keySize: 32,
        signatureSize: 64,
        supportedFormats: [KeyFormat.JWK, KeyFormat.PEM, KeyFormat.RAW]
      };
    case KeyAlgorithm.RSA_2048:
      return {
        name: 'RSA-2048',
        keySize: 256,
        signatureSize: 256,
        supportedFormats: [KeyFormat.JWK, KeyFormat.PEM, KeyFormat.RAW]
      };
    case KeyAlgorithm.RSA_4096:
      return {
        name: 'RSA-4096',
        keySize: 512,
        signatureSize: 512,
        supportedFormats: [KeyFormat.JWK, KeyFormat.PEM, KeyFormat.RAW]
      };
    case KeyAlgorithm.AES_256:
      return {
        name: 'AES-256',
        keySize: 32,
        signatureSize: 0, // Not applicable for symmetric keys
        supportedFormats: [KeyFormat.RAW, KeyFormat.BASE64, KeyFormat.HEX]
      };
    case KeyAlgorithm.HMAC_SHA256:
      return {
        name: 'HMAC-SHA256',
        keySize: 32,
        signatureSize: 32,
        supportedFormats: [KeyFormat.RAW, KeyFormat.BASE64, KeyFormat.HEX]
      };
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`);
  }
}

/**
 * Validate key usage
 */
export function validateKeyUsage(usage: KeyUsage[], algorithm: KeyAlgorithm): boolean {
  const algorithmInfo = getAlgorithmInfo(algorithm);
  
  // Check if usage is appropriate for the algorithm
  switch (algorithm) {
    case KeyAlgorithm.ED25519:
    case KeyAlgorithm.SECP256K1:
    case KeyAlgorithm.RSA_2048:
    case KeyAlgorithm.RSA_4096:
      return usage.every(u => [KeyUsage.SIGN, KeyUsage.VERIFY].includes(u));
    case KeyAlgorithm.AES_256:
      return usage.every(u => [KeyUsage.ENCRYPT, KeyUsage.DECRYPT, KeyUsage.WRAP_KEY, KeyUsage.UNWRAP_KEY].includes(u));
    case KeyAlgorithm.HMAC_SHA256:
      return usage.every(u => [KeyUsage.SIGN, KeyUsage.VERIFY].includes(u));
    default:
      return false;
  }
} 