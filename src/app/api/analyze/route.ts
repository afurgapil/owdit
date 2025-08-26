import { NextRequest, NextResponse } from "next/server";
import {
  analyzeRequestSchema,
  scoreResponseSchema,
} from "../../../shared/lib/zodSchemas";
import { MOCK_ANALYSIS_RESULTS } from "../../../shared/lib/constants";
import { resolveContractSource } from "../../../shared/lib/fetchers/contractSource";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, chainId } = analyzeRequestSchema.parse(body);

    // TODO: In the future, this will:
    // 1. ✅ Fetch contract source code from Etherscan/Sourcify (IMPLEMENTED)
    // 2. Run AI analysis on 0G Compute Network
    // 3. Store results on 0G Storage/DA
    // 4. Record transaction on 0G Chain

    // Fetch contract source code
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    const contractSource = await resolveContractSource(
      chainId,
      address,
      etherscanApiKey
    );

    if (!contractSource) {
      return NextResponse.json(
        scoreResponseSchema.parse({
          success: false,
          error: "Contract source not found or not verified",
        }),
        { status: 404 }
      );
    }

    // For now, simulate the analysis process with real contract data
    const mockResult = {
      ...MOCK_ANALYSIS_RESULTS.completed,
      address: address,
      chainId: chainId,
      timestamp: new Date().toISOString(),
      // Add contract info to mock result
      contractName:
        contractSource.verified === true
          ? contractSource.contractName
          : undefined,
      compilerVersion:
        contractSource.verified === true
          ? contractSource.compilerVersion
          : undefined,
    };

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return NextResponse.json(
      scoreResponseSchema.parse({
        success: true,
        data: mockResult,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Analyze API error:", error);

    if (error instanceof Error && error.message.includes("address")) {
      return NextResponse.json(
        scoreResponseSchema.parse({
          success: false,
          error: "Invalid contract address",
        }),
        { status: 400 }
      );
    }

    return NextResponse.json(
      scoreResponseSchema.parse({
        success: false,
        error: "An error occurred during analysis",
      }),
      { status: 500 }
    );
  }
}
