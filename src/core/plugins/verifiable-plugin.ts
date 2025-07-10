/**
 * Verifiable plugin base class for the Open Verifiable ID SDK
 * Implements ADR-0048: Verifiable Plugin Architecture
 */

import { BasePlugin } from './base-plugin.js';
import { 
  VerifiablePlugin, 
  VerificationLevel, 
  SourceVerification, 
  TrustChainVerification, 
  PluginMonetization, 
  VerificationResult, 
  SourceVerificationResult, 
  TrustChainVerificationResult,
  ValidationResult 
} from './interfaces.js';

/**
 * Abstract base class for verifiable plugins
 */
export abstract class BaseVerifiablePlugin extends BasePlugin implements VerifiablePlugin {
  public readonly type: 'verifiable' = 'verifiable';
  public readonly verificationLevel: VerificationLevel;
  public readonly sourceVerification: SourceVerification;
  public readonly trustChain?: TrustChainVerification;
  public readonly monetization?: PluginMonetization;

  constructor(
    id: string,
    name: string,
    version: string,
    category: any,
    author: any,
    capabilities: string[],
    sourceVerification: SourceVerification,
    options?: {
      description?: string;
      dependencies?: any[];
      config?: Record<string, any>;
      verificationLevel?: VerificationLevel;
      trustChain?: TrustChainVerification;
      monetization?: PluginMonetization;
    }
  ) {
    super(
      id,
      name,
      version,
      'verifiable',
      category,
      author,
      capabilities,
      {
        description: options?.description,
        dependencies: options?.dependencies,
        config: options?.config
      }
    );

    this.verificationLevel = options?.verificationLevel || 'standard';
    this.sourceVerification = sourceVerification;
    this.trustChain = options?.trustChain;
    this.monetization = options?.monetization;
  }

  /**
   * Verify plugin integrity
   */
  async verifyIntegrity(): Promise<VerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;

    try {
      // Verify source code
      const sourceVerification = await this.verifySource();
      if (!sourceVerification.isValid) {
        isValid = false;
        errors.push(...(sourceVerification.errors || []));
      }
      warnings.push(...(sourceVerification.warnings || []));

      // Verify trust chain if present
      if (this.trustChain) {
        const trustChainVerification = await this.verifyTrustChain();
        if (!trustChainVerification.isValid) {
          isValid = false;
          errors.push(...(trustChainVerification.errors || []));
        }
        warnings.push(...(trustChainVerification.warnings || []));
      }

      // Plugin-specific integrity checks
      const pluginIntegrity = await this.onVerifyIntegrity();
      if (!pluginIntegrity.isValid) {
        isValid = false;
        errors.push(...(pluginIntegrity.errors || []));
      }
      warnings.push(...(pluginIntegrity.warnings || []));

    } catch (error) {
      isValid = false;
      errors.push(`Integrity verification failed: ${error}`);
    }

    return {
      isValid,
      method: 'online',
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Verify source code
   */
  async verifySource(): Promise<SourceVerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;

    try {
      // Basic source verification checks
      if (!this.sourceVerification.sourceDID) {
        isValid = false;
        errors.push('Source DID is required');
      }

      if (!this.sourceVerification.bundleHash) {
        isValid = false;
        errors.push('Bundle hash is required');
      }

      if (!this.sourceVerification.packageDID) {
        isValid = false;
        errors.push('Package DID is required');
      }

      // Plugin-specific source verification
      const pluginSourceVerification = await this.onVerifySource();
      if (!pluginSourceVerification.isValid) {
        isValid = false;
        errors.push(...pluginSourceVerification.errors);
      }
      warnings.push(...pluginSourceVerification.warnings);

    } catch (error) {
      isValid = false;
      errors.push(`Source verification failed: ${error}`);
    }

    return {
      isValid,
      sourceHash: this.sourceVerification.sourceHash || '',
      didKey: this.sourceVerification.sourceDID,
      blockchainVerified: this.sourceVerification.blockchainVerified || false,
      identityAggregated: this.sourceVerification.identityAggregated || false,
      errors,
      warnings
    };
  }

  /**
   * Verify trust chain
   */
  async verifyTrustChain(): Promise<TrustChainVerificationResult> {
    if (!this.trustChain) {
      return {
        isValid: false,
        trustLevel: 'none',
        chainLength: 0,
        dnsAnchored: false,
        governanceFramework: '',
        verificationPath: [],
        errors: ['Trust chain verification data not available'],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;

    try {
      // Basic trust chain verification checks
      if (!this.trustChain.rootTAO) {
        isValid = false;
        errors.push('Root TAO DID is required');
      }

      if (!this.trustChain.platformDID) {
        isValid = false;
        errors.push('Platform DID is required');
      }

      if (!this.trustChain.accreditationCredential) {
        isValid = false;
        errors.push('Accreditation credential is required');
      }

      // Plugin-specific trust chain verification
      const pluginTrustChainVerification = await this.onVerifyTrustChain();
      if (!pluginTrustChainVerification.isValid) {
        isValid = false;
        errors.push(...pluginTrustChainVerification.errors);
      }
      warnings.push(...pluginTrustChainVerification.warnings);

    } catch (error) {
      isValid = false;
      errors.push(`Trust chain verification failed: ${error}`);
    }

    return {
      isValid,
      trustLevel: this.trustChain.dnsAnchored ? 'verified' : 'basic',
      chainLength: 2, // Root TAO -> Platform -> Creator
      dnsAnchored: this.trustChain.dnsAnchored || false,
      governanceFramework: 'Open Verifiable Plugin Ecosystem',
      verificationPath: [this.trustChain.rootTAO, this.trustChain.platformDID, this.author.did],
      errors,
      warnings
    };
  }

  /**
   * Override configuration validation to include verification-specific checks
   */
  protected async onValidateConfig(config: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verify source verification data is present
    if (!this.sourceVerification || !this.sourceVerification.sourceDID) {
      errors.push('Source verification data is required for verifiable plugins');
    }

    // Verify trust chain data if monetization is enabled
    if (this.monetization?.requiresLicense && !this.trustChain) {
      warnings.push('Trust chain verification is recommended for monetized plugins');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Plugin-specific integrity verification
   */
  protected abstract onVerifyIntegrity(): Promise<VerificationResult>;

  /**
   * Plugin-specific source verification
   */
  protected abstract onVerifySource(): Promise<SourceVerificationResult>;

  /**
   * Plugin-specific trust chain verification
   */
  protected abstract onVerifyTrustChain(): Promise<TrustChainVerificationResult>;
} 