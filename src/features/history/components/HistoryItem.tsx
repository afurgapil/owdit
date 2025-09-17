import { Clock } from "lucide-react";
import { formatTimestamp, shortenAddress } from "../../../shared/lib/utils";

interface HistoryItemProps {
  item: {
    address: string;
    chainId: number;
    score: number;
    level: "low" | "medium" | "high";
    timestamp: string;
    contractName?: string;
    compilerVersion?: string;
    status: string;
    findings: unknown[];
  };
}

export function HistoryItem({ item }: HistoryItemProps) {
  // Get risk level styling
  const getRiskLevelStyle = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
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
    <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-6 hover:bg-gray-800/50 transition-colors">
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
          <p className="text-gray-400 font-mono text-sm mb-2">
            {shortenAddress(item.address)}
          </p>
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
    </div>
  );
}
