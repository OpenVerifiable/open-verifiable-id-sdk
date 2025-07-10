/**
 * DID:key Plugin
 * 
 * Implements the DID:key method for decentralized identifiers.
 * This plugin provides DID:key creation, resolution, and verification capabilities.
 * 
 * DID:key is a simple, self-contained DID method that uses cryptographic keys
 * directly in the DID identifier, making it suitable for local and offline use.
 */

import { BasePlugin } from '../base-plugin.js';
import type { 
  PluginContext, 
  PluginAuthor, 
  ValidationResult,
  PluginMetadata 
} from '../interfaces.js';

export interface DIDKeyPluginConfig {
  /** Default key algorithm to use */
  defaultAlgorithm?: 'Ed25519' | 'Secp256k1' | 'RSA';
  /** Whether to enable key rotation */
  enableKeyRotation?: boolean;
  /** Key rotation interval in days */
  keyRotationInterval?: number;
  /** Whether to validate DID format */
  validateFormat?: boolean;
}

export interface DIDKeyCreateOptions {
  /** Key algorithm to use */
  algorithm?: 'Ed25519' | 'Secp256k1' | 'RSA';
  /** Key size for RSA */
  keySize?: 2048 | 4096;
  /** Whether to include private key in result */
  includePrivateKey?: boolean;
  /** Custom key ID */
  keyId?: string;
}

export interface DIDKeyCreateResult {
  /** The created DID */
  did: string;
  /** DID document */
  document: any;
  /** Private key (if requested) */
  privateKey?: string;
  /** Public key */
  publicKey: string;
  /** Key ID */
  keyId: string;
  /** Creation timestamp */
  createdAt: string;
}

export class DIDKeyPlugin extends BasePlugin {
  private didKeyConfig: DIDKeyPluginConfig;

  constructor(config: DIDKeyPluginConfig = {}) {
    super(
      'did-key-plugin',
      'DID:key Plugin',
      '1.0.0',
      'regular',
      'did-method',
      {
        name: 'Open Verifiable',
        did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        email: 'plugins@open-verifiable.org'
      },
      [
        'did:key:create',
        'did:key:resolve', 
        'did:key:verify',
        'did:key:rotate',
        'did:key:export',
        'did:key:import'
      ],
      {
        description: 'DID:key method implementation for decentralized identifiers',
        config
      }
    );

    this.didKeyConfig = {
      defaultAlgorithm: 'Ed25519',
      enableKeyRotation: false,
      keyRotationInterval: 365,
      validateFormat: true,
      ...config
    };
  }

  protected async onInitialize(context: PluginContext): Promise<void> {
    // Initialize DID:key capabilities
    await this.validateDIDKeySupport();
    
    // Register DID:key method with the agent
    if (context.apis?.did) {
      await this.registerDIDMethod(context);
    }
  }

  protected async onCleanup(): Promise<void> {
    // Cleanup any DID:key specific resources
  }

  protected async onValidateConfig(config: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.defaultAlgorithm && !['Ed25519', 'Secp256k1', 'RSA'].includes(config.defaultAlgorithm)) {
      errors.push('Invalid defaultAlgorithm. Must be one of: Ed25519, Secp256k1, RSA');
    }

    if (config.keyRotationInterval && (config.keyRotationInterval < 1 || config.keyRotationInterval > 3650)) {
      warnings.push('keyRotationInterval should be between 1 and 3650 days');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a new DID:key
   */
  async createDID(options: DIDKeyCreateOptions = {}): Promise<DIDKeyCreateResult> {
    const algorithm = options.algorithm || this.didKeyConfig.defaultAlgorithm || 'Ed25519';
    const keyId = options.keyId || this.generateKeyId();

    // Generate key pair
    const keyPair = await this.generateKeyPair(algorithm, options.keySize);
    
    // Create DID from public key
    const did = this.createDIDFromPublicKey(keyPair.publicKey, algorithm);
    
    // Create DID document
    const document = this.createDIDDocument(did, keyPair.publicKey, keyId, algorithm);

    return {
      did,
      document,
      privateKey: options.includePrivateKey ? keyPair.privateKey : undefined,
      publicKey: keyPair.publicKey,
      keyId,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Resolve a DID:key to its document
   */
  async resolveDID(did: string): Promise<any> {
    if (!this.isValidDIDKey(did)) {
      throw new Error('Invalid DID:key format');
    }

    // Extract public key from DID
    const publicKey = this.extractPublicKeyFromDID(did);
    const algorithm = this.detectAlgorithmFromDID(did);
    const keyId = this.generateKeyId();

    return this.createDIDDocument(did, publicKey, keyId, algorithm);
  }

  /**
   * Verify a DID:key signature
   */
  async verifySignature(did: string, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    try {
      const publicKey = this.extractPublicKeyFromDID(did);
      const algorithm = this.detectAlgorithmFromDID(did);
      
      return await this.verifyWithAlgorithm(data, signature, publicKey, algorithm);
    } catch (error) {
      return false;
    }
  }

  /**
   * Sign data with a DID:key
   */
  async signWithDID(did: string, data: Uint8Array, privateKey: string): Promise<Uint8Array> {
    const algorithm = this.detectAlgorithmFromDID(did);
    return await this.signWithAlgorithm(data, privateKey, algorithm);
  }

  /**
   * Rotate keys for a DID:key
   */
  async rotateKeys(did: string, newPrivateKey: string): Promise<DIDKeyCreateResult> {
    if (!this.didKeyConfig.enableKeyRotation) {
      throw new Error('Key rotation is not enabled');
    }

    const algorithm = this.detectAlgorithmFromDID(did);
    const keyPair = await this.importKeyPair(newPrivateKey, algorithm);
    const newDID = this.createDIDFromPublicKey(keyPair.publicKey, algorithm);
    const keyId = this.generateKeyId();

    return {
      did: newDID,
      document: this.createDIDDocument(newDID, keyPair.publicKey, keyId, algorithm),
      publicKey: keyPair.publicKey,
      keyId,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Export DID:key to different formats
   */
  async exportDID(did: string, format: 'jwk' | 'pem' | 'hex' = 'jwk'): Promise<string> {
    const publicKey = this.extractPublicKeyFromDID(did);
    return await this.exportPublicKey(publicKey, format);
  }

  /**
   * Import DID:key from different formats
   */
  async importDID(keyData: string, format: 'jwk' | 'pem' | 'hex', algorithm: string): Promise<DIDKeyCreateResult> {
    const keyPair = await this.importKeyPair(keyData, algorithm);
    const did = this.createDIDFromPublicKey(keyPair.publicKey, algorithm);
    const keyId = this.generateKeyId();

    return {
      did,
      document: this.createDIDDocument(did, keyPair.publicKey, keyId, algorithm),
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      keyId,
      createdAt: new Date().toISOString()
    };
  }

  // Private helper methods

  private async validateDIDKeySupport(): Promise<void> {
    // Validate that the required cryptographic algorithms are available
    const algorithms = ['Ed25519', 'Secp256k1'];
    
    for (const algorithm of algorithms) {
      if (!this.isAlgorithmSupported(algorithm)) {
        throw new Error(`Algorithm ${algorithm} is not supported in this environment`);
      }
    }
  }

  private async registerDIDMethod(context: PluginContext): Promise<void> {
    // Register DID:key method with the agent's DID manager
    if (context.apis?.did) {
      // This would integrate with the agent's DID management system
      console.log('DID:key method registered with agent');
    }
  }

  private async generateKeyPair(algorithm: string, keySize?: number): Promise<{ publicKey: string; privateKey: string }> {
    // This would use the agent's key management system
    // For now, return a mock implementation
    const keyId = this.generateKeyId();
    
    return {
      publicKey: `mock-public-key-${keyId}`,
      privateKey: `mock-private-key-${keyId}`
    };
  }

  private createDIDFromPublicKey(publicKey: string, algorithm: string): string {
    // Create DID:key format: did:key:z<multibase-encoded-public-key>
    const encoded = this.encodePublicKey(publicKey, algorithm);
    return `did:key:z${encoded}`;
  }

  private createDIDDocument(did: string, publicKey: string, keyId: string, algorithm: string): any {
    return {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: did,
      verificationMethod: [{
        id: `${did}#${keyId}`,
        type: this.getVerificationMethodType(algorithm),
        controller: did,
        publicKeyJwk: this.publicKeyToJWK(publicKey, algorithm)
      }],
      authentication: [`${did}#${keyId}`],
      assertionMethod: [`${did}#${keyId}`],
      capabilityDelegation: [`${did}#${keyId}`],
      capabilityInvocation: [`${did}#${keyId}`]
    };
  }

  private isValidDIDKey(did: string): boolean {
    if (!this.didKeyConfig.validateFormat) return true;
    
    const pattern = /^did:key:z[1-9A-HJ-NP-Za-km-z]+$/;
    return pattern.test(did);
  }

  private extractPublicKeyFromDID(did: string): string {
    const prefix = 'did:key:z';
    if (!did.startsWith(prefix)) {
      throw new Error('Invalid DID:key format');
    }
    
    const encoded = did.substring(prefix.length);
    return this.decodePublicKey(encoded);
  }

  private detectAlgorithmFromDID(did: string): string {
    // Detect algorithm from the multibase prefix
    const prefix = 'did:key:z';
    const encoded = did.substring(prefix.length);
    
    // This is a simplified detection - in practice, you'd decode the multibase
    // and check the multicodec prefix
    if (encoded.startsWith('6Mk')) return 'Ed25519';
    if (encoded.startsWith('6L')) return 'Secp256k1';
    if (encoded.startsWith('6R')) return 'RSA';
    
    return 'Ed25519'; // Default
  }

  private generateKeyId(): string {
    return `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private encodePublicKey(publicKey: string, algorithm: string): string {
    // Mock implementation - in practice, this would use multibase encoding
    return `6Mk${publicKey.substring(0, 10)}`;
  }

  private decodePublicKey(encoded: string): string {
    // Mock implementation - in practice, this would decode multibase
    return `decoded-${encoded}`;
  }

  private getVerificationMethodType(algorithm: string): string {
    switch (algorithm) {
      case 'Ed25519': return 'Ed25519VerificationKey2020';
      case 'Secp256k1': return 'EcdsaSecp256k1VerificationKey2019';
      case 'RSA': return 'RsaVerificationKey2018';
      default: return 'Ed25519VerificationKey2020';
    }
  }

  private publicKeyToJWK(publicKey: string, algorithm: string): any {
    // Mock implementation - in practice, this would convert to JWK format
    return {
      kty: algorithm === 'RSA' ? 'RSA' : 'EC',
      crv: algorithm === 'Ed25519' ? 'Ed25519' : 'secp256k1',
      x: publicKey
    };
  }

  private isAlgorithmSupported(algorithm: string): boolean {
    // Mock implementation - in practice, this would check crypto support
    return ['Ed25519', 'Secp256k1', 'RSA'].includes(algorithm);
  }

  private async verifyWithAlgorithm(data: Uint8Array, signature: Uint8Array, publicKey: string, algorithm: string): Promise<boolean> {
    // Mock implementation - in practice, this would verify the signature
    return true;
  }

  private async signWithAlgorithm(data: Uint8Array, privateKey: string, algorithm: string): Promise<Uint8Array> {
    // Mock implementation - in practice, this would sign the data
    return new Uint8Array(32);
  }

  private async importKeyPair(keyData: string, algorithm: string): Promise<{ publicKey: string; privateKey: string }> {
    // Mock implementation - in practice, this would import the key pair
    return {
      publicKey: `imported-public-${keyData.substring(0, 10)}`,
      privateKey: keyData
    };
  }

  private async exportPublicKey(publicKey: string, format: string): Promise<string> {
    // Mock implementation - in practice, this would export in the requested format
    return `exported-${format}-${publicKey}`;
  }
} 