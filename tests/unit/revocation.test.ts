/**
 * Revocation Client Unit Tests
 * 
 * Tests for the RevocationClient implementation following ADR-0003
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  RevocationClient, 
  RevocationMetadata, 
  RevokedCredential,
  RevocationStatus,
  ValidationResult,
  RevocationList,
  RevocationProvider,
  BatchRevocationResult
} from '../../src/core/revocation/client';

describe('RevocationClient', () => {

  describe('addRevokedCredential', () => {
    it('should add a revoked credential to the local list', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentialId = 'urn:uuid:12345678-1234-1234-1234-123456789abc';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:cheqd:mainnet:test-issuer',
        revokedDate: '2025-01-14T10:00:00Z',
        reason: 'Compromised private key',
        source: 'manual'
      };

      await testClient.addRevokedCredential(credentialId, metadata);
      
      const isRevoked = await testClient.isRevoked(credentialId);
      expect(isRevoked).toBe(true);
      
      const revokedCredentials = await testClient.getRevokedCredentials();
      expect(revokedCredentials).toHaveLength(1);
      expect(revokedCredentials[0].credentialId).toBe(credentialId);
      expect(revokedCredentials[0].metadata.issuerDID).toBe(metadata.issuerDID);
    });

    it('should update lastChecked timestamp when adding credential', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentialId = 'urn:uuid:test-credential';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:test:issuer',
        revokedDate: '2025-01-14T10:00:00Z',
        source: 'manual'
      };

      await testClient.addRevokedCredential(credentialId, metadata);
      
      const revokedCredentials = await testClient.getRevokedCredentials();
      const addedCredential = revokedCredentials[0];
      
      expect(addedCredential.metadata.lastChecked).toBeDefined();
      expect(new Date(addedCredential.metadata.lastChecked!).getTime()).toBeGreaterThan(
        new Date('2025-01-14T10:00:00Z').getTime()
      );
    });
  });

  describe('removeRevokedCredential', () => {
    it('should remove a revoked credential from the local list', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentialId = 'urn:uuid:test-credential';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:test:issuer',
        revokedDate: '2025-01-14T10:00:00Z',
        source: 'manual'
      };

      await testClient.addRevokedCredential(credentialId, metadata);
      expect(await testClient.isRevoked(credentialId)).toBe(true);

      await testClient.removeRevokedCredential(credentialId);
      expect(await testClient.isRevoked(credentialId)).toBe(false);
      
      const revokedCredentials = await testClient.getRevokedCredentials();
      expect(revokedCredentials).toHaveLength(0);
    });
  });

  describe('getRevokedCredentials', () => {
    it('should return all revoked credentials', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentials = [
        { id: 'cred-1', issuer: 'did:test:issuer1' },
        { id: 'cred-2', issuer: 'did:test:issuer2' },
        { id: 'cred-3', issuer: 'did:test:issuer3' }
      ];

      for (const cred of credentials) {
        await testClient.addRevokedCredential(cred.id, {
          issuerDID: cred.issuer,
          revokedDate: '2025-01-14T10:00:00Z',
          source: 'manual'
        });
      }

      const revokedCredentials = await testClient.getRevokedCredentials();
      expect(revokedCredentials).toHaveLength(3);
      
      const credentialIds = revokedCredentials.map(rc => rc.credentialId);
      expect(credentialIds).toContain('cred-1');
      expect(credentialIds).toContain('cred-2');
      expect(credentialIds).toContain('cred-3');
    });

    it('should return empty array when no credentials are revoked', async () => {
      // Use a fresh client to ensure no state leakage
      const testClient = new RevocationClient();
      testClient.clear();
      const revokedCredentials = await testClient.getRevokedCredentials();
      expect(revokedCredentials).toHaveLength(0);
    });
  });

  describe('isRevoked', () => {
    it('should return true for revoked credentials', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentialId = 'urn:uuid:revoked-credential';
      await testClient.addRevokedCredential(credentialId, {
        issuerDID: 'did:test:issuer',
        revokedDate: '2025-01-14T10:00:00Z',
        source: 'manual'
      });

      const isRevoked = await testClient.isRevoked(credentialId);
      expect(isRevoked).toBe(true);
    });

    it('should return false for non-revoked credentials', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentialId = 'urn:uuid:valid-credential';
      const isRevoked = await testClient.isRevoked(credentialId);
      expect(isRevoked).toBe(false);
    });
  });

  describe('checkRevocationStatus', () => {
    it('should return revocation status for revoked credential', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentialId = 'urn:uuid:revoked-credential';
      const metadata: RevocationMetadata = {
        issuerDID: 'did:test:issuer',
        revokedDate: '2025-01-14T10:00:00Z',
        reason: 'Security breach',
        source: 'manual'
      };

      await testClient.addRevokedCredential(credentialId, metadata);
      
      const status = await testClient.checkRevocationStatus(credentialId);
      
      expect(status.isRevoked).toBe(true);
      expect(status.revokedDate).toBe(metadata.revokedDate);
      expect(status.reason).toBe(metadata.reason);
      expect(status.source).toBe('local');
      // Check that metadata contains the original data plus lastChecked
      expect(status.metadata?.issuerDID).toBe(metadata.issuerDID);
      expect(status.metadata?.revokedDate).toBe(metadata.revokedDate);
      expect(status.metadata?.reason).toBe(metadata.reason);
      expect(status.metadata?.source).toBe(metadata.source);
      expect(status.metadata?.lastChecked).toBeDefined();
    });

    it('should return non-revoked status for valid credential', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentialId = 'urn:uuid:valid-credential';
      
      const status = await testClient.checkRevocationStatus(credentialId);
      
      expect(status.isRevoked).toBe(false);
      expect(status.source).toBe('local');
      expect(status.lastChecked).toBeDefined();
    });

    it('should use cache for repeated checks', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentialId = 'urn:uuid:cached-credential';
      
      // First check
      const status1 = await testClient.checkRevocationStatus(credentialId);
      
      // Second check should use cache
      const status2 = await testClient.checkRevocationStatus(credentialId);
      
      expect(status1.isRevoked).toBe(status2.isRevoked);
      expect(status1.lastChecked).toBe(status2.lastChecked);
    });
  });

  describe('validateCredential', () => {
    it('should validate credential with revocation check', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credential = {
        id: 'urn:uuid:test-credential',
        type: ['VerifiableCredential'],
        issuer: 'did:test:issuer'
      };

      const result = await testClient.validateCredential(credential);
      
      expect(result.isValid).toBe(true);
      expect(result.revocationStatus.isRevoked).toBe(false);
      expect(result.validationErrors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect revoked credentials', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentialId = 'urn:uuid:revoked-credential';
      const credential = {
        id: credentialId,
        type: ['VerifiableCredential'],
        issuer: 'did:test:issuer'
      };

      await testClient.addRevokedCredential(credentialId, {
        issuerDID: 'did:test:issuer',
        revokedDate: '2025-01-14T10:00:00Z',
        source: 'manual'
      });

      const result = await testClient.validateCredential(credential);
      
      expect(result.isValid).toBe(false);
      expect(result.revocationStatus.isRevoked).toBe(true);
      expect(result.warnings).toContain('Credential has been revoked');
    });

    it('should handle invalid credentials', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const invalidCredential = { type: ['VerifiableCredential'] }; // Missing id
      
      const result = await testClient.validateCredential(invalidCredential);
      
      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toContain('Invalid credential: missing id');
    });

    it('should handle null/undefined credentials', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const result = await testClient.validateCredential(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toContain('Invalid credential: missing id');
    });
  });

  describe('importRevocationList', () => {
    it('should import revocation list from external source', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const revocationList: RevocationList = {
        version: '1.0.0',
        created: '2025-01-14T10:00:00Z',
        updated: '2025-01-14T10:00:00Z',
        issuerDID: 'did:test:issuer',
        revokedCredentials: [
          {
            credentialId: 'cred-1',
            metadata: {
              issuerDID: 'did:test:issuer',
              revokedDate: '2025-01-14T10:00:00Z',
              source: 'external'
            }
          },
          {
            credentialId: 'cred-2',
            metadata: {
              issuerDID: 'did:test:issuer',
              revokedDate: '2025-01-14T11:00:00Z',
              reason: 'Compromised',
              source: 'external'
            }
          }
        ],
        metadata: {
          name: 'External Revocation List',
          source: 'external'
        }
      };

      await testClient.importRevocationList(revocationList);
      
      expect(await testClient.isRevoked('cred-1')).toBe(true);
      expect(await testClient.isRevoked('cred-2')).toBe(true);
      
      const revokedCredentials = await testClient.getRevokedCredentials();
      expect(revokedCredentials).toHaveLength(2);
    });
  });

  describe('exportRevocationList', () => {
    it('should export revocation list in JSON format', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      await testClient.addRevokedCredential('cred-1', {
        issuerDID: 'did:test:issuer',
        revokedDate: '2025-01-14T10:00:00Z',
        source: 'manual'
      });

      const exported = await testClient.exportRevocationList('json');
      const parsed = JSON.parse(exported);
      
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.revokedCredentials).toHaveLength(1);
      expect(parsed.revokedCredentials[0].credentialId).toBe('cred-1');
    });

    it('should export revocation list in CSV format', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      await testClient.addRevokedCredential('cred-1', {
        issuerDID: 'did:test:issuer',
        revokedDate: '2025-01-14T10:00:00Z',
        reason: 'Test reason',
        source: 'manual'
      });

      const exported = await testClient.exportRevocationList('csv');
      const lines = exported.split('\n');
      
      expect(lines[0]).toBe('credentialId,issuerDID,revokedDate,reason,source');
      expect(lines[1]).toContain('cred-1');
      expect(lines[1]).toContain('did:test:issuer');
      expect(lines[1]).toContain('Test reason');
    });

    it('should handle empty revocation list', async () => {
      // Use a fresh client to ensure no state leakage
      const testClient = new RevocationClient();
      testClient.clear();
      const exported = await testClient.exportRevocationList('json');
      const parsed = JSON.parse(exported);
      expect(parsed.revokedCredentials).toHaveLength(0);
    });
  });

  describe('provider integration', () => {
    it('should register and use revocation provider', async () => {
      // Use a fresh client to ensure no state leakage
      const testClient = new RevocationClient();
      testClient.clear();
      testClient.clearCache(); // Explicitly clear cache
      
      const credentialId = 'urn:uuid:provider-check';
      
      // Create fresh mocks for this specific test
      const mockCheckRevocation = vi.fn().mockResolvedValue(true);
      const mockGetMetadata = vi.fn().mockResolvedValue({
        issuerDID: 'did:test:issuer',
        revokedDate: '2025-01-14T10:00:00Z',
        reason: 'Provider detected revocation',
        source: 'test-provider'
      });
      const mockIsAvailable = vi.fn().mockResolvedValue(true);
      
      const testProvider: RevocationProvider = {
        name: 'test-provider',
        description: 'Test revocation provider',
        checkRevocation: mockCheckRevocation,
        getMetadata: mockGetMetadata,
        isAvailable: mockIsAvailable
      };

      await testClient.registerRevocationProvider(testProvider);
      
      // Verify provider is registered
      const result = await testClient.checkWithProvider(credentialId, 'test-provider');
      expect(result).toBe(true);
      expect(mockCheckRevocation).toHaveBeenCalledWith(credentialId);
      
      // Now test the full checkRevocationStatus method
      const status = await testClient.checkRevocationStatus(credentialId);
      
      expect(status.isRevoked).toBe(true);
      expect(status.source).toBe('test-provider');
    });

    it('should handle provider unavailability gracefully', async () => {
      // Use a fresh client to ensure no state leakage
      const testClient = new RevocationClient();
      testClient.clear();
      testClient.clearCache(); // Explicitly clear cache
      
      const credentialId = 'urn:uuid:unavailable-provider';
      
      // Create fresh mocks for this specific test
      const mockCheckRevocation = vi.fn();
      const mockGetMetadata = vi.fn();
      const mockIsAvailable = vi.fn().mockResolvedValue(false);
      
      const testProvider: RevocationProvider = {
        name: 'test-provider',
        description: 'Test revocation provider',
        checkRevocation: mockCheckRevocation,
        getMetadata: mockGetMetadata,
        isAvailable: mockIsAvailable
      };
      
      await testClient.registerRevocationProvider(testProvider);
      
      const status = await testClient.checkRevocationStatus(credentialId);
      
      expect(status.isRevoked).toBe(false);
      expect(status.source).toBe('local');
      expect(mockCheckRevocation).not.toHaveBeenCalled();
    });

    it('should handle provider errors gracefully', async () => {
      // Use a fresh client to ensure no state leakage
      const testClient = new RevocationClient();
      testClient.clear();
      testClient.clearCache(); // Explicitly clear cache
      
      const credentialId = 'urn:uuid:error-provider';
      
      // Create fresh mocks for this specific test
      const mockCheckRevocation = vi.fn().mockRejectedValue(new Error('Provider error'));
      const mockGetMetadata = vi.fn();
      const mockIsAvailable = vi.fn().mockResolvedValue(true);
      
      const testProvider: RevocationProvider = {
        name: 'test-provider',
        description: 'Test revocation provider',
        checkRevocation: mockCheckRevocation,
        getMetadata: mockGetMetadata,
        isAvailable: mockIsAvailable
      };
      
      await testClient.registerRevocationProvider(testProvider);
      
      const status = await testClient.checkRevocationStatus(credentialId);
      
      expect(status.isRevoked).toBe(false);
      expect(status.source).toBe('local');
    });

    it('should check with specific provider', async () => {
      // Use a fresh client to ensure no state leakage
      const testClient = new RevocationClient();
      testClient.clear();
      testClient.clearCache(); // Explicitly clear cache
      
      const credentialId = 'urn:uuid:specific-provider';
      
      // Create fresh mocks for this specific test
      const mockCheckRevocation = vi.fn().mockResolvedValue(true);
      const mockGetMetadata = vi.fn();
      const mockIsAvailable = vi.fn().mockResolvedValue(true);
      
      const testProvider: RevocationProvider = {
        name: 'test-provider',
        description: 'Test revocation provider',
        checkRevocation: mockCheckRevocation,
        getMetadata: mockGetMetadata,
        isAvailable: mockIsAvailable
      };
      
      await testClient.registerRevocationProvider(testProvider);
      
      const result = await testClient.checkWithProvider(credentialId, 'test-provider');
      
      expect(result).toBe(true);
      expect(mockCheckRevocation).toHaveBeenCalledWith(credentialId);
    });

    it('should throw error for unknown provider', async () => {
      // Use a fresh client to ensure no state leakage
      const testClient = new RevocationClient();
      testClient.clear();
      testClient.clearCache(); // Explicitly clear cache
      
      await expect(
        testClient.checkWithProvider('cred-id', 'unknown-provider')
      ).rejects.toThrow('Provider unknown-provider not found');
    });
  });

  describe('batchRevocationCheck', () => {
    it('should check multiple credentials for revocation', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentialIds = ['cred-1', 'cred-2', 'cred-3'];
      
      // Add one revoked credential
      await testClient.addRevokedCredential('cred-2', {
        issuerDID: 'did:test:issuer',
        revokedDate: '2025-01-14T10:00:00Z',
        source: 'manual'
      });

      const result = await testClient.batchRevocationCheck(credentialIds);
      
      expect(result.totalChecked).toBe(3);
      expect(result.revokedCount).toBe(1);
      expect(result.results).toHaveLength(3);
      
      const revokedResult = result.results.find(r => r.credentialId === 'cred-2');
      expect(revokedResult?.isRevoked).toBe(true);
      
      const validResults = result.results.filter(r => r.credentialId !== 'cred-2');
      validResults.forEach(r => {
        expect(r.isRevoked).toBe(false);
      });
    });

    it('should handle empty credential list', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const result = await testClient.batchRevocationCheck([]);
      
      expect(result.totalChecked).toBe(0);
      expect(result.revokedCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      testClient.clearCache();
      
      const stats = testClient.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should return cache statistics', () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const stats = testClient.getCacheStats();
      
      expect(stats.size).toBe(0);
      expect(stats.ttl).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should invalidate cache when adding revoked credential', async () => {
      // Create a fresh client for this specific test
      const testClient = new RevocationClient();
      testClient.clear();
      
      const credentialId = 'urn:uuid:cache-test';
      
      // First check to populate cache
      await testClient.checkRevocationStatus(credentialId);
      expect(testClient.getCacheStats().size).toBe(1);
      
      // Add revoked credential should clear cache for that credential
      await testClient.addRevokedCredential(credentialId, {
        issuerDID: 'did:test:issuer',
        revokedDate: '2025-01-14T10:00:00Z',
        source: 'manual'
      });
      
      // Cache should be updated with new status
      const status = await testClient.checkRevocationStatus(credentialId);
      expect(status.isRevoked).toBe(true);
    });
  });
}); 