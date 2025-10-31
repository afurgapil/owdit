import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { contractCache } = await import("../../../../shared/lib/cache/mongodb");
    const stats = await contractCache.getCacheStats();

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Cache stats API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get cache statistics",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { contractCache } = await import("../../../../shared/lib/cache/mongodb");
    const cleanedCount = await contractCache.cleanExpiredCache();

    return NextResponse.json({
      success: true,
      data: {
        cleanedCount,
        message: `Cleaned ${cleanedCount} expired cache entries`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Cache cleanup API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to clean expired cache entries",
      },
      { status: 500 }
    );
  }
}
