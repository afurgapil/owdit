"use client";

import React, { useState } from "react";
import { ChevronDown, Network } from "lucide-react";
import { useNetwork } from "../contexts/NetworkContext";
import { Chain } from "../lib/chains";

export function NetworkSelector() {
  const { selectedChain, availableChains, setSelectedChain } = useNetwork();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleChainSelect = (chain: Chain) => {
    setSelectedChain(chain);
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".network-selector")) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative network-selector">
      <button
        onClick={() =>
          availableChains.length > 1 && setIsDropdownOpen(!isDropdownOpen)
        }
        className="flex items-center space-x-2 px-4 py-2 bg-black/50 backdrop-blur-xl border border-neon-blue/40 rounded-lg text-white hover:bg-neon-blue/10 transition-all duration-300 group cursor-pointer w-40"
        disabled={availableChains.length <= 1}
      >
        <Network className="h-4 w-4 text-neon-blue flex-shrink-0" />
        <span className="text-sm font-medium min-w-0 flex-1 truncate">
          {selectedChain.name}
        </span>
        <span className="text-xs text-gray-400 font-mono flex-shrink-0">
          {selectedChain.currency}
        </span>
        {availableChains.length > 1 && (
          <ChevronDown
            className={`h-3 w-3 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* Network info tooltip */}
      <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-black/90 backdrop-blur-xl border border-neon-blue/40 rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-neon-green rounded-full"></div>
          <span>Connected to {selectedChain.name}</span>
        </div>
        <div className="text-gray-400 mt-1">
          Explorer: {selectedChain.explorer.replace("https://", "")}
        </div>
      </div>

      {/* Dropdown for multiple networks */}
      {isDropdownOpen && availableChains.length > 1 && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-black/90 backdrop-blur-xl border border-neon-blue/40 rounded-lg shadow-xl z-50">
          {availableChains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => handleChainSelect(chain)}
              className={`w-full px-4 py-3 text-left text-white hover:bg-neon-blue/10 transition-colors flex items-center justify-between ${
                chain.id === selectedChain.id
                  ? "bg-neon-blue/20 border-l-2 border-neon-blue"
                  : ""
              }`}
            >
              <span className="font-medium min-w-0 flex-1 truncate">
                {chain.name}
              </span>
              <span className="text-xs text-gray-400 font-mono ml-2 flex-shrink-0">
                {chain.currency}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
