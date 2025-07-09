/**
 * Node.js storage utilities
 * Provides storage functionality for Node.js environments
 */

import fs from 'fs/promises';
import path from 'path';
import { EncryptedData } from '../adapters/crypto';

/**
 * Node.js storage implementation
 */
export class NodeStorage {
  private basePath: string;
  private encryptionKey?: string;

  constructor(basePath: string, encryptionKey?: string) {
    this.basePath = basePath;
    this.encryptionKey = encryptionKey;
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.access(this.basePath);
    } catch {
      await fs.mkdir(this.basePath, { recursive: true });
    }
  }

  /**
   * Get full path for a file
   */
  private getFilePath(key: string): string {
    return path.join(this.basePath, `${key}.json`);
  }

  /**
   * Store data
   */
  async set(key: string, value: any): Promise<void> {
    await this.ensureDirectory();
    const filePath = this.getFilePath(key);
    
    let dataToStore = value;
    if (this.encryptionKey) {
      // Encrypt data if encryption key is provided
      const { encrypt } = await import('../adapters/crypto');
      const encrypted = encrypt(JSON.stringify(value), this.encryptionKey);
      dataToStore = encrypted;
    }
    
    await fs.writeFile(filePath, JSON.stringify(dataToStore, null, 2));
  }

  /**
   * Retrieve data
   */
  async get(key: string): Promise<any | null> {
    try {
      const filePath = this.getFilePath(key);
      const data = await fs.readFile(filePath, 'utf8');
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
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
    } catch (error) {
      // File doesn't exist, ignore
    }
  }

  /**
   * List all keys
   */
  async keys(): Promise<string[]> {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.basePath);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    try {
      const files = await this.keys();
      for (const key of files) {
        await this.delete(key);
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage size
   */
  async size(): Promise<number> {
    const keys = await this.keys();
    return keys.length;
  }
} 