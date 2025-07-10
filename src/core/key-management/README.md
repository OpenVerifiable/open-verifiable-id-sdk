# Key Management - Import/Export Functionality

The Open Verifiable ID SDK provides comprehensive key import and export capabilities supporting multiple formats including base64, mnemonic (BIP39), hex, JWK, and PEM.

## Overview

The key import/export functionality allows users to:

- Import keys from various formats (base64, mnemonic, hex, JWK, PEM)
- Export keys to different formats for backup and recovery
- Convert between key formats seamlessly
- Validate key formats before import
- Work with both private keys only and private+public key pairs

## Supported Formats

| Format | Description | Use Case |
|--------|-------------|----------|
| `BASE64` | Base64 encoded key data | Standard encoding for binary data |
| `MNEMONIC` | BIP39 mnemonic phrase | Human-readable backup and recovery |
| `HEX` | Hexadecimal string | Compact representation |
| `JWK` | JSON Web Key format | Web standards compliance |
| `PEM` | Privacy Enhanced Mail format | Traditional key exchange |
| `RAW` | Raw binary data | Direct binary access |

## Quick Start

### Basic Import/Export

```typescript
import { 
  createKeyManager, 
  KeyImportExportFormat,
  KeyAlgorithm 
} from '@/core/key-management';

// Create a key manager
const keyManager = createKeyManager({
  defaultAlgorithm: KeyAlgorithm.ED25519
});

// Generate a new key
const keyId = await keyManager.generateKey('Ed25519');
const privateKey = await keyManager.exportKey(keyId, 'raw');
const privateKeyBuffer = Buffer.from(privateKey, 'base64');

// Export to different formats
const base64Export = await keyManager.exportKeyToBase64(privateKeyBuffer);
const mnemonicExport = await keyManager.exportKeyToMnemonic(privateKeyBuffer);
const hexExport = await keyManager.exportKeyToHex(privateKeyBuffer);

console.log('Base64:', base64Export.data);
console.log('Mnemonic:', mnemonicExport.data);
console.log('Hex:', hexExport.data);
```

### Importing Keys

```typescript
// Import from mnemonic
const importedFromMnemonic = await keyManager.importKeyFromMnemonic(
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
);

// Import from base64
const importedFromBase64 = await keyManager.importKeyFromBase64(
  'dGVzdC1wcml2YXRlLWtleS1kYXRhLWZvci1kZW1vbnN0cmF0aW9u'
);

// Import from hex
const importedFromHex = await keyManager.importKeyFromHex(
  '746573742d707269766174652d6b65792d646174612d666f722d64656d6f6e7374726174696f6e'
);
```

## API Reference

### KeyManager Methods

#### `importKeyFromFormat(keyData: string, options: KeyImportExportOptions): Promise<KeyImportFormatResult>`

Import a key from any supported format.

**Parameters:**
- `keyData`: The key data as a string
- `options`: Import options including format and algorithm

**Returns:** Promise with import result including private key, public key, and metadata

#### `exportKeyToFormat(privateKey: Uint8Array, options: KeyExportFormatOptions): Promise<KeyExportFormatResult>`

Export a key to any supported format.

**Parameters:**
- `privateKey`: The private key as Uint8Array
- `options`: Export options including format and whether to include public key

**Returns:** Promise with export result including formatted data and metadata

#### `convertKeyFormat(keyData: string, fromFormat: KeyImportExportFormat, toFormat: KeyImportExportFormat, options?: object): Promise<string>`

Convert a key between different formats.

**Parameters:**
- `keyData`: The key data to convert
- `fromFormat`: Source format
- `toFormat`: Target format
- `options`: Optional conversion options

**Returns:** Promise with converted key data

### Convenience Methods

#### `importKeyFromBase64(keyData: string, algorithm?: KeyAlgorithm): Promise<KeyImportFormatResult>`
#### `importKeyFromMnemonic(mnemonic: string, algorithm?: KeyAlgorithm): Promise<KeyImportFormatResult>`
#### `importKeyFromHex(hexData: string, algorithm?: KeyAlgorithm): Promise<KeyImportFormatResult>`

#### `exportKeyToBase64(privateKey: Uint8Array, includePublicKey?: boolean): Promise<KeyExportFormatResult>`
#### `exportKeyToMnemonic(privateKey: Uint8Array): Promise<KeyExportFormatResult>`
#### `exportKeyToHex(privateKey: Uint8Array, includePublicKey?: boolean): Promise<KeyExportFormatResult>`

### Standalone Functions

#### `importKey(keyData: string, options: KeyImportOptions): Promise<KeyImportResult>`
#### `exportKey(privateKey: Uint8Array, options: KeyExportOptions): Promise<KeyExportResult>`
#### `convertKeyFormat(keyData: string, fromFormat: KeyImportExportFormat, toFormat: KeyImportExportFormat, options?: object): Promise<string>`
#### `validateKeyFormat(keyData: string, format: KeyImportExportFormat): boolean`

## Environment Variable Integration

The SDK supports importing keys directly from environment variables, making it easy to integrate with existing deployment workflows:

```typescript
// Import from environment variables
const userDidMnemonic = process.env.USER_DID_RECOVERY_PHRASE;
const userDidBase64 = process.env.USER_DID_PRIVATE_KEY_BASE64;
const userDidHex = process.env.USER_DID_PRIVATE_KEY_HEX;

if (userDidMnemonic) {
  const importedKey = await keyManager.importKeyFromMnemonic(userDidMnemonic);
  console.log('Imported from mnemonic:', importedKey.metadata);
}

if (userDidBase64) {
  const importedKey = await keyManager.importKeyFromBase64(userDidBase64);
  console.log('Imported from base64:', importedKey.metadata);
}

if (userDidHex) {
  const importedKey = await keyManager.importKeyFromHex(userDidHex);
  console.log('Imported from hex:', importedKey.metadata);
}
```

## DID Key Management

The key import/export functionality is particularly useful for DID key management:

```typescript
// Generate a new DID key
const keyId = await keyManager.generateKey('Ed25519');
const privateKey = await keyManager.exportKey(keyId, 'raw');
const privateKeyBuffer = Buffer.from(privateKey, 'base64');

// Export in multiple formats for backup
const backupFormats = {
  mnemonic: await keyManager.exportKeyToMnemonic(privateKeyBuffer),
  base64: await keyManager.exportKeyToBase64(privateKeyBuffer),
  hex: await keyManager.exportKeyToHex(privateKeyBuffer)
};

// Store backup formats securely
console.log('Backup your DID key in these formats:');
console.log('Mnemonic:', backupFormats.mnemonic.data);
console.log('Base64:', backupFormats.base64.data);
console.log('Hex:', backupFormats.hex.data);

// Later, recover the key from any format
const recoveredKey = await keyManager.importKeyFromMnemonic(backupFormats.mnemonic.data);
```

## Format Conversion Examples

### Base64 ↔ Mnemonic

```typescript
// Convert base64 to mnemonic
const base64Key = 'dGVzdC1wcml2YXRlLWtleS1kYXRhLWZvci1kZW1vbnN0cmF0aW9u';
const mnemonic = await convertKeyFormat(
  base64Key,
  KeyImportExportFormat.BASE64,
  KeyImportExportFormat.MNEMONIC
);
console.log('Mnemonic:', mnemonic);

// Convert mnemonic back to base64
const base64Back = await convertKeyFormat(
  mnemonic,
  KeyImportExportFormat.MNEMONIC,
  KeyImportExportFormat.BASE64
);
console.log('Base64 back:', base64Back);
```

### Hex ↔ Mnemonic

```typescript
// Convert hex to mnemonic
const hexKey = '746573742d707269766174652d6b65792d646174612d666f722d64656d6f6e7374726174696f6e';
const mnemonic = await convertKeyFormat(
  hexKey,
  KeyImportExportFormat.HEX,
  KeyImportExportFormat.MNEMONIC
);
console.log('Mnemonic:', mnemonic);
```

## Validation and Error Handling

The SDK provides comprehensive validation for all key formats:

```typescript
// Validate key formats before import
const isValidBase64 = validateKeyFormat(base64Key, KeyImportExportFormat.BASE64);
const isValidMnemonic = validateKeyFormat(mnemonic, KeyImportExportFormat.MNEMONIC);
const isValidHex = validateKeyFormat(hexKey, KeyImportExportFormat.HEX);

if (isValidMnemonic) {
  try {
    const importedKey = await keyManager.importKeyFromMnemonic(mnemonic);
    console.log('Successfully imported key:', importedKey.metadata);
  } catch (error) {
    console.error('Failed to import key:', error.message);
  }
}
```

## Security Considerations

1. **Secure Storage**: Always store private keys securely, especially mnemonic phrases
2. **Environment Variables**: Use secure environment variable management in production
3. **Key Rotation**: Regularly rotate keys and update backups
4. **Validation**: Always validate key formats before import
5. **Checksums**: The SDK includes checksums for key integrity verification

## Examples

See the complete examples in `examples/key-import-export-examples.ts` for:

- Basic import/export operations
- Format conversion workflows
- DID key management
- Environment variable integration
- Validation and error handling
- Complete end-to-end workflows

## Dependencies

The key import/export functionality requires:

- `bip39`: For mnemonic phrase generation and validation
- `@scure/bip39`: For BIP39 wordlist support
- `@noble/ed25519`: For Ed25519 key operations
- `crypto`: For cryptographic operations (Node.js built-in)

## Migration from Legacy SDKs

If you're migrating from legacy SDKs, the new functionality provides a more comprehensive and standardized approach:

```typescript
// Old legacy SDK approach
import { convertRecoveryToPrivateKey, convertPrivateKeyToRecovery } from 'legacy-sdk';

// New open-verifiable-id-sdk approach
import { importKey, exportKey, convertKeyFormat } from '@/core/key-management';

// More flexible and comprehensive
const importedKey = await importKey(mnemonic, {
  format: KeyImportExportFormat.MNEMONIC,
  algorithm: KeyAlgorithm.ED25519
});

const exportedMnemonic = await exportKey(privateKey, {
  format: KeyImportExportFormat.MNEMONIC
});
``` 