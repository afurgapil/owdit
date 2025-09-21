import { NextRequest, NextResponse } from "next/server";
import { scoreResponseSchema } from "../../../../shared/lib/zodSchemas";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const chainId = parseInt(searchParams.get("chainId") || "1");

    if (!address) {
      return NextResponse.json(
        scoreResponseSchema.parse({
          success: false,
          error: "Address parameter is required",
        }),
        { status: 400 }
      );
    }

    // Delegate to analyze API to compute a real score
    const analyzeRes = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/contract-analysis/analyze`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, chainId }),
      }
    );
    const json = await analyzeRes.json();
    if (analyzeRes.ok && json.success) {
      return NextResponse.json(scoreResponseSchema.parse(json), {
        status: 200,
      });
    }
    return NextResponse.json(
      scoreResponseSchema.parse({
        success: false,
        error: json.error || "No analysis result found for this address",
      }),
      { status: analyzeRes.status || 500 }
    );
  } catch (error) {
    console.error("Score API error:", error);
    return NextResponse.json(
      scoreResponseSchema.parse({
        success: false,
        error: "Server error occurred",
      }),
      { status: 500 }
    );
  }
}
