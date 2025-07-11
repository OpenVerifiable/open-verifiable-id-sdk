/**
 * Core plugin interfaces for the Open Verifiable ID SDK
 * Implements ADR-0048: Verifiable Plugin Architecture
 */

import { AgentType } from '../agents/types.js';

/**
 * Base plugin interface that all plugins must implement
 */
export interface Plugin {
  /** Unique plugin identifier */
  readonly id: string;
  
  /** Plugin name */
  readonly name: string;
  
  /** Plugin version */
  readonly version: string;
  
  /** Plugin type */
  readonly type: PluginType;
  
  /** Plugin category */
  readonly category: PluginCategory;
  
  /** Plugin description */
  readonly description?: string;
  
  /** Plugin author information */
  readonly author: PluginAuthor;
  
  /** Plugin capabilities */
  readonly capabilities: string[];
  
  /** Plugin dependencies */
  readonly dependencies?: PluginDependency[];
  
  /** Whether the plugin is enabled */
  enabled: boolean;
  
  /** Plugin-specific configuration */
  config?: Record<string, any>;
  
  /** Initialize the plugin */
  initialize(context: PluginContext): Promise<void>;
  
  /** Cleanup the plugin */
  cleanup(): Promise<void>;
  
  /** Get plugin metadata */
  getMetadata(): PluginMetadata;
  
  /** Validate plugin configuration */
  validateConfig(config: any): Promise<ValidationResult>;
}

/**
 * Verifiable plugin interface extending the base plugin
 */
export interface VerifiablePlugin extends Plugin {
  /** Plugin type must be verifiable */
  readonly type: 'verifiable';
  
  /** Verification level */
  readonly verificationLevel: VerificationLevel;
  
  /** Source verification data */
  readonly sourceVerification: SourceVerification;
  
  /** Trust chain verification data */
  readonly trustChain?: TrustChainVerification;
  
  /** Monetization configuration */
  readonly monetization?: PluginMonetization;
  
  /** Verify plugin integrity */
  verifyIntegrity(): Promise<VerificationResult>;
  
  /** Verify source code */
  verifySource(): Promise<SourceVerificationResult>;
  
  /** Verify trust chain */
  verifyTrustChain(): Promise<TrustChainVerificationResult>;
}

/**
 * Plugin types
 */
export type PluginType = 'regular' | 'verifiable';

/**
 * Plugin categories
 */
export type PluginCategory = 'did-method' | 'credential-type' | 'crypto-suite' | 'utility';

/**
 * Verification levels
 */
export type VerificationLevel = 'basic' | 'standard' | 'full';

/**
 * Plugin author information
 */
export interface PluginAuthor {
  /** Author name */
  name: string;
  
  /** Author DID */
  did: string;
  
  /** Author email */
  email?: string;
  
  /** Author website */
  website?: string;
}

/**
 * Plugin dependency
 */
export interface PluginDependency {
  /** Plugin ID */
  pluginId: string;
  
  /** Required version */
  version: string;
  
  /** Whether dependency is optional */
  optional?: boolean;
}

/**
 * Source verification data
 */
export interface SourceVerification {
  /** Source DID derived from source code */
  sourceDID: string;
  
  /** Bundle hash */
  bundleHash: string;
  
  /** Source hash */
  sourceHash?: string;
  
  /** Package DID */
  packageDID: string;
  
  /** Release credential ID */
  releaseCredential?: string;
  
  /** Whether identity has been aggregated */
  identityAggregated?: boolean;
  
  /** Source files included in verification */
  sourceFiles?: string[];
  
  /** Git commit hashes */
  gitCommits?: string[];
  
  /** Verification timestamp */
  verificationTimestamp?: string;
  
  /** Verification method */
  verificationMethod?: 'local' | 'blockchain' | 'hybrid';
  
  /** Whether verified on blockchain */
  blockchainVerified?: boolean;
}

/**
 * Trust chain verification data
 */
export interface TrustChainVerification {
  /** Root Trusted Accreditation Organization DID */
  rootTAO: string;
  
  /** Platform DID in trust chain */
  platformDID: string;
  
  /** Accreditation credential ID */
  accreditationCredential: string;
  
  /** Whether DNS anchored */
  dnsAnchored?: boolean;
  
  /** Whether TRAIN compatible */
  trainCompatible?: boolean;
}

/**
 * Plugin monetization configuration
 */
export interface PluginMonetization {
  /** Whether license is required */
  requiresLicense: boolean;
  
  /** License type */
  licenseType: 'free' | 'paid' | 'subscription';
  
  /** Price information */
  price?: {
    amount: number;
    currency: string;
    description?: string;
  };
  
  /** Status list DID for license management */
  statusListDID?: string;
  
  /** Status list index */
  statusListIndex?: number;
  
  /** License validity period in days */
  validityPeriod?: number;
}

/**
 * Plugin context provided to plugins during initialization
 */
export interface PluginContext {
  /** Agent type */
  agentType: AgentType;
  
  /** Agent ID */
  agentId: string;
  
  /** Plugin storage */
  storage: PluginStorage;
  
  /** Plugin permissions */
  permissions: PluginPermissions;
  
  /** Plugin events */
  events: PluginEvents;
  
  /** Plugin APIs */
  apis: PluginAPIs;
  
  /** Carbon awareness client */
  carbonClient?: any;
  
  /** Trust registry client */
  trustRegistry?: any;
  
  /** Schema registry client */
  schemaRegistry?: any;
  
  /** DLR client for resource operations */
  dlr: import('@/core/utils/dlr').DIDLinkedResourceClient;
}

/**
 * Plugin storage interface
 */
export interface PluginStorage {
  /** Store data */
  store(key: string, value: any): Promise<void>;
  
  /** Retrieve data */
  get(key: string): Promise<any>;
  
  /** Delete data */
  delete(key: string): Promise<void>;
  
  /** List keys */
  listKeys(): Promise<string[]>;
  
  /** Clear all data */
  clear(): Promise<void>;
}

/**
 * Plugin permissions interface
 */
export interface PluginPermissions {
  /** Check if plugin has permission */
  has(permission: string): boolean;
  
  /** Request permission */
  request(permission: string): Promise<boolean>;
  
  /** List granted permissions */
  list(): string[];
}

/**
 * Plugin events interface
 */
export interface PluginEvents {
  /** Subscribe to events */
  subscribe(event: string, handler: (data: any) => void): void;
  
  /** Unsubscribe from events */
  unsubscribe(event: string, handler: (data: any) => void): void;
  
  /** Publish event */
  publish(event: string, data: any): void;
}

/**
 * Plugin APIs interface
 */
export interface PluginAPIs {
  /** DID management APIs */
  did?: any;
  
  /** Credential management APIs */
  credentials?: any;
  
  /** Key management APIs */
  keys?: any;
  
  /** Storage APIs */
  storage?: any;
  
  /** Network APIs */
  network?: any;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /** Plugin ID */
  id: string;
  
  /** Plugin name */
  name: string;
  
  /** Plugin version */
  version: string;
  
  /** Plugin type */
  type: PluginType;
  
  /** Plugin category */
  category: PluginCategory;
  
  /** Plugin description */
  description?: string;
  
  /** Plugin author */
  author: PluginAuthor;
  
  /** Plugin capabilities */
  capabilities: string[];
  
  /** Plugin dependencies */
  dependencies?: PluginDependency[];
  
  /** Plugin configuration schema */
  configSchema?: any;
  
  /** Plugin entry points */
  entryPoints?: {
    main?: string;
    worker?: string;
    background?: string;
  };
  
  /** Plugin icons */
  icons?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  
  /** Plugin screenshots */
  screenshots?: string[];
  
  /** Plugin tags */
  tags?: string[];
  
  /** Plugin license */
  license?: string;
  
  /** Plugin repository */
  repository?: string;
  
  /** Plugin homepage */
  homepage?: string;
  
  /** Plugin bugs URL */
  bugs?: string;
  
  /** Plugin keywords */
  keywords?: string[];
  
  /** Plugin engines */
  engines?: {
    node?: string;
    npm?: string;
  };
  
  /** Plugin OS compatibility */
  os?: string[];
  
  /** Plugin CPU architecture compatibility */
  cpu?: string[];
  
  /** Plugin memory requirements */
  memory?: {
    minimum?: number;
    recommended?: number;
  };
  
  /** Plugin storage requirements */
  storage?: {
    minimum?: number;
    recommended?: number;
  };
  
  /** Plugin network requirements */
  network?: {
    required?: boolean;
    protocols?: string[];
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  
  /** Validation errors */
  errors: string[];
  
  /** Validation warnings */
  warnings: string[];
}

/**
 * Verification result
 */
export interface VerificationResult {
  /** Whether verification passed */
  isValid: boolean;
  
  /** Verification method */
  method: 'online' | 'cached' | 'offline';
  
  /** Verification timestamp */
  timestamp: string;
  
  /** Verification errors */
  errors?: string[];
  
  /** Verification warnings */
  warnings?: string[];
}

/**
 * Source verification result
 */
export interface SourceVerificationResult {
  /** Whether source verification passed */
  isValid: boolean;
  
  /** Source hash */
  sourceHash: string;
  
  /** DID key */
  didKey: string;
  
  /** Whether blockchain verified */
  blockchainVerified: boolean;
  
  /** Whether identity aggregated */
  identityAggregated: boolean;
  
  /** Verification errors */
  errors: string[];
  
  /** Verification warnings */
  warnings: string[];
}

/**
 * Trust chain verification result
 */
export interface TrustChainVerificationResult {
  /** Whether trust chain verification passed */
  isValid: boolean;
  
  /** Trust level */
  trustLevel: string;
  
  /** Chain length */
  chainLength: number;
  
  /** Whether DNS anchored */
  dnsAnchored: boolean;
  
  /** Governance framework */
  governanceFramework: string;
  
  /** Verification path */
  verificationPath: string[];
  
  /** Verification errors */
  errors: string[];
  
  /** Verification warnings */
  warnings: string[];
} 