/**
 * Jest Setup Configuration
 * 
 * Global test setup for Open Verifiable ID SDK
 */

// Global test timeout
jest.setTimeout(30000);

// Mock crypto for consistent testing
const mockCrypto = {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
  subtle: {
    generateKey: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
    importKey: jest.fn(),
    exportKey: jest.fn(),
  }
};

// Mock global crypto
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

// Mock localStorage for browser-like environment
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: () => Date.now(),
  },
  writable: true
});

// Mock fetch for network requests
(global as any).fetch = jest.fn();

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Test utilities
export const createMockCredential = (overrides: any = {}) => ({
  '@context': ['https://www.w3.org/2018/credentials/v1'],
  id: 'urn:uuid:12345678-1234-1234-1234-123456789abc',
  type: ['VerifiableCredential', 'EmailVerificationCredential'],
  issuer: 'did:key:123456789abcdef',
  validFrom: new Date().toISOString(),
  credentialSubject: {
    id: 'did:key:abcdef123456789',
    email: 'user@example.com'
  },
  proof: {
    type: 'DataIntegrityProof',
    cryptosuite: 'eddsa-jcs-2022',
    created: new Date().toISOString(),
    verificationMethod: 'did:key:123456789abcdef#key-1',
    proofPurpose: 'assertionMethod',
    proofValue: 'mock-proof-value'
  },
  ...overrides
});

export const createMockDID = (overrides: any = {}) => ({
  did: 'did:key:123456789abcdef',
  keys: [{
    kid: 'key-1',
    type: 'Ed25519',
    publicKey: new Uint8Array(32),
    privateKey: new Uint8Array(64)
  }],
  ...overrides
});

export const createMockAgent = (type: string, overrides: any = {}) => ({
  agentId: `test-${type}-agent`,
  agentType: type,
  createDID: jest.fn().mockResolvedValue(createMockDID()),
  issueCredential: jest.fn().mockResolvedValue(createMockCredential()),
  verifyCredential: jest.fn().mockResolvedValue({ isValid: true }),
  ...overrides
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
}); 