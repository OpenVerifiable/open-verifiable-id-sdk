/**
 * Carbon Awareness Module - Barrel Export
 * 
 * This module provides carbon impact tracking and optimization for all SDK operations.
 * 
 * @example
 * ```typescript
 * import { CarbonAwareClient, createCarbonAwareClient } from '@/core/carbon'
 * 
 * const client = createCarbonAwareClient()
 * const result = await client.executeWithCarbonAwareness(
 *   () => issueCredential(template),
 *   { prioritizeCarbon: true }
 * )
 * ```
 */

// Re-export the main client class
export { CarbonAwareClient } from './client'

// Re-export public types and interfaces
export type {
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

// Re-export convenience factory (if it exists)
// export { createCarbonAwareClient } from './client' 