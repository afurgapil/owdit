import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { communityComments } from "../../../../../shared/lib/community/comments";
import { buildSignMessage, consumeNonce, verifySignature } from "../../../../../shared/lib/auth/signature";

const schema = z.object({
  commentId: z.string().min(1),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().min(1),
  nonce: z.string().min(1),
  timestamp: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);

    const message = buildSignMessage({
      action: "unvote",
      address: parsed.address,
      ref: parsed.commentId,
      timestamp: parsed.timestamp,
      nonce: parsed.nonce,
    });
    if (!verifySignature(message, parsed.signature, parsed.address)) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }
    if (!consumeNonce(parsed.address, parsed.nonce)) {
      return NextResponse.json({ success: false, error: "Invalid or expired nonce" }, { status: 401 });
    }

    const { removed, delta } = await communityComments.removeVote(
      parsed.commentId,
      parsed.address
    );

    return NextResponse.json({ success: true, data: { removed, delta } });
  } catch (e) {
    console.error("Unvote POST error:", e);
    const msg = e instanceof Error ? e.message : "Failed to unvote";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}


