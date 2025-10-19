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

// Sourcify API v2 response interface
interface SourcifyV2Response {
  match: "match" | "exact_match" | null;
  creationMatch: "match" | "exact_match" | null;
  runtimeMatch: "match" | "exact_match" | null;
  chainId: string;
  address: string;
  verifiedAt?: string;
  sources?: Record<string, string>;
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
  compilation?: {
    language?: string;
    compiler?: string;
    compilerVersion?: string;
    name?: string;
    fullyQualifiedName?: string;
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

// Fetch from Sourcify (primary source) - Updated to use API v2
export async function fetchFromSourcify(
  chainId: number,
  address: string
): Promise<ContractSource | null> {
  try {
    const addrLower = address.toLowerCase();
    console.log(`[Sourcify] Try API v2`, { chainId, address: addrLower });
    
    // Use new Sourcify API v2
    const apiUrl = `https://sourcify.dev/server/v2/contract/${chainId}/${addrLower}?fields=sources,abi,compilation`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);

    console.log(`[Sourcify] API v2 response`, {
      ok: response.ok,
      status: response.status,
    });

    // Handle both 200 and 404 responses (404 means not verified)
    if (response.ok || response.status === 404) {
      const data = await response.json();
      
      // Check if contract is verified (has match status)
      if (data.match === null || data.match === undefined) {
        console.log(`[Sourcify] Contract not verified on Sourcify`);
        return null;
      }

      // Extract sources and compilation info
      const sources = data.sources || {};
      const compilation = data.compilation || {};
      const abi = data.abi || [];

      // Convert sources to files array
      const files = Object.entries(sources).map(([path, content]) => ({
        path,
        content: content as string,
      }));

      if (files.length === 0) {
        console.log(`[Sourcify] No source files found`);
        return null;
      }

      return {
        verified: true,
        chainId,
        address: addrLower,
        contractName: compilation.name || files[0]?.path?.replace(/\.(sol|vy)$/, ""),
        compilerVersion: compilation.compilerVersion,
        files,
        abi,
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

    const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
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
