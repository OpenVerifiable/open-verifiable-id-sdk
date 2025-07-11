/**
 * Browser Key Manager Adapter
 * 
 * Platform-specific key management implementation for browsers
 * Uses Web Crypto API for cryptographic operations
 */

import {
  PlatformKeyManager,
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
  KeyGenerationResult,
  KeyImportResult,
  KeyExportResult,
  SigningResult,
  VerificationResult
} from '../types';
import { RuntimePlatform } from '../../../types';

/**
 * Browser Key Manager Implementation
 */
export class BrowserKeyManager implements PlatformKeyManager {
  public platform: RuntimePlatform = RuntimePlatform.BROWSER;
  private options: KeyManagerOptions;
  private keyStore: Map<string, CryptoKey> = new Map();

  constructor(options: KeyManagerOptions) {
    this.options = options;
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined';
  }

  async generateKey(options: KeyGenerationOptions): Promise<KeyGenerationResult> {
    const keyId = `key-${crypto.randomUUID()}`;
    
    let keyPair: CryptoKeyPair;
    
    switch (options.algorithm) {
      case KeyAlgorithm.ED25519:
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'Ed25519'
          },
          options.extractable ?? true,
          options.usage?.map(u => this.mapKeyUsage(u)) || ['sign', 'verify']
        ) as CryptoKeyPair;
        break;
      case KeyAlgorithm.SECP256K1:
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'ECDSA',
            namedCurve: 'P-256' // secp256k1 not directly supported, using P-256 as fallback
          },
          options.extractable ?? true,
          options.usage?.map(u => this.mapKeyUsage(u)) || ['sign', 'verify']
        ) as CryptoKeyPair;
        break;
      case KeyAlgorithm.RSA_2048:
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
          },
          options.extractable ?? true,
          options.usage?.map(u => this.mapKeyUsage(u)) || ['sign', 'verify']
        ) as CryptoKeyPair;
        break;
      case KeyAlgorithm.RSA_4096:
        keyPair = await crypto.subtle.generateKey(
          {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
          },
          options.extractable ?? true,
          options.usage?.map(u => this.mapKeyUsage(u)) || ['sign', 'verify']
        ) as CryptoKeyPair;
        break;
      default:
        throw new Error(`Unsupported algorithm: ${options.algorithm}`);
    }

    // Store the private key
    this.keyStore.set(keyId, keyPair.privateKey);

    const metadata: KeyMetadata = {
      keyId,
      algorithm: options.algorithm,
      created: new Date().toISOString(),
      usage: options.usage || [KeyUsage.SIGN, KeyUsage.VERIFY],
      isExtractable: options.extractable ?? true,
      isHardwareBacked: options.hardwareBacked ?? false,
      tags: options.tags,
      description: options.description,
      expiresAt: options.expiresAt
    };

    return {
      keyId,
      algorithm: options.algorithm,
      metadata
    };
  }

  async importKey(keyData: string, options: KeyImportOptions): Promise<KeyImportResult> {
    const keyId = options.keyId || `imported-${crypto.randomUUID()}`;
    
    let privateKey: CryptoKey;
    
    try {
      // Try to import as JWK
      const jwk = JSON.parse(keyData);
      privateKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: this.getAlgorithmName(options.algorithm),
          hash: 'SHA-256'
        },
        options.extractable ?? true,
        options.usage?.map(u => this.mapKeyUsage(u)) || ['sign', 'verify']
      );
    } catch {
      throw new Error('Failed to import key: Invalid JWK format');
    }

    // Store the imported key
    this.keyStore.set(keyId, privateKey);

    const metadata: KeyMetadata = {
      keyId,
      algorithm: options.algorithm,
      created: new Date().toISOString(),
      usage: options.usage || [KeyUsage.SIGN, KeyUsage.VERIFY],
      isExtractable: options.extractable ?? true,
      isHardwareBacked: false,
      tags: options.tags,
      description: options.description,
      expiresAt: options.expiresAt
    };

    return {
      keyId,
      algorithm: options.algorithm,
      metadata,
      imported: true
    };
  }

  async exportKey(keyId: string, options: KeyExportOptions): Promise<KeyExportResult> {
    const privateKey = this.keyStore.get(keyId);
    if (!privateKey) {
      throw new Error(`Key not found: ${keyId}`);
    }

    let data: string;
    
    switch (options.format) {
      case KeyFormat.JWK:
        const jwk = await crypto.subtle.exportKey('jwk', privateKey);
        data = JSON.stringify(jwk);
        break;
      case KeyFormat.RAW:
        const raw = await crypto.subtle.exportKey('raw', privateKey);
        data = Buffer.from(raw).toString('base64');
        break;
      case KeyFormat.PEM:
        // Web Crypto API doesn't support PEM directly
        // Convert JWK to PEM (simplified)
        const jwkForPem = await crypto.subtle.exportKey('jwk', privateKey);
        data = this.jwkToPem(jwkForPem);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    return {
      keyId,
      format: options.format,
      data
    };
  }

  async deleteKey(keyId: string): Promise<void> {
    const deleted = this.keyStore.delete(keyId);
    if (!deleted) {
      throw new Error(`Key not found: ${keyId}`);
    }
  }

  async sign(keyId: string, data: Uint8Array, options?: KeySignOptions): Promise<SigningResult> {
    const privateKey = this.keyStore.get(keyId);
    if (!privateKey) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const algorithm = options?.algorithm || this.getDefaultSignAlgorithm(privateKey);
    const signature = await crypto.subtle.sign(algorithm, privateKey, data);

    return {
      keyId,
      signature: new Uint8Array(signature),
      algorithm: typeof algorithm === 'string' ? algorithm : algorithm.name,
      timestamp: new Date().toISOString()
    };
  }

  async verify(keyId: string, data: Uint8Array, signature: Uint8Array, options?: KeyVerifyOptions): Promise<VerificationResult> {
    const privateKey = this.keyStore.get(keyId);
    if (!privateKey) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const algorithm = options?.algorithm || this.getDefaultSignAlgorithm(privateKey);
    
    let isValid: boolean;
    
    try {
      // For verification, we need the public key
      // In a real implementation, you'd store both private and public keys
      isValid = false; // Simplified - would need public key for verification
    } catch (error) {
      return {
        keyId,
        isValid: false,
        algorithm: typeof algorithm === 'string' ? algorithm : algorithm.name,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }

    return {
      keyId,
      isValid,
      algorithm: typeof algorithm === 'string' ? algorithm : algorithm.name,
      timestamp: new Date().toISOString()
    };
  }

  async listKeys(): Promise<KeyMetadata[]> {
    // This is a simplified implementation
    // In a real implementation, you'd store metadata separately
    return [];
  }

  async getKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
    // This is a simplified implementation
    // In a real implementation, you'd store metadata separately
    return null;
  }

  async updateKeyMetadata(keyId: string, metadata: Partial<KeyMetadata>): Promise<void> {
    // This is a simplified implementation
    // In a real implementation, you'd update stored metadata
  }

  /**
   * Map SDK key usage to Web Crypto API key usage
   */
  private mapKeyUsage(usage: KeyUsage): KeyUsage {
    switch (usage) {
      case KeyUsage.SIGN:
        return 'sign' as any;
      case KeyUsage.VERIFY:
        return 'verify' as any;
      case KeyUsage.ENCRYPT:
        return 'encrypt' as any;
      case KeyUsage.DECRYPT:
        return 'decrypt' as any;
      case KeyUsage.DERIVE_KEY:
        return 'deriveKey' as any;
      case KeyUsage.WRAP_KEY:
        return 'wrapKey' as any;
      case KeyUsage.UNWRAP_KEY:
        return 'unwrapKey' as any;
      default:
        return 'sign' as any;
    }
  }

  /**
   * Get algorithm name for Web Crypto API
   */
  private getAlgorithmName(algorithm: KeyAlgorithm): string {
    switch (algorithm) {
      case KeyAlgorithm.ED25519:
        return 'Ed25519';
      case KeyAlgorithm.SECP256K1:
        return 'ECDSA';
      case KeyAlgorithm.RSA_2048:
      case KeyAlgorithm.RSA_4096:
        return 'RSASSA-PKCS1-v1_5';
      default:
        return 'Ed25519';
    }
  }

  /**
   * Get default signing algorithm for a key
   */
  private getDefaultSignAlgorithm(privateKey: CryptoKey): Algorithm {
    switch (privateKey.algorithm.name) {
      case 'Ed25519':
        return { name: 'Ed25519' };
      case 'ECDSA':
        return { name: 'ECDSA' } as any;
      case 'RSASSA-PKCS1-v1_5':
        return { name: 'RSASSA-PKCS1-v1_5' };
      default:
        return { name: 'Ed25519' };
    }
  }

  /**
   * Convert JWK to PEM (simplified)
   */
  private jwkToPem(jwk: JsonWebKey): string {
    // This is a simplified conversion
    // In a real implementation, you'd properly convert JWK to PEM
    return `-----BEGIN PRIVATE KEY-----
${Buffer.from(JSON.stringify(jwk)).toString('base64')}
-----END PRIVATE KEY-----`;
  }
} 