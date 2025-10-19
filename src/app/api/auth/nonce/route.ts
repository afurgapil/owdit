import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createNonce } from "../../../../shared/lib/auth/signature";

const schema = z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address } = schema.parse(body);
    const nonce = createNonce(address);
    return NextResponse.json({ success: true, data: { address, nonce } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}


