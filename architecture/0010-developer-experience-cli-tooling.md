---
ADR: 0010
Title: open-verifiable-id-sdk Developer Experience & CLI Tooling
Date: 2025-01-14
Status: Proposed
Priority: MVP
Principles: [creator_first, user_sovereignty, proof_first_trust, inclusive_integration, community_collaboration, empowerment_over_extraction, privacy_by_design, modular_open_source, security_first, resilience_by_design]
Related_ADRs: [0001, 0002, 0003, 0004, 0005, 0006, 0007, 0008, 0009]
BusinessImpact: >-
  - Reduces developer onboarding time and improves SDK adoption
  - Enables rapid prototyping and testing of identity workflows
  - Provides excellent developer experience that encourages community contributions
Runbook: |
  1. Install CLI: `npm install -g @originvault/ov-id-cli`
  2. Initialize project: `ov-id init {project-name}`
  3. Create DID: `ov-id create-did --method {method}`
  4. Issue credential: `ov-id issue-credential --template {template}`
  5. Verify credential: `ov-id verify-credential {credential-file}`
---

## Context

Developer experience is critical for SDK adoption and community growth. The open-verifiable-id-sdk handles complex identity operations that can be challenging for developers to implement correctly. A comprehensive CLI tool and excellent developer experience reduces barriers to entry, enables rapid prototyping, and encourages proper implementation patterns.

## Requirements

### Must
- Provide CLI tool for all major SDK operations (DID creation, credential issuance, verification)
- Include interactive wizard for common workflows
- Support configuration management and environment switching
- Provide comprehensive documentation with examples
- Include TypeScript definitions with excellent IntelliSense support

### Should
- Support project scaffolding and code generation
- Include debugging and troubleshooting tools
- Provide performance profiling and metrics
- Support plugin development and custom workflows
- Include migration tools for different SDK versions

### Could
- Support visual workflow designer for complex identity flows
- Include integration with popular IDEs and development tools
- Provide real-time collaboration features for team development
- Support automated testing of identity workflows

## Decision

### 1. CLI Architecture
- **Modular Command Structure**: Organized commands by functional area
- **Interactive Workflows**: Guided wizards for complex operations
- **Configuration Management**: Environment-specific settings and profiles
- **Extensible Plugin System**: Support for custom commands and workflows
- **Developer-Friendly Output**: Detailed logging, helpful error messages, and progress indicators

### 2. Implementation Approach

#### CLI Tool Structure
```typescript
// Core CLI architecture
interface CLICommand {
  name: string;
  description: string;
  options: CLIOption[];
  handler: (args: CLIArgs) => Promise<CLIResult>;
  examples: string[];
}

interface CLITool {
  // Command execution
  executeCommand(command: string, args: CLIArgs): Promise<CLIResult>;
  
  // Interactive workflows
  runWizard(workflow: string): Promise<WizardResult>;
  
  // Configuration management
  setConfig(key: string, value: any, scope?: 'global' | 'project'): Promise<void>;
  getConfig(key: string, scope?: 'global' | 'project'): Promise<any>;
  
  // Plugin management
  installPlugin(plugin: string): Promise<void>;
  loadPlugin(plugin: string): Promise<CLIPlugin>;
}

interface CLIArgs {
  [key: string]: string | boolean | number | string[];
}

interface CLIResult {
  success: boolean;
  data?: any;
  message: string;
  errors?: string[];
}
```

#### Command Categories
```bash
# DID Management
ov-id did:create --method cheqd:testnet --alias "my-identity"
ov-id did:resolve did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH
ov-id did:list --format table
ov-id did:export --did {did} --format json
ov-id did:import --file identity.json

# Credential Operations
ov-id credential:issue --issuer {did} --subject {did} --type PersonalInfo
ov-id credential:verify --credential credential.json
ov-id credential:revoke --credential {credential-id} --reason "test"
ov-id credential:list --issuer {did} --status active

# Trust Registry
ov-id trust:check --issuer {did} --type PersonalInfo
ov-id trust:add --issuer {did} --trust-level high
ov-id trust:sync --registry-url https://trust.example.com

# Project Management
ov-id init my-identity-app --template basic
ov-id config:set cheqd.network testnet
ov-id config:get --all
ov-id migrate --from 1.0.0 --to 2.0.0

# Development Tools
ov-id test:workflow --file workflow.yaml
ov-id debug:trace --operation create-did --verbose
ov-id generate:types --schema-url https://schema.example.com
ov-id validate:setup --check-all
```

#### Interactive Workflows
```typescript
// Guided workflow for complex operations
class CredentialIssuanceWizard {
  async run(): Promise<WizardResult> {
    const workflow = new InteractiveWorkflow([
      {
        name: 'select-issuer',
        prompt: 'Select or create issuer DID:',
        type: 'select',
        choices: await this.getAvailableDIDs(),
        validate: (did) => this.validateDID(did)
      },
      {
        name: 'select-subject',
        prompt: 'Enter subject DID or create new:',
        type: 'input',
        default: () => this.generateNewDID()
      },
      {
        name: 'select-template',
        prompt: 'Choose credential template:',
        type: 'select',
        choices: await this.getCredentialTemplates()
      },
      {
        name: 'enter-claims',
        prompt: 'Enter credential claims:',
        type: 'form',
        fields: (template) => this.getTemplateFields(template)
      },
      {
        name: 'confirm',
        prompt: 'Review and confirm credential issuance:',
        type: 'confirm',
        preview: (data) => this.generatePreview(data)
      }
    ]);
    
    return await workflow.execute();
  }
}

// Usage
const wizard = new CredentialIssuanceWizard();
const result = await wizard.run();
```

#### Configuration Management
```typescript
// Configuration system for development environments
interface CLIConfig {
  // Network settings
  networks: {
    cheqd: {
      mainnet: NetworkConfig;
      testnet: NetworkConfig;
    };
  };
  
  // Default settings
  defaults: {
    didMethod: string;
    credentialTemplate: string;
    outputFormat: 'json' | 'yaml' | 'table';
  };
  
  // Development settings
  development: {
    autoSave: boolean;
    verboseLogging: boolean;
    mockExternalServices: boolean;
  };
  
  // Security settings
  security: {
    keyStorageType: 'file' | 'keychain' | 'hardware';
    encryptionLevel: 'standard' | 'high';
    biometricAuth: boolean;
  };
}

// Configuration commands
class ConfigManager {
  async setEnvironment(env: 'development' | 'staging' | 'production'): Promise<void> {
    await this.loadEnvironmentConfig(env);
    await this.validateConfiguration();
  }
  
  async createProfile(name: string, config: Partial<CLIConfig>): Promise<void> {
    await this.saveProfile(name, config);
  }
  
  async switchProfile(name: string): Promise<void> {
    await this.loadProfile(name);
  }
}
```

### 3. Project Scaffolding

#### Template System
```typescript
// Project templates for different use cases
interface ProjectTemplate {
  name: string;
  description: string;
  files: TemplateFile[];
  dependencies: string[];
  scripts: Record<string, string>;
  setup: () => Promise<void>;
}

const templates: ProjectTemplate[] = [
  {
    name: 'basic',
    description: 'Basic identity management project',
    files: [
      { path: 'src/index.ts', template: 'basic-index.ts.hbs' },
      { path: 'src/config.ts', template: 'config.ts.hbs' },
      { path: 'examples/create-did.ts', template: 'create-did.ts.hbs' }
    ],
    dependencies: ['@openverifiable/open-verifiable-id-sdk'],
    scripts: {
      'dev': 'ts-node src/index.ts',
      'build': 'tsc',
      'test': 'jest'
    }
  },
  {
    name: 'credential-issuer',
    description: 'Credential issuance service',
    files: [
      { path: 'src/issuer.ts', template: 'issuer.ts.hbs' },
      { path: 'src/schemas/', template: 'schemas/' },
      { path: 'api/routes.ts', template: 'api-routes.ts.hbs' }
    ]
  },
  {
    name: 'mobile-wallet',
    description: 'Mobile wallet application',
    files: [
      { path: 'src/wallet.ts', template: 'mobile-wallet.ts.hbs' },
      { path: 'src/biometric.ts', template: 'biometric.ts.hbs' }
    ]
  }
];

// Template generation
class ProjectGenerator {
  async generateProject(template: string, projectName: string): Promise<void> {
    const templateConfig = templates.find(t => t.name === template);
    if (!templateConfig) throw new Error(`Unknown template: ${template}`);
    
    // Create project directory
    await fs.mkdir(projectName, { recursive: true });
    
    // Generate files from templates
    for (const file of templateConfig.files) {
      const content = await this.renderTemplate(file.template, {
        projectName,
        timestamp: new Date().toISOString()
      });
      await fs.writeFile(path.join(projectName, file.path), content);
    }
    
    // Setup package.json
    await this.generatePackageJson(projectName, templateConfig);
    
    // Install dependencies
    await this.installDependencies(projectName);
    
    // Run setup scripts
    await templateConfig.setup();
  }
}
```

### 4. Developer Documentation

#### Interactive Documentation
```typescript
// Built-in help and documentation system
class DocumentationSystem {
  async showHelp(command?: string): Promise<void> {
    if (command) {
      await this.showCommandHelp(command);
    } else {
      await this.showOverview();
    }
  }
  
  async showExamples(category: string): Promise<void> {
    const examples = await this.loadExamples(category);
    await this.displayInteractiveExamples(examples);
  }
  
  async openPlayground(): Promise<void> {
    // Launch interactive playground for testing SDK features
    const playground = new InteractivePlayground();
    await playground.start();
  }
}

// Example output format
interface ExampleCommand {
  command: string;
  description: string;
  example: string;
  output: string;
  explanation: string[];
}
```

#### Code Generation
```typescript
// Code generation for common patterns
class CodeGenerator {
  async generateDIDManager(options: GenerationOptions): Promise<string> {
    return `
import { DIDManager } from '@openverifiable/open-verifiable-id-sdk';

export class Custom${options.className} extends DIDManager {
  constructor() {
    super({
      defaultMethod: '${options.defaultMethod}',
      network: '${options.network}',
      storage: '${options.storage}'
    });
  }
  
  async createIdentity(alias: string): Promise<Identity> {
    // Generated based on your configuration
    const did = await this.createDID('${options.defaultMethod}', { alias });
    
    // Add custom logic here
    return {
      did: did.did,
      credentials: [],
      metadata: { created: new Date() }
    };
  }
}
`;
  }
  
  async generateCredentialSchema(schema: JSONSchema): Promise<string> {
    // Generate TypeScript types from JSON schema
    return await this.jsonSchemaToTypeScript(schema);
  }
}
```

### 5. Debugging and Troubleshooting

#### Debug Tools
```typescript
// Comprehensive debugging support
class DebugTools {
  async traceOperation(operation: string, args: any[]): Promise<TraceResult> {
    const tracer = new OperationTracer();
    
    return await tracer.trace(async () => {
      return await this.executeOperation(operation, args);
    });
  }
  
  async validateSetup(): Promise<ValidationResult> {
    const checks = [
      () => this.checkNetworkConnectivity(),
      () => this.checkKeyStorage(),
      () => this.checkDependencies(),
      () => this.checkConfiguration()
    ];
    
    const results = await Promise.allSettled(
      checks.map(check => check())
    );
    
    return this.aggregateResults(results);
  }
  
  async exportDiagnostics(): Promise<DiagnosticReport> {
    return {
      system: await this.getSystemInfo(),
      configuration: await this.getConfigInfo(),
      dependencies: await this.getDependencyInfo(),
      logs: await this.getRecentLogs(),
      performance: await this.getPerformanceMetrics()
    };
  }
}
```

## Consequences

### Positives
- **Rapid Onboarding**: CLI tools reduce time to first successful implementation
- **Developer Productivity**: Interactive workflows and code generation speed development
- **Quality Assurance**: Built-in validation and debugging prevent common mistakes
- **Community Growth**: Excellent DX encourages contributions and adoption
- **Standardization**: Templates and generators promote best practices

### Negatives
- **Maintenance Overhead**: CLI tools require ongoing maintenance and updates
- **Complexity**: Rich feature set may overwhelm new developers
- **Platform Dependencies**: CLI tools may have platform-specific limitations
- **Version Synchronization**: CLI versions must stay synchronized with SDK versions

### Trade-offs
- **Feature Richness vs Simplicity**: Comprehensive tools may be complex for simple use cases
- **Automation vs Control**: Wizards and generators may obscure underlying operations
- **Documentation vs Discovery**: Rich help system may reduce exploration and learning

## Business Impact
- **Required for MVP**: Developer experience critical for SDK adoption
- **Developer Acquisition**: Excellent DX attracts developers to the platform
- **Community Building**: Good tools encourage community contributions and ecosystem growth
- **Support Reduction**: Self-service tools reduce support burden

## Mission Alignment & Principle Coverage

### Creator First, Always
The CLI prioritizes **creator productivity**—reducing friction in identity tool development—through **intuitive workflows** and comprehensive documentation.

### User Sovereignty
CLI ensures developers can **export** configurations, **migrate** between versions, and **delete** project data without **lock-in**.

### Proof-First Trust
Every CLI operation provides **cryptographic verification** and **audit trails**; generated code includes verification patterns by default.

### Inclusive Integration
CLI includes **low-bandwidth** modes, **offline** capabilities, and **accessibility** features ensuring all developers can participate.

### Community Collaboration
CLI tools are **open source** with **extensible plugin** architecture inviting **community** contributions and customization.

### Empowerment Over Extraction
CLI **empowers** developers with comprehensive tools rather than creating dependency on vendor **support** or premium features.

### Privacy by Design
CLI validates **privacy-preserving** patterns and includes **GDPR/CCPA** compliance checks in generated code and workflows.

### Modular & Open-Source Foundation
CLI validates **modular** composition and **interoperability**, ensuring generated code works without **vendor lock-in**.

### Security First
CLI enforces **secure by default** practices through templates, validation, and **security-first** code generation patterns.

### Resilience by Design
CLI includes **graceful degradation** testing and **offline** capabilities, ensuring development workflows remain functional during **disruption**. 