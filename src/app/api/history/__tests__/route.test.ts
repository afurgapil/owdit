/**
 * Tests for src/app/api/history/route.ts
 */

const getHistory = jest.fn();
const getCacheStats = jest.fn();
jest.mock('@/shared/lib/cache/mongodb', () => ({
  contractCache: {
    getHistory: (...args: any[]) => getHistory(...args),
    getCacheStats: (...args: any[]) => getCacheStats(...args),
  },
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: (init && init.status) || 200,
      async json() { return body; },
    }),
  },
}), { virtual: true });

const buildGET = (url: string) => ({ url }) as any;
const loadRoute = async () => { let m:any; jest.isolateModules(()=>{ m = require('../route'); }); return m; };

describe('api/history route', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GET returns history and stats', async () => {
    const mod = await loadRoute();
    getHistory.mockResolvedValueOnce({ history: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } });
    getCacheStats.mockResolvedValueOnce({ totalCached: 1, upgradeableCached: 0, expiredCached: 0 });
    const res = await mod.GET(buildGET('http://x/api?limit=10&offset=0&search='));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.stats.totalCached).toBe(1);
  });

  test('GET returns 500 on error', async () => {
    const mod = await loadRoute();
    getHistory.mockRejectedValueOnce(new Error('db'));
    const res = await mod.GET(buildGET('http://x/api'));
    expect(res.status).toBe(500);
  });
});


