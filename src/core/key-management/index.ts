/**
 * Key Management Module - Barrel Export
 * 
 * This module provides comprehensive key management capabilities including
 * generation, storage, signing, and verification for cryptographic keys.
 * 
 * @example
 * ```typescript
 * import { KeyManager, createKeyManager } from '@/core/key-management'
 * 
 * const keyManager = createKeyManager()
 * const keyId = await keyManager.generateKey('Ed25519')
 * ```
 */

// Re-export the main manager class
export { KeyManager } from './manager'

// Re-export public types and interfaces
export type { 
  KeyManagerOptions,
  KeyGenerationOptions,
  KeyImportOptions,
  KeyExportOptions,
  KeySignOptions,
  KeyVerifyOptions,
  KeyMetadata,
  KeyFormat,
  KeyUsage
} from './types'

// Re-export enums as values
export { KeyAlgorithm } from './types'

// Export utilities
export { createKeyManager } from './manager'

// Export platform-specific adapters
export { NodeKeyManager } from './adapters/node-key-manager'
export { BrowserKeyManager } from './adapters/browser-key-manager'
export { ReactNativeKeyManager } from './adapters/react-native-key-manager'

// Export utilities
export { 
  generateKeyPair,
  importKeyFromJWK,
  exportKeyToJWK,
  validateKeyFormat,
  deriveKeyFromPassword
} from './utils'

// Export key import/export functionality
export {
  importKey,
  exportKey,
  convertKeyFormat,
  validateKeyFormat as validateKeyImportExportFormat,
  KeyImportExportFormat
} from './key-import-export'

export type {
  KeyImportOptions as KeyImportExportOptions,
  KeyExportOptions as KeyExportFormatOptions,
  KeyImportResult,
  KeyExportResult
} from './key-import-export'

// Re-export types for convenience
export type { KeyManager as SDKKeyManager } from '../../types' 