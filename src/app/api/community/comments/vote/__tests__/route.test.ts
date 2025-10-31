/**
 * Tests for src/app/api/community/comments/vote/route.ts
 */

const upsertVote = jest.fn();
jest.mock('@/shared/lib/community/comments', () => ({
  communityComments: {
    upsertVote: (...args: any[]) => upsertVote(...args),
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

describe('community/comments/vote route', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 on invalid signature', async () => {
    const mod = await loadRoute();
    verifySignature.mockReturnValueOnce(false);
    const res = await mod.POST(buildPOST({ commentId: 'c', value: 1, address: '0x1111111111111111111111111111111111111111', signature: 's', nonce: 'n', timestamp: Date.now() }));
    expect(res.status).toBe(401);
  });

  test('200 on success with delta', async () => {
    const mod = await loadRoute();
    verifySignature.mockReturnValueOnce(true);
    consumeNonce.mockReturnValueOnce(true);
    upsertVote.mockResolvedValueOnce({ newValue: 1, delta: 1 });
    const res = await mod.POST(buildPOST({ commentId: 'c', value: 1, address: '0x1111111111111111111111111111111111111111', signature: 's', nonce: 'n', timestamp: Date.now() }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.value).toBe(1);
  });
});


