import { 
  ISecureStorage, 
  StorageAccessLog, 
  StorageError, 
  StorageErrorCode 
} from '../../../src/core/storage/types';
import { VerifiableCredential_2_0 } from '../../../src/types';

/**
 * Mock storage implementation for testing
 */
export class MockSecureStorage implements ISecureStorage {
  private credentials: Map<string, VerifiableCredential_2_0> = new Map();
  private keys: Map<string, Uint8Array> = new Map();
  private accessLog: StorageAccessLog[] = [];
  
  constructor(private shouldFail: boolean = false) {}
  
  private logAccess(operation: 'read' | 'write' | 'delete' | 'list' | 'clear' | 'backup' | 'restore' | 'rotate', 
                   itemType: 'credential' | 'key' | 'backup',
                   itemId: string,
                   success: boolean,
                   error?: string) {
    this.accessLog.push({
      timestamp: new Date().toISOString(),
      operation,
      itemType,
      itemId,
      success,
      error
    });
  }

  async getCredential(id: string): Promise<VerifiableCredential_2_0 | null> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to get credential', StorageErrorCode.PLATFORM_ERROR, 'read');
      this.logAccess('read', 'credential', id, false, error.message);
      throw error;
    }
    
    const credential = this.credentials.get(id) || null;
    this.logAccess('read', 'credential', id, true);
    return credential;
  }

  async storeCredential(credential: VerifiableCredential_2_0): Promise<void> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to store credential', StorageErrorCode.STORAGE_FULL, 'write');
      this.logAccess('write', 'credential', credential.id, false, error.message);
      throw error;
    }
    
    this.credentials.set(credential.id, credential);
    this.logAccess('write', 'credential', credential.id, true);
  }

  async deleteCredential(id: string): Promise<void> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to delete credential', StorageErrorCode.PERMISSION_DENIED, 'delete');
      this.logAccess('delete', 'credential', id, false, error.message);
      throw error;
    }
    
    this.credentials.delete(id);
    this.logAccess('delete', 'credential', id, true);
  }

  async listCredentials(): Promise<VerifiableCredential_2_0[]> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to list credentials', StorageErrorCode.PLATFORM_ERROR, 'list');
      this.logAccess('list', 'credential', '*', false, error.message);
      throw error;
    }
    
    this.logAccess('list', 'credential', '*', true);
    return Array.from(this.credentials.values());
  }

  async storeKey(id: string, key: Uint8Array): Promise<void> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to store key', StorageErrorCode.ENCRYPTION_FAILED, 'write');
      this.logAccess('write', 'key', id, false, error.message);
      throw error;
    }
    
    this.keys.set(id, key);
    this.logAccess('write', 'key', id, true);
  }

  async getKey(id: string): Promise<Uint8Array | null> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to get key', StorageErrorCode.DECRYPTION_FAILED, 'read');
      this.logAccess('read', 'key', id, false, error.message);
      throw error;
    }
    
    const key = this.keys.get(id) || null;
    this.logAccess('read', 'key', id, true);
    return key;
  }

  async deleteKey(id: string): Promise<void> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to delete key', StorageErrorCode.PERMISSION_DENIED, 'delete');
      this.logAccess('delete', 'key', id, false, error.message);
      throw error;
    }
    
    this.keys.delete(id);
    this.logAccess('delete', 'key', id, true);
  }

  async listKeys(): Promise<string[]> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to list keys', StorageErrorCode.PLATFORM_ERROR, 'list');
      this.logAccess('list', 'key', '*', false, error.message);
      throw error;
    }
    
    this.logAccess('list', 'key', '*', true);
    return Array.from(this.keys.keys());
  }

  async exportBackup(passphrase: string): Promise<string> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to export backup', StorageErrorCode.BACKUP_FAILED, 'backup');
      this.logAccess('backup', 'backup', 'export', false, error.message);
      throw error;
    }
    
    const backup = {
      credentials: Array.from(this.credentials.entries()),
      keys: Array.from(this.keys.entries()).map(([id, key]) => [id, Array.from(key)])
    };
    
    this.logAccess('backup', 'backup', 'export', true);
    return JSON.stringify(backup);
  }

  async importBackup(data: string, passphrase: string): Promise<void> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to import backup', StorageErrorCode.RESTORE_FAILED, 'restore');
      this.logAccess('restore', 'backup', 'import', false, error.message);
      throw error;
    }
    
    const backup = JSON.parse(data);
    this.credentials = new Map(backup.credentials);
    this.keys = new Map(
      backup.keys.map(([id, key]: [string, number[]]) => [id, new Uint8Array(key)])
    );
    
    this.logAccess('restore', 'backup', 'import', true);
  }

  async rotateEncryptionKey(oldPassphrase: string, newPassphrase: string): Promise<void> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to rotate encryption key', StorageErrorCode.ENCRYPTION_FAILED, 'rotate');
      this.logAccess('rotate', 'backup', 'rotate', false, error.message);
      throw error;
    }
    
    this.logAccess('rotate', 'backup', 'rotate', true);
  }

  async clear(): Promise<void> {
    if (this.shouldFail) {
      const error = new StorageError('Failed to clear storage', StorageErrorCode.PERMISSION_DENIED, 'clear');
      this.logAccess('clear', 'backup', 'clear', false, error.message);
      throw error;
    }
    
    this.credentials.clear();
    this.keys.clear();
    this.logAccess('clear', 'backup', 'clear', true);
  }

  async getAccessLog(): Promise<StorageAccessLog[]> {
    return this.accessLog;
  }

  // Test helper methods
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  clearAccessLog(): void {
    this.accessLog = [];
  }
} 