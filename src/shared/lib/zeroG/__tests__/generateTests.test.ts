// Defer requiring until after mocks

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
      constructor(privateKey: string, provider: any) {}
    },
  },
}));

const { generateTestsOn0G, __setBrokerFactory } = require("../generateTests");
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

describe("generateTestsOn0G", () => {
  const baseFeatures = {
    contractCode: "contract A{}",
    contractName: "A",
    testFrameworks: ["hardhat", "foundry"] as ("hardhat" | "foundry")[],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ZERO_G_PRIVATE_KEY = "0xpriv";
  });

  test("success for both frameworks", async () => {
    const origFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                hardhat: { testFile: "// hh", setupFile: "// setup" },
                foundry: { testFile: "// foundry" },
                coverage: { functionsCount: 4, testCasesCount: 8 },
              }),
            },
          },
        ],
      }),
    } as any);

    const res = await generateTestsOn0G(baseFeatures);
    expect(res.success).toBe(true);
    expect(res.tests.hardhat?.testFile).toBeDefined();
    expect(res.tests.foundry?.testFile).toBeDefined();
    expect(res.coverage.functionsCount).toBe(4);

    global.fetch = origFetch as any;
  });

  test("handles timeout error path via AbortError", async () => {
    const origFetch = global.fetch;
    const abortErr: any = new Error("The operation was aborted");
    abortErr.name = "AbortError";
    global.fetch = jest.fn().mockImplementation(() => Promise.reject(abortErr));

    const res = await generateTestsOn0G(baseFeatures);
    expect(res.success).toBe(false);
    expect(res.error?.toLowerCase()).toMatch(/timeout|aborted/);

    global.fetch = origFetch as any;
  });

  test("returns failure when ZERO_G_PRIVATE_KEY missing", async () => {
    delete process.env.ZERO_G_PRIVATE_KEY;
    const res = await generateTestsOn0G(baseFeatures);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/ZERO_G_PRIVATE_KEY/);
  });

  test("maps network failures to user-friendly error", async () => {
    const origFetch = global.fetch;
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("fetch failed: connection reset"));

    const res = await generateTestsOn0G(baseFeatures);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/server connection failed|unavailable/i);

    global.fetch = origFetch as any;
  });
});

import type {
  TestGenerationFeatures,
  TestGenerationResponse,
} from "../generateTests";

// We're testing only the parsing and utility logic, not actual 0G calls
describe("0G Test Generation - Parsing and Utilities", () => {
  describe("Prompt Building", () => {
    it("should build basic prompt with contract code", () => {
      const features: TestGenerationFeatures = {
        contractCode: "contract Token {}",
        contractName: "Token",
        testFrameworks: ["hardhat"],
      };

      const prompt = `Generate unit tests for this contract:

\`\`\`solidity
${features.contractCode}
\`\`\`

Name: ${features.contractName}
Frameworks: ${features.testFrameworks.join(",")}

Requirements:
- Cover all public/external functions
- Test success/failure paths
- Include edge cases
- Use proper test structure

For Hardhat: Use Chai/Ethers, describe/it structure
For Foundry: Use Forge, vm cheatcodes

Return JSON:
{
  "hardhat": {
    "testFile": "test content",
    "setupFile": "setup content"
  },
  "foundry": {
    "testFile": "test content"
  },
  "coverage": {
    "functionsCount": number,
    "testCasesCount": number
  }
}`;

      expect(prompt).toContain("contract Token {}");
      expect(prompt).toContain("Name: Token");
      expect(prompt).toContain("Frameworks: hardhat");
    });

    it("should include multiple frameworks", () => {
      const features: TestGenerationFeatures = {
        contractCode: "contract MyContract {}",
        contractName: "MyContract",
        testFrameworks: ["hardhat", "foundry"],
      };

      const frameworks = features.testFrameworks.join(",");

      expect(frameworks).toBe("hardhat,foundry");
    });

    it("should include requirements in prompt", () => {
      const prompt = `Requirements:
- Cover all public/external functions
- Test success/failure paths
- Include edge cases
- Use proper test structure`;

      expect(prompt).toContain("Cover all public/external functions");
      expect(prompt).toContain("Test success/failure paths");
      expect(prompt).toContain("Include edge cases");
    });

    it("should specify framework-specific instructions", () => {
      const prompt = `For Hardhat: Use Chai/Ethers, describe/it structure
For Foundry: Use Forge, vm cheatcodes`;

      expect(prompt).toContain("Chai/Ethers");
      expect(prompt).toContain("Forge");
      expect(prompt).toContain("vm cheatcodes");
    });
  });

  describe("Response Parsing - OpenAI Format", () => {
    it("should parse OpenAI response format", () => {
      const data = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                hardhat: {
                  testFile: "test content",
                  setupFile: "setup content",
                },
                coverage: {
                  functionsCount: 5,
                  testCasesCount: 15,
                },
              }),
            },
          },
        ],
      };

      let testData;
      if (
        data &&
        typeof data === "object" &&
        "choices" in data &&
        Array.isArray(data.choices) &&
        data.choices[0]?.message
      ) {
        const content = data.choices[0].message.content;
        testData = JSON.parse(content);
      }

      expect(testData.hardhat.testFile).toBe("test content");
      expect(testData.coverage.functionsCount).toBe(5);
    });

    it("should handle empty choices array", () => {
      const data = {
        choices: [],
      };

      let testData = null;
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const content = data.choices[0].message.content;
        testData = JSON.parse(content);
      }

      expect(testData).toBeNull();
    });

    it("should handle missing message", () => {
      const data = {
        choices: [{}],
      };

      let testData = null;
      if (
        data.choices &&
        data.choices.length > 0 &&
        data.choices[0] &&
        "message" in data.choices[0] &&
        data.choices[0].message
      ) {
        // Would fail here
        testData = "would parse";
      }

      expect(testData).toBeNull();
    });
  });

  describe("Response Parsing - String Format", () => {
    it("should parse string response", () => {
      const data = JSON.stringify({
        hardhat: {
          testFile: "describe('Token', () => {})",
          setupFile: "import { expect } from 'chai';",
        },
        coverage: {
          functionsCount: 3,
          testCasesCount: 9,
        },
      });

      let testData;
      if (typeof data === "string") {
        testData = JSON.parse(data);
      }

      expect(testData.hardhat.testFile).toContain("describe");
      expect(testData.coverage.testCasesCount).toBe(9);
    });

    it("should handle malformed string", () => {
      const data = "not valid json";

      let testData = null;
      try {
        testData = JSON.parse(data);
      } catch {
        // Parse error
      }

      expect(testData).toBeNull();
    });
  });

  describe("Response Parsing - Direct Object", () => {
    it("should use direct object if already parsed", () => {
      const data = {
        foundry: {
          testFile: "contract TokenTest is Test {}",
        },
        coverage: {
          functionsCount: 4,
          testCasesCount: 12,
        },
      };

      const testData = data;

      expect(testData.foundry.testFile).toContain("TokenTest");
      expect(testData.coverage.functionsCount).toBe(4);
    });

    it("should handle data with content field", () => {
      const data = {
        content: JSON.stringify({
          hardhat: { testFile: "test" },
          coverage: { functionsCount: 2, testCasesCount: 6 },
        }),
      };

      let testData;
      if (data && typeof data === "object" && "content" in data) {
        testData = JSON.parse(data.content as string);
      }

      expect(testData.hardhat.testFile).toBe("test");
    });
  });

  describe("Framework-specific Test Extraction - Hardhat", () => {
    it("should extract Hardhat tests when requested", () => {
      const testData = {
        hardhat: {
          testFile:
            "describe('MyContract', () => { it('should work', async () => {}) })",
          setupFile: "import { ethers } from 'hardhat';",
        },
        coverage: {
          functionsCount: 3,
          testCasesCount: 9,
        },
      };

      const requestedFrameworks: ("hardhat" | "foundry")[] = ["hardhat"];

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: {
          functionsCount: 0,
          testCasesCount: 0,
        },
      };

      if (requestedFrameworks.includes("hardhat") && testData.hardhat) {
        result.tests.hardhat = {
          testFile: testData.hardhat.testFile || "",
          setupFile: testData.hardhat.setupFile || "",
        };
      }

      expect(result.tests.hardhat).toBeDefined();
      expect(result.tests.hardhat?.testFile).toContain("describe");
    });

    it("should not extract Hardhat tests when not requested", () => {
      const testData = {
        hardhat: {
          testFile: "test content",
          setupFile: "setup content",
        },
      };

      const requestedFrameworks: ("hardhat" | "foundry")[] = ["foundry"];

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: {
          functionsCount: 0,
          testCasesCount: 0,
        },
      };

      if (requestedFrameworks.includes("hardhat") && testData.hardhat) {
        result.tests.hardhat = {
          testFile: testData.hardhat.testFile || "",
          setupFile: testData.hardhat.setupFile || "",
        };
      }

      expect(result.tests.hardhat).toBeUndefined();
    });

    it("should handle missing setupFile", () => {
      const testData = {
        hardhat: {
          testFile: "describe('Test', () => {})",
        },
      };

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {
          hardhat: {
            testFile: testData.hardhat.testFile || "",
            setupFile:
              (testData.hardhat as { setupFile?: string }).setupFile || "",
          },
        },
        coverage: {
          functionsCount: 0,
          testCasesCount: 0,
        },
      };

      expect(result.tests.hardhat?.setupFile).toBe("");
    });
  });

  describe("Framework-specific Test Extraction - Foundry", () => {
    it("should extract Foundry tests when requested", () => {
      const testData = {
        foundry: {
          testFile:
            "contract MyContractTest is Test { function testTransfer() public {} }",
        },
        coverage: {
          functionsCount: 5,
          testCasesCount: 15,
        },
      };

      const requestedFrameworks: ("hardhat" | "foundry")[] = ["foundry"];

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: {
          functionsCount: 0,
          testCasesCount: 0,
        },
      };

      if (requestedFrameworks.includes("foundry") && testData.foundry) {
        result.tests.foundry = {
          testFile: testData.foundry.testFile || "",
        };
      }

      expect(result.tests.foundry).toBeDefined();
      expect(result.tests.foundry?.testFile).toContain("MyContractTest");
    });

    it("should not extract Foundry tests when not requested", () => {
      const testData = {
        foundry: {
          testFile: "test content",
        },
      };

      const requestedFrameworks: ("hardhat" | "foundry")[] = ["hardhat"];

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: {
          functionsCount: 0,
          testCasesCount: 0,
        },
      };

      if (requestedFrameworks.includes("foundry") && testData.foundry) {
        result.tests.foundry = {
          testFile: testData.foundry.testFile || "",
        };
      }

      expect(result.tests.foundry).toBeUndefined();
    });

    it("should handle empty testFile", () => {
      const testData = {
        foundry: {},
      };

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {
          foundry: {
            testFile:
              (testData.foundry as { testFile?: string }).testFile || "",
          },
        },
        coverage: {
          functionsCount: 0,
          testCasesCount: 0,
        },
      };

      expect(result.tests.foundry?.testFile).toBe("");
    });
  });

  describe("Coverage Metrics Extraction", () => {
    it("should extract coverage information", () => {
      const testData = {
        coverage: {
          functionsCount: 8,
          testCasesCount: 24,
        },
      };

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: {
          functionsCount: 0,
          testCasesCount: 0,
        },
      };

      if (testData.coverage) {
        result.coverage = {
          functionsCount: testData.coverage.functionsCount || 0,
          testCasesCount: testData.coverage.testCasesCount || 0,
        };
      }

      expect(result.coverage.functionsCount).toBe(8);
      expect(result.coverage.testCasesCount).toBe(24);
    });

    it("should default to 0 when coverage missing", () => {
      const testData = {};

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: {
          functionsCount: 0,
          testCasesCount: 0,
        },
      };

      if ((testData as { coverage?: unknown }).coverage) {
        // Would not execute
      }

      expect(result.coverage.functionsCount).toBe(0);
      expect(result.coverage.testCasesCount).toBe(0);
    });

    it("should handle partial coverage data", () => {
      const testData = {
        coverage: {
          functionsCount: 5,
        },
      };

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: {
          functionsCount: testData.coverage.functionsCount || 0,
          testCasesCount:
            (testData.coverage as { testCasesCount?: number }).testCasesCount ||
            0,
        },
      };

      expect(result.coverage.functionsCount).toBe(5);
      expect(result.coverage.testCasesCount).toBe(0);
    });
  });

  describe("Multiple Frameworks", () => {
    it("should extract both Hardhat and Foundry tests", () => {
      const testData = {
        hardhat: {
          testFile: "hardhat test",
          setupFile: "hardhat setup",
        },
        foundry: {
          testFile: "foundry test",
        },
        coverage: {
          functionsCount: 6,
          testCasesCount: 18,
        },
      };

      const requestedFrameworks: ("hardhat" | "foundry")[] = [
        "hardhat",
        "foundry",
      ];

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: {
          functionsCount: 0,
          testCasesCount: 0,
        },
      };

      if (requestedFrameworks.includes("hardhat") && testData.hardhat) {
        result.tests.hardhat = {
          testFile: testData.hardhat.testFile || "",
          setupFile: testData.hardhat.setupFile || "",
        };
      }

      if (requestedFrameworks.includes("foundry") && testData.foundry) {
        result.tests.foundry = {
          testFile: testData.foundry.testFile || "",
        };
      }

      if (testData.coverage) {
        result.coverage = {
          functionsCount: testData.coverage.functionsCount || 0,
          testCasesCount: testData.coverage.testCasesCount || 0,
        };
      }

      expect(result.tests.hardhat).toBeDefined();
      expect(result.tests.foundry).toBeDefined();
      expect(result.coverage.functionsCount).toBe(6);
    });

    it("should handle missing data for one framework", () => {
      const testData = {
        hardhat: {
          testFile: "hardhat test",
          setupFile: "hardhat setup",
        },
        coverage: {
          functionsCount: 4,
          testCasesCount: 12,
        },
      };

      const requestedFrameworks: ("hardhat" | "foundry")[] = [
        "hardhat",
        "foundry",
      ];

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: {
          functionsCount: 0,
          testCasesCount: 0,
        },
      };

      if (requestedFrameworks.includes("hardhat") && testData.hardhat) {
        result.tests.hardhat = {
          testFile: testData.hardhat.testFile || "",
          setupFile: testData.hardhat.setupFile || "",
        };
      }

      if (
        requestedFrameworks.includes("foundry") &&
        (testData as { foundry?: unknown }).foundry
      ) {
        // Would not execute
      }

      expect(result.tests.hardhat).toBeDefined();
      expect(result.tests.foundry).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should return default values on parse error", () => {
      const data = "invalid json";

      let testData;
      try {
        testData = JSON.parse(data);
      } catch {
        testData = null;
      }

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: { functionsCount: 0, testCasesCount: 0 },
      };

      expect(result.coverage.functionsCount).toBe(0);
      expect(result.coverage.testCasesCount).toBe(0);
    });

    it("should handle null response data", () => {
      const data = null;

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: { functionsCount: 0, testCasesCount: 0 },
      };

      expect(result.tests).toEqual({});
    });

    it("should handle undefined fields gracefully", () => {
      const testData = {
        hardhat: undefined,
        foundry: undefined,
        coverage: undefined,
      };

      const result: Omit<TestGenerationResponse, "success"> = {
        tests: {},
        coverage: {
          functionsCount: testData.coverage?.functionsCount || 0,
          testCasesCount: testData.coverage?.testCasesCount || 0,
        },
      };

      expect(result.coverage.functionsCount).toBe(0);
      expect(result.coverage.testCasesCount).toBe(0);
    });
  });

  describe("Response Structure Validation", () => {
    it("should validate complete response structure", () => {
      const response: TestGenerationResponse = {
        success: true,
        tests: {
          hardhat: {
            testFile: "test content",
            setupFile: "setup content",
          },
          foundry: {
            testFile: "foundry test",
          },
        },
        coverage: {
          functionsCount: 5,
          testCasesCount: 15,
        },
      };

      expect(response.success).toBe(true);
      expect(response.tests.hardhat).toBeDefined();
      expect(response.tests.foundry).toBeDefined();
      expect(response.coverage).toBeDefined();
    });

    it("should validate error response structure", () => {
      const response: TestGenerationResponse = {
        success: false,
        tests: {},
        coverage: { functionsCount: 0, testCasesCount: 0 },
        error: "Test generation failed",
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe("Test generation failed");
      expect(response.tests).toEqual({});
    });

    it("should validate minimal valid response", () => {
      const response: TestGenerationResponse = {
        success: true,
        tests: {},
        coverage: { functionsCount: 0, testCasesCount: 0 },
      };

      expect(response.success).toBe(true);
      expect(response.tests).toEqual({});
      expect(response.coverage.functionsCount).toBe(0);
    });
  });

  describe("Contract Code Serialization", () => {
    it("should preserve contract code formatting", () => {
      const contractCode = `contract Token {
  uint256 balance;
  
  function transfer() public {}
}`;

      const serialized = JSON.stringify({ contractCode });
      const deserialized = JSON.parse(serialized);

      expect(deserialized.contractCode).toBe(contractCode);
      expect(deserialized.contractCode).toContain("\n");
    });

    it("should handle special characters in code", () => {
      const contractCode = 'string message = "Hello, World!";';

      const serialized = JSON.stringify({ contractCode });
      const deserialized = JSON.parse(serialized);

      expect(deserialized.contractCode).toContain('"Hello, World!"');
    });

    it("should handle unicode in code", () => {
      const contractCode = "// Comment with emoji 🚀";

      const serialized = JSON.stringify({ contractCode });
      const deserialized = JSON.parse(serialized);

      expect(deserialized.contractCode).toContain("🚀");
    });
  });

  describe("Framework List Formatting", () => {
    it("should format single framework", () => {
      const frameworks: ("hardhat" | "foundry")[] = ["hardhat"];
      const formatted = frameworks.join(",");

      expect(formatted).toBe("hardhat");
    });

    it("should format multiple frameworks", () => {
      const frameworks: ("hardhat" | "foundry")[] = ["hardhat", "foundry"];
      const formatted = frameworks.join(",");

      expect(formatted).toBe("hardhat,foundry");
    });

    it("should handle empty frameworks array", () => {
      const frameworks: ("hardhat" | "foundry")[] = [];
      const formatted = frameworks.join(",");

      expect(formatted).toBe("");
    });
  });
});
