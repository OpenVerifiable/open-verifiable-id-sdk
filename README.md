# 🚀 Open Verifiable ID SDK

**Reference implementation for decentralized identity and verifiable credentials based on W3C VC 2.0 and DIF standards**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Cross-Platform](https://img.shields.io/badge/Platform-Node%20%7C%20Browser%20%7C%20React%20Native-green.svg)](https://github.com/open-verifiable/open-verifiable-id-sdk)
[![Version](https://img.shields.io/badge/Version-0.0.2-blue.svg)](https://www.npmjs.com/package/@openverifiable/open-verifiable-id-sdk)

## 📋 Overview

The Open Verifiable ID SDK is a comprehensive TypeScript implementation of decentralized identity standards, designed to provide a secure, cross-platform foundation for verifiable credential operations. This SDK serves as the reference implementation for the Open Verifiable ecosystem.

### ✨ Key Features

- **🌐 Cross-Platform**: Native support for Node.js, Browser, and React Native
- **🔐 W3C VC 2.0 Compliant**: Full support for W3C Verifiable Credentials 2.0 with Data Integrity Proofs
- **🏗️ Modular Architecture**: Extensible agent system with plugin support
- **🔒 Secure by Default**: Hardware-backed key storage and biometric authentication
- **🌱 Carbon Aware**: Built-in carbon tracking and optimization
- **📱 Offline First**: Full offline capability with intelligent sync
- **🤝 Trust Registry**: Local-first trust validation with community import
- **🧪 Comprehensive Testing**: Unit, integration, and end-to-end test suites
- **📦 End-to-End Workflows**: Complete DID, QR, Bluetooth, and storage workflows

## 🏗️ Architecture

Based on comprehensive ADRs, the SDK implements a 4-layer architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Tools Layer                    │
│  SDK Tools │ Type Generation │ Testing Framework │ LLM Docs │
├─────────────────────────────────────────────────────────────┤
│                    Integration Layer                        │
│ Trust Registry │ Schema Registry │ Carbon Tracking │ Bio Auth│
├─────────────────────────────────────────────────────────────┤
│                       Agent Layer                          │
│   User Agent  │ Package Agent │ Parent Agent │ Service Agent│
├─────────────────────────────────────────────────────────────┤
│                    Core SDK Layer                          │
│ W3C VC 2.0 │ DID Management │ Secure Storage │ Crypto Ops  │
└─────────────────────────────────────────────────────────────┘
```

## 🚧 Implementation Status

### ✅ **Phase 1: Foundation (COMPLETED)**

- [x] **Project Structure**: Cross-platform monorepo with TypeScript
- [x] **Platform Detection**: Platform-aware capabilities system
- [x] **Type System**: Comprehensive TypeScript definitions for all components
- [x] **Agent Architecture**: Extensible agent system with plugin support
- [x] **Configuration System**: Platform-aware SDK initialization
- [x] **W3C VC 2.0 Migration**: Data Integrity Proofs implementation
- [x] **Secure Storage**: Cross-platform encrypted storage
- [x] **DID Management**: Enhanced multi-method DID operations
- [x] **Core Agent Implementation**: UserAgent, PackageAgent, ParentAgent, ServiceAgent
- [x] **Plugin System**: Comprehensive plugin architecture with verification
- [x] **Testing Framework**: Unit, integration, and e2e test suites

### 🔄 **Phase 2: Core Features (IN PROGRESS)**

- [ ] **Trust Registry Client**: Local-first trust validation
- [ ] **Revocation Checking**: Credential revocation system
- [ ] **Schema Registry Integration**: Type generation from schemas
- [ ] **CLI Tooling**: Comprehensive command-line interface
- [ ] **Advanced Testing Framework**: Enhanced test coverage

### 📋 **Phase 3: Advanced Features (PLANNED)**

- [ ] **Carbon Awareness**: Environmental impact tracking
- [ ] **Biometric Auth**: Multi-platform biometric integration
- [ ] **Offline Caching**: Intelligent credential caching and sync
- [ ] **Performance Optimization**: Sub-2ms validation targets
- [ ] **Error Handling**: Comprehensive error recovery

### 🛠️ **Phase 4: Developer Experience (PLANNED)**

- [ ] **LLM Integration**: AI-friendly documentation and code generation
- [ ] **Cross-Platform Testing**: Node.js, Browser, React Native validation
- [ ] **Documentation**: Complete API documentation and examples
- [ ] **Community Testing**: Open source validation and feedback

## 🚀 Quick Start

### Installation

```bash
npm install @openverifiable/open-verifiable-id-sdk
```

### Basic Usage

```typescript
import { 
  PackageAgent,
  UserAgent,
  ParentAgent,
  ServiceAgent
} from '@openverifiable/open-verifiable-id-sdk';

// Create a package agent for software package identity
const packageAgent = new PackageAgent({
  packageName: '@my-org/my-package',
  packageVersion: '1.0.0'
});

await packageAgent.initialize();

// Create a DID
const { did } = await packageAgent.createDID('key', {
  alias: 'my-package-did'
});

// Issue a verifiable credential
const credential = await packageAgent.issueCredential({
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential', 'PackageIdentityCredential'],
  issuer: did,
  credentialSubject: {
    id: 'pkg:npm/@my-org/my-package',
    name: '@my-org/my-package',
    version: '1.0.0',
    description: 'My awesome package'
  },
  validFrom: new Date().toISOString()
});

// Verify the credential
const verificationResult = await packageAgent.verifyCredential(credential);
console.log('Credential valid:', verificationResult.isValid);
```

### Package Signing

The SDK includes package signing functionality that allows packages to sign and publish themselves with their own DID:

```typescript
import { createPackageSignerFromConfig } from '@openverifiable/open-verifiable-id-sdk';

// Create a package signer (reads package.json automatically)
const packageSigner = await createPackageSignerFromConfig('./package.json');

// Get package metadata
const metadata = await packageSigner.getPackageMetadata();

// Sign the package
const result = await packageSigner.signPackage({
  version: metadata.version,
  packageDID: metadata.did,
  createUniversalCredential: true,
  publishToDLR: true,
  publishToNPM: false
});

if (result.success) {
  console.log('✅ Package signed successfully!');
}
```

### End-to-End Workflows

The SDK includes comprehensive e2e workflow examples:

```typescript
// DID Import and Credential Workflow
import { runDIDWorkflow } from '@openverifiable/open-verifiable-id-sdk/examples';

// Complete workflow: key validation → DID creation → credential issuance → verification → storage
await runDIDWorkflow();

// QR Code Credential Exchange
import { runQRWorkflow } from '@openverifiable/open-verifiable-id-sdk/examples';

// QR workflow: credential creation → QR generation → data encoding → decoding → verification
await runQRWorkflow();

// Bluetooth Cross-Device Sync
import { runBluetoothWorkflow } from '@openverifiable/open-verifiable-id-sdk/examples';

// Bluetooth workflow: device discovery → connection → credential transfer → verification
await runBluetoothWorkflow();

// Storage and Backup
import { runStorageWorkflow } from '@openverifiable/open-verifiable-id-sdk/examples';

// Storage workflow: credential creation → storage → retrieval → backup → restore
await runStorageWorkflow();
```

## 🧪 Testing

The SDK includes a comprehensive test suite:

### Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── agents/             # Agent type tests
│   ├── did/                # DID management tests
│   ├── storage/            # Storage and encryption tests
│   ├── plugins/            # Plugin system tests
│   └── credentialing/      # Credential operations tests
├── integration/            # Integration tests for component interactions
├── e2e/                   # End-to-end workflow tests
│   ├── did-workflow.test.ts      # Complete DID workflows
│   ├── qr-workflow.test.ts       # QR code exchange workflows
│   ├── bluetooth-workflow.test.ts # Bluetooth sync workflows
│   └── storage-workflow.test.ts  # Storage and backup workflows
├── security/              # Security and cryptographic tests
└── performance/           # Performance and benchmark tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:performance

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📚 Documentation

### Architecture Decision Records (ADRs)

The SDK implementation is based on comprehensive ADRs located in the `architecture/` directory:

- **[ADR-0001](architecture/0001-w3c-vc-2.0-migration-strategy.md)**: W3C VC 2.0 Migration Strategy
- **[ADR-0002](architecture/0002-trust-registry-client-integration.md)**: Trust Registry Client Integration
- **[ADR-0003](architecture/0003-credential-revocation-checking.md)**: Credential Revocation Checking
- **[ADR-0004](architecture/0004-carbon-awareness-integration.md)**: Carbon Awareness Integration
- **[ADR-0005](architecture/0005-offline-credential-caching-and-sync.md)**: Offline Credential Caching and Sync
- **[ADR-0006](architecture/0006-secure-local-storage-for-keys-and-credentials.md)**: Secure Local Storage
- **[ADR-0007](architecture/0007-agent-architecture-and-extensibility.md)**: Agent Architecture and Extensibility
- **[ADR-0008](architecture/0008-biometric-authentication-integration.md)**: Biometric Authentication Integration
- **[ADR-0009](architecture/0009-testing-validation-strategy.md)**: Testing & Validation Strategy
- **[ADR-0010](architecture/0010-developer-experience-cli-tooling.md)**: Developer Experience & CLI Tooling
- **[ADR-0011](architecture/0011-llm-development-integration.md)**: LLM Development Integration
- **[ADR-0012](architecture/0012-error-handling-recovery-strategy.md)**: Error Handling & Recovery Strategy
- **[ADR-0013](architecture/0013-cross-platform-compatibility.md)**: Cross-Platform Compatibility
- **[ADR-0014](architecture/0014-sdk-performance-optimization.md)**: SDK Performance Optimization

### Examples and Demos

- **[DID Import Workflow](examples/did-import-complete-workflow.ts)**: Complete DID creation and credential workflow
- **[QR Code Demo](examples/qr-code-demo.ts)**: QR code generation and credential exchange
- **[Bluetooth Demo](examples/bluetooth-demo.ts)**: Cross-device credential transfer
- **[Package Identity](examples/package-identity-demo.ts)**: Software package identity management
- **[Release Signing](examples/release-signing-demo.ts)**: Software release verification

## 🛠️ Development

### Prerequisites

- Node.js 20+
- TypeScript 5.0+
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/open-verifiable/open-verifiable-id-sdk.git
cd open-verifiable-id-sdk

# Install dependencies
npm install

# Run type checking
npm run type-check

# Build for all platforms
npm run build

# Run tests
npm test
```

### Platform-Specific Development

```bash
# Node.js development
npm run dev

# Test on specific platforms
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Scripts and Utilities

```bash
# Generate types from schemas
npm run generate:types

# Validate schemas
npm run validate:schemas

# Run examples
npm run example:did-import
npm run example:cheqd-did
npm run example:device-did
```

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Status

This SDK has completed its core implementation and is ready for Phase 2 features. Current focus areas:

1. **Trust Registry**: Local-first trust validation system
2. **Revocation Checking**: Credential revocation and status checking
3. **Schema Registry**: Integration with Open Verifiable Schema Registry
4. **CLI Tooling**: Developer experience improvements
5. **Performance Optimization**: Sub-2ms validation targets

### Getting Involved

- 📧 **Email**: [open-verifiable@community.org](mailto:open-verifiable@community.org)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/open-verifiable/open-verifiable-id-sdk/discussions)
- 🐛 **Issues**: [GitHub Issues](https://github.com/open-verifiable/open-verifiable-id-sdk/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Open Verifiable Community**: For governance and standards development
- **W3C Credentials Community Group**: For W3C VC 2.0 specifications
- **DIF (Decentralized Identity Foundation)**: For interoperability standards
- **OriginVault Team**: For the original implementation inspiration

## 🔗 Related Projects

- **[Open Verifiable Schema Registry](https://github.com/open-verifiable/open-verifiable-schema-registry)**: Schema definitions and type generation
- **[Open Verifiable Architecture Decision Records](https://github.com/open-verifiable/open-verifiable-architecture-decision-records)**: Governance and technical decisions
- **[Legacy SDK](https://github.com/OriginVault/ov-id-sdk)**: Original implementation reference

---

**Built with ❤️ by the Open Verifiable Community** 