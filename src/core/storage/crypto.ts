/**
 * Crypto Utilities for Secure Storage
 * 
 * Provides encryption, decryption, and key management utilities
 * for secure storage of sensitive data
 */

import { StorageError, StorageErrorCode } from './types.js';
import { webcrypto } from 'crypto';
import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

// Use Node.js webcrypto API for compatibility
const crypto = webcrypto as Crypto;

if (!crypto || !crypto.subtle) {
  throw new Error('No WebCrypto implementation found');
}

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
}

// Polyfill Buffer for browser environments
const getBuffer = async () => {
  if (typeof Buffer !== 'undefined') return Buffer;
  // @ts-ignore
  const { Buffer: BufferPolyfill } = await import('buffer');
  return BufferPolyfill;
};

/**
 * Encrypts data using AES-256-GCM with PBKDF2 key derivation
 */
export async function encrypt(data: Uint8Array, passphrase: string): Promise<EncryptedData> {
  try {
    // Debug logging to file
    const debugLog = (message: string, data?: any) => {
      const logEntry = `${new Date().toISOString()} - ${message}${data ? ` - ${JSON.stringify(data)}` : ''}\n`;
      appendFileSync(join(process.cwd(), 'crypto-debug.log'), logEntry);
    };

    debugLog('Starting encryption');
    debugLog('Input data type', typeof data);
    debugLog('Input data constructor', data.constructor.name);
    debugLog('Input data length', data.length);
    debugLog('Passphrase type', typeof passphrase);
    debugLog('Passphrase length', passphrase.length);

    if (!(data instanceof Uint8Array)) {
      debugLog('Error: Invalid data input - not Uint8Array');
      throw new StorageError(
        'Cannot encrypt invalid data - must be Uint8Array',
        StorageErrorCode.ENCRYPTION_FAILED,
        'write'
      );
    }

    const Buffer = await getBuffer();
    
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    debugLog('Generated salt length', salt.length);
    debugLog('Generated IV length', iv.length);

    // Derive key from passphrase using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    debugLog('Key material imported');

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    debugLog('Key derived successfully');

    // Prepare data for encryption
    let dataToEncrypt: ArrayBuffer;
    if (data instanceof Uint8Array) {
      dataToEncrypt = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    } else if (data && typeof data === 'object' && 'byteLength' in data) {
      dataToEncrypt = data as ArrayBuffer;
    } else {
      debugLog('Error: Invalid data type for encryption');
      throw new StorageError('Data must be Uint8Array or ArrayBuffer', StorageErrorCode.ENCRYPTION_FAILED, 'write');
    }
    debugLog('Data prepared for encryption, length', dataToEncrypt.byteLength);

    // Encrypt the data
    debugLog('Starting crypto.subtle.encrypt');
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataToEncrypt
    );
    debugLog('Encryption completed');
    debugLog('Encrypted result type', encrypted.constructor.name);
    debugLog('Encrypted result length', encrypted.byteLength);

    if (!encrypted) {
      debugLog('Error: Encryption returned undefined');
      throw new StorageError('Encryption produced undefined result', StorageErrorCode.ENCRYPTION_FAILED, 'write');
    }

    const result = {
      data: Buffer.from(encrypted).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
      salt: Buffer.from(salt).toString('base64')
    };
    debugLog('Encryption successful, result created');

    return result;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    appendFileSync(join(process.cwd(), 'crypto-debug.log'), 
      `${new Date().toISOString()} - Encryption error: ${errorMessage}\n`);
    console.error('Encryption error:', error);
    throw new StorageError(
      `Failed to encrypt data: ${error && error.message ? error.message : error}`,
      StorageErrorCode.ENCRYPTION_FAILED,
      'write'
    );
  }
}

/**
 * Decrypts data encrypted with the encrypt function
 */
export async function decrypt(encryptedData: EncryptedData, passphrase: string): Promise<Uint8Array> {
  try {
    // Debug logging to file
    const debugLog = (message: string, data?: any) => {
      const logEntry = `${new Date().toISOString()} - ${message}${data ? ` - ${JSON.stringify(data)}` : ''}\n`;
      appendFileSync(join(process.cwd(), 'crypto-debug.log'), logEntry);
    };

    debugLog('Starting decryption');
    debugLog('Encrypted data structure', {
      hasData: !!encryptedData.data,
      hasIv: !!encryptedData.iv,
      hasSalt: !!encryptedData.salt
    });

    if (!encryptedData || !encryptedData.data || !encryptedData.iv || !encryptedData.salt) {
      debugLog('Error: Invalid encrypted data structure');
      throw new StorageError(
        'Invalid encrypted data structure',
        StorageErrorCode.DECRYPTION_FAILED,
        'read'
      );
    }

    const Buffer = await getBuffer();
    
    // Parse encrypted data
    const data = Buffer.from(encryptedData.data, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const salt = Buffer.from(encryptedData.salt, 'base64');
    debugLog('Parsed data lengths', {
      data: data.length,
      iv: iv.length,
      salt: salt.length
    });

    // Derive key from passphrase using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    debugLog('Key material imported for decryption');

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    debugLog('Key derived for decryption');

    // Decrypt the data
    debugLog('Starting crypto.subtle.decrypt');
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );
    debugLog('Decryption completed');
    debugLog('Decrypted result length', decrypted.byteLength);

    const result = new Uint8Array(decrypted);
    debugLog('Decryption successful, returning Uint8Array');
    return result;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    appendFileSync(join(process.cwd(), 'crypto-debug.log'), 
      `${new Date().toISOString()} - Decryption error: ${errorMessage}\n`);
    console.error('Decryption error:', error);
    throw new StorageError(
      'Failed to decrypt data - incorrect passphrase or corrupted data',
      StorageErrorCode.DECRYPTION_FAILED,
      'read'
    );
  }
}

/**
 * Generates a random 256-bit encryption key encoded as base64
 */
export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(key).toString('base64');
}

/**
 * Validates passphrase strength
 * Requirements: min 8 chars, uppercase, lowercase, number, special char
 */
export function validatePassphrase(passphrase: any): boolean {
  if (typeof passphrase !== 'string') {
    return false;
  }

  // Minimum 8 characters
  if (passphrase.length < 8) {
    return false;
  }

  // Must contain uppercase letter
  if (!/[A-Z]/.test(passphrase)) {
    return false;
  }

  // Must contain lowercase letter
  if (!/[a-z]/.test(passphrase)) {
    return false;
  }

  // Must contain number
  if (!/\d/.test(passphrase)) {
    return false;
  }

  // Must contain special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passphrase)) {
    return false;
  }

  return true;
}

/**
 * Converts key between base64 and hex formats
 */
export function convertKeyFormat(
  key: string, 
  fromFormat: 'base64' | 'hex', 
  toFormat: 'base64' | 'hex'
): string {
  if (fromFormat === toFormat) {
    return key;
  }

  if (key === '') {
    return '';
  }

  try {
    if (fromFormat === 'base64' && toFormat === 'hex') {
      const buffer = Buffer.from(key, 'base64');
      return buffer.toString('hex');
    } else if (fromFormat === 'hex' && toFormat === 'base64') {
      const buffer = Buffer.from(key, 'hex');
      return buffer.toString('base64');
    }
  } catch (error) {
    throw new StorageError(
      `Failed to convert key from ${fromFormat} to ${toFormat}`,
      StorageErrorCode.INVALID_FORMAT,
      'read'
    );
  }

  throw new StorageError(
    `Unsupported conversion from ${fromFormat} to ${toFormat}`,
    StorageErrorCode.INVALID_FORMAT,
    'read'
  );
} 