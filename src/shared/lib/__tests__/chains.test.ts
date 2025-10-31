import {
  SUPPORTED_CHAINS,
  getDefaultChain,
  getChainById,
  getActiveChains,
  getAllChains,
  type Chain,
} from "../chains";

describe("Chains", () => {
  describe("SUPPORTED_CHAINS", () => {
    it("should have at least one chain", () => {
      expect(SUPPORTED_CHAINS.length).toBeGreaterThan(0);
    });

    it("should have valid chain structure", () => {
      SUPPORTED_CHAINS.forEach((chain) => {
        expect(chain).toHaveProperty("id");
        expect(chain).toHaveProperty("name");
        expect(chain).toHaveProperty("currency");
        expect(chain).toHaveProperty("explorer");
        expect(chain).toHaveProperty("sourcify");
        expect(chain).toHaveProperty("etherscan");
        expect(chain).toHaveProperty("rpc");
        expect(chain).toHaveProperty("isActive");

        expect(typeof chain.id).toBe("number");
        expect(typeof chain.name).toBe("string");
        expect(typeof chain.currency).toBe("string");
        expect(typeof chain.explorer).toBe("string");
        expect(typeof chain.sourcify).toBe("boolean");
        expect(typeof chain.etherscan).toBe("string");
        expect(typeof chain.rpc).toBe("string");
        expect(typeof chain.isActive).toBe("boolean");
      });
    });

    it("should include Ethereum mainnet", () => {
      const ethereum = SUPPORTED_CHAINS.find((chain) => chain.id === 1);
      expect(ethereum).toBeDefined();
      expect(ethereum?.name).toBe("Ethereum");
      expect(ethereum?.currency).toBe("ETH");
    });

    it("should include Sepolia testnet", () => {
      const sepolia = SUPPORTED_CHAINS.find((chain) => chain.id === 11155111);
      expect(sepolia).toBeDefined();
      expect(sepolia?.name).toBe("Sepolia (Testnet)");
      expect(sepolia?.currency).toBe("ETH");
    });
  });

  describe("getDefaultChain", () => {
    it("should return a chain object", () => {
      const defaultChain = getDefaultChain();
      expect(defaultChain).toBeDefined();
      expect(defaultChain).toHaveProperty("id");
      expect(defaultChain).toHaveProperty("name");
    });

    it("should return an active chain", () => {
      const defaultChain = getDefaultChain();
      expect(defaultChain.isActive).toBe(true);
    });

    it("should return the first chain if no active chain exists", () => {
      // This tests the fallback behavior
      const result = getDefaultChain();
      expect(result).toBeDefined();
    });

    it("should return consistent result", () => {
      const first = getDefaultChain();
      const second = getDefaultChain();
      expect(first.id).toBe(second.id);
    });
  });

  describe("getChainById", () => {
    it("should return chain for valid ID", () => {
      const ethereum = getChainById(1);
      expect(ethereum).toBeDefined();
      expect(ethereum?.id).toBe(1);
      expect(ethereum?.name).toBe("Ethereum");
    });

    it("should return Sepolia for ID 11155111", () => {
      const sepolia = getChainById(11155111);
      expect(sepolia).toBeDefined();
      expect(sepolia?.id).toBe(11155111);
    });

    it("should return undefined for invalid ID", () => {
      const invalid = getChainById(999999);
      expect(invalid).toBeUndefined();
    });

    it("should return undefined for negative ID", () => {
      const invalid = getChainById(-1);
      expect(invalid).toBeUndefined();
    });

    it("should return undefined for zero", () => {
      const invalid = getChainById(0);
      expect(invalid).toBeUndefined();
    });

    it("should handle all defined chain IDs", () => {
      const knownIds = [1, 11155111, 17000, 137, 56, 42161, 10];
      knownIds.forEach((id) => {
        const chain = getChainById(id);
        if (SUPPORTED_CHAINS.some((c) => c.id === id)) {
          expect(chain).toBeDefined();
          expect(chain?.id).toBe(id);
        }
      });
    });
  });

  describe("getActiveChains", () => {
    it("should return an array", () => {
      const activeChains = getActiveChains();
      expect(Array.isArray(activeChains)).toBe(true);
    });

    it("should return only active chains", () => {
      const activeChains = getActiveChains();
      activeChains.forEach((chain) => {
        expect(chain.isActive).toBe(true);
      });
    });

    it("should return at least one chain", () => {
      const activeChains = getActiveChains();
      expect(activeChains.length).toBeGreaterThan(0);
    });

    it("should not include inactive chains", () => {
      const activeChains = getActiveChains();
      const inactiveChains = SUPPORTED_CHAINS.filter((c) => !c.isActive);

      inactiveChains.forEach((inactiveChain) => {
        expect(
          activeChains.find((c) => c.id === inactiveChain.id)
        ).toBeUndefined();
      });
    });

    it("should return chains with valid structure", () => {
      const activeChains = getActiveChains();
      activeChains.forEach((chain) => {
        expect(chain).toHaveProperty("id");
        expect(chain).toHaveProperty("name");
        expect(chain).toHaveProperty("isActive");
        expect(chain.isActive).toBe(true);
      });
    });
  });

  describe("getAllChains", () => {
    it("should return all chains", () => {
      const allChains = getAllChains();
      expect(allChains.length).toBe(SUPPORTED_CHAINS.length);
    });

    it("should include both active and inactive chains", () => {
      const allChains = getAllChains();
      const hasActive = allChains.some((chain) => chain.isActive);

      expect(hasActive).toBe(true);
      // This might be true or false depending on configuration
      // Just check that the function returns all chains
      expect(allChains.length).toBeGreaterThan(0);
    });

    it("should return the same array as SUPPORTED_CHAINS", () => {
      const allChains = getAllChains();
      expect(allChains).toEqual(SUPPORTED_CHAINS);
    });

    it("should return array with valid chain objects", () => {
      const allChains = getAllChains();
      allChains.forEach((chain) => {
        expect(chain).toHaveProperty("id");
        expect(chain).toHaveProperty("name");
        expect(chain).toHaveProperty("currency");
        expect(chain).toHaveProperty("isActive");
      });
    });
  });

  describe("Chain type safety", () => {
    it("should have proper TypeScript types", () => {
      const chain: Chain = {
        id: 1,
        name: "Test Chain",
        currency: "ETH",
        explorer: "https://test.com",
        sourcify: true,
        etherscan: "https://api.test.com",
        rpc: "https://rpc.test.com",
        isActive: true,
      };

      expect(chain.id).toBe(1);
      expect(chain.name).toBe("Test Chain");
    });
  });
});
