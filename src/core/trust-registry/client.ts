/**
 * Trust Registry Client Implementation
 * Following ADR-0002: Trust Registry Client Integration
 * 
 * Provides local trust registry for user-defined trusted issuers
 * with extensible interface for future trust registry standards
 */

export interface TrustMetadata {
  name?: string;
  domain?: string;
  addedDate?: string;
  notes?: string;
  trustLevel: 'personal' | 'verified' | 'community';
  source?: string;
  lastValidated?: string;
}

export interface TrustedIssuer {
  issuerDID: string;
  metadata: TrustMetadata;
}

export interface TrustStatus {
  isTrusted: boolean;
  trustLevel: string;
  lastValidated: string;
  source: string;
  metadata?: TrustMetadata;
}

export interface ValidationResult {
  isValid: boolean;
  trustStatus: TrustStatus;
  validationErrors: string[];
  warnings: string[];
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

import { CheqdTrustChainClient, PluginEcosystemTrustChain, TrustChainVerificationResult } from './cheqd-trust-chain.js';

export class TrustRegistryClient {
  private trustedIssuers: Map<string, TrustMetadata> = new Map();
  private providers: Map<string, TrustRegistryProvider> = new Map();
  private cheqdTrustChain?: CheqdTrustChainClient;

  constructor(options?: {
    cheqdTrustChain?: CheqdTrustChainClient;
  }) {
    this.cheqdTrustChain = options?.cheqdTrustChain;
  }

  /**
   * Add a trusted issuer to the local registry
   */
  async addTrustedIssuer(issuerDID: string, metadata: TrustMetadata): Promise<void> {
    this.trustedIssuers.set(issuerDID, {
      ...metadata,
      addedDate: metadata.addedDate || new Date().toISOString()
    });
  }

  /**
   * Remove a trusted issuer from the local registry
   */
  async removeTrustedIssuer(issuerDID: string): Promise<void> {
    this.trustedIssuers.delete(issuerDID);
  }

  /**
   * Get all trusted issuers from the local registry
   */
  async getTrustedIssuers(): Promise<TrustedIssuer[]> {
    return Array.from(this.trustedIssuers.entries()).map(([issuerDID, metadata]) => ({
      issuerDID,
      metadata
    }));
  }

  /**
   * Check if an issuer is trusted in the local registry
   */
  async isTrustedIssuer(issuerDID: string): Promise<boolean> {
    return this.trustedIssuers.has(issuerDID);
  }

  /**
   * Validate an issuer's trust status
   */
  async validateIssuer(issuerDID: string): Promise<TrustStatus> {
    const metadata = this.trustedIssuers.get(issuerDID);
    
    if (!metadata) {
      return {
        isTrusted: false,
        trustLevel: 'unknown',
        lastValidated: new Date().toISOString(),
        source: 'local'
      };
    }

    return {
      isTrusted: true,
      trustLevel: metadata.trustLevel,
      lastValidated: metadata.lastValidated || new Date().toISOString(),
      source: 'local',
      metadata
    };
  }

  /**
   * Validate a credential with trust checking
   */
  async validateCredential(credential: any): Promise<ValidationResult> {
    const issuerDID = typeof credential.issuer === 'string' 
      ? credential.issuer 
      : credential.issuer?.id;

    if (!issuerDID) {
      return {
        isValid: false,
        trustStatus: {
          isTrusted: false,
          trustLevel: 'unknown',
          lastValidated: new Date().toISOString(),
          source: 'local'
        },
        validationErrors: ['Credential issuer not found'],
        warnings: []
      };
    }

    const trustStatus = await this.validateIssuer(issuerDID);
    
    return {
      isValid: trustStatus.isTrusted,
      trustStatus,
      validationErrors: [],
      warnings: !trustStatus.isTrusted ? ['Issuer not in trust registry'] : []
    };
  }

  /**
   * Import a trust registry from external source
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
      version: '1.0.0',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      issuers,
      metadata: {
        name: 'Local Trust Registry',
        description: 'User-defined trusted issuers',
        source: 'local',
        maintainer: 'user'
      }
    };

    if (format === 'csv') {
      return this.convertToCSV(issuers);
    }

    return JSON.stringify(registry, null, 2);
  }

  /**
   * Register a trust registry provider for extensibility
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
   * Verify plugin creator against Cheqd trust chain
   */
  async verifyPluginCreatorTrustChain(
    creatorDID: string,
    ecosystemChain: PluginEcosystemTrustChain
  ): Promise<TrustChainVerificationResult> {
    if (!this.cheqdTrustChain) {
      throw new Error('Cheqd Trust Chain client not configured');
    }

    return await this.cheqdTrustChain.verifyPluginCreator(creatorDID, ecosystemChain);
  }

  /**
   * Create plugin creator accreditation
   */
  async createPluginCreatorAccreditation(
    creatorDID: string,
    platformDID: string,
    ecosystemChain: PluginEcosystemTrustChain,
    scope: string[]
  ): Promise<any> {
    if (!this.cheqdTrustChain) {
      throw new Error('Cheqd Trust Chain client not configured');
    }

    return await this.cheqdTrustChain.createCreatorAccreditation(
      creatorDID,
      platformDID,
      ecosystemChain,
      scope
    );
  }

  /**
   * Configure Cheqd trust chain client
   */
  setCheqdTrustChain(cheqdTrustChain: CheqdTrustChainClient): void {
    this.cheqdTrustChain = cheqdTrustChain;
  }

  /**
   * Convert trust registry to CSV format
   */
  private convertToCSV(issuers: TrustedIssuer[]): string {
    const headers = ['issuerDID', 'name', 'domain', 'trustLevel', 'addedDate', 'source'];
    const rows = issuers.map(issuer => [
      issuer.issuerDID,
      issuer.metadata.name || '',
      issuer.metadata.domain || '',
      issuer.metadata.trustLevel,
      issuer.metadata.addedDate,
      issuer.metadata.source || 'local'
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

/**
 * Default trust registry with initial trusted issuers
 */
export const defaultTrustRegistry: TrustRegistry = {
  version: '1.0.0',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  issuers: [
    {
      issuerDID: 'did:cheqd:mainnet:a11f08bc-568c-5ecd-b5c8-7ff15c9d3892',
      metadata: {
        name: 'OriginVault',
        domain: 'originvault.box',
        addedDate: new Date().toISOString(),
        trustLevel: 'verified',
        source: 'default'
      }
    }
  ],
  metadata: {
          name: 'open-verifiable-id-sdk Default Trust Registry',
      description: 'Default trusted issuers for open-verifiable-id-sdk',
      source: 'open-verifiable-id-sdk',
    maintainer: 'OriginVault'
  }
}; 