import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inferRiskOn0G } from "../../../../shared/lib/zeroG/infer";
import { parseMultiFileContracts, combineFilesForAnalysis } from "../../../../shared/lib/contractParser";
import { resolveImports } from "../../../../shared/lib/importResolver";
import { MultiFileAnalysis, SecurityIssue, GasOptimization, CodeQuality, Recommendation } from "../../../../types/contractAnalysis";

// Request schema
const analyzeMultiRequestSchema = z.object({
  files: z.array(z.object({
    name: z.string(),
    content: z.string(),
    path: z.string(),
    size: z.number().optional()
  })).min(1, "At least one file is required").max(10, "Maximum 10 files allowed"),
  language: z.string().default("solidity"),
  resolveImports: z.boolean().default(true)
});

// Response schema
const analyzeMultiResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      size: z.number()
    })),
    mainContract: z.string().optional(),
    dependencies: z.record(z.string(), z.array(z.string())),
    combinedAnalysis: z.object({
      score: z.number().min(0).max(100),
      securityIssues: z.array(z.object({
        severity: z.enum(["critical", "high", "medium", "low"]),
        issue: z.string(),
        description: z.string(),
        fix: z.string()
      })),
      gasOptimization: z.object({
        current: z.number(),
        optimized: z.number(),
        savings: z.number()
      }),
      codeQuality: z.object({
        maintainability: z.number().min(0).max(10),
        readability: z.number().min(0).max(10),
        testability: z.number().min(0).max(10)
      }),
      recommendations: z.array(z.object({
        category: z.string(),
        priority: z.enum(["high", "medium", "low"]),
        title: z.string(),
        description: z.string(),
        suggestion: z.string()
      }))
    }),
    individualFiles: z.array(z.object({
      path: z.string(),
      lineCount: z.number(),
      contractCount: z.number(),
      functionCount: z.number()
    })).optional()
  }).optional(),
  error: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = analyzeMultiRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        analyzeMultiResponseSchema.parse({
          success: false,
          error: parsed.error.message
        }),
        { status: 400 }
      );
    }

    const { files, language, resolveImports: shouldResolveImports } = parsed.data;

    console.log(`🤖 [AnalyzeMulti] Starting multi-file analysis for ${files.length} files`);

    // Validate file sizes and types
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    if (totalSize > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json(
        analyzeMultiResponseSchema.parse({
          success: false,
          error: "Total file size exceeds 5MB limit"
        }),
        { status: 400 }
      );
    }

    // Validate file types
    const allowedExtensions = ['.sol', '.vy', '.rs', '.py', '.ts', '.js'];
    for (const file of files) {
      const hasValidExtension = allowedExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );
      if (!hasValidExtension) {
        return NextResponse.json(
          analyzeMultiResponseSchema.parse({
            success: false,
            error: `Invalid file type: ${file.name}. Allowed: ${allowedExtensions.join(', ')}`
          }),
          { status: 400 }
        );
      }
    }

    // Parse contracts from all files
    const parsedFiles = parseMultiFileContracts(files);
    console.log(`📊 [AnalyzeMulti] Parsed ${parsedFiles.contracts.length} contracts`);

    // Resolve imports if requested
    let resolvedImports = null;
    if (shouldResolveImports) {
      console.log(`🔍 [AnalyzeMulti] Resolving imports...`);
      resolvedImports = await resolveImports(files);
      console.log(`✅ [AnalyzeMulti] Resolved ${resolvedImports.resolved.length} imports, ${resolvedImports.missing.length} missing`);
    }

    // Combine all files for 0G analysis
    const combinedCode = combineFilesForAnalysis(files);
    
    // Prepare features for 0G AI analysis
    const features = {
      summary: `Multi-file smart contract analysis for ${files.length} files`,
      sourceCode: combinedCode,
      language: language,
      multiFile: true,
      fileCount: files.length,
      contractCount: parsedFiles.contracts.length,
      totalLines: parsedFiles.totalLines,
      totalFunctions: parsedFiles.totalFunctions,
      totalEvents: parsedFiles.totalEvents,
      mainContract: parsedFiles.mainContract,
      // Extract basic metrics from combined code
      lineCount: combinedCode.split("\n").length,
      functionCount: (combinedCode.match(/function\s+\w+/g) || []).length,
      // Extract potential security patterns
      hasModifiers: combinedCode.includes("modifier"),
      hasEvents: combinedCode.includes("event"),
      hasStructs: combinedCode.includes("struct"),
      hasEnums: combinedCode.includes("enum"),
      hasLibraries: combinedCode.includes("library"),
      hasInterfaces: combinedCode.includes("interface"),
      // Extract potential risk patterns
      hasDelegateCall: combinedCode.includes("delegatecall"),
      hasSelfDestruct: combinedCode.includes("selfdestruct"),
      hasAssembly: combinedCode.includes("assembly"),
      hasUnchecked: combinedCode.includes("unchecked"),
      hasLowLevelCall: combinedCode.includes("call(") || combinedCode.includes("call{"),
      hasTransfer: combinedCode.includes("transfer(") || combinedCode.includes("send("),
      hasReentrancyGuard: combinedCode.includes("nonReentrant") || combinedCode.includes("ReentrancyGuard"),
      hasOwnable: combinedCode.includes("Ownable") || combinedCode.includes("onlyOwner"),
      hasPausable: combinedCode.includes("Pausable") || combinedCode.includes("whenNotPaused"),
    };

    // Call 0G AI for analysis
    let aiResult;
    try {
      console.log(`🤖 [AnalyzeMulti] Calling 0G AI for multi-file analysis`);

      // Set a timeout for 0G inference
      const timeoutPromise = new Promise<AIResult>(
        (_, reject) =>
          setTimeout(() => reject(new Error("0G inference timeout")), 120000) // 2 minutes timeout
      );

      const inferencePromise = inferRiskOn0G(features);

      aiResult = await Promise.race([inferencePromise, timeoutPromise]);
      console.log(`✅ [AnalyzeMulti] 0G AI analysis completed:`, aiResult);
    } catch (aiError) {
      console.warn("0G AI analysis failed or timed out, using fallback:", aiError);

      // Fallback analysis based on code patterns
      const fallbackScore = calculateFallbackScore(combinedCode, features);
      aiResult = {
        score: fallbackScore,
        reason: "Fallback analysis based on multi-file code patterns and security checks",
      };
    }

    // Generate comprehensive analysis results
    const analysisResult = generateMultiFileAnalysisResult(
      files,
      parsedFiles,
      resolvedImports,
      aiResult,
      language
    );

    console.log(`✅ [AnalyzeMulti] Multi-file analysis completed successfully`);

    return NextResponse.json(
      analyzeMultiResponseSchema.parse({
        success: true,
        data: analysisResult
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("AnalyzeMulti API error:", error);
    return NextResponse.json(
      analyzeMultiResponseSchema.parse({
        success: false,
        error: "An error occurred during multi-file analysis"
      }),
      { status: 500 }
    );
  }
}

interface AIResult {
  score: number;
  reason: string;
}

function generateMultiFileAnalysisResult(
  files: Array<{ name: string; content: string; path: string; size?: number }>,
  parsedFiles: unknown,
  resolvedImports: unknown,
  aiResult: AIResult,
  language: string
): MultiFileAnalysis {
  // Security analysis
  const securityIssues = analyzeSecurityIssues(files);

  // Gas optimization analysis
  const gasOptimization = analyzeGasOptimization(files);

  // Code quality analysis
  const codeQuality = analyzeCodeQuality(files);

  // Generate recommendations
  const recommendations = generateRecommendations(
    files,
    language,
    securityIssues,
    gasOptimization,
    codeQuality,
    resolvedImports
  );

  // Calculate overall score
  const score = calculateOverallScore(
    aiResult,
    securityIssues,
    gasOptimization,
    codeQuality
  );

  // Build dependencies graph
  const dependencies = resolvedImports ? 
    Object.fromEntries(
      files.map(file => [
        file.path,
        (resolvedImports as { resolved: Array<{ path: string }> }).resolved
          .filter((imp) => imp.path.startsWith(file.path))
          .map((imp) => imp.path)
      ])
    ) : {};

  // Individual file stats
  const individualFiles = files.map(file => {
    const fileContracts = (parsedFiles as { contracts: Array<{ path: string; functions: unknown[] }> }).contracts.filter((c) => c.path === file.path);
    return {
      path: file.path,
      lineCount: file.content.split('\n').length,
      contractCount: fileContracts.length,
      functionCount: fileContracts.reduce((sum: number, c) => sum + c.functions.length, 0)
    };
  });

  return {
    files: files.map(f => ({
      path: f.path,
      content: f.content,
      size: f.size || f.content.length
    })),
    mainContract: (parsedFiles as { mainContract?: string }).mainContract,
    dependencies,
    combinedAnalysis: {
      score,
      securityIssues,
      gasOptimization,
      codeQuality,
      recommendations
    },
    individualFiles
  };
}

function analyzeSecurityIssues(files: Array<{ content: string }>): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const combinedCode = files.map(f => f.content).join('\n');

  // Check for common security vulnerabilities across all files
  if (combinedCode.includes("delegatecall") && !combinedCode.includes("// safe")) {
    issues.push({
      severity: "critical",
      issue: "Unsafe Delegate Call",
      description: "Delegate call can execute arbitrary code in the context of the current contract",
      fix: "Avoid delegatecall or implement proper access controls and validation"
    });
  }

  if (combinedCode.includes("selfdestruct") && !combinedCode.includes("onlyOwner")) {
    issues.push({
      severity: "critical",
      issue: "Unprotected Self Destruct",
      description: "Self destruct function is not protected by access control",
      fix: "Add onlyOwner modifier or remove selfdestruct functionality"
    });
  }

  if (combinedCode.includes("assembly") && !combinedCode.includes("// safe")) {
    issues.push({
      severity: "high",
      issue: "Inline Assembly Usage",
      description: "Assembly code bypasses Solidity's safety checks",
      fix: "Review assembly code carefully and add extensive testing"
    });
  }

  if (combinedCode.includes("unchecked") && !combinedCode.includes("// safe")) {
    issues.push({
      severity: "medium",
      issue: "Unchecked Arithmetic",
      description: "Unchecked arithmetic can lead to overflow/underflow",
      fix: "Use SafeMath or check for overflow/underflow conditions"
    });
  }

  if (combinedCode.includes("transfer(") && !combinedCode.includes("ReentrancyGuard")) {
    issues.push({
      severity: "high",
      issue: "Potential Reentrancy",
      description: "External calls before state changes can lead to reentrancy attacks",
      fix: "Use Checks-Effects-Interactions pattern or ReentrancyGuard"
    });
  }

  const functionCount = (combinedCode.match(/function\s+\w+/g) || []).length;
  if (!combinedCode.includes("onlyOwner") && functionCount > 0) {
    issues.push({
      severity: "medium",
      issue: "Missing Access Control",
      description: "Functions lack proper access control mechanisms",
      fix: "Implement access control using Ownable or custom modifiers"
    });
  }

  return issues;
}

function analyzeGasOptimization(files: Array<{ content: string }>): GasOptimization {
  const combinedCode = files.map(f => f.content).join('\n');
  const currentGas = estimateGasUsage(combinedCode);
  const optimizedGas = currentGas * 0.8; // Assume 20% optimization possible
  const savings = Math.round(((currentGas - optimizedGas) / currentGas) * 100);

  return {
    current: currentGas,
    optimized: Math.round(optimizedGas),
    savings: Math.max(0, savings)
  };
}

function estimateGasUsage(code: string): number {
  let gas = 21000; // Base transaction cost

  // Add gas for each function
  const functionCount = (code.match(/function\s+\w+/g) || []).length;
  gas += functionCount * 2000;

  // Add gas for storage operations
  const storageOps = (code.match(/sstore|sload/g) || []).length;
  gas += storageOps * 5000;

  // Add gas for external calls
  const externalCalls = (code.match(/call\(|delegatecall\(|staticcall\(/g) || []).length;
  gas += externalCalls * 10000;

  return gas;
}

function analyzeCodeQuality(files: Array<{ content: string }>): CodeQuality {
  const combinedCode = files.map(f => f.content).join('\n');
  const lines = combinedCode.split('\n');
  const lineCount = lines.length;
  const functionCount = (combinedCode.match(/function\s+\w+/g) || []).length;

  // Calculate maintainability
  const avgFunctionLength = functionCount > 0 ? lineCount / functionCount : lineCount;
  const commentLines = lines.filter(
    (line) => line.trim().startsWith("//") || line.trim().startsWith("/*")
  ).length;
  const commentRatio = lineCount > 0 ? commentLines / lineCount : 0;

  const maintainability = Math.min(
    10,
    Math.max(1, 10 - avgFunctionLength / 20 + commentRatio * 5)
  );

  // Calculate readability
  const hasGoodNaming = /[A-Z][a-zA-Z0-9]*/.test(combinedCode);
  const hasProperSpacing = !combinedCode.includes("){") && !combinedCode.includes("}else");
  const readability = Math.min(
    10,
    Math.max(1, (hasGoodNaming ? 3 : 0) + (hasProperSpacing ? 3 : 0) + 4)
  );

  // Calculate testability - avoid division by zero
  const publicFunctions = (combinedCode.match(/function\s+\w+.*public/g) || []).length;
  const events = (combinedCode.match(/event\s+\w+/g) || []).length;
  const testability = functionCount > 0 
    ? Math.min(10, Math.max(1, (publicFunctions / functionCount) * 5 + (events > 0 ? 3 : 0) + 2))
    : 5; // Default to 5 if no functions

  return {
    maintainability: Math.round(maintainability * 10) / 10,
    readability: Math.round(readability * 10) / 10,
    testability: Math.round(testability * 10) / 10
  };
}

function generateRecommendations(
  files: Array<{ content: string }>,
  language: string,
  securityIssues: SecurityIssue[],
  gasOptimization: GasOptimization,
  codeQuality: CodeQuality,
  resolvedImports: unknown
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Security recommendations
  if (securityIssues.length > 0) {
    recommendations.push({
      category: "Security",
      priority: "high",
      title: "Address Security Vulnerabilities",
      description: `Found ${securityIssues.length} security issues that need immediate attention`,
      suggestion: "Review and fix all security issues before deployment"
    });
  }

  // Gas optimization recommendations
  if (gasOptimization.savings > 10) {
    recommendations.push({
      category: "Gas Optimization",
      priority: "medium",
      title: "Gas Optimization Available",
      description: `Potential ${gasOptimization.savings}% gas savings identified`,
      suggestion: "Consider using libraries, optimizing loops, and reducing storage operations"
    });
  }

  // Code quality recommendations
  if (codeQuality.maintainability < 6) {
    recommendations.push({
      category: "Code Quality",
      priority: "medium",
      title: "Improve Code Maintainability",
      description: "Code maintainability score is below recommended threshold",
      suggestion: "Break down large functions, add more comments, and improve code structure"
    });
  }

  if (codeQuality.readability < 6) {
    recommendations.push({
      category: "Code Quality",
      priority: "low",
      title: "Improve Code Readability",
      description: "Code readability can be improved",
      suggestion: "Use consistent naming conventions, proper spacing, and clear variable names"
    });
  }

  // Multi-file specific recommendations
  if (files.length > 1) {
    recommendations.push({
      category: "Architecture",
      priority: "medium",
      title: "Multi-file Contract Structure",
      description: "Consider the interaction between multiple contract files",
      suggestion: "Ensure proper inheritance, interfaces, and cross-contract communication patterns"
    });
  }

  // Import resolution recommendations
  if (resolvedImports && (resolvedImports as { missing?: unknown[] }).missing && (resolvedImports as { missing: unknown[] }).missing.length > 0) {
    recommendations.push({
      category: "Dependencies",
      priority: "high",
      title: "Missing Dependencies",
      description: `${(resolvedImports as { missing: unknown[] }).missing.length} imports could not be resolved`,
      suggestion: "Upload missing files or use standard libraries like OpenZeppelin"
    });
  }

  return recommendations;
}

function calculateOverallScore(
  aiResult: AIResult,
  securityIssues: SecurityIssue[],
  gasOptimization: GasOptimization,
  codeQuality: CodeQuality
): number {
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

function calculateFallbackScore(code: string, features: unknown): number {
  let score = 80; // Start with good score for multi-file contracts
  const f = features as {
    hasDelegateCall?: boolean;
    hasSelfDestruct?: boolean;
    hasAssembly?: boolean;
    hasUnchecked?: boolean;
    hasLowLevelCall?: boolean;
    hasReentrancyGuard?: boolean;
    hasOwnable?: boolean;
    hasPausable?: boolean;
    hasEvents?: boolean;
    hasModifiers?: boolean;
    fileCount?: number;
  };

  // Check for security issues and deduct points
  if (f.hasDelegateCall) {
    score = Math.min(score, 20); // Very dangerous
  }
  if (f.hasSelfDestruct) {
    score = Math.min(score, 15); // Very dangerous
  }
  if (f.hasAssembly) {
    score = Math.min(score, 30); // Dangerous
  }
  if (f.hasUnchecked) {
    score = Math.min(score, 40); // Medium risk
  }
  if (f.hasLowLevelCall && !f.hasReentrancyGuard) {
    score = Math.min(score, 35); // Reentrancy risk
  }

  // Check for good practices and add points
  if (f.hasOwnable) {
    score = Math.min(100, score + 10); // Good access control
  }
  if (f.hasPausable) {
    score = Math.min(100, score + 5); // Emergency stop
  }
  if (f.hasEvents) {
    score = Math.min(100, score + 5); // Good for monitoring
  }
  if (f.hasModifiers) {
    score = Math.min(100, score + 5); // Code reusability
  }

  // Multi-file bonus
  if (f.fileCount && f.fileCount > 1) {
    score = Math.min(100, score + 5); // Better architecture
  }

  return Math.max(0, Math.min(100, score));
}
