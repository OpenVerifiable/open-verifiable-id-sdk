/**
 * DID Importer Utility
 * 
 * Provides functionality to import existing DIDs with their private keys
 * into the agent's DID manager for signing and credential issuance
 */

import { IIdentifier } from '../../types';
import { importKey, KeyImportExportFormat } from '../key-management/key-import-export';
import { createKeyManager } from '../key-management';
import { createDIDManager } from './manager';
import { createSecureStorage } from '../storage';
import { RuntimePlatform } from '../../types';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);

dotenv.config();

export interface DIDImportOptions {
  did: string;
  privateKey: string;
  keyFormat: KeyImportExportFormat;
  alias?: string;
}

export interface DIDImportResult {
  success: boolean;
  identifier?: IIdentifier;
  error?: string;
  importedAt: string;
}

/**
 * DID Importer class for importing existing DIDs with private keys
 */
export class DIDImporter {
  private agent: any; // Veramo agent instance
  private keyManager: any; // SDK KeyManager

  constructor(agent: any, keyManager: any) {
    this.agent = agent;
    this.keyManager = keyManager;
  }

  /**
   * Create a new DID with the provided private key (simpler approach like cheqd-studio)
   */
  async createDIDWithKey(options: DIDImportOptions): Promise<DIDImportResult> {
    try {
      const { privateKey, keyFormat, alias } = options;

      // Import the private key using the SDK's key import utility
      const keyImportResult = await importKey(privateKey, {
        format: keyFormat,
        algorithm: 'Ed25519' as any
      });

      // Create a new DID using Veramo's did:key method (simpler than cheqd)
      const didResult = await this.agent.didManagerCreate({
        provider: 'did:key',
        alias: alias || `key-${Date.now()}`,
        options: {
          privateKeyHex: Buffer.from(keyImportResult.privateKey).toString('hex'),
          keyType: 'Ed25519'
        }
      }, {});

      return {
        success: true,
        identifier: didResult,
        importedAt: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        importedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Import DID from package.json and environment variables
   */
  async createFromPackageJson(): Promise<DIDImportResult> {
    try {
      // Get the private key from environment
      const privateKey = process.env.TESTNET_HEX_KEY;

      if (!privateKey) {
        throw new Error('TESTNET_HEX_KEY environment variable not found');
      }

      // Create a new DID with our key
      return await this.createDIDWithKey({
        did: '', // Not used for creation
        privateKey,
        keyFormat: KeyImportExportFormat.HEX,
        alias: 'package-did'
      });

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        importedAt: new Date().toISOString()
      };
    }
  }

  /**
   * List all imported DIDs
   */
  async getImportedDIDs(): Promise<any[]> {
    try {
      const identifiers = await this.agent.didManagerFind({}, {});
      return identifiers.map((id: any) => id.did);
    } catch (error) {
      console.warn('Failed to get imported DIDs:', error);
      return [];
    }
  }

  /**
   * Get a specific DID by its identifier
   */
  async getDID(did: string): Promise<any> {
    try {
      const identifier = await this.agent.didManagerGet({ did }, {});
      return identifier;
    } catch (error) {
      console.warn(`DID not found: ${did}`, error);
      return null;
    }
  }

  /**
   * Check if a DID is imported
   */
  async isDIDImported(did: string): Promise<boolean> {
    try {
      const identifier = await this.agent.didManagerGet({ did }, {});
      return identifier !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract DID method from DID string
   */
  private extractDIDMethod(did: string): string {
    const match = did.match(/^did:([^:]+)/);
    if (!match) {
      throw new Error(`Invalid DID format: ${did}`);
    }
    return match[1];
  }
}

/**
 * Convenience function to create DID from package.json
 */
export async function createDIDFromPackageJson(): Promise<DIDImportResult> {
  const didManager = createDIDManager(createSecureStorage());
  const keyManager = createKeyManager({
    platform: RuntimePlatform.NODE,
    defaultAlgorithm: 'Ed25519' as any,
    hardwareBacked: false,
    requireBiometric: false
  });
  const importer = new DIDImporter(didManager, keyManager);
  return await importer.createFromPackageJson();
}

/**
 * Convenience function to create DID with hex key
 */
export async function createDIDWithHexKey(
  hexKey: string, 
  alias?: string
): Promise<DIDImportResult> {
  const didManager = createDIDManager(createSecureStorage());
  const keyManager = createKeyManager({
    platform: RuntimePlatform.NODE,
    defaultAlgorithm: 'Ed25519' as any,
    hardwareBacked: false,
    requireBiometric: false
  });
  const importer = new DIDImporter(didManager, keyManager);
  return await importer.createDIDWithKey({
    did: '',
    privateKey: hexKey,
    keyFormat: KeyImportExportFormat.HEX,
    alias
  });
} 