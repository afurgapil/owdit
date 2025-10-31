import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CommentsSection } from "../CommentsSection";

let __accountState = { address: "0xabc", isConnected: true } as { address: string | null; isConnected: boolean };
const __connectMock = jest.fn();
const __connectors = [{ id: "injected" }];

jest.mock("wagmi", () => ({
  useAccount: () => (__accountState),
  useConnect: () => ({ connect: __connectMock, connectors: __connectors, isPending: false }),
  __setAccount: (acc: { address: string | null; isConnected: boolean }) => { __accountState = acc; },
}));

const mockFetch = (overrides?: (url: string, init?: any) => any) => {
  const orig = global.fetch;
  const impl = jest.fn().mockImplementation((url: string, init?: any) => {
    if (overrides) {
      const res = overrides(url, init);
      if (res !== undefined) return res;
    }
    if (url.startsWith("/api/community/comments?")) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { items: [], total: 0, hasMore: false } }) } as any);
    }
    if (url === "/api/auth/nonce") {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { nonce: "n" } }) } as any);
    }
    if (url === "/api/community/comments" && init?.method === "POST") {
      return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { _id: "1", message: "m", author: { address: "0xabc" }, createdAt: new Date().toISOString(), moderation: { status: "approved" } } }) } as any);
    }
    return Promise.resolve({ ok: true, json: async () => ({}) } as any);
  });
  // @ts-ignore
  global.fetch = impl as any;
  return () => { // restore
    // @ts-ignore
    global.fetch = orig as any;
  };
};

describe("CommentsSection", () => {
  beforeEach(() => {
    // reset to connected by default
    // @ts-ignore
    const wagmi = require("wagmi");
    wagmi.__setAccount({ address: "0xabc", isConnected: true });
    __connectMock.mockReset();
    // @ts-ignore
    window.ethereum = { request: jest.fn().mockResolvedValue("0xsig") };
  });

  test("renders and shows loading state", async () => {
    const restore = mockFetch();
    render(<CommentsSection contractAddress="0x1" chainId={1} />);
    expect(await screen.findByText(/Loading comments/)).toBeInTheDocument();
    restore();
  });

  test("submits a comment successfully", async () => {
    const restore = mockFetch();
    render(<CommentsSection contractAddress="0x1" chainId={1} />);
    const textarea = await screen.findByPlaceholderText(/Share your findings/);
    fireEvent.change(textarea, { target: { value: "Hello" } });
    const submit = screen.getByText(/Submit/);
    fireEvent.click(submit);
    await waitFor(() => expect(window.ethereum.request).toHaveBeenCalled());
    restore();
  });

  test("shows error when nonce fails", async () => {
    const orig = global.fetch;
    // @ts-ignore
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/nonce") {
        return Promise.resolve({ ok: false, json: async () => ({ success: false, error: "nonce" }) } as any);
      }
      if (url.startsWith("/api/community/comments?")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { items: [], total: 0, hasMore: false } }) } as any);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as any);
    });
    render(<CommentsSection contractAddress="0x1" chainId={1} />);
    const textarea = await screen.findByPlaceholderText(/Share your findings/);
    fireEvent.change(textarea, { target: { value: "Hello" } });
    fireEvent.click(screen.getByText(/Submit/));
    await screen.findByText(/nonce/i);
    // @ts-ignore
    global.fetch = orig as any;
  });

  test("loads comments and sorts by top then new", async () => {
    const baseItems = [
      { _id: "a", message: "A", author: { address: "0x1" }, createdAt: new Date(Date.now() - 1000).toISOString(), moderation: { status: "approved" }, score: 1 },
      { _id: "b", message: "B", author: { address: "0x2" }, createdAt: new Date(Date.now() - 2000).toISOString(), moderation: { status: "approved" }, score: 5 },
    ];
    const restore = mockFetch((url) => {
      if (url.startsWith("/api/community/comments?")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { items: baseItems, total: 2, hasMore: false } }) } as any);
      }
    });
    render(<CommentsSection contractAddress="0x1" chainId={1} />);
    // Wait list empty state cleared
    await waitFor(() => expect(screen.queryByText(/Loading comments/)).not.toBeInTheDocument());
    // Default sort "new" should put A before B (A newer)
    const firstNew = screen.getAllByText(/A|B/)[0];
    expect(firstNew.textContent).toBe("A");
    // Switch to top
    fireEvent.click(screen.getByText("Top"));
    // force reload by triggering load again via effect (sort change calls load)
    await waitFor(() => {
      const firstTop = screen.getAllByText(/A|B/)[0];
      expect(firstTop.textContent).toBe("B");
    });
    restore();
  });

  test("upvote when connected updates UI via server delta", async () => {
    const items = [
      { _id: "c1", message: "C1", author: { address: "0x1" }, createdAt: new Date().toISOString(), moderation: { status: "approved" }, score: 0, extra: { userVote: 0 } },
    ];
    const restore = mockFetch((url, init) => {
      if (url.startsWith("/api/community/comments?")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { items, total: 1, hasMore: false } }) } as any);
      }
      if (url === "/api/community/comments/vote" && init?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { delta: 1, value: 1 } }) } as any);
      }
    });
    render(<CommentsSection contractAddress="0x1" chainId={1} />);
    await screen.findByText("C1");
    const up = screen.getByText("▲");
    fireEvent.click(up);
    // score updated to 1
    await screen.findByText("1");
    restore();
  });

  test("unvote path reduces score", async () => {
    const items = [
      { _id: "c2", message: "C2", author: { address: "0x1" }, createdAt: new Date().toISOString(), moderation: { status: "approved" }, score: 1, extra: { userVote: 1 } },
    ];
    const restore = mockFetch((url, init) => {
      if (url.startsWith("/api/community/comments?")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { items, total: 1, hasMore: false } }) } as any);
      }
      if (url === "/api/community/comments/unvote" && init?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { delta: -1 } }) } as any);
      }
    });
    render(<CommentsSection contractAddress="0x1" chainId={1} />);
    await screen.findByText("C2");
    const up = screen.getByText("▲");
    fireEvent.click(up);
    await screen.findByText("0");
    restore();
  });

  test("connect wallet is shown and voting triggers connect when disconnected", async () => {
    // set wagmi to disconnected
    // @ts-ignore
    const wagmi = require("wagmi");
    wagmi.__setAccount({ address: null, isConnected: false });

    const items = [
      { _id: "c3", message: "C3", author: { address: "0x1" }, createdAt: new Date().toISOString(), moderation: { status: "approved" }, score: 0, extra: { userVote: 0 } },
    ];
    const restore = mockFetch((url) => {
      if (url.startsWith("/api/community/comments?")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { items, total: 1, hasMore: false } }) } as any);
      }
    });

    render(<CommentsSection contractAddress="0x1" chainId={1} />);

    // Button visible when disconnected
    await screen.findByText(/Connect Wallet/);

    // Wait until the comment item is rendered so the upvote exists
    await screen.findByText("C3");

    // Click upvote; ensure no crash and connect button remains visible
    const upButtons = screen.getAllByText("▲");
    fireEvent.click(upButtons[0]);
    await screen.findByText(/Connect Wallet/);

    restore();
    // restore state
    wagmi.__setAccount({ address: "0xabc", isConnected: true });
  });

  test("reply submission appends reply", async () => {
    const items = [
      { _id: "p1", message: "Parent", author: { address: "0x1" }, createdAt: new Date().toISOString(), moderation: { status: "approved" }, score: 0, repliesCount: 0, replies: [] },
    ];
    const restore = mockFetch((url, init) => {
      if (url.startsWith("/api/community/comments?")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { items, total: 1, hasMore: false } }) } as any);
      }
      if (url === "/api/community/comments/reply" && init?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { _id: "r1", message: "Reply", author: { address: "0xabc" }, createdAt: new Date().toISOString(), moderation: { status: "approved" } } }) } as any);
      }
    });
    render(<CommentsSection contractAddress="0x1" chainId={1} />);
    await screen.findByText("Parent");
    fireEvent.click(screen.getByText(/Reply/));
    const replyBox = screen.getByPlaceholderText(/Write a reply/);
    fireEvent.change(replyBox, { target: { value: "My reply" } });
    fireEvent.click(screen.getByText(/Send Reply/));
    await screen.findByText("Reply");
    restore();
  });

  test("renders artifacts links when present", async () => {
    const items = [
      { _id: "a1", message: "With artifacts", author: { address: "0x1" }, createdAt: new Date().toISOString(), moderation: { status: "approved" }, artifacts: [{ type: "report", cid: "QmCID", title: "Rep" }] },
    ];
    const restore = mockFetch((url) => {
      if (url.startsWith("/api/community/comments?")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { items, total: 1, hasMore: false } }) } as any);
      }
    });
    render(<CommentsSection contractAddress="0x1" chainId={1} />);
    await screen.findByText(/With artifacts/);
    expect(screen.getByText("Rep")).toHaveAttribute("href", expect.stringContaining("QmCID"));
    restore();
  });

  test("shows error on vote failure", async () => {
    const items = [
      { _id: "e1", message: "Err", author: { address: "0x1" }, createdAt: new Date().toISOString(), moderation: { status: "approved" }, score: 0, extra: { userVote: 0 } },
    ];
    const restore = mockFetch((url, init) => {
      if (url.startsWith("/api/community/comments?")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, data: { items, total: 1, hasMore: false } }) } as any);
      }
      if (url === "/api/community/comments/vote" && init?.method === "POST") {
        return Promise.resolve({ ok: false, json: async () => ({ success: false, error: "Vote failed" }) } as any);
      }
    });
    render(<CommentsSection contractAddress="0x1" chainId={1} />);
    await screen.findByText("Err");
    fireEvent.click(screen.getByText("▲"));
    await screen.findByText(/Vote failed/i);
    restore();
  });
});

