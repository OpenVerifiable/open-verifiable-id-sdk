---
ADR: 0012
Title: open-verifiable-id-sdk Error Handling & Recovery Strategy
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, proof_first_trust, inclusive_integration, community_collaboration, empowerment_over_extraction, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0005, 0007, 0009, 0010]
BusinessImpact: >-
  - Improves developer experience through predictable error handling patterns
  - Reduces support burden by enabling self-service error resolution
  - Enhances SDK reliability and user trust through graceful failure recovery
Runbook: |
  1. Check error classification: `./scripts/check-error-types.sh {errorCode}`
  2. Test recovery mechanisms: `./scripts/test-error-recovery.sh {scenario}`
  3. Validate error messages: `./scripts/validate-error-messages.sh`
  4. Monitor error patterns: `./scripts/monitor-sdk-errors.sh {timeRange}`
  5. Update error documentation: `./scripts/update-error-docs.sh`
---

## Context

The open-verifiable-id-sdk handles complex identity operations across multiple networks, storage systems, and cryptographic processes. Errors can occur at many layers - network connectivity, blockchain operations, cryptographic failures, storage issues, and user input validation. Currently, error handling is inconsistent across different SDK modules, making it difficult for developers to build robust applications and for users to understand and recover from failures.

The SDK needs a comprehensive error handling strategy that provides:
- Predictable error types and structures
- Clear recovery guidance for developers
- User-friendly error messages
- Automatic retry mechanisms where appropriate
- Graceful degradation when services are unavailable

## Requirements

### Must
- Provide standardized error types and codes across all SDK operations
- Include actionable error messages with clear next steps for resolution
- Support automatic retry mechanisms with exponential backoff for transient failures
- Enable graceful degradation when external services (Cheqd, IPFS) are unavailable
- Maintain error context and stack traces for debugging while protecting sensitive data

### Should
- Implement circuit breaker patterns for external service dependencies
- Provide error recovery suggestions specific to each error type
- Support error telemetry collection (with user consent) for SDK improvement
- Include error handling best practices in developer documentation
- Enable custom error handlers for application-specific recovery logic

### Could
- Provide interactive error resolution guides for common failure scenarios
- Support error reporting to maintainers with anonymized context
- Implement predictive error prevention based on system state
- Enable error simulation for testing application resilience

## Decision

### 1. Error Classification System
- **Standardized Error Hierarchy**: Implement consistent error classes with specific codes and recovery patterns
- **Error Severity Levels**: Classification system (CRITICAL, ERROR, WARNING, INFO) with appropriate handling
- **Context Preservation**: Maintain operation context while sanitizing sensitive information
- **Recovery Guidance**: Include specific recovery steps and alternative approaches in error objects

### 2. Implementation Approach

#### Core Error Architecture
```typescript
// Base error class with standardized structure
abstract class OvIdSDKError extends Error {
  readonly code: string;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly recoverable: boolean;
  readonly context: ErrorContext;
  readonly suggestions: RecoveryAction[];
  readonly timestamp: string;

  constructor(options: ErrorOptions) {
    super(options.message);
    this.code = options.code;
    this.severity = options.severity;
    this.category = options.category;
    this.recoverable = options.recoverable;
    this.context = this.sanitizeContext(options.context);
    this.suggestions = options.suggestions;
    this.timestamp = new Date().toISOString();
  }

  private sanitizeContext(context: any): ErrorContext {
    // Remove sensitive data like private keys, passwords
    return sanitize(context);
  }

  getRecoveryGuide(): RecoveryGuide {
    return {
      steps: this.suggestions,
      documentation: this.getDocumentationLink(),
      examples: this.getCodeExamples()
    };
  }
}

// Specific error types for different operation categories
class NetworkError extends OvIdSDKError {
  constructor(operation: string, cause: Error, retryable = true) {
    super({
      code: 'SDK_NETWORK_ERROR',
      message: `Network operation failed: ${operation}`,
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.NETWORK,
      recoverable: retryable,
      context: { operation, originalError: cause.message },
      suggestions: [
        { action: 'CHECK_CONNECTIVITY', description: 'Verify internet connection' },
        { action: 'RETRY_OPERATION', description: 'Retry the operation after a brief delay' },
        { action: 'USE_OFFLINE_MODE', description: 'Switch to offline credential caching if available' }
      ]
    });
  }
}

class CryptographicError extends OvIdSDKError {
  constructor(operation: string, details: string) {
    super({
      code: 'SDK_CRYPTO_ERROR',
      message: `Cryptographic operation failed: ${operation}`,
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.CRYPTOGRAPHY,
      recoverable: false,
      context: { operation, details },
      suggestions: [
        { action: 'VALIDATE_INPUTS', description: 'Check that all cryptographic inputs are valid' },
        { action: 'REGENERATE_KEYS', description: 'Generate new keys if corruption is suspected' },
        { action: 'CONTACT_SUPPORT', description: 'Report persistent cryptographic failures' }
      ]
    });
  }
}

class ValidationError extends OvIdSDKError {
  constructor(field: string, value: any, expected: string) {
    super({
      code: 'SDK_VALIDATION_ERROR',
      message: `Validation failed for field '${field}': expected ${expected}`,
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.VALIDATION,
      recoverable: true,
      context: { field, value: typeof value, expected },
      suggestions: [
        { action: 'CHECK_INPUT_FORMAT', description: `Ensure ${field} matches the expected format: ${expected}` },
        { action: 'CONSULT_DOCS', description: 'Review API documentation for correct parameter format' },
        { action: 'VALIDATE_SCHEMA', description: 'Use schema validation tools to check input structure' }
      ]
    });
  }
}
```

#### Retry and Circuit Breaker Patterns
```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

class RetryManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context: string
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(context);
    
    if (circuitBreaker.isOpen()) {
      throw new ServiceUnavailableError(context, 'Circuit breaker is open');
    }

    let lastError: Error;
    let delay = config.baseDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        circuitBreaker.recordSuccess();
        return result;
      } catch (error) {
        lastError = error;
        circuitBreaker.recordFailure();

        if (!this.isRetryable(error, config)) {
          throw error;
        }

        if (attempt < config.maxAttempts) {
          await this.delay(Math.min(delay, config.maxDelay));
          delay *= config.backoffMultiplier;
        }
      }
    }

    throw new RetryExhaustedError(lastError, config.maxAttempts);
  }

  private isRetryable(error: Error, config: RetryConfig): boolean {
    if (error instanceof OvIdSDKError) {
      return error.recoverable && config.retryableErrors.includes(error.code);
    }
    return false;
  }
}
```

### 3. Graceful Degradation Strategies

#### Offline Mode Fallbacks
```typescript
class GracefulDegradationManager {
  async executeWithFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await primary();
    } catch (error) {
      if (this.shouldUseFallback(error)) {
        console.warn(`Primary operation failed, using fallback for ${context}:`, error.message);
        return await fallback();
      }
      throw error;
    }
  }

  private shouldUseFallback(error: Error): boolean {
    return error instanceof NetworkError || 
           error instanceof ServiceUnavailableError ||
           (error instanceof OvIdSDKError && error.category === ErrorCategory.EXTERNAL_SERVICE);
  }
}

// Example: DID resolution with fallback to cache
async function resolveDIDWithFallback(did: string): Promise<DIDDocument> {
  const degradationManager = new GracefulDegradationManager();
  
  return await degradationManager.executeWithFallback(
    () => this.resolveFromNetwork(did),
    () => this.resolveFromCache(did),
    `DID resolution for ${did}`
  );
}
```

### 4. Error Telemetry and Monitoring

#### Privacy-Preserving Error Collection
```typescript
interface ErrorTelemetry {
  errorCode: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  operationType: string;
  sdkVersion: string;
  platform: string;
  timestamp: string;
  // No sensitive user data included
}

class ErrorTelemetryService {
  private telemetryEnabled = false;
  private errorBuffer: ErrorTelemetry[] = [];

  enableTelemetry(userConsent: boolean) {
    this.telemetryEnabled = userConsent;
  }

  recordError(error: OvIdSDKError, operationType: string) {
    if (!this.telemetryEnabled) return;

    const telemetry: ErrorTelemetry = {
      errorCode: error.code,
      category: error.category,
      severity: error.severity,
      operationType,
      sdkVersion: SDK_VERSION,
      platform: getPlatform(),
      timestamp: error.timestamp
    };

    this.errorBuffer.push(telemetry);
    this.flushIfNeeded();
  }

  private async flushIfNeeded() {
    if (this.errorBuffer.length >= 10) {
      await this.sendTelemetry(this.errorBuffer.splice(0));
    }
  }
}
```

### 5. Developer Experience Enhancements

#### Interactive Error Resolution
```typescript
class ErrorResolutionGuide {
  static async getInteractiveGuide(error: OvIdSDKError): Promise<ResolutionSteps> {
    const guide = {
      title: `Resolving ${error.code}`,
      description: error.message,
      steps: error.suggestions.map(suggestion => ({
        action: suggestion.action,
        description: suggestion.description,
        codeExample: this.getCodeExample(suggestion.action),
        documentation: this.getDocumentationLink(suggestion.action)
      })),
      troubleshooting: this.getTroubleshootingChecklist(error.category),
      supportContact: error.severity === ErrorSeverity.CRITICAL ? 
        'Contact support with error code and context' : null
    };

    return guide;
  }

  static getCodeExample(action: string): string {
    const examples = {
      'CHECK_CONNECTIVITY': `
// Test network connectivity
const isOnline = await checkNetworkConnectivity();
if (!isOnline) {
  // Switch to offline mode
  await enableOfflineMode();
}`,
      'RETRY_OPERATION': `
// Implement exponential backoff retry
const result = await retryWithBackoff(
  () => yourOperation(),
  { maxAttempts: 3, baseDelay: 1000 }
);`,
      'VALIDATE_INPUTS': `
// Validate inputs before operation
const validation = validateCredentialData(data);
if (!validation.isValid) {
  throw new ValidationError(validation.errors);
}`
    };

    return examples[action] || '// See documentation for examples';
  }
}
```

## Consequences

### Positives
- **Improved Developer Experience**: Predictable error handling reduces integration friction and debugging time
- **Enhanced Reliability**: Automatic retry and circuit breaker patterns improve system resilience
- **Better User Experience**: Graceful degradation and clear error messages improve end-user interactions
- **Reduced Support Burden**: Self-service error resolution through interactive guides
- **SDK Quality Improvement**: Telemetry enables data-driven improvements to error handling

### Negatives
- **Implementation Complexity**: Comprehensive error handling adds development overhead
- **Performance Overhead**: Retry mechanisms and error context preservation may impact performance
- **API Surface Expansion**: Additional error types and recovery methods increase SDK complexity
- **Testing Complexity**: Comprehensive error scenario testing requires significant test infrastructure

### Trade-offs
- **Robustness vs Performance**: Enhanced error handling adds overhead but improves reliability
- **Comprehensive Coverage vs Simplicity**: Detailed error classification vs simple error types
- **Automatic Recovery vs User Control**: Intelligent retry vs explicit user-controlled retry

## Business Impact
- **Required for MVP**: Reliable error handling essential for production SDK adoption
- **Developer Adoption**: Excellent error experience encourages SDK adoption and reduces churn
- **Support Cost Reduction**: Self-service error resolution reduces support team burden
- **User Trust**: Graceful failure handling builds confidence in SDK reliability

## Mission Alignment & Principle Coverage

### Creator First, Always
The error handling strategy prioritizes **creator outcomes**—quick problem resolution and uninterrupted workflow—through actionable error messages and automatic recovery mechanisms.

### User Sovereignty
Error handling respects user control: users can **disable** telemetry, **export** error logs, and maintain full **control** over error reporting and resolution approaches.

### Proof-First Trust
Error handling provides **cryptographic** verification of error authenticity and maintains **audit trails** for all error events while protecting sensitive information.

### Inclusive Integration
Error messages support **low-bandwidth** scenarios with offline fallbacks and meet **accessibility** guidelines for screen readers and assistive technologies.

### Community Collaboration
Error handling patterns and recovery guides will be **open source** with **community** contributions to error documentation and resolution strategies.

### Empowerment Over Extraction
Error handling **empowers** developers with self-service resolution tools rather than creating dependency on premium **support** services.

### Privacy by Design
Error telemetry is **opt-in only** with no sensitive data collection, ensuring **GDPR/CCPA** compliance and user **privacy** protection.

### Modular & Open-Source Foundation
Error handling components are **modular** and **composable**, enabling developers to customize error handling without **vendor lock-in**.

### Security First
Error handling maintains **secure by default** practices by sanitizing error context and protecting sensitive information in error logs.

### Resilience by Design
Comprehensive error handling with graceful degradation and offline fallbacks exemplifies **resilience by design** for real-world usage scenarios. 