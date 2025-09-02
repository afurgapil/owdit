import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getChainById } from "../../../shared/lib/chains";

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

function extractSelectors(bytecode: string): string[] {
  console.log(
    `🔍 [Selector] Extracting selectors from bytecode (${bytecode.length} chars)`
  );
  const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  const sels: Set<string> = new Set();
  let push4Count = 0;

  const step = (s: number) => parseInt(hex.slice(s, s + 2), 16);
  const skipPush = (s: number) => {
    const op = step(s);
    if (op >= 0x60 && op <= 0x7f) {
      const n = op - 0x5f;
      return s + 2 + n * 2;
    }
    return s + 2;
  };

  let i = 0;
  while (i < hex.length - 10) {
    const op = step(i);
    if (op === 0x63) {
      // PUSH4
      const sel = "0x" + hex.slice(i + 2, i + 10);

      // Sonraki birkaç opcode içinde DUPx + EQ + JUMPI var mı?
      let j = i + 10;
      let hasDup = false,
        hasEq = false,
        hasJumpi = false;

      for (let k = 0; k < 6 && j < hex.length - 2; k++) {
        const o = step(j);
        if (o >= 0x80 && o <= 0x8f) hasDup = true; // DUP1..DUP16
        if (o === 0x14) hasEq = true; // EQ
        if (o === 0x57) hasJumpi = true; // JUMPI
        j = skipPush(j);
      }

      if (hasDup && hasEq && hasJumpi) {
        sels.add(sel);
        push4Count++;
      }

      i = i + 10;
    } else {
      i = skipPush(i);
    }
  }

  console.log(
    `✅ [Selector] Found ${sels.size} unique selectors from ${push4Count} PUSH4 opcodes (dispatcher pattern)`
  );
  return [...sels];
}

async function lookupSignatures(hexSelector: string): Promise<string[]> {
  console.log(`🔍 [4byte] Looking up signature for selector: ${hexSelector}`);
  const url = `https://www.4byte.directory/api/v1/signatures/?hex_signature=${hexSelector}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const data = (await res.json()) as {
      results?: Array<{ text_signature: string }>;
    };
    const names = (data?.results || []).map(
      (r: { text_signature: string }) => r.text_signature
    );
    const uniqueNames = Array.from(new Set(names));
    console.log(
      `✅ [4byte] Found ${uniqueNames.length} signatures for ${hexSelector}:`,
      uniqueNames.slice(0, 3)
    );
    return uniqueNames;
  } catch (error) {
    console.warn(`⚠️ [4byte] Failed to lookup ${hexSelector}:`, error);
    return [];
  } finally {
    clearTimeout(id);
  }
}

function opcodeScan(bytecode: string) {
  console.log(`🔍 [Opcode] Scanning bytecode for risk patterns`);
  const hex = (
    bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode
  ).toLowerCase();
  let i = 0;
  const out = {
    CALL: 0,
    CALLCODE: 0,
    DELEGATECALL: 0,
    STATICCALL: 0,
    SELFDESTRUCT: 0,
    CREATE2: 0,
  };

  while (i < hex.length) {
    const op = parseInt(hex.slice(i, i + 2), 16);

    // Risk opcode sayımları
    if (op === 0xf1) out.CALL++;
    else if (op === 0xf2) out.CALLCODE++;
    else if (op === 0xf4) out.DELEGATECALL++;
    else if (op === 0xfa) out.STATICCALL++;
    else if (op === 0xf5) out.CREATE2++;
    else if (op === 0xff) out.SELFDESTRUCT++;

    // PUSH1..PUSH32 ise veriyi atla
    if (op >= 0x60 && op <= 0x7f) {
      const n = op - 0x5f; // 1..32
      i += 2 + n * 2; // opcode + n byte data
    } else {
      i += 2; // tek baytlık opcode
    }
  }

  console.log(`✅ [Opcode] Scan results:`, out);
  return out;
}

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

function classify(signatures: string[], op: ReturnType<typeof opcodeScan>) {
  console.log(
    `🔍 [Classify] Analyzing ${signatures.length} signatures for risks`
  );
  const risks: string[] = [];
  const has = (re: RegExp) => signatures.some((s) => re.test(s));
  const add = (name: string) => risks.push(name);

  // approvals / transfers
  if (has(/^approve\(/i)) add("ERC20 approve");
  if (has(/^increaseAllowance\(/i)) add("ERC20 increaseAllowance");
  if (has(/^decreaseAllowance\(/i)) add("ERC20 decreaseAllowance");
  if (has(/^permit\(/i)) add("ERC20 permit");
  if (has(/^setApprovalForAll\(/i)) add("ERC721/1155 setApprovalForAll");
  if (has(/^transferFrom\(/i)) add("transferFrom");
  if (has(/^safeTransferFrom\(/i)) add("safeTransferFrom / batch");

  // admin / upgradeability
  if (has(/^upgradeTo\(/i)) add("upgradeTo (upgradeable)");
  if (has(/^upgradeToAndCall\(/i)) add("upgradeToAndCall (upgradeable)");
  if (has(/^changeAdmin\(/i)) add("changeAdmin (proxy admin)");
  if (has(/^transferOwnership\(/i)) add("transferOwnership");
  if (has(/^initialize\(/i)) add("initialize (re-init risk)");

  // multicall/execute patterns
  if (has(/^multicall\(/i)) add("multicall");
  if (has(/^execute\(/i) || has(/^execTransaction\(/i))
    add("execute/execTransaction");

  // opcode flags
  if (op.DELEGATECALL > 0) add(`DELEGATECALL x${op.DELEGATECALL}`);
  if (op.CALLCODE > 0) add(`CALLCODE x${op.CALLCODE}`);
  if (op.SELFDESTRUCT > 0) add(`SELFDESTRUCT x${op.SELFDESTRUCT}`);
  if (op.CREATE2 > 0) add(`CREATE2 x${op.CREATE2}`);

  const severity = /DELEGATECALL|upgradeTo|changeAdmin|execute/.test(
    risks.join(" ")
  )
    ? "high"
    : risks.length >= 2
    ? "medium"
    : risks.length === 1
    ? "low"
    : "none";

  console.log(`✅ [Classify] Risk analysis complete:`, { severity, risks });
  return { severity, risks };
}

export async function GET(req: NextRequest) {
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
    console.log(`✅ [Risk API] Bytecode fetched: ${code.length / 2} bytes`);

    // 2) selectors + 4byte lookup (limit to 40 selectors to keep fast)
    console.log(`🔍 [Risk API] Step 2: Extracting function selectors`);
    const selectors = extractSelectors(code).slice(0, 40);
    console.log(
      `🔍 [Risk API] Step 2b: Looking up signatures for ${selectors.length} selectors`
    );
    const signaturesSets = await Promise.all(selectors.map(lookupSignatures));
    const matchedSignatures = [...new Set(signaturesSets.flat())].slice(0, 100);
    console.log(
      `✅ [Risk API] Found ${matchedSignatures.length} unique signatures`
    );

    // 3) opcode scan
    console.log(`🔍 [Risk API] Step 3: Scanning opcodes for risk patterns`);
    const op = opcodeScan(code);

    // 4) proxy detection
    console.log(`🔍 [Risk API] Step 4: Checking for proxy patterns`);
    const implSlot = await rpcCall(rpcUrl, "eth_getStorageAt", [
      addr,
      EIP1967_IMPL_SLOT,
      "latest",
    ]);
    const implAddr = last20BytesToAddress(implSlot);
    console.log(`✅ [Risk API] Proxy detection:`, {
      eip1967: implAddr,
      eip1167: looksLikeEIP1167(code),
    });

    console.log(`🔍 [Risk API] Step 5: Classifying risks`);
    const risk = classify(matchedSignatures, op);

    // 6) AI inference on 0G (optional, can fail gracefully)
    let aiOutput = null;
    try {
      console.log(`🤖 [Risk API] Step 6: Calling 0G AI inference`);
      const aiResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/api/infer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            features: {
              summary: `Contract ${addr} on chain ${chainId}`,
              selectors: selectors.slice(0, 20), // Limit for AI context
              opcodeCounters: op,
              proxy: {
                eip1967Implementation: implAddr,
                looksLikeEIP1167: looksLikeEIP1167(code),
              },
              bytecodeLength: code.length / 2,
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
        address: addr,
        chainId,
        isContract: true,
        bytecodeLength: code.length / 2,
        selectors,
        matchedSignatures,
        opcodeCounters: op,
        proxy: {
          eip1967Implementation: implAddr,
          looksLikeEIP1167: looksLikeEIP1167(code),
        },
        risk,
        aiOutput, // Include AI analysis if available
      },
    };

    console.log(`📊 [Risk API] Final result:`, {
      address: result.data.address,
      chainId: result.data.chainId,
      bytecodeLength: result.data.bytecodeLength,
      selectorsCount: result.data.selectors.length,
      signaturesCount: result.data.matchedSignatures.length,
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
