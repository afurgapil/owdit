// Bytecode analyzer service for extracting function selectors and contract information

export interface FunctionSelector {
  selector: string;
  signature: string;
  name: string;
  inputs: string[];
  outputs: string[];
}

export interface BytecodeAnalysisResult {
  address: string;
  bytecode: string;
  isContract: boolean;
  functionSelectors: FunctionSelector[];
  opcodeCounters: Record<string, number>;
  riskAssessment: {
    severity: "low" | "medium" | "high" | "critical";
    risks: string[];
    recommendations: string[];
  };
  contractType: string;
  estimatedComplexity: number;
}

export class BytecodeAnalyzer {
  private static readonly COMMON_SELECTORS = {
    // ERC20 Standard
    "0x70a08231": "balanceOf(address)",
    "0xa9059cbb": "transfer(address,uint256)",
    "0x23b872dd": "transferFrom(address,address,uint256)",
    "0x095ea7b3": "approve(address,uint256)",
    "0x18160ddd": "totalSupply()",
    "0x06fdde03": "name()",
    "0x95d89b41": "symbol()",
    "0x313ce567": "decimals()",
    "0x1f4e4b4e": "allowance(address,address)",

    // ERC721 Standard
    "0x6352211e": "ownerOf(uint256)",
    "0x42842e0e": "safeTransferFrom(address,address,uint256)",
    "0xb88d4fde": "safeTransferFrom(address,address,uint256,bytes)",
    "0x081812fc": "approve(address,uint256)",
    "0xa22cb465": "setApprovalForAll(address,bool)",
    "0xe985e9c5": "isApprovedForAll(address,address)",

    // ERC1155 Standard
    "0x00fdd58e": "balanceOf(address,uint256)",
    "0x4e1273f4": "balanceOfBatch(address[],uint256[])",
    "0xf242432a": "safeTransferFrom(address,address,uint256,uint256,bytes)",
    "0x2eb2c2d6":
      "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",

    // Common Functions
    "0x8da5cb5b": "owner()",
    "0x715018a6": "renounceOwnership()",
    "0xf2fde38b": "transferOwnership(address)",
    "0x3ccfd60b": "withdraw()",
    "0x5d0044ca": "withdrawAll()",
    "0x3af32abf": "pause()",
    "0x8456cb59": "unpause()",
    "0x5c975abb": "paused()",
    "0x8c7a63ae": "renounceRole(bytes32,address)",
    "0x36568abe": "hasRole(bytes32,address)",
    "0x2f2ff15d": "grantRole(bytes32,address)",
    "0xd547741f": "revokeRole(bytes32,address)",

    // DeFi Functions
    "0x40c10f19": "mint(address,uint256)",
    "0x42966c68": "burn(uint256)",
    "0x79cc6790": "burnFrom(address,uint256)",

    // Proxy Functions
    "0x5c60da1b": "implementation()",
    "0x3659cfe6": "upgradeTo(address)",
    "0x4f1ef286": "upgradeToAndCall(address,bytes)",
    "0x8f283970": "changeAdmin(address)",
    "0xf851a440": "admin()",
  };

  private static readonly OPCODES = [
    "STOP",
    "ADD",
    "MUL",
    "SUB",
    "DIV",
    "SDIV",
    "MOD",
    "SMOD",
    "ADDMOD",
    "MULMOD",
    "EXP",
    "SIGNEXTEND",
    "LT",
    "GT",
    "SLT",
    "SGT",
    "EQ",
    "ISZERO",
    "AND",
    "OR",
    "XOR",
    "NOT",
    "BYTE",
    "SHL",
    "SHR",
    "SAR",
    "SHA3",
    "ADDRESS",
    "BALANCE",
    "ORIGIN",
    "CALLER",
    "CALLVALUE",
    "CALLDATALOAD",
    "CALLDATASIZE",
    "CALLDATACOPY",
    "CODESIZE",
    "CODECOPY",
    "GASPRICE",
    "EXTCODESIZE",
    "EXTCODECOPY",
    "RETURNDATASIZE",
    "RETURNDATACOPY",
    "EXTCODEHASH",
    "BLOCKHASH",
    "COINBASE",
    "TIMESTAMP",
    "NUMBER",
    "DIFFICULTY",
    "GASLIMIT",
    "CHAINID",
    "SELFBALANCE",
    "POP",
    "MLOAD",
    "MSTORE",
    "MSTORE8",
    "SLOAD",
    "SSTORE",
    "JUMP",
    "JUMPI",
    "PC",
    "MSIZE",
    "GAS",
    "JUMPDEST",
    "PUSH1",
    "PUSH2",
    "PUSH3",
    "PUSH4",
    "PUSH5",
    "PUSH6",
    "PUSH7",
    "PUSH8",
    "PUSH9",
    "PUSH10",
    "PUSH11",
    "PUSH12",
    "PUSH13",
    "PUSH14",
    "PUSH15",
    "PUSH16",
    "PUSH17",
    "PUSH18",
    "PUSH19",
    "PUSH20",
    "PUSH21",
    "PUSH22",
    "PUSH23",
    "PUSH24",
    "PUSH25",
    "PUSH26",
    "PUSH27",
    "PUSH28",
    "PUSH29",
    "PUSH30",
    "PUSH31",
    "PUSH32",
    "DUP1",
    "DUP2",
    "DUP3",
    "DUP4",
    "DUP5",
    "DUP6",
    "DUP7",
    "DUP8",
    "DUP9",
    "DUP10",
    "DUP11",
    "DUP12",
    "DUP13",
    "DUP14",
    "DUP15",
    "DUP16",
    "SWAP1",
    "SWAP2",
    "SWAP3",
    "SWAP4",
    "SWAP5",
    "SWAP6",
    "SWAP7",
    "SWAP8",
    "SWAP9",
    "SWAP10",
    "SWAP11",
    "SWAP12",
    "SWAP13",
    "SWAP14",
    "SWAP15",
    "SWAP16",
    "LOG0",
    "LOG1",
    "LOG2",
    "LOG3",
    "LOG4",
    "CREATE",
    "CALL",
    "CALLCODE",
    "RETURN",
    "DELEGATECALL",
    "CREATE2",
    "STATICCALL",
    "REVERT",
    "INVALID",
    "SELFDESTRUCT",
  ];

  /**
   * Analyze bytecode and extract function selectors
   */
  static analyzeBytecode(
    address: string,
    bytecode: string
  ): BytecodeAnalysisResult {
    const functionSelectors = this.extractFunctionSelectors(bytecode);
    const opcodeCounters = this.analyzeOpcodes(bytecode);
    const riskAssessment = this.assessRisks(
      bytecode,
      functionSelectors,
      opcodeCounters
    );
    const contractType = this.determineContractType(functionSelectors);
    const estimatedComplexity = this.calculateComplexity(
      opcodeCounters,
      functionSelectors
    );

    return {
      address,
      bytecode,
      isContract: bytecode !== "0x" && bytecode.length > 2,
      functionSelectors,
      opcodeCounters,
      riskAssessment,
      contractType,
      estimatedComplexity,
    };
  }

  /**
   * Extract function selectors from bytecode
   */
  private static extractFunctionSelectors(
    bytecode: string
  ): FunctionSelector[] {
    const selectors: FunctionSelector[] = [];

    // Look for PUSH4 opcodes followed by function selectors
    for (let i = 0; i < bytecode.length - 8; i += 2) {
      const opcode = bytecode.substring(i, i + 2);

      if (opcode === "63") {
        // PUSH4 opcode
        const selector = "0x" + bytecode.substring(i + 2, i + 10);

        if (
          this.COMMON_SELECTORS[selector as keyof typeof this.COMMON_SELECTORS]
        ) {
          const signature =
            this.COMMON_SELECTORS[
              selector as keyof typeof this.COMMON_SELECTORS
            ];
          const [name, params] = signature.split("(");
          const inputs = params
            ? params
                .replace(")", "")
                .split(",")
                .filter((p) => p.trim())
            : [];

          selectors.push({
            selector,
            signature,
            name,
            inputs,
            outputs: [], // We can't determine outputs from bytecode alone
          });
        }
      }
    }

    // Remove duplicates
    const uniqueSelectors = selectors.filter(
      (selector, index, self) =>
        index === self.findIndex((s) => s.selector === selector.selector)
    );

    return uniqueSelectors;
  }

  /**
   * Analyze opcodes in bytecode
   */
  private static analyzeOpcodes(bytecode: string): Record<string, number> {
    const opcodeCounters: Record<string, number> = {};

    // This is a simplified opcode analysis
    // In reality, you'd need a proper EVM disassembler
    for (let i = 0; i < bytecode.length; i += 2) {
      const opcode = bytecode.substring(i, i + 2);
      const opcodeName = this.getOpcodeName(opcode);

      if (opcodeName) {
        opcodeCounters[opcodeName] = (opcodeCounters[opcodeName] || 0) + 1;
      }
    }

    return opcodeCounters;
  }

  /**
   * Get opcode name from hex value
   */
  private static getOpcodeName(hex: string): string | null {
    const opcodeMap: Record<string, string> = {
      "00": "STOP",
      "01": "ADD",
      "02": "MUL",
      "03": "SUB",
      "04": "DIV",
      "05": "SDIV",
      "06": "MOD",
      "07": "SMOD",
      "08": "ADDMOD",
      "09": "MULMOD",
      "0a": "EXP",
      "0b": "SIGNEXTEND",
      "10": "LT",
      "11": "GT",
      "12": "SLT",
      "13": "SGT",
      "14": "EQ",
      "15": "ISZERO",
      "16": "AND",
      "17": "OR",
      "18": "XOR",
      "19": "NOT",
      "1a": "BYTE",
      "1b": "SHL",
      "1c": "SHR",
      "1d": "SAR",
      "20": "SHA3",
      "30": "ADDRESS",
      "31": "BALANCE",
      "32": "ORIGIN",
      "33": "CALLER",
      "34": "CALLVALUE",
      "35": "CALLDATALOAD",
      "36": "CALLDATASIZE",
      "37": "CALLDATACOPY",
      "38": "CODESIZE",
      "39": "CODECOPY",
      "3a": "GASPRICE",
      "3b": "EXTCODESIZE",
      "3c": "EXTCODECOPY",
      "3d": "RETURNDATASIZE",
      "3e": "RETURNDATACOPY",
      "3f": "EXTCODEHASH",
      "40": "BLOCKHASH",
      "41": "COINBASE",
      "42": "TIMESTAMP",
      "43": "NUMBER",
      "44": "DIFFICULTY",
      "45": "GASLIMIT",
      "46": "CHAINID",
      "47": "SELFBALANCE",
      "50": "POP",
      "51": "MLOAD",
      "52": "MSTORE",
      "53": "MSTORE8",
      "54": "SLOAD",
      "55": "SSTORE",
      "56": "JUMP",
      "57": "JUMPI",
      "58": "PC",
      "59": "MSIZE",
      "5a": "GAS",
      "5b": "JUMPDEST",
      f0: "CREATE",
      f1: "CALL",
      f2: "CALLCODE",
      f3: "RETURN",
      f4: "DELEGATECALL",
      f5: "CREATE2",
      fa: "STATICCALL",
      fd: "REVERT",
      fe: "INVALID",
      ff: "SELFDESTRUCT",
    };

    return opcodeMap[hex] || null;
  }

  /**
   * Assess risks based on bytecode analysis
   */
  private static assessRisks(
    bytecode: string,
    selectors: FunctionSelector[],
    opcodes: Record<string, number>
  ): {
    severity: "low" | "medium" | "high" | "critical";
    risks: string[];
    recommendations: string[];
  } {
    const risks: string[] = [];
    const recommendations: string[] = [];

    // Check for dangerous opcodes
    if (opcodes["SELFDESTRUCT"]) {
      const selfdestructCount = opcodes["SELFDESTRUCT"];
      if (selfdestructCount > 100) {
        risks.push(
          `CRITICAL: Excessive SELFDESTRUCT opcodes (${selfdestructCount}) - potential malicious contract`
        );
        recommendations.push(
          "DO NOT INTERACT: This contract appears to be malicious or corrupted"
        );
      } else if (selfdestructCount > 10) {
        risks.push(
          `HIGH: Multiple SELFDESTRUCT opcodes (${selfdestructCount}) - verify functionality`
        );
        recommendations.push(
          "Verify self-destruct functionality is intentional and secure"
        );
      } else {
        risks.push("Contract can self-destruct");
        recommendations.push(
          "Verify self-destruct functionality is intentional"
        );
      }
    }

    if (opcodes["DELEGATECALL"]) {
      risks.push("Contract uses delegatecall - potential proxy pattern");
      recommendations.push("Verify delegatecall usage is secure");
    }

    if (opcodes["CREATE"] || opcodes["CREATE2"]) {
      risks.push("Contract can create new contracts");
      recommendations.push("Verify contract creation logic");
    }

    // Check for reentrancy patterns
    if (opcodes["CALL"] && opcodes["SSTORE"]) {
      risks.push("Potential reentrancy vulnerability");
      recommendations.push("Implement reentrancy guards");
    }

    // Check for access control
    const hasAccessControl = selectors.some(
      (s) =>
        s.name.includes("owner") ||
        s.name.includes("role") ||
        s.name.includes("admin")
    );

    if (!hasAccessControl && selectors.length > 5) {
      risks.push("No apparent access control mechanisms");
      recommendations.push("Implement proper access control");
    }

    // Determine severity
    let severity: "low" | "medium" | "high" | "critical" = "low";
    if (risks.length >= 3) severity = "high";
    else if (risks.length >= 2) severity = "medium";
    else if (risks.length >= 1) severity = "low";

    return { severity, risks, recommendations };
  }

  /**
   * Determine contract type based on function selectors
   */
  private static determineContractType(selectors: FunctionSelector[]): string {
    const erc20Selectors = [
      "balanceOf",
      "transfer",
      "transferFrom",
      "approve",
      "totalSupply",
    ];
    const erc721Selectors = [
      "ownerOf",
      "safeTransferFrom",
      "approve",
      "setApprovalForAll",
    ];
    const erc1155Selectors = [
      "balanceOf",
      "safeTransferFrom",
      "setApprovalForAll",
    ];

    const hasErc20 = erc20Selectors.every((sel) =>
      selectors.some((s) => s.name === sel)
    );

    const hasErc721 = erc721Selectors.every((sel) =>
      selectors.some((s) => s.name === sel)
    );

    const hasErc1155 = erc1155Selectors.every((sel) =>
      selectors.some((s) => s.name === sel)
    );

    if (hasErc20) return "ERC20 Token";
    if (hasErc721) return "ERC721 NFT";
    if (hasErc1155) return "ERC1155 Multi-Token";
    if (selectors.some((s) => s.name.includes("owner")))
      return "Ownable Contract";
    if (selectors.some((s) => s.name.includes("proxy")))
      return "Proxy Contract";

    return "Custom Contract";
  }

  /**
   * Check if contract is upgradeable (should not be cached)
   */
  static isUpgradeableContract(
    bytecode: string,
    functionSelectors: FunctionSelector[]
  ): boolean {
    const opcodeCounters = this.analyzeOpcodes(bytecode);

    // Check for proxy patterns (delegatecall indicates proxy)
    if (opcodeCounters["DELEGATECALL"] > 0) {
      return true;
    }

    // Check for upgradeable function selectors (most specific ones)
    const upgradeableSelectors = [
      "0x3659cfe6", // upgradeTo(address)
      "0x4f1ef286", // upgradeToAndCall(address,bytes)
      "0x8f283970", // changeAdmin(address)
      "0xf851a440", // admin()
      "0x5c60da1b", // implementation()
      "0x715018a6", // renounceOwnership()
      "0xf2fde38b", // transferOwnership(address)
    ];

    const hasUpgradeableFunctions = functionSelectors.some((selector) =>
      upgradeableSelectors.includes(selector.selector)
    );

    if (hasUpgradeableFunctions) {
      return true;
    }

    // Check for selfdestruct (indicates upgradeable pattern)
    if (opcodeCounters["SELFDESTRUCT"] > 0) {
      return true;
    }

    // Check for common upgradeable contract patterns
    const contractType = this.determineContractType(functionSelectors);
    if (
      contractType === "Proxy Contract" ||
      contractType === "Upgradeable Contract"
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if verified contract is upgradeable based on source code
   */
  static isUpgradeableFromSourceCode(sourceCode: string): boolean {
    if (!sourceCode || sourceCode.trim() === "") {
      return false;
    }

    const code = sourceCode.toLowerCase();

    // Check for delegatecall usage (proxy pattern) - most reliable indicator
    if (code.includes("delegatecall")) {
      return true;
    }

    // Check for specific upgradeable function signatures (most reliable)
    const upgradeableFunctionSignatures = [
      "function upgradeTo(",
      "function upgradeToAndCall(",
      "function changeAdmin(",
      "function implementation()",
      "function admin()",
      "function transferOwnership(",
      "function renounceOwnership()",
    ];

    const hasUpgradeableFunctions = upgradeableFunctionSignatures.some(
      (signature) => code.includes(signature)
    );

    if (hasUpgradeableFunctions) {
      return true;
    }

    // Check for upgradeable contract inheritance (very specific)
    const upgradeableInheritance = [
      "is upgradeable",
      "is transparentupgradeableproxy",
      "is uupsupgradeable",
      "is beaconproxy",
      "is minimalproxy",
      "is upgradeablecontract",
      "is proxycontract",
    ];

    const hasUpgradeableInheritance = upgradeableInheritance.some(
      (inheritance) => code.includes(inheritance)
    );

    if (hasUpgradeableInheritance) {
      return true;
    }

    // Check for specific upgradeable library imports
    const upgradeableLibraryImports = [
      'import "@openzeppelin/contracts-upgradeable/',
      'import "@openzeppelin/contracts/proxy/',
      'import "@openzeppelin/contracts-upgradeable/proxy/',
      'import "hardhat/upgradeable/',
    ];

    const hasUpgradeableImports = upgradeableLibraryImports.some((importPath) =>
      code.includes(importPath)
    );

    if (hasUpgradeableImports) {
      return true;
    }

    // Check for upgradeable contract names in pragma or contract declaration
    const upgradeableContractNames = [
      "contract.*upgradeable",
      "contract.*proxy",
      "abstract.*upgradeable",
      "abstract.*proxy",
    ];

    const hasUpgradeableContractNames = upgradeableContractNames.some(
      (pattern) => {
        const regex = new RegExp(pattern, "i");
        return regex.test(code);
      }
    );

    if (hasUpgradeableContractNames) {
      return true;
    }

    return false;
  }

  /**
   * Calculate estimated complexity
   */
  private static calculateComplexity(
    opcodes: Record<string, number>,
    selectors: FunctionSelector[]
  ): number {
    const totalOpcodes = Object.values(opcodes).reduce(
      (sum, count) => sum + count,
      0
    );
    const functionCount = selectors.length;

    // Simple complexity calculation
    return Math.min(100, Math.round(totalOpcodes / 100 + functionCount * 5));
  }
}

export default BytecodeAnalyzer;
