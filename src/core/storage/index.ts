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
export { StorageClient, createSecureStorage } from './client'

// Re-export public types and interfaces
export type { StorageClientOptions } from './client'

// Re-export storage implementations
export * from './types'
export * from './memory'
export * from './secure-storage' 