/**
 * Open Verifiable ID SDK
 * Reference implementation for decentralized identity and verifiable credentials
 * 
 * This SDK provides a comprehensive solution for managing decentralized identities (DIDs)
 * and verifiable credentials (VCs) using the W3C Verifiable Credentials 2.0 standard.
 * 
 * Key Features:
 * - Multi-platform support (Node.js, Browser, React Native)
 * - W3C Verifiable Credentials 2.0 compliance
 * - DID key and Cheqd support
 * - Trust registry integration
 * - Biometric authentication
 * - Cross-platform compatibility
 * 
 * Architecture:
 * - Agent-based design for different use cases
 * - Plugin system for extensibility
 * - Secure storage with encryption
 * - Platform detection and optimization
 */

// Core exports
export * from './core/agents';
export * from './core/config';
export * from './core/did';
export * from './core/storage';

// Platform detection
export * from './platforms';

// Biometric authentication (explicit exports to avoid conflicts)
export {
  BiometricAuthenticator
} from './core/biometric/client';
export type {
  BiometricModality,
  BiometricCapabilities,
  BiometricAuthOptions,
  BiometricAuthResult,
  BiometricError,
  EnrollmentResult,
  UnlockOptions,
  AuthResult,
  Signature,
  FallbackMethod
} from './core/biometric/types';

// Types
export * from './types';

// Convenience functions for creating agents
import { AgentType, AgentPlugin, PluginInfo } from './types';
import { UserAgent } from './core/agents/user-agent';
import { PackageAgent } from './core/agents/package-agent';
import { ParentAgent } from './core/agents/parent-agent';
import { ServiceAgent } from './core/agents/service-agent';

/**
 * Create a user agent for individual identity management
 * @param userId - Unique identifier for the user
 * @param encryptionKey - Optional encryption key for secure storage
 * @returns Promise<UserAgent>
 */
export async function createUserAgent(userId: string, encryptionKey?: string): Promise<UserAgent> {
  const config: any = { userId };
  if (encryptionKey) {
    config.encryptionKey = encryptionKey;
  }
  const agent = new UserAgent(config);
  await agent.initialize();
  return agent;
}

/**
 * Create a package agent for software package identity
 * @param packageName - Name of the package
 * @param packageVersion - Version of the package
 * @param encryptionKey - Optional encryption key for secure storage
 * @returns Promise<PackageAgent>
 */
export async function createPackageAgent(
  packageName: string, 
  packageVersion: string, 
  encryptionKey?: string
): Promise<PackageAgent> {
  const config: any = { packageName, packageVersion };
  if (encryptionKey) {
    config.encryptionKey = encryptionKey;
  }
  const agent = new PackageAgent(config);
  await agent.initialize();
  return agent;
}

/**
 * Create a parent agent for organizational identity management
 * @param organizationId - Unique identifier for the organization
 * @param encryptionKey - Optional encryption key for secure storage
 * @returns Promise<ParentAgent>
 */
export async function createParentAgent(organizationId: string, encryptionKey?: string): Promise<ParentAgent> {
  const config: any = { organizationId };
  if (encryptionKey) {
    config.encryptionKey = encryptionKey;
  }
  const agent = new ParentAgent(config);
  await agent.initialize();
  return agent;
}

/**
 * Create a service agent for API and service identity
 * @param serviceName - Name of the service
 * @param serviceConfig - Configuration for the service
 * @param encryptionKey - Optional encryption key for secure storage
 * @returns Promise<ServiceAgent>
 */
export async function createServiceAgent(
  serviceName: string, 
  serviceConfig: { endpoint: string; apiKey?: string; }, 
  encryptionKey?: string
): Promise<ServiceAgent> {
  const config: any = { 
    serviceId: serviceName,
    serviceEndpoint: serviceConfig.endpoint,
    ...serviceConfig
  };
  if (encryptionKey) {
    config.encryptionKey = encryptionKey;
  }
  const agent = new ServiceAgent(config);
  await agent.initialize();
  return agent;
}

/**
 * Create a credential template for issuing verifiable credentials
 * @param type - Array of credential types
 * @param credentialSubject - The subject of the credential
 * @param issuer - Optional issuer DID
 * @param validFrom - Optional validity start date
 * @param validUntil - Optional validity end date
 * @param context - Optional context URLs
 * @returns CredentialTemplate
 */
export function createCredentialTemplate(
  type: string[],
  credentialSubject: any,
  issuer?: string,
  validFrom?: string,
  validUntil?: string,
  context?: string[]
): any {
  return {
    type,
    credentialSubject,
    issuer,
    validFrom: validFrom || new Date().toISOString(),
    validUntil,
    '@context': context || ['https://www.w3.org/ns/credentials/v2']
  };
}

/**
 * Validate the structure of a verifiable credential
 * @param credential - The credential to validate
 * @returns Validation result with errors
 */
export function validateCredentialStructure(credential: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!credential['@context']) {
    errors.push('Missing @context field');
  }

  if (!credential.id) {
    errors.push('Missing id field');
  }

  if (!credential.type || !Array.isArray(credential.type)) {
    errors.push('Missing or invalid type field');
  }

  if (!credential.issuer) {
    errors.push('Missing issuer field');
  }

  if (!credential.validFrom) {
    errors.push('Missing validFrom field');
  }

  if (!credential.credentialSubject) {
    errors.push('Missing credentialSubject field');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get SDK information and capabilities
 * @returns SDK information object
 */
export function getSDKInfo() {
  return {
    version: '1.0.0',
    supportedVCVersion: '2.0',
    supportedDIDMethods: ['did:key', 'did:cheqd:mainnet', 'did:cheqd:testnet'],
    supportedCryptosuites: ['eddsa-2022', 'jwt'],
    platform: 'node', // This would be detected at runtime
    capabilities: {
      trustRegistry: true,
      schemaRegistry: true,
      carbonAwareness: true,
      biometricAuth: true,
      offlineCache: true
    }
  };
}

// Re-export types for convenience
export type { 
  OVAgent, 
  AgentType, 
  AgentPlugin, 
  PluginInfo,
  VerifiableCredential_2_0,
  VerificationResult,
  CredentialTemplate,
  IIdentifier,
  DIDCreationResult,
  RuntimePlatform,
  PlatformCapabilities
} from './types';

export type { DIDImportOptions, DIDImportResult } from './core/did/did-importer'; 
export * from './utils/qr-code';
export * from './utils/bluetooth'; 