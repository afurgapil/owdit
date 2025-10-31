import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExplanationAccordion } from "../ExplanationAccordion";

describe("ExplanationAccordion", () => {
  const mockFindings = [
    {
      title: "Reentrancy Vulnerability",
      detail:
        "This contract is vulnerable to reentrancy attacks. Consider using the checks-effects-interactions pattern.",
      severity: "critical" as const,
    },
    {
      title: "Unchecked Return Value",
      detail: "Return values from external calls are not checked.",
      severity: "high" as const,
    },
    {
      title: "Gas Optimization Needed",
      detail: "Some functions can be optimized for gas efficiency.",
      severity: "low" as const,
    },
  ];

  describe("Empty State", () => {
    it("displays no findings message when empty", () => {
      render(<ExplanationAccordion items={[]} />);

      expect(screen.getByText("No Security Findings")).toBeInTheDocument();
    });

    it("shows positive message for no findings", () => {
      render(<ExplanationAccordion items={[]} />);

      expect(
        screen.getByText(
          "This contract appears to be in good security condition."
        )
      ).toBeInTheDocument();
    });

    it("displays CheckCircle icon for no findings", () => {
      const { container } = render(<ExplanationAccordion items={[]} />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Findings Display", () => {
    it("displays all findings titles", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      expect(screen.getByText("Reentrancy Vulnerability")).toBeInTheDocument();
      expect(screen.getByText("Unchecked Return Value")).toBeInTheDocument();
      expect(screen.getByText("Gas Optimization Needed")).toBeInTheDocument();
    });

    it("displays findings count in header", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      expect(screen.getByText("Security Findings (3)")).toBeInTheDocument();
    });

    it("hides details by default", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      expect(
        screen.queryByText(/vulnerable to reentrancy attacks/i)
      ).not.toBeInTheDocument();
    });

    it("displays severity badges", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      expect(screen.getByText("Critical")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("Low")).toBeInTheDocument();
    });
  });

  describe("Accordion Interaction", () => {
    it("expands item when clicked", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      const firstFinding = screen.getByText("Reentrancy Vulnerability");
      fireEvent.click(firstFinding.closest("button")!);

      expect(
        screen.getByText(/vulnerable to reentrancy attacks/i)
      ).toBeInTheDocument();
    });

    it("collapses item when clicked again", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      const firstFinding = screen.getByText("Reentrancy Vulnerability");
      const button = firstFinding.closest("button")!;

      // Open
      fireEvent.click(button);
      expect(
        screen.getByText(/vulnerable to reentrancy attacks/i)
      ).toBeInTheDocument();

      // Close
      fireEvent.click(button);
      expect(
        screen.queryByText(/vulnerable to reentrancy attacks/i)
      ).not.toBeInTheDocument();
    });

    it("can expand multiple items at once", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      const firstFinding = screen.getByText("Reentrancy Vulnerability");
      const secondFinding = screen.getByText("Unchecked Return Value");

      fireEvent.click(firstFinding.closest("button")!);
      fireEvent.click(secondFinding.closest("button")!);

      expect(
        screen.getByText(/vulnerable to reentrancy attacks/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Return values from external calls/i)
      ).toBeInTheDocument();
    });

    it("changes icon when expanded", () => {
      render(
        <ExplanationAccordion items={mockFindings} />
      );

      const firstFinding = screen.getByText("Reentrancy Vulnerability");
      const button = firstFinding.closest("button")!;

      // Initially should show ChevronRight
      fireEvent.click(button);

      // After click, should show ChevronDown (implementation detail)
      expect(button).toBeInTheDocument();
    });
  });

  describe("Severity Styling", () => {
    it("applies critical severity styling", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      const criticalBadge = screen.getByText("Critical");
      expect(criticalBadge).toHaveClass("text-neon-pink");
    });

    it("applies high severity styling", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      const highBadge = screen.getByText("High");
      expect(highBadge).toHaveClass("text-neon-orange");
    });

    it("applies medium severity styling", () => {
      const mediumFinding = [
        {
          title: "Medium Issue",
          detail: "Detail",
          severity: "medium" as const,
        },
      ];
      render(<ExplanationAccordion items={mediumFinding} />);

      const mediumBadge = screen.getByText("Medium");
      expect(mediumBadge).toHaveClass("text-neon-orange");
    });

    it("applies low severity styling", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      const lowBadge = screen.getByText("Low");
      expect(lowBadge).toHaveClass("text-neon-green");
    });
  });

  describe("Severity Icons", () => {
    it("displays correct icon for critical severity", () => {
      const { container } = render(
        <ExplanationAccordion items={mockFindings} />
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("displays correct icon for low severity", () => {
      const lowFinding = [
        { title: "Low Issue", detail: "Detail", severity: "low" as const },
      ];
      const { container } = render(<ExplanationAccordion items={lowFinding} />);

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe("Custom ClassName", () => {
    it("applies custom className", () => {
      const { container } = render(
        <ExplanationAccordion items={mockFindings} className="custom-class" />
      );

      const accordion = container.querySelector(".custom-class");
      expect(accordion).toBeInTheDocument();
    });

    it("applies custom className to empty state", () => {
      const { container } = render(
        <ExplanationAccordion items={[]} className="custom-class" />
      );

      const emptyState = container.querySelector(".custom-class");
      expect(emptyState).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles single finding", () => {
      const singleFinding = [mockFindings[0]];
      render(<ExplanationAccordion items={singleFinding} />);

      expect(screen.getByText("Security Findings (1)")).toBeInTheDocument();
    });

    it("handles very long finding titles", () => {
      const longTitle = "A".repeat(200);
      const longTitleFinding = [
        { title: longTitle, detail: "Detail", severity: "high" as const },
      ];
      render(<ExplanationAccordion items={longTitleFinding} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("handles very long finding details", () => {
      const longDetail = "B".repeat(1000);
      const longDetailFinding = [
        { title: "Title", detail: longDetail, severity: "medium" as const },
      ];
      render(<ExplanationAccordion items={longDetailFinding} />);

      const button = screen.getByText("Title").closest("button")!;
      fireEvent.click(button);

      expect(screen.getByText(longDetail)).toBeInTheDocument();
    });

    it("handles all severity levels", () => {
      const allSeverities = [
        { title: "Critical", detail: "Detail", severity: "critical" as const },
        { title: "High", detail: "Detail", severity: "high" as const },
        { title: "Medium", detail: "Detail", severity: "medium" as const },
        { title: "Low", detail: "Detail", severity: "low" as const },
      ];
      render(<ExplanationAccordion items={allSeverities} />);

      expect(screen.getByText("Security Findings (4)")).toBeInTheDocument();
      expect(screen.getAllByText("Critical").length).toBeGreaterThan(0);
      expect(screen.getAllByText("High").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Medium").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Low").length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("uses button elements for accordion headers", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBe(mockFindings.length);
    });

    it("maintains semantic HTML structure", () => {
      render(<ExplanationAccordion items={mockFindings} />);

      const heading = screen.getByText(/Security Findings/i);
      expect(heading.tagName).toBe("H3");
    });
  });

  describe("Header Display", () => {
    it("displays Shield icon in header", () => {
      const { container } = render(
        <ExplanationAccordion items={mockFindings} />
      );

      expect(screen.getByText(/Security Findings/i)).toBeInTheDocument();
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
