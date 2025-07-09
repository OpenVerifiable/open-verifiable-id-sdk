import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  initializeSDK, 
  getSDKConfiguration, 
  updateSDKConfiguration,
  getConfigurationRecommendations,
  createDevelopmentConfig,
  createProductionConfig
} from '../../src/core/config'
import { RuntimePlatform, SDKConfiguration } from '../../src/types'

// Mock the platforms module
vi.mock('../../src/platforms', () => ({
  RuntimePlatformDetector: {
    detectRuntimePlatform: vi.fn(() => RuntimePlatform.NODE),
    getCapabilities: vi.fn(() => ({
      cryptoAPI: 'node',
      storageAPI: 'filesystem',
      networkAPI: 'fetch',
      secureContext: true,
      biometricSupport: false,
      backgroundProcessing: true
    }))
  }
}))

describe('SDK Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initializeSDK', () => {
    it('should initialize with default configuration', async () => {
      const config = await initializeSDK()
      
      expect(config.version).toBe('1.0.0')
      expect(config.environment).toBe('development')
      expect(config.platform).toBe(RuntimePlatform.NODE)
      expect(config.features.trustRegistry).toBe(true)
      expect(config.features.schemaRegistry).toBe(true)
      expect(config.features.carbonAwareness).toBe(true) // Node defaults to true
      expect(config.security.encryptionLevel).toBe('high') // Node defaults to high
    })

    it('should merge custom configuration with defaults', async () => {
      const customConfig: Partial<SDKConfiguration> = {
        version: '2.0.0',
        environment: 'production',
        features: {
          trustRegistry: false,
          carbonAwareness: true
        }
      }

      const config = await initializeSDK(customConfig)
      
      expect(config.version).toBe('2.0.0')
      expect(config.environment).toBe('production')
      expect(config.features.trustRegistry).toBe(false)
      expect(config.features.carbonAwareness).toBe(true)
      expect(config.features.schemaRegistry).toBe(true) // Should keep default
    })

    it('should apply platform-specific defaults for browser', async () => {
      const { RuntimePlatformDetector } = await import('../../src/platforms')
      vi.mocked(RuntimePlatformDetector.detectRuntimePlatform).mockReturnValue(RuntimePlatform.BROWSER)
      vi.mocked(RuntimePlatformDetector.getCapabilities).mockReturnValue({
        cryptoAPI: 'webcrypto',
        storageAPI: 'localstorage',
        networkAPI: 'fetch',
        secureContext: true,
        biometricSupport: true,
        backgroundProcessing: false
      })

      const config = await initializeSDK()
      
      expect(config.platform).toBe(RuntimePlatform.BROWSER)
      expect(config.security.keyStorageType).toBe('file')
      expect(config.features.carbonAwareness).toBe(false) // Browser defaults to false
    })

    it('should apply platform-specific defaults for React Native', async () => {
      const { RuntimePlatformDetector } = await import('../../src/platforms')
      vi.mocked(RuntimePlatformDetector.detectRuntimePlatform).mockReturnValue(RuntimePlatform.REACT_NATIVE)
      vi.mocked(RuntimePlatformDetector.getCapabilities).mockReturnValue({
        cryptoAPI: 'react-native-crypto',
        storageAPI: 'asyncstorage',
        networkAPI: 'fetch',
        secureContext: true,
        biometricSupport: true,
        backgroundProcessing: true
      })

      const config = await initializeSDK()
      
      expect(config.platform).toBe(RuntimePlatform.REACT_NATIVE)
      expect(config.security.keyStorageType).toBe('keychain')
      expect(config.features.biometricAuth).toBe(true)
      expect(config.features.carbonAwareness).toBe(true)
    })

    it('should validate configuration and throw error for invalid version', async () => {
      const invalidConfig = {
        version: 'invalid-version'
      }

      await expect(initializeSDK(invalidConfig)).rejects.toThrow('Invalid version format')
    })

    it('should validate configuration and throw error for invalid environment', async () => {
      const invalidConfig = {
        environment: 'invalid-env' as any
      }

      await expect(initializeSDK(invalidConfig)).rejects.toThrow('Invalid environment')
    })

    it('should validate configuration and throw error for unsupported biometric auth', async () => {
      const { RuntimePlatformDetector } = await import('../../src/platforms')
      vi.mocked(RuntimePlatformDetector.getCapabilities).mockReturnValue({
        cryptoAPI: 'node',
        storageAPI: 'filesystem',
        networkAPI: 'fetch',
        secureContext: true,
        biometricSupport: false,
        backgroundProcessing: true
      })

      const configWithBiometric = {
        features: {
          biometricAuth: true
        }
      }

      await expect(initializeSDK(configWithBiometric)).rejects.toThrow('Biometric authentication is not supported')
    })

    it('should validate configuration and throw error for invalid endpoints', async () => {
      const configWithInvalidEndpoint = {
        endpoints: {
          schemaRegistry: 'invalid-url'
        }
      }

      await expect(initializeSDK(configWithInvalidEndpoint)).rejects.toThrow('Invalid schemaRegistry endpoint URL')
    })

    it('should accept valid endpoints', async () => {
      const configWithValidEndpoints = {
        endpoints: {
          schemaRegistry: 'https://schema.example.com',
          trustRegistry: 'https://trust.example.com'
        }
      }

      const config = await initializeSDK(configWithValidEndpoints)
      expect(config.endpoints?.schemaRegistry).toBe('https://schema.example.com')
      expect(config.endpoints?.trustRegistry).toBe('https://trust.example.com')
    })
  })

  describe('getSDKConfiguration', () => {
    it('should return current configuration', async () => {
      await initializeSDK({ version: '1.5.0' })
      const config = getSDKConfiguration()
      
      expect(config.version).toBe('1.5.0')
      expect(config).toHaveProperty('platform')
      expect(config).toHaveProperty('features')
      expect(config).toHaveProperty('security')
    })

    it('should return a copy of configuration', async () => {
      await initializeSDK()
      const config1 = getSDKConfiguration()
      const config2 = getSDKConfiguration()
      
      expect(config1).not.toBe(config2) // Should be different objects
      expect(config1).toEqual(config2) // But same content
    })
  })

  describe('updateSDKConfiguration', () => {
    it('should update configuration with new values', async () => {
      await initializeSDK()
      
      const updates = {
        version: '2.0.0',
        environment: 'staging' as const,
        features: {
          carbonAwareness: true
        }
      }

      const updatedConfig = updateSDKConfiguration(updates)
      
      expect(updatedConfig.version).toBe('2.0.0')
      expect(updatedConfig.environment).toBe('staging')
      expect(updatedConfig.features.carbonAwareness).toBe(true)
    })

    it('should preserve existing values not being updated', async () => {
      await initializeSDK({ version: '1.0.0' })
      
      const updates = {
        environment: 'production' as const
      }

      const updatedConfig = updateSDKConfiguration(updates)
      
      expect(updatedConfig.version).toBe('1.0.0') // Should be preserved
      expect(updatedConfig.environment).toBe('production') // Should be updated
    })
  })

  describe('getConfigurationRecommendations', () => {
    it('should return recommendations for Node platform', () => {
      const recommendations = getConfigurationRecommendations(RuntimePlatform.NODE)
      
      expect(recommendations.security?.keyStorageType).toBe('file')
      expect(recommendations.security?.encryptionLevel).toBe('high')
      expect(recommendations.features?.carbonAwareness).toBe(true)
    })

    it('should return recommendations for Browser platform', () => {
      const recommendations = getConfigurationRecommendations(RuntimePlatform.BROWSER)
      
      expect(recommendations.security?.keyStorageType).toBe('file')
      expect(recommendations.features?.carbonAwareness).toBe(false)
    })

    it('should return recommendations for React Native platform', () => {
      const recommendations = getConfigurationRecommendations(RuntimePlatform.REACT_NATIVE)
      
      expect(recommendations.security?.keyStorageType).toBe('keychain')
      expect(recommendations.features?.biometricAuth).toBe(true)
    })

    it('should return recommendations for Electron platform', () => {
      const recommendations = getConfigurationRecommendations(RuntimePlatform.ELECTRON)
      
      expect(recommendations.security?.keyStorageType).toBe('hardware')
    })
  })

  describe('createDevelopmentConfig', () => {
    it('should create development configuration', () => {
      const config = createDevelopmentConfig()
      
      expect(config.environment).toBe('development')
      expect(config.features.carbonAwareness).toBe(true)
      expect(config.security.encryptionLevel).toBe('standard')
    })

    it('should merge overrides with development defaults', () => {
      const overrides = {
        version: '2.0.0',
        features: {
          trustRegistry: false
        }
      }

      const config = createDevelopmentConfig(overrides)
      
      expect(config.environment).toBe('development')
      expect(config.version).toBe('2.0.0')
      expect(config.features.trustRegistry).toBe(false)
      expect(config.features.schemaRegistry).toBe(true) // Should keep default
    })
  })

  describe('createProductionConfig', () => {
    it('should create production configuration', () => {
      const config = createProductionConfig()
      
      expect(config.environment).toBe('production')
      expect(config.security.encryptionLevel).toBe('high')
      expect(config.features.offlineCache).toBe(true)
    })

    it('should merge overrides with production defaults', () => {
      const overrides = {
        version: '2.0.0',
        security: {
          requireBiometric: true
        }
      }

      const config = createProductionConfig(overrides)
      
      expect(config.environment).toBe('production')
      expect(config.version).toBe('2.0.0')
      expect(config.security.requireBiometric).toBe(true)
      expect(config.security.encryptionLevel).toBe('high') // Should keep default
    })
  })

  describe('URL validation', () => {
    it('should validate correct URLs', async () => {
      const validURLs = [
        'https://example.com',
        'http://localhost:3000',
        'https://api.example.com/v1',
        'wss://websocket.example.com'
      ]

      for (const url of validURLs) {
        const config = {
          endpoints: {
            test: url
          }
        }
        
        await expect(initializeSDK(config)).resolves.toBeDefined()
      }
    })

    it('should reject invalid URLs', async () => {
      const invalidURLs = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'http://',
        'https://'
      ]

      for (const url of invalidURLs) {
        const config = {
          endpoints: {
            test: url
          }
        }
        
        await expect(initializeSDK(config)).rejects.toThrow('Invalid test endpoint URL')
      }
    })
  })
}) 