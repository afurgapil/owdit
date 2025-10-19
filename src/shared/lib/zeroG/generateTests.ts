import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { genRequestId, logger } from "../logger";

export interface TestGenerationFeatures {
  contractCode: string;
  contractName: string;
  testFrameworks: ('hardhat' | 'foundry')[];
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
        console.log("[0G] Ledger account already exists, using existing account");
      } else if (e instanceof Error && e.message.includes("insufficient funds")) {
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
  logger.info(`[${requestId}] Starting 0G test generation for contract: ${features.contractName}`);

  try {
    const priv = process.env.ZERO_G_PRIVATE_KEY;
    if (!priv) throw new Error("ZERO_G_PRIVATE_KEY is required for 0G test generation");

    // 1) Provider & signer
    const provider = new ethers.JsonRpcProvider(DEFAULT_0G_RPC);
    const wallet = new ethers.Wallet(priv, provider);

    // 2) Broker
    const broker = (await createZGComputeNetworkBroker(
      wallet
    )) as unknown as ZGBrokerLike;

    // 3) Pick a service (prefer official providers with TeeML)
    const services: ZGService[] = (await broker.inference?.listService?.()) || [];
    if (!services.length) throw new Error("No 0G services available");

    const officialProviderAddresses = Object.values(OFFICIAL_PROVIDERS);
    let svc: ZGService | undefined = services.find(
      (s) =>
        officialProviderAddresses.includes(
          s.provider as (typeof officialProviderAddresses)[number]
        ) && s.verifiability === "TeeML"
    );

    if (!svc) {
      svc = services.find((s) => s.verifiability === "TeeML");
    }

    if (!svc) {
      svc = services[0];
    }

    console.log(`[0G] Selected service: ${svc.provider} (${svc.verifiability || "unknown"})`);

    // 4) Setup ledger and acknowledge provider
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

    // 5) Get service metadata
    const meta = await broker.inference?.getServiceMetadata?.(svc.provider);
    const endpoint = meta?.endpoint;
    const model = meta?.model;
    if (!endpoint || !model) throw new Error("0G service metadata unavailable");

    console.log(`[0G] Endpoint: ${endpoint}, Model: ${model}`);

    // 6) Prepare test generation prompt
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

    // 7) Call OpenAI-compatible endpoint with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000); // 240s timeout

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
              content: "You are an expert Solidity developer and testing specialist. Generate comprehensive unit tests for smart contracts using both Hardhat (Chai/Ethers) and Foundry (Forge) frameworks. Always return valid JSON with the exact structure requested."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 8000,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`0G test generation failed: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      console.log(`[0G] Response received, choices: ${data?.choices?.length || 0}`);

      // 8) Verify response if TeeML
      if (svc.verifiability === "TeeML") {
        try {
          const ok = await broker.inference?.processResponse?.(
            svc.provider,
            JSON.stringify(data),
            data?.id
          );
          if (ok === false) throw new Error("0G response verification failed");
          console.log("[0G] Response verified successfully");
        } catch (verifyError) {
          console.log("[0G] Response verification failed, continuing anyway:", verifyError);
          // Continue without verification for now
        }
      }

      // 9) Parse output
      const text = data?.choices?.[0]?.message?.content ?? "{}";
      const testResult = parseTestGenerationResponse(data, features.testFrameworks);
      
      logger.info(`[${requestId}] 0G test generation completed successfully`);

      return {
        success: true,
        ...testResult,
      };

    } catch (fetchError) {
      console.log(`[0G] Fetch error details:`, fetchError);
      throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}`);
    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(`[${requestId}] 0G test generation timeout after 240 seconds`);
      return {
        success: false,
        tests: {},
        coverage: { functionsCount: 0, testCasesCount: 0 },
        error: "Test generation timeout after 240 seconds",
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
  const frameworks = features.testFrameworks.join(' and ');
  
  return `Analyze this Solidity contract and generate comprehensive unit tests:

\`\`\`solidity
${features.contractCode}
\`\`\`

Contract Name: ${features.contractName}
Test Frameworks: ${frameworks}

Requirements:
1. Generate tests for ${frameworks}
2. Cover all public and external functions
3. Cover internal functions that can be exposed via inheritance
4. Include edge cases and boundary conditions
5. Test error scenarios with proper revert messages
6. Use descriptive test names following best practices
7. Include proper setup and helper functions
8. Add comprehensive comments explaining test logic
9. Test both success and failure paths
10. Include gas optimization tests where applicable

For Hardhat tests:
- Use Chai assertions and Ethers.js
- Include proper beforeEach/afterEach setup
- Use describe/it structure
- Mock external dependencies if needed
- Include deployment scripts in setup file

For Foundry tests:
- Use Forge testing framework
- Use vm cheatcodes for testing
- Include proper setUp/tearDown
- Use descriptive test function names
- Test with different accounts and scenarios

Return JSON with this exact structure:
{
  "hardhat": {
    "testFile": "Complete Hardhat test file content with proper imports and structure",
    "setupFile": "Hardhat setup/deployment file content"
  },
  "foundry": {
    "testFile": "Complete Foundry test file content with proper imports and structure"
  },
  "coverage": {
    "functionsCount": number_of_functions_tested,
    "testCasesCount": total_number_of_test_cases
  }
}

Make sure the JSON is valid and properly formatted. Include all necessary imports, proper test structure, and comprehensive test coverage.`;
}

function parseTestGenerationResponse(
  data: any, 
  requestedFrameworks: ('hardhat' | 'foundry')[]
): Omit<TestGenerationResponse, 'success'> {
  try {
    // Try to extract JSON from the response
    let testData;
    
    if (typeof data === 'string') {
      // If response is a string, try to parse it as JSON
      testData = JSON.parse(data);
    } else if (data.choices && data.choices[0] && data.choices[0].message) {
      // If response is from OpenAI format, extract content
      const content = data.choices[0].message.content;
      testData = JSON.parse(content);
    } else if (data.content) {
      // If response has content field
      testData = JSON.parse(data.content);
    } else {
      // Try to use the data directly
      testData = data;
    }

    const result: Omit<TestGenerationResponse, 'success'> = {
      tests: {},
      coverage: {
        functionsCount: 0,
        testCasesCount: 0,
      },
    };

    // Extract Hardhat tests if requested
    if (requestedFrameworks.includes('hardhat') && testData.hardhat) {
      result.tests.hardhat = {
        testFile: testData.hardhat.testFile || '',
        setupFile: testData.hardhat.setupFile || '',
      };
    }

    // Extract Foundry tests if requested
    if (requestedFrameworks.includes('foundry') && testData.foundry) {
      result.tests.foundry = {
        testFile: testData.foundry.testFile || '',
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
    logger.error('Error parsing test generation response:', { error });
    return {
      tests: {},
      coverage: { functionsCount: 0, testCasesCount: 0 },
    };
  }
}
