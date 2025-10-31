import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MultiFileUpload from "../MultiFileUpload";

describe("MultiFileUpload", () => {
  const mockOnFilesChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders upload component", () => {
      render(<MultiFileUpload onFilesChange={mockOnFilesChange} />);

      expect(screen.getByText(/Drag and drop/i)).toBeInTheDocument();
    });

    it("shows browse button", () => {
      render(<MultiFileUpload onFilesChange={mockOnFilesChange} />);

      expect(screen.getByText(/browse/i)).toBeInTheDocument();
    });

    it("displays supported file types", () => {
      render(<MultiFileUpload onFilesChange={mockOnFilesChange} />);

      expect(screen.getByText(/\.sol/i)).toBeInTheDocument();
    });
  });

  describe("File Upload", () => {
    it("accepts valid file types", async () => {
      const file = new File(["contract Test {}"], "test.sol", { type: "text/plain" });

      render(<MultiFileUpload onFilesChange={mockOnFilesChange} />);

      const input = screen.getByLabelText(/browse/i).closest("input")!;
      
      Object.defineProperty(input, "files", {
        value: [file],
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(mockOnFilesChange).toHaveBeenCalled();
      });
    });

    it("shows error for oversized files", async () => {
      const bigFile = new File(
        [new Array(6 * 1024 * 1024).join("a")],
        "big.sol",
        { type: "text/plain" }
      );

      render(<MultiFileUpload onFilesChange={mockOnFilesChange} maxSize={5} />);

      const input = screen.getByLabelText(/browse/i).closest("input")!;
      
      Object.defineProperty(input, "files", {
        value: [bigFile],
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/exceeds.*5MB/i)).toBeInTheDocument();
      });
    });

    it("shows error for unsupported file types", async () => {
      const invalidFile = new File(["content"], "test.txt", { type: "text/plain" });

      render(<MultiFileUpload onFilesChange={mockOnFilesChange} />);

      const input = screen.getByLabelText(/browse/i).closest("input")!;
      
      Object.defineProperty(input, "files", {
        value: [invalidFile],
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/unsupported type/i)).toBeInTheDocument();
      });
    });

    it("respects max files limit", async () => {
      const files = Array.from({ length: 11 }, (_, i) =>
        new File(["content"], `test${i}.sol`, { type: "text/plain" })
      );

      render(<MultiFileUpload onFilesChange={mockOnFilesChange} maxFiles={10} />);

      const input = screen.getByLabelText(/browse/i).closest("input")!;
      
      Object.defineProperty(input, "files", {
        value: files,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/Maximum 10 files/i)).toBeInTheDocument();
      });
    });
  });

  describe("File Removal", () => {
    it("allows removing uploaded files", async () => {
      const file = new File(["contract Test {}"], "test.sol", { type: "text/plain" });

      render(<MultiFileUpload onFilesChange={mockOnFilesChange} />);

      const input = screen.getByLabelText(/browse/i).closest("input")!;
      
      Object.defineProperty(input, "files", {
        value: [file],
      });

      fireEvent.change(input);

      await waitFor(() => {
        const removeButton = screen.getByLabelText(/Remove.*test\.sol/i);
        expect(removeButton).toBeInTheDocument();
      });
    });
  });

  describe("Drag and Drop", () => {
    it("highlights drop zone on drag over", () => {
      render(<MultiFileUpload onFilesChange={mockOnFilesChange} />);

      const dropZone = screen.getByText(/Drag and drop/i).closest("div")!;
      
      fireEvent.dragEnter(dropZone);

      expect(dropZone).toHaveClass("border-neon-blue");
    });

    it("removes highlight on drag leave", () => {
      render(<MultiFileUpload onFilesChange={mockOnFilesChange} />);

      const dropZone = screen.getByText(/Drag and drop/i).closest("div")!;
      
      fireEvent.dragEnter(dropZone);
      fireEvent.dragLeave(dropZone);

      expect(dropZone).not.toHaveClass("border-neon-blue");
    });
  });
});

