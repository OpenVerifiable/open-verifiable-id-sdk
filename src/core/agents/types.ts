/**
 * Agent Configuration Types
 * 
 * Implements the agent configuration schema and interfaces for agent management
 * Based on ADR-0007: Agent Architecture and Extensibility
 */

import { AgentType } from '../../types';

/**
 * Plugin configuration for agent plugins
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