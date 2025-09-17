import { NextRequest, NextResponse } from "next/server";
import { contractCache } from "../../../shared/lib/cache/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search") || "";

    // Get history from cache service
    const historyData = await contractCache.getHistory(limit, offset, search);

    // Get cache statistics
    const stats = await contractCache.getCacheStats();

    return NextResponse.json({
      success: true,
      data: {
        ...historyData,
        stats,
      },
    });
  } catch (error) {
    console.error("History API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch history",
      },
      { status: 500 }
    );
  }
}
