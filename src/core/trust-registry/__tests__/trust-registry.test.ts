/**
 * Trust Registry Tests
 * 
 * Tests for the trust registry system including local trust validation,
 * provider integration, and import/export functionality
 */

import { TrustRegistryClient, defaultTrustRegistry } from '../client';
import { LocalTrustRegistryClient } from '../index';
import type { TrustMetadata, TrustedIssuer, TrustRegistry, TrustRegistryProvider } from '../types';

describe('Trust Registry System', () => {
  let trustClient: TrustRegistryClient;
  let localTrustClient: LocalTrustRegistryClient;

  beforeEach(() => {
    trustClient = new TrustRegistryClient();
    localTrustClient = new LocalTrustRegistryClient();
  });

  describe('TrustRegistryClient', () => {
    describe('Basic Trust Management', () => {
      it('should add a trusted issuer', async () => {
        const issuerDID = 'did:cheqd:testnet:test-issuer-1';
        const metadata: TrustMetadata = {
          name: 'Test Issuer',
          domain: 'test.example.com',
          trustLevel: 'personal',
          addedDate: new Date().toISOString(),
          notes: 'Test issuer for unit tests'
        };

        await trustClient.addTrustedIssuer(issuerDID, metadata);
        const isTrusted = await trustClient.isTrustedIssuer(issuerDID);
        
        expect(isTrusted).toBe(true);
      });

      it('should remove a trusted issuer', async () => {
        const issuerDID = 'did:cheqd:testnet:test-issuer-2';
        const metadata: TrustMetadata = {
          name: 'Test Issuer 2',
          trustLevel: 'personal',
          addedDate: new Date().toISOString()
        };

        await trustClient.addTrustedIssuer(issuerDID, metadata);
        let isTrusted = await trustClient.isTrustedIssuer(issuerDID);
        expect(isTrusted).toBe(true);

        await trustClient.removeTrustedIssuer(issuerDID);
        isTrusted = await trustClient.isTrustedIssuer(issuerDID);
        expect(isTrusted).toBe(false);
      });

      it('should get all trusted issuers', async () => {
        const issuers = [
          {
            did: 'did:cheqd:testnet:issuer-1',
            metadata: { name: 'Issuer 1', trustLevel: 'personal' as const, addedDate: new Date().toISOString() }
          },
          {
            did: 'did:cheqd:testnet:issuer-2',
            metadata: { name: 'Issuer 2', trustLevel: 'verified' as const, addedDate: new Date().toISOString() }
          }
        ];

        for (const issuer of issuers) {
          await trustClient.addTrustedIssuer(issuer.did, issuer.metadata);
        }

        const trustedIssuers = await trustClient.getTrustedIssuers();
        expect(trustedIssuers).toHaveLength(2);
        expect(trustedIssuers.some(i => i.issuerDID === 'did:cheqd:testnet:issuer-1')).toBe(true);
        expect(trustedIssuers.some(i => i.issuerDID === 'did:cheqd:testnet:issuer-2')).toBe(true);
      });
    });

    describe('Issuer Validation', () => {
      it('should validate trusted issuer', async () => {
        const issuerDID = 'did:cheqd:testnet:trusted-issuer';
        const metadata: TrustMetadata = {
          name: 'Trusted Issuer',
          trustLevel: 'verified',
          addedDate: new Date().toISOString()
        };

        await trustClient.addTrustedIssuer(issuerDID, metadata);
        const trustStatus = await trustClient.validateIssuer(issuerDID);

        expect(trustStatus.isTrusted).toBe(true);
        expect(trustStatus.trustLevel).toBe('verified');
        expect(trustStatus.source).toBe('local');
        expect(trustStatus.metadata).toBeDefined();
      });

      it('should return untrusted status for unknown issuer', async () => {
        const issuerDID = 'did:cheqd:testnet:unknown-issuer';
        const trustStatus = await trustClient.validateIssuer(issuerDID);

        expect(trustStatus.isTrusted).toBe(false);
        expect(trustStatus.trustLevel).toBe('unknown');
        expect(trustStatus.source).toBe('local');
        expect(trustStatus.metadata).toBeUndefined();
      });
    });

    describe('Credential Validation', () => {
      it('should validate credential with trusted issuer', async () => {
        const issuerDID = 'did:cheqd:testnet:credential-issuer';
        const metadata: TrustMetadata = {
          name: 'Credential Issuer',
          trustLevel: 'verified',
          addedDate: new Date().toISOString()
        };

        await trustClient.addTrustedIssuer(issuerDID, metadata);

        const credential = {
          id: 'urn:uuid:test-credential',
          issuer: issuerDID,
          credentialSubject: { id: 'did:example:subject' },
          validFrom: new Date().toISOString()
        };

        const result = await trustClient.validateCredential(credential);

        expect(result.isValid).toBe(true);
        expect(result.trustStatus.isTrusted).toBe(true);
        expect(result.validationErrors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('should reject credential with untrusted issuer', async () => {
        const issuerDID = 'did:cheqd:testnet:untrusted-issuer';
        const credential = {
          id: 'urn:uuid:test-credential',
          issuer: issuerDID,
          credentialSubject: { id: 'did:example:subject' },
          validFrom: new Date().toISOString()
        };

        const result = await trustClient.validateCredential(credential);

        expect(result.isValid).toBe(false);
        expect(result.trustStatus.isTrusted).toBe(false);
        expect(result.warnings.some(w => w.includes('not in trust registry'))).toBe(true);
      });

      it('should handle credential with missing issuer', async () => {
        const credential = {
          id: 'urn:uuid:test-credential',
          credentialSubject: { id: 'did:example:subject' },
          validFrom: new Date().toISOString()
        };

        const result = await trustClient.validateCredential(credential);

        expect(result.isValid).toBe(false);
        expect(result.validationErrors.some(e => e.includes('issuer not found'))).toBe(true);
      });
    });

    describe('Import/Export', () => {
      it('should import trust registry', async () => {
        const registry: TrustRegistry = {
          version: '1.0.0',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          issuers: [
            {
              issuerDID: 'did:cheqd:testnet:imported-1',
              metadata: {
                name: 'Imported Issuer 1',
                trustLevel: 'community',
                addedDate: new Date().toISOString()
              }
            },
            {
              issuerDID: 'did:cheqd:testnet:imported-2',
              metadata: {
                name: 'Imported Issuer 2',
                trustLevel: 'verified',
                addedDate: new Date().toISOString()
              }
            }
          ],
          metadata: {
            name: 'Test Registry',
            description: 'Test registry for import',
            source: 'test'
          }
        };

        await trustClient.importTrustRegistry(registry);

        const isTrusted1 = await trustClient.isTrustedIssuer('did:cheqd:testnet:imported-1');
        const isTrusted2 = await trustClient.isTrustedIssuer('did:cheqd:testnet:imported-2');

        expect(isTrusted1).toBe(true);
        expect(isTrusted2).toBe(true);
      });

      it('should export trust registry as JSON', async () => {
        const issuerDID = 'did:cheqd:testnet:export-issuer';
        const metadata: TrustMetadata = {
          name: 'Export Issuer',
          trustLevel: 'personal',
          addedDate: new Date().toISOString()
        };

        await trustClient.addTrustedIssuer(issuerDID, metadata);
        const exported = await trustClient.exportTrustRegistry('json');

        const parsed = JSON.parse(exported);
        expect(parsed.version).toBe('1.0.0');
        expect(parsed.issuers).toHaveLength(1);
        expect(parsed.issuers[0].issuerDID).toBe(issuerDID);
        expect(parsed.issuers[0].metadata.name).toBe('Export Issuer');
      });

      it('should export trust registry as CSV', async () => {
        const issuerDID = 'did:cheqd:testnet:csv-issuer';
        const metadata: TrustMetadata = {
          name: 'CSV Issuer',
          domain: 'csv.example.com',
          trustLevel: 'verified',
          addedDate: new Date().toISOString()
        };

        await trustClient.addTrustedIssuer(issuerDID, metadata);
        const exported = await trustClient.exportTrustRegistry('csv');

        expect(exported).toContain('issuerDID,name,domain,trustLevel,addedDate,source');
        expect(exported).toContain(issuerDID);
        expect(exported).toContain('CSV Issuer');
        expect(exported).toContain('csv.example.com');
        expect(exported).toContain('verified');
      });
    });

    describe('Provider Integration', () => {
      it('should register and use provider', async () => {
        const mockProvider: TrustRegistryProvider = {
          name: 'test-provider',
          description: 'Test provider for unit tests',
          validate: jest.fn().mockResolvedValue(true),
          getMetadata: jest.fn().mockResolvedValue({
            name: 'Provider Issuer',
            trustLevel: 'provider',
            addedDate: new Date().toISOString()
          }),
          isAvailable: jest.fn().mockResolvedValue(true)
        };

        await trustClient.registerTrustRegistryProvider(mockProvider);
        const isValid = await trustClient.validateWithProvider('did:cheqd:testnet:provider-issuer', 'test-provider');

        expect(isValid).toBe(true);
        expect(mockProvider.validate).toHaveBeenCalledWith('did:cheqd:testnet:provider-issuer');
      });

      it('should handle unavailable provider', async () => {
        const mockProvider: TrustRegistryProvider = {
          name: 'unavailable-provider',
          description: 'Unavailable provider',
          validate: jest.fn(),
          getMetadata: jest.fn(),
          isAvailable: jest.fn().mockResolvedValue(false)
        };

        await trustClient.registerTrustRegistryProvider(mockProvider);

        await expect(
          trustClient.validateWithProvider('did:cheqd:testnet:test', 'unavailable-provider')
        ).rejects.toThrow('Provider unavailable-provider is not available');
      });

      it('should handle non-existent provider', async () => {
        await expect(
          trustClient.validateWithProvider('did:cheqd:testnet:test', 'non-existent')
        ).rejects.toThrow('Provider non-existent not found');
      });
    });
  });

  describe('LocalTrustRegistryClient', () => {
    describe('Enhanced Validation', () => {
      it('should validate credential with enhanced validation', async () => {
        const issuerDID = 'did:cheqd:testnet:enhanced-issuer';
        const metadata: TrustMetadata = {
          name: 'Enhanced Issuer',
          trustLevel: 'verified',
          addedDate: new Date().toISOString()
        };

        await localTrustClient.addTrustedIssuer(issuerDID, metadata);

        const credential = {
          id: 'urn:uuid:enhanced-credential',
          issuer: issuerDID,
          credentialSubject: { id: 'did:example:subject' },
          validFrom: new Date().toISOString()
        };

        const result = await localTrustClient.validateCredential(credential);

        expect(result.isValid).toBe(true);
        expect(result.trustStatus.isTrusted).toBe(true);
        expect(result.validationErrors).toHaveLength(0);
      });

      it('should reject credential with missing required fields', async () => {
        const credential = {
          issuer: 'did:cheqd:testnet:test',
          credentialSubject: { id: 'did:example:subject' }
          // Missing id and validFrom
        };

        const result = await localTrustClient.validateCredential(credential);

        expect(result.isValid).toBe(false);
        expect(result.validationErrors.some(e => e.includes('Missing credential id'))).toBe(true);
        expect(result.validationErrors.some(e => e.includes('Missing issuer field'))).toBe(false); // issuer is present
      });
    });

    describe('Provider Fallback', () => {
      it('should fallback to providers when issuer not in local registry', async () => {
        const mockProvider: TrustRegistryProvider = {
          name: 'fallback-provider',
          description: 'Fallback provider',
          validate: jest.fn().mockResolvedValue(true),
          getMetadata: jest.fn().mockResolvedValue({
            name: 'Provider Issuer',
            trustLevel: 'provider',
            addedDate: new Date().toISOString()
          }),
          isAvailable: jest.fn().mockResolvedValue(true)
        };

        await localTrustClient.registerTrustRegistryProvider(mockProvider);
        const trustStatus = await localTrustClient.validateIssuer('did:cheqd:testnet:provider-issuer');

        expect(trustStatus.isTrusted).toBe(true);
        expect(trustStatus.source).toBe('fallback-provider');
        expect(mockProvider.validate).toHaveBeenCalledWith('did:cheqd:testnet:provider-issuer');
      });

      it('should handle provider failures gracefully', async () => {
        const mockProvider: TrustRegistryProvider = {
          name: 'failing-provider',
          description: 'Failing provider',
          validate: jest.fn().mockRejectedValue(new Error('Provider error')),
          getMetadata: jest.fn(),
          isAvailable: jest.fn().mockResolvedValue(true)
        };

        await localTrustClient.registerTrustRegistryProvider(mockProvider);
        const trustStatus = await localTrustClient.validateIssuer('did:cheqd:testnet:test');

        expect(trustStatus.isTrusted).toBe(false);
        expect(trustStatus.trustLevel).toBe('unknown');
      });
    });
  });

  describe('Default Trust Registry', () => {
    it('should have default trusted issuers', () => {
      expect(defaultTrustRegistry.version).toBe('1.0.0');
      expect(defaultTrustRegistry.issuers).toHaveLength(1);
      expect(defaultTrustRegistry.issuers[0].issuerDID).toBe('did:cheqd:mainnet:a11f08bc-568c-5ecd-b5c8-7ff15c9d3892');
      expect(defaultTrustRegistry.issuers[0].metadata.name).toBe('OriginVault');
      expect(defaultTrustRegistry.issuers[0].metadata.trustLevel).toBe('verified');
    });

    it('should import default trust registry', async () => {
      await trustClient.importTrustRegistry(defaultTrustRegistry);
      const isTrusted = await trustClient.isTrustedIssuer('did:cheqd:mainnet:a11f08bc-568c-5ecd-b5c8-7ff15c9d3892');
      
      expect(isTrusted).toBe(true);
    });
  });
}); 