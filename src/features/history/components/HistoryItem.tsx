import { Clock, MessageCircle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { formatTimestamp, shortenAddress } from "../../../shared/lib/utils";
import { CommentsSection } from "../../community/components/CommentsSection";
import { useState } from "react";

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
  const [showComments, setShowComments] = useState(false);
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

        {/* Comments Toggle Button */}
        <div className="mt-4 pt-4 border-t border-gray-600">
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
