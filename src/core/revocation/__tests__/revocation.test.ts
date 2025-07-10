/**
 * Revocation Checking Tests
 * 
 * Tests for the revocation checking system including local revocation lists,
 * provider integration, caching, and batch operations
 */

import { RevocationClient } from '../client';
import type { RevocationMetadata, RevokedCredential, RevocationList, RevocationProvider } from '../types';

describe('Revocation Checking System', () => {
  let revocationClient: RevocationClient;

  beforeEach(() => {
    revocationClient = new RevocationClient();
  });

  afterEach(() => {
    revocationClient.clear();
  });

  describe('Basic Revocation Management', () => {
    it('should add a revoked credential', async () => {
      const credentialId = 'urn:uuid:test-revoked-credential';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:cheqd:testnet:test-issuer',
        revokedDate: new Date().toISOString(),
        reason: 'Compromised private key',
        source: 'manual',
        notes: 'Test revocation for unit tests'
      };

      await revocationClient.addRevokedCredential(credentialId, metadata);
      const isRevoked = await revocationClient.isRevoked(credentialId);
      
      expect(isRevoked).toBe(true);
    });

    it('should remove a revoked credential', async () => {
      const credentialId = 'urn:uuid:test-remove-credential';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:cheqd:testnet:test-issuer',
        revokedDate: new Date().toISOString(),
        reason: 'Test removal',
        source: 'manual'
      };

      await revocationClient.addRevokedCredential(credentialId, metadata);
      let isRevoked = await revocationClient.isRevoked(credentialId);
      expect(isRevoked).toBe(true);

      await revocationClient.removeRevokedCredential(credentialId);
      isRevoked = await revocationClient.isRevoked(credentialId);
      expect(isRevoked).toBe(false);
    });

    it('should get all revoked credentials', async () => {
      const credentials = [
        {
          id: 'urn:uuid:revoked-1',
          metadata: {
            issuerDID: 'did:cheqd:testnet:issuer-1',
            revokedDate: new Date().toISOString(),
            reason: 'Reason 1',
            source: 'manual'
          }
        },
        {
          id: 'urn:uuid:revoked-2',
          metadata: {
            issuerDID: 'did:cheqd:testnet:issuer-2',
            revokedDate: new Date().toISOString(),
            reason: 'Reason 2',
            source: 'manual'
          }
        }
      ];

      for (const cred of credentials) {
        await revocationClient.addRevokedCredential(cred.id, cred.metadata);
      }

      const revokedCredentials = await revocationClient.getRevokedCredentials();
      expect(revokedCredentials).toHaveLength(2);
      expect(revokedCredentials.some(c => c.credentialId === 'urn:uuid:revoked-1')).toBe(true);
      expect(revokedCredentials.some(c => c.credentialId === 'urn:uuid:revoked-2')).toBe(true);
    });
  });

  describe('Revocation Status Checking', () => {
    it('should check revocation status for revoked credential', async () => {
      const credentialId = 'urn:uuid:status-check-revoked';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:cheqd:testnet:test-issuer',
        revokedDate: '2024-01-15T10:00:00Z',
        reason: 'Security breach',
        source: 'manual'
      };

      await revocationClient.addRevokedCredential(credentialId, metadata);
      const status = await revocationClient.checkRevocationStatus(credentialId);

      expect(status.isRevoked).toBe(true);
      expect(status.revokedDate).toBe('2024-01-15T10:00:00Z');
      expect(status.reason).toBe('Security breach');
      expect(status.source).toBe('local');
      expect(status.metadata).toBeDefined();
    });

    it('should return not revoked status for unknown credential', async () => {
      const credentialId = 'urn:uuid:unknown-credential';
      const status = await revocationClient.checkRevocationStatus(credentialId);

      expect(status.isRevoked).toBe(false);
      expect(status.source).toBe('local');
      expect(status.metadata).toBeUndefined();
    });
  });

  describe('Credential Validation', () => {
    it('should validate credential with revocation checking', async () => {
      const credentialId = 'urn:uuid:validation-test';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:cheqd:testnet:test-issuer',
        revokedDate: new Date().toISOString(),
        reason: 'Test validation',
        source: 'manual'
      };

      await revocationClient.addRevokedCredential(credentialId, metadata);

      const credential = {
        id: credentialId,
        issuer: 'did:cheqd:testnet:test-issuer',
        credentialSubject: { id: 'did:example:subject' },
        validFrom: new Date().toISOString()
      };

      const result = await revocationClient.validateCredential(credential);

      expect(result.isValid).toBe(false);
      expect(result.revocationStatus.isRevoked).toBe(true);
      expect(result.validationErrors).toHaveLength(0);
      expect(result.warnings.some(w => w.includes('has been revoked'))).toBe(true);
    });

    it('should validate non-revoked credential', async () => {
      const credential = {
        id: 'urn:uuid:non-revoked-credential',
        issuer: 'did:cheqd:testnet:test-issuer',
        credentialSubject: { id: 'did:example:subject' },
        validFrom: new Date().toISOString()
      };

      const result = await revocationClient.validateCredential(credential);

      expect(result.isValid).toBe(true);
      expect(result.revocationStatus.isRevoked).toBe(false);
      expect(result.validationErrors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle invalid credential', async () => {
      const result = await revocationClient.validateCredential(null);

      expect(result.isValid).toBe(false);
      expect(result.validationErrors.some(e => e.includes('Invalid credential'))).toBe(true);
    });

    it('should handle credential without id', async () => {
      const credential = {
        issuer: 'did:cheqd:testnet:test-issuer',
        credentialSubject: { id: 'did:example:subject' }
      };

      const result = await revocationClient.validateCredential(credential);

      expect(result.isValid).toBe(false);
      expect(result.validationErrors.some(e => e.includes('missing id'))).toBe(true);
    });
  });

  describe('Import/Export', () => {
    it('should import revocation list', async () => {
      const list: RevocationList = {
        version: '1.0.0',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        issuerDID: 'did:cheqd:testnet:test-issuer',
        revokedCredentials: [
          {
            credentialId: 'urn:uuid:imported-1',
            metadata: {
              issuerDID: 'did:cheqd:testnet:test-issuer',
              revokedDate: '2024-01-10T10:00:00Z',
              reason: 'Imported reason 1',
              source: 'import'
            }
          },
          {
            credentialId: 'urn:uuid:imported-2',
            metadata: {
              issuerDID: 'did:cheqd:testnet:test-issuer',
              revokedDate: '2024-01-12T10:00:00Z',
              reason: 'Imported reason 2',
              source: 'import'
            }
          }
        ],
        metadata: {
          name: 'Test Revocation List',
          description: 'Test list for import',
          source: 'test'
        }
      };

      await revocationClient.importRevocationList(list);

      const isRevoked1 = await revocationClient.isRevoked('urn:uuid:imported-1');
      const isRevoked2 = await revocationClient.isRevoked('urn:uuid:imported-2');

      expect(isRevoked1).toBe(true);
      expect(isRevoked2).toBe(true);
    });

    it('should export revocation list as JSON', async () => {
      const credentialId = 'urn:uuid:export-test';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:cheqd:testnet:test-issuer',
        revokedDate: new Date().toISOString(),
        reason: 'Export test',
        source: 'manual'
      };

      await revocationClient.addRevokedCredential(credentialId, metadata);
      const exported = await revocationClient.exportRevocationList('json');

      const parsed = JSON.parse(exported);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.revokedCredentials).toHaveLength(1);
      expect(parsed.revokedCredentials[0].credentialId).toBe(credentialId);
      expect(parsed.revokedCredentials[0].metadata.reason).toBe('Export test');
    });

    it('should export revocation list as CSV', async () => {
      const credentialId = 'urn:uuid:csv-export-test';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:cheqd:testnet:test-issuer',
        revokedDate: '2024-01-15T10:00:00Z',
        reason: 'CSV export test',
        source: 'manual'
      };

      await revocationClient.addRevokedCredential(credentialId, metadata);
      const exported = await revocationClient.exportRevocationList('csv');

      expect(exported).toContain('credentialId,issuerDID,revokedDate,reason,source');
      expect(exported).toContain(credentialId);
      expect(exported).toContain('did:cheqd:testnet:test-issuer');
      expect(exported).toContain('2024-01-15T10:00:00Z');
      expect(exported).toContain('CSV export test');
    });
  });

  describe('Provider Integration', () => {
    it('should register and use provider', async () => {
      const mockProvider: RevocationProvider = {
        name: 'test-provider',
        description: 'Test provider for unit tests',
        checkRevocation: jest.fn().mockResolvedValue(true),
        getMetadata: jest.fn().mockResolvedValue({
          issuerDID: 'did:cheqd:testnet:provider-issuer',
          revokedDate: '2024-01-15T10:00:00Z',
          reason: 'Provider revocation',
          source: 'provider'
        }),
        isAvailable: jest.fn().mockResolvedValue(true)
      };

      await revocationClient.registerRevocationProvider(mockProvider);
      const isRevoked = await revocationClient.checkWithProvider('urn:uuid:provider-test', 'test-provider');

      expect(isRevoked).toBe(true);
      expect(mockProvider.checkRevocation).toHaveBeenCalledWith('urn:uuid:provider-test');
    });

    it('should handle unavailable provider', async () => {
      const mockProvider: RevocationProvider = {
        name: 'unavailable-provider',
        description: 'Unavailable provider',
        checkRevocation: jest.fn(),
        getMetadata: jest.fn(),
        isAvailable: jest.fn().mockResolvedValue(false)
      };

      await revocationClient.registerRevocationProvider(mockProvider);

      await expect(
        revocationClient.checkWithProvider('urn:uuid:test', 'unavailable-provider')
      ).rejects.toThrow('Provider unavailable-provider is not available');
    });

    it('should handle non-existent provider', async () => {
      await expect(
        revocationClient.checkWithProvider('urn:uuid:test', 'non-existent')
      ).rejects.toThrow('Provider non-existent not found');
    });

    it('should fallback to providers when not in local list', async () => {
      const mockProvider: RevocationProvider = {
        name: 'fallback-provider',
        description: 'Fallback provider',
        checkRevocation: jest.fn().mockResolvedValue(true),
        getMetadata: jest.fn().mockResolvedValue({
          issuerDID: 'did:cheqd:testnet:fallback-issuer',
          revokedDate: '2024-01-15T10:00:00Z',
          reason: 'Fallback revocation',
          source: 'fallback'
        }),
        isAvailable: jest.fn().mockResolvedValue(true)
      };

      await revocationClient.registerRevocationProvider(mockProvider);
      const status = await revocationClient.checkRevocationStatus('urn:uuid:fallback-test');

      expect(status.isRevoked).toBe(true);
      expect(status.source).toBe('fallback-provider');
      expect(mockProvider.checkRevocation).toHaveBeenCalledWith('urn:uuid:fallback-test');
    });
  });

  describe('Batch Operations', () => {
    it('should perform batch revocation check', async () => {
      const credentialIds = [
        'urn:uuid:batch-1',
        'urn:uuid:batch-2',
        'urn:uuid:batch-3'
      ];

      // Add one revoked credential
      await revocationClient.addRevokedCredential('urn:uuid:batch-2', {
        issuerDID: 'did:cheqd:testnet:test-issuer',
        revokedDate: new Date().toISOString(),
        reason: 'Batch test',
        source: 'manual'
      });

      const result = await revocationClient.batchRevocationCheck(credentialIds);

      expect(result.totalChecked).toBe(3);
      expect(result.revokedCount).toBe(1);
      expect(result.results).toHaveLength(3);
      
      const revokedResult = result.results.find(r => r.credentialId === 'urn:uuid:batch-2');
      expect(revokedResult?.isRevoked).toBe(true);
      
      const nonRevokedResults = result.results.filter(r => r.credentialId !== 'urn:uuid:batch-2');
      expect(nonRevokedResults.every(r => !r.isRevoked)).toBe(true);
    });
  });

  describe('Caching', () => {
    it('should cache revocation status', async () => {
      const credentialId = 'urn:uuid:cache-test';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:cheqd:testnet:test-issuer',
        revokedDate: new Date().toISOString(),
        reason: 'Cache test',
        source: 'manual'
      };

      await revocationClient.addRevokedCredential(credentialId, metadata);
      
      // First check should populate cache
      const status1 = await revocationClient.checkRevocationStatus(credentialId);
      expect(status1.isRevoked).toBe(true);

      // Remove from local list but keep in cache
      await revocationClient.removeRevokedCredential(credentialId);
      
      // Should still return cached result
      const status2 = await revocationClient.checkRevocationStatus(credentialId);
      expect(status2.isRevoked).toBe(true);
    });

    it('should clear cache', async () => {
      const credentialId = 'urn:uuid:clear-cache-test';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:cheqd:testnet:test-issuer',
        revokedDate: new Date().toISOString(),
        reason: 'Clear cache test',
        source: 'manual'
      };

      await revocationClient.addRevokedCredential(credentialId, metadata);
      await revocationClient.checkRevocationStatus(credentialId); // Populate cache
      
      const stats = revocationClient.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      revocationClient.clearCache();
      
      const newStats = revocationClient.getCacheStats();
      expect(newStats.size).toBe(0);
    });

    it('should get cache statistics', async () => {
      const stats = revocationClient.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('ttl');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.ttl).toBe('number');
    });
  });

  describe('Clear Operations', () => {
    it('should clear all data', async () => {
      const credentialId = 'urn:uuid:clear-test';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:cheqd:testnet:test-issuer',
        revokedDate: new Date().toISOString(),
        reason: 'Clear test',
        source: 'manual'
      };

      await revocationClient.addRevokedCredential(credentialId, metadata);
      await revocationClient.checkRevocationStatus(credentialId); // Populate cache
      
      let isRevoked = await revocationClient.isRevoked(credentialId);
      expect(isRevoked).toBe(true);

      revocationClient.clear();
      
      isRevoked = await revocationClient.isRevoked(credentialId);
      expect(isRevoked).toBe(false);
      
      const revokedCredentials = await revocationClient.getRevokedCredentials();
      expect(revokedCredentials).toHaveLength(0);
      
      const stats = revocationClient.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
}); 