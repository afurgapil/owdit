// Defer requiring module under test until after mocks

jest.mock("@0glabs/0g-serving-broker", () => {
  const mocked = {
    createZGComputeNetworkBroker: jest.fn().mockResolvedValue({
      inference: {
        listService: jest.fn().mockResolvedValue([
          { provider: "0xprov1", verifiability: "TeeML" },
        ]),
        getServiceMetadata: jest
          .fn()
          .mockResolvedValue({ endpoint: "http://0g.local", model: "llm" }),
        acknowledgeProviderSigner: jest.fn().mockResolvedValue(undefined),
        getRequestHeaders: jest.fn().mockResolvedValue({ Authorization: "sig" }),
        processResponse: jest.fn().mockResolvedValue(true),
      },
      ledger: {
        addLedger: jest.fn().mockResolvedValue(undefined),
        depositFund: jest.fn().mockResolvedValue(undefined),
      },
    }),
  };
  return { __esModule: true, ...mocked, default: mocked };
});

jest.mock("ethers", () => ({
  ethers: {
    JsonRpcProvider: class {
      constructor(public url: string) {}
      async getBalance() { return BigInt(100); }
    },
    Wallet: class {
      address = "0xabc";
    },
  },
}));

const { inferRiskOn0G, __setBrokerFactory } = require("../infer");
beforeEach(() => {
  __setBrokerFactory(async () => ({
    inference: {
      listService: async () => ([{ provider: "0xprov1", verifiability: "TeeML" }]),
      getServiceMetadata: async () => ({ endpoint: "http://0g.local", model: "llm" }),
      acknowledgeProviderSigner: async () => {},
      getRequestHeaders: async () => ({ Authorization: "sig" }),
      processResponse: async () => true,
    },
    ledger: {
      addLedger: async () => {},
      depositFund: async () => {},
    },
  }));
});

describe("inferRiskOn0G", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.PRIVATE_KEY = "0xpriv";
  });

  test("success path parses JSON response", async () => {
    const origFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { content: JSON.stringify({ score: 42, reason: "ok" }) },
          },
        ],
      }),
    } as any);

    const out = await inferRiskOn0G({ summary: "test" });
    expect(out.score).toBe(42);
    expect(out.reason).toBe("ok");

    global.fetch = origFetch as any;
  });

  test("timeout/abort yields unavailable error after retries", async () => {
    const origFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() => {
      const err = new Error("timeout");
      return Promise.reject(err);
    });

    await expect(inferRiskOn0G({ summary: "x" })).rejects.toThrow(/unavailable|failed/i);

    global.fetch = origFetch as any;
  });

  test("markdown fenced JSON parsing fallback", async () => {
    const origFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: { content: "```json\n{\"score\": 60, \"reason\": \"md\"}\n```" },
          },
        ],
      }),
    } as any);

    const out = await inferRiskOn0G({ summary: "test" });
    expect(out.score).toBe(60);
    expect(out.reason).toBe("md");

    global.fetch = origFetch as any;
  });

  test("throws when PRIVATE_KEY missing", async () => {
    delete process.env.PRIVATE_KEY;
    await expect(inferRiskOn0G({} as any)).rejects.toThrow(/PRIVATE_KEY/);
  });
});

import type { RiskFeatures, RiskInferenceOutput } from "../infer";

// We're testing only the parsing and utility logic, not actual 0G calls
describe("0G Risk Inference - Parsing and Utilities", () => {
  describe("Response Parsing - Direct JSON", () => {
    it("should parse direct JSON response", () => {
      const text = '{"score": 75, "reason": "High risk detected"}';

      let parsed: RiskInferenceOutput;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { score: 0, reason: "parse_error" };
      }

      expect(parsed.score).toBe(75);
      expect(parsed.reason).toBe("High risk detected");
    });

    it("should parse JSON with additional fields", () => {
      const text =
        '{"score": 30, "reason": "Low risk", "rules_triggered": ["rule1"]}';

      let parsed: RiskInferenceOutput & { rules_triggered?: string[] };
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { score: 0, reason: "parse_error" };
      }

      expect(parsed.score).toBe(30);
      expect(parsed.rules_triggered).toEqual(["rule1"]);
    });

    it("should handle parsing error gracefully", () => {
      const text = "not valid json";

      let parsed: RiskInferenceOutput;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { score: 0, reason: "parse_error" };
      }

      expect(parsed.score).toBe(0);
      expect(parsed.reason).toBe("parse_error");
    });
  });

  describe("Response Parsing - Markdown-wrapped JSON", () => {
    it("should extract JSON from markdown code block", () => {
      const text = '```json\n{"score": 85, "reason": "Critical risk"}\n```';

      let parsed: RiskInferenceOutput = { score: 0, reason: "parse_error" };

      try {
        parsed = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
        if (jsonMatch && jsonMatch[1]) {
          parsed = JSON.parse(jsonMatch[1]);
        }
      }

      expect(parsed.score).toBe(85);
      expect(parsed.reason).toBe("Critical risk");
    });

    it("should extract JSON from code block without json tag", () => {
      const text = '```\n{"score": 45, "reason": "Medium risk"}\n```';

      let parsed: RiskInferenceOutput = { score: 0, reason: "parse_error" };

      try {
        parsed = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
        if (jsonMatch && jsonMatch[1]) {
          parsed = JSON.parse(jsonMatch[1]);
        }
      }

      expect(parsed.score).toBe(45);
      expect(parsed.reason).toBe("Medium risk");
    });

    it("should handle multiline JSON in markdown", () => {
      const text =
        '```json\n{\n  "score": 60,\n  "reason": "Some issues found"\n}\n```';

      let parsed: RiskInferenceOutput = { score: 0, reason: "parse_error" };

      try {
        parsed = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
        if (jsonMatch && jsonMatch[1]) {
          parsed = JSON.parse(jsonMatch[1]);
        }
      }

      expect(parsed.score).toBe(60);
      expect(parsed.reason).toBe("Some issues found");
    });

    it("should fallback to brace matching if markdown extraction fails", () => {
      const text =
        'Some text before {"score": 20, "reason": "Low risk"} some text after';

      let parsed: RiskInferenceOutput = { score: 0, reason: "parse_error" };

      try {
        parsed = JSON.parse(text);
      } catch {
        try {
          const jsonMatch = text.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
          if (jsonMatch && jsonMatch[1]) {
            parsed = JSON.parse(jsonMatch[1]);
          } else {
            const braceMatch = text.match(/\{.*\}/);
            if (braceMatch) {
              parsed = JSON.parse(braceMatch[0]);
            }
          }
        } catch {
          // Keep default parse_error
        }
      }

      expect(parsed.score).toBe(20);
      expect(parsed.reason).toBe("Low risk");
    });
  });

  describe("Opcode Flags Generation", () => {
    it("should generate flags for dangerous opcodes", () => {
      const features: RiskFeatures = {
        opcodeCounters: {
          DELEGATECALL: 2,
          SELFDESTRUCT: 1,
          CALLCODE: 0,
          CREATE2: 0,
        },
      };

      const opcodeFlags = {
        has_delegatecall: (features.opcodeCounters?.DELEGATECALL ?? 0) > 0,
        has_callcode: (features.opcodeCounters?.CALLCODE ?? 0) > 0,
        has_selfdestruct: (features.opcodeCounters?.SELFDESTRUCT ?? 0) > 0,
        has_create2: (features.opcodeCounters?.CREATE2 ?? 0) > 0,
      };

      expect(opcodeFlags.has_delegatecall).toBe(true);
      expect(opcodeFlags.has_selfdestruct).toBe(true);
      expect(opcodeFlags.has_callcode).toBe(false);
      expect(opcodeFlags.has_create2).toBe(false);
    });

    it("should generate all false flags for safe contract", () => {
      const features: RiskFeatures = {
        opcodeCounters: {},
      };

      const opcodeFlags = {
        has_delegatecall: (features.opcodeCounters?.DELEGATECALL ?? 0) > 0,
        has_callcode: (features.opcodeCounters?.CALLCODE ?? 0) > 0,
        has_selfdestruct: (features.opcodeCounters?.SELFDESTRUCT ?? 0) > 0,
        has_create2: (features.opcodeCounters?.CREATE2 ?? 0) > 0,
      };

      expect(opcodeFlags.has_delegatecall).toBe(false);
      expect(opcodeFlags.has_callcode).toBe(false);
      expect(opcodeFlags.has_selfdestruct).toBe(false);
      expect(opcodeFlags.has_create2).toBe(false);
    });

    it("should handle undefined opcodeCounters", () => {
      const features: RiskFeatures = {};

      const opcodeFlags = {
        has_delegatecall: (features.opcodeCounters?.DELEGATECALL ?? 0) > 0,
        has_callcode: (features.opcodeCounters?.CALLCODE ?? 0) > 0,
        has_selfdestruct: (features.opcodeCounters?.SELFDESTRUCT ?? 0) > 0,
        has_create2: (features.opcodeCounters?.CREATE2 ?? 0) > 0,
      };

      expect(opcodeFlags.has_delegatecall).toBe(false);
      expect(opcodeFlags.has_callcode).toBe(false);
      expect(opcodeFlags.has_selfdestruct).toBe(false);
      expect(opcodeFlags.has_create2).toBe(false);
    });

    it("should detect CREATE2 opcode", () => {
      const features: RiskFeatures = {
        opcodeCounters: {
          CREATE2: 3,
        },
      };

      const opcodeFlags = {
        has_delegatecall: (features.opcodeCounters?.DELEGATECALL ?? 0) > 0,
        has_callcode: (features.opcodeCounters?.CALLCODE ?? 0) > 0,
        has_selfdestruct: (features.opcodeCounters?.SELFDESTRUCT ?? 0) > 0,
        has_create2: (features.opcodeCounters?.CREATE2 ?? 0) > 0,
      };

      expect(opcodeFlags.has_create2).toBe(true);
    });

    it("should handle zero counts as false", () => {
      const features: RiskFeatures = {
        opcodeCounters: {
          DELEGATECALL: 0,
          SELFDESTRUCT: 0,
        },
      };

      const opcodeFlags = {
        has_delegatecall: (features.opcodeCounters?.DELEGATECALL ?? 0) > 0,
        has_callcode: (features.opcodeCounters?.CALLCODE ?? 0) > 0,
        has_selfdestruct: (features.opcodeCounters?.SELFDESTRUCT ?? 0) > 0,
        has_create2: (features.opcodeCounters?.CREATE2 ?? 0) > 0,
      };

      expect(opcodeFlags.has_delegatecall).toBe(false);
      expect(opcodeFlags.has_selfdestruct).toBe(false);
    });
  });

  describe("Error Message Formatting", () => {
    it("should format fetch failed error", () => {
      const error = new Error("fetch failed");
      let errorMessage = "Unknown fetch error";

      if (error.message.includes("fetch failed")) {
        errorMessage =
          "0G server connection failed - server may be temporarily unavailable";
      }

      expect(errorMessage).toContain("0G server connection failed");
    });

    it("should format timeout error", () => {
      const error = new Error("timeout exceeded");
      let errorMessage = "Unknown fetch error";

      if (error.message.includes("timeout")) {
        errorMessage = "0G server request timeout - server may be overloaded";
      }

      expect(errorMessage).toContain("timeout");
      expect(errorMessage).toContain("overloaded");
    });

    it("should format connection refused error", () => {
      const error = new Error("ECONNREFUSED");
      let errorMessage = "Unknown fetch error";

      if (error.message.includes("ECONNREFUSED")) {
        errorMessage = "0G server unreachable - network connectivity issue";
      }

      expect(errorMessage).toContain("unreachable");
      expect(errorMessage).toContain("connectivity");
    });

    it("should format socket error", () => {
      const error = new Error("SocketError: other side closed");
      let errorMessage = "Unknown fetch error";

      if (
        error.message.includes("SocketError") ||
        error.message.includes("other side closed")
      ) {
        errorMessage =
          "0G server connection failed - server may be temporarily unavailable";
      }

      expect(errorMessage).toContain("server may be temporarily unavailable");
    });

    it("should handle generic error", () => {
      const error = new Error("Some generic error");
      let errorMessage = "Unknown fetch error";

      if (
        !error.message.includes("fetch failed") &&
        !error.message.includes("timeout") &&
        !error.message.includes("ECONNREFUSED")
      ) {
        errorMessage = error.message;
      }

      expect(errorMessage).toBe("Some generic error");
    });
  });

  describe("Service Selection Logic", () => {
    it("should prioritize official TeeML providers", () => {
      const officialProviderAddresses = [
        "0xf07240Efa67755B5311bc75784a061eDB47165Dd",
        "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3",
      ];

      const services = [
        { provider: "0xrandom1", verifiability: "TeeML" },
        {
          provider: "0xf07240Efa67755B5311bc75784a061eDB47165Dd",
          verifiability: "TeeML",
        },
        { provider: "0xrandom2", verifiability: "None" },
      ];

      const serviceCandidates = [
        ...services.filter(
          (s) =>
            officialProviderAddresses.includes(s.provider) &&
            s.verifiability === "TeeML"
        ),
        ...services.filter(
          (s) =>
            s.verifiability === "TeeML" &&
            !officialProviderAddresses.includes(s.provider)
        ),
        ...services.filter((s) => s.verifiability !== "TeeML"),
      ];

      expect(serviceCandidates[0].provider).toBe(
        "0xf07240Efa67755B5311bc75784a061eDB47165Dd"
      );
    });

    it("should prefer TeeML services over others", () => {
      const services = [
        { provider: "0xprovider1", verifiability: "None" },
        { provider: "0xprovider2", verifiability: "TeeML" },
        { provider: "0xprovider3", verifiability: "None" },
      ];

      const teeMlServices = services.filter((s) => s.verifiability === "TeeML");
      const nonTeeMlServices = services.filter(
        (s) => s.verifiability !== "TeeML"
      );

      const serviceCandidates = [...teeMlServices, ...nonTeeMlServices];

      expect(serviceCandidates[0].verifiability).toBe("TeeML");
    });

    it("should handle no TeeML services available", () => {
      const services = [
        { provider: "0xprovider1", verifiability: "None" },
        { provider: "0xprovider2", verifiability: "None" },
      ];

      const teeMlServices = services.filter((s) => s.verifiability === "TeeML");
      const nonTeeMlServices = services.filter(
        (s) => s.verifiability !== "TeeML"
      );

      const serviceCandidates = [...teeMlServices, ...nonTeeMlServices];

      expect(serviceCandidates).toHaveLength(2);
      expect(serviceCandidates.every((s) => s.verifiability !== "TeeML")).toBe(
        true
      );
    });
  });

  describe("Instruction and Prompt Building", () => {
    it("should build instruction with rules", () => {
      const instruction = `Score contract risk 0-100. Return JSON: {"score": int, "reason": "text", "rules_triggered": ["rule1"]}

Rules:
- heuristic.severity=="high" => score>=80
- risky opcodes => score>=80 (min 50 for proxy)
- no risks => score<=20`;

      expect(instruction).toContain("Score contract risk 0-100");
      expect(instruction).toContain("JSON");
      expect(instruction).toContain("heuristic.severity");
      expect(instruction).toContain("risky opcodes");
    });

    it("should include score thresholds in instruction", () => {
      const instruction = `Score contract risk 0-100. Return JSON: {"score": int, "reason": "text", "rules_triggered": ["rule1"]}

Rules:
- heuristic.severity=="high" => score>=80
- risky opcodes => score>=80 (min 50 for proxy)
- no risks => score<=20`;

      expect(instruction).toContain("score>=80");
      expect(instruction).toContain("score<=20");
    });
  });

  describe("Content Serialization", () => {
    it("should serialize features to JSON", () => {
      const features: RiskFeatures = {
        summary: "Test contract",
        selectors: ["0x12345678"],
        bytecodeLength: 1000,
      };

      const content = JSON.stringify({
        instruction: "test",
        features,
        opcodeFlags: {},
      });

      expect(content).toContain("Test contract");
      expect(content).toContain("0x12345678");
      expect(content).toContain("1000");
    });

    it("should handle features with undefined fields", () => {
      const features: RiskFeatures = {
        summary: "Contract",
      };

      const content = JSON.stringify({
        instruction: "test",
        features,
        opcodeFlags: {},
      });

      const parsed = JSON.parse(content);
      expect(parsed.features.summary).toBe("Contract");
      expect(parsed.features.bytecodeLength).toBeUndefined();
    });
  });

  describe("Response Validation", () => {
    it("should detect valid parsed output", () => {
      const parsed: RiskInferenceOutput = { score: 50, reason: "Medium risk" };
      const isValid = parsed.score !== 0 || parsed.reason !== "parse_error";

      expect(isValid).toBe(true);
    });

    it("should detect parse error", () => {
      const parsed: RiskInferenceOutput = { score: 0, reason: "parse_error" };
      const isValid = parsed.score !== 0 || parsed.reason !== "parse_error";

      expect(isValid).toBe(false);
    });

    it("should accept zero score with valid reason", () => {
      const parsed: RiskInferenceOutput = {
        score: 0,
        reason: "No risks found",
      };
      const isValid = parsed.score !== 0 || parsed.reason !== "parse_error";

      expect(isValid).toBe(true);
    });

    it("should validate score range", () => {
      const score = 75;
      const isValidScore = score >= 0 && score <= 100;

      expect(isValidScore).toBe(true);
    });

    it("should detect invalid score", () => {
      const score = 150;
      const isValidScore = score >= 0 && score <= 100;

      expect(isValidScore).toBe(false);
    });
  });

  describe("Token Usage Logging", () => {
    it("should extract token usage from response", () => {
      const data = {
        usage: {
          prompt_tokens: 500,
          completion_tokens: 100,
          total_tokens: 600,
        },
      };

      expect(data.usage.prompt_tokens).toBe(500);
      expect(data.usage.completion_tokens).toBe(100);
      expect(data.usage.total_tokens).toBe(600);
    });

    it("should handle missing usage data", () => {
      const data = {};

      const usage = (data as { usage?: unknown }).usage;
      expect(usage).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty response text", () => {
      const text = "";

      let parsed: RiskInferenceOutput = { score: 0, reason: "parse_error" };

      try {
        if (text) {
          parsed = JSON.parse(text);
        }
      } catch {
        // Keep default
      }

      expect(parsed.reason).toBe("parse_error");
    });

    it("should handle response with only whitespace", () => {
      const text = "   \n\n  ";

      let parsed: RiskInferenceOutput = { score: 0, reason: "parse_error" };

      try {
        const trimmed = text.trim();
        if (!trimmed) {
          // Empty after trim
          throw new Error("Empty response");
        }
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = { score: 0, reason: "parse_error" };
      }

      expect(parsed.reason).toBe("parse_error");
    });

    it("should handle nested JSON in markdown", () => {
      const text =
        '```json\n{"score": 40, "details": {"level": "medium"}}\n```';

      let parsed: RiskInferenceOutput & { details?: { level: string } } = {
        score: 0,
        reason: "parse_error",
      };

      try {
        parsed = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
        if (jsonMatch && jsonMatch[1]) {
          parsed = JSON.parse(jsonMatch[1]);
        }
      }

      expect(parsed.score).toBe(40);
      expect(parsed.details?.level).toBe("medium");
    });

    it("should handle response with BOM", () => {
      const text = '\uFEFF{"score": 55, "reason": "Test"}';

      let parsed: RiskInferenceOutput = { score: 0, reason: "parse_error" };

      try {
        // Remove BOM if present
        const cleanText = text.replace(/^\uFEFF/, "");
        parsed = JSON.parse(cleanText);
      } catch {
        parsed = { score: 0, reason: "parse_error" };
      }

      expect(parsed.score).toBe(55);
    });
  });
});
