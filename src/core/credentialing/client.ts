import {
  CredentialTemplate,
  OpenVerifiableAgent,
  ValidationResult,
  VerifiableCredential_2_0,
  TrustRegistryClient,
  RevocationClient,
  TrustStatus,
  RevocationStatus,
  SecureStorage
} from '../../types'
import { 
  CredentialKeyManager, 
  CredentialKeyBundle, 
  KeyExportOptions, 
  KeyImportOptions,
  CrossDeviceSyncData
} from './key-manager'

export interface CredentialClientOptions {
  /** Optional agent used for signing & verification */
  agent?: OpenVerifiableAgent
  /** Optional trust-registry client for issuer trust checks */
  trustRegistry?: TrustRegistryClient
  /** Optional revocation client for revocation checks */
  revocation?: RevocationClient
  /** Optional secure storage for key management integration */
  storage?: SecureStorage
}

/**
 * Stand-alone component that centralises Verifiable Credential issuance and verification.
 *
 * ‑ Issues credentials by delegating to an OpenVerifiableAgent when available.
 * ‑ Verifies credentials through the agent and augments the result with trust-registry and revocation status.
 *
 * Designed to decouple credential logic from individual agent implementations and enable reuse in services,
 * CLIs or serverless functions that do not require full agent capabilities.
 */
export class CredentialClient {
  private readonly agent?: OpenVerifiableAgent
  private readonly trustRegistry?: TrustRegistryClient
  private readonly revocation?: RevocationClient
  private readonly keyManager?: CredentialKeyManager

  constructor (options: CredentialClientOptions = {}) {
    this.agent = options.agent
    this.trustRegistry = options.trustRegistry
    this.revocation = options.revocation
    
    // Initialize key manager if storage is provided
    if (options.storage) {
      this.keyManager = new CredentialKeyManager(options.storage, options.agent)
    }
  }

  /**
   * Issue a Verifiable Credential via the configured agent.
   * Throws when no agent is configured.
   */
  async issueCredential (template: CredentialTemplate): Promise<VerifiableCredential_2_0> {
    if (!this.agent) {
      throw new Error('CredentialClient.issueCredential → agent is not configured')
    }
    return await this.agent.issueCredential(template)
  }

  /**
   * Verify credential cryptographically and (optionally) with trust & revocation.
   */
  async verifyCredential (credential: VerifiableCredential_2_0): Promise<ValidationResult> {
    if (!this.agent) {
      throw new Error('CredentialClient.verifyCredential → agent is not configured')
    }

    // 1. Core cryptographic verification via agent
    const result = await this.agent.verifyCredential(credential)

    // 2. Trust registry check (if configured)
    if (this.trustRegistry) {
      try {
        const issuerDid = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id
        const trustStatus: any = await this.trustRegistry.validateIssuer(issuerDid)
        
        // Set the full trust status object
        result.trustStatus = trustStatus;

        const isTrusted = typeof trustStatus.isTrusted === 'boolean'
          ? trustStatus.isTrusted
          : (trustStatus.status === 'trusted' || trustStatus.status === 'verified')

        if (!isTrusted) {
          result.isValid = false
          result.validationErrors.push('Issuer is not trusted according to trust registry')
        }
      } catch (err) {
        result.warnings.push(`Trust registry check failed: ${(err as Error).message}`)
      }
    }

    // 3. Revocation check (if configured)
    if (this.revocation) {
      try {
        const revStatus: any = await this.revocation.checkRevocationStatus(credential.id)
        result.revocationStatus = {
          isRevoked: revStatus.isRevoked,
          revokedDate: revStatus.revokedDate,
          reason: revStatus.reason,
          lastChecked: revStatus.lastChecked,
          source: revStatus.source
        } as any;

        const isRevoked = typeof revStatus.isRevoked === 'boolean'
          ? revStatus.isRevoked
          : revStatus.status === 'revoked'

        if (isRevoked) {
          result.isValid = false
          result.validationErrors.push('Credential has been revoked')
        }
      } catch (err) {
        result.warnings.push(`Revocation check failed: ${(err as Error).message}`)
      }
    }

    return result
  }

  // ============================================================================
  // Key Management Integration Methods
  // ============================================================================

  /**
   * Issue a credential and immediately export it as a bundle with keys
   */
  async issueAndExportCredential(
    template: CredentialTemplate,
    exportOptions: KeyExportOptions
  ): Promise<CredentialKeyBundle> {
    if (!this.keyManager) {
      throw new Error('Key management not available - storage not configured')
    }
    return await this.keyManager.issueAndBundleCredential(template, exportOptions)
  }

  /**
   * Export an existing credential as a bundle with its keys
   */
  async exportCredentialBundle(
    credentialId: string,
    exportOptions: KeyExportOptions
  ): Promise<CredentialKeyBundle> {
    if (!this.keyManager) {
      throw new Error('Key management not available - storage not configured')
    }
    return await this.keyManager.exportCredentialBundle(credentialId, exportOptions)
  }

  /**
   * Import a credential bundle and restore keys
   */
  async importCredentialBundle(
    bundle: CredentialKeyBundle,
    importOptions: KeyImportOptions
  ): Promise<void> {
    if (!this.keyManager) {
      throw new Error('Key management not available - storage not configured')
    }
    return await this.keyManager.importCredentialBundle(bundle, importOptions)
  }

  /**
   * Create cross-device sync data with multiple credentials
   */
  async createCrossDeviceSync(
    credentialIds: string[],
    sourceDeviceId: string,
    exportOptions: KeyExportOptions
  ): Promise<CrossDeviceSyncData> {
    if (!this.keyManager) {
      throw new Error('Key management not available - storage not configured')
    }
    return await this.keyManager.createCrossDeviceSyncData(credentialIds, sourceDeviceId, exportOptions)
  }

  /**
   * Import cross-device sync data
   */
  async importCrossDeviceSync(
    syncData: CrossDeviceSyncData,
    targetDeviceId: string,
    importOptions: KeyImportOptions
  ): Promise<void> {
    if (!this.keyManager) {
      throw new Error('Key management not available - storage not configured')
    }
    return await this.keyManager.importCrossDeviceSyncData(syncData, targetDeviceId, importOptions)
  }

  /**
   * Get audit log for credential and key operations
   */
  async getCredentialKeyAuditLog() {
    if (!this.keyManager) {
      throw new Error('Key management not available - storage not configured')
    }
    return await this.keyManager.getCredentialKeyAuditLog()
  }

  /**
   * Check if key management is available
   */
  get hasKeyManagement(): boolean {
    return !!this.keyManager
  }
}

/**
 * Convenience factory helper.
 */
export function createCredentialClient (options: CredentialClientOptions = {}): CredentialClient {
  return new CredentialClient(options)
} 