/**
 * Node.js Key Manager Adapter
 * 
 * Platform-specific key management implementation for Node.js
 * Uses Node.js crypto module for cryptographic operations
 */

import { randomBytes, createHash, createSign, createVerify } from 'crypto';
import { promisify } from 'util';
import { generateKeyPair as nodeGenerateKeyPair } from 'crypto';
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

const generateKeyPairAsync = promisify(nodeGenerateKeyPair);

/**
 * Node.js Key Manager Implementation
 */
export class NodeKeyManager implements PlatformKeyManager {
  public platform: RuntimePlatform = RuntimePlatform.NODE;
  private options: KeyManagerOptions;
  private keyStore: Map<string, { privateKey: string; publicKey: string }> = new Map();

  constructor(options: KeyManagerOptions) {
    this.options = options;
  }

  isSupported(): boolean {
    return typeof process !== 'undefined' && process.versions && !!process.versions.node;
  }

  async generateKey(options: KeyGenerationOptions): Promise<KeyGenerationResult> {
    const keyId = `key-${randomBytes(16).toString('hex')}`;
    
    let keyPair: { publicKey: string; privateKey: string };
    
    switch (options.algorithm) {
      case KeyAlgorithm.ED25519:
        keyPair = await generateKeyPairAsync('ed25519', {
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        break;
      case KeyAlgorithm.SECP256K1:
        keyPair = await generateKeyPairAsync('ec', {
          namedCurve: 'secp256k1',
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'sec1', format: 'pem' }
        });
        break;
      case KeyAlgorithm.RSA_2048:
        keyPair = await generateKeyPairAsync('rsa', {
          modulusLength: 2048,
          publicExponent: 0x10001,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        break;
      case KeyAlgorithm.RSA_4096:
        keyPair = await generateKeyPairAsync('rsa', {
          modulusLength: 4096,
          publicExponent: 0x10001,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        break;
      default:
        throw new Error(`Unsupported algorithm: ${options.algorithm}`);
    }

    // Store the key pair
    this.keyStore.set(keyId, keyPair);

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
    const keyId = options.keyId || `imported-${randomBytes(16).toString('hex')}`;
    
    // For simplicity, we'll assume PEM format
    // In a real implementation, you'd detect the format and handle JWK
    const privateKey = keyData;
    const publicKey = ''; // Would need to derive from private key

    // Store the imported key
    this.keyStore.set(keyId, { privateKey, publicKey });

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
    const keyPair = this.keyStore.get(keyId);
    if (!keyPair) {
      throw new Error(`Key not found: ${keyId}`);
    }

    let data: string;
    
    switch (options.format) {
      case KeyFormat.PEM:
        data = keyPair.privateKey;
        break;
      case KeyFormat.JWK:
        // Convert PEM to JWK (simplified)
        data = JSON.stringify({ kty: 'EC', crv: 'P-256' });
        break;
      case KeyFormat.RAW:
        data = Buffer.from(keyPair.privateKey).toString('base64');
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
    const keyPair = this.keyStore.get(keyId);
    if (!keyPair) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const algorithm = options?.algorithm || 'sha256';
    const sign = createSign(algorithm);
    sign.update(Buffer.from(data));
    const signature = sign.sign(keyPair.privateKey);

    return {
      keyId,
      signature: new Uint8Array(signature),
      algorithm,
      timestamp: new Date().toISOString()
    };
  }

  async verify(keyId: string, data: Uint8Array, signature: Uint8Array, options?: KeyVerifyOptions): Promise<VerificationResult> {
    const keyPair = this.keyStore.get(keyId);
    if (!keyPair) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const algorithm = options?.algorithm || 'sha256';
    const verify = createVerify(algorithm);
    verify.update(Buffer.from(data));
    
    let isValid: boolean;
    
    try {
      isValid = verify.verify(keyPair.publicKey, Buffer.from(signature));
    } catch (error) {
      return {
        keyId,
        isValid: false,
        algorithm,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }

    return {
      keyId,
      isValid,
      algorithm,
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
} 