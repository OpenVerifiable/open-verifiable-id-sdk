/**
 * Agents Module - Barrel Export
 * 
 * This module provides comprehensive agent management capabilities including
 * creation, configuration, and lifecycle management for different agent types.
 * 
 * @example
 * ```typescript
 * import { AgentsClient, UserAgent } from '@/core/agents'
 * 
 * const client = new AgentsClient()
 * const agent = await client.createAgent('user')
 * ```
 */

// Re-export the main client class
export { AgentsClient } from './client.js'

// Re-export public types and interfaces
export type { AgentClientOptions } from './client.js'

// Export base classes and utilities
export { BaseAgent, createCheqdProvider, CheqdNetwork } from './base.js'

// Export agent implementations
export { UserAgent } from './user-agent.js'
export { PackageAgent } from './package-agent.js'
export { ParentAgent } from './parent-agent.js'
export { ServiceAgent } from './service-agent.js'

// Export factory
export { AgentFactory, createAgent } from './factory.js'

// Export configuration management
export { AgentConfigurationClient, createAgentConfigurationClient, createQuickUserAgent, createSecureUserAgent } from './configuration-client.js'
export { AgentConfigurationManager } from './configuration-manager.js'

// Export configuration types
export type {
  AgentConfiguration,
  AgentConfigurationValidationResult,
  AgentConfigurationManagerOptions,
  AgentConfigurationTemplate,
  AgentConfigurationExport,
  AgentConfigurationMigrationResult,
  AgentPluginConfig,
  AgentSecurityConfig,
  AgentFeaturesConfig,
  AgentEndpointsConfig,
} from './types.js'

// Re-export client options from configuration client
export type { AgentConfigurationClientOptions } from './configuration-client.js'

// Re-export types for convenience
export type { OpenVerifiableAgent, AgentPlugin, PluginInfo } from '../../types/index.js'
export { AgentType } from '../../types/index.js' 