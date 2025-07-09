/**
 * Revocation Module - Barrel Export
 * 
 * This module provides local-first revocation checking for verifiable credentials
 * with extensible provider support.
 * 
 * @example
 * ```typescript
 * import { RevocationClient } from '@/core/revocation'
 * 
 * const client = new RevocationClient()
 * const isRevoked = await client.isRevoked(credentialId)
 * ```
 */

// Re-export the main client class
export { RevocationClient } from './client'

// Re-export public types and interfaces
export type {
  RevocationMetadata,
  RevokedCredential,
  RevocationStatus,
  ValidationResult,
  RevocationList,
  RevocationProvider
} from './types' 