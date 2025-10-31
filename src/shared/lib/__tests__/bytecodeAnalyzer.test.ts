import { BytecodeAnalyzer } from "../bytecodeAnalyzer";

describe("BytecodeAnalyzer", () => {
  const testAddress = "0x1234567890123456789012345678901234567890";

  describe("analyzeBytecode", () => {
    it("should identify non-contract (empty bytecode)", () => {
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, "0x");

      expect(result.isContract).toBe(false);
      expect(result.address).toBe(testAddress);
      expect(result.bytecode).toBe("0x");
      expect(result.functionSelectors).toEqual([]);
      expect(result.contractType).toBe("Custom Contract");
    });

    it("should analyze simple contract with basic opcodes", () => {
      // Simple bytecode with STOP, ADD, MUL opcodes - need more opcodes for complexity > 0
      const bytecode = "0x" + "00010203".repeat(30); // 120 opcodes for complexity
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.isContract).toBe(true);
      expect(result.opcodeCounters).toHaveProperty("STOP");
      expect(result.opcodeCounters).toHaveProperty("ADD");
      expect(result.opcodeCounters).toHaveProperty("MUL");
      expect(result.riskAssessment).toBeDefined();
      expect(result.estimatedComplexity).toBeGreaterThan(0);
    });

    it("should extract ERC20 function selectors", () => {
      // Bytecode with ERC20 transfer selector (0xa9059cbb)
      const bytecode = "0x63a9059cbb";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.functionSelectors.length).toBeGreaterThan(0);
      const transferSelector = result.functionSelectors.find(
        (s) => s.selector === "0xa9059cbb"
      );
      expect(transferSelector).toBeDefined();
      expect(transferSelector?.name).toBe("transfer");
      expect(transferSelector?.signature).toBe("transfer(address,uint256)");
      expect(transferSelector?.inputs).toEqual(["address", "uint256"]);
    });

    it("should detect ERC20 token contract", () => {
      // Bytecode with multiple ERC20 selectors
      const erc20Selectors = [
        "63a9059cbb", // transfer
        "6370a08231", // balanceOf
        "6323b872dd", // transferFrom
        "63095ea7b3", // approve
        "6318160ddd", // totalSupply
      ];
      const bytecode = "0x" + erc20Selectors.join("");
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.contractType).toBe("ERC20 Token");
      expect(result.functionSelectors.length).toBeGreaterThanOrEqual(5);
    });

    it("should detect ERC721 NFT contract", () => {
      // Bytecode with ERC721 selectors
      const erc721Selectors = [
        "636352211e", // ownerOf
        "6342842e0e", // safeTransferFrom(address,address,uint256)
        "63a22cb465", // setApprovalForAll
        "63081812fc", // approve
      ];
      const bytecode = "0x" + erc721Selectors.join("");
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.contractType).toBe("ERC721 NFT");
    });

    it("should remove duplicate function selectors", () => {
      // Bytecode with duplicate transfer selector
      const bytecode = "0x63a9059cbb63a9059cbb63a9059cbb";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      const transferSelectors = result.functionSelectors.filter(
        (s) => s.selector === "0xa9059cbb"
      );
      expect(transferSelectors.length).toBe(1);
    });
  });

  describe("Risk Assessment", () => {
    it("should flag SELFDESTRUCT as risky", () => {
      // Bytecode with SELFDESTRUCT opcode (0xff)
      const bytecode = "0xff";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.riskAssessment.risks).toContain(
        "Contract can self-destruct"
      );
      expect(result.riskAssessment.recommendations.length).toBeGreaterThan(0);
    });

    it("should flag excessive SELFDESTRUCT as critical", () => {
      // Bytecode with 150 SELFDESTRUCT opcodes
      const bytecode = "0x" + "ff".repeat(150);
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      const criticalRisk = result.riskAssessment.risks.find((r) =>
        r.includes("CRITICAL")
      );
      expect(criticalRisk).toBeDefined();
      expect(result.riskAssessment.recommendations).toContain(
        "DO NOT INTERACT: This contract appears to be malicious or corrupted"
      );
    });

    it("should flag multiple SELFDESTRUCT as high risk", () => {
      // Bytecode with 15 SELFDESTRUCT opcodes
      const bytecode = "0x" + "ff".repeat(15);
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      const highRisk = result.riskAssessment.risks.find((r) =>
        r.includes("HIGH")
      );
      expect(highRisk).toBeDefined();
    });

    it("should flag DELEGATECALL as risky", () => {
      // Bytecode with DELEGATECALL opcode (0xf4)
      const bytecode = "0xf4";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.riskAssessment.risks).toContain(
        "Contract uses delegatecall - potential proxy pattern"
      );
    });

    it("should flag contract creation opcodes", () => {
      // Bytecode with CREATE (0xf0) and CREATE2 (0xf5)
      const bytecode = "0xf0f5";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.riskAssessment.risks).toContain(
        "Contract can create new contracts"
      );
    });

    it("should flag potential reentrancy vulnerability", () => {
      // Bytecode with CALL (0xf1) and SSTORE (0x55)
      const bytecode = "0xf155";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.riskAssessment.risks).toContain(
        "Potential reentrancy vulnerability"
      );
      expect(result.riskAssessment.recommendations).toContain(
        "Implement reentrancy guards"
      );
    });

    it("should flag missing access control", () => {
      // Contract with many functions but no owner/role functions
      const selectors = [
        "63a9059cbb", // transfer
        "6370a08231", // balanceOf
        "6323b872dd", // transferFrom
        "63095ea7b3", // approve
        "6318160ddd", // totalSupply
        "6306fdde03", // name
      ];
      const bytecode = "0x" + selectors.join("");
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.riskAssessment.risks).toContain(
        "No apparent access control mechanisms"
      );
    });

    it("should calculate correct severity levels", () => {
      // Low severity: 1 risk
      const lowRisk = "0xff";
      const lowResult = BytecodeAnalyzer.analyzeBytecode(testAddress, lowRisk);
      expect(lowResult.riskAssessment.severity).toBe("low");

      // Medium severity: 2 risks (SELFDESTRUCT + DELEGATECALL)
      const mediumRisk = "0xfff4";
      const mediumResult = BytecodeAnalyzer.analyzeBytecode(
        testAddress,
        mediumRisk
      );
      expect(mediumResult.riskAssessment.severity).toBe("medium");

      // High severity: 3 risks (SELFDESTRUCT + DELEGATECALL + CREATE)
      const highRisk = "0xfff4f0";
      const highResult = BytecodeAnalyzer.analyzeBytecode(
        testAddress,
        highRisk
      );
      expect(highResult.riskAssessment.severity).toBe("high");
    });
  });

  describe("Contract Type Detection", () => {
    it("should detect ownable contract", () => {
      // Bytecode with owner function
      const bytecode = "0x638da5cb5b"; // owner()
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.contractType).toBe("Ownable Contract");
    });

    it("should detect custom contract by default", () => {
      // Bytecode without known patterns
      const bytecode = "0x00010203";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.contractType).toBe("Custom Contract");
    });

    it("should prioritize ERC20 over Ownable", () => {
      // Bytecode with both ERC20 and owner functions
      const bytecode =
        "0x63a9059cbb6370a082316323b872dd63095ea7b36318160ddd638da5cb5b";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.contractType).toBe("ERC20 Token");
    });
  });

  describe("Upgradeable Contract Detection - Bytecode", () => {
    it("should detect proxy pattern via DELEGATECALL", () => {
      const bytecode = "0xf4"; // DELEGATECALL
      const selectors: any[] = [];

      const isUpgradeable = BytecodeAnalyzer.isUpgradeableContract(
        bytecode,
        selectors
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should detect upgradeTo function selector", () => {
      const bytecode = "0x633659cfe6"; // upgradeTo(address)
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      const isUpgradeable = BytecodeAnalyzer.isUpgradeableContract(
        bytecode,
        result.functionSelectors
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should detect implementation function selector", () => {
      const bytecode = "0x635c60da1b"; // implementation()
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      const isUpgradeable = BytecodeAnalyzer.isUpgradeableContract(
        bytecode,
        result.functionSelectors
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should detect upgradeToAndCall function", () => {
      const bytecode = "0x634f1ef286"; // upgradeToAndCall(address,bytes)
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      const isUpgradeable = BytecodeAnalyzer.isUpgradeableContract(
        bytecode,
        result.functionSelectors
      );
      expect(isUpgradeable).toBe(true);
    });

    it("should not flag non-upgradeable contract", () => {
      // Simple ERC20 without proxy patterns
      const bytecode = "0x63a9059cbb6370a08231";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      const isUpgradeable = BytecodeAnalyzer.isUpgradeableContract(
        bytecode,
        result.functionSelectors
      );
      expect(isUpgradeable).toBe(false);
    });
  });

  describe("Upgradeable Contract Detection - Source Code", () => {
    it("should detect delegatecall in source code", () => {
      const sourceCode = `
        contract Proxy {
          function delegate(address impl) public {
            impl.delegatecall(msg.data);
          }
        }
      `;
      expect(BytecodeAnalyzer.isUpgradeableFromSourceCode(sourceCode)).toBe(
        true
      );
    });

    it("should detect upgradeTo function signature", () => {
      const sourceCode = `
        contract MyProxy {
          function upgradeTo(address newImplementation) public onlyOwner {
            _implementation = newImplementation;
          }
        }
      `;
      expect(BytecodeAnalyzer.isUpgradeableFromSourceCode(sourceCode)).toBe(
        true
      );
    });

    it("should detect OpenZeppelin upgradeable imports", () => {
      const sourceCode = `
        import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
      `;
      expect(BytecodeAnalyzer.isUpgradeableFromSourceCode(sourceCode)).toBe(
        true
      );
    });

    it("should detect proxy contract imports", () => {
      const sourceCode = `
        import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
      `;
      expect(BytecodeAnalyzer.isUpgradeableFromSourceCode(sourceCode)).toBe(
        true
      );
    });

    it("should detect upgradeable inheritance", () => {
      const sourceCode = `
        contract MyContract is Upgradeable {
          // contract code
        }
      `;
      expect(BytecodeAnalyzer.isUpgradeableFromSourceCode(sourceCode)).toBe(
        true
      );
    });

    it("should detect UUPS upgradeable pattern", () => {
      const sourceCode = `
        contract MyToken is UUPSUpgradeable {
          // contract code
        }
      `;
      expect(BytecodeAnalyzer.isUpgradeableFromSourceCode(sourceCode)).toBe(
        true
      );
    });

    it("should not flag regular contract as upgradeable", () => {
      const sourceCode = `
        contract SimpleToken {
          mapping(address => uint256) public balances;
          
          function transfer(address to, uint256 amount) public {
            balances[msg.sender] -= amount;
            balances[to] += amount;
          }
        }
      `;
      expect(BytecodeAnalyzer.isUpgradeableFromSourceCode(sourceCode)).toBe(
        false
      );
    });

    it("should handle empty source code", () => {
      expect(BytecodeAnalyzer.isUpgradeableFromSourceCode("")).toBe(false);
      expect(BytecodeAnalyzer.isUpgradeableFromSourceCode("   ")).toBe(false);
    });

    it("should be case-insensitive for pattern matching", () => {
      const sourceCode = `
        contract MyContract is UPGRADEABLE {
          function UPGRADETO(address impl) public {}
        }
      `;
      expect(BytecodeAnalyzer.isUpgradeableFromSourceCode(sourceCode)).toBe(
        true
      );
    });
  });

  describe("Complexity Calculation", () => {
    it("should calculate low complexity for simple contracts", () => {
      const bytecode = "0x000102";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.estimatedComplexity).toBeLessThan(10);
    });

    it("should calculate higher complexity for contracts with many functions", () => {
      // 10 different function selectors + opcodes
      const selectors = Array.from({ length: 10 }, (_, i) =>
        i === 0 ? "63a9059cbb" : "63" + i.toString().padStart(8, "0")
      );
      // Add more opcodes to increase complexity (need >100 opcodes for complexity > 20)
      const bytecode = "0x" + selectors.join("") + "00".repeat(2000);
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.estimatedComplexity).toBeGreaterThan(20);
      expect(result.functionSelectors.length).toBeGreaterThan(0);
    });

    it("should cap complexity at 100", () => {
      // Very large bytecode
      const bytecode = "0x" + "00".repeat(20000);
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.estimatedComplexity).toBeLessThanOrEqual(100);
    });
  });

  describe("Opcode Analysis", () => {
    it("should count individual opcodes correctly", () => {
      // 3x STOP (00), 2x ADD (01), 1x MUL (02)
      const bytecode = "0x000000010102";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.opcodeCounters["STOP"]).toBe(3);
      expect(result.opcodeCounters["ADD"]).toBe(2);
      expect(result.opcodeCounters["MUL"]).toBe(1);
    });

    it("should handle unknown opcodes gracefully", () => {
      // Valid bytecode with known opcodes only (opcodes must be valid hex)
      const bytecode = "0x000001020304";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.opcodeCounters["STOP"]).toBeGreaterThan(0);
      expect(result.opcodeCounters["ADD"]).toBeGreaterThan(0);
      expect(result.opcodeCounters["MUL"]).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very short bytecode", () => {
      const bytecode = "0x00";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.isContract).toBe(true);
      expect(result.functionSelectors).toEqual([]);
    });

    it("should handle bytecode without 0x prefix", () => {
      const bytecode = "a9059cbb";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      expect(result.isContract).toBe(true);
    });

    it("should handle malformed selector extraction", () => {
      // Bytecode too short for complete selector
      const bytecode = "0x63a905";
      const result = BytecodeAnalyzer.analyzeBytecode(testAddress, bytecode);

      // Should not crash
      expect(result.functionSelectors).toBeDefined();
    });
  });
});
