import React from "react";
import { render, screen } from "@testing-library/react";
import { FeatureCard } from "../FeatureCard";
import { Shield } from "lucide-react";

describe("FeatureCard", () => {
  const mockProps = {
    icon: Shield,
    title: "Test Feature",
    description: "This is a test feature description",
    features: ["Feature 1", "Feature 2", "Feature 3"],
    borderColor: "border-neon-blue",
    iconColor: "text-neon-blue",
    iconBgColor: "bg-neon-blue/20",
  };

  it("renders feature card", () => {
    render(<FeatureCard {...mockProps} />);

    expect(screen.getByText("Test Feature")).toBeInTheDocument();
  });

  it("displays title", () => {
    render(<FeatureCard {...mockProps} />);

    const title = screen.getByText("Test Feature");
    expect(title.tagName).toBe("H3");
  });

  it("displays description", () => {
    render(<FeatureCard {...mockProps} />);

    expect(screen.getByText("This is a test feature description")).toBeInTheDocument();
  });

  it("renders all features", () => {
    render(<FeatureCard {...mockProps} />);

    expect(screen.getByText("Feature 1")).toBeInTheDocument();
    expect(screen.getByText("Feature 2")).toBeInTheDocument();
    expect(screen.getByText("Feature 3")).toBeInTheDocument();
  });

  it("applies custom colors", () => {
    const { container } = render(<FeatureCard {...mockProps} />);

    const card = container.querySelector(".border-neon-blue");
    expect(card).toBeInTheDocument();
  });

  it("renders icon", () => {
    const { container } = render(<FeatureCard {...mockProps} />);

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("renders checkmarks for each feature", () => {
    const { container } = render(<FeatureCard {...mockProps} />);

    const checkIcons = container.querySelectorAll("svg");
    // Icon + check icons for each feature
    expect(checkIcons.length).toBeGreaterThan(mockProps.features.length);
  });

  it("handles empty features array", () => {
    const propsWithNoFeatures = { ...mockProps, features: [] };
    render(<FeatureCard {...propsWithNoFeatures} />);

    expect(screen.getByText("Test Feature")).toBeInTheDocument();
  });
});

