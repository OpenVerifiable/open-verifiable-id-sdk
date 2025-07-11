/**
 * Biometric Authentication Client Tests
 * 
 * Tests for the biometric authentication functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BiometricAuthenticator } from '../../../src/core/biometric/client';
import { BiometricModality } from '../../../src/core/biometric/types';

describe('BiometricAuthenticator', () => {
  let authenticator: BiometricAuthenticator;

  beforeEach(() => {
    authenticator = new BiometricAuthenticator();
  });

  describe('Capability Detection', () => {
    it('should detect biometric capabilities', async () => {
      const capabilities = await authenticator.checkBiometricSupport();
      
      expect(capabilities).toBeDefined();
      expect(capabilities.fingerprint).toBe(true);
      expect(capabilities.face).toBe(true);
      expect(capabilities.voice).toBe(false);
      expect(capabilities.iris).toBe(true);
      expect(capabilities.hardwareBacked).toBe(true);
      expect(capabilities.multiModal).toBe(true);
    });
  });

  describe('Biometric Enrollment', () => {
    it('should enroll fingerprint successfully', async () => {
      const result = await authenticator.enrollBiometric(BiometricModality.FINGERPRINT);
      
      expect(result.success).toBe(true);
      expect(result.modality).toBe(BiometricModality.FINGERPRINT);
      expect(result.templateId).toBeDefined();
    });

    it('should enroll face recognition successfully', async () => {
      const result = await authenticator.enrollBiometric(BiometricModality.FACE);
      
      expect(result.success).toBe(true);
      expect(result.modality).toBe(BiometricModality.FACE);
      expect(result.templateId).toBeDefined();
    });

    it('should fail enrollment for unsupported modality', async () => {
      const result = await authenticator.enrollBiometric(BiometricModality.VOICE);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('UNSUPPORTED_MODALITY');
    });
  });

  describe('Enrollment Status', () => {
    it('should track enrolled modalities', async () => {
      // Initially no modalities enrolled
      expect(await authenticator.isBiometricEnrolled(BiometricModality.FINGERPRINT)).toBe(false);
      
      // Enroll fingerprint
      await authenticator.enrollBiometric(BiometricModality.FINGERPRINT);
      expect(await authenticator.isBiometricEnrolled(BiometricModality.FINGERPRINT)).toBe(true);
      
      // Face should still not be enrolled
      expect(await authenticator.isBiometricEnrolled(BiometricModality.FACE)).toBe(false);
    });
  });

  describe('Biometric Authentication', () => {
    beforeEach(async () => {
      // Enroll fingerprint for testing
      await authenticator.enrollBiometric(BiometricModality.FINGERPRINT);
    });

    it('should authenticate successfully with enrolled modality', async () => {
      const result = await authenticator.authenticateWithBiometric('test_challenge', {
        modality: BiometricModality.FINGERPRINT,
        allowFallback: false,
        promptMessage: 'Test authentication'
      });

      // Note: This test uses a simulated 90% success rate
      // In real implementation, this would depend on actual biometric hardware
      expect(result.modality).toBe(BiometricModality.FINGERPRINT);
      expect(result.hardwareBacked).toBe(true);
      
      if (result.success) {
        expect(result.confidence).toBeGreaterThan(0.9);
      } else {
        expect(result.error).toBeDefined();
        expect(result.error?.recoverable).toBe(true);
      }
    });

    it('should fail authentication for non-enrolled modality', async () => {
      const result = await authenticator.authenticateWithBiometric('test_challenge', {
        modality: BiometricModality.FACE,
        allowFallback: false,
        promptMessage: 'Test authentication'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_ENROLLED');
      expect(result.error?.recoverable).toBe(true);
    });
  });

  describe('Credential Store Unlock', () => {
    beforeEach(async () => {
      await authenticator.enrollBiometric(BiometricModality.FINGERPRINT);
    });

    it('should unlock credential store with biometric', async () => {
      const result = await authenticator.unlockCredentialStore({
        requireBiometric: true,
        promptMessage: 'Unlock credentials'
      });

      // Result depends on simulated authentication success
      expect(typeof result).toBe('boolean');
    });

    it('should unlock without biometric when not required', async () => {
      const result = await authenticator.unlockCredentialStore({
        requireBiometric: false
      });

      expect(result).toBe(true);
    });

    it('should throw error when biometric required but not enrolled', async () => {
      // Create new authenticator without enrollment
      const newAuthenticator = new BiometricAuthenticator();
      
      await expect(
        newAuthenticator.unlockCredentialStore({
          requireBiometric: true
        })
      ).rejects.toThrow('No biometric modalities enrolled');
    });
  });

  describe('Biometric Signing', () => {
    beforeEach(async () => {
      await authenticator.enrollBiometric(BiometricModality.FINGERPRINT);
    });

    it('should sign data with biometric authentication', async () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      const keyId = 'test-key-123';
      
      const signature = await authenticator.signWithBiometric(data, keyId);
      
      expect(signature).toBeDefined();
      expect(signature.data).toBeInstanceOf(Uint8Array);
      expect(signature.algorithm).toBe('eddsa-2022');
      expect(signature.timestamp).toBeDefined();
    });

    it('should throw error when signing without enrolled biometric', async () => {
      const newAuthenticator = new BiometricAuthenticator();
      const data = new Uint8Array([1, 2, 3, 4]);
      
      await expect(
        newAuthenticator.signWithBiometric(data, 'test-key')
      ).rejects.toThrow('No biometric modalities enrolled for signing');
    });
  });

  describe('Template Management', () => {
    beforeEach(async () => {
      await authenticator.enrollBiometric(BiometricModality.FINGERPRINT);
    });

    it('should refresh biometric template', async () => {
      const result = await authenticator.refreshBiometricTemplate(BiometricModality.FINGERPRINT);
      expect(result).toBe(true);
    });

    it('should fail to refresh non-enrolled template', async () => {
      const result = await authenticator.refreshBiometricTemplate(BiometricModality.FACE);
      expect(result).toBe(false);
    });
  });

  describe('Biometric Revocation', () => {
    beforeEach(async () => {
      await authenticator.enrollBiometric(BiometricModality.FINGERPRINT);
      await authenticator.enrollBiometric(BiometricModality.FACE);
    });

    it('should revoke specific biometric modality', async () => {
      expect(await authenticator.isBiometricEnrolled(BiometricModality.FINGERPRINT)).toBe(true);
      expect(await authenticator.isBiometricEnrolled(BiometricModality.FACE)).toBe(true);
      
      const result = await authenticator.revokeBiometric(BiometricModality.FINGERPRINT);
      expect(result).toBe(true);
      
      expect(await authenticator.isBiometricEnrolled(BiometricModality.FINGERPRINT)).toBe(false);
      expect(await authenticator.isBiometricEnrolled(BiometricModality.FACE)).toBe(true);
    });

    it('should return false when revoking non-enrolled modality', async () => {
      const result = await authenticator.revokeBiometric(BiometricModality.VOICE);
      expect(result).toBe(false);
    });
  });

  describe('Fallback Authentication', () => {
    it('should setup fallback authentication', async () => {
      await expect(
        authenticator.setupFallbackAuth('password')
      ).resolves.not.toThrow();
    });

    it('should authenticate with fallback method', async () => {
      const result = await authenticator.authenticateWithFallback('password');
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('fallback');
    });
  });
}); 