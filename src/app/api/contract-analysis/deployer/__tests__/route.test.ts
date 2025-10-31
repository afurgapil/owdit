import { GET } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: (init && init.status) || 200,
      async json() { return body; },
    }),
  },
}), { virtual: true });

jest.mock("../../../../../shared/lib/analyzers/deployerAnalysis", () => ({
  analyzeDeployerWallet: jest.fn(),
}));

jest.mock("../../../../../shared/lib/logger", () => ({
  genRequestId: () => "req-id",
  logger: { with: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) },
}));

const { analyzeDeployerWallet } = jest.requireMock(
  "../../../../../shared/lib/analyzers/deployerAnalysis"
);

describe("deployer-analysis GET", () => {
  const base = "http://localhost:3000";

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ETHERSCAN_API_KEY = "test-key";
  });

  test("400 when address missing", async () => {
    const req = { url: `${base}/api/contract-analysis/deployer?chainId=1` } as any;
    const res = (await GET(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("400 invalid parameters (bad address)", async () => {
    const req = { url: `${base}/api/contract-analysis/deployer?chainId=1&address=0xBAD` } as any;
    const res = (await GET(req)) as any;
    expect(res.status).toBe(400);
  });

  test("500 when API key missing", async () => {
    delete process.env.ETHERSCAN_API_KEY;
    const req = { url: `${base}/api/contract-analysis/deployer?chainId=1&address=0x0000000000000000000000000000000000000001` } as any;
    const res = (await GET(req)) as any;
    expect(res.status).toBe(500);
  });

  test("200 success returns analysis", async () => {
    (analyzeDeployerWallet as jest.Mock).mockResolvedValue({
      address: "0x0000000000000000000000000000000000000001",
      reputationScore: 80,
      contractCount: 10,
      successRate: 0.9,
      timeSinceFirstDeploy: 100000,
      riskIndicators: [],
      riskLevel: "low",
    });

    const req = { url: `${base}/api/contract-analysis/deployer?chainId=1&address=0x0000000000000000000000000000000000000001` } as any;
    const res = (await GET(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.address).toContain("0x");
  });

  test("404 when analyze returns empty", async () => {
    (analyzeDeployerWallet as jest.Mock).mockResolvedValue(null);
    const req = { url: `${base}/api/contract-analysis/deployer?chainId=1&address=0x0000000000000000000000000000000000000002` } as any;
    const res = (await GET(req)) as any;
    expect(res.status).toBe(404);
  });

  test("500 on unexpected error", async () => {
    (analyzeDeployerWallet as jest.Mock).mockRejectedValue(new Error("boom"));
    const req = { url: `${base}/api/contract-analysis/deployer?chainId=1&address=0x0000000000000000000000000000000000000003` } as any;
    const res = (await GET(req)) as any;
    expect(res.status).toBe(500);
  });
});


