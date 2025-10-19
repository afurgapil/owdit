"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { shortenAddress } from "../../../shared/lib/utils";

type CommentItem = {
  _id: string;
  message: string;
  author: { address: string; displayName?: string };
  createdAt: string;
  moderation: { status: "pending" | "approved" | "rejected" };
  artifacts?: Array<{ type: string; cid: string; title?: string }>;
  score?: number;
  repliesCount?: number;
  replies?: CommentItem[];
  extra?: { userVote?: number };
};

export function CommentsSection(props: {
  contractAddress: string;
  chainId: number;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const { contractAddress, chainId, onLoadingChange } = props;
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const { address: wagmiAddress, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const viewer = useMemo(() => (wagmiAddress ? wagmiAddress : undefined), [wagmiAddress]);
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<"new" | "top">("new");

  function connectWallet() {
    const injected = connectors.find((c) => c.id === "injected");
    if (injected) connect({ connector: injected });
  }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      onLoadingChange?.(true);
      const params = new URLSearchParams({
        contractAddress,
        chainId: String(chainId),
        limit: "20",
        offset: "0",
        includeReplies: "true",
      });
      if (viewer) params.set("viewer", viewer);
      const res = await fetch(`/api/community/comments?${params.toString()}`, { cache: "no-store" });
      const json: {
        success: boolean;
        data?: { items: CommentItem[]; total: number; hasMore: boolean };
        error?: string;
      } = await res.json();
      if (res.ok && json.success) {
        let items = (json.data?.items || []).map((c: CommentItem) => ({
          ...c,
          createdAt: new Date(c.createdAt).toISOString(),
          replies: (c.replies || []).map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt).toISOString(),
          })),
        }));
        // client-side sort
        if (sortBy === "top") {
          items = items.sort((a, b) => (b.score || 0) - (a.score || 0));
        } else {
          items = items.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        setItems(items);
      } else {
        setError(json.error || "Failed to load comments");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [contractAddress, chainId, onLoadingChange, viewer, sortBy]);

  useEffect(() => {
    if (contractAddress && chainId) {
      void load();
    }
  }, [contractAddress, chainId, load]);

  // wagmi manages account state; no manual detection necessary

  async function signAndSend(action: string, ref: string, body: Record<string, unknown>) {
    if (!wagmiAddress) throw new Error("Connect wallet first");
    const nonceResp = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: wagmiAddress }),
    });
    const nonceJson = await nonceResp.json();
    if (!nonceResp.ok || !nonceJson.success) throw new Error(nonceJson.error || "Nonce failed");
    const nonce = nonceJson.data.nonce as string;
    const timestamp = Date.now();
    const msg = [
      "Owdit Sign:",
      `action:${action}`,
      `addr:${wagmiAddress.toLowerCase()}`,
      `ref:${ref}`,
      `ts:${timestamp}`,
      `nonce:${nonce}`,
    ].join("\n");
    const signature = await (window as any).ethereum.request({
      method: "personal_sign",
      params: [msg, wagmiAddress],
    });
    return { ...body, address: wagmiAddress, signature, nonce, timestamp };
  }

  async function submit() {
    try {
      setError(null);
      const payload = await signAndSend("comment", contractAddress.toLowerCase(), {
        contractAddress,
        chainId,
        message,
        author: { address: wagmiAddress || "", displayName },
        moderation: { status: "approved" },
      });
      const resp = await fetch(`/api/community/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: { success: boolean; data?: CommentItem; error?: string } = await resp.json();
      if (!resp.ok || !json.success) throw new Error(json.error || "Create failed");
      setMessage("");
      if (json.data) {
        const created: CommentItem = {
          ...json.data,
          createdAt: new Date((json.data as any).createdAt).toISOString(),
        } as any;
        setItems((prev) => [created, ...prev]);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggleVote(commentId: string, value: 1 | -1) {
    if (!wagmiAddress) return connectWallet();
    try {
      setPendingIds((p) => ({ ...p, [commentId]: true }));
      const current = items.find((i) => i._id === commentId);
      const currentVote = current?.extra?.userVote || 0;
      if (currentVote === value) {
        const payload = await signAndSend("unvote", commentId, { commentId });
        const res = await fetch(`/api/community/comments/unvote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (!res.ok || !j.success) throw new Error(j.error || "Unvote failed");
        const delta = j.data.delta as number;
        setItems((prev) =>
          prev.map((c) =>
            c._id === commentId
              ? { ...c, score: (c.score || 0) + delta, extra: { ...(c.extra || {}), userVote: 0 } }
              : c
          )
        );
        return;
      }
      const payload = await signAndSend("vote", commentId, { commentId, value });
      const res = await fetch(`/api/community/comments/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || "Vote failed");
      const delta = j.data.delta as number;
      const newVal = j.data.value as 1 | -1;
      setItems((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, score: (c.score || 0) + delta, extra: { ...(c.extra || {}), userVote: newVal } }
            : c
        )
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPendingIds((p) => ({ ...p, [commentId]: false }));
    }
  }

  async function submitReply(parentId: string) {
    if (!replyText[parentId]) return;
    try {
      const payload = await signAndSend("reply", parentId, {
        parentId,
        chainId,
        contractAddress,
        content: replyText[parentId],
      });
      const res = await fetch(`/api/community/comments/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || "Reply failed");
      const created: CommentItem = { ...(j.data as any), createdAt: new Date(j.data.createdAt).toISOString() };
      setItems((prev) =>
        prev.map((c) =>
          c._id === parentId
            ? {
                ...c,
                repliesCount: (c.repliesCount || 0) + 1,
                replies: [...(c.replies || []), created],
              }
            : c
        )
      );
      setReplyText((t) => ({ ...t, [parentId]: "" }));
      setReplyOpen((o) => ({ ...o, [parentId]: false }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-3xl neon-border mt-6">
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">
        Community Comments
      </h3>
      <div className="space-y-4">
        <div className="bg-black/30 p-4 rounded-lg border border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="flex items-center gap-2">
              {isConnected && wagmiAddress ? (
                <div className="px-3 py-2 bg-gray-900 text-neon-blue rounded border border-gray-700 font-mono text-xs">
                  {shortenAddress(wagmiAddress)}
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="px-3 py-2 bg-neon-purple/30 border border-neon-purple text-neon-purple rounded"
                >
                  {isPending ? "Connecting..." : "Connect Wallet"}
                </button>
              )}
            </div>
            <input
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:border-neon-purple"
            />
            <button
              onClick={submit}
              disabled={!message || !wagmiAddress || loading}
              className="px-3 py-2 bg-neon-purple/30 border border-neon-purple text-neon-purple rounded disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-neon-purple border-t-transparent"></div>
              )}
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
          <textarea
            placeholder="Share your findings, risks, or references..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:border-neon-purple"
          />
          {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => setSortBy("new")}
            className={`px-3 py-1 rounded border ${sortBy === "new" ? "border-neon-blue text-neon-blue" : "border-gray-700 text-gray-300"}`}
          >
            New
          </button>
          <button
            onClick={() => setSortBy("top")}
            className={`px-3 py-1 rounded border ${sortBy === "top" ? "border-neon-purple text-neon-purple" : "border-gray-700 text-gray-300"}`}
          >
            Top
          </button>
        </div>

        <div className="space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-neon-blue border-t-transparent"></div>
                <p className="text-gray-400 text-sm">Loading comments...</p>
              </div>
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="text-gray-400">No comments yet.</div>
          )}
          {items.map((c) => (
            <div key={c._id} className="p-3 bg-black/30 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="text-neon-blue font-mono">
                  {c.author.displayName || shortenAddress(c.author.address)}
                </div>
                <div className="text-gray-400">
                  {new Date(c.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-gray-200 whitespace-pre-wrap break-words">
                {c.message}
              </div>
              {c.artifacts && c.artifacts.length > 0 && (
                <div className="mt-2 text-sm text-gray-300">
                  {c.artifacts.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-gray-400">[{a.type}]</span>
                      <a
                        href={`https://ipfs.io/ipfs/${a.cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-gray-100"
                      >
                        {a.title || a.cid}
                      </a>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVote(c._id, 1)}
                    disabled={!!pendingIds[c._id]}
                    className={`px-2 py-1 rounded border ${(c.extra?.userVote || 0) === 1 ? "border-neon-green text-neon-green" : "border-gray-700 text-gray-300 hover:text-neon-green"}`}
                  >
                    ▲
                  </button>
                  <span className="min-w-[2rem] text-center text-gray-200">{c.score ?? 0}</span>
                  <button
                    onClick={() => toggleVote(c._id, -1)}
                    disabled={!!pendingIds[c._id]}
                    className={`px-2 py-1 rounded border ${(c.extra?.userVote || 0) === -1 ? "border-neon-pink text-neon-pink" : "border-gray-700 text-gray-300 hover:text-neon-pink"}`}
                  >
                    ▼
                  </button>
                </div>
                <button
                  onClick={() => setReplyOpen((o) => ({ ...o, [c._id]: !o[c._id] }))}
                  className="px-2 py-1 rounded border border-gray-700 text-gray-300 hover:text-white"
                >
                  Reply{c.repliesCount ? ` (${c.repliesCount})` : ""}
                </button>
              </div>
              {replyOpen[c._id] && (
                <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
                  <textarea
                    value={replyText[c._id] || ""}
                    onChange={(e) => setReplyText((t) => ({ ...t, [c._id]: e.target.value }))}
                    rows={2}
                    placeholder="Write a reply..."
                    className="w-full px-3 py-2 bg-black text-white rounded border border-gray-700 focus:outline-none focus:border-neon-blue"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => submitReply(c._id)}
                      disabled={!replyText[c._id] || !wagmiAddress}
                      className="px-3 py-1 rounded bg-neon-blue/20 border border-neon-blue text-neon-blue disabled:opacity-50"
                    >
                      Send Reply
                    </button>
                  </div>
                  {c.replies && c.replies.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {c.replies.map((r) => (
                        <div key={r._id} className="p-2 bg-black/40 rounded border border-gray-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <div className="text-neon-blue font-mono">
                              {r.author.displayName || shortenAddress(r.author.address)}
                            </div>
                            <div className="text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="text-gray-200 whitespace-pre-wrap">{r.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
