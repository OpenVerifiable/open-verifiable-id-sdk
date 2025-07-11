/**
 * Credential Type Plugins
 * 
 * This module provides implementations of various credential types as plugins.
 * Each plugin implements a specific credential standard and provides standardized
 * interfaces for credential creation, validation, and verification.
 */

export { W3CVC20Plugin } from './w3c-vc-2-0-plugin.js';
export type { 
  W3CVC20PluginConfig, 
  VC20CreateOptions, 
  VC20CreateResult,
  VC20VerifyOptions,
  VC20VerifyResult
} from './w3c-vc-2-0-plugin.js';

// Future credential type plugins will be exported here:
// export { BasicPersonPlugin } from './basic-person-plugin.js';
// export { CustomCredentialPlugin } from './custom-credential-plugin.js';
// export { SchemaValidationPlugin } from './schema-validation-plugin.js'; 