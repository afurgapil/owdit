import React from "react";
import { render, screen } from "@testing-library/react";
import { InteractionAnalysisCard } from "../InteractionAnalysisCard";
import { InteractionAnalysis } from "../../../../types/contractAnalysis";

describe("InteractionAnalysisCard", () => {
  const mockInteractionAnalysis: InteractionAnalysis = {
    totalTransactions: 1250,
    uniqueUsers: 350,
    transactionVolume: 45.75,
    averageTxPerDay: 12.5,
    lastActivity: "2024-01-15T14:30:00Z",
    firstTransactionDate: "2023-06-01T08:00:00Z",
    peakActivityPeriod: "14:00-16:00 UTC",
    activityLevel: "high",
    riskLevel: "low",
    riskIndicators: [],
    userRetentionRate: 0.75,
  };

  describe("Rendering", () => {
    it("renders interaction analysis card", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("Interaction Analysis")).toBeInTheDocument();
    });

    it("displays description text", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(
        screen.getByText("Contract usage and activity patterns")
      ).toBeInTheDocument();
    });
  });

  describe("Activity Level", () => {
    it("displays high activity level", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("HIGH")).toBeInTheDocument();
    });

    it("displays medium activity level", () => {
      const mediumAnalysis = {
        ...mockInteractionAnalysis,
        activityLevel: "medium" as const,
      };
      render(<InteractionAnalysisCard interactionAnalysis={mediumAnalysis} />);

      expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    });

    it("displays low activity level", () => {
      const lowAnalysis = {
        ...mockInteractionAnalysis,
        activityLevel: "low" as const,
      };
      render(<InteractionAnalysisCard interactionAnalysis={lowAnalysis} />);

      expect(screen.getAllByText("LOW").length).toBeGreaterThan(0);
    });

    it("applies green color for high activity", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      const badge = screen.getByText("HIGH");
      expect(badge).toHaveClass("text-neon-green");
    });
  });

  describe("Statistics Grid", () => {
    it("displays total transactions with locale formatting", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("1,250")).toBeInTheDocument();
      expect(screen.getByText("Transactions")).toBeInTheDocument();
    });

    it("displays unique users with locale formatting", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("350")).toBeInTheDocument();
      expect(screen.getByText("Unique Users")).toBeInTheDocument();
    });

    it("formats large numbers correctly", () => {
      const largeNumbersAnalysis = {
        ...mockInteractionAnalysis,
        totalTransactions: 1234567,
        uniqueUsers: 98765,
      };
      render(
        <InteractionAnalysisCard interactionAnalysis={largeNumbersAnalysis} />
      );

      expect(screen.getByText("1,234,567")).toBeInTheDocument();
      expect(screen.getByText("98,765")).toBeInTheDocument();
    });
  });

  describe("Transaction Volume", () => {
    it("displays total volume", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("45.7500 ETH")).toBeInTheDocument();
    });

    it("displays average transactions per day", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("12.50 tx/day")).toBeInTheDocument();
    });
  });

  describe("Activity Timeline", () => {
    it("displays last activity date", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("Last Activity:")).toBeInTheDocument();
    });

    it("displays first transaction date when available", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("First Activity:")).toBeInTheDocument();
    });

    it("displays peak activity period when available", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("14:00-16:00 UTC")).toBeInTheDocument();
    });

    it("hides first transaction date when not available", () => {
      const analysisWithoutFirstDate = {
        ...mockInteractionAnalysis,
        firstTransactionDate: undefined,
      };
      render(
        <InteractionAnalysisCard
          interactionAnalysis={analysisWithoutFirstDate}
        />
      );

      expect(screen.queryByText("First Activity:")).not.toBeInTheDocument();
    });

    it("hides peak activity period when not available", () => {
      const analysisWithoutPeak = {
        ...mockInteractionAnalysis,
        peakActivityPeriod: undefined,
      };
      render(
        <InteractionAnalysisCard interactionAnalysis={analysisWithoutPeak} />
      );

      expect(screen.queryByText("Peak Hours:")).not.toBeInTheDocument();
    });
  });

  describe("User Retention Rate", () => {
    it("displays retention rate when available", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("75%")).toBeInTheDocument();
      expect(screen.getByText("User Retention Rate")).toBeInTheDocument();
    });

    it("shows progress bar for retention rate", () => {
      const { container } = render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      const progressBar = container.querySelector('[style*="width: 75%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it("hides retention rate when undefined", () => {
      const analysisWithoutRetention = {
        ...mockInteractionAnalysis,
        userRetentionRate: undefined,
      };
      render(
        <InteractionAnalysisCard
          interactionAnalysis={analysisWithoutRetention}
        />
      );

      expect(screen.queryByText("User Retention Rate")).not.toBeInTheDocument();
    });

    it("handles 0% retention rate", () => {
      const zeroRetentionAnalysis = {
        ...mockInteractionAnalysis,
        userRetentionRate: 0,
      };
      render(
        <InteractionAnalysisCard interactionAnalysis={zeroRetentionAnalysis} />
      );

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("handles 100% retention rate", () => {
      const perfectRetentionAnalysis = {
        ...mockInteractionAnalysis,
        userRetentionRate: 1,
      };
      render(
        <InteractionAnalysisCard
          interactionAnalysis={perfectRetentionAnalysis}
        />
      );

      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("Risk Level", () => {
    it("displays risk level", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("LOW")).toBeInTheDocument();
    });

    it("applies correct color for low risk", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      const badge = screen
        .getAllByText("LOW")
        .find((el) => el.tagName === "SPAN");
      expect(badge).toHaveClass("text-neon-green");
    });

    it("applies correct color for medium risk", () => {
      const mediumRiskAnalysis = {
        ...mockInteractionAnalysis,
        riskLevel: "medium" as const,
      };
      render(
        <InteractionAnalysisCard interactionAnalysis={mediumRiskAnalysis} />
      );

      const badge = screen.getByText("MEDIUM");
      expect(badge).toHaveClass("text-neon-orange");
    });

    it("applies correct color for high risk", () => {
      const highRiskAnalysis = {
        ...mockInteractionAnalysis,
        riskLevel: "high" as const,
      };
      render(
        <InteractionAnalysisCard interactionAnalysis={highRiskAnalysis} />
      );

      const badges = screen.getAllByText("HIGH");
      const riskBadge = badges[badges.length - 1]; // Risk Level badge is typically last
      expect(riskBadge).toHaveClass("text-neon-pink");
    });
  });

  describe("Risk Indicators", () => {
    it("displays risk indicators when present", () => {
      const analysisWithIndicators = {
        ...mockInteractionAnalysis,
        riskIndicators: ["Suspicious pattern", "Unusual activity"],
      };
      render(
        <InteractionAnalysisCard interactionAnalysis={analysisWithIndicators} />
      );

      expect(screen.getByText("Risk Indicators")).toBeInTheDocument();
      expect(screen.getByText("Suspicious pattern")).toBeInTheDocument();
      expect(screen.getByText("Unusual activity")).toBeInTheDocument();
    });

    it("hides risk indicators section when empty", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.queryByText("Risk Indicators")).not.toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("displays Activity icon in header", () => {
      const { container } = render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("displays appropriate icons for each section", () => {
      render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
        />
      );

      expect(screen.getByText("Transactions")).toBeInTheDocument();
      expect(screen.getByText("Unique Users")).toBeInTheDocument();
      expect(screen.getByText("Transaction Volume")).toBeInTheDocument();
      expect(screen.getByText("Activity Timeline")).toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("applies custom className", () => {
      const { container } = render(
        <InteractionAnalysisCard
          interactionAnalysis={mockInteractionAnalysis}
          className="custom-class"
        />
      );

      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles 0 transactions", () => {
      const noTransactionsAnalysis = {
        ...mockInteractionAnalysis,
        totalTransactions: 0,
      };
      render(
        <InteractionAnalysisCard interactionAnalysis={noTransactionsAnalysis} />
      );

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles 0 unique users", () => {
      const noUsersAnalysis = {
        ...mockInteractionAnalysis,
        uniqueUsers: 0,
      };
      render(<InteractionAnalysisCard interactionAnalysis={noUsersAnalysis} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles very small volume", () => {
      const smallVolumeAnalysis = {
        ...mockInteractionAnalysis,
        transactionVolume: 0.0001,
      };
      render(
        <InteractionAnalysisCard interactionAnalysis={smallVolumeAnalysis} />
      );

      expect(screen.getByText("0.0001 ETH")).toBeInTheDocument();
    });
  });
});
