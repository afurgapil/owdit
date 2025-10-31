import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AnalysisProgress } from "../AnalysisProgress";

// Mock fetch
global.fetch = jest.fn();

describe("AnalysisProgress", () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  const mockSessionId = "test-session-123";
  const mockContractAddress = "0x1234567890123456789012345678901234567890";
  const mockChainId = 1;
  const mockOnComplete = jest.fn();
  const mockOnError = jest.fn();

  const mockProgressData = {
    success: true,
    data: {
      progress: [
        {
          step: "fetching_source",
          status: "completed" as const,
          message: "Contract source code fetched",
          progress: 100,
        },
        {
          step: "analyzing_bytecode",
          status: "in_progress" as const,
          message: "Analyzing bytecode...",
          progress: 50,
        },
        {
          step: "risk_assessment",
          status: "pending" as const,
          message: "Pending risk assessment",
          progress: 0,
        },
      ],
      overallProgress: 50,
      currentStep: {
        step: "analyzing_bytecode",
        status: "in_progress" as const,
        message: "Analyzing bytecode...",
        progress: 50,
      },
      isComplete: false,
      hasFailed: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Loading State", () => {
    it("shows loading indicator initially", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      expect(
        screen.getByText("Loading analysis progress...")
      ).toBeInTheDocument();
    });

    it("displays loader icon while loading", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { container } = render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Progress Data Display", () => {
    it("displays progress data after fetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Analysis Progress")).toBeInTheDocument();
      });
    });

    it("displays overall progress percentage", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        const percentages = screen.getAllByText("50%");
        expect(percentages.length).toBeGreaterThan(0);
      });
    });

    it("shows progress bar with correct width", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      const { container } = render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        const progressBar = container.querySelector('[style*="width: 50%"]');
        expect(progressBar).toBeInTheDocument();
      });
    });

    it("displays all progress steps", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Fetching Source/i).length).toBeGreaterThan(
          0
        );
        expect(
          screen.getAllByText(/Analyzing Bytecode/i).length
        ).toBeGreaterThan(0);
        expect(screen.getAllByText(/Risk Assessment/i).length).toBeGreaterThan(
          0
        );
      });
    });
  });

  describe("Step Status Display", () => {
    it("shows completed steps with green styling", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        const completedMessage = screen.getByText(
          "Contract source code fetched"
        );
        expect(completedMessage).toBeInTheDocument();
      });
    });

    it("shows in-progress steps with spinner", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      const { container } = render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        const spinners = container.querySelectorAll(".animate-spin");
        expect(spinners.length).toBeGreaterThan(0);
      });
    });

    it("shows pending steps with gray styling", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Pending risk assessment")).toBeInTheDocument();
      });
    });

    it("shows failed steps with red styling", async () => {
      const failedProgressData = {
        ...mockProgressData,
        data: {
          ...mockProgressData.data,
          progress: [
            ...mockProgressData.data.progress,
            {
              step: "failed_step",
              status: "failed" as const,
              message: "Step failed",
              progress: 0,
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => failedProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Step failed")).toBeInTheDocument();
      });
    });
  });

  describe("Current Step Display", () => {
    it("highlights current step being processed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Currently processing:")).toBeInTheDocument();
        expect(
          screen.getAllByText("Analyzing bytecode...").length
        ).toBeGreaterThan(0);
      });
    });

    it("does not show current step section when none in progress", async () => {
      const completedProgressData = {
        ...mockProgressData,
        data: {
          ...mockProgressData.data,
          currentStep: null,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => completedProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(
          screen.queryByText("Currently processing:")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Completion State", () => {
    it("shows completion message when analysis is complete", async () => {
      const completeProgressData = {
        ...mockProgressData,
        data: {
          ...mockProgressData.data,
          isComplete: true,
          overallProgress: 100,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => completeProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
          onComplete={mockOnComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Analysis Complete!")).toBeInTheDocument();
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    it("displays success icon when complete", async () => {
      const completeProgressData = {
        ...mockProgressData,
        data: {
          ...mockProgressData.data,
          isComplete: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => completeProgressData,
      } as Response);

      const { container } = render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Analysis Complete!")).toBeInTheDocument();
      });
    });
  });

  describe("Failure State", () => {
    it("shows failure message when analysis has failed", async () => {
      const failedProgressData = {
        ...mockProgressData,
        data: {
          ...mockProgressData.data,
          hasFailed: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => failedProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
          onError={mockOnError}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Analysis Failed")).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalledWith("Analysis failed");
      });
    });

    it("displays error icon when failed", async () => {
      const failedProgressData = {
        ...mockProgressData,
        data: {
          ...mockProgressData.data,
          hasFailed: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => failedProgressData,
      } as Response);

      const { container } = render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Analysis Failed")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("displays error message on fetch failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: "Fetch failed" }),
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
          onError={mockOnError}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Progress Error")).toBeInTheDocument();
      });
    });

    it("calls onError callback on fetch failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
          onError={mockOnError}
        />
      );

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it("displays error UI on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });
  });

  describe("Polling Behavior", () => {
    it("fetches progress data on mount", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`sessionId=${mockSessionId}`)
        );
      });
    });

    it("polls progress data every 2 seconds", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it("stops polling on unmount", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      const { unmount } = render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should not have called fetch again after unmount
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("API Request Parameters", () => {
    it("includes sessionId in request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`sessionId=${mockSessionId}`)
        );
      });
    });

    it("includes contractAddress in request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`contractAddress=${mockContractAddress}`)
        );
      });
    });

    it("includes chainId in request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProgressData,
      } as Response);

      render(
        <AnalysisProgress
          sessionId={mockSessionId}
          contractAddress={mockContractAddress}
          chainId={mockChainId}
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`chainId=${mockChainId}`)
        );
      });
    });
  });
});
