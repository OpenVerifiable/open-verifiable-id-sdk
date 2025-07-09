/**
 * React Native storage utilities
 * Provides storage functionality for React Native environments
 */

import { EncryptedData } from '../adapters/crypto';

/**
 * React Native storage implementation using AsyncStorage
 */
export class ReactNativeStorage {
  private prefix: string;
  private encryptionKey?: string;
  private storage: any;
  private asyncStorage: any;

  constructor(prefix: string = 'ov-sdk', encryptionKey?: string) {
    this.prefix = prefix;
    this.encryptionKey = encryptionKey;
    this.storage = null;
  }

  /**
   * Initialize storage
   */
  private async initStorage(): Promise<void> {
    if (!this.storage) {
      try {
        // const AsyncStorage = await import('@react-native-async-storage/async-storage');
        // this.storage = AsyncStorage.default;
        throw new Error('React Native storage requires @react-native-async-storage/async-storage package to be installed');
      } catch (error) {
        throw new Error('AsyncStorage not available. Please install @react-native-async-storage/async-storage');
      }
    }
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
    await this.initStorage();
    const storageKey = this.getStorageKey(key);
    
    let dataToStore = value;
    if (this.encryptionKey) {
      // Encrypt data if encryption key is provided
      const { encrypt } = await import('../adapters/crypto');
      const encrypted = encrypt(JSON.stringify(value), this.encryptionKey);
      dataToStore = encrypted;
    }
    
    await this.storage.setItem(storageKey, JSON.stringify(dataToStore));
  }

  /**
   * Retrieve data
   */
  async get(key: string): Promise<any | null> {
    try {
      await this.initStorage();
      const storageKey = this.getStorageKey(key);
      const data = await this.storage.getItem(storageKey);
      
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
    await this.initStorage();
    const storageKey = this.getStorageKey(key);
    await this.storage.removeItem(storageKey);
  }

  /**
   * List all keys
   */
  async keys(): Promise<string[]> {
    try {
      await this.initStorage();
      const allKeys = await this.storage.getAllKeys();
      const prefix = this.getStorageKey('');
      
      return allKeys
        .filter((key: string) => key.startsWith(prefix))
        .map((key: string) => key.substring(prefix.length));
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    try {
      await this.initStorage();
      const keys = await this.keys();
      const storageKeys = keys.map(key => this.getStorageKey(key));
      await this.storage.multiRemove(storageKeys);
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    try {
      await this.initStorage();
      const storageKey = this.getStorageKey(key);
      const value = await this.storage.getItem(storageKey);
      return value !== null;
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

  /**
   * Get multiple items at once
   */
  async multiGet(keys: string[]): Promise<Array<[string, any]>> {
    try {
      await this.initStorage();
      const storageKeys = keys.map(key => this.getStorageKey(key));
      const results = await this.storage.multiGet(storageKeys);
      
      return results.map(([storageKey, value]: [string, string]) => {
        const key = storageKey.substring(this.getStorageKey('').length);
        return [key, value ? JSON.parse(value) : null];
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Set multiple items at once
   */
  async multiSet(items: Array<[string, any]>): Promise<void> {
    try {
      await this.initStorage();
      const storageItems = items.map(([key, value]) => {
        const storageKey = this.getStorageKey(key);
        return [storageKey, JSON.stringify(value)];
      });
      
      await this.storage.multiSet(storageItems);
    } catch (error) {
      throw new Error(`Failed to set multiple items: ${error}`);
    }
  }

  private async getAsyncStorage(): Promise<any> {
    if (!this.asyncStorage) {
      // const AsyncStorage = await import('@react-native-async-storage/async-storage');
      // this.asyncStorage = AsyncStorage.default;
      throw new Error('React Native storage requires @react-native-async-storage/async-storage package to be installed');
    }
    return this.asyncStorage;
  }
} 