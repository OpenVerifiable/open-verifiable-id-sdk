/**
 * Browser-specific storage implementation using IndexedDB
 * Provides secure storage with encryption
 */

import { CryptoUtils, EncryptedData, StorageRecord } from '../utils/crypto';

const DB_NAME = 'open-verifiable-id-sdk';
const STORE_NAME = 'secure-storage';
const VERSION = 1;

/**
 * Browser storage implementation using IndexedDB
 */
export class BrowserStorage {
  private dbName: string;
  private storeName: string;

  constructor(agentId?: string) {
    this.dbName = agentId ? `${DB_NAME}-${agentId}` : DB_NAME;
    this.storeName = STORE_NAME;
  }

  /**
   * Opens the IndexedDB database
   */
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Stores encrypted data in IndexedDB
   */
  async store(key: string, encryptedData: EncryptedData): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    const record: StorageRecord = {
      key,
      data: encryptedData.data,
      iv: encryptedData.iv,
      salt: encryptedData.salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(record);

      request.onerror = () => {
        reject(new Error('Failed to store data'));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  /**
   * Retrieves encrypted data from IndexedDB
   */
  async retrieve(key: string): Promise<EncryptedData | null> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onerror = () => {
        reject(new Error('Failed to retrieve data'));
      };

      request.onsuccess = () => {
        const record = request.result as StorageRecord;
        if (!record) {
          resolve(null);
        } else {
          resolve({
            encrypted: true,
            algorithm: 'AES-256-GCM',
            keySize: 256,
            iterations: 100000,
            data: record.data,
            iv: record.iv,
            salt: record.salt
          });
        }
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  /**
   * Deletes data from IndexedDB
   */
  async delete(key: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);

      request.onerror = () => {
        reject(new Error('Failed to delete data'));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  /**
   * Lists all stored keys
   */
  async listKeys(): Promise<string[]> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();

      request.onerror = () => {
        reject(new Error('Failed to list keys'));
      };

      request.onsuccess = () => {
        resolve(Array.from(request.result as string[]));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  /**
   * Clears all stored data
   */
  async clear(): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onerror = () => {
        reject(new Error('Failed to clear data'));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  /**
   * Deletes the entire database
   */
  async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);

      request.onerror = () => {
        reject(new Error('Failed to delete database'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }
} 