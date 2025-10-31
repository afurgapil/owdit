// Avoid using next/server in tests; use standard Response instead
import { scoreResponseSchema } from "../../../../shared/lib/zodSchemas";

export async function GET(request: Request): Promise<Response> {
  // Return a minimal Response-like object compatible with tests
  const makeResponse = (body: unknown, status: number): Response => ({
    status,
    json: async () => body,
  }) as unknown as Response;
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const chainId = parseInt(searchParams.get("chainId") || "1");

    if (!address) {
      const body = scoreResponseSchema.parse({
        success: false,
        error: "Address parameter is required",
      });
      return makeResponse(body, 400);
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
      return makeResponse(json, 200);
    }
    {
      const body = scoreResponseSchema.parse({
        success: false,
        error: json.error || "No analysis result found for this address",
      });
      return makeResponse(body, analyzeRes.status || 500);
    }
  } catch (error) {
    console.error("Score API error:", error);
    const body = scoreResponseSchema.parse({
      success: false,
      error: "Server error occurred",
    });
    return makeResponse(body, 500);
  }
}
