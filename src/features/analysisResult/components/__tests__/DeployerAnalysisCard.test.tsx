import React from "react";
import { render, screen } from "@testing-library/react";
import { DeployerAnalysisCard } from "../DeployerAnalysisCard";
import { DeployerAnalysis } from "../../../../types/contractAnalysis";

describe("DeployerAnalysisCard", () => {
  const mockDeployerAnalysis: DeployerAnalysis = {
    address: "0x1234567890123456789012345678901234567890",
    reputationScore: 75,
    riskLevel: "medium",
    contractCount: 15,
    successRate: 0.9,
    timeSinceFirstDeploy: 365.5,
    firstDeployDate: "2023-01-15T10:00:00Z",
    riskIndicators: ["New deployer", "Low transaction count"],
    totalVolumeDeployed: 125.5,
    averageContractSize: 8.37,
  };

  describe("Rendering", () => {
    it("renders deployer analysis card", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("Deployer Analysis")).toBeInTheDocument();
    });

    it("displays formatted deployer address", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("0x1234...7890")).toBeInTheDocument();
    });
  });

  describe("Reputation Score", () => {
    it("displays reputation score", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("75/100")).toBeInTheDocument();
    });

    it("shows progress bar for reputation", () => {
      const { container } = render(
        <DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />
      );

      const progressBar = container.querySelector('[style*="width: 75%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it("applies green color for high reputation (80+)", () => {
      const highRepAnalysis = { ...mockDeployerAnalysis, reputationScore: 85 };
      const { container } = render(
        <DeployerAnalysisCard deployerAnalysis={highRepAnalysis} />
      );

      const progressBar = container.querySelector(".from-neon-green");
      expect(progressBar).toBeInTheDocument();
    });

    it("applies orange color for medium reputation (60-79)", () => {
      const { container } = render(
        <DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />
      );

      const progressBar = container.querySelector(".from-neon-orange");
      expect(progressBar).toBeInTheDocument();
    });

    it("applies pink color for low reputation (<60)", () => {
      const lowRepAnalysis = { ...mockDeployerAnalysis, reputationScore: 45 };
      const { container } = render(
        <DeployerAnalysisCard deployerAnalysis={lowRepAnalysis} />
      );

      const progressBar = container.querySelector(".from-neon-pink");
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe("Statistics Grid", () => {
    it("displays contract count", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("15")).toBeInTheDocument();
      expect(screen.getByText("Contracts")).toBeInTheDocument();
    });

    it("displays success rate as percentage", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("90%")).toBeInTheDocument();
      expect(screen.getByText("Success Rate")).toBeInTheDocument();
    });
  });

  describe("Experience Section", () => {
    it("displays days since first deploy", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("366 days")).toBeInTheDocument();
    });

    it("displays first deploy date when available", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText(/^First deploy:$/i)).toBeInTheDocument();
    });

    it("formats first deploy date correctly", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      const dateElement = screen.getByText(/1\/15\/2023/i);
      expect(dateElement).toBeInTheDocument();
    });

    it("handles missing first deploy date", () => {
      const analysisWithoutDate = {
        ...mockDeployerAnalysis,
        firstDeployDate: undefined,
      };
      render(<DeployerAnalysisCard deployerAnalysis={analysisWithoutDate} />);

      expect(screen.queryByText(/^First deploy:$/i)).not.toBeInTheDocument();
    });
  });

  describe("Risk Level", () => {
    it("displays low risk level correctly", () => {
      const lowRiskAnalysis = {
        ...mockDeployerAnalysis,
        riskLevel: "low" as const,
      };
      render(<DeployerAnalysisCard deployerAnalysis={lowRiskAnalysis} />);

      expect(screen.getByText("LOW")).toBeInTheDocument();
    });

    it("displays medium risk level correctly", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    });

    it("displays high risk level correctly", () => {
      const highRiskAnalysis = {
        ...mockDeployerAnalysis,
        riskLevel: "high" as const,
      };
      render(<DeployerAnalysisCard deployerAnalysis={highRiskAnalysis} />);

      expect(screen.getByText("HIGH")).toBeInTheDocument();
    });

    it("applies correct color for low risk", () => {
      const lowRiskAnalysis = {
        ...mockDeployerAnalysis,
        riskLevel: "low" as const,
      };
      render(<DeployerAnalysisCard deployerAnalysis={lowRiskAnalysis} />);

      const badge = screen.getByText("LOW");
      expect(badge).toHaveClass("text-neon-green");
    });

    it("applies correct color for medium risk", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      const badge = screen.getByText("MEDIUM");
      expect(badge).toHaveClass("text-neon-orange");
    });

    it("applies correct color for high risk", () => {
      const highRiskAnalysis = {
        ...mockDeployerAnalysis,
        riskLevel: "high" as const,
      };
      render(<DeployerAnalysisCard deployerAnalysis={highRiskAnalysis} />);

      const badge = screen.getByText("HIGH");
      expect(badge).toHaveClass("text-neon-pink");
    });
  });

  describe("Risk Indicators", () => {
    it("displays risk indicators when present", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("Risk Indicators")).toBeInTheDocument();
      expect(screen.getByText("New deployer")).toBeInTheDocument();
      expect(screen.getByText("Low transaction count")).toBeInTheDocument();
    });

    it("does not display risk indicators section when empty", () => {
      const analysisWithoutIndicators = {
        ...mockDeployerAnalysis,
        riskIndicators: [],
      };
      render(
        <DeployerAnalysisCard deployerAnalysis={analysisWithoutIndicators} />
      );

      expect(screen.queryByText("Risk Indicators")).not.toBeInTheDocument();
    });

    it("renders all risk indicators", () => {
      const analysisWithManyIndicators = {
        ...mockDeployerAnalysis,
        riskIndicators: ["Indicator 1", "Indicator 2", "Indicator 3"],
      };
      render(
        <DeployerAnalysisCard deployerAnalysis={analysisWithManyIndicators} />
      );

      expect(screen.getByText("Indicator 1")).toBeInTheDocument();
      expect(screen.getByText("Indicator 2")).toBeInTheDocument();
      expect(screen.getByText("Indicator 3")).toBeInTheDocument();
    });
  });

  describe("Volume Information", () => {
    it("displays total volume deployed", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("125.5000 ETH")).toBeInTheDocument();
    });

    it("displays average contract size", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("8.3700 ETH")).toBeInTheDocument();
    });

    it("hides volume section when both values are undefined", () => {
      const analysisWithoutVolume = {
        ...mockDeployerAnalysis,
        totalVolumeDeployed: undefined,
        averageContractSize: undefined,
      };
      render(<DeployerAnalysisCard deployerAnalysis={analysisWithoutVolume} />);

      expect(
        screen.queryByText(/Total Volume Deployed:/i)
      ).not.toBeInTheDocument();
    });

    it("displays volume section when only one value is present", () => {
      const analysisWithPartialVolume = {
        ...mockDeployerAnalysis,
        averageContractSize: undefined,
      };
      render(
        <DeployerAnalysisCard deployerAnalysis={analysisWithPartialVolume} />
      );

      expect(screen.getByText("Total Volume Deployed:")).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("displays User icon in header", () => {
      const { container } = render(
        <DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("displays Shield icon for contracts", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("Contracts")).toBeInTheDocument();
    });

    it("displays TrendingUp icon for success rate", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("Success Rate")).toBeInTheDocument();
    });

    it("displays Calendar icon for experience", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("Experience")).toBeInTheDocument();
    });

    it("displays AlertTriangle icon for risk indicators", () => {
      render(<DeployerAnalysisCard deployerAnalysis={mockDeployerAnalysis} />);

      expect(screen.getByText("Risk Indicators")).toBeInTheDocument();
    });
  });

  describe("Custom ClassName", () => {
    it("applies custom className", () => {
      const { container } = render(
        <DeployerAnalysisCard
          deployerAnalysis={mockDeployerAnalysis}
          className="custom-class"
        />
      );

      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles success rate of 0", () => {
      const zeroSuccessAnalysis = { ...mockDeployerAnalysis, successRate: 0 };
      render(<DeployerAnalysisCard deployerAnalysis={zeroSuccessAnalysis} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("handles success rate of 1 (100%)", () => {
      const perfectSuccessAnalysis = {
        ...mockDeployerAnalysis,
        successRate: 1,
      };
      render(
        <DeployerAnalysisCard deployerAnalysis={perfectSuccessAnalysis} />
      );

      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("handles 0 contract count", () => {
      const noContractsAnalysis = { ...mockDeployerAnalysis, contractCount: 0 };
      render(<DeployerAnalysisCard deployerAnalysis={noContractsAnalysis} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("formats large contract counts", () => {
      const manyContractsAnalysis = {
        ...mockDeployerAnalysis,
        contractCount: 1000,
      };
      render(<DeployerAnalysisCard deployerAnalysis={manyContractsAnalysis} />);

      expect(screen.getByText("1000")).toBeInTheDocument();
    });
  });
});
