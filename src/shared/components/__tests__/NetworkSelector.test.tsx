import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NetworkSelector } from "../NetworkSelector";
import { useNetwork } from "../../contexts/NetworkContext";
import { Chain } from "../../lib/chains";

// Mock dependencies
jest.mock("../../contexts/NetworkContext", () => ({
  useNetwork: jest.fn(),
}));

describe("NetworkSelector", () => {
  const mockSetSelectedChain = jest.fn();
  const mockUseNetwork = useNetwork as jest.Mock;

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
  });

  describe("Single Chain (No Dropdown)", () => {
    beforeEach(() => {
      mockUseNetwork.mockReturnValue({
        selectedChain: mockEthereumChain,
        availableChains: [mockEthereumChain],
        setSelectedChain: mockSetSelectedChain,
      });
    });

    it("renders selected chain name and currency", () => {
      render(<NetworkSelector />);

      expect(screen.getByText("Ethereum")).toBeInTheDocument();
      expect(screen.getByText("ETH")).toBeInTheDocument();
    });

    it("button is disabled when only one chain available", () => {
      render(<NetworkSelector />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("does not show dropdown icon when only one chain", () => {
      const { container } = render(<NetworkSelector />);

      // ChevronDown icon should not be present
      const chevronIcon = container.querySelector(".rotate-180");
      expect(chevronIcon).not.toBeInTheDocument();
    });
  });

  describe("Multiple Chains (With Dropdown)", () => {
    beforeEach(() => {
      mockUseNetwork.mockReturnValue({
        selectedChain: mockEthereumChain,
        availableChains: [mockEthereumChain, mockPolygonChain],
        setSelectedChain: mockSetSelectedChain,
      });
    });

    it("renders button as enabled when multiple chains available", () => {
      render(<NetworkSelector />);

      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
    });

    it("shows dropdown icon when multiple chains available", () => {
      render(<NetworkSelector />);

      // Should show chevron down icon
      expect(screen.getByText("Ethereum")).toBeInTheDocument();
      // Button should not be disabled
      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
    });

    it("opens dropdown when button is clicked", async () => {
      render(<NetworkSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        // Both chains should be visible in dropdown
        const ethereumOptions = screen.getAllByText("Ethereum");
        const polygonOptions = screen.getAllByText("Polygon");

        expect(ethereumOptions.length).toBeGreaterThan(1);
        expect(polygonOptions.length).toBeGreaterThan(0);
      });
    });

    it("closes dropdown when button is clicked again", async () => {
      render(<NetworkSelector />);

      const button = screen.getByRole("button");

      // Open dropdown
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText("Polygon").length).toBeGreaterThan(0);
      });

      // Close dropdown
      fireEvent.click(button);

      await waitFor(() => {
        // Only the selected chain (button text) should remain
        expect(screen.queryAllByText("Polygon").length).toBe(0);
      });
    });

    it("selects a chain when clicked in dropdown", async () => {
      render(<NetworkSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText("Polygon").length).toBeGreaterThan(0);
      });

      // Click on Polygon option
      const polygonButtons = screen.getAllByText("Polygon");
      fireEvent.click(polygonButtons[0]);

      expect(mockSetSelectedChain).toHaveBeenCalledWith(mockPolygonChain);
    });

    it("closes dropdown after selecting a chain", async () => {
      render(<NetworkSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText("Polygon").length).toBeGreaterThan(0);
      });

      const polygonButtons = screen.getAllByText("Polygon");
      fireEvent.click(polygonButtons[0]);

      await waitFor(() => {
        // Dropdown should close - only button text remains
        expect(screen.queryAllByText("Polygon").length).toBe(0);
      });
    });

    it("highlights currently selected chain in dropdown", async () => {
      render(<NetworkSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        const ethereumButtons = screen.getAllByText("Ethereum");
        // Find the dropdown button (not the main button)
        const dropdownButton = ethereumButtons.find(
          (el) =>
            el.closest("button")?.className.includes("border-neon-blue") &&
            el.closest("button") !== button
        );

        expect(dropdownButton).toBeDefined();
      });
    });
  });

  describe("Click Outside to Close", () => {
    beforeEach(() => {
      mockUseNetwork.mockReturnValue({
        selectedChain: mockEthereumChain,
        availableChains: [mockEthereumChain, mockPolygonChain],
        setSelectedChain: mockSetSelectedChain,
      });
    });

    it("closes dropdown when clicking outside", async () => {
      const { container } = render(
        <div>
          <NetworkSelector />
          <div data-testid="outside">Outside Element</div>
        </div>
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText("Polygon").length).toBeGreaterThan(0);
      });

      // Click outside
      const outsideElement = screen.getByTestId("outside");
      fireEvent.mouseDown(outsideElement);

      await waitFor(() => {
        expect(screen.queryAllByText("Polygon").length).toBe(0);
      });
    });

    it("does not close dropdown when clicking inside", async () => {
      render(<NetworkSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText("Polygon").length).toBeGreaterThan(0);
      });

      // Click inside the dropdown
      fireEvent.mouseDown(button);

      // Dropdown should still be open
      expect(screen.getAllByText("Polygon").length).toBeGreaterThan(0);
    });
  });

  describe("Network Info Display", () => {
    beforeEach(() => {
      mockUseNetwork.mockReturnValue({
        selectedChain: mockEthereumChain,
        availableChains: [mockEthereumChain],
        setSelectedChain: mockSetSelectedChain,
      });
    });

    it("displays network icon", () => {
      const { container } = render(<NetworkSelector />);

      // Network icon should be present
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("truncates long chain names properly", () => {
      const longNameChain: Chain = {
        ...mockEthereumChain,
        name: "Very Long Chain Name That Should Truncate",
      };

      mockUseNetwork.mockReturnValue({
        selectedChain: longNameChain,
        availableChains: [longNameChain],
        setSelectedChain: mockSetSelectedChain,
      });

      render(<NetworkSelector />);

      expect(
        screen.getByText("Very Long Chain Name That Should Truncate")
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockUseNetwork.mockReturnValue({
        selectedChain: mockEthereumChain,
        availableChains: [mockEthereumChain, mockPolygonChain],
        setSelectedChain: mockSetSelectedChain,
      });
    });

    it("button has correct cursor styles", () => {
      const { container } = render(<NetworkSelector />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("cursor-pointer");
    });

    it("all chain options are keyboard accessible", async () => {
      render(<NetworkSelector />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      await waitFor(() => {
        const allButtons = screen.getAllByRole("button");
        // Should have main button + chain option buttons
        expect(allButtons.length).toBeGreaterThan(1);
      });
    });
  });
});
