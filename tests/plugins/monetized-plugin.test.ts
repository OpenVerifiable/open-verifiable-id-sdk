/**
 * Monetized Plugin System Tests
 * 
 * Tests for the monetized plugin installation system
 * Implements ADR-0046: Monetized Plugin Installation Architecture
 */

import { PluginLicenseManager } from '../../src/core/plugins/license-manager.js';
import { AgentFactory } from '../../src/core/agents/factory.js';
import { PluginStorageManager } from '../../src/core/plugins/storage-manager.js';

describe('Monetized Plugin System', () => {
  let licenseManager: PluginLicenseManager;
  let storageManager: PluginStorageManager;
  let factory: AgentFactory;

  beforeEach(() => {
    // Clear test storage before each test
    (global as any).__testStorage = new Map();
    
    storageManager = new PluginStorageManager();
    licenseManager = new PluginLicenseManager({
      storageManager
    });
    factory = AgentFactory.getInstance();
  });

  describe('Plugin Installation', () => {
    it('should install a paid plugin with payment processing', async () => {
      const pluginId = 'test-advanced-did-method';
      const paymentConfig = {
        method: 'cheqd' as const,
        amount: 10,
        currency: 'USD',
        userDID: 'did:example:user123',
        metadata: {
          pluginId
        }
      };

      const result = await licenseManager.installPlugin({
        pluginId,
        paymentConfig,
        options: {
          cacheForOffline: true,
          verifyImmediately: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.pluginId).toBe(pluginId);
      expect(result.installedAt).toBeDefined();
      expect(result.licenseCredential).toBeDefined();
      expect(result.paymentTransaction).toBeDefined();
    });

    it('should handle installation failures gracefully', async () => {
      const pluginId = 'invalid-plugin';
      
      // Mock a failure scenario
      const result = await licenseManager.installPlugin({
        pluginId,
        paymentConfig: {
          method: 'cheqd',
          amount: 10,
          currency: 'USD',
          userDID: 'did:example:user123'
        }
      });

      // Should handle the error gracefully
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('License Verification', () => {
    it('should verify license successfully', async () => {
      const pluginId = 'test-plugin';
      
      // First install a plugin
      await licenseManager.installPlugin({
        pluginId,
        paymentConfig: {
          method: 'cheqd',
          amount: 10,
          currency: 'USD',
          userDID: 'did:example:user123'
        }
      });

      // Then verify the license
      const result = await licenseManager.verifyLicense(pluginId);

      expect(result.isValid).toBe(true);
      expect(result.verifiedAt).toBeDefined();
      expect(result.verificationMethod).toBeDefined();
    });

    it('should handle verification failures', async () => {
      const pluginId = 'non-existent-plugin';
      
      const result = await licenseManager.verifyLicense(pluginId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Offline Execution', () => {
    it('should support offline execution with cached license', async () => {
      const pluginId = 'offline-test-plugin';
      
      // Install plugin with offline caching
      await licenseManager.installPlugin({
        pluginId,
        paymentConfig: {
          method: 'cheqd',
          amount: 10,
          currency: 'USD',
          userDID: 'did:example:user123'
        },
        options: {
          cacheForOffline: true
        }
      });

      // Check offline execution capability
      const canExecute = await licenseManager.checkOfflineExecution(pluginId);

      expect(canExecute).toBe(true);
    });

    it('should increment offline usage count', async () => {
      const pluginId = 'usage-test-plugin';
      
      // Install plugin
      await licenseManager.installPlugin({
        pluginId,
        paymentConfig: {
          method: 'cheqd',
          amount: 10,
          currency: 'USD',
          userDID: 'did:example:user123'
        },
        options: {
          cacheForOffline: true
        }
      });

      // Increment usage
      await licenseManager.incrementOfflineUsage(pluginId);
      await licenseManager.incrementOfflineUsage(pluginId);

      // Verify usage count increased
      const cachedLicense = await storageManager.getCachedLicense(pluginId);
      expect(cachedLicense?.usageCount).toBe(2);
    });
  });

  describe('Agent Factory Integration', () => {
    it('should install monetized plugin through factory', async () => {
      const pluginId = 'factory-test-plugin';
      const paymentConfig = {
        method: 'cheqd' as const,
        amount: 10,
        currency: 'USD',
        userDID: 'did:example:user123'
      };

      const result = await factory.installMonetizedPlugin(pluginId, paymentConfig);

      expect(result.success).toBe(true);
      expect(result.pluginId).toBe(pluginId);
    });

    it('should check offline execution through factory', async () => {
      const pluginId = 'factory-offline-test';
      
      // Install plugin first
      await factory.installMonetizedPlugin(pluginId, {
        method: 'cheqd',
        amount: 10,
        currency: 'USD',
        userDID: 'did:example:user123'
      });

      // Check offline execution
      const canExecute = await factory.checkPluginOfflineExecution(pluginId);

      expect(canExecute).toBe(true);
    });
  });

  describe('Storage Management', () => {
    it('should store and retrieve plugin configurations', async () => {
      const pluginId = 'storage-test-plugin';
      const mockConfig = {
        name: pluginId,
        version: '1.0.0',
        type: 'utility' as const,
        enabled: true
      };

      // Store configuration
      await storageManager.storePluginConfig(pluginId, mockConfig);

      // Retrieve configuration
      const retrieved = await storageManager.getPluginConfig(pluginId);

      expect(retrieved).toEqual(mockConfig);
    });

    it('should list installed plugins', async () => {
      const pluginIds = ['plugin1', 'plugin2', 'plugin3'];

      // Install multiple plugins
      for (const pluginId of pluginIds) {
        await licenseManager.installPlugin({
          pluginId,
          paymentConfig: {
            method: 'cheqd',
            amount: 10,
            currency: 'USD',
            userDID: 'did:example:user123'
          }
        });
      }

      // List installed plugins
      const installed = await storageManager.listInstalledPlugins();

      expect(installed).toContain('plugin1');
      expect(installed).toContain('plugin2');
      expect(installed).toContain('plugin3');
    });
  });
}); 