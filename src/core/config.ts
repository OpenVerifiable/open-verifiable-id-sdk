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

  // Validate user-provided configuration first
  await validateUserConfiguration(originalConfig, detectedPlatform, platformCapabilities);

  // Merge provided config with defaults
  sdkConfig = {
    ...defaultConfig,
    platform: detectedPlatform,
    ...config
  };

  // Apply platform-specific configurations
  sdkConfig = applyPlatformDefaults(sdkConfig, detectedPlatform, platformCapabilities);

  // Final validation of complete configuration
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
  // Validate updates before applying them
  validateConfigurationUpdates(updates);
  
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
  _capabilities: any
): SDKConfiguration {
  const platformDefaults: Partial<SDKConfiguration> = {};

  switch (platform) {
    case RuntimePlatform.BROWSER:
      platformDefaults.security = {
        ...config.security,
        keyStorageType: 'file', // Browser uses file-based storage (localStorage mapped to file)
        requireBiometric: _capabilities.biometricSupport && config.security.requireBiometric
      };
      platformDefaults.features = {
        ...config.features,
        biometricAuth: _capabilities.biometricSupport,
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
        requireBiometric: _capabilities.biometricSupport
      };
      platformDefaults.features = {
        ...config.features,
        biometricAuth: _capabilities.biometricSupport,
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
        requireBiometric: _capabilities.biometricSupport
      };
      platformDefaults.features = {
        ...config.features,
        biometricAuth: _capabilities.biometricSupport,
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
 * Validate user-provided configuration
 */
async function validateUserConfiguration(
  userConfig: Partial<SDKConfiguration>, 
  platform: RuntimePlatform, 
  capabilities: any
): Promise<void> {
  const errors: string[] = [];

  // Validate version format if provided
  if (userConfig.version && !/^\d+\.\d+\.\d+/.test(userConfig.version)) {
    errors.push('Invalid version format');
  }

  // Validate environment if provided
  if (userConfig.environment && !['development', 'staging', 'production'].includes(userConfig.environment)) {
    errors.push('Invalid environment');
  }

  // Validate security settings if provided
  if (userConfig.security) {
    if (userConfig.security.encryptionLevel && !['standard', 'high'].includes(userConfig.security.encryptionLevel)) {
      errors.push('Invalid encryption level');
    }
    if (userConfig.security.keyStorageType && !['file', 'keychain', 'hardware'].includes(userConfig.security.keyStorageType)) {
      errors.push('Invalid key storage type');
    }
  }

  // Validate platform capabilities for user-provided settings
  if (userConfig.features?.biometricAuth && !capabilities.biometricSupport) {
    errors.push('Biometric authentication is not supported on this platform');
  }

  if (userConfig.security?.keyStorageType === 'hardware' && !capabilities.secureContext) {
    errors.push('Hardware key storage requires a secure context');
  }

  // Validate endpoints if provided
  if (userConfig.endpoints) {
    for (const [key, endpoint] of Object.entries(userConfig.endpoints)) {
      if (endpoint && !isValidURL(endpoint)) {
        errors.push(`Invalid ${key} endpoint URL`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Validate configuration updates
 */
function validateConfigurationUpdates(updates: Partial<SDKConfiguration>): void {
  const errors: string[] = [];

  // Validate version format if provided
  if (updates.version && !/^\d+\.\d+\.\d+/.test(updates.version)) {
    errors.push('Invalid version format');
  }

  // Validate environment if provided
  if (updates.environment && !['development', 'staging', 'production'].includes(updates.environment)) {
    errors.push('Invalid environment');
  }

  // Validate security settings if provided
  if (updates.security) {
    if (updates.security.encryptionLevel && !['standard', 'high'].includes(updates.security.encryptionLevel)) {
      errors.push('Invalid encryption level');
    }
    if (updates.security.keyStorageType && !['file', 'keychain', 'hardware'].includes(updates.security.keyStorageType)) {
      errors.push('Invalid key storage type');
    }
  }

  // Validate endpoints if provided
  if (updates.endpoints) {
    for (const [key, endpoint] of Object.entries(updates.endpoints)) {
      if (endpoint && !isValidURL(endpoint)) {
        errors.push(`Invalid ${key} endpoint URL`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Validate SDK configuration
 */
async function validateConfiguration(config: SDKConfiguration, originalConfig?: Partial<SDKConfiguration>): Promise<void> {
  const errors: string[] = [];

  // Validate required fields
  if (!config.version) {
    errors.push('Version is required');
  } else if (!/^\d+\.\d+\.\d+/.test(config.version)) {
    errors.push('Invalid version format');
  }

  if (!config.environment) {
    errors.push('Environment is required');
  } else if (!['development', 'staging', 'production'].includes(config.environment)) {
    errors.push('Invalid environment');
  }

  if (!config.platform) {
    errors.push('Platform is required');
  }

  if (!config.features) {
    errors.push('Features configuration is required');
  }

  if (!config.security) {
    errors.push('Security configuration is required');
  }

  // Validate security settings
  if (config.security) {
    if (config.security.encryptionLevel && !['standard', 'high'].includes(config.security.encryptionLevel)) {
      errors.push('Invalid encryption level');
    }
    if (config.security.keyStorageType && !['file', 'keychain', 'hardware'].includes(config.security.keyStorageType)) {
      errors.push('Invalid key storage type');
    }
  }

  // Validate platform capabilities
  const _capabilities = RuntimePlatformDetector.getCapabilities(config.platform);
  
  // Check original config for user-provided biometric auth setting
  const userRequestedBiometric = originalConfig?.features?.biometricAuth;
  if (userRequestedBiometric && !_capabilities.biometricSupport) {
    errors.push('Biometric authentication is not supported');
  }

  if (config.security.keyStorageType === 'hardware' && !_capabilities.secureContext) {
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
export function getConfigurationRecommendations(platform?: RuntimePlatform): Array<{category: string, recommendation: string, priority: 'low' | 'medium' | 'high'}> {
  const targetPlatform = platform || RuntimePlatformDetector.detectRuntimePlatform();
  const _capabilities = RuntimePlatformDetector.getCapabilities(targetPlatform);
  const recommendations: Array<{category: string, recommendation: string, priority: 'low' | 'medium' | 'high'}> = [];

  // Platform-specific recommendations
  if (targetPlatform === RuntimePlatform.BROWSER) {
    recommendations.push({
      category: 'Security',
      recommendation: 'Use file-based key storage for browser compatibility',
      priority: 'high'
    });
    recommendations.push({
      category: 'Features',
      recommendation: 'Disable carbon awareness for better browser performance',
      priority: 'medium'
    });
  }

  if (targetPlatform === RuntimePlatform.REACT_NATIVE) {
    recommendations.push({
      category: 'Security',
      recommendation: 'Enable biometric authentication for enhanced security',
      priority: 'high'
    });
    recommendations.push({
      category: 'Storage',
      recommendation: 'Use keychain storage for secure key management',
      priority: 'high'
    });
  }

  if (targetPlatform === RuntimePlatform.NODE) {
    recommendations.push({
      category: 'Security',
      recommendation: 'Use high encryption level for server environments',
      priority: 'high'
    });
    recommendations.push({
      category: 'Features',
      recommendation: 'Enable carbon awareness for environmental monitoring',
      priority: 'medium'
    });
  }

  // Capability-based recommendations
  if (_capabilities.biometricSupport) {
    recommendations.push({
      category: 'Security',
      recommendation: 'Consider enabling biometric authentication',
      priority: 'medium'
    });
  }

  if (_capabilities.secureContext) {
    recommendations.push({
      category: 'Security',
      recommendation: 'Use hardware-backed key storage when available',
      priority: 'high'
    });
  }

  return recommendations;
}

/**
 * Get recommended key storage type for platform
 */
function getRecommendedKeyStorage(platform: RuntimePlatform, _capabilities: any): 'file' | 'keychain' | 'hardware' {
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