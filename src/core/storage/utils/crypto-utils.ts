/**
 * Crypto utilities for secure storage
 * Implements encryption, decryption, and key management functions
 */

import { EncryptedData, StorageRecord } from './crypto';
import { StorageError, StorageErrorCode, StorageOperation } from './types';

/**
 * Default encryption configuration
 */
const DEFAULT_CONFIG = {
  keyDerivationIterations: 100000,
  saltLength: 16,
  ivLength: 12,
  keyLength: 32,
  tagLength: 16
};

/**
 * Base64 encoding/decoding functions that work in both Node.js and browser
 */
const base64 = {
  encode: (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },
  decode: (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
};

/**
 * Derives an encryption key from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  try {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: DEFAULT_CONFIG.keyDerivationIterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: DEFAULT_CONFIG.keyLength * 8 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new StorageError(
      `Key derivation failed: ${message}`,
      StorageErrorCode.ENCRYPTION_FAILED,
      'write' as StorageOperation
    );
  }
}

/**
 * Encrypts data using AES-GCM
 */
export async function encrypt(data: Uint8Array, passphrase: string): Promise<EncryptedData> {
  try {
    // Generate salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(DEFAULT_CONFIG.saltLength));
    const iv = crypto.getRandomValues(new Uint8Array(DEFAULT_CONFIG.ivLength));

    // Derive encryption key
    const key = await deriveKey(passphrase, salt);

    // Encrypt data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: DEFAULT_CONFIG.tagLength * 8
      },
      key,
      data
    );

    // Convert to base64
    return {
      encrypted: true,
      algorithm: 'AES-GCM',
      keySize: DEFAULT_CONFIG.keyLength * 8,
      iterations: DEFAULT_CONFIG.keyDerivationIterations,
      data: base64.encode(encryptedData),
      iv: base64.encode(iv),
      salt: base64.encode(salt)
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new StorageError(
      `Encryption failed: ${message}`,
      StorageErrorCode.ENCRYPTION_FAILED,
      'write' as StorageOperation
    );
  }
}

/**
 * Decrypts encrypted data using AES-GCM
 */
export async function decrypt(encryptedData: EncryptedData, passphrase: string): Promise<Uint8Array> {
  try {
    // Convert from base64
    const data = base64.decode(encryptedData.data);
    const iv = base64.decode(encryptedData.iv);
    const salt = base64.decode(encryptedData.salt);

    // Derive decryption key
    const key = await deriveKey(passphrase, salt);

    // Decrypt data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: DEFAULT_CONFIG.tagLength * 8
      },
      key,
      data
    );

    return new Uint8Array(decryptedData);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new StorageError(
      `Decryption failed: ${message}`,
      StorageErrorCode.DECRYPTION_FAILED,
      'read' as StorageOperation
    );
  }
}

/**
 * Generates a random encryption key
 */
export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(DEFAULT_CONFIG.keyLength));
  return base64.encode(key);
}

/**
 * Validates a passphrase meets minimum security requirements
 */
export function validatePassphrase(passphrase: string): boolean {
  if (!passphrase || typeof passphrase !== 'string') {
    return false;
  }

  // Minimum length of 12 characters
  if (passphrase.length < 12) {
    return false;
  }

  // Must contain at least one uppercase letter, lowercase letter, number, and special character
  const hasUppercase = /[A-Z]/.test(passphrase);
  const hasLowercase = /[a-z]/.test(passphrase);
  const hasNumber = /[0-9]/.test(passphrase);
  const hasSpecial = /[^A-Za-z0-9]/.test(passphrase);

  return hasUppercase && hasLowercase && hasNumber && hasSpecial;
}

/**
 * Key format types
 */
export type KeyFormat = 'base64' | 'hex';

/**
 * Converts a key between different formats
 */
export function convertKeyFormat(key: string, fromFormat: KeyFormat, toFormat: KeyFormat): string {
  if (fromFormat === toFormat) {
    return key;
  }

  const bytes = fromFormat === 'base64' 
    ? base64.decode(key)
    : hexToBytes(key);

  return toFormat === 'base64'
    ? base64.encode(bytes)
    : bytesToHex(bytes);
}

/**
 * Converts a hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Converts bytes to a hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
} 