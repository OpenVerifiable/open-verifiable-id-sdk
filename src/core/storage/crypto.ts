/**
 * Crypto Utilities for Secure Storage
 * 
 * Provides encryption, decryption, and key management utilities
 * for secure storage of sensitive data
 */

import { StorageError, StorageErrorCode } from './types';
import { webcrypto } from 'crypto';

// Use Node.js webcrypto API for compatibility
const crypto = globalThis.crypto || webcrypto;

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
}

/**
 * Encrypts data using AES-256-GCM with PBKDF2 key derivation
 */
export async function encrypt(data: Uint8Array, passphrase: string): Promise<EncryptedData> {
  try {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive key from passphrase using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

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

    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    return {
      data: Buffer.from(encrypted).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
      salt: Buffer.from(salt).toString('base64')
    };
  } catch (error) {
    throw new StorageError(
      'Failed to encrypt data',
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
    // Parse encrypted data
    const data = Buffer.from(encryptedData.data, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const salt = Buffer.from(encryptedData.salt, 'base64');

    // Derive key from passphrase using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

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

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    return new Uint8Array(decrypted);
  } catch (error) {
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