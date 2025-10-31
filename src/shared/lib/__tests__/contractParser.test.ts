import {
  parseMultiFileContracts,
  buildDependencyGraph,
  combineFilesForAnalysis,
  type ContractInfo,
  type ParsedFiles,
} from "../contractParser";

describe("Contract Parser", () => {
  describe("parseMultiFileContracts", () => {
    it("should parse a simple contract", () => {
      const files = [
        {
          path: "SimpleToken.sol",
          content: `
            contract SimpleToken {
              function transfer() public {}
              event Transfer(address from, address to);
            }
          `,
        },
      ];

      const result = parseMultiFileContracts(files);

      expect(result.contracts).toHaveLength(1);
      expect(result.contracts[0].name).toBe("SimpleToken");
      expect(result.contracts[0].functions).toContain("transfer");
      expect(result.contracts[0].events).toContain("Transfer");
    });

    it("should parse multiple contracts in one file", () => {
      const files = [
        {
          path: "Contracts.sol",
          content: `
            contract TokenA {
              function mint() public {}
            }
            contract TokenB {
              function burn() public {}
            }
          `,
        },
      ];

      const result = parseMultiFileContracts(files);

      expect(result.contracts).toHaveLength(2);
      expect(result.contracts[0].name).toBe("TokenA");
      expect(result.contracts[1].name).toBe("TokenB");
    });

    it("should parse contracts with inheritance", () => {
      const files = [
        {
          path: "Token.sol",
          content: `
            contract ERC20 {
              function totalSupply() public {}
            }
            contract MyToken is ERC20 {
              function customFunction() public {}
            }
          `,
        },
      ];

      const result = parseMultiFileContracts(files);

      const myToken = result.contracts.find((c) => c.name === "MyToken");
      expect(myToken).toBeDefined();
      expect(myToken?.inherits).toContain("ERC20");
    });

    it("should count total lines correctly", () => {
      const files = [
        {
          path: "Contract.sol",
          content: `line1
line2
line3
line4
line5`,
        },
      ];

      const result = parseMultiFileContracts(files);
      expect(result.totalLines).toBe(5);
    });

    it("should count functions and events across all files", () => {
      const files = [
        {
          path: "TokenA.sol",
          content: `
            contract TokenA {
              function fn1() public {}
              function fn2() public {}
              event Event1();
            }
          `,
        },
        {
          path: "TokenB.sol",
          content: `
            contract TokenB {
              function fn3() public {}
              event Event2();
              event Event3();
            }
          `,
        },
      ];

      const result = parseMultiFileContracts(files);

      expect(result.totalFunctions).toBe(3);
      expect(result.totalEvents).toBe(3);
    });

    it("should handle empty files", () => {
      const files = [
        {
          path: "Empty.sol",
          content: "",
        },
      ];

      const result = parseMultiFileContracts(files);

      expect(result.contracts).toHaveLength(0);
      // Empty string split by '\n' gives array with one empty element, so totalLines is 1
      expect(result.totalLines).toBe(1);
    });

    it("should identify main contract when only one exists", () => {
      const files = [
        {
          path: "Token.sol",
          content: `
            contract Token {
              function transfer() public {}
            }
          `,
        },
      ];

      const result = parseMultiFileContracts(files);
      expect(result.mainContract).toBe("Token");
    });

    it("should extract modifiers", () => {
      const files = [
        {
          path: "Owned.sol",
          content: `
            contract Owned {
              modifier onlyOwner() {
                _;
              }
              function test() public {}
            }
          `,
        },
      ];

      const result = parseMultiFileContracts(files);
      const contract = result.contracts[0];
      expect(contract.modifiers).toContain("onlyOwner");
    });

    it("should build call graph", () => {
      const files = [
        {
          path: "Contracts.sol",
          content: `
            contract TokenA {
              function mint() public {}
            }
            contract TokenB {
              function burn() public {}
            }
          `,
        },
      ];

      const result = parseMultiFileContracts(files);

      expect(result.callGraph).toBeDefined();
      expect(result.callGraph["TokenA"]).toBeDefined();
      expect(result.callGraph["TokenB"]).toBeDefined();
    });
  });

  describe("buildDependencyGraph", () => {
    it("should extract import statements", () => {
      const files = [
        {
          path: "TokenA.sol",
          content: `
            import "./TokenB.sol";
            import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
            
            contract TokenA {}
          `,
        },
      ];

      const deps = buildDependencyGraph(files);

      expect(deps["TokenA.sol"]).toBeDefined();
      expect(deps["TokenA.sol"]).toContain("./TokenB.sol");
      expect(deps["TokenA.sol"]).toContain(
        "@openzeppelin/contracts/token/ERC20/ERC20.sol"
      );
    });

    it("should handle files without imports", () => {
      const files = [
        {
          path: "Simple.sol",
          content: `
            contract Simple {}
          `,
        },
      ];

      const deps = buildDependencyGraph(files);

      expect(deps["Simple.sol"]).toBeDefined();
      expect(deps["Simple.sol"]).toHaveLength(0);
    });

    it("should handle multiple files", () => {
      const files = [
        {
          path: "A.sol",
          content: 'import "./B.sol";',
        },
        {
          path: "B.sol",
          content: 'import "./C.sol";',
        },
        {
          path: "C.sol",
          content: "",
        },
      ];

      const deps = buildDependencyGraph(files);

      expect(Object.keys(deps)).toHaveLength(3);
      expect(deps["A.sol"]).toContain("./B.sol");
      expect(deps["B.sol"]).toContain("./C.sol");
    });

    it("should handle different import syntaxes", () => {
      const files = [
        {
          path: "Token.sol",
          content: `
            import './Interface.sol';
            import "./Utils.sol";
          `,
        },
      ];

      const deps = buildDependencyGraph(files);

      expect(deps["Token.sol"]).toContain("./Interface.sol");
      expect(deps["Token.sol"]).toContain("./Utils.sol");
    });
  });

  describe("combineFilesForAnalysis", () => {
    it("should combine multiple files with headers", () => {
      const files = [
        {
          path: "A.sol",
          content: "contract A {}",
        },
        {
          path: "B.sol",
          content: "contract B {}",
        },
      ];

      const combined = combineFilesForAnalysis(files);

      expect(combined).toContain("// ===== FILE: A.sol =====");
      expect(combined).toContain("contract A {}");
      expect(combined).toContain("// ===== FILE: B.sol =====");
      expect(combined).toContain("contract B {}");
    });

    it("should preserve original content", () => {
      const files = [
        {
          path: "Token.sol",
          content: "pragma solidity ^0.8.0;\ncontract Token { }",
        },
      ];

      const combined = combineFilesForAnalysis(files);

      expect(combined).toContain("pragma solidity ^0.8.0;");
      expect(combined).toContain("contract Token { }");
    });

    it("should handle empty files", () => {
      const files = [
        {
          path: "Empty.sol",
          content: "",
        },
      ];

      const combined = combineFilesForAnalysis(files);

      expect(combined).toContain("// ===== FILE: Empty.sol =====");
    });

    it("should separate files with newlines", () => {
      const files = [
        {
          path: "A.sol",
          content: "A",
        },
        {
          path: "B.sol",
          content: "B",
        },
      ];

      const combined = combineFilesForAnalysis(files);

      // Check that files are properly separated
      expect(combined).toMatch(/A\.sol[\s\S]*B\.sol/);
    });

    it("should handle single file", () => {
      const files = [
        {
          path: "Single.sol",
          content: "contract Single {}",
        },
      ];

      const combined = combineFilesForAnalysis(files);

      expect(combined).toContain("// ===== FILE: Single.sol =====");
      expect(combined).toContain("contract Single {}");
    });

    it("should handle files with special characters", () => {
      const files = [
        {
          path: "contracts/tokens/ERC20.sol",
          content: "contract ERC20 {}",
        },
      ];

      const combined = combineFilesForAnalysis(files);

      expect(combined).toContain(
        "// ===== FILE: contracts/tokens/ERC20.sol ====="
      );
      expect(combined).toContain("contract ERC20 {}");
    });
  });

  describe("Type safety", () => {
    it("should have proper TypeScript types for ContractInfo", () => {
      const contractInfo: ContractInfo = {
        name: "TestContract",
        path: "Test.sol",
        functions: ["fn1", "fn2"],
        events: ["Event1"],
        modifiers: ["onlyOwner"],
        isAbstract: false,
        inherits: ["BaseContract"],
        lineCount: 100,
      };

      expect(contractInfo.name).toBe("TestContract");
      expect(contractInfo.functions).toHaveLength(2);
    });

    it("should have proper TypeScript types for ParsedFiles", () => {
      const parsedFiles: ParsedFiles = {
        contracts: [],
        callGraph: {},
        mainContract: "Main",
        totalLines: 200,
        totalFunctions: 10,
        totalEvents: 5,
      };

      expect(parsedFiles.mainContract).toBe("Main");
      expect(parsedFiles.totalLines).toBe(200);
    });
  });
});
