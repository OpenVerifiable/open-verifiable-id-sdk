/**
 * Revocation Module - Public Types
 * 
 * This file contains public interfaces and types for the revocation module.
 */

import { VerifiableCredential_2_0 } from '../../types'

export interface RevocationMetadata {
  issuerDID: string
  revokedDate: string
  reason?: string
  notes?: string
  source: string
  lastChecked?: string
}

export interface RevokedCredential {
  credentialId: string
  metadata: RevocationMetadata
}

export interface RevocationStatus {
  isRevoked: boolean
  revokedDate?: string
  reason?: string
  lastChecked: string
  source: string
  metadata?: RevocationMetadata
}

export interface ValidationResult {
  isValid: boolean
  revocationStatus: RevocationStatus
  validationErrors: string[]
  warnings: string[]
}

export interface RevocationList {
  version: string
  created: string
  updated: string
  issuerDID: string
  revokedCredentials: RevokedCredential[]
  metadata: {
    name?: string
    description?: string
    source?: string
    maintainer?: string
  }
}

export interface RevocationProvider {
  name: string
  description: string
  checkRevocation(credentialId: string): Promise<boolean>
  getMetadata(credentialId: string): Promise<RevocationMetadata | null>
  isAvailable(): Promise<boolean>
} 