/**
 * Validation Module - Barrel Export
 * 
 * This module provides comprehensive validation for verifiable credentials
 * including schema validation, proof verification, trust checking, and revocation status.
 * 
 * @example
 * ```typescript
 * import { ValidationClient, validateCredential } from '@/core/validation'
 * 
 * const client = new ValidationClient()
 * const result = await client.validateCredential(credential)
 * ```
 */

// Re-export the main client class
export { ValidationClient, validateCredential } from './client'

// Export the legacy CredentialValidator class
export { CredentialValidator } from './credential-validator'

// Re-export public types and interfaces
export type { ValidationClientOptions } from './client'

// Re-export validation utilities (for advanced use cases)
export * from './utils/schema-validator'
export * from './utils/proof-validator'
export * from './utils/trust-validator'
export * from './utils/revocation-validator' 