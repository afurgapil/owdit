
export interface ContractInfo {
  name: string;
  path: string;
  functions: string[];
  events: string[];
  modifiers: string[];
  isAbstract: boolean;
  inherits: string[];
  lineCount: number;
}

export interface CallGraph {
  [contractName: string]: {
    calls: string[];
    calledBy: string[];
  };
}

export interface ParsedFiles {
  contracts: ContractInfo[];
  callGraph: CallGraph;
  mainContract?: string;
  totalLines: number;
  totalFunctions: number;
  totalEvents: number;
}

/**
 * Parse multiple Solidity files and extract contract information
 */
export function parseMultiFileContracts(files: Array<{ path: string; content: string }>): ParsedFiles {
  const contracts: ContractInfo[] = [];
  const callGraph: CallGraph = {};
  let totalLines = 0;
  let totalFunctions = 0;
  let totalEvents = 0;

  // First pass: extract basic contract information
  for (const file of files) {
    const fileContracts = parseFileContracts(file.path, file.content);
    contracts.push(...fileContracts);
    totalLines += file.content.split('\n').length;
    totalFunctions += fileContracts.reduce((sum, contract) => sum + contract.functions.length, 0);
    totalEvents += fileContracts.reduce((sum, contract) => sum + contract.events.length, 0);
  }

  // Second pass: build call graph and identify main contract
  for (const contract of contracts) {
    callGraph[contract.name] = {
      calls: [],
      calledBy: []
    };
  }

  // Find cross-contract calls
  for (const contract of contracts) {
    const calls = findContractCalls(contract, contracts);
    callGraph[contract.name].calls = calls;
    
    // Update calledBy relationships
    for (const calledContract of calls) {
      if (callGraph[calledContract]) {
        callGraph[calledContract].calledBy.push(contract.name);
      }
    }
  }

  // Identify main contract (most referenced or has main/entry in name)
  const mainContract = identifyMainContract(contracts, callGraph);

  return {
    contracts,
    callGraph,
    mainContract,
    totalLines,
    totalFunctions,
    totalEvents
  };
}

/**
 * Parse contracts from a single file
 */
function parseFileContracts(filePath: string, content: string): ContractInfo[] {
  const contracts: ContractInfo[] = [];
  const lines = content.split('\n');
  
  let currentContract: Partial<ContractInfo> | null = null;
  let braceCount = 0;
  let inContract = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Contract declaration
    const contractMatch = line.match(/contract\s+(\w+)(?:\s+is\s+([^{]+))?\s*{/);
    if (contractMatch) {
      if (currentContract) {
        contracts.push(currentContract as ContractInfo);
      }
      
      currentContract = {
        name: contractMatch[1],
        path: filePath,
        functions: [],
        events: [],
        modifiers: [],
        isAbstract: false,
        inherits: contractMatch[2] ? contractMatch[2].split(',').map(s => s.trim()) : [],
        lineCount: 0
      };
      
      inContract = true;
      braceCount = 1;
      continue;
    }

    if (inContract && currentContract) {
      // Count braces to track contract boundaries
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount === 0) {
        // End of contract
        currentContract.lineCount = i - (contracts.length > 0 ? contracts[contracts.length - 1].lineCount : 0);
        contracts.push(currentContract as ContractInfo);
        currentContract = null;
        inContract = false;
        continue;
      }

      // Extract functions
      const functionMatch = line.match(/function\s+(\w+)/);
      if (functionMatch && currentContract.functions) {
        currentContract.functions.push(functionMatch[1]);
      }

      // Extract events
      const eventMatch = line.match(/event\s+(\w+)/);
      if (eventMatch && currentContract.events) {
        currentContract.events.push(eventMatch[1]);
      }

      // Extract modifiers
      const modifierMatch = line.match(/modifier\s+(\w+)/);
      if (modifierMatch && currentContract.modifiers) {
        currentContract.modifiers.push(modifierMatch[1]);
      }

      // Check for abstract contract
      if (line.includes('abstract')) {
        currentContract.isAbstract = true;
      }
    }
  }

  // Add last contract if exists
  if (currentContract) {
    contracts.push(currentContract as ContractInfo);
  }

  return contracts;
}

/**
 * Find contract calls within a contract
 */
function findContractCalls(contract: ContractInfo, allContracts: ContractInfo[]): string[] {
  const calls: string[] = [];
  const contractNames = allContracts.map(c => c.name);
  
  // This is a simplified implementation
  // In a real scenario, you'd parse the actual function bodies
  // For now, we'll look for common patterns
  
  // Look for constructor calls (new ContractName)
  const constructorCalls = contract.functions.join(' ').match(/new\s+(\w+)/g);
  if (constructorCalls) {
    for (const call of constructorCalls) {
      const contractName = call.match(/new\s+(\w+)/)?.[1];
      if (contractName && contractNames.includes(contractName)) {
        calls.push(contractName);
      }
    }
  }

  return [...new Set(calls)]; // Remove duplicates
}

/**
 * Identify the main contract based on various heuristics
 */
function identifyMainContract(contracts: ContractInfo[], callGraph: CallGraph): string | undefined {
  if (contracts.length === 0) return undefined;
  if (contracts.length === 1) return contracts[0].name;

  // Heuristic 1: Look for contracts with "main", "primary", "core" in name
  const mainKeywords = ['main', 'primary', 'core', 'master', 'factory'];
  for (const contract of contracts) {
    if (mainKeywords.some(keyword => 
      contract.name.toLowerCase().includes(keyword)
    )) {
      return contract.name;
    }
  }

  // Heuristic 2: Most referenced contract
  let maxReferences = 0;
  let mostReferenced = contracts[0].name;
  
  for (const contract of contracts) {
    const references = callGraph[contract.name]?.calledBy?.length || 0;
    if (references > maxReferences) {
      maxReferences = references;
      mostReferenced = contract.name;
    }
  }

  // Heuristic 3: Contract with most functions (likely main interface)
  let maxFunctions = 0;
  let mostFunctions = contracts[0].name;
  
  for (const contract of contracts) {
    if (contract.functions.length > maxFunctions) {
      maxFunctions = contract.functions.length;
      mostFunctions = contract.name;
    }
  }

  // Return the most referenced, or if tied, the one with most functions
  return maxReferences > 0 ? mostReferenced : mostFunctions;
}

/**
 * Build dependency graph from import statements
 */
export function buildDependencyGraph(files: Array<{ path: string; content: string }>): Record<string, string[]> {
  const dependencies: Record<string, string[]> = {};

  for (const file of files) {
    const fileDeps: string[] = [];
    const lines = file.content.split('\n');
    
    for (const line of lines) {
      const importMatch = line.match(/import\s+["']([^"']+)["']/);
      if (importMatch) {
        fileDeps.push(importMatch[1]);
      }
    }
    
    dependencies[file.path] = fileDeps;
  }

  return dependencies;
}

/**
 * Combine all files into a single analysis context
 */
export function combineFilesForAnalysis(files: Array<{ path: string; content: string }>): string {
  let combined = '';
  
  for (const file of files) {
    combined += `\n// ===== FILE: ${file.path} =====\n`;
    combined += file.content;
    combined += '\n\n';
  }
  
  return combined;
}
