# Scripts Directory

This directory contains utility scripts for the Open Verifiable ID SDK, including schema management, type generation, and testing utilities.

## QuickType Type Generation

The `generate-types-quicktype.js` script provides advanced type generation capabilities using QuickType CLI, complementing the existing `exportSchemas.test.js` functionality.

### Features

- **Multi-language Support**: Generate types for TypeScript, Python, Rust, Go, and more
- **Schema Validation**: Integrate with existing validation scripts
- **BFF Integration**: Generate Backend-for-Frontend integration helpers
- **Governance Compliance**: Include governance compliance checks
- **Hash Tracking**: Track schema changes for incremental generation
- **CLI Filtering**: Filter schemas by patterns and exclude unwanted schemas

### Usage

```bash
# Basic usage - generate TypeScript and Python types
node scripts/generate-types-quicktype.js --languages typescript,python

# With validation
node scripts/generate-types-quicktype.js --validate

# With BFF integration helpers
node scripts/generate-types-quicktype.js --bff

# Filter specific schemas
node scripts/generate-types-quicktype.js --filter ".*Credential.*"

# Verbose output
node scripts/generate-types-quicktype.js --verbose

# Custom source and output directories
node scripts/generate-types-quicktype.js --source-dir ./custom-schemas --output-dir ./generated-types
```

### Integration with exportSchemas.test.js

The QuickType generator is designed to work alongside the existing `exportSchemas.test.js`:

1. **Complementary Functionality**: While `exportSchemas.test.js` focuses on schema aggregation and basic TypeScript generation, QuickType provides advanced multi-language support
2. **Shared Validation**: Both scripts can use the same validation infrastructure
3. **Consistent Output**: Generated types follow similar patterns and conventions
4. **Test Compatibility**: Both scripts can be tested using the same test framework

### Supported Languages

- **TypeScript**: Interfaces, types, and validation helpers
- **Python**: Dataclasses, type hints, and validation
- **Rust**: Structs, enums, and validation traits
- **Go**: Structs, interfaces, and validation functions
- **C#**: Classes, enums, and validation attributes
- **Java**: Classes, enums, and validation annotations
- **Kotlin**: Data classes and validation
- **Swift**: Structs, enums, and validation
- **Elm**: Types and decoders
- **GraphQL**: Schema definitions
- **SQL**: Table definitions

### Configuration

The script supports various configuration options:

```bash
# Language-specific options
--languages typescript,python,rust,go

# Validation and compliance
--validate              # Run schema validation
--governance            # Include governance checks

# Integration features
--bff                   # Generate BFF helpers
--hash-tracking         # Track schema changes

# Filtering
--filter ".*Credential.*"  # Include matching schemas
--exclude ".*Test.*"       # Exclude matching schemas

# Output control
--verbose               # Detailed logging
--source-dir ./schemas  # Custom source directory
--output-dir ./types    # Custom output directory
```

### Output Structure

Generated types are organized by language and schema layer:

```
types/
├── typescript/
│   ├── root/
│   │   ├── index.ts
│   │   ├── Schema1.ts
│   │   └── Schema2.ts
│   └── package.json
├── python/
│   ├── root/
│   │   ├── __init__.py
│   │   ├── schema1.py
│   │   └── schema2.py
│   └── setup.py
└── rust/
    ├── root/
    │   ├── mod.rs
    │   ├── schema1.rs
    │   └── schema2.rs
    └── Cargo.toml
```

### Validation Integration

The script integrates with existing validation infrastructure:

```bash
# Run with validation (uses validate-schemas.js if available)
node scripts/generate-types-quicktype.js --validate

# Validation errors are reported and tracked
# Script continues with generation even if validation fails
```

### BFF Integration

Generate Backend-for-Frontend integration helpers:

```bash
# Generate BFF helpers for all supported languages
node scripts/generate-types-quicktype.js --bff
```

This creates helper classes for:
- Schema validation via API
- Type generation via API
- Configuration management
- Error handling

### Hash Tracking

Track schema changes for incremental generation:

```bash
# Enable hash tracking
node scripts/generate-types-quicktype.js --hash-tracking
```

This feature:
- Generates SHA-256 hashes for each schema
- Tracks changes between runs
- Enables incremental generation
- Provides change detection

### Testing

The script can be tested using the existing test framework:

```bash
# Run tests
npm test

# Test specific functionality
npm test -- --grep "QuickType"
```

### Dependencies

Required dependencies:

```bash
# Install QuickType CLI
npm install -g quicktype

# Or using yarn
yarn global add quicktype
```

### Error Handling

The script includes comprehensive error handling:

- **QuickType Installation**: Checks for QuickType CLI installation
- **Schema Loading**: Handles malformed JSON and missing files
- **Generation Errors**: Continues processing other schemas on individual failures
- **Validation Errors**: Reports validation issues without stopping generation
- **File System Errors**: Handles permission and path issues gracefully

### Performance

Optimizations for large schema collections:

- **Parallel Processing**: Processes multiple schemas concurrently
- **Incremental Generation**: Only regenerates changed schemas (with hash tracking)
- **Memory Management**: Processes schemas in batches
- **Caching**: Caches generated content for reuse

### Contributing

To extend the QuickType integration:

1. **Add New Languages**: Extend the `getFileExtension()` method
2. **Custom Templates**: Add language-specific generation logic
3. **Validation Rules**: Integrate with additional validation frameworks
4. **BFF Features**: Extend BFF integration capabilities

### Troubleshooting

Common issues and solutions:

**QuickType not found**: Install QuickType CLI globally
```bash
npm install -g quicktype
```

**Permission errors**: Check file permissions and ownership
```bash
chmod +x scripts/generate-types-quicktype.js
```

**Schema loading errors**: Verify JSON syntax and file paths
```bash
node scripts/generate-types-quicktype.js --verbose
```

**Generation failures**: Check QuickType version compatibility
```bash
quicktype --version
```

## Other Scripts

### inventory-adrs.sh

Inventory and manage Architecture Decision Records (ADRs).

```bash
# Run ADR inventory
./scripts/inventory-adrs.sh
```

## Development

### Adding New Scripts

When adding new scripts:

1. **Documentation**: Include comprehensive help and usage examples
2. **Error Handling**: Implement proper error handling and reporting
3. **Testing**: Add tests for new functionality
4. **Integration**: Ensure compatibility with existing scripts
5. **Performance**: Consider performance implications for large datasets

### Script Standards

All scripts should follow these standards:

- **Shebang**: Include appropriate shebang for the language
- **Help**: Provide `--help` option with usage information
- **Error Codes**: Use appropriate exit codes for different error conditions
- **Logging**: Include verbose mode for debugging
- **Documentation**: Include comprehensive inline documentation 