/**
 * Agent Configuration Tests
 * 
 * Tests for the agent configuration system including validation,
 * storage, and lifecycle management
 */

import { AgentConfigurationClient, createAgentConfigurationClient } from '../configuration-client';
import { AgentConfigurationManager } from '../configuration-manager';
import { AgentType } from '../../../types';
import {
  AgentConfiguration,
  AgentConfigurationValidationResult,
  AgentConfigurationTemplate
} from '../types';

describe('Agent Configuration System', () => {
  let configClient: AgentConfigurationClient;
  let configManager: AgentConfigurationManager;

  beforeEach(async () => {
    configClient = createAgentConfigurationClient({
      storage: 'memory',
      autoInitialize: true,
      loadExisting: false
    });
    await configClient.initialize();
    configManager = configClient.getConfigurationManager();
  });

  afterEach(async () => {
    // Clean up any created configurations
    const configs = configManager.listConfigurations();
    for (const config of configs) {
      await configManager.deleteConfiguration(config.agentId);
    }
  });

  describe('Configuration Creation', () => {
    it('should create a basic user agent configuration', async () => {
      const config = await configManager.createConfiguration(
        'test-user-1',
        AgentType.USER
      );

      expect(config.agentId).toBe('test-user-1');
      expect(config.agentType).toBe(AgentType.USER);
      expect(config.security?.encryptionLevel).toBe('standard');
      expect(config.features?.trustRegistry).toBe(true);
      expect(config.plugins).toHaveLength(2); // did-key and credential-w3c
    });

    it('should create a secure user agent configuration', async () => {
      const config = await configManager.createConfiguration(
        'test-user-2',
        AgentType.USER,
        {
          security: {
            encryptionLevel: 'high',
            requireBiometric: true,
            keyStorageType: 'keychain',
            sandboxMode: true
          },
          features: {
            biometricAuth: true,
            carbonAwareness: true
          }
        }
      );

      expect(config.security?.encryptionLevel).toBe('high');
      expect(config.security?.requireBiometric).toBe(true);
      expect(config.security?.keyStorageType).toBe('keychain');
      expect(config.security?.sandboxMode).toBe(true);
      expect(config.features?.biometricAuth).toBe(true);
      expect(config.features?.carbonAwareness).toBe(true);
    });

    it('should create a service agent configuration', async () => {
      const config = await configManager.createConfiguration(
        'test-service-1',
        AgentType.SERVICE,
        {
          security: {
            encryptionLevel: 'high',
            keyStorageType: 'hardware'
          },
          endpoints: {
            schemaRegistry: 'https://schema.example.com',
            trustRegistry: 'https://trust.example.com'
          }
        }
      );

      expect(config.agentType).toBe(AgentType.SERVICE);
      expect(config.security?.encryptionLevel).toBe('high');
      expect(config.security?.keyStorageType).toBe('hardware');
      expect(config.endpoints?.schemaRegistry).toBe('https://schema.example.com');
      expect(config.endpoints?.trustRegistry).toBe('https://trust.example.com');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate a correct configuration', async () => {
      const config: AgentConfiguration = {
        agentId: 'test-valid',
        agentType: AgentType.USER,
        security: {
          encryptionLevel: 'standard',
          requireBiometric: false,
          keyStorageType: 'file',
          sandboxMode: false
        },
        features: {
          trustRegistry: true,
          schemaRegistry: true,
          carbonAwareness: false,
          biometricAuth: false,
          offlineCache: true
        },
        plugins: [
          {
            name: 'did-key',
            version: '1.0.0',
            type: 'did-method',
            enabled: true
          }
        ]
      };

      const result = await configManager.validateConfiguration(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration with invalid plugin version', async () => {
      const config: AgentConfiguration = {
        agentId: 'test-invalid',
        agentType: AgentType.USER,
        plugins: [
          {
            name: 'test-plugin',
            version: 'invalid-version',
            type: 'did-method',
            enabled: true
          }
        ]
      };

      const result = await configManager.validateConfiguration(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid plugin version'))).toBe(true);
    });

    it('should reject configuration with duplicate plugin names', async () => {
      const config: AgentConfiguration = {
        agentId: 'test-duplicate',
        agentType: AgentType.USER,
        plugins: [
          {
            name: 'test-plugin',
            version: '1.0.0',
            type: 'did-method',
            enabled: true
          },
          {
            name: 'test-plugin',
            version: '2.0.0',
            type: 'credential-type',
            enabled: true
          }
        ]
      };

      const result = await configManager.validateConfiguration(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate plugin name'))).toBe(true);
    });

    it('should warn about missing endpoints for enabled features', async () => {
      const config: AgentConfiguration = {
        agentId: 'test-warning',
        agentType: AgentType.USER,
        features: {
          carbonAwareness: true,
          trustRegistry: true
        }
      };

      const result = await configManager.validateConfiguration(config);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('carbon awareness enabled but no carbon service endpoint'))).toBe(true);
      expect(result.warnings.some(w => w.includes('trust registry enabled but no trust registry endpoint'))).toBe(true);
    });
  });

  describe('Template System', () => {
    it('should provide default templates', () => {
      const templates = configManager.getTemplates();
      
      expect(templates).toHaveLength(3);
      expect(templates.find(t => t.name === 'basic-user')).toBeDefined();
      expect(templates.find(t => t.name === 'secure-user')).toBeDefined();
      expect(templates.find(t => t.name === 'service-agent')).toBeDefined();
    });

    it('should create configuration from template', async () => {
      const config = await configManager.createFromTemplate(
        'secure-user',
        'test-template-user'
      );

      expect(config.agentId).toBe('test-template-user');
      expect(config.agentType).toBe(AgentType.USER);
      expect(config.security?.encryptionLevel).toBe('high');
      expect(config.security?.requireBiometric).toBe(true);
      expect(config.features?.biometricAuth).toBe(true);
    });

    it('should allow template overrides', async () => {
      const config = await configManager.createFromTemplate(
        'basic-user',
        'test-override-user',
        {
          security: {
            encryptionLevel: 'high'
          },
          features: {
            carbonAwareness: true
          }
        }
      );

      expect(config.security?.encryptionLevel).toBe('high');
      expect(config.features?.carbonAwareness).toBe(true);
      // Should still have basic-user defaults for other properties
      expect(config.security?.requireBiometric).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should list configurations', async () => {
      await configManager.createConfiguration('test-1', AgentType.USER);
      await configManager.createConfiguration('test-2', AgentType.SERVICE);

      const configs = configManager.listConfigurations();
      expect(configs).toHaveLength(2);
      expect(configs.map(c => c.agentId)).toContain('test-1');
      expect(configs.map(c => c.agentId)).toContain('test-2');
    });

    it('should update configuration', async () => {
      const config = await configManager.createConfiguration('test-update', AgentType.USER);
      
      const updated = await configManager.updateConfiguration('test-update', {
        security: {
          encryptionLevel: 'high'
        }
      });

      expect(updated.security?.encryptionLevel).toBe('high');
      expect(updated.agentId).toBe('test-update'); // Should not change
      expect(updated.agentType).toBe(AgentType.USER); // Should not change
    });

    it('should delete configuration', async () => {
      await configManager.createConfiguration('test-delete', AgentType.USER);
      expect(configManager.listConfigurations()).toHaveLength(1);

      await configManager.deleteConfiguration('test-delete');
      expect(configManager.listConfigurations()).toHaveLength(0);
    });

    it('should provide configuration statistics', () => {
      configManager.createConfiguration('user-1', AgentType.USER);
      configManager.createConfiguration('user-2', AgentType.USER);
      configManager.createConfiguration('service-1', AgentType.SERVICE, {
        security: { encryptionLevel: 'high' }
      });

      const stats = configManager.getStatistics();
      expect(stats.total).toBe(3);
      expect(stats.byType[AgentType.USER]).toBe(2);
      expect(stats.byType[AgentType.SERVICE]).toBe(1);
      expect(stats.bySecurityLevel.standard).toBe(2);
      expect(stats.bySecurityLevel.high).toBe(1);
    });
  });

  describe('Configuration Client', () => {
    it('should create quick user agent', async () => {
      const agent = await configClient.createQuickUserAgent('test-user');
      
      expect(agent).toBeDefined();
      expect(agent.agentId).toBe('user-test-user');
      expect(agent.agentType).toBe(AgentType.USER);
    });

    it('should create secure user agent', async () => {
      const agent = await configClient.createSecureUserAgent('test-user');
      
      expect(agent).toBeDefined();
      expect(agent.agentId).toBe('user-test-user');
      expect(agent.agentType).toBe(AgentType.USER);
    });

    it('should create service agent', async () => {
      const agent = await configClient.createServiceAgent('test-service');
      
      expect(agent).toBeDefined();
      expect(agent.agentId).toBe('service-test-service');
      expect(agent.agentType).toBe(AgentType.SERVICE);
    });

    it('should provide configuration recommendations', () => {
      const personalRecs = configClient.getConfigurationRecommendations('personal');
      expect(personalRecs).toHaveLength(2);
      expect(personalRecs.some(r => r.name === 'basic-user')).toBe(true);
      expect(personalRecs.some(r => r.name === 'secure-user')).toBe(true);

      const serviceRecs = configClient.getConfigurationRecommendations('service');
      expect(serviceRecs).toHaveLength(1);
      expect(serviceRecs[0].name).toBe('service-agent');
    });

    it('should clone configuration', async () => {
      const original = await configManager.createConfiguration('original', AgentType.USER);
      const cloned = await configClient.cloneAgentConfiguration(
        'original',
        'cloned',
        {
          security: { encryptionLevel: 'high' }
        }
      );

      expect(cloned.agentId).toBe('cloned');
      expect(cloned.agentType).toBe(AgentType.USER);
      expect(cloned.security?.encryptionLevel).toBe('high');
      expect(cloned.security?.requireBiometric).toBe(original.security?.requireBiometric);
    });
  });

  describe('Import/Export', () => {
    it('should export configurations', async () => {
      await configManager.createConfiguration('export-1', AgentType.USER);
      await configManager.createConfiguration('export-2', AgentType.SERVICE);

      const exportData = await configManager.exportConfigurations();
      
      expect(exportData.version).toBe('1.0.0');
      expect(exportData.configurations).toHaveLength(2);
      expect(exportData.configurations.map(c => c.agentId)).toContain('export-1');
      expect(exportData.configurations.map(c => c.agentId)).toContain('export-2');
    });

    it('should import configurations', async () => {
      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        configurations: [
          {
            agentId: 'import-1',
            agentType: AgentType.USER,
            security: { encryptionLevel: 'standard' as const },
            features: { trustRegistry: true }
          }
        ]
      };

      const result = await configManager.importConfigurations(exportData);
      
      expect(result.migrated).toBe(1);
      expect(result.failed).toBe(0);
      expect(configManager.getConfiguration('import-1')).toBeDefined();
    });

    it('should handle import conflicts', async () => {
      await configManager.createConfiguration('conflict', AgentType.USER);
      
      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        configurations: [
          {
            agentId: 'conflict',
            agentType: AgentType.SERVICE
          }
        ]
      };

      const result = await configManager.importConfigurations(exportData);
      
      expect(result.migrated).toBe(0);
      expect(result.warnings.some(w => w.includes('already exists'))).toBe(true);
    });
  });
}); 