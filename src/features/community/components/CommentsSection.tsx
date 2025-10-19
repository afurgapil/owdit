"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { shortenAddress } from "../../../shared/lib/utils";

type CommentItem = {
  _id: string;
  message: string;
  author: { address: string; displayName?: string };
  createdAt: string;
  moderation: { status: "pending" | "approved" | "rejected" };
  artifacts?: Array<{ type: string; cid: string; title?: string }>;
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

  function connectWallet() {
    const injected = connectors.find((c) => c.id === "injected");
    if (injected) connect({ connector: injected });
  }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      onLoadingChange?.(true);
      const res = await fetch(
        `/api/community/comments?contractAddress=${contractAddress}&chainId=${chainId}&limit=20&offset=0`,
        { cache: "no-store" }
      );
      const json: {
        success: boolean;
        data?: { items: CommentItem[]; total: number; hasMore: boolean };
        error?: string;
      } = await res.json();
      if (res.ok && json.success) {
        const items = (json.data?.items || []).map((c: CommentItem) => ({
          ...c,
          createdAt: new Date(c.createdAt).toISOString(),
        }));
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
  }, [contractAddress, chainId, onLoadingChange]);

  useEffect(() => {
    if (contractAddress && chainId) {
      void load();
    }
  }, [contractAddress, chainId, load]);

  // wagmi manages account state; no manual detection necessary

  async function submit() {
    try {
      setError(null);
      const resp = await fetch(`/api/community/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          chainId,
          message,
          author: { address: wagmiAddress || "", displayName },
          moderation: { status: "pending" },
        }),
      });
      const json: { success: boolean; data?: CommentItem; error?: string } =
        await resp.json();
      if (!resp.ok || !json.success)
        throw new Error(json.error || "Create failed");
      setMessage("");
      // Optimistic state update: show the created comment immediately
      if (json.data) {
        const created: CommentItem = {
          ...json.data,
          createdAt: new Date(json.data.createdAt).toISOString(),
        };
        setItems((prev) => [created, ...prev]);
      }
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
            <div
              key={c._id}
              className="p-3 bg-black/30 rounded-lg border border-gray-700"
            >
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
