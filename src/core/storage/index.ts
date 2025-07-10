/**
 * Storage Module - Barrel Export
 * 
 * This module provides secure storage capabilities for keys and credentials
 * with support for multiple backends and encryption.
 * 
 * @example
 * ```typescript
 * import { StorageClient, createSecureStorage } from '@/core/storage'
 * 
 * const client = new StorageClient({ backend: 'secure', encryptionKey: 'my-key' })
 * await client.storeKey('my-key-id', privateKey)
 * ```
 */

// Re-export the main client class
export { StorageClient, createSecureStorage } from './client.js'

// Re-export public types and interfaces
export type { StorageClientOptions } from './client.js'

// Re-export storage implementations
export * from './types.js'
export * from './memory.js'
export * from './secure-storage.js' 