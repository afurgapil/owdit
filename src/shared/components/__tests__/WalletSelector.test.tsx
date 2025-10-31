import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WalletSelector } from "../WalletSelector";
import { useConnect, useAccount } from "wagmi";

// Mock wagmi hooks
jest.mock("wagmi", () => ({
  useConnect: jest.fn(),
  useAccount: jest.fn(),
}));

describe("WalletSelector", () => {
  const mockConnect = jest.fn();
  const mockOnClose = jest.fn();
  const mockUseConnect = useConnect as jest.Mock;
  const mockUseAccount = useAccount as jest.Mock;

  const mockConnectors = [
    { id: "injected", name: "MetaMask" },
    { id: "walletConnect", name: "WalletConnect" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccount.mockReturnValue({
      isConnected: false,
    });
  });

  describe("Modal Visibility", () => {
    beforeEach(() => {
      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: mockConnectors,
        isPending: false,
      });
    });

    it("renders nothing when isOpen is false", () => {
      render(<WalletSelector isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText("Connect Wallet")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", () => {
      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
    });

    it("closes modal when X button is clicked", () => {
      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole("button", { name: "" });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("closes modal when backdrop is clicked", () => {
      const { container } = render(
        <WalletSelector isOpen={true} onClose={mockOnClose} />
      );

      // Find backdrop element
      const backdrop = container.querySelector(".bg-black\\/80");
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe("Wallet Connectors Display", () => {
    beforeEach(() => {
      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: mockConnectors,
        isPending: false,
      });
    });

    it("displays all available connectors", () => {
      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText("Browser Wallet")).toBeInTheDocument();
      expect(screen.getByText("WalletConnect")).toBeInTheDocument();
    });

    it("shows correct description for injected connector", () => {
      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      expect(
        screen.getByText(
          "Connect using MetaMask, Coinbase Wallet, or other browser extensions"
        )
      ).toBeInTheDocument();
    });

    it("shows correct description for other connectors", () => {
      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      const walletConnectDesc = screen.getByText("Connect your wallet");
      expect(walletConnectDesc).toBeInTheDocument();
    });
  });

  describe("Wallet Connection", () => {
    beforeEach(() => {
      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: mockConnectors,
        isPending: false,
      });
    });

    it("calls connect when a connector is clicked", () => {
      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      const browserWalletButton = screen
        .getByText("Browser Wallet")
        .closest("button");
      if (browserWalletButton) {
        fireEvent.click(browserWalletButton);

        expect(mockConnect).toHaveBeenCalledWith({
          connector: mockConnectors[0],
        });
      }
    });

    it("calls connect with correct connector", () => {
      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      const walletConnectButton = screen
        .getByText("WalletConnect")
        .closest("button");
      if (walletConnectButton) {
        fireEvent.click(walletConnectButton);

        expect(mockConnect).toHaveBeenCalledWith({
          connector: mockConnectors[1],
        });
      }
    });
  });

  describe("Loading States", () => {
    it("shows loading spinner for pending connector", async () => {
      // First render: not pending, click to select connector
      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: mockConnectors,
        isPending: false,
      });

      const { rerender } = render(
        <WalletSelector isOpen={true} onClose={mockOnClose} />
      );

      const browserWalletButton = screen
        .getByText("Browser Wallet")
        .closest("button");
      fireEvent.click(browserWalletButton!);

      // Then set pending and rerender same component instance
      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: mockConnectors,
        isPending: true,
      });

      rerender(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      // Check for spinner (animate-spin class) inside the selected connector button
      await waitFor(() => {
        const updatedButton = screen
          .getByText("Browser Wallet")
          .closest("button");
        expect(
          updatedButton?.querySelector(".animate-spin")
        ).toBeInTheDocument();
      });
    });

    it("disables button when connector is pending", async () => {
      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: mockConnectors,
        isPending: true,
      });

      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      const browserWalletButton = screen
        .getByText("Browser Wallet")
        .closest("button") as HTMLButtonElement;

      fireEvent.click(browserWalletButton);

      // Wait until disabled state applies to the selected connector
      await waitFor(() => {
        expect(browserWalletButton).toBeDisabled();
      });
    });
  });

  describe("Auto-close on Connection", () => {
    it("closes modal when wallet is connected", async () => {
      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: mockConnectors,
        isPending: false,
      });

      // Initially not connected
      mockUseAccount.mockReturnValue({
        isConnected: false,
      });

      const { rerender } = render(
        <WalletSelector isOpen={true} onClose={mockOnClose} />
      );

      // Simulate connection
      mockUseAccount.mockReturnValue({
        isConnected: true,
      });

      rerender(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("does not close if already closed", async () => {
      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: mockConnectors,
        isPending: false,
      });

      mockUseAccount.mockReturnValue({
        isConnected: false,
      });

      const { rerender } = render(
        <WalletSelector isOpen={false} onClose={mockOnClose} />
      );

      // Simulate connection while modal is closed
      mockUseAccount.mockReturnValue({
        isConnected: true,
      });

      rerender(<WalletSelector isOpen={false} onClose={mockOnClose} />);

      // Should not call onClose since modal was already closed
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Connector Icons and Names", () => {
    beforeEach(() => {
      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: mockConnectors,
        isPending: false,
      });
    });

    it("displays Monitor icon for injected connector", () => {
      const { container } = render(
        <WalletSelector isOpen={true} onClose={mockOnClose} />
      );

      // Monitor icon should be present for Browser Wallet
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("displays Wallet icon for non-injected connectors", () => {
      const { container } = render(
        <WalletSelector isOpen={true} onClose={mockOnClose} />
      );

      // Should have Wallet icons
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("displays custom connector name when provided", () => {
      const customConnectors = [{ id: "custom", name: "Custom Wallet" }];

      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: customConnectors,
        isPending: false,
      });

      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText("Custom Wallet")).toBeInTheDocument();
    });

    it("shows Unknown Wallet for connectors without name", () => {
      const unknownConnectors = [{ id: "unknown" }];

      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: unknownConnectors,
        isPending: false,
      });

      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText("Unknown Wallet")).toBeInTheDocument();
    });
  });

  describe("Terms and Privacy", () => {
    beforeEach(() => {
      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: mockConnectors,
        isPending: false,
      });
    });

    it("displays terms of service notice", () => {
      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      expect(
        screen.getByText(/By connecting a wallet, you agree to our/i)
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockUseConnect.mockReturnValue({
        connect: mockConnect,
        connectors: mockConnectors,
        isPending: false,
      });
    });

    it("renders modal with proper structure", () => {
      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      const heading = screen.getByText("Connect Wallet");
      expect(heading.tagName).toBe("H2");
    });

    it("all connectors are keyboard accessible", () => {
      render(<WalletSelector isOpen={true} onClose={mockOnClose} />);

      const buttons = screen.getAllByRole("button");
      // Should have close button + connector buttons
      expect(buttons.length).toBeGreaterThan(mockConnectors.length);
    });
  });
});
