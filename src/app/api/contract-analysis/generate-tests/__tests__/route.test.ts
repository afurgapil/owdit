import { POST } from "../route";

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
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../../../shared/lib/zeroG/generateTests", () => ({
  generateTestsOn0G: jest.fn(),
}));

const { generateTestsOn0G } = jest.requireMock(
  "../../../../../shared/lib/zeroG/generateTests"
);

function buildRequest(body: any): any {
  return {
    json: async () => body,
  } as any;
}

describe("generate-tests POST", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ZERO_G_PRIVATE_KEY = "priv";
  });

  test("400 invalid request body (missing fields)", async () => {
    const req = buildRequest({});
    const res = (await POST(req)) as any;
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("500 when ZERO_G_PRIVATE_KEY not configured", async () => {
    delete process.env.ZERO_G_PRIVATE_KEY;
    const req = buildRequest({
      contractCode: "contract A{}",
      contractName: "A",
      testFrameworks: ["hardhat"],
    });
    const res = (await POST(req)) as any;
    expect(res.status).toBe(500);
  });

  test("200 success for hardhat only", async () => {
    (generateTestsOn0G as jest.Mock).mockResolvedValue({
      success: true,
      tests: {
        hardhat: { testFile: "test/a.spec.ts", setupFile: "test/setup.ts" },
      },
      coverage: { functionsCount: 5, testCasesCount: 10 },
    });

    const req = buildRequest({
      contractCode: "contract A{}",
      contractName: "A",
      testFrameworks: ["hardhat"],
    });
    const res = (await POST(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.tests.hardhat.testFile).toContain(".spec");
  });

  test("200 success for foundry only", async () => {
    (generateTestsOn0G as jest.Mock).mockResolvedValue({
      success: true,
      tests: {
        foundry: { testFile: "test/A.t.sol" },
      },
      coverage: { functionsCount: 3, testCasesCount: 6 },
    });

    const req = buildRequest({
      contractCode: "contract B{}",
      contractName: "B",
      testFrameworks: ["foundry"],
    });
    const res = (await POST(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.tests.foundry.testFile).toContain(".t.sol");
  });

  test("503 when 0G unavailable", async () => {
    (generateTestsOn0G as jest.Mock).mockResolvedValue({
      success: false,
      error: "0G AI services are currently unavailable",
    });
    const req = buildRequest({
      contractCode: "contract C{}",
      contractName: "C",
      testFrameworks: ["hardhat", "foundry"],
    });
    const res = (await POST(req)) as any;
    expect(res.status).toBe(503);
  });

  test("504 when timeout occurs", async () => {
    (generateTestsOn0G as jest.Mock).mockResolvedValue({
      success: false,
      error: "timeout after 30s",
    });
    const req = buildRequest({
      contractCode: "contract D{}",
      contractName: "D",
      testFrameworks: ["hardhat"],
    });
    const res = (await POST(req)) as any;
    expect(res.status).toBe(504);
  });

  test("500 generic failure", async () => {
    (generateTestsOn0G as jest.Mock).mockResolvedValue({
      success: false,
      error: "internal error",
    });
    const req = buildRequest({
      contractCode: "contract E{}",
      contractName: "E",
      testFrameworks: ["foundry"],
    });
    const res = (await POST(req)) as any;
    expect(res.status).toBe(500);
  });
});


