---
ADR: 0013
Title: ov-id-sdk Cross-Platform Compatibility
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, proof_first_trust, inclusive_integration, community_collaboration, empowerment_over_extraction, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0005, 0006, 0007, 0010, 0012]
BusinessImpact: >-
  - Enables broad SDK adoption across Node.js, browser, and mobile platforms
  - Reduces development effort for applications targeting multiple platforms
  - Expands addressable market through universal platform support
Runbook: |
  1. Test platform compatibility: `./scripts/test-platform-compatibility.sh {platform}`
  2. Check API surface consistency: `./scripts/check-api-consistency.sh`
  3. Validate crypto operations: `./scripts/test-crypto-platforms.sh`
  4. Test build outputs: `./scripts/test-build-outputs.sh {target}`
  5. Monitor platform-specific issues: `./scripts/monitor-platform-issues.sh`
---

## Context

The ov-id-sdk must function consistently across diverse runtime environments including Node.js servers, web browsers, React Native mobile apps, and potentially Electron desktop applications. Each platform has unique constraints around cryptographic APIs, storage mechanisms, networking capabilities, and security models. 

Currently, the SDK primarily targets Node.js environments, but adoption requires supporting the full spectrum of JavaScript runtimes where identity operations are needed. Platform-specific differences in WebCrypto APIs, storage availability, and security contexts create implementation challenges that must be addressed systematically.

## Requirements

### Must
- Support Node.js (18+), modern browsers (Chrome, Firefox, Safari, Edge), and React Native
- Provide consistent API surface across all platforms with identical function signatures
- Handle platform-specific cryptographic operations (Node.js crypto vs WebCrypto vs React Native)
- Implement appropriate storage mechanisms for each platform (filesystem, localStorage, secure storage)
- Maintain security equivalent across platforms while respecting platform limitations

### Should
- Support progressive web apps (PWA) with offline capabilities
- Provide platform-specific optimizations for performance and security
- Include platform detection and feature capability checking
- Support Electron and other hybrid environments
- Provide clear documentation for platform-specific considerations

### Could
- Support server-side rendering (SSR) frameworks like Next.js and Nuxt.js
- Provide platform-specific extension points for custom implementations
- Support edge runtime environments (Cloudflare Workers, Vercel Edge)
- Include platform-specific testing and debugging tools

## Decision

### 1. Universal Compatibility Strategy
- **Single Codebase**: Maintain unified TypeScript codebase with platform-specific adaptations
- **Conditional Implementations**: Runtime platform detection with appropriate implementation selection
- **Consistent API Surface**: Identical public APIs across platforms with internal adaptation layers
- **Feature Parity**: Core identity operations available on all platforms with graceful capability detection

### 2. Implementation Approach

#### Platform Detection and Abstraction
```typescript
// Platform detection and capability assessment
enum Platform {
  NODE = 'node',
  BROWSER = 'browser', 
  REACT_NATIVE = 'react-native',
  ELECTRON = 'electron',
  WORKER = 'worker'
}

interface PlatformCapabilities {
  cryptoAPI: 'node' | 'webcrypto' | 'react-native-crypto';
  storageAPI: 'filesystem' | 'localstorage' | 'asyncstorage' | 'secure-storage';
  networkAPI: 'fetch' | 'node-fetch' | 'xhr';
  secureContext: boolean;
  biometricSupport: boolean;
  backgroundProcessing: boolean;
}

class PlatformDetector {
  static detectPlatform(): Platform {
    // Node.js environment
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      return Platform.NODE;
    }
    
    // React Native environment
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      return Platform.REACT_NATIVE;
    }
    
    // Electron environment
    if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
      return Platform.ELECTRON;
    }
    
    // Web Worker environment
    if (typeof importScripts === 'function') {
      return Platform.WORKER;
    }
    
    // Browser environment (default)
    return Platform.BROWSER;
  }

  static getCapabilities(platform: Platform): PlatformCapabilities {
    const capabilityMap: Record<Platform, PlatformCapabilities> = {
      [Platform.NODE]: {
        cryptoAPI: 'node',
        storageAPI: 'filesystem',
        networkAPI: 'node-fetch',
        secureContext: true,
        biometricSupport: false,
        backgroundProcessing: true
      },
      [Platform.BROWSER]: {
        cryptoAPI: 'webcrypto',
        storageAPI: 'localstorage',
        networkAPI: 'fetch',
        secureContext: typeof crypto !== 'undefined' && crypto.subtle !== undefined,
        biometricSupport: 'credentials' in navigator,
        backgroundProcessing: false
      },
      [Platform.REACT_NATIVE]: {
        cryptoAPI: 'react-native-crypto',
        storageAPI: 'asyncstorage',
        networkAPI: 'fetch',
        secureContext: true,
        biometricSupport: true,
        backgroundProcessing: true
      },
      // ... other platforms
    };
    
    return capabilityMap[platform];
  }
}
```

#### Cryptographic Operations Abstraction
```typescript
// Unified cryptographic interface across platforms
interface CryptoProvider {
  generateKeyPair(algorithm: string): Promise<CryptoKeyPair>;
  sign(key: CryptoKey, data: Uint8Array): Promise<Uint8Array>;
  verify(key: CryptoKey, signature: Uint8Array, data: Uint8Array): Promise<boolean>;
  hash(algorithm: string, data: Uint8Array): Promise<Uint8Array>;
  randomBytes(length: number): Uint8Array;
}

// Node.js implementation
class NodeCryptoProvider implements CryptoProvider {
  async generateKeyPair(algorithm: string): Promise<CryptoKeyPair> {
    const { generateKeyPair } = await import('crypto');
    return new Promise((resolve, reject) => {
      generateKeyPair(algorithm, {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      }, (err, publicKey, privateKey) => {
        if (err) reject(err);
        else resolve({ publicKey, privateKey } as any);
      });
    });
  }

  async sign(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
    const { createSign } = await import('crypto');
    const signer = createSign('SHA256');
    signer.update(data);
    return new Uint8Array(signer.sign(key as any));
  }

  randomBytes(length: number): Uint8Array {
    const { randomBytes } = require('crypto');
    return new Uint8Array(randomBytes(length));
  }
}

// Browser implementation using WebCrypto
class WebCryptoProvider implements CryptoProvider {
  async generateKeyPair(algorithm: string): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: algorithm,
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['sign', 'verify']
    );
  }

  async sign(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);
    return new Uint8Array(signature);
  }

  randomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }
}

// Factory for platform-appropriate crypto provider
class CryptoProviderFactory {
  static create(platform: Platform): CryptoProvider {
    switch (platform) {
      case Platform.NODE:
        return new NodeCryptoProvider();
      case Platform.BROWSER:
      case Platform.WORKER:
        return new WebCryptoProvider();
      case Platform.REACT_NATIVE:
        return new ReactNativeCryptoProvider();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
```

#### Storage Abstraction Layer
```typescript
// Unified storage interface
interface StorageProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

// Node.js filesystem storage
class NodeStorageProvider implements StorageProvider {
  private storageDir: string;

  constructor(storageDir = path.join(os.homedir(), '.ov-id-sdk')) {
    this.storageDir = storageDir;
    fs.mkdirSync(storageDir, { recursive: true });
  }

  async get(key: string): Promise<string | null> {
    const filePath = path.join(this.storageDir, `${key}.json`);
    try {
      return await fs.promises.readFile(filePath, 'utf8');
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    const filePath = path.join(this.storageDir, `${key}.json`);
    await fs.promises.writeFile(filePath, value, 'utf8');
  }
}

// Browser localStorage implementation
class BrowserStorageProvider implements StorageProvider {
  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

// React Native AsyncStorage implementation
class ReactNativeStorageProvider implements StorageProvider {
  private AsyncStorage: any;

  constructor() {
    this.AsyncStorage = require('@react-native-async-storage/async-storage');
  }

  async get(key: string): Promise<string | null> {
    return await this.AsyncStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.AsyncStorage.setItem(key, value);
  }
}
```

### 3. Build and Distribution Strategy

#### Multi-Target Build Configuration
```typescript
// Webpack configuration for multiple targets
const webpack = require('webpack');

const createConfig = (target, platform) => ({
  entry: './src/index.ts',
  target: target,
  mode: process.env.NODE_ENV || 'development',
  
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: platform === 'browser' ? {
      'crypto': require.resolve('crypto-browserify'),
      'stream': require.resolve('stream-browserify'),
      'path': require.resolve('path-browserify'),
      'fs': false
    } : {}
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.PLATFORM': JSON.stringify(platform),
      'process.env.TARGET': JSON.stringify(target)
    })
  ],

  output: {
    path: path.resolve(__dirname, 'dist', platform),
    filename: 'index.js',
    library: 'OvIdSDK',
    libraryTarget: platform === 'browser' ? 'umd' : 'commonjs2'
  }
});

module.exports = [
  createConfig('node', 'node'),
  createConfig('web', 'browser'),
  createConfig('react-native', 'react-native')
];
```

#### Package.json Distribution Strategy
```json
{
  "name": "@originvault/ov-id-sdk",
  "main": "./dist/node/index.js",
  "browser": "./dist/browser/index.js",
  "react-native": "./dist/react-native/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "node": "./dist/node/index.js",
      "browser": "./dist/browser/index.js",
      "react-native": "./dist/react-native/index.js",
      "types": "./dist/types/index.d.ts"
    }
  },
  "files": [
    "dist/"
  ]
}
```

### 4. Platform-Specific Features

#### Progressive Enhancement Based on Capabilities
```typescript
class FeatureDetector {
  static async checkBiometricSupport(): Promise<boolean> {
    const platform = PlatformDetector.detectPlatform();
    
    switch (platform) {
      case Platform.BROWSER:
        return 'credentials' in navigator && 
               typeof PublicKeyCredential !== 'undefined';
      
      case Platform.REACT_NATIVE:
        try {
          const { isAvailable } = await import('react-native-touch-id');
          return await isAvailable();
        } catch {
          return false;
        }
      
      default:
        return false;
    }
  }

  static async checkOfflineStorageCapacity(): Promise<number> {
    const platform = PlatformDetector.detectPlatform();
    
    if (platform === Platform.BROWSER && 'storage' in navigator) {
      const estimate = await navigator.storage.estimate();
      return estimate.quota || 0;
    }
    
    return Infinity; // Assume unlimited for Node.js/React Native
  }
}

// Example usage with progressive enhancement
class BiometricManager {
  async authenticate(): Promise<boolean> {
    const isSupported = await FeatureDetector.checkBiometricSupport();
    
    if (!isSupported) {
      console.warn('Biometric authentication not supported on this platform');
      return false;
    }

    const platform = PlatformDetector.detectPlatform();
    
    switch (platform) {
      case Platform.BROWSER:
        return await this.authenticateWithWebAuthn();
      
      case Platform.REACT_NATIVE:
        return await this.authenticateWithTouchID();
      
      default:
        return false;
    }
  }
}
```

### 5. Testing Strategy

#### Cross-Platform Test Matrix
```typescript
// Jest configuration for cross-platform testing
const config = {
  projects: [
    {
      displayName: 'Node.js',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.test.ts']
    },
    {
      displayName: 'Browser',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/browser.ts'],
      testMatch: ['<rootDir>/src/**/*.browser.test.ts']
    },
    {
      displayName: 'React Native',
      preset: 'react-native',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/react-native.ts'],
      testMatch: ['<rootDir>/src/**/*.rn.test.ts']
    }
  ]
};

// Platform-specific test utilities
export class PlatformTestUtils {
  static mockPlatform(platform: Platform) {
    const originalProcess = global.process;
    const originalNavigator = global.navigator;
    
    // Mock platform detection for testing
    switch (platform) {
      case Platform.NODE:
        global.process = { versions: { node: '18.0.0' } } as any;
        break;
      
      case Platform.BROWSER:
        global.navigator = { product: 'Gecko' } as any;
        global.crypto = { subtle: {} } as any;
        break;
      
      case Platform.REACT_NATIVE:
        global.navigator = { product: 'ReactNative' } as any;
        break;
    }
    
    return () => {
      global.process = originalProcess;
      global.navigator = originalNavigator;
    };
  }
}
```

## Consequences

### Positives
- **Universal Accessibility**: SDK works consistently across all major JavaScript runtime environments
- **Simplified Integration**: Developers can use identical APIs regardless of target platform
- **Broader Adoption**: Platform compatibility removes barriers to SDK adoption across different project types
- **Future-Proof Architecture**: Abstraction layers enable easy support for new platforms and environments
- **Optimal Platform Usage**: Platform-specific optimizations provide best possible performance and security

### Negatives
- **Implementation Complexity**: Platform abstraction layers add significant development and maintenance overhead
- **Bundle Size Impact**: Supporting multiple platforms may increase bundle size for specific deployments
- **Testing Complexity**: Cross-platform testing matrix requires comprehensive test infrastructure
- **Feature Parity Challenges**: Ensuring identical behavior across platforms with different capabilities

### Trade-offs
- **Universal Compatibility vs Performance**: Platform abstraction may sacrifice some platform-specific optimizations
- **Single Codebase vs Platform-Specific**: Unified codebase increases complexity but reduces maintenance burden
- **Feature Parity vs Platform Optimization**: Consistent APIs vs leveraging unique platform capabilities

## Business Impact
- **Required for MVP**: Cross-platform support essential for broad SDK adoption across web, mobile, and server applications
- **Developer Experience**: Consistent APIs reduce learning curve and integration effort
- **Market Expansion**: Support for all major platforms maximizes addressable developer market
- **Competitive Advantage**: Universal compatibility differentiates SDK from platform-specific alternatives

## Mission Alignment & Principle Coverage

### Creator First, Always
Cross-platform compatibility prioritizes **creator outcomes**—build once, deploy everywhere—reducing development friction and enabling creators to reach users on any platform.

### User Sovereignty
Platform compatibility ensures users can access their identity data and credentials regardless of their **device choice** or preferred platform, preventing **lock-in** to specific ecosystems.

### Proof-First Trust
Cryptographic operations maintain **identical security** guarantees across platforms while respecting platform-specific security contexts and **audit capabilities**.

### Inclusive Integration
Universal platform support enables **inclusive access** regardless of device type, operating system, or technical constraints, supporting creators with **diverse technical environments**.

### Community Collaboration
Cross-platform architecture enables **community contributions** across different platform ecosystems and **open collaboration** on platform-specific optimizations.

### Empowerment Over Extraction
Platform compatibility **empowers** developers with choice and flexibility rather than creating **dependency** on specific platform vendors or runtime environments.

### Privacy by Design
Platform-specific privacy controls respect each environment's **privacy models** while maintaining consistent **GDPR/CCPA** compliance across all platforms.

### Modular & Open-Source Foundation
Platform abstraction layers are **modular** and **extensible**, enabling community contributions for new platforms without **architectural lock-in**.

### Security First
Security implementations leverage each platform's **strongest security** capabilities while maintaining **secure by default** behavior across all environments.

### Resilience by Design
Cross-platform support provides **resilience** through platform diversity, enabling continued functionality even if specific platform environments become unavailable. 