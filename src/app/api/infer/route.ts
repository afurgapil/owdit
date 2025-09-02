import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inferRiskOn0G } from "../../../shared/lib/zeroG/infer";

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
  }),
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

    const out = await inferRiskOn0G(parsed.data.features);

    return NextResponse.json(
      inferResponseSchema.parse({ success: true, data: out }),
      { status: 200 }
    );
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
