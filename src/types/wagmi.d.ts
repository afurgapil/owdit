declare module "wagmi" {
  export const WagmiConfig: React.ComponentType<{ config: unknown; children?: React.ReactNode }>;
  export function createConfig(config: unknown): unknown;
  export function http(...args: unknown[]): unknown;
  export function useAccount(): { address?: string; isConnected: boolean };
  export function useConnect(): {
    connect: (args: { connector: unknown }) => void;
    connectors: Array<{ id: string; name?: string }>;
    isPending: boolean;
  };
}

declare module "wagmi/chains" {
  export const mainnet: { id: number };
  export const sepolia: { id: number };
}

declare module "wagmi/connectors" {
  export function injected(...args: unknown[]): unknown;
}
