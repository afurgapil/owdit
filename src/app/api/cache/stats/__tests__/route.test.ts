/**
 * Tests for src/app/api/cache/stats/route.ts
 */

// Mock cache lib used by the route
const mockGetCacheStats = jest.fn();
const mockCleanExpiredCache = jest.fn();
jest.mock('../../../../../shared/lib/cache/mongodb', () => ({
  contractCache: {
    getCacheStats: (...args: any[]) => mockGetCacheStats(...args),
    cleanExpiredCache: (...args: any[]) => mockCleanExpiredCache(...args),
  },
}));
jest.mock('../../../../../shared/lib/cache/mongodb.ts', () => ({
  contractCache: {
    getCacheStats: (...args: any[]) => mockGetCacheStats(...args),
    cleanExpiredCache: (...args: any[]) => mockCleanExpiredCache(...args),
  },
}));

// Prevent ESM mongodb/bson from being loaded by any accidental import path resolution
jest.mock('mongodb', () => ({}), { virtual: true });

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

const loadCacheStatsRoute = async () => {
  let mod: any;
  jest.isolateModules(() => {
    mod = require('../route');
  });
  return mod;
};

describe('api/cache/stats route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  test('GET returns 500 on failure', async () => {
    const mod = await loadCacheStatsRoute();
    mockGetCacheStats.mockRejectedValueOnce(new Error('db down'));
    const res = await mod.GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Failed to get cache statistics');
  });

 

  test('DELETE returns 500 on failure', async () => {
    const mod = await loadCacheStatsRoute();
    mockCleanExpiredCache.mockRejectedValueOnce(new Error('db down'));
    const res = await mod.DELETE();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Failed to clean expired cache entries');
  });
});


