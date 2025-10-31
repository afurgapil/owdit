import React from "react";

type HistoryItemProps = { item?: { address?: string } };

export function HistoryItem({ item }: HistoryItemProps) {
	return <div data-testid="history-item-mock">{item?.address || "mock-item"}</div>;
}
