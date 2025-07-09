/**
 * Vitest Setup File
 * Global test configuration and mocks for the Open Verifiable ID SDK
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Global test timeout
vi.setConfig({ testTimeout: 30000 });

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.COSMOS_PAYER_SEED = 'test-seed-for-testing-only';
process.env.CHEQD_RPC_URL = 'https://testnet.cheqd.network';

// Ensure Node.js environment is properly detected in tests
if (typeof process === 'undefined') {
  (global as any).process = {
    env: {},
    versions: { node: '18.0.0' },
    platform: 'linux',
    arch: 'x64'
  };
}

// Mock fetch for network requests
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  vi.clearAllMocks();
});

// Test utilities
export const createMockDID = () => ({
  did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
  provider: 'did:key',
  keys: [],
  services: []
});

export const createMockCredential = () => ({
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  id: 'urn:uuid:12345678-1234-1234-1234-123456789abc',
  type: ['VerifiableCredential', 'TestCredential'],
  issuer: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
  validFrom: new Date().toISOString(),
  credentialSubject: {
    id: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
    name: 'Test User'
  },
  proof: {
    type: 'DataIntegrityProof' as const,
    cryptosuite: 'eddsa-jcs-2022',
    created: new Date().toISOString(),
    verificationMethod: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
    proofPurpose: 'assertionMethod' as const,
    proofValue: 'test-proof-value'
  }
});

// Performance testing utilities
export const measureAsyncOperation = async <T>(
  operation: () => Promise<T>
): Promise<number> => {
  const startTime = performance.now();
  await operation();
  const endTime = performance.now();
  return endTime - startTime;
};

export const calculateMean = (values: number[]): number => {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

// Security testing utilities
export const generateRandomTestCases = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    did: `did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK${index}`,
    data: new Uint8Array(32).fill(index)
  }));
};

export const calculateShannonEntropy = (values: string[]): number => {
  const frequency: Record<string, number> = {};
  values.forEach(value => {
    frequency[value] = (frequency[value] || 0) + 1;
  });
  
  const total = values.length;
  let entropy = 0;
  
  Object.values(frequency).forEach(count => {
    const probability = count / total;
    entropy -= probability * Math.log2(probability);
  });
  
  return entropy;
};

/**
 * Vitest setup file for credential validation tests
 */

// Mock crypto API
const mockCrypto = {
  subtle: {
    digest: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn(),
    generateKey: vi.fn(),
    deriveKey: vi.fn(),
    importKey: vi.fn(),
    exportKey: vi.fn(),
    wrapKey: vi.fn(),
    unwrapKey: vi.fn()
  },
  getRandomValues: vi.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  })
};

// Mock TextEncoder/TextDecoder
class MockTextEncoder {
  encode(str: string): Uint8Array {
    return new Uint8Array([...str].map(c => c.charCodeAt(0)));
  }
}

class MockTextDecoder {
  decode(bytes: Uint8Array): string {
    if (!bytes || bytes.length === 0) return '';
    return String.fromCharCode.apply(null, Array.from(bytes));
  }
}

// Define properties on global object
Object.defineProperties(global, {
  crypto: {
    value: mockCrypto,
    writable: true
  },
  TextEncoder: {
    value: MockTextEncoder,
    writable: true
  },
  TextDecoder: {
    value: MockTextDecoder,
    writable: true
  }
});

// Mock window object for browser environment tests
Object.defineProperties(global, {
  window: {
    value: {
      crypto: mockCrypto,
      TextEncoder: MockTextEncoder,
      TextDecoder: MockTextDecoder
    },
    writable: true
  }
});

// Mock self object for Web Worker environment tests
Object.defineProperties(global, {
  self: {
    value: {
      crypto: mockCrypto,
      TextEncoder: MockTextEncoder,
      TextDecoder: MockTextDecoder,
      importScripts: vi.fn()
    },
    writable: true
  }
});

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
}); 