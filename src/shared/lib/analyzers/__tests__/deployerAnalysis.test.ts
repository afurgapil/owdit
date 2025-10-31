import {
  getContractCreationTransaction,
  getDeployerTransactions,
  analyzeDeployerWallet,
} from "../deployerAnalysis";

// Mock getChainById
jest.mock("../../chains", () => ({
  getChainById: jest.fn((chainId: number) => {
    if (chainId === 1) return { id: 1, name: "Ethereum" };
    if (chainId === 137) return { id: 137, name: "Polygon" };
    return null;
  }),
}));

// Mock logger
jest.mock("../../logger", () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("Deployer Analysis", () => {
  const testAddress = "0x1234567890123456789012345678901234567890";
  const testChainId = 1;
  const apiKey = "test-api-key";

  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete (global as { fetch?: typeof fetch }).fetch;
  });

  describe("getContractCreationTransaction", () => {
    it("should fetch contract creation transaction", async () => {
      const mockResponse = {
        status: "1",
        result: [
          {
            contractAddress: testAddress,
            contractCreator: "0xdeployer1234567890",
            txHash: "0xtxhash",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await getContractCreationTransaction(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.contractAddress).toBe(testAddress);
      expect(result?.contractCreator).toBe("0xdeployer1234567890");
    });

    it("should return null for invalid chain", async () => {
      const result = await getContractCreationTransaction(
        999,
        testAddress,
        apiKey
      );

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return null when API returns no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "1", result: [] }),
      } as Response);

      const result = await getContractCreationTransaction(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toBeNull();
    });

    it("should handle API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await getContractCreationTransaction(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toBeNull();
    });
  });

  describe("getDeployerTransactions", () => {
    it("should fetch deployer transactions", async () => {
      const mockTxs = [
        {
          hash: "0xtx1",
          from: "0xdeployer",
          to: "0xcontract1",
          isError: "0",
          timeStamp: "1234567890",
        },
        {
          hash: "0xtx2",
          from: "0xdeployer",
          to: "0xcontract2",
          isError: "0",
          timeStamp: "1234567891",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "1", result: mockTxs }),
      } as Response);

      const result = await getDeployerTransactions(
        testChainId,
        "0xdeployer",
        apiKey
      );

      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe("0xtx1");
    });

    it("should return empty array for invalid chain", async () => {
      const result = await getDeployerTransactions(999, "0xdeployer", apiKey);

      expect(result).toEqual([]);
    });

    it("should handle API error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await getDeployerTransactions(
        testChainId,
        "0xdeployer",
        apiKey
      );

      expect(result).toEqual([]);
    });
  });

  describe("analyzeDeployerWallet", () => {
    it("should analyze trusted deployer", async () => {
      // Mock creation transaction
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "1",
          result: [{ contractCreator: "0xdeployer", txHash: "0xtx" }],
        }),
      } as Response);

      // Mock deployer transactions (many successful)
      const successfulTxs = Array.from({ length: 50 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: "0xdeployer",
        to: `0xcontract${i}`,
        isError: "0",
        txreceipt_status: "1",
        timeStamp: `${1234567890 + i}`,
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "1", result: successfulTxs }),
      } as Response);

      // Mock contract creations - fetch returns ALL transactions, function filters for contract creations
      const allTxsForContractCreations = [
        ...Array.from({ length: 10 }, (_, i) => ({
          hash: `0xcontractcreation${i}`,
          from: "0xdeployer",
          to: "", // Empty 'to' means contract creation
          contractAddress: `0xcontract${i}`,
          isError: "0",
          txreceipt_status: "1",
          timeStamp: `${1234567890 + i * 86400}`, // One per day
          value: "0",
          gas: "3000000",
          gasPrice: "1000000000",
          methodId: "",
          functionName: "",
          blockNumber: `${1000000 + i}`,
          gasUsed: "2000000",
        })),
        // Add some regular transactions (non-contract creations)
        ...Array.from({ length: 5 }, (_, i) => ({
          hash: `0xregulartx${i}`,
          from: "0xdeployer",
          to: `0xsomeaddress${i}`, // Has 'to' address, not a contract creation
          isError: "0",
          txreceipt_status: "1",
          timeStamp: `${1234567890 + i * 86400}`,
          value: "1000000000000000000",
          gas: "21000",
          gasPrice: "1000000000",
          methodId: "0xa9059cbb",
          functionName: "transfer",
          blockNumber: `${1000000 + i}`,
          gasUsed: "21000",
        })),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "1", result: allTxsForContractCreations }),
      } as Response);

      const result = await analyzeDeployerWallet(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.address).toBe("0xdeployer");
      expect(result?.riskLevel).toBe("low");
      expect(result?.contractCount).toBeGreaterThan(0);
    });

    it("should detect suspicious deployer", async () => {
      // Mock creation transaction
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "1",
          result: [{ contractCreator: "0xbaddeployer", txHash: "0xtx" }],
        }),
      } as Response);

      // Mock deployer transactions (many failed)
      const failedTxs = Array.from({ length: 20 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: "0xbaddeployer",
        to: `0xcontract${i}`,
        isError: i % 2 === 0 ? "1" : "0", // 50% failure rate
        txreceipt_status: i % 2 === 0 ? "0" : "1",
        timeStamp: `${1234567890 + i}`,
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "1", result: failedTxs }),
      } as Response);

      // Mock contract creations - with high failure rate
      const allTxsForContractCreations = [
        ...Array.from({ length: 10 }, (_, i) => ({
          hash: `0xcontractcreation${i}`,
          from: "0xbaddeployer",
          to: "", // Empty 'to' means contract creation
          contractAddress: `0xcontract${i}`,
          isError: i % 2 === 0 ? "1" : "0", // 50% failure rate
          txreceipt_status: i % 2 === 0 ? "0" : "1",
          timeStamp: `${1234567890 + i * 86400}`,
          value: "0",
          gas: "3000000",
          gasPrice: "1000000000",
          methodId: "",
          functionName: "",
          blockNumber: `${1000000 + i}`,
          gasUsed: "2000000",
        })),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "1", result: allTxsForContractCreations }),
      } as Response);

      const result = await analyzeDeployerWallet(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.riskLevel).not.toBe("low");
      expect(result?.riskIndicators).toContain("High contract failure rate");
    });

    it("should handle new deployer", async () => {
      // Mock creation transaction
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "1",
          result: [{ contractCreator: "0xnewdeployer", txHash: "0xtx" }],
        }),
      } as Response);

      // Mock deployer transactions (very few)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "1",
          result: [
            {
              hash: "0xtx1",
              from: "0xnewdeployer",
              to: testAddress,
              isError: "0",
              txreceipt_status: "1",
              timeStamp: "1234567890",
            },
          ],
        }),
      } as Response);

      // Mock contract creations (very recent, within 30 days)
      const recentTimestamp = Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60; // 15 days ago
      const allTxsForContractCreations = [
        {
          hash: "0xcontractcreation1",
          from: "0xnewdeployer",
          to: "", // Empty 'to' means contract creation
          contractAddress: testAddress,
          isError: "0",
          txreceipt_status: "1",
          timeStamp: `${recentTimestamp}`,
          value: "0",
          gas: "3000000",
          gasPrice: "1000000000",
          methodId: "",
          functionName: "",
          blockNumber: "1000000",
          gasUsed: "2000000",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "1", result: allTxsForContractCreations }),
      } as Response);

      const result = await analyzeDeployerWallet(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.riskIndicators).toContain(
        "New deployer wallet (less than 30 days)"
      );
    });

    it("should return null when creation transaction not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "1", result: [] }),
      } as Response);

      const result = await analyzeDeployerWallet(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toBeNull();
    });
  });
});
