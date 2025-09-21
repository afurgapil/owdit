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
} from "lucide-react";
import { MatrixRain } from "../../shared/components/MatrixRain";

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

export default function ContractAnalyzer() {
  const [code, setCode] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          <p className="text-xl text-gray-300">
            Analyze your smart contracts for security, gas optimization, and
            best practices
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 border border-neon-cyan/30 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <Code className="mr-3" />
              Contract Code
            </h2>

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

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !code.trim()}
              className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-blue hover:from-neon-cyan/80 hover:to-neon-blue/80 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-neon-cyan/20"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2" size={20} />
                  Analyze Contract
                </>
              )}
            </button>

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

            {!result ? (
              <div className="text-center text-gray-400 py-12">
                <Brain className="mx-auto mb-4" size={48} />
                <p>Upload or paste your contract code to get started</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="bg-gradient-to-r from-neon-cyan to-neon-blue rounded-lg p-6 text-white shadow-lg shadow-neon-cyan/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">Overall Score</h3>
                    <span className="text-3xl font-bold">
                      {result.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div
                      className="bg-white h-3 rounded-full transition-all duration-500"
                      style={{ width: `${result.score}%` }}
                    ></div>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
