"use client";
import React, { useState } from "react";
import { Clock, MessageCircle, ChevronDown, ChevronUp, Copy, Check, Eye } from "lucide-react";
import { formatTimestamp } from "../../../shared/lib/utils";
import { CommentsSection } from "../../community/components/CommentsSection";
import { DeployerAnalysisCard } from "../../analysisResult/components/DeployerAnalysisCard";
import { InteractionAnalysisCard } from "../../analysisResult/components/InteractionAnalysisCard";
import { DeployerAnalysis, InteractionAnalysis } from "../../../types/contractAnalysis";
 

interface HistoryItemProps {
  item: {
    address: string;
    chainId: number;
    score: number;
    level: "low" | "medium" | "high" | "critical";
    timestamp: string;
    contractName?: string;
    compilerVersion?: string;
    status: string;
    findings: unknown[];
    overallRiskScore?: number;
    deployerAnalysis?: unknown;
    interactionAnalysis?: unknown;
  };
}

export function HistoryItem({ item }: HistoryItemProps) {
  const [showComments, setShowComments] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Get risk level styling
  const getRiskLevelStyle = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "critical":
        return "bg-red-600/20 text-red-300 border-red-600/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="bg-gray-800/30 border border-gray-600 rounded-lg hover:bg-gray-800/50 transition-colors">
      {/* Main Contract Info */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Contract Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">
                {item.contractName || "Unknown Contract"}
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskLevelStyle(
                  item.level
                )}`}
              >
                {item.level.toUpperCase()}
              </span>
            </div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-gray-400 font-mono text-sm break-all flex-1">
              {item.address}
            </p>
            <button
              onClick={() => copyToClipboard(item.address)}
              className="p-1 text-gray-400 hover:text-neon-blue transition-colors duration-200"
              title="Copy address"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
            {item.compilerVersion && (
              <p className="text-gray-500 text-xs">
                Compiler: {item.compilerVersion}
              </p>
            )}
          </div>

          {/* Score and Timestamp */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-end gap-4">
            <div className="text-right">
              <div className={`text-3xl font-bold ${getScoreColor(item.score)}`}>
                {item.score}
              </div>
              <div className="text-gray-400 text-sm">Security Score</div>
            </div>
            <div className="text-right">
              <div className="flex items-center text-gray-400 text-sm">
                <Clock className="h-4 w-4 mr-1" />
                {formatTimestamp(item.timestamp)}
              </div>
              <div className="text-gray-500 text-xs">
                Chain ID: {item.chainId}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-4 border-t border-gray-600">
          <div className="flex flex-wrap gap-4">
            {/* Detailed Analysis Button */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-gray-400 hover:text-neon-purple transition-colors duration-200"
            >
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">
                {showDetails ? "Hide Details" : "View Details"}
              </span>
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {/* Comments Toggle Button */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-gray-400 hover:text-neon-blue transition-colors duration-200"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {showComments ? "Hide Comments" : "View Comments"}
              </span>
              {commentsLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-neon-blue border-t-transparent"></div>
              ) : showComments ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Analysis Section */}
      {showDetails && (
        <div className="border-t border-gray-600 bg-gray-900/20">
          <div className="p-6 space-y-6">
            {/* Overall Risk Score */}
            {(() => {
              const riskScore = typeof item.overallRiskScore === 'number' ? item.overallRiskScore : 0;
              if (riskScore <= 0) return null;
              
              return (
                <div className="glass-card p-6 rounded-2xl border border-neon-blue/30">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-4 neon-text neon-blue">
                      Overall Risk Assessment
                    </h3>
                    <div className="flex items-center justify-center mb-4">
                      <div
                        className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black border-4 ${
                          riskScore >= 80
                            ? "bg-neon-green/20 border-neon-green/40 text-neon-green"
                            : riskScore >= 60
                            ? "bg-neon-orange/20 border-neon-orange/40 text-neon-orange"
                            : riskScore >= 40
                            ? "bg-neon-pink/20 border-neon-pink/40 text-neon-pink"
                            : "bg-red-500/20 border-red-500/40 text-red-400"
                        } glow-owl`}
                      >
                        {riskScore}
                      </div>
                    </div>
                    <p className="text-lg text-gray-300">
                      Combined risk score based on bytecode, deployer, and interaction analysis
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Deployer Analysis */}
            {(() => {
              if (!item.deployerAnalysis || typeof item.deployerAnalysis !== 'object') return null;
              return (
                <DeployerAnalysisCard 
                  deployerAnalysis={item.deployerAnalysis as DeployerAnalysis} 
                  className="mb-6"
                />
              );
            })()}

            {/* Interaction Analysis */}
            {(() => {
              if (!item.interactionAnalysis || typeof item.interactionAnalysis !== 'object') return null;
              return (
                <InteractionAnalysisCard 
                  interactionAnalysis={item.interactionAnalysis as InteractionAnalysis} 
                  className="mb-6"
                />
              );
            })()}

            {/* Basic Contract Info */}
            <div className="glass-card p-6 rounded-2xl border border-neon-blue/30">
              <h3 className="text-xl font-bold text-white mb-4 neon-text neon-cyan">
                Contract Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-300">Address:</span>
                  <div className="font-mono text-sm text-white break-all">
                    {item.address}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-300">Chain ID:</span>
                  <div className="text-white">{item.chainId}</div>
                </div>
                {item.contractName && (
                  <div>
                    <span className="text-sm font-medium text-gray-300">Contract Name:</span>
                    <div className="text-white">{item.contractName}</div>
                  </div>
                )}
                {item.compilerVersion && (
                  <div>
                    <span className="text-sm font-medium text-gray-300">Compiler Version:</span>
                    <div className="text-white">{item.compilerVersion}</div>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-300">Analysis Date:</span>
                  <div className="text-white">{formatTimestamp(item.timestamp)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-600 bg-gray-900/20">
          <div className="p-6">
            <CommentsSection 
              contractAddress={item.address} 
              chainId={item.chainId}
              onLoadingChange={setCommentsLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
