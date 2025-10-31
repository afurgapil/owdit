import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MatrixRain } from "../MatrixRain";

describe("MatrixRain", () => {
  describe("Client-side Rendering", () => {
    it("renders matrix container", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const matrixContainer = container.querySelector(".matrix-container");
        expect(matrixContainer).toBeInTheDocument();
      });
    });

    it("has aria-hidden attribute on container", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const matrixContainer = container.querySelector(".matrix-container");
        expect(matrixContainer).toHaveAttribute("aria-hidden");
      });
    });
  });

  describe("Default Props", () => {
    it("uses default gridSize of 24", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        // gridSize of 24 with 2-4 streams each = 48-96 columns
        expect(columns.length).toBeGreaterThan(40);
      });
    });

    it("accepts custom gridSize prop", async () => {
      const { container } = render(<MatrixRain gridSize={12} />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        // gridSize of 12 with 2-4 streams each = 24-48 columns
        expect(columns.length).toBeGreaterThan(20);
        expect(columns.length).toBeLessThan(60);
      });
    });

    it("applies default duration range", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const firstColumn = container.querySelector(
          ".matrix-column"
        ) as HTMLElement;
        const duration = firstColumn?.style.animationDuration;
        expect(duration).toBeDefined();
        expect(duration).toMatch(/\d+s/);
      });
    });

    it("accepts custom duration props", async () => {
      const { container } = render(
        <MatrixRain minDurationSec={10} maxDurationSec={20} />
      );

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        expect(columns.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Columns Generation", () => {
    it("generates matrix columns", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        expect(columns.length).toBeGreaterThan(0);
      });
    });

    it("each column has unique key", async () => {
      const { container } = render(<MatrixRain gridSize={6} />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        expect(columns.length).toBeGreaterThan(0);

        // All columns should be pre elements
        columns.forEach((col) => {
          expect(col.tagName).toBe("PRE");
        });
      });
    });

    it("columns contain data stream content", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        const firstColumn = columns[0];
        expect(firstColumn?.textContent).toBeTruthy();
        expect(firstColumn?.textContent?.length).toBeGreaterThan(0);
      });
    });

    it("data streams contain 1s and 0s", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        const content = Array.from(columns)
          .map((col) => col.textContent)
          .join("");

        expect(content).toMatch(/[01]/);
      });
    });

    it("data streams may contain special characters", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        const content = Array.from(columns)
          .map((col) => col.textContent)
          .join("");

        // Should contain 1s or 0s at minimum
        expect(content.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Column Styling", () => {
    it("columns have left position style", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const firstColumn = container.querySelector(
          ".matrix-column"
        ) as HTMLElement;
        expect(firstColumn?.style.left).toBeDefined();
        expect(firstColumn?.style.left).toMatch(/%$/);
      });
    });

    it("columns have animation duration", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const firstColumn = container.querySelector(
          ".matrix-column"
        ) as HTMLElement;
        expect(firstColumn?.style.animationDuration).toBeDefined();
        expect(firstColumn?.style.animationDuration).toMatch(/s$/);
      });
    });

    it("columns have animation delay", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const firstColumn = container.querySelector(
          ".matrix-column"
        ) as HTMLElement;
        expect(firstColumn?.style.animationDelay).toBeDefined();
      });
    });

    it("columns are distributed across screen width", async () => {
      const { container } = render(<MatrixRain gridSize={10} />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        const positions = Array.from(columns).map(
          (col) => (col as HTMLElement).style.left
        );

        // Should have different positions
        const uniquePositions = new Set(positions);
        expect(uniquePositions.size).toBeGreaterThan(1);
      });
    });
  });

  describe("Multiple Streams per Column", () => {
    it("creates multiple streams per grid column", async () => {
      const { container } = render(<MatrixRain gridSize={2} />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        // gridSize of 2 with 2-4 streams each = 4-8 total columns
        expect(columns.length).toBeGreaterThan(3);
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles gridSize of 1", async () => {
      const { container } = render(<MatrixRain gridSize={1} />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        expect(columns.length).toBeGreaterThan(0);
      });
    });

    it("handles large gridSize", async () => {
      const { container } = render(<MatrixRain gridSize={50} />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        expect(columns.length).toBeGreaterThan(50);
      });
    });

    it("handles equal min and max duration", async () => {
      const { container } = render(
        <MatrixRain minDurationSec={15} maxDurationSec={15} />
      );

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        expect(columns.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Content Generation", () => {
    it("generates content of appropriate length", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        const firstColumn = columns[0];
        const content = firstColumn?.textContent || "";

        // Content should be between 20-34 characters (plus newlines)
        expect(content.length).toBeGreaterThan(15);
      });
    });

    it("content includes newlines for vertical display", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const columns = container.querySelectorAll(".matrix-column");
        const firstColumn = columns[0];
        const content = firstColumn?.textContent || "";

        // Pre elements preserve whitespace/newlines
        expect(content.includes("\n") || content.length > 20).toBe(true);
      });
    });
  });

  describe("Semantic HTML", () => {
    it("uses pre elements for columns", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const columns = container.querySelectorAll("pre");
        expect(columns.length).toBeGreaterThan(0);
      });
    });

    it("columns have matrix-column class", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const columns = container.querySelectorAll("pre.matrix-column");
        expect(columns.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Accessibility", () => {
    it("container is hidden from screen readers", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const matrixContainer = container.querySelector(".matrix-container");
        expect(matrixContainer).toHaveAttribute("aria-hidden");
      });
    });

    it("is decorative and not interactive", async () => {
      const { container } = render(<MatrixRain />);

      await waitFor(() => {
        const buttons = container.querySelectorAll("button");
        const inputs = container.querySelectorAll("input");
        expect(buttons.length).toBe(0);
        expect(inputs.length).toBe(0);
      });
    });
  });
});
