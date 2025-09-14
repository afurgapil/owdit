import { getChainById } from "../chains";

// Risk analysis result interface
export interface RiskAnalysisResult {
  verified: false;
  chainId: number;
  address: string;
  isContract: boolean;
  bytecodeLength: number;
  selectors: string[];
  opcodeCounters: Record<string, number>;
  risk: {
    severity: "none" | "low" | "medium" | "high" | "unknown";
    risks: string[];
  };
  aiOutput?: {
    score: number;
    reason: string;
  };
}

// Unified contract source interface
export interface ContractSource {
  verified: true;
  chainId: number;
  address: string;
  contractName?: string;
  compilerVersion?: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  abi?: Array<{
    type: string;
    name?: string;
    inputs?: Array<{
      name: string;
      type: string;
      indexed?: boolean;
    }>;
    outputs?: Array<{
      name: string;
      type: string;
    }>;
    stateMutability?: string;
    anonymous?: boolean;
  }>;
  sourceCode?: string; // For single-file contracts
}

// Union type for both results
export type ContractAnalysisResult = ContractSource | RiskAnalysisResult;

// Sourcify response interface
interface SourcifyResponse {
  status: "OK" | "NOT_FOUND";
  files: Array<{
    name: string;
    content: string;
  }>;
  metadata: {
    compiler: {
      version: string;
    };
    language: string;
    output: {
      abi: Array<{
        type: string;
        name?: string;
        inputs?: Array<{
          name: string;
          type: string;
          indexed?: boolean;
        }>;
        outputs?: Array<{
          name: string;
          type: string;
        }>;
        stateMutability?: string;
        anonymous?: boolean;
      }>;
    };
  };
}

// Etherscan response interface
interface EtherscanResponse {
  status: string;
  message: string;
  result: Array<{
    SourceCode: string;
    ABI: string;
    ContractName: string;
    CompilerVersion: string;
    OptimizationUsed: string;
    Runs: string;
    ConstructorArguments: string;
    EVMVersion: string;
    Library: string;
    LicenseType: string;
    Proxy: string;
    Implementation: string;
    SwarmSource: string;
  }>;
}

// Fetch from Sourcify (primary source)
export async function fetchFromSourcify(
  chainId: number,
  address: string
): Promise<ContractSource | null> {
  try {
    const addrLower = address.toLowerCase();
    console.log(`[Sourcify] Try full`, { chainId, address: addrLower });
    // Try full verification first
    const fullUrl = `https://repo.sourcify.dev/contracts/full/${chainId}/${addrLower}/metadata.json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const fullResponse = await fetch(fullUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log(`[Sourcify] Full response`, {
      ok: fullResponse.ok,
      status: fullResponse.status,
    });
    if (fullResponse.ok) {
      const data: SourcifyResponse = await fullResponse.json();

      return {
        verified: true,
        chainId,
        address: addrLower,
        contractName: data.files[0]?.name?.replace(".sol", ""),
        compilerVersion: data.metadata.compiler.version,
        files: data.files.map((file) => ({
          path: file.name,
          content: file.content,
        })),
        abi: data.metadata.output.abi,
      };
    }

    // Try partial verification
    const partialUrl = `https://repo.sourcify.dev/contracts/partial/${chainId}/${addrLower}/metadata.json`;
    const partialController = new AbortController();
    const partialTimeoutId = setTimeout(() => partialController.abort(), 5000);

    const partialResponse = await fetch(partialUrl, {
      signal: partialController.signal,
    });
    clearTimeout(partialTimeoutId);

    console.log(`[Sourcify] Partial response`, {
      ok: partialResponse.ok,
      status: partialResponse.status,
    });
    if (partialResponse.ok) {
      const data: SourcifyResponse = await partialResponse.json();

      return {
        verified: true,
        chainId,
        address: addrLower,
        contractName: data.files[0]?.name?.replace(".sol", ""),
        compilerVersion: data.metadata.compiler.version,
        files: data.files.map((file) => ({
          path: file.name,
          content: file.content,
        })),
        abi: data.metadata.output.abi,
      };
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("Sourcify fetch timeout");
    } else {
      console.warn("Sourcify fetch failed:", error);
    }
    return null;
  }
}

// Fetch from Etherscan
export async function fetchFromEtherscan(
  chainId: number,
  address: string,
  apiKey: string
): Promise<ContractSource | null> {
  try {
    const chain = getChainById(chainId);
    if (!chain) return null;

    const url = `${chain.etherscan}/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data: EtherscanResponse = await response.json();

    if (data.status !== "1" || !data.result[0]?.SourceCode) {
      return null;
    }

    const result = data.result[0];
    const sourceCode = result.SourceCode;
    let files: Array<{ path: string; content: string }> = [];

    // Handle multi-file contracts (JSON format)
    if (sourceCode.startsWith("{") && sourceCode.includes('"sources"')) {
      try {
        const parsed = JSON.parse(sourceCode) as {
          sources: Record<string, { content: string }>;
        };
        if (parsed.sources) {
          files = Object.entries(parsed.sources).map(([path, source]) => ({
            path,
            content: source.content,
          }));
        }
      } catch (e) {
        console.warn("Failed to parse multi-file source:", e);
      }
    } else {
      // Single file contract
      files = [
        {
          path: `${result.ContractName}.sol`,
          content: sourceCode,
        },
      ];
    }

    return {
      verified: true,
      chainId,
      address,
      contractName: result.ContractName,
      compilerVersion: result.CompilerVersion,
      files,
      abi: result.ABI ? JSON.parse(result.ABI) : undefined,
      sourceCode: result.SourceCode,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("Etherscan fetch timeout");
    } else {
      console.warn("Etherscan fetch failed:", error);
    }
    return null;
  }
}

// Main function to resolve contract source
export async function resolveContractSource(
  chainId: number,
  address: string,
  etherscanApiKey?: string
): Promise<ContractAnalysisResult | null> {
  console.log(`🔍 Fetching contract source for ${address} on chain ${chainId}`);

  // Try Sourcify first (free, no API key needed)
  const sourcifyResult = await fetchFromSourcify(chainId, address);
  if (sourcifyResult) {
    console.log("✅ Found on Sourcify");
    return sourcifyResult;
  }

  // Fallback to Etherscan if API key provided
  if (etherscanApiKey) {
    const etherscanResult = await fetchFromEtherscan(
      chainId,
      address,
      etherscanApiKey
    );
    if (etherscanResult) {
      console.log("✅ Found on Etherscan");
      return etherscanResult;
    }
  }

  console.log("❌ Contract source not found");
  return null;
}
