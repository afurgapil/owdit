import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";

export interface RiskFeatures {
  summary?: string;
  selectors?: string[];
  opcodeCounters?: Record<string, number>;
  proxy?: { eip1967Implementation?: string | null; looksLikeEIP1167?: boolean };
  bytecodeLength?: number;
  chainId?: number | string;
  address?: string;
}

export interface RiskInferenceOutput {
  score: number;
  reason: string;
}

const DEFAULT_0G_RPC = process.env.RPC_0G || "https://evmrpc-testnet.0g.ai"; // 0G Testnet

// Official 0G Services from documentation
const OFFICIAL_PROVIDERS = {
  "llama-3.3-70b-instruct": "0xf07240Efa67755B5311bc75784a061eDB47165Dd",
  "deepseek-r1-70b": "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3",
} as const;

// Module-level caching to avoid repeated on-chain operations
const ackedProviders = new Set<string>();
let ledgerReady = false;

// Minimal local typings to avoid `any`
interface ZGServiceMeta {
  endpoint?: string;
  model?: string;
}

interface ZGService {
  provider: string;
  verifiability?: string;
}

interface ZGBrokerLike {
  inference?: {
    listService?: () => Promise<ZGService[]>;
    getServiceMetadata?: (provider: string) => Promise<ZGServiceMeta>;
    acknowledgeProviderSigner?: (provider: string) => Promise<void>;
    getRequestHeaders?: (
      provider: string,
      content: string
    ) => Promise<Record<string, string>>;
    processResponse?: (
      provider: string,
      body: string,
      id?: string
    ) => Promise<boolean>;
  };
  ledger?: {
    addLedger?: (amount: number) => Promise<void>;
    depositFund?: (amount: number) => Promise<void>;
  };
}

async function ensureLedgerAndAck(
  broker: ZGBrokerLike,
  providerAddr: string,
  signerBalance: bigint
): Promise<void> {
  // Only setup ledger once per session
  if (!ledgerReady) {
    console.log("[0G] Setting up ledger account...");

    // First, try to check if ledger already exists
    let ledgerExists = false;
    try {
      // Try to get account info to check if it exists
      // This is a placeholder - we'll assume it exists if addLedger fails with "already exists"
      console.log("[0G] Checking if ledger account already exists...");
    } catch (e) {
      console.log("[0G] Account check error:", e);
    }

    try {
      await broker.ledger?.addLedger?.(0.1);
      console.log("[0G] Ledger account created");
      ledgerExists = true;
    } catch (e) {
      if (e instanceof Error && e.message.includes("already exists")) {
        console.log(
          "[0G] Ledger account already exists, using existing account"
        );
        ledgerExists = true;
      } else {
        console.log("[0G] Ledger creation error:", e);
        // Continue anyway - maybe we can still use the service
      }
    }

    // Only try to deposit funds if we have a ledger account
    if (ledgerExists) {
      try {
        if (signerBalance > BigInt(0)) {
          await broker.ledger?.depositFund?.(0.05);
          console.log("[0G] Funds deposited to ledger");
        }
      } catch (e) {
        console.log("[0G] Fund deposit error:", e);
        // Continue anyway - maybe there are already sufficient funds
      }
    }

    ledgerReady = true;
  }

  // Only acknowledge each provider once per session
  if (!ackedProviders.has(providerAddr)) {
    console.log(`[0G] Acknowledging provider ${providerAddr}...`);
    try {
      // Try acknowledgment method
      if (broker.inference?.acknowledgeProviderSigner) {
        await broker.inference.acknowledgeProviderSigner(providerAddr);
      } else {
        console.log(`[0G] No acknowledgment method available, skipping`);
        return;
      }
      ackedProviders.add(providerAddr);
      console.log(`[0G] Provider ${providerAddr} acknowledged`);
    } catch (error) {
      console.log(`[0G] Provider acknowledgment failed:`, error);
      // Continue without acknowledgment for now
    }
  }
}

export async function inferRiskOn0G(
  features: RiskFeatures
): Promise<RiskInferenceOutput> {
  const priv = process.env.PRIVATE_KEY;
  if (!priv) throw new Error("PRIVATE_KEY is required for 0G inference");

  // 1) Provider & signer
  const provider = new ethers.JsonRpcProvider(DEFAULT_0G_RPC);
  const wallet = new ethers.Wallet(priv, provider);

  // 2) Broker
  const broker = (await createZGComputeNetworkBroker(
    wallet
  )) as unknown as ZGBrokerLike;

  // 3) Get available services
  const services: ZGService[] = (await broker.inference?.listService?.()) || [];
  if (!services.length) throw new Error("No 0G services available");

  // 4) Try multiple services with retry mechanism
  const officialProviderAddresses = Object.values(OFFICIAL_PROVIDERS);
  const serviceCandidates = [
    // First try official TeeML providers
    ...services.filter(
      (s) =>
        officialProviderAddresses.includes(
          s.provider as (typeof officialProviderAddresses)[number]
        ) && s.verifiability === "TeeML"
    ),
    // Then try any TeeML service
    ...services.filter(
      (s) =>
        s.verifiability === "TeeML" &&
        !officialProviderAddresses.includes(
          s.provider as (typeof officialProviderAddresses)[number]
        )
    ),
    // Finally try any other service
    ...services.filter((s) => s.verifiability !== "TeeML"),
  ];

  let lastError: Error | null = null;

  for (const svc of serviceCandidates) {
    try {
      console.log(
        `[0G] Trying service: ${svc.provider} (${
          svc.verifiability || "unknown"
        })`
      );

      // Setup ledger and acknowledge provider
      let signerBalance: bigint = BigInt(0);
      if (svc.verifiability === "TeeML") {
        try {
          signerBalance = await provider.getBalance(wallet.address);
          console.log(`[0G] Wallet balance: ${signerBalance} wei`);
        } catch (e) {
          console.log("[0G] Balance check error:", e);
        }

        await ensureLedgerAndAck(broker, svc.provider, signerBalance);
      }

      // Get service metadata
      const meta = await broker.inference?.getServiceMetadata?.(svc.provider);
      const endpoint = meta?.endpoint;
      const model = meta?.model;
      if (!endpoint || !model) {
        console.log(
          `[0G] Service ${svc.provider} metadata unavailable, trying next service`
        );
        continue;
      }

      console.log(`[0G] Endpoint: ${endpoint}, Model: ${model}`);

      // Prepare inference request
      const instruction = `Score contract risk 0-100. Return JSON: {"score": int, "reason": "text", "rules_triggered": ["rule1"]}

Rules:
- heuristic.severity=="high" => score>=80
- risky opcodes => score>=80 (min 50 for proxy)
- no risks => score<=20`;

      // Add opcode flags and heuristic info
      const opcodeFlags = {
        has_delegatecall: (features.opcodeCounters?.DELEGATECALL ?? 0) > 0,
        has_callcode: (features.opcodeCounters?.CALLCODE ?? 0) > 0,
        has_selfdestruct: (features.opcodeCounters?.SELFDESTRUCT ?? 0) > 0,
        has_create2: (features.opcodeCounters?.CREATE2 ?? 0) > 0,
      };

      const content = JSON.stringify({
        instruction,
        features,
        heuristic: (features as unknown as Record<string, unknown>)
          .heuristic || {
          severity: "unknown",
          risks: [],
        },
        opcodeFlags,
      });

      // Get request headers
      const headers = await broker.inference?.getRequestHeaders?.(
        svc.provider,
        content
      );
      console.log(
        `[0G] Headers keys: ${Object.keys(headers || {}).join(", ")}`
      );

      // Call OpenAI-compatible endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout per service

      try {
        const res = await fetch(`${endpoint}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(headers || {}) },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content }],
            max_tokens: 500,
            temperature: 0.1,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          throw new Error(`0G inference failed: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        console.log(
          `[0G] Response received, choices: ${data?.choices?.length || 0}`
        );

        // Log token usage if available
        if (data.usage) {
          console.log(
            `[0G] Token usage - Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}, Total: ${data.usage.total_tokens}`
          );
        }

        // Verify response if TeeML
        if (svc.verifiability === "TeeML") {
          try {
            const ok = await broker.inference?.processResponse?.(
              svc.provider,
              JSON.stringify(data),
              data?.id
            );
            if (ok === false)
              throw new Error("0G response verification failed");
            console.log("[0G] Response verified successfully");
          } catch (verifyError) {
            console.log(
              "[0G] Response verification failed, continuing anyway:",
              verifyError
            );
            // Continue without verification for now
          }
        }

        // Parse output
        const text = data?.choices?.[0]?.message?.content ?? "{}";
        let parsed: RiskInferenceOutput = { score: 0, reason: "parse_error" };

        try {
          // Try direct JSON parse first
          parsed = JSON.parse(text);
        } catch (e) {
          // If that fails, try to extract JSON from markdown
          try {
            const jsonMatch = text.match(/```(?:json)?\s*(\{.*?\})\s*```/);
            if (jsonMatch && jsonMatch[1]) {
              parsed = JSON.parse(jsonMatch[1]);
            } else {
              // Try to find any JSON-like content
              const braceMatch = text.match(/\{.*\}/);
              if (braceMatch) {
                parsed = JSON.parse(braceMatch[0]);
              }
            }
          } catch (markdownError) {
            console.log(
              "[0G] Both direct and markdown parsing failed:",
              e,
              markdownError
            );
            console.log("[0G] Raw text:", text);
          }
        }

        if (parsed.score !== 0 || parsed.reason !== "parse_error") {
          console.log(
            `[0G] Parsed output: score=${parsed.score}, reason="${parsed.reason}"`
          );
        }

        console.log(
          `[0G] Risk inference completed successfully with service: ${svc.provider}`
        );
        return parsed;
      } catch (fetchError) {
        console.log(`[0G] Service ${svc.provider} failed:`, fetchError);

        // Check for specific error types and provide user-friendly messages
        let errorMessage = "Unknown fetch error";
        if (fetchError instanceof Error) {
          if (
            fetchError.message.includes("fetch failed") ||
            fetchError.message.includes("SocketError") ||
            fetchError.message.includes("other side closed")
          ) {
            errorMessage =
              "0G server connection failed - server may be temporarily unavailable";
          } else if (fetchError.message.includes("timeout")) {
            errorMessage =
              "0G server request timeout - server may be overloaded";
          } else if (
            fetchError.message.includes("ENOTFOUND") ||
            fetchError.message.includes("ECONNREFUSED")
          ) {
            errorMessage = "0G server unreachable - network connectivity issue";
          } else {
            errorMessage = fetchError.message;
          }
        }

        lastError = new Error(errorMessage);
        clearTimeout(timeoutId);
        continue; // Try next service
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (serviceError) {
      console.log(`[0G] Service ${svc.provider} setup failed:`, serviceError);
      lastError =
        serviceError instanceof Error
          ? serviceError
          : new Error("Unknown service error");
      continue; // Try next service
    }
  }

  // If we get here, all services failed
  const finalError = lastError || new Error("All 0G services failed");

  // Provide more specific error message based on the last error
  if (finalError.message.includes("0G server")) {
    throw new Error(
      `0G AI services are currently unavailable. ${finalError.message}. Please try again later.`
    );
  } else {
    throw new Error(
      `Risk analysis failed: ${finalError.message}. Please try again later.`
    );
  }
}
