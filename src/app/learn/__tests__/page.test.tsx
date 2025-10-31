import React from "react";
import { render, screen } from "@testing-library/react";
import LearnPage from "../page";

jest.mock("../../../shared/components/MatrixRain", () => ({
  MatrixRain: () => <div data-testid="matrix-rain" />,
}));

describe("/learn page", () => {
  test("renders hero heading and CTA links", () => {
    render(<LearnPage />);
    expect(screen.getByText(/Why Smart Contract Security Matters/i)).toBeInTheDocument();
    expect(screen.getByTestId("matrix-rain")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ANALYZE YOUR CONTRACT/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /VIEW ANALYSIS HISTORY/i })).toBeInTheDocument();
  });
});
