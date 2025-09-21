import { useState, useCallback } from "react";
import { isValidEthereumAddress } from "../../../shared/lib/utils";
import { useNetwork } from "../../../shared/contexts/NetworkContext";
import { ContractAnalysisResult } from "../../../shared/lib/fetchers/contractSource";

interface UseContractSearchReturn {
  address: string;
  setAddress: (address: string) => void;
  isLoading: boolean;
  error: string | null;
  result: ContractAnalysisResult | null;
  searchContract: () => Promise<void>;
  clearError: () => void;
}

export function useContractSearch(): UseContractSearchReturn {
  const { selectedChain } = useNetwork();
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContractAnalysisResult | null>(null);

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
      setResult(null); // Clear previous results before starting new analysis

      // Get contract source (with risk analysis fallback)
      const url = `/api/contract-analysis/contract-source?address=${encodeURIComponent(
        address
      )}&chainId=${selectedChain.id}`;
      console.log("[ContractSource] Request", {
        url,
        address,
        chainId: selectedChain.id,
      });

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data) {
        console.log("[ContractSource] Success", {
          address: data.data.address,
          chainId: data.data.chainId,
          verified: data.data.verified,
          type: data.data.verified ? "source" : "risk",
          compilerVersion: data.data.compilerVersion,
          filesCount:
            data.data.verified && Array.isArray(data.data.files)
              ? data.data.files.length
              : 0,
          bytecodeLength: !data.data.verified
            ? data.data.bytecodeLength
            : undefined,
          selectorsCount: !data.data.verified
            ? data.data.selectors?.length
            : undefined,
          riskSeverity: !data.data.verified
            ? data.data.risk?.severity
            : undefined,
        });

        // Log detailed data for unverified contracts
        if (!data.data.verified) {
          console.log("🔍 [ContractSource] Unverified contract details:", {
            isContract: data.data.isContract,
            bytecodeLength: data.data.bytecodeLength,
            selectors: data.data.selectors,
            opcodeCounters: data.data.opcodeCounters,
            risk: data.data.risk,
          });
        }

        setResult(data.data);
      } else {
        console.warn("[ContractSource] Failure", {
          error: data.error,
          address,
          chainId: selectedChain.id,
        });
        setError(data.error || "Contract not found");
      }
    } catch (err) {
      setError("Network error occurred. Please try again.");
      console.error("[ContractSource] Network error", {
        err,
        address,
        chainId: selectedChain.id,
      });
    } finally {
      setIsLoading(false);
    }
  }, [address, selectedChain.id]);

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
