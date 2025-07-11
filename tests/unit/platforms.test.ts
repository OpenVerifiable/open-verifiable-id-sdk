import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  RuntimePlatformDetector, 
  FeatureDetector,
  currentRuntimePlatform,
  currentCapabilities,
  platformConfig
} from '../../src/platforms'
import { RuntimePlatform } from '../../src/types'

// Test environment setup

describe('Platform Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    // Clean up test environment variables
    delete process.env.TEST_PLATFORM
  })

  describe('RuntimePlatformDetector', () => {
    describe('detectRuntimePlatform', () => {
      it('should detect Node.js platform', () => {
        // Set test platform override
        process.env.TEST_PLATFORM = RuntimePlatform.NODE
        
        const platform = RuntimePlatformDetector.detectRuntimePlatform()
        
        expect(platform).toBe(RuntimePlatform.NODE)
      })

      it('should detect React Native platform', () => {
        // Set test platform override
        process.env.TEST_PLATFORM = RuntimePlatform.REACT_NATIVE
        
        const platform = RuntimePlatformDetector.detectRuntimePlatform()
        
        expect(platform).toBe(RuntimePlatform.REACT_NATIVE)
      })

      it('should detect browser platform', () => {
        // Set test platform override
        process.env.TEST_PLATFORM = RuntimePlatform.BROWSER
        
        const platform = RuntimePlatformDetector.detectRuntimePlatform()
        
        expect(platform).toBe(RuntimePlatform.BROWSER)
      })

      it('should default to Node.js when no platform is detected', () => {
        // Clear test platform override
        delete process.env.TEST_PLATFORM
        
        const platform = RuntimePlatformDetector.detectRuntimePlatform()
        
        expect(platform).toBe(RuntimePlatform.NODE)
      })
    })

    describe('platform checks', () => {
      it('should correctly identify Node.js', () => {
        process.env.TEST_PLATFORM = RuntimePlatform.NODE
        
        expect(RuntimePlatformDetector.isNodeJS()).toBe(true)
        expect(RuntimePlatformDetector.isBrowser()).toBe(false)
        expect(RuntimePlatformDetector.isReactNative()).toBe(false)
      })

      it('should correctly identify browser', () => {
        process.env.TEST_PLATFORM = RuntimePlatform.BROWSER
        
        expect(RuntimePlatformDetector.isNodeJS()).toBe(false)
        expect(RuntimePlatformDetector.isBrowser()).toBe(true)
        expect(RuntimePlatformDetector.isReactNative()).toBe(false)
      })

      it('should correctly identify React Native', () => {
        process.env.TEST_PLATFORM = RuntimePlatform.REACT_NATIVE
        
        expect(RuntimePlatformDetector.isNodeJS()).toBe(false)
        expect(RuntimePlatformDetector.isBrowser()).toBe(false)
        expect(RuntimePlatformDetector.isReactNative()).toBe(true)
      })
    })

    describe('getCrypto', () => {
      it('should return Node.js crypto for Node.js platform', () => {
        process.env.TEST_PLATFORM = RuntimePlatform.NODE
        
        const crypto = RuntimePlatformDetector.getCrypto()
        
        expect(crypto).toBeDefined()
      })

      it('should return browser crypto for browser platform', () => {
        process.env.TEST_PLATFORM = RuntimePlatform.BROWSER
        
        const crypto = RuntimePlatformDetector.getCrypto()
        
        expect(crypto).toBeDefined()
      })

      it('should throw error for unsupported platform', () => {
        // Set an invalid platform
        process.env.TEST_PLATFORM = 'INVALID_PLATFORM' as any
        
        expect(() => RuntimePlatformDetector.getCrypto()).toThrow(
          'Crypto not available in current environment'
        )
      })
    })

    describe('getStorage', () => {
      it('should return localStorage for browser platform', () => {
        process.env.TEST_PLATFORM = RuntimePlatform.BROWSER
        
        const storage = RuntimePlatformDetector.getStorage()
        
        // In test environment, localStorage might not be available
        if (typeof localStorage !== 'undefined') {
          expect(storage).toBe(localStorage)
        } else {
          expect(storage).toBeNull()
        }
      })

      it('should return null for non-browser platforms', () => {
        process.env.TEST_PLATFORM = RuntimePlatform.NODE
        
        const storage = RuntimePlatformDetector.getStorage()
        
        expect(storage).toBeNull()
      })
    })

    describe('getCapabilities', () => {
      it('should return Node.js capabilities', () => {
        const capabilities = RuntimePlatformDetector.getCapabilities(RuntimePlatform.NODE)
        
        expect(capabilities.cryptoAPI).toBe('node')
        expect(capabilities.storageAPI).toBe('filesystem')
        expect(capabilities.networkAPI).toBe('node-fetch')
        expect(capabilities.secureContext).toBe(true)
        expect(capabilities.biometricSupport).toBe(false)
        expect(capabilities.backgroundProcessing).toBe(true)
      })

      it('should return browser capabilities', () => {
        const capabilities = RuntimePlatformDetector.getCapabilities(RuntimePlatform.BROWSER)
        
        expect(capabilities.cryptoAPI).toBe('webcrypto')
        expect(capabilities.storageAPI).toBe('localstorage')
        expect(capabilities.networkAPI).toBe('fetch')
        expect(capabilities.backgroundProcessing).toBe(false)
      })

      it('should return React Native capabilities', () => {
        const capabilities = RuntimePlatformDetector.getCapabilities(RuntimePlatform.REACT_NATIVE)
        
        expect(capabilities.cryptoAPI).toBe('react-native-crypto')
        expect(capabilities.storageAPI).toBe('asyncstorage')
        expect(capabilities.networkAPI).toBe('fetch')
        expect(capabilities.secureContext).toBe(true)
        expect(capabilities.biometricSupport).toBe(true)
        expect(capabilities.backgroundProcessing).toBe(true)
      })

      it('should return Electron capabilities', () => {
        const capabilities = RuntimePlatformDetector.getCapabilities(RuntimePlatform.ELECTRON)
        
        expect(capabilities.cryptoAPI).toBe('node')
        expect(capabilities.storageAPI).toBe('filesystem')
        expect(capabilities.networkAPI).toBe('fetch')
        expect(capabilities.secureContext).toBe(true)
        expect(capabilities.biometricSupport).toBe(true)
        expect(capabilities.backgroundProcessing).toBe(true)
      })

      it('should return Worker capabilities', () => {
        const capabilities = RuntimePlatformDetector.getCapabilities(RuntimePlatform.WORKER)
        
        expect(capabilities.cryptoAPI).toBe('webcrypto')
        expect(capabilities.storageAPI).toBe('localstorage')
        expect(capabilities.networkAPI).toBe('fetch')
        expect(capabilities.secureContext).toBe(false) // Will be false in test environment
        expect(capabilities.biometricSupport).toBe(false)
        expect(capabilities.backgroundProcessing).toBe(false)
      })
    })

    describe('isFeatureSupported', () => {
      it('should check if biometric is supported on React Native', () => {
        const isSupported = RuntimePlatformDetector.isFeatureSupported('biometricSupport', RuntimePlatform.REACT_NATIVE)
        expect(isSupported).toBe(true)
      })

      it('should check if biometric is not supported on Node.js', () => {
        const isSupported = RuntimePlatformDetector.isFeatureSupported('biometricSupport', RuntimePlatform.NODE)
        expect(isSupported).toBe(false)
      })

      it('should check if secure context is supported on browser', () => {
        const isSupported = RuntimePlatformDetector.isFeatureSupported('secureContext', RuntimePlatform.BROWSER)
        expect(typeof isSupported).toBe('boolean') // Should return boolean
      })
    })

    describe('getRuntimePlatformConfig', () => {
      it('should return complete platform configuration for Node.js', () => {
        const config = RuntimePlatformDetector.getRuntimePlatformConfig(RuntimePlatform.NODE)
        
        expect(config.platform).toBe(RuntimePlatform.NODE)
        expect(config.capabilities).toBeDefined()
        expect(config.isSecure).toBe(true)
        expect(config.supportsBiometrics).toBe(false)
        expect(config.supportsBackground).toBe(true)
        expect(config.storageType).toBe('filesystem')
        expect(config.cryptoProvider).toBe('node')
        expect(config.networkProvider).toBe('node-fetch')
      })

      it('should return complete platform configuration for browser', () => {
        const config = RuntimePlatformDetector.getRuntimePlatformConfig(RuntimePlatform.BROWSER)
        
        expect(config.platform).toBe(RuntimePlatform.BROWSER)
        expect(config.capabilities).toBeDefined()
        expect(config.storageType).toBe('localstorage')
        expect(config.cryptoProvider).toBe('webcrypto')
        expect(config.networkProvider).toBe('fetch')
      })
    })
  })

  describe('FeatureDetector', () => {
    describe('checkBiometricSupport', () => {
      it('should check biometric support for browser', async () => {
        process.env.TEST_PLATFORM = RuntimePlatform.BROWSER
        
        const isSupported = await FeatureDetector.checkBiometricSupport()
        expect(typeof isSupported).toBe('boolean')
      })

      it('should check biometric support for React Native', async () => {
        process.env.TEST_PLATFORM = RuntimePlatform.REACT_NATIVE
        
        const isSupported = await FeatureDetector.checkBiometricSupport()
        expect(isSupported).toBe(true) // Placeholder returns true
      })
    })

    describe('checkStorageCapacity', () => {
      it('should check storage capacity for browser', async () => {
        process.env.TEST_PLATFORM = RuntimePlatform.BROWSER
        
        const capacity = await FeatureDetector.checkStorageCapacity()
        expect(typeof capacity).toBe('number')
      })

      it('should return 0 for non-browser platforms', async () => {
        process.env.TEST_PLATFORM = RuntimePlatform.NODE
        
        const capacity = await FeatureDetector.checkStorageCapacity()
        expect(capacity).toBe(0)
      })
    })

    describe('isSecureContext', () => {
      it('should check secure context for browser', () => {
        process.env.TEST_PLATFORM = RuntimePlatform.BROWSER
        
        const isSecure = FeatureDetector.isSecureContext()
        expect(typeof isSecure).toBe('boolean')
      })

      it('should return true for Node.js', () => {
        process.env.TEST_PLATFORM = RuntimePlatform.NODE
        
        const isSecure = FeatureDetector.isSecureContext()
        expect(isSecure).toBe(true)
      })
    })

    describe('checkHardwareSecurity', () => {
      it('should check hardware security capabilities', async () => {
        const hardware = await FeatureDetector.checkHardwareSecurity()
        
        expect(hardware).toHaveProperty('tpm')
        expect(hardware).toHaveProperty('secureEnclave')
        expect(hardware).toHaveProperty('strongBox')
        expect(typeof hardware.tpm).toBe('boolean')
        expect(typeof hardware.secureEnclave).toBe('boolean')
        expect(typeof hardware.strongBox).toBe('boolean')
      })
    })
  })

  describe('Global exports', () => {
    it('should export current runtime platform', () => {
      expect(currentRuntimePlatform).toBeDefined()
      expect(Object.values(RuntimePlatform)).toContain(currentRuntimePlatform)
    })

    it('should export current capabilities', () => {
      expect(currentCapabilities).toBeDefined()
      expect(currentCapabilities).toHaveProperty('cryptoAPI')
      expect(currentCapabilities).toHaveProperty('storageAPI')
      expect(currentCapabilities).toHaveProperty('networkAPI')
    })

    it('should export platform config', () => {
      expect(platformConfig).toBeDefined()
      expect(platformConfig).toHaveProperty('platform')
      expect(platformConfig).toHaveProperty('capabilities')
    })
  })
}) 