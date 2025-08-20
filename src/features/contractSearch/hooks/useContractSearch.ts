import { useState, useCallback } from "react";
import { AnalysisResult } from "../../../shared/lib/zodSchemas";
import { isValidEthereumAddress } from "../../../shared/lib/utils";

interface UseContractSearchReturn {
  address: string;
  setAddress: (address: string) => void;
  isLoading: boolean;
  error: string | null;
  result: AnalysisResult | null;
  searchContract: () => Promise<void>;
  clearError: () => void;
}

export function useContractSearch(): UseContractSearchReturn {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const searchContract = useCallback(async () => {
    if (!address.trim()) {
      setError("Please enter a contract address");
      return;
    }

    if (!isValidEthereumAddress(address)) {
      setError(
        "Please enter a valid Ethereum address (0x followed by 42 characters)"
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First, try to get existing score
      const scoreResponse = await fetch(
        `/api/score?address=${encodeURIComponent(address)}`
      );
      const scoreData = await scoreResponse.json();

      if (scoreData.success && scoreData.data) {
        setResult(scoreData.data);
        return;
      }

      // If no existing score, start new analysis
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      });

      const analyzeData = await analyzeResponse.json();

      if (analyzeData.success) {
        setResult(analyzeData.data);
      } else {
        setError(analyzeData.error || "An error occurred during analysis");
      }
    } catch (err) {
      setError("Network error occurred. Please try again.");
      console.error("Contract search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  return {
    address,
    setAddress,
    isLoading,
    error,
    result,
    searchContract,
    clearError,
  };
}
