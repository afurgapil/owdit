import { NextRequest, NextResponse } from "next/server";
import { analyzeContractInteractions } from "../../../../shared/lib/analyzers/interactionAnalysis";
import { z } from "zod";
import { genRequestId, logger } from "../../../../shared/lib/logger";

// Request validation schema
const interactionAnalysisRequestSchema = z.object({
  chainId: z.number().min(1),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

// Response schema
const interactionAnalysisResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      totalTransactions: z.number(),
      uniqueUsers: z.number(),
      activityLevel: z.enum(["low", "medium", "high"]),
      transactionVolume: z.number(),
      averageTxPerDay: z.number(),
      lastActivity: z.string(),
      riskIndicators: z.array(z.string()),
      riskLevel: z.enum(["low", "medium", "high"]),
      firstTransactionDate: z.string().optional(),
      peakActivityPeriod: z.string().optional(),
      userRetentionRate: z.number().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const requestId = genRequestId();
  const log = logger.with("interaction-analysis", requestId);
  
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get("chainId") || "1");
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        interactionAnalysisResponseSchema.parse({
          success: false,
          error: "Address parameter is required",
        }),
        { status: 400 }
      );
    }

    // Validate input
    const validation = interactionAnalysisRequestSchema.safeParse({
      chainId,
      address,
    });
    
    if (!validation.success) {
      return NextResponse.json(
        interactionAnalysisResponseSchema.parse({
          success: false,
          error: "Invalid parameters: " + validation.error.message,
        }),
        { status: 400 }
      );
    }

    // Get Etherscan API key
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      return NextResponse.json(
        interactionAnalysisResponseSchema.parse({
          success: false,
          error: "Etherscan API key not configured",
        }),
        { status: 500 }
      );
    }

    log.info("Starting interaction analysis", { address, chainId });

    // Analyze contract interactions
    const interactionAnalysis = await analyzeContractInteractions(
      chainId,
      address,
      etherscanApiKey
    );

    if (!interactionAnalysis) {
      return NextResponse.json(
        interactionAnalysisResponseSchema.parse({
          success: false,
          error: "Failed to analyze contract interactions",
        }),
        { status: 404 }
      );
    }

    log.info("Interaction analysis completed", {
      totalTransactions: interactionAnalysis.totalTransactions,
      uniqueUsers: interactionAnalysis.uniqueUsers,
      activityLevel: interactionAnalysis.activityLevel,
      riskLevel: interactionAnalysis.riskLevel,
    });

    return NextResponse.json(
      interactionAnalysisResponseSchema.parse({
        success: true,
        data: interactionAnalysis,
      }),
      { status: 200 }
    );

  } catch (error) {
    log.error("Interaction analysis API error", { error });

    return NextResponse.json(
      interactionAnalysisResponseSchema.parse({
        success: false,
        error: "An error occurred while analyzing contract interactions",
      }),
      { status: 500 }
    );
  }
}
