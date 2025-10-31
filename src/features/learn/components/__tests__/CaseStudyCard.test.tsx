import React from "react";
import { render, screen } from "@testing-library/react";
import { CaseStudyCard } from "../CaseStudyCard";

describe("CaseStudyCard", () => {
  const mockProps = {
    title: "Test Hack",
    amount: "$100M",
    description: "This is a test case study description",
    source: "Test Source",
    link: {
      text: "Read more",
      url: "https://example.com",
    },
    borderColor: "border-red-500",
    iconColor: "text-red-500",
    iconBgColor: "bg-red-500/20",
    amountColor: "text-red-400",
    amountBgColor: "bg-red-500/20",
  };

  it("renders case study card", () => {
    render(<CaseStudyCard {...mockProps} />);

    expect(screen.getByText("Test Hack")).toBeInTheDocument();
  });

  it("displays title", () => {
    render(<CaseStudyCard {...mockProps} />);

    const title = screen.getByText("Test Hack");
    expect(title.tagName).toBe("H3");
  });

  it("displays amount", () => {
    render(<CaseStudyCard {...mockProps} />);

    expect(screen.getByText("$100M")).toBeInTheDocument();
  });

  it("displays description", () => {
    render(<CaseStudyCard {...mockProps} />);

    expect(screen.getByText("This is a test case study description")).toBeInTheDocument();
  });

  it("displays source when provided", () => {
    render(<CaseStudyCard {...mockProps} />);

    expect(screen.getByText("Test Source")).toBeInTheDocument();
  });

  it("hides source when not provided", () => {
    const propsWithoutSource = { ...mockProps, source: undefined };
    render(<CaseStudyCard {...propsWithoutSource} />);

    expect(screen.queryByText("Test Source")).not.toBeInTheDocument();
  });

  it("displays link when provided", () => {
    render(<CaseStudyCard {...mockProps} />);

    const link = screen.getByText("Read more");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "https://example.com");
  });

  it("opens link in new tab", () => {
    render(<CaseStudyCard {...mockProps} />);

    const link = screen.getByText("Read more").closest("a");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("hides link when not provided", () => {
    const propsWithoutLink = { ...mockProps, link: undefined };
    render(<CaseStudyCard {...propsWithoutLink} />);

    expect(screen.queryByText("Read more")).not.toBeInTheDocument();
  });

  it("applies custom colors", () => {
    const { container } = render(<CaseStudyCard {...mockProps} />);

    const card = container.querySelector(".border-red-500");
    expect(card).toBeInTheDocument();
  });

  it("renders AlertTriangle icon", () => {
    const { container } = render(<CaseStudyCard {...mockProps} />);

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("renders ExternalLink icon when link is provided", () => {
    const { container } = render(<CaseStudyCard {...mockProps} />);

    const icons = container.querySelectorAll("svg");
    // AlertTriangle + ExternalLink
    expect(icons.length).toBe(2);
  });
});

