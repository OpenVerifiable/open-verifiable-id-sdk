/**
 * Schema validation utilities
 * Validates verifiable credentials against JSON schemas
 */

import { VerifiableCredential, ValidationResult } from '../../../types';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export async function validateSchema(credential: VerifiableCredential): Promise<ValidationResult> {
  const validationErrors: string[] = [];
  const warnings: string[] = [];

  // Basic schema validation
  if (!credential['@context'] || !Array.isArray(credential['@context'])) {
    validationErrors.push('Invalid or missing @context');
  }

  if (!credential.type || !Array.isArray(credential.type)) {
    validationErrors.push('Invalid or missing type');
  }

  if (!credential.issuer) {
    validationErrors.push('Missing issuer');
  }

  if (!credential.validFrom) {
    validationErrors.push('Missing validFrom');
  }

  if (!credential.credentialSubject) {
    validationErrors.push('Missing credentialSubject');
  }

  // Check context includes required VC context
  if (!credential['@context'].includes('https://www.w3.org/2018/credentials/v1')) {
    validationErrors.push('Missing required VC v1 context');
  }

  // Check type includes VerifiableCredential
  if (!credential.type.includes('VerifiableCredential')) {
    validationErrors.push('Missing required VerifiableCredential type');
  }

  // Check expiration if present
  if (credential.validUntil) {
    const expirationDate = new Date(credential.validUntil);
    if (isNaN(expirationDate.getTime())) {
      validationErrors.push('Invalid validUntil date format');
    }
    if (expirationDate < new Date()) {
      validationErrors.push('Credential has expired');
    }
  }

  return {
    isValid: validationErrors.length === 0,
    validationErrors,
    warnings
  };
} 