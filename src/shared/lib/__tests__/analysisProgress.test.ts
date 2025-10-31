import {
  AnalysisProgressTracker,
  VERIFIED_CONTRACT_MILESTONES,
  UNVERIFIED_CONTRACT_MILESTONES,
} from "../analysisProgress";

describe("AnalysisProgressTracker", () => {
  describe("Initialization", () => {
    it("should initialize with verified contract milestones", () => {
      const tracker = new AnalysisProgressTracker(true);
      const progress = tracker.getProgress();

      // Should show first step (check_cache) as pending
      expect(progress).toHaveLength(1);
      expect(progress[0].step).toBe("check_cache");
      expect(progress[0].status).toBe("pending");
    });

    it("should initialize with unverified contract milestones", () => {
      const tracker = new AnalysisProgressTracker(false);
      const progress = tracker.getProgress();

      // Should show first step (check_cache) as pending
      expect(progress).toHaveLength(1);
      expect(progress[0].step).toBe("check_cache");
      expect(progress[0].status).toBe("pending");
    });

    it("should have correct milestone count for verified contracts", () => {
      expect(VERIFIED_CONTRACT_MILESTONES).toHaveLength(6);
    });

    it("should have correct milestone count for unverified contracts", () => {
      expect(UNVERIFIED_CONTRACT_MILESTONES).toHaveLength(7);
    });
  });

  describe("Step State Transitions", () => {
    it("should start a step and change status to in_progress", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");

      const progress = tracker.getProgress();
      expect(progress[0].status).toBe("in_progress");
    });

    it("should update progress during a step", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.updateProgress("check_cache", 50, "Checking cache...");

      const progress = tracker.getProgress();
      expect(progress[0].progress).toBe(50);
      expect(progress[0].message).toBe("Checking cache...");
    });

    it("should clamp progress between 0 and 100", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.updateProgress("check_cache", 150);

      const progress = tracker.getProgress();
      expect(progress[0].progress).toBe(100);

      tracker.updateProgress("check_cache", -50);
      const progress2 = tracker.getProgress();
      expect(progress2[0].progress).toBe(0);
    });

    it("should complete a step", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.completeStep("check_cache", "Cache checked successfully");

      const progress = tracker.getProgress();
      expect(progress[0].status).toBe("completed");
      expect(progress[0].progress).toBe(100);
      expect(progress[0].message).toBe("Cache checked successfully");
    });

    it("should fail a step", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.failStep("check_cache", "Cache check failed");

      const progress = tracker.getProgress();
      expect(progress[0].status).toBe("failed");
      expect(progress[0].message).toBe("Cache check failed");
    });

    it("should not update progress if step is not in_progress", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.updateProgress("check_cache", 50);

      const progress = tracker.getProgress();
      expect(progress[0].progress).toBe(0); // Should remain 0
    });
  });

  describe("Step Visibility Based on Dependencies", () => {
    it("should show only first step initially", () => {
      const tracker = new AnalysisProgressTracker(true);
      const progress = tracker.getProgress();

      expect(progress).toHaveLength(1);
      expect(progress[0].step).toBe("check_cache");
    });

    it("should reveal next step after completing dependency", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.completeStep("check_cache");

      const progress = tracker.getProgress();
      // Should now show check_cache (completed) and fetch_source (next available)
      expect(progress).toHaveLength(2);
      expect(progress[0].step).toBe("check_cache");
      expect(progress[0].status).toBe("completed");
      expect(progress[1].step).toBe("fetch_source");
      expect(progress[1].status).toBe("pending");
    });

    it("should not reveal steps with incomplete dependencies", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.completeStep("check_cache");
      tracker.startStep("fetch_source");

      const progress = tracker.getProgress();
      // Should not show ai_analysis yet (depends on fetch_source being completed)
      expect(progress).toHaveLength(2);
      expect(progress[1].step).toBe("fetch_source");
      expect(progress[1].status).toBe("in_progress");
    });

    it("should handle multiple parallel dependencies", () => {
      const tracker = new AnalysisProgressTracker(true);

      // Complete initial steps
      tracker.startStep("check_cache");
      tracker.completeStep("check_cache");
      tracker.startStep("fetch_source");
      tracker.completeStep("fetch_source");

      // Now all three parallel steps should be available
      tracker.startStep("ai_analysis");
      tracker.completeStep("ai_analysis");
      tracker.startStep("deployer_analysis");
      tracker.completeStep("deployer_analysis");
      tracker.startStep("interaction_analysis");
      tracker.completeStep("interaction_analysis");

      const progress = tracker.getProgress();
      // Should now show risk_calculation (depends on all three)
      const riskCalcStep = progress.find((p) => p.step === "risk_calculation");
      expect(riskCalcStep).toBeDefined();
      expect(riskCalcStep?.status).toBe("pending");
    });
  });

  describe("Overall Progress Calculation", () => {
    it("should return 0% for no completed steps", () => {
      const tracker = new AnalysisProgressTracker(true);
      expect(tracker.getOverallProgress()).toBe(0);
    });

    it("should calculate progress for completed steps", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.completeStep("check_cache");

      const overallProgress = tracker.getOverallProgress();
      // 1 out of 6 steps = ~17%
      expect(overallProgress).toBeGreaterThan(0);
      expect(overallProgress).toBeLessThan(100);
    });

    it("should include in-progress step percentage", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.updateProgress("check_cache", 50);

      const overallProgress = tracker.getOverallProgress();
      expect(overallProgress).toBeGreaterThan(0);
      expect(overallProgress).toBeLessThan(17); // Less than one full step
    });

    it("should return 100% when all steps completed", () => {
      const tracker = new AnalysisProgressTracker(true);

      // Complete all steps
      VERIFIED_CONTRACT_MILESTONES.forEach((milestone) => {
        tracker.startStep(milestone.id);
        tracker.completeStep(milestone.id);
      });

      expect(tracker.getOverallProgress()).toBe(100);
    });

    it("should handle mixed completed and in-progress steps", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.completeStep("check_cache");
      tracker.startStep("fetch_source");
      tracker.updateProgress("fetch_source", 75);

      const overallProgress = tracker.getOverallProgress();
      // Should be between 16% (1 step) and 33% (2 steps)
      expect(overallProgress).toBeGreaterThan(16);
      expect(overallProgress).toBeLessThan(33);
    });
  });

  describe("Current Step Detection", () => {
    it("should return first pending step as current", () => {
      const tracker = new AnalysisProgressTracker(true);
      const current = tracker.getCurrentStep();

      expect(current).not.toBeNull();
      expect(current?.step).toBe("check_cache");
      expect(current?.status).toBe("pending");
    });

    it("should return in_progress step as current", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");

      const current = tracker.getCurrentStep();
      expect(current?.status).toBe("in_progress");
      expect(current?.step).toBe("check_cache");
    });

    it("should return null when all steps are completed", () => {
      const tracker = new AnalysisProgressTracker(true);

      VERIFIED_CONTRACT_MILESTONES.forEach((milestone) => {
        tracker.startStep(milestone.id);
        tracker.completeStep(milestone.id);
      });

      const current = tracker.getCurrentStep();
      expect(current).toBeNull();
    });

    it("should prioritize in_progress over pending", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.completeStep("check_cache");
      tracker.startStep("fetch_source");

      const current = tracker.getCurrentStep();
      expect(current?.step).toBe("fetch_source");
      expect(current?.status).toBe("in_progress");
    });
  });

  describe("Completion and Failure State Detection", () => {
    it("should return false for isComplete when steps are pending", () => {
      const tracker = new AnalysisProgressTracker(true);
      expect(tracker.isComplete()).toBe(false);
    });

    it("should return true for isComplete when all steps completed", () => {
      const tracker = new AnalysisProgressTracker(true);

      VERIFIED_CONTRACT_MILESTONES.forEach((milestone) => {
        tracker.startStep(milestone.id);
        tracker.completeStep(milestone.id);
      });

      expect(tracker.isComplete()).toBe(true);
    });

    it("should return false for isComplete when some steps still pending after failure", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.failStep("check_cache", "Error");

      // isComplete() requires ALL steps to be either completed or failed
      // Since other steps are still pending, it should return false
      expect(tracker.isComplete()).toBe(false);
    });

    it("should return false for hasFailed when no failures", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.completeStep("check_cache");

      expect(tracker.hasFailed()).toBe(false);
    });

    it("should return true for hasFailed when any step failed", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.completeStep("check_cache");
      tracker.startStep("fetch_source");
      tracker.failStep("fetch_source", "Network error");

      expect(tracker.hasFailed()).toBe(true);
    });
  });

  describe("Timestamp Updates", () => {
    it("should update timestamp when starting a step", () => {
      const tracker = new AnalysisProgressTracker(true);
      const before = new Date().toISOString();

      tracker.startStep("check_cache");

      const progress = tracker.getProgress();
      expect(progress[0].timestamp).toBeTruthy();
      expect(new Date(progress[0].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime()
      );
    });

    it("should update timestamp when completing a step", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");

      const before = new Date().toISOString();
      tracker.completeStep("check_cache");

      const progress = tracker.getProgress();
      expect(new Date(progress[0].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime()
      );
    });
  });

  describe("Different Contract Types", () => {
    it("should handle verified contract flow", () => {
      const tracker = new AnalysisProgressTracker(true);
      tracker.startStep("check_cache");
      tracker.completeStep("check_cache");
      tracker.startStep("fetch_source");
      tracker.completeStep("fetch_source");

      const progress = tracker.getProgress();
      // Should have access to fetch_source, not fetch_bytecode
      expect(progress.some((p) => p.step === "fetch_source")).toBe(true);
      expect(progress.some((p) => p.step === "fetch_bytecode")).toBe(false);
    });

    it("should handle unverified contract flow", () => {
      const tracker = new AnalysisProgressTracker(false);
      tracker.startStep("check_cache");
      tracker.completeStep("check_cache");
      tracker.startStep("fetch_bytecode");
      tracker.completeStep("fetch_bytecode");

      const progress = tracker.getProgress();
      // Should have access to fetch_bytecode and bytecode_analysis, not fetch_source
      expect(progress.some((p) => p.step === "fetch_bytecode")).toBe(true);
      expect(progress.some((p) => p.step === "fetch_source")).toBe(false);
    });
  });
});
