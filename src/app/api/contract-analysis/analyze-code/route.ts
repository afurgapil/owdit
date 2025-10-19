import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inferRiskOn0G } from "../../../../shared/lib/zeroG/infer";

// Request schema
const analyzeCodeRequestSchema = z.object({
  code: z.string().min(1, "Code is required"),
  language: z.string().default("solidity"),
  fileName: z.string().optional(),
});

// Response schema
const analyzeCodeResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      score: z.number().min(0).max(100),
      recommendations: z.array(
        z.object({
          category: z.string(),
          priority: z.enum(["high", "medium", "low"]),
          title: z.string(),
          description: z.string(),
          suggestion: z.string(),
        })
      ),
      gasOptimization: z.object({
        current: z.number(),
        optimized: z.number(),
        savings: z.number(),
      }),
      securityIssues: z.array(
        z.object({
          severity: z.enum(["critical", "high", "medium", "low"]),
          issue: z.string(),
          description: z.string(),
          fix: z.string(),
        })
      ),
      codeQuality: z.object({
        maintainability: z.number().min(0).max(10),
        readability: z.number().min(0).max(10),
        testability: z.number().min(0).max(10),
      }),
    })
    .optional(),
  error: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analyzeCodeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        analyzeCodeResponseSchema.parse({
          success: false,
          error: parsed.error.message,
        }),
        { status: 400 }
      );
    }

    const { code, language, fileName } = parsed.data;

    console.log(
      `🤖 [AnalyzeCode] Starting analysis for ${language} contract: ${
        fileName || "unknown"
      }`
    );

    // Prepare features for 0G AI analysis
    const features = {
      summary: `Smart contract analysis for ${language} contract: ${
        fileName || "unknown"
      }`,
      sourceCode: code,
      language: language,
      fileName: fileName,
      // Extract basic metrics
      lineCount: code.split("\n").length,
      functionCount: (code.match(/function\s+\w+/g) || []).length,
      contractCount: (code.match(/contract\s+\w+/g) || []).length,
      // Extract potential security patterns
      hasModifiers: code.includes("modifier"),
      hasEvents: code.includes("event"),
      hasStructs: code.includes("struct"),
      hasEnums: code.includes("enum"),
      hasLibraries: code.includes("library"),
      hasInterfaces: code.includes("interface"),
      // Extract potential risk patterns
      hasDelegateCall: code.includes("delegatecall"),
      hasSelfDestruct: code.includes("selfdestruct"),
      hasAssembly: code.includes("assembly"),
      hasUnchecked: code.includes("unchecked"),
      hasLowLevelCall: code.includes("call(") || code.includes("call{"),
      hasTransfer: code.includes("transfer(") || code.includes("send("),
      hasReentrancyGuard:
        code.includes("nonReentrant") || code.includes("ReentrancyGuard"),
      hasOwnable: code.includes("Ownable") || code.includes("onlyOwner"),
      hasPausable: code.includes("Pausable") || code.includes("whenNotPaused"),
    };

    // Call 0G AI for analysis with timeout
    let aiResult;
    try {
      console.log(`🤖 [AnalyzeCode] Calling 0G AI for contract analysis`);

      // Set a timeout for 0G inference
      const timeoutPromise = new Promise<AIResult>(
        (_, reject) =>
          setTimeout(() => reject(new Error("0G inference timeout")), 120000) // 2 minutes timeout
      );

      const inferencePromise = inferRiskOn0G(features);

      aiResult = await Promise.race([inferencePromise, timeoutPromise]);
      console.log(`✅ [AnalyzeCode] 0G AI analysis completed:`, aiResult);
    } catch (aiError) {
      console.warn(
        "0G AI analysis failed or timed out, using fallback:",
        aiError
      );

      // Fallback analysis based on code patterns
      const fallbackScore = calculateFallbackScore(code, features);
      aiResult = {
        score: fallbackScore,
        reason: "Fallback analysis based on code patterns and security checks",
      };
    }

    // Generate comprehensive analysis results
    const analysisResult = generateAnalysisResult(code, language, aiResult);

    console.log(`✅ [AnalyzeCode] Analysis completed successfully`);

    return NextResponse.json(
      analyzeCodeResponseSchema.parse({
        success: true,
        data: analysisResult,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("AnalyzeCode API error:", error);
    return NextResponse.json(
      analyzeCodeResponseSchema.parse({
        success: false,
        error: "An error occurred during analysis",
      }),
      { status: 500 }
    );
  }
}

interface AIResult {
  score: number;
  reason: string;
}

interface SecurityIssue {
  severity: "critical" | "high" | "medium" | "low";
  issue: string;
  description: string;
  fix: string;
}

interface GasOptimization {
  current: number;
  optimized: number;
  savings: number;
}

interface CodeQuality {
  maintainability: number;
  readability: number;
  testability: number;
}

function generateAnalysisResult(
  code: string,
  language: string,
  aiResult: AIResult
) {
  // Security analysis
  const securityIssues = analyzeSecurityIssues(code);

  // Gas optimization analysis
  const gasOptimization = analyzeGasOptimization(code);

  // Code quality analysis
  const codeQuality = analyzeCodeQuality(code);

  // Generate recommendations
  const recommendations = generateRecommendations(
    code,
    language,
    securityIssues,
    gasOptimization,
    codeQuality
  );

  // Calculate overall score
  const score = calculateOverallScore(
    aiResult,
    securityIssues,
    gasOptimization,
    codeQuality
  );

  return {
    score,
    recommendations,
    gasOptimization,
    securityIssues,
    codeQuality,
  };
}

function analyzeSecurityIssues(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Check for common security vulnerabilities
  if (code.includes("delegatecall") && !code.includes("// safe")) {
    issues.push({
      severity: "critical" as const,
      issue: "Unsafe Delegate Call",
      description:
        "Delegate call can execute arbitrary code in the context of the current contract",
      fix: "Avoid delegatecall or implement proper access controls and validation",
    });
  }

  if (code.includes("selfdestruct") && !code.includes("onlyOwner")) {
    issues.push({
      severity: "critical" as const,
      issue: "Unprotected Self Destruct",
      description: "Self destruct function is not protected by access control",
      fix: "Add onlyOwner modifier or remove selfdestruct functionality",
    });
  }

  if (code.includes("assembly") && !code.includes("// safe")) {
    issues.push({
      severity: "high" as const,
      issue: "Inline Assembly Usage",
      description: "Assembly code bypasses Solidity's safety checks",
      fix: "Review assembly code carefully and add extensive testing",
    });
  }

  if (code.includes("unchecked") && !code.includes("// safe")) {
    issues.push({
      severity: "medium" as const,
      issue: "Unchecked Arithmetic",
      description: "Unchecked arithmetic can lead to overflow/underflow",
      fix: "Use SafeMath or check for overflow/underflow conditions",
    });
  }

  if (code.includes("transfer(") && !code.includes("ReentrancyGuard")) {
    issues.push({
      severity: "high" as const,
      issue: "Potential Reentrancy",
      description:
        "External calls before state changes can lead to reentrancy attacks",
      fix: "Use Checks-Effects-Interactions pattern or ReentrancyGuard",
    });
  }

  const functionCount = (code.match(/function\s+\w+/g) || []).length;
  if (!code.includes("onlyOwner") && functionCount > 0) {
    issues.push({
      severity: "medium" as const,
      issue: "Missing Access Control",
      description: "Functions lack proper access control mechanisms",
      fix: "Implement access control using Ownable or custom modifiers",
    });
  }

  return issues;
}

function analyzeGasOptimization(code: string): GasOptimization {
  // Basic gas optimization analysis
  const currentGas = estimateGasUsage(code);
  const optimizedGas = currentGas * 0.8; // Assume 20% optimization possible
  const savings = Math.round(((currentGas - optimizedGas) / currentGas) * 100);

  return {
    current: currentGas,
    optimized: Math.round(optimizedGas),
    savings: Math.max(0, savings),
  };
}

function estimateGasUsage(code: string): number {
  // Simple gas estimation based on code patterns
  let gas = 21000; // Base transaction cost

  // Add gas for each function
  const functionCount = (code.match(/function\s+\w+/g) || []).length;
  gas += functionCount * 2000;

  // Add gas for storage operations
  const storageOps = (code.match(/sstore|sload/g) || []).length;
  gas += storageOps * 5000;

  // Add gas for external calls
  const externalCalls = (
    code.match(/call\(|delegatecall\(|staticcall\(/g) || []
  ).length;
  gas += externalCalls * 10000;

  return gas;
}

function analyzeCodeQuality(code: string): CodeQuality {
  const lines = code.split("\n");
  const lineCount = lines.length;
  const functionCount = (code.match(/function\s+\w+/g) || []).length;

  // Calculate maintainability (based on function length, comments, etc.)
  const avgFunctionLength =
    functionCount > 0 ? lineCount / functionCount : lineCount;
  const commentLines = lines.filter(
    (line) => line.trim().startsWith("//") || line.trim().startsWith("/*")
  ).length;
  const commentRatio = commentLines / lineCount;

  const maintainability = Math.min(
    10,
    Math.max(1, 10 - avgFunctionLength / 20 + commentRatio * 5)
  );

  // Calculate readability (based on naming conventions, structure)
  const hasGoodNaming = /[A-Z][a-zA-Z0-9]*/.test(code); // PascalCase for contracts
  const hasProperSpacing = !code.includes("){") && !code.includes("}else");
  const readability = Math.min(
    10,
    Math.max(1, (hasGoodNaming ? 3 : 0) + (hasProperSpacing ? 3 : 0) + 4)
  );

  // Calculate testability (based on function visibility, events, etc.)
  const publicFunctions = (code.match(/function\s+\w+.*public/g) || []).length;
  const events = (code.match(/event\s+\w+/g) || []).length;
  const testability = Math.min(
    10,
    Math.max(
      1,
      (publicFunctions / functionCount) * 5 + (events > 0 ? 3 : 0) + 2
    )
  );

  return {
    maintainability: Math.round(maintainability * 10) / 10,
    readability: Math.round(readability * 10) / 10,
    testability: Math.round(testability * 10) / 10,
  };
}

function generateRecommendations(
  code: string,
  _language: string,
  securityIssues: SecurityIssue[],
  gasOptimization: GasOptimization,
  codeQuality: CodeQuality
) {
  const recommendations = [];

  // Security recommendations
  if (securityIssues.length > 0) {
    recommendations.push({
      category: "Security",
      priority: "high" as const,
      title: "Address Security Vulnerabilities",
      description: `Found ${securityIssues.length} security issues that need immediate attention`,
      suggestion: "Review and fix all security issues before deployment",
    });
  }

  // Gas optimization recommendations
  if (gasOptimization.savings > 10) {
    recommendations.push({
      category: "Gas Optimization",
      priority: "medium" as const,
      title: "Gas Optimization Available",
      description: `Potential ${gasOptimization.savings}% gas savings identified`,
      suggestion:
        "Consider using libraries, optimizing loops, and reducing storage operations",
    });
  }

  // Code quality recommendations
  if (codeQuality.maintainability < 6) {
    recommendations.push({
      category: "Code Quality",
      priority: "medium" as const,
      title: "Improve Code Maintainability",
      description: "Code maintainability score is below recommended threshold",
      suggestion:
        "Break down large functions, add more comments, and improve code structure",
    });
  }

  if (codeQuality.readability < 6) {
    recommendations.push({
      category: "Code Quality",
      priority: "low" as const,
      title: "Improve Code Readability",
      description: "Code readability can be improved",
      suggestion:
        "Use consistent naming conventions, proper spacing, and clear variable names",
    });
  }

  // General recommendations
  if (!code.includes("pragma solidity")) {
    recommendations.push({
      category: "Best Practices",
      priority: "medium" as const,
      title: "Add Compiler Version",
      description: "No pragma solidity directive found",
      suggestion: "Add pragma solidity directive to specify compiler version",
    });
  }

  if (!code.includes("SPDX-License-Identifier")) {
    recommendations.push({
      category: "Best Practices",
      priority: "low" as const,
      title: "Add License Identifier",
      description: "No SPDX license identifier found",
      suggestion: "Add SPDX-License-Identifier comment at the top of the file",
    });
  }

  return recommendations;
}

function calculateOverallScore(
  aiResult: AIResult,
  securityIssues: SecurityIssue[],
  gasOptimization: GasOptimization,
  codeQuality: CodeQuality
) {
  let score = 100; // Start with perfect score

  // Deduct points for security issues
  securityIssues.forEach((issue) => {
    switch (issue.severity) {
      case "critical":
        score -= 30;
        break;
      case "high":
        score -= 20;
        break;
      case "medium":
        score -= 10;
        break;
      case "low":
        score -= 5;
        break;
    }
  });

  // Deduct points for poor code quality
  if (codeQuality.maintainability < 5) score -= 15;
  if (codeQuality.readability < 5) score -= 10;
  if (codeQuality.testability < 5) score -= 10;

  // Deduct points for gas inefficiency
  if (gasOptimization.savings > 20) score -= 10;

  // Use AI result if available
  if (aiResult && aiResult.score) {
    score = Math.min(score, aiResult.score);
  }

  return Math.max(0, Math.min(100, score));
}

interface ContractFeatures {
  hasDelegateCall: boolean;
  hasSelfDestruct: boolean;
  hasAssembly: boolean;
  hasUnchecked: boolean;
  hasLowLevelCall: boolean;
  hasReentrancyGuard: boolean;
  hasOwnable: boolean;
  hasPausable: boolean;
  hasEvents: boolean;
  hasModifiers: boolean;
  contractCount: number;
  functionCount: number;
}

function calculateFallbackScore(
  code: string,
  features: ContractFeatures
): number {
  let score = 80; // Start with good score for verified contracts

  // Check for security issues and deduct points
  if (features.hasDelegateCall) {
    score = Math.min(score, 20); // Very dangerous
  }
  if (features.hasSelfDestruct) {
    score = Math.min(score, 15); // Very dangerous
  }
  if (features.hasAssembly) {
    score = Math.min(score, 30); // Dangerous
  }
  if (features.hasUnchecked) {
    score = Math.min(score, 40); // Medium risk
  }
  if (features.hasLowLevelCall && !features.hasReentrancyGuard) {
    score = Math.min(score, 35); // Reentrancy risk
  }

  // Check for good practices and add points
  if (features.hasOwnable) {
    score = Math.min(100, score + 10); // Good access control
  }
  if (features.hasPausable) {
    score = Math.min(100, score + 5); // Emergency stop
  }
  if (features.hasEvents) {
    score = Math.min(100, score + 5); // Good for monitoring
  }
  if (features.hasModifiers) {
    score = Math.min(100, score + 5); // Code reusability
  }

  // Check for basic contract structure
  if (features.contractCount === 0) {
    score = Math.min(score, 30); // No contract found
  }
  if (features.functionCount === 0) {
    score = Math.min(score, 40); // No functions found
  }

  // Check for pragma directive
  if (!code.includes("pragma solidity")) {
    score = Math.min(score, 60); // Missing compiler version
  }

  return Math.max(0, Math.min(100, score));
}
