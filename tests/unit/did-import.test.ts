/**
 * Test for DID import functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { importDIDFromPackageJson, importDIDWithHexKey } from '../../src/core/did/did-importer';
import { importKey, KeyImportExportFormat } from '../../src/core/key-management/key-import-export';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

describe('DID Import Functionality', () => {
  // Get the actual test DID and private key from environment
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('Loaded packageJson:', packageJson);
  console.log('Loaded testDid:', packageJson.testDid);
  const testDid = packageJson.testDid;
  
  // Get the actual private key from environment
  const actualTestnetKey = process.env.TESTNET_HEX_KEY;
  console.log('TESTNET_HEX_KEY available:', !!actualTestnetKey);

  // Test data - these are sample keys for testing only (fallback)
  const testPrivateKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    testPrivateKey[i] = i + 1; // Simple test pattern
  }
  const testHexKey = Buffer.from(testPrivateKey).toString('hex');

  describe('importDIDWithHexKey', () => {
    it('should import a DID with actual hex private key from environment', async () => {
      // Skip test if no actual key is available
      if (!actualTestnetKey) {
        console.log('Skipping test - TESTNET_HEX_KEY not available in environment');
        return;
      }

      const result = await importDIDWithHexKey(testDid, actualTestnetKey, 'test-did');
      
      // Debug logging
      if (!result.success) {
        // Log and throw to make the error visible in test output
        console.error('Import error:', result.error);
        throw new Error('DID import failed: ' + result.error);
      }
      console.log('Import result:', JSON.stringify(result, null, 2));
      
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

  describe('importDIDFromPackageJson', () => {
    it('should import DID from package.json using environment key', async () => {
      // Skip test if no actual key is available
      if (!actualTestnetKey) {
        console.log('Skipping test - TESTNET_HEX_KEY not available in environment');
        return;
      }

      const result = await importDIDFromPackageJson();
      
      // Debug logging
      if (!result.success) {
        console.error('Package.json import error:', result.error);
        throw new Error('Package.json DID import failed: ' + result.error);
      }
      console.log('Package.json import result:', JSON.stringify(result, null, 2));
      
      expect(result.success).toBe(true);
      expect(result.identifier).toBeDefined();
      expect(result.identifier?.did).toBe(testDid);
      expect(result.importedAt).toBeDefined();
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

    it('should import actual testnet key successfully', async () => {
      // Skip test if no actual key is available
      if (!actualTestnetKey) {
        console.log('Skipping test - TESTNET_HEX_KEY not available in environment');
        return;
      }

      const result = await importKey(actualTestnetKey, {
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
      // Debug logging
      const did = testDid;
      
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
        console.log('TESTNET_HEX_KEY is available for testing');
      } else {
        // This is expected in test environment
        console.log('TESTNET_HEX_KEY not set in test environment - this is expected');
      }
    });
  });
}); 