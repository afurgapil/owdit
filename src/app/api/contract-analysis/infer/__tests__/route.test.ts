/**
 * Tests for src/app/api/contract-analysis/infer/route.ts
 */

const inferRiskOn0G = jest.fn();
jest.mock('@/shared/lib/zeroG/infer', () => ({ inferRiskOn0G: (...args: any[]) => inferRiskOn0G(...args) }));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: (init && init.status) || 200,
      async json() { return body; },
    }),
  },
}), { virtual: true });

// mock logger/genRequestId
jest.mock('@/shared/lib/logger', () => ({
  genRequestId: () => 'id',
  logger: { with: () => ({ info: jest.fn(), warn: jest.fn() }), error: jest.fn() },
}));

const buildPOST = (body: any) => ({ json: async () => body }) as any;
const loadRoute = async () => { let m:any; jest.isolateModules(()=>{ m = require('../route'); }); return m; };

describe('contract-analysis/infer route', () => {
  beforeEach(() => jest.clearAllMocks());

  test('400 on invalid body', async () => {
    const mod = await loadRoute();
    const res = await mod.POST(buildPOST({}));
    expect(res.status).toBe(400);
  });

  test('200 on success with 0G output', async () => {
    const mod = await loadRoute();
    inferRiskOn0G.mockResolvedValueOnce({ score: 20, reason: 'risk' });
    const res = await mod.POST(buildPOST({ features: { selectors: [] } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.score).toBe(80); // safety = 100 - risk
  });

  test('200 on fallback heuristic when 0G fails', async () => {
    const mod = await loadRoute();
    inferRiskOn0G.mockRejectedValueOnce(new Error('timeout'));
    const res = await mod.POST(buildPOST({ features: { opcodeCounters: { DELEGATECALL: 1 } } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.data.score).toBe('number');
  });
});


