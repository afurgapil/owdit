import { GET, POST, PUT } from "../route";

const buildReq = (url: string, body?: any) => body ? ({ url, json: async () => body } as any) : ({ url } as any);

describe("analysis-progress API", () => {
  test("GET 400 missing params", async () => {
    const res = (await GET(buildReq("http://local/api/analysis-progress"))) as any;
    expect(res.status).toBe(400);
  });

  test("GET 404 when not found", async () => {
    const url = "http://local/api/analysis-progress?sessionId=s&contractAddress=0x1&chainId=1";
    const res = (await GET(buildReq(url))) as any;
    expect(res.status).toBe(404);
  });

  test("POST 400 invalid body", async () => {
    const res = (await POST(buildReq("http://local/api/analysis-progress", {}))) as any;
    expect(res.status).toBe(400);
  });

  test("POST 200 creates tracker and returns data", async () => {
    const res = (await POST(buildReq("http://local/api/analysis-progress", { sessionId: "s1", contractAddress: "0x1", chainId: 1, isVerified: true }))) as any;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("PUT 400 invalid action", async () => {
    const url = "http://local/api/analysis-progress";
    const res = (await PUT(buildReq(url, { sessionId: "s1", contractAddress: "0x1", chainId: 1, action: "bad", stepId: "x" }))) as any;
    expect(res.status).toBe(400);
  });

  test("PUT 404 unknown session", async () => {
    const url = "http://local/api/analysis-progress";
    const res = (await PUT(buildReq(url, { sessionId: "missing", contractAddress: "0x1", chainId: 1, action: "start", stepId: "x" }))) as any;
    expect(res.status).toBe(404);
  });

  test("PUT success start/update/complete/fail", async () => {
    // Create tracker first
    await POST(buildReq("http://local/api/analysis-progress", { sessionId: "s2", contractAddress: "0x1", chainId: 1, isVerified: false }));
    const url = "http://local/api/analysis-progress";
    const s = await PUT(buildReq(url, { sessionId: "s2", contractAddress: "0x1", chainId: 1, action: "start", stepId: "a", message: "start" })) as any;
    expect(s.status).toBe(200);
    const u = await PUT(buildReq(url, { sessionId: "s2", contractAddress: "0x1", chainId: 1, action: "update", stepId: "a", progress: 50, message: "half" })) as any;
    expect(u.status).toBe(200);
    const c = await PUT(buildReq(url, { sessionId: "s2", contractAddress: "0x1", chainId: 1, action: "complete", stepId: "a", message: "done" })) as any;
    expect(c.status).toBe(200);
    const f = await PUT(buildReq(url, { sessionId: "s2", contractAddress: "0x1", chainId: 1, action: "fail", stepId: "b", message: "err" })) as any;
    expect(f.status).toBe(200);
  });
});

/**
 * Tests for src/app/api/analysis-progress/route.ts
 */

// Mock the AnalysisProgressTracker module as used by route.ts
// Important: mock with the EXACT specifier used inside route.ts and mark it virtual
const trackerInstances: any[] = [];

jest.mock('../../../shared/lib/analysisProgress', () => {
  class MockTracker {
    private isVerified: boolean;
    private progress = 0;
    private stepId: string | null = null;
    private failed = false;
    private message: string | undefined;

    constructor(isVerified: boolean) {
      this.isVerified = isVerified;
      trackerInstances.push(this);
    }

    startStep(stepId: string, message?: string) {
      this.stepId = stepId;
      this.progress = 0;
      this.message = message;
    }
    updateProgress(stepId: string, progress: number, message?: string) {
      this.stepId = stepId;
      this.progress = progress;
      this.message = message;
    }
    completeStep(stepId: string, message?: string) {
      this.stepId = stepId;
      this.progress = 100;
      this.message = message;
    }
    failStep(stepId: string, message?: string) {
      this.stepId = stepId;
      this.failed = true;
      this.message = message;
    }
    getProgress() { return this.progress; }
    getOverallProgress() { return this.progress; }
    getCurrentStep() { return this.stepId; }
    isComplete() { return this.progress === 100 && !this.failed; }
    hasFailed() { return this.failed; }
  }

  return { AnalysisProgressTracker: MockTracker };
}, { virtual: true });

// Mock NextResponse.json to avoid Next internals that require edge runtime context
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

// Minimal helpers to create request-like objects consumed by handlers
const buildGET = (url: string) => ({ url }) as any;
const buildBody = (body: any) => ({ json: async () => body }) as any;

// Helper to load the route module in an isolated module registry so mocks apply
const loadRoute = async () => {
  let mod: any;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../route');
  });
  return mod;
};

// Override NextResponse.json at runtime (after module load) to a minimal shim
const overrideNextResponse = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ns = require('next/server');
  if (!ns.NextResponse) return;
  ns.NextResponse.json = (body: any, init?: { status?: number }) => ({
    status: (init && init.status) || 200,
    async json() { return body; },
  });
};

describe('analysis-progress route handlers', () => {
  beforeEach(() => {
    jest.resetModules();
    trackerInstances.length = 0;
  });

  test('GET returns 400 on missing params', async () => {
    const mod = await loadRoute();
    overrideNextResponse();
    const res = await mod.GET(buildGET('https://example.com/api/analysis-progress'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  test('GET returns 404 when no progress found', async () => {
    const mod = await loadRoute();
    overrideNextResponse();
    const url = 'https://example.com/api/analysis-progress?sessionId=s1&contractAddress=0xabc&chainId=1';
    const res = await mod.GET(buildGET(url));
    expect(res.status).toBe(404);
  });

  test('POST creates a tracker and returns initial data', async () => {
    const mod = await loadRoute();
    overrideNextResponse();
    const body = { sessionId: 's1', contractAddress: '0xabc', chainId: '1', isVerified: true };
    const res = await mod.POST(buildBody(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({ sessionId: 's1', contractAddress: '0xabc', chainId: '1', isVerified: true });
  });

  test('PUT returns 400 on missing params', async () => {
    const mod = await loadRoute();
    overrideNextResponse();
    const res = await mod.PUT(buildBody({}));
    expect(res.status).toBe(400);
  });

  test('PUT returns 404 if tracker not found', async () => {
    const mod = await loadRoute();
    overrideNextResponse();
    const body = { sessionId: 'sX', contractAddress: '0xno', chainId: '1', action: 'start', stepId: 'step1' };
    const res = await mod.PUT(buildBody(body));
    expect(res.status).toBe(404);
  });

  test('PUT start/update/complete/fail flows update tracker and return progress', async () => {
    const mod = await loadRoute();
    overrideNextResponse();
    const base = { sessionId: 's2', contractAddress: '0xabc', chainId: '1', isVerified: false };
    await mod.POST(buildBody(base));

    // start first valid step for unverified: check_cache
    let res: any = await mod.PUT(buildBody({ ...base, action: 'start', stepId: 'check_cache' }));
    expect(res.status).toBe(200);
    let json: any = await res.json();
    expect(json.data.currentStep).toBeTruthy();
    expect(json.data.currentStep.step).toBe('check_cache');

    res = await mod.PUT(buildBody({ ...base, action: 'update', stepId: 'check_cache', progress: 40 }));
    json = await res.json();
    expect(Array.isArray(json.data.progress)).toBe(true);
    expect(json.data.progress[0].progress).toBe(40);

    res = await mod.PUT(buildBody({ ...base, action: 'complete', stepId: 'check_cache' }));
    json = await res.json();
    expect(json.data.isComplete).toBe(false);

    // failing a step should set hasFailed
    res = await mod.PUT(buildBody({ ...base, action: 'fail', stepId: 'check_cache', message: 'oops' }));
    json = await res.json();
    expect(json.data.hasFailed).toBe(true);
  });
});


