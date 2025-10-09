import { NextRequest, NextResponse } from "next/server";
import { genRequestId, logger } from "../../../../shared/lib/logger";
import { z } from "zod";
import { getChainById } from "../../../../shared/lib/chains";
import { BytecodeAnalyzer } from "../../../../shared/lib/bytecodeAnalyzer";

// ---- Schemas ----
const riskRequestSchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .transform((v) => v.toLowerCase()),
  chainId: z.number().min(1),
});

// ---- Helpers ----
async function rpcCall(
  rpcUrl: string,
  method: string,
  params: unknown[],
  timeoutMs = 15000
) {
  console.log(`🔧 [RPC] Calling ${method} on ${rpcUrl}`, { params, timeoutMs });
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || "RPC error");
    console.log(`✅ [RPC] ${method} success:`, { result: json.result });
    return json.result;
  } catch (error) {
    console.error(`❌ [RPC] ${method} failed:`, error);
    throw error;
  } finally {
    clearTimeout(id);
  }
}

// Removed - now using BytecodeAnalyzer directly

// Removed - now using BytecodeAnalyzer's built-in signature recognition

// Removed - now using BytecodeAnalyzer directly

function looksLikeEIP1167(bytecode: string) {
  const b = (
    bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode
  ).toLowerCase();
  return b.includes("363d3d373d3d3d363d73");
}

const EIP1967_IMPL_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function last20BytesToAddress(hex: string): string | null {
  if (!hex || hex === "0x" || hex.length < 66) return null;
  return "0x" + hex.slice(-40);
}

// Removed - now using BytecodeAnalyzer directly

export async function GET(req: NextRequest) {
  const requestId = genRequestId();
  const log = logger.with("risk", requestId);
  try {
    console.log(`🚀 [Risk API] Starting risk analysis`);
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address") || "";
    const chainIdStr = searchParams.get("chainId") || "1";

    console.log(`📝 [Risk API] Request params:`, {
      address,
      chainId: chainIdStr,
    });

    const parsed = riskRequestSchema.safeParse({
      address,
      chainId: Number(chainIdStr),
    });
    if (!parsed.success) {
      console.error(`❌ [Risk API] Validation failed:`, parsed.error.message);
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 }
      );
    }
    const { address: addr, chainId } = parsed.data;
    const chain = getChainById(chainId);
    if (!chain) {
      console.error(`❌ [Risk API] Unsupported chain: ${chainId}`);
      return NextResponse.json(
        { success: false, error: "Unsupported chain" },
        { status: 400 }
      );
    }

    // RPC URL: allow env override like RPC_URL_11155111
    const envKey = `RPC_URL_${chainId}`;
    const rpcOverride = (process.env as Record<string, string | undefined>)[
      envKey
    ];
    const rpcUrl = rpcOverride || chain.rpc;

    console.log(`🔗 [Risk API] Using RPC:`, {
      chainId,
      chainName: chain.name,
      rpcUrl: rpcUrl.substring(0, 50) + "...",
      hasOverride: !!rpcOverride,
    });

    // 1) get bytecode
    console.log(`🔍 [Risk API] Step 1: Fetching bytecode for ${addr}`);
    const code: string = await rpcCall(rpcUrl, "eth_getCode", [addr, "latest"]);
    if (!code || code === "0x") {
      console.log(`ℹ️ [Risk API] Address ${addr} is not a contract (EOA)`);
      return NextResponse.json(
        { success: true, data: { address: addr, chainId, isContract: false } },
        { status: 200 }
      );
    }
    log.info("Bytecode fetched", { bytes: code.length / 2 });

    // 2) Comprehensive bytecode analysis using new analyzer
    log.info("Running comprehensive bytecode analysis");
    const analysis = BytecodeAnalyzer.analyzeBytecode(addr, code);
    log.info("Bytecode analysis complete", {
      contractType: analysis.contractType,
      complexity: analysis.estimatedComplexity,
      functionCount: analysis.functionSelectors.length,
      riskSeverity: analysis.riskAssessment.severity,
    });

    // 3) Additional proxy detection for upgradeable contracts
    log.info("Checking for proxy patterns");
    const implSlot = await rpcCall(rpcUrl, "eth_getStorageAt", [
      addr,
      EIP1967_IMPL_SLOT,
      "latest",
    ]);
    const implAddr = last20BytesToAddress(implSlot);
    const isUpgradeable = BytecodeAnalyzer.isUpgradeableContract(
      code,
      analysis.functionSelectors
    );

    log.info("Proxy detection", {
      eip1967: implAddr,
      eip1167: looksLikeEIP1167(code),
      isUpgradeable: isUpgradeable,
    });

    // 4) Use analyzer's risk assessment
    log.info("Using analyzer risk assessment");
    const risk = {
      severity:
        analysis.riskAssessment.severity === "critical"
          ? "high"
          : analysis.riskAssessment.severity,
      risks: analysis.riskAssessment.risks,
    };

    // 6) AI inference on 0G (optional, can fail gracefully)
    let aiOutput = null;
    try {
      console.log(`🤖 [Risk API] Step 6: Calling 0G AI inference`);
      const aiResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/api/contract-analysis/infer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            features: {
              summary: `Contract ${addr} on chain ${chainId} - ${analysis.contractType}`,
              selectors: analysis.functionSelectors
                .slice(0, 20)
                .map((s) => s.selector),
              opcodeCounters: analysis.opcodeCounters,
              proxy: {
                eip1967Implementation: implAddr,
                looksLikeEIP1167: looksLikeEIP1167(code),
                isUpgradeable: isUpgradeable,
              },
              bytecodeLength: code.length / 2,
              contractType: analysis.contractType,
              complexity: analysis.estimatedComplexity,
              chainId,
              address: addr,
            },
            heuristic: risk, // Include heuristic severity and risks
          }),
        }
      );

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        if (aiData.success && aiData.data) {
          aiOutput = aiData.data;
          console.log(`✅ [Risk API] AI inference successful:`, aiOutput);
        }
      }
    } catch (aiError) {
      console.warn(
        `⚠️ [Risk API] AI inference failed (continuing without it):`,
        aiError
      );
    }

    console.log(`✅ [Risk API] Analysis complete, returning result`);
    const result = {
      success: true,
      data: {
        verified: false,
        address: addr,
        chainId,
        isContract: true,
        bytecodeLength: code.length / 2,
        selectors: analysis.functionSelectors.map((s) => s.selector),
        opcodeCounters: analysis.opcodeCounters,
        risk,
        aiOutput, // Include AI analysis if available
      },
    };

    console.log(`📊 [Risk API] Final result:`, {
      address: result.data.address,
      chainId: result.data.chainId,
      bytecodeLength: result.data.bytecodeLength,
      selectorsCount: result.data.selectors.length,
      riskSeverity: result.data.risk.severity,
      riskCount: result.data.risk.risks.length,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(`❌ [Risk API] Error occurred:`, err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
