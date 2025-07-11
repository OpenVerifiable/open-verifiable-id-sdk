---
ADR: 0011
Title: open-verifiable-id-sdk LLM Development Integration & Resources
Date: 2025-01-14
Status: Proposed
Priority: Enhancement
Principles: [creator_first, community_collaboration, modular_open_source, inclusive_integration, empowerment_over_extraction]
Related_ADRs: [0007, 0009, 0010]
BusinessImpact: >-
  - Enables LLM-assisted development and reduces developer onboarding friction
  - Creates standardized resources for LLMs to understand and leverage the SDK
  - Improves code generation, documentation, and example creation quality
  - Supports rapid prototyping and integration by AI development tools
Runbook: |
  1. Generate type definitions: `./scripts/generate-llm-types.sh`
  2. Update documentation: `./scripts/update-llm-docs.sh`
  3. Validate examples: `./scripts/validate-llm-examples.sh`
  4. Test LLM resources: `./scripts/test-llm-resources.sh`
---

## Context

Large Language Models (LLMs) are increasingly used for software development, code generation, and documentation assistance. The open-verifiable-id-sdk can be significantly improved for LLM-assisted development by providing structured, machine-readable resources and following LLM-friendly patterns.

Current gaps include:
- Limited JSDoc documentation and type annotations
- Inconsistent code examples and patterns
- Missing structured schema/specification files
- Lack of LLM-optimized resources and guides

## Decision

We will enhance open-verifiable-id-sdk to be highly LLM-friendly through comprehensive documentation, structured resources, and standardized patterns.

### 1. Enhanced Type Definitions & Documentation

**Comprehensive JSDoc Documentation:**
```typescript
/**
 * Creates a new decentralized identity (DID) using the specified method.
 * 
 * @description This function generates a new DID with associated cryptographic keys,
 * stores the private key securely, and optionally sets it as the primary DID.
 * 
 * @param props - Configuration object for DID creation
 * @param props.method - DID method to use (e.g., 'cheqd', 'key', 'cheqd:testnet')
 * @param props.agent - Optional Veramo agent instance. Uses parentAgent if not provided
 * @param props.alias - Optional custom DID string. Auto-generated if not provided
 * @param props.isPrimary - Whether to set this as the primary DID for signing operations
 * @param props.signingDid - Optional DID to use for signing the creation credential
 * 
 * @returns Promise resolving to DID creation result
 * @returns returns.did - The created DID identifier object
 * @returns returns.mnemonic - BIP39 mnemonic for key recovery
 * @returns returns.publicKeyHex - Public key in hexadecimal format
 * @returns returns.privateKeyHex - Private key in hexadecimal format
 * @returns returns.credentials - Array of verifiable credentials (creation proof)
 * 
 * @throws {Error} When agent is not available or DID creation fails
 * 
 * @example
 * ```typescript
 * // Create a basic DID
 * const { did, mnemonic } = await createDID({ method: 'cheqd' });
 * 
 * // Create with custom agent and set as primary
 * const { did, credentials } = await createDID({
 *   method: 'cheqd:mainnet',
 *   agent: myAgent,
 *   isPrimary: true,
 *   alias: 'did:cheqd:mainnet:my-custom-id'
 * });
 * ```
 * 
 * @since 0.0.18
 * @category Identity Management
 * @tags DID, Identity, Cryptography, Verifiable Credentials
 */
export async function createDID(props: CreateDIDProps): Promise<CreateDIDResult>
```

**Structured Interface Definitions:**
```typescript
/**
 * Configuration options for DID creation
 */
export interface CreateDIDProps {
  /** DID method identifier (e.g., 'cheqd', 'key', 'cheqd:testnet') */
  method: string;
  /** Optional Veramo agent instance. Uses parentAgent if not provided */
  agent?: IOpenVerifiableAgent;
  /** Optional custom DID string. Auto-generated UUID-based if not provided */
  alias?: string;
  /** Whether to set this DID as the primary signing identity */
  isPrimary?: boolean;
  /** Optional DID to use for signing the creation credential */
  signingDid?: string;
}

/**
 * Result of DID creation operation
 */
export interface CreateDIDResult {
  /** The created DID identifier with metadata */
  did: IIdentifier;
  /** BIP39 mnemonic phrase for private key recovery */
  mnemonic: string;
  /** Public key in hexadecimal format */
  publicKeyHex: string;
  /** Private key in hexadecimal format (handle securely) */
  privateKeyHex: string;
  /** Array of verifiable credentials proving DID creation */
  credentials: VerifiableCredential[];
}
```

### 2. LLM Resource Files

**SDK Specification (`docs/llm-resources/sdk-specification.json`):**
```json
{
  "name": "@openverifiable/open-verifiable-id-sdk",
  "version": "0.0.18",
  "description": "TypeScript SDK for decentralized identity management and verifiable credentials",
  "type": "module",
  "capabilities": {
    "did_management": {
      "methods_supported": ["cheqd", "key", "cheqd:testnet", "cheqd:mainnet"],
      "operations": ["create", "import", "update", "resolve", "list"]
    },
    "credential_management": {
      "formats": ["jwt", "ld"],
      "operations": ["sign", "verify", "issue", "present"]
    },
    "key_management": {
      "algorithms": ["Ed25519"],
      "storage": ["secure_local", "encrypted"],
      "features": ["recovery", "backup", "rotation"]
    },
    "integrations": {
      "platforms": ["node", "browser", "mobile"],
      "standards": ["W3C_VC", "W3C_DID", "BIP39"]
    }
  },
  "common_patterns": {
    "initialization": "await userStore.initialize()",
    "did_creation": "await createDID({ method: 'cheqd' })",
    "credential_signing": "await signVC(issuerDID, subjectID)",
    "primary_did": "await setPrimaryDID(didString)"
  }
}
```

**Function Catalog (`docs/llm-resources/function-catalog.json`):**
```json
{
  "functions": {
    "createDID": {
      "purpose": "Create new decentralized identity",
      "category": "Identity Management",
      "complexity": "intermediate",
      "required_params": ["method"],
      "optional_params": ["agent", "alias", "isPrimary", "signingDid"],
      "return_type": "CreateDIDResult",
      "side_effects": ["stores_private_key", "creates_credential"],
      "common_use_cases": [
        "New user onboarding",
        "Service identity creation",
        "Testing and development"
      ]
    },
    "signVC": {
      "purpose": "Sign verifiable credentials",
      "category": "Credential Management", 
      "complexity": "basic",
      "required_params": ["issuerDID", "subjectID"],
      "return_type": "string (JWT)",
      "prerequisites": ["valid_did", "stored_private_key"],
      "standards_compliance": ["W3C_VC_1.1"]
    }
  }
}
```

**Code Examples Collection (`docs/llm-resources/examples/`):**

`basic-usage.ts`:
```typescript
/**
 * Basic open-verifiable-id-sdk usage examples
 * These examples demonstrate the most common SDK operations
 */

import { 
  createDID, 
  signVC, 
  verifyVC, 
  userStore,
  setPrimaryDID 
} from '@openverifiable/open-verifiable-id-sdk';

// Example 1: Complete new user flow
async function newUserFlow() {
  // Initialize the SDK
  const { agent } = await userStore.initialize();
  
  // Create a new DID
  const { did, mnemonic } = await createDID({ 
    method: 'cheqd',
    isPrimary: true 
  });
  
  console.log('Created DID:', did.did);
  console.log('Recovery phrase:', mnemonic); // Store securely!
  
  return { did, mnemonic };
}

// Example 2: Issue and verify credential
async function credentialFlow() {
  const issuerDID = await userStore.getPrimaryDID();
  const subjectID = 'did:example:subject123';
  
  // Sign a verifiable credential
  const credential = await signVC(issuerDID, subjectID);
  
  // Verify the credential
  const isValid = await verifyVC(credential);
  
  return { credential, isValid };
}
```

### 3. LLM-Optimized Documentation Structure

**Standardized Documentation Format:**
- Function signatures with complete parameter documentation
- Return type specifications with nested object details
- Error conditions and exception handling
- Code examples for every major function
- Cross-references between related functions
- Performance considerations and best practices

**Context-Rich Comments:**
```typescript
// LLM Context: This function handles the core DID creation workflow
// Dependencies: Requires Veramo agent, supports multiple DID methods
// Security: Private keys are encrypted before storage
// Standards: Compliant with W3C DID Core 1.0 specification
export async function createDID(props: CreateDIDProps): Promise<CreateDIDResult> {
  // Implementation...
}
```

### 4. LLM Integration Tools

**Code Generation Templates (`scripts/llm-tools/`):**

`generate-integration.js`:
```javascript
/**
 * Generates integration code for common open-verifiable-id-sdk use cases
 */
export function generateIntegration(type, options) {
  const templates = {
    'express-api': generateExpressIntegration,
    'react-component': generateReactIntegration,
    'cli-tool': generateCLIIntegration
  };
  
  return templates[type]?.(options);
}
```

**Validation Tools:**
```bash
# Validate generated code against SDK patterns
npm run validate-llm-code <file>

# Test LLM-generated examples
npm run test-llm-examples

# Check documentation completeness
npm run audit-llm-docs
```

### 5. Schema-Driven Development

**OpenAPI/JSON Schema Specifications:**
- Complete API surface documentation
- Type definitions in multiple formats
- Interactive documentation generation
- Validation schemas for inputs/outputs

**Auto-Generated Resources:**
- Type definitions from source code
- Example collections from tests
- Documentation from JSDoc comments
- Integration patterns from usage analysis

## Implementation Plan

### Phase 1: Enhanced Documentation (Week 1-2)
1. Add comprehensive JSDoc to all public functions
2. Create structured interface definitions
3. Generate type definition files for LLMs
4. Update README with LLM-friendly examples

### Phase 2: LLM Resource Creation (Week 3-4)
1. Create SDK specification files
2. Build function catalog and examples collection
3. Develop code generation templates
4. Implement validation tools

### Phase 3: Integration & Testing (Week 5-6)
1. Test with popular LLM development tools
2. Validate generated code quality
3. Optimize documentation for LLM consumption
4. Create integration guides

### Phase 4: Community Resources (Week 7-8)
1. Publish LLM integration guides
2. Create video tutorials for AI-assisted development
3. Develop VS Code extension for SDK integration
4. Build community examples repository

## Benefits

### For LLM-Assisted Development:
- Accurate code generation with proper context
- Reduced hallucination through comprehensive documentation
- Faster developer onboarding and prototyping
- Consistent patterns and best practices

### For Human Developers:
- Improved IDE support and autocomplete
- Better error messages and debugging
- Comprehensive examples and guides
- Standardized integration patterns

### For SDK Adoption:
- Lower barrier to entry for new developers
- Increased usage through AI-powered development tools
- Better community contributions and examples
- Enhanced ecosystem growth

## Risks & Mitigations

**Risk: Over-documentation overhead**
- Mitigation: Automate documentation generation where possible
- Use tooling to maintain consistency and freshness

**Risk: LLM-generated code quality**
- Mitigation: Comprehensive validation tools and testing
- Clear guidelines for LLM-generated code review

**Risk: Documentation maintenance burden**
- Mitigation: Integration with CI/CD for automatic updates
- Community contribution guidelines for documentation

## Success Metrics

- 90%+ of public functions have comprehensive JSDoc
- LLM code generation accuracy > 85% for common use cases
- Developer onboarding time reduced by 50%
- Increased SDK usage in AI-assisted development workflows
- Community contributions to examples and integrations

## Consequences

**Positive:**
- Significantly improved developer experience
- Faster integration and adoption of the SDK
- Higher quality community contributions
- Better ecosystem growth and innovation

**Negative:**
- Increased maintenance overhead for documentation
- Need for specialized LLM integration testing
- Potential for over-engineering documentation

## Related Work

- OpenAI Function Calling specifications
- TypeScript handbook for LLM integration
- GitHub Copilot best practices for SDK design
- W3C standards documentation patterns 