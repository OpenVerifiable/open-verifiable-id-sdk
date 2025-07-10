import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseVerifiablePlugin } from '../../../src/core/plugins/verifiable-plugin.js';
import type {
  PluginContext,
  SourceVerification,
  TrustChainVerification,
  PluginMonetization,
  VerificationResult,
  SourceVerificationResult,
  TrustChainVerificationResult,
  ValidationResult
} from '../../../src/core/plugins/interfaces.js';

const minimalSourceVerification: SourceVerification = {
  sourceDID: 'did:example:source',
  bundleHash: 'abc123',
  packageDID: 'did:example:pkg'
};
const minimalTrustChain: TrustChainVerification = {
  rootTAO: 'did:example:rtao',
  platformDID: 'did:example:platform',
  accreditationCredential: 'cred-1',
  dnsAnchored: true
};
const minimalMonetization: PluginMonetization = {
  requiresLicense: true,
  licenseType: 'paid',
  price: { amount: 10, currency: 'USD' }
};

class TestVerifiablePlugin extends BaseVerifiablePlugin {
  public integrityCalled = false;
  public sourceCalled = false;
  public trustChainCalled = false;
  constructor(
    id = 'verif',
    name = 'Verif',
    version = '1.0.0',
    sourceVerification = minimalSourceVerification,
    trustChain: TrustChainVerification | null | undefined = minimalTrustChain,
    monetization = minimalMonetization
  ) {
    super(
      id,
      name,
      version,
      'credential-type',
      { name: 'Verifier', did: 'did:example:verifier' },
      ['verify'],
      sourceVerification,
      { trustChain: trustChain == null ? undefined : trustChain, monetization }
    );
  }
  protected async onInitialize(_context: PluginContext): Promise<void> {}
  protected async onCleanup(): Promise<void> {}
  protected async onValidateConfig(config: any): Promise<ValidationResult> {
    // Call parent class validation first
    const parentResult = await super.onValidateConfig(config);
    
    // Add any additional test-specific validation here if needed
    return parentResult;
  }
  protected async onVerifyIntegrity(): Promise<VerificationResult> {
    this.integrityCalled = true;
    return { isValid: true, method: 'online', timestamp: new Date().toISOString() };
  }
  protected async onVerifySource(): Promise<SourceVerificationResult> {
    this.sourceCalled = true;
    return {
      isValid: true,
      sourceHash: 'abc',
      didKey: 'did:example:source',
      blockchainVerified: true,
      identityAggregated: true,
      errors: [],
      warnings: []
    };
  }
  protected async onVerifyTrustChain(): Promise<TrustChainVerificationResult> {
    this.trustChainCalled = true;
    return {
      isValid: true,
      trustLevel: 'verified',
      chainLength: 2,
      dnsAnchored: true,
      governanceFramework: 'Test',
      verificationPath: ['a', 'b', 'c'],
      errors: [],
      warnings: []
    };
  }
}

describe('BaseVerifiablePlugin', () => {
  let plugin: TestVerifiablePlugin;

  beforeEach(() => {
    plugin = new TestVerifiablePlugin();
  });

  it('assigns properties on construction', () => {
    expect(plugin.type).toBe('verifiable');
    expect(plugin.verificationLevel).toBe('standard');
    expect(plugin.sourceVerification.sourceDID).toBe('did:example:source');
    expect(plugin.trustChain?.rootTAO).toBe('did:example:rtao');
    expect(plugin.monetization?.licenseType).toBe('paid');
  });

  it('verifyIntegrity calls verifySource, verifyTrustChain, and onVerifyIntegrity', async () => {
    const result = await plugin.verifyIntegrity();
    expect(result.isValid).toBe(true);
    expect(plugin.sourceCalled).toBe(true);
    expect(plugin.trustChainCalled).toBe(true);
    expect(plugin.integrityCalled).toBe(true);
  });

  it('verifySource validates required fields and calls onVerifySource', async () => {
    const result = await plugin.verifySource();
    expect(result.isValid).toBe(true);
    expect(plugin.sourceCalled).toBe(true);
    expect(result.didKey).toBe('did:example:source');
  });

  it('verifyTrustChain validates required fields and calls onVerifyTrustChain', async () => {
    const result = await plugin.verifyTrustChain();
    expect(result.isValid).toBe(true);
    expect(plugin.trustChainCalled).toBe(true);
    expect(result.trustLevel).toBe('verified');
  });

  it('should warn when monetization requires license but no trustChain', async () => {
    // Create plugin with monetization but no trustChain
    const plugin2 = new TestVerifiablePlugin('id', 'n', '1', minimalSourceVerification, null, minimalMonetization);
    
    // Verify the condition is met
    expect(plugin2.monetization?.requiresLicense).toBe(true);
    expect(plugin2.trustChain).toBeUndefined();
    
    // Call validateConfig
    const result = await plugin2.validateConfig({});
    
    // Should be valid but have warning
    expect(result.isValid).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    if (!result.warnings || !result.warnings.some(w => w.includes('Trust chain verification is recommended for monetized plugins'))) {
      throw new Error('Expected warning not found. Actual warnings: ' + JSON.stringify(result.warnings));
    }
  });

  it('should error when no sourceVerification', async () => {
    const plugin3 = new TestVerifiablePlugin('id', 'n', '1', null as any, minimalTrustChain, minimalMonetization);
    const result = await plugin3.validateConfig({});
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Source verification data is required for verifiable plugins');
  });
}); 