import { POST } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: (init && init.status) || 200,
      async json() { return body; },
    }),
  },
}), { virtual: true });

jest.mock("../../../../../shared/lib/fetchers/contractSource", () => ({
  resolveContractSource: jest.fn(),
}));

jest.mock("../../../../../shared/lib/cache/mongodb", () => ({
  contractCache: {
    getCachedAnalysis: jest.fn().mockResolvedValue(null),
    cacheAnalysis: jest.fn().mockResolvedValue(undefined),
  },
}));

const { resolveContractSource } = jest.requireMock(
  "../../../../../shared/lib/fetchers/contractSource"
);

function buildRequest(body: any): any {
  return { json: async () => body } as any;
}

describe("analyze POST", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("404 when invalid address leads to not found", async () => {
    const req = buildRequest({ address: "0xBAD", chainId: 1 });
    const res = (await POST(req)) as any;
    expect(res.status).toBe(404);
  });

  test("200 from cache when available", async () => {
    const { contractCache } = jest.requireMock(
      "../../../../../shared/lib/cache/mongodb"
    );
    contractCache.getCachedAnalysis.mockResolvedValue({
      aiOutput: { score: 70 },
      timestamp: new Date().toISOString(),
      contractInfo: { name: "A", compilerVersion: "v" },
    });

    const req = buildRequest({
      address: "0x0000000000000000000000000000000000000001",
      chainId: 1,
    });
    const res = (await POST(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.score).toBe(70);
  });

  test("404 when source not found", async () => {
    const { contractCache } = jest.requireMock(
      "../../../../../shared/lib/cache/mongodb"
    );
    contractCache.getCachedAnalysis.mockResolvedValue(null);
    (resolveContractSource as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      address: "0x0000000000000000000000000000000000000002",
      chainId: 1,
    });
    const res = (await POST(req)) as any;
    expect(res.status).toBe(404);
  });

  test("200 verified no AI data defaults score", async () => {
    (resolveContractSource as jest.Mock).mockResolvedValue({
      verified: true,
      chainId: 1,
      address: "0x0000000000000000000000000000000000000003",
      contractName: "A",
      compilerVersion: "v",
      sourceCode: "// code",
      files: [{ path: "A.sol", content: "// code" }],
      abi: [],
    });

    const origFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 } as any);

    const req = buildRequest({
      address: "0x0000000000000000000000000000000000000003",
      chainId: 1,
    });
    const res = (await POST(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.score).toBe(50); // default

    global.fetch = origFetch as any;
  });

  test("200 verified with AI score and cache write failure path", async () => {
    (resolveContractSource as jest.Mock).mockResolvedValue({
      verified: true,
      chainId: 1,
      address: "0x0000000000000000000000000000000000000004",
      contractName: "A",
      compilerVersion: "v",
      sourceCode: "// code",
      files: [{ path: "A.sol", content: "// code" }],
      abi: [],
    });

    const { contractCache } = jest.requireMock(
      "../../../../../shared/lib/cache/mongodb"
    );
    contractCache.cacheAnalysis.mockRejectedValue(new Error("cache boom"));

    const origFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { score: 81, reason: "ok" } }),
    } as any);

    const req = buildRequest({
      address: "0x0000000000000000000000000000000000000004",
      chainId: 1,
    });
    const res = (await POST(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.score).toBe(81);

    global.fetch = origFetch as any;
  });
});
