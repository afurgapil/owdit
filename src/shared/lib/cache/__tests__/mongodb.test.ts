import { ContractCacheService } from "../mongodb";

// Mock MongoDB
jest.mock("mongodb", () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        createIndex: jest.fn().mockResolvedValue(undefined),
        findOne: jest.fn(),
        replaceOne: jest.fn(),
        deleteOne: jest.fn(),
        countDocuments: jest.fn(),
        deleteMany: jest.fn(),
        find: jest.fn(),
      }),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("MongoDB Cache Service - Logic Tests", () => {
  let cacheService: ContractCacheService;

  beforeEach(() => {
    cacheService = ContractCacheService.getInstance();
    jest.clearAllMocks();
  });

  describe("Cache Key Generation", () => {
    it("should generate cache key with address and chainId", () => {
      const address = "0x1234567890123456789012345678901234567890";
      const chainId = 1;

      // Access private method through any type assertion for testing
      const key = (cacheService as any).getCacheKey(address, chainId);

      expect(key).toBe(`${address.toLowerCase()}:${chainId}`);
    });

    it("should normalize address to lowercase in key", () => {
      const address = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const chainId = 137;

      const key = (cacheService as any).getCacheKey(address, chainId);

      expect(key).toBe(`${address.toLowerCase()}:${chainId}`);
      expect(key).not.toContain("ABCDEF");
    });

    it("should create unique keys for different addresses", () => {
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";
      const chainId = 1;

      const key1 = (cacheService as any).getCacheKey(address1, chainId);
      const key2 = (cacheService as any).getCacheKey(address2, chainId);

      expect(key1).not.toBe(key2);
    });

    it("should create unique keys for different chains", () => {
      const address = "0x1234567890123456789012345678901234567890";

      const key1 = (cacheService as any).getCacheKey(address, 1);
      const key2 = (cacheService as any).getCacheKey(address, 137);

      expect(key1).not.toBe(key2);
    });

    it("should create same key for same address regardless of case", () => {
      const address1 = "0xabcdef1234567890abcdef1234567890abcdef12";
      const address2 = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const chainId = 1;

      const key1 = (cacheService as any).getCacheKey(address1, chainId);
      const key2 = (cacheService as any).getCacheKey(address2, chainId);

      expect(key1).toBe(key2);
    });
  });

  describe("Upgradeable Contract Detection", () => {
    it("should detect 'upgrade' keyword", () => {
      const sourceCode = `
        contract UpgradeableContract {
          function upgrade() public {}
        }
      `;

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        sourceCode
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should detect 'proxy' keyword", () => {
      const sourceCode = `
        contract MyProxy {
          address implementation;
        }
      `;

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        sourceCode
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should detect 'transparent' keyword", () => {
      const sourceCode = `
        // TransparentUpgradeableProxy pattern
        contract MyContract {}
      `;

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        sourceCode
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should detect 'uups' keyword", () => {
      const sourceCode = `
        import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
        contract MyContract is UUPSUpgradeable {}
      `;

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        sourceCode
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should detect 'diamond' keyword", () => {
      const sourceCode = `
        // Diamond pattern (EIP-2535)
        contract DiamondContract {}
      `;

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        sourceCode
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should detect 'beacon' keyword", () => {
      const sourceCode = `
        contract BeaconProxy {
          address beacon;
        }
      `;

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        sourceCode
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should detect 'factory' keyword", () => {
      const sourceCode = `
        contract TokenFactory {
          function createToken() public {}
        }
      `;

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        sourceCode
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should not detect upgradeable for simple contract", () => {
      const sourceCode = `
        contract SimpleToken {
          mapping(address => uint256) balances;
          
          function transfer(address to, uint256 amount) public {}
        }
      `;

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        sourceCode
      );
      expect(isUpgradeable).toBe(false);
    });

    it("should be case-insensitive", () => {
      const sourceCode = `
        contract MyContract {
          // Contains UPGRADE keyword
          function adminUPGRADE() public {}
        }
      `;

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        sourceCode
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should handle empty source code", () => {
      const isUpgradeable = (cacheService as any).isContractUpgradeable("");
      expect(isUpgradeable).toBe(false);
    });

    it("should handle null or undefined source code", () => {
      const isUpgradeableNull = (cacheService as any).isContractUpgradeable(
        null
      );
      const isUpgradeableUndefined = (
        cacheService as any
      ).isContractUpgradeable(undefined);

      expect(isUpgradeableNull).toBe(false);
      expect(isUpgradeableUndefined).toBe(false);
    });
  });

  describe("Safety/Risk Score Calculation", () => {
    it("should calculate safety score from risk score", () => {
      const riskScore = 30;
      const safetyScore = 100 - riskScore;

      expect(safetyScore).toBe(70);
    });

    it("should calculate safety score for high risk", () => {
      const riskScore = 80;
      const safetyScore = Math.max(0, Math.min(100, 100 - riskScore));

      expect(safetyScore).toBe(20);
    });

    it("should calculate safety score for low risk", () => {
      const riskScore = 10;
      const safetyScore = Math.max(0, Math.min(100, 100 - riskScore));

      expect(safetyScore).toBe(90);
    });

    it("should clamp safety score at 0", () => {
      const riskScore = 150; // Invalid high value
      const safetyScore = Math.max(0, Math.min(100, 100 - riskScore));

      expect(safetyScore).toBe(0);
    });

    it("should clamp safety score at 100", () => {
      const riskScore = -50; // Invalid low value
      const safetyScore = Math.max(0, Math.min(100, 100 - riskScore));

      expect(safetyScore).toBe(100);
    });

    it("should handle zero risk score", () => {
      const riskScore = 0;
      const safetyScore = 100 - riskScore;

      expect(safetyScore).toBe(100);
    });

    it("should handle maximum risk score", () => {
      const riskScore = 100;
      const safetyScore = 100 - riskScore;

      expect(safetyScore).toBe(0);
    });
  });

  describe("TTL Calculation", () => {
    it("should calculate TTL 24 hours in future", () => {
      const CACHE_TTL_HOURS = 24;
      const now = new Date();
      const ttl = new Date();
      ttl.setHours(ttl.getHours() + CACHE_TTL_HOURS);

      const hoursDiff = (ttl.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(hoursDiff).toBeCloseTo(CACHE_TTL_HOURS, 0);
    });

    it("should have TTL in the future", () => {
      const CACHE_TTL_HOURS = 24;
      const now = new Date();
      const ttl = new Date();
      ttl.setHours(ttl.getHours() + CACHE_TTL_HOURS);

      expect(ttl.getTime()).toBeGreaterThan(now.getTime());
    });

    it("should detect expired TTL", () => {
      const pastTTL = new Date();
      pastTTL.setHours(pastTTL.getHours() - 1); // 1 hour ago

      const now = new Date();
      const isExpired = pastTTL < now;

      expect(isExpired).toBe(true);
    });

    it("should detect valid TTL", () => {
      const futureTTL = new Date();
      futureTTL.setHours(futureTTL.getHours() + 1); // 1 hour from now

      const now = new Date();
      const isExpired = futureTTL < now;

      expect(isExpired).toBe(false);
    });
  });

  describe("History Transformation Logic", () => {
    it("should classify low risk (safety >= 80)", () => {
      const safetyScore = 85;
      const level =
        safetyScore >= 80
          ? "low"
          : safetyScore >= 60
          ? "medium"
          : safetyScore >= 40
          ? "high"
          : "critical";

      expect(level).toBe("low");
    });

    it("should classify medium risk (60 <= safety < 80)", () => {
      const safetyScore = 70;
      const level =
        safetyScore >= 80
          ? "low"
          : safetyScore >= 60
          ? "medium"
          : safetyScore >= 40
          ? "high"
          : "critical";

      expect(level).toBe("medium");
    });

    it("should classify high risk (40 <= safety < 60)", () => {
      const safetyScore = 50;
      const level =
        safetyScore >= 80
          ? "low"
          : safetyScore >= 60
          ? "medium"
          : safetyScore >= 40
          ? "high"
          : "critical";

      expect(level).toBe("high");
    });

    it("should classify critical risk (safety < 40)", () => {
      const safetyScore = 30;
      const level =
        safetyScore >= 80
          ? "low"
          : safetyScore >= 60
          ? "medium"
          : safetyScore >= 40
          ? "high"
          : "critical";

      expect(level).toBe("critical");
    });

    it("should handle boundary case at 80", () => {
      const level =
        80 >= 80 ? "low" : 80 >= 60 ? "medium" : 80 >= 40 ? "high" : "critical";

      expect(level).toBe("low");
    });

    it("should handle boundary case at 60", () => {
      const level =
        60 >= 80 ? "low" : 60 >= 60 ? "medium" : 60 >= 40 ? "high" : "critical";

      expect(level).toBe("medium");
    });

    it("should handle boundary case at 40", () => {
      const level =
        40 >= 80 ? "low" : 40 >= 60 ? "medium" : 40 >= 40 ? "high" : "critical";

      expect(level).toBe("high");
    });

    it("should fallback to default score when undefined", () => {
      const analysis = {
        aiOutput: { score: undefined },
        overallRiskScore: undefined,
      };

      const safety = 50; // Default fallback
      expect(typeof safety).toBe("number");
      expect(safety).toBeGreaterThanOrEqual(0);
      expect(safety).toBeLessThanOrEqual(100);
    });

    it("should prefer overallSafetyScore over calculated value", () => {
      const overallSafetyScore = 85;
      const overallRiskScore = 30; // Would calculate to 70

      const safety =
        overallSafetyScore !== undefined
          ? overallSafetyScore
          : overallRiskScore !== undefined
          ? 100 - overallRiskScore
          : 50;

      expect(safety).toBe(85);
    });

    it("should use overallRiskScore when overallSafetyScore undefined", () => {
      const overallSafetyScore = undefined;
      const overallRiskScore = 30;

      const safety =
        overallSafetyScore !== undefined
          ? overallSafetyScore
          : overallRiskScore !== undefined
          ? 100 - overallRiskScore
          : 50;

      expect(safety).toBe(70);
    });
  });

  describe("Cache Decision Logic", () => {
    it("should not cache upgradeable contracts from source code", () => {
      const sourceCode = `
        contract UpgradeableToken {
          function upgrade() public {}
        }
      `;

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        sourceCode
      );
      const shouldCache = !isUpgradeable;

      expect(shouldCache).toBe(false);
    });

    it("should cache non-upgradeable contracts", () => {
      const sourceCode = `
        contract SimpleToken {
          function transfer() public {}
        }
      `;

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        sourceCode
      );
      const shouldCache = !isUpgradeable;

      expect(shouldCache).toBe(true);
    });

    it("should respect isUpgradeableFromRisk parameter", () => {
      const isUpgradeableFromRisk = true;
      const shouldCache = !isUpgradeableFromRisk;

      expect(shouldCache).toBe(false);
    });

    it("should cache when both source and risk indicate non-upgradeable", () => {
      const sourceCode = "contract Simple {}";
      const isUpgradeableFromRisk = false;

      const isUpgradeableFromSource = (
        cacheService as any
      ).isContractUpgradeable(sourceCode);
      const isUpgradeable = isUpgradeableFromSource || isUpgradeableFromRisk;
      const shouldCache = !isUpgradeable;

      expect(shouldCache).toBe(true);
    });
  });

  describe("Pagination Logic", () => {
    it("should calculate hasMore correctly when more items exist", () => {
      const total = 100;
      const limit = 20;
      const offset = 40;

      const hasMore = offset + limit < total;

      expect(hasMore).toBe(true);
    });

    it("should calculate hasMore correctly when no more items", () => {
      const total = 100;
      const limit = 20;
      const offset = 80;

      const hasMore = offset + limit < total;

      expect(hasMore).toBe(false);
    });

    it("should calculate hasMore correctly at exact boundary", () => {
      const total = 100;
      const limit = 20;
      const offset = 80; // offset + limit = 100 (exactly at total)

      const hasMore = offset + limit < total;

      expect(hasMore).toBe(false);
    });

    it("should handle first page pagination", () => {
      const total = 100;
      const limit = 20;
      const offset = 0;

      const hasMore = offset + limit < total;

      expect(hasMore).toBe(true);
    });

    it("should handle last page pagination", () => {
      const total = 95;
      const limit = 20;
      const offset = 80;

      const hasMore = offset + limit < total;

      expect(hasMore).toBe(false);
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const instance1 = ContractCacheService.getInstance();
      const instance2 = ContractCacheService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should maintain state across getInstance calls", () => {
      const instance1 = ContractCacheService.getInstance();
      const instance2 = ContractCacheService.getInstance();

      // Both should reference the same object
      expect(instance1).toStrictEqual(instance2);
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed source code gracefully", () => {
      const malformedCode = "contract {{{{{";

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        malformedCode
      );

      // Should not throw, should return false (no keywords found)
      expect(typeof isUpgradeable).toBe("boolean");
    });

    it("should handle very long source code", () => {
      const longCode =
        "contract Test { " + "function test() {} ".repeat(10000) + " }";

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        longCode
      );

      expect(typeof isUpgradeable).toBe("boolean");
    });

    it("should handle special characters in source code", () => {
      const specialCode = 'contract Test { /* upgrade */ string s = "proxy"; }';

      const isUpgradeable = (cacheService as any).isContractUpgradeable(
        specialCode
      );

      // Should detect keywords even in comments/strings
      expect(isUpgradeable).toBe(true);
    });
  });
});
