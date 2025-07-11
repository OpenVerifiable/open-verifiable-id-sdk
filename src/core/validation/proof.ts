/**
 * Proof validation functionality for Verifiable Credentials
 */

import { Resolver, DIDDocument, VerificationMethod } from 'did-resolver';
import { verifyJWS } from 'did-jwt';
import { Ed25519Signature2020 } from '@digitalbazaar/ed25519-signature-2020';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { 
  VerifiableCredential_2_0, 
  JwtProof,
  DataIntegrityProof as DataIntegrityProofType
} from '../../types';

function hasVerificationMethod(proof: any): proof is { verificationMethod: string } {
  return typeof proof.verificationMethod === 'string';
}

function hasType(proof: any): proof is { type: string } {
  return proof && typeof proof.type === 'string';
}

export async function validateProof(
  credential: VerifiableCredential_2_0,
  proof: JwtProof | DataIntegrityProofType,
  resolver: Resolver
): Promise<void> {
  try {
    // Resolve the issuer DID to get verification methods
    const issuerDid = typeof credential.issuer === 'string' 
      ? credential.issuer 
      : credential.issuer.id;
    
    let didResolution;
    try {
      didResolution = await resolver.resolve(issuerDid);
    } catch (error) {
      throw new Error('Failed to resolve issuer DID');
    }
    
    if (!didResolution.didDocument) {
      throw new Error('Failed to resolve issuer DID');
    }

    // Find the verification method
    let verificationMethod: any = undefined;
    if (hasVerificationMethod(proof)) {
      const verificationMethodId = proof.verificationMethod;
      verificationMethod = didResolution.didDocument.verificationMethod?.find(
        (vm: any) => vm.id === verificationMethodId
      );
      if (!verificationMethod) {
        throw new Error('Verification method not found');
      }
    }

    // Validate proof based on type
    if ((hasType(proof) && proof.type === 'JsonWebSignature2020') || (proof as any).jwt) {
      await validateJwtProof(credential, proof as JwtProof, verificationMethod);
    } else if (hasType(proof) && proof.type === 'DataIntegrityProof') {
      await validateDataIntegrityProof(credential, proof as DataIntegrityProofType, verificationMethod);
    } else {
      const proofType = (proof as any).type || 'unknown';
      throw new Error(`Unsupported proof type: ${proofType}`);
    }

  } catch (error) {
    if (error instanceof Error) {
      // Preserve the original error message
      throw error;
    }
    throw new Error(`Proof validation failed: ${error}`);
  }
}

async function validateJwtProof(
  credential: VerifiableCredential_2_0,
  proof: JwtProof,
  verificationMethod: any
): Promise<void> {
  try {
    const jwt = proof.jwt;
    if (!jwt) {
      throw new Error('JWT not found in proof');
    }

    // Verify the JWT signature using the verification method directly
    const verified = await verifyJWS(jwt, verificationMethod);
    
    if (!verified) {
      throw new Error('JWT verification failed');
    }

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw new Error('JWT verification failed');
  }
}

async function validateDataIntegrityProof(
  credential: VerifiableCredential_2_0,
  proof: DataIntegrityProofType,
  verificationMethod: any
): Promise<void> {
  try {
    // Create Data Integrity proof verifier
    const suite = new Ed25519Signature2020({
      verificationMethod
    });

    const dataIntegrityProof = new DataIntegrityProof({
      suite
    });

    // Verify the proof
    const result = await dataIntegrityProof.verify({
      document: credential,
      proof: proof
    });

    if (!result.verified) {
      throw new Error(`Data Integrity proof verification failed: ${result.error || 'Unknown error'}`);
    }

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Data Integrity proof verification failed: ${error.message}`);
    }
    throw new Error('Data Integrity proof verification failed');
  }
}

export { validateJwtProof, validateDataIntegrityProof }; 