import React, { ReactNode } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useContractSearch } from "../useContractSearch";
import { NetworkProvider } from "../../../../shared/contexts/NetworkContext";
import {
  setupMockFetch,
  restoreFetch,
} from "../../../../../__mocks__/mockUtils";

// Wrapper component with NetworkProvider
const wrapper = ({ children }: { children: ReactNode }) => (
  <NetworkProvider>{children}</NetworkProvider>
);

describe("useContractSearch", () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    // Setup fetch mock
    mockFetch = setupMockFetch();
    // Clear console mocks
    jest.spyOn(console, "log").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
    jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    restoreFetch();
    jest.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("should have empty address initially", () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });
      expect(result.current.address).toBe("");
    });

    it("should not be loading initially", () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });
      expect(result.current.isLoading).toBe(false);
    });

    it("should have no error initially", () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });
      expect(result.current.error).toBeNull();
    });

    it("should have no result initially", () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });
      expect(result.current.result).toBeNull();
    });

    it("should have all expected methods", () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });
      expect(typeof result.current.setAddress).toBe("function");
      expect(typeof result.current.searchContract).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
    });
  });

  describe("setAddress", () => {
    it("should update address", () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("0x1234567890abcdef1234567890abcdef12345678");
      });

      expect(result.current.address).toBe(
        "0x1234567890abcdef1234567890abcdef12345678"
      );
    });

    it("should allow updating address multiple times", () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("0xabc");
      });
      expect(result.current.address).toBe("0xabc");

      act(() => {
        result.current.setAddress("0xdef");
      });
      expect(result.current.address).toBe("0xdef");
    });
  });

  describe("clearError", () => {
    it("should clear error message", () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });

      // Trigger an error first
      act(() => {
        result.current.setAddress("");
        result.current.searchContract();
      });

      expect(result.current.error).not.toBeNull();

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("searchContract - Validation", () => {
    it("should show error for empty address", async () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });

      await act(async () => {
        await result.current.searchContract();
      });

      expect(result.current.error).toBe("Please enter a contract address");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should show error for whitespace only address", async () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("   ");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      expect(result.current.error).toBe("Please enter a contract address");
    });

    it("should show error for invalid address format", async () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("invalid-address");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      expect(result.current.error).toContain("valid Ethereum address");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should show error for address without 0x prefix", async () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("1234567890abcdef1234567890abcdef12345678");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      expect(result.current.error).toContain("valid Ethereum address");
    });

    it("should show error for too short address", async () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("0x1234");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      expect(result.current.error).toContain("valid Ethereum address");
    });
  });

  describe("searchContract - Successful API Call", () => {
    it("should fetch contract data successfully", async () => {
      const mockData = {
        address: "0x1234567890abcdef1234567890abcdef12345678",
        chainId: 1,
        verified: true,
        compilerVersion: "0.8.19",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: mockData }),
      });

      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("0x1234567890abcdef1234567890abcdef12345678");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      await waitFor(() => {
        expect(result.current.result).toEqual(mockData);
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should call API with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("0x1234567890abcdef1234567890abcdef12345678");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/contract-analysis/contract-source")
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(
            "address=0x1234567890abcdef1234567890abcdef12345678"
          )
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("chainId=1")
        );
      });
    });

    it("should set loading state during fetch", async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("0x1234567890abcdef1234567890abcdef12345678");
      });

      act(() => {
        result.current.searchContract();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: {} }),
        });
        await promise;
      });

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
    });

    it("should clear previous results before new search", async () => {
      // First search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { id: 1 } }),
      });

      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("0x1234567890abcdef1234567890abcdef12345678");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      expect(result.current.result).toEqual({ id: 1 });

      // Second search - mock should return different data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { id: 2 } }),
      });

      act(() => {
        result.current.setAddress("0xabcdef1234567890abcdef1234567890abcdef12");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      await waitFor(() => {
        expect(result.current.result).toEqual({ id: 2 });
      });
    });
  });

  describe("searchContract - API Errors", () => {
    it("should handle API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ success: false, error: "Contract not found" }),
      });

      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("0x1234567890abcdef1234567890abcdef12345678");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Contract not found");
        expect(result.current.result).toBeNull();
      });
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("0x1234567890abcdef1234567890abcdef12345678");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(
          "Network error occurred. Please try again."
        );
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle fetch timeout", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Timeout"));

      const { result } = renderHook(() => useContractSearch(), { wrapper });

      act(() => {
        result.current.setAddress("0x1234567890abcdef1234567890abcdef12345678");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      await waitFor(() => {
        expect(result.current.error).toContain("Network error");
      });
    });
  });

  describe("State Management", () => {
    it("should reset error on successful search", async () => {
      const { result } = renderHook(() => useContractSearch(), { wrapper });

      // First cause an error
      await act(async () => {
        await result.current.searchContract();
      });
      expect(result.current.error).not.toBeNull();

      // Then make a successful search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      act(() => {
        result.current.setAddress("0x1234567890abcdef1234567890abcdef12345678");
      });

      await act(async () => {
        await result.current.searchContract();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it("should maintain address when search fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: false, error: "Not found" }),
      });

      const { result } = renderHook(() => useContractSearch(), { wrapper });
      const testAddress = "0x1234567890abcdef1234567890abcdef12345678";

      act(() => {
        result.current.setAddress(testAddress);
      });

      await act(async () => {
        await result.current.searchContract();
      });

      await waitFor(() => {
        expect(result.current.address).toBe(testAddress);
      });
    });
  });
});
