import React from "react";
import { render, screen } from "@testing-library/react";
import HistoryPage from "../page";

jest.mock("../HistoryContent", () => ({
  HistoryContent: () => <div data-testid="history-content" />,
}));

describe("/history page", () => {
  test("renders HistoryContent inside Suspense", () => {
    render(<HistoryPage />);
    expect(screen.getByTestId("history-content")).toBeInTheDocument();
  });
});
