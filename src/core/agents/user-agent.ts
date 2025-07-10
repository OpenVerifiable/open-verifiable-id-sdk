/**
 * User Agent - for individual user identity management
 * Uses Veramo framework with Cheqd and DID key support
 */

import { BaseAgent } from './base.js';
import {
  IIdentifier,
  VerifiableCredential,
  ValidationResult,
  CredentialTemplate,
  CreateDIDOptions,
  AgentType
} from '../../types';

export interface UserAgentConfig {
  userId: string;
  encryptionKey?: string;
  biometricEnabled?: boolean;
  storageType?: 'local' | 'cloud';
}

export interface DIDCreationResult {
  did: IIdentifier;
  mnemonic?: string;
  primaryDID: boolean;
}

export class UserAgent extends BaseAgent {
  private userId: string;
  private primaryDID: string | null = null;
  private config: UserAgentConfig;

  constructor(userIdOrConfig: string | UserAgentConfig, encryptionKey?: string) {
    let config: UserAgentConfig;
    
    // Support both old (string, string) and new (config object) constructor patterns
    if (typeof userIdOrConfig === 'string') {
      config = {
        userId: userIdOrConfig,
        encryptionKey: encryptionKey
      };
    } else {
      config = userIdOrConfig;
    }

    super(
      `user-${config.userId}`,
      AgentType.USER,
      config.encryptionKey
    );
    this.userId = config.userId;
    this.config = config;
  }

  getType(): string {
    return 'user';
  }

  async setPrimaryDID(did: string): Promise<void> {
    // Verify the DID exists and is controlled by this agent
    if (!this.agent) {
      throw new Error('Agent not initialized');
    }
    const didDoc = await this.agent.resolveDid({ didUrl: did });
    if (!didDoc) {
      throw new Error(`DID ${did} not found`);
    }
    this.primaryDID = did;
    console.log(`Setting primary DID: ${did}`);
  }

  async getPrimaryDID(): Promise<string | null> {
    return this.primaryDID;
  }

  async createPrimaryDID(method: string = 'key'): Promise<DIDCreationResult> {
    try {
      const did = await this.createDID(method, {
        alias: `${this.userId}-primary`,
        provider: `did:${method}`
      });

      await this.setPrimaryDID(did.did);

      return {
        did,
        primaryDID: true
      };
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to create primary DID: ${error.message}`);
    }
  }

  async signCredential(credential: VerifiableCredential, issuerDID?: string): Promise<VerifiableCredential> {
    const signingDID = issuerDID || this.primaryDID;
    if (!signingDID) {
      throw new Error('No signing DID available. Set a primary DID or provide an issuer DID.');
    }

    try {
      if (!this.agent) {
        throw new Error('Agent not initialized');
      }
      const result = await this.agent.createVerifiableCredential({
        credential: {
          ...credential,
          issuer: signingDID
        },
        proofFormat: 'jwt'
      });
      
      return {
        ...result,
        validFrom: credential.validFrom || new Date().toISOString()
      } as unknown as VerifiableCredential;
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to sign credential: ${error.message}`);
    }
  }

  async issueCredential(template: CredentialTemplate): Promise<VerifiableCredential> {
    // Use the base implementation which properly handles the template
    return await super.issueCredential(template);
  }

  async getStoredCredentials(): Promise<VerifiableCredential[]> {
    try {
      if (!this.agent) {
        throw new Error('Agent not initialized');
      }
      // Use the agent's data store to retrieve credentials
      const credentials = await this.agent.dataStoreORMGetVerifiableCredentials();
      return credentials;
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to retrieve stored credentials: ${error.message}`);
    }
  }

  async exportWallet(passphrase: string): Promise<string> {
    try {
      console.log(`Exporting wallet for user: ${this.agentId}`)
      // Export DIDs, keys, and credentials
      if (!this.agent) {
        throw new Error('Agent not initialized');
      }
      const dids = await this.agent.didManagerFind();
      const credentials = await this.getStoredCredentials();
      
      const exportData = {
        dids,
        credentials,
        primaryDID: this.primaryDID,
        userId: this.userId,
        timestamp: new Date().toISOString()
      };

      // TODO: Implement proper encryption using the passphrase
      return JSON.stringify(exportData);
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to export wallet: ${error.message}`);
    }
  }

  getCapabilities(): string[] {
    return [
      'create-did',
      'import-did',
      'issue-credential',
      'verify-credential',
      'store-credential',
      'export-backup',
      'biometric-auth'
    ];
  }
} 