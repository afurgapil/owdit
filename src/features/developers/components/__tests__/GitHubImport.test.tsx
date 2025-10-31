import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import GitHubImport from "../GitHubImport";

// Mock fetch
// @ts-ignore
global.fetch = jest.fn();

// Mock window.open
const openSpy = jest.fn();
const originalOpen = window.open;
window.open = openSpy as any;

describe("GitHubImport", () => {
  const mockOnFilesChange = jest.fn();
  const mockOnSelectedFilesChange = jest.fn();
  const mockOnRepoInfoChange = jest.fn();
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    openSpy.mockReset();
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

    it("fetches repository when valid URL is provided and updates callbacks", async () => {
      const mockResponse = {
        success: true,
        data: {
          files: [
            {
              path: "contracts/test.sol",
              content: "contract Test {}\nline2",
              size: 100,
              url: "http://test.com/file",
            },
          ],
          repoInfo: { name: "repo", owner: "user", language: "Solidity", stars: 10, forks: 1 },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
          onRepoInfoChange={mockOnRepoInfoChange}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/GitHub repository URL/i), {
        target: { value: "https://github.com/user/repo" },
      });

      fireEvent.click(screen.getByText(/Fetch Repository/i));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/github/fetch-repo",
          expect.objectContaining({ method: "POST" })
        );
      });

      // Files shown and stats rendered
      expect(await screen.findByText(/Smart Contract Files \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/2 lines/)).toBeInTheDocument();
      // Repo info callback
      expect(mockOnRepoInfoChange).toHaveBeenCalledWith(expect.objectContaining({ name: "repo", owner: "user" }));
      // onFilesChange called
      expect(mockOnFilesChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ path: "contracts/test.sol" })]));

      // open link
      fireEvent.click(screen.getByTitle(/Open in GitHub/));
      expect(openSpy).toHaveBeenCalledWith("http://test.com/file", "_blank");
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

      fireEvent.change(screen.getByPlaceholderText(/GitHub repository URL/i), {
        target: { value: "https://github.com/user/repo" },
      });

      fireEvent.click(screen.getByText(/Fetch Repository/i));

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

      fireEvent.change(screen.getByPlaceholderText(/GitHub repository URL/i), {
        target: { value: "https://github.com/user/repo" },
      });

      fireEvent.click(screen.getByText(/Fetch Repository/i));

      await waitFor(() => {
        expect(screen.getByText(/Repository not found/i)).toBeInTheDocument();
      });
    });

    it("shows network error on exception", async () => {
      mockFetch.mockRejectedValueOnce(new Error("net"));

      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/GitHub repository URL/i), {
        target: { value: "https://github.com/user/repo" },
      });

      fireEvent.click(screen.getByText(/Fetch Repository/i));

      await waitFor(() => {
        expect(screen.getByText(/Network error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe("Selection and Filters", () => {
    const setupWithFiles = async () => {
      const mockResponse = {
        success: true,
        data: {
          files: [
            { path: "contracts/a.sol", content: "c\n1", size: 10, url: "u1" },
            { path: "src/b.ts", content: "c\n1\n2", size: 20, url: "u2" },
          ],
          repoInfo: { name: "repo", owner: "user" },
        },
      };
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse } as Response);
      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
        />
      );
      fireEvent.change(screen.getByPlaceholderText(/GitHub repository URL/i), {
        target: { value: "https://github.com/user/repo" },
      });
      fireEvent.click(screen.getByText(/Fetch Repository/i));
      await screen.findByText(/Smart Contract Files \(2\)/);
    };

    it("Select All/None toggles selected count and callback", async () => {
      await setupWithFiles();
      // Scope to the files section header
      const filesHeader = screen.getByText(/Smart Contract Files/).closest("div");
      expect(filesHeader).toBeTruthy();
      const headerScope = within(filesHeader as HTMLElement);
      const buttons = headerScope.getAllByText(/Select All|Select None/);
      // First is Select All, second is Select None
      fireEvent.click(buttons.find(b => b.textContent === "Select All")!);
      await waitFor(() => expect(mockOnSelectedFilesChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ path: "contracts/a.sol" })])));
      fireEvent.click(buttons.find(b => b.textContent === "Select None")!);
      await waitFor(() => expect(mockOnSelectedFilesChange).toHaveBeenCalledWith([]));
    });

    it("individual checkbox toggles selection", async () => {
      await setupWithFiles();
      // The first checkbox on the page is for "Include test files"; file checkboxes follow
      const checkboxes = screen.getAllByRole("checkbox");
      // Click first file checkbox (skip the include-tests checkbox)
      const fileCheckbox = checkboxes[1];
      fireEvent.click(fileCheckbox);
      await waitFor(() => expect(mockOnSelectedFilesChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ path: "contracts/a.sol" })])));
      fireEvent.click(fileCheckbox);
      await waitFor(() => expect(mockOnSelectedFilesChange).toHaveBeenCalledWith(expect.not.arrayContaining([expect.objectContaining({ path: "contracts/a.sol" })])));
    });

    it("extension toggles reflect in selected text and payload includes extensions, path and includeTests", async () => {
      // prepare resolve
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { files: [], repoInfo: { name: "r", owner: "o" } } }) } as Response);
      render(
        <GitHubImport
          onFilesChange={mockOnFilesChange}
          onSelectedFilesChange={mockOnSelectedFilesChange}
        />
      );
      // toggle an extension (e.g., .go)
      fireEvent.click(screen.getByText(/Go/));
      // select none extensions
      fireEvent.click(screen.getAllByText(/^Select None$/)[0]);
      expect(screen.getByText(/No files will be found/)).toBeInTheDocument();
      // select all extensions
      fireEvent.click(screen.getAllByText(/^Select All$/)[0]);
      expect(screen.getByText(/Will search for:/)).toBeInTheDocument();

      // set path and include tests, then fetch
      fireEvent.change(screen.getByPlaceholderText(/contracts\//i), { target: { value: "contracts/" } });
      fireEvent.click(screen.getByText(/Include test files/));
      fireEvent.change(screen.getByPlaceholderText(/GitHub repository URL/i), { target: { value: "https://github.com/user/repo" } });
      fireEvent.click(screen.getByText(/Fetch Repository/i));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/github/fetch-repo",
          expect.objectContaining({
            method: "POST",
            headers: expect.any(Object),
            body: expect.stringContaining("\"includeTests\":true")
          })
        );
      });
    });
  });

  afterAll(() => {
    window.open = originalOpen;
  });
});
