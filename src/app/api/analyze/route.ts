import { NextRequest, NextResponse } from "next/server";
import {
  analyzeRequestSchema,
  scoreResponseSchema,
} from "../../../shared/lib/zodSchemas";
import { resolveContractSource } from "../../../shared/lib/fetchers/contractSource";
import { transformToUnifiedFormat } from "../../../types/contractAnalysis";
import { contractCache } from "../../../shared/lib/cache/mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, chainId } = analyzeRequestSchema.parse(body);

    // Check cache first
    console.log(`🔍 [Analyze] Checking cache for ${address}:${chainId}`);
    const cachedAnalysis = await contractCache.getCachedAnalysis(
      address,
      chainId
    );

    if (cachedAnalysis) {
      console.log(
        `✅ [Analyze] Returning cached analysis for ${address}:${chainId}`
      );

      // Extract score and level from cached analysis
      const score = cachedAnalysis.aiOutput?.score ?? 50;
      const level =
        score >= 80
          ? "low"
          : score >= 60
          ? "medium"
          : score >= 40
          ? "high"
          : "high";

      return NextResponse.json(
        scoreResponseSchema.parse({
          success: true,
          data: {
            address,
            chainId,
            score,
            level,
            timestamp: cachedAnalysis.timestamp,
            findings: [],
            status: "completed",
            contractName: cachedAnalysis.contractInfo.name,
            compilerVersion: cachedAnalysis.contractInfo.compilerVersion,
          },
        }),
        { status: 200 }
      );
    }

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

    // Transform to unified format
    const unified = transformToUnifiedFormat(contractSource);

    // Optionally call inference to get score
    let score: number | undefined;
    let reason: string | undefined;
    try {
      const aiRes = await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/api/infer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            features: unified.verified
              ? {
                  summary: `Verified contract ${unified.address} on chain ${unified.chainId}`,
                  contractName: unified.contractInfo.name,
                  compilerVersion: unified.contractInfo.compilerVersion,
                  sourceCode: unified.sourceCode?.sourceCode,
                  files: unified.sourceCode?.files?.map((f) => f.path) || [],
                  chainId: unified.chainId,
                  address: unified.address,
                }
              : {
                  selectors: unified.bytecodeAnalysis?.selectors || [],
                  opcodeCounters:
                    unified.bytecodeAnalysis?.opcodeCounters || {},
                  bytecodeLength: unified.contractInfo.bytecodeLength,
                  chainId: unified.chainId,
                  address: unified.address,
                },
            heuristic: unified.bytecodeAnalysis?.risk
              ? {
                  severity: unified.bytecodeAnalysis.risk.severity,
                  risks: unified.bytecodeAnalysis.risk.risks,
                }
              : undefined,
          }),
        }
      );
      if (aiRes.ok) {
        const json = await aiRes.json();
        if (json.success && json.data) {
          score = json.data.score;
          reason = json.data.reason;
        }
      }
    } catch {}

    const level =
      typeof score === "number"
        ? score >= 80
          ? "low"
          : score >= 60
          ? "medium"
          : score >= 40
          ? "high"
          : "high"
        : "high";

    // Add AI output to unified data
    if (score !== undefined && reason) {
      unified.aiOutput = { score, reason };
    }

    // Cache the analysis result (analyze API doesn't have upgradeable info, assume not upgradeable)
    try {
      await contractCache.cacheAnalysis(address, chainId, unified, false);
    } catch (cacheError) {
      console.warn(`⚠️ [Analyze] Failed to cache analysis:`, cacheError);
      // Continue without caching - not critical
    }

    return NextResponse.json(
      scoreResponseSchema.parse({
        success: true,
        data: {
          address,
          chainId,
          score: score ?? 50,
          level,
          timestamp: new Date().toISOString(),
          findings: [],
          status: "completed",
          contractName: unified.contractInfo.name,
          compilerVersion: unified.contractInfo.compilerVersion,
        },
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
