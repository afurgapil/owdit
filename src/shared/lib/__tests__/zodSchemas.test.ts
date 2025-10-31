import {
  contractAddressSchema,
  analysisResultSchema,
  scoreResponseSchema,
  analyzeRequestSchema,
  communityCommentSchema,
  commentArtifactSchema,
  moderationInfoSchema,
  reputationSnapshotSchema,
} from "../zodSchemas";
import { ZodError } from "zod";

describe("Zod Schemas", () => {
  describe("contractAddressSchema", () => {
    it("should validate correct Ethereum address with chainId", () => {
      const valid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
      };

      expect(() => contractAddressSchema.parse(valid)).not.toThrow();
    });

    it("should accept valid checksummed addresses", () => {
      const valid = {
        address: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        chainId: 11155111,
      };

      expect(() => contractAddressSchema.parse(valid)).not.toThrow();
    });

    it("should reject address without 0x prefix", () => {
      const invalid = {
        address: "1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
      };

      expect(() => contractAddressSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject address that is too short", () => {
      const invalid = {
        address: "0x1234",
        chainId: 1,
      };

      expect(() => contractAddressSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject address that is too long", () => {
      const invalid = {
        address: "0x1234567890abcdef1234567890abcdef123456789",
        chainId: 1,
      };

      expect(() => contractAddressSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject invalid chainId (0)", () => {
      const invalid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 0,
      };

      expect(() => contractAddressSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject negative chainId", () => {
      const invalid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: -1,
      };

      expect(() => contractAddressSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject address with invalid characters", () => {
      const invalid = {
        address: "0x1234567890abcdef1234567890abcdef1234567g",
        chainId: 1,
      };

      expect(() => contractAddressSchema.parse(invalid)).toThrow(ZodError);
    });
  });

  describe("analysisResultSchema", () => {
    it("should validate complete analysis result", () => {
      const valid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        score: 75,
        level: "medium" as const,
        timestamp: new Date().toISOString(),
        findings: [],
        status: "completed" as const,
        contractName: "MyToken",
        compilerVersion: "0.8.19",
      };

      expect(() => analysisResultSchema.parse(valid)).not.toThrow();
    });

    it("should validate minimal analysis result", () => {
      const valid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        score: 50,
        level: "high" as const,
        timestamp: new Date().toISOString(),
        findings: [],
        status: "completed" as const,
      };

      expect(() => analysisResultSchema.parse(valid)).not.toThrow();
    });

    it("should validate analysis result with findings", () => {
      const valid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        score: 30,
        level: "high" as const,
        timestamp: new Date().toISOString(),
        findings: [
          {
            title: "Reentrancy Risk",
            detail: "Potential reentrancy vulnerability detected",
            severity: "critical" as const,
          },
        ],
        status: "completed" as const,
      };

      expect(() => analysisResultSchema.parse(valid)).not.toThrow();
    });

    it("should reject score below 0", () => {
      const invalid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        score: -1,
        level: "high" as const,
        timestamp: new Date().toISOString(),
        findings: [],
        status: "completed" as const,
      };

      expect(() => analysisResultSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject score above 100", () => {
      const invalid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        score: 101,
        level: "low" as const,
        timestamp: new Date().toISOString(),
        findings: [],
        status: "completed" as const,
      };

      expect(() => analysisResultSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject invalid level", () => {
      const invalid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        score: 50,
        level: "invalid",
        timestamp: new Date().toISOString(),
        findings: [],
        status: "completed" as const,
      };

      expect(() => analysisResultSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject invalid status", () => {
      const invalid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        score: 50,
        level: "medium" as const,
        timestamp: new Date().toISOString(),
        findings: [],
        status: "invalid",
      };

      expect(() => analysisResultSchema.parse(invalid)).toThrow(ZodError);
    });
  });

  describe("scoreResponseSchema", () => {
    it("should validate successful response", () => {
      const valid = {
        success: true,
        data: {
          address: "0x1234567890abcdef1234567890abcdef12345678",
          chainId: 1,
          score: 75,
          level: "medium" as const,
          timestamp: new Date().toISOString(),
          findings: [],
          status: "completed" as const,
        },
      };

      expect(() => scoreResponseSchema.parse(valid)).not.toThrow();
    });

    it("should validate error response", () => {
      const valid = {
        success: false,
        error: "Contract not found",
      };

      expect(() => scoreResponseSchema.parse(valid)).not.toThrow();
    });

    it("should validate success response without data", () => {
      const valid = {
        success: true,
      };

      expect(() => scoreResponseSchema.parse(valid)).not.toThrow();
    });

    it("should reject response without success field", () => {
      const invalid = {
        data: {},
      };

      expect(() => scoreResponseSchema.parse(invalid)).toThrow(ZodError);
    });
  });

  describe("analyzeRequestSchema", () => {
    it("should validate correct analyze request", () => {
      const valid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
      };

      expect(() => analyzeRequestSchema.parse(valid)).not.toThrow();
    });

    it("should accept different chainIds", () => {
      const valid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 11155111,
      };

      expect(() => analyzeRequestSchema.parse(valid)).not.toThrow();
    });

    it("should reject invalid chainId", () => {
      const invalid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 0,
      };

      expect(() => analyzeRequestSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject missing address", () => {
      const invalid = {
        chainId: 1,
      };

      expect(() => analyzeRequestSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject missing chainId", () => {
      const invalid = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
      };

      expect(() => analyzeRequestSchema.parse(invalid)).toThrow(ZodError);
    });
  });

  describe("commentArtifactSchema", () => {
    it("should validate artifact with all fields", () => {
      const valid = {
        type: "poc" as const,
        cid: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
        title: "Proof of Concept",
        url: "https://example.com/poc",
        metadata: { key: "value" },
      };

      expect(() => commentArtifactSchema.parse(valid)).not.toThrow();
    });

    it("should validate minimal artifact", () => {
      const valid = {
        type: "report" as const,
        cid: "QmValidCID123456",
      };

      expect(() => commentArtifactSchema.parse(valid)).not.toThrow();
    });

    it("should reject invalid artifact type", () => {
      const invalid = {
        type: "invalid",
        cid: "QmValidCID123456",
      };

      expect(() => commentArtifactSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject short CID", () => {
      const invalid = {
        type: "poc" as const,
        cid: "short",
      };

      expect(() => commentArtifactSchema.parse(invalid)).toThrow(ZodError);
    });
  });

  describe("moderationInfoSchema", () => {
    it("should validate moderation info with all fields", () => {
      const valid = {
        toxicityScore: 0.1,
        spamScore: 0.2,
        flaggedReasons: ["spam", "inappropriate"],
        reviewedBy: "0x1234567890abcdef1234567890abcdef12345678",
        reviewedAt: new Date(),
        status: "approved" as const,
      };

      expect(() => moderationInfoSchema.parse(valid)).not.toThrow();
    });

    it("should validate minimal moderation info", () => {
      const valid = {
        status: "pending" as const,
      };

      expect(() => moderationInfoSchema.parse(valid)).not.toThrow();
    });

    it("should use default status if not provided", () => {
      const result = moderationInfoSchema.parse({});
      expect(result.status).toBe("pending");
    });

    it("should reject toxicity score above 1", () => {
      const invalid = {
        toxicityScore: 1.5,
        status: "pending" as const,
      };

      expect(() => moderationInfoSchema.parse(invalid)).toThrow(ZodError);
    });
  });

  describe("reputationSnapshotSchema", () => {
    it("should validate reputation with score and badges", () => {
      const valid = {
        score: 85,
        badges: ["verified", "contributor"],
      };

      expect(() => reputationSnapshotSchema.parse(valid)).not.toThrow();
    });

    it("should validate empty reputation", () => {
      const valid = {};

      expect(() => reputationSnapshotSchema.parse(valid)).not.toThrow();
    });

    it("should reject score above 100", () => {
      const invalid = {
        score: 150,
      };

      expect(() => reputationSnapshotSchema.parse(invalid)).toThrow(ZodError);
    });
  });

  describe("communityCommentSchema", () => {
    it("should validate complete comment", () => {
      const valid = {
        contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        message: "This contract looks safe",
        artifacts: [
          {
            type: "report" as const,
            cid: "QmValidCID123456",
          },
        ],
        author: {
          address: "0xabcdef1234567890abcdef1234567890abcdef12",
          displayName: "Alice",
        },
        signature: "0xsignature",
        moderation: {
          status: "approved" as const,
        },
        reputation: {
          score: 90,
          badges: ["verified"],
        },
      };

      expect(() => communityCommentSchema.parse(valid)).not.toThrow();
    });

    it("should validate minimal comment", () => {
      const valid = {
        contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        message: "Test comment",
        author: {
          address: "0xabcdef1234567890abcdef1234567890abcdef12",
        },
        moderation: {
          status: "pending" as const,
        },
      };

      expect(() => communityCommentSchema.parse(valid)).not.toThrow();
    });

    it("should reject empty message", () => {
      const invalid = {
        contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        message: "",
        author: {
          address: "0xabcdef1234567890abcdef1234567890abcdef12",
        },
        moderation: {
          status: "pending" as const,
        },
      };

      expect(() => communityCommentSchema.parse(invalid)).toThrow(ZodError);
    });

    it("should reject message that is too long", () => {
      const invalid = {
        contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        message: "x".repeat(5001),
        author: {
          address: "0xabcdef1234567890abcdef1234567890abcdef12",
        },
        moderation: {
          status: "pending" as const,
        },
      };

      expect(() => communityCommentSchema.parse(invalid)).toThrow(ZodError);
    });
  });
});
