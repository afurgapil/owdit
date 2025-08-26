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
