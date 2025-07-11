# Internal SDK Mocks Inventory

This document catalogs all test files that previously mocked internal SDK code (`open-verifiable-id-sdk/src/**`) and tracks the migration to real implementations.

## Overview

**Total Test Files with Internal Mocks: 8 (now 0 remaining)**
- 4 Agent test files (parent-agent, service-agent, factory, index) ✅
- 4 Other test files (config, validation, storage, credential) ✅

**Rationale for Mocking (historical):**
- Isolating behavior for unit testing
- Bypassing network dependencies (DID resolution, blockchain)
- Avoiding database/storage dependencies
- Testing error conditions
- Simplifying complex initialization

## Detailed Inventory

### 1. `tests/unit/agents/parent-agent.test.ts` ✅
- **Status:** Refactored to use real ParentAgent via test helper. No internal mocks remain.

### 2. `tests/unit/agents/service-agent.test.ts` ✅
- **Status:** Refactored to use real ServiceAgent via test helper. No internal mocks remain.

### 3. `tests/unit/agents/factory.test.ts` ✅
- **Status:** Refactored to use real agent classes and helpers. No internal mocks remain.

### 4. `tests/unit/agents/index.test.ts` ✅
- **Status:** Refactored to use real agent classes and helpers. No internal mocks remain.

### 5. `tests/unit/config.test.ts` ✅
- **Status:** Refactored to use real platform/config logic with test overrides. No internal mocks remain.

### 6. `tests/unit/validation/index.test.ts` ✅
- **Status:** Refactored to use real validation, trust registry, and revocation logic. No internal mocks remain.

### 7. `tests/unit/storage.test.ts` ✅
- **Status:** Already used real SecureStorageImpl. No internal mocks ever present.

### 8. `tests/unit/credential-client.test.ts` ✅
- **Status:** Refactored to use real agent, trust registry, and revocation client. No internal mocks remain.

## External Library Mocks (Retained)

- `@veramo/*`, `@cheqd/*`, `did-resolver`, `typeorm`, `dotenv`, `react-native-*`, `@types/*` — Only external dependencies may be mocked for isolation or error simulation.

## Plan for Removing Internal Mocks

### Phase 1: Create Test Helpers (Completed ✅)
- ✅ Create `agent-test-helper.ts` with real agent initialization
- ✅ Add test environment setup utilities
- ✅ Create in-memory storage implementations
- ✅ Add test-specific configuration

### Phase 2: Refactor Agent Tests (Completed ✅)
1. ✅ **parent-agent.test.ts** - Use real agent
2. ✅ **service-agent.test.ts** - Use real agent
3. ✅ **factory.test.ts** - Use real agents
4. ✅ **index.test.ts** - Use real agents

### Phase 3: Refactor Other Tests (Completed ✅)
1. ✅ **config.test.ts** - Use real config/platform logic
2. ✅ **validation/index.test.ts** - Use real validation/trust/revocation
3. ✅ **storage.test.ts** - Use real storage
4. ✅ **credential-client.test.ts** - Use real agent/trust/revocation

### Phase 4: Integration Testing (Recommended)
- Create integration tests that use real implementations
- Test end-to-end workflows
- Validate real agent interactions

## Final Summary

**All unit tests in the open-verifiable-id-sdk now use real SDK implementations. No internal SDK code is mocked in the test suite.**

- All agent, config, validation, storage, and credential tests exercise real code paths.
- Test helpers provide in-memory/test-mode agents and storage for fast, isolated tests.
- Only external dependencies (network, DB, platform APIs) may be mocked for error simulation or isolation.
- This approach ensures:
  - **Better test coverage**
  - **Real bug detection**
  - **High confidence in SDK behavior**
  - **Easier maintenance**

**Policy:** Future tests should avoid internal SDK mocks except for explicit error simulation or external dependency isolation. All new tests should use real agent and storage helpers for maximum reliability. 