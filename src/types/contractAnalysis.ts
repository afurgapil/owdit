import {
  ContractSource,
  RiskAnalysisResult,
} from "../shared/lib/fetchers/contractSource";

// Unified contract analysis interface
export interface UnifiedContractAnalysis {
  // Common fields
  verified: boolean;
  chainId: number;
  address: string;

  // Contract info (verified or unverified)
  contractInfo: {
    name?: string; // verified: contractName, unverified: undefined
    compilerVersion?: string; // verified: compilerVersion, unverified: undefined
    isContract: boolean; // verified: true, unverified: isContract
    bytecodeLength?: number; // verified: undefined, unverified: bytecodeLength
  };

  // Source code (verified only)
  sourceCode?: {
    files: Array<{ path: string; content: string }>;
    abi?: unknown;
    sourceCode?: string;
  };

  // Bytecode analysis (unverified only)
  bytecodeAnalysis?: {
    selectors: string[];
    opcodeCounters: Record<string, number>;
    risk: { severity: string; risks: string[] };
  };

  // Metadata
  analysisType: "verified" | "unverified";
  timestamp: string;
}

// Transform function to convert ContractSource to UnifiedContractAnalysis
export function transformContractSourceToUnified(
  data: ContractSource
): UnifiedContractAnalysis {
  return {
    verified: true,
    chainId: data.chainId,
    address: data.address,
    contractInfo: {
      name: data.contractName,
      compilerVersion: data.compilerVersion,
      isContract: true,
      bytecodeLength: undefined,
    },
    sourceCode: {
      files: data.files,
      abi: data.abi,
      sourceCode: data.sourceCode,
    },
    bytecodeAnalysis: undefined,
    analysisType: "verified",
    timestamp: new Date().toISOString(),
  };
}

// Transform function to convert RiskAnalysisResult to UnifiedContractAnalysis
export function transformRiskAnalysisToUnified(
  data: RiskAnalysisResult
): UnifiedContractAnalysis {
  return {
    verified: false,
    chainId: data.chainId,
    address: data.address,
    contractInfo: {
      name: undefined,
      compilerVersion: undefined,
      isContract: data.isContract,
      bytecodeLength: data.bytecodeLength,
    },
    sourceCode: undefined,
    bytecodeAnalysis: {
      selectors: data.selectors,
      opcodeCounters: data.opcodeCounters,
      risk: data.risk,
    },
    analysisType: "unverified",
    timestamp: new Date().toISOString(),
  };
}

// Generic transform function that handles both types
export function transformToUnifiedFormat(
  data: ContractSource | RiskAnalysisResult
): UnifiedContractAnalysis {
  if (data.verified) {
    return transformContractSourceToUnified(data);
  } else {
    return transformRiskAnalysisToUnified(data);
  }
}

// Type guard functions
export function isVerifiedContract(
  data: UnifiedContractAnalysis
): data is UnifiedContractAnalysis & {
  sourceCode: NonNullable<UnifiedContractAnalysis["sourceCode"]>;
} {
  return data.verified && data.analysisType === "verified";
}

export function isUnverifiedContract(
  data: UnifiedContractAnalysis
): data is UnifiedContractAnalysis & {
  bytecodeAnalysis: NonNullable<UnifiedContractAnalysis["bytecodeAnalysis"]>;
} {
  return !data.verified && data.analysisType === "unverified";
}
