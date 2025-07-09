/**
 * Key Manager Implementation
 * 
 * Provides comprehensive key management capabilities including generation,
 * storage, signing, and verification for cryptographic keys.
 * 
 * @implements ADR-0007: Agent Architecture and Extensibility
 */

import { KeyManager as SDKKeyManager } from '../../types';
import {
  KeyManagerOptions,
  KeyGenerationOptions,
  KeyImportOptions,
  KeyExportOptions,
  KeySignOptions,
  KeyVerifyOptions,
  KeyMetadata,
  KeyAlgorithm,
  KeyFormat,
  KeyUsage,
  KeyPair,
  KeyGenerationResult,
  KeyImportResult,
  KeyExportResult,
  SigningResult,
  VerificationResult,
  KeyStatistics,
  KeyRotationResult,
  KeyBackupData,
  PlatformKeyManager
} from './types';
import { RuntimePlatform } from '../../types';
import { NodeKeyManager } from './adapters/node-key-manager';
import { BrowserKeyManager } from './adapters/browser-key-manager';
import { ReactNativeKeyManager } from './adapters/react-native-key-manager';
import { 
  generateKeyPair,
  importKeyFromJWK,
  exportKeyToJWK,
  validateKeyFormat,
  deriveKeyFromPassword
} from './utils';
import {
  importKey as importKeyFromFormat,
  exportKey as exportKeyToFormat,
  convertKeyFormat,
  KeyImportExportFormat,
  KeyImportOptions as KeyImportExportOptions,
  KeyExportOptions as KeyExportFormatOptions,
  KeyImportResult as KeyImportFormatResult,
  KeyExportResult as KeyExportFormatResult
} from './key-import-export';

/**
 * Main Key Manager Implementation
 * Provides unified key management capabilities across platforms
 */
export class KeyManager implements SDKKeyManager {
  private platformManager: PlatformKeyManager;
  private options: KeyManagerOptions;
  private keyStore: Map<string, KeyMetadata> = new Map();

  constructor(options: KeyManagerOptions = {}) {
    this.options = {
      platform: RuntimePlatform.NODE,
      defaultAlgorithm: KeyAlgorithm.ED25519,
      hardwareBacked: false,
      requireBiometric: false,
      keyRotationPolicy: {
        enabled: false,
        maxAge: 365, // 1 year
        autoRotate: false
      },
      encryption: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keyDerivation: 'pbkdf2'
      },
      ...options
    };

    this.platformManager = this.createPlatformManager();
  }

  /**
   * Create platform-specific key manager
   */
  private createPlatformManager(): PlatformKeyManager {
    const platform = this.options.platform || this.detectPlatform();

    switch (platform) {
      case RuntimePlatform.NODE:
        return new NodeKeyManager(this.options);
      case RuntimePlatform.BROWSER:
        return new BrowserKeyManager(this.options);
      case RuntimePlatform.REACT_NATIVE:
        return new ReactNativeKeyManager(this.options);
      default:
        // Fallback to Node implementation
        return new NodeKeyManager(this.options);
    }
  }

  /**
   * Detect current platform
   */
  private detectPlatform(): RuntimePlatform {
    if (typeof window !== 'undefined' && typeof window.crypto !== 'undefined') {
      return RuntimePlatform.BROWSER;
    }
    if (typeof global !== 'undefined' && global.navigator?.product === 'ReactNative') {
      return RuntimePlatform.REACT_NATIVE;
    }
    return RuntimePlatform.NODE;
  }

  /**
   * Generate a new cryptographic key
   */
  async generateKey(algorithm: string, options?: any): Promise<string> {
    const generationOptions: KeyGenerationOptions = {
      algorithm: algorithm as KeyAlgorithm,
      extractable: options?.extractable ?? true,
      usage: options?.usage ?? [KeyUsage.SIGN, KeyUsage.VERIFY],
      hardwareBacked: options?.hardwareBacked ?? this.options.hardwareBacked,
      keySize: options?.keySize,
      curve: options?.curve,
      tags: options?.tags,
      description: options?.description,
      expiresAt: options?.expiresAt
    };

    const result = await this.platformManager.generateKey(generationOptions);
    
    // Store key metadata
    this.keyStore.set(result.keyId, result.metadata);
    
    return result.keyId;
  }

  /**
   * Import a key from external format
   */
  async importKey(privateKey: string, format?: 'jwk' | 'pem' | 'raw'): Promise<string> {
    const importOptions: KeyImportOptions = {
      algorithm: this.options.defaultAlgorithm!,
      extractable: true,
      usage: [KeyUsage.SIGN, KeyUsage.VERIFY]
    };

    const result = await this.platformManager.importKey(privateKey, importOptions);
    
    // Store key metadata
    this.keyStore.set(result.keyId, result.metadata);
    
    return result.keyId;
  }

  /**
   * Export a key to external format
   */
  async exportKey(keyId: string, format?: 'jwk' | 'pem' | 'raw'): Promise<string> {
    const exportOptions: KeyExportOptions = {
      format: format as KeyFormat || KeyFormat.JWK,
      includePrivateKey: true
    };

    const result = await this.platformManager.exportKey(keyId, exportOptions);
    return result.data;
  }

  /**
   * Import a key from various formats (base64, mnemonic, hex, etc.)
   */
  async importKeyFromFormat(
    keyData: string,
    options: KeyImportExportOptions
  ): Promise<KeyImportFormatResult> {
    return await importKeyFromFormat(keyData, options);
  }

  /**
   * Export a key to various formats (base64, mnemonic, hex, etc.)
   */
  async exportKeyToFormat(
    privateKey: Uint8Array,
    options: KeyExportFormatOptions
  ): Promise<KeyExportFormatResult> {
    return await exportKeyToFormat(privateKey, options);
  }

  /**
   * Convert a key between different formats
   */
  async convertKeyFormat(
    keyData: string,
    fromFormat: KeyImportExportFormat,
    toFormat: KeyImportExportFormat,
    options?: {
      password?: string;
      includePublicKey?: boolean;
    }
  ): Promise<string> {
    return await convertKeyFormat(keyData, fromFormat, toFormat, options);
  }

  /**
   * Import a key from base64 format
   */
  async importKeyFromBase64(keyData: string, algorithm?: KeyAlgorithm): Promise<KeyImportFormatResult> {
    return await importKeyFromFormat(keyData, {
      format: KeyImportExportFormat.BASE64,
      algorithm: algorithm || this.options.defaultAlgorithm!
    });
  }

  /**
   * Import a key from mnemonic format
   */
  async importKeyFromMnemonic(mnemonic: string, algorithm?: KeyAlgorithm): Promise<KeyImportFormatResult> {
    return await importKeyFromFormat(mnemonic, {
      format: KeyImportExportFormat.MNEMONIC,
      algorithm: algorithm || this.options.defaultAlgorithm!
    });
  }

  /**
   * Import a key from hex format
   */
  async importKeyFromHex(hexData: string, algorithm?: KeyAlgorithm): Promise<KeyImportFormatResult> {
    return await importKeyFromFormat(hexData, {
      format: KeyImportExportFormat.HEX,
      algorithm: algorithm || this.options.defaultAlgorithm!
    });
  }

  /**
   * Export a key to base64 format
   */
  async exportKeyToBase64(privateKey: Uint8Array, includePublicKey: boolean = false): Promise<KeyExportFormatResult> {
    return await exportKeyToFormat(privateKey, {
      format: KeyImportExportFormat.BASE64,
      includePublicKey
    });
  }

  /**
   * Export a key to mnemonic format
   */
  async exportKeyToMnemonic(privateKey: Uint8Array): Promise<KeyExportFormatResult> {
    return await exportKeyToFormat(privateKey, {
      format: KeyImportExportFormat.MNEMONIC
    });
  }

  /**
   * Export a key to hex format
   */
  async exportKeyToHex(privateKey: Uint8Array, includePublicKey: boolean = false): Promise<KeyExportFormatResult> {
    return await exportKeyToFormat(privateKey, {
      format: KeyImportExportFormat.HEX,
      includePublicKey
    });
  }

  /**
   * Delete a key
   */
  async deleteKey(keyId: string): Promise<void> {
    await this.platformManager.deleteKey(keyId);
    this.keyStore.delete(keyId);
  }

  /**
   * Sign data with a key
   */
  async sign(keyId: string, data: Uint8Array): Promise<Uint8Array> {
    const result = await this.platformManager.sign(keyId, data);
    
    // Update last used timestamp
    const metadata = this.keyStore.get(keyId);
    if (metadata) {
      metadata.lastUsed = new Date().toISOString();
      this.keyStore.set(keyId, metadata);
    }
    
    return result.signature;
  }

  /**
   * Verify a signature
   */
  async verify(keyId: string, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    const result = await this.platformManager.verify(keyId, data, signature);
    return result.isValid;
  }

  /**
   * Generate a key pair
   */
  async generateKeyPair(algorithm: KeyAlgorithm = KeyAlgorithm.ED25519): Promise<KeyPair> {
    const keyId = await this.generateKey(algorithm);
    const publicKey = await this.exportKey(keyId, KeyFormat.JWK);
    const privateKey = await this.exportKey(keyId, KeyFormat.JWK);
    const metadata = this.keyStore.get(keyId)!;

    return {
      publicKey,
      privateKey,
      keyId,
      algorithm,
      metadata
    };
  }

  /**
   * List all managed keys
   */
  async listKeys(): Promise<KeyMetadata[]> {
    return Array.from(this.keyStore.values());
  }

  /**
   * Get key metadata
   */
  async getKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
    return this.keyStore.get(keyId) || null;
  }

  /**
   * Update key metadata
   */
  async updateKeyMetadata(keyId: string, updates: Partial<KeyMetadata>): Promise<void> {
    const metadata = this.keyStore.get(keyId);
    if (!metadata) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const updatedMetadata = { ...metadata, ...updates };
    this.keyStore.set(keyId, updatedMetadata);
    await this.platformManager.updateKeyMetadata(keyId, updatedMetadata);
  }

  /**
   * Rotate a key
   */
  async rotateKey(keyId: string, newAlgorithm?: KeyAlgorithm): Promise<KeyRotationResult> {
    const metadata = this.keyStore.get(keyId);
    if (!metadata) {
      throw new Error(`Key not found: ${keyId}`);
    }

    try {
      // Generate new key
      const newKeyId = await this.generateKey(
        newAlgorithm || metadata.algorithm,
        { description: `Rotated from ${keyId}` }
      );

      // Delete old key
      await this.deleteKey(keyId);

      return {
        oldKeyId: keyId,
        newKeyId,
        rotated: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        oldKeyId: keyId,
        newKeyId: '',
        rotated: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get key statistics
   */
  async getStatistics(): Promise<KeyStatistics> {
    const keys = Array.from(this.keyStore.values());
    
    const stats: KeyStatistics = {
      totalKeys: keys.length,
      byAlgorithm: {
        [KeyAlgorithm.ED25519]: 0,
        [KeyAlgorithm.SECP256K1]: 0,
        [KeyAlgorithm.RSA_2048]: 0,
        [KeyAlgorithm.RSA_4096]: 0,
        [KeyAlgorithm.AES_256]: 0,
        [KeyAlgorithm.HMAC_SHA256]: 0
      },
      byUsage: {
        [KeyUsage.SIGN]: 0,
        [KeyUsage.VERIFY]: 0,
        [KeyUsage.ENCRYPT]: 0,
        [KeyUsage.DECRYPT]: 0,
        [KeyUsage.DERIVE_KEY]: 0,
        [KeyUsage.WRAP_KEY]: 0,
        [KeyUsage.UNWRAP_KEY]: 0
      },
      hardwareBacked: 0,
      expired: 0
    };

    for (const key of keys) {
      stats.byAlgorithm[key.algorithm]++;
      key.usage.forEach(usage => stats.byUsage[usage]++);
      if (key.isHardwareBacked) stats.hardwareBacked++;
      if (key.expiresAt && new Date(key.expiresAt) < new Date()) stats.expired++;
    }

    return stats;
  }

  /**
   * Export key backup
   */
  async exportBackup(passphrase: string): Promise<string> {
    const keys = await this.listKeys();
    const backupData: KeyBackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      keys: [],
      metadata: {
        totalKeys: keys.length,
        backupId: `backup-${Date.now()}`,
        checksum: ''
      }
    };

    // Export each key
    for (const key of keys) {
      try {
        const encryptedData = await this.exportKey(key.keyId, KeyFormat.JWK);
        backupData.keys.push({
          keyId: key.keyId,
          algorithm: key.algorithm,
          encryptedData,
          metadata: key
        });
      } catch (error) {
        console.warn(`Failed to export key ${key.keyId}:`, error);
      }
    }

    // Generate checksum
    const backupString = JSON.stringify(backupData);
    backupData.metadata.checksum = await this.generateChecksum(backupString);

    return JSON.stringify(backupData, null, 2);
  }

  /**
   * Import key backup
   */
  async importBackup(backupData: string, passphrase: string): Promise<void> {
    const backup: KeyBackupData = JSON.parse(backupData);
    
    // Verify checksum
    const expectedChecksum = await this.generateChecksum(JSON.stringify(backup));
    if (backup.metadata.checksum !== expectedChecksum) {
      throw new Error('Backup checksum verification failed');
    }

    // Import each key
    for (const keyData of backup.keys) {
      try {
        await this.importKey(keyData.encryptedData, KeyFormat.JWK);
        await this.updateKeyMetadata(keyData.keyId, keyData.metadata);
      } catch (error) {
        console.warn(`Failed to import key ${keyData.keyId}:`, error);
      }
    }
  }

  /**
   * Generate checksum for backup verification
   */
  private async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get platform information
   */
  getPlatform(): RuntimePlatform {
    return this.platformManager.platform;
  }

  /**
   * Check if platform is supported
   */
  isPlatformSupported(): boolean {
    return this.platformManager.isSupported();
  }

  /**
   * Get manager options
   */
  getOptions(): KeyManagerOptions {
    return { ...this.options };
  }
}

/**
 * Factory function to create a key manager
 */
export function createKeyManager(options?: KeyManagerOptions): KeyManager {
  return new KeyManager(options);
} 