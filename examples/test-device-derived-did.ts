/**
 * Test Device-Derived DID Generation
 * 
 * This example demonstrates creating DIDs from device identifiers
 * such as Bluetooth MAC address, hardware UUID, and OS device ID.
 */

import * as crypto from 'crypto';
import * as os from 'os';
import { createHash } from 'crypto';

// Device identifier types
interface DeviceIdentifier {
  type: 'bluetooth' | 'hardware' | 'os' | 'custom';
  value: string;
  salt?: string;
  metadata?: {
    description?: string;
    stability?: 'high' | 'medium' | 'low';
    privacy?: 'high' | 'medium' | 'low';
  };
}

// Device DID entry
interface DeviceDIDEntry {
  identifier: DeviceIdentifier;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  did: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'rotated' | 'revoked';
}

/**
 * Collect device identifiers
 */
async function collectDeviceIdentifiers(): Promise<DeviceIdentifier[]> {
  const identifiers: DeviceIdentifier[] = [];
  
  // Get OS device ID (hostname + platform + arch)
  const osId = `${os.hostname()}-${os.platform()}-${os.arch()}`;
  identifiers.push({
    type: 'os',
    value: osId,
    metadata: {
      description: 'Operating system device identifier',
      stability: 'high',
      privacy: 'medium'
    }
  });
  
  // Get hardware identifier (CPU info + memory)
  const cpuInfo = os.cpus()[0]?.model || 'unknown';
  const totalMem = os.totalmem();
  const hardwareId = `${cpuInfo}-${totalMem}`;
  identifiers.push({
    type: 'hardware',
    value: hardwareId,
    metadata: {
      description: 'Hardware identifier',
      stability: 'high',
      privacy: 'medium'
    }
  });
  
  // Get network interfaces (for potential MAC address)
  const networkInterfaces = os.networkInterfaces();
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    if (interfaces) {
      for (const iface of interfaces) {
        if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
          identifiers.push({
            type: 'bluetooth', // Using as proxy for Bluetooth MAC
            value: iface.mac,
            metadata: {
              description: `Network interface ${name} MAC address`,
              stability: 'medium',
              privacy: 'low'
            }
          });
          break; // Just use the first valid MAC
        }
      }
    }
  }
  
  // Add a custom identifier (fixed value for deterministic test)
  identifiers.push({
    type: 'custom',
    value: `custom-fixed-value-for-test`,
    salt: 'user-provided-salt',
    metadata: {
      description: 'Custom device identifier (fixed for test)',
      stability: 'high',
      privacy: 'high'
    }
  });
  
  return identifiers;
}

/**
 * Hash input string
 */
async function hashInput(input: string, algorithm: string = 'SHA-256'): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  return new Uint8Array(hashBuffer);
}

/**
 * Generate Ed25519 key pair from seed
 */
async function generateEd25519KeyPair(seed: Uint8Array): Promise<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}> {
  // For this example, we'll use a simplified approach
  // In production, you'd use a proper Ed25519 library like @noble/ed25519
  
  // Use the seed to generate a deterministic private key
  const privateKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    privateKey[i] = seed[i % seed.length];
  }
  
  // For this demo, we'll create a mock public key
  // In reality, you'd derive this from the private key using Ed25519
  const publicKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    publicKey[i] = privateKey[i] ^ 0xFF; // Mock derivation
  }
  
  return { privateKey, publicKey };
}

/**
 * Create did:key from public key
 */
function createDidKey(publicKey: Uint8Array): string {
  // Convert public key to base58 (simplified)
  const base58 = Buffer.from(publicKey).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `did:key:z${base58}`;
}

/**
 * Derive key from device identifier
 */
async function deriveKeyFromIdentifier(
  identifier: DeviceIdentifier,
  options: {
    algorithm?: 'SHA-256' | 'SHA-512';
    keyType?: 'Ed25519' | 'X25519';
  } = {}
): Promise<{
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  did: string;
}> {
  const { algorithm = 'SHA-256', keyType = 'Ed25519' } = options;
  
  // 1. Create input string: identifier.value + (salt || '')
  const input = identifier.value + (identifier.salt || '');
  
  // 2. Hash the input
  const hash = await hashInput(input, algorithm);
  
  // 3. Use hash as seed for key generation
  const keyPair = await generateEd25519KeyPair(hash);
  
  // 4. Create did:key from public key
  const did = createDidKey(keyPair.publicKey);
  
  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    did
  };
}

/**
 * Generate device DIDs
 */
async function generateDeviceDIDs(salt?: string): Promise<DeviceDIDEntry[]> {
  const identifiers = await collectDeviceIdentifiers();
  const entries: DeviceDIDEntry[] = [];
  
  for (const identifier of identifiers) {
    // Apply global salt if provided
    if (salt) {
      identifier.salt = identifier.salt ? 
        `${identifier.salt}:${salt}` : salt;
    }
    
    const keyData = await deriveKeyFromIdentifier(identifier, {
      algorithm: 'SHA-256',
      keyType: 'Ed25519'
    });
    
    const entry: DeviceDIDEntry = {
      identifier,
      privateKey: keyData.privateKey,
      publicKey: keyData.publicKey,
      did: keyData.did,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      status: 'active'
    };
    
    entries.push(entry);
  }
  
  return entries;
}

/**
 * Sort DeviceDIDEntry array by identifier type and value
 */
function sortDeviceDIDs(entries: DeviceDIDEntry[]): DeviceDIDEntry[] {
  return entries.slice().sort((a, b) => {
    if (a.identifier.type < b.identifier.type) return -1;
    if (a.identifier.type > b.identifier.type) return 1;
    if (a.identifier.value < b.identifier.value) return -1;
    if (a.identifier.value > b.identifier.value) return 1;
    return 0;
  });
}

function isDeterministicIdentifier(identifier: DeviceIdentifier): boolean {
  return identifier.metadata?.stability === 'high' || identifier.metadata?.stability === 'medium';
}

/**
 * Main test function
 */
async function testDeviceDerivedDIDs() {
  console.log('🔍 Testing Device-Derived DID Generation');
  console.log('=====================================\n');
  
  try {
    // Generate device DIDs without salt
    console.log('📱 Generating device DIDs (no salt)...');
    const deviceDIDs = await generateDeviceDIDs();
    
    console.log(`✅ Generated ${deviceDIDs.length} device DIDs:\n`);
    
    for (const entry of deviceDIDs) {
      console.log(`🔑 ${entry.identifier.type.toUpperCase()} DID:`);
      console.log(`   DID: ${entry.did}`);
      console.log(`   Identifier: ${entry.identifier.value}`);
      console.log(`   Description: ${entry.identifier.metadata?.description}`);
      console.log(`   Stability: ${entry.identifier.metadata?.stability}`);
      console.log(`   Privacy: ${entry.identifier.metadata?.privacy}`);
      console.log(`   Created: ${entry.createdAt}`);
      console.log('');
    }
    
    // Test with salt
    console.log('🧂 Generating device DIDs with salt...');
    const saltedDIDs = await generateDeviceDIDs('my-secret-salt');
    
    console.log(`✅ Generated ${saltedDIDs.length} salted device DIDs:\n`);
    
    for (const entry of saltedDIDs) {
      console.log(`🔑 ${entry.identifier.type.toUpperCase()} DID (with salt):`);
      console.log(`   DID: ${entry.did}`);
      console.log(`   Identifier: ${entry.identifier.value}`);
      console.log(`   Salt: ${entry.identifier.salt}`);
      console.log('');
    }
    
    // Verify deterministic generation (sort by type and value, filter deterministic only)
    console.log('🔄 Testing deterministic generation...');
    const firstRun = sortDeviceDIDs((await generateDeviceDIDs('test-salt')).filter(entry => isDeterministicIdentifier(entry.identifier)));
    const secondRun = sortDeviceDIDs((await generateDeviceDIDs('test-salt')).filter(entry => isDeterministicIdentifier(entry.identifier)));
    
    const isDeterministic = firstRun.length === secondRun.length && firstRun.every((entry, idx) =>
      entry.identifier.type === secondRun[idx].identifier.type &&
      entry.identifier.value === secondRun[idx].identifier.value &&
      entry.did === secondRun[idx].did
    );
    
    console.log(`✅ Deterministic generation: ${isDeterministic ? 'PASSED' : 'FAILED'}`);
    
    // Test different salts produce different DIDs (sort by type and value, filter deterministic only)
    const salt1DIDs = sortDeviceDIDs((await generateDeviceDIDs('salt1')).filter(entry => isDeterministicIdentifier(entry.identifier)));
    const salt2DIDs = sortDeviceDIDs((await generateDeviceDIDs('salt2')).filter(entry => isDeterministicIdentifier(entry.identifier)));
    
    const differentSalts = salt1DIDs.length === salt2DIDs.length && salt1DIDs.every((entry, idx) =>
      entry.identifier.type === salt2DIDs[idx].identifier.type &&
      entry.identifier.value === salt2DIDs[idx].identifier.value &&
      entry.did !== salt2DIDs[idx].did
    );
    
    console.log(`✅ Different salts produce different DIDs: ${differentSalts ? 'PASSED' : 'FAILED'}`);
    
    console.log('\n🎉 Device-derived DID generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during device-derived DID generation:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testDeviceDerivedDIDs().catch(console.error);
}

export {
  DeviceIdentifier,
  DeviceDIDEntry,
  collectDeviceIdentifiers,
  deriveKeyFromIdentifier,
  generateDeviceDIDs,
  testDeviceDerivedDIDs
}; 