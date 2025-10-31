import React from "react";
import { render, screen } from "@testing-library/react";
import { Layout } from "../Layout";

// Mock child components
jest.mock("../Navbar", () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

jest.mock("../Footer", () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

jest.mock("../../contexts/NetworkContext", () => ({
  NetworkProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="network-provider">{children}</div>
  ),
}));

jest.mock("../../contexts/Web3Provider", () => ({
  Web3Provider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="web3-provider">{children}</div>
  ),
}));

describe("Layout", () => {
  describe("Rendering", () => {
    it("renders layout component", () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );

      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("renders Navbar component", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByTestId("navbar")).toBeInTheDocument();
    });

    it("renders Footer component", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });

    it("renders children content", () => {
      render(
        <Layout>
          <div data-testid="test-child">Child Content</div>
        </Layout>
      );

      expect(screen.getByTestId("test-child")).toBeInTheDocument();
      expect(screen.getByText("Child Content")).toBeInTheDocument();
    });
  });

  describe("Provider Hierarchy", () => {
    it("wraps content in Web3Provider", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByTestId("web3-provider")).toBeInTheDocument();
    });

    it("wraps content in NetworkProvider", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByTestId("network-provider")).toBeInTheDocument();
    });

    it("maintains correct provider nesting order", () => {
      render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const web3Provider = screen.getByTestId("web3-provider");
      const networkProvider = screen.getByTestId("network-provider");

      // NetworkProvider should be inside Web3Provider
      expect(web3Provider).toContainElement(networkProvider);
    });
  });

  describe("Structure", () => {
    it("has main element for content", () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const main = container.querySelector("main");
      expect(main).toBeInTheDocument();
    });

    it("wraps everything in a div with min-h-screen", () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const mainDiv = container.querySelector(".min-h-screen");
      expect(mainDiv).toBeInTheDocument();
    });

    it("applies flex-col class for vertical layout", () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const flexContainer = container.querySelector(".flex-col");
      expect(flexContainer).toBeInTheDocument();
    });

    it("applies bg-black background", () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const bgContainer = container.querySelector(".bg-black");
      expect(bgContainer).toBeInTheDocument();
    });
  });

  describe("Content Positioning", () => {
    it("places Navbar before main content", () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const navbar = screen.getByTestId("navbar");
      const main = container.querySelector("main");

      expect(navbar.compareDocumentPosition(main!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    });

    it("places Footer after main content", () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const footer = screen.getByTestId("footer");
      const main = container.querySelector("main");

      expect(footer.compareDocumentPosition(main!)).toBe(
        Node.DOCUMENT_POSITION_PRECEDING
      );
    });

    it("main element has flex-1 to fill space", () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const main = container.querySelector("main");
      expect(main).toHaveClass("flex-1");
    });
  });

  describe("Multiple Children", () => {
    it("renders multiple children correctly", () => {
      render(
        <Layout>
          <div data-testid="child-1">First Child</div>
          <div data-testid="child-2">Second Child</div>
          <div data-testid="child-3">Third Child</div>
        </Layout>
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
      expect(screen.getByTestId("child-3")).toBeInTheDocument();
    });

    it("preserves children order", () => {
      render(
        <Layout>
          <div data-testid="first">First</div>
          <div data-testid="second">Second</div>
        </Layout>
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
      const { container } = render(<Layout>{null}</Layout>);

      const main = container.querySelector("main");
      expect(main).toBeInTheDocument();
      expect(main).toBeEmptyDOMElement();
    });

    it("handles text children", () => {
      render(<Layout>Plain text content</Layout>);

      expect(screen.getByText("Plain text content")).toBeInTheDocument();
    });

    it("handles React fragments as children", () => {
      render(
        <Layout>
          <>
            <div>Fragment Child 1</div>
            <div>Fragment Child 2</div>
          </>
        </Layout>
      );

      expect(screen.getByText("Fragment Child 1")).toBeInTheDocument();
      expect(screen.getByText("Fragment Child 2")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("uses semantic HTML elements", () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(container.querySelector("nav")).toBeInTheDocument();
      expect(container.querySelector("main")).toBeInTheDocument();
      expect(container.querySelector("footer")).toBeInTheDocument();
    });

    it("main landmark is present", () => {
      const { container } = render(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      const main = container.querySelector("main");
      expect(main?.tagName).toBe("MAIN");
    });
  });
});
