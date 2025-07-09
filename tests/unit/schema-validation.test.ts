import { describe, it, expect } from 'vitest'
import { validateWithSchema } from '../../src/utils/jsonSchemaValidator'

// Minimal valid examples for each schema
const credentialTemplate = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['TestCredential'],
  issuer: 'did:example:issuer',
  credentialSubject: { id: 'did:example:subject' }
}

const sdkConfig = {
  version: '1.0.0',
  environment: 'development',
  platform: 'node',
  features: {
    trustRegistry: true,
    schemaRegistry: true,
    carbonAwareness: false,
    biometricAuth: false,
    offlineCache: true
  },
  security: {
    encryptionLevel: 'standard',
    requireBiometric: false,
    keyStorageType: 'file'
  }
}

describe('JSON Schema Validator', () => {
  it('validates credential template', () => {
    expect(() => validateWithSchema('credential-template.schema.json', credentialTemplate)).not.toThrow()
  })

  it('fails on invalid credential template', () => {
    const bad = { ...credentialTemplate }
    // remove required field
    delete (bad as any)['@context']
    expect(() => validateWithSchema('credential-template.schema.json', bad)).toThrow()
  })

  it('validates sdk configuration', () => {
    expect(() => validateWithSchema('sdk-configuration.schema.json', sdkConfig)).not.toThrow()
  })
}) 