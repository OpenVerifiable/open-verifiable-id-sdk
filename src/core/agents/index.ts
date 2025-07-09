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
export { AgentsClient } from './client'

// Re-export public types and interfaces
export type { AgentClientOptions } from './client'

// Export base classes and utilities
export { BaseAgent, createCheqdProvider, CheqdNetwork } from './base'

// Export agent implementations
export { UserAgent } from './user-agent'
export { PackageAgent } from './package-agent'
export { ParentAgent } from './parent-agent'
export { ServiceAgent } from './service-agent'

// Export factory
export { AgentFactory, createAgent } from './factory'

// Export configuration management
export { AgentConfigurationClient, createAgentConfigurationClient, createQuickUserAgent, createSecureUserAgent } from './configuration-client'
export { AgentConfigurationManager } from './configuration-manager'

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
} from './types'

// Re-export client options from configuration client
export type { AgentConfigurationClientOptions } from './configuration-client'

// Re-export types for convenience
export type { OVAgent, AgentPlugin, PluginInfo } from '../../types'
export { AgentType } from '../../types' 