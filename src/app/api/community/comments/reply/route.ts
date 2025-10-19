import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { communityComments } from "../../../../../shared/lib/community/comments";
import { buildSignMessage, consumeNonce, verifySignature } from "../../../../../shared/lib/auth/signature";

const schema = z.object({
  parentId: z.string().min(1),
  chainId: z.number().int().positive(),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  content: z.string().min(1).max(1000),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().min(1),
  nonce: z.string().min(1),
  timestamp: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);

    // Verify signature
    const message = buildSignMessage({
      action: "reply",
      address: parsed.address,
      ref: parsed.parentId,
      timestamp: parsed.timestamp,
      nonce: parsed.nonce,
    });
    if (!verifySignature(message, parsed.signature, parsed.address)) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }
    if (!consumeNonce(parsed.address, parsed.nonce)) {
      return NextResponse.json({ success: false, error: "Invalid or expired nonce" }, { status: 401 });
    }

    const created = await communityComments.create({
      contractAddress: parsed.contractAddress,
      chainId: parsed.chainId,
      parentId: parsed.parentId,
      message: parsed.content,
      author: { address: parsed.address.toLowerCase() },
      signature: parsed.signature,
      moderation: { status: "approved" },
      score: 0,
      repliesCount: 0,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (e) {
    console.error("Reply POST error:", e);
    const msg = e instanceof Error ? e.message : "Failed to create reply";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}


