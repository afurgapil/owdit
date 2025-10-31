/**
 * Tests for src/app/api/community/comments/route.ts
 */

// Mock community store
const listByContract = jest.fn();
const listReplies = jest.fn();
const create = jest.fn();
jest.mock('@/shared/lib/community/comments', () => ({
  communityComments: {
    listByContract: (...args: any[]) => listByContract(...args),
    listReplies: (...args: any[]) => listReplies(...args),
    create: (...args: any[]) => create(...args),
  },
}));

// Mock auth/signature helpers
const buildSignMessage = jest.fn(() => 'msg');
const verifySignature = jest.fn(() => true);
const consumeNonce = jest.fn(() => true);
jest.mock('@/shared/lib/auth/signature', () => ({
  buildSignMessage: (...args: any[]) => buildSignMessage(...args),
  verifySignature: (...args: any[]) => verifySignature(...args),
  consumeNonce: (...args: any[]) => consumeNonce(...args),
}));

// Provide a lightweight NextResponse.json to avoid Next internals
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: (init && init.status) || 200,
      async json() { return body; },
    }),
  },
}), { virtual: true });

const buildGET = (url: string) => ({ url, headers: new Map() }) as any;
const buildPOST = (body: any, headers?: Record<string, string>) => ({
  json: async () => body,
  headers: {
    get: (k: string) => (headers && headers[k.toLowerCase()]) || undefined,
  },
}) as any;

const loadRoute = async () => {
  let mod: any;
  jest.isolateModules(() => {
    mod = require('../route');
  });
  return mod;
};

describe('community/comments route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET 400 when missing contractAddress', async () => {
    const mod = await loadRoute();
    const res = await mod.GET(buildGET('https://x/api?limit=10'));
    expect(res.status).toBe(400);
  });

  test('GET returns items without replies when includeReplies=false', async () => {
    const mod = await loadRoute();
    listByContract.mockResolvedValueOnce({ items: [{ _id: '1' }], total: 1, hasMore: false });
    const res = await mod.GET(buildGET('https://x/api?contractAddress=0xabc&chainId=1&includeReplies=false'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.items).toHaveLength(1);
    expect(listReplies).not.toHaveBeenCalled();
  });

  test('GET returns items with replies when includeReplies=true', async () => {
    const mod = await loadRoute();
    listByContract.mockResolvedValueOnce({ items: [{ _id: '1' }], total: 1, hasMore: false });
    listReplies.mockResolvedValueOnce([{ _id: 'r1' }]);
    const res = await mod.GET(buildGET('https://x/api?contractAddress=0xabc&chainId=1&includeReplies=true'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.items[0].replies[0]._id).toBe('r1');
  });

  test('POST 401 on invalid signature', async () => {
    const mod = await loadRoute();
    verifySignature.mockReturnValueOnce(false);
    const res = await mod.POST(buildPOST({
      _id: 'c1',
      contractAddress: '0x1111111111111111111111111111111111111111',
      chainId: 1,
      message: 'hi',
      artifacts: [],
      author: { address: '0x1111111111111111111111111111111111111111', displayName: 'd' },
      moderation: { status: 'approved' },
      address: '0x1111111111111111111111111111111111111111',
      signature: 'sig',
      nonce: 'n',
      timestamp: Date.now(),
    }, { 'x-forwarded-for': '1.1.1.1' }));
    expect(res.status).toBe(401);
  });

  test('POST 401 on invalid nonce', async () => {
    const mod = await loadRoute();
    verifySignature.mockReturnValueOnce(true);
    consumeNonce.mockReturnValueOnce(false);
    const res = await mod.POST(buildPOST({
      _id: 'c1',
      contractAddress: '0x1111111111111111111111111111111111111111',
      chainId: 1,
      message: 'hi',
      artifacts: [],
      author: { address: '0x1111111111111111111111111111111111111111', displayName: 'd' },
      moderation: { status: 'approved' },
      address: '0x1111111111111111111111111111111111111111',
      signature: 'sig',
      nonce: 'n',
      timestamp: Date.now(),
    }, { 'x-forwarded-for': '1.1.1.1' }));
    expect(res.status).toBe(401);
  });

  test('POST 201 on success', async () => {
    const mod = await loadRoute();
    verifySignature.mockReturnValueOnce(true);
    consumeNonce.mockReturnValueOnce(true);
    create.mockResolvedValueOnce({ _id: 'c1' });
    const res = await mod.POST(buildPOST({
      _id: 'c1',
      contractAddress: '0x1111111111111111111111111111111111111111',
      chainId: 1,
      message: 'hi',
      artifacts: [],
      author: { address: '0x1111111111111111111111111111111111111111', displayName: 'd' },
      moderation: { status: 'approved' },
      address: '0x1111111111111111111111111111111111111111',
      signature: 'sig',
      nonce: 'n',
      timestamp: Date.now(),
    }, { 'x-forwarded-for': '1.1.1.1' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});


