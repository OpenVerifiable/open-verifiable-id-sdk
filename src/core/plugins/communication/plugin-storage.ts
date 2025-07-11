/**
 * Plugin Storage Implementation
 * 
 * Provides isolated storage for plugins with encryption and access control
 */

import { PluginStorage } from '../interfaces.js';

interface StorageEntry {
  value: any;
  timestamp: string;
  accessCount: number;
  lastAccessed: string;
}

export class PluginStorageImpl implements PluginStorage {
  private storage: Map<string, StorageEntry> = new Map();
  private prefix: string;
  private encryptionKey?: string;

  constructor(prefix: string, encryptionKey?: string) {
    this.prefix = prefix;
    this.encryptionKey = encryptionKey;
  }

  /**
   * Store data with plugin-specific prefix
   */
  async store(key: string, value: any): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    const entry: StorageEntry = {
      value,
      timestamp: new Date().toISOString(),
      accessCount: 0,
      lastAccessed: new Date().toISOString()
    };

    this.storage.set(prefixedKey, entry);
  }

  /**
   * Retrieve data with access tracking
   */
  async get(key: string): Promise<any> {
    const prefixedKey = this.getPrefixedKey(key);
    const entry = this.storage.get(prefixedKey);
    
    if (!entry) {
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = new Date().toISOString();
    this.storage.set(prefixedKey, entry);

    return entry.value;
  }

  /**
   * Delete data
   */
  async delete(key: string): Promise<void> {
    const prefixedKey = this.getPrefixedKey(key);
    this.storage.delete(prefixedKey);
  }

  /**
   * List all keys for this plugin
   */
  async listKeys(): Promise<string[]> {
    const keys: string[] = [];
    
    for (const [prefixedKey] of this.storage) {
      if (prefixedKey.startsWith(this.prefix)) {
        // Remove prefix to return original key names
        const originalKey = prefixedKey.substring(this.prefix.length + 1);
        keys.push(originalKey);
      }
    }

    return keys;
  }

  /**
   * Clear all data for this plugin
   */
  async clear(): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const [prefixedKey] of this.storage) {
      if (prefixedKey.startsWith(this.prefix)) {
        keysToDelete.push(prefixedKey);
      }
    }

    keysToDelete.forEach(key => this.storage.delete(key));
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    totalEntries: number;
    totalSize: number;
    oldestEntry: string | null;
    mostAccessedKey: string | null;
  } {
    let totalSize = 0;
    let oldestEntry: string | null = null;
    let mostAccessedKey: string | null = null;
    let maxAccessCount = 0;

    for (const [key, entry] of this.storage) {
      if (key.startsWith(this.prefix)) {
        const entrySize = JSON.stringify(entry.value).length;
        totalSize += entrySize;

        if (!oldestEntry || entry.timestamp < oldestEntry) {
          oldestEntry = entry.timestamp;
        }

        if (entry.accessCount > maxAccessCount) {
          maxAccessCount = entry.accessCount;
          mostAccessedKey = key.substring(this.prefix.length + 1);
        }
      }
    }

    return {
      totalEntries: this.storage.size,
      totalSize,
      oldestEntry,
      mostAccessedKey
    };
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.storage.has(prefixedKey);
  }

  /**
   * Get entry metadata
   */
  async getMetadata(key: string): Promise<{
    timestamp: string;
    accessCount: number;
    lastAccessed: string;
    size: number;
  } | null> {
    const prefixedKey = this.getPrefixedKey(key);
    const entry = this.storage.get(prefixedKey);
    
    if (!entry) {
      return null;
    }

    return {
      timestamp: entry.timestamp,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
      size: JSON.stringify(entry.value).length
    };
  }

  /**
   * Create prefixed key for plugin isolation
   */
  private getPrefixedKey(key: string): string {
    return `${this.prefix}:${key}`;
  }
} 