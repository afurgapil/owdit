"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AddressInput } from "../../features/contractSearch/components/AddressInput";
import { ScoreCard } from "../../features/analysisResult/components/ScoreCard";
import { ExplanationAccordion } from "../../features/analysisResult/components/ExplanationAccordion";
import { useContractSearch } from "../../features/contractSearch/hooks/useContractSearch";
import { MOCK_ANALYSIS_RESULTS } from "../../shared/lib/constants";
import { MatrixRain } from "../../shared/components/MatrixRain";
import { DevelopmentBanner } from "../../shared/components/DevelopmentBanner";
import { Eye, Brain, Database } from "lucide-react";

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
            {/* Score Card */}
            <div className="max-w-3xl mx-auto">
              <ScoreCard result={result} />
            </div>

            {/* Findings */}
            {result.status === "completed" && result.findings.length > 0 && (
              <div className="max-w-4xl mx-auto">
                <ExplanationAccordion items={result.findings} />
              </div>
            )}

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
