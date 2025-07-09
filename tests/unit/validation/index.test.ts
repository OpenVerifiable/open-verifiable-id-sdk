import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CredentialValidator } from '../../../src/core/validation';
import { TrustRegistryClient } from '../../../src/core/trust-registry';
import { RevocationClient } from '../../../src/core/revocation/client';
import { Resolver } from 'did-resolver';
import { 
  VerifiableCredential_2_0, 
  TrustStatus,
  RevocationStatus 
} from '../../../src/types';

// Mock dependencies
vi.mock('../../../src/core/trust-registry');
vi.mock('../../../src/core/revocation/client');
vi.mock('did-resolver');

describe('CredentialValidator', () => {
  let validator: CredentialValidator;
  let trustRegistry: jest.Mocked<TrustRegistryClient>;
  let revocationClient: jest.Mocked<RevocationClient>;
  let didResolver: jest.Mocked<Resolver>;

  beforeEach(() => {
    trustRegistry = new TrustRegistryClient() as jest.Mocked<TrustRegistryClient>;
    revocationClient = new RevocationClient() as jest.Mocked<RevocationClient>;
    didResolver = new Resolver() as jest.Mocked<Resolver>;

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
    trustRegistry.checkIssuerStatus.mockResolvedValue({ isTrusted: true });
    trustRegistry.checkCredentialTypeStatus.mockResolvedValue({ isTrusted: true });
    revocationClient.checkRevocationStatus.mockResolvedValue(RevocationStatus.ACTIVE);

    const result = await validator.validateCredential(validCredential);

    expect(result.isValid).toBe(true);
    expect(result.trustStatus).toBe(TrustStatus.TRUSTED);
    expect(result.revocationStatus).toBe(RevocationStatus.ACTIVE);
    expect(result.errors).toHaveLength(0);
  });

  test('fails validation for missing required fields', async () => {
    const invalidCredential = { ...validCredential };
    delete (invalidCredential as any).type;

    const result = await validator.validateCredential(invalidCredential as VerifiableCredential_2_0);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid or missing type');
  });

  test('fails validation for invalid context', async () => {
    const invalidCredential = {
      ...validCredential,
      '@context': 'not-an-array' as any
    };

    const result = await validator.validateCredential(invalidCredential as VerifiableCredential_2_0);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid or missing @context');
  });

  test('fails validation for expired credential', async () => {
    const expiredCredential = {
      ...validCredential,
      validUntil: '2023-01-01T00:00:00Z' // Past date
    };

    const result = await validator.validateCredential(expiredCredential);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Credential has expired');
  });

  test('handles untrusted issuer', async () => {
    trustRegistry.checkIssuerStatus.mockResolvedValue({ isTrusted: false });
    
    const result = await validator.validateCredential(validCredential);

    expect(result.isValid).toBe(false);
    expect(result.trustStatus).toBe(TrustStatus.UNTRUSTED);
  });

  test('handles revoked credential', async () => {
    trustRegistry.checkIssuerStatus.mockResolvedValue({ isTrusted: true });
    trustRegistry.checkCredentialTypeStatus.mockResolvedValue({ isTrusted: true });
    revocationClient.checkRevocationStatus.mockResolvedValue(RevocationStatus.REVOKED);

    const result = await validator.validateCredential(validCredential);

    expect(result.isValid).toBe(false);
    expect(result.revocationStatus).toBe(RevocationStatus.REVOKED);
  });

  test('respects skipTrustCheck option', async () => {
    const result = await validator.validateCredential(validCredential, {
      skipTrustCheck: true
    });

    expect(trustRegistry.checkIssuerStatus).not.toHaveBeenCalled();
    expect(trustRegistry.checkCredentialTypeStatus).not.toHaveBeenCalled();
  });

  test('respects skipRevocationCheck option', async () => {
    const result = await validator.validateCredential(validCredential, {
      skipRevocationCheck: true
    });

    expect(revocationClient.checkRevocationStatus).not.toHaveBeenCalled();
  });
}); 