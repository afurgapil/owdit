import { NextRequest, NextResponse } from "next/server";
import { resolveContractSource } from "../../../shared/lib/fetchers/contractSource";
import { z } from "zod";
import { transformToUnifiedFormat } from "../../../types/contractAnalysis";

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
            severity: z.enum(["low", "medium", "high", "unknown"]),
            risks: z.array(z.string()),
          }),
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
        }/api/risk?address=${encodeURIComponent(address)}&chainId=${chainId}`;
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
            const unifiedData = transformToUnifiedFormat(riskData.data);
            console.log(`✅ [ContractSource] Unified risk data:`, unifiedData);

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
