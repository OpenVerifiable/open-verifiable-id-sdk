import { describe, test, expect, beforeAll, afterEach } from 'vitest';
import { validateSchema, clearValidatorCache, getValidatorCacheSize } from '../../../src/core/validation/schema';
import { VerifiableCredential_2_0, CredentialSchema } from '../../../src/types';

describe('Schema Validation', () => {
  // Test schema
  const testSchema: CredentialSchema = {
    id: 'https://example.com/schemas/test',
    type: 'JsonSchema',
    schema: {
      type: 'object',
      required: ['name', 'age'],
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        email: { type: 'string', format: 'email' }
      }
    }
  };

  // Valid test credential
  const validCredential: VerifiableCredential_2_0 = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'urn:uuid:test-credential',
    type: ['VerifiableCredential', 'TestCredential'],
    issuer: 'did:example:issuer',
    validFrom: '2024-01-01T00:00:00Z',
    credentialSubject: {
      id: 'did:example:subject',
      name: 'Test User',
      age: 25,
      email: 'test@example.com'
    },
    credentialSchema: testSchema
  };

  afterEach(() => {
    clearValidatorCache();
  });

  test('validates a credential with valid schema', async () => {
    await expect(validateSchema(validCredential, testSchema))
      .resolves.not.toThrow();
  });

  test('fails validation for missing required fields', async () => {
    const invalidCredential = {
      ...validCredential,
      credentialSubject: {
        id: 'did:example:subject',
        name: 'Test User'
        // Missing age field
      }
    } as VerifiableCredential_2_0;

    await expect(validateSchema(invalidCredential, testSchema))
      .rejects.toThrow('Schema validation failed');
  });

  test('fails validation for wrong field type', async () => {
    const invalidCredential = {
      ...validCredential,
      credentialSubject: {
        id: 'did:example:subject',
        name: 'Test User',
        age: '25', // String instead of number
        email: 'test@example.com'
      }
    } as VerifiableCredential_2_0;

    await expect(validateSchema(invalidCredential, testSchema))
      .rejects.toThrow('Schema validation failed');
  });

  test('fails validation for invalid email format', async () => {
    const invalidCredential = {
      ...validCredential,
      credentialSubject: {
        id: 'did:example:subject',
        name: 'Test User',
        age: 25,
        email: 'not-an-email'
      }
    } as VerifiableCredential_2_0;

    await expect(validateSchema(invalidCredential, testSchema))
      .rejects.toThrow('Schema validation failed');
  });

  test('caches validators', async () => {
    // First validation should cache the validator
    await validateSchema(validCredential, testSchema);
    expect(getValidatorCacheSize()).toBe(1);

    // Second validation should use cached validator
    await validateSchema(validCredential, testSchema);
    expect(getValidatorCacheSize()).toBe(1);
  });

  test('clears validator cache', async () => {
    await validateSchema(validCredential, testSchema);
    expect(getValidatorCacheSize()).toBe(1);

    clearValidatorCache();
    expect(getValidatorCacheSize()).toBe(0);
  });

  test('handles invalid schema format', async () => {
    const invalidSchema = {
      ...testSchema,
      schema: {
        type: 'invalid'
      }
    };

    await expect(validateSchema(validCredential, invalidSchema))
      .rejects.toThrow('Failed to compile schema');
  });

  test('validates multiple credentials with same schema', async () => {
    const anotherValidCredential = {
      ...validCredential,
      id: 'urn:uuid:another-credential',
      credentialSubject: {
        id: 'did:example:another',
        name: 'Another User',
        age: 30,
        email: 'another@example.com'
      }
    };

    await expect(validateSchema(validCredential, testSchema))
      .resolves.not.toThrow();
    await expect(validateSchema(anotherValidCredential, testSchema))
      .resolves.not.toThrow();
    expect(getValidatorCacheSize()).toBe(1); // Should reuse cached validator
  });
}); 