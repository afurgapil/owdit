import React from "react";
import { render, screen, renderHook, act } from "@testing-library/react";
import { NetworkProvider, useNetwork } from "../NetworkContext";
import { getDefaultChain, getActiveChains, Chain } from "../../lib/chains";

// Mock chains module
jest.mock("../../lib/chains", () => ({
  getDefaultChain: jest.fn(),
  getActiveChains: jest.fn(),
}));

describe("NetworkContext", () => {
  const mockGetDefaultChain = getDefaultChain as jest.Mock;
  const mockGetActiveChains = getActiveChains as jest.Mock;

  const mockEthereumChain: Chain = {
    id: 1,
    name: "Ethereum",
    currency: "ETH",
    rpcUrl: "https://eth.llamarpc.com",
    explorer: "https://etherscan.io",
  };

  const mockPolygonChain: Chain = {
    id: 137,
    name: "Polygon",
    currency: "MATIC",
    rpcUrl: "https://polygon-rpc.com",
    explorer: "https://polygonscan.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDefaultChain.mockReturnValue(mockEthereumChain);
    mockGetActiveChains.mockReturnValue([mockEthereumChain]);
  });

  describe("NetworkProvider", () => {
    it("renders children", () => {
      render(
        <NetworkProvider>
          <div data-testid="test-child">Test Content</div>
        </NetworkProvider>
      );

      expect(screen.getByTestId("test-child")).toBeInTheDocument();
    });

    it("provides context to children", () => {
      const TestComponent = () => {
        const { selectedChain } = useNetwork();
        return <div>{selectedChain.name}</div>;
      };

      render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      expect(screen.getByText("Ethereum")).toBeInTheDocument();
    });

    it("initializes with default chain", () => {
      const TestComponent = () => {
        const { selectedChain } = useNetwork();
        return <div data-testid="chain-id">{selectedChain.id}</div>;
      };

      render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      expect(screen.getByTestId("chain-id")).toHaveTextContent("1");
    });

    it("provides available chains", () => {
      mockGetActiveChains.mockReturnValue([
        mockEthereumChain,
        mockPolygonChain,
      ]);

      const TestComponent = () => {
        const { availableChains } = useNetwork();
        return <div data-testid="chain-count">{availableChains.length}</div>;
      };

      render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      expect(screen.getByTestId("chain-count")).toHaveTextContent("2");
    });
  });

  describe("useNetwork Hook", () => {
    it("throws error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const TestComponent = () => {
        useNetwork();
        return null;
      };

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useNetwork must be used within a NetworkProvider");

      consoleSpy.mockRestore();
    });

    it("returns selectedChain", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NetworkProvider>{children}</NetworkProvider>
      );

      const { result } = renderHook(() => useNetwork(), { wrapper });

      expect(result.current.selectedChain).toEqual(mockEthereumChain);
    });

    it("returns setSelectedChain function", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NetworkProvider>{children}</NetworkProvider>
      );

      const { result } = renderHook(() => useNetwork(), { wrapper });

      expect(typeof result.current.setSelectedChain).toBe("function");
    });

    it("returns availableChains", () => {
      mockGetActiveChains.mockReturnValue([
        mockEthereumChain,
        mockPolygonChain,
      ]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NetworkProvider>{children}</NetworkProvider>
      );

      const { result } = renderHook(() => useNetwork(), { wrapper });

      expect(result.current.availableChains).toEqual([
        mockEthereumChain,
        mockPolygonChain,
      ]);
    });
  });

  describe("Chain Selection", () => {
    it("allows changing selected chain", () => {
      mockGetActiveChains.mockReturnValue([
        mockEthereumChain,
        mockPolygonChain,
      ]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NetworkProvider>{children}</NetworkProvider>
      );

      const { result } = renderHook(() => useNetwork(), { wrapper });

      expect(result.current.selectedChain.id).toBe(1);

      act(() => {
        result.current.setSelectedChain(mockPolygonChain);
      });

      expect(result.current.selectedChain.id).toBe(137);
      expect(result.current.selectedChain.name).toBe("Polygon");
    });

    it("persists chain selection across re-renders", () => {
      mockGetActiveChains.mockReturnValue([
        mockEthereumChain,
        mockPolygonChain,
      ]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NetworkProvider>{children}</NetworkProvider>
      );

      const { result, rerender } = renderHook(() => useNetwork(), { wrapper });

      act(() => {
        result.current.setSelectedChain(mockPolygonChain);
      });

      expect(result.current.selectedChain.name).toBe("Polygon");

      rerender();

      expect(result.current.selectedChain.name).toBe("Polygon");
    });

    it("updates UI when chain is changed", () => {
      mockGetActiveChains.mockReturnValue([
        mockEthereumChain,
        mockPolygonChain,
      ]);

      const TestComponent = () => {
        const { selectedChain, setSelectedChain } = useNetwork();
        return (
          <div>
            <div data-testid="current-chain">{selectedChain.name}</div>
            <button onClick={() => setSelectedChain(mockPolygonChain)}>
              Switch to Polygon
            </button>
          </div>
        );
      };

      render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      expect(screen.getByTestId("current-chain")).toHaveTextContent("Ethereum");

      const button = screen.getByText("Switch to Polygon");
      act(() => {
        button.click();
      });

      expect(screen.getByTestId("current-chain")).toHaveTextContent("Polygon");
    });
  });

  describe("Context Value", () => {
    it("provides all required properties", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NetworkProvider>{children}</NetworkProvider>
      );

      const { result } = renderHook(() => useNetwork(), { wrapper });

      expect(result.current).toHaveProperty("selectedChain");
      expect(result.current).toHaveProperty("setSelectedChain");
      expect(result.current).toHaveProperty("availableChains");
    });

    it("selectedChain has correct structure", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NetworkProvider>{children}</NetworkProvider>
      );

      const { result } = renderHook(() => useNetwork(), { wrapper });

      const chain = result.current.selectedChain;
      expect(chain).toHaveProperty("id");
      expect(chain).toHaveProperty("name");
      expect(chain).toHaveProperty("currency");
      expect(chain).toHaveProperty("rpcUrl");
      expect(chain).toHaveProperty("explorer");
    });

    it("availableChains is an array", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NetworkProvider>{children}</NetworkProvider>
      );

      const { result } = renderHook(() => useNetwork(), { wrapper });

      expect(Array.isArray(result.current.availableChains)).toBe(true);
    });
  });

  describe("Multiple Consumers", () => {
    it("all consumers receive same context value", () => {
      const Consumer1 = () => {
        const { selectedChain } = useNetwork();
        return <div data-testid="consumer-1">{selectedChain.name}</div>;
      };

      const Consumer2 = () => {
        const { selectedChain } = useNetwork();
        return <div data-testid="consumer-2">{selectedChain.name}</div>;
      };

      render(
        <NetworkProvider>
          <Consumer1 />
          <Consumer2 />
        </NetworkProvider>
      );

      expect(screen.getByTestId("consumer-1")).toHaveTextContent("Ethereum");
      expect(screen.getByTestId("consumer-2")).toHaveTextContent("Ethereum");
    });

    it("all consumers update when chain changes", () => {
      mockGetActiveChains.mockReturnValue([
        mockEthereumChain,
        mockPolygonChain,
      ]);

      const Consumer1 = () => {
        const { selectedChain } = useNetwork();
        return <div data-testid="consumer-1">{selectedChain.name}</div>;
      };

      const Consumer2 = () => {
        const { selectedChain, setSelectedChain } = useNetwork();
        return (
          <div>
            <div data-testid="consumer-2">{selectedChain.name}</div>
            <button onClick={() => setSelectedChain(mockPolygonChain)}>
              Change
            </button>
          </div>
        );
      };

      render(
        <NetworkProvider>
          <Consumer1 />
          <Consumer2 />
        </NetworkProvider>
      );

      act(() => {
        screen.getByText("Change").click();
      });

      expect(screen.getByTestId("consumer-1")).toHaveTextContent("Polygon");
      expect(screen.getByTestId("consumer-2")).toHaveTextContent("Polygon");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty availableChains array", () => {
      mockGetActiveChains.mockReturnValue([]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NetworkProvider>{children}</NetworkProvider>
      );

      const { result } = renderHook(() => useNetwork(), { wrapper });

      expect(result.current.availableChains).toEqual([]);
    });

    it("handles single available chain", () => {
      mockGetActiveChains.mockReturnValue([mockEthereumChain]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NetworkProvider>{children}</NetworkProvider>
      );

      const { result } = renderHook(() => useNetwork(), { wrapper });

      expect(result.current.availableChains.length).toBe(1);
    });
  });

  describe("Integration with Chain Utils", () => {
    it("calls getDefaultChain on initialization", () => {
      render(
        <NetworkProvider>
          <div>Test</div>
        </NetworkProvider>
      );

      expect(mockGetDefaultChain).toHaveBeenCalledTimes(1);
    });

    it("calls getActiveChains to populate available chains", () => {
      render(
        <NetworkProvider>
          <div>Test</div>
        </NetworkProvider>
      );

      expect(mockGetActiveChains).toHaveBeenCalledTimes(1);
    });
  });
});
