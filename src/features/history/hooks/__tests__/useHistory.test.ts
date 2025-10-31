import { renderHook, act, waitFor } from "@testing-library/react";
import { useHistory, ITEMS_PER_PAGE } from "../useHistory";
import {
  setupMockFetch,
  restoreFetch,
} from "../../../../../__mocks__/mockUtils";

describe("useHistory", () => {
  let mockFetch: jest.Mock;

  const mockHistoryData = {
    success: true,
    data: {
      history: [
        {
          address: "0x1234567890abcdef1234567890abcdef12345678",
          chainId: 1,
          score: 85,
          level: "low" as const,
          timestamp: "2024-01-15T10:00:00Z",
          contractName: "TestToken",
          compilerVersion: "0.8.19",
          status: "completed",
          findings: [],
        },
      ],
      pagination: {
        total: 1,
        limit: ITEMS_PER_PAGE,
        offset: 0,
        hasMore: false,
      },
      stats: {
        totalCached: 1,
        upgradeableCached: 0,
        expiredCached: 0,
      },
    },
  };

  beforeEach(() => {
    mockFetch = setupMockFetch({
      ok: true,
      data: mockHistoryData.data,
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    restoreFetch();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("Initial State and Auto-fetch", () => {
    it("should fetch history on mount", async () => {
      const { result } = renderHook(() => useHistory());

      // Initial state should be loading
      expect(result.current.loading).toBe(true);

      // Wait for fetch to complete
      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        expect(result.current.loading).toBe(false);
      });
    });

    it("should have correct initial values", () => {
      const { result } = renderHook(() => useHistory());

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.currentPage).toBe(0);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.searchTerm).toBe("");
      expect(result.current.historyData).toBeNull();
    });

    it("should have all expected methods", () => {
      const { result } = renderHook(() => useHistory());

      expect(typeof result.current.setSearchTerm).toBe("function");
      expect(typeof result.current.handleRefresh).toBe("function");
      expect(typeof result.current.handlePageChange).toBe("function");
      expect(typeof result.current.fetchHistory).toBe("function");
    });
  });

  describe("fetchHistory - Success", () => {
    it("should fetch history successfully", async () => {
      const { result } = renderHook(() => useHistory());

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.historyData).toEqual(mockHistoryData.data);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it("should call API with correct parameters", async () => {
      renderHook(() => useHistory());

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/history")
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`limit=${ITEMS_PER_PAGE}`)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("offset=0")
        );
      });
    });

    it("should update current page", async () => {
      const { result } = renderHook(() => useHistory());

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.currentPage).toBe(0);
      });
    });
  });

  describe("fetchHistory - Error Handling", () => {
    it("should handle API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: false,
            error: "Failed to fetch history",
          }),
      });

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch history");
        expect(result.current.loading).toBe(false);
      });
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      jest.spyOn(console, "error").mockImplementation();

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to connect to server");
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe("handlePageChange", () => {
    it("should fetch data for specific page", async () => {
      const { result } = renderHook(() => useHistory());

      // Wait for initial fetch
      await act(async () => {
        jest.runAllTimers();
      });

      mockFetch.mockClear();

      // Change to page 2
      await act(async () => {
        result.current.handlePageChange(2);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`offset=${2 * ITEMS_PER_PAGE}`)
        );
        expect(result.current.currentPage).toBe(2);
      });
    });

    it("should set loading state during fetch", async () => {
      const { result } = renderHook(() => useHistory());

      // Wait for initial fetch
      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.loading).toBe(false);

      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(promise);

      act(() => {
        result.current.handlePageChange(1);
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockHistoryData),
        });
        await promise;
        jest.runAllTimers();
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("setSearchTerm", () => {
    it("should update search term and trigger fetch", async () => {
      const { result } = renderHook(() => useHistory());

      // Wait for initial fetch
      await act(async () => {
        jest.runAllTimers();
      });

      mockFetch.mockClear();

      // Set search term
      await act(async () => {
        result.current.setSearchTerm("test");
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.searchTerm).toBe("test");
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("search=test")
        );
      });
    });

    it("should reset to page 0 when searching", async () => {
      const { result } = renderHook(() => useHistory());

      // Wait for initial fetch
      await act(async () => {
        jest.runAllTimers();
      });

      // Go to page 2
      await act(async () => {
        result.current.handlePageChange(2);
        jest.runAllTimers();
      });

      expect(result.current.currentPage).toBe(2);

      // Set search term should reset to page 0
      await act(async () => {
        result.current.setSearchTerm("test");
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.currentPage).toBe(0);
      });
    });

    it("should handle empty search term", async () => {
      const { result } = renderHook(() => useHistory());

      await act(async () => {
        jest.runAllTimers();
      });

      mockFetch.mockClear();

      await act(async () => {
        result.current.setSearchTerm("");
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.not.stringContaining("search=")
        );
      });
    });
  });

  describe("handleRefresh", () => {
    it("should refresh current page", async () => {
      const { result } = renderHook(() => useHistory());

      // Wait for initial fetch
      await act(async () => {
        jest.runAllTimers();
      });

      // Go to page 1
      await act(async () => {
        result.current.handlePageChange(1);
        jest.runAllTimers();
      });

      mockFetch.mockClear();

      // Refresh
      await act(async () => {
        result.current.handleRefresh();
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        expect(result.current.currentPage).toBe(1);
      });
    });

    it("should set isRefreshing flag", async () => {
      const { result } = renderHook(() => useHistory());

      await act(async () => {
        jest.runAllTimers();
      });

      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(promise);

      act(() => {
        result.current.handleRefresh();
      });

      expect(result.current.isRefreshing).toBe(true);

      await act(async () => {
        resolvePromise!({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockHistoryData),
        });
        await promise;
        jest.runAllTimers();
      });

      expect(result.current.isRefreshing).toBe(false);
    });

    it("should maintain search term when refreshing", async () => {
      const { result } = renderHook(() => useHistory());

      await act(async () => {
        jest.runAllTimers();
      });

      // Set search term
      await act(async () => {
        result.current.setSearchTerm("token");
        jest.runAllTimers();
      });

      mockFetch.mockClear();

      // Refresh
      await act(async () => {
        result.current.handleRefresh();
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("search=token")
        );
      });
    });
  });

  describe("Loading States", () => {
    it("should handle loading state correctly", async () => {
      const { result } = renderHook(() => useHistory());

      expect(result.current.loading).toBe(true);

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("should clear error on successful fetch", async () => {
      // First fetch fails
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      jest.spyOn(console, "error").mockImplementation();

      const { result } = renderHook(() => useHistory());

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockHistoryData),
      });

      await act(async () => {
        result.current.handleRefresh();
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe("Pagination Parameters", () => {
    it("should calculate offset correctly for different pages", async () => {
      const { result } = renderHook(() => useHistory());

      await act(async () => {
        jest.runAllTimers();
      });

      const testCases = [
        { page: 0, expectedOffset: 0 },
        { page: 1, expectedOffset: ITEMS_PER_PAGE },
        { page: 2, expectedOffset: ITEMS_PER_PAGE * 2 },
      ];

      for (const { page, expectedOffset } of testCases) {
        mockFetch.mockClear();

        await act(async () => {
          result.current.handlePageChange(page);
          jest.runAllTimers();
        });

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining(`offset=${expectedOffset}`)
          );
        });
      }
    });

    it("should always use ITEMS_PER_PAGE as limit", async () => {
      renderHook(() => useHistory());

      await act(async () => {
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`limit=${ITEMS_PER_PAGE}`)
        );
      });
    });
  });
});
