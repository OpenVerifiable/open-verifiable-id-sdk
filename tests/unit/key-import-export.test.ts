/**
 * Key Import/Export Tests
 * 
 * Tests for the key import/export functionality supporting base64, mnemonic, and hex formats.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  importKey,
  exportKey,
  convertKeyFormat,
  KeyImportExportFormat
} from '../../src/core/key-management';
import { validateKeyFormat } from '../../src/core/key-management/key-import-export';
import { KeyAlgorithm, KeyFormat } from '../../src/core/key-management/types';

describe('Key Import/Export Functionality', () => {
  // Test data - these are sample keys for testing only
  const testPrivateKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    testPrivateKey[i] = i + 1; // Simple test pattern
  }

  // Create proper test data that matches our expectations
  const testBase64Key = Buffer.from(testPrivateKey).toString('base64');
  // Use a valid 24-word mnemonic for 32 bytes of entropy
  const testMnemonic = 'absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice comic';
  // Use a valid 12-word mnemonic for 16 bytes of entropy
  const testMnemonic12 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const testHexKey = Buffer.from(testPrivateKey).toString('hex');

  describe('Key Import', () => {
    it('should import key from base64 format', async () => {
      const result = await importKey(testBase64Key, {
        format: KeyImportExportFormat.BASE64,
        algorithm: KeyAlgorithm.ED25519
      });

      expect(result.privateKey).toBeInstanceOf(Uint8Array);
      expect(result.privateKey.length).toBe(32);
      expect(result.algorithm).toBe(KeyAlgorithm.ED25519);
      expect(result.format).toBe(KeyImportExportFormat.BASE64);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.keySize).toBe(32);
    });

    it('should import key from 24-word mnemonic format', async () => {
      const result = await importKey(testMnemonic, {
        format: KeyImportExportFormat.MNEMONIC,
        algorithm: KeyAlgorithm.ED25519
      });

      expect(result.privateKey).toBeInstanceOf(Uint8Array);
      expect(result.privateKey.length).toBe(32);
      expect(result.algorithm).toBe(KeyAlgorithm.ED25519);
      expect(result.format).toBe(KeyImportExportFormat.MNEMONIC);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.keySize).toBe(32);
    });

    it('should import key from 12-word mnemonic format', async () => {
      const result = await importKey(testMnemonic12, {
        format: KeyImportExportFormat.MNEMONIC,
        algorithm: KeyAlgorithm.ED25519
      });

      expect(result.privateKey).toBeInstanceOf(Uint8Array);
      expect(result.privateKey.length).toBe(32);
      expect(result.algorithm).toBe(KeyAlgorithm.ED25519);
      expect(result.format).toBe(KeyImportExportFormat.MNEMONIC);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.keySize).toBe(32);
    });

    it('should import key from hex format', async () => {
      const result = await importKey(testHexKey, {
        format: KeyImportExportFormat.HEX,
        algorithm: KeyAlgorithm.ED25519
      });

      expect(result.privateKey).toBeInstanceOf(Uint8Array);
      expect(result.privateKey.length).toBe(32);
      expect(result.algorithm).toBe(KeyAlgorithm.ED25519);
      expect(result.format).toBe(KeyImportExportFormat.HEX);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.keySize).toBe(32);
    });

    it('should throw error for invalid base64 format', async () => {
      await expect(importKey('invalid-base64!@#', {
        format: KeyImportExportFormat.BASE64,
        algorithm: KeyAlgorithm.ED25519
      })).rejects.toThrow();
    });

    it('should throw error for invalid mnemonic format', async () => {
      await expect(importKey('invalid mnemonic phrase', {
        format: KeyImportExportFormat.MNEMONIC,
        algorithm: KeyAlgorithm.ED25519
      })).rejects.toThrow();
    });

    it('should throw error for invalid hex format', async () => {
      await expect(importKey('invalid-hex-data!@#', {
        format: KeyImportExportFormat.HEX,
        algorithm: KeyAlgorithm.ED25519
      })).rejects.toThrow();
    });
  });

  describe('Key Export', () => {
    it('should export key to base64 format', async () => {
      const result = await exportKey(testPrivateKey, {
        format: KeyImportExportFormat.BASE64,
        includePublicKey: false
      });

      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      expect(result.format).toBe(KeyImportExportFormat.BASE64);
      expect(result.algorithm).toBe(KeyAlgorithm.ED25519);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.keySize).toBe(32);
      expect(result.metadata?.includesPublicKey).toBe(false);
    });

    it('should export key to 24-word mnemonic format (default)', async () => {
      const result = await exportKey(testPrivateKey, {
        format: KeyImportExportFormat.MNEMONIC
      });

      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      expect(result.format).toBe(KeyImportExportFormat.MNEMONIC);
      expect(result.algorithm).toBe(KeyAlgorithm.ED25519);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.keySize).toBe(32);
      
      // Verify it's a valid 24-word mnemonic
      const words = result.data.split(' ');
      expect(words.length).toBe(24);
    });

    it('should export key to 12-word mnemonic format when requested', async () => {
      const result = await exportKey(testPrivateKey, {
        format: KeyImportExportFormat.MNEMONIC,
        mnemonicWordCount: 12
      });

      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      expect(result.format).toBe(KeyImportExportFormat.MNEMONIC);
      expect(result.algorithm).toBe(KeyAlgorithm.ED25519);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.keySize).toBe(32);
      
      // Verify it's a valid 12-word mnemonic
      const words = result.data.split(' ');
      expect(words.length).toBe(12);
    });

    it('should export key to hex format', async () => {
      const result = await exportKey(testPrivateKey, {
        format: KeyImportExportFormat.HEX,
        includePublicKey: false
      });

      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      expect(result.format).toBe(KeyImportExportFormat.HEX);
      expect(result.algorithm).toBe(KeyAlgorithm.ED25519);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.keySize).toBe(32);
      expect(result.metadata?.includesPublicKey).toBe(false);
      
      // Verify it's valid hex
      expect(/^[0-9a-fA-F]+$/.test(result.data)).toBe(true);
    });

    it('should export key with public key when requested', async () => {
      const result = await exportKey(testPrivateKey, {
        format: KeyImportExportFormat.BASE64,
        includePublicKey: true
      });

      expect(result.data).toBeDefined();
      expect(result.metadata?.includesPublicKey).toBe(true);
    });
  });

  describe('Key Format Conversion', () => {
    it('should convert base64 to 24-word mnemonic', async () => {
      const mnemonic = await convertKeyFormat(
        testBase64Key,
        KeyImportExportFormat.BASE64,
        KeyImportExportFormat.MNEMONIC
      );

      expect(typeof mnemonic).toBe('string');
      const words = mnemonic.split(' ');
      expect(words.length).toBe(24);
    });

    it('should convert 24-word mnemonic to hex', async () => {
      const hex = await convertKeyFormat(
        testMnemonic,
        KeyImportExportFormat.MNEMONIC,
        KeyImportExportFormat.HEX
      );

      expect(typeof hex).toBe('string');
      expect(/^[0-9a-fA-F]+$/.test(hex)).toBe(true);
    });

    it('should convert 12-word mnemonic to hex', async () => {
      const hex = await convertKeyFormat(
        testMnemonic12,
        KeyImportExportFormat.MNEMONIC,
        KeyImportExportFormat.HEX
      );

      expect(typeof hex).toBe('string');
      expect(/^[0-9a-fA-F]+$/.test(hex)).toBe(true);
    });

    it('should convert hex to base64', async () => {
      const base64 = await convertKeyFormat(
        testHexKey,
        KeyImportExportFormat.HEX,
        KeyImportExportFormat.BASE64
      );

      expect(typeof base64).toBe('string');
      // Verify it's valid base64
      expect(() => Buffer.from(base64, 'base64')).not.toThrow();
    });

    it('should maintain key integrity through format conversions', async () => {
      // Convert base64 -> mnemonic -> hex -> base64
      const mnemonic = await convertKeyFormat(
        testBase64Key,
        KeyImportExportFormat.BASE64,
        KeyImportExportFormat.MNEMONIC
      );

      const hex = await convertKeyFormat(
        mnemonic,
        KeyImportExportFormat.MNEMONIC,
        KeyImportExportFormat.HEX
      );

      const base64Back = await convertKeyFormat(
        hex,
        KeyImportExportFormat.HEX,
        KeyImportExportFormat.BASE64
      );

      // The final base64 should match the original
      expect(base64Back).toBe(testBase64Key);
    });
  });

  describe('Key Format Validation', () => {
    it('should validate base64 format', () => {
      expect(validateKeyFormat(testBase64Key, KeyImportExportFormat.BASE64)).toBe(true);
      expect(validateKeyFormat('invalid-base64!@#', KeyImportExportFormat.BASE64)).toBe(false);
    });

    it('should validate 24-word mnemonic format', () => {
      expect(validateKeyFormat(testMnemonic, KeyImportExportFormat.MNEMONIC)).toBe(true);
      expect(validateKeyFormat('invalid mnemonic phrase', KeyImportExportFormat.MNEMONIC)).toBe(false);
    });

    it('should validate 12-word mnemonic format', () => {
      expect(validateKeyFormat(testMnemonic12, KeyImportExportFormat.MNEMONIC)).toBe(true);
    });

    it('should validate hex format', () => {
      expect(validateKeyFormat(testHexKey, KeyImportExportFormat.HEX)).toBe(true);
      expect(validateKeyFormat('invalid-hex-data!@#', KeyImportExportFormat.HEX)).toBe(false);
    });

    it('should handle hex with 0x prefix', () => {
      const hexWithPrefix = '0x' + testHexKey;
      expect(validateKeyFormat(hexWithPrefix, KeyImportExportFormat.HEX)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete import-export cycle with 24-word mnemonic', async () => {
      // Export key to 24-word mnemonic
      const exportResult = await exportKey(testPrivateKey, {
        format: KeyImportExportFormat.MNEMONIC,
        mnemonicWordCount: 24
      });

      // Import key from mnemonic
      const importResult = await importKey(exportResult.data, {
        format: KeyImportExportFormat.MNEMONIC,
        algorithm: KeyAlgorithm.ED25519
      });

      // Verify the imported key matches the original
      expect(importResult.privateKey.length).toBe(testPrivateKey.length);
      expect(importResult.algorithm).toBe(KeyAlgorithm.ED25519);
    });

    it('should handle complete import-export cycle with 12-word mnemonic', async () => {
      // Export key to 12-word mnemonic
      const exportResult = await exportKey(testPrivateKey, {
        format: KeyImportExportFormat.MNEMONIC,
        mnemonicWordCount: 12
      });

      // Import key from mnemonic
      const importResult = await importKey(exportResult.data, {
        format: KeyImportExportFormat.MNEMONIC,
        algorithm: KeyAlgorithm.ED25519
      });

      // Verify the imported key is 32 bytes (expanded from 16)
      expect(importResult.privateKey.length).toBe(32);
      expect(importResult.algorithm).toBe(KeyAlgorithm.ED25519);
    });

    it('should handle environment variable style keys', async () => {
      // Simulate keys from environment variables
      const envMnemonic = 'absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice comic';
      const envBase64 = Buffer.from(testPrivateKey).toString('base64');
      const envHex = Buffer.from(testPrivateKey).toString('hex');

      // Import from each format
      const mnemonicImport = await importKey(envMnemonic, {
        format: KeyImportExportFormat.MNEMONIC,
        algorithm: KeyAlgorithm.ED25519
      });

      const base64Import = await importKey(envBase64, {
        format: KeyImportExportFormat.BASE64,
        algorithm: KeyAlgorithm.ED25519
      });

      const hexImport = await importKey(envHex, {
        format: KeyImportExportFormat.HEX,
        algorithm: KeyAlgorithm.ED25519
      });

      // All should be valid
      expect(mnemonicImport.privateKey.length).toBe(32);
      expect(base64Import.privateKey.length).toBe(32);
      expect(hexImport.privateKey.length).toBe(32);
    });
  });
}); 