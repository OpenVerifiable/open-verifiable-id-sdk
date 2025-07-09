/**
 * Service Agent Implementation
 * Extends BaseAgent for service-specific functionality
 * Based on ADR-0007: Agent Architecture and Extensibility
 */

import { BaseAgent } from './base';
import {
  IIdentifier,
  VerifiableCredential,
  ValidationResult,
  CredentialTemplate,
  CreateDIDOptions,
  AgentType,
  TrustStatus
} from '../../types';

export interface ServiceAgentConfig {
  serviceId: string;
  serviceEndpoint?: string;
  trustRegistryEndpoint?: string;
  revocationEndpoint?: string;
  schemaEndpoint?: string;
  validationRules?: {
    requiredFields?: string[];
    allowedIssuers?: string[];
    allowedTypes?: string[];
    maxValidityDuration?: number;
  };
}

export interface ServiceVerificationOptions {
  checkRevocation?: boolean;
  checkTrustRegistry?: boolean;
  validateSchema?: boolean;
  validateSignature?: boolean;
  validateExpiry?: boolean;
}

/**
 * Service Agent Implementation
 * Provides service-specific functionality for managing service credentials and API access
 */
export class ServiceAgent extends BaseAgent {
  private serviceId: string;
  private config: ServiceAgentConfig;
  private serviceDID: string | null = null;
  private serviceEndpoints: Map<string, string> = new Map();
  private apiKeys: Map<string, string> = new Map();
  private serviceCapabilities: string[] = [];
  public serviceConfig: any;

  constructor(config: ServiceAgentConfig) {
    super(
      `service-${config.serviceId}`,
      AgentType.SERVICE,
      undefined
    );
    this.serviceId = config.serviceId;
    this.config = config;
    this.serviceConfig = {
      endpoint: config.serviceEndpoint || 'http://localhost',
      ...config
    };
  }

  getType(): string {
    return 'service';
  }

  async createServiceDID(): Promise<IIdentifier> {
    const did = await this.createDID('key', {
      alias: `service-${this.serviceId}`,
      provider: 'did:key'
    });

    this.serviceDID = did.did;
    return did;
  }

  async getServiceDID(): Promise<string | null> {
    return this.serviceDID;
  }

  async verifyExternalCredential(
    credential: VerifiableCredential,
    options: ServiceVerificationOptions = {}
  ): Promise<ValidationResult> {
    try {
      // First verify the credential itself
      const verificationResult = await this.verifyCredential(credential);
      if (!verificationResult.isValid) {
        return verificationResult;
      }

      const validationErrors: string[] = [];
      const warnings: string[] = [];

      // Check revocation if enabled
      if (options.checkRevocation && this.config.revocationEndpoint) {
        try {
          const revocationStatus = await this.checkRevocationStatus(credential);
          if (revocationStatus.isRevoked) {
            validationErrors.push(`Credential revoked: ${revocationStatus.reason}`);
          }
        } catch (err) {
          warnings.push('Revocation check failed');
        }
      }

      // Check trust registry if enabled
      if (options.checkTrustRegistry && this.config.trustRegistryEndpoint) {
        try {
          const trustStatus = await this.checkTrustRegistry(credential.issuer as string);
          if (!trustStatus.isTrusted) {
            validationErrors.push(`Issuer not trusted: ${credential.issuer}`);
          }
        } catch (err) {
          warnings.push('Trust registry check failed');
        }
      }

      // Validate schema if enabled
      if (options.validateSchema && this.config.schemaEndpoint) {
        try {
          const schemaValidation = await this.validateCredentialSchema(credential);
          if (!schemaValidation.isValid) {
            validationErrors.push(...schemaValidation.errors);
          }
        } catch (err) {
          warnings.push('Schema validation failed');
        }
      }

      // Check expiry if enabled
      if (options.validateExpiry) {
        const now = new Date();
        const validUntil = new Date(credential.validUntil || '');
        if (validUntil < now) {
          validationErrors.push('Credential has expired');
        }
      }

      return {
        isValid: validationErrors.length === 0,
        trustStatus: {
          status: validationErrors.length === 0 ? TrustStatus.TRUSTED : TrustStatus.UNTRUSTED,
          lastChecked: new Date().toISOString(),
          source: 'service-verification'
        },
        validationErrors,
        warnings
      };
    } catch (err) {
      const error = err as Error;
      return {
        isValid: false,
        trustStatus: {
          status: TrustStatus.UNKNOWN,
          lastChecked: new Date().toISOString(),
          source: 'service-verification'
        },
        validationErrors: [error.message],
        warnings: []
      };
    }
  }

  private async checkRevocationStatus(credential: VerifiableCredential): Promise<{ isRevoked: boolean; reason?: string }> {
    // TODO: Implement revocation checking using revocationEndpoint
    return { isRevoked: false };
  }

  private async checkTrustRegistry(issuer: string): Promise<{ isTrusted: boolean; details?: any }> {
    // TODO: Implement trust registry checking using trustRegistryEndpoint
    return { isTrusted: true };
  }

  private async validateCredentialSchema(credential: VerifiableCredential): Promise<{ isValid: boolean; errors: string[] }> {
    // TODO: Implement schema validation using schemaEndpoint
    return { isValid: true, errors: [] };
  }

  async validateCredentialFields(credential: VerifiableCredential): Promise<ValidationResult> {
    const validationErrors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (this.config.validationRules?.requiredFields) {
      for (const field of this.config.validationRules.requiredFields) {
        if (!(field in credential.credentialSubject)) {
          validationErrors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check allowed issuers
    if (this.config.validationRules?.allowedIssuers) {
      if (!this.config.validationRules.allowedIssuers.includes(credential.issuer as string)) {
        validationErrors.push(`Issuer not allowed: ${credential.issuer}`);
      }
    }

    // Check allowed types
    if (this.config.validationRules?.allowedTypes) {
      const hasAllowedType = credential.type.some(t => 
        this.config.validationRules?.allowedTypes?.includes(t)
      );
      if (!hasAllowedType) {
        validationErrors.push(`Credential type not allowed: ${credential.type.join(', ')}`);
      }
    }

    // Check validity duration
    if (this.config.validationRules?.maxValidityDuration && credential.validUntil) {
      const validFrom = new Date(credential.validFrom);
      const validUntil = new Date(credential.validUntil);
      const durationMs = validUntil.getTime() - validFrom.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);
      
      if (durationDays > this.config.validationRules.maxValidityDuration) {
        validationErrors.push(`Validity duration exceeds maximum allowed: ${durationDays} days`);
      }
    }

    return {
      isValid: validationErrors.length === 0,
      trustStatus: {
        status: validationErrors.length === 0 ? TrustStatus.TRUSTED : TrustStatus.UNTRUSTED,
        lastChecked: new Date().toISOString(),
        source: 'field-validation'
      },
      validationErrors,
      warnings
    };
  }

  getCapabilities(): string[] {
    return [
      'external-verification',
      'trust-registry-query',
      'revocation-checking',
      'schema-validation'
    ];
  }

  async createDID(method: string, options?: CreateDIDOptions): Promise<IIdentifier> {
    // Service-specific DID creation with service metadata
    const didId = `did:${method}:${this.generateId()}`;
    const keyId = `${didId}#key-1`;
    
    return {
      did: didId,
      controllerKeyId: keyId,
      provider: `did:${method}`,
      keys: [{
        kid: keyId,
        type: 'Ed25519',
        publicKeyHex: 'service-public-key',
        kms: 'local',
        meta: { 
          algorithms: ['EdDSA'],
          serviceId: this.serviceId,
          serviceType: 'api'
        }
      }],
      services: []
    };
  }

  async issueCredential(template: CredentialTemplate): Promise<VerifiableCredential> {
    // Service-specific credential issuance
    const credentialId = `urn:uuid:${this.generateId()}`;
    
    return {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      id: credentialId,
      type: ['VerifiableCredential', ...template.type],
      issuer: typeof template.issuer === 'string' ? template.issuer : template.issuer.id,
      validFrom: new Date().toISOString(),
      credentialSubject: {
        ...template.credentialSubject,
        serviceId: this.serviceId,
        serviceType: 'api'
      },
      proof: {
        type: 'DataIntegrityProof',
        cryptosuite: 'eddsa-jcs-2022',
        created: new Date().toISOString(),
        verificationMethod: typeof template.issuer === 'string' ? template.issuer : template.issuer.id,
        proofPurpose: 'assertionMethod',
        proofValue: 'service-proof-value'
      }
    };
  }

  async verifyCredential(credential: VerifiableCredential): Promise<ValidationResult> {
    // Service-specific credential verification
    return {
      isValid: true,
      validationErrors: [],
      warnings: []
    };
  }

  // Service-specific methods
  async addServiceEndpoint(name: string, url: string): Promise<void> {
    this.serviceEndpoints.set(name, url);
  }

  async getServiceEndpoint(name: string): Promise<string | undefined> {
    return this.serviceEndpoints.get(name);
  }

  async listServiceEndpoints(): Promise<string[]> {
    return Array.from(this.serviceEndpoints.keys());
  }

  async generateAPIKey(service: string): Promise<string> {
    const apiKey = `api_${this.generateId()}`;
    this.apiKeys.set(service, apiKey);
    return apiKey;
  }

  async getAPIKey(service: string): Promise<string | undefined> {
    return this.apiKeys.get(service);
  }

  async revokeAPIKey(service: string): Promise<void> {
    this.apiKeys.delete(service);
  }

  async addServiceCapability(capability: string): Promise<void> {
    if (!this.serviceCapabilities.includes(capability)) {
      this.serviceCapabilities.push(capability);
    }
  }

  async removeServiceCapability(capability: string): Promise<void> {
    this.serviceCapabilities = this.serviceCapabilities.filter(c => c !== capability);
  }

  async getServiceCapabilities(): Promise<string[]> {
    return [...this.serviceCapabilities];
  }

  async issueServiceCredential(serviceType: string, metadata: any): Promise<VerifiableCredential> {
    const template: CredentialTemplate = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['ServiceCredential', serviceType],
      issuer: this.serviceDID || 'did:key:service',
      validFrom: new Date().toISOString(),
      credentialSubject: {
        id: this.agentId,
        serviceId: this.serviceId,
        serviceType,
        capabilities: this.serviceCapabilities,
        endpoints: Array.from(this.serviceEndpoints.entries()),
        ...metadata
      }
    };

    // Create credential directly to avoid overriding serviceType
    const credentialId = `urn:uuid:${this.generateId()}`;
    
    return {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      id: credentialId,
      type: ['VerifiableCredential', ...template.type],
      issuer: typeof template.issuer === 'string' ? template.issuer : template.issuer.id,
      validFrom: new Date().toISOString(),
      credentialSubject: template.credentialSubject,
      proof: {
        type: 'DataIntegrityProof',
        cryptosuite: 'eddsa-jcs-2022',
        created: new Date().toISOString(),
        verificationMethod: typeof template.issuer === 'string' ? template.issuer : template.issuer.id,
        proofPurpose: 'assertionMethod',
        proofValue: 'service-proof-value'
      }
    };
  }

  async getServiceProfile(): Promise<any> {
    return {
      serviceId: this.serviceId,
      agentId: this.agentId,
      agentType: this.agentType,
      createdAt: new Date().toISOString(),
      plugins: this.listPlugins().map(p => p.name),
      endpoints: Array.from(this.serviceEndpoints.entries()),
      capabilities: this.serviceCapabilities,
      apiServices: Array.from(this.apiKeys.keys())
    };
  }

  async validateServiceAccess(apiKey: string, service: string): Promise<boolean> {
    const storedKey = this.apiKeys.get(service);
    return storedKey === apiKey;
  }
} 