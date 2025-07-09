/**
 * Storage Client
 * 
 * Provides the main storage interface for the SDK, supporting multiple
 * storage backends and secure storage capabilities.
 * 
 * @implements ADR-0018: Storage Core Architecture
 */

import type { SecureStorage } from '../../types'
import { InMemoryStorage } from './memory'
import { SecureStorageImpl } from './secure-storage'

export interface StorageClientOptions {
  /** Encryption key for secure storage */
  encryptionKey?: string
  /** Storage backend type */
  backend?: 'memory' | 'secure' | 'browser' | 'node' | 'react-native' | 'postgresql'
  /** Additional backend-specific options */
  backendOptions?: Record<string, any>
}

/**
 * Main storage client that provides unified access to storage backends
 */
export class StorageClient {
  private storage: SecureStorage

  constructor(options: StorageClientOptions = {}) {
    this.storage = this.createStorageBackend(options)
  }

  /**
   * Create the appropriate storage backend based on options
   */
  private createStorageBackend(options: StorageClientOptions): SecureStorage {
    const { encryptionKey, backend = 'memory' } = options

    switch (backend) {
      case 'secure':
        if (!encryptionKey) {
          throw new Error('Encryption key required for secure storage')
        }
        return new SecureStorageImpl(encryptionKey)
      
      case 'memory':
      default:
        return new InMemoryStorage()
      
      // Future: Add other backend implementations
      // case 'browser':
      //   return new BrowserStorageAdapter(options.backendOptions)
      // case 'node':
      //   return new NodeStorageAdapter(options.backendOptions)
      // case 'react-native':
      //   return new ReactNativeStorageAdapter(options.backendOptions)
      // case 'postgresql':
      //   return new PostgreSQLStorageAdapter(options.backendOptions)
    }
  }

  /**
   * Get the underlying storage instance
   */
  getStorage(): SecureStorage {
    return this.storage
  }

  /**
   * Store a key
   */
  async storeKey(keyId: string, privateKey: Uint8Array, options?: any): Promise<void> {
    return this.storage.storeKey(keyId, privateKey, options)
  }

  /**
   * Retrieve a key
   */
  async retrieveKey(keyId: string, options?: any): Promise<Uint8Array | null> {
    return this.storage.retrieveKey(keyId, options)
  }

  /**
   * Store a credential
   */
  async storeCredential(credentialId: string, credential: any): Promise<void> {
    return this.storage.storeCredential(credentialId, credential)
  }

  /**
   * Retrieve a credential
   */
  async retrieveCredential(credentialId: string): Promise<any | null> {
    return this.storage.retrieveCredential(credentialId)
  }

  /**
   * Delete a key
   */
  async deleteKey(keyId: string): Promise<void> {
    return this.storage.deleteKey(keyId)
  }

  /**
   * Delete a credential
   */
  async deleteCredential(credentialId: string): Promise<void> {
    return this.storage.deleteCredential(credentialId)
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    return this.storage.clear()
  }
}

/**
 * Convenience factory function for backward compatibility
 */
export function createSecureStorage(encryptionKey?: string): SecureStorage {
  const client = new StorageClient({ 
    backend: encryptionKey ? 'secure' : 'memory',
    encryptionKey 
  })
  return client.getStorage()
} 