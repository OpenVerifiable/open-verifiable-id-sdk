/**
 * Browser storage utilities
 * Provides storage functionality for browser environments
 */

import { EncryptedData } from '../adapters/crypto';

/**
 * Browser storage implementation using localStorage
 */
export class BrowserStorage {
  private prefix: string;
  private encryptionKey?: string;

  constructor(prefix: string = 'ov-sdk', encryptionKey?: string) {
    this.prefix = prefix;
    this.encryptionKey = encryptionKey;
  }

  /**
   * Get storage key with prefix
   */
  private getStorageKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Store data
   */
  async set(key: string, value: any): Promise<void> {
    const storageKey = this.getStorageKey(key);
    
    let dataToStore = value;
    if (this.encryptionKey) {
      // Encrypt data if encryption key is provided
      const { encrypt } = await import('../adapters/crypto');
      const encrypted = encrypt(JSON.stringify(value), this.encryptionKey);
      dataToStore = encrypted;
    }
    
    localStorage.setItem(storageKey, JSON.stringify(dataToStore));
  }

  /**
   * Retrieve data
   */
  async get(key: string): Promise<any | null> {
    try {
      const storageKey = this.getStorageKey(key);
      const data = localStorage.getItem(storageKey);
      
      if (!data) {
        return null;
      }
      
      const parsed = JSON.parse(data);
      
      if (this.encryptionKey && parsed.encrypted) {
        // Decrypt data if it's encrypted
        const { decrypt } = await import('../adapters/crypto');
        const decrypted = decrypt(parsed, this.encryptionKey);
        return JSON.parse(decrypted);
      }
      
      return parsed;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete data
   */
  async delete(key: string): Promise<void> {
    const storageKey = this.getStorageKey(key);
    localStorage.removeItem(storageKey);
  }

  /**
   * List all keys
   */
  async keys(): Promise<string[]> {
    const keys: string[] = [];
    const prefix = this.getStorageKey('');
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }
    
    return keys;
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    const keys = await this.keys();
    for (const key of keys) {
      await this.delete(key);
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const storageKey = this.getStorageKey(key);
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Get storage size
   */
  async size(): Promise<number> {
    const keys = await this.keys();
    return keys.length;
  }

  /**
   * Get available storage space (approximate)
   */
  async getAvailableSpace(): Promise<number> {
    // This is a rough estimation
    const testKey = 'space-test';
    const testData = 'x'.repeat(1024); // 1KB
    
    try {
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      return 5 * 1024 * 1024; // Assume 5MB available
    } catch {
      return 0; // No space available
    }
  }
} 