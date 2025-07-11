/**
 * Trust Registry Module - Barrel Export
 * 
 * This module provides local-first trust validation for credential issuers
 * with extensible provider support.
 * 
 * @example
 * ```typescript
 * import { TrustRegistryClient } from '@/core/trust-registry'
 * 
 * const client = new TrustRegistryClient()
 * const isTrusted = await client.isTrustedIssuer(issuerDID)
 * ```
 */

// Re-export the main client class
export { TrustRegistryClient } from './client'

// Re-export public types and interfaces
export type {
  TrustMetadata,
  TrustedIssuer,
  TrustStatus,
  ValidationResult,
  TrustRegistry,
  TrustRegistryProvider
} from './types'

// Import types for the implementation
import type {
  TrustMetadata,
  TrustedIssuer,
  TrustStatus,
  ValidationResult,
  TrustRegistry,
  TrustRegistryProvider
} from './types'
import { VerifiableCredential_2_0 } from '../../types'

/**
 * Local Trust Registry Client
 * 
 * Provides local-first trust validation with extensible provider support
 */
export class LocalTrustRegistryClient {
  private trustedIssuers: Map<string, TrustedIssuer> = new Map();
  private providers: Map<string, TrustRegistryProvider> = new Map();
  private storage: any; // Will be injected from the storage system

  constructor(storage?: any) {
    this.storage = storage;
  }

  /**
   * Add a trusted issuer to the local registry
   */
  async addTrustedIssuer(issuerDID: string, metadata: TrustMetadata): Promise<void> {
    const trustedIssuer: TrustedIssuer = {
      issuerDID,
      metadata: {
        ...metadata,
        addedDate: metadata.addedDate || new Date().toISOString(),
        lastValidated: new Date().toISOString()
      }
    };

    this.trustedIssuers.set(issuerDID, trustedIssuer);
    
    // Persist to storage if available
    if (this.storage) {
      await this.storage.storeTrustedIssuer(issuerDID, trustedIssuer);
    }
  }

  /**
   * Remove a trusted issuer from the local registry
   */
  async removeTrustedIssuer(issuerDID: string): Promise<void> {
    this.trustedIssuers.delete(issuerDID);
    
    // Remove from storage if available
    if (this.storage) {
      await this.storage.removeTrustedIssuer(issuerDID);
    }
  }

  /**
   * Get all trusted issuers
   */
  async getTrustedIssuers(): Promise<TrustedIssuer[]> {
    return Array.from(this.trustedIssuers.values());
  }

  /**
   * Check if an issuer is trusted
   */
  async isTrustedIssuer(issuerDID: string): Promise<boolean> {
    return this.trustedIssuers.has(issuerDID);
  }

  /**
   * Validate an issuer and return trust status
   */
  async validateIssuer(issuerDID: string): Promise<TrustStatus> {
    const trustedIssuer = this.trustedIssuers.get(issuerDID);
    
    if (trustedIssuer) {
      return {
        isTrusted: true,
        trustLevel: trustedIssuer.metadata.trustLevel,
        lastValidated: trustedIssuer.metadata.lastValidated || new Date().toISOString(),
        source: 'local',
        metadata: trustedIssuer.metadata
      };
    }

    // Check with registered providers
    for (const [providerName, provider] of this.providers) {
      try {
        if (await provider.isAvailable()) {
          const isValid = await provider.validate(issuerDID);
          if (isValid) {
            const metadata = await provider.getMetadata(issuerDID);
            return {
              isTrusted: true,
              trustLevel: 'provider',
              lastValidated: new Date().toISOString(),
              source: providerName,
              metadata: metadata || undefined
            };
          }
        }
      } catch (error) {
        console.warn(`Provider ${providerName} failed to validate issuer ${issuerDID}:`, error);
      }
    }

    return {
      isTrusted: false,
      trustLevel: 'unknown',
      lastValidated: new Date().toISOString(),
      source: 'local'
    };
  }

  /**
   * Validate a credential including trust checking
   */
  async validateCredential(credential: VerifiableCredential_2_0): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic credential validation
    if (!credential.issuer) {
      errors.push('Missing issuer field');
    }

    if (!credential.id) {
      errors.push('Missing credential id');
    }

    if (!credential.credentialSubject) {
      errors.push('Missing credentialSubject');
    }

    // Check issuer trust
    let trustStatus: TrustStatus;
    if (typeof credential.issuer === 'string') {
      trustStatus = await this.validateIssuer(credential.issuer);
    } else if (credential.issuer.id) {
      trustStatus = await this.validateIssuer(credential.issuer.id);
    } else {
      trustStatus = {
        isTrusted: false,
        trustLevel: 'unknown',
        lastValidated: new Date().toISOString(),
        source: 'local'
      };
      errors.push('Invalid issuer format');
    }

    // Add warnings for untrusted issuers
    if (!trustStatus.isTrusted) {
      warnings.push(`Issuer ${typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id} is not trusted`);
    }

    return {
      isValid: errors.length === 0,
      trustStatus,
      validationErrors: errors,
      warnings
    };
  }

  /**
   * Import a trust registry
   */
  async importTrustRegistry(registry: TrustRegistry): Promise<void> {
    for (const issuer of registry.issuers) {
      await this.addTrustedIssuer(issuer.issuerDID, issuer.metadata);
    }
  }

  /**
   * Export the trust registry
   */
  async exportTrustRegistry(format: 'json' | 'csv' = 'json'): Promise<string> {
    const issuers = await this.getTrustedIssuers();
    
    const registry: TrustRegistry = {
      version: '1.0',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      issuers,
      metadata: {
        name: 'Local Trust Registry',
        description: 'User-managed trust registry',
        source: 'local'
      }
    };

    if (format === 'json') {
      return JSON.stringify(registry, null, 2);
    } else if (format === 'csv') {
      const csvHeader = 'issuerDID,name,domain,trustLevel,addedDate,source\n';
      const csvRows = issuers.map(issuer => 
        `${issuer.issuerDID},${issuer.metadata.name || ''},${issuer.metadata.domain || ''},${issuer.metadata.trustLevel},${issuer.metadata.addedDate},${issuer.metadata.source || ''}`
      ).join('\n');
      return csvHeader + csvRows;
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Register a trust registry provider
   */
  async registerTrustRegistryProvider(provider: TrustRegistryProvider): Promise<void> {
    this.providers.set(provider.name, provider);
  }

  /**
   * Validate with a specific provider
   */
  async validateWithProvider(issuerDID: string, providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    if (!(await provider.isAvailable())) {
      throw new Error(`Provider ${providerName} is not available`);
    }

    return await provider.validate(issuerDID);
  }

  /**
   * Initialize the trust registry from storage
   */
  async initialize(): Promise<void> {
    if (this.storage) {
      try {
        const storedIssuers = await this.storage.getTrustedIssuers();
        for (const issuer of storedIssuers) {
          this.trustedIssuers.set(issuer.issuerDID, issuer);
        }
      } catch (error) {
        console.warn('Failed to load trust registry from storage:', error);
      }
    }
  }
}

// Default trust registry client instance
export const defaultTrustRegistry = new LocalTrustRegistryClient(); 