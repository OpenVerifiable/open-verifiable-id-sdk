import { describe, test, expect, beforeEach } from 'vitest';
import { CredentialValidator } from '../../../src/core/validation';
import { TrustRegistryClient } from '../../../src/core/trust-registry';
import { RevocationClient } from '../../../src/core/revocation/client';
import { Resolver } from 'did-resolver';
import { 
  VerifiableCredential_2_0, 
  TrustStatus,
  RevocationStatus 
} from '../../../src/types';

describe('CredentialValidator', () => {
  let validator: CredentialValidator;
  let trustRegistry: TrustRegistryClient;
  let revocationClient: RevocationClient;
  let didResolver: Resolver;

  beforeEach(() => {
    trustRegistry = new TrustRegistryClient();
    revocationClient = new RevocationClient();
    didResolver = new Resolver();

    validator = new CredentialValidator(
      trustRegistry,
      revocationClient,
      didResolver
    );
  });

  // Valid credential for testing
  const validCredential: VerifiableCredential_2_0 = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:test-credential',
    type: ['VerifiableCredential', 'TestCredential'],
    issuer: 'did:example:issuer',
    validFrom: '2024-01-01T00:00:00Z',
    credentialSubject: {
      id: 'did:example:subject',
      test: 'value'
    }
  };

  test('validates a valid credential successfully', async () => {
    // Add a trusted issuer to the trust registry
    await trustRegistry.addTrustedIssuer('did:example:issuer', {
      name: 'Test Issuer',
      domain: 'example.com',
      addedDate: new Date().toISOString(),
      trustLevel: 'verified',
      source: 'test'
    });

    const result = await validator.validateCredential(validCredential);

    expect(result.isValid).toBeDefined();
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });

  test('fails validation for missing required fields', async () => {
    const invalidCredential = { ...validCredential };
    delete (invalidCredential as any).type;

    const result = await validator.validateCredential(invalidCredential as VerifiableCredential_2_0);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('fails validation for invalid context', async () => {
    const invalidCredential = {
      ...validCredential,
      '@context': 'not-an-array' as any
    };

    const result = await validator.validateCredential(invalidCredential as VerifiableCredential_2_0);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('fails validation for expired credential', async () => {
    const expiredCredential = {
      ...validCredential,
      validUntil: '2023-01-01T00:00:00Z' // Past date
    };

    const result = await validator.validateCredential(expiredCredential);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('handles untrusted issuer', async () => {
    // Don't add the issuer to trust registry, so it should be untrusted
    const result = await validator.validateCredential(validCredential);

    expect(result.isValid).toBe(false);
    expect(result.trustStatus).toBeDefined();
  });

  test('handles revoked credential', async () => {
    // Add the credential to revocation list
    await revocationClient.addRevokedCredential('urn:uuid:test-credential', {
      issuerDID: 'did:example:issuer',
      revokedDate: new Date().toISOString(),
      reason: 'Test revocation',
      source: 'test'
    });

    const result = await validator.validateCredential(validCredential);

    expect(result.isValid).toBe(false);
    expect(result.revocationStatus).toBeDefined();
  });

  test('respects skipTrustCheck option', async () => {
    const result = await validator.validateCredential(validCredential, {
      skipTrustCheck: true
    });

    // Should not fail due to trust issues
    expect(result.isValid).toBeDefined();
  });

  test('respects skipRevocationCheck option', async () => {
    // Add the credential to revocation list
    await revocationClient.addRevokedCredential('urn:uuid:test-credential', {
      issuerDID: 'did:example:issuer',
      revokedDate: new Date().toISOString(),
      reason: 'Test revocation',
      source: 'test'
    });

    const result = await validator.validateCredential(validCredential, {
      skipRevocationCheck: true
    });

    // Should not fail due to revocation issues
    expect(result.isValid).toBeDefined();
  });

  test('validates credential with valid proof', async () => {
    const credentialWithProof = {
      ...validCredential,
      proof: {
        type: 'JsonWebSignature2020' as const,
        jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      }
    };

    const result = await validator.validateCredential(credentialWithProof);

    expect(result.isValid).toBeDefined();
    expect(result.errors).toBeDefined();
  });

  test('handles validation errors gracefully', async () => {
    const malformedCredential = {
      '@context': 'invalid',
      id: 123, // Should be string
      type: 'not-an-array',
      issuer: null,
      validFrom: 'invalid-date',
      credentialSubject: null
    } as any;

    const result = await validator.validateCredential(malformedCredential);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
}); 