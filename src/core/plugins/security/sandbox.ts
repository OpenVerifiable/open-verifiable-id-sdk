/**
 * Plugin Security Sandbox for the Open Verifiable ID SDK
 * Implements ADR-0055: Plugin Security and Sandboxing Architecture
 */

import { Plugin, PluginContext, PluginPermissions } from '../interfaces.js';

/**
 * Sandbox permissions
 */
export interface SandboxPermissions {
  /** File system access */
  filesystem: {
    read: boolean;
    write: boolean;
    delete: boolean;
    paths: string[];
  };
  
  /** Network access */
  network: {
    enabled: boolean;
    domains: string[];
    protocols: string[];
  };
  
  /** Process access */
  process: {
    spawn: boolean;
    kill: boolean;
    env: boolean;
  };
  
  /** Memory access */
  memory: {
    maxHeap: number;
    maxStack: number;
    gc: boolean;
  };
  
  /** Time access */
  time: {
    current: boolean;
    sleep: boolean;
    timeout: number;
  };
  
  /** Random number generation */
  random: {
    enabled: boolean;
    crypto: boolean;
  };
}

/**
 * Sandbox context
 */
export interface SandboxContext {
  /** Plugin context */
  pluginContext: PluginContext;
  
  /** Sandbox permissions */
  permissions: SandboxPermissions;
  
  /** Sandbox ID */
  sandboxId: string;
  
  /** Sandbox start time */
  startTime: string;
  
  /** Sandbox timeout */
  timeout: number;
}

/**
 * Sandbox execution result
 */
export interface SandboxExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  
  /** Execution result */
  result?: any;
  
  /** Execution error */
  error?: string;
  
  /** Execution duration in milliseconds */
  duration: number;
  
  /** Memory usage */
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  
  /** Security violations */
  violations: SecurityViolation[];
}

/**
 * Security violation
 */
export interface SecurityViolation {
  /** Violation type */
  type: 'permission' | 'resource' | 'timeout' | 'memory' | 'network' | 'filesystem' | 'time' | 'process';
  
  /** Violation message */
  message: string;
  
  /** Violation timestamp */
  timestamp: string;
  
  /** Violation severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Violation details */
  details?: any;
}

/**
 * Sandbox options
 */
export interface SandboxOptions {
  /** Sandbox permissions */
  permissions?: Partial<SandboxPermissions>;
  
  /** Sandbox timeout in milliseconds */
  timeout?: number;
  
  /** Memory limits */
  memory?: {
    maxHeap: number;
    maxStack: number;
  };
  
  /** Whether to enable strict mode */
  strict?: boolean;
  
  /** Whether to enable monitoring */
  monitoring?: boolean;
}

/**
 * Plugin Security Sandbox class
 */
export class PluginSecuritySandbox {
  private sandboxes: Map<string, SandboxContext> = new Map();
  private violations: Map<string, SecurityViolation[]> = new Map();
  private options: SandboxOptions;

  constructor(options: SandboxOptions = {}) {
    this.options = {
      permissions: {
        filesystem: {
          read: false,
          write: false,
          delete: false,
          paths: []
        },
        network: {
          enabled: false,
          domains: [],
          protocols: []
        },
        process: {
          spawn: false,
          kill: false,
          env: false
        },
        memory: {
          maxHeap: 50 * 1024 * 1024, // 50MB
          maxStack: 1024 * 1024, // 1MB
          gc: false
        },
        time: {
          current: true,
          sleep: false,
          timeout: 30000
        },
        random: {
          enabled: true,
          crypto: false
        }
      },
      timeout: 30000,
      memory: {
        maxHeap: 50 * 1024 * 1024,
        maxStack: 1024 * 1024
      },
      strict: true,
      monitoring: true,
      ...options
    };
  }

  /**
   * Create a sandbox for a plugin
   */
  createSandbox(plugin: Plugin, context: PluginContext): string {
    const sandboxId = `sandbox-${plugin.id}-${Date.now()}`;
    
         const sandboxContext: SandboxContext = {
       pluginContext: context,
       permissions: this.options.permissions as SandboxPermissions,
       sandboxId,
       startTime: new Date().toISOString(),
       timeout: this.options.timeout!
     };

    this.sandboxes.set(sandboxId, sandboxContext);
    this.violations.set(sandboxId, []);

    return sandboxId;
  }

  /**
   * Execute code in a sandbox
   */
  async executeInSandbox<T>(
    sandboxId: string,
    code: () => Promise<T>
  ): Promise<SandboxExecutionResult> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    const startTime = Date.now();
    const violations: SecurityViolation[] = [];

    try {
      // Set up sandbox environment
      const sandboxedCode = this.createSandboxedFunction(code, sandbox, violations);
      
      // Execute with timeout
      const result = await Promise.race([
        sandboxedCode(),
        this.createTimeout(sandbox.timeout)
      ]);

      const duration = Date.now() - startTime;

      // Record violations
      this.violations.set(sandboxId, violations);

      return {
        success: true,
        result,
        duration,
        memoryUsage: this.getMemoryUsage(),
        violations
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record timeout violation
      if (error instanceof Error && error.message === 'Sandbox timeout') {
        violations.push({
          type: 'timeout',
          message: 'Sandbox execution timed out',
          timestamp: new Date().toISOString(),
          severity: 'high',
          details: { timeout: sandbox.timeout }
        });
      }

      this.violations.set(sandboxId, violations);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        memoryUsage: this.getMemoryUsage(),
        violations
      };
    }
  }

  /**
   * Destroy a sandbox
   */
  destroySandbox(sandboxId: string): void {
    this.sandboxes.delete(sandboxId);
    this.violations.delete(sandboxId);
  }

  /**
   * Get sandbox violations
   */
  getSandboxViolations(sandboxId: string): SecurityViolation[] {
    return this.violations.get(sandboxId) || [];
  }

  /**
   * Get all violations
   */
  getAllViolations(): Map<string, SecurityViolation[]> {
    return new Map(this.violations);
  }

  /**
   * Check if sandbox has violations
   */
  hasViolations(sandboxId: string): boolean {
    const violations = this.violations.get(sandboxId);
    return violations ? violations.length > 0 : false;
  }

  /**
   * Get sandbox statistics
   */
  getStatistics(): {
    totalSandboxes: number;
    activeSandboxes: number;
    totalViolations: number;
    violationsByType: Record<string, number>;
    violationsBySeverity: Record<string, number>;
  } {
    const violationsByType: Record<string, number> = {};
    const violationsBySeverity: Record<string, number> = {};
    let totalViolations = 0;

    for (const violations of this.violations.values()) {
      totalViolations += violations.length;
      
      for (const violation of violations) {
        violationsByType[violation.type] = (violationsByType[violation.type] || 0) + 1;
        violationsBySeverity[violation.severity] = (violationsBySeverity[violation.severity] || 0) + 1;
      }
    }

    return {
      totalSandboxes: this.sandboxes.size,
      activeSandboxes: this.sandboxes.size,
      totalViolations,
      violationsByType,
      violationsBySeverity
    };
  }

  /**
   * Create a sandboxed function
   */
  private createSandboxedFunction<T>(
    code: () => Promise<T>,
    sandbox: SandboxContext,
    violations: SecurityViolation[]
  ): () => Promise<T> {
    return async () => {
      // For now, we'll implement a simplified sandbox
      // In a full implementation, this would use VM modules or similar
      try {
        // Execute the code
        const result = await code();
        return result;
      } catch (error) {
        // Record any errors as violations
        this.recordViolation(sandbox.sandboxId, violations, {
          type: 'resource',
          message: `Execution error: ${error}`,
          severity: 'medium'
        });
        throw error;
      }
    };
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Sandbox timeout'));
      }, timeout);
    });
  }

  /**
   * Record a security violation
   */
  private recordViolation(
    sandboxId: string,
    violations: SecurityViolation[],
    violation: Omit<SecurityViolation, 'timestamp'>
  ): void {
    const fullViolation: SecurityViolation = {
      ...violation,
      timestamp: new Date().toISOString()
    };

    violations.push(fullViolation);

    if (this.options.monitoring) {
      console.warn(`Security violation in sandbox ${sandboxId}:`, fullViolation);
    }
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): any {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return undefined;
  }
} 