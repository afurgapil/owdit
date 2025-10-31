import React, { useEffect, useState } from "react";
import type { AnalysisProgress } from "../../../types/contractAnalysis";
import { CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";

interface AnalysisProgressProps {
  sessionId: string;
  contractAddress: string;
  chainId: number;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface ProgressData {
  progress: AnalysisProgress[];
  overallProgress: number;
  currentStep: AnalysisProgress | null;
  isComplete: boolean;
  hasFailed: boolean;
}

export function AnalysisProgress({
  sessionId,
  contractAddress,
  chainId,
  onComplete,
  onError,
}: AnalysisProgressProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(
          `/api/analysis-progress?sessionId=${sessionId}&contractAddress=${contractAddress}&chainId=${chainId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch progress");
        }

        const data = await response.json();
        if (data.success) {
          setProgressData(data.data);
          setIsLoading(false);

          if (data.data.isComplete) {
            onComplete?.();
          } else if (data.data.hasFailed) {
            onError?.("Analysis failed");
          }
        } else {
          throw new Error(data.error || "Failed to fetch progress");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsLoading(false);
        onError?.(err instanceof Error ? err.message : "Unknown error");
      }
    };

    // Initial fetch
    fetchProgress();

    // Poll every 2 seconds
    const interval = setInterval(fetchProgress, 2000);

    return () => clearInterval(interval);
  }, [sessionId, contractAddress, chainId, onComplete, onError]);

  const getStatusIcon = (status: AnalysisProgress["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "in_progress":
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-400" />;
      case "pending":
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: AnalysisProgress["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "in_progress":
        return "text-blue-400";
      case "failed":
        return "text-red-400";
      case "pending":
      default:
        return "text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-neon-blue/30">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-neon-blue animate-spin" />
          <span className="ml-3 text-white">Loading analysis progress...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-red-500/30">
        <div className="flex items-center">
          <XCircle className="h-8 w-8 text-red-400" />
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-red-400">
              Progress Error
            </h3>
            <p className="text-gray-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return null;
  }

  return (
    <div className="glass-card p-6 rounded-2xl border border-neon-blue/30">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2 neon-text neon-blue">
          Analysis Progress
        </h3>
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-300">Overall Progress</span>
          <span className="text-white font-semibold">
            {progressData.overallProgress}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-neon-blue to-neon-purple h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressData.overallProgress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {progressData.progress.map((step) => (
          <div
            key={step.step}
            className={`flex items-start space-x-4 p-4 rounded-xl border transition-all duration-300 ${
              step.status === "completed"
                ? "border-green-500/30 bg-green-500/5"
                : step.status === "in_progress"
                ? "border-blue-500/30 bg-blue-500/5"
                : step.status === "failed"
                ? "border-red-500/30 bg-red-500/5"
                : "border-gray-600/30 bg-gray-800/20"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getStatusIcon(step.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className={`font-medium ${getStatusColor(step.status)}`}>
                  {step.step
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </h4>
                {step.status === "in_progress" && (
                  <span className="text-sm text-gray-400">
                    {step.progress}%
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 mt-1">{step.message}</p>
              {step.status === "in_progress" && step.progress > 0 && (
                <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {progressData.currentStep && (
        <div className="mt-6 p-4 bg-neon-blue/10 border border-neon-blue/30 rounded-xl">
          <div className="flex items-center">
            <Loader2 className="h-5 w-5 text-neon-blue animate-spin mr-3" />
            <div>
              <p className="text-neon-blue font-medium">
                Currently processing:
              </p>
              <p className="text-gray-300 text-sm">
                {progressData.currentStep.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {progressData.isComplete && (
        <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
            <div>
              <p className="text-green-400 font-medium">Analysis Complete!</p>
              <p className="text-gray-300 text-sm">
                All analysis steps have been completed successfully.
              </p>
            </div>
          </div>
        </div>
      )}

      {progressData.hasFailed && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-400 mr-3" />
            <div>
              <p className="text-red-400 font-medium">Analysis Failed</p>
              <p className="text-gray-300 text-sm">
                Some analysis steps failed. Please try again.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
