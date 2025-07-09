import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  RuntimePlatformDetector, 
  FeatureDetector,
  currentRuntimePlatform,
  currentCapabilities,
  platformConfig
} from '../../src/platforms'
import { RuntimePlatform } from '../../src/types'

// Mock global objects
const mockGlobal = {
  navigator: {
    product: 'ReactNative',
    userAgent: 'React Native',
    platform: 'android'
  },
  window: undefined,
  document: undefined
} as any

const mockWindow = {
  crypto: {
    subtle: {
      digest: () => {},
      encrypt: () => {},
      decrypt: () => {},
      sign: () => {},
      verify: () => {},
      generateKey: () => {},
      deriveKey: () => {},
      importKey: () => {},
      exportKey: () => {},
      wrapKey: () => {},
      unwrapKey: () => {}
    },
    getRandomValues: () => {}
  },
  navigator: {
    userAgent: 'Mozilla/5.0',
    credentials: {
      create: () => {},
      get: () => {}
    }
  }
} as any

const mockDocument = {
  createElement: () => {},
  body: {},
  documentElement: {}
} as any

const mockProcess = {
  versions: {
    node: '18.0.0'
  },
  env: {},
  platform: 'win32',
  arch: 'x64'
} as any

describe('Platform Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Use vi.stubGlobal to safely mock global properties
    vi.stubGlobal('process', undefined)
    vi.stubGlobal('window', undefined) 
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('navigator', undefined)
    vi.stubGlobal('crypto', undefined)
    vi.stubGlobal('localStorage', undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
    // Restore all global stubs
    vi.unstubAllGlobals()
  })

  describe('RuntimePlatformDetector', () => {
    describe('detectRuntimePlatform', () => {
      it('should detect Node.js platform', () => {
        vi.stubGlobal('process', mockProcess)
        
        const platform = RuntimePlatformDetector.detectRuntimePlatform()
        
        expect(platform).toBe(RuntimePlatform.NODE)
      })

      it('should detect React Native platform', () => {
        vi.stubGlobal('global', mockGlobal)
        
        const platform = RuntimePlatformDetector.detectRuntimePlatform()
        
        expect(platform).toBe(RuntimePlatform.REACT_NATIVE)
      })

      it('should detect browser platform', () => {
        vi.stubGlobal('window', mockWindow)
        vi.stubGlobal('document', mockDocument)
        
        const platform = RuntimePlatformDetector.detectRuntimePlatform()
        
        expect(platform).toBe(RuntimePlatform.BROWSER)
      })

      it('should default to Node.js when no platform is detected', () => {
        const platform = RuntimePlatformDetector.detectRuntimePlatform()
        
        expect(platform).toBe(RuntimePlatform.NODE)
      })
    })

    describe('platform checks', () => {
      it('should correctly identify Node.js', () => {
        vi.stubGlobal('process', mockProcess)
        
        expect(RuntimePlatformDetector.isNodeJS()).toBe(true)
        expect(RuntimePlatformDetector.isBrowser()).toBe(false)
        expect(RuntimePlatformDetector.isReactNative()).toBe(false)
      })

      it('should correctly identify browser', () => {
        vi.stubGlobal('window', mockWindow)
        vi.stubGlobal('document', mockDocument)
        
        expect(RuntimePlatformDetector.isNodeJS()).toBe(false)
        expect(RuntimePlatformDetector.isBrowser()).toBe(true)
        expect(RuntimePlatformDetector.isReactNative()).toBe(false)
      })

      it('should correctly identify React Native', () => {
        vi.stubGlobal('global', mockGlobal)
        
        expect(RuntimePlatformDetector.isNodeJS()).toBe(false)
        expect(RuntimePlatformDetector.isBrowser()).toBe(false)
        expect(RuntimePlatformDetector.isReactNative()).toBe(true)
      })
    })

    describe('getCrypto', () => {
      it('should return Node.js crypto for Node.js platform', () => {
        vi.stubGlobal('process', mockProcess)
        const mockNodeCrypto = { webcrypto: { subtle: {} } }
        vi.doMock('crypto', () => mockNodeCrypto)
        
        const crypto = RuntimePlatformDetector.getCrypto()
        
        expect(crypto).toBeDefined()
      })

      it('should return browser crypto for browser platform', () => {
        vi.stubGlobal('window', mockWindow)
        vi.stubGlobal('document', mockDocument)
        
        const crypto = RuntimePlatformDetector.getCrypto()
        
        expect(crypto).toBe(window.crypto)
      })

      it('should throw error for unsupported platform', () => {
        // No platform set up
        
        expect(() => RuntimePlatformDetector.getCrypto()).toThrow(
          'Crypto not available in current environment'
        )
      })
    })

    describe('getStorage', () => {
      it('should return localStorage for browser platform', () => {
        vi.stubGlobal('window', mockWindow)
        vi.stubGlobal('document', mockDocument)
        vi.stubGlobal('localStorage', {} as any)
        
        const storage = RuntimePlatformDetector.getStorage()
        
        expect(storage).toBe(localStorage)
      })

      it('should return null for non-browser platforms', () => {
        vi.stubGlobal('process', mockProcess)
        
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
        expect(isSupported).toBe(false) // Will be false in test environment
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
        vi.stubGlobal('window', mockWindow)
        vi.stubGlobal('document', mockDocument)
        
        const isSupported = await FeatureDetector.checkBiometricSupport()
        expect(typeof isSupported).toBe('boolean')
      })

      it('should check biometric support for React Native', async () => {
        vi.stubGlobal('global', mockGlobal)
        
        const isSupported = await FeatureDetector.checkBiometricSupport()
        expect(isSupported).toBe(true) // Placeholder returns true
      })
    })

    describe('checkStorageCapacity', () => {
      it('should check storage capacity for browser', async () => {
        vi.stubGlobal('window', mockWindow)
        vi.stubGlobal('document', mockDocument)
        
        const capacity = await FeatureDetector.checkStorageCapacity()
        expect(typeof capacity).toBe('number')
      })

      it('should return 0 for non-browser platforms', async () => {
        vi.stubGlobal('process', mockProcess)
        
        const capacity = await FeatureDetector.checkStorageCapacity()
        expect(capacity).toBe(0)
      })
    })

    describe('isSecureContext', () => {
      it('should check secure context for browser', () => {
        vi.stubGlobal('window', mockWindow)
        vi.stubGlobal('document', mockDocument)
        
        const isSecure = FeatureDetector.isSecureContext()
        expect(typeof isSecure).toBe('boolean')
      })

      it('should return true for Node.js', () => {
        vi.stubGlobal('process', mockProcess)
        
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