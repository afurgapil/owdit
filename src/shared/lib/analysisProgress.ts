import { AnalysisProgress, AnalysisMilestone } from "../../types/contractAnalysis";

// Analysis milestones for different contract types
export const VERIFIED_CONTRACT_MILESTONES: AnalysisMilestone[] = [
  {
    id: "check_cache",
    title: "Check Cache",
    description: "Checking cached analysis in MongoDB",
    estimatedDuration: 1,
  },
  {
    id: "fetch_source",
    title: "Fetching Contract Source",
    description: "Retrieving verified source code from Sourcify and Etherscan",
    estimatedDuration: 3,
    dependencies: ["check_cache"],
  },
  {
    id: "ai_analysis",
    title: "AI Security Analysis",
    description: "Running 0G AI inference for comprehensive security assessment",
    estimatedDuration: 30,
    dependencies: ["fetch_source"],
  },
  {
    id: "deployer_analysis",
    title: "Deployer Wallet Analysis",
    description: "Analyzing the wallet that deployed this contract",
    estimatedDuration: 5,
    dependencies: ["fetch_source"],
  },
  {
    id: "interaction_analysis",
    title: "Interaction Analysis",
    description: "Analyzing contract transaction history and user patterns",
    estimatedDuration: 5,
    dependencies: ["fetch_source"],
  },
  {
    id: "risk_calculation",
    title: "Risk Score Calculation",
    description: "Combining all analysis results into final risk assessment",
    estimatedDuration: 2,
    dependencies: ["ai_analysis", "deployer_analysis", "interaction_analysis"],
  },
];

export const UNVERIFIED_CONTRACT_MILESTONES: AnalysisMilestone[] = [
  {
    id: "check_cache",
    title: "Check Cache",
    description: "Checking cached analysis in MongoDB",
    estimatedDuration: 1,
  },
  {
    id: "fetch_bytecode",
    title: "Fetching Contract Bytecode",
    description: "Retrieving contract bytecode from blockchain",
    estimatedDuration: 2,
    dependencies: ["check_cache"],
  },
  {
    id: "bytecode_analysis",
    title: "Bytecode Analysis",
    description: "Analyzing bytecode for dangerous opcodes and patterns",
    estimatedDuration: 3,
    dependencies: ["fetch_bytecode"],
  },
  {
    id: "ai_analysis",
    title: "AI Security Analysis",
    description: "Running 0G AI inference for comprehensive security assessment",
    estimatedDuration: 30,
    dependencies: ["bytecode_analysis"],
  },
  {
    id: "deployer_analysis",
    title: "Deployer Wallet Analysis",
    description: "Analyzing the wallet that deployed this contract",
    estimatedDuration: 5,
    dependencies: ["fetch_bytecode"],
  },
  {
    id: "interaction_analysis",
    title: "Interaction Analysis",
    description: "Analyzing contract transaction history and user patterns",
    estimatedDuration: 5,
    dependencies: ["fetch_bytecode"],
  },
  {
    id: "risk_calculation",
    title: "Risk Score Calculation",
    description: "Combining all analysis results into final risk assessment",
    estimatedDuration: 2,
    dependencies: ["ai_analysis", "deployer_analysis", "interaction_analysis"],
  },
];

export class AnalysisProgressTracker {
  private progress: Map<string, AnalysisProgress> = new Map();
  private milestones: AnalysisMilestone[];
  private isVerified: boolean;

  constructor(isVerified: boolean) {
    this.isVerified = isVerified;
    this.milestones = isVerified ? VERIFIED_CONTRACT_MILESTONES : UNVERIFIED_CONTRACT_MILESTONES;
    this.initializeProgress();
  }

  private initializeProgress() {
    this.milestones.forEach((milestone) => {
      this.progress.set(milestone.id, {
        step: milestone.id,
        status: 'pending',
        message: milestone.description,
        progress: 0,
        timestamp: new Date().toISOString(),
      });
    });
  }

  public startStep(stepId: string, customMessage?: string) {
    const progress = this.progress.get(stepId);
    if (progress) {
      progress.status = 'in_progress';
      progress.message = customMessage || progress.message;
      progress.timestamp = new Date().toISOString();
      this.progress.set(stepId, progress);
    }
  }

  public updateProgress(stepId: string, progressPercent: number, message?: string) {
    const progress = this.progress.get(stepId);
    if (progress && progress.status === 'in_progress') {
      progress.progress = Math.min(100, Math.max(0, progressPercent));
      if (message) {
        progress.message = message;
      }
      progress.timestamp = new Date().toISOString();
      this.progress.set(stepId, progress);
    }
  }

  public completeStep(stepId: string, message?: string) {
    const progress = this.progress.get(stepId);
    if (progress) {
      progress.status = 'completed';
      progress.progress = 100;
      if (message) {
        progress.message = message;
      }
      progress.timestamp = new Date().toISOString();
      this.progress.set(stepId, progress);
    }
  }

  public failStep(stepId: string, errorMessage: string) {
    const progress = this.progress.get(stepId);
    if (progress) {
      progress.status = 'failed';
      progress.message = errorMessage;
      progress.timestamp = new Date().toISOString();
      this.progress.set(stepId, progress);
    }
  }

  public getProgress(): AnalysisProgress[] {
    // Only show steps sequentially: completed steps + current unlocked step
    const isStepCompleted = (id: string) => this.progress.get(id)?.status === 'completed';

    const allInOrder = this.milestones.map(m => this.progress.get(m.id) as AnalysisProgress);

    const visible: AnalysisProgress[] = [];
    for (const milestone of this.milestones) {
      const deps = milestone.dependencies || [];
      const depsCompleted = deps.every(d => isStepCompleted(d));
      const current = this.progress.get(milestone.id);
      if (!current) continue;

      if (current.status === 'completed') {
        visible.push(current);
        continue;
      }

      if (depsCompleted) {
        // Show only the first available non-completed step
        visible.push(current);
        break;
      } else {
        // Hide future steps until dependencies are completed
        break;
      }
    }

    return visible;
  }

  public getOverallProgress(): number {
    const totalSteps = this.milestones.length;
    const completedSteps = Array.from(this.progress.values()).filter(p => p.status === 'completed').length;
    const inProgressSteps = Array.from(this.progress.values()).filter(p => p.status === 'in_progress');
    
    let progressSum = completedSteps * 100;
    inProgressSteps.forEach(step => {
      progressSum += step.progress;
    });
    
    return Math.round(progressSum / totalSteps);
  }

  public getCurrentStep(): AnalysisProgress | null {
    const inProgress = Array.from(this.progress.values()).find(p => p.status === 'in_progress');
    if (inProgress) return inProgress;
    
    const pending = Array.from(this.progress.values()).find(p => p.status === 'pending');
    return pending || null;
  }

  public isComplete(): boolean {
    return Array.from(this.progress.values()).every(p => p.status === 'completed' || p.status === 'failed');
  }

  public hasFailed(): boolean {
    return Array.from(this.progress.values()).some(p => p.status === 'failed');
  }
}
