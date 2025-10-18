import { z } from "zod";

// Contract address validation with chain ID
export const contractAddressSchema = z.object({
  address: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      "Please enter a valid Ethereum address (0x followed by 40 characters)"
    )
    .min(42, "Address too short")
    .max(42, "Address too long"),
  chainId: z.number().min(1, "Invalid chain ID"),
});

// Analysis result schema
export const analysisResultSchema = z.object({
  address: z.string(),
  chainId: z.number().min(1),
  score: z.number().min(0).max(100),
  level: z.enum(["low", "medium", "high"]),
  timestamp: z.string().datetime(),
  findings: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]),
    })
  ),
  status: z.enum(["pending", "completed", "failed"]),
  contractName: z.string().optional(),
  compilerVersion: z.string().optional(),
});

// API response schemas
export const scoreResponseSchema = z.object({
  success: z.boolean(),
  data: analysisResultSchema.optional(),
  error: z.string().optional(),
});

export const analyzeRequestSchema = z.object({
  address: z.string(),
  chainId: z.number().min(1, "Invalid chain ID"),
});

export type ContractAddress = z.infer<typeof contractAddressSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type ScoreResponse = z.infer<typeof scoreResponseSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

// Community comments schemas
export const commentArtifactSchema = z.object({
  type: z.enum(["poc", "tx-trace", "report", "other"]),
  cid: z.string().min(10),
  title: z.string().optional(),
  url: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const moderationInfoSchema = z.object({
  toxicityScore: z.number().min(0).max(1).optional(),
  spamScore: z.number().min(0).max(1).optional(),
  flaggedReasons: z.array(z.string()).optional(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.coerce.date().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

export const reputationSnapshotSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  badges: z.array(z.string()).optional(),
});

export const communityCommentSchema = z.object({
  _id: z.string().optional(),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().min(1),
  message: z.string().min(1).max(5000),
  artifacts: z.array(commentArtifactSchema).optional(),
  author: z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    displayName: z.string().optional(),
  }),
  signature: z.string().optional(),
  moderation: moderationInfoSchema,
  reputation: reputationSnapshotSchema.optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

export type CommentArtifact = z.infer<typeof commentArtifactSchema>;
export type ModerationInfo = z.infer<typeof moderationInfoSchema>;
export type ReputationSnapshot = z.infer<typeof reputationSnapshotSchema>;
export type CommunityCommentInput = z.infer<typeof communityCommentSchema>;
