/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'
import os from 'os'

// Detect CPU cores for optimal parallelization
const cpuCount = os.cpus().length
const maxWorkers = Math.max(cpuCount - 1, 1) // Leave one core free

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    
    // Performance optimizations
    maxConcurrency: maxWorkers * 2, // Allow more concurrent tests per worker
    testTimeout: 5000, // Reduced to 5 seconds for faster feedback
    hookTimeout: 2000, // Reduced hook timeout
    
    // Aggressive parallelization
    pool: 'forks', // Use forks for better isolation and performance
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: maxWorkers,
        isolate: false // Share context for speed
      }
    },
    
    // Fast execution settings
    sequence: {
      concurrent: true, // Run tests concurrently within files
      shuffle: false // Disable shuffling for consistent timing
    },
    
    // Optimized reporting
    reporters: process.env.CI ? ['json'] : ['verbose'],
    outputFile: process.env.CI ? 'test-results/vitest-results.json' : undefined,
    
    // Disable coverage by default for speed
    coverage: {
      enabled: false,
      provider: 'v8',
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.d.ts'
      ]
    },
    
    // Fast fail for development
    bail: process.env.CI ? 0 : 1, // Only fail fast in development
    
    // File watching optimizations
    watch: false,
    
    // Memory optimizations
    isolate: false, // Share test context for speed
    
    // Retry settings for flaky tests
    retry: process.env.CI ? 2 : 0,
    
    // Environment variables for performance
    env: {
      NODE_ENV: 'test',
      // Optimize Node.js for testing
      NODE_OPTIONS: '--max-old-space-size=4096'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/core': path.resolve(__dirname, './src/core'),
      '@/utils': path.resolve(__dirname, './src/utils')
    }
  },
  // Optimize build for testing
  esbuild: {
    target: 'node18',
    format: 'esm'
  }
}) 