import { ReactNativeStorage } from '../../../src/core/storage/react-native-storage';
import { encrypt } from '../../../src/core/storage/crypto';
import * as Keychain from 'react-native-keychain';
import { BIOMETRY_TYPE, STORAGE_TYPE } from 'react-native-keychain';

// Mock react-native-keychain
jest.mock('react-native-keychain');

describe('ReactNativeStorage Integration', () => {
  let storage: ReactNativeStorage;
  const testData = new TextEncoder().encode('test data');
  const testPassphrase = 'TestPassphrase123!';

  beforeEach(() => {
    storage = new ReactNativeStorage('test-agent');
    jest.clearAllMocks();
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
      jest.spyOn(Keychain, 'setGenericPassword').mockResolvedValue(false);
      await storage.store('test-key', encryptedData);

      // Verify storage call
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'test-key',
        expect.stringContaining(encryptedData.data),
        expect.objectContaining({
          accessible: 'AccessibleWhenUnlocked',
          accessControl: 'BiometryAny',
          service: expect.stringContaining('test-agent')
        })
      );

      // Mock successful retrieval
      jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
        service: 'test-service',
        storage: STORAGE_TYPE.KEYCHAIN,
        username: 'test-key',
        password: JSON.stringify(mockRecord)
      });

      const retrieved = await storage.retrieve('test-key');
      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toBe(encryptedData.data);
      expect(retrieved?.iv).toBe(encryptedData.iv);
      expect(retrieved?.salt).toBe(encryptedData.salt);
    });

    it('should return null for non-existent key', async () => {
      jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue(false);
      const retrieved = await storage.retrieve('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should delete stored data', async () => {
      jest.spyOn(Keychain, 'resetGenericPassword').mockResolvedValue(false);
      await storage.delete('test-key');
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: expect.stringContaining('test-key')
      });
    });

    it('should clear all stored data', async () => {
      jest.spyOn(Keychain, 'resetGenericPassword').mockResolvedValue(false);
      await storage.clear();
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: expect.stringContaining('test-agent')
      });
    });
  });

  describe('Biometric Operations', () => {
    it('should check biometric availability', async () => {
      jest.spyOn(Keychain, 'getSupportedBiometryType').mockResolvedValue(BIOMETRY_TYPE.FACE_ID);
      const available = await storage.isBiometricAvailable();
      expect(available).toBe(true);
    });

    it('should handle biometric unavailability', async () => {
      jest.spyOn(Keychain, 'getSupportedBiometryType').mockResolvedValue(null);
      const available = await storage.isBiometricAvailable();
      expect(available).toBe(false);
    });

    it('should store with biometric protection', async () => {
      const encryptedData = await encrypt(testData, testPassphrase);
      jest.spyOn(Keychain, 'setGenericPassword').mockResolvedValue(false);
      
      await storage.storeWithBiometric('test-key', encryptedData);
      
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'test-key',
        expect.stringContaining(encryptedData.data),
        expect.objectContaining({
          accessible: 'AccessibleWhenUnlocked',
          accessControl: 'BiometryAny',
          service: expect.stringContaining('biometric')
        })
      );
    });

    it('should retrieve with biometric authentication', async () => {
      const encryptedData = await encrypt(testData, testPassphrase);
      const mockRecord = {
        data: encryptedData.data,
        iv: encryptedData.iv,
        salt: encryptedData.salt,
        metadata: {
          version: '1.0.0',
          created: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }
      };

      jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
        service: 'test-service',
        storage: STORAGE_TYPE.KEYCHAIN,
        username: 'test-key',
        password: JSON.stringify(mockRecord)
      });

      const retrieved = await storage.retrieveWithBiometric('test-key');
      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toBe(encryptedData.data);
      expect(Keychain.getGenericPassword).toHaveBeenCalledWith({
        service: expect.stringContaining('biometric'),
        authenticationPrompt: expect.any(Object)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage failures', async () => {
      jest.spyOn(Keychain, 'setGenericPassword').mockRejectedValue(new Error('Storage failed'));
      const encryptedData = await encrypt(testData, testPassphrase);
      
      await expect(storage.store('test-key', encryptedData))
        .rejects
        .toThrow();
    });

    it('should handle retrieval failures gracefully', async () => {
      jest.spyOn(Keychain, 'getGenericPassword').mockRejectedValue(new Error('Retrieval failed'));
      const retrieved = await storage.retrieve('test-key');
      expect(retrieved).toBeNull();
    });

    it('should handle biometric authentication failures', async () => {
      jest.spyOn(Keychain, 'getGenericPassword').mockRejectedValue(new Error('Biometric auth failed'));
      const retrieved = await storage.retrieveWithBiometric('test-key');
      expect(retrieved).toBeNull();
    });
  });
}); 