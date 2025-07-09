# Open Verifiable ID SDK Examples

This directory contains practical examples demonstrating how to use the Open Verifiable ID SDK for various use cases.

## Examples

### 1. DID Import Complete Workflow

**File:** `did-import-complete-workflow.ts`

**Description:** A comprehensive example demonstrating the complete workflow for importing a DID from package.json and using the TESTNET_HEX_KEY to sign verifiable credentials.

**Features:**
- ✅ Loads DID from package.json
- ✅ Uses TESTNET_HEX_KEY from environment variables
- ✅ Validates private key format
- ✅ Creates package agent
- ✅ Imports DID with private key
- ✅ Issues verifiable credentials
- ✅ Verifies credentials
- ✅ Manages credential storage
- ✅ Creates package-specific credentials

**Prerequisites:**
1. Set `TESTNET_HEX_KEY` in your `.env` file
2. Ensure `package.json` has a `did` field

**Usage:**
```bash
# Run with npm script
npm run example:did-import

# Or run directly with ts-node
npx ts-node examples/did-import-complete-workflow.ts
```

**Environment Setup:**
```bash
# Create .env file
echo "TESTNET_HEX_KEY=your_64_character_hex_private_key" > .env
```

**Expected Output:**
```
🚀 Starting DID Import Complete Workflow
==================================================
✅ Configuration loaded successfully
   DID: did:cheqd:testnet:a43b8c59-b0a1-58f7-a0b8-3b5016db93ff
   Private Key: 12345678...87654321
   Package: @open-verifiable/id-sdk@1.0.0

🔑 Step 1: Validating private key...
✅ Private key validation successful
   Private key length: 32 bytes
   Public key length: 32 bytes

🤖 Step 2: Creating package agent...
✅ Package agent created successfully
   Agent ID: package-open-verifiable-id-sdk-1.0.0
   Agent Type: package

📥 Step 3: Importing DID with private key...
✅ DID import successful
   Imported DID: did:cheqd:testnet:a43b8c59-b0a1-58f7-a0b8-3b5016db93ff
   Success: true
   Imported at: 2024-01-15T10:30:00.000Z

📜 Step 4: Creating and issuing verifiable credential...
✅ Credential issued successfully
   Credential ID: urn:uuid:12345678-1234-1234-1234-123456789abc
   Issuer: did:cheqd:testnet:a43b8c59-b0a1-58f7-a0b8-3b5016db93ff
   Type: VerifiableCredential, PackageIdentityCredential

🔍 Step 5: Verifying issued credential...
✅ Credential verification completed
   Valid: true
   Trust Status: TRUSTED
   Source: package-test-verification

💾 Step 6: Managing credentials...
✅ Credential stored successfully
✅ Found 1 stored credentials
   1. urn:uuid:12345678-1234-1234-1234-123456789abc (VerifiableCredential, PackageIdentityCredential)

📦 Step 7: Creating package-specific credentials...
✅ Package identity credential created
   ID: urn:uuid:87654321-4321-4321-4321-87654321cba
✅ Package release credential created
   ID: urn:uuid:abcdef12-3456-7890-abcd-ef1234567890
✅ Package credentials stored

🎉 Workflow completed successfully!
==================================================
✅ DID: did:cheqd:testnet:a43b8c59-b0a1-58f7-a0b8-3b5016db93ff
✅ Credential ID: urn:uuid:12345678-1234-1234-1234-123456789abc
✅ Verification: Valid

📊 Workflow Summary:
   Status: SUCCESS
   DID: did:cheqd:testnet:a43b8c59-b0a1-58f7-a0b8-3b5016db93ff
   Credential ID: urn:uuid:12345678-1234-1234-1234-123456789abc
   Verification: Valid

🧹 Cleaning up resources...
✅ Agent cleanup completed
```

### 2. Import DID and Sign (Legacy)

**File:** `import-did-and-sign.ts`

**Description:** A simpler example showing basic DID import and credential signing.

**Usage:**
```bash
npx ts-node examples/import-did-and-sign.ts
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TESTNET_HEX_KEY` | 64-character hex private key for testnet | `1234567890abcdef...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `CHEQD_TESTNET_RPC_URL` | Cheqd testnet RPC URL | `https://testnet.cheqd.network` |
| `CHEQD_MAINNET_RPC_URL` | Cheqd mainnet RPC URL | Not set |

## Package.json Configuration

Your `package.json` should include a DID field:

```json
{
  "name": "@your-package/name",
  "version": "1.0.0",
  "did": "did:cheqd:testnet:your-did-here",
  "testDid": "did:cheqd:testnet:your-test-did-here"
}
```

## Troubleshooting

### Common Issues

1. **"TESTNET_HEX_KEY not set"**
   - Ensure your `.env` file exists and contains the `TESTNET_HEX_KEY` variable
   - The key should be 64 characters long (32 bytes in hex)

2. **"No DID found in package.json"**
   - Add a `did` or `testDid` field to your `package.json`
   - Ensure the DID follows the correct format (e.g., `did:cheqd:testnet:...`)

3. **"Private key validation failed"**
   - Check that your hex key is valid (64 characters, hex format)
   - Ensure no extra spaces or characters

4. **"Agent creation failed"**
   - Check that all dependencies are installed
   - Ensure the SDK is properly built (`npm run build`)

### Debug Mode

To run with additional debugging information:

```bash
DEBUG=* npm run example:did-import
```

## Contributing

When adding new examples:

1. Follow the existing naming convention: `kebab-case.ts`
2. Include comprehensive documentation in the file header
3. Add a corresponding npm script in `package.json`
4. Update this README with the new example
5. Include error handling and cleanup
6. Add tests for the example functionality

## Security Notes

- Never commit private keys to version control
- Use environment variables for sensitive data
- The examples use testnet keys - never use mainnet keys in examples
- Always clean up resources after running examples 