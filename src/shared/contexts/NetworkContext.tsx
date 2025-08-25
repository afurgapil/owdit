"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Chain, getDefaultChain, getActiveChains } from "../lib/chains";

interface NetworkContextType {
  selectedChain: Chain;
  setSelectedChain: (chain: Chain) => void;
  availableChains: Chain[];
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const [selectedChain, setSelectedChain] = useState<Chain>(getDefaultChain());

  // Get all active chains (currently only Ethereum)
  const availableChains = getActiveChains();

  const value: NetworkContextType = {
    selectedChain,
    setSelectedChain,
    availableChains,
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
