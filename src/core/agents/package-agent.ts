/**
 * Package Agent Implementation
 * Extends BaseAgent for package-specific functionality
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

export interface PackageMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  repository?: string;
  dependencies?: Record<string, string>;
  hashes?: {
    sha256?: string;
    sha512?: string;
  };
}

export interface PackageAgentConfig {
  packageName: string;
  packageVersion: string;
  signingKeyType?: string;
  releasePolicy?: {
    requireSignedCommits?: boolean;
    requireCodeReview?: boolean;
    requiredApprovers?: number;
  };
}

/**
 * Package Agent Implementation
 * Provides package-specific functionality for managing package credentials and metadata
 */
export class PackageAgent extends BaseAgent {
  private packageName: string;
  private packageVersion: string;
  private config: PackageAgentConfig;
  private packageDID: string | null = null;
  public version: string;

  constructor(config: PackageAgentConfig) {
    super(
      `package-${config.packageName}-${config.packageVersion}`,
      AgentType.PACKAGE,
      undefined
    );
    this.packageName = config.packageName;
    this.packageVersion = config.packageVersion;
    this.version = config.packageVersion;
    this.config = config;
  }

  getType(): string {
    return 'package';
  }

  async issueCredential(template: CredentialTemplate): Promise<VerifiableCredential> {
    try {
      // Use the real Veramo credential issuance with JWT format
      const credential = await this.agent.createVerifiableCredential({
        credential: {
          '@context': template['@context'] || ['https://www.w3.org/ns/credentials/v2'],
          id: `urn:uuid:${this.generateId()}`,
          type: ['VerifiableCredential', ...template.type],
          issuer: typeof template.issuer === 'string' ? template.issuer : template.issuer.id,
          validFrom: template.validFrom || new Date().toISOString(),
          validUntil: template.validUntil,
          credentialSubject: {
            ...template.credentialSubject,
            packageName: this.packageName,
            packageVersion: this.packageVersion
          }
        },
        proofFormat: 'jwt',
        fetchRemoteContexts: true
      });

      return credential;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to issue credential: ${err.message}`);
    }
  }

  async createPackageDID(): Promise<IIdentifier> {
    const did = await this.createDID('key', {
      alias: `${this.packageName}@${this.packageVersion}`,
      provider: 'did:key'
    });

    this.packageDID = did.did;
    return did;
  }

  async getPackageDID(): Promise<string | null> {
    return this.packageDID;
  }

  async signRelease(metadata: PackageMetadata): Promise<VerifiableCredential> {
    if (!this.packageDID) {
      throw new Error('Package DID not created. Call createPackageDID first.');
    }

    try {
      const releaseCredential: CredentialTemplate = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1',
          'https://w3id.org/vc-revocation-list-2020/v1'
        ],
        type: ['VerifiableCredential', 'PackageReleaseCredential'],
        issuer: this.packageDID,
        validFrom: new Date().toISOString(),
        credentialSubject: {
          id: `pkg:npm/${metadata.name}@${metadata.version}`,
          name: metadata.name,
          version: metadata.version,
          description: metadata.description,
          author: metadata.author,
          license: metadata.license,
          repository: metadata.repository,
          hashes: metadata.hashes
        }
      };

      return await this.issueCredential(releaseCredential);
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to sign release: ${error.message}`);
    }
  }

  async createPackageCredential(metadata: PackageMetadata): Promise<VerifiableCredential> {
    if (!this.packageDID) {
      throw new Error('Package DID not created. Call createPackageDID first.');
    }

    try {
      const packageCredential: CredentialTemplate = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1'
        ],
        type: ['VerifiableCredential', 'PackageIdentityCredential'],
        issuer: this.packageDID,
        validFrom: new Date().toISOString(),
        credentialSubject: {
          id: `pkg:npm/${metadata.name}`,
          name: metadata.name,
          maintainers: metadata.author ? [metadata.author] : [],
          repository: metadata.repository,
          license: metadata.license
        }
      };

      return await this.issueCredential(packageCredential);
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to create package credential: ${error.message}`);
    }
  }

  async verifyCredential(credential: VerifiableCredential): Promise<ValidationResult> {
    // Use the BaseAgent's verification method which includes custom fallback
    return await super.verifyCredential(credential);
  }

  async verifyPackageCredential(credential: VerifiableCredential): Promise<ValidationResult> {
    try {
      // First verify the credential itself
      const verificationResult = await this.verifyCredential(credential);
      if (!verificationResult.isValid) {
        return verificationResult;
      }

      // Additional package-specific verification
      const subject = credential.credentialSubject as any;
      if (!subject.name || !subject.version) {
        return {
          isValid: false,
          trustStatus: {
            status: TrustStatus.UNTRUSTED,
            lastChecked: new Date().toISOString(),
            source: 'package-verification'
          },
          validationErrors: ['Missing required package metadata (name or version)'],
          warnings: []
        };
      }

      // Verify package name and version match
      if (subject.name !== this.packageName || subject.version !== this.packageVersion) {
        return {
          isValid: false,
          trustStatus: {
            status: TrustStatus.UNTRUSTED,
            lastChecked: new Date().toISOString(),
            source: 'package-verification'
          },
          validationErrors: ['Package name or version mismatch'],
          warnings: []
        };
      }

      return {
        isValid: true,
        trustStatus: {
          status: TrustStatus.TRUSTED,
          lastChecked: new Date().toISOString(),
          source: 'package-verification'
        },
        validationErrors: [],
        warnings: []
      };
    } catch (err) {
      const error = err as Error;
      return {
        isValid: false,
        trustStatus: {
          status: TrustStatus.UNKNOWN,
          lastChecked: new Date().toISOString(),
          source: 'package-verification'
        },
        validationErrors: [error.message],
        warnings: []
      };
    }
  }

  getCapabilities(): string[] {
    return [
      'create-package-did',
      'sign-package-metadata',
      'verify-package-signatures',
      'manage-release-credentials'
    ];
  }
} 