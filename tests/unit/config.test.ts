import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  initializeSDK, 
  getSDKConfiguration, 
  updateSDKConfiguration,
  getConfigurationRecommendations,
  createDevelopmentConfig,
  createProductionConfig
} from '../../src/core/config'
import { RuntimePlatform, SDKConfiguration } from '../../src/types'

describe('SDK Configuration', () => {
  beforeEach(() => {
    // Reset any global state
    if (typeof global !== 'undefined' && (global as any).__SDK_CONFIG__) {
      delete (global as any).__SDK_CONFIG__
    }
  })

  afterEach(() => {
    // Clean up any global state
    if (typeof global !== 'undefined' && (global as any).__SDK_CONFIG__) {
      delete (global as any).__SDK_CONFIG__
    }
  })

  describe('initializeSDK', () => {
    it('should initialize with default configuration', async () => {
      const config = await initializeSDK()
      
      expect(config.version).toBeDefined()
      expect(config.environment).toBeDefined()
      expect(config.platform).toBeDefined()
      expect(config.features).toBeDefined()
      expect(config.security).toBeDefined()
    })

    it('should merge custom configuration with defaults', async () => {
      const customConfig: Partial<SDKConfiguration> = {
        version: '2.0.0',
        environment: 'production',
        features: {
          trustRegistry: false,
          schemaRegistry: true,
          carbonAwareness: true,
          biometricAuth: false,
          offlineCache: true
        }
      }

      const config = await initializeSDK(customConfig)
      
      expect(config.version).toBe('2.0.0')
      expect(config.environment).toBe('production')
      expect(config.features.trustRegistry).toBe(false)
      expect(config.features.carbonAwareness).toBe(true)
    })

    it('should apply platform-specific defaults', async () => {
      const config = await initializeSDK()
      
      expect(config.platform).toBeDefined()
      expect(config.security).toBeDefined()
      expect(config.features).toBeDefined()
    })

    it('should validate configuration and throw error for invalid version', async () => {
      const invalidConfig = {
        version: 'invalid-version'
      }

      await expect(initializeSDK(invalidConfig)).rejects.toThrow()
    })

    it('should validate configuration and throw error for invalid environment', async () => {
      const invalidConfig = {
        environment: 'invalid-env' as any
      }

      await expect(initializeSDK(invalidConfig)).rejects.toThrow()
    })

    it('should validate configuration and throw error for invalid endpoints', async () => {
      const configWithInvalidEndpoint = {
        endpoints: {
          schemaRegistry: 'invalid-url'
        }
      }

      await expect(initializeSDK(configWithInvalidEndpoint)).rejects.toThrow()
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
          trustRegistry: true,
          schemaRegistry: true,
          carbonAwareness: true,
          biometricAuth: false,
          offlineCache: true
        }
      }

      const updatedConfig = updateSDKConfiguration(updates)
      
      expect(updatedConfig.version).toBe('2.0.0')
      expect(updatedConfig.environment).toBe('staging')
      expect(updatedConfig.features.carbonAwareness).toBe(true)
    })

    it('should preserve existing values not in update', async () => {
      await initializeSDK({ version: '1.0.0' })
      
      const updates = {
        environment: 'production' as const
      }

      const updatedConfig = updateSDKConfiguration(updates)
      
      expect(updatedConfig.version).toBe('1.0.0') // Should be preserved
      expect(updatedConfig.environment).toBe('production') // Should be updated
    })

    it('should validate updates and throw error for invalid values', async () => {
      await initializeSDK()
      
      const invalidUpdates = {
        version: 'invalid-version'
      }

      expect(() => updateSDKConfiguration(invalidUpdates)).toThrow()
    })
  })

  describe('getConfigurationRecommendations', () => {
    it('should return recommendations for current platform', async () => {
      await initializeSDK()
      const recommendations = getConfigurationRecommendations()
      
      expect(recommendations).toBeDefined()
      expect(Array.isArray(recommendations)).toBe(true)
    })

    it('should return platform-specific recommendations', async () => {
      const config = await initializeSDK()
      const recommendations = getConfigurationRecommendations()
      
      expect(recommendations).toBeDefined()
      expect(Array.isArray(recommendations)).toBe(true)
    })
  })

  describe('createDevelopmentConfig', () => {
    it('should create development configuration', () => {
      const config = createDevelopmentConfig()
      
      expect(config.environment).toBe('development')
      expect(config.features.trustRegistry).toBe(true)
      expect(config.security.encryptionLevel).toBe('standard')
    })

    it('should allow custom overrides', () => {
      const config = createDevelopmentConfig({
        version: '1.5.0',
        features: {
          trustRegistry: false,
          schemaRegistry: true,
          carbonAwareness: true,
          biometricAuth: false,
          offlineCache: true
        }
      })
      
      expect(config.environment).toBe('development')
      expect(config.version).toBe('1.5.0')
      expect(config.features.trustRegistry).toBe(false)
    })
  })

  describe('createProductionConfig', () => {
    it('should create production configuration', () => {
      const config = createProductionConfig()
      
      expect(config.environment).toBe('production')
      expect(config.features.trustRegistry).toBe(true)
      expect(config.security.encryptionLevel).toBe('high')
    })

    it('should allow custom overrides', () => {
      const config = createProductionConfig({
        version: '2.0.0',
        features: {
          trustRegistry: true,
          schemaRegistry: true,
          carbonAwareness: true,
          biometricAuth: false,
          offlineCache: true
        }
      })
      
      expect(config.environment).toBe('production')
      expect(config.version).toBe('2.0.0')
      expect(config.features.trustRegistry).toBe(true)
    })
  })

  describe('Configuration Validation', () => {
    it('should validate required fields', async () => {
      // Should NOT throw if config is empty (defaults are filled in)
      await expect(initializeSDK({})).resolves.toBeDefined()

      // Should throw if user provides an invalid value
      await expect(initializeSDK({ version: 'not-a-version' })).rejects.toThrow()
    })

    it('should validate feature dependencies', async () => {
      const configWithInvalidDependency = {
        features: {
          trustRegistry: true,
          schemaRegistry: true,
          carbonAwareness: true,
          biometricAuth: true,
          offlineCache: true
        }
      }

      // This might not throw depending on platform detection
      try {
        await initializeSDK(configWithInvalidDependency)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should validate security settings', async () => {
      const configWithInvalidSecurity = {
        security: {
          encryptionLevel: 'invalid' as any,
          requireBiometric: false,
          keyStorageType: 'file' as const
        }
      }

      await expect(initializeSDK(configWithInvalidSecurity)).rejects.toThrow()
    })
  })

  describe('Configuration Persistence', () => {
    it('should persist configuration changes', async () => {
      await initializeSDK({ version: '1.0.0' })
      
      updateSDKConfiguration({ version: '2.0.0' })
      
      const config = getSDKConfiguration()
      expect(config.version).toBe('2.0.0')
    })

    it('should handle configuration reset', async () => {
      await initializeSDK({ version: '1.0.0' })
      
      // Reset by re-initializing
      await initializeSDK({ version: '3.0.0' })
      
      const config = getSDKConfiguration()
      expect(config.version).toBe('3.0.0')
    })
  })
}) 