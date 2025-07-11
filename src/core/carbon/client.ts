/**
 * Carbon Awareness Client
 * 
 * Provides carbon impact tracking for all credential and DID operations
 * with optimization strategies and transparent metrics.
 * 
 * @implements ADR-0004: Carbon Awareness Integration
 */

import type {
  OperationType,
  OperationMetadata,
  CarbonImpact,
  CarbonAwareResult,
  CarbonAwareOptions,
  CarbonRecommendation,
  Optimization,
  OptimizationResult,
  CarbonReport,
  TimePeriod,
  CarbonUsage,
  CarbonTrend,
  CarbonPreferences
} from './types'

export class CarbonAwareClient {
  private carbonHistory: CarbonImpact[] = [];
  private preferences: CarbonPreferences;
  private operationCounter = 0;

  constructor(preferences?: Partial<CarbonPreferences>) {
    this.preferences = {
      carbonAwareMode: true,
      maxCarbonPerOperation: 0.1, // 0.1 grams of CO2
      autoOptimize: true,
      offsetThreshold: 1.0, // 1 gram of CO2
      renewableEnergyPreference: true,
      carbonReporting: true,
      ...preferences
    };
  }

  /**
   * Track carbon impact of an operation
   */
  async trackOperation(
    operation: OperationType, 
    metadata: OperationMetadata
  ): Promise<CarbonImpact> {
    const operationId = `op_${++this.operationCounter}_${Date.now()}`;
    const carbonGrams = this.calculateCarbonImpact(operation, metadata);
    
    const impact: CarbonImpact = {
      operationId,
      operationType: operation,
      carbonGrams,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        energySource: metadata.energySource || this.getDefaultEnergySource()
      }
    };

    this.carbonHistory.push(impact);
    return impact;
  }

  /**
   * Execute operation with carbon awareness
   */
  async executeWithCarbonAwareness<T>(
    operation: () => Promise<T>,
    options: CarbonAwareOptions = { prioritizeCarbon: false }
  ): Promise<CarbonAwareResult<T>> {
    const startTime = Date.now();
    const operationType: OperationType = 'credential_issuance'; // Default, should be passed
    
    try {
      const result = await operation();
      const computationTime = Date.now() - startTime;
      
      const carbonImpact = await this.trackOperation(operationType, {
        computationTime,
        dataSize: 0, // Should be calculated based on result
        energySource: options.useRenewableEnergy ? 'renewable' : undefined
      });

      const optimizationApplied = this.preferences.autoOptimize && 
        carbonImpact.carbonGrams > (options.maxCarbonGrams || this.preferences.maxCarbonPerOperation);

      return {
        result,
        carbonImpact,
        optimizationApplied
      };
    } catch (error) {
      // Track failed operations too - but only once
      const computationTime = Date.now() - startTime;
      await this.trackOperation(operationType, {
        computationTime,
        dataSize: 0,
        energySource: options.useRenewableEnergy ? 'renewable' : undefined
      });
      throw error;
    }
  }

  /**
   * Get carbon impact for specific operation
   */
  async getCarbonImpact(operationId: string): Promise<CarbonImpact | null> {
    return this.carbonHistory.find(impact => impact.operationId === operationId) || null;
  }

  /**
   * Get carbon history for operation type
   */
  async getOperationCarbonHistory(operationType: OperationType): Promise<CarbonImpact[]> {
    return this.carbonHistory.filter(impact => impact.operationType === operationType);
  }

  /**
   * Optimize operations for carbon reduction
   */
  async optimizeForCarbon(operation: OperationType): Promise<OptimizationResult> {
    const optimizations: Optimization[] = [];
    
    // Caching optimization
    optimizations.push({
      type: 'caching',
      description: 'Implement result caching to reduce repeated computations',
      carbonReduction: 0.05,
      performanceImpact: 'minimal'
    });

    // Batching optimization
    if (operation.includes('credential') || operation.includes('did')) {
      optimizations.push({
        type: 'batching',
        description: 'Batch multiple operations to reduce overhead',
        carbonReduction: 0.03,
        performanceImpact: 'minimal'
      });
    }

    // Algorithm optimization
    if (operation.includes('crypto') || operation.includes('signing')) {
      optimizations.push({
        type: 'algorithm',
        description: 'Use more efficient cryptographic algorithms',
        carbonReduction: 0.02,
        performanceImpact: 'none'
      });
    }

    const totalCarbonReduction = optimizations.reduce((sum, opt) => sum + opt.carbonReduction, 0);
    const estimatedSavings = totalCarbonReduction * this.carbonHistory.length;

    return {
      optimizations,
      totalCarbonReduction,
      estimatedSavings
    };
  }

  /**
   * Get carbon optimization recommendations
   */
  async getCarbonRecommendations(): Promise<CarbonRecommendation[]> {
    const recommendations: CarbonRecommendation[] = [];
    const totalCarbon = this.carbonHistory.reduce((sum, impact) => sum + impact.carbonGrams, 0);

    // Optimization recommendations
    if (totalCarbon > 1.0) {
      recommendations.push({
        type: 'optimization',
        description: 'Implement caching for frequently accessed data',
        potentialSavings: 0.2,
        implementation: 'Add Redis or in-memory cache layer',
        priority: 'high'
      });
    }

    // Offset recommendations
    if (totalCarbon > this.preferences.offsetThreshold) {
      recommendations.push({
        type: 'offset',
        description: 'Consider carbon offset for high-impact operations',
        potentialSavings: totalCarbon * 0.1,
        implementation: 'Integrate with carbon offset providers',
        priority: 'medium'
      });
    }

    // Scheduling recommendations
    if (this.preferences.renewableEnergyPreference) {
      recommendations.push({
        type: 'scheduling',
        description: 'Schedule operations during renewable energy availability',
        potentialSavings: 0.1,
        implementation: 'Use carbon-aware scheduling algorithms',
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Generate carbon impact report
   */
  async generateCarbonReport(period: TimePeriod): Promise<CarbonReport> {
    const periodImpacts = this.carbonHistory.filter(impact => 
      impact.timestamp >= period.startTime && impact.timestamp <= period.endTime
    );

    const totalCarbonGrams = periodImpacts.reduce((sum, impact) => sum + impact.carbonGrams, 0);
    const totalOperations = periodImpacts.length;
    const averageCarbonPerOperation = totalOperations > 0 ? totalCarbonGrams / totalOperations : 0;

    // Calculate breakdown by operation type
    const breakdown: Record<OperationType, any> = {} as any;
    const operationTypes = new Set(periodImpacts.map(impact => impact.operationType));
    
    for (const operationType of operationTypes) {
      const typeImpacts = periodImpacts.filter(impact => impact.operationType === operationType);
      const typeCarbon = typeImpacts.reduce((sum, impact) => sum + impact.carbonGrams, 0);
      
      breakdown[operationType] = {
        count: typeImpacts.length,
        totalCarbon: typeCarbon,
        averageCarbon: typeImpacts.length > 0 ? typeCarbon / typeImpacts.length : 0
      };
    }

    const recommendations = await this.getCarbonRecommendations();

    return {
      period: {
        startTime: period.startTime,
        endTime: period.endTime,
        duration: this.calculateDuration(period.startTime, period.endTime)
      },
      totalCarbonGrams,
      totalOperations,
      averageCarbonPerOperation,
      optimizationsApplied: 0, // Should be tracked during execution
      recommendations,
      breakdown
    };
  }

  /**
   * Export carbon data
   */
  async exportCarbonData(format: 'json' | 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify({
        version: '1.0.0',
        generated: new Date().toISOString(),
        preferences: this.preferences,
        history: this.carbonHistory
      }, null, 2);
    } else {
      // CSV format
      const headers = ['operationId', 'operationType', 'carbonGrams', 'timestamp', 'computationTime', 'dataSize'];
      const rows = this.carbonHistory.map(impact => [
        impact.operationId,
        impact.operationType,
        impact.carbonGrams,
        impact.timestamp,
        impact.metadata.computationTime,
        impact.metadata.dataSize
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  }

  /**
   * Update carbon preferences
   */
  updatePreferences(preferences: Partial<CarbonPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  /**
   * Get current preferences
   */
  getPreferences(): CarbonPreferences {
    return { ...this.preferences };
  }

  /**
   * Clear carbon history
   */
  clearHistory(): void {
    this.carbonHistory = [];
    this.operationCounter = 0;
  }

  /**
   * Get carbon statistics
   */
  getStats(): {
    totalOperations: number;
    totalCarbonGrams: number;
    averageCarbonPerOperation: number;
    historySize: number;
  } {
    const totalCarbonGrams = this.carbonHistory.reduce((sum, impact) => sum + impact.carbonGrams, 0);
    const totalOperations = this.carbonHistory.length;
    
    return {
      totalOperations,
      totalCarbonGrams,
      averageCarbonPerOperation: totalOperations > 0 ? totalCarbonGrams / totalOperations : 0,
      historySize: this.carbonHistory.length
    };
  }

  /**
   * Calculate carbon impact for operation type and metadata
   */
  private calculateCarbonImpact(operation: OperationType, metadata: OperationMetadata): number {
    let baseCarbon = 0;

    // Base carbon by operation type (in grams of CO2)
    switch (operation) {
      case 'credential_issuance':
        baseCarbon = 0.05;
        break;
      case 'credential_validation':
        baseCarbon = 0.02;
        break;
      case 'credential_revocation':
        baseCarbon = 0.01;
        break;
      case 'did_creation':
        baseCarbon = 0.1;
        break;
      case 'did_resolution':
        baseCarbon = 0.01;
        break;
      case 'did_update':
        baseCarbon = 0.05;
        break;
      case 'key_generation':
        baseCarbon = 0.03;
        break;
      case 'signing_operation':
        baseCarbon = 0.02;
        break;
      case 'verification_operation':
        baseCarbon = 0.01;
        break;
      case 'encryption_operation':
        baseCarbon = 0.02;
        break;
      case 'batch_operation':
        baseCarbon = 0.01 * (metadata.batchSize || 1);
        break;
      default:
        baseCarbon = 0.01;
    }

    // Adjust for computation time (more time = more energy)
    const timeMultiplier = Math.max(0.1, metadata.computationTime / 1000); // Normalize to seconds
    
    // Adjust for data size (more data = more processing)
    const dataMultiplier = Math.max(0.1, metadata.dataSize / 1024); // Normalize to KB
    
    // Adjust for energy source
    const energyMultiplier = metadata.energySource === 'renewable' ? 0.3 : 1.0;
    
    // Adjust for algorithm efficiency
    const algorithmMultiplier = this.getAlgorithmEfficiency(metadata.algorithm, metadata.keySize);

    return baseCarbon * timeMultiplier * dataMultiplier * energyMultiplier * algorithmMultiplier;
  }

  /**
   * Get algorithm efficiency multiplier
   */
  private getAlgorithmEfficiency(algorithm?: string, keySize?: number): number {
    if (!algorithm) return 1.0;
    
    // More efficient algorithms have lower multipliers
    switch (algorithm.toLowerCase()) {
      case 'ed25519':
        return 0.8;
      case 'rsa':
        return keySize && keySize > 2048 ? 1.2 : 1.0;
      case 'ecdsa':
        return 0.9;
      case 'aes':
        return 0.7;
      default:
        return 1.0;
    }
  }

  /**
   * Get default energy source based on preferences
   */
  private getDefaultEnergySource(): string {
    return this.preferences.renewableEnergyPreference ? 'renewable' : 'grid';
  }

  /**
   * Calculate duration between two timestamps
   */
  private calculateDuration(startTime: string, endTime: string): string {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
} 