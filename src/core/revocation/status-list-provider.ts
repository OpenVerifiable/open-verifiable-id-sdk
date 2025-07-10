import type { RevocationProvider, RevocationMetadata } from './client';

/**
 * StatusListProvider for W3C Status List 2021/2022
 * Checks revocation status using status list credentials (bitstring/encoded)
 */
export class StatusListProvider implements RevocationProvider {
  name = 'status-list';
  description = 'W3C Status List 2021/2022 provider';

  async isAvailable(): Promise<boolean> {
    return true; // Always available if fetch is available
  }

  /**
   * Checks revocation status for a credential using its status list entry
   * @param credentialOrId - The credential object (must have .status) or just the credentialId (unsupported)
   */
  async checkRevocation(credentialOrId: any): Promise<boolean> {
    // Accepts either the credential object or the credentialId (if only id, cannot check)
    const credential = typeof credentialOrId === 'object' ? credentialOrId : null;
    if (!credential || !credential.status) {
      throw new Error('StatusListProvider requires the full credential with a status property');
    }
    const status = credential.status;
    // Support both array and object for status
    const statusEntry = Array.isArray(status)
      ? status.find((s) => s.statusListCredential && s.statusListIndex)
      : status;
    if (!statusEntry || !statusEntry.statusListCredential || statusEntry.statusListIndex == null) {
      throw new Error('Credential missing statusListCredential or statusListIndex');
    }
    const listUrl = statusEntry.statusListCredential;
    const index = parseInt(statusEntry.statusListIndex, 10);
    if (isNaN(index)) throw new Error('Invalid statusListIndex');

    // Fetch the status list VC
    const res = await fetch(listUrl);
    if (!res.ok) throw new Error(`Failed to fetch status list VC: ${res.status}`);
    const statusListVc = await res.json();

    // Find the encoded bitstring
    const encodedList = statusListVc.credentialSubject?.encodedList;
    if (!encodedList) throw new Error('Status list VC missing credentialSubject.encodedList');

    // Decode the bitstring (base64 or base64url)
    const bitstring = this.decodeStatusList(encodedList);
    // Check the bit at the given index
    const isRevoked = bitstring[index] === '1';
    return isRevoked;
  }

  /**
   * Optionally returns revocation metadata (not implemented)
   */
  async getMetadata(credentialOrId: any): Promise<RevocationMetadata | null> {
    return null; // Could be extended to return more info
  }

  /**
   * Decodes a base64/base64url-encoded status list bitstring to a string of 0s and 1s
   */
  private decodeStatusList(encoded: string): string {
    // Normalize base64url to base64
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Decode to binary
    const binary = typeof Buffer !== 'undefined'
      ? Buffer.from(b64, 'base64')
      : Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    // Convert to bitstring
    let bits = '';
    for (let i = 0; i < binary.length; i++) {
      bits += binary[i].toString(2).padStart(8, '0');
    }
    return bits;
  }
} 