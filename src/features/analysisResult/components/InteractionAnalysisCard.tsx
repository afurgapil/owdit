import React from "react";
import { Activity, Users, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { InteractionAnalysis } from "../../../types/contractAnalysis";

interface InteractionAnalysisCardProps {
  interactionAnalysis: InteractionAnalysis;
  className?: string;
}

export function InteractionAnalysisCard({ interactionAnalysis, className }: InteractionAnalysisCardProps) {
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "text-neon-green";
      case "medium":
        return "text-neon-orange";
      case "high":
        return "text-neon-pink";
      default:
        return "text-gray-400";
    }
  };

  const getRiskLevelBgColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "bg-neon-green/20 border-neon-green/40";
      case "medium":
        return "bg-neon-orange/20 border-neon-orange/40";
      case "high":
        return "bg-neon-pink/20 border-neon-pink/40";
      default:
        return "bg-gray-500/20 border-gray-500/40";
    }
  };

  const getActivityLevelColor = (activityLevel: string) => {
    switch (activityLevel) {
      case "high":
        return "text-neon-green";
      case "medium":
        return "text-neon-orange";
      case "low":
        return "text-neon-pink";
      default:
        return "text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <div
      className={`glass-card rounded-2xl border border-neon-blue/30 p-6 hover-glow transition-all duration-300 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-3 bg-gradient-to-r from-neon-cyan to-neon-blue rounded-full glow-cyan">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white neon-text neon-cyan">
            Interaction Analysis
          </h3>
          <p className="text-sm text-gray-400">
            Contract usage and activity patterns
          </p>
        </div>
      </div>

      {/* Activity Level */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Activity Level</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              interactionAnalysis.activityLevel === "high"
                ? "bg-neon-green/20 border-neon-green/40 text-neon-green"
                : interactionAnalysis.activityLevel === "medium"
                ? "bg-neon-orange/20 border-neon-orange/40 text-neon-orange"
                : "bg-neon-pink/20 border-neon-pink/40 text-neon-pink"
            }`}
          >
            {interactionAnalysis.activityLevel.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-neon-blue/10 rounded-lg border border-neon-blue/20">
          <div className="flex items-center justify-center mb-1">
            <Activity className="h-4 w-4 text-neon-blue mr-1" />
            <span className="text-sm text-gray-300">Transactions</span>
          </div>
          <span className="text-lg font-bold text-white">
            {interactionAnalysis.totalTransactions.toLocaleString()}
          </span>
        </div>

        <div className="text-center p-3 bg-neon-green/10 rounded-lg border border-neon-green/20">
          <div className="flex items-center justify-center mb-1">
            <Users className="h-4 w-4 text-neon-green mr-1" />
            <span className="text-sm text-gray-300">Unique Users</span>
          </div>
          <span className="text-lg font-bold text-white">
            {interactionAnalysis.uniqueUsers.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Transaction Volume */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <TrendingUp className="h-4 w-4 text-neon-orange" />
          <span className="text-sm font-medium text-gray-300">Transaction Volume</span>
        </div>
        <div className="text-sm text-white">
          <div className="flex justify-between">
            <span>Total Volume:</span>
            <span className="font-mono">{interactionAnalysis.transactionVolume.toFixed(4)} ETH</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Avg per Day:</span>
            <span className="font-mono">{interactionAnalysis.averageTxPerDay.toFixed(2)} tx/day</span>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <Clock className="h-4 w-4 text-neon-purple" />
          <span className="text-sm font-medium text-gray-300">Activity Timeline</span>
        </div>
        <div className="text-sm text-white">
          <div className="flex justify-between">
            <span>Last Activity:</span>
            <span className="font-mono">{formatDate(interactionAnalysis.lastActivity)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Time:</span>
            <span className="font-mono">{formatTime(interactionAnalysis.lastActivity)}</span>
          </div>
          {interactionAnalysis.firstTransactionDate && (
            <div className="flex justify-between text-gray-400">
              <span>First Activity:</span>
              <span className="font-mono">{formatDate(interactionAnalysis.firstTransactionDate)}</span>
            </div>
          )}
          {interactionAnalysis.peakActivityPeriod && (
            <div className="flex justify-between text-gray-400">
              <span>Peak Hours:</span>
              <span className="font-mono">{interactionAnalysis.peakActivityPeriod}</span>
            </div>
          )}
        </div>
      </div>

      {/* User Retention */}
      {interactionAnalysis.userRetentionRate !== undefined && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">User Retention Rate</span>
            <span className="text-sm font-bold text-white">
              {Math.round(interactionAnalysis.userRetentionRate * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all duration-500"
              style={{ width: `${interactionAnalysis.userRetentionRate * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Risk Level */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Risk Level</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskLevelBgColor(
              interactionAnalysis.riskLevel
            )} ${getRiskLevelColor(interactionAnalysis.riskLevel)}`}
          >
            {interactionAnalysis.riskLevel.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Risk Indicators */}
      {interactionAnalysis.riskIndicators.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-neon-pink" />
            <span className="text-sm font-medium text-gray-300">Risk Indicators</span>
          </div>
          <div className="space-y-1">
            {interactionAnalysis.riskIndicators.map((indicator, index) => (
              <div
                key={index}
                className="text-xs text-neon-pink bg-neon-pink/10 px-2 py-1 rounded border border-neon-pink/20"
              >
                {indicator}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
