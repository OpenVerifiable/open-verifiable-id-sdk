/**
 * DID Method Plugins
 * 
 * This module provides implementations of various DID methods as plugins.
 * Each plugin implements a specific DID method and provides standardized
 * interfaces for DID creation, resolution, and verification.
 */

export { DIDKeyPlugin } from './did-key-plugin.js';
export type { 
  DIDKeyPluginConfig, 
  DIDKeyCreateOptions, 
  DIDKeyCreateResult 
} from './did-key-plugin.js';

// Future DID method plugins will be exported here:
// export { DIDWebPlugin } from './did-web-plugin.js';
// export { DIDCheqdPlugin } from './did-cheqd-plugin.js';
// export { DIDIonPlugin } from './did-ion-plugin.js'; 