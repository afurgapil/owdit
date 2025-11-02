import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReleaseBadge } from "../ReleaseBadge";

describe("ReleaseBadge", () => {
  it("should render the badge button", () => {
    render(<ReleaseBadge />);
    const button = screen.getByRole("button", { name: /free release phase/i });
    expect(button).toBeInTheDocument();
  });

  it("should display the badge with correct text", () => {
    render(<ReleaseBadge />);
    expect(screen.getByText("Free Release Phase")).toBeInTheDocument();
  });

  it("should expand and show detailed information when clicked", () => {
    render(<ReleaseBadge />);
    const button = screen.getByRole("button", { name: /free release phase/i });

    // Info panel should not be visible initially
    expect(
      screen.queryByText("🎉 Free Operations Now")
    ).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(button);

    // Info panel should now be visible
    expect(screen.getByText("🎉 Free Operations Now")).toBeInTheDocument();
    expect(screen.getByText("📅 After Release")).toBeInTheDocument();
  });

  it("should collapse when clicked again", () => {
    render(<ReleaseBadge />);
    const button = screen.getByRole("button", { name: /free release phase/i });

    // Expand
    fireEvent.click(button);
    expect(screen.getByText("🎉 Free Operations Now")).toBeInTheDocument();

    // Collapse
    fireEvent.click(button);
    expect(
      screen.queryByText("🎉 Free Operations Now")
    ).not.toBeInTheDocument();
  });

  it("should display all current benefits", () => {
    render(<ReleaseBadge />);
    const button = screen.getByRole("button", { name: /free release phase/i });
    fireEvent.click(button);

    expect(screen.getByText("Current Benefits")).toBeInTheDocument();
    expect(screen.getByText("No gas fees during analysis")).toBeInTheDocument();
    expect(
      screen.getByText("Free transaction processing")
    ).toBeInTheDocument();
    expect(screen.getByText("Unlimited operations")).toBeInTheDocument();
    expect(screen.getByText("Full feature access")).toBeInTheDocument();
  });

  it("should display the main message about Owdit covering fees", () => {
    render(<ReleaseBadge />);
    const button = screen.getByRole("button", { name: /free release phase/i });
    fireEvent.click(button);

    expect(
      screen.getByText(/all transaction fees and operations are covered by/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Owdit")).toBeInTheDocument();
  });

  it("should display information about post-release fees", () => {
    render(<ReleaseBadge />);
    const button = screen.getByRole("button", { name: /free release phase/i });
    fireEvent.click(button);

    expect(
      screen.getByText(
        /users will be responsible for their own transaction fees/i
      )
    ).toBeInTheDocument();
  });

  it("should have a tooltip message on hover", () => {
    render(<ReleaseBadge />);
    expect(
      screen.getByText("Click to learn more about pricing")
    ).toBeInTheDocument();
  });
});
