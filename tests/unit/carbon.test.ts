/**
 * Carbon Awareness Client Unit Tests
 * 
 * Tests for the CarbonAwareClient implementation following ADR-0004
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CarbonAwareClient } from '../../src/core/carbon/client';
import type {
  OperationType, 
  OperationMetadata,
  CarbonImpact,
  CarbonAwareResult,
  CarbonAwareOptions,
  CarbonRecommendation,
  OptimizationResult,
  CarbonReport,
  TimePeriod,
  CarbonPreferences
} from '../../src/core/carbon/types';

describe('CarbonAwareClient', () => {
  let carbonClient: CarbonAwareClient;

  beforeEach(() => {
    carbonClient = new CarbonAwareClient();
    carbonClient.clearHistory(); // Ensure clean state
  });

  describe('constructor', () => {
    it('should initialize with default preferences', () => {
      const client = new CarbonAwareClient();
      const preferences = client.getPreferences();
      
      expect(preferences.carbonAwareMode).toBe(true);
      expect(preferences.maxCarbonPerOperation).toBe(0.1);
      expect(preferences.autoOptimize).toBe(true);
      expect(preferences.renewableEnergyPreference).toBe(true);
    });

    it('should allow custom preferences', () => {
      const customPreferences: Partial<CarbonPreferences> = {
        carbonAwareMode: false,
        maxCarbonPerOperation: 0.5,
        autoOptimize: false
      };
      
      const client = new CarbonAwareClient(customPreferences);
      const preferences = client.getPreferences();
      
      expect(preferences.carbonAwareMode).toBe(false);
      expect(preferences.maxCarbonPerOperation).toBe(0.5);
      expect(preferences.autoOptimize).toBe(false);
    });
  });

  describe('trackOperation', () => {
    it('should track carbon impact for credential issuance', async () => {
      const operationType: OperationType = 'credential_issuance';
      const metadata: OperationMetadata = {
        computationTime: 100,
        dataSize: 1024,
        energySource: 'renewable'
      };

      const impact = await carbonClient.trackOperation(operationType, metadata);
      
      expect(impact.operationType).toBe(operationType);
      expect(impact.carbonGrams).toBeGreaterThan(0);
      expect(impact.timestamp).toBeDefined();
      expect(impact.metadata.computationTime).toBe(metadata.computationTime);
      expect(impact.metadata.dataSize).toBe(metadata.dataSize);
      expect(impact.metadata.energySource).toBe('renewable');
    });

    it('should track carbon impact for DID creation', async () => {
      const operationType: OperationType = 'did_creation';
      const metadata: OperationMetadata = {
        computationTime: 500,
        dataSize: 512,
        algorithm: 'ed25519'
      };

      const impact = await carbonClient.trackOperation(operationType, metadata);
      
      expect(impact.operationType).toBe(operationType);
      expect(impact.carbonGrams).toBeGreaterThan(0);
      expect(impact.metadata.algorithm).toBe('ed25519');
    });

    it('should use default energy source when not specified', async () => {
      const operationType: OperationType = 'credential_validation';
      const metadata: OperationMetadata = {
        computationTime: 50,
        dataSize: 256
      };

      const impact = await carbonClient.trackOperation(operationType, metadata);
      
      expect(impact.metadata.energySource).toBe('renewable'); // Based on preferences
    });

    it('should generate unique operation IDs', async () => {
      const metadata: OperationMetadata = {
        computationTime: 100,
        dataSize: 1024
      };

      const impact1 = await carbonClient.trackOperation('credential_issuance', metadata);
      const impact2 = await carbonClient.trackOperation('credential_validation', metadata);
      
      expect(impact1.operationId).not.toBe(impact2.operationId);
    });
  });

  describe('executeWithCarbonAwareness', () => {
    it('should execute operation and track carbon impact', async () => {
      const mockOperation = vi.fn().mockResolvedValue('test-result');
      const options: CarbonAwareOptions = {
        prioritizeCarbon: true,
        useRenewableEnergy: true
      };

      const result = await carbonClient.executeWithCarbonAwareness(mockOperation, options);
      
      expect(result.result).toBe('test-result');
      expect(result.carbonImpact).toBeDefined();
      expect(result.carbonImpact.carbonGrams).toBeGreaterThan(0);
      expect(result.optimizationApplied).toBeDefined();
      expect(mockOperation).toHaveBeenCalledOnce();
    });

    it('should handle operation errors and still track carbon', async () => {
      // Create a fresh client for this specific test
      const testClient = new CarbonAwareClient();
      testClient.clearHistory();
      
      const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'));
      const options: CarbonAwareOptions = {
        prioritizeCarbon: true
      };

      await expect(
        testClient.executeWithCarbonAwareness(mockOperation, options)
      ).rejects.toThrow('Test error');

      // Should still have tracked the failed operation
      const stats = testClient.getStats();
      expect(stats.totalOperations).toBe(1);
    });

    it('should apply optimizations when carbon exceeds threshold', async () => {
      const client = new CarbonAwareClient({
        maxCarbonPerOperation: 0.0001, // Extremely low threshold
        autoOptimize: true
      });

      const mockOperation = vi.fn().mockResolvedValue('test-result');
      const options: CarbonAwareOptions = {
        prioritizeCarbon: true
      };

      const result = await client.executeWithCarbonAwareness(mockOperation, options);
      
      // The optimization should be applied when carbon exceeds the very low threshold
      expect(result.optimizationApplied).toBe(true);
    });
  });

  describe('getCarbonImpact', () => {
    it('should return carbon impact for existing operation', async () => {
      const metadata: OperationMetadata = {
        computationTime: 100,
        dataSize: 1024
      };

      const impact = await carbonClient.trackOperation('credential_issuance', metadata);
      const retrieved = await carbonClient.getCarbonImpact(impact.operationId);
      
      expect(retrieved).toEqual(impact);
    });

    it('should return null for non-existent operation', async () => {
      const retrieved = await carbonClient.getCarbonImpact('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('getOperationCarbonHistory', () => {
    it('should return carbon history for specific operation type', async () => {
      const metadata: OperationMetadata = {
        computationTime: 100,
        dataSize: 1024
      };

      await carbonClient.trackOperation('credential_issuance', metadata);
      await carbonClient.trackOperation('credential_validation', metadata);
      await carbonClient.trackOperation('credential_issuance', metadata);

      const history = await carbonClient.getOperationCarbonHistory('credential_issuance');
      
      expect(history).toHaveLength(2);
      history.forEach(impact => {
        expect(impact.operationType).toBe('credential_issuance');
      });
    });

    it('should return empty array for operation type with no history', async () => {
      const history = await carbonClient.getOperationCarbonHistory('did_creation');
      expect(history).toHaveLength(0);
    });
  });

  describe('optimizeForCarbon', () => {
    it('should return optimization recommendations', async () => {
      const result = await carbonClient.optimizeForCarbon('credential_issuance');
      
      expect(result.optimizations).toBeDefined();
      expect(result.optimizations.length).toBeGreaterThan(0);
      expect(result.totalCarbonReduction).toBeGreaterThan(0);
      expect(result.estimatedSavings).toBeGreaterThanOrEqual(0);
    });

    it('should include caching optimization', async () => {
      const result = await carbonClient.optimizeForCarbon('credential_issuance');
      
      const cachingOpt = result.optimizations.find(opt => opt.type === 'caching');
      expect(cachingOpt).toBeDefined();
      expect(cachingOpt?.description).toContain('caching');
    });

    it('should include batching optimization for credential operations', async () => {
      const result = await carbonClient.optimizeForCarbon('credential_issuance');
      
      const batchingOpt = result.optimizations.find(opt => opt.type === 'batching');
      expect(batchingOpt).toBeDefined();
      expect(batchingOpt?.description).toContain('Batch');
    });
  });

  describe('getCarbonRecommendations', () => {
    it('should return recommendations when carbon usage is high', async () => {
      // Add some high-carbon operations
      for (let i = 0; i < 10; i++) {
        await carbonClient.trackOperation('did_creation', {
          computationTime: 1000,
          dataSize: 2048
        });
      }

      const recommendations = await carbonClient.getCarbonRecommendations();
      
      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach(rec => {
        expect(rec.type).toMatch(/optimization|offset|scheduling/);
        expect(rec.description).toBeDefined();
        expect(rec.potentialSavings).toBeGreaterThan(0);
        expect(rec.priority).toMatch(/low|medium|high/);
      });
    });

    it('should return offset recommendations when threshold exceeded', async () => {
      const client = new CarbonAwareClient({
        offsetThreshold: 0.1 // Low threshold
      });

      // Add operations to exceed threshold
      await client.trackOperation('did_creation', {
        computationTime: 1000,
        dataSize: 2048
      });

      const recommendations = await client.getCarbonRecommendations();
      const offsetRec = recommendations.find(rec => rec.type === 'offset');
      
      expect(offsetRec).toBeDefined();
    });
  });

  describe('generateCarbonReport', () => {
    it('should generate comprehensive carbon report', async () => {
      // Clear any existing history first
      carbonClient.clearHistory();

      // Add some operations
      await carbonClient.trackOperation('credential_issuance', {
        computationTime: 100,
        dataSize: 1024
      });
      await carbonClient.trackOperation('credential_validation', {
        computationTime: 50,
        dataSize: 512
      });

      // Use a period that includes the current time
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
      const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

      const period: TimePeriod = { startTime, endTime };
      const report = await carbonClient.generateCarbonReport(period);
      
      expect(report.period.startTime).toBe(startTime);
      expect(report.period.endTime).toBe(endTime);
      expect(report.totalOperations).toBe(2);
      expect(report.totalCarbonGrams).toBeGreaterThan(0);
      expect(report.averageCarbonPerOperation).toBeGreaterThan(0);
      expect(report.recommendations).toBeDefined();
      expect(report.breakdown).toBeDefined();
    });

    it('should handle empty period correctly', async () => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Future
      const endTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const period: TimePeriod = { startTime, endTime };
      const report = await carbonClient.generateCarbonReport(period);
      
      expect(report.totalOperations).toBe(0);
      expect(report.totalCarbonGrams).toBe(0);
      expect(report.averageCarbonPerOperation).toBe(0);
    });
  });

  describe('exportCarbonData', () => {
    it('should export data in JSON format', async () => {
      // Create a fresh client for this test
      const testClient = new CarbonAwareClient();
      testClient.clearHistory();
      
      await testClient.trackOperation('credential_issuance', {
        computationTime: 100,
        dataSize: 1024
      });

      const exported = await testClient.exportCarbonData('json');
      const parsed = JSON.parse(exported);
      
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.preferences).toBeDefined();
      expect(parsed.history).toBeDefined();
      expect(parsed.history.length).toBe(1);
    });

    it('should export data in CSV format', async () => {
      // Create a fresh client for this test
      const testClient = new CarbonAwareClient();
      testClient.clearHistory();
      
      await testClient.trackOperation('credential_issuance', {
        computationTime: 100,
        dataSize: 1024
      });

      const exported = await testClient.exportCarbonData('csv');
      const lines = exported.split('\n');
      
      expect(lines[0]).toBe('operationId,operationType,carbonGrams,timestamp,computationTime,dataSize');
      expect(lines.length).toBe(2); // Header + data
      expect(lines[1]).toContain('credential_issuance');
    });
  });

  describe('preferences management', () => {
    it('should update preferences', () => {
      const newPreferences: Partial<CarbonPreferences> = {
        carbonAwareMode: false,
        maxCarbonPerOperation: 0.5
      };

      carbonClient.updatePreferences(newPreferences);
      const preferences = carbonClient.getPreferences();
      
      expect(preferences.carbonAwareMode).toBe(false);
      expect(preferences.maxCarbonPerOperation).toBe(0.5);
    });

    it('should return copy of preferences', () => {
      const preferences1 = carbonClient.getPreferences();
      const preferences2 = carbonClient.getPreferences();
      
      expect(preferences1).not.toBe(preferences2); // Different objects
      expect(preferences1).toEqual(preferences2); // Same values
    });
  });

  describe('history management', () => {
    it('should clear carbon history', () => {
      // Add some operations
      carbonClient.trackOperation('credential_issuance', {
        computationTime: 100,
        dataSize: 1024
      });

      let stats = carbonClient.getStats();
      expect(stats.totalOperations).toBe(1);

      carbonClient.clearHistory();
      
      stats = carbonClient.getStats();
      expect(stats.totalOperations).toBe(0);
      expect(stats.totalCarbonGrams).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      await carbonClient.trackOperation('credential_issuance', {
        computationTime: 100,
        dataSize: 1024
      });
      await carbonClient.trackOperation('credential_validation', {
        computationTime: 50,
        dataSize: 512
      });

      const stats = carbonClient.getStats();
      
      expect(stats.totalOperations).toBe(2);
      expect(stats.totalCarbonGrams).toBeGreaterThan(0);
      expect(stats.averageCarbonPerOperation).toBeGreaterThan(0);
      expect(stats.historySize).toBe(2);
    });

    it('should handle empty history', () => {
      // Use a fresh client to ensure no state leakage
      const testClient = new CarbonAwareClient();
      testClient.clearHistory();
      const stats = testClient.getStats();
      expect(stats.totalOperations).toBe(0);
      expect(stats.totalCarbonGrams).toBe(0);
      expect(stats.averageCarbonPerOperation).toBe(0);
      expect(stats.historySize).toBe(0);
    });
  });

  describe('carbon calculation', () => {
    it('should calculate different carbon impacts for different operations', async () => {
      const metadata: OperationMetadata = {
        computationTime: 100,
        dataSize: 1024
      };

      const issuanceImpact = await carbonClient.trackOperation('credential_issuance', metadata);
      const validationImpact = await carbonClient.trackOperation('credential_validation', metadata);
      
      // Issuance should have higher carbon impact than validation
      expect(issuanceImpact.carbonGrams).toBeGreaterThan(validationImpact.carbonGrams);
    });

    it('should consider renewable energy in calculations', async () => {
      const metadata: OperationMetadata = {
        computationTime: 100,
        dataSize: 1024
      };

      const gridImpact = await carbonClient.trackOperation('credential_issuance', {
        ...metadata,
        energySource: 'grid'
      });
      
      const renewableImpact = await carbonClient.trackOperation('credential_issuance', {
        ...metadata,
        energySource: 'renewable'
      });
      
      // Renewable energy should have lower carbon impact
      expect(renewableImpact.carbonGrams).toBeLessThan(gridImpact.carbonGrams);
    });

    it('should consider algorithm efficiency', async () => {
      const metadata: OperationMetadata = {
        computationTime: 100,
        dataSize: 1024
      };

      const rsaImpact = await carbonClient.trackOperation('key_generation', {
        ...metadata,
        algorithm: 'rsa',
        keySize: 4096
      });
      
      const ed25519Impact = await carbonClient.trackOperation('key_generation', {
        ...metadata,
        algorithm: 'ed25519'
      });
      
      // Ed25519 should be more efficient than RSA 4096
      expect(ed25519Impact.carbonGrams).toBeLessThan(rsaImpact.carbonGrams);
    });
  });
}); 