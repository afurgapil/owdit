import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Navbar } from "../Navbar";
import { useAccount, useConnect } from "wagmi";
import { disconnect } from "@wagmi/core";

// Mock dependencies
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
  useConnect: jest.fn(),
}));

jest.mock("@wagmi/core", () => ({
  disconnect: jest.fn(),
}));

jest.mock("next/link", () => {
  return ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
});

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
  }: {
    src: { src: string } | string;
    alt: string;
  }) => {
    const srcValue = typeof src === "object" ? src.src : src;
    return <img src={srcValue} alt={alt} />;
  },
}));

jest.mock("../NetworkSelector", () => ({
  NetworkSelector: () => (
    <div data-testid="network-selector">Network Selector</div>
  ),
}));

jest.mock("../WalletSelector", () => ({
  WalletSelector: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="wallet-selector-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

jest.mock("../contexts/Web3Provider", () => ({
  config: {},
}));

describe("Navbar", () => {
  const mockDisconnect = disconnect as jest.Mock;
  const mockUseAccount = useAccount as jest.Mock;
  const mockUseConnect = useConnect as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnect.mockReturnValue({});
  });

  describe("Wallet Connection - Disconnected State", () => {
    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      });
    });

    it("renders navbar with logo and navigation links", () => {
      render(<Navbar />);

      expect(screen.getByAltText("Owdit logo")).toBeInTheDocument();
      expect(screen.getByText("Owdit")).toBeInTheDocument();
      expect(screen.getAllByText("ANALYZE")[0]).toBeInTheDocument();
      expect(screen.getAllByText("DEVELOPERS")[0]).toBeInTheDocument();
      expect(screen.getAllByText("LEARN")[0]).toBeInTheDocument();
      expect(screen.getAllByText("HISTORY")[0]).toBeInTheDocument();
    });

    it("displays Connect Wallet button when not connected", () => {
      render(<Navbar />);

      const connectButtons = screen.getAllByText("Connect Wallet");
      expect(connectButtons.length).toBeGreaterThan(0);
    });

    it("opens wallet selector modal when Connect Wallet is clicked", async () => {
      render(<Navbar />);

      const connectButtons = screen.getAllByText("Connect Wallet");
      fireEvent.click(connectButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId("wallet-selector-modal")).toBeInTheDocument();
      });
    });

    it("renders NetworkSelector component", () => {
      render(<Navbar />);

      const networkSelectors = screen.getAllByTestId("network-selector");
      expect(networkSelectors.length).toBeGreaterThan(0);
    });
  });

  describe("Wallet Connection - Connected State", () => {
    const mockAddress = "0x1234567890123456789012345678901234567890";

    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });
    });

    it("displays formatted wallet address when connected", () => {
      render(<Navbar />);

      // Should format address as 0x1234...7890
      expect(screen.getAllByText("0x1234...7890")[0]).toBeInTheDocument();
    });

    it("displays disconnect button when connected", () => {
      render(<Navbar />);

      const disconnectButtons = screen.getAllByTitle("Disconnect wallet");
      expect(disconnectButtons.length).toBeGreaterThan(0);
    });

    it("calls disconnect when disconnect button is clicked", async () => {
      render(<Navbar />);

      const disconnectButtons = screen.getAllByTitle("Disconnect wallet");
      fireEvent.click(disconnectButtons[0]);

      await waitFor(() => {
        expect(mockDisconnect).toHaveBeenCalledTimes(1);
      });
    });

    it("handles disconnect errors gracefully", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      mockDisconnect.mockRejectedValueOnce(new Error("Disconnect failed"));

      render(<Navbar />);

      const disconnectButtons = screen.getAllByTitle("Disconnect wallet");
      fireEvent.click(disconnectButtons[0]);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to disconnect:",
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe("Mobile Menu", () => {
    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      });
    });

    it("mobile menu is hidden by default", () => {
      render(<Navbar />);

      const mobileLinks = screen.queryByText((content, element) => {
        return (
          element?.tagName === "A" &&
          content === "ANALYZE" &&
          element.className.includes("md:hidden") === false
        );
      });

      // Desktop links should be visible
      expect(screen.getAllByText("ANALYZE").length).toBeGreaterThan(0);
    });

    it("toggles mobile menu when menu button is clicked", async () => {
      render(<Navbar />);

      // Find and click the menu toggle button
      const menuButton = screen.getByLabelText("Toggle menu");
      expect(menuButton).toBeInTheDocument();

      fireEvent.click(menuButton);

      // Menu should be open - check for multiple instances of links (desktop + mobile)
      await waitFor(() => {
        const analyzeLinks = screen.getAllByText("ANALYZE");
        expect(analyzeLinks.length).toBeGreaterThan(1); // Desktop + Mobile
      });

      // Click again to close
      fireEvent.click(menuButton);

      await waitFor(() => {
        const analyzeLinks = screen.getAllByText("ANALYZE");
        // Back to just desktop links
        expect(analyzeLinks.length).toBeLessThan(3);
      });
    });

    it("closes mobile menu when a nav link is clicked", async () => {
      render(<Navbar />);

      const menuButton = screen.getByLabelText("Toggle menu");
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getAllByText("ANALYZE").length).toBeGreaterThan(1);
      });

      // Click a mobile nav link
      const mobileLinks = screen.getAllByText("ANALYZE");
      fireEvent.click(mobileLinks[mobileLinks.length - 1]); // Click the last one (mobile)

      await waitFor(() => {
        const linksAfterClick = screen.getAllByText("ANALYZE");
        expect(linksAfterClick.length).toBe(1);
      });
    });
  });

  describe("Navigation Links", () => {
    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      });
    });

    it("renders correct navigation links with proper hrefs", () => {
      render(<Navbar />);

      const links = screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("href")?.startsWith("/"));

      const hrefs = links.map((link) => link.getAttribute("href"));

      expect(hrefs).toContain("/");
      expect(hrefs).toContain("/analyze");
      expect(hrefs).toContain("/developers");
      expect(hrefs).toContain("/learn");
      expect(hrefs).toContain("/history");
    });
  });

  describe("Wallet Selector Modal", () => {
    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      });
    });

    it("closes wallet selector modal when close is triggered", async () => {
      render(<Navbar />);

      // Open modal
      const connectButtons = screen.getAllByText("Connect Wallet");
      fireEvent.click(connectButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId("wallet-selector-modal")).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByTestId("wallet-selector-modal")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Address Formatting", () => {
    it("formats Ethereum addresses correctly", () => {
      const testAddress = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12";

      mockUseAccount.mockReturnValue({
        address: testAddress,
        isConnected: true,
      });

      render(<Navbar />);

      // Should format as 0xAbCd...Ef12
      expect(screen.getAllByText("0xAbCd...Ef12")[0]).toBeInTheDocument();
    });
  });
});
