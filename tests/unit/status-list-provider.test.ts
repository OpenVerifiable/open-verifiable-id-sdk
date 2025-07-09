import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StatusListProvider } from '../../src/core/revocation/status-list-provider';

const mockStatusListUrl = 'https://example.com/status-list/1';
const bitstring = '00010000'; // Only index 3 is revoked (1-based)
const encodedList = Buffer.from(bitstring, 'binary').toString('base64');

const mockStatusListVC = {
  credentialSubject: {
    encodedList,
  },
};

describe('StatusListProvider', () => {
  let provider: StatusListProvider;
  let fetchSpy: any;

  beforeEach(() => {
    provider = new StatusListProvider();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      // Accept string | URL | Request
      const url = typeof input === 'string' ? input : input?.url || String(input);
      expect(url).toBe(mockStatusListUrl);
      return {
        ok: true,
        json: async () => mockStatusListVC,
      } as any;
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns false for non-revoked index', async () => {
    const credential = {
      status: {
        statusListCredential: mockStatusListUrl,
        statusListIndex: '0', // bitstring[0] === '0'
      },
    };
    const result = await provider.checkRevocation(credential);
    expect(result).toBe(false);
  });

  it('returns true for revoked index', async () => {
    const credential = {
      status: {
        statusListCredential: mockStatusListUrl,
        statusListIndex: '3', // bitstring[3] === '1'
      },
    };
    const result = await provider.checkRevocation(credential);
    expect(result).toBe(true);
  });

  it('throws if statusListCredential or index missing', async () => {
    const credential = { status: {} };
    await expect(provider.checkRevocation(credential)).rejects.toThrow();
  });

  it('throws if fetch fails', async () => {
    fetchSpy.mockImplementationOnce(async () => ({ ok: false, status: 404 }));
    const credential = {
      status: {
        statusListCredential: mockStatusListUrl,
        statusListIndex: '0',
      },
    };
    await expect(provider.checkRevocation(credential)).rejects.toThrow('Failed to fetch status list VC: 404');
  });
}); 