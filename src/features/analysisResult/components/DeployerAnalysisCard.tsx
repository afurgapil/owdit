import React from "react";
import { User, Shield, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { DeployerAnalysis } from "../../../types/contractAnalysis";

interface DeployerAnalysisCardProps {
  deployerAnalysis: DeployerAnalysis;
  className?: string;
}

export function DeployerAnalysisCard({ deployerAnalysis, className }: DeployerAnalysisCardProps) {
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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div
      className={`glass-card rounded-2xl border border-neon-blue/30 p-6 hover-glow transition-all duration-300 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-3 bg-gradient-to-r from-neon-purple to-neon-pink rounded-full glow-purple">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white neon-text neon-purple">
            Deployer Analysis
          </h3>
          <p className="text-sm text-gray-400 font-mono">
            {formatAddress(deployerAnalysis.address)}
          </p>
        </div>
      </div>

      {/* Reputation Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Reputation Score</span>
          <span className={`text-2xl font-bold ${getRiskLevelColor(deployerAnalysis.riskLevel)}`}>
            {deployerAnalysis.reputationScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              deployerAnalysis.reputationScore >= 80
                ? "bg-gradient-to-r from-neon-green to-green-400"
                : deployerAnalysis.reputationScore >= 60
                ? "bg-gradient-to-r from-neon-orange to-orange-400"
                : "bg-gradient-to-r from-neon-pink to-pink-400"
            }`}
            style={{ width: `${deployerAnalysis.reputationScore}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-neon-blue/10 rounded-lg border border-neon-blue/20">
          <div className="flex items-center justify-center mb-1">
            <Shield className="h-4 w-4 text-neon-blue mr-1" />
            <span className="text-sm text-gray-300">Contracts</span>
          </div>
          <span className="text-lg font-bold text-white">
            {deployerAnalysis.contractCount}
          </span>
        </div>

        <div className="text-center p-3 bg-neon-green/10 rounded-lg border border-neon-green/20">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="h-4 w-4 text-neon-green mr-1" />
            <span className="text-sm text-gray-300">Success Rate</span>
          </div>
          <span className="text-lg font-bold text-white">
            {Math.round(deployerAnalysis.successRate * 100)}%
          </span>
        </div>
      </div>

      {/* Experience */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <Calendar className="h-4 w-4 text-neon-blue" />
          <span className="text-sm font-medium text-gray-300">Experience</span>
        </div>
        <div className="text-sm text-white">
          <div className="flex justify-between">
            <span>Days since first deploy:</span>
            <span className="font-mono">{Math.round(deployerAnalysis.timeSinceFirstDeploy)} days</span>
          </div>
          {deployerAnalysis.firstDeployDate && (
            <div className="flex justify-between text-gray-400">
              <span>First deploy:</span>
              <span className="font-mono">{formatDate(deployerAnalysis.firstDeployDate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Risk Level */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Risk Level</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskLevelBgColor(
              deployerAnalysis.riskLevel
            )} ${getRiskLevelColor(deployerAnalysis.riskLevel)}`}
          >
            {deployerAnalysis.riskLevel.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Risk Indicators */}
      {deployerAnalysis.riskIndicators.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-neon-pink" />
            <span className="text-sm font-medium text-gray-300">Risk Indicators</span>
          </div>
          <div className="space-y-1">
            {deployerAnalysis.riskIndicators.map((indicator, index) => (
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

      {/* Volume Info */}
      {(deployerAnalysis.totalVolumeDeployed || deployerAnalysis.averageContractSize) && (
        <div className="text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Total Volume Deployed:</span>
            <span className="font-mono">
              {deployerAnalysis.totalVolumeDeployed?.toFixed(4) || 0} ETH
            </span>
          </div>
          <div className="flex justify-between">
            <span>Avg Contract Size:</span>
            <span className="font-mono">
              {deployerAnalysis.averageContractSize?.toFixed(4) || 0} ETH
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
