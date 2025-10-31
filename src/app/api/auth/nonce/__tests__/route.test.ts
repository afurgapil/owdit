/**
 * Tests for src/app/api/auth/nonce/route.ts
 */

// Mock signature helper used by the route
const createNonceMock = jest.fn((addr: string) => `nonce-${addr}`);
jest.mock('../../../../shared/lib/auth/signature', () => {
  return { createNonce: createNonceMock };
}, { virtual: true });

// Provide a lightweight NextResponse.json to avoid Next internals
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: (body: any, init?: { status?: number }) => ({
        status: (init && init.status) || 200,
        async json() { return body; },
      }),
    },
  };
}, { virtual: true });

// Helpers
const buildNonceBody = (body: any) => ({ json: async () => body }) as any;

const loadNonceRoute = async () => {
  let mod: any;
  jest.isolateModules(() => {
    mod = require('../route');
  });
  return mod;
};

describe('auth/nonce route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST returns nonce for valid address', async () => {
    const mod = await loadNonceRoute();
    const address = '0x1111111111111111111111111111111111111111';
    const res = await mod.POST(buildNonceBody({ address }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.address).toBe(address);
    expect(typeof json.data.nonce).toBe('string');
    expect(json.data.nonce.length).toBeGreaterThan(0);
  });

  test('POST returns 400 for invalid address', async () => {
    const mod = await loadNonceRoute();
    const res = await mod.POST(buildNonceBody({ address: 'bad-address' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe('string');
  });
});


