import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inferRiskOn0G } from "../../../../shared/lib/zeroG/infer";
import { genRequestId, logger } from "../../../../shared/lib/logger";

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
  const requestId = genRequestId();
  const log = logger.with("infer", requestId);
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

    // Always use 0G inference with timeout for both verified and unverified
    log.info("Starting 0G inference", {
      hasSource: !!parsed.data.features.sourceCode,
      hasSelectors: Array.isArray(parsed.data.features.selectors),
    });

    try {
      // Set a timeout for 0G inference
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("0G inference timeout")), 15000)
      );

      const inferencePromise = inferRiskOn0G(parsed.data.features);

      const out = (await Promise.race([
        inferencePromise,
        timeoutPromise,
      ])) as unknown;
      // Normalize output to { score, reason }
      const result = (() => {
        if (out && typeof out === "object") {
          const o = out as Record<string, unknown>;
          const score = typeof o["score"] === "number" ? o["score"] : undefined;
          const reason =
            typeof o["reason"] === "string"
              ? (o["reason"] as string)
              : JSON.stringify(out);
          if (typeof score === "number") return { score, reason };
        }
        return { score: 50, reason: "Inference returned unexpected shape" };
      })();
      log.info("0G inference success", { score: result.score });
      return NextResponse.json(
        inferResponseSchema.parse({ success: true, data: result }),
        { status: 200 }
      );
    } catch (error) {
      log.warn("0G inference failed or timed out", { error });

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

      log.info("Fallback heuristic result", fallbackResult);

      return NextResponse.json(
        inferResponseSchema.parse({ success: true, data: fallbackResult }),
        { status: 200 }
      );
    }
  } catch (error) {
    const requestId = genRequestId();
    logger.error("/api/infer error", { context: "infer", requestId, error });
    return NextResponse.json(
      inferResponseSchema.parse({
        success: false,
        error: "Server error",
      }),
      { status: 500 }
    );
  }
}
