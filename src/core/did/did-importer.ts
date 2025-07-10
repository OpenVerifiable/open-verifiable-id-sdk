/**
 * DID Importer Utility
 * 
 * Provides functionality to import existing DIDs with their private keys
 * into the agent's DID manager for signing and credential issuance
 */

import { IIdentifier } from '../../types';
import { importKey, KeyImportExportFormat } from '../key-management/key-import-export';
import { BaseAgent } from '../agents/base';
import { extractPublicKeyHex } from '@veramo/utils';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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
  private agent: BaseAgent;

  constructor(agent: BaseAgent) {
    this.agent = agent;
  }

  /**
   * Import an existing DID with the provided private key
   * Following the cheqd-studio pattern: resolve DID document and use verification methods directly
   */
  async importDIDWithKey(options: DIDImportOptions): Promise<DIDImportResult> {
    try {
      const { did, privateKey, keyFormat, alias } = options;

      console.log(`[DID Import] Starting import for DID: ${did}`);
      console.log(`[DID Import] Key format: ${keyFormat}`);
      console.log(`[DID Import] Alias: ${alias || 'auto-generated'}`);
      console.log(`[DID Import] Target agent: ${this.agent.id}`);

      // Initialize the agent if not already initialized
      if (!this.agent.agent) {
        console.log('[DID Import] Initializing agent...');
        await this.agent.initialize();
        console.log('[DID Import] Agent initialized successfully');
      } else {
        console.log('[DID Import] Agent already initialized');
      }

      // Resolve the DID document from the network (like cheqd-studio does)
      console.log(`[DID Import] Resolving DID document for: ${did}`);
      const didDocument = await this.agent.resolveDID(did);
      console.log('[DID Import] DID resolution completed');
      console.log('[DID Import] DID document:', JSON.stringify(didDocument, null, 2));
      
      // Check if the DID document is valid (like cheqd-studio does)
      console.log('[DID Import] Validating DID document...');
      if (!didDocument || !didDocument.verificationMethod || didDocument.verificationMethod.length === 0) {
        console.error('[DID Import] Invalid DID document - missing or empty verificationMethod');
        throw new Error(`Invalid DID document for ${did} - no verificationMethod found`);
      }
      
      console.log(`[DID Import] DID document has ${didDocument.verificationMethod.length} verification methods`);

      // Extract public keys from the DID document using Veramo's utility (exactly like cheqd-studio)
      console.log('[DID Import] Extracting public keys from verification methods...');
      const publicKeyHexs: string[] = [
        ...new Set(
          didDocument.verificationMethod
            .map((vm: any) => extractPublicKeyHex(vm).publicKeyHex)
            .filter((pk: string) => pk) as string[]
        ),
      ];

      console.log(`[DID Import] Extracted ${publicKeyHexs.length} unique public keys:`, publicKeyHexs);

      if (publicKeyHexs.length === 0) {
        console.error('[DID Import] No public keys found in DID document');
        throw new Error(`No public keys found in DID document for ${did}`);
      }

      // Import the private key using the SDK's key import utility
      console.log('[DID Import] Importing private key...');
      const keyImportResult = await importKey(privateKey, {
        format: keyFormat,
        algorithm: 'Ed25519' as any
      });
      console.log('[DID Import] Private key imported successfully');
      console.log(`[DID Import] Private key length: ${keyImportResult.privateKey.length}`);
      console.log(`[DID Import] Public key available: ${!!keyImportResult.publicKey}`);

      // Get our public key hex
      const ourPublicKeyHex = keyImportResult.publicKey ? Buffer.from(keyImportResult.publicKey).toString('hex') : '';
      console.log(`[DID Import] Our public key hex: ${ourPublicKeyHex}`);

      // Create the keys array for import (using Veramo's format)
      const keysToImport = [{
        type: 'Ed25519' as const,
        privateKeyHex: Buffer.from(keyImportResult.privateKey).toString('hex'),
        kms: 'local'
      }];

      // Import the DID into the agent's DID manager (using Veramo's API)
      console.log('[DID Import] Importing DID into agent...');
      if (!this.agent.agent) {
        throw new Error('Agent not properly initialized');
      }
      // Extract the DID method from the DID string
      const didMethod = did.split(':')[1];
      const provider = `did:${didMethod}`;
      
      const identifier = await this.agent.agent.didManagerImport({
        did,
        keys: keysToImport,
        alias: alias || `imported-${Date.now()}`,
        provider: provider
      });
      console.log('[DID Import] DID imported successfully into agent');

      return {
        success: true,
        identifier: identifier,
        importedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('[DID Import] Error during import:', error);
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
  async importFromPackageJson(): Promise<DIDImportResult> {
    try {
      // Read package.json to get the test DID
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const testDid = packageJson.testDid;

      if (!testDid) {
        throw new Error('testDid not found in package.json');
      }

      // Get the private key from environment
      const privateKey = process.env.TESTNET_HEX_KEY;

      if (!privateKey) {
        throw new Error('TESTNET_HEX_KEY environment variable not found');
      }

      // Import the existing DID with our key
      return await this.importDIDWithKey({
        did: testDid,
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
      // Initialize the agent if not already initialized
      if (!this.agent.agent) {
        await this.agent.initialize();
      }

      const identifiers = await this.agent.agent!.didManagerFind();
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
      // Initialize the agent if not already initialized
      if (!this.agent.agent) {
        await this.agent.initialize();
      }

      const identifier = await this.agent.agent!.didManagerGet({ did });
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
      // Initialize the agent if not already initialized
      if (!this.agent.agent) {
        await this.agent.initialize();
      }

      const identifier = await this.agent.agent!.didManagerGet({ did });
      return identifier !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the agent this importer is working with
   */
  getAgent(): BaseAgent {
    return this.agent;
  }
}

// Convenience functions for backward compatibility
// These create a temporary agent for testing purposes

/**
 * Import an existing DID with a hex private key
 * Creates a temporary agent for the import operation
 */
export async function importDIDWithHexKey(
  did: string,
  hexKey: string, 
  alias?: string
): Promise<DIDImportResult> {
  const agent = new (class extends BaseAgent {
    getType(): string { return 'test'; }
  })('test-agent', 'test' as any);

  const importer = new DIDImporter(agent);
  
  return await importer.importDIDWithKey({
    did,
    privateKey: hexKey,
    keyFormat: KeyImportExportFormat.HEX,
    alias
  });
}

/**
 * Import DID from package.json configuration
 * Creates a temporary agent for the import operation
 */
export async function importDIDFromPackageJson(): Promise<DIDImportResult> {
  const agent = new (class extends BaseAgent {
    getType(): string { return 'test'; }
  })('test-agent', 'test' as any);

  const importer = new DIDImporter(agent);
  
  return await importer.importFromPackageJson();
} 