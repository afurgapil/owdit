import { useState, useEffect } from "react";

interface HistoryItem {
  address: string;
  chainId: number;
  score: number;
  level: "low" | "medium" | "high";
  timestamp: string;
  contractName?: string;
  compilerVersion?: string;
  status: string;
  findings: unknown[];
}

interface HistoryData {
  history: HistoryItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats: {
    totalCached: number;
    upgradeableCached: number;
    expiredCached: number;
  };
}

interface UseHistoryReturn {
  historyData: HistoryData | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  isRefreshing: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleRefresh: () => void;
  handlePageChange: (page: number) => void;
  fetchHistory: (page?: number, search?: string) => Promise<void>;
}

export const ITEMS_PER_PAGE = 10;

export function useHistory(): UseHistoryReturn {
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch history data
  const fetchHistory = async (page: number = 0, search: string = "") => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: (page * ITEMS_PER_PAGE).toString(),
        ...(search && { search }),
      });

      const response = await fetch(`/api/history?${params}`);
      const data = await response.json();

      if (data.success) {
        setHistoryData(data.data);
        setCurrentPage(page);
      } else {
        setError(data.error || "Failed to fetch history");
      }
    } catch (err) {
      console.error("Error fetching history:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    fetchHistory(0, term);
  };

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchHistory(currentPage, searchTerm);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchHistory(page, searchTerm);
  };

  // Initial load
  useEffect(() => {
    fetchHistory(0, searchTerm);
  }, []);

  return {
    historyData,
    loading,
    error,
    currentPage,
    isRefreshing,
    searchTerm,
    setSearchTerm: handleSearch,
    handleRefresh,
    handlePageChange,
    fetchHistory,
  };
}
