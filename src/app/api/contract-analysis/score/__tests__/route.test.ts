import { GET } from "../route";

// Mock fetch
global.fetch = jest.fn();

describe("GET /api/contract-analysis/score", () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns error when address is missing", async () => {
    const request = { url: "http://localhost:3000/api/contract-analysis/score" } as any;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Address parameter is required");
  });

  it("delegates to analyze API for score calculation", async () => {
    const mockAnalysisResponse = {
      success: true,
      score: 85,
      data: { address: "0x1234", score: 85 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysisResponse,
    } as Response);

    const request = {
      url: "http://localhost:3000/api/contract-analysis/score?address=0x1234&chainId=1",
    } as any;

    const response = await GET(request);
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/contract-analysis/analyze"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("defaults chainId to 1 when not provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, score: 85 }),
    } as Response);

    const request = {
      url: "http://localhost:3000/api/contract-analysis/score?address=0x1234",
    } as any;

    await GET(request);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"chainId":1'),
      })
    );
  });

  it("returns error when analyze API fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: "Analysis failed" }),
    } as Response);

    const request = {
      url: "http://localhost:3000/api/contract-analysis/score?address=0x1234",
    } as any;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it("handles network errors gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const request = { url: "http://localhost:3000/api/contract-analysis/score?address=0x1234" } as any;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Server error occurred");

    consoleErrorSpy.mockRestore();
  });
});

