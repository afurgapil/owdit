import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inferRiskOn0G } from "../../../../shared/lib/zeroG/infer";

const inferRequestSchema = z.object({
  features: z.object({
    summary: z.string().optional(),
    selectors: z.array(z.string()).optional(),
    opcodeCounters: z.record(z.string(), z.number()).optional(),
    proxy: z
      .object({
        eip1967Implementation: z.string().nullable().optional(),
        looksLikeEIP1167: z.boolean().optional(),
      })
      .optional(),
    bytecodeLength: z.number().optional(),
    chainId: z.union([z.number(), z.string()]).optional(),
    address: z.string().optional(),
    // Verified contract specific fields
    contractName: z.string().optional(),
    compilerVersion: z.string().optional(),
    sourceCode: z.string().optional(),
    files: z.array(z.string()).optional(),
  }),
  heuristic: z
    .object({
      severity: z.string().optional(),
      risks: z.array(z.string()).optional(),
    })
    .optional(),
});

const inferResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      score: z.number(),
      reason: z.string(),
    })
    .optional(),
  error: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = inferRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        inferResponseSchema.parse({
          success: false,
          error: parsed.error.message,
        }),
        { status: 400 }
      );
    }

    // Check if this is a verified contract (has source code)
    const isVerifiedContract =
      parsed.data.features.sourceCode && parsed.data.features.contractName;

    if (isVerifiedContract) {
      // For verified contracts, provide a mock analysis based on source code
      console.log(
        `🤖 [Infer] Analyzing verified contract: ${parsed.data.features.contractName}`
      );

      const sourceCode = parsed.data.features.sourceCode || "";
      const contractName = parsed.data.features.contractName || "";

      // Simple analysis based on source code patterns
      let score = 50; // Base score
      let reason = "Verified contract analysis";

      // Check for security patterns
      if (sourceCode.includes("onlyOwner")) score += 10;
      if (sourceCode.includes("whenNotPaused")) score += 10;
      if (sourceCode.includes("require(")) score += 5;
      if (sourceCode.includes("modifier")) score += 5;
      if (sourceCode.includes("event")) score += 5;

      // Check for potential issues
      if (sourceCode.includes("selfdestruct")) score -= 20;
      if (sourceCode.includes("delegatecall")) score -= 15;
      if (sourceCode.includes("assembly")) score -= 10;
      if (sourceCode.includes("unchecked")) score -= 5;

      // Ensure score is between 0-100
      score = Math.max(0, Math.min(100, score));

      // Generate reason based on score
      if (score >= 80) {
        reason = `High security contract with good practices. Contract "${contractName}" uses proper access controls and modifiers.`;
      } else if (score >= 60) {
        reason = `Moderate security contract. Contract "${contractName}" has some security measures but could be improved.`;
      } else if (score >= 40) {
        reason = `Low security contract. Contract "${contractName}" has basic security but needs significant improvements.`;
      } else {
        reason = `Poor security contract. Contract "${contractName}" has serious security issues that need immediate attention.`;
      }

      const mockResult = {
        score: score,
        reason: reason,
      };

      console.log(
        `✅ [Infer] Mock analysis for verified contract:`,
        mockResult
      );

      return NextResponse.json(
        inferResponseSchema.parse({ success: true, data: mockResult }),
        { status: 200 }
      );
    } else {
      // For unverified contracts, use 0G inference with timeout
      console.log(`🤖 [Infer] Analyzing unverified contract with 0G AI`);

      try {
        // Set a timeout for 0G inference
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("0G inference timeout")), 15000)
        );

        const inferencePromise = inferRiskOn0G(parsed.data.features);

        const out = await Promise.race([inferencePromise, timeoutPromise]);
        return NextResponse.json(
          inferResponseSchema.parse({ success: true, data: out }),
          { status: 200 }
        );
      } catch (error) {
        console.warn("0G inference failed or timed out:", error);

        // Fallback to heuristic analysis based on bytecode
        const features = parsed.data.features;
        const opcodeCounters = features.opcodeCounters || {};
        const selectors = features.selectors || [];

        let score = 80; // Base score for unverified contracts (high risk)
        let reason = "Unverified contract - source code not available";

        // Risk assessment based on dangerous opcodes (lower score = more dangerous)
        if (opcodeCounters.DELEGATECALL > 0) {
          score = Math.min(score, 20); // Very dangerous
          reason += ". Contains DELEGATECALL - critical risk";
        }
        if (opcodeCounters.SELFDESTRUCT > 0) {
          score = Math.min(score, 15); // Very dangerous
          reason += ". Contains SELFDESTRUCT - critical risk";
        }
        if (opcodeCounters.CALLCODE > 0) {
          score = Math.min(score, 30); // Dangerous
          reason += ". Contains CALLCODE - high risk";
        }
        if (opcodeCounters.CREATE2 > 0) {
          score = Math.min(score, 40); // Medium risk
          reason += ". Contains CREATE2 - medium risk";
        }

        // Adjust based on function count (more functions = more complex = more risk)
        if (selectors.length > 20) {
          score = Math.min(score, score - 10);
          reason += ". High function count - increased complexity";
        }

        // Ensure score is between 0-100 (0 = most dangerous, 100 = safest)
        score = Math.max(0, Math.min(100, score));

        const fallbackResult = {
          score: Math.round(score),
          reason: reason,
        };

        console.log(`✅ [Infer] Fallback analysis result:`, fallbackResult);

        return NextResponse.json(
          inferResponseSchema.parse({ success: true, data: fallbackResult }),
          { status: 200 }
        );
      }
    }
  } catch (error) {
    console.error("/api/infer error", error);
    return NextResponse.json(
      inferResponseSchema.parse({
        success: false,
        error: "Server error",
      }),
      { status: 500 }
    );
  }
}
