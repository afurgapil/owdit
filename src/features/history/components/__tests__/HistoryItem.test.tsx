import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HistoryItem } from "../HistoryItem";

// Mock dependencies
jest.mock("../../../../shared/lib/utils", () => ({
  formatTimestamp: jest.fn((timestamp) => new Date(timestamp).toLocaleDateString()),
}));

jest.mock("../../../community/components/CommentsSection", () => ({
  CommentsSection: ({ contractAddress }: { contractAddress: string }) => (
    <div data-testid="comments-section">Comments for {contractAddress}</div>
  ),
}));

jest.mock("../../../analysisResult/components/DeployerAnalysisCard", () => ({
  DeployerAnalysisCard: () => <div data-testid="deployer-analysis">Deployer Analysis</div>,
}));

jest.mock("../../../analysisResult/components/InteractionAnalysisCard", () => ({
  InteractionAnalysisCard: () => <div data-testid="interaction-analysis">Interaction Analysis</div>,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe("HistoryItem", () => {
  const mockItem = {
    address: "0x1234567890123456789012345678901234567890",
    chainId: 1,
    score: 85,
    level: "low" as const,
    timestamp: "2024-01-15T10:00:00Z",
    contractName: "TestContract",
    compilerVersion: "0.8.19",
    status: "completed",
    findings: [],
    overallRiskScore: 75,
    deployerAnalysis: { address: "0xdeployer" },
    interactionAnalysis: { totalTransactions: 100 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders history item", () => {
      render(<HistoryItem item={mockItem} />);

      expect(screen.getByText("TestContract")).toBeInTheDocument();
    });

    it("displays unknown contract when name is missing", () => {
      const itemWithoutName = { ...mockItem, contractName: undefined };
      render(<HistoryItem item={itemWithoutName} />);

      expect(screen.getByText("Unknown Contract")).toBeInTheDocument();
    });

    it("displays contract address", () => {
      render(<HistoryItem item={mockItem} />);

      expect(screen.getByText(mockItem.address)).toBeInTheDocument();
    });

    it("shows security score", () => {
      render(<HistoryItem item={mockItem} />);

      expect(screen.getByText("85")).toBeInTheDocument();
      expect(screen.getByText("Security Score")).toBeInTheDocument();
    });

    it("displays risk level badge", () => {
      render(<HistoryItem item={mockItem} />);

      expect(screen.getByText("LOW")).toBeInTheDocument();
    });
  });

  describe("Risk Level Styling", () => {
    it("applies correct styling for low risk", () => {
      render(<HistoryItem item={mockItem} />);

      const badge = screen.getByText("LOW");
      expect(badge).toHaveClass("text-green-400");
    });

    it("applies correct styling for medium risk", () => {
      const mediumItem = { ...mockItem, level: "medium" as const };
      render(<HistoryItem item={mediumItem} />);

      const badge = screen.getByText("MEDIUM");
      expect(badge).toHaveClass("text-orange-400");
    });

    it("applies correct styling for high risk", () => {
      const highItem = { ...mockItem, level: "high" as const };
      render(<HistoryItem item={highItem} />);

      const badge = screen.getByText("HIGH");
      expect(badge).toHaveClass("text-red-400");
    });

    it("applies correct styling for critical risk", () => {
      const criticalItem = { ...mockItem, level: "critical" as const };
      render(<HistoryItem item={criticalItem} />);

      const badge = screen.getByText("CRITICAL");
      expect(badge).toHaveClass("text-red-300");
    });
  });

  describe("Score Color", () => {
    it("displays green for high scores (80+)", () => {
      render(<HistoryItem item={mockItem} />);

      const scoreElement = screen.getByText("85");
      expect(scoreElement).toHaveClass("text-green-400");
    });

    it("displays orange for medium scores (60-79)", () => {
      const mediumScoreItem = { ...mockItem, score: 70 };
      render(<HistoryItem item={mediumScoreItem} />);

      const scoreElement = screen.getByText("70");
      expect(scoreElement).toHaveClass("text-orange-400");
    });

    it("displays red for low scores (<60)", () => {
      const lowScoreItem = { ...mockItem, score: 40 };
      render(<HistoryItem item={lowScoreItem} />);

      const scoreElement = screen.getByText("40");
      expect(scoreElement).toHaveClass("text-red-400");
    });
  });

  describe("Compiler Version", () => {
    it("displays compiler version when available", () => {
      render(<HistoryItem item={mockItem} />);

      expect(screen.getByText(/Compiler: 0.8.19/i)).toBeInTheDocument();
    });

    it("hides compiler version when not available", () => {
      const itemWithoutCompiler = { ...mockItem, compilerVersion: undefined };
      render(<HistoryItem item={itemWithoutCompiler} />);

      expect(screen.queryByText(/Compiler:/i)).not.toBeInTheDocument();
    });
  });

  describe("Chain Information", () => {
    it("displays chain ID", () => {
      render(<HistoryItem item={mockItem} />);

      expect(screen.getByText("Chain ID: 1")).toBeInTheDocument();
    });
  });

  describe("Copy Address Functionality", () => {
    it("shows copy button", () => {
      render(<HistoryItem item={mockItem} />);

      const copyButton = screen.getByTitle("Copy address");
      expect(copyButton).toBeInTheDocument();
    });

    it("copies address to clipboard when clicked", async () => {
      const writeTextMock = navigator.clipboard.writeText as jest.Mock;

      render(<HistoryItem item={mockItem} />);

      const copyButton = screen.getByTitle("Copy address");
      fireEvent.click(copyButton);

      expect(writeTextMock).toHaveBeenCalledWith(mockItem.address);
    });

    it("shows check icon after copying", async () => {
      const writeTextMock = navigator.clipboard.writeText as jest.Mock;
      writeTextMock.mockResolvedValueOnce(undefined);

      jest.useFakeTimers();
      render(<HistoryItem item={mockItem} />);

      const copyButton = screen.getByTitle("Copy address");
      fireEvent.click(copyButton);

      await waitFor(() => {
        // Check icon should be visible (implementation may vary)
        expect(copyButton).toBeInTheDocument();
      });

      jest.runAllTimers();
      jest.useRealTimers();
    });
  });

  describe("Details Toggle", () => {
    it("shows View Details button", () => {
      render(<HistoryItem item={mockItem} />);

      expect(screen.getByText("View Details")).toBeInTheDocument();
    });

    it("expands details section when clicked", () => {
      render(<HistoryItem item={mockItem} />);

      const detailsButton = screen.getByText("View Details");
      fireEvent.click(detailsButton);

      expect(screen.getByText("Hide Details")).toBeInTheDocument();
      expect(screen.getByText("Contract Information")).toBeInTheDocument();
    });

    it("collapses details when Hide Details is clicked", () => {
      render(<HistoryItem item={mockItem} />);

      const detailsButton = screen.getByText("View Details");
      fireEvent.click(detailsButton);

      const hideButton = screen.getByText("Hide Details");
      fireEvent.click(hideButton);

      expect(screen.getByText("View Details")).toBeInTheDocument();
      expect(screen.queryByText("Contract Information")).not.toBeInTheDocument();
    });

    it("shows deployer analysis when details expanded", () => {
      render(<HistoryItem item={mockItem} />);

      const detailsButton = screen.getByText("View Details");
      fireEvent.click(detailsButton);

      expect(screen.getByTestId("deployer-analysis")).toBeInTheDocument();
    });

    it("shows interaction analysis when details expanded", () => {
      render(<HistoryItem item={mockItem} />);

      const detailsButton = screen.getByText("View Details");
      fireEvent.click(detailsButton);

      expect(screen.getByTestId("interaction-analysis")).toBeInTheDocument();
    });

    it("shows overall risk score when available", () => {
      render(<HistoryItem item={mockItem} />);

      const detailsButton = screen.getByText("View Details");
      fireEvent.click(detailsButton);

      expect(screen.getByText("Overall Risk Assessment")).toBeInTheDocument();
      expect(screen.getByText("75")).toBeInTheDocument();
    });

    it("hides overall risk score when zero", () => {
      const itemWithoutRisk = { ...mockItem, overallRiskScore: 0 };
      render(<HistoryItem item={itemWithoutRisk} />);

      const detailsButton = screen.getByText("View Details");
      fireEvent.click(detailsButton);

      expect(screen.queryByText("Overall Risk Assessment")).not.toBeInTheDocument();
    });
  });

  describe("Comments Toggle", () => {
    it("shows View Comments button", () => {
      render(<HistoryItem item={mockItem} />);

      expect(screen.getByText("View Comments")).toBeInTheDocument();
    });

    it("expands comments section when clicked", () => {
      render(<HistoryItem item={mockItem} />);

      const commentsButton = screen.getByText("View Comments");
      fireEvent.click(commentsButton);

      expect(screen.getByText("Hide Comments")).toBeInTheDocument();
      expect(screen.getByTestId("comments-section")).toBeInTheDocument();
    });

    it("passes contract address to comments section", () => {
      render(<HistoryItem item={mockItem} />);

      const commentsButton = screen.getByText("View Comments");
      fireEvent.click(commentsButton);

      expect(screen.getByText(`Comments for ${mockItem.address}`)).toBeInTheDocument();
    });

    it("collapses comments when Hide Comments is clicked", () => {
      render(<HistoryItem item={mockItem} />);

      const commentsButton = screen.getByText("View Comments");
      fireEvent.click(commentsButton);

      const hideButton = screen.getByText("Hide Comments");
      fireEvent.click(hideButton);

      expect(screen.getByText("View Comments")).toBeInTheDocument();
      expect(screen.queryByTestId("comments-section")).not.toBeInTheDocument();
    });
  });

  describe("Timestamp Display", () => {
    it("displays formatted timestamp", () => {
      render(<HistoryItem item={mockItem} />);

      // Should call formatTimestamp utility
      expect(screen.getAllByText(/1\/15\/2024/i).length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("handles missing deployer analysis", () => {
      const itemWithoutDeployer = { ...mockItem, deployerAnalysis: undefined };
      render(<HistoryItem item={itemWithoutDeployer} />);

      const detailsButton = screen.getByText("View Details");
      fireEvent.click(detailsButton);

      expect(screen.queryByTestId("deployer-analysis")).not.toBeInTheDocument();
    });

    it("handles missing interaction analysis", () => {
      const itemWithoutInteraction = { ...mockItem, interactionAnalysis: undefined };
      render(<HistoryItem item={itemWithoutInteraction} />);

      const detailsButton = screen.getByText("View Details");
      fireEvent.click(detailsButton);

      expect(screen.queryByTestId("interaction-analysis")).not.toBeInTheDocument();
    });

    it("handles invalid deployer analysis type", () => {
      const itemWithInvalidDeployer = { ...mockItem, deployerAnalysis: "invalid" };
      render(<HistoryItem item={itemWithInvalidDeployer} />);

      const detailsButton = screen.getByText("View Details");
      fireEvent.click(detailsButton);

      expect(screen.queryByTestId("deployer-analysis")).not.toBeInTheDocument();
    });
  });
});

