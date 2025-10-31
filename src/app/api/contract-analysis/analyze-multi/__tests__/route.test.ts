// We'll load route dynamically to ensure mocks apply

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: (init && init.status) || 200,
      async json() { return body; },
    }),
  },
}), { virtual: true });

jest.mock("../../../../../shared/lib/zeroG/infer", () => ({
  inferRiskOn0G: jest.fn(),
}));

jest.mock("../../../../../shared/lib/contractParser", () => ({
  parseMultiFileContracts: jest.fn().mockImplementation((files: any[]) => ({
    contracts: files.map((f) => ({ path: f.path, functions: [{}] })),
    totalLines: files.reduce((s, f) => s + f.content.split('\n').length, 0),
    totalFunctions: files.length,
    totalEvents: 0,
    mainContract: files[0]?.name.replace(/\.sol$/, "") || undefined,
  })),
  combineFilesForAnalysis: jest
    .fn()
    .mockImplementation((files: any[]) => files.map((f) => f.content).join('\n')),
}));

jest.mock("../../../../../shared/lib/importResolver", () => ({
  resolveImports: jest.fn().mockResolvedValue({ resolved: [], missing: [] }),
}));

const { inferRiskOn0G } = jest.requireMock(
  "../../../../../shared/lib/zeroG/infer"
);
const { resolveImports } = jest.requireMock(
  "../../../../../shared/lib/importResolver"
);

function buildRequest(body: any): any {
  return { json: async () => body } as any;
}
const loadRoute = async () => { let m:any; jest.isolateModules(()=>{ m = require('../route'); }); return m; };

describe("analyze-multi POST", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("400 invalid body (no files)", async () => {
    const mod = await loadRoute();
    const req = buildRequest({ files: [], language: "solidity" });
    const res = (await mod.POST(req)) as any;
    expect(res.status).toBe(400);
  });

  test("400 invalid file type", async () => {
    const mod = await loadRoute();
    const req = buildRequest({
      files: [
        { name: "data.txt", content: "hi", path: "src/data.txt", size: 2 },
      ],
      language: "solidity",
      resolveImports: false,
    });
    const res = (await mod.POST(req)) as any;
    expect(res.status).toBe(400);
  });

  test("400 when total size exceeds 5MB", async () => {
    const big = 5 * 1024 * 1024 + 1;
    const mod = await loadRoute();
    const req = buildRequest({
      files: [{ name: "A.sol", content: "a", path: "A.sol", size: big }],
      language: "solidity",
      resolveImports: false,
    });
    const res = (await mod.POST(req)) as any;
    expect(res.status).toBe(400);
  });

  test("200 success, multi-file recommendation present", async () => {
    (inferRiskOn0G as jest.Mock).mockResolvedValue({ score: 75, reason: "ok" });
    const mod = await loadRoute();
    const req = buildRequest({
      files: [
        { name: "A.sol", content: "pragma solidity ^0.8.0; contract A { function f() public {} }", path: "A.sol", size: 100 },
        { name: "B.sol", content: "contract B { function g() public {} }", path: "B.sol", size: 100 },
      ],
      language: "solidity",
      resolveImports: false,
    });
    const res = (await mod.POST(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    const archRec = body.data.combinedAnalysis.recommendations.find((r: any) => r.category === "Architecture");
    expect(archRec).toBeTruthy();
  });

  test("200 success with missing imports recommendation", async () => {
    (inferRiskOn0G as jest.Mock).mockResolvedValue({ score: 65, reason: "ok" });
    (resolveImports as jest.Mock).mockResolvedValue({ resolved: [], missing: ["@openzeppelin/contracts/token/ERC20.sol"] });
    const mod = await loadRoute();
    const req = buildRequest({
      files: [
        { name: "A.sol", content: "import '@openzeppelin/contracts/token/ERC20.sol'; contract A{}", path: "A.sol", size: 100 },
      ],
      language: "solidity",
      resolveImports: true,
    });
    const res = (await mod.POST(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    const depRec = body.data.combinedAnalysis.recommendations.find((r: any) => r.category === "Dependencies");
    expect(depRec).toBeTruthy();
  });

  test("200 fallback score used when AI times out; score clamped 0-100", async () => {
    (inferRiskOn0G as jest.Mock).mockRejectedValue(new Error("0G inference timeout"));
    const mod = await loadRoute();
    const req = buildRequest({
      files: [
        { name: "A.sol", content: "contract A { function f() public { selfdestruct(payable(msg.sender)); } }", path: "A.sol", size: 100 },
      ],
      language: "solidity",
      resolveImports: false,
    });
    const res = (await mod.POST(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.combinedAnalysis.score).toBeGreaterThanOrEqual(0);
    expect(body.data.combinedAnalysis.score).toBeLessThanOrEqual(100);
  });
});
