/**
 * Carbon Awareness Module - Public Types
 * 
 * This file contains public interfaces and types for the carbon awareness module.
 */

export type OperationType = 
  | 'credential_issuance'
  | 'credential_validation'
  | 'credential_revocation'
  | 'did_creation'
  | 'did_resolution'
  | 'did_update'
  | 'key_generation'
  | 'signing_operation'
  | 'verification_operation'
  | 'encryption_operation'
  | 'batch_operation';

export interface OperationMetadata {
  computationTime: number;
  dataSize: number;
  energySource?: string;
  location?: string;
  algorithm?: string;
  keySize?: number;
  batchSize?: number;
}

export interface CarbonImpact {
  operationId: string;
  operationType: OperationType;
  carbonGrams: number;
  timestamp: string;
  metadata: OperationMetadata;
}

export interface CarbonAwareResult<T> {
  result: T;
  carbonImpact: CarbonImpact;
  optimizationApplied: boolean;
}

export interface CarbonAwareOptions {
  prioritizeCarbon: boolean;
  maxCarbonGrams?: number;
  useRenewableEnergy?: boolean;
  batchOperations?: boolean;
}

export interface CarbonRecommendation {
  type: 'optimization' | 'offset' | 'scheduling';
  description: string;
  potentialSavings: number; // in grams of CO2
  implementation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Optimization {
  type: 'caching' | 'batching' | 'algorithm' | 'timing';
  description: string;
  carbonReduction: number;
  performanceImpact: 'none' | 'minimal' | 'moderate' | 'significant';
}

export interface OptimizationResult {
  optimizations: Optimization[];
  totalCarbonReduction: number;
  estimatedSavings: number;
}

export interface CarbonReport {
  period: {
    startTime: string;
    endTime: string;
    duration: string;
  };
  totalCarbonGrams: number;
  totalOperations: number;
  averageCarbonPerOperation: number;
  optimizationsApplied: number;
  recommendations: CarbonRecommendation[];
  breakdown: Record<OperationType, {
    count: number;
    totalCarbon: number;
    averageCarbon: number;
  }>;
}

export interface TimePeriod {
  startTime: string;
  endTime: string;
}

export interface CarbonUsage {
  daily: number;
  weekly: number;
  monthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface CarbonTrend {
  date: string;
  carbonGrams: number;
  operationCount: number;
}

export interface CarbonPreferences {
  carbonAwareMode: boolean;
  maxCarbonPerOperation: number;
  autoOptimize: boolean;
  offsetThreshold: number;
  renewableEnergyPreference: boolean;
  carbonReporting: boolean;
} 