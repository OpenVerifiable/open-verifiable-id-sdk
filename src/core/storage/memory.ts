import { VerifiableCredential_2_0, SecureStorage, AccessLogEntry } from '../../types';

/**
 * In-memory implementation of secure storage
 */
export class InMemoryStorage implements SecureStorage {
  private credentials: Map<string, VerifiableCredential_2_0>;
  private keys: Map<string, Uint8Array>;

  constructor() {
    this.credentials = new Map();
    this.keys = new Map();
  }

  async getCredential(id: string): Promise<VerifiableCredential_2_0 | null> {
    return this.credentials.get(id) || null;
  }

  async storeCredential(arg1: any, arg2?: any): Promise<void> {
    if (typeof arg1 === 'string') {
      this.credentials.set(arg1, arg2 as VerifiableCredential_2_0);
    } else {
      const cred = arg1 as VerifiableCredential_2_0;
      this.credentials.set(cred.id, cred);
    }
  }

  async deleteCredential(id: string): Promise<void> {
    this.credentials.delete(id);
  }

  async listCredentials(): Promise<VerifiableCredential_2_0[]> {
    return Array.from(this.credentials.values());
  }

  async clear(): Promise<void> {
    this.credentials.clear();
  }

  // Key operations
  async storeKey(id: string, key: Uint8Array): Promise<void> {
    this.keys.set(id, key);
  }

  async getKey(id: string): Promise<Uint8Array | null> {
    return this.keys.get(id) || null;
  }

  async deleteKey(id: string): Promise<void> {
    this.keys.delete(id);
  }

  async listKeys(): Promise<string[]> {
    return Array.from(this.keys.keys());
  }

  // Backup-related stubs (in-memory no-op)
  async exportBackup(_passphrase: string): Promise<string> {
    const snapshot = {
      credentials: Array.from(this.credentials.entries()).map(([id, cred]) => [id, cred]),
      keys: Array.from(this.keys.entries()).map(([id, key]) => [id, Array.from(key)])
    };
    return JSON.stringify(snapshot);
  }

  async importBackup(data: string, _passphrase: string): Promise<void> {
    const snapshot = JSON.parse(data);
    this.credentials = new Map(snapshot.credentials);
    this.keys = new Map(snapshot.keys.map(([id, key]: [string, number[]]) => [id, Uint8Array.from(key)]));
  }

  async rotateEncryptionKey(_oldPassphrase: string, _newPassphrase: string): Promise<void> {
    // No-op for in-memory
  }

  async getAccessLog(): Promise<AccessLogEntry[]> {
    return [];
  }

  // Additional SecureStorage methods not covered above
  async retrieveCredential(id: string): Promise<VerifiableCredential_2_0 | null> {
    return this.getCredential(id);
  }

  async exportKey(_keyId: string, _format: 'base64' | 'hex'): Promise<string> {
    throw new Error('exportKey not implemented in InMemoryStorage');
  }

  async importKey(_keyId: string, _key: string, _format: 'base64' | 'hex'): Promise<void> {
    throw new Error('importKey not implemented in InMemoryStorage');
  }

  async exportRecoveryPhrase(_keyId: string, _format: 'base64' | 'hex'): Promise<string> {
    throw new Error('exportRecoveryPhrase not implemented in InMemoryStorage');
  }

  async importRecoveryPhrase(_keyId: string, _phrase: string, _format: 'base64' | 'hex'): Promise<void> {
    throw new Error('importRecoveryPhrase not implemented in InMemoryStorage');
  }

  // Alias for SecureStorage interface (retrieveKey)
  async retrieveKey(keyId: string): Promise<Uint8Array | null> {
    return this.getKey(keyId);
  }
} 