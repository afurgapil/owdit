import { POST } from "../route";

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

const { inferRiskOn0G } = jest.requireMock(
  "../../../../../shared/lib/zeroG/infer"
);

function buildRequest(body: any): any {
  return { json: async () => body } as any;
}

describe("analyze-code POST", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("400 invalid body", async () => {
    const req = buildRequest({});
    const res = (await POST(req)) as any;
    expect(res.status).toBe(400);
  });

  test("200 success with AI result and detects security issues", async () => {
    (inferRiskOn0G as jest.Mock).mockResolvedValue({ score: 65, reason: "ok" });
    const code = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.20;
      contract A {
        function foo() public { assembly { } }
        function bar() public { unchecked { } }
        function baz() public { address(this).delegatecall("") }
      }
    `;
    const req = buildRequest({ code, language: "solidity", fileName: "A.sol" });
    const res = (await POST(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.securityIssues.length).toBeGreaterThan(0);
    expect(body.data.gasOptimization.current).toBeGreaterThan(0);
    expect(body.data.codeQuality.maintainability).toBeGreaterThan(0);
  });

  test("200 fallback when AI times out, with recommendations and score bounds", async () => {
    (inferRiskOn0G as jest.Mock).mockRejectedValue(new Error("0G inference timeout"));
    const code = `
      contract B { function x() public { selfdestruct(payable(msg.sender)); } }
    `;
    const req = buildRequest({ code, language: "solidity", fileName: "B.sol" });
    const res = (await POST(req)) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.recommendations.length).toBeGreaterThan(0);
    expect(body.data.score).toBeGreaterThanOrEqual(0);
    expect(body.data.score).toBeLessThanOrEqual(100);
  });
});
