import {
  fetchFromSourcify,
  fetchFromEtherscan,
  resolveContractSource,
} from "../contractSource";

// Mock getChainById
jest.mock("../../chains", () => ({
  getChainById: jest.fn((chainId: number) => {
    if (chainId === 1) return { id: 1, name: "Ethereum" };
    if (chainId === 137) return { id: 137, name: "Polygon" };
    return null;
  }),
}));

describe("Contract Source Fetchers", () => {
  const testAddress = "0x1234567890123456789012345678901234567890";
  const testChainId = 1;

  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete (global as { fetch?: typeof fetch }).fetch;
  });

  describe("fetchFromSourcify", () => {
    it("should fetch verified contract from Sourcify", async () => {
      const mockSourcifyResponse = {
        match: "full",
        sources: {
          "contracts/Token.sol": "pragma solidity ^0.8.0; contract Token {}",
          "contracts/interfaces/IToken.sol": "interface IToken {}",
        },
        compilation: {
          name: "Token",
          compilerVersion: "0.8.19",
        },
        abi: [
          {
            type: "function",
            name: "transfer",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSourcifyResponse,
      } as Response);

      const result = await fetchFromSourcify(testChainId, testAddress);

      expect(result).not.toBeNull();
      expect(result?.verified).toBe(true);
      expect(result?.chainId).toBe(testChainId);
      expect(result?.contractName).toBe("Token");
      expect(result?.compilerVersion).toBe("0.8.19");
      expect(result?.files).toHaveLength(2);
      expect(result?.files[0].path).toBe("contracts/Token.sol");
      expect(result?.abi).toHaveLength(1);
    });

    it("should return null for unverified contract", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ match: null }),
      } as Response);

      const result = await fetchFromSourcify(testChainId, testAddress);

      expect(result).toBeNull();
    });

    it("should return null for 404 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ match: null }),
      } as Response);

      const result = await fetchFromSourcify(testChainId, testAddress);

      expect(result).toBeNull();
    });

    it("should handle timeout error", async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.reject(new Error("AbortError"))
      );

      const result = await fetchFromSourcify(testChainId, testAddress);

      expect(result).toBeNull();
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await fetchFromSourcify(testChainId, testAddress);

      expect(result).toBeNull();
    });

    it("should handle invalid JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      const result = await fetchFromSourcify(testChainId, testAddress);

      expect(result).toBeNull();
    });

    it("should return null when no source files found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          match: "full",
          sources: {},
          compilation: {},
          abi: [],
        }),
      } as Response);

      const result = await fetchFromSourcify(testChainId, testAddress);

      expect(result).toBeNull();
    });

    it("should use lowercase address in API call", async () => {
      const uppercaseAddress = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ match: null }),
      } as Response);

      await fetchFromSourcify(testChainId, uppercaseAddress);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(uppercaseAddress.toLowerCase()),
        expect.anything()
      );
    });

    it("should call correct Sourcify API v2 URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ match: null }),
      } as Response);

      await fetchFromSourcify(testChainId, testAddress);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://sourcify.dev/server/v2/contract/${testChainId}/${testAddress}?fields=sources,abi,compilation`,
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          headers: { Accept: "application/json" },
        })
      );
    });
  });

  describe("fetchFromEtherscan", () => {
    const apiKey = "test-api-key";

    it("should fetch verified single-file contract from Etherscan", async () => {
      const mockEtherscanResponse = {
        status: "1",
        message: "OK",
        result: [
          {
            SourceCode: "pragma solidity ^0.8.0; contract Token {}",
            ABI: JSON.stringify([
              { type: "function", name: "transfer", inputs: [] },
            ]),
            ContractName: "Token",
            CompilerVersion: "v0.8.19+commit.7dd6d404",
            OptimizationUsed: "1",
            Runs: "200",
            ConstructorArguments: "",
            EVMVersion: "Default",
            Library: "",
            LicenseType: "MIT",
            Proxy: "0",
            Implementation: "",
            SwarmSource: "",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockEtherscanResponse,
      } as Response);

      const result = await fetchFromEtherscan(testChainId, testAddress, apiKey);

      expect(result).not.toBeNull();
      expect(result?.verified).toBe(true);
      expect(result?.contractName).toBe("Token");
      expect(result?.compilerVersion).toBe("v0.8.19+commit.7dd6d404");
      expect(result?.files).toHaveLength(1);
      expect(result?.files[0].path).toBe("Token.sol");
      expect(result?.abi).toBeDefined();
    });

    it("should fetch verified multi-file contract from Etherscan", async () => {
      const multiFileSource = JSON.stringify({
        sources: {
          "contracts/Token.sol": {
            content: "pragma solidity ^0.8.0; contract Token {}",
          },
          "contracts/Ownable.sol": {
            content: "contract Ownable {}",
          },
        },
      });

      const mockEtherscanResponse = {
        status: "1",
        message: "OK",
        result: [
          {
            SourceCode: multiFileSource,
            ABI: "[]",
            ContractName: "Token",
            CompilerVersion: "v0.8.19",
            OptimizationUsed: "1",
            Runs: "200",
            ConstructorArguments: "",
            EVMVersion: "Default",
            Library: "",
            LicenseType: "MIT",
            Proxy: "0",
            Implementation: "",
            SwarmSource: "",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockEtherscanResponse,
      } as Response);

      const result = await fetchFromEtherscan(testChainId, testAddress, apiKey);

      expect(result).not.toBeNull();
      expect(result?.files).toHaveLength(2);
      expect(result?.files[0].path).toBe("contracts/Token.sol");
      expect(result?.files[1].path).toBe("contracts/Ownable.sol");
    });

    it("should return null for unverified contract", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "0",
          message: "NOTOK",
          result: [],
        }),
      } as Response);

      const result = await fetchFromEtherscan(testChainId, testAddress, apiKey);

      expect(result).toBeNull();
    });

    it("should return null when SourceCode is empty", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "1",
          message: "OK",
          result: [{ SourceCode: "" }],
        }),
      } as Response);

      const result = await fetchFromEtherscan(testChainId, testAddress, apiKey);

      expect(result).toBeNull();
    });

    it("should return null for invalid chain ID", async () => {
      const result = await fetchFromEtherscan(999, testAddress, apiKey);

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle timeout error", async () => {
      mockFetch.mockImplementationOnce(() => {
        const error = new Error("Timeout");
        error.name = "AbortError";
        return Promise.reject(error);
      });

      const result = await fetchFromEtherscan(testChainId, testAddress, apiKey);

      expect(result).toBeNull();
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await fetchFromEtherscan(testChainId, testAddress, apiKey);

      expect(result).toBeNull();
    });

    it("should handle non-OK response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await fetchFromEtherscan(testChainId, testAddress, apiKey);

      expect(result).toBeNull();
    });

    it("should handle malformed multi-file JSON", async () => {
      // SourceCode starts with { and includes "sources" but is malformed JSON
      // Current behavior: logs warning and returns empty files array (potential bug)
      const invalidMultiFile = '{"sources": not valid json}';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "1",
          message: "OK",
          result: [
            {
              SourceCode: invalidMultiFile,
              ABI: "[]",
              ContractName: "Token",
              CompilerVersion: "v0.8.19",
              OptimizationUsed: "1",
              Runs: "200",
              ConstructorArguments: "",
              EVMVersion: "Default",
              Library: "",
              LicenseType: "MIT",
              Proxy: "0",
              Implementation: "",
              SwarmSource: "",
            },
          ],
        }),
      } as Response);

      const result = await fetchFromEtherscan(testChainId, testAddress, apiKey);

      // Current behavior: parsing fails, logs warning, returns empty files array
      expect(result).not.toBeNull();
      expect(result?.files).toHaveLength(0); // Bug: should fallback to single file
      expect(result?.contractName).toBe("Token");
    });

    it("should call correct Etherscan API URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "0", result: [] }),
      } as Response);

      await fetchFromEtherscan(testChainId, testAddress, apiKey);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.etherscan.io/v2/api?chainid=${testChainId}&module=contract&action=getsourcecode&address=${testAddress}&apikey=${apiKey}`,
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          headers: { Accept: "application/json" },
        })
      );
    });
  });

  describe("resolveContractSource", () => {
    const apiKey = "test-api-key";

    it("should return Sourcify result when available", async () => {
      const mockSourcifyData = {
        match: "full",
        sources: { "Token.sol": "contract Token {}" },
        compilation: { name: "Token" },
        abi: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSourcifyData,
      } as Response);

      const result = await resolveContractSource(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.verified).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("sourcify.dev"),
        expect.anything()
      );
    });

    it("should fallback to Etherscan when Sourcify fails", async () => {
      // Sourcify fails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ match: null }),
      } as Response);

      // Etherscan succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "1",
          result: [
            {
              SourceCode: "contract Token {}",
              ABI: "[]",
              ContractName: "Token",
              CompilerVersion: "v0.8.19",
            },
          ],
        }),
      } as Response);

      const result = await resolveContractSource(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.verified).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should return null when both Sourcify and Etherscan fail", async () => {
      // Sourcify fails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ match: null }),
      } as Response);

      // Etherscan fails
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "0",
          result: [],
        }),
      } as Response);

      const result = await resolveContractSource(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).toBeNull();
    });

    it("should skip Etherscan when no API key provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ match: null }),
      } as Response);

      const result = await resolveContractSource(testChainId, testAddress);

      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("sourcify.dev"),
        expect.anything()
      );
    });

    it("should not call Etherscan when Sourcify succeeds", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          match: "full",
          sources: { "Token.sol": "contract Token {}" },
          compilation: { name: "Token" },
          abi: [],
        }),
      } as Response);

      await resolveContractSource(testChainId, testAddress, apiKey);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle Sourcify network error and fallback to Etherscan", async () => {
      // Sourcify fails with network error
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      // Etherscan succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "1",
          result: [
            {
              SourceCode: "contract Token {}",
              ABI: "[]",
              ContractName: "Token",
              CompilerVersion: "v0.8.19",
            },
          ],
        }),
      } as Response);

      const result = await resolveContractSource(
        testChainId,
        testAddress,
        apiKey
      );

      expect(result).not.toBeNull();
      expect(result?.verified).toBe(true);
    });
  });
});

