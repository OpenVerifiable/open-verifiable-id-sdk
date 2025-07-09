/**
 * Core Types and Interfaces for Open Verifiable ID SDK
 * Based on ADRs 0001-0014 and W3C VC 2.0 specifications
 * Extends Veramo core types with additional functionality
 */

import { DIDDocument } from 'did-resolver';
import { 
  IIdentifier as VeramoIdentifier,
  IKey as VeramoKey,
  IService as VeramoService,
  VerifiableCredential as VeramoCredential,
  VerifiablePresentation as VeramoPresentation,
  CredentialPayload,
  PresentationPayload,
  IAgentContext,
  IResolver,
  IDIDManager,
  IKeyManager,
  IDataStore,
  IPluginMethodMap,
  IPluginMethod
} from '@veramo/core-types';

// Re-export Veramo types as our base types
export type IIdentifier = VeramoIdentifier;
export type IKey = VeramoKey;
export type IService = VeramoService;
export type VerifiablePresentation = VeramoPresentation;

// ============================================================================
// W3C VC 2.0 Types (ADR-0001) - Primary credential type
// ============================================================================

export interface DataIntegrityProof {
  type: 'DataIntegrityProof';
  cryptosuite: string;
  created: string;
  verificationMethod: string;
  proofPurpose: 'assertionMethod' | 'authentication' | 'capabilityInvocation' | 'capabilityDelegation';
  proofValue: string;
}

export interface JwtProof {
  type: 'JsonWebSignature2020';
  jwt: string;
}

export interface IssuerObject {
  id: string;
  name?: string;
  [key: string]: any;
}

export interface CredentialSubject {
  id: string;
  [key: string]: any;
}

export interface CredentialSchema {
  id: string;
  type: string;
  schema?: any;
  [key: string]: any;
}

// Primary VerifiableCredential type - W3C VC 2.0 compliant
export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: IssuerObject | string;
  validFrom: string;
  validUntil?: string;
  credentialSubject: CredentialSubject;
  credentialSchema?: CredentialSchema;
  proof?: JwtProof | DataIntegrityProof;
  [key: string]: any;
}

// Legacy alias for backward compatibility
export type VerifiableCredential_2_0 = VerifiableCredential;

// ============================================================================
// Trust and Validation Types
// ============================================================================

export enum TrustStatus {
  TRUSTED = 'trusted',
  UNTRUSTED = 'untrusted',
  UNKNOWN = 'unknown'
}

export enum RevocationStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  UNKNOWN = 'unknown'
}

export interface TrustStatusInfo {
  status: TrustStatus;
  lastChecked: string;
  source: string;
  metadata?: any;
}

export interface RevocationStatusInfo {
  status: RevocationStatus;
  lastChecked: string;
  source: string;
  reason?: string;
  metadata?: any;
}

export interface ValidationResult {
  isValid: boolean;
  validationErrors: string[];
  warnings: string[];
  trustStatus?: TrustStatusInfo;
  revocationStatus?: RevocationStatusInfo;
}

export interface VerificationResult {
  isValid: boolean;
  trustStatus?: TrustStatusInfo;
  revocationStatus?: RevocationStatusInfo;
  validationErrors: string[];
  warnings: string[];
}

// ============================================================================
// Agent Architecture (ADR-0007)
// ============================================================================

export enum AgentType {
  USER = 'user',
  PACKAGE = 'package', 
  PARENT = 'parent',
  SERVICE = 'service'
}

export interface AgentPlugin {
  name: string;
  version: string;
  type: 'did-method' | 'credential-type' | 'crypto-suite' | 'utility';
  methods: IPluginMethodMap;
  register(agent: OvIdAgent): void;
  unregister?(agent: OvIdAgent): void;
  getInfo(): PluginInfo;
}

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  type: string;
  capabilities: string[];
}

// Base agent interface that matches our implementation
export interface OvIdAgent {
  readonly id: string;
  readonly agentId: string;
  readonly agentType: AgentType;
  getType(): string;
  issueCredential(template: CredentialTemplate): Promise<VerifiableCredential>;
  verifyCredential(credential: VerifiableCredential): Promise<ValidationResult>;
  getCredential(id: string): Promise<VerifiableCredential | null>;
  storeCredential(credential: VerifiableCredential): Promise<void>;
  deleteCredential(id: string): Promise<void>;
  listCredentials(): Promise<VerifiableCredential[]>;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  destroy(): Promise<void>;
  registerPlugin(plugin: AgentPlugin): void;
  getPlugin(name: string): AgentPlugin | undefined;
  listPlugins(): AgentPlugin[];
}

// Define our agent context with proper plugin method types
export interface AgentPluginMethods extends IPluginMethodMap {
  resolver: IPluginMethod;
  didManager: IPluginMethod;
  keyManager: IPluginMethod;
  dataStore: IPluginMethod;
}

export interface AgentContext extends IAgentContext<AgentPluginMethods> {}

// Define credential template that extends Veramo's CredentialPayload
export interface CredentialTemplate {
  '@context': string[];
  type: string[];
  issuer: string | IssuerObject;
  validFrom?: string;
  validUntil?: string;
  credentialSubject: CredentialSubject;
}

// Define options for DID creation
export interface CreateDIDOptions {
  alias?: string;
  provider?: string;
  network?: string;
  options?: Record<string, any>;
}

// ============================================================================
// Runtime Platform Detection (ADR-0013)
// ============================================================================

export enum RuntimePlatform {
  NODE = 'node',
  BROWSER = 'browser',
  REACT_NATIVE = 'react-native',
  ELECTRON = 'electron',
  WORKER = 'worker'
}

export interface PlatformCapabilities {
  cryptoAPI: 'node' | 'webcrypto' | 'react-native-crypto';
  storageAPI: 'filesystem' | 'localstorage' | 'asyncstorage' | 'secure-storage';
  networkAPI: 'fetch' | 'node-fetch' | 'xhr';
  secureContext: boolean;
  biometricSupport: boolean;
  backgroundProcessing: boolean;
}

// Alias for backward compatibility
export type RuntimePlatformCapabilities = PlatformCapabilities;

// ============================================================================
// DID Management Types
// ============================================================================

export interface DIDDocument_2_0 {
  '@context': string[];
  id: string;
  verificationMethod?: VerificationMethod_2_0[];
  authentication?: string[];
  assertionMethod?: string[];
  capabilityInvocation?: string[];
  capabilityDelegation?: string[];
  service?: DIDService[];
}

export interface VerificationMethod_2_0 {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: JsonWebKey;
}

export interface DIDService {
  id: string;
  type: string;
  serviceEndpoint: string | object;
}

export interface DIDManager extends IDIDManager {
  // Additional methods specific to our SDK
  didManagerSignWithDID(args: any, context: IAgentContext<IKeyManager>): Promise<any>;
  didManagerVerifyWithDID(args: any, context: IAgentContext<IKeyManager>): Promise<any>;
}

export interface DIDCreationOptions {
  method?: string;
  keyType?: string;
  alias?: string;
  network?: string;
}

export interface DIDCreationResult {
  did: string;
  document: DIDDocument_2_0;
  keyId: string;
  credential: VerifiableCredential;
  recoveryPhrase: string;
}

export interface DIDImportOptions {
  did: string;
  privateKey: Uint8Array;
  method: string;
}

export interface DIDImportResult {
  did: string;
  document: DIDDocument_2_0;
  credential: VerifiableCredential;
  verified: boolean;
}

export interface CreateDIDResult {
  did: IIdentifier;
  mnemonic: string;
  publicKeyHex: string;
  privateKeyHex: string;
  credentials: VerifiableCredential[];
}

export interface ImportDIDOptions {
  mnemonic: string;
  method: string;
  alias?: string;
  isPrimary?: boolean;
}

export interface DIDFilter {
  method?: string;
  status?: 'active' | 'deactivated';
  dateRange?: { from: string; to: string };
}

// ============================================================================
// Storage Types
// ============================================================================

export interface SecureStorage {
  // Key storage
  storeKey(keyId: string, privateKey: Uint8Array, options?: StoreOptions): Promise<void>;
  retrieveKey(keyId: string, options?: AccessOptions): Promise<Uint8Array | null>;
  
  // Credential storage
  storeCredential(credentialId: string, credential: VerifiableCredential): Promise<void>;
  retrieveCredential(credentialId: string): Promise<VerifiableCredential | null>;
  
  // Management operations
  deleteKey(keyId: string): Promise<void>;
  deleteCredential(credentialId: string): Promise<void>;
  
  // Export/Import operations (NEW)
  exportKey(keyId: string, format: 'base64' | 'hex'): Promise<string>;
  importKey(keyId: string, key: string, format: 'base64' | 'hex'): Promise<void>;
  exportRecoveryPhrase(keyId: string, format: 'base64' | 'hex'): Promise<string>;
  importRecoveryPhrase(keyId: string, phrase: string, format: 'base64' | 'hex'): Promise<void>;
  
  // Backup and migration
  exportBackup(passphrase: string): Promise<string>;
  importBackup(data: string, passphrase: string): Promise<void>;
  rotateEncryptionKey(oldPassphrase: string, newPassphrase: string): Promise<void>;
  
  // Audit and monitoring
  getAccessLog(): Promise<AccessLogEntry[]>;
  clear(): Promise<void>;
}

export interface StoreOptions {
  hardwareBacked?: boolean;
  requireBiometric?: boolean;
}

export interface AccessOptions {
  requireBiometric?: boolean;
  mfaToken?: string;
}

export interface AccessLogEntry {
  timestamp: string;
  operation: 'store' | 'retrieve' | 'delete' | 'export' | 'import' | 'rotate';
  keyOrCredentialId: string;
  user: string;
  method: 'password' | 'biometric' | 'hardware' | 'mfa';
  success: boolean;
  details?: string;
}

// ============================================================================
// External Database Storage Types
// ============================================================================

export interface ExternalDatabaseStorage {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  
  // Key operations
  storeKey(keyId: string, encryptedKey: string, metadata?: any): Promise<void>;
  retrieveKey(keyId: string): Promise<string | null>;
  deleteKey(keyId: string): Promise<void>;
  listKeys(filter?: any): Promise<string[]>;
  
  // Credential operations
  storeCredential(credentialId: string, encryptedCredential: string, metadata?: any): Promise<void>;
  retrieveCredential(credentialId: string): Promise<string | null>;
  deleteCredential(credentialId: string): Promise<void>;
  listCredentials(filter?: any): Promise<string[]>;
  
  // Backup operations
  storeBackup(backupId: string, encryptedBackup: string, metadata?: any): Promise<void>;
  retrieveBackup(backupId: string): Promise<string | null>;
  deleteBackup(backupId: string): Promise<void>;
  listBackups(filter?: any): Promise<string[]>;
  
  // Transaction support
  beginTransaction(): Promise<DatabaseTransaction>;
  commitTransaction(transaction: DatabaseTransaction): Promise<void>;
  rollbackTransaction(transaction: DatabaseTransaction): Promise<void>;
  
  // Health and monitoring
  healthCheck(): Promise<DatabaseHealthStatus>;
  getStatistics(): Promise<DatabaseStatistics>;
}

export interface DatabaseTransaction {
  id: string;
  status: 'active' | 'committed' | 'rolled-back';
  operations: DatabaseOperation[];
}

export interface DatabaseOperation {
  type: 'store' | 'retrieve' | 'delete';
  table: string;
  key: string;
  data?: string;
  timestamp: string;
}

export interface DatabaseHealthStatus {
  isHealthy: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastCheck: string;
  responseTime: number;
  errors?: string[];
}

export interface DatabaseStatistics {
  totalKeys: number;
  totalCredentials: number;
  totalBackups: number;
  storageSize: number;
  lastBackup: string;
  uptime: number;
}

export interface ExternalDatabaseConfig {
  type: 'postgresql' | 'mongodb' | 'mysql' | 'sqlite' | 'custom';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connectionPool?: {
    min: number;
    max: number;
    idleTimeout: number;
  };
  customConfig?: Record<string, any>;
}

// ============================================================================
// Trust Registry Types
// ============================================================================

export interface TrustRegistryClient {
  // Local trust registry management
  addTrustedIssuer(issuerDID: string, metadata: TrustMetadata): Promise<void>;
  removeTrustedIssuer(issuerDID: string): Promise<void>;
  getTrustedIssuers(): Promise<TrustedIssuer[]>;
  isTrustedIssuer(issuerDID: string): Promise<boolean>;
  
  // Trust validation
  validateIssuer(issuerDID: string): Promise<TrustStatusInfo>;
  validateCredential(credential: VerifiableCredential): Promise<ValidationResult>;
  
  // Trust registry import/export
  importTrustRegistry(registry: TrustRegistry): Promise<void>;
  exportTrustRegistry(format: 'json' | 'csv'): Promise<string>;
  
  // Extensible for future standards
  registerTrustRegistryProvider(provider: TrustRegistryProvider): Promise<void>;
  validateWithProvider(issuerDID: string, providerName: string): Promise<boolean>;
}

export interface TrustMetadata {
  name?: string;
  domain?: string;
  addedDate: string;
  notes?: string;
  trustLevel: 'personal' | 'verified' | 'community';
  source?: string;
  lastValidated?: string;
}

export interface TrustedIssuer {
  issuerDID: string;
  metadata: TrustMetadata;
}

export interface TrustRegistry {
  version: string;
  created: string;
  updated: string;
  issuers: TrustedIssuer[];
  metadata: {
    name?: string;
    description?: string;
    source?: string;
    maintainer?: string;
  };
}

export interface TrustRegistryProvider {
  name: string;
  description: string;
  validate(issuerDID: string): Promise<boolean>;
  getMetadata(issuerDID: string): Promise<TrustMetadata | null>;
  isAvailable(): Promise<boolean>;
}

// ============================================================================
// Revocation Types
// ============================================================================

export interface RevocationClient {
  // Local revocation list management
  addRevokedCredential(credentialId: string, metadata: RevocationMetadata): Promise<void>;
  removeRevokedCredential(credentialId: string): Promise<void>;
  getRevokedCredentials(): Promise<RevokedCredential[]>;
  isRevoked(credentialId: string): Promise<boolean>;
  
  // Revocation validation
  checkRevocationStatus(credentialId: string): Promise<RevocationStatusInfo>;
  validateCredential(credential: VerifiableCredential): Promise<ValidationResult>;
  
  // Revocation list import/export
  importRevocationList(list: RevocationList): Promise<void>;
  exportRevocationList(format: 'json' | 'csv'): Promise<string>;
  
  // Extensible for future standards
  registerRevocationProvider(provider: RevocationProvider): Promise<void>;
  checkWithProvider(credentialId: string, providerName: string): Promise<boolean>;
}

export interface RevocationMetadata {
  issuerDID: string;
  revokedDate: string;
  reason?: string;
  notes?: string;
  source: string;
  lastChecked?: string;
}

export interface RevokedCredential {
  credentialId: string;
  metadata: RevocationMetadata;
}

export interface RevocationList {
  version: string;
  created: string;
  updated: string;
  issuerDID: string;
  revokedCredentials: RevokedCredential[];
  metadata: {
    name?: string;
    description?: string;
    source?: string;
    maintainer?: string;
  };
}

export interface RevocationProvider {
  name: string;
  description: string;
  checkRevocation(credentialId: string): Promise<boolean>;
  getMetadata(credentialId: string): Promise<RevocationMetadata | null>;
  isAvailable(): Promise<boolean>;
}

// ============================================================================
// Biometric Authentication Types
// ============================================================================

export enum BiometricModality {
  FINGERPRINT = 'fingerprint',
  FACE = 'face',
  VOICE = 'voice',
  IRIS = 'iris'
}

export interface BiometricCapabilities {
  fingerprint: boolean;
  face: boolean;
  voice: boolean;
  hardwareBacked: boolean;
  multiModal: boolean;
  strongBoxBacked?: boolean; // Android
  secureEnclaveBacked?: boolean; // iOS
}

export interface BiometricAuthOptions {
  modality: BiometricModality;
  allowFallback: boolean;
  promptMessage?: string;
  maxAttempts?: number;
  requireUserPresence?: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  modality: BiometricModality;
  confidence?: number;
  hardwareBacked: boolean;
  error?: BiometricError;
  fallbackUsed?: boolean;
}

export interface BiometricError {
  code: string;
  message: string;
  recoverable: boolean;
}

// ============================================================================
// SDK Configuration Types
// ============================================================================

export interface SDKConfiguration {
  version: string;
  environment: 'development' | 'staging' | 'production';
  platform: RuntimePlatform;
  features: {
    trustRegistry: boolean;
    schemaRegistry: boolean;
    carbonAwareness: boolean;
    biometricAuth: boolean;
    offlineCache: boolean;
  };
  endpoints?: {
    schemaRegistry?: string;
    trustRegistry?: string;
    carbonService?: string;
  };
  security: {
    encryptionLevel: 'standard' | 'high';
    requireBiometric: boolean;
    keyStorageType: 'file' | 'keychain' | 'hardware';
  };
}

// ============================================================================
// Key Management Types
// ============================================================================

export interface KeyManager {
  generateKey(algorithm: string, options?: any): Promise<string>;
  importKey(privateKey: string, format?: 'jwk' | 'pem' | 'raw'): Promise<string>;
  exportKey(keyId: string, format?: 'jwk' | 'pem' | 'raw'): Promise<string>;
  deleteKey(keyId: string): Promise<void>;
  sign(keyId: string, data: Uint8Array): Promise<Uint8Array>;
  verify(keyId: string, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  CRYPTOGRAPHY = 'cryptography',
  VALIDATION = 'validation',
  STORAGE = 'storage',
  EXTERNAL_SERVICE = 'external_service'
}

export interface RecoveryAction {
  action: string;
  description: string;
}

export interface ErrorContext {
  operation: string;
  timestamp: string;
  platform: RuntimePlatform;
  [key: string]: any;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationOptions {
  skipTrustCheck?: boolean;
  skipRevocationCheck?: boolean;
  skipSchemaValidation?: boolean;
  skipProofValidation?: boolean;
  [key: string]: any;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface Storage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface StorageOptions {
  namespace?: string;
  encryption?: boolean;
  [key: string]: any;
}

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

export interface LegacyVerifiableCredential {
  "@context": string[];
  id: string;
  type: string[];
  issuer: string | object;
  issuanceDate: string; // VC 1.1 format
  credentialSubject: any;
  proof?: any;
}

export interface LegacyAgent {
  createDID(props: any): Promise<any>;
  signVC(issuer: string, subject: string): Promise<string>;
  verifyVC(credential: string): Promise<boolean>;
}

// ============================================================================
// OVAgent Interface (Primary agent interface)
// ============================================================================

export interface OVAgent {
  // Agent identification
  agentId: string;
  agentType: AgentType;
  
  // Core capabilities
  createDID(method: string, options?: CreateDIDOptions): Promise<IIdentifier>;
  issueCredential(template: CredentialTemplate): Promise<VerifiableCredential>;
  verifyCredential(credential: VerifiableCredential): Promise<VerificationResult>;
  
  // Lifecycle management
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  destroy(): Promise<void>;
  
  // Plugin system
  registerPlugin(plugin: AgentPlugin): void;
  getPlugin(name: string): AgentPlugin | undefined;
  listPlugins(): AgentPlugin[];
  
  // Storage and security
  secureStorage: SecureStorage;
  keyManager: KeyManager;
  didManager?: any; // Veramo DID manager
} 