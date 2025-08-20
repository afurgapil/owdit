import React from "react";
import { Search, AlertCircle, Eye } from "lucide-react";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading?: boolean;
  error?: string;
  placeholder?: string;
}

export function AddressInput({
  value,
  onChange,
  onSearch,
  isLoading = false,
  error,
  placeholder = "0x...",
}: AddressInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSearch();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-neon-blue" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full pl-14 pr-32 py-4 border-2 rounded-xl text-base font-mono bg-black/50 backdrop-blur-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-purple focus:border-neon-purple transition-all duration-300 input-cyberpunk ${
              error
                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                : "border-neon-blue focus:ring-neon-purple focus:border-neon-purple"
            }`}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white text-sm font-bold rounded-lg hover:from-neon-purple hover:to-neon-blue focus:outline-none focus:ring-2 focus:ring-neon-green focus:ring-offset-2 focus:ring-offset-black transition-all duration-300 ${
              (!value.trim() || isLoading) && "opacity-50 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Analyze
              </span>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 flex items-center space-x-3 text-red-400 text-sm glass-card border border-red-500/30 rounded-lg p-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-center font-mono">
        Enter a valid Ethereum contract address (0x followed by 42 characters)
      </div>
    </div>
  );
}
