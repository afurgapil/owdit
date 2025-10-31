import React from "react";
import { render, screen } from "@testing-library/react";
import { ScoreCard } from "../ScoreCard";
import { AnalysisResult } from "../../../../shared/lib/zodSchemas";

// Mock utils
jest.mock("../../../../shared/lib/utils", () => ({
  formatTimestamp: jest.fn((timestamp) => new Date(timestamp).toLocaleString()),
  getRiskLevelText: jest.fn((score: number) => {
    if (score >= 80) return "Low Risk";
    if (score >= 60) return "Medium Risk";
    if (score >= 40) return "Medium-High Risk";
    return "High Risk";
  }),
}));

describe("ScoreCard", () => {
  const mockCompletedResult: AnalysisResult = {
    address: "0x1234567890123456789012345678901234567890",
    contractName: "TestContract",
    score: 85,
    status: "completed",
    findings: [
      { title: "Finding 1", detail: "Detail 1", severity: "low" },
      { title: "Finding 2", detail: "Detail 2", severity: "medium" },
    ],
    timestamp: Date.now(),
    network: "ethereum",
  };

  const mockPendingResult: AnalysisResult = {
    ...mockCompletedResult,
    status: "pending",
    score: 0,
    findings: [],
  };

  const mockFailedResult: AnalysisResult = {
    ...mockCompletedResult,
    status: "failed",
    score: 0,
    findings: [],
  };

  describe("Rendering", () => {
    it("renders score card component", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      expect(screen.getByText("Security Score")).toBeInTheDocument();
    });

    it("displays contract address", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      expect(
        screen.getByText((content, element) => {
          return (
            element?.tagName === "P" &&
            content.includes("0x1234567890123456789012345678901234567890")
          );
        })
      ).toBeInTheDocument();
    });

    it("displays contract name when available", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      expect(screen.getByText(/TestContract/i)).toBeInTheDocument();
    });

    it("does not display contract name when not available", () => {
      const resultWithoutName = {
        ...mockCompletedResult,
        contractName: undefined,
      };
      render(<ScoreCard result={resultWithoutName} />);

      expect(screen.queryByText(/Name:/i)).not.toBeInTheDocument();
    });
  });

  describe("Status Display", () => {
    it("shows completed status for completed analysis", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      expect(screen.getByText("Analysis Complete")).toBeInTheDocument();
    });

    it("shows pending status for pending analysis", () => {
      render(<ScoreCard result={mockPendingResult} />);

      expect(screen.getByText("Analysis in Progress")).toBeInTheDocument();
    });

    it("shows failed status for failed analysis", () => {
      render(<ScoreCard result={mockFailedResult} />);

      expect(screen.getByText("Analysis Failed")).toBeInTheDocument();
    });

    it("displays appropriate icon for completed status", () => {
      const { container } = render(<ScoreCard result={mockCompletedResult} />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Score Display", () => {
    it("displays score correctly", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      expect(screen.getByText("85")).toBeInTheDocument();
    });

    it("applies correct color for high score (80+)", () => {
      const highScoreResult = { ...mockCompletedResult, score: 85 };
      render(<ScoreCard result={highScoreResult} />);

      const scoreElement = screen.getByText("85");
      expect(scoreElement).toHaveClass("text-neon-green");
    });

    it("applies correct color for medium score (60-79)", () => {
      const mediumScoreResult = { ...mockCompletedResult, score: 70 };
      render(<ScoreCard result={mediumScoreResult} />);

      const scoreElement = screen.getByText("70");
      expect(scoreElement).toHaveClass("text-neon-orange");
    });

    it("applies correct color for medium-low score (40-59)", () => {
      const medLowScoreResult = { ...mockCompletedResult, score: 50 };
      render(<ScoreCard result={medLowScoreResult} />);

      const scoreElement = screen.getByText("50");
      expect(scoreElement).toHaveClass("text-neon-pink");
    });

    it("applies correct color for low score (<40)", () => {
      const lowScoreResult = { ...mockCompletedResult, score: 30 };
      render(<ScoreCard result={lowScoreResult} />);

      const scoreElement = screen.getByText("30");
      expect(scoreElement).toHaveClass("text-neon-red");
    });

    it("displays risk level text", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      expect(screen.getByText("Low Risk")).toBeInTheDocument();
    });
  });

  describe("Findings Display", () => {
    it("shows findings count when available", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      expect(screen.getByText("2 security findings")).toBeInTheDocument();
    });

    it("does not show findings for pending analysis", () => {
      render(<ScoreCard result={mockPendingResult} />);

      expect(screen.queryByText(/findings/i)).not.toBeInTheDocument();
    });

    it("does not show findings for failed analysis", () => {
      render(<ScoreCard result={mockFailedResult} />);

      expect(screen.queryByText(/findings/i)).not.toBeInTheDocument();
    });

    it("does not show findings when empty array", () => {
      const resultWithoutFindings = { ...mockCompletedResult, findings: [] };
      render(<ScoreCard result={resultWithoutFindings} />);

      expect(screen.queryByText(/findings/i)).not.toBeInTheDocument();
    });
  });

  describe("Timestamp Display", () => {
    it("displays analysis date", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      expect(screen.getByText("Analysis Date:")).toBeInTheDocument();
    });

    it("formats timestamp correctly", () => {
      const testDate = new Date("2024-01-15T12:00:00Z");
      const resultWithDate = {
        ...mockCompletedResult,
        timestamp: testDate.getTime(),
      };

      render(<ScoreCard result={resultWithDate} />);

      // The mock formatTimestamp should be called
      expect(screen.getByText(/Analysis Date:/i)).toBeInTheDocument();
    });
  });

  describe("0G Network Info", () => {
    it("displays 0G Network information", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      expect(screen.getByText(/0G Network/i)).toBeInTheDocument();
      expect(screen.getByText(/permanently stored/i)).toBeInTheDocument();
    });

    it("mentions transparency and verifiability", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      expect(screen.getByText(/transparently verifiable/i)).toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("applies custom className", () => {
      const { container } = render(
        <ScoreCard result={mockCompletedResult} className="custom-class" />
      );

      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });

    it("maintains default classes with custom className", () => {
      const { container } = render(
        <ScoreCard result={mockCompletedResult} className="custom-class" />
      );

      const card = container.querySelector(".glass-card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("custom-class");
    });
  });

  describe("Icons", () => {
    it("displays Shield icon in header", () => {
      const { container } = render(<ScoreCard result={mockCompletedResult} />);

      // Shield icon should be present
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("displays Database icon in 0G info", () => {
      const { container } = render(<ScoreCard result={mockCompletedResult} />);

      // Database icon should be present
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(1);
    });
  });

  describe("Edge Cases", () => {
    it("handles score of 0", () => {
      const zeroScoreResult = { ...mockCompletedResult, score: 0 };
      render(<ScoreCard result={zeroScoreResult} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles score of 100", () => {
      const perfectScoreResult = { ...mockCompletedResult, score: 100 };
      render(<ScoreCard result={perfectScoreResult} />);

      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("handles very long contract addresses", () => {
      const longAddressResult = {
        ...mockCompletedResult,
        address: "0x" + "a".repeat(40),
      };

      render(<ScoreCard result={longAddressResult} />);

      expect(
        screen.getByText((content) => content.includes("0x" + "a".repeat(40)))
      ).toBeInTheDocument();
    });

    it("handles missing contract name gracefully", () => {
      const resultWithoutName = {
        ...mockCompletedResult,
        contractName: undefined,
      };

      render(<ScoreCard result={resultWithoutName} />);

      expect(screen.queryByText(/Name:/)).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("uses semantic HTML structure", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      const heading = screen.getByText("Security Score");
      expect(heading.tagName).toBe("H3");
    });

    it("includes descriptive text for screen readers", () => {
      render(<ScoreCard result={mockCompletedResult} />);

      expect(screen.getByText("Analysis Date:")).toBeInTheDocument();
    });
  });
});
