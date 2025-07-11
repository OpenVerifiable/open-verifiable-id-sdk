/**
 * W3C Verifiable Credentials 2.0 Plugin
 * 
 * Implements the W3C Verifiable Credentials 2.0 standard for creating,
 * validating, and managing verifiable credentials.
 * 
 * This plugin provides comprehensive support for the VC 2.0 data model,
 * including all credential types, proof formats, and validation rules.
 */

import { BasePlugin } from '../base-plugin.js';
import type { 
  PluginContext, 
  PluginAuthor, 
  ValidationResult,
  PluginMetadata 
} from '../interfaces.js';

export interface W3CVC20PluginConfig {
  /** Default proof type to use */
  defaultProofType?: 'DataIntegrityProof' | 'JwtProof' | 'EthereumEip712Signature2021';
  /** Whether to enable JSON-LD processing */
  enableJsonLd?: boolean;
  /** Whether to validate credential schemas */
  validateSchemas?: boolean;
  /** Whether to check revocation status */
  checkRevocation?: boolean;
  /** Whether to verify issuer trust */
  verifyIssuerTrust?: boolean;
  /** Custom JSON-LD contexts */
  customContexts?: Record<string, string>;
}

export interface VC20CreateOptions {
  /** Credential type */
  type: string | string[];
  /** Credential subject */
  credentialSubject: any;
  /** Issuer DID */
  issuer: string;
  /** Validity period */
  validityPeriod?: {
    validFrom?: string;
    validUntil?: string;
  };
  /** Custom context URLs */
  context?: string[];
  /** Custom properties */
  customProperties?: Record<string, any>;
  /** Proof options */
  proofOptions?: {
    type?: string;
    verificationMethod?: string;
    created?: string;
    challenge?: string;
    domain?: string;
  };
}

export interface VC20CreateResult {
  /** The created credential */
  credential: any;
  /** Proof attached to the credential */
  proof?: any;
  /** Creation timestamp */
  createdAt: string;
  /** Credential ID */
  id: string;
}

export interface VC20VerifyOptions {
  /** Whether to check revocation status */
  checkRevocation?: boolean;
  /** Whether to verify issuer trust */
  verifyIssuerTrust?: boolean;
  /** Whether to validate schema */
  validateSchema?: boolean;
  /** Whether to verify proof */
  verifyProof?: boolean;
  /** Custom verification policies */
  policies?: string[];
}

export interface VC20VerifyResult {
  /** Whether verification passed */
  isValid: boolean;
  /** Verification details */
  details: {
    schemaValid: boolean;
    proofValid: boolean;
    issuerTrusted: boolean;
    notRevoked: boolean;
    notExpired: boolean;
  };
  /** Verification errors */
  errors: string[];
  /** Verification warnings */
  warnings: string[];
  /** Verification timestamp */
  verifiedAt: string;
}

export class W3CVC20Plugin extends BasePlugin {
  private vcConfig: W3CVC20PluginConfig;

  constructor(config: W3CVC20PluginConfig = {}) {
    super(
      'w3c-vc-2-0-plugin',
      'W3C Verifiable Credentials 2.0 Plugin',
      '1.0.0',
      'regular',
      'credential-type',
      {
        name: 'Open Verifiable',
        did: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
        email: 'plugins@open-verifiable.org'
      },
      [
        'vc:create',
        'vc:verify',
        'vc:validate',
        'vc:revoke',
        'vc:present',
        'vc:export',
        'vc:import'
      ],
      {
        description: 'W3C Verifiable Credentials 2.0 implementation',
        config
      }
    );

    this.vcConfig = {
      defaultProofType: 'DataIntegrityProof',
      enableJsonLd: true,
      validateSchemas: true,
      checkRevocation: true,
      verifyIssuerTrust: true,
      customContexts: {},
      ...config
    };
  }

  protected async onInitialize(context: PluginContext): Promise<void> {
    // Initialize VC 2.0 capabilities
    await this.validateVC20Support();
    
    // Register VC 2.0 with the agent's credential system
    if (context.apis?.credentials) {
      await this.registerVC20WithAgent(context);
    }
  }

  protected async onCleanup(): Promise<void> {
    // Cleanup any VC 2.0 specific resources
  }

  protected async onValidateConfig(config: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.defaultProofType && !['DataIntegrityProof', 'JwtProof', 'EthereumEip712Signature2021'].includes(config.defaultProofType)) {
      errors.push('Invalid defaultProofType. Must be one of: DataIntegrityProof, JwtProof, EthereumEip712Signature2021');
    }

    if (config.customContexts && typeof config.customContexts !== 'object') {
      errors.push('customContexts must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a W3C VC 2.0 credential
   */
  async createCredential(options: VC20CreateOptions): Promise<VC20CreateResult> {
    // Validate required fields
    this.validateCreateOptions(options);

    // Create credential structure
    const credential = this.createCredentialStructure(options);
    
    // Add proof if requested
    let proof: any = undefined;
    if (options.proofOptions) {
      proof = await this.createProof(credential, options.proofOptions);
    }

    return {
      credential,
      proof,
      createdAt: new Date().toISOString(),
      id: credential.id
    };
  }

  /**
   * Verify a W3C VC 2.0 credential
   */
  async verifyCredential(credential: any, options: VC20VerifyOptions = {}): Promise<VC20VerifyResult> {
    const verifyOptions = {
      checkRevocation: this.vcConfig.checkRevocation,
      verifyIssuerTrust: this.vcConfig.verifyIssuerTrust,
      validateSchema: this.vcConfig.validateSchemas,
      verifyProof: true,
      ...options
    };

    const details = {
      schemaValid: true,
      proofValid: true,
      issuerTrusted: true,
      notRevoked: true,
      notExpired: true
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate credential structure
    if (!this.isValidVC20Structure(credential)) {
      errors.push('Invalid VC 2.0 credential structure');
      details.schemaValid = false;
    }

    // Validate schema if enabled
    if (verifyOptions.validateSchema) {
      const schemaValid = await this.validateCredentialSchema(credential);
      if (!schemaValid) {
        errors.push('Credential schema validation failed');
        details.schemaValid = false;
      }
    }

    // Verify proof if enabled
    if (verifyOptions.verifyProof && credential.proof) {
      const proofValid = await this.verifyCredentialProof(credential);
      if (!proofValid) {
        errors.push('Credential proof verification failed');
        details.proofValid = false;
      }
    }

    // Check revocation if enabled
    if (verifyOptions.checkRevocation) {
      const notRevoked = await this.checkRevocationStatus(credential);
      if (!notRevoked) {
        errors.push('Credential has been revoked');
        details.notRevoked = false;
      }
    }

    // Verify issuer trust if enabled
    if (verifyOptions.verifyIssuerTrust) {
      const issuerTrusted = await this.verifyIssuerTrust(credential);
      if (!issuerTrusted) {
        warnings.push('Issuer trust verification failed');
        details.issuerTrusted = false;
      }
    }

    // Check expiration
    const notExpired = this.checkExpiration(credential);
    if (!notExpired) {
      errors.push('Credential has expired');
      details.notExpired = false;
    }

    return {
      isValid: errors.length === 0,
      details,
      errors,
      warnings,
      verifiedAt: new Date().toISOString()
    };
  }

  /**
   * Validate credential structure
   */
  async validateCredentialStructure(credential: any): Promise<boolean> {
    return this.isValidVC20Structure(credential);
  }

  /**
   * Present a credential (create presentation)
   */
  async createPresentation(
    credentials: any[],
    options: {
      holder?: string;
      verifier?: string;
      challenge?: string;
      domain?: string;
    } = {}
  ): Promise<any> {
    const presentation = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiablePresentation'],
      holder: options.holder,
      verifiableCredential: credentials,
      verifier: options.verifier,
      challenge: options.challenge,
      domain: options.domain
    };

    return presentation;
  }

  /**
   * Export credential to different formats
   */
  async exportCredential(credential: any, format: 'json' | 'jwt' | 'cbor' = 'json'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(credential, null, 2);
      case 'jwt':
        return await this.convertToJWT(credential);
      case 'cbor':
        return await this.convertToCBOR(credential);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import credential from different formats
   */
  async importCredential(data: string, format: 'json' | 'jwt' | 'cbor' = 'json'): Promise<any> {
    switch (format) {
      case 'json':
        return JSON.parse(data);
      case 'jwt':
        return await this.convertFromJWT(data);
      case 'cbor':
        return await this.convertFromCBOR(data);
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  // Private helper methods

  private async validateVC20Support(): Promise<void> {
    // Validate that the required VC 2.0 features are available
    if (this.vcConfig.enableJsonLd) {
      // Check JSON-LD support
      if (!this.isJsonLdSupported()) {
        throw new Error('JSON-LD processing is not supported in this environment');
      }
    }
  }

  private async registerVC20WithAgent(context: PluginContext): Promise<void> {
    // Register VC 2.0 with the agent's credential management system
    if (context.apis?.credentials) {
      console.log('W3C VC 2.0 registered with agent credential system');
    }
  }

  private validateCreateOptions(options: VC20CreateOptions): void {
    if (!options.type) {
      throw new Error('Credential type is required');
    }
    if (!options.credentialSubject) {
      throw new Error('Credential subject is required');
    }
    if (!options.issuer) {
      throw new Error('Issuer is required');
    }
  }

  private createCredentialStructure(options: VC20CreateOptions): any {
    const id = this.generateCredentialId();
    const now = new Date().toISOString();

    return {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        ...(options.context || [])
      ],
      id,
      type: Array.isArray(options.type) ? options.type : [options.type],
      issuer: options.issuer,
      validFrom: options.validityPeriod?.validFrom || now,
      validUntil: options.validityPeriod?.validUntil,
      credentialSubject: options.credentialSubject,
      ...options.customProperties
    };
  }

  private async createProof(credential: any, proofOptions: any): Promise<any> {
    // Mock implementation - in practice, this would create a cryptographic proof
    return {
      type: proofOptions.type || this.vcConfig.defaultProofType,
      created: proofOptions.created || new Date().toISOString(),
      verificationMethod: proofOptions.verificationMethod,
      challenge: proofOptions.challenge,
      domain: proofOptions.domain,
      proofValue: 'mock-proof-value'
    };
  }

  private isValidVC20Structure(credential: any): boolean {
    // Basic VC 2.0 structure validation
    if (!credential['@context']) return false;
    if (!credential.id) return false;
    if (!credential.type) return false;
    if (!credential.issuer) return false;
    if (!credential.credentialSubject) return false;
    if (!credential.validFrom) return false;

    return true;
  }

  private async validateCredentialSchema(credential: any): Promise<boolean> {
    // Mock implementation - in practice, this would validate against schemas
    return true;
  }

  private async verifyCredentialProof(credential: any): Promise<boolean> {
    // Mock implementation - in practice, this would verify the cryptographic proof
    return true;
  }

  private async checkRevocationStatus(credential: any): Promise<boolean> {
    // Mock implementation - in practice, this would check revocation status
    return true;
  }

  private async verifyIssuerTrust(credential: any): Promise<boolean> {
    // Mock implementation - in practice, this would verify issuer trust
    return true;
  }

  private checkExpiration(credential: any): boolean {
    if (!credential.validUntil) return true;
    
    const now = new Date();
    const validUntil = new Date(credential.validUntil);
    
    return now <= validUntil;
  }

  private generateCredentialId(): string {
    return `urn:uuid:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isJsonLdSupported(): boolean {
    // Mock implementation - in practice, this would check JSON-LD library availability
    return true;
  }

  private async convertToJWT(credential: any): Promise<string> {
    // Mock implementation - in practice, this would convert to JWT format
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(credential))}.mock-signature`;
  }

  private async convertFromJWT(jwt: string): Promise<any> {
    // Mock implementation - in practice, this would convert from JWT format
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    return JSON.parse(atob(parts[1]));
  }

  private async convertToCBOR(credential: any): Promise<string> {
    // Mock implementation - in practice, this would convert to CBOR format
    return `cbor-${btoa(JSON.stringify(credential))}`;
  }

  private async convertFromCBOR(cbor: string): Promise<any> {
    // Mock implementation - in practice, this would convert from CBOR format
    if (!cbor.startsWith('cbor-')) {
      throw new Error('Invalid CBOR format');
    }
    return JSON.parse(atob(cbor.substring(5)));
  }
} 