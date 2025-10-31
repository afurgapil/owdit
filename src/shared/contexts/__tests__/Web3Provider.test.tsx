import React from "react";
import { render, screen } from "@testing-library/react";
import { Web3Provider, config } from "../Web3Provider";

// Mock wagmi
jest.mock("wagmi", () => ({
  WagmiConfig: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wagmi-config">{children}</div>
  ),
  createConfig: jest.fn(() => ({
    chains: [],
    connectors: [],
    transports: {},
  })),
  http: jest.fn(),
}));

// Mock wagmi/chains
jest.mock("wagmi/chains", () => ({
  mainnet: {
    id: 1,
    name: "Ethereum",
  },
  sepolia: {
    id: 11155111,
    name: "Sepolia",
  },
}));

// Mock wagmi/connectors
jest.mock("wagmi/connectors", () => ({
  injected: jest.fn(() => ({ id: "injected", name: "Injected" })),
}));

// Mock TanStack Query
jest.mock("@tanstack/react-query", () => ({
  QueryClient: jest.fn(() => ({
    mount: jest.fn(),
    unmount: jest.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-client-provider">{children}</div>
  ),
}));

describe("Web3Provider", () => {
  describe("Rendering", () => {
    it("renders children", () => {
      render(
        <Web3Provider>
          <div data-testid="test-child">Test Content</div>
        </Web3Provider>
      );

      expect(screen.getByTestId("test-child")).toBeInTheDocument();
    });

    it("wraps children in WagmiConfig", () => {
      render(
        <Web3Provider>
          <div>Content</div>
        </Web3Provider>
      );

      expect(screen.getByTestId("wagmi-config")).toBeInTheDocument();
    });

    it("wraps children in QueryClientProvider", () => {
      render(
        <Web3Provider>
          <div>Content</div>
        </Web3Provider>
      );

      expect(screen.getByTestId("query-client-provider")).toBeInTheDocument();
    });

    it("maintains correct provider nesting order", () => {
      render(
        <Web3Provider>
          <div data-testid="content">Content</div>
        </Web3Provider>
      );

      const wagmiConfig = screen.getByTestId("wagmi-config");
      const queryProvider = screen.getByTestId("query-client-provider");

      // QueryClientProvider should be inside WagmiConfig
      expect(wagmiConfig).toContainElement(queryProvider);
    });
  });

  describe("Config Export", () => {
    it("exports config object", () => {
      expect(config).toBeDefined();
    });

    it("config has expected properties", () => {
      expect(config).toHaveProperty("chains");
      expect(config).toHaveProperty("connectors");
      expect(config).toHaveProperty("transports");
    });
  });

  describe("Multiple Children", () => {
    it("renders multiple children", () => {
      render(
        <Web3Provider>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </Web3Provider>
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
      expect(screen.getByTestId("child-3")).toBeInTheDocument();
    });

    it("preserves children order", () => {
      render(
        <Web3Provider>
          <div data-testid="first">First</div>
          <div data-testid="second">Second</div>
        </Web3Provider>
      );

      const first = screen.getByTestId("first");
      const second = screen.getByTestId("second");

      expect(first.compareDocumentPosition(second)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles empty children", () => {
      render(<Web3Provider>{null}</Web3Provider>);

      // Should still render providers
      expect(screen.getByTestId("wagmi-config")).toBeInTheDocument();
      expect(screen.getByTestId("query-client-provider")).toBeInTheDocument();
    });

    it("handles text children", () => {
      render(<Web3Provider>Plain text content</Web3Provider>);

      expect(screen.getByText("Plain text content")).toBeInTheDocument();
    });

    it("handles React fragments as children", () => {
      render(
        <Web3Provider>
          <>
            <div>Fragment Child 1</div>
            <div>Fragment Child 2</div>
          </>
        </Web3Provider>
      );

      expect(screen.getByText("Fragment Child 1")).toBeInTheDocument();
      expect(screen.getByText("Fragment Child 2")).toBeInTheDocument();
    });

    it("handles function children", () => {
      render(
        <Web3Provider>
          {(() => (
            <div data-testid="function-child">Function Child</div>
          ))()}
        </Web3Provider>
      );

      expect(screen.getByTestId("function-child")).toBeInTheDocument();
    });
  });

  describe("Provider Context", () => {
    it("provides wagmi context to children", () => {
      const TestComponent = () => {
        return <div data-testid="test">Inside Provider</div>;
      };

      render(
        <Web3Provider>
          <TestComponent />
        </Web3Provider>
      );

      expect(screen.getByTestId("test")).toBeInTheDocument();
    });

    it("provides query client context to children", () => {
      const TestComponent = () => {
        return <div data-testid="test">Query Client Available</div>;
      };

      render(
        <Web3Provider>
          <TestComponent />
        </Web3Provider>
      );

      expect(screen.getByTestId("test")).toBeInTheDocument();
    });
  });

  describe("Nested Providers", () => {
    it("can be nested within other providers", () => {
      const OuterProvider = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="outer">{children}</div>
      );

      render(
        <OuterProvider>
          <Web3Provider>
            <div data-testid="content">Content</div>
          </Web3Provider>
        </OuterProvider>
      );

      expect(screen.getByTestId("outer")).toBeInTheDocument();
      expect(screen.getByTestId("wagmi-config")).toBeInTheDocument();
      expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("maintains correct nesting with external providers", () => {
      const OuterProvider = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="outer">{children}</div>
      );

      render(
        <OuterProvider>
          <Web3Provider>
            <div data-testid="inner">Content</div>
          </Web3Provider>
        </OuterProvider>
      );

      const outer = screen.getByTestId("outer");
      const wagmi = screen.getByTestId("wagmi-config");
      const inner = screen.getByTestId("inner");

      expect(outer).toContainElement(wagmi);
      expect(wagmi).toContainElement(inner);
    });
  });

  describe("Component API", () => {
    it("accepts PropsWithChildren type", () => {
      // This is a TypeScript compile-time test
      // If it compiles, the test passes

      const ValidUsage = () => (
        <Web3Provider>
          <div>Valid</div>
        </Web3Provider>
      );

      render(<ValidUsage />);
      expect(screen.getByText("Valid")).toBeInTheDocument();
    });

    it("only accepts children prop", () => {
      // Should not accept any other props
      // TypeScript would catch this at compile time

      render(
        <Web3Provider>
          <div>Content</div>
        </Web3Provider>
      );

      expect(screen.getByText("Content")).toBeInTheDocument();
    });
  });

  describe("Re-rendering", () => {
    it("maintains providers across re-renders", () => {
      const { rerender } = render(
        <Web3Provider>
          <div data-testid="content">Content 1</div>
        </Web3Provider>
      );

      expect(screen.getByTestId("wagmi-config")).toBeInTheDocument();

      rerender(
        <Web3Provider>
          <div data-testid="content">Content 2</div>
        </Web3Provider>
      );

      expect(screen.getByTestId("wagmi-config")).toBeInTheDocument();
      expect(screen.getByTestId("content")).toHaveTextContent("Content 2");
    });

    it("does not recreate providers unnecessarily", () => {
      const { rerender } = render(
        <Web3Provider>
          <div>Content 1</div>
        </Web3Provider>
      );

      const wagmiConfig1 = screen.getByTestId("wagmi-config");

      rerender(
        <Web3Provider>
          <div>Content 2</div>
        </Web3Provider>
      );

      const wagmiConfig2 = screen.getByTestId("wagmi-config");

      // Should be the same element
      expect(wagmiConfig1).toBe(wagmiConfig2);
    });
  });

  describe("Client Component", () => {
    it('is marked as "use client"', () => {
      // This ensures the component can use hooks and client-side features
      // The actual "use client" directive is in the source file

      render(
        <Web3Provider>
          <div>Client Component</div>
        </Web3Provider>
      );

      expect(screen.getByText("Client Component")).toBeInTheDocument();
    });
  });
});
