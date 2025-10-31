const loadRoute = async () => { let m:any; jest.isolateModules(()=>{ m = require('../route'); }); return m; };

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: (init && init.status) || 200,
      async json() { return body; },
    }),
  },
}), { virtual: true });

jest.mock("../../../../../shared/lib/logger", () => ({
  genRequestId: () => "req-id",
  logger: { with: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) },
}));

jest.mock("../../../../../shared/lib/chains", () => ({
  getChainById: jest.fn(),
}));
const chainsModule = require("../../../../../shared/lib/chains");
const { getChainById } = chainsModule as { getChainById: jest.Mock };

jest.mock("../../../../../shared/lib/bytecodeAnalyzer", () => ({
  BytecodeAnalyzer: {
    analyzeBytecode: jest.fn().mockReturnValue({
      functionSelectors: [{ selector: "0xabcdef01" }],
      opcodeCounters: { PUSH1: 10 },
      contractType: "standard",
      estimatedComplexity: 42,
      riskAssessment: { severity: "low", risks: [] },
    }),
    isUpgradeableContract: jest.fn().mockReturnValue(false),
  },
}));

jest.mock("../../../../../shared/lib/analyzers/deployerAnalysis", () => ({
  analyzeDeployerWallet: jest.fn().mockResolvedValue({
    address: "0xDepl0yer00000000000000000000000000000000",
    reputationScore: 70,
    contractCount: 5,
    successRate: 0.8,
    timeSinceFirstDeploy: 20000,
    riskIndicators: [],
    riskLevel: "medium",
  }),
}));

jest.mock("../../../../../shared/lib/analyzers/interactionAnalysis", () => ({
  analyzeContractInteractions: jest.fn().mockResolvedValue({
    totalTransactions: 10,
    uniqueUsers: 8,
    activityLevel: "low",
    transactionVolume: 12,
    averageTxPerDay: 1,
    lastActivity: new Date().toISOString(),
    riskIndicators: [],
    riskLevel: "low",
  }),
}));

const { BytecodeAnalyzer } = jest.requireMock("../../../../../shared/lib/bytecodeAnalyzer");

describe("risk GET", () => {
  const base = "http://localhost:3000";

  beforeEach(() => {
    jest.resetAllMocks();
    getChainById.mockImplementation((id: number) => ({ id, name: "Chain", rpc: "http://rpc.local" }));
  });

  test("400 invalid address", async () => {
    const mod = await loadRoute();
    const req = { url: `${base}/api/contract-analysis/risk?chainId=1&address=0xBAD` } as any;
    const res = (await mod.GET(req)) as any;
    expect(res.status).toBe(400);
  });

  test("400 unsupported chain", async () => {
    const mod = await loadRoute();
    getChainById.mockReturnValue(null);
    const req = { url: `${base}/api/contract-analysis/risk?chainId=999999&address=0x0000000000000000000000000000000000000001` } as any;
    const res = (await mod.GET(req)) as any;
    expect(res.status).toBe(400);
  });

  test("200 EOA (no contract)", async () => {
    const mod = await loadRoute();
    const origFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string, init?: any) => {
      if (String(url).startsWith("http://rpc.local")) {
        const body = JSON.parse(init!.body);
        if (body.method === "eth_getCode") {
          return Promise.resolve({ json: async () => ({ result: "0x" }) } as any);
        }
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as any);
    });

    const req = { url: `${base}/api/contract-analysis/risk?chainId=1&address=0x0000000000000000000000000000000000000002` } as any;
    const res = (await mod.GET(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.isContract).toBe(false);

    global.fetch = origFetch as any;
  });

  test("200 unverified contract analysis", async () => {
    const mod = await loadRoute();
    const bytecode = "0x6001600155"; // dummy
    const origFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string, init?: any) => {
      if (String(url).startsWith("http://rpc.local")) {
        const body = JSON.parse(init!.body);
        if (body.method === "eth_getCode") {
          return Promise.resolve({ json: async () => ({ result: bytecode }) } as any);
        }
        if (body.method === "eth_getStorageAt") {
          return Promise.resolve({ json: async () => ({ result: "0x".padEnd(66, "0") }) } as any);
        }
      }
      if (String(url).includes("/api/contract-analysis/infer")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { score: 55, reason: "ok" } }) } as any);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as any);
    });

    (BytecodeAnalyzer.analyzeBytecode as jest.Mock).mockReturnValue({
      functionSelectors: [{ selector: "0xabcdef01" }],
      opcodeCounters: { PUSH1: 10 },
      contractType: "standard",
      estimatedComplexity: 42,
      riskAssessment: { severity: "medium", risks: ["some risk"] },
    });

    const req = { url: `${base}/api/contract-analysis/risk?chainId=1&address=0x0000000000000000000000000000000000000003` } as any;
    const res = (await mod.GET(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.risk.severity).toBeDefined();
    expect(body.data.bytecodeLength).toBeGreaterThan(0);

    global.fetch = origFetch as any;
  });

  test("500 on RPC error", async () => {
    const mod = await loadRoute();
    const origFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() => Promise.reject(new Error("rpc boom")));
    const req = { url: `${base}/api/contract-analysis/risk?chainId=1&address=0x0000000000000000000000000000000000000004` } as any;
    const res = (await mod.GET(req)) as any;
    expect(res.status).toBe(500);
    global.fetch = origFetch as any;
  });
});


