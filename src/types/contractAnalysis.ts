import {
  ContractSource,
  RiskAnalysisResult,
} from "../shared/lib/fetchers/contractSource";

// Deployer wallet analysis interface
export interface DeployerAnalysis {
  address: string;
  reputationScore: number; // 0-100
  contractCount: number;
  successRate: number; // 0-1
  timeSinceFirstDeploy: number; // days
  riskIndicators: string[];
  riskLevel: 'low' | 'medium' | 'high';
  firstDeployDate?: string; // ISO date
  lastDeployDate?: string; // ISO date
  totalVolumeDeployed?: number; // ETH
  averageContractSize?: number; // ETH
}

// Contract interaction analysis interface
export interface InteractionAnalysis {
  totalTransactions: number;
  uniqueUsers: number;
  activityLevel: 'low' | 'medium' | 'high';
  transactionVolume: number; // ETH
  averageTxPerDay: number;
  lastActivity: string; // ISO date
  riskIndicators: string[];
  riskLevel: 'low' | 'medium' | 'high';
  firstTransactionDate?: string; // ISO date
  peakActivityPeriod?: string; // Time period with highest activity
  userRetentionRate?: number; // 0-1
}

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

  // AI analysis (optional, from 0G inference)
  aiOutput?: {
    score: number;
    reason: string;
  };

  // Enhanced analysis (new features)
  deployerAnalysis?: DeployerAnalysis;
  interactionAnalysis?: InteractionAnalysis;
  overallRiskScore?: number; // Combined risk score (0-100)

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
    aiOutput: data.aiOutput, // Include AI output if available
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

// Analysis Progress Types
export interface AnalysisProgress {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
  progress: number; // 0-100
  timestamp: string;
}

export interface AnalysisMilestone {
  id: string;
  title: string;
  description: string;
  estimatedDuration: number; // seconds
  dependencies?: string[]; // milestone IDs that must complete first
}
