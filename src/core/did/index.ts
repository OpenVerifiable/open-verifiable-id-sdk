/**
 * DID Module - Core DID management functionality
 * Based on ADR-0015: DID Core Architecture and Purpose
 */

export * from './manager';
export * from './client';
export * from './did-importer';

// Re-export the main class and factory function for convenience
export { DIDManagerImpl, createDIDManager } from './manager'; 