import { NextRequest, NextResponse } from "next/server";
import { AnalysisProgressTracker } from "../../../shared/lib/analysisProgress";

// In-memory progress storage (in production, use Redis or database)
const progressStore = new Map<string, AnalysisProgressTracker>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const contractAddress = searchParams.get("contractAddress");
    const chainId = searchParams.get("chainId");

    if (!sessionId || !contractAddress || !chainId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const key = `${sessionId}:${contractAddress}:${chainId}`;
    const progress = progressStore.get(key);

    if (!progress) {
      return NextResponse.json(
        { success: false, error: "No progress found for this session" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        progress: progress.getProgress(),
        overallProgress: progress.getOverallProgress(),
        currentStep: progress.getCurrentStep(),
        isComplete: progress.isComplete(),
        hasFailed: progress.hasFailed(),
      },
    });
  } catch (error) {
    console.error("Progress API error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, contractAddress, chainId, isVerified } = body;

    if (!sessionId || !contractAddress || !chainId || typeof isVerified !== 'boolean') {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const { AnalysisProgressTracker } = await import("../../../shared/lib/analysisProgress");
    const tracker = new AnalysisProgressTracker(isVerified);
    
    const key = `${sessionId}:${contractAddress}:${chainId}`;
    progressStore.set(key, tracker);

    // Clean up old progress after 1 hour
    setTimeout(() => {
      progressStore.delete(key);
    }, 60 * 60 * 1000);

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        contractAddress,
        chainId,
        isVerified,
        progress: tracker.getProgress(),
        overallProgress: tracker.getOverallProgress(),
        currentStep: tracker.getCurrentStep(),
      },
    });
  } catch (error) {
    console.error("Progress creation error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, contractAddress, chainId, action, stepId, progress, message } = body;

    if (!sessionId || !contractAddress || !chainId || !action || !stepId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const key = `${sessionId}:${contractAddress}:${chainId}`;
    const tracker = progressStore.get(key);

    if (!tracker) {
      return NextResponse.json(
        { success: false, error: "No progress found for this session" },
        { status: 404 }
      );
    }

    switch (action) {
      case "start":
        tracker.startStep(stepId, message);
        break;
      case "update":
        tracker.updateProgress(stepId, progress || 0, message);
        break;
      case "complete":
        tracker.completeStep(stepId, message);
        break;
      case "fail":
        tracker.failStep(stepId, message || "Step failed");
        break;
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        progress: tracker.getProgress(),
        overallProgress: tracker.getOverallProgress(),
        currentStep: tracker.getCurrentStep(),
        isComplete: tracker.isComplete(),
        hasFailed: tracker.hasFailed(),
      },
    });
  } catch (error) {
    console.error("Progress update error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
