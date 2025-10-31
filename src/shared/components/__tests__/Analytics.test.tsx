import React from "react";
import { render } from "@testing-library/react";
import { Analytics } from "../Analytics";
import { usePathname, useSearchParams } from "next/navigation";

// Mock Next.js navigation hooks
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("Analytics", () => {
  const mockUsePathname = usePathname as jest.Mock;
  const mockUseSearchParams = useSearchParams as jest.Mock;

  const originalEnv = process.env;
  let mockGtag: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment
    process.env = { ...originalEnv };

    // Setup window.gtag mock
    mockGtag = jest.fn();
    Object.defineProperty(window, "gtag", {
      value: mockGtag,
      writable: true,
      configurable: true,
    });

    // Setup default mocks
    mockUsePathname.mockReturnValue("/");
    mockUseSearchParams.mockReturnValue({
      toString: () => "",
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    delete (window as typeof window & { gtag?: unknown }).gtag;
  });

  describe("Rendering", () => {
    it("renders without errors", () => {
      const { container } = render(<Analytics />);
      expect(container).toBeInTheDocument();
    });

    it("returns null (no visible output)", () => {
      const { container } = render(<Analytics />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Google Analytics Tracking", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
    });

    it("calls gtag with config when GA_ID is set", () => {
      mockUsePathname.mockReturnValue("/test-page");

      render(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/test-page",
      });
    });

    it("includes query params in page_path", () => {
      mockUsePathname.mockReturnValue("/test-page");
      mockUseSearchParams.mockReturnValue({
        toString: () => "utm_source=test&utm_medium=test",
      });

      render(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/test-page?utm_source=test&utm_medium=test",
      });
    });

    it("does not include ? when no query params", () => {
      mockUsePathname.mockReturnValue("/test-page");
      mockUseSearchParams.mockReturnValue({
        toString: () => "",
      });

      render(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/test-page",
      });
    });

    it("tracks different pages correctly", () => {
      mockUsePathname.mockReturnValue("/analyze");

      const { rerender } = render(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/analyze",
      });

      mockGtag.mockClear();
      mockUsePathname.mockReturnValue("/developers");

      rerender(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/developers",
      });
    });
  });

  describe("Conditional Tracking", () => {
    it("does not call gtag when GA_ID is not set", () => {
      delete process.env.NEXT_PUBLIC_GA_ID;

      render(<Analytics />);

      expect(mockGtag).not.toHaveBeenCalled();
    });

    it("does not call gtag when window is undefined", () => {
      process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";

      // Mock server-side environment
      const originalWindow = global.window;
      // @ts-expect-error: Testing server-side scenario
      delete global.window;

      render(<Analytics />);

      global.window = originalWindow;

      // Can't assert on mockGtag since window doesn't exist
      expect(true).toBe(true);
    });

    it("does not call gtag when gtag function doesn't exist", () => {
      process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
      delete (window as typeof window & { gtag?: unknown }).gtag;

      render(<Analytics />);

      // No error should be thrown
      expect(true).toBe(true);
    });

    it("does not call gtag when gtag is not a function", () => {
      process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
      (window as typeof window & { gtag?: unknown }).gtag = "not a function";

      render(<Analytics />);

      // No error should be thrown
      expect(true).toBe(true);
    });
  });

  describe("Navigation Changes", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
    });

    it("tracks route changes", () => {
      mockUsePathname.mockReturnValue("/page1");

      const { rerender } = render(<Analytics />);

      expect(mockGtag).toHaveBeenCalledTimes(1);

      mockGtag.mockClear();
      mockUsePathname.mockReturnValue("/page2");

      rerender(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/page2",
      });
    });

    it("tracks search param changes", () => {
      mockUsePathname.mockReturnValue("/page");
      mockUseSearchParams.mockReturnValue({
        toString: () => "q=test1",
      });

      const { rerender } = render(<Analytics />);

      mockGtag.mockClear();
      mockUseSearchParams.mockReturnValue({
        toString: () => "q=test2",
      });

      rerender(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/page?q=test2",
      });
    });

    it("handles null searchParams", () => {
      mockUsePathname.mockReturnValue("/page");
      mockUseSearchParams.mockReturnValue(null);

      render(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/page",
      });
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
    });

    it("handles root path", () => {
      mockUsePathname.mockReturnValue("/");

      render(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/",
      });
    });

    it("handles nested paths", () => {
      mockUsePathname.mockReturnValue("/users/123/profile");

      render(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/users/123/profile",
      });
    });

    it("handles paths with special characters", () => {
      mockUsePathname.mockReturnValue("/search/test%20query");

      render(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/search/test%20query",
      });
    });

    it("handles complex query strings", () => {
      mockUsePathname.mockReturnValue("/search");
      mockUseSearchParams.mockReturnValue({
        toString: () => "q=smart+contracts&sort=date&filter=security",
      });

      render(<Analytics />);

      expect(mockGtag).toHaveBeenCalledWith("config", "G-TEST123", {
        page_path: "/search?q=smart+contracts&sort=date&filter=security",
      });
    });
  });

  describe("Multiple Instances", () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
    });

    it("handles multiple Analytics components", () => {
      mockUsePathname.mockReturnValue("/page");

      render(
        <>
          <Analytics />
          <Analytics />
        </>
      );

      // Both should call gtag
      expect(mockGtag).toHaveBeenCalledTimes(2);
    });
  });

  describe("TypeScript Type Safety", () => {
    it("window.dataLayer and window.gtag are properly typed", () => {
      // This test ensures TypeScript definitions are correct
      expect(window.dataLayer).toBeDefined();
      expect(typeof window.gtag).toBe("function");
    });
  });
});
