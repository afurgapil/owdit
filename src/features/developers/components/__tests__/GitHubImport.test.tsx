import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GitHubImport from "../GitHubImport";

// Mock fetch
global.fetch = jest.fn();

describe("GitHubImport", () => {
  const mockOnFilesChange = jest.fn();
  const mockOnSelectedFilesChange = jest.fn();
  const mockOnRepoInfoChange = jest.fn();
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders GitHub import component", () => {
      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
        />
      );

      expect(
        screen.getByPlaceholderText(/GitHub repository URL/i)
      ).toBeInTheDocument();
    });

    it("shows fetch button", () => {
      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
        />
      );

      expect(screen.getByText(/Fetch Repository/i)).toBeInTheDocument();
    });
  });

  describe("URL Input", () => {
    it("allows entering repository URL", () => {
      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
        />
      );

      const input = screen.getByPlaceholderText(/GitHub repository URL/i);
      fireEvent.change(input, {
        target: { value: "https://github.com/user/repo" },
      });

      expect(input).toHaveValue("https://github.com/user/repo");
    });
  });

  describe("Repository Fetching", () => {
    it("validates URL before fetching", async () => {
      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
        />
      );

      const button = screen.getByText(/Fetch Repository/i);
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByText(/enter a GitHub repository URL/i)
        ).toBeInTheDocument();
      });
    });

    it("shows error for invalid URL format", async () => {
      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
        />
      );

      const input = screen.getByPlaceholderText(/GitHub repository URL/i);
      fireEvent.change(input, { target: { value: "not a valid url" } });

      const button = screen.getByText(/Fetch Repository/i);
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByText(/Invalid GitHub repository URL/i)
        ).toBeInTheDocument();
      });
    });

    it("fetches repository when valid URL is provided", async () => {
      const mockResponse = {
        success: true,
        files: [
          {
            path: "test.sol",
            content: "contract Test {}",
            size: 100,
            url: "http://test.com",
          },
        ],
        repoInfo: { name: "repo", owner: "user" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
        />
      );

      const input = screen.getByPlaceholderText(/GitHub repository URL/i);
      fireEvent.change(input, {
        target: { value: "https://github.com/user/repo" },
      });

      const button = screen.getByText(/Fetch Repository/i);
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/github/fetch-repo",
          expect.objectContaining({
            method: "POST",
          })
        );
      });
    });
  });

  describe("Loading State", () => {
    it("shows loading indicator while fetching", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
        />
      );

      const input = screen.getByPlaceholderText(/GitHub repository URL/i);
      fireEvent.change(input, {
        target: { value: "https://github.com/user/repo" },
      });

      const button = screen.getByText(/Fetch Repository/i);
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Fetching/i)).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("displays error message on fetch failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: "Repository not found" }),
      } as Response);

      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
        />
      );

      const input = screen.getByPlaceholderText(/GitHub repository URL/i);
      fireEvent.change(input, {
        target: { value: "https://github.com/user/repo" },
      });

      const button = screen.getByText(/Fetch Repository/i);
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Repository not found/i)).toBeInTheDocument();
      });
    });
  });
});
