/**
 * Credential Key Manager - Integrates key management with credential operations
 * 
 * Provides bundled credential and key operations for export/import scenarios,
 * cross-device sync, and QR/Bluetooth workflows.
 */

import {
  VerifiableCredential_2_0,
  SecureStorage,
  OpenVerifiableAgent,
  CredentialTemplate,
  AccessLogEntry
} from '../../types';

export interface CredentialKeyBundle {
  credential: VerifiableCredential_2_0;
  keyData: {
    keyId: string;
    publicKey: string;
    privateKey?: string; // Optional for security
    recoveryPhrase?: string; // Optional for recovery
  };
  metadata: {
    bundleId: string;
    created: string;
    issuerDID: string;
    subjectDID: string;
    format: 'base64' | 'hex';
    encrypted: boolean;
  };
}

export interface KeyExportOptions {
  includePrivateKey: boolean;
  includeRecoveryPhrase: boolean;
  format: 'base64' | 'hex';
  encrypt: boolean;
  passphrase?: string;
}

export interface KeyImportOptions {
  format: 'base64' | 'hex';
  encrypted: boolean;
  passphrase?: string;
  validate: boolean;
}

export interface CrossDeviceSyncData {
  bundles: CredentialKeyBundle[];
  metadata: {
    sourceDeviceId: string;
    targetDeviceId?: string;
    syncId: string;
    timestamp: string;
    totalBundles: number;
  };
}

/**
 * CredentialKeyManager integrates credential operations with key management
 * for export/import, cross-device sync, and secure communication workflows
 */
export class CredentialKeyManager {
  private storage: SecureStorage;
  private agent?: OpenVerifiableAgent;

  constructor(storage: SecureStorage, agent?: OpenVerifiableAgent) {
    this.storage = storage;
    this.agent = agent;
  }

  /**
   * Export a credential with its associated keys as a bundle
   */
  async exportCredentialBundle(
    credentialId: string,
    options: KeyExportOptions
  ): Promise<CredentialKeyBundle> {
    // Retrieve the credential
    const credential = await this.storage.retrieveCredential(credentialId);
    if (!credential) {
      throw new Error(`Credential not found: ${credentialId}`);
    }

    // Extract issuer DID and derive key ID
    const issuerDID = typeof credential.issuer === 'string' ? 
      credential.issuer : credential.issuer.id;
    const keyId = `${issuerDID}#key-1`;

    // Export key data
    const keyData = await this.exportKeyData(keyId, options);

    // Create bundle
    const bundle: CredentialKeyBundle = {
      credential,
      keyData,
      metadata: {
        bundleId: this.generateBundleId(),
        created: new Date().toISOString(),
        issuerDID,
        subjectDID: credential.credentialSubject.id,
        format: options.format,
        encrypted: options.encrypt
      }
    };

    return bundle;
  }

  /**
   * Import a credential bundle and restore keys
   */
  async importCredentialBundle(
    bundle: CredentialKeyBundle,
    options: KeyImportOptions
  ): Promise<void> {
    // Validate bundle if requested
    if (options.validate) {
      await this.validateBundle(bundle);
    }

    // Import the credential
    await this.storage.storeCredential(bundle.credential.id, bundle.credential);

    // Import the key data
    await this.importKeyData(bundle.keyData, options);

    // Log the import operation
    this.logBundleOperation('import', bundle.metadata.bundleId, true);
  }

  /**
   * Create a cross-device sync package with multiple credential bundles
   */
  async createCrossDeviceSyncData(
    credentialIds: string[],
    sourceDeviceId: string,
    options: KeyExportOptions
  ): Promise<CrossDeviceSyncData> {
    const bundles: CredentialKeyBundle[] = [];

    for (const credentialId of credentialIds) {
      try {
        const bundle = await this.exportCredentialBundle(credentialId, options);
        bundles.push(bundle);
      } catch (error) {
        console.warn(`Failed to export credential ${credentialId}:`, error);
      }
    }

    return {
      bundles,
      metadata: {
        sourceDeviceId,
        syncId: this.generateSyncId(),
        timestamp: new Date().toISOString(),
        totalBundles: bundles.length
      }
    };
  }

  /**
   * Import cross-device sync data
   */
  async importCrossDeviceSyncData(
    syncData: CrossDeviceSyncData,
    targetDeviceId: string,
    options: KeyImportOptions
  ): Promise<void> {
    let successCount = 0;
    let errorCount = 0;

    for (const bundle of syncData.bundles) {
      try {
        await this.importCredentialBundle(bundle, options);
        successCount++;
      } catch (error) {
        console.error(`Failed to import bundle ${bundle.metadata.bundleId}:`, error);
        errorCount++;
      }
    }

    // Update sync metadata
    syncData.metadata.targetDeviceId = targetDeviceId;

    console.log(`Cross-device sync completed: ${successCount} success, ${errorCount} errors`);
  }

  /**
   * Issue a new credential and immediately create an exportable bundle
   */
  async issueAndBundleCredential(
    template: CredentialTemplate,
    exportOptions: KeyExportOptions
  ): Promise<CredentialKeyBundle> {
    if (!this.agent) {
      throw new Error('Agent required for credential issuance');
    }

    // Issue the credential
    const credential = await this.agent.issueCredential(template);
    
    // Store it locally
    await this.storage.storeCredential(credential.id, credential);

    // Create and return the bundle
    return await this.exportCredentialBundle(credential.id, exportOptions);
  }

  /**
   * Get audit log for credential and key operations
   */
  async getCredentialKeyAuditLog(): Promise<AccessLogEntry[]> {
    const allLogs = await this.storage.getAccessLog();
    
    // Filter for credential and key related operations
    return allLogs.filter(entry => 
      entry.operation === 'export' || 
      entry.operation === 'import' ||
      entry.keyOrCredentialId.includes('bundle:')
    );
  }

  /**
   * Export key data for a specific key ID
   */
  private async exportKeyData(
    keyId: string,
    options: KeyExportOptions
  ): Promise<CredentialKeyBundle['keyData']> {
    const keyData: CredentialKeyBundle['keyData'] = {
      keyId,
      publicKey: '' // Will be derived from private key
    };

    // Export private key if requested
    if (options.includePrivateKey) {
      try {
        keyData.privateKey = await this.storage.exportKey(keyId, options.format);
      } catch (error) {
        console.warn(`Failed to export private key for ${keyId}:`, error);
      }
    }

    // Export recovery phrase if requested
    if (options.includeRecoveryPhrase) {
      try {
        keyData.recoveryPhrase = await this.storage.exportRecoveryPhrase(keyId, options.format);
      } catch (error) {
        console.warn(`Failed to export recovery phrase for ${keyId}:`, error);
      }
    }

    // TODO: Derive public key from private key or retrieve separately
    // For now, we'll use a placeholder
    keyData.publicKey = 'public-key-placeholder';

    return keyData;
  }

  /**
   * Import key data for a credential bundle
   */
  private async importKeyData(
    keyData: CredentialKeyBundle['keyData'],
    options: KeyImportOptions
  ): Promise<void> {
    // Import private key if available
    if (keyData.privateKey) {
      await this.storage.importKey(keyData.keyId, keyData.privateKey, options.format);
    }

    // Import recovery phrase if available
    if (keyData.recoveryPhrase) {
      await this.storage.importRecoveryPhrase(keyData.keyId, keyData.recoveryPhrase, options.format);
    }
  }

  /**
   * Validate a credential bundle
   */
  private async validateBundle(bundle: CredentialKeyBundle): Promise<void> {
    // Basic bundle structure validation
    if (!bundle.credential || !bundle.keyData || !bundle.metadata) {
      throw new Error('Invalid bundle structure');
    }

    // Validate credential format
    if (!bundle.credential.id || !bundle.credential.credentialSubject) {
      throw new Error('Invalid credential in bundle');
    }

    // Validate metadata
    if (!bundle.metadata.bundleId || !bundle.metadata.issuerDID) {
      throw new Error('Invalid bundle metadata');
    }

    // If agent is available, verify the credential cryptographically
    if (this.agent) {
      try {
        const verificationResult = await this.agent.verifyCredential(bundle.credential);
        if (!verificationResult.isValid) {
          throw new Error('Credential verification failed');
        }
      } catch (error) {
        console.warn('Credential verification failed during bundle validation:', error);
      }
    }
  }

  /**
   * Generate a unique bundle ID
   */
  private generateBundleId(): string {
    return `bundle:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique sync ID
   */
  private generateSyncId(): string {
    return `sync:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log bundle operations for audit trail
   */
  private logBundleOperation(
    operation: 'export' | 'import',
    bundleId: string,
    success: boolean,
    details?: string
  ): void {
    // This would integrate with the storage access log
    console.log(`Bundle ${operation}: ${bundleId} - ${success ? 'SUCCESS' : 'FAILED'}`, details);
  }
} 