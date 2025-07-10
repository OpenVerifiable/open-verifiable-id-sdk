# Schema Migration Plan

## Overview
This document outlines the plan to migrate schemas from the `architecture/schemas/` directory to the `open-verifiable-schema-registry/schemas/open-verifiable/v1/` directory.

## Schemas to Migrate

### 1. Core Configuration Schemas
- [ ] `sdk-configuration.schema.json` → Enhanced SDK configuration
- [ ] `agent-configuration.schema.json` → Enhanced agent configuration  
- [ ] `credential-template.schema.json` → Enhanced credential template
- [ ] `key-management.schema.json` → Enhanced key management configuration

### 2. Plugin System Schemas
- [ ] `verifiable-plugin.schema.json` → Updated verifiable plugin schema (may replace existing)

### 3. Integration & Compatibility Schemas
- [x] `llm-integration.schema.json` → LLM integration configuration ✅
- [x] `cross-platform-compatibility.schema.json` → Cross-platform compatibility settings ✅
- [ ] `external-database-config.schema.json` → External database configuration

### 4. Performance & Monitoring Schemas
- [x] `performance-monitoring.schema.json` → Performance monitoring configuration ✅
- [x] `error-handling.schema.json` → Error handling configuration ✅
- [ ] `error-telemetry.schema.json` → Error telemetry configuration

### 5. Development & Testing Schemas
- [ ] `testing-config.schema.json` → Testing configuration
- [ ] `validation-options.schema.json` → Validation options

### 6. Security & Storage Schemas
- [ ] `biometric-authentication.schema.json` → Biometric authentication settings
- [ ] `secure-storage-access-log.schema.json` → Secure storage access logging
- [ ] `offline-cache-config.schema.json` → Offline cache configuration

### 7. DID & Identity Schemas
- [ ] `create-did-options.schema.json` → DID creation options
- [ ] `core-module-structure.schema.json` → Core module structure

## Migration Steps

### Phase 1: Review and Validate
1. Review each schema for completeness and accuracy
2. Validate JSON schema syntax
3. Check for conflicts with existing schemas
4. Update schema IDs to follow registry conventions

### Phase 2: Copy and Update
1. Copy schemas to `open-verifiable-schema-registry/schemas/open-verifiable/v1/`
2. Update `$id` fields to use registry URLs
3. Update any internal references
4. Ensure proper versioning

### Phase 3: Update Registry Index
1. Add imports to `open-verifiable-schema-registry/schemas/index.ts`
2. Add exports to the export list
3. Update documentation

### Phase 4: Update SDK References
1. Update SDK code to reference new schema locations
2. Update tests to use new schema paths
3. Update documentation

### Phase 5: Cleanup
1. Remove schemas from `architecture/schemas/` directory
2. Update any remaining references
3. Update documentation

## Schema ID Convention
All schemas should use the following ID pattern:
```
https://schemas.openverifiable.org/sdk/v1/{SchemaName}.schema.json
```

## Priority Order
1. **High Priority**: Core configuration schemas (sdk, agent, credential, key-management)
2. **Medium Priority**: Plugin system and integration schemas
3. **Low Priority**: Development, testing, and monitoring schemas

## Notes
- Some schemas may need to be merged or updated rather than simply copied
- The `verifiable-plugin.schema.json` may replace the existing one if it's more complete
- All schemas should be validated against the JSON Schema specification
- Consider backward compatibility when updating existing schemas 