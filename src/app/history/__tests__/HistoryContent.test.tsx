import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock ESM-only wagmi before importing components that might transitively import it
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: null, isConnected: false }),
  useConnect: () => ({ connectAsync: jest.fn(), connectors: [] }),
}));

jest.mock("../../../shared/components/MatrixRain", () => ({
  MatrixRain: () => <div data-testid="matrix-rain" />,
}));

// Use manual mock at src/features/history/components/__mocks__/HistoryItem.tsx
jest.mock("../../../features/history/components/HistoryItem");

// Keep a reference to setSearchTerm mock
const setSearchTermMock = jest.fn();

jest.mock("../../../features/history/hooks/useHistory", () => {
  const handleRefresh = jest.fn();
  const handlePageChange = jest.fn();
  return {
    useHistory: () => ({
      historyData: null,
      loading: true,
      error: null,
      currentPage: 0,
      isRefreshing: false,
      searchTerm: "",
      setSearchTerm: setSearchTermMock,
      handleRefresh,
      handlePageChange,
    }),
    ITEMS_PER_PAGE: 10,
  };
});

import { HistoryContent } from "../HistoryContent";

describe("HistoryContent", () => {
  test("renders intro and loading state", () => {
    render(<HistoryContent />);
    expect(screen.getByText(/View all your smart contract security analyses in one place/i)).toBeInTheDocument();
    expect(screen.getByTestId("matrix-rain")).toBeInTheDocument();
    expect(screen.getByText(/Loading history/i)).toBeInTheDocument();
  });

  test("search input calls setSearchTerm", () => {
    render(<HistoryContent />);
    const input = screen.getByPlaceholderText(/Search by address or contract name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "0xabc" } });
    expect(setSearchTermMock).toHaveBeenCalledWith("0xabc");
  });
});
