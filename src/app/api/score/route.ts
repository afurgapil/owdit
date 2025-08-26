import { NextRequest, NextResponse } from "next/server";
import { scoreResponseSchema } from "../../../shared/lib/zodSchemas";
import { MOCK_ANALYSIS_RESULTS } from "../../../shared/lib/constants";

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

    // TODO: In the future, this will query 0G Storage/DA
    // For now, return mock data
    const mockResult = {
      ...MOCK_ANALYSIS_RESULTS.completed,
      chainId: chainId,
    };

    // Simulate checking if address exists in storage
    if (address === mockResult.address) {
      return NextResponse.json(
        scoreResponseSchema.parse({
          success: true,
          data: mockResult,
        }),
        { status: 200 }
      );
    }

    // Address not found in storage
    return NextResponse.json(
      scoreResponseSchema.parse({
        success: false,
        error: "No analysis result found for this address",
      }),
      { status: 404 }
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
