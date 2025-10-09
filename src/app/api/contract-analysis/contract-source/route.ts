import { NextRequest, NextResponse } from "next/server";
import {
  resolveContractSource,
  RiskAnalysisResult,
  ContractSource,
} from "../../../../shared/lib/fetchers/contractSource";
import { z } from "zod";
import {
  transformToUnifiedFormat,
  UnifiedContractAnalysis,
} from "../../../../types/contractAnalysis";
import { contractCache } from "../../../../shared/lib/cache/mongodb";

// Normalize potentially legacy/invalid cached shapes into expected unified schema
function normalizeUnifiedData(
  raw: unknown
): UnifiedContractAnalysis | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const source = raw as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...source };

  // Ensure contractInfo exists and has correct types
  const rawContractInfo = (source["contractInfo"] || {}) as Record<
    string,
    unknown
  >;
  const contractInfo: Record<string, unknown> = { ...rawContractInfo };

  // Coerce name and compilerVersion to strings or drop
  const name = contractInfo["name"];
  if (name !== undefined) {
    contractInfo["name"] =
      typeof name === "string" && name.length > 0 ? name : undefined;
  }

  const compilerVersion = contractInfo["compilerVersion"];
  if (compilerVersion !== undefined) {
    contractInfo["compilerVersion"] =
      typeof compilerVersion === "string" && compilerVersion.length > 0
        ? compilerVersion
        : undefined;
  }

  // Coerce isContract to boolean if provided as string
  const isContract = contractInfo["isContract"];
  if (typeof isContract !== "boolean") {
    if (typeof isContract === "string") {
      const lower = isContract.toLowerCase();
      if (lower === "true" || lower === "false") {
        contractInfo["isContract"] = lower === "true";
      }
    }
  }

  const bytecodeLength = contractInfo["bytecodeLength"];
  if (bytecodeLength !== undefined) {
    const coerced =
      typeof bytecodeLength === "number"
        ? bytecodeLength
        : Number.parseInt(String(bytecodeLength), 10);
    contractInfo["bytecodeLength"] = Number.isFinite(coerced)
      ? coerced
      : undefined;
  }
  normalized["contractInfo"] = contractInfo;

  // Guard bytecodeAnalysis shape; drop if invalid
  const ba = source["bytecodeAnalysis"] as unknown;
  const baObj =
    ba && typeof ba === "object" ? (ba as Record<string, unknown>) : null;
  const baValid = !!(
    baObj &&
    Array.isArray(baObj["selectors"]) &&
    typeof baObj["opcodeCounters"] === "object" &&
    baObj["risk"] &&
    typeof baObj["risk"] === "object" &&
    Array.isArray((baObj["risk"] as Record<string, unknown>)["risks"]) &&
    typeof (baObj["risk"] as Record<string, unknown>)["severity"] === "string"
  );
  if (!baValid) {
    normalized["bytecodeAnalysis"] = undefined;
  }

  // Validate sourceCode shape: must be object with files: [{path, content}]
  const sc = source["sourceCode"] as unknown;
  const scObj =
    sc && typeof sc === "object" ? (sc as Record<string, unknown>) : null;
  const files = scObj?.["files"] as unknown as Array<unknown> | undefined;
  const filesValid = Array.isArray(files)
    ? files.every(
        (f) =>
          f &&
          typeof f === "object" &&
          typeof (f as Record<string, unknown>)["path"] === "string" &&
          typeof (f as Record<string, unknown>)["content"] === "string"
      )
    : false;
  if (!filesValid) {
    normalized["sourceCode"] = undefined;
  }

  // Ensure aiOutput is either a valid object shape or undefined
  const ai = source["aiOutput"] as unknown;
  const aiObj =
    ai && typeof ai === "object" ? (ai as Record<string, unknown>) : null;
  const aiValid = !!(
    aiObj &&
    typeof aiObj["score"] === "number" &&
    Number.isFinite(aiObj["score"]) &&
    typeof aiObj["reason"] === "string"
  );
  if (!aiValid) {
    normalized["aiOutput"] = undefined;
  }

  return normalized as unknown as UnifiedContractAnalysis;
}

// Request validation schema
const contractSourceRequestSchema = z.object({
  chainId: z.number().min(1),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

// Response schema - unified format
const contractSourceResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      verified: z.boolean(),
      chainId: z.number(),
      address: z.string(),
      contractInfo: z.object({
        name: z.string().optional(),
        compilerVersion: z.string().optional(),
        isContract: z.boolean(),
        bytecodeLength: z.number().optional(),
      }),
      sourceCode: z
        .object({
          files: z.array(
            z.object({
              path: z.string(),
              content: z.string(),
            })
          ),
          abi: z.any().optional(),
          sourceCode: z.string().optional(),
        })
        .optional(),
      bytecodeAnalysis: z
        .object({
          selectors: z.array(z.string()),
          opcodeCounters: z.record(z.string(), z.number()),
          risk: z.object({
            severity: z.enum(["none", "low", "medium", "high", "unknown"]),
            risks: z.array(z.string()),
          }),
        })
        .optional(),
      aiOutput: z
        .object({
          score: z.number(),
          reason: z.string(),
        })
        .optional(),
      analysisType: z.enum(["verified", "unverified"]),
      timestamp: z.string(),
    })
    .optional(),
  error: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get("chainId") || "1");
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        contractSourceResponseSchema.parse({
          success: false,
          error: "Address parameter is required",
        }),
        { status: 400 }
      );
    }

    // Validate input
    const validation = contractSourceRequestSchema.safeParse({
      chainId,
      address,
    });
    if (!validation.success) {
      return NextResponse.json(
        contractSourceResponseSchema.parse({
          success: false,
          error: "Invalid parameters: " + validation.error.message,
        }),
        { status: 400 }
      );
    }

    // Check cache first
    console.log(`🔍 [ContractSource] Checking cache for ${address}:${chainId}`);
    const cachedAnalysis = await contractCache.getCachedAnalysis(
      address,
      chainId
    );

    if (cachedAnalysis) {
      console.log(
        `✅ [ContractSource] Returning cached analysis for ${address}:${chainId}`
      );
      const normalized = normalizeUnifiedData(cachedAnalysis);
      if (!normalized) {
        // Bad cache entry; delete and treat as cache miss
        try {
          await contractCache.deleteCachedAnalysis(address, chainId);
          console.warn(
            `⚠️ [ContractSource] Deleted invalid cached analysis for ${address}:${chainId}`
          );
        } catch {}
      } else {
        return NextResponse.json(
          contractSourceResponseSchema.parse({
            success: true,
            data: normalized,
          }),
          { status: 200 }
        );
      }
    }

    // Get Etherscan API key from environment (optional)
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;

    // Fetch contract source
    const contractSource = await resolveContractSource(
      chainId,
      address,
      etherscanApiKey
    );

    if (!contractSource) {
      console.log(
        `🔍 [ContractSource] Contract not verified, trying risk analysis fallback`
      );
      // If contract source not found, try risk analysis as fallback
      try {
        const riskUrl = `${
          request.nextUrl.origin
        }/api/contract-analysis/risk?address=${encodeURIComponent(
          address
        )}&chainId=${chainId}`;
        console.log(`🔍 [ContractSource] Calling risk API: ${riskUrl}`);

        const riskResponse = await fetch(riskUrl);
        console.log(`🔍 [ContractSource] Risk API response:`, {
          ok: riskResponse.ok,
          status: riskResponse.status,
        });

        if (riskResponse.ok) {
          const riskData = await riskResponse.json();
          console.log(`✅ [ContractSource] Risk data received:`, {
            success: riskData.success,
            hasData: !!riskData.data,
            dataKeys: riskData.data ? Object.keys(riskData.data) : [],
            riskSeverity: riskData.data?.risk?.severity,
            selectorsCount: riskData.data?.selectors?.length,
            bytecodeLength: riskData.data?.bytecodeLength,
          });

          if (riskData.success && riskData.data) {
            console.log(
              `✅ [ContractSource] Risk data received, transforming to unified format`
            );
            // Transform risk data to match RiskAnalysisResult interface
            const riskAnalysisResult: RiskAnalysisResult = {
              verified: false,
              chainId: riskData.data.chainId,
              address: riskData.data.address,
              isContract: riskData.data.isContract,
              bytecodeLength: riskData.data.bytecodeLength,
              selectors: riskData.data.selectors,
              opcodeCounters: riskData.data.opcodeCounters,
              risk: riskData.data.risk,
              aiOutput: riskData.data.aiOutput,
            };
            const unifiedData = transformToUnifiedFormat(riskAnalysisResult);
            console.log(`✅ [ContractSource] Unified risk data:`, unifiedData);

            // Cache the analysis result (check if upgradeable from risk data)
            const isUpgradeable = riskData.data.isUpgradeable || false;
            try {
              await contractCache.cacheAnalysis(
                address,
                chainId,
                unifiedData,
                isUpgradeable
              );
            } catch (cacheError) {
              console.warn(
                `⚠️ [ContractSource] Failed to cache risk analysis:`,
                cacheError
              );
            }

            return NextResponse.json(
              contractSourceResponseSchema.parse({
                success: true,
                data: unifiedData,
              }),
              { status: 200 }
            );
          }
        }
      } catch (riskError) {
        console.error(
          `❌ [ContractSource] Risk analysis fallback failed:`,
          riskError
        );
      }

      return NextResponse.json(
        contractSourceResponseSchema.parse({
          success: false,
          error: "Contract source not found and risk analysis failed",
        }),
        { status: 404 }
      );
    }

    console.log(
      `✅ [ContractSource] Contract verified, transforming to unified format`
    );
    const unifiedData = transformToUnifiedFormat(contractSource);
    console.log(`✅ [ContractSource] Unified data:`, unifiedData);

    // Add AI analysis for verified contracts
    let aiOutput = null;
    try {
      console.log(
        `🤖 [ContractSource] Calling 0G AI inference for verified contract`
      );
      // Type guard to ensure we have verified contract data
      if (contractSource.verified && "contractName" in contractSource) {
        const verifiedContract = contractSource as ContractSource; // Type assertion for verified contract

        const aiResponse = await fetch(
          `${
            process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
          }/api/contract-analysis/infer`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              features: {
                summary: `Verified contract ${contractSource.address} on chain ${contractSource.chainId}`,
                contractName: verifiedContract.contractName,
                compilerVersion: verifiedContract.compilerVersion,
                sourceCode: verifiedContract.sourceCode,
                files:
                  verifiedContract.files?.map(
                    (f: { path: string }) => f.path
                  ) || [],
                chainId: contractSource.chainId,
                address: contractSource.address,
              },
              heuristic: {
                severity: "none", // Verified contracts are generally safer
                risks: [],
              },
            }),
          }
        );

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          if (aiData.success && aiData.data) {
            aiOutput = aiData.data;
            console.log(
              `✅ [ContractSource] AI inference successful for verified contract:`,
              aiOutput
            );
          }
        }
      } else {
        console.log(
          "⚠️ [ContractSource] Contract is not verified, skipping AI inference"
        );
      }
    } catch (aiError) {
      console.warn(
        `⚠️ [ContractSource] AI inference failed for verified contract (continuing without it):`,
        aiError
      );
    }

    // Add AI output to unified data
    if (aiOutput) {
      unifiedData.aiOutput = aiOutput;
    }

    // Cache the analysis result (verified contracts are not upgradeable by default)
    try {
      await contractCache.cacheAnalysis(address, chainId, unifiedData, false);
    } catch (cacheError) {
      console.warn(`⚠️ [ContractSource] Failed to cache analysis:`, cacheError);
      // Continue without caching - not critical
    }

    return NextResponse.json(
      contractSourceResponseSchema.parse({
        success: true,
        data: unifiedData,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Contract source API error:", error);

    return NextResponse.json(
      contractSourceResponseSchema.parse({
        success: false,
        error: "An error occurred while fetching contract source",
      }),
      { status: 500 }
    );
  }
}
