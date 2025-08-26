"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AddressInput } from "../../features/contractSearch/components/AddressInput";
import { useContractSearch } from "../../features/contractSearch/hooks/useContractSearch";
import { MOCK_ANALYSIS_RESULTS } from "../../shared/lib/constants";
import { MatrixRain } from "../../shared/components/MatrixRain";
import { DevelopmentBanner } from "../../shared/components/DevelopmentBanner";
import { Eye, Brain, Database } from "lucide-react";
import {
  ContractSource,
  RiskAnalysisResult,
} from "../../shared/lib/fetchers/contractSource";

function AnalyzeContent() {
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

  const [showDemo, setShowDemo] = useState(false);

  // Set address from URL parameter if available
  useEffect(() => {
    if (urlAddress && !address) {
      setAddress(urlAddress);
    }
  }, [urlAddress, address, setAddress]);

  // Handle demo button click
  const handleDemo = () => {
    setAddress(MOCK_ANALYSIS_RESULTS.completed.address);
    setShowDemo(true);
  };

  // Auto-search when demo is enabled
  useEffect(() => {
    if (showDemo && address === MOCK_ANALYSIS_RESULTS.completed.address) {
      searchContract();
      setShowDemo(false);
    }
  }, [showDemo, address, searchContract]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Matrix Rain Background */}
      <MatrixRain gridSize={24} minDurationSec={15} maxDurationSec={25} />

      {/* Grid Pattern Overlay */}
      <div className="grid-pattern absolute inset-0 pointer-events-none"></div>

      {/* Development Banner */}
      <div className="relative z-20">
        <DevelopmentBanner />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="p-6 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full glow-blue">
              <Eye className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 neon-text neon-blue">
            Contract Security Analysis
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            The <span className="text-owl-gold font-bold">OWL</span> watches
            over your smart contracts. Enter an address and get an AI-powered
            security score.
          </p>
        </div>

        {/* Demo Button */}
        <div className="text-center mb-12">
          <button
            onClick={handleDemo}
            className="btn-cyberpunk px-8 py-4 text-lg rounded-xl hover-glow transform hover:scale-105 transition-all duration-300"
          >
            <span className="flex items-center">
              <Brain className="mr-3 h-6 w-6" />
              Try with Demo Contract
            </span>
          </button>
        </div>

        {/* Address Input */}
        <div className="mb-16">
          <AddressInput
            value={address}
            onChange={setAddress}
            onSearch={searchContract}
            isLoading={isLoading}
            error={error || undefined}
            placeholder="0x1234567890123456789012345678901234567890"
          />
          {error && (
            <div className="mt-6 text-center">
              <button
                onClick={clearError}
                className="text-neon-blue hover:text-neon-purple text-sm font-medium transition-colors"
              >
                Clear Error
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-12">
            {/* Contract Info Card */}
            <div className="max-w-4xl mx-auto">
              <div className="glass-card rounded-2xl border border-neon-blue/30 p-8">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full glow-blue mr-4">
                    <Eye className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white neon-text neon-blue">
                      Contract Analysis
                    </h3>
                    <p className="text-sm text-gray-400 font-mono">
                      {result.address}
                    </p>
                  </div>
                </div>

                {/* Contract Source Info */}
                {result.verified === true && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-neon-green">✅ Verified</span>
                      {(result as ContractSource).contractName && (
                        <span className="text-gray-300">
                          Name: {(result as ContractSource).contractName}
                        </span>
                      )}
                      {(result as ContractSource).compilerVersion && (
                        <span className="text-gray-300">
                          Compiler: {(result as ContractSource).compilerVersion}
                        </span>
                      )}
                    </div>

                    {/* Files */}
                    {(result as ContractSource).files &&
                      (result as ContractSource).files.length > 0 && (
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-3">
                            Source Files (
                            {(result as ContractSource).files.length})
                          </h4>
                          <div className="space-y-2">
                            {(result as ContractSource).files
                              .slice(0, 5)
                              .map((file, index) => (
                                <div
                                  key={index}
                                  className="bg-black/30 rounded-lg p-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-neon-blue font-mono text-sm">
                                      {file.path}
                                    </span>
                                    <span className="text-gray-400 text-xs">
                                      {file.content.length} chars
                                    </span>
                                  </div>
                                </div>
                              ))}
                            {(result as ContractSource).files.length > 5 && (
                              <p className="text-gray-400 text-sm text-center">
                                ... and{" "}
                                {(result as ContractSource).files.length - 5}{" "}
                                more files
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Risk Analysis Info */}
                {result.verified === false && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-neon-orange">⚠️ Unverified</span>
                      <span className="text-gray-300">
                        Bytecode:{" "}
                        {(result as RiskAnalysisResult).bytecodeLength ||
                          "Unknown"}{" "}
                        bytes
                      </span>
                    </div>

                    {/* Selectors */}
                    {(result as RiskAnalysisResult).selectors &&
                      (result as RiskAnalysisResult).selectors.length > 0 && (
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-3">
                            Function Selectors (
                            {(result as RiskAnalysisResult).selectors.length})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {(result as RiskAnalysisResult).selectors
                              .slice(0, 12)
                              .map((selector: string, index: number) => (
                                <div
                                  key={index}
                                  className="bg-black/30 rounded-lg p-2 text-center"
                                >
                                  <span className="text-neon-purple font-mono text-xs">
                                    {selector}
                                  </span>
                                </div>
                              ))}
                            {(result as RiskAnalysisResult).selectors.length >
                              12 && (
                              <p className="text-gray-400 text-sm text-center col-span-full">
                                ... and{" "}
                                {(result as RiskAnalysisResult).selectors
                                  .length - 12}{" "}
                                more selectors
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Opcodes */}
                    {(result as RiskAnalysisResult).opcodeCounters && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">
                          Opcode Analysis
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(
                            (result as RiskAnalysisResult).opcodeCounters
                          ).map(([opcode, count]) => (
                            <div
                              key={opcode}
                              className="bg-black/30 rounded-lg p-2 text-center"
                            >
                              <span className="text-neon-green text-sm font-medium">
                                {opcode}
                              </span>
                              <div className="text-white font-bold">
                                {count}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Risk Assessment */}
                    {(result as RiskAnalysisResult).risk && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">
                          Risk Assessment
                        </h4>
                        <div className="flex items-center space-x-3 mb-3">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                              (result as RiskAnalysisResult).risk.severity ===
                              "high"
                                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                : (result as RiskAnalysisResult).risk
                                    .severity === "medium"
                                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                                : (result as RiskAnalysisResult).risk
                                    .severity === "low"
                                ? "bg-green-500/20 text-green-400 border border-green-500/40"
                                : "bg-gray-500/20 text-gray-400 border border-gray-500/40"
                            }`}
                          >
                            {(
                              result as RiskAnalysisResult
                            ).risk.severity.toUpperCase()}{" "}
                            RISK
                          </span>
                        </div>
                        {(result as RiskAnalysisResult).risk.risks.length >
                          0 && (
                          <div className="space-y-2">
                            <h5 className="text-md font-semibold text-white">
                              Detected Risks:
                            </h5>
                            <ul className="space-y-1">
                              {(result as RiskAnalysisResult).risk.risks.map(
                                (risk: string, index: number) => (
                                  <li
                                    key={index}
                                    className="text-gray-300 text-sm flex items-center"
                                  >
                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                                    {risk}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 0G Network Info */}
            <div className="max-w-4xl mx-auto glass-card border border-neon-blue/30 rounded-xl p-8">
              <div className="flex items-center mb-4">
                <Database className="h-8 w-8 text-neon-blue mr-4" />
                <h3 className="text-xl font-semibold text-white neon-text neon-blue">
                  🔒 Secure Storage on 0G Network
                </h3>
              </div>
              <p className="text-gray-300 leading-relaxed">
                This analysis result is permanently stored on the 0G
                Network&apos;s Storage + Data Availability layer. The result is
                transparently verifiable and immutable. When the same contract
                address is queried again, the reliable score is returned without
                re-processing.
              </p>
            </div>
          </div>
        )}

        {/* How It Works Info */}
        {!result && (
          <div className="max-w-5xl mx-auto glass-card rounded-xl shadow-md border border-neon-blue/30 p-10">
            <h3 className="text-3xl font-bold text-white mb-8 text-center neon-text neon-purple">
              How the OWL Works
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-neon-blue/20 rounded-full flex items-center justify-center mx-auto mb-6 glow-blue">
                  <span className="text-2xl font-bold text-neon-blue">1</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-3">
                  Enter Address
                </h4>
                <p className="text-gray-400 leading-relaxed">
                  Enter the Ethereum address of the smart contract you want to
                  analyze
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-neon-purple/20 rounded-full flex items-center justify-center mx-auto mb-6 glow-purple">
                  <span className="text-2xl font-bold text-neon-purple">2</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-3">
                  AI Analysis
                </h4>
                <p className="text-gray-400 leading-relaxed">
                  AI model analyzes the contract code and generates a security
                  score
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-neon-green/20 rounded-full flex items-center justify-center mx-auto mb-6 glow-green">
                  <span className="text-2xl font-bold text-neon-green">3</span>
                </div>
                <h4 className="text-xl font-semibold text-white mb-3">
                  Results
                </h4>
                <p className="text-gray-400 leading-relaxed">
                  Score and findings are permanently stored on the 0G Network
                </p>
              </div>
            </div>
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
