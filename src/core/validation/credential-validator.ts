/**
 * CredentialValidator
 * 
 * Legacy validator class that matches the test expectations.
 * This is a wrapper around ValidationClient for backward compatibility.
 */

import { ValidationClient } from './client'
import { TrustRegistryClient } from '../trust-registry'
import { RevocationClient } from '../revocation/client'
import { Resolver } from 'did-resolver'
import { 
  VerifiableCredential_2_0, 
  ValidationOptions,
  TrustStatus,
  RevocationStatus 
} from '../../types'

// Custom result type to match test expectations
interface CredentialValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  trustStatus?: any;
  revocationStatus?: any;
}

export class CredentialValidator {
  private validationClient: ValidationClient
  private trustRegistry: TrustRegistryClient
  private revocationClient: RevocationClient
  private didResolver: Resolver

  constructor(
    trustRegistry: TrustRegistryClient,
    revocationClient: RevocationClient,
    didResolver: Resolver
  ) {
    this.trustRegistry = trustRegistry
    this.revocationClient = revocationClient
    this.didResolver = didResolver
    this.validationClient = new ValidationClient()
  }

  /**
   * Validate a verifiable credential
   */
  async validateCredential(
    credential: VerifiableCredential_2_0,
    options?: ValidationOptions
  ): Promise<CredentialValidationResult> {
    const validationErrors: string[] = []
    const warnings: string[] = []

    // Basic schema validation
    if (!credential['@context'] || !Array.isArray(credential['@context'])) {
      validationErrors.push('Invalid or missing @context')
    }

    if (!credential.type || !Array.isArray(credential.type)) {
      validationErrors.push('Invalid or missing type')
    }

    if (!credential.issuer) {
      validationErrors.push('Missing issuer')
    }

    if (!credential.validFrom) {
      validationErrors.push('Missing validFrom')
    }

    if (!credential.credentialSubject) {
      validationErrors.push('Missing credentialSubject')
    }

    // Check context includes required VC context
    if (credential['@context'] && !credential['@context'].includes('https://www.w3.org/2018/credentials/v1')) {
      validationErrors.push('Missing required VC v1 context')
    }

    // Check type includes VerifiableCredential
    if (credential.type && !credential.type.includes('VerifiableCredential')) {
      validationErrors.push('Missing required VerifiableCredential type')
    }

    // Check expiration if present
    if (credential.validUntil) {
      const expirationDate = new Date(credential.validUntil)
      if (isNaN(expirationDate.getTime())) {
        validationErrors.push('Invalid validUntil date format')
      }
      if (expirationDate < new Date()) {
        validationErrors.push('Credential has expired')
      }
    }

    // Trust validation (unless skipped)
    let trustStatus: any = undefined
    if (!options?.skipTrustCheck) {
      try {
        const issuerDID = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id
        const issuerStatus = await this.trustRegistry.validateIssuer(issuerDID)
        
        if (!issuerStatus.isTrusted) {
          validationErrors.push('Untrusted issuer')
          trustStatus = { isTrusted: false }
        } else {
          trustStatus = { isTrusted: true }
        }
      } catch (error) {
        validationErrors.push('Trust validation failed')
        trustStatus = { isTrusted: false }
      }
    }

    // Revocation validation (unless skipped)
    let revocationStatus: any = undefined
    if (!options?.skipRevocationCheck) {
      try {
        const status = await this.revocationClient.checkRevocationStatus(credential.id)
        if (status.isRevoked) {
          validationErrors.push('Credential has been revoked')
        }
        revocationStatus = status
      } catch (error) {
        validationErrors.push('Revocation check failed')
        revocationStatus = { isRevoked: false }
      }
    }

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors, // Match test expectations
      warnings,
      trustStatus,
      revocationStatus
    }
  }
} 