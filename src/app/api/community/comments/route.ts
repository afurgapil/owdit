import { NextRequest, NextResponse } from "next/server";
import {
  communityCommentSchema,
  moderationInfoSchema,
} from "../../../../shared/lib/zodSchemas";
import { communityComments } from "../../../../shared/lib/community/comments";

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
    });

    return NextResponse.json({
      success: true,
      data: { items, total, hasMore },
    });
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
    // Validate base payload
    const parsed = communityCommentSchema.parse(raw);

    // Optional: verify signature (placeholder for EIP-191/SiWE)
    // if (parsed.signature) { verifySignature(parsed) }

    const created = await communityComments.create({
      _id: parsed._id,
      contractAddress: parsed.contractAddress,
      chainId: parsed.chainId,
      message: parsed.message,
      artifacts: parsed.artifacts,
      author: parsed.author,
      signature: parsed.signature,
      moderation: moderationInfoSchema.parse(parsed.moderation),
      reputation: parsed.reputation,
      extra: parsed.extra,
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
