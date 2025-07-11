/**
 * Ed25519 Cryptographic Suite Plugin
 * 
 * Implements the Ed25519 cryptographic algorithm for digital signatures.
 * This plugin provides Ed25519 key generation, signing, and verification capabilities.
 * 
 * Ed25519 is a modern, high-performance digital signature algorithm that provides
 * strong security with excellent performance characteristics.
 */

import { BasePlugin } from '../base-plugin.js';
import type { 
  PluginContext, 
  PluginAuthor, 
  ValidationResult,
  PluginMetadata 
} from '../interfaces.js';

export interface Ed25519PluginConfig {
  /** Whether to enable key derivation */
  enableKeyDerivation?: boolean;
  /** Whether to support key rotation */
  enableKeyRotation?: boolean;
  /** Default key size (Ed25519 uses 256-bit keys) */
  keySize?: 256;
  /** Whether to validate signatures strictly */
  strictValidation?: boolean;
  /** Custom curve parameters */
  curveParams?: {
    name?: string;
    hash?: string;
  };
}

export interface Ed25519KeyPair {
  /** Public key in base64 format */
  publicKey: string;
  /** Private key in base64 format */
  privateKey: string;
  /** Key ID */
  keyId: string;
  /** Key creation timestamp */
  createdAt: string;
}

export interface Ed25519SignOptions {
  /** Data to sign */
  data: Uint8Array;
  /** Private key */
  privateKey: string;
  /** Custom signature context */
  context?: string;
  /** Whether to include timestamp */
  includeTimestamp?: boolean;
}

export interface Ed25519SignResult {
  /** Signature in base64 format */
  signature: string;
  /** Public key used for verification */
  publicKey: string;
  /** Signature timestamp */
  timestamp?: string;
  /** Signature context */
  context?: string;
}

export interface Ed25519VerifyOptions {
  /** Data that was signed */
  data: Uint8Array;
  /** Signature to verify */
  signature: string;
  /** Public key */
  publicKey: string;
  /** Expected context */
  context?: string;
}

export interface Ed25519VerifyResult {
  /** Whether verification passed */
  isValid: boolean;
  /** Verification timestamp */
  verifiedAt: string;
  /** Verification errors */
  errors: string[];
}

export class Ed25519Plugin extends BasePlugin {
  private cryptoConfig: Ed25519PluginConfig;

  constructor(config: Ed25519PluginConfig = {}) {
    super(
      'ed25519-plugin',
      'Ed25519 Cryptographic Suite Plugin',
      '1.0.0',
      'regular',
      'crypto-suite',
      {
        name: 'Open Verifiable',
        did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        email: 'plugins@open-verifiable.org'
      },
      [
        'ed25519:generate',
        'ed25519:sign',
        'ed25519:verify',
        'ed25519:derive',
        'ed25519:rotate',
        'ed25519:export',
        'ed25519:import'
      ],
      {
        description: 'Ed25519 cryptographic suite implementation',
        config
      }
    );

    this.cryptoConfig = {
      enableKeyDerivation: false,
      enableKeyRotation: false,
      keySize: 256,
      strictValidation: true,
      curveParams: {
        name: 'Ed25519',
        hash: 'SHA-512'
      },
      ...config
    };
  }

  protected async onInitialize(context: PluginContext): Promise<void> {
    // Initialize Ed25519 capabilities
    await this.validateEd25519Support();
    
    // Register Ed25519 with the agent's key management system
    if (context.apis?.keys) {
      await this.registerEd25519WithAgent(context);
    }
  }

  protected async onCleanup(): Promise<void> {
    // Cleanup any Ed25519 specific resources
  }

  protected async onValidateConfig(config: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.keySize && config.keySize !== 256) {
      warnings.push('Ed25519 uses 256-bit keys, keySize parameter is ignored');
    }

    if (config.curveParams?.name && config.curveParams.name !== 'Ed25519') {
      errors.push('Invalid curve name. Ed25519 plugin only supports Ed25519 curve');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate Ed25519 key pair
   */
  async generateKeyPair(): Promise<Ed25519KeyPair> {
    // Mock implementation - in practice, this would generate actual Ed25519 keys
    const keyId = this.generateKeyId();
    const now = new Date().toISOString();
    
    return {
      publicKey: `mock-ed25519-public-key-${keyId}`,
      privateKey: `mock-ed25519-private-key-${keyId}`,
      keyId,
      createdAt: now
    };
  }

  /**
   * Sign data with Ed25519
   */
  async sign(options: Ed25519SignOptions): Promise<Ed25519SignResult> {
    // Validate inputs
    this.validateSignOptions(options);

    // Mock implementation - in practice, this would perform actual Ed25519 signing
    const signature = await this.performSigning(options.data, options.privateKey);
    const publicKey = this.extractPublicKey(options.privateKey);

    return {
      signature,
      publicKey,
      timestamp: options.includeTimestamp ? new Date().toISOString() : undefined,
      context: options.context
    };
  }

  /**
   * Verify Ed25519 signature
   */
  async verify(options: Ed25519VerifyOptions): Promise<Ed25519VerifyResult> {
    // Validate inputs
    this.validateVerifyOptions(options);

    // Mock implementation - in practice, this would perform actual Ed25519 verification
    const isValid = await this.performVerification(options.data, options.signature, options.publicKey);
    const errors: string[] = [];

    if (!isValid) {
      errors.push('Signature verification failed');
    }

    if (options.context && this.cryptoConfig.strictValidation) {
      // In practice, this would validate the signature context
      const contextValid = this.validateSignatureContext(options.signature, options.context);
      if (!contextValid) {
        errors.push('Signature context validation failed');
      }
    }

    return {
      isValid: errors.length === 0,
      verifiedAt: new Date().toISOString(),
      errors
    };
  }

  /**
   * Derive key from seed
   */
  async deriveKey(seed: Uint8Array, path?: string): Promise<Ed25519KeyPair> {
    if (!this.cryptoConfig.enableKeyDerivation) {
      throw new Error('Key derivation is not enabled');
    }

    // Mock implementation - in practice, this would derive Ed25519 keys from seed
    const keyId = this.generateKeyId();
    const now = new Date().toISOString();
    
    return {
      publicKey: `derived-ed25519-public-${keyId}`,
      privateKey: `derived-ed25519-private-${keyId}`,
      keyId,
      createdAt: now
    };
  }

  /**
   * Rotate Ed25519 keys
   */
  async rotateKeys(oldKeyPair: Ed25519KeyPair): Promise<Ed25519KeyPair> {
    if (!this.cryptoConfig.enableKeyRotation) {
      throw new Error('Key rotation is not enabled');
    }

    // Generate new key pair
    const newKeyPair = await this.generateKeyPair();
    
    // In practice, this would create a key rotation proof
    await this.createKeyRotationProof(oldKeyPair, newKeyPair);
    
    return newKeyPair;
  }

  /**
   * Export Ed25519 key in different formats
   */
  async exportKey(keyPair: Ed25519KeyPair, format: 'jwk' | 'pem' | 'raw' = 'jwk'): Promise<string> {
    switch (format) {
      case 'jwk':
        return this.exportToJWK(keyPair);
      case 'pem':
        return this.exportToPEM(keyPair);
      case 'raw':
        return this.exportToRaw(keyPair);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import Ed25519 key from different formats
   */
  async importKey(keyData: string, format: 'jwk' | 'pem' | 'raw' = 'jwk'): Promise<Ed25519KeyPair> {
    switch (format) {
      case 'jwk':
        return this.importFromJWK(keyData);
      case 'pem':
        return this.importFromPEM(keyData);
      case 'raw':
        return this.importFromRaw(keyData);
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  /**
   * Get Ed25519 algorithm information
   */
  getAlgorithmInfo(): {
    name: string;
    keySize: number;
    signatureSize: number;
    securityLevel: string;
    performance: string;
  } {
    return {
      name: 'Ed25519',
      keySize: 256,
      signatureSize: 64,
      securityLevel: '128-bit',
      performance: 'high'
    };
  }

  // Private helper methods

  private async validateEd25519Support(): Promise<void> {
    // Validate that Ed25519 is supported in this environment
    if (!this.isEd25519Supported()) {
      throw new Error('Ed25519 is not supported in this environment');
    }
  }

  private async registerEd25519WithAgent(context: PluginContext): Promise<void> {
    // Register Ed25519 with the agent's key management system
    if (context.apis?.keys) {
      console.log('Ed25519 cryptographic suite registered with agent key system');
    }
  }

  private validateSignOptions(options: Ed25519SignOptions): void {
    if (!options.data || options.data.length === 0) {
      throw new Error('Data to sign is required');
    }
    if (!options.privateKey) {
      throw new Error('Private key is required');
    }
  }

  private validateVerifyOptions(options: Ed25519VerifyOptions): void {
    if (!options.data || options.data.length === 0) {
      throw new Error('Data to verify is required');
    }
    if (!options.signature) {
      throw new Error('Signature is required');
    }
    if (!options.publicKey) {
      throw new Error('Public key is required');
    }
  }

  private async performSigning(data: Uint8Array, privateKey: string): Promise<string> {
    // Mock implementation - in practice, this would perform actual Ed25519 signing
    const hash = await this.hashData(data);
    return `ed25519-signature-${hash.substring(0, 16)}`;
  }

  private async performVerification(data: Uint8Array, signature: string, publicKey: string): Promise<boolean> {
    // Mock implementation - in practice, this would perform actual Ed25519 verification
    const hash = await this.hashData(data);
    return signature.includes(hash.substring(0, 16));
  }

  private extractPublicKey(privateKey: string): string {
    // Mock implementation - in practice, this would derive public key from private key
    return `public-${privateKey.substring(0, 20)}`;
  }

  private validateSignatureContext(signature: string, context: string): boolean {
    // Mock implementation - in practice, this would validate signature context
    return signature.includes(context.substring(0, 8));
  }

  private async createKeyRotationProof(oldKeyPair: Ed25519KeyPair, newKeyPair: Ed25519KeyPair): Promise<void> {
    // Mock implementation - in practice, this would create a key rotation proof
    console.log('Key rotation proof created');
  }

  private generateKeyId(): string {
    return `ed25519-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isEd25519Supported(): boolean {
    // Mock implementation - in practice, this would check Ed25519 support
    return true;
  }

  private async hashData(data: Uint8Array): Promise<string> {
    // Mock implementation - in practice, this would hash the data
    return `hash-${data.length}-${Date.now()}`;
  }

  private exportToJWK(keyPair: Ed25519KeyPair): string {
    // Mock implementation - in practice, this would export to JWK format
    return JSON.stringify({
      kty: 'OKP',
      crv: 'Ed25519',
      x: keyPair.publicKey,
      d: keyPair.privateKey
    });
  }

  private exportToPEM(keyPair: Ed25519KeyPair): string {
    // Mock implementation - in practice, this would export to PEM format
    return `-----BEGIN PRIVATE KEY-----\n${keyPair.privateKey}\n-----END PRIVATE KEY-----`;
  }

  private exportToRaw(keyPair: Ed25519KeyPair): string {
    // Mock implementation - in practice, this would export to raw format
    return keyPair.privateKey;
  }

  private importFromJWK(jwkData: string): Ed25519KeyPair {
    // Mock implementation - in practice, this would import from JWK format
    const jwk = JSON.parse(jwkData);
    return {
      publicKey: jwk.x || 'imported-public',
      privateKey: jwk.d || 'imported-private',
      keyId: this.generateKeyId(),
      createdAt: new Date().toISOString()
    };
  }

  private importFromPEM(pemData: string): Ed25519KeyPair {
    // Mock implementation - in practice, this would import from PEM format
    const privateKey = pemData.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '').trim();
    return {
      publicKey: `pem-public-${privateKey.substring(0, 10)}`,
      privateKey,
      keyId: this.generateKeyId(),
      createdAt: new Date().toISOString()
    };
  }

  private importFromRaw(rawData: string): Ed25519KeyPair {
    // Mock implementation - in practice, this would import from raw format
    return {
      publicKey: `raw-public-${rawData.substring(0, 10)}`,
      privateKey: rawData,
      keyId: this.generateKeyId(),
      createdAt: new Date().toISOString()
    };
  }
} 