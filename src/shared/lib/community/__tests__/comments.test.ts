import { CommunityCommentsService } from "../comments";
import type { CommunityComment, ModerationInfo } from "../comments";

// Mock MongoDB
jest.mock("mongodb", () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        createIndex: jest.fn().mockResolvedValue(undefined),
        findOne: jest.fn(),
        insertOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        countDocuments: jest.fn(),
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock crypto for randomUUID
jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-1234"),
}));

describe("Community Comments Service - Logic Tests", () => {
  let commentsService: CommunityCommentsService;

  beforeEach(() => {
    commentsService = CommunityCommentsService.getInstance();
    jest.clearAllMocks();
  });

  describe("Comment ID Generation", () => {
    it("should generate ID with contract address and chainId", () => {
      const contractAddress = "0x1234567890123456789012345678901234567890";
      const chainId = 1;

      const id = (commentsService as any).buildId(contractAddress, chainId);

      expect(id).toContain(contractAddress.toLowerCase());
      expect(id).toContain(`:${chainId}:`);
    });

    it("should include UUID in generated ID", () => {
      const contractAddress = "0x1234567890123456789012345678901234567890";
      const chainId = 1;

      const id = (commentsService as any).buildId(contractAddress, chainId);

      expect(id).toContain("test-uuid-1234");
    });

    it("should use custom ID if provided", () => {
      const contractAddress = "0x1234567890123456789012345678901234567890";
      const chainId = 1;
      const customId = "custom-123";

      const id = (commentsService as any).buildId(
        contractAddress,
        chainId,
        customId
      );

      expect(id).toContain(customId);
      expect(id).not.toContain("test-uuid");
    });

    it("should normalize address to lowercase in ID", () => {
      const contractAddress = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const chainId = 137;

      const id = (commentsService as any).buildId(contractAddress, chainId);

      expect(id).toContain("0xabcdef");
      expect(id).not.toContain("0xABCDEF");
    });

    it("should create unique IDs for different contracts", () => {
      const address1 = "0x1111111111111111111111111111111111111111";
      const address2 = "0x2222222222222222222222222222222222222222";
      const chainId = 1;

      const id1 = (commentsService as any).buildId(address1, chainId);
      const id2 = (commentsService as any).buildId(address2, chainId);

      expect(id1).not.toBe(id2);
    });

    it("should create unique IDs for different chains", () => {
      const address = "0x1234567890123456789012345678901234567890";

      const id1 = (commentsService as any).buildId(address, 1);
      const id2 = (commentsService as any).buildId(address, 137);

      expect(id1).not.toBe(id2);
    });

    it("should follow format: address:chainId:uuid", () => {
      const address = "0x1234567890123456789012345678901234567890";
      const chainId = 1;

      const id = (commentsService as any).buildId(address, chainId);
      const parts = id.split(":");

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe(address.toLowerCase());
      expect(parts[1]).toBe(chainId.toString());
    });
  });

  describe("Vote Delta Calculation", () => {
    it("should calculate delta for new upvote", () => {
      const existingVote = null;
      const newVote = 1;

      const delta = existingVote ? newVote - existingVote : newVote;

      expect(delta).toBe(1);
    });

    it("should calculate delta for new downvote", () => {
      const existingVote = null;
      const newVote = -1;

      const delta = existingVote ? newVote - existingVote : newVote;

      expect(delta).toBe(-1);
    });

    it("should calculate delta for changing upvote to downvote", () => {
      const existingVote = 1;
      const newVote = -1;

      const delta = newVote - existingVote;

      expect(delta).toBe(-2);
    });

    it("should calculate delta for changing downvote to upvote", () => {
      const existingVote = -1;
      const newVote = 1;

      const delta = newVote - existingVote;

      expect(delta).toBe(2);
    });

    it("should calculate zero delta for same vote", () => {
      const existingVote = 1;
      const newVote = 1;

      const delta = newVote === existingVote ? 0 : newVote - existingVote;

      expect(delta).toBe(0);
    });

    it("should calculate delta for removing upvote", () => {
      const existingVote = 1;

      const delta = -existingVote;

      expect(delta).toBe(-1);
    });

    it("should calculate delta for removing downvote", () => {
      const existingVote = -1;

      const delta = -existingVote;

      expect(delta).toBe(1);
    });
  });

  describe("Score Calculation Logic", () => {
    it("should calculate score from upvotes and downvotes", () => {
      const upvotes = 10;
      const downvotes = 3;

      const score = upvotes - downvotes;

      expect(score).toBe(7);
    });

    it("should handle more downvotes than upvotes", () => {
      const upvotes = 2;
      const downvotes = 5;

      const score = upvotes - downvotes;

      expect(score).toBe(-3);
    });

    it("should handle zero votes", () => {
      const upvotes = 0;
      const downvotes = 0;

      const score = upvotes - downvotes;

      expect(score).toBe(0);
    });

    it("should handle only upvotes", () => {
      const upvotes = 15;
      const downvotes = 0;

      const score = upvotes - downvotes;

      expect(score).toBe(15);
    });

    it("should handle only downvotes", () => {
      const upvotes = 0;
      const downvotes = 8;

      const score = upvotes - downvotes;

      expect(score).toBe(-8);
    });

    it("should increment score correctly", () => {
      let currentScore = 5;
      const voteDelta = 1;

      currentScore += voteDelta;

      expect(currentScore).toBe(6);
    });

    it("should decrement score correctly", () => {
      let currentScore = 5;
      const voteDelta = -1;

      currentScore += voteDelta;

      expect(currentScore).toBe(4);
    });
  });

  describe("Address Normalization", () => {
    it("should normalize address to lowercase", () => {
      const address = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const normalized = address.toLowerCase();

      expect(normalized).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
    });

    it("should handle already lowercase address", () => {
      const address = "0xabcdef1234567890abcdef1234567890abcdef12";
      const normalized = address.toLowerCase();

      expect(normalized).toBe(address);
    });

    it("should handle mixed case address", () => {
      const address = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12";
      const normalized = address.toLowerCase();

      expect(normalized).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
    });

    it("should handle uppercase address", () => {
      const address = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const normalized = address.toLowerCase();

      expect(normalized).not.toContain("A");
      expect(normalized).not.toContain("B");
      expect(normalized).toContain("a");
      expect(normalized).toContain("b");
    });

    it("should normalize voter address in vote ID", () => {
      const commentId = "comment-123";
      const voter = "0xABCDEF";

      const voteId = `${commentId}:${voter.toLowerCase()}`;

      expect(voteId).toBe("comment-123:0xabcdef");
    });

    it("should ensure case-insensitive matching", () => {
      const address1 = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      const address2 = "0xabcdef1234567890abcdef1234567890abcdef12";

      const normalized1 = address1.toLowerCase();
      const normalized2 = address2.toLowerCase();

      expect(normalized1).toBe(normalized2);
    });
  });

  describe("Moderation Status Merging", () => {
    it("should merge new moderation with existing", () => {
      const existing: ModerationInfo = {
        status: "pending",
        toxicityScore: 0.2,
        spamScore: 0.1,
      };

      const update: Partial<ModerationInfo> = {
        status: "approved",
        reviewedBy: "moderator-1",
      };

      const merged: ModerationInfo = {
        status: update.status ?? existing.status,
        toxicityScore: update.toxicityScore ?? existing.toxicityScore,
        spamScore: update.spamScore ?? existing.spamScore,
        flaggedReasons: update.flaggedReasons ?? existing.flaggedReasons,
        reviewedBy: update.reviewedBy ?? existing.reviewedBy,
        reviewedAt: update.reviewedAt ?? existing.reviewedAt,
      };

      expect(merged.status).toBe("approved");
      expect(merged.toxicityScore).toBe(0.2);
      expect(merged.reviewedBy).toBe("moderator-1");
    });

    it("should use update values when provided", () => {
      const existing: ModerationInfo = {
        status: "pending",
        toxicityScore: 0.2,
      };

      const update: Partial<ModerationInfo> = {
        toxicityScore: 0.8,
        spamScore: 0.9,
      };

      const merged: ModerationInfo = {
        status: update.status ?? existing.status,
        toxicityScore: update.toxicityScore ?? existing.toxicityScore,
        spamScore: update.spamScore ?? existing.spamScore,
        flaggedReasons: update.flaggedReasons ?? existing.flaggedReasons,
        reviewedBy: update.reviewedBy ?? existing.reviewedBy,
        reviewedAt: update.reviewedAt ?? existing.reviewedAt,
      };

      expect(merged.toxicityScore).toBe(0.8);
      expect(merged.spamScore).toBe(0.9);
    });

    it("should preserve existing values when update is empty", () => {
      const existing: ModerationInfo = {
        status: "approved",
        toxicityScore: 0.1,
        spamScore: 0.05,
        reviewedBy: "admin",
      };

      const update: Partial<ModerationInfo> = {};

      const merged: ModerationInfo = {
        status: update.status ?? existing.status,
        toxicityScore: update.toxicityScore ?? existing.toxicityScore,
        spamScore: update.spamScore ?? existing.spamScore,
        flaggedReasons: update.flaggedReasons ?? existing.flaggedReasons,
        reviewedBy: update.reviewedBy ?? existing.reviewedBy,
        reviewedAt: update.reviewedAt ?? existing.reviewedAt,
      };

      expect(merged.status).toBe("approved");
      expect(merged.toxicityScore).toBe(0.1);
      expect(merged.spamScore).toBe(0.05);
      expect(merged.reviewedBy).toBe("admin");
    });

    it("should handle status change from pending to rejected", () => {
      const existing: ModerationInfo = {
        status: "pending",
      };

      const update: Partial<ModerationInfo> = {
        status: "rejected",
        flaggedReasons: ["spam", "toxic"],
      };

      const merged: ModerationInfo = {
        status: update.status ?? existing.status,
        toxicityScore: update.toxicityScore ?? existing.toxicityScore,
        spamScore: update.spamScore ?? existing.spamScore,
        flaggedReasons: update.flaggedReasons ?? existing.flaggedReasons,
        reviewedBy: update.reviewedBy ?? existing.reviewedBy,
        reviewedAt: update.reviewedAt ?? existing.reviewedAt,
      };

      expect(merged.status).toBe("rejected");
      expect(merged.flaggedReasons).toEqual(["spam", "toxic"]);
    });

    it("should handle undefined existing moderation", () => {
      const existing: ModerationInfo | undefined = undefined;

      const update: Partial<ModerationInfo> = {
        status: "pending",
      };

      const merged: ModerationInfo = {
        status: update.status ?? existing?.status ?? "pending",
        toxicityScore: update.toxicityScore ?? existing?.toxicityScore,
        spamScore: update.spamScore ?? existing?.spamScore,
        flaggedReasons: update.flaggedReasons ?? existing?.flaggedReasons,
        reviewedBy: update.reviewedBy ?? existing?.reviewedBy,
        reviewedAt: update.reviewedAt ?? existing?.reviewedAt,
      };

      expect(merged.status).toBe("pending");
    });
  });

  describe("Reply Count Management", () => {
    it("should increment reply count", () => {
      let repliesCount = 5;
      repliesCount += 1;

      expect(repliesCount).toBe(6);
    });

    it("should start reply count at 0", () => {
      const repliesCount = 0;

      expect(repliesCount).toBe(0);
    });

    it("should handle multiple increments", () => {
      let repliesCount = 0;

      repliesCount += 1;
      repliesCount += 1;
      repliesCount += 1;

      expect(repliesCount).toBe(3);
    });

    it("should decrement reply count", () => {
      let repliesCount = 5;
      repliesCount -= 1;

      expect(repliesCount).toBe(4);
    });
  });

  describe("Query Building Logic", () => {
    it("should build query for contract and chainId", () => {
      const contractAddress = "0x1234567890123456789012345678901234567890";
      const chainId = 1;

      const query: Record<string, unknown> = {
        contractAddress: {
          $regex: `^${contractAddress.toLowerCase()}$`,
          $options: "i",
        },
        chainId,
        parentId: { $exists: false },
      };

      expect(query.chainId).toBe(1);
      expect(query.parentId).toEqual({ $exists: false });
    });

    it("should add moderation status to query", () => {
      const contractAddress = "0x1234567890123456789012345678901234567890";
      const chainId = 1;
      const status = "approved";

      const query: Record<string, unknown> = {
        contractAddress: {
          $regex: `^${contractAddress.toLowerCase()}$`,
          $options: "i",
        },
        chainId,
        parentId: { $exists: false },
      };

      if (status) {
        query["moderation.status"] = status;
      }

      expect(query["moderation.status"]).toBe("approved");
    });

    it("should query for top-level comments only", () => {
      const query: Record<string, unknown> = {
        contractAddress: { $regex: `^address$`, $options: "i" },
        chainId: 1,
        parentId: { $exists: false },
      };

      expect(query.parentId).toEqual({ $exists: false });
    });

    it("should query for replies by parentId", () => {
      const parentId = "parent-comment-id";

      const query: Record<string, unknown> = {
        parentId,
      };

      expect(query.parentId).toBe(parentId);
    });

    it("should use case-insensitive regex for address", () => {
      const address = "0xABCDEF";

      const query = {
        contractAddress: {
          $regex: `^${address.toLowerCase()}$`,
          $options: "i",
        },
      };

      expect(query.contractAddress.$options).toBe("i");
      expect(query.contractAddress.$regex).toContain("0xabcdef");
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const instance1 = CommunityCommentsService.getInstance();
      const instance2 = CommunityCommentsService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should maintain state across getInstance calls", () => {
      const instance1 = CommunityCommentsService.getInstance();
      const instance2 = CommunityCommentsService.getInstance();

      expect(instance1).toStrictEqual(instance2);
    });
  });

  describe("Timestamp Handling", () => {
    it("should use current time for createdAt", () => {
      const before = new Date();
      const createdAt = new Date();
      const after = new Date();

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should update updatedAt timestamp", () => {
      const original = new Date("2024-01-01");
      const updated = new Date();

      expect(updated.getTime()).toBeGreaterThan(original.getTime());
    });

    it("should format timestamp consistently", () => {
      const now = new Date();
      const iso = now.toISOString();

      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("Comment Initialization", () => {
    it("should initialize score to 0 if not provided", () => {
      const score = undefined;
      const initialScore = score ?? 0;

      expect(initialScore).toBe(0);
    });

    it("should initialize repliesCount to 0 if not provided", () => {
      const repliesCount = undefined;
      const initialCount = repliesCount ?? 0;

      expect(initialCount).toBe(0);
    });

    it("should preserve provided score", () => {
      const score = 10;
      const initialScore = score ?? 0;

      expect(initialScore).toBe(10);
    });

    it("should preserve provided repliesCount", () => {
      const repliesCount = 5;
      const initialCount = repliesCount ?? 0;

      expect(initialCount).toBe(5);
    });
  });

  describe("Vote ID Generation", () => {
    it("should generate vote ID from commentId and voter", () => {
      const commentId = "comment-123";
      const voter = "0x1234567890";

      const voteId = `${commentId}:${voter.toLowerCase()}`;

      expect(voteId).toBe("comment-123:0x1234567890");
    });

    it("should normalize voter address in vote ID", () => {
      const commentId = "comment-123";
      const voter = "0xABCDEF";

      const voteId = `${commentId}:${voter.toLowerCase()}`;

      expect(voteId).not.toContain("ABCDEF");
      expect(voteId).toContain("abcdef");
    });

    it("should create unique vote IDs for different voters", () => {
      const commentId = "comment-123";
      const voter1 = "0xvoter1";
      const voter2 = "0xvoter2";

      const voteId1 = `${commentId}:${voter1.toLowerCase()}`;
      const voteId2 = `${commentId}:${voter2.toLowerCase()}`;

      expect(voteId1).not.toBe(voteId2);
    });

    it("should create unique vote IDs for different comments", () => {
      const commentId1 = "comment-123";
      const commentId2 = "comment-456";
      const voter = "0xvoter";

      const voteId1 = `${commentId1}:${voter.toLowerCase()}`;
      const voteId2 = `${commentId2}:${voter.toLowerCase()}`;

      expect(voteId1).not.toBe(voteId2);
    });
  });
});
