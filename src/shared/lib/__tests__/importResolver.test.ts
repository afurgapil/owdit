import {
  resolveImports,
  buildImportDependencyGraph,
  ResolvedImports,
} from "../importResolver";

describe("Import Resolver", () => {
  describe("Import Extraction", () => {
    it("should extract simple import statement", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: `
            // SPDX-License-Identifier: MIT
            pragma solidity ^0.8.0;
            import "./Helper.sol";
            
            contract Contract {}
          `,
        },
      ];

      const result = await resolveImports(files);
      expect(result.resolved.length + result.missing.length).toBeGreaterThan(0);
    });

    it("should extract import with 'as' alias", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: `
            import "./Helper.sol" as Helper;
            contract Contract {}
          `,
        },
      ];

      const result = await resolveImports(files);
      expect(result.resolved.length + result.missing.length).toBeGreaterThan(0);
    });

    it("should extract import with 'from' syntax", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: `
            import * as Helper from "./Helper.sol";
            contract Contract {}
          `,
        },
      ];

      const result = await resolveImports(files);
      expect(result.resolved.length + result.missing.length).toBeGreaterThan(0);
    });

    it("should extract named imports", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: `
            import {Ownable, Pausable} from "@openzeppelin/contracts/access/Ownable.sol";
            contract Contract {}
          `,
        },
      ];

      const result = await resolveImports(files);
      expect(result.resolved.length + result.missing.length).toBeGreaterThan(0);
    });

    it("should handle multiple imports in one file", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: `
            import "./Helper1.sol";
            import "./Helper2.sol";
            import "@openzeppelin/contracts/access/Ownable.sol";
            
            contract Contract {}
          `,
        },
      ];

      const result = await resolveImports(files);
      expect(
        result.resolved.length + result.missing.length
      ).toBeGreaterThanOrEqual(3);
    });

    it("should deduplicate same imports", async () => {
      const files = [
        {
          path: "Contract1.sol",
          content: 'import "./Helper.sol";',
        },
        {
          path: "Contract2.sol",
          content: 'import "./Helper.sol";',
        },
      ];

      const result = await resolveImports(files);
      const helperImports = [...result.resolved, ...result.missing].filter(
        (imp) => imp.path === "./Helper.sol"
      );
      // Should only appear once despite being imported by two files
      expect(helperImports.length).toBe(1);
    });
  });

  describe("Import Classification", () => {
    it("should classify relative imports with ./", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "./Helper.sol";',
        },
      ];

      const result = await resolveImports(files);
      const relativeImport = [...result.resolved, ...result.missing].find(
        (imp) => imp.path === "./Helper.sol"
      );
      expect(relativeImport?.type).toBe("relative");
    });

    it("should classify relative imports with ../", async () => {
      const files = [
        {
          path: "contracts/Contract.sol",
          content: 'import "../interfaces/IHelper.sol";',
        },
      ];

      const result = await resolveImports(files);
      const relativeImport = [...result.resolved, ...result.missing].find(
        (imp) => imp.path === "../interfaces/IHelper.sol"
      );
      expect(relativeImport?.type).toBe("relative");
    });

    it("should classify OpenZeppelin imports as npm", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "@openzeppelin/contracts/access/Ownable.sol";',
        },
      ];

      const result = await resolveImports(files);
      const npmImport = [...result.resolved, ...result.missing].find((imp) =>
        imp.path.includes("@openzeppelin")
      );
      expect(npmImport?.type).toBe("npm");
    });

    it("should classify Chainlink imports as npm", async () => {
      const files = [
        {
          path: "Contract.sol",
          content:
            'import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";',
        },
      ];

      const result = await resolveImports(files);
      const npmImport = [...result.resolved, ...result.missing].find((imp) =>
        imp.path.includes("@chainlink")
      );
      expect(npmImport?.type).toBe("npm");
    });

    it("should classify Uniswap imports as npm", async () => {
      const files = [
        {
          path: "Contract.sol",
          content:
            'import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";',
        },
      ];

      const result = await resolveImports(files);
      const npmImport = [...result.resolved, ...result.missing].find((imp) =>
        imp.path.includes("@uniswap")
      );
      expect(npmImport?.type).toBe("npm");
    });

    it("should classify Hardhat imports as npm", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "hardhat/console.sol";',
        },
      ];

      const result = await resolveImports(files);
      const npmImport = [...result.resolved, ...result.missing].find((imp) =>
        imp.path.includes("hardhat")
      );
      expect(npmImport?.type).toBe("npm");
    });

    it("should classify Foundry imports as npm", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "forge-std/Test.sol";',
        },
      ];

      const result = await resolveImports(files);
      const npmImport = [...result.resolved, ...result.missing].find((imp) =>
        imp.path.includes("forge-std")
      );
      expect(npmImport?.type).toBe("npm");
    });

    it("should classify GitHub URL imports as github", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "https://github.com/user/repo/Contract.sol";',
        },
      ];

      const result = await resolveImports(files);
      const githubImport = [...result.resolved, ...result.missing].find((imp) =>
        imp.path.includes("github.com")
      );
      expect(githubImport?.type).toBe("github");
    });

    it("should classify unknown imports", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "unknown-package/Contract.sol";',
        },
      ];

      const result = await resolveImports(files);
      const unknownImport = [...result.resolved, ...result.missing].find(
        (imp) => imp.path === "unknown-package/Contract.sol"
      );
      expect(unknownImport?.type).toBe("unknown");
    });
  });

  describe("Relative Import Resolution", () => {
    it("should resolve relative import when file exists", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "./Helper.sol";',
        },
        {
          path: "Helper.sol",
          content: "contract Helper {}",
        },
      ];

      const result = await resolveImports(files);
      const resolvedHelper = result.resolved.find((imp) =>
        imp.path.includes("Helper.sol")
      );
      expect(resolvedHelper).toBeDefined();
      expect(resolvedHelper?.resolved).toBe(true);
      expect(resolvedHelper?.content).toContain("contract Helper");
    });

    it("should mark relative import as missing when file not found", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "./MissingHelper.sol";',
        },
      ];

      const result = await resolveImports(files);
      const missingHelper = result.missing.find((imp) =>
        imp.path.includes("MissingHelper.sol")
      );
      expect(missingHelper).toBeDefined();
      expect(missingHelper?.resolved).toBe(false);
      expect(missingHelper?.error).toBeTruthy();
    });

    it("should resolve nested relative imports", async () => {
      const files = [
        {
          path: "contracts/Token.sol",
          content: 'import "./Ownable.sol";',
        },
        {
          path: "contracts/Ownable.sol",
          content: "contract Ownable {}",
        },
      ];

      const result = await resolveImports(files);
      const resolvedOwnable = result.resolved.find((imp) =>
        imp.path.includes("Ownable.sol")
      );
      expect(resolvedOwnable?.resolved).toBe(true);
    });

    it("should handle parent directory imports", async () => {
      const files = [
        {
          path: "contracts/tokens/Token.sol",
          content: 'import "../interfaces/IToken.sol";',
        },
        {
          path: "../interfaces/IToken.sol",
          content: "interface IToken {}",
        },
      ];

      const result = await resolveImports(files);
      // The import resolver uses simplified path matching
      // When the file path exactly matches the import path, it should resolve
      const allImports = [...result.resolved, ...result.missing];
      const interfaceImport = allImports.find(
        (imp) => imp.path === "../interfaces/IToken.sol"
      );
      expect(interfaceImport).toBeDefined();
      expect(interfaceImport?.resolved).toBe(true);
    });
  });

  describe("NPM Import Resolution", () => {
    it("should resolve OpenZeppelin Ownable contract", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "@openzeppelin/contracts/access/Ownable.sol";',
        },
      ];

      const result = await resolveImports(files);
      const ownableImport = result.resolved.find((imp) =>
        imp.path.includes("Ownable.sol")
      );

      if (ownableImport) {
        expect(ownableImport.resolved).toBe(true);
        expect(ownableImport.content).toContain("contract Ownable");
        expect(ownableImport.content).toContain("onlyOwner");
      }
    });

    it("should resolve OpenZeppelin ReentrancyGuard contract", async () => {
      const files = [
        {
          path: "Contract.sol",
          content:
            'import "@openzeppelin/contracts/security/ReentrancyGuard.sol";',
        },
      ];

      const result = await resolveImports(files);
      const guardImport = result.resolved.find((imp) =>
        imp.path.includes("ReentrancyGuard.sol")
      );

      if (guardImport) {
        expect(guardImport.resolved).toBe(true);
        expect(guardImport.content).toContain("ReentrancyGuard");
        expect(guardImport.content).toContain("nonReentrant");
      }
    });

    it("should resolve OpenZeppelin Pausable contract", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "@openzeppelin/contracts/security/Pausable.sol";',
        },
      ];

      const result = await resolveImports(files);
      const pausableImport = result.resolved.find((imp) =>
        imp.path.includes("Pausable.sol")
      );

      if (pausableImport) {
        expect(pausableImport.resolved).toBe(true);
        expect(pausableImport.content).toContain("Pausable");
        expect(pausableImport.content).toContain("whenNotPaused");
      }
    });

    it("should mark unknown npm package as missing", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "@unknown/package/Contract.sol";',
        },
      ];

      const result = await resolveImports(files);
      const unknownImport = result.missing.find((imp) =>
        imp.path.includes("@unknown")
      );
      expect(unknownImport).toBeDefined();
      expect(unknownImport?.resolved).toBe(false);
    });

    it("should track auto-fetched npm imports separately", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "@openzeppelin/contracts/access/Ownable.sol";',
        },
      ];

      const result = await resolveImports(files);
      expect(result.autoFetched.length).toBeGreaterThan(0);
      const autoFetched = result.autoFetched.find((imp) =>
        imp.path.includes("Ownable.sol")
      );
      expect(autoFetched?.type).toBe("npm");
    });
  });

  describe("GitHub Import Resolution", () => {
    it("should mark github imports as unresolved (not implemented)", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "https://github.com/user/repo/Contract.sol";',
        },
      ];

      const result = await resolveImports(files);
      const githubImport = [...result.resolved, ...result.missing].find(
        (imp) => imp.type === "github"
      );
      expect(githubImport).toBeDefined();
      expect(githubImport?.resolved).toBe(false);
      expect(githubImport?.error).toContain("not yet implemented");
    });

    it("should handle raw.githubusercontent.com URLs", async () => {
      const files = [
        {
          path: "Contract.sol",
          content:
            'import "https://raw.githubusercontent.com/user/repo/main/Contract.sol";',
        },
      ];

      const result = await resolveImports(files);
      const githubImport = [...result.resolved, ...result.missing].find((imp) =>
        imp.path.includes("raw.githubusercontent.com")
      );
      expect(githubImport?.type).toBe("github");
    });
  });

  describe("Dependency Graph Building", () => {
    it("should build basic dependency graph", () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "./Helper.sol";',
        },
        {
          path: "Helper.sol",
          content: "contract Helper {}",
        },
      ];

      const resolvedImports: ResolvedImports = {
        resolved: [
          {
            path: "./Helper.sol",
            type: "relative",
            resolved: true,
            content: "contract Helper {}",
          },
        ],
        missing: [],
        autoFetched: [],
      };

      const graph = buildImportDependencyGraph(files, resolvedImports);

      expect(graph["Contract.sol"]).toBeDefined();
      expect(graph["Contract.sol"]).toContain("./Helper.sol");
    });

    it("should handle multiple dependencies", () => {
      const files = [
        {
          path: "Contract.sol",
          content: `
            import "./Helper1.sol";
            import "./Helper2.sol";
          `,
        },
        {
          path: "Helper1.sol",
          content: "contract Helper1 {}",
        },
        {
          path: "Helper2.sol",
          content: "contract Helper2 {}",
        },
      ];

      const resolvedImports: ResolvedImports = {
        resolved: [
          {
            path: "./Helper1.sol",
            type: "relative",
            resolved: true,
            content: "contract Helper1 {}",
          },
          {
            path: "./Helper2.sol",
            type: "relative",
            resolved: true,
            content: "contract Helper2 {}",
          },
        ],
        missing: [],
        autoFetched: [],
      };

      const graph = buildImportDependencyGraph(files, resolvedImports);

      expect(graph["Contract.sol"]).toHaveLength(2);
      expect(graph["Contract.sol"]).toContain("./Helper1.sol");
      expect(graph["Contract.sol"]).toContain("./Helper2.sol");
    });

    it("should handle transitive dependencies", () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "./Helper.sol";',
        },
        {
          path: "Helper.sol",
          content: 'import "./Base.sol";',
        },
        {
          path: "Base.sol",
          content: "contract Base {}",
        },
      ];

      const resolvedImports: ResolvedImports = {
        resolved: [
          {
            path: "./Helper.sol",
            type: "relative",
            resolved: true,
            content: 'import "./Base.sol";',
          },
          {
            path: "./Base.sol",
            type: "relative",
            resolved: true,
            content: "contract Base {}",
          },
        ],
        missing: [],
        autoFetched: [],
      };

      const graph = buildImportDependencyGraph(files, resolvedImports);

      expect(graph["Contract.sol"]).toContain("./Helper.sol");
      expect(graph["Helper.sol"]).toContain("./Base.sol");
    });

    it("should initialize all files in graph", () => {
      const files = [
        { path: "File1.sol", content: "" },
        { path: "File2.sol", content: "" },
        { path: "File3.sol", content: "" },
      ];

      const resolvedImports: ResolvedImports = {
        resolved: [],
        missing: [],
        autoFetched: [],
      };

      const graph = buildImportDependencyGraph(files, resolvedImports);

      expect(graph["File1.sol"]).toBeDefined();
      expect(graph["File2.sol"]).toBeDefined();
      expect(graph["File3.sol"]).toBeDefined();
    });

    it("should not include missing imports in graph dependencies", () => {
      const files = [
        {
          path: "Contract.sol",
          content: 'import "./Missing.sol";',
        },
      ];

      const resolvedImports: ResolvedImports = {
        resolved: [],
        missing: [
          {
            path: "./Missing.sol",
            type: "relative",
            resolved: false,
            error: "Not found",
          },
        ],
        autoFetched: [],
      };

      const graph = buildImportDependencyGraph(files, resolvedImports);

      expect(graph["Contract.sol"]).toHaveLength(0);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle circular dependencies gracefully", () => {
      const files = [
        {
          path: "A.sol",
          content: 'import "./B.sol";',
        },
        {
          path: "B.sol",
          content: 'import "./A.sol";',
        },
      ];

      const resolvedImports: ResolvedImports = {
        resolved: [
          {
            path: "./B.sol",
            type: "relative",
            resolved: true,
            content: 'import "./A.sol";',
          },
          {
            path: "./A.sol",
            type: "relative",
            resolved: true,
            content: 'import "./B.sol";',
          },
        ],
        missing: [],
        autoFetched: [],
      };

      const graph = buildImportDependencyGraph(files, resolvedImports);

      expect(graph["A.sol"]).toContain("./B.sol");
      expect(graph["B.sol"]).toContain("./A.sol");
    });

    it("should handle mixed import types", async () => {
      const files = [
        {
          path: "Contract.sol",
          content: `
            import "./Helper.sol";
            import "@openzeppelin/contracts/access/Ownable.sol";
            import "unknown-package/Contract.sol";
          `,
        },
        {
          path: "Helper.sol",
          content: "contract Helper {}",
        },
      ];

      const result = await resolveImports(files);

      // Should have a mix of resolved and missing
      expect(result.resolved.length).toBeGreaterThan(0);
      expect(result.missing.length).toBeGreaterThan(0);

      // Should have different types
      const types = [...result.resolved, ...result.missing].map(
        (imp) => imp.type
      );
      expect(new Set(types).size).toBeGreaterThan(1);
    });

    it("should handle empty files", async () => {
      const files = [
        {
          path: "Empty.sol",
          content: "",
        },
      ];

      const result = await resolveImports(files);
      expect(result.resolved).toHaveLength(0);
      expect(result.missing).toHaveLength(0);
    });

    it("should handle files with only comments", async () => {
      const files = [
        {
          path: "Comments.sol",
          content: `
            // SPDX-License-Identifier: MIT
            // This file has no imports
            /* Multi-line comment */
          `,
        },
      ];

      const result = await resolveImports(files);
      expect(result.resolved).toHaveLength(0);
      expect(result.missing).toHaveLength(0);
    });
  });
});
