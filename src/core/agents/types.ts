/**
 * Agent Configuration Types
 * 
 * Implements the agent configuration schema and interfaces for agent management
 * Based on ADR-0007: Agent Architecture and Extensibility
 * Extended with ADR-0046: Monetized Plugin Installation Architecture
 */

// Removed import of AgentType to avoid conflict; using local export below

export enum AgentType {
  USER = 'user',
  PACKAGE = 'package',
  PARENT = 'parent',
  SERVICE = 'service',
}

/**
 * Plugin monetization configuration
 */
export interface PluginMonetizationConfig {
  /** Whether the plugin requires a license */
  requiresLicense: boolean;
  /** Type of license required */
  licenseType: 'free' | 'paid' | 'subscription';
  /** Price information for paid plugins */
  price?: {
    amount: number;
    currency: string;
    description?: string;
  };
  /** DID-Linked Resource for status list management */
  statusListDID?: string;
  /** Index in the status list for this license */
  statusListIndex?: number;
  /** License validity period in days */
  validityPeriod?: number;
}

/**
 * Plugin license verification configuration
 */
export interface PluginLicenseVerification {
  /** Cached license credential for offline execution */
  cachedLicense?: CachedPluginLicense;
  /** Last verification timestamp */
  lastVerified?: string;
  /** Whether verification is required for execution */
  verificationRequired: boolean;
  /** Verification interval in hours */
  verificationInterval?: number;
}

/**
 * Cached plugin license for offline execution
 */
export interface CachedPluginLicense {
  /** License credential ID */
  credentialId: string;
  /** Issuer DID */
  issuerDID: string;
  /** License type */
  licenseType: string;
  /** Expiration date */
  expiresAt: string;
  /** Cached verification proof */
  verificationProof: string;
  /** Cache timestamp */
  cachedAt: string;
  /** Usage count since last verification */
  usageCount: number;
  /** Maximum offline usage before verification required */
  maxOfflineUsage: number;
}

// Per-plugin security configuration
export interface PluginSecurityConfig {
  /** Whether the plugin should run in a sandboxed environment */
  sandboxed?: boolean;
  /** List of permissions granted to the plugin */
  permissions?: string[];
}

// Per-plugin lifecycle configuration
export interface PluginLifecycleConfig {
  /** Whether the plugin should be auto-enabled on agent startup */
  autoEnable?: boolean;
  /** Whether the plugin should be lazy-loaded */
  lazyLoad?: boolean;
}

/**
 * Plugin configuration for agent plugins
 * Extended with monetization support
 */
export interface AgentPluginConfig {
  /** Plugin name identifier */
  name: string;
  /** Plugin version in semver format */
  version: string;
  /** Plugin type category */
  type: 'did-method' | 'credential-type' | 'crypto-suite' | 'utility';
  /** Plugin-specific configuration object */
  config?: Record<string, any>;
  /** Whether the plugin is enabled */
  enabled?: boolean;
  
  // Monetization fields (ADR-0046)
  /** Monetization configuration */
  monetization?: PluginMonetizationConfig;
  /** License verification configuration */
  licenseVerification?: PluginLicenseVerification;

  // New: Per-plugin security and lifecycle
  /** Security configuration for this plugin */
  security?: PluginSecurityConfig;
  /** Lifecycle configuration for this plugin */
  lifecycle?: PluginLifecycleConfig;
}

/**
 * Security configuration for agent
 */
export interface AgentSecurityConfig {
  /** Encryption level for agent data */
  encryptionLevel?: 'standard' | 'high';
  /** Whether biometric authentication is required */
  requireBiometric?: boolean;
  /** Type of key storage to use */
  keyStorageType?: 'file' | 'keychain' | 'hardware';
  /** Whether plugins run in sandboxed mode */
  sandboxMode?: boolean;
}

/**
 * Feature configuration for agent
 */
export interface AgentFeaturesConfig {
  /** Enable trust registry functionality */
  trustRegistry?: boolean;
  /** Enable schema registry integration */
  schemaRegistry?: boolean;
  /** Enable carbon impact tracking */
  carbonAwareness?: boolean;
  /** Enable biometric authentication */
  biometricAuth?: boolean;
  /** Enable offline credential caching */
  offlineCache?: boolean;
}

/**
 * Endpoint configuration for external services
 */
export interface AgentEndpointsConfig {
  /** Schema registry endpoint URL */
  schemaRegistry?: string;
  /** Trust registry endpoint URL */
  trustRegistry?: string;
  /** Carbon impact service endpoint */
  carbonService?: string;
}

/**
 * Complete agent configuration object
 * Implements the agent configuration schema
 */
export interface AgentConfiguration {
  /** Unique identifier for the agent instance */
  agentId: string;
  /** Type of agent as defined in ADR-0007 */
  agentType: AgentType;
  /** List of plugins to register with the agent */
  plugins?: AgentPluginConfig[];
  /** Security configuration */
  security?: AgentSecurityConfig;
  /** Feature configuration */
  features?: AgentFeaturesConfig;
  /** Endpoint configuration */
  endpoints?: AgentEndpointsConfig;
}

/**
 * Agent configuration validation result
 */
export interface AgentConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Agent configuration manager options
 */
export interface AgentConfigurationManagerOptions {
  /** Default configuration to use when creating new agents */
  defaultConfig?: Partial<AgentConfiguration>;
  /** Whether to validate configurations on creation */
  validateOnCreate?: boolean;
  /** Whether to auto-save configurations */
  autoSave?: boolean;
  /** Storage backend for configurations */
  storage?: 'file' | 'memory' | 'database';
}

/**
 * Agent configuration template
 */
export interface AgentConfigurationTemplate {
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template configuration */
  config: Partial<AgentConfiguration>;
  /** Template tags for categorization */
  tags?: string[];
  /** Whether this is a built-in template */
  builtIn?: boolean;
}

/**
 * Agent configuration import/export format
 */
export interface AgentConfigurationExport {
  /** Export version */
  version: string;
  /** Export timestamp */
  timestamp: string;
  /** Agent configurations */
  configurations: AgentConfiguration[];
  /** Metadata about the export */
  metadata?: {
    source?: string;
    description?: string;
    tags?: string[];
  };
}

/**
 * Agent configuration migration result
 */
export interface AgentConfigurationMigrationResult {
  /** Number of configurations migrated */
  migrated: number;
  /** Number of configurations that failed migration */
  failed: number;
  /** Migration errors */
  errors: string[];
  /** Migration warnings */
  warnings: string[];
} 