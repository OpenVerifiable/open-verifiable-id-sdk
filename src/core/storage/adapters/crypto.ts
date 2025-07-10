/**
 * Crypto utilities for secure storage
 * Provides encryption and decryption functionality for storage adapters
 */

import crypto from 'crypto';

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  encrypted: string;
  data: string; // Alias for encrypted for compatibility
  iv: string;
  salt: string;
  algorithm: string;
  keySize: number;
  iterations: number;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  iterations: number;
  saltLength: number;
}

/**
 * Default encryption configuration
 */
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keySize: 32,
  iterations: 100000,
  saltLength: 16
};

/**
 * Derive encryption key from passphrase
 */
export function deriveKey(
  passphrase: string, 
  salt: Buffer, 
  config: Partial<EncryptionConfig> = {}
): Buffer {
  const { iterations, keySize } = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };
  
  return crypto.pbkdf2Sync(
    passphrase,
    salt,
    iterations,
    keySize,
    'sha256'
  );
}

/**
 * Encrypt data with a passphrase
 */
export function encrypt(
  data: string, 
  passphrase: string, 
  config: Partial<EncryptionConfig> = {}
): EncryptedData {
  const { algorithm, saltLength } = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };
  
  // Generate salt and IV
  const salt = crypto.randomBytes(saltLength);
  const iv = crypto.randomBytes(16);
  
  // Derive key
  const key = deriveKey(passphrase, salt, config);
  
  // Encrypt data
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted,
    data: encrypted,
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    algorithm,
    keySize: key.length,
    iterations: config.iterations || DEFAULT_ENCRYPTION_CONFIG.iterations
  };
}

/**
 * Decrypt data with a passphrase
 */
export function decrypt(
  encryptedData: EncryptedData, 
  passphrase: string
): string {
  const { encrypted, iv, salt, algorithm, iterations } = encryptedData;
  
  // Convert hex strings back to buffers
  const ivBuffer = Buffer.from(iv, 'hex');
  const saltBuffer = Buffer.from(salt, 'hex');
  
  // Derive key
  const key = deriveKey(passphrase, saltBuffer, { iterations });
  
  // Decrypt data
  const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a random encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash data for integrity checking
 */
export function hash(data: string, algorithm: string = 'sha256'): string {
  return crypto.createHash(algorithm).update(data).digest('hex');
}

/**
 * Verify data integrity
 */
export function verifyIntegrity(data: string, expectedHash: string, algorithm: string = 'sha256'): boolean {
  const actualHash = hash(data, algorithm);
  return actualHash === expectedHash;
}

/**
 * Generate a secure random string
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Convert string to buffer
 */
export function stringToBuffer(str: string): Buffer {
  return Buffer.from(str, 'utf8');
}

/**
 * Convert buffer to string
 */
export function bufferToString(buffer: Buffer): string {
  return buffer.toString('utf8');
}

/**
 * Convert hex string to buffer
 */
export function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

/**
 * Convert buffer to hex string
 */
export function bufferToHex(buffer: Buffer): string {
  return buffer.toString('hex');
} 