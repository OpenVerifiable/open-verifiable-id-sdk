/**
 * DID Client
 * 
 * Provides comprehensive DID management capabilities including creation,
 * resolution, signing, and verification with support for multiple DID methods.
 * 
 * @implements ADR-0015: DID Core Architecture and Purpose
 */

import type {
  DIDManager,
  DIDCreationOptions,
  DIDCreationResult,
  DIDImportOptions,
  DIDImportResult,
  DIDDocument_2_0,
  DataIntegrityProof,
  SecureStorage,
  OVAgent
} from '../../types'

import { DIDManagerImpl } from './manager'

export interface DIDClientOptions {
  /** Storage backend for DID data */
  storage: SecureStorage
  /** Optional agent for Veramo integration */
  agent?: OVAgent
  /** Default DID method to use */
  defaultMethod?: string
  /** Whether to enable caching */
  enableCaching?: boolean
}

// Custom interface for our DID client that doesn't extend Veramo's IDIDManager
export interface DIDClientInterface {
  createDID(method: string, options: any): Promise<DIDCreationResult>;
  importDID(options: DIDImportOptions): Promise<DIDImportResult>;
  resolveDID(did: string): Promise<DIDDocument_2_0 | null>;
  signWithDID(did: string, data: Uint8Array): Promise<DataIntegrityProof>;
  verifyWithDID(did: string, data: Uint8Array, proof: DataIntegrityProof): Promise<boolean>;
  listDIDs(): Promise<string[]>;
  deleteDID(did: string): Promise<void>;
}

/**
 * Main DID client that provides unified DID management capabilities
 */
export class DIDClient {
  private manager: DIDClientInterface

  constructor(options: DIDClientOptions) {
    this.manager = new DIDManagerImpl(options.storage, options.agent) as DIDClientInterface
  }

  /**
   * Create a new DID
   */
  async createDID(options: DIDCreationOptions): Promise<DIDCreationResult> {
    try {
      return await this.manager.createDID(options.method || 'key', options)
    } catch (error) {
      throw new Error(`Failed to create DID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import an existing DID
   */
  async importDID(options: DIDImportOptions): Promise<DIDImportResult> {
    try {
      return await this.manager.importDID(options)
    } catch (error) {
      throw new Error(`Failed to import DID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resolve a DID to its document
   */
  async resolveDID(did: string): Promise<DIDDocument_2_0 | null> {
    try {
      return await this.manager.resolveDID(did)
    } catch (error) {
      throw new Error(`Failed to resolve DID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign data with a DID
   */
  async signWithDID(did: string, data: Uint8Array): Promise<DataIntegrityProof> {
    try {
      return await this.manager.signWithDID(did, data)
    } catch (error) {
      throw new Error(`Failed to sign with DID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify data signed with a DID
   */
  async verifyWithDID(did: string, data: Uint8Array, proof: DataIntegrityProof): Promise<boolean> {
    try {
      return await this.manager.verifyWithDID(did, data, proof)
    } catch (error) {
      throw new Error(`Failed to verify with DID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all DIDs managed by this client
   */
  async listDIDs(): Promise<string[]> {
    try {
      return await this.manager.listDIDs()
    } catch (error) {
      throw new Error(`Failed to list DIDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a DID
   */
  async deleteDID(did: string): Promise<void> {
    try {
      return await this.manager.deleteDID(did)
    } catch (error) {
      throw new Error(`Failed to delete DID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the underlying DID manager
   */
  getManager(): DIDClientInterface {
    return this.manager
  }
}

/**
 * Convenience factory function for backward compatibility
 */
export function createDIDManager(storage: SecureStorage, agent?: OVAgent): DIDClientInterface {
  return new DIDManagerImpl(storage, agent) as DIDClientInterface
} 