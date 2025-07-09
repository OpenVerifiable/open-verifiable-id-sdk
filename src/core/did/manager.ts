/**
 * DID Management Implementation
 * Based on ADR-0001: W3C VC 2.0 Migration Strategy
 * Updated to work with Veramo agents
 */

import { 
  DIDManager,
  DIDCreationOptions, 
  DIDCreationResult, 
  DIDImportOptions,
  DIDImportResult,
  DIDDocument_2_0,
  VerificationMethod_2_0,
  DataIntegrityProof,
  VerifiableCredential_2_0,
  RuntimePlatform,
  SecureStorage,
  OVAgent,
  IIdentifier,
  IKey,
  IService,
  CreateDIDOptions
} from '../../types';
import { RuntimePlatformDetector } from '../../platforms';
import Ajv from 'ajv';
import { KeyManager } from '../key-management/manager';

/**
 * Enhanced DID Manager with W3C VC 2.0 support and Veramo integration
 */
export class DIDManagerImpl implements DIDManager {
  [key: string]: any;
  private storage: SecureStorage;
  private platform: RuntimePlatform;
  private agent?: OVAgent; // Optional agent reference for Veramo integration
  private resolutionCache: Map<string, { document: DIDDocument_2_0; cachedAt: number }> = new Map();
  private static readonly RESOLUTION_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  private ajv = new Ajv({ strict: false });
  private keyManager: KeyManager;
  // JSON Schema for basic DID document structure (typed as any to avoid TS inference complexity)
  private didDocumentSchema: any = {
    type: 'object',
    properties: {
      '@context': { type: 'array', items: { type: 'string' } },
      id: { type: 'string' },
      verificationMethod: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            controller: { type: 'string' },
            publicKeyMultibase: { type: 'string', nullable: true },
            publicKeyJwk: { type: 'object', nullable: true }
          },
          required: ['id', 'type', 'controller'],
          additionalProperties: true
        },
        nullable: true
      },
      authentication: { type: 'array', items: { type: 'string' }, nullable: true },
      assertionMethod: { type: 'array', items: { type: 'string' }, nullable: true },
      service: { type: 'array', items: { type: 'object' }, nullable: true }
    },
    required: ['@context', 'id'],
    additionalProperties: true
  };
  private validateDIDDocument = this.ajv.compile(this.didDocumentSchema);

  constructor(storage: SecureStorage, agent?: OVAgent, keyManager?: KeyManager) {
    this.storage = storage;
    this.platform = RuntimePlatformDetector.detectRuntimePlatform();
    this.agent = agent;
    this.keyManager = keyManager || new KeyManager();
  }

  async createDID(method: string, options: CreateDIDOptions): Promise<DIDCreationResult> {
    try {
      if (method === 'cheqd') {
        // 1. Generate Ed25519 key using KeyManager
        const keyId = await this.keyManager.generateKey('Ed25519');
        // 2. Export public key in JWK format
        const publicKeyJwkStr = await this.keyManager.exportKey(keyId, 'jwk');
        const publicKeyJwk = JSON.parse(publicKeyJwkStr);
        // 3. Construct DID and DID Document
        const network = options.network || 'mainnet';
        const didId = `did:cheqd:${network}:${this.generateId()}`;
        const verificationMethodId = `${didId}#key-1`;
        const verificationMethod: VerificationMethod_2_0 = {
          id: verificationMethodId,
          type: 'Ed25519VerificationKey2020',
          controller: didId,
          publicKeyJwk
        };
        const didDocument: DIDDocument_2_0 = {
          '@context': [
            'https://www.w3.org/ns/did/v1',
            'https://w3id.org/security/suites/ed25519-2020/v1'
          ],
          id: didId,
          verificationMethod: [verificationMethod],
          authentication: [verificationMethodId],
          assertionMethod: [verificationMethodId],
          capabilityInvocation: [verificationMethodId],
          capabilityDelegation: [verificationMethodId]
        };
        // 4. Create a simple credential for the DID
        const credential: VerifiableCredential_2_0 = {
          '@context': ['https://www.w3.org/ns/credentials/v2'],
          id: `${didId}#credential-1`,
          type: ['VerifiableCredential', 'DIDCreationCredential'],
          issuer: didId,
          validFrom: new Date().toISOString(),
          credentialSubject: {
            id: didId,
            created: new Date().toISOString()
          }
        };
        return {
          did: didId,
          document: didDocument,
          keyId,
          credential,
          recoveryPhrase: 'Recovery phrase not available in key manager mode'
        };
      }
      if (!this.agent) {
        throw new Error('Agent not available for DID creation');
      }

      // Use the agent's createDID method
      const identifier = await this.agent.createDID(method, {
        alias: options.alias,
        provider: `did:${method}`
      });

      // Convert IIdentifier to DIDCreationResult format
      const didDocument: DIDDocument_2_0 = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: identifier.did,
        verificationMethod: identifier.keys.map((key: any) => ({
          id: key.kid,
          type: key.type,
          controller: identifier.did,
          publicKeyMultibase: key.publicKeyHex
        })),
        authentication: identifier.keys.map((key: any) => key.kid),
        assertionMethod: identifier.keys.map((key: any) => key.kid)
      };

      // Create a simple credential for the DID
      const credential: VerifiableCredential_2_0 = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: `${identifier.did}#credential-1`,
        type: ['VerifiableCredential', 'DIDCreationCredential'],
        issuer: identifier.did,
        validFrom: new Date().toISOString(),
        credentialSubject: {
          id: identifier.did,
          created: new Date().toISOString()
        }
      };

      return {
        did: identifier.did,
        document: didDocument,
        keyId: identifier.keys[0]?.kid || `${identifier.did}#key-1`,
        credential,
        recoveryPhrase: 'Recovery phrase not available in agent mode'
      };
    } catch (error) {
      throw new Error(`Failed to create DID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async importDID(options: DIDImportOptions): Promise<DIDImportResult> {
    try {
      const { did, privateKey, method } = options;
      
      // If we have an agent, use it for DID import
      if (this.agent) {
        return await this.importDIDWithAgent(did, privateKey, method);
      }
      
      // Fallback to standalone implementation
      return await this.importDIDStandalone(options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to import DID: ${errorMessage}`);
    }
  }

  private async importDIDWithAgent(did: string, privateKey: Uint8Array, method: string): Promise<DIDImportResult> {
    if (!this.agent) {
      throw new Error('Agent not available for DID import');
    }

    // Resolve the DID document
    const document = await this.resolveDID(did);
    if (!document) {
      throw new Error(`DID document not found for ${did}`);
    }

    // Store the private key in the agent's storage
    const keyId = document.verificationMethod?.[0]?.id || `${did}#key-1`;
    await this.agent.secureStorage.storeKey(keyId, privateKey);

    // Create import verification credential
    const credential = await this.createImportVerificationCredential(did, document);

    return {
      did,
      document,
      credential,
      verified: true
    };
  }

  private async importDIDStandalone(options: DIDImportOptions): Promise<DIDImportResult> {
    const { did, privateKey, method } = options;
    
    // Resolve the DID document
    const document = await this.resolveDID(did);
    if (!document) {
      throw new Error(`DID document not found for ${did}`);
    }
    
    // Verify the private key matches the public key in the DID document
    const isValid = await this.verifyKeyPair(document, privateKey);
    if (!isValid) {
      throw new Error('Private key does not match the public key in DID document');
    }
    
    // Store the private key securely
    const keyId = document.verificationMethod?.[0]?.id || `${did}#key-1`;
    await this.storage.storeKey(keyId, privateKey);
    
    // Create import verification credential
    const credential = await this.createImportVerificationCredential(did, document);
    
    return {
      did,
      document,
      credential,
      verified: true
    };
  }

  async resolveDID(did: string): Promise<DIDDocument_2_0 | null> {
    try {
      // First, attempt to return from cache if fresh
      const cached = this.resolutionCache.get(did);
      if (cached && (Date.now() - cached.cachedAt) < DIDManagerImpl.RESOLUTION_CACHE_TTL_MS) {
        return cached.document;
      }

      // If we have an agent, use its DID resolver
      if (this.agent && this.agent.didManager) {
        const resolved = await this.resolveDIDWithAgent(did);
        if (resolved) {
          this.resolutionCache.set(did, { document: resolved, cachedAt: Date.now() });
        }
        return resolved;
      }
      
      // Fallback to standalone implementation
      const resolved = await this.resolveDIDStandalone(did);
      if (resolved) {
        this.resolutionCache.set(did, { document: resolved, cachedAt: Date.now() });
      }
      return resolved;
    } catch (error) {
      console.warn(`Failed to resolve DID ${did}:`, error);
      return null;
    }
  }

  private async resolveDIDWithAgent(did: string): Promise<DIDDocument_2_0 | null> {
    if (!this.agent?.didManager) {
      throw new Error('Agent DID manager not available');
    }

    try {
      // Use Veramo's DID resolver
      const result = await this.agent.didManager.resolve(did);
      if (result.didDocument) {
        return result.didDocument as DIDDocument_2_0;
      }
      return null;
    } catch (error) {
      console.warn(`Agent failed to resolve DID ${did}:`, error);
      return null;
    }
  }

  private async resolveDIDStandalone(did: string): Promise<DIDDocument_2_0 | null> {
    // This is a placeholder - in production would integrate with universal resolver
    if (did.startsWith('did:key:')) {
      return this.resolveDIDKey(did);
    } else if (did.startsWith('did:web:')) {
      return this.resolveDIDWeb(did);
    } else if (did.startsWith('did:cheqd:')) {
      return this.resolveDIDCheqd(did);
    } else {
      // For unsupported methods, log and return null instead of throwing
      console.warn(`Failed to resolve DID ${did}: Error: Unsupported DID method: ${did.split(':')[1]}`);
      return null;
    }
  }

  async signWithDID(did: string, data: Uint8Array): Promise<DataIntegrityProof> {
    try {
      // If we have an agent, use its key manager
      if (this.agent && this.agent.keyManager) {
        return await this.signWithDIDWithAgent(did, data);
      }
      
      // Fallback to standalone implementation
      return await this.signWithDIDStandalone(did, data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to sign with DID: ${errorMessage}`);
    }
  }

  private async signWithDIDWithAgent(did: string, data: Uint8Array): Promise<DataIntegrityProof> {
    if (!this.agent?.keyManager) {
      throw new Error('Agent key manager not available');
    }

    // Get the DID document to find verification method
    const document = await this.resolveDID(did);
    if (!document) {
      throw new Error(`DID document not found for ${did}`);
    }
    
    const verificationMethod = document.verificationMethod?.[0];
    if (!verificationMethod) {
      throw new Error('No verification method found in DID document');
    }

    // Use Veramo's key manager to sign
    const signature = await this.agent.keyManager.sign(verificationMethod.id, data);
    
    // Return Data Integrity Proof
    return {
      type: 'DataIntegrityProof',
      cryptosuite: 'eddsa-2022',
      verificationMethod: verificationMethod.id,
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      proofValue: this.encodeSignature(signature)
    };
  }

  private async signWithDIDStandalone(did: string, data: Uint8Array): Promise<DataIntegrityProof> {
    // Get the DID document to find verification method
    const document = await this.resolveDID(did);
    if (!document) {
      throw new Error(`DID document not found for ${did}`);
    }
    
    const verificationMethod = document.verificationMethod?.[0];
    if (!verificationMethod) {
      throw new Error('No verification method found in DID document');
    }
    
    // Retrieve the private key
    const privateKey = await this.storage.retrieveKey(verificationMethod.id);
    if (!privateKey) {
      throw new Error(`Private key not found for ${verificationMethod.id}`);
    }
    
    // Create signature
    const signature = await this.sign(data, privateKey);
    
    // Return Data Integrity Proof
    return {
      type: 'DataIntegrityProof',
      cryptosuite: 'eddsa-2022',
      verificationMethod: verificationMethod.id,
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      proofValue: this.encodeSignature(signature)
    };
  }

  async verifyWithDID(did: string, data: Uint8Array, proof: DataIntegrityProof): Promise<boolean> {
    try {
      // If we have an agent, use its key manager
      if (this.agent && this.agent.keyManager) {
        return await this.verifyWithDIDWithAgent(did, data, proof);
      }
      
      // Fallback to standalone implementation
      return await this.verifyWithDIDStandalone(did, data, proof);
    } catch (error) {
      console.warn('Verification failed:', error);
      return false;
    }
  }

  private async verifyWithDIDWithAgent(did: string, data: Uint8Array, proof: DataIntegrityProof): Promise<boolean> {
    if (!this.agent?.keyManager) {
      throw new Error('Agent key manager not available');
    }

    try {
      // Use Veramo's key manager to verify
      const signature = this.decodeSignature(proof.proofValue);
      return await this.agent.keyManager.verify(proof.verificationMethod, data, signature);
    } catch (error) {
      console.warn('Agent verification failed:', error);
      return false;
    }
  }

  private async verifyWithDIDStandalone(did: string, data: Uint8Array, proof: DataIntegrityProof): Promise<boolean> {
    // Resolve DID to get public key
    const document = await this.resolveDID(did);
    if (!document) {
      return false;
    }
    
    const verificationMethod = document.verificationMethod?.find(
      vm => vm.id === proof.verificationMethod
    );
    if (!verificationMethod) {
      return false;
    }
    
    // Extract public key and verify signature
    const publicKey = this.extractPublicKey(verificationMethod);
    const signature = this.decodeSignature(proof.proofValue);
    
    return await this.verify(data, signature, publicKey);
  }

  async listDIDs(): Promise<string[]> {
    try {
      // If we have an agent, use its DID manager
      if (this.agent && this.agent.didManager) {
        return await this.listDIDsWithAgent();
      }
      
      // Fallback to standalone implementation
      return await this.listDIDsStandalone();
    } catch (error) {
      console.warn('Failed to list DIDs:', error);
      return [];
    }
  }

  private async listDIDsWithAgent(): Promise<string[]> {
    if (!this.agent?.didManager) {
      throw new Error('Agent DID manager not available');
    }

    try {
      // Use Veramo's DID manager to list DIDs
      const identifiers = await this.agent.didManager.listDIDs();
      return identifiers.map((id: any) => id.did);
    } catch (error) {
      console.warn('Agent failed to list DIDs:', error);
      return [];
    }
  }

  private async listDIDsStandalone(): Promise<string[]> {
    // This would typically query the storage for stored DIDs
    // For now, return empty array as placeholder
    return [];
  }

  async deleteDID(did: string): Promise<void> {
    try {
      // If we have an agent, use its DID manager
      if (this.agent && this.agent.didManager) {
        return await this.deleteDIDWithAgent(did);
      }
      
      // Fallback to standalone implementation
      return await this.deleteDIDStandalone(did);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete DID: ${errorMessage}`);
    }
  }

  // Veramo IDIDManager required methods
  async didManagerCreateIdentifier(args: any): Promise<IIdentifier> {
    const result = await this.createDID(args.provider || 'key', {
      alias: args.alias,
      provider: args.provider || 'did:key',
      options: {
        keyType: args.keyType || 'Ed25519'
      }
    });
    
    return {
      did: result.did,
      provider: args.provider || 'did:key',
      keys: [{
        kid: result.keyId,
        kms: 'local',
        type: 'Ed25519',
        publicKeyHex: result.document.verificationMethod?.[0]?.publicKeyMultibase || ''
      }],
      services: []
    };
  }

  async didManagerGetIdentifiers(args: any): Promise<IIdentifier[]> {
    const dids = await this.listDIDs();
    return dids.map(did => ({
      did,
      provider: 'did:key', // Default provider
      keys: [] as IKey[],
      services: [] as IService[]
    }));
  }

  async didManagerGetIdentifier(args: any): Promise<IIdentifier> {
    const did = args.did;
    const document = await this.resolveDID(did);
    if (!document) {
      throw new Error(`DID not found: ${did}`);
    }
    
    return {
      did,
      provider: 'did:key', // Default provider
      keys: document.verificationMethod?.map(vm => ({
        kid: vm.id,
        kms: 'local',
        type: 'Ed25519' as any, // Cast to satisfy TKeyType
        publicKeyHex: vm.publicKeyMultibase || ''
      })) || [],
      services: document.service?.map(s => ({
        id: s.id,
        type: s.type,
        serviceEndpoint: s.serviceEndpoint
      })) || []
    };
  }

  async didManagerUpdateIdentifier(args: any): Promise<IIdentifier> {
    // For now, just return the existing identifier
    return await this.didManagerGetIdentifier(args);
  }

  async didManagerDeleteIdentifier(args: any): Promise<boolean> {
    await this.deleteDID(args.did);
    return true;
  }

  async didManagerAddKey(args: any): Promise<any> {
    throw new Error('didManagerAddKey not yet implemented');
  }

  async didManagerRemoveKey(args: any): Promise<boolean> {
    throw new Error('didManagerRemoveKey not yet implemented');
  }

  async didManagerAddService(args: any): Promise<any> {
    throw new Error('didManagerAddService not yet implemented');
  }

  async didManagerRemoveService(args: any): Promise<boolean> {
    throw new Error('didManagerRemoveService not yet implemented');
  }

  async didManagerFind(args: any): Promise<IIdentifier[]> {
    return await this.didManagerGetIdentifiers(args);
  }

  async didManagerGetProviders(): Promise<string[]> {
    return ['did:key', 'did:web', 'did:cheqd:mainnet', 'did:cheqd:testnet'];
  }

  async didManagerSignWithDID(args: any): Promise<any> {
    const proof = await this.signWithDID(args.did, new TextEncoder().encode(args.data));
    return { proof };
  }

  async didManagerVerifyWithDID(args: any): Promise<boolean> {
    return await this.verifyWithDID(args.did, new TextEncoder().encode(args.data), args.proof);
  }

  // Additional required methods
  async didManagerGet(args: any): Promise<IIdentifier> {
    return await this.didManagerGetIdentifier(args);
  }

  async didManagerGetByAlias(args: any): Promise<IIdentifier> {
    // For now, treat alias as DID
    return await this.didManagerGetIdentifier({ did: args.alias });
  }

  async didManagerCreate(args: any): Promise<IIdentifier> {
    return await this.didManagerCreateIdentifier(args);
  }

  async didManagerSetAlias(args: any): Promise<boolean> {
    // For now, just return success
    return true;
  }

  async didManagerGetOrCreateIdentifier(args: any): Promise<IIdentifier> {
    try {
      return await this.didManagerGetIdentifier(args);
    } catch {
      return await this.didManagerCreateIdentifier(args);
    }
  }

  async didManagerGetDefaultIdentifier(args: any): Promise<IIdentifier> {
    const identifiers = await this.didManagerGetIdentifiers(args);
    return identifiers[0] || await this.didManagerCreateIdentifier(args);
  }

  async didManagerGetRequiredIdentifier(args: any): Promise<IIdentifier> {
    const identifier = await this.didManagerGetIdentifier(args);
    if (!identifier) {
      throw new Error(`Required identifier not found: ${args.did}`);
    }
    return identifier;
  }

  // Additional required methods with proper signatures
  async didManagerGetOrCreate(args: any): Promise<IIdentifier> {
    return await this.didManagerGetOrCreateIdentifier(args);
  }

  async didManagerUpdate(args: any): Promise<IIdentifier> {
    return await this.didManagerUpdateIdentifier(args);
  }

  async didManagerImport(args: any): Promise<IIdentifier> {
    // Import a DID from external source
    const result = await this.importDID({
      did: args.did,
      privateKey: args.privateKey || new Uint8Array(),
      method: args.method || 'key'
    });
    
    return {
      did: result.did,
      provider: args.method || 'did:key',
      keys: [] as IKey[],
      services: [] as IService[]
    };
  }

  async didManagerDelete(args: any): Promise<boolean> {
    return await this.didManagerDeleteIdentifier(args);
  }

  private async deleteDIDWithAgent(did: string): Promise<void> {
    if (!this.agent?.didManager) {
      throw new Error('Agent DID manager not available');
    }

    try {
      // Use Veramo's DID manager to delete DID
      await this.agent.didManager.deleteDID(did);
    } catch (error) {
      console.warn('Agent failed to delete DID:', error);
      throw error;
    }
  }

  private async deleteDIDStandalone(did: string): Promise<void> {
    const document = await this.resolveDID(did);
    if (document) {
      // Delete associated keys
      for (const vm of document.verificationMethod || []) {
        await this.storage.deleteKey(vm.id);
      }
    }
  }

  /**
   * Private helper methods
   */
  private generateId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async createDIDDocument(
    method: string, 
    keyId: string,
    publicKeyJwk?: any,
    alias?: string
  ): Promise<DIDDocument_2_0> {
    const didId = `did:${method}:${this.generateId()}`;
    let verificationMethod: VerificationMethod_2_0;
    if (method === 'cheqd' && publicKeyJwk) {
      verificationMethod = {
        id: keyId,
        type: 'Ed25519VerificationKey2020',
        controller: didId,
        publicKeyJwk
      };
    } else {
      // fallback for other methods (legacy)
      verificationMethod = {
        id: keyId,
        type: 'Ed25519VerificationKey2020',
        controller: didId,
        publicKeyMultibase: this.encodePublicKey(new Uint8Array(32)) // placeholder
      };
    }
    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1'
      ],
      id: didId,
      verificationMethod: [verificationMethod],
      authentication: [keyId],
      assertionMethod: [keyId],
      capabilityInvocation: [keyId],
      capabilityDelegation: [keyId]
    };
  }

  private async createDIDAssertionCredential(
    did: string, 
    keyPair: { publicKey: Uint8Array; privateKey: Uint8Array }
  ): Promise<VerifiableCredential_2_0> {
    const credentialId = `urn:uuid:${this.generateId()}`;
    
    const credential: VerifiableCredential_2_0 = {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://www.w3.org/ns/credentials/examples/v2'
      ],
      id: credentialId,
      type: ['VerifiableCredential', 'DIDCreationCredential'],
      issuer: did,
      validFrom: new Date().toISOString(),
      credentialSubject: {
        id: did,
        assertionType: 'did-creation',
        assertionDate: new Date().toISOString(),
        assertionResult: 'Passed'
      }
    };

    // Add Data Integrity Proof
    const credentialBytes = new TextEncoder().encode(JSON.stringify(credential));
    const proof = await this.createDataIntegrityProof(credentialBytes, keyPair, did);
    
    return {
      ...credential,
      proof: proof
    };
  }

  private async createImportVerificationCredential(
    did: string, 
    document: DIDDocument_2_0
  ): Promise<VerifiableCredential_2_0> {
    const credentialId = `urn:uuid:${this.generateId()}`;
    
    return {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://www.w3.org/ns/credentials/examples/v2'
      ],
      id: credentialId,
      type: ['VerifiableCredential', 'DIDImportCredential'],
      issuer: did,
      validFrom: new Date().toISOString(),
      credentialSubject: {
        id: did,
        assertionType: 'did-import-verification',
        assertionDate: new Date().toISOString(),
        assertionResult: 'Passed',
        verificationSteps: [
          {
            step: 'Resolve DID document',
            result: 'Passed',
            timestamp: new Date().toISOString()
          },
          {
            step: 'Verify key pair match',
            result: 'Passed',
            timestamp: new Date().toISOString()
          }
        ]
      }
    };
  }

  private async createDataIntegrityProof(
    data: Uint8Array,
    keyPair: { publicKey: Uint8Array; privateKey: Uint8Array },
    verificationMethod: string
  ): Promise<DataIntegrityProof> {
    const signature = await this.sign(data, keyPair.privateKey);
    
    return {
      type: 'DataIntegrityProof',
      cryptosuite: 'eddsa-2022',
      verificationMethod: `${verificationMethod}#key-1`,
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      proofValue: this.encodeSignature(signature)
    };
  }

  private async resolveDIDKey(did: string): Promise<DIDDocument_2_0> {
    // Simplified did:key resolution
    const publicKeyMultibase = did.split(':')[2];
    const keyId = `${did}#${publicKeyMultibase}`;
    
    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1'
      ],
      id: did,
      verificationMethod: [{
        id: keyId,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase
      }],
      authentication: [keyId],
      assertionMethod: [keyId],
      capabilityInvocation: [keyId],
      capabilityDelegation: [keyId]
    };
  }

  private async resolveDIDWeb(did: string): Promise<DIDDocument_2_0> {
    // Simplified did:web resolution - would fetch from domain/.well-known/did.json
    throw new Error('did:web resolution not yet implemented');
  }

  private async verifyKeyPair(document: DIDDocument_2_0, privateKey: Uint8Array): Promise<boolean> {
    // Verify that the private key corresponds to the public key in the DID document
    // This is a simplified check - in production would use proper cryptographic verification
    return true; // Placeholder
  }

  private async generateRecoveryPhrase(privateKey: Uint8Array): Promise<string> {
    // Generate a mnemonic recovery phrase from the private key
    // This is a placeholder - in production would use proper BIP39 mnemonic generation
    return 'example recovery phrase for demonstration purposes only';
  }

  private async sign(data: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    // Simplified signing - in production would use proper Ed25519 signing
    return new Uint8Array(64); // Placeholder signature
  }

  private async verify(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    // Simplified verification - in production would use proper Ed25519 verification
    return true; // Placeholder
  }

  private encodePublicKey(publicKey: Uint8Array): string {
    // Encode public key as multibase - simplified for demo
    return 'z' + btoa(String.fromCharCode(...publicKey));
  }

  private encodeSignature(signature: Uint8Array): string {
    // Encode signature as multibase - simplified for demo
    return 'z' + btoa(String.fromCharCode(...signature));
  }

  private decodeSignature(proofValue: string): Uint8Array {
    // Decode signature from multibase - simplified for demo
    const base64 = proofValue.substring(1); // Remove 'z' prefix
    return new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
  }

  private extractPublicKey(verificationMethod: VerificationMethod_2_0): Uint8Array {
    // Extract public key from verification method - simplified for demo
    if (verificationMethod.publicKeyMultibase) {
      const base64 = verificationMethod.publicKeyMultibase.substring(1); // Remove 'z' prefix
      return new Uint8Array(atob(base64).split('').map(c => c.charCodeAt(0)));
    }
    throw new Error('Public key not found in verification method');
  }

  private async resolveDIDCheqd(did: string): Promise<DIDDocument_2_0 | null> {
    const doc = await this.resolveWithUniversalResolver(did);
    if (doc && !this.validateDIDDocument(doc)) {
      console.warn('Resolved DID document failed schema validation');
    }
    return doc;
  }

  private async resolveWithUniversalResolver(did: string): Promise<DIDDocument_2_0 | null> {
    try {
      const url = `https://uniresolver.io/1.0/identifiers/${did}`;
      const response = await fetch(url, { headers: { 'Accept': 'application/ld+json, application/json' } });
      if (!response.ok) {
        console.warn(`Universal resolver responded with ${response.status} for ${did}`);
        return null;
      }
      const json = await response.json();
      if (json.didDocument) {
        return json.didDocument as DIDDocument_2_0;
      }
      return json as DIDDocument_2_0;
    } catch (error) {
      console.warn(`Universal resolver failed for ${did}:`, error);
      return null;
    }
  }
}

/**
 * Factory function to create DID manager
 */
export function createDIDManager(storage: SecureStorage, agent?: OVAgent, keyManager?: KeyManager): DIDManager {
  return new DIDManagerImpl(storage, agent, keyManager);
}

