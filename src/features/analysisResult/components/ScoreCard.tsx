import React from "react";
import {
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Database,
} from "lucide-react";
import { formatTimestamp, getRiskLevelText } from "../../../shared/lib/utils";
import { AnalysisResult } from "../../../shared/lib/zodSchemas";

interface ScoreCardProps {
  result: AnalysisResult;
  className?: string;
}

export function ScoreCard({ result, className }: ScoreCardProps) {
  const getStatusIcon = () => {
    switch (result.status) {
      case "completed":
        return <CheckCircle className="h-6 w-6 text-neon-green" />;
      case "pending":
        return <Clock className="h-6 w-6 text-neon-orange" />;
      case "failed":
        return <AlertTriangle className="h-6 w-6 text-neon-pink" />;
      default:
        return <Clock className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (result.status) {
      case "completed":
        return "Analysis Complete";
      case "pending":
        return "Analysis in Progress";
      case "failed":
        return "Analysis Failed";
      default:
        return "Unknown Status";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-neon-green";
    if (score >= 60) return "text-neon-orange";
    if (score >= 40) return "text-neon-pink";
    return "text-neon-red";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-neon-green/20 border-neon-green/40";
    if (score >= 60) return "bg-neon-orange/20 border-neon-orange/40";
    if (score >= 40) return "bg-neon-pink/20 border-neon-pink/40";
    return "bg-red-500/20 border-red-500/40";
  };

  return (
    <div
      className={`glass-card rounded-2xl border border-neon-blue/30 p-8 hover-glow transition-all duration-300 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full glow-blue">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white neon-text neon-blue">
              Security Score
            </h3>
            <p className="text-sm text-gray-400 font-mono">
              Contract: {result.address}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <span className="text-sm font-bold text-white">
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Score Display */}
      <div className="mb-8">
        <div className="flex items-center justify-center mb-6">
          <div
            className={`w-40 h-40 rounded-full flex items-center justify-center text-6xl font-black border-4 ${getScoreBgColor(
              result.score
            )} ${getScoreColor(result.score)} glow-owl`}
          >
            {result.score}
          </div>
        </div>
        <div className="text-center">
          <p
            className={`text-xl font-bold px-6 py-2 rounded-full inline-block border-2 ${getScoreBgColor(
              result.score
            )} ${getScoreColor(result.score)}`}
          >
            {getRiskLevelText(result.score)}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4">
        <div className="flex justify-between items-center py-3 border-b border-neon-blue/20">
          <span className="text-sm font-medium text-gray-300">
            Analysis Date:
          </span>
          <span className="text-sm text-white font-mono">
            {formatTimestamp(result.timestamp)}
          </span>
        </div>

        {result.status === "completed" && result.findings.length > 0 && (
          <div className="py-3 border-b border-neon-blue/20">
            <span className="text-sm font-medium text-gray-300">Findings:</span>
            <span className="text-sm text-white ml-3 font-mono">
              {result.findings.length} security findings
            </span>
          </div>
        )}
      </div>

      {/* 0G Network Info */}
      <div className="mt-6 p-4 bg-neon-blue/10 rounded-xl border border-neon-blue/30">
        <div className="flex items-center space-x-3">
          <Database className="h-5 w-5 text-neon-blue" />
          <p className="text-xs text-gray-300 text-center">
            This score is permanently stored on the{" "}
            <span className="text-neon-blue font-bold">0G Network</span> and is
            transparently verifiable.
          </p>
        </div>
      </div>
    </div>
  );
}
