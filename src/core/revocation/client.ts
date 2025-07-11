/**
 * Credential Revocation Client
 * 
 * Provides local revocation checking for user-defined revocation lists
 * with extensible interface for future revocation standards.
 * 
 * @implements ADR-0003: Credential Revocation Checking
 */

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

export interface RevocationStatus {
  isRevoked: boolean;
  revokedDate?: string;
  reason?: string;
  lastChecked: string;
  source: string;
  metadata?: RevocationMetadata;
}

export interface ValidationResult {
  isValid: boolean;
  revocationStatus: RevocationStatus;
  validationErrors: string[];
  warnings: string[];
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

export interface BatchRevocationResult {
  totalChecked: number;
  revokedCount: number;
  results: Array<{
    credentialId: string;
    isRevoked: boolean;
    status: RevocationStatus;
  }>;
}

export class RevocationClient {
  private revokedCredentials: Map<string, RevokedCredential> = new Map();
  private providers: Map<string, RevocationProvider> = new Map();
  private cache: Map<string, RevocationStatus> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Add a revoked credential to the local revocation list
   */
  async addRevokedCredential(
    credentialId: string, 
    metadata: RevocationMetadata
  ): Promise<void> {
    this.revokedCredentials.set(credentialId, {
      credentialId,
      metadata: {
        ...metadata,
        lastChecked: new Date().toISOString()
      }
    });
    
    // Invalidate cache
    this.cache.delete(credentialId);
  }

  /**
   * Remove a revoked credential from the local revocation list
   */
  async removeRevokedCredential(credentialId: string): Promise<void> {
    this.revokedCredentials.delete(credentialId);
    this.cache.delete(credentialId);
  }

  /**
   * Get all revoked credentials
   */
  async getRevokedCredentials(): Promise<RevokedCredential[]> {
    return Array.from(this.revokedCredentials.values());
  }

  /**
   * Check if a credential is revoked
   */
  async isRevoked(credentialId: string): Promise<boolean> {
    const status = await this.checkRevocationStatus(credentialId);
    return status.isRevoked;
  }

  /**
   * Check revocation status with caching
   */
  async checkRevocationStatus(credentialId: string): Promise<RevocationStatus> {
    // Check cache first
    const cached = this.cache.get(credentialId);
    if (cached && !this.isCacheExpired(cached.lastChecked)) {
      return cached;
    }

    // Check local revocation list
    const revokedCredential = this.revokedCredentials.get(credentialId);
    if (revokedCredential) {
      const status: RevocationStatus = {
        isRevoked: true,
        revokedDate: revokedCredential.metadata.revokedDate,
        reason: revokedCredential.metadata.reason,
        lastChecked: new Date().toISOString(),
        source: 'local',
        metadata: revokedCredential.metadata
      };
      
      this.cache.set(credentialId, status);
      return status;
    }

    // Check with providers
    for (const [providerName, provider] of this.providers) {
      try {
        if (await provider.isAvailable()) {
          const isRevoked = await provider.checkRevocation(credentialId);
          if (isRevoked) {
            const metadata = await provider.getMetadata(credentialId);
            const status: RevocationStatus = {
              isRevoked: true,
              revokedDate: metadata?.revokedDate,
              reason: metadata?.reason,
              lastChecked: new Date().toISOString(),
              source: providerName,
              metadata: metadata || undefined
            };
            
            this.cache.set(credentialId, status);
            return status;
          }
        }
      } catch (error) {
        console.warn(`Provider ${providerName} failed:`, error);
      }
    }

    // Not revoked
    const status: RevocationStatus = {
      isRevoked: false,
      lastChecked: new Date().toISOString(),
      source: 'local'
    };
    
    this.cache.set(credentialId, status);
    return status;
  }

  /**
   * Validate a credential with revocation checking
   */
  async validateCredential(credential: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic credential validation
    if (!credential || !credential.id) {
      errors.push('Invalid credential: missing id');
      return {
        isValid: false,
        revocationStatus: {
          isRevoked: false,
          lastChecked: new Date().toISOString(),
          source: 'local'
        },
        validationErrors: errors,
        warnings
      };
    }

    // Check revocation status
    const revocationStatus = await this.checkRevocationStatus(credential.id);
    
    if (revocationStatus.isRevoked) {
      warnings.push('Credential has been revoked');
    }

    return {
      isValid: errors.length === 0 && !revocationStatus.isRevoked,
      revocationStatus,
      validationErrors: errors,
      warnings
    };
  }

  /**
   * Import revocation list
   */
  async importRevocationList(list: RevocationList): Promise<void> {
    for (const revokedCredential of list.revokedCredentials) {
      await this.addRevokedCredential(
        revokedCredential.credentialId,
        revokedCredential.metadata
      );
    }
  }

  /**
   * Export revocation list
   */
  async exportRevocationList(format: 'json' | 'csv'): Promise<string> {
    const revokedCredentials = await this.getRevokedCredentials();
    
    if (format === 'json') {
      const list: RevocationList = {
        version: '1.0.0',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        issuerDID: 'local',
        revokedCredentials,
        metadata: {
          name: 'Local Revocation List',
          description: 'User-defined revocation list',
          source: 'local',
          maintainer: 'user'
        }
      };
      
      return JSON.stringify(list, null, 2);
    } else {
      // CSV format
      const headers = ['credentialId', 'issuerDID', 'revokedDate', 'reason', 'source'];
      const rows = revokedCredentials.map(rc => [
        rc.credentialId,
        rc.metadata.issuerDID,
        rc.metadata.revokedDate,
        rc.metadata.reason || '',
        rc.metadata.source
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  }

  /**
   * Register a revocation provider
   */
  async registerRevocationProvider(provider: RevocationProvider): Promise<void> {
    this.providers.set(provider.name, provider);
  }

  /**
   * Check revocation with specific provider
   */
  async checkWithProvider(
    credentialId: string, 
    providerName: string
  ): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    return await provider.checkRevocation(credentialId);
  }

  /**
   * Batch revocation checking
   */
  async batchRevocationCheck(
    credentialIds: string[]
  ): Promise<BatchRevocationResult> {
    const results = await Promise.all(
      credentialIds.map(async (credentialId) => {
        const revocationStatus = await this.checkRevocationStatus(credentialId);
        return {
          credentialId,
          isRevoked: revocationStatus.isRevoked,
          status: revocationStatus
        };
      })
    );
    
    return {
      totalChecked: credentialIds.length,
      revokedCount: results.filter(r => r.isRevoked).length,
      results
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear all revocation data (for testing)
   */
  clear(): void {
    this.revokedCredentials.clear();
    this.cache.clear();
    this.providers.clear(); // Clear providers for testing isolation
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.cacheTTL
    };
  }

  private isCacheExpired(timestamp: string): boolean {
    const lastChecked = new Date(timestamp).getTime();
    const now = Date.now();
    return (now - lastChecked) > this.cacheTTL;
  }
}

/**
 * Default revocation list (empty)
 */
export const defaultRevocationList: RevocationList = {
  version: '1.0.0',
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  issuerDID: 'local',
  revokedCredentials: [],
  metadata: {
          name: 'open-verifiable-id-sdk Default Revocation List',
      description: 'Default revocation list for open-verifiable-id-sdk',
      source: 'open-verifiable-id-sdk',
    maintainer: 'OriginVault'
  }
}; 