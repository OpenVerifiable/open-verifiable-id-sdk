import { BrowserStorage } from '../../../src/core/storage/browser-storage';
import { encrypt } from '../../../src/core/storage/crypto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock IndexedDB for Node.js environment
const mockIndexedDB = {
  open: vi.fn(() => ({
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    result: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })),
  deleteDatabase: vi.fn(),
  databases: vi.fn().mockResolvedValue([])
};

// Mock global IndexedDB
global.indexedDB = mockIndexedDB as any;

// Mock IDBFactory
class MockIDBFactory {
  open = vi.fn();
  deleteDatabase = vi.fn();
  databases = vi.fn().mockResolvedValue([]);
}

describe.skip('BrowserStorage Integration', () => {
  let storage: BrowserStorage;
  const testData = new TextEncoder().encode('test data');
  const testPassphrase = 'TestPassphrase123!';

  beforeEach(() => {
    // Reset IndexedDB before each test
    global.indexedDB = new MockIDBFactory() as any;
    storage = new BrowserStorage('test-agent');
  });

  afterEach(async () => {
    // Clean up after each test
    if (storage && typeof storage.deleteDatabase === 'function') {
      await storage.deleteDatabase();
    }
  });

  describe('Basic Storage Operations', () => {
    it('should store and retrieve encrypted data', async () => {
      const encryptedData = await encrypt(testData, testPassphrase);
      await storage.store('test-key', encryptedData);
      
      const retrieved = await storage.retrieve('test-key');
      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toBe(encryptedData.data);
      expect(retrieved?.iv).toBe(encryptedData.iv);
      expect(retrieved?.salt).toBe(encryptedData.salt);
    });

    it('should return null for non-existent key', async () => {
      const retrieved = await storage.retrieve('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should delete stored data', async () => {
      const encryptedData = await encrypt(testData, testPassphrase);
      await storage.store('test-key', encryptedData);
      await storage.delete('test-key');
      
      const retrieved = await storage.retrieve('test-key');
      expect(retrieved).toBeNull();
    });

    it('should list all stored keys', async () => {
      const encryptedData = await encrypt(testData, testPassphrase);
      await storage.store('key1', encryptedData);
      await storage.store('key2', encryptedData);
      
      const keys = await storage.listKeys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should clear all stored data', async () => {
      const encryptedData = await encrypt(testData, testPassphrase);
      await storage.store('key1', encryptedData);
      await storage.store('key2', encryptedData);
      
      await storage.clear();
      const keys = await storage.listKeys();
      expect(keys).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database open failures', async () => {
      // Mock indexedDB.open to fail
      const originalOpen = indexedDB.open;
      indexedDB.open = vi.fn(() => {
        const request = new EventTarget() as IDBOpenDBRequest;
        setTimeout(() => {
          request.dispatchEvent(new Event('error'));
        }, 0);
        return request;
      });

      await expect(storage.store('test', await encrypt(testData, testPassphrase)))
        .rejects
        .toThrow('Failed to open database');

      indexedDB.open = originalOpen;
    });

    it('should handle storage failures', async () => {
      const encryptedData = await encrypt(testData, testPassphrase);
      
      // Create an oversized payload
      const largeData = {
        ...encryptedData,
        data: 'x'.repeat(1000000) // Large but not too large string
      };

      await expect(storage.store('test', largeData))
        .rejects
        .toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent operations', async () => {
      const encryptedData = await encrypt(testData, testPassphrase);
      
      // Perform multiple operations concurrently
      const operations = [
        storage.store('key1', encryptedData),
        storage.store('key2', encryptedData),
        storage.retrieve('key1'),
        storage.listKeys(),
        storage.delete('key2')
      ];

      await expect(Promise.all(operations)).resolves.toBeDefined();
    });
  });

  describe('Database Versioning', () => {
    it('should handle database upgrades', async () => {
      // First create with initial version
      const storage1 = new BrowserStorage('test-agent');
      const encryptedData = await encrypt(testData, testPassphrase);
      await storage1.store('test-key', encryptedData);

      // Create new instance with upgraded version
      const storage2 = new BrowserStorage('test-agent');
      const retrieved = await storage2.retrieve('test-key');
      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toBe(encryptedData.data);
    });
  });
}); 