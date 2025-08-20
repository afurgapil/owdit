"use client";

import { useState } from "react";
import { Clock, Search, FileText, History, Database } from "lucide-react";
import { MOCK_ANALYSIS_RESULTS } from "../../shared/lib/constants";
import { formatTimestamp, shortenAddress } from "../../shared/lib/utils";
import { MatrixRain } from "../../shared/components/MatrixRain";
import { DevelopmentBanner } from "../../shared/components/DevelopmentBanner";

export default function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock history data - in the future this will come from 0G Storage
  const mockHistory = [
    MOCK_ANALYSIS_RESULTS.completed, // Score: 78 (Medium Risk - should be neon-orange)
    {
      ...MOCK_ANALYSIS_RESULTS.completed,
      address: "0x9876543210987654321098765432109876543210",
      score: 92, // Low Risk - should be neon-green
      level: "low" as const,
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
      ...MOCK_ANALYSIS_RESULTS.completed,
      address: "0xabcdef1234567890abcdef1234567890abcdef12",
      score: 45, // High Risk - should be neon-pink
      level: "high" as const,
      timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    },
  ];

  const filteredHistory = mockHistory.filter((item) =>
    item.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="p-6 bg-gradient-to-r from-neon-green to-neon-blue rounded-full glow-green">
              <History className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 neon-text neon-green">
            Analysis History
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            The <span className="text-owl-gold font-bold">OWL</span> keeps track
            of all analyzed contracts. Browse security scores and findings from
            previous analyses.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-neon-blue" />
            <input
              type="text"
              placeholder="Search contract address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-neon-blue rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-purple focus:border-neon-purple transition-all duration-300 input-cyberpunk bg-black/50 backdrop-blur-xl text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* History List */}
        <div className="space-y-8">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-xl border border-neon-blue/30">
              <FileText className="h-20 w-20 text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-medium text-white mb-4">
                No analysis found
              </h3>
              <p className="text-gray-400 text-lg">
                {searchTerm
                  ? "No analysis matches your search criteria"
                  : "No contract analysis has been performed yet"}
              </p>
            </div>
          ) : (
            filteredHistory.map((item, index) => (
              <div
                key={index}
                className="glass-card rounded-xl shadow-md border border-neon-blue/30 p-8 hover:shadow-lg transition-all duration-300 card-hover-glow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <Clock className="h-6 w-6 text-neon-blue" />
                      <span className="text-sm text-gray-400 font-mono">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-3 neon-text neon-purple">
                      {shortenAddress(item.address)}
                    </h3>

                    <div className="flex items-center space-x-6 mb-6">
                      <div className="flex items-center space-x-3">
                        <span
                          className="text-3xl font-bold"
                          style={{
                            color:
                              item.score >= 80
                                ? "#00ff41"
                                : item.score >= 60
                                ? "#ff6b35"
                                : item.score >= 40
                                ? "#ff0080"
                                : "#ff4757",
                          }}
                        >
                          {item.score}
                        </span>
                        <span className="text-sm text-gray-400">/ 100</span>
                      </div>

                      <span
                        className="px-4 py-2 rounded-full text-sm font-bold border-2"
                        style={{
                          backgroundColor:
                            item.score >= 80
                              ? "rgba(0, 255, 65, 0.2)"
                              : item.score >= 60
                              ? "rgba(255, 107, 53, 0.2)"
                              : item.score >= 40
                              ? "rgba(255, 0, 128, 0.2)"
                              : "rgba(255, 71, 87, 0.2)",
                          color:
                            item.score >= 80
                              ? "#00ff41"
                              : item.score >= 60
                              ? "#ff6b35"
                              : item.score >= 40
                              ? "#ff0080"
                              : "#ff4757",
                          borderColor:
                            item.score >= 80
                              ? "rgba(0, 255, 65, 0.4)"
                              : item.score >= 60
                              ? "rgba(255, 107, 53, 0.4)"
                              : item.score >= 40
                              ? "rgba(255, 0, 128, 0.4)"
                              : "rgba(255, 71, 87, 0.4)",
                        }}
                      >
                        {item.score >= 80
                          ? "Low Risk"
                          : item.score >= 60
                          ? "Medium Risk"
                          : item.score >= 40
                          ? "High Risk"
                          : "Critical Risk"}
                      </span>
                    </div>

                    {item.findings.length > 0 && (
                      <div className="text-sm text-gray-400">
                        <span className="font-medium">
                          {item.findings.length} security findings
                        </span>{" "}
                        detected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Box */}
        <div className="mt-16 max-w-4xl mx-auto glass-card border border-neon-blue/30 rounded-xl p-8">
          <div className="flex items-center mb-6">
            <Database className="h-8 w-8 text-neon-blue mr-4" />
            <h3 className="text-xl font-semibold text-white neon-text neon-blue">
              📊 About Analysis History
            </h3>
          </div>
          <p className="text-gray-300 leading-relaxed text-lg">
            This page lists security scores and findings of all previously
            analyzed contracts. All data is permanently stored on the 0G Network
            and is transparently verifiable. When the same contract address is
            queried again, the reliable score is returned without re-processing.
          </p>
        </div>
      </div>
    </div>
  );
}
