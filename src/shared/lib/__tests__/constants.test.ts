import {
  APP_NAME,
  APP_DESCRIPTION,
  API_ENDPOINTS,
  RISK_LEVELS,
  SEVERITY_LEVELS,
  SECURITY_VULNERABILITIES,
} from "../constants";

describe("Constants", () => {
  describe("App Information", () => {
    it("should have correct app name", () => {
      expect(APP_NAME).toBe("Owdit");
      expect(typeof APP_NAME).toBe("string");
    });

    it("should have app description", () => {
      expect(APP_DESCRIPTION).toBe(
        "Smart Contract Security Score - On 0G Network"
      );
      expect(APP_DESCRIPTION).toContain("Smart Contract");
      expect(APP_DESCRIPTION).toContain("0G Network");
    });
  });

  describe("API_ENDPOINTS", () => {
    it("should have SCORE endpoint", () => {
      expect(API_ENDPOINTS.SCORE).toBe("/api/contract-analysis/score");
    });

    it("should have ANALYZE endpoint", () => {
      expect(API_ENDPOINTS.ANALYZE).toBe("/api/contract-analysis/analyze");
    });

    it("should be immutable (readonly)", () => {
      // TypeScript enforces this at compile time
      // Runtime check for object freeze
      expect(Object.isFrozen(API_ENDPOINTS)).toBe(false); // 'as const' doesn't freeze at runtime
      expect(API_ENDPOINTS).toHaveProperty("SCORE");
      expect(API_ENDPOINTS).toHaveProperty("ANALYZE");
    });

    it("should have correct structure", () => {
      expect(typeof API_ENDPOINTS.SCORE).toBe("string");
      expect(typeof API_ENDPOINTS.ANALYZE).toBe("string");
      expect(API_ENDPOINTS.SCORE).toMatch(/^\/api\//);
      expect(API_ENDPOINTS.ANALYZE).toMatch(/^\/api\//);
    });
  });

  describe("RISK_LEVELS", () => {
    it("should have all risk levels defined", () => {
      expect(RISK_LEVELS).toHaveProperty("LOW");
      expect(RISK_LEVELS).toHaveProperty("MEDIUM");
      expect(RISK_LEVELS).toHaveProperty("HIGH");
      expect(RISK_LEVELS).toHaveProperty("CRITICAL");
    });

    it("should have LOW risk with correct range", () => {
      expect(RISK_LEVELS.LOW.min).toBe(80);
      expect(RISK_LEVELS.LOW.max).toBe(100);
      expect(RISK_LEVELS.LOW.label).toBe("Low Risk");
      expect(RISK_LEVELS.LOW.color).toBe("green");
    });

    it("should have MEDIUM risk with correct range", () => {
      expect(RISK_LEVELS.MEDIUM.min).toBe(60);
      expect(RISK_LEVELS.MEDIUM.max).toBe(79);
      expect(RISK_LEVELS.MEDIUM.label).toBe("Medium Risk");
      expect(RISK_LEVELS.MEDIUM.color).toBe("yellow");
    });

    it("should have HIGH risk with correct range", () => {
      expect(RISK_LEVELS.HIGH.min).toBe(40);
      expect(RISK_LEVELS.HIGH.max).toBe(59);
      expect(RISK_LEVELS.HIGH.label).toBe("High Risk");
      expect(RISK_LEVELS.HIGH.color).toBe("orange");
    });

    it("should have CRITICAL risk with correct range", () => {
      expect(RISK_LEVELS.CRITICAL.min).toBe(0);
      expect(RISK_LEVELS.CRITICAL.max).toBe(39);
      expect(RISK_LEVELS.CRITICAL.label).toBe("Critical Risk");
      expect(RISK_LEVELS.CRITICAL.color).toBe("red");
    });

    it("should have continuous ranges without gaps", () => {
      expect(RISK_LEVELS.CRITICAL.max + 1).toBe(RISK_LEVELS.HIGH.min);
      expect(RISK_LEVELS.HIGH.max + 1).toBe(RISK_LEVELS.MEDIUM.min);
      expect(RISK_LEVELS.MEDIUM.max + 1).toBe(RISK_LEVELS.LOW.min);
    });

    it("should cover full score range 0-100", () => {
      expect(RISK_LEVELS.CRITICAL.min).toBe(0);
      expect(RISK_LEVELS.LOW.max).toBe(100);
    });

    it("should have valid structure for each level", () => {
      Object.values(RISK_LEVELS).forEach((level) => {
        expect(level).toHaveProperty("min");
        expect(level).toHaveProperty("max");
        expect(level).toHaveProperty("label");
        expect(level).toHaveProperty("color");
        expect(typeof level.min).toBe("number");
        expect(typeof level.max).toBe("number");
        expect(typeof level.label).toBe("string");
        expect(typeof level.color).toBe("string");
        expect(level.min).toBeLessThanOrEqual(level.max);
      });
    });
  });

  describe("SEVERITY_LEVELS", () => {
    it("should have all severity levels", () => {
      expect(SEVERITY_LEVELS).toHaveProperty("LOW");
      expect(SEVERITY_LEVELS).toHaveProperty("MEDIUM");
      expect(SEVERITY_LEVELS).toHaveProperty("HIGH");
      expect(SEVERITY_LEVELS).toHaveProperty("CRITICAL");
    });

    it("should have correct values", () => {
      expect(SEVERITY_LEVELS.LOW).toBe("low");
      expect(SEVERITY_LEVELS.MEDIUM).toBe("medium");
      expect(SEVERITY_LEVELS.HIGH).toBe("high");
      expect(SEVERITY_LEVELS.CRITICAL).toBe("critical");
    });

    it("should have string values", () => {
      Object.values(SEVERITY_LEVELS).forEach((level) => {
        expect(typeof level).toBe("string");
      });
    });

    it("should have lowercase values", () => {
      Object.values(SEVERITY_LEVELS).forEach((level) => {
        expect(level).toBe(level.toLowerCase());
      });
    });
  });

  describe("SECURITY_VULNERABILITIES", () => {
    it("should be an array", () => {
      expect(Array.isArray(SECURITY_VULNERABILITIES)).toBe(true);
    });

    it("should have at least 5 vulnerability types", () => {
      expect(SECURITY_VULNERABILITIES.length).toBeGreaterThanOrEqual(5);
    });

    it("should include common vulnerabilities", () => {
      expect(SECURITY_VULNERABILITIES).toContain("Reentrancy");
      expect(SECURITY_VULNERABILITIES).toContain("Integer Overflow/Underflow");
      expect(SECURITY_VULNERABILITIES).toContain("Access Control");
      expect(SECURITY_VULNERABILITIES).toContain("Unchecked External Calls");
    });

    it("should have all string values", () => {
      SECURITY_VULNERABILITIES.forEach((vuln) => {
        expect(typeof vuln).toBe("string");
        expect(vuln.length).toBeGreaterThan(0);
      });
    });

    it("should have unique vulnerabilities", () => {
      const unique = new Set(SECURITY_VULNERABILITIES);
      expect(unique.size).toBe(SECURITY_VULNERABILITIES.length);
    });

    it("should include specific critical vulnerabilities", () => {
      const criticalVulns = [
        "Reentrancy",
        "Unsafe Delegate Call",
        "Access Control",
      ];
      criticalVulns.forEach((vuln) => {
        expect(SECURITY_VULNERABILITIES).toContain(vuln);
      });
    });

    it("should have properly formatted vulnerability names", () => {
      SECURITY_VULNERABILITIES.forEach((vuln) => {
        // Should not be empty
        expect(vuln.trim()).toBe(vuln);
        // Should start with capital letter or number
        expect(vuln[0]).toMatch(/[A-Z0-9]/);
      });
    });
  });

  describe("Type Safety", () => {
    it("should have correct types for all constants", () => {
      // String constants
      const _appName: string = APP_NAME;
      const _appDesc: string = APP_DESCRIPTION;
      expect(_appName).toBeDefined();
      expect(_appDesc).toBeDefined();

      // Object constants
      const _endpoints: typeof API_ENDPOINTS = API_ENDPOINTS;
      const _riskLevels: typeof RISK_LEVELS = RISK_LEVELS;
      const _severityLevels: typeof SEVERITY_LEVELS = SEVERITY_LEVELS;
      expect(_endpoints).toBeDefined();
      expect(_riskLevels).toBeDefined();
      expect(_severityLevels).toBeDefined();

      // Array constant
      const _vulns: typeof SECURITY_VULNERABILITIES = SECURITY_VULNERABILITIES;
      expect(_vulns).toBeDefined();
    });
  });
});
