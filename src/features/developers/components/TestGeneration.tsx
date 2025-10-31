"use client";

import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { saveAs } from "file-saver";
import {
  Play,
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Code2,
  TestTube,
  HardHat,
  Zap,
} from "lucide-react";
import { TestGenerationResult } from "../../../types/contractAnalysis";

interface TestGenerationProps {
  onGenerate: (contractCode: string, contractName: string, frameworks: ('hardhat' | 'foundry')[]) => Promise<TestGenerationResult>;
}

export default function TestGeneration({
  onGenerate,
}: TestGenerationProps) {
  const [contractCode, setContractCode] = useState("");
  const [contractName, setContractName] = useState("");
  const [selectedFrameworks, setSelectedFrameworks] = useState<('hardhat' | 'foundry')[]>(['hardhat']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<TestGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Parse contract name from Solidity code
  const parseContractName = (code: string): string => {
    // Remove comments and normalize whitespace
    const cleanCode = code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Look for contract declarations
    const contractMatch = cleanCode.match(/\bcontract\s+(\w+)/i);
    if (contractMatch) {
      return contractMatch[1];
    }

    // Look for interface declarations
    const interfaceMatch = cleanCode.match(/\binterface\s+(\w+)/i);
    if (interfaceMatch) {
      return interfaceMatch[1];
    }

    // Look for library declarations
    const libraryMatch = cleanCode.match(/\blibrary\s+(\w+)/i);
    if (libraryMatch) {
      return libraryMatch[1];
    }

    // Look for abstract contract declarations
    const abstractMatch = cleanCode.match(/\babstract\s+contract\s+(\w+)/i);
    if (abstractMatch) {
      return abstractMatch[1];
    }

    return '';
  };

  // Update contract name when code changes
  const handleCodeChange = (code: string) => {
    setContractCode(code);
    const parsedName = parseContractName(code);
    if (parsedName) {
      setContractName(parsedName);
    }
  };

  const handleFrameworkToggle = (framework: 'hardhat' | 'foundry') => {
    setSelectedFrameworks(prev => 
      prev.includes(framework)
        ? prev.filter(f => f !== framework)
        : [...prev, framework]
    );
  };

  const normalizeResult = (raw: unknown): TestGenerationResult => {
    const obj = (raw as Record<string, unknown>) || {};
    const tests = (obj.tests as Record<string, unknown>) || {};

    const hardhatSrc = tests && (tests as { hardhat?: Record<string, unknown> }).hardhat;
    const foundrySrc = tests && (tests as { foundry?: Record<string, unknown> }).foundry;

    const hardhat = hardhatSrc && (hardhatSrc as { testFile?: string; code?: string; setupFile?: string });
    const foundry = foundrySrc && (foundrySrc as { testFile?: string; code?: string });

    const coverageSrc = (obj.coverage as { functionsCount?: number; testCasesCount?: number }) || {};

    return {
      success: Boolean((obj as { success?: boolean }).success),
      tests: {
        hardhat:
          hardhat && (hardhat.testFile || hardhat.code)
            ? { testFile: hardhat.testFile ?? (hardhat.code as string), setupFile: hardhat.setupFile ?? "" }
            : undefined,
        foundry:
          foundry && (foundry.testFile || foundry.code)
            ? { testFile: foundry.testFile ?? (foundry.code as string) }
            : undefined,
      },
      coverage: {
        functionsCount: coverageSrc.functionsCount ?? 0,
        testCasesCount: coverageSrc.testCasesCount ?? 0,
      },
    };
  };

  const handleGenerate = async () => {
    if (!contractCode.trim()) {
      setError("Please provide contract code to generate tests");
      return;
    }

    if (!contractName.trim()) {
      setError("Please provide contract name");
      return;
    }

    if (selectedFrameworks.length === 0) {
      setError("Please select at least one test framework");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const testResult = await onGenerate(contractCode, contractName, selectedFrameworks);
      if (!testResult?.success) {
        setError("Generation failed");
        return;
      }
      setResult(normalizeResult(testResult));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate tests");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (content: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileName);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleDownload = (content: string, fileName: string, extension: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    saveAs(blob, `${fileName}${extension}`);
  };

  const getLanguage = (fileName: string) => {
    if (fileName.includes('.sol')) return 'solidity';
    if (fileName.includes('.js')) return 'javascript';
    return 'text';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Test Generation</h2>
      {/* Contract Input */}
      <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Code2 className="h-5 w-5 text-neon-cyan" />
          Contract Information
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contract Name
              {contractName && (
                <span className="text-xs text-green-400 ml-2">
                  ✓ Auto-detected from code
                </span>
              )}
            </label>
            <input
              type="text"
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              placeholder="Contract name"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contract Code
            </label>
            <textarea
              value={contractCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="Paste your contract code"
              rows={12}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-transparent font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Framework Selection */}
      <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TestTube className="h-5 w-5 text-neon-cyan" />
          Test Framework Selection
        </h3>
        
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFrameworks.includes('hardhat')}
              onChange={() => handleFrameworkToggle('hardhat')}
              className="w-4 h-4 text-neon-cyan bg-gray-800 border-gray-600 rounded focus:ring-neon-cyan focus:ring-2"
            />
            <HardHat className="h-5 w-5 text-orange-500" />
            <span className="text-white">Hardhat (Chai/Ethers)</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFrameworks.includes('foundry')}
              onChange={() => handleFrameworkToggle('foundry')}
              className="w-4 h-4 text-neon-cyan bg-gray-800 border-gray-600 rounded focus:ring-neon-cyan focus:ring-2"
            />
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="text-white">Foundry (Forge)</span>
          </label>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !contractCode.trim() || selectedFrameworks.length === 0}
          className="bg-gradient-to-r from-neon-cyan to-neon-blue hover:from-neon-cyan/80 hover:to-neon-blue/80 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg border-2 border-neon-cyan shadow-lg hover:shadow-neon-cyan/25 transition-all duration-300 flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating Tests...
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Generate Tests
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Success Message */}
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-300">
              Tests generated successfully! {result.coverage.functionsCount} functions covered with {result.coverage.testCasesCount} test cases.
            </span>
          </div>

          {/* Hardhat Tests */}
          {result.tests.hardhat && (
            <div className="bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <HardHat className="h-5 w-5 text-orange-500" />
                  Hardhat Tests
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(result.tests.hardhat!.testFile, 'hardhat-test')}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                  >
                    {copiedFile === 'hardhat-test' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy
                  </button>
                  <button
                    onClick={() => handleDownload(result.tests.hardhat!.testFile, 'test', '.js')}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Test File</h4>
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <SyntaxHighlighter
                      language={getLanguage('test.js')}
                      style={tomorrow}
                      customStyle={{ margin: 0, background: 'transparent' }}
                      showLineNumbers
                    >
                      {result.tests.hardhat.testFile}
                    </SyntaxHighlighter>
                  </div>
                </div>

                {result.tests.hardhat.setupFile && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Setup File</h4>
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <SyntaxHighlighter
                        language={getLanguage('setup.js')}
                        style={tomorrow}
                        customStyle={{ margin: 0, background: 'transparent' }}
                        showLineNumbers
                      >
                        {result.tests.hardhat.setupFile}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Foundry Tests */}
          {result.tests.foundry && (
            <div className="bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Foundry Tests
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(result.tests.foundry!.testFile, 'foundry-test')}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                  >
                    {copiedFile === 'foundry-test' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy
                  </button>
                  <button
                    onClick={() => handleDownload(result.tests.foundry!.testFile, 'test', '.sol')}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <SyntaxHighlighter
                    language={getLanguage('test.sol')}
                    style={tomorrow}
                    customStyle={{ margin: 0, background: 'transparent' }}
                    showLineNumbers
                  >
                    {result.tests.foundry.testFile}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
