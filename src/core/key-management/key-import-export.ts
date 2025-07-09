/**
 * Key Import/Export Utilities
 * 
 * Comprehensive utilities for importing and exporting keys in various formats:
 * - Base64
 * - Mnemonic (BIP39)
 * - Hex
 * - JWK
 * - PEM
 */

import * as bip39 from 'bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import * as ed25519 from '@noble/ed25519';
import { KeyFormat, KeyAlgorithm } from './types';
import { sha512 } from '@noble/hashes/sha512';
import { sha256 } from '@noble/hashes/sha256';
import { createHash } from 'crypto';

// Set the sha512Sync hash function for @noble/ed25519
(ed25519 as any).etc.sha512Sync = sha512;

/**
 * Supported key formats for import/export
 */
export enum KeyImportExportFormat {
  BASE64 = 'base64',
  MNEMONIC = 'mnemonic',
  HEX = 'hex',
  JWK = 'jwk',
  PEM = 'pem',
  RAW = 'raw'
}

/**
 * Key import options
 */
export interface KeyImportOptions {
  format: KeyImportExportFormat;
  algorithm?: KeyAlgorithm;
  password?: string; // For encrypted keys
  validateChecksum?: boolean;
}

/**
 * Key export options
 */
export interface KeyExportOptions {
  format: KeyImportExportFormat;
  includePublicKey?: boolean;
  password?: string; // For encrypting exported keys
  includeMetadata?: boolean;
  mnemonicWordCount?: 12 | 24;
}

/**
 * Key import result
 */
export interface KeyImportResult {
  privateKey: Uint8Array;
  publicKey?: Uint8Array;
  algorithm: KeyAlgorithm;
  format: KeyImportExportFormat;
  metadata?: {
    keySize: number;
    checksum?: string;
    importedAt: string;
  };
}

/**
 * Key export result
 */
export interface KeyExportResult {
  data: string;
  format: KeyImportExportFormat;
  algorithm: KeyAlgorithm;
  metadata?: {
    keySize: number;
    checksum?: string;
    exportedAt: string;
    includesPublicKey: boolean;
  };
}

/**
 * Import a key from various formats
 */
export async function importKey(
  keyData: string,
  options: KeyImportOptions
): Promise<KeyImportResult> {
  const { format, algorithm = KeyAlgorithm.ED25519, password, validateChecksum = true } = options;

  try {
    let privateKey: Uint8Array;
    let publicKey: Uint8Array | undefined;

    switch (format) {
      case KeyImportExportFormat.BASE64:
        privateKey = await importFromBase64(keyData);
        break;

      case KeyImportExportFormat.MNEMONIC:
        privateKey = await importFromMnemonic(keyData);
        break;

      case KeyImportExportFormat.HEX:
        privateKey = await importFromHex(keyData);
        break;

      case KeyImportExportFormat.JWK:
        const jwkResult = await importFromJWK(keyData, password);
        privateKey = jwkResult.privateKey;
        publicKey = jwkResult.publicKey;
        break;

      case KeyImportExportFormat.PEM:
        const pemResult = await importFromPEM(keyData, password);
        privateKey = pemResult.privateKey;
        publicKey = pemResult.publicKey;
        break;

      case KeyImportExportFormat.RAW:
        privateKey = await importFromRaw(keyData);
        break;

      default:
        throw new Error(`Unsupported import format: ${format}`);
    }

    // Validate key size
    validateKeySize(privateKey, algorithm);

    // Generate public key if not provided
    if (!publicKey) {
      publicKey = await ed25519.getPublicKey(privateKey);
    }

    // Generate checksum if validation is enabled
    let checksum: string | undefined;
    if (validateChecksum) {
      checksum = generateChecksum(privateKey);
    }

    return {
      privateKey,
      publicKey,
      algorithm,
      format,
      metadata: {
        keySize: privateKey.length,
        checksum,
        importedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    throw new Error(`Failed to import key from ${format}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export a key to various formats
 */
const originalExportKey = exportKey;
export async function exportKey(
  privateKey: Uint8Array,
  options: KeyExportOptions & { mnemonicWordCount?: 12 | 24 }
): Promise<KeyExportResult> {
  const { format, includePublicKey = false, password, includeMetadata = true, mnemonicWordCount } = options;

  try {
    let data: string;
    let publicKey: Uint8Array | undefined;

    if (includePublicKey) {
      publicKey = await ed25519.getPublicKey(privateKey);
    }

    switch (format) {
      case KeyImportExportFormat.BASE64:
        data = await exportToBase64(privateKey, includePublicKey);
        break;

      case KeyImportExportFormat.MNEMONIC:
        data = await exportToMnemonic(privateKey, mnemonicWordCount || 24);
        break;

      case KeyImportExportFormat.HEX:
        data = await exportToHex(privateKey, includePublicKey);
        break;

      case KeyImportExportFormat.JWK:
        data = await exportToJWK(privateKey, publicKey, password);
        break;

      case KeyImportExportFormat.PEM:
        data = await exportToPEM(privateKey, publicKey, password);
        break;

      case KeyImportExportFormat.RAW:
        data = await exportToRaw(privateKey);
        break;

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    // Generate checksum
    const checksum = generateChecksum(privateKey);

    return {
      data,
      format,
      algorithm: KeyAlgorithm.ED25519, // Currently supporting Ed25519
      metadata: includeMetadata ? {
        keySize: privateKey.length,
        checksum,
        exportedAt: new Date().toISOString(),
        includesPublicKey: includePublicKey
      } : undefined
    };

  } catch (error) {
    throw new Error(`Failed to export key to ${format}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert between key formats
 */
export async function convertKeyFormat(
  keyData: string,
  fromFormat: KeyImportExportFormat,
  toFormat: KeyImportExportFormat,
  options?: {
    password?: string;
    includePublicKey?: boolean;
  }
): Promise<string> {
  // Import from source format
  const importResult = await importKey(keyData, {
    format: fromFormat,
    password: options?.password
  });

  // Export to target format
  const exportResult = await exportKey(importResult.privateKey, {
    format: toFormat,
    includePublicKey: options?.includePublicKey,
    password: options?.password
  });

  return exportResult.data;
}

/**
 * Validate key format
 */
export function validateKeyFormat(keyData: string, format: KeyImportExportFormat): boolean {
  try {
    switch (format) {
      case KeyImportExportFormat.BASE64:
        return validateBase64(keyData);

      case KeyImportExportFormat.MNEMONIC:
        return validateMnemonic(keyData);

      case KeyImportExportFormat.HEX:
        return validateHex(keyData);

      case KeyImportExportFormat.JWK:
        return validateJWK(keyData);

      case KeyImportExportFormat.PEM:
        return validatePEM(keyData);

      case KeyImportExportFormat.RAW:
        return validateRaw(keyData);

      default:
        return false;
    }
  } catch {
    return false;
  }
}

// Private helper functions

async function importFromBase64(keyData: string): Promise<Uint8Array> {
  try {
    const decoded = Buffer.from(keyData, 'base64');
    
    // Handle both 32-byte and 64-byte keys
    if (decoded.length === 64) {
      // Full key (private + public), extract private part
      return decoded.subarray(0, 32);
    } else if (decoded.length === 32) {
      // Private key only
      return decoded;
    } else {
      throw new Error(`Invalid base64 key length: ${decoded.length} bytes`);
    }
  } catch (error) {
    throw new Error(`Invalid base64 format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function importFromMnemonic(mnemonic: string): Promise<Uint8Array> {
  try {
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic, wordlist)) {
      throw new Error('Invalid mnemonic phrase');
    }

    // Convert mnemonic to entropy
    const entropy = bip39.mnemonicToEntropy(mnemonic, wordlist);
    let privateKey = Buffer.from(entropy, 'hex');

    // Accept both 16-byte (12-word) and 32-byte (24-word) entropy
    if (privateKey.length === 16) {
      // Expand to 32 bytes using SHA-256
      privateKey = Buffer.from(sha256(privateKey));
    } else if (privateKey.length !== 32) {
      throw new Error(`Invalid entropy length: ${privateKey.length} bytes`);
    }

    return privateKey;
  } catch (error) {
    throw new Error(`Invalid mnemonic format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function importFromHex(keyData: string): Promise<Uint8Array> {
  try {
    // Remove 0x prefix if present
    const cleanHex = keyData.startsWith('0x') ? keyData.slice(2) : keyData;
    
    if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
      throw new Error('Invalid hex format');
    }

    const decoded = Buffer.from(cleanHex, 'hex');
    
    // Handle both 32-byte and 64-byte keys
    if (decoded.length === 64) {
      // Full key (private + public), extract private part
      return decoded.subarray(0, 32);
    } else if (decoded.length === 32) {
      // Private key only
      return decoded;
    } else {
      throw new Error(`Invalid hex key length: ${decoded.length} bytes`);
    }
  } catch (error) {
    throw new Error(`Invalid hex format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function importFromJWK(jwkData: string, password?: string): Promise<{ privateKey: Uint8Array; publicKey?: Uint8Array }> {
  try {
    const jwk = JSON.parse(jwkData);
    
    if (!jwk.kty || !jwk.d) {
      throw new Error('Invalid JWK: missing required fields');
    }

    // Handle encrypted JWK
    if (jwk.enc && password) {
      // TODO: Implement JWK decryption
      throw new Error('Encrypted JWK import not yet implemented');
    }

    // Extract private key
    const privateKey = Buffer.from(jwk.d, 'base64url');
    
    // Extract public key if present
    let publicKey: Uint8Array | undefined;
    if (jwk.x) {
      publicKey = Buffer.from(jwk.x, 'base64url');
    }

    return { privateKey, publicKey };
  } catch (error) {
    throw new Error(`Invalid JWK format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function importFromPEM(pemData: string, password?: string): Promise<{ privateKey: Uint8Array; publicKey?: Uint8Array }> {
  try {
    // Remove headers and footers
    const base64Content = pemData
      .replace(/-----BEGIN.*-----/, '')
      .replace(/-----END.*-----/, '')
      .replace(/\s/g, '');

    const decoded = Buffer.from(base64Content, 'base64');
    
    // Handle encrypted PEM
    if (password) {
      // TODO: Implement PEM decryption
      throw new Error('Encrypted PEM import not yet implemented');
    }

    // For now, assume it's a raw private key
    const privateKey = decoded.length === 64 ? decoded.subarray(0, 32) : decoded;
    
    return { privateKey };
  } catch (error) {
    throw new Error(`Invalid PEM format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function importFromRaw(keyData: string): Promise<Uint8Array> {
  try {
    const decoded = Buffer.from(keyData, 'binary');
    
    if (decoded.length !== 32 && decoded.length !== 64) {
      throw new Error(`Invalid raw key length: ${decoded.length} bytes`);
    }

    return decoded.length === 64 ? decoded.subarray(0, 32) : decoded;
  } catch (error) {
    throw new Error(`Invalid raw format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function exportToBase64(privateKey: Uint8Array, includePublicKey: boolean): Promise<string> {
  if (includePublicKey) {
    const publicKey = await ed25519.getPublicKey(privateKey);
    const fullKey = new Uint8Array(privateKey.length + publicKey.length);
    fullKey.set(privateKey);
    fullKey.set(publicKey, privateKey.length);
    return Buffer.from(fullKey).toString('base64');
  } else {
    return Buffer.from(privateKey).toString('base64');
  }
}

async function exportToMnemonic(privateKey: Uint8Array, wordCount: 12 | 24 = 24): Promise<string> {
  try {
    // For 24 words, use the full 32 bytes
    if (wordCount === 24) {
      if (privateKey.length !== 32) {
        throw new Error(`Invalid private key length for 24-word mnemonic: ${privateKey.length} bytes`);
      }
      return bip39.entropyToMnemonic(Buffer.from(privateKey), wordlist);
    }
    // For 12 words, use the first 16 bytes
    if (wordCount === 12) {
      if (privateKey.length < 16) {
        throw new Error(`Invalid private key length for 12-word mnemonic: ${privateKey.length} bytes`);
      }
      return bip39.entropyToMnemonic(Buffer.from(privateKey.slice(0, 16)), wordlist);
    }
    throw new Error('Invalid word count for mnemonic export');
  } catch (error) {
    throw new Error(`Failed to convert to mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function exportToHex(privateKey: Uint8Array, includePublicKey: boolean): Promise<string> {
  if (includePublicKey) {
    const publicKey = await ed25519.getPublicKey(privateKey);
    const fullKey = new Uint8Array(privateKey.length + publicKey.length);
    fullKey.set(privateKey);
    fullKey.set(publicKey, privateKey.length);
    return Buffer.from(fullKey).toString('hex');
  } else {
    return Buffer.from(privateKey).toString('hex');
  }
}

async function exportToJWK(privateKey: Uint8Array, publicKey?: Uint8Array, password?: string): Promise<string> {
  try {
    const pubKey = publicKey || await ed25519.getPublicKey(privateKey);
    
    const jwk: any = {
      kty: 'OKP',
      crv: 'Ed25519',
      d: Buffer.from(privateKey).toString('base64url'),
      x: Buffer.from(pubKey).toString('base64url')
    };

    // Handle encryption if password provided
    if (password) {
      // TODO: Implement JWK encryption
      throw new Error('JWK encryption not yet implemented');
    }

    return JSON.stringify(jwk, null, 2);
  } catch (error) {
    throw new Error(`Failed to export to JWK: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function exportToPEM(privateKey: Uint8Array, publicKey?: Uint8Array, password?: string): Promise<string> {
  try {
    const pubKey = publicKey || await ed25519.getPublicKey(privateKey);
    const fullKey = new Uint8Array(privateKey.length + pubKey.length);
    fullKey.set(privateKey);
    fullKey.set(pubKey, privateKey.length);

    const base64Key = Buffer.from(fullKey).toString('base64');
    
    // Handle encryption if password provided
    if (password) {
      // TODO: Implement PEM encryption
      throw new Error('PEM encryption not yet implemented');
    }

    return `-----BEGIN PRIVATE KEY-----
${base64Key}
-----END PRIVATE KEY-----`;
  } catch (error) {
    throw new Error(`Failed to export to PEM: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function exportToRaw(privateKey: Uint8Array): Promise<string> {
  return Buffer.from(privateKey).toString('binary');
}

function validateKeySize(privateKey: Uint8Array, algorithm: KeyAlgorithm): void {
  const expectedSize = getExpectedKeySize(algorithm);
  if (privateKey.length !== expectedSize) {
    throw new Error(`Invalid key size for ${algorithm}: expected ${expectedSize} bytes, got ${privateKey.length}`);
  }
}

function getExpectedKeySize(algorithm: KeyAlgorithm): number {
  switch (algorithm) {
    case KeyAlgorithm.ED25519:
      return 32;
    case KeyAlgorithm.SECP256K1:
      return 32;
    case KeyAlgorithm.RSA_2048:
      return 256;
    case KeyAlgorithm.RSA_4096:
      return 512;
    default:
      return 32; // Default to Ed25519 size
  }
}

function generateChecksum(data: Uint8Array): string {
  const hash = createHash('sha256');
  hash.update(data);
  return hash.digest('hex').substring(0, 8);
}

// Validation functions

function validateBase64(data: string): boolean {
  try {
    const decoded = Buffer.from(data, 'base64');
    // Valid key lengths: 32 bytes (private key) or 64 bytes (private + public)
    return decoded.length === 32 || decoded.length === 64;
  } catch {
    return false;
  }
}

function validateMnemonic(data: string): boolean {
  // Accept both 12 and 24 words
  const words = data.trim().split(/\s+/);
  if (words.length !== 12 && words.length !== 24) return false;
  return bip39.validateMnemonic(data, wordlist);
}

function validateHex(data: string): boolean {
  const cleanHex = data.startsWith('0x') ? data.slice(2) : data;
  return /^[0-9a-fA-F]+$/.test(cleanHex);
}

function validateJWK(data: string): boolean {
  try {
    const jwk = JSON.parse(data);
    return jwk.kty && jwk.crv;
  } catch {
    return false;
  }
}

function validatePEM(data: string): boolean {
  return data.includes('-----BEGIN') && data.includes('-----END');
}

function validateRaw(data: string): boolean {
  return data.length > 0;
} 