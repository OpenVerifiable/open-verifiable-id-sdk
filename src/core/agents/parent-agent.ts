/**
 * Parent Agent Implementation
 * Extends BaseAgent for parent-specific functionality
 * Based on ADR-0007: Agent Architecture and Extensibility
 */

import { BaseAgent } from './base.js';
import {
  IIdentifier,
  VerifiableCredential,
  ValidationResult,
  CredentialTemplate,
  CreateDIDOptions,
  AgentType,
  TrustStatus
} from '../../types';

export interface ParentAgentConfig {
  organizationId: string;
  delegationPolicy?: {
    allowedPermissions: string[];
    maxDelegationDepth?: number;
    requireApproval?: boolean;
    approvers?: string[];
  };
  trustSettings?: {
    trustedIssuers: string[];
    trustedRegistries: string[];
    validationRules: string[];
  };
  governanceRules?: {
    requiredCredentials: string[];
    revocationPolicy: {
      autoRevoke?: boolean;
      revocationReasons: string[];
    };
  };
}

export interface DelegationOptions {
  childDID: string;
  permissions: string[];
  validFrom?: string;
  validUntil?: string;
  constraints?: {
    maxDelegations?: number;
    allowedActions?: string[];
    requiredCredentials?: string[];
  };
}

/**
 * Parent Agent Implementation
 * Provides parent-specific functionality for managing child agents and delegations
 */
export class ParentAgent extends BaseAgent {
  private organizationId: string;
  private config: ParentAgentConfig;
  private organizationDID: string | null = null;
  private childAgents: Map<string, string> = new Map(); // agentId -> DID mapping

  constructor(config: ParentAgentConfig) {
    super(
      `parent-${config.organizationId}`,
      AgentType.PARENT,
      undefined
    );
    this.organizationId = config.organizationId;
    this.config = config;
  }

  getType(): string {
    return 'parent';
  }

  async createOrganizationDID(): Promise<IIdentifier> {
    const did = await this.createDID('key', {
      alias: `org-${this.organizationId}`,
      provider: 'did:key'
    });

    this.organizationDID = did.did;
    return did;
  }

  async getOrganizationDID(): Promise<string | null> {
    return this.organizationDID;
  }

  async delegateAuthority(options: DelegationOptions): Promise<VerifiableCredential> {
    if (!this.organizationDID) {
      throw new Error('Organization DID not created. Call createOrganizationDID first.');
    }

    // Validate permissions against policy
    if (this.config.delegationPolicy?.allowedPermissions) {
      const invalidPermissions = options.permissions.filter(
        p => !this.config.delegationPolicy?.allowedPermissions.includes(p)
      );
      if (invalidPermissions.length > 0) {
        throw new Error(`Invalid permissions requested: ${invalidPermissions.join(', ')}`);
      }
    }

    try {
      const delegationCredential: CredentialTemplate = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1'
        ],
        type: ['VerifiableCredential', 'DelegatedAuthorityCredential'],
        issuer: this.organizationDID,
        validFrom: options.validFrom || new Date().toISOString(),
        validUntil: options.validUntil,
        credentialSubject: {
          id: options.childDID,
          delegatedBy: this.organizationDID,
          permissions: options.permissions,
          constraints: options.constraints || {}
        }
      };

      return await this.issueCredential(delegationCredential);
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to delegate authority: ${error.message}`);
    }
  }

  async delegateToChild(childAgentId: string, permissions: string[]): Promise<VerifiableCredential> {
    const childDID = this.childAgents.get(childAgentId);
    if (!childDID) {
      throw new Error(`Child agent ${childAgentId} not registered`);
    }

    return this.delegateAuthority({
      childDID,
      permissions,
      constraints: {
        maxDelegations: 1,
        allowedActions: permissions
      }
    });
  }

  async registerChildAgent(agentId: string, did: string): Promise<void> {
    this.childAgents.set(agentId, did);
  }

  async unregisterChildAgent(agentId: string): Promise<void> {
    this.childAgents.delete(agentId);
  }

  async getChildAgents(): Promise<Map<string, string>> {
    return new Map(this.childAgents);
  }

  async verifyDelegation(credential: VerifiableCredential): Promise<ValidationResult> {
    try {
      // First verify the credential itself
      const verificationResult = await this.verifyCredential(credential);
      if (!verificationResult.isValid) {
        return verificationResult;
      }

      // Additional delegation-specific verification
      const subject = credential.credentialSubject as any;
      if (!subject.delegatedBy || !subject.permissions) {
        return {
          isValid: false,
          trustStatus: {
            status: TrustStatus.UNTRUSTED,
            lastChecked: new Date().toISOString(),
            source: 'delegation-verification'
          },
          validationErrors: ['Missing required delegation fields'],
          warnings: []
        };
      }

      // Verify delegation chain
      if (subject.delegatedBy !== this.organizationDID) {
        return {
          isValid: false,
          trustStatus: {
            status: TrustStatus.UNTRUSTED,
            lastChecked: new Date().toISOString(),
            source: 'delegation-verification'
          },
          validationErrors: ['Invalid delegation chain'],
          warnings: []
        };
      }

      return {
        isValid: true,
        trustStatus: {
          status: TrustStatus.TRUSTED,
          lastChecked: new Date().toISOString(),
          source: 'delegation-verification'
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
          source: 'delegation-verification'
        },
        validationErrors: [error.message],
        warnings: []
      };
    }
  }

  getCapabilities(): string[] {
    return [
      'create-organization-did',
      'delegate-permissions',
      'manage-child-agents',
      'issue-organization-credentials',
      'revoke-credentials'
    ];
  }
} 