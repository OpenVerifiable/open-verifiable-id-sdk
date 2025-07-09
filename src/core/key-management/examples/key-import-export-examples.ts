/**
 * Key Import/Export Examples
 * 
 * Comprehensive examples demonstrating how to import and export keys
 * in various formats using the Open Verifiable ID SDK.
 */

import { 
  KeyManager, 
  createKeyManager,
  KeyImportExportFormat,
  KeyAlgorithm,
  importKey,
  exportKey,
  convertKeyFormat
} from '../index';

/**
 * Example 1: Basic Key Import/Export Operations
 */
export async function basicKeyImportExportExample() {
  console.log('=== Basic Key Import/Export Example ===');

  // Create a key manager
  const keyManager = createKeyManager({
    defaultAlgorithm: KeyAlgorithm.ED25519
  });

  // Generate a new key
  const keyId = await keyManager.generateKey('Ed25519');
  console.log('Generated key ID:', keyId);

  // Export the key in different formats
  const privateKey = await keyManager.exportKey(keyId, 'raw');
  const privateKeyBuffer = Buffer.from(privateKey, 'base64');

  // Export to base64
  const base64Result = await keyManager.exportKeyToBase64(privateKeyBuffer);
  console.log('Base64 export:', base64Result.data);

  // Export to mnemonic
  const mnemonicResult = await keyManager.exportKeyToMnemonic(privateKeyBuffer);
  console.log('Mnemonic export:', mnemonicResult.data);

  // Export to hex
  const hexResult = await keyManager.exportKeyToHex(privateKeyBuffer);
  console.log('Hex export:', hexResult.data);

  return {
    keyId,
    base64: base64Result.data,
    mnemonic: mnemonicResult.data,
    hex: hexResult.data
  };
}

/**
 * Example 2: Importing Keys from Different Formats
 */
export async function keyImportExample() {
  console.log('=== Key Import Example ===');

  // Sample key data (in practice, these would be real keys)
  const sampleBase64Key = 'dGVzdC1wcml2YXRlLWtleS1kYXRhLWZvci1kZW1vbnN0cmF0aW9u';
  const sampleMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const sampleHexKey = '746573742d707269766174652d6b65792d646174612d666f722d64656d6f6e7374726174696f6e';

  // Import from base64
  const base64Import = await importKey(sampleBase64Key, {
    format: KeyImportExportFormat.BASE64,
    algorithm: KeyAlgorithm.ED25519
  });
  console.log('Base64 import successful:', base64Import.metadata);

  // Import from mnemonic
  const mnemonicImport = await importKey(sampleMnemonic, {
    format: KeyImportExportFormat.MNEMONIC,
    algorithm: KeyAlgorithm.ED25519
  });
  console.log('Mnemonic import successful:', mnemonicImport.metadata);

  // Import from hex
  const hexImport = await importKey(sampleHexKey, {
    format: KeyImportExportFormat.HEX,
    algorithm: KeyAlgorithm.ED25519
  });
  console.log('Hex import successful:', hexImport.metadata);

  return {
    base64Import,
    mnemonicImport,
    hexImport
  };
}

/**
 * Example 3: Converting Between Key Formats
 */
export async function keyFormatConversionExample() {
  console.log('=== Key Format Conversion Example ===');

  // Start with a base64 key
  const originalBase64Key = 'dGVzdC1wcml2YXRlLWtleS1kYXRhLWZvci1kZW1vbnN0cmF0aW9u';

  // Convert base64 to mnemonic
  const base64ToMnemonic = await convertKeyFormat(
    originalBase64Key,
    KeyImportExportFormat.BASE64,
    KeyImportExportFormat.MNEMONIC
  );
  console.log('Base64 to Mnemonic:', base64ToMnemonic);

  // Convert mnemonic to hex
  const mnemonicToHex = await convertKeyFormat(
    base64ToMnemonic,
    KeyImportExportFormat.MNEMONIC,
    KeyImportExportFormat.HEX
  );
  console.log('Mnemonic to Hex:', mnemonicToHex);

  // Convert hex back to base64
  const hexToBase64 = await convertKeyFormat(
    mnemonicToHex,
    KeyImportExportFormat.HEX,
    KeyImportExportFormat.BASE64
  );
  console.log('Hex to Base64:', hexToBase64);

  // Verify the conversion is correct
  console.log('Conversion verification:', originalBase64Key === hexToBase64);

  return {
    original: originalBase64Key,
    base64ToMnemonic,
    mnemonicToHex,
    hexToBase64,
    isCorrect: originalBase64Key === hexToBase64
  };
}

/**
 * Example 4: Working with Real DID Keys
 */
export async function didKeyImportExportExample() {
  console.log('=== DID Key Import/Export Example ===');

  // Create a key manager
  const keyManager = createKeyManager();

  // Generate a new DID key
  const keyId = await keyManager.generateKey('Ed25519');
  const privateKey = await keyManager.exportKey(keyId, 'raw');
  const privateKeyBuffer = Buffer.from(privateKey, 'base64');

  // Export the DID key in different formats for backup/recovery
  const formats = {
    base64: await keyManager.exportKeyToBase64(privateKeyBuffer),
    mnemonic: await keyManager.exportKeyToMnemonic(privateKeyBuffer),
    hex: await keyManager.exportKeyToHex(privateKeyBuffer),
    base64WithPublicKey: await keyManager.exportKeyToBase64(privateKeyBuffer, true),
    hexWithPublicKey: await keyManager.exportKeyToHex(privateKeyBuffer, true)
  };

  console.log('DID Key exported in multiple formats:');
  console.log('- Base64 (private only):', formats.base64.data);
  console.log('- Mnemonic:', formats.mnemonic.data);
  console.log('- Hex (private only):', formats.hex.data);
  console.log('- Base64 (with public key):', formats.base64WithPublicKey.data);
  console.log('- Hex (with public key):', formats.hexWithPublicKey.data);

  // Demonstrate importing the key back from mnemonic
  const importedFromMnemonic = await keyManager.importKeyFromMnemonic(formats.mnemonic.data);
  console.log('Successfully imported from mnemonic:', importedFromMnemonic.metadata);

  return {
    keyId,
    formats,
    importedFromMnemonic
  };
}

/**
 * Example 5: Environment Variable Integration
 */
export async function environmentVariableIntegrationExample() {
  console.log('=== Environment Variable Integration Example ===');

  // Simulate environment variables (in practice, these would come from process.env)
  const envVars = {
    USER_DID_RECOVERY_PHRASE: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    USER_DID_PRIVATE_KEY_BASE64: 'dGVzdC1wcml2YXRlLWtleS1kYXRhLWZvci1kZW1vbnN0cmF0aW9u',
    USER_DID_PRIVATE_KEY_HEX: '746573742d707269766174652d6b65792d646174612d666f722d64656d6f6e7374726174696f6e'
  };

  const keyManager = createKeyManager();

  // Import from environment variables
  const imports = {
    fromMnemonic: await keyManager.importKeyFromMnemonic(envVars.USER_DID_RECOVERY_PHRASE),
    fromBase64: await keyManager.importKeyFromBase64(envVars.USER_DID_PRIVATE_KEY_BASE64),
    fromHex: await keyManager.importKeyFromHex(envVars.USER_DID_PRIVATE_KEY_HEX)
  };

  console.log('Successfully imported keys from environment variables:');
  console.log('- From mnemonic:', imports.fromMnemonic.metadata);
  console.log('- From base64:', imports.fromBase64.metadata);
  console.log('- From hex:', imports.fromHex.metadata);

  return {
    envVars,
    imports
  };
}

/**
 * Example 6: Key Validation and Error Handling
 */
export async function keyValidationExample() {
  console.log('=== Key Validation Example ===');

  const keyManager = createKeyManager();

  // Test valid keys
  const validKeys = {
    base64: 'dGVzdC1wcml2YXRlLWtleS1kYXRhLWZvci1kZW1vbnN0cmF0aW9u',
    mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    hex: '746573742d707269766174652d6b65792d646174612d666f722d64656d6f6e7374726174696f6e'
  };

  // Test invalid keys
  const invalidKeys = {
    base64: 'invalid-base64-data!@#',
    mnemonic: 'invalid mnemonic phrase',
    hex: 'invalid-hex-data!@#'
  };

  console.log('Testing valid keys...');
  for (const [format, key] of Object.entries(validKeys)) {
    try {
      const result = await keyManager.importKeyFromFormat(key, {
        format: format as KeyImportExportFormat,
        algorithm: KeyAlgorithm.ED25519
      });
      console.log(`✅ Valid ${format} key imported successfully`);
    } catch (error) {
      console.log(`❌ Failed to import valid ${format} key:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  console.log('\nTesting invalid keys...');
  for (const [format, key] of Object.entries(invalidKeys)) {
    try {
      const result = await keyManager.importKeyFromFormat(key, {
        format: format as KeyImportExportFormat,
        algorithm: KeyAlgorithm.ED25519
      });
      console.log(`❌ Invalid ${format} key was accepted (should have failed)`);
    } catch (error) {
      console.log(`✅ Invalid ${format} key correctly rejected:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return {
    validKeys,
    invalidKeys
  };
}

/**
 * Example 7: Complete Workflow - Generate, Export, Import, Use
 */
export async function completeWorkflowExample() {
  console.log('=== Complete Workflow Example ===');

  const keyManager = createKeyManager();

  // Step 1: Generate a new key
  console.log('Step 1: Generating new key...');
  const keyId = await keyManager.generateKey('Ed25519');
  const privateKey = await keyManager.exportKey(keyId, 'raw');
  const privateKeyBuffer = Buffer.from(privateKey, 'base64');

  // Step 2: Export in multiple formats for backup
  console.log('Step 2: Exporting key in multiple formats...');
  const exports = {
    mnemonic: await keyManager.exportKeyToMnemonic(privateKeyBuffer),
    base64: await keyManager.exportKeyToBase64(privateKeyBuffer),
    hex: await keyManager.exportKeyToHex(privateKeyBuffer)
  };

  // Step 3: Delete the original key (simulate key loss)
  console.log('Step 3: Deleting original key (simulating key loss)...');
  await keyManager.deleteKey(keyId);

  // Step 4: Import the key back from mnemonic
  console.log('Step 4: Importing key back from mnemonic...');
  const importedKey = await keyManager.importKeyFromMnemonic(exports.mnemonic.data);

  // Step 5: Use the imported key for signing
  console.log('Step 5: Using imported key for signing...');
  const testData = new TextEncoder().encode('Hello, Open Verifiable ID SDK!');
  const signature = await keyManager.sign(keyId, testData);

  console.log('✅ Complete workflow successful!');
  console.log('- Original key ID:', keyId);
  console.log('- Imported key metadata:', importedKey.metadata);
  console.log('- Signature length:', signature.length);

  return {
    keyId,
    exports,
    importedKey,
    signature
  };
}

// Export all examples for easy access
export const keyImportExportExamples = {
  basicKeyImportExportExample,
  keyImportExample,
  keyFormatConversionExample,
  didKeyImportExportExample,
  environmentVariableIntegrationExample,
  keyValidationExample,
  completeWorkflowExample
}; 