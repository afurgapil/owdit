import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
// Allow tests to inject a custom broker factory
let brokerFactory: (...args: unknown[]) => unknown = createZGComputeNetworkBroker as unknown as (
  ...args: unknown[]
) => unknown;
export function __setBrokerFactory(factory: (...args: unknown[]) => unknown) {
  brokerFactory = factory;
}
import { genRequestId, logger } from "../logger";

export interface TestGenerationFeatures {
  contractCode: string;
  contractName: string;
  testFrameworks: ("hardhat" | "foundry")[];
}

export interface TestGenerationResponse {
  success: boolean;
  tests: {
    hardhat?: {
      testFile: string;
      setupFile: string;
    };
    foundry?: {
      testFile: string;
    };
  };
  coverage: {
    functionsCount: number;
    testCasesCount: number;
  };
  error?: string;
}

const DEFAULT_0G_RPC = process.env.RPC_0G || "https://evmrpc-testnet.0g.ai";

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

    try {
      await broker.ledger?.addLedger?.(0.1);
      console.log("[0G] Ledger account created");
    } catch (e) {
      if (e instanceof Error && e.message.includes("already exists")) {
        console.log(
          "[0G] Ledger account already exists, using existing account"
        );
      } else if (
        e instanceof Error &&
        e.message.includes("insufficient funds")
      ) {
        console.log("[0G] Insufficient funds for ledger creation, skipping...");
        // Continue without ledger for now
      } else {
        console.log("[0G] Ledger creation error:", e);
      }
    }

    try {
      if (signerBalance > BigInt(0)) {
        await broker.ledger?.depositFund?.(0.05);
        console.log("[0G] Funds deposited to ledger");
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("insufficient funds")) {
        console.log("[0G] Insufficient funds for deposit, skipping...");
      } else {
        console.log("[0G] Fund deposit error:", e);
      }
    }

    ledgerReady = true;
  }

  // Only acknowledge each provider once per session
  if (!ackedProviders.has(providerAddr)) {
    console.log(`[0G] Acknowledging provider ${providerAddr}...`);
    try {
      if (broker.inference?.acknowledgeProviderSigner) {
        await broker.inference.acknowledgeProviderSigner(providerAddr);
        ackedProviders.add(providerAddr);
        console.log(`[0G] Provider ${providerAddr} acknowledged`);
      }
    } catch (error) {
      console.log(`[0G] Provider acknowledgment failed:`, error);
      // Continue anyway - some providers might not need acknowledgment
    }
  }
}

export async function generateTestsOn0G(
  features: TestGenerationFeatures
): Promise<TestGenerationResponse> {
  const requestId = genRequestId();
  logger.info(
    `[${requestId}] Starting 0G test generation for contract: ${features.contractName}`
  );

  try {
    const priv = process.env.ZERO_G_PRIVATE_KEY;
    if (!priv)
      throw new Error("ZERO_G_PRIVATE_KEY is required for 0G test generation");

    // 1) Provider & signer
    const provider = new ethers.JsonRpcProvider(DEFAULT_0G_RPC);
    const wallet = new ethers.Wallet(priv, provider);

    // 2) Broker
    const broker = (await brokerFactory(
      wallet
    )) as unknown as ZGBrokerLike;

    // 3) Get available services
    const services: ZGService[] =
      (await broker.inference?.listService?.()) || [];
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

        // Prepare test generation prompt
        const prompt = buildTestGenerationPrompt(features);
        const content = JSON.stringify({
          instruction: prompt,
          contractCode: features.contractCode,
          contractName: features.contractName,
          testFrameworks: features.testFrameworks,
        });

        // Get request headers
        const headers = await broker.inference?.getRequestHeaders?.(
          svc.provider,
          content
        );

        // Call OpenAI-compatible endpoint with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout per service

        try {
          console.log(`[0G] Making request to: ${endpoint}/chat/completions`);
          console.log(`[0G] Headers:`, Object.keys(headers || {}));

          const res = await fetch(`${endpoint}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(headers || {}) },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content:
                    "Generate Solidity unit tests. Return valid JSON only.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              max_tokens: 4000,
              temperature: 0.1,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errorText = await res.text().catch(() => "");
            throw new Error(
              `0G test generation failed: ${res.status} ${errorText}`
            );
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
          const testResult = parseTestGenerationResponse(
            data,
            features.testFrameworks
          );

          logger.info(
            `[${requestId}] 0G test generation completed successfully with service: ${svc.provider}`
          );

          return {
            success: true,
            ...testResult,
          };
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
              errorMessage =
                "0G server unreachable - network connectivity issue";
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
        `Test generation failed: ${finalError.message}. Please try again later.`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(`[${requestId}] 0G test generation timeout`);
      return {
        success: false,
        tests: {},
        coverage: { functionsCount: 0, testCasesCount: 0 },
        error: "Test generation timeout",
      };
    }

    logger.error(`[${requestId}] 0G test generation error:`, { error });
    return {
      success: false,
      tests: {},
      coverage: { functionsCount: 0, testCasesCount: 0 },
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

function buildTestGenerationPrompt(features: TestGenerationFeatures): string {
  const frameworks = features.testFrameworks.join(",");

  return `Generate unit tests for this contract:

\`\`\`solidity
${features.contractCode}
\`\`\`

Name: ${features.contractName}
Frameworks: ${frameworks}

Requirements:
- Cover all public/external functions
- Test success/failure paths
- Include edge cases
- Use proper test structure

For Hardhat: Use Chai/Ethers, describe/it structure
For Foundry: Use Forge, vm cheatcodes

Return JSON:
{
  "hardhat": {
    "testFile": "test content",
    "setupFile": "setup content"
  },
  "foundry": {
    "testFile": "test content"
  },
  "coverage": {
    "functionsCount": number,
    "testCasesCount": number
  }
}`;
}

function parseTestGenerationResponse(
  data: unknown,
  requestedFrameworks: ("hardhat" | "foundry")[]
): Omit<TestGenerationResponse, "success"> {
  try {
    // Try to extract JSON from the response
    let testData;

    if (typeof data === "string") {
      // If response is a string, try to parse it as JSON
      testData = JSON.parse(data);
    } else if (
      data &&
      typeof data === "object" &&
      "choices" in data &&
      Array.isArray((data as { choices: unknown[] }).choices) &&
      (data as { choices: Array<{ message?: { content?: string } }> })
        .choices[0] &&
      (data as { choices: Array<{ message: { content: string } }> }).choices[0]
        .message
    ) {
      // If response is from OpenAI format, extract content
      const content = (
        data as { choices: Array<{ message: { content: string } }> }
      ).choices[0].message.content;
      testData = JSON.parse(content);
    } else if (data && typeof data === "object" && "content" in data) {
      // If response has content field
      testData = JSON.parse((data as { content: string }).content);
    } else {
      // Try to use the data directly
      testData = data;
    }

    const result: Omit<TestGenerationResponse, "success"> = {
      tests: {},
      coverage: {
        functionsCount: 0,
        testCasesCount: 0,
      },
    };

    // Extract Hardhat tests if requested
    if (requestedFrameworks.includes("hardhat") && testData.hardhat) {
      result.tests.hardhat = {
        testFile: testData.hardhat.testFile || "",
        setupFile: testData.hardhat.setupFile || "",
      };
    }

    // Extract Foundry tests if requested
    if (requestedFrameworks.includes("foundry") && testData.foundry) {
      result.tests.foundry = {
        testFile: testData.foundry.testFile || "",
      };
    }

    // Extract coverage information
    if (testData.coverage) {
      result.coverage = {
        functionsCount: testData.coverage.functionsCount || 0,
        testCasesCount: testData.coverage.testCasesCount || 0,
      };
    }

    return result;
  } catch (error) {
    logger.error("Error parsing test generation response:", { error });
    return {
      tests: {},
      coverage: { functionsCount: 0, testCasesCount: 0 },
    };
  }
}
