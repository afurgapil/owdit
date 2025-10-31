import { GET } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: (init && init.status) || 200,
      async json() { return body; },
    }),
  },
}), { virtual: true });

// Mocks
jest.mock("../../../../../shared/lib/fetchers/contractSource", () => ({
  resolveContractSource: jest.fn(),
}));

jest.mock("../../../../../shared/lib/cache/mongodb", () => ({
  contractCache: {
    getCachedAnalysis: jest.fn().mockResolvedValue(null),
    cacheAnalysis: jest.fn().mockResolvedValue(undefined),
    deleteCachedAnalysis: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../../../../shared/lib/logger", () => ({
  genRequestId: () => "test-req-id",
  logger: {
    with: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

jest.mock("../../../../../shared/lib/analyzers/deployerAnalysis", () => ({
  analyzeDeployerWallet: jest.fn().mockResolvedValue({
    address: "0xDepl0yer00000000000000000000000000000000",
    reputationScore: 80,
    contractCount: 10,
    successRate: 0.9,
    timeSinceFirstDeploy: 100000,
    riskIndicators: [],
    riskLevel: "low",
  }),
}));

jest.mock("../../../../../shared/lib/analyzers/interactionAnalysis", () => ({
  analyzeContractInteractions: jest.fn().mockResolvedValue({
    totalTransactions: 100,
    uniqueUsers: 50,
    activityLevel: "medium",
    transactionVolume: 123.45,
    averageTxPerDay: 3.2,
    lastActivity: new Date().toISOString(),
    riskIndicators: [],
    riskLevel: "medium",
  }),
}));

jest.mock("../../../../../shared/lib/analysisProgress", () => ({
  AnalysisProgressTracker: class {
    startStep() {}
    completeStep() {}
    failStep() {}
  },
}));

const { resolveContractSource } = jest.requireMock(
  "../../../../../shared/lib/fetchers/contractSource"
);

describe("contract-source GET", () => {
  const base = "http://localhost:3000";

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("400 when address is missing", async () => {
    const request = { url: `${base}/api/contract-analysis/contract-source?chainId=1` } as any;
    const res = (await GET(request)) as any;
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Address parameter is required/);
  });

  test("400 when parameters are invalid (bad address)", async () => {
    const request = { url: `${base}/api/contract-analysis/contract-source?chainId=1&address=0xBAD` } as any;
    const res = (await GET(request)) as any;
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Invalid parameters/);
  });

  test("200 verified path: returns unified data", async () => {
    (resolveContractSource as jest.Mock).mockResolvedValue({
      verified: true,
      chainId: 1,
      address: "0x0000000000000000000000000000000000000001",
      contractName: "MyToken",
      compilerVersion: "v0.8.20+commit",
      sourceCode: "contract MyToken{}",
      files: [{ path: "MyToken.sol", content: "contract MyToken{}" }],
      abi: [],
    });

    // Mock fetch for AI inference endpoint
    const origFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/contract-analysis/infer")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { score: 85, reason: "ok" } }),
        } as any);
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as any);
    });

    const request = {
      url: `${base}/api/contract-analysis/contract-source?chainId=1&address=0x0000000000000000000000000000000000000001`,
      nextUrl: new URL(`${base}/api/contract-analysis/contract-source`),
    } as any;

    const res = (await GET(request)) as any;
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.verified).toBe(true);
    expect(body.data.aiOutput?.score).toBe(85);
    expect(body.data.overallRiskScore).toBeGreaterThanOrEqual(0);

    global.fetch = origFetch as any;
  });

  test("200 unverified path via risk fallback", async () => {
    (resolveContractSource as jest.Mock).mockResolvedValue(null);

    const riskPayload = {
      success: true,
      data: {
        chainId: 1,
        address: "0x0000000000000000000000000000000000000002",
        isContract: true,
        bytecodeLength: 1234,
        selectors: ["0xabcdef12"],
        opcodeCounters: { PUSH1: 10 },
        risk: { severity: "low", risks: [] },
        aiOutput: { score: 60, reason: "baseline" },
        deployerAnalysis: {
          address: "0xDepl0yer00000000000000000000000000000000",
          reputationScore: 70,
          contractCount: 5,
          successRate: 0.8,
          timeSinceFirstDeploy: 20000,
          riskIndicators: [],
          riskLevel: "medium",
        },
        interactionAnalysis: {
          totalTransactions: 10,
          uniqueUsers: 8,
          activityLevel: "low",
          transactionVolume: 12,
          averageTxPerDay: 1,
          lastActivity: new Date().toISOString(),
          riskIndicators: [],
          riskLevel: "low",
        },
        overallRiskScore: 40,
        isUpgradeable: false,
      },
    };

    const origFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/contract-analysis/risk")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => riskPayload } as any);
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as any);
    });

    const request = {
      url: `${base}/api/contract-analysis/contract-source?chainId=1&address=0x0000000000000000000000000000000000000002`,
      nextUrl: new URL(`${base}/api/contract-analysis/contract-source`),
    } as any;

    const res = (await GET(request)) as any;
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.verified).toBe(false);
    expect(body.data.bytecodeAnalysis?.risk?.severity).toBeDefined();

    global.fetch = origFetch as any;
  });

  test("404 when not verified and risk fallback fails", async () => {
    (resolveContractSource as jest.Mock).mockResolvedValue(null);

    const origFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/contract-analysis/risk")) {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ success: false }) } as any);
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as any);
    });

    const request = {
      url: `${base}/api/contract-analysis/contract-source?chainId=1&address=0x0000000000000000000000000000000000000003`,
      nextUrl: new URL(`${base}/api/contract-analysis/contract-source`),
    } as any;

    const res = (await GET(request)) as any;
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/not found/);

    global.fetch = origFetch as any;
  });

  test("500 on unexpected error", async () => {
    (resolveContractSource as jest.Mock).mockRejectedValue(new Error("boom"));

    const request = {
      url: `${base}/api/contract-analysis/contract-source?chainId=1&address=0x0000000000000000000000000000000000000004`,
      nextUrl: new URL(`${base}/api/contract-analysis/contract-source`),
    } as any;

    const res = (await GET(request)) as any;
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/error occurred/);
  });
});


