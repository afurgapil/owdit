import { z } from "zod";

// Ethereum address validation
export const contractAddressSchema = z.object({
  address: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      "Please enter a valid Ethereum address (0x followed by 40 characters)"
    )
    .min(42, "Address too short")
    .max(42, "Address too long"),
});

// Analysis result schema
export const analysisResultSchema = z.object({
  address: z.string(),
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
});

// API response schemas
export const scoreResponseSchema = z.object({
  success: z.boolean(),
  data: analysisResultSchema.optional(),
  error: z.string().optional(),
});

export const analyzeRequestSchema = z.object({
  address: z.string(),
});

export type ContractAddress = z.infer<typeof contractAddressSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type ScoreResponse = z.infer<typeof scoreResponseSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
