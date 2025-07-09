/**
 * Trust Registry Module - Public Types
 * 
 * This file contains public interfaces and types for the trust registry module.
 */

import { VerifiableCredential_2_0 } from '../../types'

export interface TrustMetadata {
  name?: string
  domain?: string
  addedDate: string
  notes?: string
  trustLevel: 'personal' | 'verified' | 'community'
  source?: string
  lastValidated?: string
}

export interface TrustedIssuer {
  issuerDID: string
  metadata: TrustMetadata
}

export interface TrustStatus {
  isTrusted: boolean
  trustLevel: string
  lastValidated: string
  source: string
  metadata?: TrustMetadata
}

export interface ValidationResult {
  isValid: boolean
  trustStatus: TrustStatus
  validationErrors: string[]
  warnings: string[]
}

export interface TrustRegistry {
  version: string
  created: string
  updated: string
  issuers: TrustedIssuer[]
  metadata: {
    name?: string
    description?: string
    source?: string
    maintainer?: string
  }
}

export interface TrustRegistryProvider {
  name: string
  description: string
  validate(issuerDID: string): Promise<boolean>
  getMetadata(issuerDID: string): Promise<TrustMetadata | null>
  isAvailable(): Promise<boolean>
} 