import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TestGeneration from "../TestGeneration";
import { TestGenerationResult } from "../../../../types/contractAnalysis";

// Mock file-saver
jest.mock("file-saver", () => ({
  saveAs: jest.fn(),
}));

// Mock syntax highlighter
jest.mock("react-syntax-highlighter", () => ({
  Prism: ({ children }: { children: string }) => <pre>{children}</pre>,
}));

jest.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
  tomorrow: {},
}));

describe("TestGeneration", () => {
  const mockOnGenerate = jest.fn();

  const mockSuccessResult: TestGenerationResult = {
    success: true,
    tests: {
      hardhat: {
        code: "describe('MyContract', function() { it('should work', async function() {}) });",
        framework: "hardhat",
        fileName: "MyContract.test.js",
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders test generation component", () => {
      render(<TestGeneration onGenerate={mockOnGenerate} />);

      expect(screen.getByText(/Test Generation/i)).toBeInTheDocument();
    });

    it("shows contract code input", () => {
      render(<TestGeneration onGenerate={mockOnGenerate} />);

      expect(screen.getByPlaceholderText(/Paste your contract code/i)).toBeInTheDocument();
    });

    it("shows framework selection", () => {
      render(<TestGeneration onGenerate={mockOnGenerate} />);

      expect(screen.getByText(/Hardhat/i)).toBeInTheDocument();
      expect(screen.getByText(/Foundry/i)).toBeInTheDocument();
    });
  });

  describe("Contract Code Input", () => {
    it("accepts contract code", () => {
      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const input = screen.getByPlaceholderText(/Paste your contract code/i);
      fireEvent.change(input, { target: { value: "contract Test {}" } });

      expect(input).toHaveValue("contract Test {}");
    });

    it("parses contract name from code", async () => {
      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const codeInput = screen.getByPlaceholderText(/Paste your contract code/i);
      fireEvent.change(codeInput, { target: { value: "contract MyContract {}" } });

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText(/Contract name/i);
        expect(nameInput).toHaveValue("MyContract");
      });
    });

    it("allows manual contract name input", () => {
      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const nameInput = screen.getByPlaceholderText(/Contract name/i);
      fireEvent.change(nameInput, { target: { value: "CustomName" } });

      expect(nameInput).toHaveValue("CustomName");
    });
  });

  describe("Framework Selection", () => {
    it("defaults to hardhat", () => {
      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const hardhatCheckbox = screen.getByLabelText(/Hardhat/i);
      expect(hardhatCheckbox).toBeChecked();
    });

    it("allows selecting foundry", () => {
      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const foundryCheckbox = screen.getByLabelText(/Foundry/i);
      fireEvent.click(foundryCheckbox);

      expect(foundryCheckbox).toBeChecked();
    });

    it("allows selecting multiple frameworks", () => {
      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const hardhatCheckbox = screen.getByLabelText(/Hardhat/i);
      const foundryCheckbox = screen.getByLabelText(/Foundry/i);

      fireEvent.click(foundryCheckbox);

      expect(hardhatCheckbox).toBeChecked();
      expect(foundryCheckbox).toBeChecked();
    });
  });

  describe("Test Generation", () => {
    it("calls onGenerate with correct parameters", async () => {
      mockOnGenerate.mockResolvedValueOnce(mockSuccessResult);

      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const codeInput = screen.getByPlaceholderText(/Paste your contract code/i);
      fireEvent.change(codeInput, { target: { value: "contract MyContract {}" } });

      const generateButton = screen.getByText(/Generate Tests/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockOnGenerate).toHaveBeenCalledWith(
          "contract MyContract {}",
          "MyContract",
          ["hardhat"]
        );
      });
    });

    it("shows loading state during generation", async () => {
      mockOnGenerate.mockImplementation(() => new Promise(() => {}));

      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const codeInput = screen.getByPlaceholderText(/Paste your contract code/i);
      fireEvent.change(codeInput, { target: { value: "contract MyContract {}" } });

      const generateButton = screen.getByText(/Generate Tests/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Generating/i)).toBeInTheDocument();
      });
    });

    it("displays generated tests", async () => {
      mockOnGenerate.mockResolvedValueOnce(mockSuccessResult);

      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const codeInput = screen.getByPlaceholderText(/Paste your contract code/i);
      fireEvent.change(codeInput, { target: { value: "contract MyContract {}" } });

      const generateButton = screen.getByText(/Generate Tests/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/describe\('MyContract'/i)).toBeInTheDocument();
      });
    });

    it("shows error on generation failure", async () => {
      mockOnGenerate.mockResolvedValueOnce({
        success: false,
        error: "Generation failed",
      });

      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const codeInput = screen.getByPlaceholderText(/Paste your contract code/i);
      fireEvent.change(codeInput, { target: { value: "contract MyContract {}" } });

      const generateButton = screen.getByText(/Generate Tests/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Generation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe("Validation", () => {
    it("requires contract code", () => {
      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const generateButton = screen.getByText(/Generate Tests/i);
      fireEvent.click(generateButton);

      expect(mockOnGenerate).not.toHaveBeenCalled();
    });

    it("requires contract name", () => {
      render(<TestGeneration onGenerate={mockOnGenerate} />);

      const codeInput = screen.getByPlaceholderText(/Paste your contract code/i);
      fireEvent.change(codeInput, { target: { value: "// no contract" } });

      const generateButton = screen.getByText(/Generate Tests/i);
      fireEvent.click(generateButton);

      expect(mockOnGenerate).not.toHaveBeenCalled();
    });
  });
});

