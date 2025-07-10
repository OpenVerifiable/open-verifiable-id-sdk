/**
 * Global test setup for Vitest
 * 
 * This file sets up common test utilities, mocks, and configurations
 * that are used across all test environments.
 */

import { vi, beforeEach, afterEach } from 'vitest'

// Mock crypto for consistent testing across environments
const mockCrypto = {
  randomBytes: vi.fn((size: number) => new Uint8Array(size).fill(42)),
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mocked-hash')
  })),
  createSign: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    sign: vi.fn().mockReturnValue('mocked-signature')
  })),
  createVerify: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    verify: vi.fn().mockReturnValue(true)
  }))
}

// Global setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks()
  
  // Setup global test environment - only set if undefined
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', {
      value: mockCrypto,
      writable: true,
      configurable: true
    })
  }
  globalThis.TextEncoder = globalThis.TextEncoder || class {
    encode(input: string) {
      return new Uint8Array(Buffer.from(input, 'utf8'))
    }
  }
  globalThis.TextDecoder = globalThis.TextDecoder || class {
    decode(input: Uint8Array) {
      return Buffer.from(input).toString('utf8')
    }
  }
})

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks()
})

// Global test utilities
export const testUtils = {
  // Generate deterministic test data
  generateTestDID: () => 'did:test:123456789abcdefghijk',
  generateTestCredential: () => ({
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    id: 'urn:uuid:test-credential-123',
    type: ['VerifiableCredential'],
    issuer: 'did:test:issuer',
    validFrom: new Date().toISOString(),
    credentialSubject: {
      id: 'did:test:subject',
      name: 'Test Subject'
    }
  }),
  
  // Mock storage implementation for testing
  createMockStorage: () => ({
    store: vi.fn().mockResolvedValue(undefined),
    retrieve: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined)
  }),
  
  // Mock agent implementation
  createMockAgent: () => ({
    id: 'test-agent-id',
    type: 'user',
    capabilities: ['credential-management', 'did-operations'],
    processMessage: vi.fn().mockResolvedValue({ success: true }),
    sendMessage: vi.fn().mockResolvedValue({ success: true })
  }),
  
  // Test timeouts and delays
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Crypto test utilities
  generateTestKeyPair: () => ({
    publicKey: 'mock-public-key',
    privateKey: 'mock-private-key'
  })
}

// Mock console methods for cleaner test output
const originalConsole = { ...console }

export const suppressConsole = () => {
  console.log = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()
  console.info = vi.fn()
}

export const restoreConsole = () => {
  Object.assign(console, originalConsole)
}

// Export commonly used test constants
export const TEST_CONSTANTS = {
  DID_METHOD: 'test',
  ISSUER_DID: 'did:test:issuer',
  SUBJECT_DID: 'did:test:subject',
  MOCK_CREDENTIAL_TYPE: 'TestCredential',
  TEST_TIMEOUT: 5000,
  CRYPTO_ALGORITHM: 'Ed25519',
  STORAGE_PREFIX: 'test-storage:'
} as const 