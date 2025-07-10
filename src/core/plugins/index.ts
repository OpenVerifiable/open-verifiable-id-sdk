/**
 * Plugin System for the Open Verifiable ID SDK
 * 
 * This module provides the core plugin infrastructure including:
 * - Plugin interfaces and base classes
 * - Plugin manager for lifecycle management
 * - Security sandboxing
 * - Plugin discovery system
 * - Verification and licensing
 * 
 * Implements:
 * - ADR-0048: Verifiable Plugin Architecture
 * - ADR-0055: Plugin Security and Sandboxing Architecture
 * - ADR-0056: Plugin Lifecycle Management Architecture
 * - ADR-0057: Agent-Plugin Integration Architecture
 */

// Core interfaces and types
export type {
  Plugin,
  VerifiablePlugin,
  PluginType,
  PluginCategory,
  VerificationLevel,
  PluginAuthor,
  PluginDependency,
  SourceVerification,
  TrustChainVerification,
  PluginMonetization,
  PluginContext,
  PluginStorage,
  PluginPermissions,
  PluginEvents,
  PluginAPIs,
  PluginMetadata,
  ValidationResult
} from './interfaces.js';

// Base plugin classes
export { BasePlugin } from './base-plugin.js';
export { BaseVerifiablePlugin } from './verifiable-plugin.js';

// Plugin management
export { PluginManager } from './manager.js';
export type { PluginManagerOptions, PluginRegistrationResult, PluginDiscoveryResult, PluginLifecycleEvent } from './manager.js';

// Security and sandboxing
export { PluginSecuritySandbox } from './security/sandbox.js';
export type { SandboxPermissions, SandboxContext, SandboxExecutionResult, SecurityViolation, SandboxOptions } from './security/sandbox.js';

// Discovery system
export { PluginDiscovery } from './discovery/discovery.js';
export type { DiscoverySource, DiscoverySourceConfig, DiscoveryOptions, DiscoveryResult } from './discovery/discovery.js';

// Licensing and verification
export { PluginLicenseManager } from './license-manager.js';
export type { PluginInstallationConfig, PluginInstallationResult, LicenseVerificationResult } from './license-manager.js';
export { PluginVerificationEngine } from './verification-engine.js';
export { SourceVerificationEngine } from './source-verification.js';
export type { SourceVerificationResult, ReleaseMetadata } from './source-verification.js';
export { PluginStorageManager } from './storage-manager.js';

// Payment integration
export { CheqdPaymentClient } from '../payments/cheqd-payment-client.js';
export type { PaymentRequest, PaymentResult } from '../payments/cheqd-payment-client.js';

// Trust chain integration
export { CheqdTrustChainClient } from '../trust-registry/cheqd-trust-chain.js';
export type { TrustChainAccreditation, TrustChainVerificationResult, PluginEcosystemTrustChain } from '../trust-registry/cheqd-trust-chain.js'; 