/**
 * Platform Detection and Runtime Support
 * 
 * Provides platform detection and runtime-specific functionality
 */

import { RuntimePlatform, RuntimePlatformCapabilities } from '../types';

// Add type declaration for Web Worker environment
declare function importScripts(...urls: string[]): void;

/**
 * Runtime Platform Detector
 * Detects the current runtime platform and provides platform-specific utilities
 */
export class RuntimePlatformDetector {
  /**
   * Detect the current runtime platform
   */
  static detectRuntimePlatform(): RuntimePlatform {
    // Test environment override
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return RuntimePlatform.NODE;
    }
    
    // Check for React Native first since it may have Node.js-like globals
    if (
      typeof global !== 'undefined' && 
      global.navigator?.product === 'ReactNative' &&
      !global.window && 
      !global.document
    ) {
      return RuntimePlatform.REACT_NATIVE;
    }
    
    // Check for Node.js
    if (
      typeof process !== 'undefined' && 
      process.versions?.node && 
      typeof window === 'undefined'
    ) {
      return RuntimePlatform.NODE;
    }
    
    // Check for browser
    if (
      typeof window !== 'undefined' && 
      typeof document !== 'undefined' &&
      typeof window.crypto !== 'undefined'
    ) {
      return RuntimePlatform.BROWSER;
    }
    
    // Check for Web Worker
    if (
      typeof self !== 'undefined' && 
      typeof window === 'undefined' && 
      typeof importScripts === 'function'
    ) {
      return RuntimePlatform.WORKER;
    }
    
    throw new Error('Unable to detect runtime platform');
  }

  /**
   * Check if running in Node.js environment
   */
  static isNodeJS(): boolean {
    return this.detectRuntimePlatform() === RuntimePlatform.NODE;
  }

  /**
   * Check if running in browser environment
   */
  static isBrowser(): boolean {
    return this.detectRuntimePlatform() === RuntimePlatform.BROWSER;
  }

  /**
   * Check if running in React Native environment
   */
  static isReactNative(): boolean {
    return this.detectRuntimePlatform() === RuntimePlatform.REACT_NATIVE;
  }

  /**
   * Check if running in Web Worker environment
   */
  static isWorker(): boolean {
    return this.detectRuntimePlatform() === RuntimePlatform.WORKER;
  }

  /**
   * Get platform-specific crypto implementation
   */
  static getCrypto(): Crypto {
    if (this.isNodeJS()) {
      // Use Node.js crypto
      return require('crypto').webcrypto;
    } else if (this.isBrowser() || this.isWorker()) {
      // Use browser/worker crypto
      return typeof window !== 'undefined' ? window.crypto : self.crypto;
    } else if (this.isReactNative()) {
      // Use React Native crypto polyfill
      try {
        // This would be imported dynamically in a real implementation
        // For now return a basic implementation that throws on unsupported operations
        return {
          subtle: {
            digest: async (algorithm: string, data: BufferSource) => {
              throw new Error('Crypto operation not supported in React Native');
            },
            // Add other required methods
          },
          getRandomValues: <T extends ArrayBufferView>(array: T): T => {
            throw new Error('getRandomValues not supported in React Native');
          }
        } as unknown as Crypto;
      } catch (error) {
        throw new Error('Crypto not available in React Native environment');
      }
    } else {
      throw new Error('Crypto not available in current environment');
    }
  }

  /**
   * Get platform-specific storage implementation
   */
  static getStorage(): Storage | null {
    if (this.isBrowser()) {
      return localStorage;
    }
    return null;
  }

  /**
   * Get capabilities for the detected platform
   */
  static getCapabilities(platform?: RuntimePlatform): RuntimePlatformCapabilities {
    const currentRuntimePlatform = platform || this.detectRuntimePlatform();
    
    const capabilityMap: Record<RuntimePlatform, RuntimePlatformCapabilities> = {
      [RuntimePlatform.NODE]: {
        cryptoAPI: 'node',
        storageAPI: 'filesystem',
        networkAPI: 'node-fetch',
        secureContext: true,
        biometricSupport: false,
        backgroundProcessing: true
      },
      [RuntimePlatform.BROWSER]: {
        cryptoAPI: 'webcrypto',
        storageAPI: 'localstorage',
        networkAPI: 'fetch',
        secureContext: typeof crypto !== 'undefined' && crypto.subtle !== undefined,
        biometricSupport: typeof navigator !== 'undefined' && 'credentials' in navigator,
        backgroundProcessing: false
      },
      [RuntimePlatform.REACT_NATIVE]: {
        cryptoAPI: 'react-native-crypto',
        storageAPI: 'asyncstorage',
        networkAPI: 'fetch',
        secureContext: true,
        biometricSupport: true,
        backgroundProcessing: true
      },
      [RuntimePlatform.ELECTRON]: {
        cryptoAPI: 'node',
        storageAPI: 'filesystem',
        networkAPI: 'fetch',
        secureContext: true,
        biometricSupport: true,
        backgroundProcessing: true
      },
      [RuntimePlatform.WORKER]: {
        cryptoAPI: 'webcrypto',
        storageAPI: 'localstorage',
        networkAPI: 'fetch',
        secureContext: typeof crypto !== 'undefined' && crypto.subtle !== undefined,
        biometricSupport: false,
        backgroundProcessing: false
      }
    };
    
    return capabilityMap[currentRuntimePlatform];
  }

  /**
   * Check if a specific feature is supported on the current platform
   */
  static isFeatureSupported(feature: keyof RuntimePlatformCapabilities, platform?: RuntimePlatform): boolean {
    const capabilities = this.getCapabilities(platform);
    return !!capabilities[feature];
  }

  /**
   * Get platform-specific configuration
   */
  static getRuntimePlatformConfig(platform?: RuntimePlatform) {
    const currentRuntimePlatform = platform || this.detectRuntimePlatform();
    const capabilities = this.getCapabilities(currentRuntimePlatform);
    
    return {
      platform: currentRuntimePlatform,
      capabilities,
      isSecure: capabilities.secureContext,
      supportsBiometrics: capabilities.biometricSupport,
      supportsBackground: capabilities.backgroundProcessing,
      storageType: capabilities.storageAPI,
      cryptoProvider: capabilities.cryptoAPI,
      networkProvider: capabilities.networkAPI
    };
  }
}

/**
 * Global platform detection instance (lazy evaluation)
 */
let _currentRuntimePlatform: RuntimePlatform | null = null;
let _currentCapabilities: RuntimePlatformCapabilities | null = null;
let _platformConfig: any = null;

export const getCurrentRuntimePlatform = (): RuntimePlatform => {
  if (_currentRuntimePlatform === null) {
    _currentRuntimePlatform = RuntimePlatformDetector.detectRuntimePlatform();
  }
  return _currentRuntimePlatform;
};

export const getCurrentCapabilities = (): RuntimePlatformCapabilities => {
  if (_currentCapabilities === null) {
    _currentCapabilities = RuntimePlatformDetector.getCapabilities();
  }
  return _currentCapabilities;
};

export const getPlatformConfig = () => {
  if (_platformConfig === null) {
    _platformConfig = RuntimePlatformDetector.getRuntimePlatformConfig();
  }
  return _platformConfig;
};

// For backward compatibility
export const currentRuntimePlatform = getCurrentRuntimePlatform();
export const currentCapabilities = getCurrentCapabilities();
export const platformConfig = getPlatformConfig();

/**
 * RuntimePlatform-specific feature detection utilities
 */
export class FeatureDetector {
  /**
   * Check if biometric authentication is available
   */
  static async checkBiometricSupport(): Promise<boolean> {
    const platform = RuntimePlatformDetector.detectRuntimePlatform();
    
    switch (platform) {
      case RuntimePlatform.BROWSER:
        return 'credentials' in navigator && 
               typeof PublicKeyCredential !== 'undefined';
      
      case RuntimePlatform.REACT_NATIVE:
        try {
          // This would be imported dynamically in a real implementation
          // const { isAvailable } = await import('react-native-touch-id');
          // return await isAvailable();
          return true; // Placeholder for React Native
        } catch {
          return false;
        }
      
      case RuntimePlatform.ELECTRON:
        // Check for system biometric capabilities
        return true; // Placeholder
      
      default:
        return false;
    }
  }

  /**
   * Check available storage quota
   */
  static async checkStorageCapacity(): Promise<number> {
    const platform = RuntimePlatformDetector.detectRuntimePlatform();
    
    if (platform === RuntimePlatform.BROWSER && 'storage' in navigator) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate.quota || 0;
      } catch {
        return 0;
      }
    }
    
    return Infinity; // Assume unlimited for Node.js/React Native
  }

  /**
   * Check if secure context is available
   */
  static isSecureContext(): boolean {
    if (typeof window !== 'undefined') {
      return window.isSecureContext;
    }
    
    // Node.js is always considered secure
    return true;
  }

  /**
   * Check hardware security capabilities
   */
  static async checkHardwareSecurity(): Promise<{
    tpm: boolean;
    secureEnclave: boolean;
    strongBox: boolean;
  }> {
    const platform = RuntimePlatformDetector.detectRuntimePlatform();
    
    // Placeholder implementation - would need platform-specific detection
    return {
      tpm: platform === RuntimePlatform.NODE || platform === RuntimePlatform.ELECTRON,
      secureEnclave: platform === RuntimePlatform.REACT_NATIVE, // iOS specific
      strongBox: platform === RuntimePlatform.REACT_NATIVE // Android specific
    };
  }
}

// Export everything for easy access
export * from '../types';
export type { RuntimePlatform, RuntimePlatformCapabilities } from '../types'; 