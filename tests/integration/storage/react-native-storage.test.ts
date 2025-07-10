import { ReactNativeStorage } from '../../../src/core/storage/react-native-storage';
import { encrypt } from '../../../src/core/storage/crypto';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AsyncStorage
const mockAsyncStorage = {
  setItem: vi.fn().mockResolvedValue(undefined),
  getItem: vi.fn().mockResolvedValue(null),
  removeItem: vi.fn().mockResolvedValue(undefined),
  getAllKeys: vi.fn().mockResolvedValue([]),
  multiRemove: vi.fn().mockResolvedValue(undefined)
};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage
}));

describe('ReactNativeStorage Integration', () => {
  let storage: ReactNativeStorage;
  const testData = new TextEncoder().encode('test data');
  const testPassphrase = 'TestPassphrase123!';

  beforeEach(() => {
    storage = new ReactNativeStorage('test-agent');
    vi.clearAllMocks();
  });

  describe('Basic Storage Operations', () => {
    it('should store and retrieve encrypted data', async () => {
      const encryptedData = await encrypt(testData, testPassphrase);
      const mockRecord = {
        data: encryptedData.data,
        iv: encryptedData.iv,
        salt: encryptedData.salt,
        metadata: {
          version: '1.0.0',
          created: expect.any(String),
          lastModified: expect.any(String)
        }
      };

      // Mock successful storage
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      await storage.store('test-key', encryptedData);

      // Verify storage call
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'ov-id-storage-test-agent-test-key',
        JSON.stringify(encryptedData)
      );

      // Mock successful retrieval
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockRecord));

      const retrieved = await storage.retrieve('test-key');
      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toBe(encryptedData.data);
      expect(retrieved?.iv).toBe(encryptedData.iv);
      expect(retrieved?.salt).toBe(encryptedData.salt);
    });

    it('should return null for non-existent key', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const retrieved = await storage.retrieve('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should delete stored data', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);
      await storage.delete('test-key');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        'ov-id-storage-test-agent-test-key'
      );
    });

    it('should list all stored keys', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue([
        'ov-id-storage-test-agent-key1',
        'ov-id-storage-test-agent-key2',
        'other-key'
      ]);

      const keys = await storage.listKeys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should clear all stored data', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue([
        'ov-id-storage-test-agent-key1',
        'ov-id-storage-test-agent-key2'
      ]);
      mockAsyncStorage.multiRemove.mockResolvedValue(undefined);
      
      await storage.clear();
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        'ov-id-storage-test-agent-key1',
        'ov-id-storage-test-agent-key2'
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage failures', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage failed'));
      const encryptedData = await encrypt(testData, testPassphrase);
      
      await expect(storage.store('test-key', encryptedData))
        .rejects
        .toThrow('Failed to store data: Error: Storage failed');
    });

    it('should handle retrieval failures gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Retrieval failed'));
      
      await expect(storage.retrieve('test-key'))
        .rejects
        .toThrow('Failed to retrieve data: Error: Retrieval failed');
    });
  });
}); 