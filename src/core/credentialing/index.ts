/**
 * Credentialing Module - Barrel Export
 * 
 * This module provides Verifiable Credential issuance and verification capabilities.
 * 
 * @example
 * ```typescript
 * import { CredentialClient, createCredentialClient } from '@/core/credentialing'
 * 
 * const client = createCredentialClient({ agent: myAgent })
 * const credential = await client.issueCredential(template)
 * ```
 */

// Re-export the main client class
export { CredentialClient, createCredentialClient } from './client'

// Re-export key management functionality
export { 
  CredentialKeyManager 
} from './key-manager'

// Re-export public types and interfaces
export type { CredentialClientOptions } from './types'
export type { 
  CredentialKeyBundle, 
  KeyExportOptions, 
  KeyImportOptions,
  CrossDeviceSyncData
} from './key-manager' 