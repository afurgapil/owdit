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
import { genRequestId, logger } from "../../../../shared/lib/logger";
import { analyzeDeployerWallet } from "../../../../shared/lib/analyzers/deployerAnalysis";
import { analyzeContractInteractions } from "../../../../shared/lib/analyzers/interactionAnalysis";
import { AnalysisProgressTracker } from "../../../../shared/lib/analysisProgress";

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
      deployerAnalysis: z
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
      interactionAnalysis: z
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
      overallRiskScore: z.number().optional(),
      overallSafetyScore: z.number().optional(),
      analysisType: z.enum(["verified", "unverified"]),
      timestamp: z.string(),
    })
    .optional(),
  error: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const requestId = genRequestId();
  const log = logger.with("contract-source", requestId);
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get("chainId") || "1");
    const address = searchParams.get("address");
    const enableProgress = searchParams.get("progress") === "true";

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

    // Initialize progress tracking if enabled (start with cache step)
    let progressTracker: AnalysisProgressTracker | null = null;
    if (enableProgress) {
      // Start with unverified milestones by default; we'll switch logic after source fetch
      progressTracker = new AnalysisProgressTracker(false);
      progressTracker.startStep("check_cache", "Checking cached analysis...");
    }

    // Check cache first
    log.info("Checking cache", { address, chainId });
    const cachedAnalysis = await contractCache.getCachedAnalysis(
      address,
      chainId
    );

    if (cachedAnalysis) {
      if (progressTracker) {
        progressTracker.completeStep("check_cache", "Found cached analysis");
      }
      log.info("Returning cached analysis", { address, chainId });
      const normalized = normalizeUnifiedData(cachedAnalysis);
      if (!normalized) {
        // Bad cache entry; delete and treat as cache miss
        try {
          await contractCache.deleteCachedAnalysis(address, chainId);
          log.warn("Deleted invalid cached analysis", { address, chainId });
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
    } else if (progressTracker) {
      progressTracker.completeStep("check_cache", "No cached analysis found");
    }

    // Progress tracker already initialized above if enabled

    // Get Etherscan API key from environment (optional)
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;

    // Fetch contract source
    if (progressTracker) {
      progressTracker.startStep("fetch_source", "Fetching contract source code...");
    }
    
    const contractSource = await resolveContractSource(
      chainId,
      address,
      etherscanApiKey
    );

    if (progressTracker) {
      if (contractSource) {
        progressTracker.completeStep("fetch_source", "Contract source code retrieved successfully");
      } else {
        progressTracker.completeStep("fetch_source", "Contract not verified, switching to bytecode analysis");
        progressTracker.startStep("fetch_bytecode", "Fetching contract bytecode...");
        // Assume immediate availability for UX purposes; underlying fetchers run next
        progressTracker.completeStep("fetch_bytecode", "Contract bytecode retrieved successfully");
      }
    }

    if (!contractSource) {
      log.info("Contract not verified, trying risk analysis fallback");
      // If contract source not found, try risk analysis as fallback
      try {
        const riskUrl = `${
          request.nextUrl.origin
        }/api/contract-analysis/risk?address=${encodeURIComponent(
          address
        )}&chainId=${chainId}`;
        log.debug("Calling risk API", { riskUrl });

        const riskResponse = await fetch(riskUrl);
        log.debug("Risk API response", {
          ok: riskResponse.ok,
          status: riskResponse.status,
        });

        if (riskResponse.ok) {
          const riskData = await riskResponse.json();
          log.info("Risk data received", {
            success: riskData.success,
            hasData: !!riskData.data,
            dataKeys: riskData.data ? Object.keys(riskData.data) : [],
            riskSeverity: riskData.data?.risk?.severity,
            selectorsCount: riskData.data?.selectors?.length,
            bytecodeLength: riskData.data?.bytecodeLength,
          });

          if (riskData.success && riskData.data) {
            log.info("Transforming risk data to unified format");
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
            
            // Add deployer and interaction analysis from risk API
            if (riskData.data.deployerAnalysis) {
              unifiedData.deployerAnalysis = riskData.data.deployerAnalysis;
            }
            if (riskData.data.interactionAnalysis) {
              unifiedData.interactionAnalysis = riskData.data.interactionAnalysis;
            }
            if (riskData.data.overallRiskScore) {
              unifiedData.overallRiskScore = riskData.data.overallRiskScore;
            }
            
            log.info("Unified risk data prepared with enhanced analysis");

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
              log.warn("Failed to cache risk analysis", { error: cacheError });
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
        log.error("Risk analysis fallback failed", { error: riskError });
      }

      return NextResponse.json(
        contractSourceResponseSchema.parse({
          success: false,
          error: "Contract source not found and risk analysis failed",
        }),
        { status: 404 }
      );
    }

    log.info("Contract verified, transforming to unified format");
    const unifiedData = transformToUnifiedFormat(contractSource);
    log.info("Unified data prepared");

    // Add AI analysis for verified contracts
    let aiOutput = null;
    try {
      if (progressTracker) {
        progressTracker.startStep("ai_analysis", "Running AI security analysis...");
      }
      log.info("Calling 0G AI inference for verified contract");
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
            if (progressTracker) {
              progressTracker.completeStep("ai_analysis", "AI security analysis completed successfully");
            }
            log.info("AI inference successful for verified contract", {
              ai: aiOutput,
            });
          } else {
            if (progressTracker) {
              progressTracker.failStep("ai_analysis", "AI inference returned non-success");
            }
            log.warn("AI inference returned non-success", {
              status: aiResponse.status,
            });
          }
        } else {
          if (progressTracker) {
            progressTracker.failStep("ai_analysis", "AI inference HTTP error");
          }
          log.warn("AI inference HTTP error", { status: aiResponse.status });
        }
      } else {
        log.warn("Contract is not verified, skipping AI inference");
      }
    } catch (aiError) {
      if (progressTracker) {
        progressTracker.failStep("ai_analysis", "AI inference failed: " + (aiError as Error).message);
      }
      log.warn("AI inference failed for verified contract", { error: aiError });
    }

    // Add AI output to unified data
    if (aiOutput) {
      unifiedData.aiOutput = aiOutput;
    }

    // Add deployer analysis
    let deployerAnalysis = null;
    if (etherscanApiKey) {
      try {
        if (progressTracker) {
          progressTracker.startStep("deployer_analysis", "Analyzing deployer wallet...");
        }
        log.info("Starting deployer analysis");
        deployerAnalysis = await analyzeDeployerWallet(chainId, address, etherscanApiKey);
        if (deployerAnalysis) {
          if (progressTracker) {
            progressTracker.completeStep("deployer_analysis", "Deployer wallet analysis completed successfully");
          }
          log.info("Deployer analysis completed", {
            deployerAddress: deployerAnalysis.address,
            reputationScore: deployerAnalysis.reputationScore,
            riskLevel: deployerAnalysis.riskLevel,
          });
        }
      } catch (deployerError) {
        if (progressTracker) {
          progressTracker.failStep("deployer_analysis", "Deployer analysis failed: " + (deployerError as Error).message);
        }
        log.warn("Deployer analysis failed", { error: deployerError });
      }
    } else {
      if (progressTracker) {
        progressTracker.failStep("deployer_analysis", "Etherscan API key not available");
      }
      log.warn("Etherscan API key not available, skipping deployer analysis");
    }

    // Add deployer analysis to unified data
    if (deployerAnalysis) {
      unifiedData.deployerAnalysis = deployerAnalysis;
    }

    // Add interaction analysis
    let interactionAnalysis = null;
    if (etherscanApiKey) {
      try {
        if (progressTracker) {
          progressTracker.startStep("interaction_analysis", "Analyzing contract interactions...");
        }
        log.info("Starting interaction analysis");
        interactionAnalysis = await analyzeContractInteractions(chainId, address, etherscanApiKey);
        if (interactionAnalysis) {
          if (progressTracker) {
            progressTracker.completeStep("interaction_analysis", "Contract interaction analysis completed successfully");
          }
          log.info("Interaction analysis completed", {
            totalTransactions: interactionAnalysis.totalTransactions,
            uniqueUsers: interactionAnalysis.uniqueUsers,
            activityLevel: interactionAnalysis.activityLevel,
            riskLevel: interactionAnalysis.riskLevel,
          });
        }
      } catch (interactionError) {
        if (progressTracker) {
          progressTracker.failStep("interaction_analysis", "Interaction analysis failed: " + (interactionError as Error).message);
        }
        log.warn("Interaction analysis failed", { error: interactionError });
      }
    } else {
      if (progressTracker) {
        progressTracker.failStep("interaction_analysis", "Etherscan API key not available");
      }
      log.warn("Etherscan API key not available, skipping interaction analysis");
    }

    // Add interaction analysis to unified data
    if (interactionAnalysis) {
      unifiedData.interactionAnalysis = interactionAnalysis;
    }

    // Calculate overall risk score
    if (progressTracker) {
      progressTracker.startStep("risk_calculation", "Calculating final risk score...");
    }
    let overallRiskScore = 0;
    
    if (unifiedData.verified) {
      // aiOutput.score is SAFETY now → convert to risk first
      const aiSafety = unifiedData.aiOutput?.score ?? 50;
      const aiRisk = 100 - aiSafety;
      const deployerRisk = deployerAnalysis ? (100 - deployerAnalysis.reputationScore) : 0; // lower reputation → higher risk
      const interactionRisk = interactionAnalysis ? 
        (interactionAnalysis.riskLevel === 'high' ? 20 : 
         interactionAnalysis.riskLevel === 'medium' ? 10 : 0) : 0;
      // 80% AI risk, 15% deployer, 5% interaction
      overallRiskScore = Math.round((aiRisk * 0.8) + (deployerRisk * 0.15) + (interactionRisk * 0.05));
      // Ensure overall risk is at least AI risk baseline
      overallRiskScore = Math.max(aiRisk, overallRiskScore);
    } else {
      // For unverified contracts: bytecode analysis is primary
      if (unifiedData.bytecodeAnalysis?.risk) {
        const bytecodeRisk = unifiedData.bytecodeAnalysis.risk.severity === 'high' ? 80 : 
                            unifiedData.bytecodeAnalysis.risk.severity === 'medium' ? 60 :
                            unifiedData.bytecodeAnalysis.risk.severity === 'low' ? 40 : 20;
        const deployerRisk = deployerAnalysis ? (100 - deployerAnalysis.reputationScore) : 50;
        const interactionRisk = interactionAnalysis ? 
          (interactionAnalysis.riskLevel === 'high' ? 80 : 
           interactionAnalysis.riskLevel === 'medium' ? 60 : 40) : 50;
        
        // Weighted average: 60% bytecode, 25% deployer, 15% interaction
        overallRiskScore = Math.round((bytecodeRisk * 0.6) + (deployerRisk * 0.25) + (interactionRisk * 0.15));
      } else if (deployerAnalysis || interactionAnalysis) {
        const deployerRisk = deployerAnalysis ? (100 - deployerAnalysis.reputationScore) : 50;
        const interactionRisk = interactionAnalysis ? 
          (interactionAnalysis.riskLevel === 'high' ? 80 : 
           interactionAnalysis.riskLevel === 'medium' ? 60 : 40) : 50;
        
        overallRiskScore = Math.round((deployerRisk * 0.6) + (interactionRisk * 0.4));
      }
    }

    if (overallRiskScore >= 0) {
      unifiedData.overallRiskScore = overallRiskScore;
      const overallSafetyScore = Math.max(0, Math.min(100, 100 - overallRiskScore));
      (unifiedData as { overallSafetyScore?: number }).overallSafetyScore = overallSafetyScore;
    }

    if (progressTracker) {
      progressTracker.completeStep("risk_calculation", `Final risk score calculated: ${overallRiskScore}/100`);
    }

    // Cache the analysis result (verified contracts are not upgradeable by default)
    try {
      await contractCache.cacheAnalysis(address, chainId, unifiedData, false);
    } catch (cacheError) {
      log.warn("Failed to cache analysis", { error: cacheError });
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
    log.error("Contract source API error", { error });

    return NextResponse.json(
      contractSourceResponseSchema.parse({
        success: false,
        error: "An error occurred while fetching contract source",
      }),
      { status: 500 }
    );
  }
}
