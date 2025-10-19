import { InteractionAnalysis } from "../../../types/contractAnalysis";
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
  gasUsed: string;
}

/**
 * Get contract's transaction history
 */
export async function getContractTransactions(
  chainId: number,
  contractAddress: string,
  apiKey: string,
  limit: number = 1000
): Promise<EtherscanTransaction[]> {
  try {
    const chain = getChainById(chainId);
    if (!chain) return [];

    const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`;
    
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
    logger.warn("Failed to get contract transactions", { error });
    return [];
  }
}

/**
 * Get contract's internal transactions (for more detailed analysis)
 */
export async function getContractInternalTransactions(
  chainId: number,
  contractAddress: string,
  apiKey: string,
  limit: number = 1000
): Promise<any[]> {
  try {
    const chain = getChainById(chainId);
    if (!chain) return [];

    const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlistinternal&address=${contractAddress}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`;
    
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
    logger.warn("Failed to get contract internal transactions", { error });
    return [];
  }
}

/**
 * Calculate activity level based on transaction count and frequency
 */
function calculateActivityLevel(
  transactions: EtherscanTransaction[],
  daysSinceFirstTx: number
): 'low' | 'medium' | 'high' {
  const totalTxs = transactions.length;
  const avgTxsPerDay = daysSinceFirstTx > 0 ? totalTxs / daysSinceFirstTx : 0;

  if (avgTxsPerDay >= 10 || totalTxs >= 1000) return 'high';
  if (avgTxsPerDay >= 1 || totalTxs >= 100) return 'medium';
  return 'low';
}

/**
 * Calculate user diversity metrics
 */
function calculateUserDiversity(transactions: EtherscanTransaction[]): {
  uniqueUsers: number;
  userRetentionRate: number;
  peakActivityPeriod: string;
} {
  const uniqueUsers = new Set(transactions.map(tx => tx.from)).size;
  
  // Calculate user retention (users who made multiple transactions)
  const userTxCounts = new Map<string, number>();
  transactions.forEach(tx => {
    const count = userTxCounts.get(tx.from) || 0;
    userTxCounts.set(tx.from, count + 1);
  });
  
  const returningUsers = Array.from(userTxCounts.values()).filter(count => count > 1).length;
  const userRetentionRate = uniqueUsers > 0 ? returningUsers / uniqueUsers : 0;

  // Find peak activity period (hour of day with most transactions)
  const hourlyActivity = new Map<number, number>();
  transactions.forEach(tx => {
    const hour = new Date(parseInt(tx.timeStamp) * 1000).getHours();
    const count = hourlyActivity.get(hour) || 0;
    hourlyActivity.set(hour, count + 1);
  });

  const peakHour = Array.from(hourlyActivity.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
  
  const peakActivityPeriod = `${peakHour}:00-${peakHour + 1}:00`;

  return {
    uniqueUsers,
    userRetentionRate,
    peakActivityPeriod,
  };
}

/**
 * Identify risk indicators based on transaction patterns
 */
function identifyRiskIndicators(
  transactions: EtherscanTransaction[],
  userDiversity: { uniqueUsers: number; userRetentionRate: number }
): string[] {
  const indicators: string[] = [];

  // Very low activity
  if (transactions.length < 5) {
    indicators.push("Very low transaction activity");
  }

  // Very high activity (potential spam)
  if (transactions.length > 5000) {
    indicators.push("Extremely high transaction activity (potential spam)");
  }

  // Low user diversity
  if (userDiversity.uniqueUsers < 3 && transactions.length > 10) {
    indicators.push("Low user diversity (potential bot activity)");
  }

  // Very high user diversity with low retention (potential airdrop farming)
  if (userDiversity.uniqueUsers > 100 && userDiversity.userRetentionRate < 0.1) {
    indicators.push("High user count with low retention (potential airdrop farming)");
  }

  // Check for suspicious function patterns
  const functionCounts = new Map<string, number>();
  transactions.forEach(tx => {
    if (tx.functionName && tx.functionName !== '') {
      const count = functionCounts.get(tx.functionName) || 0;
      functionCounts.set(tx.functionName, count + 1);
    }
  });

  // Check for excessive use of specific functions
  const totalTxs = transactions.length;
  for (const [funcName, count] of functionCounts.entries()) {
    const percentage = (count / totalTxs) * 100;
    if (percentage > 80) {
      indicators.push(`Excessive use of function: ${funcName} (${percentage.toFixed(1)}%)`);
    }
  }

  // Check for error patterns
  const errorRate = transactions.filter(tx => tx.isError === "1").length / totalTxs;
  if (errorRate > 0.5) {
    indicators.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
  }

  return indicators;
}

/**
 * Calculate risk level based on indicators and metrics
 */
function calculateRiskLevel(
  indicators: string[],
  activityLevel: 'low' | 'medium' | 'high',
  userDiversity: { uniqueUsers: number; userRetentionRate: number }
): 'low' | 'medium' | 'high' {
  if (indicators.length === 0 && activityLevel === 'medium' && userDiversity.uniqueUsers > 10) {
    return 'low';
  }
  
  if (indicators.length <= 2 && activityLevel !== 'low') {
    return 'medium';
  }
  
  return 'high';
}

/**
 * Main function to analyze contract interactions
 */
export async function analyzeContractInteractions(
  chainId: number,
  contractAddress: string,
  apiKey: string
): Promise<InteractionAnalysis | null> {
  try {
    console.log(`[Interaction Analysis] Starting analysis for ${contractAddress} on chain ${chainId}`);
    
    // Get contract transactions
    const [transactions, internalTransactions] = await Promise.all([
      getContractTransactions(chainId, contractAddress, apiKey),
      getContractInternalTransactions(chainId, contractAddress, apiKey)
    ]);

    console.log(`[Interaction Analysis] Found ${transactions.length} transactions and ${internalTransactions.length} internal transactions`);

    if (transactions.length === 0) {
      console.log(`[Interaction Analysis] No transactions found for ${contractAddress}`);
      return null;
    }

    // Calculate basic metrics
    const totalTransactions = transactions.length;
    const userDiversity = calculateUserDiversity(transactions);
    
    // Calculate transaction volume (ETH)
    const transactionVolume = transactions.reduce((sum, tx) => 
      sum + parseFloat(tx.value || "0") / Math.pow(10, 18), 0
    );

    // Calculate time metrics
    const firstTx = transactions[transactions.length - 1]; // Oldest transaction
    const lastTx = transactions[0]; // Newest transaction
    
    const firstTransactionDate = new Date(parseInt(firstTx.timeStamp) * 1000).toISOString();
    const lastActivity = new Date(parseInt(lastTx.timeStamp) * 1000).toISOString();
    
    const daysSinceFirstTx = (Date.now() - new Date(firstTransactionDate).getTime()) / (1000 * 60 * 60 * 24);
    const averageTxPerDay = daysSinceFirstTx > 0 ? totalTransactions / daysSinceFirstTx : 0;

    // Calculate activity level
    const activityLevel = calculateActivityLevel(transactions, daysSinceFirstTx);

    // Identify risk indicators
    const riskIndicators = identifyRiskIndicators(transactions, userDiversity);

    // Calculate risk level
    const riskLevel = calculateRiskLevel(riskIndicators, activityLevel, userDiversity);

    console.log(`[Interaction Analysis] Analysis completed`, {
      totalTransactions,
      uniqueUsers: userDiversity.uniqueUsers,
      activityLevel,
      riskLevel,
      riskIndicators: riskIndicators.length
    });

    return {
      totalTransactions,
      uniqueUsers: userDiversity.uniqueUsers,
      activityLevel,
      transactionVolume,
      averageTxPerDay,
      lastActivity,
      riskIndicators,
      riskLevel,
      firstTransactionDate,
      peakActivityPeriod: userDiversity.peakActivityPeriod,
      userRetentionRate: userDiversity.userRetentionRate,
    };

  } catch (error) {
    logger.error("Failed to analyze contract interactions", { error, contractAddress });
    return null;
  }
}
