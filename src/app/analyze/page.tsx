"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AddressInput } from "../../features/contractSearch/components/AddressInput";
import { useContractSearch } from "../../features/contractSearch/hooks/useContractSearch";
import { MatrixRain } from "../../shared/components/MatrixRain";
import { useNetwork } from "../../shared/contexts/NetworkContext";
import { Brain, Database } from "lucide-react";
import { CommentsSection } from "../../features/community/components/CommentsSection";

function AnalyzeContent() {
  const { selectedChain } = useNetwork();
  const searchParams = useSearchParams();
  const urlAddress = searchParams.get("address");

  const {
    address,
    setAddress,
    isLoading,
    error,
    result,
    searchContract,
    clearError,
  } = useContractSearch();

  const [selectedDemoContract, setSelectedDemoContract] = useState<
    string | null
  >(null);

  // Set address from URL parameter if available
  useEffect(() => {
    if (urlAddress && !address) {
      setAddress(urlAddress);
    }
  }, [urlAddress, address, setAddress]);

  // Handle demo contract selection
  const handleDemoContractSelect = (contractAddress: string) => {
    if (selectedDemoContract === contractAddress) {
      // If already selected, deselect it
      setSelectedDemoContract(null);
      setAddress("");
    } else {
      // Select new contract
      setSelectedDemoContract(contractAddress);
      setAddress(contractAddress);
      // Clear any previous results when selecting a new demo contract
      // The result will be cleared in useContractSearch when searchContract is called
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Matrix Rain Background */}
      <MatrixRain gridSize={24} minDurationSec={15} maxDurationSec={25} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-8 sm:py-12 lg:py-16">
        {/* Header */}

        {/* Demo Contracts Section */}
        <div className="text-center mb-6 sm:mb-8">
          {/* Demo Section Header */}
          <div className="mb-6">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-neon-purple/20 to-neon-blue/20 border border-neon-purple/30 rounded-full text-neon-purple font-bold text-lg mb-4">
              <Database className="h-6 w-6 mr-3" />
              DEMO CONTRACTS
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Try with Example Contracts
            </h2>
            <p className="text-base text-gray-300 max-w-2xl mx-auto">
              Select one of our demo contracts to see how the OWL analyzes smart
              contracts
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Verified Contract Demo */}
            <button
              className={`p-3 sm:p-4 transition-all duration-300 cursor-pointer group text-center transform hover:scale-105 hover:shadow-lg w-full ${
                selectedDemoContract ===
                "0x56182792540295095ea6e269C6680E98FEAaC73E"
                  ? "border-2 border-green-400 bg-green-900/20 shadow-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                  : "border-2 border-gray-600 hover:border-green-400 hover:bg-green-900/10 hover:shadow-green-500/20"
              }`}
              onClick={() =>
                handleDemoContractSelect(
                  "0x56182792540295095ea6e269C6680E98FEAaC73E"
                )
              }
            >
              <div className="flex items-center justify-center mb-3">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    selectedDemoContract ===
                    "0x56182792540295095ea6e269C6680E98FEAaC73E"
                      ? "bg-green-400"
                      : "bg-green-400 animate-pulse"
                  }`}
                ></div>
                <h3 className="font-bold text-green-400 text-lg">
                  📋 DEMO: Verified Contract
                </h3>
              </div>
              <p className="text-gray-300 mb-3 text-sm">
                📝 Example: Counter Contract on Sepolia
              </p>
              <div className="text-xs text-gray-400 font-mono mb-3 bg-gray-800/50 p-2 rounded break-all leading-relaxed">
                0x56182792540295095ea6e269C6680E98FEAaC73E
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm text-green-300 font-medium group-hover:text-green-200 transition-colors">
                  {selectedDemoContract ===
                  "0x56182792540295095ea6e269C6680E98FEAaC73E"
                    ? "✓ Demo Selected"
                    : "Try This Demo"}
                </div>
                <a
                  href="https://sepolia.etherscan.io/address/0x56182792540295095ea6e269C6680E98FEAaC73E"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View on Etherscan →
                </a>
              </div>
            </button>

            {/* Unverified Contract Demo */}
            <button
              className={`p-3 sm:p-4 transition-all duration-300 cursor-pointer group text-center transform hover:scale-105 hover:shadow-lg w-full ${
                selectedDemoContract ===
                "0xCdd6D91F8122aDED891cA2bFBFc16dDaE5ee7d76"
                  ? "border-2 border-orange-400 bg-orange-900/20 shadow-orange-500/20 shadow-[0_0_20px_rgba(251,146,60,0.3)]"
                  : "border-2 border-gray-600 hover:border-orange-400 hover:bg-orange-900/10 hover:shadow-orange-500/20"
              }`}
              onClick={() =>
                handleDemoContractSelect(
                  "0xCdd6D91F8122aDED891cA2bFBFc16dDaE5ee7d76"
                )
              }
            >
              <div className="flex items-center justify-center mb-3">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    selectedDemoContract ===
                    "0xCdd6D91F8122aDED891cA2bFBFc16dDaE5ee7d76"
                      ? "bg-orange-400"
                      : "bg-orange-400 animate-pulse"
                  }`}
                ></div>
                <h3 className="font-bold text-orange-400 text-lg">
                  🔍 DEMO: Unverified Contract
                </h3>
              </div>
              <p className="text-gray-300 mb-3 text-sm">
                🔧 Example: Custom Contract on Sepolia
              </p>
              <div className="text-xs text-gray-400 font-mono mb-3 bg-gray-800/50 p-2 rounded break-all leading-relaxed">
                0xCdd6D91F8122aDED891cA2bFBFc16dDaE5ee7d76
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm text-orange-300 font-medium group-hover:text-orange-200 transition-colors">
                  {selectedDemoContract ===
                  "0xCdd6D91F8122aDED891cA2bFBFc16dDaE5ee7d76"
                    ? "✓ Demo Selected"
                    : "Try This Demo"}
                </div>
                <a
                  href="https://sepolia.etherscan.io/address/0xCdd6D91F8122aDED891cA2bFBFc16dDaE5ee7d76"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View on Etherscan →
                </a>
              </div>
            </button>
          </div>

          <div className="mt-3 text-center">
            <p className="text-sm text-gray-400">
              {selectedDemoContract
                ? "Click the analyze button below to test with the selected demo contract"
                : "Choose a demo contract above to see how the OWL analyzes smart contracts"}
            </p>
          </div>
        </div>

        {/* Address Input */}
        <div className="mb-6 sm:mb-8">
          <AddressInput
            value={address}
            onChange={setAddress}
            onSearch={searchContract}
            isLoading={isLoading}
            error={error || undefined}
            onClearError={clearError}
          />
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-8">
            {/* Analysis Complete Message */}
            <div className="text-center">
              <div className="inline-flex items-center px-6 py-3 bg-neon-green/20 border border-neon-green rounded-full text-neon-green font-bold text-lg">
                <Database className="h-6 w-6 mr-3" />
                Contract Retrieved Successfully
              </div>
            </div>

            {/* Contract Information Display */}
            <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-3xl neon-border">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center">
                Contract Information
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div>
                  <h3 className="text-xl font-bold text-neon-blue mb-4">
                    Basic Information
                  </h3>
                  <div className="space-y-3 text-gray-300">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="font-bold">Address:</span>
                      <span className="font-mono text-xs sm:text-sm break-all">
                        {result.address}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="font-bold">Network:</span>
                      <span>{selectedChain.name}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                      <span className="font-bold">Status:</span>
                      <span
                        className={
                          result.verified
                            ? "text-neon-green"
                            : "text-neon-orange"
                        }
                      >
                        {result.verified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    {result.verified &&
                      "contractName" in result &&
                      result.contractName && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="font-bold">Name:</span>
                          <span className="break-all">
                            {result.contractName}
                          </span>
                        </div>
                      )}
                    {result.verified &&
                      "compilerVersion" in result &&
                      result.compilerVersion && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="font-bold">Compiler:</span>
                          <span className="break-all">
                            {result.compilerVersion}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-neon-purple mb-4">
                    Contract Details
                  </h3>
                  <div className="space-y-3 text-gray-300">
                    {result.verified ? (
                      <>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="font-bold">Source Code:</span>
                          <span className="text-neon-green">Available</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="font-bold">ABI:</span>
                          <span className="text-neon-green">Available</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="font-bold">Files:</span>
                          <span>
                            {result.verified && "sourceCode" in result
                              ? (
                                  result.sourceCode as {
                                    files?: { path: string }[];
                                  }
                                )?.files?.length || 0
                              : 0}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="font-bold">Bytecode:</span>
                          <span className="text-neon-orange">Available</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="font-bold">Length:</span>
                          <span>
                            {!result.verified && "bytecodeLength" in result
                              ? result.bytecodeLength || 0
                              : 0}{" "}
                            chars
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="font-bold">Functions:</span>
                          <span>
                            {!result.verified && "bytecodeAnalysis" in result
                              ? (
                                  result.bytecodeAnalysis as {
                                    selectors?: string[];
                                  }
                                )?.selectors?.length || 0
                              : 0}{" "}
                            detected
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="font-bold">Risk Level:</span>
                          <span
                            className={`font-bold ${
                              // Verified contract risk level from AI score
                              result.verified &&
                              (result as { aiOutput?: { score: number } })
                                .aiOutput?.score !== undefined
                                ? (result as { aiOutput: { score: number } })
                                    .aiOutput.score < 40
                                  ? "text-red-400"
                                  : (result as { aiOutput: { score: number } })
                                      .aiOutput.score < 60
                                  ? "text-orange-400"
                                  : (result as { aiOutput: { score: number } })
                                      .aiOutput.score < 80
                                  ? "text-yellow-400"
                                  : "text-green-400"
                                : result.verified
                                ? "text-gray-400"
                                : // Unverified contract risk level from bytecode analysis
                                !result.verified &&
                                  "bytecodeAnalysis" in result &&
                                  (
                                    result.bytecodeAnalysis as {
                                      risk?: { severity: string };
                                    }
                                  )?.risk?.severity === "critical"
                                ? "text-red-400"
                                : !result.verified &&
                                  "bytecodeAnalysis" in result &&
                                  (
                                    result.bytecodeAnalysis as {
                                      risk?: { severity: string };
                                    }
                                  )?.risk?.severity === "high"
                                ? "text-orange-400"
                                : !result.verified &&
                                  "bytecodeAnalysis" in result &&
                                  (
                                    result.bytecodeAnalysis as {
                                      risk?: { severity: string };
                                    }
                                  )?.risk?.severity === "medium"
                                ? "text-yellow-400"
                                : "text-green-400"
                            }`}
                          >
                            {result.verified &&
                            (result as { aiOutput?: { score: number } })
                              .aiOutput?.score !== undefined
                              ? (result as { aiOutput: { score: number } })
                                  .aiOutput.score < 40
                                ? "CRITICAL"
                                : (result as { aiOutput: { score: number } })
                                    .aiOutput.score < 60
                                ? "HIGH"
                                : (result as { aiOutput: { score: number } })
                                    .aiOutput.score < 80
                                ? "MEDIUM"
                                : "LOW"
                              : result.verified
                              ? "UNKNOWN"
                              : !result.verified && "bytecodeAnalysis" in result
                              ? (
                                  result.bytecodeAnalysis as {
                                    risk?: { severity: string };
                                  }
                                )?.risk?.severity?.toUpperCase() || "UNKNOWN"
                              : "UNKNOWN"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Analysis Status */}
              <div className="mt-6 sm:mt-8 p-4 bg-black/30 rounded-xl border border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center mb-2 gap-2 sm:gap-0">
                  <div className="flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-neon-purple" />
                    <h4 className="text-lg font-bold text-white">
                      AI Analysis Status
                    </h4>
                  </div>
                  {isLoading && (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neon-purple"></div>
                      <span className="ml-2 text-sm text-neon-purple">
                        Analyzing...
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="font-bold">Score:</span>
                    <span
                      className={`font-bold text-lg ${
                        (("aiOutput" in result && result.aiOutput?.score) ||
                          0) >= 80
                          ? "text-green-400"
                          : (("aiOutput" in result && result.aiOutput?.score) ||
                              0) >= 60
                          ? "text-yellow-400"
                          : (("aiOutput" in result && result.aiOutput?.score) ||
                              0) >= 40
                          ? "text-orange-400"
                          : "text-red-400"
                      }`}
                    >
                      {"aiOutput" in result ? result.aiOutput?.score || 0 : 0}
                      /100
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="font-bold">Risk Level:</span>
                    <span
                      className={`font-bold ${
                        // Verified contract risk level from AI score
                        result.verified &&
                        (result as unknown as { aiOutput?: { score: number } })
                          .aiOutput?.score !== undefined
                          ? (
                              result as unknown as {
                                aiOutput: { score: number };
                              }
                            ).aiOutput.score < 40
                            ? "text-red-400"
                            : (
                                result as unknown as {
                                  aiOutput: { score: number };
                                }
                              ).aiOutput.score < 60
                            ? "text-orange-400"
                            : (
                                result as unknown as {
                                  aiOutput: { score: number };
                                }
                              ).aiOutput.score < 80
                            ? "text-yellow-400"
                            : "text-green-400"
                          : result.verified
                          ? "text-gray-400"
                          : // Unverified contract risk level from bytecode analysis
                          !result.verified &&
                            "bytecodeAnalysis" in result &&
                            (
                              result.bytecodeAnalysis as {
                                risk?: { severity: string };
                              }
                            )?.risk?.severity === "critical"
                          ? "text-red-400"
                          : !result.verified &&
                            "bytecodeAnalysis" in result &&
                            (
                              result.bytecodeAnalysis as {
                                risk?: { severity: string };
                              }
                            )?.risk?.severity === "high"
                          ? "text-orange-400"
                          : !result.verified &&
                            "bytecodeAnalysis" in result &&
                            (
                              result.bytecodeAnalysis as {
                                risk?: { severity: string };
                              }
                            )?.risk?.severity === "medium"
                          ? "text-yellow-400"
                          : "text-green-400"
                      }`}
                    >
                      {result.verified &&
                      (result as unknown as { aiOutput?: { score: number } })
                        .aiOutput?.score !== undefined
                        ? (result as unknown as { aiOutput: { score: number } })
                            .aiOutput.score < 40
                          ? "CRITICAL"
                          : (
                              result as unknown as {
                                aiOutput: { score: number };
                              }
                            ).aiOutput.score < 60
                          ? "HIGH"
                          : (
                              result as unknown as {
                                aiOutput: { score: number };
                              }
                            ).aiOutput.score < 80
                          ? "MEDIUM"
                          : "LOW"
                        : result.verified
                        ? "UNKNOWN"
                        : !result.verified && "bytecodeAnalysis" in result
                        ? (
                            result.bytecodeAnalysis as {
                              risk?: { severity: string };
                            }
                          )?.risk?.severity?.toUpperCase() || "UNKNOWN"
                        : "UNKNOWN"}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                    {"aiOutput" in result
                      ? result.aiOutput?.reason || "Analysis pending..."
                      : "Analysis pending..."}
                  </p>

                  <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                      <strong>Note:</strong> This analysis is powered by the 0G
                      Compute Network. The AI examines the contract&apos;s
                      source code, bytecode, and function selectors to provide
                      comprehensive security insights and recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Community Comments */}
            <CommentsSection
              contractAddress={result.address}
              chainId={result.chainId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      }
    >
      <AnalyzeContent />
    </Suspense>
  );
}
