"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Code,
  FileText,
  Brain,
  Zap,
  Shield,
  DollarSign,
  AlertTriangle,
  FolderOpen,
  Github,
  TestTube,
} from "lucide-react";
import { MatrixRain } from "../../shared/components/MatrixRain";
import { ReleaseBadge } from "../../shared/components/ReleaseBadge";
import MultiFileUpload from "../../features/developers/components/MultiFileUpload";
import GitHubImport from "../../features/developers/components/GitHubImport";
import TestGeneration from "../../features/developers/components/TestGeneration";
import { MultiFileAnalysis, TestGenerationResult } from "../../types/contractAnalysis";

interface FileWithPreview {
  file: File;
  id: string;
  content: string;
  size: number;
  path: string;
}

interface AnalysisResult {
  score: number;
  recommendations: {
    category: string;
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    suggestion: string;
  }[];
  gasOptimization: {
    current: number;
    optimized: number;
    savings: number;
  };
  securityIssues: {
    severity: "critical" | "high" | "medium" | "low";
    issue: string;
    description: string;
    fix: string;
  }[];
  codeQuality: {
    maintainability: number;
    readability: number;
    testability: number;
  };
}

type AnalysisMode = 'single' | 'multi-file' | 'github' | 'test-generation';

export default function ContractAnalyzer() {
  const [mode, setMode] = useState<AnalysisMode>('single');
  const [code, setCode] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [multiFileResult, setMultiFileResult] = useState<MultiFileAnalysis | null>(null);
  const [testResult, setTestResult] = useState<TestGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Multi-file state
  const [multiFiles, setMultiFiles] = useState<FileWithPreview[]>([]);
  const [selectedGithubFiles, setSelectedGithubFiles] = useState<FileWithPreview[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCode(""); // Clear textarea when file is selected

      // Read file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCode(content);
      };
      reader.readAsText(file);
    }
  };

  const handleAnalyze = async () => {
    if (mode === 'single') {
      await handleSingleFileAnalysis();
    } else if (mode === 'multi-file') {
      await handleMultiFileAnalysis();
    } else if (mode === 'github') {
      await handleGitHubAnalysis();
    }
    // Note: test-generation mode has its own handler called directly from TestGeneration component
  };

  const handleSingleFileAnalysis = async () => {
    if (!code.trim()) {
      setError("Please enter contract code or upload a file");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/contract-analysis/analyze-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.trim(),
          language: detectLanguage(code),
          fileName: selectedFile?.name || "contract.sol",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMultiFileAnalysis = async () => {
    if (multiFiles.length === 0) {
      setError("Please upload at least one file");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setMultiFileResult(null);

    try {
      const response = await fetch("/api/contract-analysis/analyze-multi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: multiFiles.map(f => ({
            name: f.file.name,
            content: f.content,
            path: f.path,
            size: f.size
          })),
          language: "solidity",
          resolveImports: true
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMultiFileResult(data.data);
      } else {
        setError(data.error || "Multi-file analysis failed");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGitHubAnalysis = async () => {
    if (selectedGithubFiles.length === 0) {
      setError("Please select files from GitHub to analyze");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setMultiFileResult(null);

    try {
      const response = await fetch("/api/contract-analysis/analyze-multi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: selectedGithubFiles.map(f => ({
            name: f.path.split('/').pop(),
            content: f.content,
            path: f.path,
            size: f.size
          })),
          language: "solidity",
          resolveImports: true
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMultiFileResult(data.data);
      } else {
        setError(data.error || "GitHub analysis failed");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTestGeneration = async (contractCode: string, contractName: string, frameworks: ('hardhat' | 'foundry')[]): Promise<TestGenerationResult> => {
    setIsAnalyzing(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await fetch("/api/contract-analysis/generate-tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractCode,
          contractName,
          testFrameworks: frameworks,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult(data);
        return data;
      } else {
        setError(data.error || "Test generation failed");
        throw new Error(data.error || "Test generation failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Network error occurred during test generation";
      setError(errorMessage);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const detectLanguage = (code: string): string => {
    if (code.includes("pragma solidity") || code.includes("contract ")) {
      return "solidity";
    }
    if (code.includes("use near_sdk") || code.includes("near_bindgen")) {
      return "rust";
    }
    if (code.includes("use ink::") || code.includes("#[ink::contract]")) {
      return "ink";
    }
    if (code.includes("import") && code.includes("from")) {
      return "vyper";
    }
    return "solidity"; // Default to Solidity
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-800 bg-red-100";
      case "high":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Matrix Rain Background */}
      <MatrixRain />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 font-raleway">
            Smart Contract Developer Tools
          </h1>
          <div className="flex items-center justify-center gap-4">
            <p className="text-xl text-gray-300">
              Analyze your smart contracts for security, gas optimization, and
              best practices
            </p>
            <ReleaseBadge />
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-black/40 backdrop-blur-xl rounded-xl p-1 border border-neon-cyan/30">
            <div className="flex space-x-1">
              <button
                onClick={() => setMode('single')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                  mode === 'single'
                    ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-lg shadow-neon-cyan/30'
                    : 'text-gray-300 hover:text-white hover:bg-neon-cyan/20'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Single File</span>
              </button>
              <button
                onClick={() => setMode('multi-file')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                  mode === 'multi-file'
                    ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-lg shadow-neon-cyan/30'
                    : 'text-gray-300 hover:text-white hover:bg-neon-cyan/20'
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                <span>Multi-File</span>
              </button>
              <button
                onClick={() => setMode('github')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                  mode === 'github'
                    ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-lg shadow-neon-cyan/30'
                    : 'text-gray-300 hover:text-white hover:bg-neon-cyan/20'
                }`}
              >
                <Github className="h-4 w-4" />
                <span>GitHub Import</span>
              </button>
              <button
                onClick={() => setMode('test-generation')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
                  mode === 'test-generation'
                    ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-white shadow-lg shadow-neon-cyan/30'
                    : 'text-gray-300 hover:text-white hover:bg-neon-cyan/20'
                }`}
              >
                <TestTube className="h-4 w-4" />
                <span>Test Generation</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-neon-cyan/30 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <Code className="mr-3" />
              {mode === 'single' && 'Contract Code'}
              {mode === 'multi-file' && 'Multi-File Upload'}
              {mode === 'github' && 'GitHub Repository'}
              {mode === 'test-generation' && 'Test Generation'}
            </h2>

            {/* Single File Mode */}
            {mode === 'single' && (
              <>
                {/* File Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Upload Contract File
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".sol,.rs,.py,.vy,.ts,.js"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center px-4 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-neon-cyan/20"
                    >
                      <Upload className="mr-2" size={20} />
                      Choose File
                    </button>
                    {selectedFile && (
                      <span className="text-sm text-gray-300">
                        {selectedFile.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Textarea */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Or paste your code here
                  </label>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="// Paste your smart contract code here...
pragma solidity ^0.8.0;

contract MyContract {
    // Your contract code...
}"
                    className="w-full h-96 p-4 bg-black/60 border border-neon-cyan/30 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan font-mono text-sm transition-all duration-300"
                  />
                </div>
              </>
            )}

            {/* Multi-File Mode */}
            {mode === 'multi-file' && (
              <MultiFileUpload
                onFilesChange={setMultiFiles}
                maxFiles={10}
                maxSize={5}
              />
            )}

            {/* GitHub Mode */}
            {mode === 'github' && (
              <div className="space-y-4">
                {/* Important Notice */}
                <div className="p-4 bg-red-900/20 border-2 border-red-500/50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="text-red-400 text-xl">⚠️</div>
                    <div>
                      <h3 className="text-red-400 font-bold text-sm mb-1">IMPORTANT NOTICE</h3>
                      <p className="text-red-200 text-sm">
                        Only <strong>smart contract files</strong> will be analyzed from the GitHub repository:
                        <br />• <strong>Solidity</strong> (.sol) - Ethereum, Polygon, BSC
                        <br />• <strong>Vyper</strong> (.vy) - Ethereum alternative
                        <br />• <strong>Rust</strong> (.rs) - Solana, Near Protocol
                        <br />• <strong>Python</strong> (.py) - Algorand, Tezos
                        <br />• <strong>TypeScript/JavaScript</strong> (.ts/.js) - Near Protocol, Cosmos
                        <br />Other file types will be ignored during analysis.
                      </p>
                    </div>
                  </div>
                </div>
                
                <GitHubImport
                  onFilesChange={() => {}}
                  onSelectedFilesChange={(files) => {
                    const convertedFiles = files.map(file => ({
                      file: new File([file.content], file.path.split('/').pop() || 'file.sol'),
                      id: Math.random().toString(36).substr(2, 9),
                      content: file.content,
                      size: file.size,
                      path: file.path
                    }));
                    setSelectedGithubFiles(convertedFiles);
                  }}
                  onRepoInfoChange={() => {}}
                />
              </div>
            )}

            {/* Test Generation Mode */}
            {mode === 'test-generation' && (
              <TestGeneration
                onGenerate={handleTestGeneration}
              />
            )}

            {/* Analyze Button - Only show for non-test-generation modes */}
            {mode !== 'test-generation' && (
              <button
                onClick={handleAnalyze}
                disabled={
                  isAnalyzing || 
                  (mode === 'single' && !code.trim()) ||
                  (mode === 'multi-file' && multiFiles.length === 0) ||
                  (mode === 'github' && selectedGithubFiles.length === 0)
                }
              className="w-full flex items-center justify-center px-8 py-4 bg-gradient-to-r from-neon-cyan to-neon-blue hover:from-neon-cyan/80 hover:to-neon-blue/80 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold text-lg rounded-xl transition-all duration-300 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-neon-cyan/30 transform hover:scale-105 disabled:transform-none border-2 border-neon-cyan/50 hover:border-neon-cyan shadow-lg"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  <span className="text-lg">Analyzing with 0G AI...</span>
                </>
              ) : (
                <>
                  <Brain className="mr-3" size={24} />
                  <span className="text-lg">
                    {mode === 'single' && 'Analyze Contract'}
                    {mode === 'multi-file' && `Analyze Multi-File (${multiFiles.length})`}
                    {mode === 'github' && `Analyze Selected Files (${selectedGithubFiles.length})`}
                  </span>
                </>
              )}
            </button>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                {error}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-neon-cyan/30 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <FileText className="mr-3" />
              Analysis Results
            </h2>

            {!result && !multiFileResult && !testResult ? (
              <div className="text-center text-gray-400 py-12">
                <Brain className="mx-auto mb-4" size={48} />
                <p className="text-lg mb-2">
                  {mode === 'single' && 'Upload or paste your contract code to get started'}
                  {mode === 'multi-file' && 'Upload multiple files to analyze them together'}
                  {mode === 'github' && 'Import a GitHub repository to analyze its contracts'}
                  {mode === 'test-generation' && 'Paste your contract code to generate comprehensive unit tests'}
                </p>
                <p className="text-sm text-gray-500">
                  Powered by 0G AI • Up to 120 seconds analysis time
                </p>
              </div>
            ) : result ? (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="bg-gradient-to-r from-neon-cyan to-neon-blue rounded-lg p-6 text-white shadow-lg shadow-neon-cyan/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">🤖 AI Analysis Score</h3>
                    <span className="text-4xl font-bold">
                      {result.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-4">
                    <div
                      className="bg-white h-4 rounded-full transition-all duration-500"
                      style={{ width: `${result.score}%` }}
                    ></div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-white/80">
                      Powered by 0G AI • Comprehensive security & quality analysis
                    </p>
                    <div className="p-3 bg-black/30 rounded-lg border border-neon-cyan/20">
                      <h4 className="text-sm font-semibold text-neon-cyan mb-1">AI Analysis Result:</h4>
                      <p className="text-xs text-gray-300">
                        Score: {result.score}/100 • Based on security patterns, code quality, and gas optimization
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <AlertTriangle className="mr-2" />
                    Recommendations
                  </h3>
                  <div className="space-y-3">
                    {result.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-l-4 ${
                          rec.priority === "high"
                            ? "border-red-500 bg-red-900/20"
                            : rec.priority === "medium"
                            ? "border-yellow-500 bg-yellow-900/20"
                            : "border-green-500 bg-green-900/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-white">
                            {rec.title}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                              rec.priority
                            )}`}
                          >
                            {rec.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">
                          {rec.description}
                        </p>
                        <p className="text-blue-300 text-sm font-medium">
                          {rec.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gas Optimization */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Zap className="mr-2" />
                    Gas Optimization
                  </h3>
                  <div className="bg-black/60 border border-neon-cyan/20 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-gray-400 text-sm">Current</p>
                        <p className="text-white font-semibold">
                          {result.gasOptimization.current}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Optimized</p>
                        <p className="text-white font-semibold">
                          {result.gasOptimization.optimized}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Savings</p>
                        <p className="text-green-400 font-semibold">
                          {result.gasOptimization.savings}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Issues */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Shield className="mr-2" />
                    Security Issues
                  </h3>
                  <div className="space-y-3">
                    {result.securityIssues.map((issue, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-neon-cyan/20 bg-black/60"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-white">
                            {issue.issue}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(
                              issue.severity
                            )}`}
                          >
                            {issue.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">
                          {issue.description}
                        </p>
                        <p className="text-blue-300 text-sm font-medium">
                          {issue.fix}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Code Quality */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <DollarSign className="mr-2" />
                    Code Quality
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Maintainability</p>
                      <p className="text-white font-semibold">
                        {result.codeQuality.maintainability}/10
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Readability</p>
                      <p className="text-white font-semibold">
                        {result.codeQuality.readability}/10
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Testability</p>
                      <p className="text-white font-semibold">
                        {result.codeQuality.testability}/10
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : multiFileResult ? (
              <div className="space-y-6">
                {/* Multi-file Overview */}
                <div className="bg-gradient-to-r from-neon-cyan to-neon-blue rounded-lg p-6 text-white shadow-lg shadow-neon-cyan/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">🤖 Multi-File AI Analysis</h3>
                    <span className="text-4xl font-bold">
                      {multiFileResult.combinedAnalysis.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-4">
                    <div
                      className="bg-white h-4 rounded-full transition-all duration-500"
                      style={{ width: `${multiFileResult.combinedAnalysis.score}%` }}
                    ></div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {multiFileResult.mainContract && (
                      <p className="text-sm text-white/80">
                        📋 Main Contract: {multiFileResult.mainContract}
                      </p>
                    )}
                    <p className="text-sm text-white/80">
                      🔍 Analyzed {multiFileResult.files.length} files • Powered by 0G AI
                    </p>
                    <div className="p-3 bg-black/30 rounded-lg border border-neon-cyan/20">
                      <h4 className="text-sm font-semibold text-neon-cyan mb-1">Multi-File AI Analysis Result:</h4>
                      <p className="text-xs text-gray-300">
                        Combined Score: {multiFileResult.combinedAnalysis.score}/100 • 
                        {multiFileResult.files.length} files analyzed • 
                        Security, quality & gas optimization across all contracts
                      </p>
                    </div>
                  </div>
                </div>

                {/* File Structure */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <FolderOpen className="mr-2" />
                    File Structure ({multiFileResult.files.length} files)
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {multiFileResult.files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-3 bg-black/60 border border-neon-cyan/20 rounded-lg"
                      >
                        <div className="text-lg">🔷</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {file.path}
                          </p>
                          <p className="text-xs text-gray-400">
                            {file.content.split('\n').length} lines • {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual File Stats */}
                {multiFileResult.individualFiles && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <FileText className="mr-2" />
                      File Statistics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {multiFileResult.individualFiles.map((file, index) => (
                        <div key={index} className="text-center p-3 bg-black/60 border border-neon-cyan/20 rounded-lg">
                          <div className="text-sm font-medium text-white truncate mb-1">
                            {file.path.split('/').pop()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {file.contractCount} contracts • {file.functionCount} functions
                          </div>
                          <div className="text-xs text-gray-500">
                            {file.lineCount} lines
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Security Issues */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Shield className="mr-2" />
                    Security Issues ({multiFileResult.combinedAnalysis.securityIssues.length})
                  </h3>
                  <div className="space-y-3">
                    {multiFileResult.combinedAnalysis.securityIssues.map((issue, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-l-4 ${
                          issue.severity === "critical"
                            ? "border-red-500 bg-red-900/20"
                            : issue.severity === "high"
                            ? "border-orange-500 bg-orange-900/20"
                            : issue.severity === "medium"
                            ? "border-yellow-500 bg-yellow-900/20"
                            : "border-green-500 bg-green-900/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-white">
                            {issue.issue}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              issue.severity === "critical"
                                ? "text-red-200 bg-red-800"
                                : issue.severity === "high"
                                ? "text-orange-200 bg-orange-800"
                                : issue.severity === "medium"
                                ? "text-yellow-200 bg-yellow-800"
                                : "text-green-200 bg-green-800"
                            }`}
                          >
                            {issue.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">
                          {issue.description}
                        </p>
                        <p className="text-blue-300 text-sm font-medium">
                          {issue.fix}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gas Optimization */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Zap className="mr-2" />
                    Gas Optimization
                  </h3>
                  <div className="bg-black/60 border border-neon-cyan/20 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-gray-400 text-sm">Current</p>
                        <p className="text-white font-semibold">
                          {multiFileResult.combinedAnalysis.gasOptimization.current}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Optimized</p>
                        <p className="text-white font-semibold">
                          {multiFileResult.combinedAnalysis.gasOptimization.optimized}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Savings</p>
                        <p className="text-green-400 font-semibold">
                          {multiFileResult.combinedAnalysis.gasOptimization.savings}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code Quality */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <DollarSign className="mr-2" />
                    Code Quality
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Maintainability</p>
                      <p className="text-white font-semibold">
                        {multiFileResult.combinedAnalysis.codeQuality.maintainability}/10
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Readability</p>
                      <p className="text-white font-semibold">
                        {multiFileResult.combinedAnalysis.codeQuality.readability}/10
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Testability</p>
                      <p className="text-white font-semibold">
                        {multiFileResult.combinedAnalysis.codeQuality.testability}/10
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <AlertTriangle className="mr-2" />
                    Recommendations ({multiFileResult.combinedAnalysis.recommendations.length})
                  </h3>
                  <div className="space-y-3">
                    {multiFileResult.combinedAnalysis.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-l-4 ${
                          rec.priority === "high"
                            ? "border-red-500 bg-red-900/20"
                            : rec.priority === "medium"
                            ? "border-yellow-500 bg-yellow-900/20"
                            : "border-green-500 bg-green-900/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-white">
                            {rec.title}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              rec.priority === "high"
                                ? "text-red-200 bg-red-800"
                                : rec.priority === "medium"
                                ? "text-yellow-200 bg-yellow-800"
                                : "text-green-200 bg-green-800"
                            }`}
                          >
                            {rec.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">
                          {rec.description}
                        </p>
                        <p className="text-blue-300 text-sm font-medium">
                          {rec.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : testResult ? (
              <div className="text-center text-gray-400 py-12">
                <TestTube className="mx-auto mb-4" size={48} />
                <p className="text-lg mb-2">
                  Test generation results are displayed in the input section
                </p>
                <p className="text-sm text-gray-500">
                  Check the Test Generation tab for your generated tests
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
