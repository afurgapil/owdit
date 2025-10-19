import { NextRequest, NextResponse } from "next/server";
import { communityCommentSchema, moderationInfoSchema } from "../../../../shared/lib/zodSchemas";
import { communityComments } from "../../../../shared/lib/community/comments";
import { z } from "zod";
import { buildSignMessage, consumeNonce, verifySignature } from "../../../../shared/lib/auth/signature";

// Simple in-memory rate limit per IP
const RATE_LIMIT_WINDOW_MS = 10_000; // 10s
const RATE_LIMIT_MAX = 20; // 20 req / 10s
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count += 1;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get("contractAddress");
    const chainId = parseInt(searchParams.get("chainId") || "1");
    const includeReplies = searchParams.get("includeReplies") === "true";
    const viewer = searchParams.get("viewer"); // optional wallet to compute userVote
    const status = searchParams.get("status") as
      | "pending"
      | "approved"
      | "rejected"
      | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!contractAddress) {
      return NextResponse.json(
        { success: false, error: "contractAddress is required" },
        { status: 400 }
      );
    }

    const { items, total, hasMore } = await communityComments.listByContract({
      contractAddress,
      chainId,
      limit,
      offset,
      status: status || undefined,
      includeReplies,
      authorAddress: viewer || undefined,
    });

    if (!includeReplies) {
      return NextResponse.json({ success: true, data: { items, total, hasMore } });
    }

    // Fetch replies for each parent (basic, could be paginated later)
    const itemsWithReplies = await Promise.all(
      items.map(async (c) => ({ ...c, replies: await communityComments.listReplies(c._id) }))
    );

    return NextResponse.json({ success: true, data: { items: itemsWithReplies, total, hasMore } });
  } catch (error) {
    console.error("Community Comments GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const raw = await request.json();
    // Accept legacy schema but enforce signature envelope
    const Base = communityCommentSchema;
    const Envelope = z.object({
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      signature: z.string().min(1),
      nonce: z.string().min(1),
      timestamp: z.number().int().positive(),
    });
    const parsed = Base.parse(raw);
    const env = Envelope.parse(raw);

    // Verify signature: top-level comments sign the contract address as ref
    const message = buildSignMessage({
      action: "comment",
      address: env.address,
      ref: parsed.contractAddress.toLowerCase(),
      timestamp: env.timestamp,
      nonce: env.nonce,
    });
    if (!verifySignature(message, env.signature, env.address)) {
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      );
    }
    if (!consumeNonce(env.address, env.nonce)) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired nonce" },
        { status: 401 }
      );
    }

    const created = await communityComments.create({
      _id: parsed._id,
      contractAddress: parsed.contractAddress,
      chainId: parsed.chainId,
      message: parsed.message,
      artifacts: parsed.artifacts,
      author: { address: env.address.toLowerCase(), displayName: parsed.author?.displayName },
      signature: env.signature,
      moderation: moderationInfoSchema.parse(parsed.moderation),
      reputation: parsed.reputation,
      extra: parsed.extra,
      score: 0,
      repliesCount: 0,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Community Comments POST error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create comment";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
