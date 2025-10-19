import { DeployerAnalysis } from "../../../types/contractAnalysis";
import { getChainById } from "../chains";
import { logger } from "../logger";

// Transaction interface for Etherscan API
interface EtherscanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  methodId: string;
  functionName: string;
}

// Contract creation transaction interface
interface ContractCreationTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  contractAddress: string;
}

/**
 * Get contract creation transaction to find deployer address
 */
export async function getContractCreationTransaction(
  chainId: number,
  contractAddress: string,
  apiKey: string
): Promise<ContractCreationTx | null> {
  try {
    const chain = getChainById(chainId);
    if (!chain) return null;

    const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${apiKey}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    
    if (data.status !== "1" || !data.result || data.result.length === 0) {
      return null;
    }

    return data.result[0];
  } catch (error) {
    logger.warn("Failed to get contract creation transaction", { error });
    return null;
  }
}

/**
 * Get deployer's transaction history
 */
export async function getDeployerTransactions(
  chainId: number,
  deployerAddress: string,
  apiKey: string,
  limit: number = 1000
): Promise<EtherscanTransaction[]> {
  try {
    const chain = getChainById(chainId);
    if (!chain) return [];

    const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${deployerAddress}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return [];

    const data = await response.json();
    
    if (data.status !== "1" || !data.result) {
      return [];
    }

    return data.result;
  } catch (error) {
    logger.warn("Failed to get deployer transactions", { error });
    return [];
  }
}

/**
 * Get deployer's contract creation transactions
 */
export async function getDeployerContractCreations(
  chainId: number,
  deployerAddress: string,
  apiKey: string
): Promise<ContractCreationTx[]> {
  try {
    const chain = getChainById(chainId);
    if (!chain) return [];

    const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${deployerAddress}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=${apiKey}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return [];

    const data = await response.json();
    
    if (data.status !== "1" || !data.result) {
      return [];
    }

    // Filter for contract creation transactions (to field is empty)
    return data.result.filter((tx: EtherscanTransaction) => 
      tx.to === "" && tx.contractAddress
    );
  } catch (error) {
    logger.warn("Failed to get deployer contract creations", { error });
    return [];
  }
}

/**
 * Calculate deployer reputation score
 */
function calculateReputationScore(
  contractCreations: ContractCreationTx[],
  allTransactions: EtherscanTransaction[]
): number {
  if (contractCreations.length === 0) return 0;

  // Base score
  let score = 50;

  // Contract count factor (more contracts = higher score, but diminishing returns)
  const contractCount = contractCreations.length;
  if (contractCount >= 10) score += 20;
  else if (contractCount >= 5) score += 15;
  else if (contractCount >= 2) score += 10;
  else score += 5;

  // Success rate factor
  const successfulContracts = contractCreations.filter(tx => tx.isError === "0").length;
  const successRate = successfulContracts / contractCount;
  
  if (successRate >= 0.9) score += 20;
  else if (successRate >= 0.7) score += 15;
  else if (successRate >= 0.5) score += 10;
  else score -= 10;

  // Activity factor (more transactions = more established)
  const totalTxs = allTransactions.length;
  if (totalTxs >= 1000) score += 10;
  else if (totalTxs >= 100) score += 5;
  else if (totalTxs < 10) score -= 5;

  // Time factor (older deployer = more established)
  if (contractCreations.length > 0) {
    const firstDeploy = new Date(parseInt(contractCreations[contractCreations.length - 1].timeStamp) * 1000);
    const daysSinceFirstDeploy = (Date.now() - firstDeploy.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceFirstDeploy >= 365) score += 10;
    else if (daysSinceFirstDeploy >= 90) score += 5;
    else if (daysSinceFirstDeploy < 30) score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Identify risk indicators
 */
function identifyRiskIndicators(
  contractCreations: ContractCreationTx[],
  allTransactions: EtherscanTransaction[]
): string[] {
  const indicators: string[] = [];

  // New wallet (less than 30 days)
  if (contractCreations.length > 0) {
    const firstDeploy = new Date(parseInt(contractCreations[contractCreations.length - 1].timeStamp) * 1000);
    const daysSinceFirstDeploy = (Date.now() - firstDeploy.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceFirstDeploy < 30) {
      indicators.push("New deployer wallet (less than 30 days)");
    }
  }

  // High failure rate
  const successfulContracts = contractCreations.filter(tx => tx.isError === "0").length;
  const successRate = successfulContracts / contractCreations.length;
  
  if (successRate < 0.5) {
    indicators.push("High contract failure rate");
  }

  // Very low activity
  if (allTransactions.length < 5) {
    indicators.push("Very low transaction activity");
  }

  // Suspicious patterns
  const recentTxs = allTransactions.slice(0, 10);
  const suspiciousMethods = recentTxs.filter(tx => 
    tx.functionName.includes("transfer") || 
    tx.functionName.includes("swap") ||
    tx.functionName.includes("mint")
  );
  
  if (suspiciousMethods.length > 5) {
    indicators.push("Suspicious transaction patterns");
  }

  return indicators;
}

/**
 * Calculate risk level based on indicators and score
 */
function calculateRiskLevel(score: number, indicators: string[]): 'low' | 'medium' | 'high' {
  if (score >= 80 && indicators.length === 0) return 'low';
  if (score >= 60 && indicators.length <= 2) return 'medium';
  return 'high';
}

/**
 * Main function to analyze deployer wallet
 */
export async function analyzeDeployerWallet(
  chainId: number,
  contractAddress: string,
  apiKey: string
): Promise<DeployerAnalysis | null> {
  try {
    console.log(`[Deployer Analysis] Starting analysis for ${contractAddress} on chain ${chainId}`);
    
    // Get contract creation transaction
    const creationTx = await getContractCreationTransaction(chainId, contractAddress, apiKey);
    if (!creationTx) {
      console.log(`[Deployer Analysis] Could not find contract creation transaction for ${contractAddress}`);
      logger.warn("Could not find contract creation transaction", { contractAddress });
      return null;
    }

    const deployerAddress = creationTx.contractCreator || creationTx.from;
    console.log(`[Deployer Analysis] Found deployer address: ${deployerAddress}`);
    logger.info("Found deployer address", { deployerAddress, contractAddress });

    // Get deployer's transaction history
    const [allTransactions, contractCreations] = await Promise.all([
      getDeployerTransactions(chainId, deployerAddress, apiKey),
      getDeployerContractCreations(chainId, deployerAddress, apiKey)
    ]);

    // Calculate metrics
    const reputationScore = calculateReputationScore(contractCreations, allTransactions);
    const riskIndicators = identifyRiskIndicators(contractCreations, allTransactions);
    const riskLevel = calculateRiskLevel(reputationScore, riskIndicators);

    // Calculate additional metrics
    const successfulContracts = contractCreations.filter(tx => tx.isError === "0").length;
    const successRate = contractCreations.length > 0 ? successfulContracts / contractCreations.length : 0;

    // Time calculations
    const firstDeployDate = contractCreations.length > 0 
      ? new Date(parseInt(contractCreations[contractCreations.length - 1].timeStamp) * 1000).toISOString()
      : undefined;
    
    const lastDeployDate = contractCreations.length > 0
      ? new Date(parseInt(contractCreations[0].timeStamp) * 1000).toISOString()
      : undefined;

    const timeSinceFirstDeploy = firstDeployDate 
      ? (Date.now() - new Date(firstDeployDate).getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    // Volume calculations
    const totalVolumeDeployed = contractCreations.reduce((sum, tx) => 
      sum + parseFloat(tx.value || "0") / Math.pow(10, 18), 0
    );

    const averageContractSize = contractCreations.length > 0 
      ? totalVolumeDeployed / contractCreations.length 
      : 0;

    return {
      address: deployerAddress,
      reputationScore,
      contractCount: contractCreations.length,
      successRate,
      timeSinceFirstDeploy,
      riskIndicators,
      riskLevel,
      firstDeployDate,
      lastDeployDate,
      totalVolumeDeployed,
      averageContractSize,
    };

  } catch (error) {
    logger.error("Failed to analyze deployer wallet", { error, contractAddress });
    return null;
  }
}
