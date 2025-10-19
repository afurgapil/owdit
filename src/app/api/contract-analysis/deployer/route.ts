import { NextRequest, NextResponse } from "next/server";
import { analyzeDeployerWallet } from "../../../../shared/lib/analyzers/deployerAnalysis";
import { DeployerAnalysis } from "../../../../types/contractAnalysis";
import { z } from "zod";
import { genRequestId, logger } from "../../../../shared/lib/logger";

// Request validation schema
const deployerAnalysisRequestSchema = z.object({
  chainId: z.number().min(1),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

// Response schema
const deployerAnalysisResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      address: z.string(),
      reputationScore: z.number(),
      contractCount: z.number(),
      successRate: z.number(),
      timeSinceFirstDeploy: z.number(),
      riskIndicators: z.array(z.string()),
      riskLevel: z.enum(["low", "medium", "high"]),
      firstDeployDate: z.string().optional(),
      lastDeployDate: z.string().optional(),
      totalVolumeDeployed: z.number().optional(),
      averageContractSize: z.number().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const requestId = genRequestId();
  const log = logger.with("deployer-analysis", requestId);
  
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get("chainId") || "1");
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        deployerAnalysisResponseSchema.parse({
          success: false,
          error: "Address parameter is required",
        }),
        { status: 400 }
      );
    }

    // Validate input
    const validation = deployerAnalysisRequestSchema.safeParse({
      chainId,
      address,
    });
    
    if (!validation.success) {
      return NextResponse.json(
        deployerAnalysisResponseSchema.parse({
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
        deployerAnalysisResponseSchema.parse({
          success: false,
          error: "Etherscan API key not configured",
        }),
        { status: 500 }
      );
    }

    log.info("Starting deployer analysis", { address, chainId });

    // Analyze deployer wallet
    const deployerAnalysis = await analyzeDeployerWallet(
      chainId,
      address,
      etherscanApiKey
    );

    if (!deployerAnalysis) {
      return NextResponse.json(
        deployerAnalysisResponseSchema.parse({
          success: false,
          error: "Failed to analyze deployer wallet",
        }),
        { status: 404 }
      );
    }

    log.info("Deployer analysis completed", {
      deployerAddress: deployerAnalysis.address,
      reputationScore: deployerAnalysis.reputationScore,
      contractCount: deployerAnalysis.contractCount,
      riskLevel: deployerAnalysis.riskLevel,
    });

    return NextResponse.json(
      deployerAnalysisResponseSchema.parse({
        success: true,
        data: deployerAnalysis,
      }),
      { status: 200 }
    );

  } catch (error) {
    log.error("Deployer analysis API error", { error });

    return NextResponse.json(
      deployerAnalysisResponseSchema.parse({
        success: false,
        error: "An error occurred while analyzing deployer wallet",
      }),
      { status: 500 }
    );
  }
}
