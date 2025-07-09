---
ADR: 0022
Title: Standardized Core Module Structure
Date: 2025-07-06
Status: Proposed
Priority: Maintenance
Principles: [modular_open_source, quality_reliability_standards, inclusive_integration]
Related_ADRs: [0007, 0016, 0018]
BusinessImpact: >-
  - Reduces cognitive overhead for contributors by providing a predictable layout
  - Simplifies tooling & documentation generation (barrel exports, schematics)
  - Eases cross-module refactors and encourages test coverage parity
Runbook: |
  1. Audit `src/core/*` directories and classify files (DONE 2025-07-06).
  2. Create barrels (`index.ts`) for every core sub-module.
  3. Move/rename implementation files to `client.ts`, `manager.ts`, or `types.ts` as per schema.
  4. Update relative imports across code-base to use barrel paths only (e.g. `@/core/credentialing`).
  5. Run linter & full test suite.
---

## Context

Over time, new functionality (credentialing, revocation, carbon, etc.) was added to
`src/core/*` piecemeal.  Each sub-directory has its own conventions: some expose a
root `index.ts`, others only a concrete class; file names vary between
`client.ts`, `manager.ts`, `memory.ts`, etc.  This inconsistency makes it harder
for new contributors to locate code, breaks tree-shaking, and complicates
barrel exports.

## Decision

1. **Directory Layout (per core module)**

```
core/<module>/
  ├── index.ts            // barrel – *only* re-exports public surface
  ├── types.ts            // shared interfaces & enums (optional)
  ├── client.ts|manager.ts// primary implementation (singular)
  ├── adapters/           // platform-specific or secondary impls
  ├── utils/              // helpers private to the module
  └── __tests__/          // colocated Vitest suites
```

2. **Export Policy**
   * Sub-module consumers **must** import only from the barrel:
     `import { CredentialClient } from '@/core/credentialing'`
   * The root `core/index.ts` exports the barrels verbatim; it no longer re-exports individual files.

3. **File-Name Conventions**
   | Pattern | Purpose |
   |---------|---------|
   | `client.ts` | Usage-centric façade (e.g., `CredentialClient`) |
   | `manager.ts`| Multi-object orchestrator (e.g., `KeyManager`) |
   | `types.ts`  | Interfaces, enums, model types |
   | `adapter-<platform>.ts` | Platform specific logic |

4. **Testing**
   * Each module has an `__tests__` folder mirroring public API
   * Test filenames follow `<subject>.test.ts`.

5. **Schema Definition**
   * A machine-readable JSON Schema (`architecture/schemas/core-module-structure.schema.json`) has been created to validate future PRs via CI.

## Consequences

### Positives
* Predictable layout -> easier onboarding & documentation generation.
* Clear public vs private boundaries.
* Enables automated lint-rule enforcing import paths.

### Negatives
* Short-term refactor churn; PRs will need rebasing.
* Slightly deeper directory nesting for small modules.

### Trade-offs
* Strict barrels limit deep-import flexibility but protect against breaking changes.

## Migration Plan
1. Introduce barrels for modules missing them (`credentialing`, `revocation`, `trust-registry`).
2. Update root barrel and refactor imports.
3. Move legacy helper files into `utils/` folders.
4. Update docs & code examples.

## Open Issues
* Should `core/agents` be split further (agent types into sub-dirs)?
* How to enforce via ESLint rule vs CI script?  Feedback welcome. 