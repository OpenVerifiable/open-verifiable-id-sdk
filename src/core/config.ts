/**
 * Core SDK Configuration and Initialization
 * Implements SDK configuration per ADR requirements
 */

import { SDKConfiguration, RuntimePlatform } from '../types';
import { RuntimePlatformDetector } from '../platforms';

/**
 * Default SDK configuration
 */
const defaultConfig: SDKConfiguration = {
  version: '1.0.0',
  environment: 'development',
  platform: RuntimePlatform.NODE,
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
};

/**
 * Global SDK configuration instance
 */
let sdkConfig: SDKConfiguration = { ...defaultConfig };

/**
 * Initialize the SDK with configuration
 */
export async function initializeSDK(config?: Partial<SDKConfiguration>): Promise<SDKConfiguration> {
  // Detect platform if not provided
  const detectedPlatform = RuntimePlatformDetector.detectRuntimePlatform();
  const platformCapabilities = RuntimePlatformDetector.getCapabilities(detectedPlatform);

  // Store original config for validation
  const originalConfig = config || {};

  // Merge provided config with defaults
  sdkConfig = {
    ...defaultConfig,
    platform: detectedPlatform,
    ...config
  };

  // Apply platform-specific configurations
  sdkConfig = applyPlatformDefaults(sdkConfig, detectedPlatform, platformCapabilities);

  // Validate configuration with original config for user-provided values
  await validateConfiguration(sdkConfig, originalConfig);

  return sdkConfig;
}

/**
 * Get current SDK configuration
 */
export function getSDKConfiguration(): SDKConfiguration {
  return { ...sdkConfig };
}

/**
 * Update SDK configuration
 */
export function updateSDKConfiguration(updates: Partial<SDKConfiguration>): SDKConfiguration {
  sdkConfig = {
    ...sdkConfig,
    ...updates
  };
  return sdkConfig;
}

/**
 * Apply platform-specific default configurations
 */
function applyPlatformDefaults(
  config: SDKConfiguration,
  platform: RuntimePlatform,
  capabilities: any
): SDKConfiguration {
  const platformDefaults: Partial<SDKConfiguration> = {};

  switch (platform) {
    case RuntimePlatform.BROWSER:
      platformDefaults.security = {
        ...config.security,
        keyStorageType: 'file', // Browser uses file-based storage (localStorage mapped to file)
        requireBiometric: capabilities.biometricSupport && config.security.requireBiometric
      };
      platformDefaults.features = {
        ...config.features,
        biometricAuth: capabilities.biometricSupport,
        carbonAwareness: false, // Disabled by default in browser
        schemaRegistry: config.features.schemaRegistry ?? true,
        offlineCache: config.features.offlineCache ?? true,
        trustRegistry: config.features.trustRegistry ?? true
      };
      break;

    case RuntimePlatform.REACT_NATIVE:
      platformDefaults.security = {
        ...config.security,
        keyStorageType: 'keychain',
        requireBiometric: capabilities.biometricSupport
      };
      platformDefaults.features = {
        ...config.features,
        biometricAuth: capabilities.biometricSupport,
        carbonAwareness: true,
        schemaRegistry: config.features.schemaRegistry ?? true,
        offlineCache: config.features.offlineCache ?? true,
        trustRegistry: config.features.trustRegistry ?? true
      };
      break;

    case RuntimePlatform.NODE:
      platformDefaults.security = {
        ...config.security,
        keyStorageType: 'file',
        encryptionLevel: 'high'
      };
      platformDefaults.features = {
        ...config.features,
        biometricAuth: false,
        carbonAwareness: true,
        schemaRegistry: config.features.schemaRegistry ?? true,
        offlineCache: config.features.offlineCache ?? true,
        trustRegistry: config.features.trustRegistry ?? true
      };
      break;

    case RuntimePlatform.ELECTRON:
      platformDefaults.security = {
        ...config.security,
        keyStorageType: 'hardware',
        requireBiometric: capabilities.biometricSupport
      };
      platformDefaults.features = {
        ...config.features,
        biometricAuth: capabilities.biometricSupport,
        carbonAwareness: true,
        schemaRegistry: config.features.schemaRegistry ?? true,
        offlineCache: config.features.offlineCache ?? true,
        trustRegistry: config.features.trustRegistry ?? true
      };
      break;

    default:
      // Use defaults
      break;
  }

  return {
    ...config,
    ...platformDefaults
  };
}

/**
 * Validate SDK configuration
 */
async function validateConfiguration(config: SDKConfiguration, originalConfig?: Partial<SDKConfiguration>): Promise<void> {
  const errors: string[] = [];

  // Validate version format
  if (!/^\d+\.\d+\.\d+/.test(config.version)) {
    errors.push('Invalid version format');
  }

  // Validate environment
  if (!['development', 'staging', 'production'].includes(config.environment)) {
    errors.push('Invalid environment');
  }

  // Validate platform capabilities
  const capabilities = RuntimePlatformDetector.getCapabilities(config.platform);
  
  // Check original config for user-provided biometric auth setting
  const userRequestedBiometric = originalConfig?.features?.biometricAuth;
  if (userRequestedBiometric && !capabilities.biometricSupport) {
    errors.push('Biometric authentication is not supported');
  }

  if (config.security.keyStorageType === 'hardware' && !capabilities.secureContext) {
    errors.push('Hardware key storage requires a secure context');
  }

  // Validate endpoints if provided
  if (config.endpoints) {
          for (const [key, endpoint] of Object.entries(config.endpoints)) {
        if (endpoint && !isValidURL(endpoint)) {
          errors.push(`Invalid ${key} endpoint URL`);
        }
      }
  }

  if (errors.length > 0) {
    throw new Error(`SDK Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Check if a string is a valid URL
 */
function isValidURL(string: string): boolean {
  try {
    const url = new URL(string);
    // Reject URLs without a protocol
    if (!url.protocol) {
      return false;
    }
    // Only allow http, https, and wss protocols
    if (!['http:', 'https:', 'wss:'].includes(url.protocol)) {
      return false;
    }
    // Reject URLs without a hostname
    if (!url.hostname) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get platform-specific configuration recommendations
 */
export function getConfigurationRecommendations(platform?: RuntimePlatform): Partial<SDKConfiguration> {
  const targetPlatform = platform || RuntimePlatformDetector.detectRuntimePlatform();
  const capabilities = RuntimePlatformDetector.getCapabilities(targetPlatform);

  const recommendations: Partial<SDKConfiguration> = {
    platform: targetPlatform,
    features: {
      trustRegistry: true,
      schemaRegistry: true,
      carbonAwareness: targetPlatform === RuntimePlatform.BROWSER ? false : true,
      biometricAuth: targetPlatform === RuntimePlatform.REACT_NATIVE ? true : capabilities.biometricSupport,
      offlineCache: true
    },
    security: {
      encryptionLevel: capabilities.secureContext ? 'high' : 'standard',
      requireBiometric: capabilities.biometricSupport,
      keyStorageType: getRecommendedKeyStorage(targetPlatform, capabilities)
    }
  };

  return recommendations;
}

/**
 * Get recommended key storage type for platform
 */
function getRecommendedKeyStorage(platform: RuntimePlatform, capabilities: any): 'file' | 'keychain' | 'hardware' {
  if (platform === RuntimePlatform.REACT_NATIVE) {
    return 'keychain';
  }
  
  if (platform === RuntimePlatform.ELECTRON) {
    return 'hardware';
  }
  
  return 'file';
}

/**
 * Create a development configuration
 */
export function createDevelopmentConfig(overrides?: Partial<SDKConfiguration>): SDKConfiguration {
  const baseConfig: SDKConfiguration = {
    ...defaultConfig,
    environment: 'development',
    features: {
      ...defaultConfig.features,
      carbonAwareness: true, // Enable for development
      biometricAuth: false,   // Disable for easier testing
      schemaRegistry: true,   // Keep default
      offlineCache: true      // Keep default
    },
    security: {
      ...defaultConfig.security,
      encryptionLevel: 'standard',
      requireBiometric: false
    }
  };

  // Merge overrides properly
  if (overrides) {
    return {
      ...baseConfig,
      ...overrides,
      features: {
        ...baseConfig.features,
        ...overrides.features
      },
      security: {
        ...baseConfig.security,
        ...overrides.security
      }
    } as SDKConfiguration;
  }

  return baseConfig;
}

/**
 * Create a production configuration
 */
export function createProductionConfig(overrides?: Partial<SDKConfiguration>): SDKConfiguration {
  const platform = RuntimePlatformDetector.detectRuntimePlatform();
  const capabilities = RuntimePlatformDetector.getCapabilities(platform);
  
  const baseConfig: SDKConfiguration = {
    ...defaultConfig,
    environment: 'production',
    platform,
    features: {
      ...defaultConfig.features,
      carbonAwareness: true,
      biometricAuth: capabilities.biometricSupport,
      offlineCache: true,      // Keep default
      schemaRegistry: true     // Keep default
    },
    security: {
      ...defaultConfig.security,
      encryptionLevel: 'high',
      requireBiometric: capabilities.biometricSupport,
      keyStorageType: getRecommendedKeyStorage(platform, capabilities)
    }
  };

  // Merge overrides properly
  if (overrides) {
    return {
      ...baseConfig,
      ...overrides,
      features: {
        ...baseConfig.features,
        ...overrides.features
      },
      security: {
        ...baseConfig.security,
        ...overrides.security
      }
    } as SDKConfiguration;
  }

  return baseConfig;
}

// Export the configuration interface and utilities
export type { SDKConfiguration } from '../types'; 