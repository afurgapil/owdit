import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ImportResolver from "../ImportResolver";

describe("ImportResolver", () => {
  const mockOnResolveImport = jest.fn();
  const mockOnIgnoreImport = jest.fn();

  const mockResolvedImports = {
    resolved: [
      { path: "@openzeppelin/contracts/token/ERC20/ERC20.sol", type: "npm" as const, resolved: true },
    ],
    missing: [
      { path: "./MissingContract.sol", type: "relative" as const, resolved: false },
    ],
    autoFetched: [
      { path: "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol", type: "npm" as const, resolved: true },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("returns null when no resolved imports", () => {
      const { container } = render(
        <ImportResolver
          resolvedImports={null}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders import resolver when resolved imports exist", () => {
      render(
        <ImportResolver
          resolvedImports={mockResolvedImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(screen.getByText(/Import Resolution/i)).toBeInTheDocument();
    });
  });

  describe("Resolved Imports", () => {
    it("displays resolved imports", () => {
      render(
        <ImportResolver
          resolvedImports={mockResolvedImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(screen.getByText(/ERC20\.sol/i)).toBeInTheDocument();
    });

    it("shows checkmark for resolved imports", () => {
      const { container } = render(
        <ImportResolver
          resolvedImports={mockResolvedImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      const checkIcons = container.querySelectorAll("svg");
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  describe("Missing Imports", () => {
    it("displays missing imports", () => {
      render(
        <ImportResolver
          resolvedImports={mockResolvedImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(screen.getByText(/MissingContract\.sol/i)).toBeInTheDocument();
    });

    it("shows upload button for missing imports", () => {
      render(
        <ImportResolver
          resolvedImports={mockResolvedImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(screen.getByText(/Upload/i)).toBeInTheDocument();
    });

    it("shows ignore button for missing imports", () => {
      render(
        <ImportResolver
          resolvedImports={mockResolvedImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(screen.getByText(/Ignore/i)).toBeInTheDocument();
    });

    it("calls onIgnoreImport when ignore is clicked", () => {
      render(
        <ImportResolver
          resolvedImports={mockResolvedImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      const ignoreButton = screen.getByText(/Ignore/i);
      fireEvent.click(ignoreButton);

      expect(mockOnIgnoreImport).toHaveBeenCalledWith("./MissingContract.sol");
    });
  });

  describe("Auto-Fetched Imports", () => {
    it("displays auto-fetched imports", () => {
      render(
        <ImportResolver
          resolvedImports={mockResolvedImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(screen.getByText(/AggregatorV3Interface\.sol/i)).toBeInTheDocument();
    });

    it("shows auto-fetch indicator", () => {
      render(
        <ImportResolver
          resolvedImports={mockResolvedImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(screen.getByText(/Auto-fetched/i)).toBeInTheDocument();
    });
  });

  describe("Import Type Icons", () => {
    it("displays npm icon for npm imports", () => {
      render(
        <ImportResolver
          resolvedImports={mockResolvedImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(screen.getByText("📦")).toBeInTheDocument();
    });

    it("displays folder icon for relative imports", () => {
      render(
        <ImportResolver
          resolvedImports={mockResolvedImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(screen.getByText("📁")).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("handles no missing imports", () => {
      const noMissingImports = {
        ...mockResolvedImports,
        missing: [],
      };

      render(
        <ImportResolver
          resolvedImports={noMissingImports}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(screen.queryByText(/Upload/i)).not.toBeInTheDocument();
    });

    it("handles no auto-fetched imports", () => {
      const noAutoFetched = {
        ...mockResolvedImports,
        autoFetched: [],
      };

      render(
        <ImportResolver
          resolvedImports={noAutoFetched}
          onResolveImport={mockOnResolveImport}
          onIgnoreImport={mockOnIgnoreImport}
        />
      );

      expect(screen.queryByText(/Auto-fetched/i)).not.toBeInTheDocument();
    });
  });
});

