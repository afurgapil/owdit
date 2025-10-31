import { ReactNode } from "react";

// Mock fetch responses
export interface MockFetchOptions {
  ok?: boolean;
  status?: number;
  data?: unknown;
  error?: string;
}

export function mockFetch(options: MockFetchOptions = {}) {
  const { ok = true, status = 200, data = null, error = null } = options;

  return jest.fn(
    () =>
      Promise.resolve({
        ok,
        status,
        json: () =>
          Promise.resolve(
            ok ? { success: true, data } : { success: false, error }
          ),
        text: () => Promise.resolve(error || ""),
      }) as Promise<Response>
  );
}

export function setupMockFetch(options: MockFetchOptions = {}) {
  const mockFn = mockFetch(options);
  global.fetch = mockFn;
  return mockFn;
}

export function restoreFetch() {
  // Reset fetch to undefined (will use native fetch if available)
  delete (global as { fetch?: typeof fetch }).fetch;
}

// Mock console methods
export interface ConsoleMocks {
  debug: jest.SpyInstance;
  info: jest.SpyInstance;
  warn: jest.SpyInstance;
  error: jest.SpyInstance;
  log: jest.SpyInstance;
}

export function mockConsole(): ConsoleMocks {
  return {
    debug: jest.spyOn(console, "debug").mockImplementation(),
    info: jest.spyOn(console, "info").mockImplementation(),
    warn: jest.spyOn(console, "warn").mockImplementation(),
    error: jest.spyOn(console, "error").mockImplementation(),
    log: jest.spyOn(console, "log").mockImplementation(),
  };
}

export function restoreConsole(mocks: ConsoleMocks) {
  mocks.debug.mockRestore();
  mocks.info.mockRestore();
  mocks.warn.mockRestore();
  mocks.error.mockRestore();
  mocks.log.mockRestore();
}

// Mock NetworkContext
export interface MockNetworkContextValue {
  selectedChain: {
    id: number;
    name: string;
    currency: string;
    explorer: string;
    sourcify: boolean;
    etherscan: string;
    rpc: string;
    isActive: boolean;
  };
  setSelectedChain: jest.Mock;
}

export function createMockNetworkContext(
  chainId: number = 1
): MockNetworkContextValue {
  return {
    selectedChain: {
      id: chainId,
      name: chainId === 1 ? "Ethereum" : "Sepolia (Testnet)",
      currency: "ETH",
      explorer:
        chainId === 1 ? "https://etherscan.io" : "https://sepolia.etherscan.io",
      sourcify: true,
      etherscan:
        chainId === 1
          ? "https://api.etherscan.io"
          : "https://api-sepolia.etherscan.io",
      rpc:
        chainId === 1 ? "https://eth.llamarpc.com" : "https://rpc.sepolia.org",
      isActive: true,
    },
    setSelectedChain: jest.fn(),
  };
}

// NetworkContext Provider mock for testing
export function MockNetworkProvider({
  children,
}: {
  children: ReactNode;
  value?: MockNetworkContextValue;
}) {
  // This is a simplified mock, actual implementation would use React.Context
  return children;
}

// Helper to wait for async operations
export const waitFor = async (callback: () => void, timeout = 1000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      callback();
      return;
    } catch (error) {
      console.error(error);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  callback(); // Final attempt, will throw if still failing
};

// Helper to wait for async state updates
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Create mock error
export function createMockError(message: string, name = "Error"): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

// Mock successful API response
export function mockApiSuccess<T>(data: T) {
  return {
    success: true,
    data,
  };
}

// Mock failed API response
export function mockApiError(error: string) {
  return {
    success: false,
    error,
  };
}

// Helper to flush promises
export const flushPromises = () =>
  new Promise((resolve) => setImmediate(resolve));
