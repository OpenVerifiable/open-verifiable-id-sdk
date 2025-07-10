/**
 * Proof validation utilities
 * Validates cryptographic proofs in verifiable credentials
 */

import { VerifiableCredential, ValidationResult, DataIntegrityProof, JwtProof } from '../../../types';

/**
 * Validates a credential's cryptographic proof
 */
export async function validateProof(credential: VerifiableCredential): Promise<ValidationResult> {
  const validationErrors: string[] = [];
  const warnings: string[] = [];

  if (!credential.proof) {
    validationErrors.push('Missing proof');
    return {
      isValid: false,
      validationErrors,
      warnings
    };
  }

  const proof = credential.proof;

  // Validate DataIntegrityProof
  if ('cryptosuite' in proof) {
    const dataIntegrityProof = proof as DataIntegrityProof;
    if (!dataIntegrityProof.cryptosuite) {
      validationErrors.push('Missing cryptosuite in DataIntegrityProof');
    }
    if (!dataIntegrityProof.created) {
      validationErrors.push('Missing created timestamp in DataIntegrityProof');
    }
    if (!dataIntegrityProof.verificationMethod) {
      validationErrors.push('Missing verificationMethod in DataIntegrityProof');
    }
    if (!dataIntegrityProof.proofPurpose) {
      validationErrors.push('Missing proofPurpose in DataIntegrityProof');
    }
    if (!dataIntegrityProof.proofValue) {
      validationErrors.push('Missing proofValue in DataIntegrityProof');
    }
  }
  // Validate JwtProof
  else if ('jwt' in proof) {
    const jwtProof = proof as JwtProof;
    if (!jwtProof.jwt) {
      validationErrors.push('Missing jwt in JwtProof');
    }
  }
  else {
    validationErrors.push('Invalid proof type - must be either DataIntegrityProof or JwtProof');
  }

  return {
    isValid: validationErrors.length === 0,
    validationErrors,
    warnings
  };
} 