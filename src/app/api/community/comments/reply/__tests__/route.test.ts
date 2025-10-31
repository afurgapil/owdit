/**
 * Tests for src/app/api/community/comments/reply/route.ts
 */

const create = jest.fn();
jest.mock('@/shared/lib/community/comments', () => ({
  communityComments: {
    create: (...args: any[]) => create(...args),
  },
}));

const buildSignMessage = jest.fn(() => 'msg');
const verifySignature = jest.fn(() => true);
const consumeNonce = jest.fn(() => true);
jest.mock('@/shared/lib/auth/signature', () => ({
  buildSignMessage: (...args: any[]) => buildSignMessage(...args),
  verifySignature: (...args: any[]) => verifySignature(...args),
  consumeNonce: (...args: any[]) => consumeNonce(...args),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: (init && init.status) || 200,
      async json() { return body; },
    }),
  },
}), { virtual: true });

const buildPOST = (body: any) => ({ json: async () => body }) as any;
const loadRoute = async () => { let m:any; jest.isolateModules(()=>{ m = require('../route'); }); return m; };

describe('community/comments/reply route', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 on invalid signature', async () => {
    const mod = await loadRoute();
    verifySignature.mockReturnValueOnce(false);
    const res = await mod.POST(buildPOST({ parentId: 'p', chainId: 1, contractAddress: '0x1111111111111111111111111111111111111111', content: 'hi', address: '0x1111111111111111111111111111111111111111', signature: 's', nonce: 'n', timestamp: Date.now() }));
    expect(res.status).toBe(401);
  });

  test('201 on success', async () => {
    const mod = await loadRoute();
    verifySignature.mockReturnValueOnce(true);
    consumeNonce.mockReturnValueOnce(true);
    create.mockResolvedValueOnce({ _id: 'r1' });
    const res = await mod.POST(buildPOST({ parentId: 'p', chainId: 1, contractAddress: '0x1111111111111111111111111111111111111111', content: 'hi', address: '0x1111111111111111111111111111111111111111', signature: 's', nonce: 'n', timestamp: Date.now() }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});


