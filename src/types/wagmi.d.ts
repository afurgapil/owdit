declare module "wagmi" {
  export const WagmiConfig: any;
  export function createConfig(config: any): any;
  export function http(...args: any[]): any;
  export function useAccount(): { address?: string; isConnected: boolean };
  export function useConnect(): {
    connect: (args: { connector: any }) => void;
    connectors: Array<{ id: string; name?: string }>;
    isPending: boolean;
  };
}

declare module "wagmi/chains" {
  export const mainnet: { id: number };
  export const sepolia: { id: number };
}

declare module "wagmi/connectors" {
  export function injected(...args: any[]): any;
}
