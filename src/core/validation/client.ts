/**
 * Validation Client
 * 
 * Provides comprehensive validation for verifiable credentials including
 * schema validation, proof verification, trust checking, and revocation status.
 * 
 * @implements ADR-0009: Testing & Validation Strategy
 */

import type { 
  VerifiableCredential_2_0, 
  ValidationResult, 
  ValidationOptions 
} from '../../types'

import { validateSchema } from './utils/schema-validator'
import { validateProof } from './utils/proof-validator'
import { validateTrust } from './utils/trust-validator'
import { validateRevocation } from './utils/revocation-validator'

export interface ValidationClientOptions {
  /** Whether to skip trust registry checks */
  skipTrustCheck?: boolean
  /** Whether to skip revocation checks */
  skipRevocationCheck?: boolean
  /** Whether to skip schema validation */
  skipSchemaValidation?: boolean
  /** Whether to skip proof validation */
  skipProofValidation?: boolean
}

/**
 * Main validation client that provides unified validation capabilities
 */
export class ValidationClient {
  private options: ValidationClientOptions

  constructor(options: ValidationClientOptions = {}) {
    this.options = {
      skipTrustCheck: false,
      skipRevocationCheck: false,
      skipSchemaValidation: false,
      skipProofValidation: false,
      ...options
    }
  }

  /**
   * Validate a verifiable credential with all validation steps
   */
  async validateCredential(
    credential: VerifiableCredential_2_0,
    options?: ValidationOptions
  ): Promise<ValidationResult> {
    const validationErrors: string[] = []
    const warnings: string[] = []
    const mergedOptions = { ...this.options, ...options }

    // Schema validation
    if (!mergedOptions.skipSchemaValidation) {
      const schemaResult = await validateSchema(credential)
      if (!schemaResult.isValid) {
        validationErrors.push(...schemaResult.validationErrors)
      }
      warnings.push(...schemaResult.warnings)
    }

    // Proof validation
    if (!mergedOptions.skipProofValidation) {
      const proofResult = await validateProof(credential)
      if (!proofResult.isValid) {
        validationErrors.push(...proofResult.validationErrors)
      }
      warnings.push(...proofResult.warnings)
    }

    // Trust validation
    let trustStatus
    if (!mergedOptions.skipTrustCheck) {
      const trustResult = await validateTrust(credential)
      if (!trustResult.isValid) {
        validationErrors.push(...trustResult.validationErrors)
      }
      trustStatus = trustResult.trustStatus
      warnings.push(...trustResult.warnings)
    }

    // Revocation validation
    let revocationStatus
    if (!mergedOptions.skipRevocationCheck) {
      const revocationResult = await validateRevocation(credential)
      if (!revocationResult.isValid) {
        validationErrors.push(...revocationResult.validationErrors)
      }
      revocationStatus = revocationResult.revocationStatus
      warnings.push(...revocationResult.warnings)
    }

    return {
      isValid: validationErrors.length === 0,
      validationErrors,
      warnings,
      trustStatus,
      revocationStatus
    }
  }

  /**
   * Validate only the schema of a credential
   */
  async validateSchema(credential: VerifiableCredential_2_0): Promise<ValidationResult> {
    return await validateSchema(credential)
  }

  /**
   * Validate only the proof of a credential
   */
  async validateProof(credential: VerifiableCredential_2_0): Promise<ValidationResult> {
    return await validateProof(credential)
  }

  /**
   * Validate only the trust status of a credential
   */
  async validateTrust(credential: VerifiableCredential_2_0): Promise<ValidationResult> {
    return await validateTrust(credential)
  }

  /**
   * Validate only the revocation status of a credential
   */
  async validateRevocation(credential: VerifiableCredential_2_0): Promise<ValidationResult> {
    return await validateRevocation(credential)
  }

  /**
   * Update validation options
   */
  updateOptions(options: ValidationClientOptions): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Get current validation options
   */
  getOptions(): ValidationClientOptions {
    return { ...this.options }
  }
}

/**
 * Convenience function for backward compatibility
 */
export async function validateCredential(
  credential: VerifiableCredential_2_0,
  options?: ValidationOptions
): Promise<ValidationResult> {
  const client = new ValidationClient()
  return await client.validateCredential(credential, options)
} 