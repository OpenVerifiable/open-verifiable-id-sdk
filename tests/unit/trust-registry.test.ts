/**
 * Trust Registry Client Unit Tests
 * Following ADR-0009: Testing & Validation Strategy
 * Using TDD methodology from ADR-0022
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  TrustRegistryClient, 
  TrustMetadata, 
  TrustedIssuer,
  TrustStatus,
  ValidationResult,
  TrustRegistry,
  TrustRegistryProvider,
  defaultTrustRegistry
} from '../../src/core/trust-registry/client';

describe('TrustRegistryClient', () => {
  let client: TrustRegistryClient;
  let mockProvider: TrustRegistryProvider;

  beforeEach(() => {
    client = new TrustRegistryClient();
    
    mockProvider = {
      name: 'test-provider',
      description: 'Test provider for unit tests',
      validate: vi.fn().mockResolvedValue(true),
      getMetadata: vi.fn().mockResolvedValue({
        name: 'Test Issuer',
        domain: 'test.example.com',
        addedDate: new Date().toISOString(),
        trustLevel: 'verified',
        source: 'test-provider'
      }),
      isAvailable: vi.fn().mockResolvedValue(true)
    };
  });

  describe('addTrustedIssuer', () => {
    it('should add a trusted issuer with metadata', async () => {
      const issuerDID = 'did:key:test001';
      const metadata: TrustMetadata = {
        name: 'Test Issuer',
        domain: 'test.example.com',
        addedDate: new Date().toISOString(),
        trustLevel: 'personal',
        notes: 'Added for testing'
      };

      await client.addTrustedIssuer(issuerDID, metadata);
      const isTrusted = await client.isTrustedIssuer(issuerDID);
      
      expect(isTrusted).toBe(true);
    });

    it('should add default addedDate if not provided', async () => {
      const issuerDID = 'did:key:test002';
      const metadata: TrustMetadata = {
        name: 'Test Issuer',
        trustLevel: 'personal'
      };

      await client.addTrustedIssuer(issuerDID, metadata);
      const issuers = await client.getTrustedIssuers();
      const addedIssuer = issuers.find(i => i.issuerDID === issuerDID);
      
      expect(addedIssuer?.metadata.addedDate).toBeDefined();
      expect(new Date(addedIssuer!.metadata.addedDate!)).toBeInstanceOf(Date);
    });

    it('should handle duplicate issuer additions gracefully', async () => {
      const issuerDID = 'did:key:test003';
      const metadata1: TrustMetadata = {
        name: 'Original Name',
        trustLevel: 'personal'
      };
      const metadata2: TrustMetadata = {
        name: 'Updated Name',
        trustLevel: 'verified'
      };

      await client.addTrustedIssuer(issuerDID, metadata1);
      await client.addTrustedIssuer(issuerDID, metadata2);
      
      const issuers = await client.getTrustedIssuers();
      const addedIssuer = issuers.find(i => i.issuerDID === issuerDID);
      
      expect(addedIssuer?.metadata.name).toBe('Updated Name');
      expect(addedIssuer?.metadata.trustLevel).toBe('verified');
    });
  });

  describe('removeTrustedIssuer', () => {
    it('should remove a trusted issuer', async () => {
      const issuerDID = 'did:key:test004';
      const metadata: TrustMetadata = {
        name: 'Test Issuer',
        trustLevel: 'personal'
      };

      await client.addTrustedIssuer(issuerDID, metadata);
      expect(await client.isTrustedIssuer(issuerDID)).toBe(true);

      await client.removeTrustedIssuer(issuerDID);
      expect(await client.isTrustedIssuer(issuerDID)).toBe(false);
    });

    it('should handle removal of non-existent issuer gracefully', async () => {
      const issuerDID = 'did:key:nonexistent';
      
      await expect(client.removeTrustedIssuer(issuerDID)).resolves.not.toThrow();
    });
  });

  describe('getTrustedIssuers', () => {
    it('should return empty array when no issuers are added', async () => {
      const issuers = await client.getTrustedIssuers();
      expect(issuers).toEqual([]);
    });

    it('should return all added trusted issuers', async () => {
      const issuer1 = {
        did: 'did:key:test005',
        metadata: { name: 'Issuer 1', trustLevel: 'personal' as const }
      };
      const issuer2 = {
        did: 'did:key:test006',
        metadata: { name: 'Issuer 2', trustLevel: 'verified' as const }
      };

      await client.addTrustedIssuer(issuer1.did, issuer1.metadata);
      await client.addTrustedIssuer(issuer2.did, issuer2.metadata);

      const issuers = await client.getTrustedIssuers();
      expect(issuers).toHaveLength(2);
      expect(issuers.map(i => i.issuerDID)).toContain(issuer1.did);
      expect(issuers.map(i => i.issuerDID)).toContain(issuer2.did);
    });
  });

  describe('validateIssuer', () => {
    it('should return trusted status for known issuer', async () => {
      const issuerDID = 'did:key:test123';
      const metadata: TrustMetadata = {
        name: 'Test Issuer',
        trustLevel: 'verified',
        addedDate: new Date().toISOString()
      };

      await client.addTrustedIssuer(issuerDID, metadata);
      const status = await client.validateIssuer(issuerDID);

      expect(status.isTrusted).toBe(true);
      expect(status.trustLevel).toBe('verified');
      expect(status.source).toBe('local');
    });

    it('should return untrusted status for unknown issuer', async () => {
      const issuerDID = 'did:key:unknown';
      const status = await client.validateIssuer(issuerDID);

      expect(status.isTrusted).toBe(false);
      expect(status.trustLevel).toBe('unknown');
      expect(status.source).toBe('local');
    });

    it('should use current timestamp for lastValidated if not provided', async () => {
      const issuerDID = 'did:key:test456';
      const metadata: TrustMetadata = {
        name: 'Test Issuer',
        trustLevel: 'personal'
      };

      await client.addTrustedIssuer(issuerDID, metadata);
      const status = await client.validateIssuer(issuerDID);

      expect(status.lastValidated).toBeDefined();
      expect(new Date(status.lastValidated)).toBeInstanceOf(Date);
    });
  });

  describe('validateCredential', () => {
    it('should validate credential with trusted issuer', async () => {
      const issuerDID = 'did:key:test007';
      const metadata: TrustMetadata = {
        name: 'Test Issuer',
        trustLevel: 'verified'
      };

      await client.addTrustedIssuer(issuerDID, metadata);

      const credential = {
        id: 'urn:uuid:test-credential',
        issuer: issuerDID,
        type: ['VerifiableCredential'],
        validFrom: new Date().toISOString()
      };

      const result = await client.validateCredential(credential);

      expect(result.isValid).toBe(true);
      expect(result.trustStatus.isTrusted).toBe(true);
      expect(result.validationErrors).toEqual([]);
    });

    it('should reject credential with untrusted issuer', async () => {
      const credential = {
        id: 'urn:uuid:test-credential',
        issuer: 'did:key:untrusted',
        type: ['VerifiableCredential'],
        validFrom: new Date().toISOString()
      };

      const result = await client.validateCredential(credential);

      expect(result.isValid).toBe(false);
      expect(result.trustStatus.isTrusted).toBe(false);
      expect(result.warnings).toContain('Issuer not in trust registry');
    });

    it('should handle credential with issuer object', async () => {
      const issuerDID = 'did:key:test008';
      const metadata: TrustMetadata = {
        name: 'Test Issuer',
        trustLevel: 'verified'
      };

      await client.addTrustedIssuer(issuerDID, metadata);

      const credential = {
        id: 'urn:uuid:test-credential',
        issuer: { id: issuerDID },
        type: ['VerifiableCredential'],
        validFrom: new Date().toISOString()
      };

      const result = await client.validateCredential(credential);

      expect(result.isValid).toBe(true);
      expect(result.trustStatus.isTrusted).toBe(true);
    });

    it('should handle credential without issuer', async () => {
      const credential = {
        id: 'urn:uuid:test-credential',
        type: ['VerifiableCredential'],
        validFrom: new Date().toISOString()
      };

      const result = await client.validateCredential(credential);

      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toContain('Credential issuer not found');
    });
  });

  describe('importTrustRegistry', () => {
    it('should import external trust registry', async () => {
      const externalRegistry: TrustRegistry = {
        version: '1.0.0',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        issuers: [
          {
            issuerDID: 'did:key:external1',
            metadata: {
              name: 'External Issuer 1',
              trustLevel: 'community',
              addedDate: new Date().toISOString()
            }
          },
          {
            issuerDID: 'did:key:external2',
            metadata: {
              name: 'External Issuer 2',
              trustLevel: 'verified',
              addedDate: new Date().toISOString()
            }
          }
        ],
        metadata: {
          name: 'External Registry',
          source: 'external'
        }
      };

      await client.importTrustRegistry(externalRegistry);

      const issuers = await client.getTrustedIssuers();
      expect(issuers).toHaveLength(2);
      expect(issuers.map(i => i.issuerDID)).toContain('did:key:external1');
      expect(issuers.map(i => i.issuerDID)).toContain('did:key:external2');
    });
  });

  describe('exportTrustRegistry', () => {
    it('should export registry in JSON format', async () => {
      const issuerDID = 'did:key:test009';
      const metadata: TrustMetadata = {
        name: 'Test Issuer',
        trustLevel: 'personal'
      };

      await client.addTrustedIssuer(issuerDID, metadata);
      const exported = await client.exportTrustRegistry('json');

      const parsed = JSON.parse(exported);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.issuers).toHaveLength(1);
      expect(parsed.issuers[0].issuerDID).toBe(issuerDID);
    });

    it('should export registry in CSV format', async () => {
      const issuerDID = 'did:key:test010';
      const metadata: TrustMetadata = {
        name: 'Test Issuer',
        domain: 'test.example.com',
        trustLevel: 'personal'
      };

      await client.addTrustedIssuer(issuerDID, metadata);
      const exported = await client.exportTrustRegistry('csv');

      expect(exported).toContain('issuerDID,name,domain,trustLevel,addedDate,source');
      expect(exported).toContain(issuerDID);
      expect(exported).toContain('Test Issuer');
    });
  });

  describe('registerTrustRegistryProvider', () => {
    it('should register a trust registry provider', async () => {
      await client.registerTrustRegistryProvider(mockProvider);
      
      // Test that provider is available
      const result = await client.validateWithProvider('did:key:test', 'test-provider');
      expect(result).toBe(true);
    });

    it('should throw error for unknown provider', async () => {
      await expect(
        client.validateWithProvider('did:key:test', 'unknown-provider')
      ).rejects.toThrow('Provider unknown-provider not found');
    });

    it('should throw error for unavailable provider', async () => {
      const unavailableProvider = {
        ...mockProvider,
        isAvailable: vi.fn().mockResolvedValue(false)
      };

      await client.registerTrustRegistryProvider(unavailableProvider);
      
      await expect(
        client.validateWithProvider('did:key:test', 'test-provider')
      ).rejects.toThrow('Provider test-provider is not available');
    });
  });

  describe('defaultTrustRegistry', () => {
    it('should contain OriginVault as default trusted issuer', () => {
      expect(defaultTrustRegistry.issuers).toHaveLength(1);
      expect(defaultTrustRegistry.issuers[0].issuerDID).toBe(
        'did:cheqd:mainnet:a11f08bc-568c-5ecd-b5c8-7ff15c9d3892'
      );
      expect(defaultTrustRegistry.issuers[0].metadata.name).toBe('OriginVault');
      expect(defaultTrustRegistry.issuers[0].metadata.trustLevel).toBe('verified');
    });

    it('should have proper metadata structure', () => {
      expect(defaultTrustRegistry.version).toBe('1.0.0');
      expect(defaultTrustRegistry.metadata.name).toBe('ov-id-sdk Default Trust Registry');
      expect(defaultTrustRegistry.metadata.source).toBe('ov-id-sdk');
      expect(defaultTrustRegistry.metadata.maintainer).toBe('OriginVault');
    });
  });
}); 