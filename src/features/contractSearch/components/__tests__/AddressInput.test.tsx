import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddressInput } from "../AddressInput";

describe("AddressInput", () => {
  const mockOnChange = jest.fn();
  const mockOnSearch = jest.fn();
  const mockOnClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders input field", () => {
      render(
        <AddressInput
          value=""
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const input = screen.getByPlaceholderText("0x...");
      expect(input).toBeInTheDocument();
    });

    it("displays custom placeholder", () => {
      render(
        <AddressInput
          value=""
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          placeholder="Enter contract address"
        />
      );

      expect(
        screen.getByPlaceholderText("Enter contract address")
      ).toBeInTheDocument();
    });

    it("shows help text", () => {
      render(
        <AddressInput
          value=""
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      expect(
        screen.getByText(/Enter a valid Ethereum contract address/i)
      ).toBeInTheDocument();
    });
  });

  describe("Input Handling", () => {
    it("calls onChange when input value changes", () => {
      render(
        <AddressInput
          value=""
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const input = screen.getByPlaceholderText("0x...");
      fireEvent.change(input, { target: { value: "0x1234" } });

      expect(mockOnChange).toHaveBeenCalledWith("0x1234");
    });

    it("displays input value", () => {
      render(
        <AddressInput
          value="0xTestAddress"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const input = screen.getByPlaceholderText("0x...") as HTMLInputElement;
      expect(input.value).toBe("0xTestAddress");
    });

    it("disables input when loading", () => {
      render(
        <AddressInput
          value=""
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          isLoading={true}
        />
      );

      const input = screen.getByPlaceholderText("0x...");
      expect(input).toBeDisabled();
    });
  });

  describe("Search Button", () => {
    it("displays Analyze button text", () => {
      render(
        <AddressInput
          value="0x1234"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      expect(screen.getByText("Analyze")).toBeInTheDocument();
    });

    it("calls onSearch when button is clicked", () => {
      render(
        <AddressInput
          value="0x1234"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const button = screen.getByText("Analyze");
      fireEvent.click(button);

      expect(mockOnSearch).toHaveBeenCalledTimes(1);
    });

    it("calls onSearch when form is submitted", () => {
      render(
        <AddressInput
          value="0x1234"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const input = screen.getByPlaceholderText("0x...");
      fireEvent.submit(input.closest("form")!);

      expect(mockOnSearch).toHaveBeenCalledTimes(1);
    });

    it("disables button when input is empty", () => {
      render(
        <AddressInput
          value=""
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const button = screen.getByRole("button", { name: /Analyze/i });
      expect(button).toBeDisabled();
    });

    it("disables button when input contains only whitespace", () => {
      render(
        <AddressInput
          value="   "
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const button = screen.getByRole("button", { name: /Analyze/i });
      expect(button).toBeDisabled();
    });

    it("disables button when loading", () => {
      render(
        <AddressInput
          value="0x1234"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          isLoading={true}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("shows loading state", () => {
      render(
        <AddressInput
          value="0x1234"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          isLoading={true}
        />
      );

      expect(screen.getByText("Analyzing...")).toBeInTheDocument();
    });

    it("displays spinner when loading", () => {
      const { container } = render(
        <AddressInput
          value="0x1234"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          isLoading={true}
        />
      );

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("does not call onSearch when loading", () => {
      render(
        <AddressInput
          value="0x1234"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          isLoading={true}
        />
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(mockOnSearch).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("displays error message when error prop is provided", () => {
      render(
        <AddressInput
          value="invalid"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          error="Invalid address format"
        />
      );

      expect(screen.getByText("Invalid address format")).toBeInTheDocument();
    });

    it("shows error icon", () => {
      const { container } = render(
        <AddressInput
          value="invalid"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          error="Invalid address"
        />
      );

      const errorIcon = container.querySelector("svg");
      expect(errorIcon).toBeInTheDocument();
    });

    it("applies error styling to input", () => {
      render(
        <AddressInput
          value="invalid"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          error="Invalid address"
        />
      );

      const input = screen.getByPlaceholderText("0x...");
      expect(input).toHaveClass("border-red-500");
    });

    it("shows Clear button when error is present and onClearError is provided", () => {
      render(
        <AddressInput
          value="invalid"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          error="Invalid address"
          onClearError={mockOnClearError}
        />
      );

      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("calls onClearError when Clear button is clicked", () => {
      render(
        <AddressInput
          value="invalid"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          error="Invalid address"
          onClearError={mockOnClearError}
        />
      );

      const clearButton = screen.getByText("Clear");
      fireEvent.click(clearButton);

      expect(mockOnClearError).toHaveBeenCalledTimes(1);
    });

    it("does not show Clear button when onClearError is not provided", () => {
      render(
        <AddressInput
          value="invalid"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
          error="Invalid address"
        />
      );

      expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    });

    it("does not show error UI when error is undefined", () => {
      render(
        <AddressInput
          value="0x1234"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      expect(screen.queryByText(/Invalid/i)).not.toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("prevents default form submission", () => {
      render(
        <AddressInput
          value="0x1234"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const form = screen.getByPlaceholderText("0x...").closest("form")!;
      const event = new Event("submit", { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(event, "preventDefault");

      form.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("does not submit with empty value", () => {
      render(
        <AddressInput
          value=""
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const form = screen.getByPlaceholderText("0x...").closest("form")!;
      fireEvent.submit(form);

      expect(mockOnSearch).not.toHaveBeenCalled();
    });
  });

  describe("Icons", () => {
    it("displays Search icon", () => {
      const { container } = render(
        <AddressInput
          value=""
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("displays Eye icon on button when not loading", () => {
      render(
        <AddressInput
          value="0x1234"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      expect(screen.getByText("Analyze")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("input has correct type", () => {
      render(
        <AddressInput
          value=""
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const input = screen.getByPlaceholderText("0x...");
      expect(input).toHaveAttribute("type", "text");
    });

    it("submit button has correct type", () => {
      render(
        <AddressInput
          value="0x1234"
          onChange={mockOnChange}
          onSearch={mockOnSearch}
        />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });
  });
});
