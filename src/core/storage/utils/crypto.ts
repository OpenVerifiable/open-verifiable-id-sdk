/**
 * Crypto utilities for storage encryption
 */

import crypto from 'crypto';

export interface EncryptedData {
  encrypted: boolean;
  algorithm: string;
  keySize: number;
  iterations: number;
  data: string;
  iv: string;
  salt: string;
}

export interface StorageRecord {
  key: string;
  data: string;
  iv: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    version: string;
    created: string;
    lastModified: string;
  };
}

export class CryptoUtils {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_SIZE = 32; // 256 bits
  private static readonly IV_SIZE = 16; // 128 bits
  private static readonly SALT_SIZE = 32; // 256 bits
  private static readonly ITERATIONS = 100000;

  /**
   * Encrypt data with a password
   */
  static async encrypt(data: string, password: string): Promise<EncryptedData> {
    const salt = crypto.randomBytes(this.SALT_SIZE);
    const iv = crypto.randomBytes(this.IV_SIZE);
    
    const key = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, this.KEY_SIZE, 'sha256');
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('open-verifiable-id-sdk', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: true,
      algorithm: this.ALGORITHM,
      keySize: this.KEY_SIZE * 8, // Convert to bits
      iterations: this.ITERATIONS,
      data: encrypted + authTag.toString('hex'),
      iv: iv.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  /**
   * Decrypt data with a password
   */
  static async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const encrypted = Buffer.from(encryptedData.data, 'hex');
    
    const key = crypto.pbkdf2Sync(password, salt, encryptedData.iterations, encryptedData.keySize / 8, 'sha256');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('open-verifiable-id-sdk', 'utf8'));
    
    // Extract auth tag (last 16 bytes)
    const authTag = encrypted.slice(-16);
    const ciphertext = encrypted.slice(0, -16);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate a random key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash data with SHA-256
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
} 