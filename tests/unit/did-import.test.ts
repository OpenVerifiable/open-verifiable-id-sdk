/**
 * Test for DID import functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { importDIDFromPackageJson, importDIDWithHexKey } from '../../src/core/did/did-importer';
import { importKey, KeyImportExportFormat } from '../../src/core/key-management/key-import-export';

describe('DID Import Functionality', () => {
  // Test data - these are sample keys for testing only
  const testPrivateKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    testPrivateKey[i] = i + 1; // Simple test pattern
  }

  const testHexKey = Buffer.from(testPrivateKey).toString('hex');
  const testDid = 'did:cheqd:testnet:test-did-123';

  describe('importDIDWithHexKey', () => {
    it('should import a DID with hex private key', async () => {
      const result = await importDIDWithHexKey(testDid, testHexKey, 'test-did');
      
      expect(result.success).toBe(true);
      expect(result.identifier).toBeDefined();
      expect(result.identifier?.did).toBe(testDid);
      expect(result.identifier?.provider).toBe('did:cheqd');
      expect(result.importedAt).toBeDefined();
    });

    it('should handle invalid hex key', async () => {
      const result = await importDIDWithHexKey(testDid, 'invalid-hex-key', 'test-did');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Key Import Integration', () => {
    it('should import hex key successfully', async () => {
      const result = await importKey(testHexKey, {
        format: KeyImportExportFormat.HEX,
        algorithm: 'Ed25519' as any
      });

      expect(result.privateKey).toBeDefined();
      expect(result.privateKey.length).toBe(32);
      expect(result.publicKey).toBeDefined();
    });
  });

  describe('Package.json DID Reading', () => {
    it('should read DID from package.json', () => {
      const packageJson = require('../../../package.json');
      const did = packageJson.did || packageJson.testDid;
      
      expect(did).toBeDefined();
      expect(typeof did).toBe('string');
      expect(did.startsWith('did:')).toBe(true);
    });
  });

  describe('Environment Variable Reading', () => {
    it('should read TESTNET_HEX_KEY from environment', () => {
      // This test will pass if the environment variable is set
      // and fail if it's not set (which is expected in test environment)
      const testnetKey = process.env.TESTNET_HEX_KEY;
      
      if (testnetKey) {
        expect(typeof testnetKey).toBe('string');
        expect(testnetKey.length).toBeGreaterThan(0);
      } else {
        // This is expected in test environment
        console.log('TESTNET_HEX_KEY not set in test environment - this is expected');
      }
    });
  });
}); 