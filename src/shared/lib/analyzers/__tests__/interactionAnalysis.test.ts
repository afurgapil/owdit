import {
  getContractTransactions,
  getContractInternalTransactions,
  analyzeContractInteractions,
} from "../interactionAnalysis";

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

describe("Interaction Analysis", () => {
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

  describe("getContractTransactions", () => {
    it("should fetch contract transactions successfully", async () => {
      const mockTxs = [
        {
          hash: "0xtx1",
          from: "0xuser1",
          to: testAddress,
          value: "1000000000000000000",
          timeStamp: "1234567890",
          isError: "0",
          functionName: "transfer",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: mockTxs }),
      });

      const result = await getContractTransactions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toHaveLength(1);
      expect(result[0].hash).toBe("0xtx1");
    });

    it("should return empty array for invalid chain", async () => {
      const result = await getContractTransactions(999, testAddress, apiKey);
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return empty array on API error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await getContractTransactions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toEqual([]);
    });

    it("should return empty array when no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "0", result: [] }),
      });

      const result = await getContractTransactions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toEqual([]);
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await getContractTransactions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toEqual([]);
    });
  });

  describe("getContractInternalTransactions", () => {
    it("should fetch internal transactions successfully", async () => {
      const mockInternalTxs = [
        {
          hash: "0xinternal1",
          from: testAddress,
          to: "0xother",
          value: "500000000000000000",
          timeStamp: "1234567890",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: mockInternalTxs }),
      });

      const result = await getContractInternalTransactions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toHaveLength(1);
    });

    it("should return empty array for invalid chain", async () => {
      const result = await getContractInternalTransactions(
        999,
        testAddress,
        apiKey
      );
      expect(result).toEqual([]);
    });

    it("should handle errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("API error"));

      const result = await getContractInternalTransactions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toEqual([]);
    });
  });

  describe("analyzeContractInteractions - Activity Level", () => {
    it("should classify low activity", async () => {
      const lowActivityTxs = Array.from({ length: 5 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: `0xuser${i}`,
        to: testAddress,
        value: "0",
        timeStamp: `${Date.now() / 1000 - 86400 * 100}`, // 100 days ago
        isError: "0",
        functionName: "call",
        gas: "21000",
        gasPrice: "1000000000",
        txreceipt_status: "1",
        methodId: "0x",
        gasUsed: "21000",
        blockNumber: "1000000",
      }));

      // Mock transactions call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: lowActivityTxs }),
      });

      // Mock internal transactions call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.activityLevel).toBe("low");
    });

    it("should classify medium activity", async () => {
      const mediumActivityTxs = Array.from({ length: 150 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: `0xuser${i % 50}`,
        to: testAddress,
        value: "0",
        timeStamp: `${Date.now() / 1000 - 86400 * 30}`,
        isError: "0",
        functionName: "call",
        gas: "21000",
        gasPrice: "1000000000",
        txreceipt_status: "1",
        methodId: "0x",
        gasUsed: "21000",
        blockNumber: "1000000",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: mediumActivityTxs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.activityLevel).toBe("medium");
    });

    it("should classify high activity", async () => {
      const highActivityTxs = Array.from({ length: 1000 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: `0xuser${i % 100}`,
        to: testAddress,
        value: "0",
        timeStamp: `${Date.now() / 1000 - 86400 * 30}`,
        isError: "0",
        functionName: "call",
        gas: "21000",
        gasPrice: "1000000000",
        txreceipt_status: "1",
        methodId: "0x",
        gasUsed: "21000",
        blockNumber: "1000000",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: highActivityTxs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.activityLevel).toBe("high");
    });
  });

  describe("analyzeContractInteractions - User Diversity", () => {
    it("should calculate unique users correctly", async () => {
      const txs = [
        {
          hash: "0xtx1",
          from: "0xuser1",
          to: testAddress,
          value: "0",
          timeStamp: `${Date.now() / 1000}`,
          isError: "0",
          functionName: "call",
          gas: "21000",
          gasPrice: "1000000000",
          txreceipt_status: "1",
          methodId: "0x",
          gasUsed: "21000",
          blockNumber: "1000000",
        },
        {
          hash: "0xtx2",
          from: "0xuser1",
          to: testAddress,
          value: "0",
          timeStamp: `${Date.now() / 1000}`,
          isError: "0",
          functionName: "call",
          gas: "21000",
          gasPrice: "1000000000",
          txreceipt_status: "1",
          methodId: "0x",
          gasUsed: "21000",
          blockNumber: "1000000",
        },
        {
          hash: "0xtx3",
          from: "0xuser2",
          to: testAddress,
          value: "0",
          timeStamp: `${Date.now() / 1000}`,
          isError: "0",
          functionName: "call",
          gas: "21000",
          gasPrice: "1000000000",
          txreceipt_status: "1",
          methodId: "0x",
          gasUsed: "21000",
          blockNumber: "1000000",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: txs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.uniqueUsers).toBe(2);
    });

    it("should calculate user retention rate", async () => {
      const txs = Array.from({ length: 10 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: i < 5 ? "0xuser1" : `0xuser${i}`, // user1 makes 5 txs, others make 1 each
        to: testAddress,
        value: "0",
        timeStamp: `${Date.now() / 1000}`,
        isError: "0",
        functionName: "call",
        gas: "21000",
        gasPrice: "1000000000",
        txreceipt_status: "1",
        methodId: "0x",
        gasUsed: "21000",
        blockNumber: "1000000",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: txs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.userRetentionRate).toBeGreaterThan(0);
      // Only user1 returned (1 out of 6 unique users)
      expect(result?.userRetentionRate).toBeCloseTo(1 / 6, 2);
    });
  });

  describe("analyzeContractInteractions - Risk Indicators", () => {
    it("should detect very low transaction activity", async () => {
      const txs = [
        {
          hash: "0xtx1",
          from: "0xuser1",
          to: testAddress,
          value: "0",
          timeStamp: `${Date.now() / 1000}`,
          isError: "0",
          functionName: "call",
          gas: "21000",
          gasPrice: "1000000000",
          txreceipt_status: "1",
          methodId: "0x",
          gasUsed: "21000",
          blockNumber: "1000000",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: txs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.riskIndicators).toContain("Very low transaction activity");
    });

    it("should detect low user diversity", async () => {
      const txs = Array.from({ length: 20 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: "0xuser1", // Same user for all transactions
        to: testAddress,
        value: "0",
        timeStamp: `${Date.now() / 1000}`,
        isError: "0",
        functionName: "call",
        gas: "21000",
        gasPrice: "1000000000",
        txreceipt_status: "1",
        methodId: "0x",
        gasUsed: "21000",
        blockNumber: "1000000",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: txs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.riskIndicators).toContain(
        "Low user diversity (potential bot activity)"
      );
    });

    it("should detect airdrop farming pattern", async () => {
      const txs = Array.from({ length: 150 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: `0xuser${i}`, // Each unique user makes only 1 tx
        to: testAddress,
        value: "0",
        timeStamp: `${Date.now() / 1000}`,
        isError: "0",
        functionName: "claim",
        gas: "21000",
        gasPrice: "1000000000",
        txreceipt_status: "1",
        methodId: "0x",
        gasUsed: "21000",
        blockNumber: "1000000",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: txs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.riskIndicators).toContain(
        "High user count with low retention (potential airdrop farming)"
      );
    });

    it("should detect high error rate", async () => {
      const txs = Array.from({ length: 20 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: `0xuser${i}`,
        to: testAddress,
        value: "0",
        timeStamp: `${Date.now() / 1000}`,
        isError: i < 11 ? "1" : "0", // 55% error rate (> 0.5 threshold)
        functionName: "call",
        gas: "21000",
        gasPrice: "1000000000",
        txreceipt_status: i < 11 ? "0" : "1",
        methodId: "0x",
        gasUsed: "21000",
        blockNumber: "1000000",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: txs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(
        result?.riskIndicators.some((r) => r.includes("High error rate"))
      ).toBe(true);
    });

    it("should detect excessive function usage", async () => {
      const txs = Array.from({ length: 100 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: `0xuser${i}`,
        to: testAddress,
        value: "0",
        timeStamp: `${Date.now() / 1000}`,
        isError: "0",
        functionName: "suspiciousFunction",
        gas: "21000",
        gasPrice: "1000000000",
        txreceipt_status: "1",
        methodId: "0x12345678",
        gasUsed: "21000",
        blockNumber: "1000000",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: txs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(
        result?.riskIndicators.some((r) =>
          r.includes("Excessive use of function")
        )
      ).toBe(true);
    });
  });

  describe("analyzeContractInteractions - Risk Level", () => {
    it("should return low risk for healthy contract", async () => {
      const healthyTxs = Array.from({ length: 100 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: `0xuser${i % 20}`, // 20 unique users with repeat usage
        to: testAddress,
        value: "0",
        timeStamp: `${Date.now() / 1000 - 86400 * 30}`,
        isError: "0",
        functionName: i % 3 === 0 ? "transfer" : "approve",
        gas: "21000",
        gasPrice: "1000000000",
        txreceipt_status: "1",
        methodId: "0x",
        gasUsed: "21000",
        blockNumber: "1000000",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: healthyTxs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.riskLevel).toBe("low");
    });

    it("should return medium risk for some issues", async () => {
      const txs = Array.from({ length: 50 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: `0xuser${i}`, // Low retention (everyone only once)
        to: testAddress,
        value: "0",
        timeStamp: `${Date.now() / 1000}`,
        isError: "0",
        functionName: "call",
        gas: "21000",
        gasPrice: "1000000000",
        txreceipt_status: "1",
        methodId: "0x",
        gasUsed: "21000",
        blockNumber: "1000000",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: txs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.riskLevel).toBe("medium");
    });

    it("should return high risk for multiple issues", async () => {
      const txs = [
        {
          hash: "0xtx1",
          from: "0xuser1",
          to: testAddress,
          value: "0",
          timeStamp: `${Date.now() / 1000}`,
          isError: "1",
          functionName: "call",
          gas: "21000",
          gasPrice: "1000000000",
          txreceipt_status: "0",
          methodId: "0x",
          gasUsed: "21000",
          blockNumber: "1000000",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: txs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.riskLevel).toBe("high");
    });
  });

  describe("analyzeContractInteractions - Metrics", () => {
    it("should calculate transaction volume correctly", async () => {
      const txs = [
        {
          hash: "0xtx1",
          from: "0xuser1",
          to: testAddress,
          value: "1000000000000000000", // 1 ETH
          timeStamp: `${Date.now() / 1000}`,
          isError: "0",
          functionName: "call",
          gas: "21000",
          gasPrice: "1000000000",
          txreceipt_status: "1",
          methodId: "0x",
          gasUsed: "21000",
          blockNumber: "1000000",
        },
        {
          hash: "0xtx2",
          from: "0xuser2",
          to: testAddress,
          value: "2000000000000000000", // 2 ETH
          timeStamp: `${Date.now() / 1000}`,
          isError: "0",
          functionName: "call",
          gas: "21000",
          gasPrice: "1000000000",
          txreceipt_status: "1",
          methodId: "0x",
          gasUsed: "21000",
          blockNumber: "1000000",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: txs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.transactionVolume).toBeCloseTo(3, 1); // 3 ETH total
    });

    it("should return null when no transactions found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toBeNull();
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toBeNull();
    });

    it("should include peak activity period", async () => {
      const txs = Array.from({ length: 10 }, (_, i) => ({
        hash: `0xtx${i}`,
        from: `0xuser${i}`,
        to: testAddress,
        value: "0",
        timeStamp: `${Date.now() / 1000 - i * 3600}`, // Transactions at different hours
        isError: "0",
        functionName: "call",
        gas: "21000",
        gasPrice: "1000000000",
        txreceipt_status: "1",
        methodId: "0x",
        gasUsed: "21000",
        blockNumber: "1000000",
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: txs }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "1", result: [] }),
      });

      const result = await analyzeContractInteractions(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.peakActivityPeriod).toMatch(/\d+:\d+-\d+:\d+/);
    });
  });
});
