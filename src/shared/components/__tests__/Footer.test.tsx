import React from "react";
import { render, screen } from "@testing-library/react";
import { Footer } from "../Footer";

// Use automatic mock from __mocks__/next/image.tsx
jest.mock("next/image");

describe("Footer", () => {
  describe("Rendering", () => {
    it("renders footer component", () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector("footer");
      expect(footer).toBeInTheDocument();
    });

    it("renders Owdit logo", () => {
      render(<Footer />);

      const logo = screen.getByAltText("logo");
      expect(logo).toBeInTheDocument();
    });

    it("displays Owdit branding", () => {
      render(<Footer />);

      expect(screen.getByText("Owdit")).toBeInTheDocument();
      expect(screen.getByText("THE WATCHFUL OWL")).toBeInTheDocument();
    });
  });

  describe("Content", () => {
    it("displays description text", () => {
      render(<Footer />);

      const description = screen.getByText(
        /The OWL watches over your smart contracts/i
      );
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent("AI-powered security analysis");
      expect(description).toHaveTextContent("0G Network");
    });

    it("displays copyright notice", () => {
      render(<Footer />);

      const copyright = screen.getByText(/© 2025 Owdit/i);
      expect(copyright).toBeInTheDocument();
      expect(copyright).toHaveTextContent("All rights reserved");
    });
  });

  describe("Social Links", () => {
    it("renders GitHub link", () => {
      render(<Footer />);

      const githubLink = screen.getByRole("link", { name: /GitHub/i });
      expect(githubLink).toBeInTheDocument();
      expect(githubLink).toHaveAttribute(
        "href",
        "https://github.com/afurgapil/owdit"
      );
      expect(githubLink).toHaveAttribute("target", "_blank");
    });

    it("GitHub link opens in new tab", () => {
      render(<Footer />);

      const githubLink = screen.getByRole("link", { name: /GitHub/i });
      expect(githubLink).toHaveAttribute("target", "_blank");
    });

    it("displays GitHub icon", () => {
      const { container } = render(<Footer />);

      // Check for SVG icon (Github component from lucide-react)
      const githubIcon = container.querySelector("svg");
      expect(githubIcon).toBeInTheDocument();
    });
  });

  describe("Layout and Styling", () => {
    it("has proper footer structure", () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector("footer");
      expect(footer).toHaveClass("bg-black/80");
      expect(footer).toHaveClass("border-t");
    });

    it("contains max-width container", () => {
      const { container } = render(<Footer />);

      const maxWidthDiv = container.querySelector(".max-w-7xl");
      expect(maxWidthDiv).toBeInTheDocument();
    });

    it("renders in correct sections", () => {
      const { container } = render(<Footer />);

      // Should have logo section, description, and social links
      const sections = container.querySelectorAll(".flex");
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("has proper semantic HTML structure", () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector("footer");
      expect(footer?.tagName).toBe("FOOTER");
    });

    it("GitHub link has aria-label", () => {
      render(<Footer />);

      const githubLink = screen.getByLabelText("GitHub");
      expect(githubLink).toBeInTheDocument();
    });

    it("logo has alt text", () => {
      render(<Footer />);

      const logo = screen.getByAltText("logo");
      expect(logo).toHaveAttribute("alt", "logo");
    });
  });

  describe("Responsive Design Classes", () => {
    it("has responsive flex classes", () => {
      const { container } = render(<Footer />);

      const mainContainer = container.querySelector(".flex-col");
      expect(mainContainer).toHaveClass("md:flex-row");
    });

    it("has responsive spacing classes", () => {
      const { container } = render(<Footer />);

      const spacingDiv = container.querySelector(".space-y-8");
      expect(spacingDiv).toHaveClass("md:space-y-0");
    });
  });

  describe("Branding Elements", () => {
    it("displays all branding elements correctly", () => {
      render(<Footer />);

      // Logo
      expect(screen.getByAltText("logo")).toBeInTheDocument();

      // Company name
      expect(screen.getByText("Owdit")).toBeInTheDocument();

      // Tagline
      expect(screen.getByText("THE WATCHFUL OWL")).toBeInTheDocument();

      // Description
      expect(
        screen.getByText(/AI-powered security analysis/i)
      ).toBeInTheDocument();
    });
  });
});
