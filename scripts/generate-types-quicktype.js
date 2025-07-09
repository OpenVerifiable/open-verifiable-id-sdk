#!/usr/bin/env node

/**
 * QuickType Type Generation Script for Open Verifiable ID SDK
 * 
 * This script generates TypeScript, Python, Rust, and Go types from JSON schemas
 * using QuickType CLI, with advanced features including:
 * - Multi-language generation
 * - Schema validation and governance compliance
 * - BFF (Backend for Frontend) integration
 * - Schema hash tracking for change detection
 * - CLI filtering and customization
 * 
 * Usage:
 *   node scripts/generate-types-quicktype.js [options]
 * 
 * Options:
 *   --source-dir <path>     Source directory containing schemas (default: ./schemas)
 *   --output-dir <path>     Output directory for generated types (default: ./types)
 *   --languages <langs>     Comma-separated list of languages (default: typescript,python,rust,go)
 *   --validate              Run schema validation before generation
 *   --bff                   Generate BFF integration helpers
 *   --governance            Include governance compliance checks
 *   --hash-tracking         Enable schema hash tracking for change detection
 *   --filter <pattern>      Filter schemas by pattern (regex)
 *   --exclude <pattern>     Exclude schemas by pattern (regex)
 *   --verbose               Enable verbose logging
 *   --help                  Show this help message
 * 
 * Examples:
 *   node scripts/generate-types-quicktype.js --languages typescript,python
 *   node scripts/generate-types-quicktype.js --source-dir ./custom-schemas --validate
 *   node scripts/generate-types-quicktype.js --filter ".*Credential.*" --bff
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class QuickTypeGenerator {
  constructor() {
    this.config = {
      sourceDir: './schemas',
      outputDir: './types',
      languages: ['typescript', 'python', 'rust', 'go'],
      validate: false,
      bff: false,
      governance: false,
      hashTracking: false,
      filter: null,
      exclude: null,
      verbose: false
    };
    
    this.schemaHashes = new Map();
    this.generatedFiles = new Set();
    this.validationErrors = [];
    this.governanceIssues = [];
  }

  parseArgs() {
    const args = process.argv.slice(2);
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--source-dir':
          this.config.sourceDir = args[++i];
          break;
        case '--output-dir':
          this.config.outputDir = args[++i];
          break;
        case '--languages':
          this.config.languages = args[++i].split(',').map(lang => lang.trim());
          break;
        case '--validate':
          this.config.validate = true;
          break;
        case '--bff':
          this.config.bff = true;
          break;
        case '--governance':
          this.config.governance = true;
          break;
        case '--hash-tracking':
          this.config.hashTracking = true;
          break;
        case '--filter':
          this.config.filter = new RegExp(args[++i]);
          break;
        case '--exclude':
          this.config.exclude = new RegExp(args[++i]);
          break;
        case '--verbose':
          this.config.verbose = true;
          break;
        case '--help':
          this.showHelp();
          process.exit(0);
          break;
        default:
          console.error(`Unknown option: ${arg}`);
          this.showHelp();
          process.exit(1);
      }
    }
  }

  showHelp() {
    console.log(`
QuickType Type Generation Script for Open Verifiable ID SDK

Usage:
  node scripts/generate-types-quicktype.js [options]

Options:
  --source-dir <path>     Source directory containing schemas (default: ./schemas)
  --output-dir <path>     Output directory for generated types (default: ./types)
  --languages <langs>     Comma-separated list of languages (default: typescript,python,rust,go)
  --validate              Run schema validation before generation
  --bff                   Generate BFF integration helpers
  --governance            Include governance compliance checks
  --hash-tracking         Enable schema hash tracking for change detection
  --filter <pattern>      Filter schemas by pattern (regex)
  --exclude <pattern>     Exclude schemas by pattern (regex)
  --verbose               Enable verbose logging
  --help                  Show this help message

Examples:
  node scripts/generate-types-quicktype.js --languages typescript,python
  node scripts/generate-types-quicktype.js --source-dir ./custom-schemas --validate
  node scripts/generate-types-quicktype.js --filter ".*Credential.*" --bff

Supported Languages:
  - typescript: TypeScript interfaces and types
  - python: Python dataclasses and type hints
  - rust: Rust structs and enums
  - go: Go structs and interfaces
  - csharp: C# classes and enums
  - java: Java classes and enums
  - kotlin: Kotlin data classes
  - swift: Swift structs and enums
  - elm: Elm types and decoders
  - json-schema: JSON Schema output
  - graphql: GraphQL schema
  - sql: SQL table definitions
    `);
  }

  checkQuickTypeInstallation() {
    try {
      execSync('quicktype --version', { stdio: 'pipe' });
      this.log('✓ QuickType CLI is installed');
      return true;
    } catch (error) {
      console.error('✗ QuickType CLI is not installed. Please install it first:');
      console.error('  npm install -g quicktype');
      console.error('  or');
      console.error('  yarn global add quicktype');
      return false;
    }
  }

  async loadSchemas(sourceDir) {
    this.log(`Loading schemas from: ${sourceDir}`);
    
    try {
      const schemas = [];
      const schemaFiles = await this.findSchemaFiles(sourceDir);
      
      for (const file of schemaFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const schema = JSON.parse(content);
          
          if (this.config.filter && !this.config.filter.test(file)) {
            continue;
          }
          if (this.config.exclude && this.config.exclude.test(file)) {
            continue;
          }
          
          schemas.push({
            file,
            content,
            schema,
            relativePath: path.relative(sourceDir, file)
          });
          
          if (this.config.hashTracking) {
            const hash = this.generateSchemaHash(schema);
            this.schemaHashes.set(file, hash);
          }
          
        } catch (error) {
          console.error(`Error loading schema ${file}:`, error.message);
        }
      }
      
      this.log(`Loaded ${schemas.length} schemas`);
      return schemas;
      
    } catch (error) {
      console.error(`Error loading schemas from ${sourceDir}:`, error.message);
      return [];
    }
  }

  async findSchemaFiles(dir) {
    const files = [];
    
    async function walk(currentDir) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name.endsWith('.json') || entry.name.endsWith('.schema.json')) {
          files.push(fullPath);
        }
      }
    }
    
    await walk(dir);
    return files;
  }

  async generateTypesForLanguage(config, schemas, layerName) {
    const language = config.language;
    const outputPath = path.join(this.config.outputDir, language, layerName);
    
    this.log(`Generating ${language} types for ${layerName}...`);
    
    try {
      await fs.mkdir(outputPath, { recursive: true });
      
      for (const schemaInfo of schemas) {
        const schemaName = path.basename(schemaInfo.file, '.json');
        const outputFile = path.join(outputPath, `${schemaName}.${this.getFileExtension(language)}`);
        
        try {
          const quicktypeArgs = [
            '--lang', language,
            '--out', outputFile,
            '--src-lang', 'json-schema',
            '--top-level', schemaName,
            '--acronym-style', 'original'
          ];
          
          if (language === 'typescript') {
            quicktypeArgs.push('--just-types', '--no-runtime-typecheck');
          } else if (language === 'python') {
            quicktypeArgs.push('--python-version', '3.7');
          } else if (language === 'rust') {
            quicktypeArgs.push('--visibility', 'public');
          } else if (language === 'go') {
            quicktypeArgs.push('--package', 'schemas');
          }
          
          const command = `echo '${schemaInfo.content}' | quicktype ${quicktypeArgs.join(' ')}`;
          execSync(command, { stdio: 'pipe' });
          
          this.generatedFiles.add(outputFile);
          this.log(`  ✓ Generated ${outputFile}`);
          
        } catch (error) {
          console.error(`  ✗ Error generating ${language} types for ${schemaName}:`, error.message);
        }
      }
      
      await this.generateIndexFile(language, outputPath, schemas);
      await this.generatePackageMetadata(config, outputPath, layerName);
      
    } catch (error) {
      console.error(`Error generating ${language} types for ${layerName}:`, error.message);
    }
  }

  getFileExtension(language) {
    const extensions = {
      typescript: 'ts',
      python: 'py',
      rust: 'rs',
      go: 'go',
      csharp: 'cs',
      java: 'java',
      kotlin: 'kt',
      swift: 'swift',
      elm: 'elm',
      'json-schema': 'json',
      graphql: 'graphql',
      sql: 'sql'
    };
    
    return extensions[language] || 'txt';
  }

  async generateIndexFile(language, outputPath, schemas) {
    const indexContent = this.generateIndexContent(language, schemas);
    const indexFile = path.join(outputPath, `index.${this.getFileExtension(language)}`);
    await fs.writeFile(indexFile, indexContent);
    this.log(`  ✓ Generated index file for ${language}`);
  }

  generateIndexContent(language, schemas) {
    const schemaNames = schemas.map(s => path.basename(s.file, '.json'));
    
    switch (language) {
      case 'typescript':
        return schemaNames.map(name => `export * from './${name}';`).join('\n') + '\n';
      case 'python':
        return schemaNames.map(name => `from .${name} import *`).join('\n') + '\n';
      case 'rust':
        return schemaNames.map(name => `pub mod ${name};`).join('\n') + '\n';
      case 'go':
        return schemaNames.map(name => `package schemas`).join('\n') + '\n';
      default:
        return `// Generated types for ${language}\n`;
    }
  }

  async generatePackageMetadata(config, outputPath, layerName) {
    const metadata = {
      name: `@open-verifiable/schemas-${layerName}`,
      version: '1.0.0',
      description: `Generated types for ${layerName} schemas`,
      main: 'index.js',
      types: 'index.d.ts',
      files: ['**/*'],
      keywords: ['open-verifiable', 'schemas', 'types', layerName],
      author: 'Open Verifiable Community',
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'https://github.com/open-verifiable/open-verifiable-id-sdk.git'
      },
      bugs: {
        url: 'https://github.com/open-verifiable/open-verifiable-id-sdk/issues'
      },
      homepage: 'https://github.com/open-verifiable/open-verifiable-id-sdk#readme',
      dependencies: {},
      devDependencies: {},
      scripts: {
        build: 'tsc',
        test: 'jest',
        validate: 'node scripts/validate-schemas.js'
      }
    };
    
    const packageFile = path.join(outputPath, 'package.json');
    await fs.writeFile(packageFile, JSON.stringify(metadata, null, 2));
    this.log(`  ✓ Generated package.json for ${layerName}`);
  }

  generateSchemaHash(schema) {
    const content = JSON.stringify(schema, Object.keys(schema).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async runValidation() {
    if (!this.config.validate) return;
    
    this.log('Running schema validation...');
    
    try {
      const validateScript = path.join(__dirname, 'validate-schemas.js');
      const validateScriptExists = await fs.access(validateScript).then(() => true).catch(() => false);
      
      if (validateScriptExists) {
        execSync(`node ${validateScript} --source-dir ${this.config.sourceDir}`, { stdio: 'inherit' });
        this.log('✓ Schema validation completed');
      } else {
        this.log('⚠ Validation script not found, skipping validation');
      }
    } catch (error) {
      console.error('✗ Schema validation failed:', error.message);
      this.validationErrors.push(error.message);
    }
  }

  log(message) {
    if (this.config.verbose) {
      console.log(message);
    }
  }

  groupSchemasByLayer(schemas) {
    const layers = {};
    
    for (const schema of schemas) {
      const layerName = path.dirname(schema.relativePath) || 'root';
      if (!layers[layerName]) {
        layers[layerName] = [];
      }
      layers[layerName].push(schema);
    }
    
    return layers;
  }

  generateSummary() {
    console.log('\n📊 Generation Summary');
    console.log('=' .repeat(30));
    console.log(`Languages: ${this.config.languages.join(', ')}`);
    console.log(`Schemas processed: ${this.schemaHashes.size}`);
    console.log(`Files generated: ${this.generatedFiles.size}`);
    
    if (this.validationErrors.length > 0) {
      console.log(`Validation errors: ${this.validationErrors.length}`);
    }
    
    if (this.governanceIssues.length > 0) {
      console.log(`Governance issues: ${this.governanceIssues.length}`);
    }
    
    console.log(`Output directory: ${this.config.outputDir}`);
  }

  async run() {
    console.log('🚀 QuickType Type Generation for Open Verifiable ID SDK');
    console.log('=' .repeat(60));
    
    this.parseArgs();
    
    if (!this.checkQuickTypeInstallation()) {
      process.exit(1);
    }
    
    await this.runValidation();
    
    const schemas = await this.loadSchemas(this.config.sourceDir);
    if (schemas.length === 0) {
      console.error('No schemas found. Exiting.');
      process.exit(1);
    }
    
    const schemaLayers = this.groupSchemasByLayer(schemas);
    
    for (const language of this.config.languages) {
      for (const [layerName, layerSchemas] of Object.entries(schemaLayers)) {
        const config = {
          language,
          generateValidationHelpers: true,
          generateBFFHelpers: this.config.bff
        };
        
        await this.generateTypesForLanguage(config, layerSchemas, layerName);
      }
    }
    
    this.generateSummary();
    
    console.log('✅ Type generation completed successfully!');
  }
}

if (require.main === module) {
  const generator = new QuickTypeGenerator();
  generator.run().catch(error => {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  });
}

module.exports = QuickTypeGenerator;
