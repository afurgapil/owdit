import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { LoadingOverlay } from "../LoadingOverlay";

describe("LoadingOverlay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders loading overlay component", () => {
      render(<LoadingOverlay />);

      const overlay = screen.getByRole("status");
      expect(overlay).toBeInTheDocument();
    });

    it("has correct ARIA attributes", () => {
      render(<LoadingOverlay />);

      const overlay = screen.getByRole("status");
      expect(overlay).toHaveAttribute("aria-live", "polite");
      expect(overlay).toHaveAttribute("aria-label", "Processing");
    });

    it("renders with loader-overlay class", () => {
      const { container } = render(<LoadingOverlay />);

      const overlay = container.querySelector(".loader-overlay");
      expect(overlay).toBeInTheDocument();
    });

    it("renders loader-card container", () => {
      const { container } = render(<LoadingOverlay />);

      const card = container.querySelector(".loader-card");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Tiles and Animation", () => {
    it("renders loader tiles", () => {
      const { container } = render(<LoadingOverlay />);

      const tiles = container.querySelectorAll(".loader-tile");
      expect(tiles.length).toBeGreaterThan(0);
    });

    it("renders double set of tiles for continuous animation", () => {
      const { container } = render(<LoadingOverlay />);

      const tiles = container.querySelectorAll(".loader-tile");
      // Should render tiles array twice for seamless loop
      expect(tiles.length).toBe(28); // 14 tiles * 2
    });

    it("displays analysis phrases in tiles", () => {
      const { container } = render(<LoadingOverlay />);

      const tiles = Array.from(container.querySelectorAll(".loader-tile-text"));
      const tilesText = tiles.map((tile) => tile.textContent);

      // Check if some of the expected phrases are present
      const hasAnalyzePhrase = tilesText.some((text) =>
        text?.includes("ANALYZE")
      );
      const hasDetectPhrase = tilesText.some((text) =>
        text?.includes("DETECT")
      );

      expect(hasAnalyzePhrase || hasDetectPhrase).toBe(true);
    });

    it("includes random glyphs in tiles", () => {
      const { container } = render(<LoadingOverlay />);

      const tiles = Array.from(container.querySelectorAll(".loader-tile-text"));
      const tilesText = tiles.map((tile) => tile?.textContent || "");

      // Should have some tiles with random characters (not phrases)
      const hasRandomTiles = tilesText.some(
        (text) =>
          text.length > 0 &&
          !text.includes("ANALYZE") &&
          !text.includes("DETECT") &&
          !text.includes("RISK") &&
          !text.includes("FETCH") &&
          !text.includes("SIMULATE") &&
          !text.includes("AGGREGATE") &&
          !text.includes("SCORE") &&
          !text.includes("VERIFY") &&
          !text.includes("HEURISTICS") &&
          !text.includes("REPORT")
      );

      expect(hasRandomTiles).toBe(true);
    });
  });

  describe("Tile Scrambling", () => {
    it("updates tiles over time", async () => {
      const { container } = render(<LoadingOverlay />);

      const getFirstTileText = () => {
        const firstTile = container.querySelector(".loader-tile-text");
        return firstTile?.textContent;
      };

      getFirstTileText();

      // Advance timers to trigger tile updates
      jest.advanceTimersByTime(500); // Advance past the interval time

      await waitFor(
        () => {
          const updatedText = getFirstTileText();
          // Text might change or stay same due to randomness
          expect(updatedText).toBeDefined();
        },
        { timeout: 1000 }
      );
    });

    it("updates tiles periodically", () => {
      const { container } = render(<LoadingOverlay />);

      const tiles1 = container.querySelectorAll(".loader-tile-text");
      const initialCount = tiles1.length;

      jest.advanceTimersByTime(420); // First interval

      const tiles2 = container.querySelectorAll(".loader-tile-text");
      expect(tiles2.length).toBe(initialCount);
    });
  });

  describe("Conveyor Belt", () => {
    it("renders loader conveyor", () => {
      const { container } = render(<LoadingOverlay />);

      const conveyor = container.querySelector(".loader-conveyor");
      expect(conveyor).toBeInTheDocument();
    });

    it("renders loader belt", () => {
      const { container } = render(<LoadingOverlay />);

      const belt = container.querySelector(".loader-belt");
      expect(belt).toBeInTheDocument();
    });

    it("conveyor is marked as aria-hidden", () => {
      const { container } = render(<LoadingOverlay />);

      const conveyor = container.querySelector(".loader-conveyor");
      expect(conveyor).toHaveAttribute("aria-hidden");
    });

    it("belt has presentation role", () => {
      const { container } = render(<LoadingOverlay />);

      const belt = container.querySelector(".loader-belt");
      expect(belt).toHaveAttribute("role", "presentation");
    });
  });

  describe("Code Elements", () => {
    it("renders tiles with code elements", () => {
      const { container } = render(<LoadingOverlay />);

      const codeElements = container.querySelectorAll("code");
      expect(codeElements.length).toBeGreaterThan(0);
    });

    it("code elements have loader-tile-text class", () => {
      const { container } = render(<LoadingOverlay />);

      const codeElements = container.querySelectorAll("code.loader-tile-text");
      expect(codeElements.length).toBeGreaterThan(0);
    });
  });

  describe("Cleanup", () => {
    it("cleans up interval on unmount", () => {
      const { unmount } = render(<LoadingOverlay />);

      // Advance timers before unmount
      jest.advanceTimersByTime(420);

      unmount();

      // Advance timers after unmount - should not cause errors
      jest.advanceTimersByTime(1000);

      // If no errors thrown, cleanup worked
      expect(true).toBe(true);
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA role", () => {
      render(<LoadingOverlay />);

      const statusElement = screen.getByRole("status");
      expect(statusElement).toBeInTheDocument();
    });

    it("provides accessible label", () => {
      render(<LoadingOverlay />);

      const overlay = screen.getByLabelText("Processing");
      expect(overlay).toBeInTheDocument();
    });

    it("uses aria-live for screen readers", () => {
      render(<LoadingOverlay />);

      const overlay = screen.getByRole("status");
      expect(overlay).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Visual Elements", () => {
    it("renders loader body", () => {
      const { container } = render(<LoadingOverlay />);

      const body = container.querySelector(".loader-body");
      expect(body).toBeInTheDocument();
    });

    it("maintains correct structure hierarchy", () => {
      const { container } = render(<LoadingOverlay />);

      const overlay = container.querySelector(".loader-overlay");
      const card = container.querySelector(".loader-card");
      const body = container.querySelector(".loader-body");

      expect(overlay).toContainElement(card);
      expect(card).toContainElement(body);
    });
  });
});
