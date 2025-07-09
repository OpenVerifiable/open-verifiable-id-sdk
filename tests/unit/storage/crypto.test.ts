import { describe, it, expect } from 'vitest';
import { 
  encrypt, 
  decrypt, 
  generateEncryptionKey, 
  validatePassphrase,
  convertKeyFormat,
  EncryptedData 
} from '../../../src/core/storage/crypto';
import { StorageError, StorageErrorCode } from '../../../src/core/storage/types';

describe('Crypto Utilities', () => {
  describe('encrypt/decrypt', () => {
    it('should successfully encrypt and decrypt data', async () => {
      const data = new TextEncoder().encode('test data');
      const passphrase = 'TestPassphrase123!';

      const encrypted = await encrypt(data, passphrase);
      expect(encrypted).toBeDefined();
      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();

      const decrypted = await decrypt(encrypted, passphrase);
      expect(decrypted).toEqual(data);
      expect(new TextDecoder().decode(decrypted)).toBe('test data');
    });

    it('should handle empty data', async () => {
      const data = new Uint8Array(0);
      const passphrase = 'TestPassphrase123!';

      const encrypted = await encrypt(data, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);
      expect(decrypted).toEqual(data);
    });

    it('should fail decryption with wrong passphrase', async () => {
      const data = new TextEncoder().encode('test data');
      const encrypted = await encrypt(data, 'CorrectPassphrase123!');

      await expect(decrypt(encrypted, 'WrongPassphrase123!'))
        .rejects
        .toThrow(StorageError);
    });

    it('should fail with invalid encrypted data structure', async () => {
      const invalidData: EncryptedData = {
        data: 'invalid',
        iv: 'invalid',
        salt: 'invalid'
      };

      await expect(decrypt(invalidData, 'TestPassphrase123!'))
        .rejects
        .toThrow(StorageError);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a valid base64 key', () => {
      const key = generateEncryptionKey();
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(Buffer.from(key, 'base64').length).toBe(32); // 256 bits
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('validatePassphrase', () => {
    it('should accept valid passphrases', () => {
      expect(validatePassphrase('ValidPassphrase123!')).toBe(true);
      expect(validatePassphrase('AnotherValid123#')).toBe(true);
      expect(validatePassphrase('Complex@Passphrase456')).toBe(true);
    });

    it('should reject invalid passphrases', () => {
      expect(validatePassphrase('')).toBe(false);
      expect(validatePassphrase('short')).toBe(false);
      expect(validatePassphrase('nouppercase123!')).toBe(false);
      expect(validatePassphrase('NOLOWERCASE123!')).toBe(false);
      expect(validatePassphrase('NoNumbers!')).toBe(false);
      expect(validatePassphrase('NoSpecialChars123')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(validatePassphrase(null as any)).toBe(false);
      expect(validatePassphrase(undefined as any)).toBe(false);
      expect(validatePassphrase(123 as any)).toBe(false);
    });
  });

  describe('convertKeyFormat', () => {
    it('should convert between base64 and hex', () => {
      const base64Key = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
      const hexKey = convertKeyFormat(base64Key, 'base64', 'hex');
      expect(hexKey).toBe('48656c6c6f20576f726c64');

      const backToBase64 = convertKeyFormat(hexKey, 'hex', 'base64');
      expect(backToBase64).toBe(base64Key);
    });

    it('should return same key if formats match', () => {
      const key = 'SGVsbG8gV29ybGQ=';
      expect(convertKeyFormat(key, 'base64', 'base64')).toBe(key);
    });

    it('should handle empty strings', () => {
      expect(convertKeyFormat('', 'base64', 'hex')).toBe('');
      expect(convertKeyFormat('', 'hex', 'base64')).toBe('');
    });
  });
}); 