/**
 * Plugin APIs Implementation
 * 
 * Provides controlled access to agent capabilities for plugins
 */

import { PluginAPIs } from '../interfaces.js';
import { AgentType } from '../../agents/types.js';

export interface DIDAPI {
  createDID(method: string, options?: any): Promise<any>;
  resolveDID(did: string): Promise<any>;
  signWithDID(did: string, data: Uint8Array): Promise<any>;
  verifyWithDID(did: string, data: Uint8Array, signature: any): Promise<boolean>;
  listDIDs(): Promise<string[]>;
}

export interface CredentialAPI {
  issueCredential(template: any): Promise<any>;
  verifyCredential(credential: any): Promise<any>;
  storeCredential(credential: any): Promise<void>;
  getCredential(id: string): Promise<any>;
  listCredentials(): Promise<any[]>;
  deleteCredential(id: string): Promise<void>;
}

export interface KeyAPI {
  generateKey(algorithm: string, options?: any): Promise<string>;
  importKey(keyData: string, format?: string): Promise<string>;
  exportKey(keyId: string, format?: string): Promise<string>;
  sign(keyId: string, data: Uint8Array): Promise<Uint8Array>;
  verify(keyId: string, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
  deleteKey(keyId: string): Promise<void>;
  listKeys(): Promise<string[]>;
}

export interface StorageAPI {
  store(key: string, value: any): Promise<void>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  listKeys(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface NetworkAPI {
  request(url: string, options?: any): Promise<any>;
  get(url: string, options?: any): Promise<any>;
  post(url: string, data: any, options?: any): Promise<any>;
  put(url: string, data: any, options?: any): Promise<any>;
  delete(url: string, options?: any): Promise<any>;
}

export class PluginAPIsImpl implements PluginAPIs {
  public did?: DIDAPI;
  public credentials?: CredentialAPI;
  public keys?: KeyAPI;
  public storage?: StorageAPI;
  public network?: NetworkAPI;

  constructor(
    agentType: AgentType,
    agentId: string,
    options?: {
      didManager?: any;
      credentialManager?: any;
      keyManager?: any;
      storageManager?: any;
      networkManager?: any;
    }
  ) {
    // Initialize APIs based on agent type and available managers
    this.initializeAPIs(agentType, agentId, options);
  }

  /**
   * Initialize APIs based on agent capabilities
   */
  private initializeAPIs(
    agentType: AgentType,
    agentId: string,
    options?: {
      didManager?: any;
      credentialManager?: any;
      keyManager?: any;
      storageManager?: any;
      networkManager?: any;
    }
  ): void {
    // DID API - available for all agent types
    if (options?.didManager) {
      this.did = this.createDIDAPI(options.didManager);
    }

    // Credential API - available for all agent types
    if (options?.credentialManager) {
      this.credentials = this.createCredentialAPI(options.credentialManager);
    }

    // Key API - available for all agent types
    if (options?.keyManager) {
      this.keys = this.createKeyAPI(options.keyManager);
    }

    // Storage API - always available
    this.storage = this.createStorageAPI(agentId);

    // Network API - available for service and parent agents
    if (agentType === AgentType.SERVICE || agentType === AgentType.PARENT) {
      this.network = this.createNetworkAPI();
    }
  }

  /**
   * Create DID API wrapper
   */
  private createDIDAPI(didManager: any): DIDAPI {
    return {
      createDID: async (method: string, options?: any) => {
        return await didManager.createDID(method, options);
      },
      resolveDID: async (did: string) => {
        return await didManager.resolveDID(did);
      },
      signWithDID: async (did: string, data: Uint8Array) => {
        return await didManager.signWithDID(did, data);
      },
      verifyWithDID: async (did: string, data: Uint8Array, signature: any) => {
        return await didManager.verifyWithDID(did, data, signature);
      },
      listDIDs: async () => {
        return await didManager.listDIDs();
      }
    };
  }

  /**
   * Create Credential API wrapper
   */
  private createCredentialAPI(credentialManager: any): CredentialAPI {
    return {
      issueCredential: async (template: any) => {
        return await credentialManager.issueCredential(template);
      },
      verifyCredential: async (credential: any) => {
        return await credentialManager.verifyCredential(credential);
      },
      storeCredential: async (credential: any) => {
        return await credentialManager.storeCredential(credential);
      },
      getCredential: async (id: string) => {
        return await credentialManager.getCredential(id);
      },
      listCredentials: async () => {
        return await credentialManager.listCredentials();
      },
      deleteCredential: async (id: string) => {
        return await credentialManager.deleteCredential(id);
      }
    };
  }

  /**
   * Create Key API wrapper
   */
  private createKeyAPI(keyManager: any): KeyAPI {
    return {
      generateKey: async (algorithm: string, options?: any) => {
        return await keyManager.generateKey(algorithm, options);
      },
      importKey: async (keyData: string, format?: string) => {
        return await keyManager.importKey(keyData, format);
      },
      exportKey: async (keyId: string, format?: string) => {
        return await keyManager.exportKey(keyId, format);
      },
      sign: async (keyId: string, data: Uint8Array) => {
        return await keyManager.sign(keyId, data);
      },
      verify: async (keyId: string, data: Uint8Array, signature: Uint8Array) => {
        return await keyManager.verify(keyId, data, signature);
      },
      deleteKey: async (keyId: string) => {
        return await keyManager.deleteKey(keyId);
      },
      listKeys: async () => {
        return await keyManager.listKeys();
      }
    };
  }

  /**
   * Create Storage API wrapper
   */
  private createStorageAPI(agentId: string): StorageAPI {
    // This would typically use the agent's storage system
    // For now, we'll create a simple in-memory storage
    const storage = new Map<string, any>();

    return {
      store: async (key: string, value: any) => {
        storage.set(key, value);
      },
      get: async (key: string) => {
        return storage.get(key);
      },
      delete: async (key: string) => {
        storage.delete(key);
      },
      listKeys: async () => {
        return Array.from(storage.keys());
      },
      clear: async () => {
        storage.clear();
      }
    };
  }

  /**
   * Create Network API wrapper
   */
  private createNetworkAPI(): NetworkAPI {
    return {
      request: async (url: string, options?: any) => {
        // In a real implementation, this would use a proper HTTP client
        // with security controls and rate limiting
        throw new Error('Network API not implemented');
      },
      get: async (url: string, options?: any) => {
        throw new Error('Network API not implemented');
      },
      post: async (url: string, data: any, options?: any) => {
        throw new Error('Network API not implemented');
      },
      put: async (url: string, data: any, options?: any) => {
        throw new Error('Network API not implemented');
      },
      delete: async (url: string, options?: any) => {
        throw new Error('Network API not implemented');
      }
    };
  }

  /**
   * Get available APIs
   */
  getAvailableAPIs(): string[] {
    const apis: string[] = [];
    
    if (this.did) apis.push('did');
    if (this.credentials) apis.push('credentials');
    if (this.keys) apis.push('keys');
    if (this.storage) apis.push('storage');
    if (this.network) apis.push('network');

    return apis;
  }

  /**
   * Check if specific API is available
   */
  hasAPI(apiName: string): boolean {
    return this.getAvailableAPIs().includes(apiName);
  }

  /**
   * Get API statistics
   */
  getAPIStats(): {
    totalAPIs: number;
    availableAPIs: string[];
    restrictedAPIs: string[];
  } {
    const availableAPIs = this.getAvailableAPIs();
    const allAPIs = ['did', 'credentials', 'keys', 'storage', 'network'];
    const restrictedAPIs = allAPIs.filter(api => !availableAPIs.includes(api));

    return {
      totalAPIs: availableAPIs.length,
      availableAPIs,
      restrictedAPIs
    };
  }
} 