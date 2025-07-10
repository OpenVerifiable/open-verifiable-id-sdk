import { describe, test, expect, vi } from 'vitest';
import { validateProof } from '../../../src/core/validation/proof';
import { Resolver, DIDDocument } from 'did-resolver';
import { verifyJWS } from 'did-jwt';
import { Ed25519Signature2020 } from '@digitalbazaar/ed25519-signature-2020';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { 
  VerifiableCredential_2_0, 
  JwtProof,
  DataIntegrityProof as DataIntegrityProofType,
  ProofPurpose 
} from '../../../src/types';

// Mock dependencies
vi.mock('did-jwt');
vi.mock('@digitalbazaar/ed25519-signature-2020');
vi.mock('@digitalbazaar/data-integrity');

describe('Proof Validation', () => {
  // Mock DID Document
  const mockDidDocument: DIDDocument = {
    id: 'did:example:issuer',
    verificationMethod: [{
      id: 'did:example:issuer#key-1',
      type: 'Ed25519VerificationKey2020',
      controller: 'did:example:issuer',
      publicKeyJwk: {
        kty: 'OKP',
        crv: 'Ed25519',
        x: 'mockPublicKey'
      }
    }],
    authentication: ['did:example:issuer#key-1'],
    assertionMethod: ['did:example:issuer#key-1']
  };

  // Mock resolver
  const mockResolver: any = {
    resolve: vi.fn().mockResolvedValue({
      didDocument: mockDidDocument,
      didResolutionMetadata: {},
      didDocumentMetadata: {}
    })
  };

  // Test credential with JWT proof
  const credentialWithJwt: VerifiableCredential_2_0 = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:test',
    type: ['VerifiableCredential'],
    issuer: 'did:example:issuer',
    validFrom: '2024-01-01T00:00:00Z',
    credentialSubject: {
      id: 'did:example:subject'
    },
    proof: {
      type: 'JsonWebSignature2020',
      created: '2024-01-01T00:00:00Z',
      verificationMethod: 'did:example:issuer#key-1',
      proofPurpose: ProofPurpose.ASSERTION,
      jwt: 'mockJwt.payload.signature'
    } as JwtProof
  };

  // Test credential with Data Integrity proof
  const credentialWithDataIntegrity: VerifiableCredential_2_0 = {
    ...credentialWithJwt,
    proof: {
      type: 'DataIntegrityProof',
      created: '2024-01-01T00:00:00Z',
      verificationMethod: 'did:example:issuer#key-1',
      proofPurpose: ProofPurpose.ASSERTION,
      cryptosuite: 'eddsa-2022',
      proofValue: 'mockProofValue'
    } as DataIntegrityProofType
  };

  beforeEach(() => {
    // Reset the resolver mock to default successful behavior before each test
    mockResolver.resolve = vi.fn().mockResolvedValue({
      didDocument: mockDidDocument,
      didResolutionMetadata: {},
      didDocumentMetadata: {}
    });
  });

  test('validates JWT proof successfully', async () => {
    (verifyJWS as jest.Mock).mockResolvedValue(true);

    await expect(validateProof(
      credentialWithJwt,
      credentialWithJwt.proof as JwtProof,
      mockResolver
    )).resolves.not.toThrow();

    expect(verifyJWS).toHaveBeenCalledWith(
      'mockJwt.payload.signature',
      expect.any(Object)
    );
  });

  test('validates Data Integrity proof successfully', async () => {
    const mockDataIntegrityProof = {
      verify: vi.fn().mockResolvedValue({ verified: true })
    };

    (DataIntegrityProof as jest.Mock).mockImplementation(() => mockDataIntegrityProof);

    await expect(validateProof(
      credentialWithDataIntegrity,
      credentialWithDataIntegrity.proof as DataIntegrityProofType,
      mockResolver
    )).resolves.not.toThrow();

    expect(mockDataIntegrityProof.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        document: credentialWithDataIntegrity,
        proof: credentialWithDataIntegrity.proof
      })
    );
  });

  test('fails for unsupported proof type', async () => {
    const credentialWithUnsupportedProof = {
      ...credentialWithJwt,
      proof: {
        type: 'UnsupportedProof',
        created: '2024-01-01T00:00:00Z',
        verificationMethod: 'did:example:issuer#key-1',
        proofPurpose: ProofPurpose.ASSERTION
      }
    } as unknown as VerifiableCredential_2_0;

    await expect(validateProof(
      credentialWithUnsupportedProof,
      credentialWithUnsupportedProof.proof as any,
      mockResolver
    )).rejects.toThrow('Unsupported proof type');
  });

  test('fails when verification method not found', async () => {
    const credentialWithInvalidMethod = {
      ...credentialWithJwt,
      proof: {
        ...(credentialWithJwt.proof as JwtProof),
        verificationMethod: 'did:example:issuer#invalid-key'
      } as JwtProof
    } as VerifiableCredential_2_0;

    await expect(validateProof(
      credentialWithInvalidMethod,
      credentialWithInvalidMethod.proof as JwtProof,
      mockResolver
    )).rejects.toThrow('Verification method not found');
  });

  test('fails when DID resolution fails', async () => {
    mockResolver.resolve = vi.fn().mockRejectedValue(new Error('Resolution failed'));

    await expect(validateProof(
      credentialWithJwt,
      credentialWithJwt.proof as JwtProof,
      mockResolver
    )).rejects.toThrow('Failed to resolve issuer DID');
  });

  test('fails when JWT verification fails', async () => {
    (verifyJWS as jest.Mock).mockRejectedValue(new Error('Invalid signature'));

    await expect(validateProof(
      credentialWithJwt,
      credentialWithJwt.proof as JwtProof,
      mockResolver
    )).rejects.toThrow('JWT verification failed');
  });

  test('fails when Data Integrity proof verification fails', async () => {
    const mockDataIntegrityProof = {
      verify: vi.fn().mockResolvedValue({ 
        verified: false, 
        error: 'Invalid proof' 
      })
    };

    (DataIntegrityProof as jest.Mock).mockImplementation(() => mockDataIntegrityProof);

    await expect(validateProof(
      credentialWithDataIntegrity,
      credentialWithDataIntegrity.proof as DataIntegrityProofType,
      mockResolver
    )).rejects.toThrow('Data Integrity proof verification failed');
  });
}); 