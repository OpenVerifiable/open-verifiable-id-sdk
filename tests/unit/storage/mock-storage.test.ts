import { MockSecureStorage } from './mock-storage';
import { StorageError, StorageErrorCode } from '../../../src/core/storage/types';

describe('MockSecureStorage', () => {
  let storage: MockSecureStorage;
  
  beforeEach(() => {
    storage = new MockSecureStorage();
  });
  
  const mockCredential = {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    id: 'test-credential-1',
    type: ['VerifiableCredential'],
    issuer: 'did:example:123',
    validFrom: '2024-01-01T00:00:00Z',
    credentialSubject: {
      id: 'did:example:456',
      name: 'Test Subject'
    },
    proof: {
      type: 'DataIntegrityProof' as const,
      cryptosuite: 'eddsa-2022',
      created: '2024-01-01T00:00:00Z',
      verificationMethod: 'did:example:123#key-1',
      proofPurpose: 'assertionMethod' as const,
      proofValue: 'test-proof-value'
    }
  };
  
  const mockKey = new Uint8Array([1, 2, 3, 4, 5]);
  
  describe('Credential Operations', () => {
    it('should store and retrieve credentials', async () => {
      await storage.storeCredential(mockCredential);
      const retrieved = await storage.getCredential(mockCredential.id);
      expect(retrieved).toEqual(mockCredential);
    });
    
    it('should return null for non-existent credential', async () => {
      const retrieved = await storage.getCredential('non-existent');
      expect(retrieved).toBeNull();
    });
    
    it('should delete credentials', async () => {
      await storage.storeCredential(mockCredential);
      await storage.deleteCredential(mockCredential.id);
      const retrieved = await storage.getCredential(mockCredential.id);
      expect(retrieved).toBeNull();
    });
    
    it('should list all credentials', async () => {
      await storage.storeCredential(mockCredential);
      const credentials = await storage.listCredentials();
      expect(credentials).toHaveLength(1);
      expect(credentials[0]).toEqual(mockCredential);
    });
  });
  
  describe('Key Operations', () => {
    it('should store and retrieve keys', async () => {
      await storage.storeKey('test-key-1', mockKey);
      const retrieved = await storage.getKey('test-key-1');
      expect(retrieved).toEqual(mockKey);
    });
    
    it('should return null for non-existent key', async () => {
      const retrieved = await storage.getKey('non-existent');
      expect(retrieved).toBeNull();
    });
    
    it('should delete keys', async () => {
      await storage.storeKey('test-key-1', mockKey);
      await storage.deleteKey('test-key-1');
      const retrieved = await storage.getKey('test-key-1');
      expect(retrieved).toBeNull();
    });
    
    it('should list all keys', async () => {
      await storage.storeKey('test-key-1', mockKey);
      const keys = await storage.listKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0]).toBe('test-key-1');
    });
  });
  
  describe('Backup Operations', () => {
    it('should export and import backup', async () => {
      await storage.storeCredential(mockCredential);
      await storage.storeKey('test-key-1', mockKey);
      
      const backup = await storage.exportBackup('test-passphrase');
      
      // Clear storage
      await storage.clear();
      expect(await storage.listCredentials()).toHaveLength(0);
      expect(await storage.listKeys()).toHaveLength(0);
      
      // Restore from backup
      await storage.importBackup(backup, 'test-passphrase');
      
      const credentials = await storage.listCredentials();
      const keys = await storage.listKeys();
      
      expect(credentials).toHaveLength(1);
      expect(credentials[0]).toEqual(mockCredential);
      expect(keys).toHaveLength(1);
      expect(keys[0]).toBe('test-key-1');
    });
    
    it('should rotate encryption key', async () => {
      await expect(storage.rotateEncryptionKey('old', 'new')).resolves.not.toThrow();
    });
  });
  
  describe('Error Handling', () => {
    beforeEach(() => {
      storage.setShouldFail(true);
    });
    
    it('should throw error when storing credential fails', async () => {
      await expect(storage.storeCredential(mockCredential))
        .rejects
        .toThrow(new StorageError('Failed to store credential', StorageErrorCode.STORAGE_FULL, 'write'));
    });
    
    it('should throw error when storing key fails', async () => {
      await expect(storage.storeKey('test-key-1', mockKey))
        .rejects
        .toThrow(new StorageError('Failed to store key', StorageErrorCode.ENCRYPTION_FAILED, 'write'));
    });
    
    it('should throw error when backup fails', async () => {
      await expect(storage.exportBackup('test'))
        .rejects
        .toThrow(new StorageError('Failed to export backup', StorageErrorCode.BACKUP_FAILED, 'backup'));
    });
  });
  
  describe('Access Logging', () => {
    it('should log successful operations', async () => {
      await storage.storeCredential(mockCredential);
      await storage.getCredential(mockCredential.id);
      
      const log = await storage.getAccessLog();
      expect(log).toHaveLength(2);
      
      expect(log[0].operation).toBe('write');
      expect(log[0].itemType).toBe('credential');
      expect(log[0].success).toBe(true);
      
      expect(log[1].operation).toBe('read');
      expect(log[1].itemType).toBe('credential');
      expect(log[1].success).toBe(true);
    });
    
    it('should log failed operations', async () => {
      storage.setShouldFail(true);
      
      try {
        await storage.storeCredential(mockCredential);
      } catch (e) {
        // Expected error
      }
      
      const log = await storage.getAccessLog();
      expect(log).toHaveLength(1);
      expect(log[0].operation).toBe('write');
      expect(log[0].itemType).toBe('credential');
      expect(log[0].success).toBe(false);
      expect(log[0].error).toBe('Failed to store credential');
    });
    
    it('should clear access log', async () => {
      await storage.storeCredential(mockCredential);
      storage.clearAccessLog();
      const log = await storage.getAccessLog();
      expect(log).toHaveLength(0);
    });
  });
}); 