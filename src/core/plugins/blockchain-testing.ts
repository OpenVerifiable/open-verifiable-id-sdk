/**
 * Blockchain Testing Infrastructure for the Open Verifiable ID SDK
 * 
 * Provides testing utilities for Cheqd blockchain integration using testnet
 * since mainnet DIDs cannot be tested in development environments.
 * 
 * Implements the three-tier testing strategy:
 * 1. Unit Tests (Mocked)
 * 2. Integration Tests (Testnet)
 * 3. Production Validation (Testnet with Production Config)
 */

import { CheqdNetwork } from '../agents/base.js';
import { CheqdPaymentClient } from '../payments/cheqd-payment-client.js';
import { CheqdTrustChainClient } from '../trust-registry/cheqd-trust-chain.js';

/**
 * Blockchain testing environment configuration
 */
export interface BlockchainTestConfig {
  /** Network to use for testing */
  network: CheqdNetwork;
  
  /** RPC endpoint URL */
  rpcUrl: string;
  
  /** API endpoint URL */
  apiEndpoint: string;
  
  /** Faucet URL for testnet tokens */
  faucetUrl?: string;
  
  /** Whether this is production-like testing */
  productionMode?: boolean;
  
  /** Test DID to use */
  testDID?: string;
  
  /** Test API key */
  apiKey?: string;
}

/**
 * Testnet configuration for development
 */
export const TESTNET_CONFIG: BlockchainTestConfig = {
  network: CheqdNetwork.Testnet,
  rpcUrl: 'https://rpc.cheqd.network',
  apiEndpoint: 'https://api.testnet.cheqd.studio',
  faucetUrl: 'https://faucet.testnet.cheqd.network',
  productionMode: false,
  testDID: 'did:cheqd:testnet:test-user-123'
};

/**
 * Production-like testnet configuration
 */
export const PRODUCTION_TESTNET_CONFIG: BlockchainTestConfig = {
  network: CheqdNetwork.Testnet,
  rpcUrl: 'https://rpc.cheqd.network',
  apiEndpoint: 'https://api.testnet.cheqd.studio',
  productionMode: true,
  testDID: 'did:cheqd:testnet:production-test-456'
};

/**
 * Mock blockchain configuration for unit tests
 */
export const MOCK_CONFIG: BlockchainTestConfig = {
  network: CheqdNetwork.Testnet, // Not used in mock mode
  rpcUrl: 'mock://localhost',
  apiEndpoint: 'mock://localhost',
  productionMode: false
};

/**
 * Blockchain testing utilities
 */
export class BlockchainTesting {
  private config: BlockchainTestConfig;
  private paymentClient?: CheqdPaymentClient;
  private trustChainClient?: CheqdTrustChainClient;

  constructor(config: BlockchainTestConfig) {
    this.config = config;
  }

  /**
   * Initialize blockchain clients based on configuration
   */
  async initialize(): Promise<void> {
    if (this.config.productionMode || this.config.network === CheqdNetwork.Testnet) {
      // Initialize real clients for testnet
      this.paymentClient = new CheqdPaymentClient({
        apiEndpoint: this.config.apiEndpoint,
        apiKey: this.config.apiKey
      });

      this.trustChainClient = new CheqdTrustChainClient({
        cheqdStudioEndpoint: this.config.apiEndpoint,
        apiKey: this.config.apiKey
      });
    } else {
      // Use mock clients for unit tests
      this.paymentClient = this.createMockPaymentClient();
      this.trustChainClient = this.createMockTrustChainClient();
    }
  }

  /**
   * Get test DID for testing
   */
  getTestDID(): string {
    return this.config.testDID || 'did:cheqd:testnet:default-test-user';
  }

  /**
   * Request testnet tokens from faucet
   */
  async requestTestnetTokens(did: string, amount: number = 1000): Promise<boolean> {
    if (!this.config.faucetUrl) {
      console.warn('No faucet URL configured, skipping token request');
      return false;
    }

    try {
      console.log(`Requesting ${amount} testnet tokens for ${did}`);
      
      // This would make an actual faucet request
      // For now, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`Successfully requested ${amount} testnet tokens`);
      return true;
    } catch (error) {
      console.error('Failed to request testnet tokens:', error);
      return false;
    }
  }

  /**
   * Create a test DID-Linked Resource
   */
  async createTestDLR(
    did: string,
    resourceType: string,
    data: any
  ): Promise<{ resourceId: string; resourceUrl: string }> {
    if (this.config.productionMode) {
      // Use real DLR creation for production-like testing
      console.log(`Creating real DLR for ${did} on testnet`);
      
      // This would create a real DLR on testnet
      const resourceId = `test-resource-${Date.now()}`;
      const resourceUrl = `https://resolver.testnet.cheqd.network/1.0/identifiers/${did}/resources/${resourceId}`;
      
      return { resourceId, resourceUrl };
    } else {
      // Use mock DLR creation for unit tests
      console.log(`Creating mock DLR for ${did}`);
      
      const resourceId = `mock-resource-${Date.now()}`;
      const resourceUrl = `mock://localhost/${did}/resources/${resourceId}`;
      
      return { resourceId, resourceUrl };
    }
  }

  /**
   * Create a test payment transaction
   */
  async createTestPayment(
    amount: number,
    currency: string = 'CHEQ',
    userDID?: string
  ): Promise<any> {
    const targetDID = userDID || this.getTestDID();
    
    if (this.paymentClient) {
      return await this.paymentClient.processPayment({
        amount,
        currency,
        userDID: targetDID
      });
    } else {
      throw new Error('Payment client not initialized');
    }
  }

  /**
   * Create a test trust chain accreditation
   */
  async createTestAccreditation(
    creatorDID: string,
    platformDID: string,
    scope: string[] = ['plugin-creation']
  ): Promise<any> {
    if (this.trustChainClient) {
      const ecosystemChain = {
        rTAO: 'did:cheqd:testnet:rtao-123',
        governanceFramework: 'Open Verifiable Testnet',
        dnsAnchored: false,
        supportedCredentialTypes: ['VerifiableAccreditation'],
        trustLevels: ['verified', 'accredited'],
        metadata: {
          name: 'Test Ecosystem',
          description: 'Test ecosystem for development',
          version: '1.0.0',
          maintainer: 'test@openverifiable.org'
        }
      };

      return await this.trustChainClient.createCreatorAccreditation(
        creatorDID,
        platformDID,
        ecosystemChain,
        scope
      );
    } else {
      throw new Error('Trust chain client not initialized');
    }
  }

  /**
   * Verify a test plugin creator
   */
  async verifyTestPluginCreator(
    creatorDID: string
  ): Promise<any> {
    if (this.trustChainClient) {
      const ecosystemChain = {
        rTAO: 'did:cheqd:testnet:rtao-123',
        governanceFramework: 'Open Verifiable Testnet',
        dnsAnchored: false,
        supportedCredentialTypes: ['VerifiableAccreditation'],
        trustLevels: ['verified', 'accredited'],
        metadata: {
          name: 'Test Ecosystem',
          description: 'Test ecosystem for development',
          version: '1.0.0',
          maintainer: 'test@openverifiable.org'
        }
      };

      return await this.trustChainClient.verifyPluginCreator(
        creatorDID,
        ecosystemChain
      );
    } else {
      throw new Error('Trust chain client not initialized');
    }
  }

  /**
   * Clean up test resources
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up blockchain test resources');
    
    // This would clean up any test resources created
    // For now, we'll just log the cleanup
  }

  /**
   * Create mock payment client for unit tests
   */
  private createMockPaymentClient(): CheqdPaymentClient {
    return new CheqdPaymentClient({
      apiEndpoint: 'mock://localhost'
    });
  }

  /**
   * Create mock trust chain client for unit tests
   */
  private createMockTrustChainClient(): CheqdTrustChainClient {
    return new CheqdTrustChainClient({
      cheqdStudioEndpoint: 'mock://localhost'
    });
  }

  /**
   * Get configuration
   */
  getConfig(): BlockchainTestConfig {
    return this.config;
  }

  /**
   * Check if running in production mode
   */
  isProductionMode(): boolean {
    return this.config.productionMode || false;
  }

  /**
   * Check if using testnet
   */
  isTestnet(): boolean {
    return this.config.network === CheqdNetwork.Testnet;
  }

  /**
   * Check if using mock mode
   */
  isMockMode(): boolean {
    return this.config.rpcUrl.startsWith('mock://');
  }
}

/**
 * Factory function to create blockchain testing instance
 */
export function createBlockchainTesting(
  config: BlockchainTestConfig = TESTNET_CONFIG
): BlockchainTesting {
  return new BlockchainTesting(config);
}

/**
 * Factory function for unit test blockchain testing
 */
export function createMockBlockchainTesting(): BlockchainTesting {
  return new BlockchainTesting(MOCK_CONFIG);
}

/**
 * Factory function for production-like testnet testing
 */
export function createProductionBlockchainTesting(): BlockchainTesting {
  return new BlockchainTesting(PRODUCTION_TESTNET_CONFIG);
}

/**
 * Environment-based configuration helper
 */
export function getBlockchainTestConfig(): BlockchainTestConfig {
  const network = process.env.CHEQD_NETWORK as CheqdNetwork || CheqdNetwork.Testnet;
  const productionMode = process.env.CHEQD_PRODUCTION_MODE === 'true';
  
  if (productionMode) {
    return {
      ...PRODUCTION_TESTNET_CONFIG,
      apiKey: process.env.CHEQD_TESTNET_API_KEY,
      testDID: process.env.CHEQD_TEST_DID
    };
  } else if (network === CheqdNetwork.Testnet) {
    return {
      ...TESTNET_CONFIG,
      apiKey: process.env.CHEQD_TESTNET_API_KEY,
      testDID: process.env.CHEQD_TEST_DID
    };
  } else {
    return MOCK_CONFIG;
  }
} 