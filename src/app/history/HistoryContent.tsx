"use client";

import {
  Search,
  FileText,
  History,
  Database,
  RefreshCw,
  AlertCircle,
  Clock,
} from "lucide-react";
import { MatrixRain } from "../../shared/components/MatrixRain";
import {
  useHistory,
  ITEMS_PER_PAGE,
} from "../../features/history/hooks/useHistory";
import { HistoryItem } from "../../features/history/components/HistoryItem";

export function HistoryContent() {
  const {
    historyData,
    loading,
    error,
    currentPage,
    isRefreshing,
    searchTerm,
    setSearchTerm,
    handleRefresh,
    handlePageChange,
  } = useHistory();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Matrix Rain Background */}
      <MatrixRain gridSize={24} minDurationSec={15} maxDurationSec={25} />

      {/* Grid Pattern Overlay */}
      <div className="grid-pattern absolute inset-0 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <History className="h-12 w-12 text-neon-blue mr-4" />
            <h1 className="text-5xl font-bold text-white">
              Analysis <span className="text-neon-blue">History</span>
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            View all your smart contract security analyses in one place
          </p>
        </div>

        {/* Search and Stats */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by address or contract name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-6 py-3 bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded-lg hover:bg-neon-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {/* Stats */}
          {historyData?.stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-neon-blue mr-2" />
                  <span className="text-gray-300">Total Cached</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {historyData.stats.totalCached}
                </div>
              </div>
              <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-orange-400 mr-2" />
                  <span className="text-gray-300">Upgradeable</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {historyData.stats.upgradeableCached}
                </div>
              </div>
              <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-red-400 mr-2" />
                  <span className="text-gray-300">Expired</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {historyData.stats.expiredCached}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue"></div>
            <p className="text-gray-300 mt-4">Loading history...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 text-lg">{error}</p>
            <button
              onClick={() => handlePageChange(0)}
              className="mt-4 px-6 py-2 bg-neon-blue/20 text-neon-blue border border-neon-blue/30 rounded-lg hover:bg-neon-blue/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !historyData?.history.length ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No analysis history found</p>
            <p className="text-gray-500 mt-2">
              {searchTerm
                ? "Try a different search term"
                : "Start by analyzing a contract"}
            </p>
          </div>
        ) : (
          <>
            {/* History List */}
            <div className="space-y-4 mb-8">
              {historyData.history.map((item, index) => (
                <HistoryItem
                  key={`${item.address}-${item.chainId}-${index}`}
                  item={item}
                />
              ))}
            </div>

            {/* Pagination */}
            {historyData.pagination.total > ITEMS_PER_PAGE && (
              <div className="flex justify-center items-center gap-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="px-4 py-2 bg-gray-800/50 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                <span className="text-gray-300">
                  Page {currentPage + 1} of{" "}
                  {Math.ceil(historyData.pagination.total / ITEMS_PER_PAGE)}
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!historyData.pagination.hasMore}
                  className="px-4 py-2 bg-gray-800/50 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
