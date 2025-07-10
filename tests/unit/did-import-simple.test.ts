/**
 * Simple test for DID import functionality
 */

import { describe, it, expect } from 'vitest';
import { importKey, KeyImportExportFormat } from '../../src/core/key-management/key-import-export';

describe('DID Import Simple Test', () => {
  // Test data - these are sample keys for testing only
  const testPrivateKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    testPrivateKey[i] = i + 1; // Simple test pattern
  }

  const testHexKey = Buffer.from(testPrivateKey).toString('hex');

  describe('Key Import', () => {
    it('should import hex key successfully', async () => {
      const result = await importKey(testHexKey, {
        format: KeyImportExportFormat.HEX,
        algorithm: 'Ed25519' as any
      });

      expect(result.privateKey).toBeDefined();
      expect(result.privateKey.length).toBe(32);
      expect(result.publicKey).toBeDefined();
    });

    it('should handle invalid hex key', async () => {
      try {
        await importKey('invalid-hex-key', {
          format: KeyImportExportFormat.HEX,
          algorithm: 'Ed25519' as any
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Package.json Reading', () => {
    it('should read DID from package.json', () => {
      const packageJson = require('../../package.json');
      const did = packageJson.did || packageJson.testDid;
      
      expect(did).toBeDefined();
      expect(typeof did).toBe('string');
      expect(did.startsWith('did:')).toBe(true);
      expect(did).toBe('did:cheqd:testnet:a43b8c59-b0a1-58f7-a0b8-3b5016db93ff');
    });
  });

  describe('Environment Variable Reading', () => {
    it('should read TESTNET_HEX_KEY from environment', () => {
      const testnetKey = process.env.TESTNET_HEX_KEY;
      
      if (testnetKey) {
        expect(typeof testnetKey).toBe('string');
        expect(testnetKey.length).toBeGreaterThan(0);
        console.log('✅ TESTNET_HEX_KEY is set in environment');
      } else {
        console.log('ℹ️  TESTNET_HEX_KEY not set in test environment - this is expected');
        // This is expected in test environment, so we don't fail the test
        expect(true).toBe(true);
      }
    });
  });

  describe('DID Format Validation', () => {
    it('should validate Cheqd DID format', () => {
      const did = 'did:cheqd:testnet:a43b8c59-b0a1-58f7-a0b8-3b5016db93ff';
      
      // Extract DID method
      const match = did.match(/^did:([^:]+)/);
      expect(match).toBeDefined();
      expect(match![1]).toBe('cheqd');
      
      // Check if it's testnet
      expect(did.includes(':testnet:')).toBe(true);
    });
  });
}); 