// Network/Chain configurations
export interface Chain {
  id: number;
  name: string;
  currency: string;
  explorer: string;
  sourcify: boolean;
  etherscan: string;
  rpc: string;
  isActive: boolean;
}

export const SUPPORTED_CHAINS: Chain[] = [
  {
    id: 11155111,
    name: "Sepolia (Testnet)",
    currency: "ETH",
    explorer: "https://sepolia.etherscan.io",
    sourcify: true,
    etherscan: "https://api-sepolia.etherscan.io",
    rpc: "https://rpc.sepolia.org",
    isActive: true, // Enabled for testing
  },
  {
    id: 1,
    name: "Ethereum",
    currency: "ETH",
    explorer: "https://etherscan.io",
    sourcify: true,
    etherscan: "https://api.etherscan.io",
    rpc: "https://eth.llamarpc.com",
    isActive: true, // Default active network
  },

  {
    id: 17000,
    name: "Holesky (Testnet)",
    currency: "ETH",
    explorer: "https://holesky.etherscan.io",
    sourcify: true,
    etherscan: "https://api-holesky.etherscan.io",
    rpc: "https://ethereum-holesky.publicnode.com",
    isActive: true, // Enabled for testing
  },
  {
    id: 137,
    name: "Polygon",
    currency: "MATIC",
    explorer: "https://polygonscan.com",
    sourcify: true,
    etherscan: "https://api.polygonscan.com",
    rpc: "https://polygon.llamarpc.com",
    isActive: false, // Disabled for now
  },
  {
    id: 56,
    name: "BNB Smart Chain",
    currency: "BNB",
    explorer: "https://bscscan.com",
    sourcify: true,
    etherscan: "https://api.bscscan.com",
    rpc: "https://binance.llamarpc.com",
    isActive: false, // Disabled for now
  },
  {
    id: 42161,
    name: "Arbitrum One",
    currency: "ETH",
    explorer: "https://arbiscan.io",
    sourcify: true,
    etherscan: "https://api.arbiscan.io",
    rpc: "https://arbitrum.llamarpc.com",
    isActive: false, // Disabled for now
  },
  {
    id: 10,
    name: "Optimism",
    currency: "ETH",
    explorer: "https://optimistic.etherscan.io",
    sourcify: true,
    etherscan: "https://api-optimistic.etherscan.io",
    rpc: "https://optimism.llamarpc.com",
    isActive: false, // Disabled for now
  },
];

// Get default/active chain
export const getDefaultChain = (): Chain => {
  return (
    SUPPORTED_CHAINS.find((chain) => chain.isActive) || SUPPORTED_CHAINS[0]
  );
};

// Get chain by ID
export const getChainById = (id: number): Chain | undefined => {
  return SUPPORTED_CHAINS.find((chain) => chain.id === id);
};

// Get active chains only
export const getActiveChains = (): Chain[] => {
  return SUPPORTED_CHAINS.filter((chain) => chain.isActive);
};

// Get all chains (for future use)
export const getAllChains = (): Chain[] => {
  return SUPPORTED_CHAINS;
};
