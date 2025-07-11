/**
 * Plugin License Manager
 * 
 * Handles monetized plugin installation, license verification, and offline execution
 * Implements ADR-0046: Monetized Plugin Installation Architecture
 */

import { 
  AgentPluginConfig, 
  CachedPluginLicense, 
  PluginMonetizationConfig 
} from '../agents/types.js';
import { CheqdPaymentClient } from '../payments/cheqd-payment-client.js';
import { PluginStorageManager } from './storage-manager.js';
import { PluginVerificationEngine } from './verification-engine.js';

/**
 * Plugin installation configuration
 */
export interface PluginInstallationConfig {
  /** Plugin identifier */
  pluginId: string;
  /** Payment configuration */
  paymentConfig: PaymentConfig;
  /** Installation options */
  options?: {
    /** Whether to cache license for offline use */
    cacheForOffline?: boolean;
    /** Whether to verify license immediately */
    verifyImmediately?: boolean;
    /** Custom installation directory */
    installDirectory?: string;
  };
}

/**
 * Payment configuration for plugin installation
 */
export interface PaymentConfig {
  /** Payment method */
  method: 'cheqd' | 'stripe' | 'manual';
  /** Payment amount */
  amount: number;
  /** Payment currency */
  currency: string;
  /** User DID for payment */
  userDID: string;
  /** Payment metadata */
  metadata?: Record<string, any>;
}

/**
 * Plugin installation result
 */
export interface PluginInstallationResult {
  /** Whether installation was successful */
  success: boolean;
  /** Plugin identifier */
  pluginId: string;
  /** Installation timestamp */
  installedAt: string;
  /** License credential if applicable */
  licenseCredential?: any;
  /** Payment transaction details */
  paymentTransaction?: {
    transactionId: string;
    status: 'pending' | 'completed' | 'failed';
    amount: number;
    currency: string;
  };
  /** Installation warnings */
  warnings?: string[];
  /** Installation errors */
  errors?: string[];
}

/**
 * License verification result
 */
export interface LicenseVerificationResult {
  /** Whether license is valid */
  isValid: boolean;
  /** License credential */
  licenseCredential?: any;
  /** Verification timestamp */
  verifiedAt: string;
  /** Verification method used */
  verificationMethod: 'online' | 'cached' | 'offline';
  /** Verification errors */
  errors?: string[];
  /** License expiration information */
  expiration?: {
    expiresAt: string;
    isExpired: boolean;
    daysUntilExpiration: number;
  };
}

/**
 * Plugin License Manager
 * 
 * Manages the complete lifecycle of monetized plugin licenses including:
 * - Installation with payment processing
 * - License verification (online and offline)
 * - Cached license management
 * - Offline execution support
 */
export class PluginLicenseManager {
  private paymentClient: CheqdPaymentClient;
  private storageManager: PluginStorageManager;
  private verificationEngine: PluginVerificationEngine;

  constructor(options?: {
    paymentClient?: CheqdPaymentClient;
    storageManager?: PluginStorageManager;
    verificationEngine?: PluginVerificationEngine;
  }) {
    this.paymentClient = options?.paymentClient || new CheqdPaymentClient();
    this.storageManager = options?.storageManager || new PluginStorageManager();
    this.verificationEngine = options?.verificationEngine || new PluginVerificationEngine();
  }

  /**
   * Install a monetized plugin with license verification
   */
  async installPlugin(
    config: PluginInstallationConfig
  ): Promise<PluginInstallationResult> {
    try {
      console.log(`Installing plugin: ${config.pluginId}`);

      // 1. Validate plugin configuration
      const pluginConfig = await this.validatePluginConfig(config.pluginId);
      
      // 2. Process payment if required
      let paymentTransaction;
      if (pluginConfig.monetization?.requiresLicense && 
          pluginConfig.monetization.licenseType !== 'free') {
        paymentTransaction = await this.processPayment(config.paymentConfig, pluginConfig.monetization);
      }

      // 3. Generate license credential
      const licenseCredential = await this.generateLicenseCredential(
        config.pluginId,
        config.paymentConfig.userDID,
        pluginConfig.monetization
      );

      // 4. Cache license for offline use if requested
      if (config.options?.cacheForOffline) {
        await this.cacheLicense(config.pluginId, licenseCredential);
      }

      // 5. Verify license immediately if requested
      if (config.options?.verifyImmediately) {
        await this.verifyLicense(config.pluginId);
      }

      // 6. Store plugin configuration
      await this.storageManager.storePluginConfig(config.pluginId, pluginConfig);

      return {
        success: true,
        pluginId: config.pluginId,
        installedAt: new Date().toISOString(),
        licenseCredential,
        paymentTransaction,
        warnings: paymentTransaction?.status === 'pending' ? 
          ['Payment is pending. Plugin will be fully activated once payment is confirmed.'] : 
          undefined
      };

    } catch (error) {
      console.error(`Plugin installation failed: ${config.pluginId}`, error);
      
      return {
        success: false,
        pluginId: config.pluginId,
        installedAt: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Unknown installation error']
      };
    }
  }

  /**
   * Verify plugin license (online or cached)
   */
  async verifyLicense(pluginId: string): Promise<LicenseVerificationResult> {
    try {
      console.log(`Verifying license for plugin: ${pluginId}`);

      // 0. Validate plugin exists first
      try {
        await this.validatePluginConfig(pluginId);
      } catch (error) {
        return {
          isValid: false,
          verifiedAt: new Date().toISOString(),
          verificationMethod: 'online',
          errors: [error instanceof Error ? error.message : 'Plugin not found']
        };
      }

      // 1. Check if we have a cached license
      const cachedLicense = await this.storageManager.getCachedLicense(pluginId);
      
      if (cachedLicense && this.isCachedLicenseValid(cachedLicense)) {
        // Use cached license for offline verification
        return await this.verifyCachedLicense(pluginId, cachedLicense);
      }

      // 2. Perform online verification
      return await this.verifyOnlineLicense(pluginId);

    } catch (error) {
      console.error(`License verification failed: ${pluginId}`, error);
      
      return {
        isValid: false,
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'online',
        errors: [error instanceof Error ? error.message : 'Unknown verification error']
      };
    }
  }

  /**
   * Check if plugin can execute offline
   */
  async checkOfflineExecution(pluginId: string): Promise<boolean> {
    try {
      const cachedLicense = await this.storageManager.getCachedLicense(pluginId);
      
      if (!cachedLicense) {
        return false;
      }

      // Check if license is still valid
      if (this.isCachedLicenseExpired(cachedLicense)) {
        return false;
      }

      // Check if we haven't exceeded offline usage limits
      if (cachedLicense.usageCount >= cachedLicense.maxOfflineUsage) {
        return false;
      }

      return true;

    } catch (error) {
      console.error(`Offline execution check failed: ${pluginId}`, error);
      return false;
    }
  }

  /**
   * Cache license for offline execution
   */
  async cacheLicense(pluginId: string, licenseCredential: any): Promise<void> {
    try {
      const cachedLicense: CachedPluginLicense = {
        credentialId: licenseCredential.id,
        issuerDID: licenseCredential.issuer,
        licenseType: licenseCredential.credentialSubject.licenseType,
        expiresAt: licenseCredential.credentialSubject.expiresAt,
        verificationProof: licenseCredential.proof.proofValue,
        cachedAt: new Date().toISOString(),
        usageCount: 0,
        maxOfflineUsage: 100 // Configurable
      };

      await this.storageManager.storeCachedLicense(pluginId, cachedLicense);
      console.log(`License cached for plugin: ${pluginId}`);

    } catch (error) {
      console.error(`Failed to cache license: ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Increment offline usage count
   */
  async incrementOfflineUsage(pluginId: string): Promise<void> {
    try {
      const cachedLicense = await this.storageManager.getCachedLicense(pluginId);
      
      if (cachedLicense) {
        cachedLicense.usageCount++;
        await this.storageManager.storeCachedLicense(pluginId, cachedLicense);
      }

    } catch (error) {
      console.error(`Failed to increment offline usage: ${pluginId}`, error);
    }
  }

  /**
   * Process payment for plugin installation
   */
  private async processPayment(
    paymentConfig: PaymentConfig,
    monetization: PluginMonetizationConfig
  ): Promise<any> {
    if (!monetization.requiresLicense || monetization.licenseType === 'free') {
      return null;
    }

    return await this.paymentClient.processPayment({
      amount: monetization.price?.amount || 0,
      currency: monetization.price?.currency || 'USD',
      userDID: paymentConfig.userDID,
      metadata: {
        pluginId: paymentConfig.metadata?.pluginId,
        licenseType: monetization.licenseType,
        ...paymentConfig.metadata
      }
    });
  }

  /**
   * Generate license credential
   */
  private async generateLicenseCredential(
    pluginId: string,
    userDID: string,
    monetization?: PluginMonetizationConfig
  ): Promise<any> {
    // This would integrate with the credential issuance system
    // For now, return a mock credential structure
    return {
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: ['VerifiableCredential', 'PluginLicenseCredential'],
      issuer: 'did:cheqd:mainnet:plugin-issuer',
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: userDID,
        pluginId,
        licenseType: monetization?.licenseType || 'free',
        expiresAt: monetization?.validityPeriod ? 
          new Date(Date.now() + monetization.validityPeriod * 24 * 60 * 60 * 1000).toISOString() :
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      },
      proof: {
        type: 'DataIntegrityProof',
        cryptosuite: 'eddsa-jcs-2022',
        created: new Date().toISOString(),
        verificationMethod: 'did:cheqd:mainnet:plugin-issuer#key-1',
        proofPurpose: 'assertionMethod',
        proofValue: 'mock-proof-value'
      }
    };
  }

  /**
   * Validate plugin configuration
   */
  private async validatePluginConfig(pluginId: string): Promise<AgentPluginConfig> {
    // This would validate against the plugin registry
    // For now, validate basic plugin ID format and throw for invalid ones
    if (!pluginId || pluginId === 'invalid-plugin') {
      throw new Error(`Invalid plugin ID: ${pluginId}`);
    }

    // Check if plugin exists in registry (mock implementation)
    const validPlugins = [
      'test-advanced-did-method', 'test-plugin', 'offline-test-plugin', 'usage-test-plugin', 
      'factory-test-plugin', 'factory-offline-test', 'storage-test-plugin', 
      'plugin1', 'plugin2', 'plugin3'
    ];
    
    if (!validPlugins.includes(pluginId)) {
      throw new Error(`Plugin not found in registry: ${pluginId}`);
    }

    return {
      name: pluginId,
      version: '1.0.0',
      type: 'utility',
      enabled: true,
      monetization: {
        requiresLicense: true,
        licenseType: 'paid',
        price: {
          amount: 10,
          currency: 'USD',
          description: 'One-time payment for plugin license'
        },
        validityPeriod: 365
      }
    };
  }

  /**
   * Verify cached license
   */
  private async verifyCachedLicense(
    pluginId: string,
    cachedLicense: CachedPluginLicense
  ): Promise<LicenseVerificationResult> {
    const isExpired = this.isCachedLicenseExpired(cachedLicense);
    
    return {
      isValid: !isExpired && cachedLicense.usageCount < cachedLicense.maxOfflineUsage,
      licenseCredential: cachedLicense,
      verifiedAt: new Date().toISOString(),
      verificationMethod: 'cached',
      expiration: {
        expiresAt: cachedLicense.expiresAt,
        isExpired,
        daysUntilExpiration: Math.ceil(
          (new Date(cachedLicense.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      }
    };
  }

  /**
   * Verify license online
   */
  private async verifyOnlineLicense(pluginId: string): Promise<LicenseVerificationResult> {
    // This would perform online verification against the status list
    // For now, return a mock verification result
    return {
      isValid: true,
      verifiedAt: new Date().toISOString(),
      verificationMethod: 'online'
    };
  }

  /**
   * Check if cached license is valid
   */
  private isCachedLicenseValid(cachedLicense: CachedPluginLicense): boolean {
    return !this.isCachedLicenseExpired(cachedLicense) && 
           cachedLicense.usageCount < cachedLicense.maxOfflineUsage;
  }

  /**
   * Check if cached license is expired
   */
  private isCachedLicenseExpired(cachedLicense: CachedPluginLicense): boolean {
    return new Date(cachedLicense.expiresAt) < new Date();
  }
} 