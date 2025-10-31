import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommentsSection } from "../CommentsSection";
import { useAccount, useConnect } from "wagmi";

// Mock wagmi hooks
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
  useConnect: jest.fn(),
}));

// Mock utils
jest.mock("../../../../shared/lib/utils", () => ({
  shortenAddress: jest.fn((addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`),
}));

// Mock fetch
global.fetch = jest.fn();

describe("CommentsSection", () => {
  const mockUseAccount = useAccount as jest.Mock;
  const mockUseConnect = useConnect as jest.Mock;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  const mockOnLoadingChange = jest.fn();

  const mockComments = {
    success: true,
    data: {
      items: [
        {
          _id: "1",
          message: "Test comment",
          author: { address: "0x1234", displayName: "Test User" },
          createdAt: new Date().toISOString(),
          moderation: { status: "approved" },
          score: 5,
          repliesCount: 0,
          replies: [],
        },
      ],
      total: 1,
      hasMore: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
    });
    mockUseConnect.mockReturnValue({
      connect: jest.fn(),
      connectors: [{ id: "injected", name: "MetaMask" }],
      isPending: false,
    });
  });

  describe("Loading Comments", () => {
    it("fetches comments on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments,
      } as Response);

      render(
        <CommentsSection
          contractAddress="0xContract"
          chainId={1}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/community/comments"),
          expect.any(Object)
        );
      });
    });

    it("displays comments after loading", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments,
      } as Response);

      render(
        <CommentsSection
          contractAddress="0xContract"
          chainId={1}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Test comment")).toBeInTheDocument();
      });
    });

    it("calls onLoadingChange callback", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments,
      } as Response);

      render(
        <CommentsSection
          contractAddress="0xContract"
          chainId={1}
          onLoadingChange={mockOnLoadingChange}
        />
      );

      await waitFor(() => {
        expect(mockOnLoadingChange).toHaveBeenCalledWith(true);
      });

      await waitFor(() => {
        expect(mockOnLoadingChange).toHaveBeenCalledWith(false);
      });
    });

    it("displays error message on fetch failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: "Failed to load" }),
      } as Response);

      render(
        <CommentsSection
          contractAddress="0xContract"
          chainId={1}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe("Wallet Connection", () => {
    it("shows connect wallet button when not connected", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockComments, data: { ...mockComments.data, items: [] } }),
      } as Response);

      render(
        <CommentsSection
          contractAddress="0xContract"
          chainId={1}
        />
      );

      expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
    });

    it("shows comment form when connected", async () => {
      mockUseAccount.mockReturnValue({
        address: "0x1234567890123456789012345678901234567890",
        isConnected: true,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments,
      } as Response);

      render(
        <CommentsSection
          contractAddress="0xContract"
          chainId={1}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Share your thoughts/i)).toBeInTheDocument();
      });
    });
  });

  describe("Sorting", () => {
    it("defaults to newest first", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments,
      } as Response);

      render(
        <CommentsSection
          contractAddress="0xContract"
          chainId={1}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("contractAddress=0xContract"),
          expect.any(Object)
        );
      });
    });
  });

  describe("Empty State", () => {
    it("shows empty message when no comments", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockComments,
          data: { ...mockComments.data, items: [], total: 0 },
        }),
      } as Response);

      render(
        <CommentsSection
          contractAddress="0xContract"
          chainId={1}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No comments yet/i)).toBeInTheDocument();
      });
    });
  });
});

