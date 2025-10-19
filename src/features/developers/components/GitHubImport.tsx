"use client";

import { useState } from "react";
import { Github, Search, ExternalLink, AlertCircle, CheckCircle, Loader } from "lucide-react";

interface GitHubFile {
  path: string;
  content: string;
  size: number;
  url: string;
}

interface RepoInfo {
  name: string;
  owner: string;
  description?: string;
  language?: string;
  stars?: number;
  forks?: number;
}

interface GitHubImportProps {
  onFilesChange: (files: GitHubFile[]) => void;
  onSelectedFilesChange: (selectedFiles: GitHubFile[]) => void;
  onRepoInfoChange?: (repoInfo: RepoInfo) => void;
}

export default function GitHubImport({ onFilesChange, onSelectedFilesChange, onRepoInfoChange }: GitHubImportProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [path, setPath] = useState("");
  const [includeTests, setIncludeTests] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [fileExtensions, setFileExtensions] = useState<Set<string>>(new Set(['.sol', '.vy', '.rs', '.py', '.ts', '.js']));

  const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/,
      /github\.com\/([^\/]+)\/([^\/]+)(?:\/blob\/([^\/]+))?/,
      /github\.com\/([^\/]+)\/([^\/]+)(?:\/)?$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, '')
        };
      }
    }

    return null;
  };

  const fetchRepository = async () => {
    if (!repoUrl.trim()) {
      setError("Please enter a GitHub repository URL");
      return;
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setError("Invalid GitHub repository URL format");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFiles([]);
    setRepoInfo(null);

    try {
      const response = await fetch("/api/github/fetch-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoUrl,
          path: path.trim() || undefined,
          includeTests,
          maxFiles: 20,
          extensions: Array.from(fileExtensions)
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFiles(data.data.files);
        setRepoInfo(data.data.repoInfo);
        onFilesChange(data.data.files);
        if (onRepoInfoChange) {
          onRepoInfoChange(data.data.repoInfo);
        }
      } else {
        setError(data.error || "Failed to fetch repository");
      }
    } catch (error) {
      console.error("GitHub fetch error:", error);
      setError("Network error occurred while fetching repository");
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'sol':
        return '🔷'; // Solidity
      case 'vy':
        return '🐍'; // Vyper
      case 'rs':
        return '🦀'; // Rust
      case 'py':
        return '🐍'; // Python
      case 'ts':
      case 'js':
        return '📜'; // TypeScript/JavaScript
      default:
        return '📄';
    }
  };

  const openFileInGitHub = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const handleFileSelect = (filePath: string, isSelected: boolean) => {
    const newSelectedFiles = new Set(selectedFiles);
    if (isSelected) {
      newSelectedFiles.add(filePath);
    } else {
      newSelectedFiles.delete(filePath);
    }
    setSelectedFiles(newSelectedFiles);
    
    // Update parent component with selected files
    const selectedFilesList = files.filter(file => newSelectedFiles.has(file.path));
    onSelectedFilesChange(selectedFilesList);
  };

  const handleSelectAll = () => {
    const allPaths = files.map(file => file.path);
    setSelectedFiles(new Set(allPaths));
    onSelectedFilesChange(files);
  };

  const handleSelectNone = () => {
    setSelectedFiles(new Set());
    onSelectedFilesChange([]);
  };

  const availableExtensions = [
    { ext: '.sol', name: 'Solidity', icon: '🔷', description: 'Ethereum, Polygon, BSC' },
    { ext: '.vy', name: 'Vyper', icon: '🐍', description: 'Ethereum alternative' },
    { ext: '.rs', name: 'Rust', icon: '🦀', description: 'Solana, Near Protocol' },
    { ext: '.py', name: 'Python', icon: '🐍', description: 'Algorand, Tezos' },
    { ext: '.ts', name: 'TypeScript', icon: '📜', description: 'Near Protocol, Cosmos' },
    { ext: '.js', name: 'JavaScript', icon: '📜', description: 'Near Protocol, Cosmos' },
    { ext: '.go', name: 'Go', icon: '🐹', description: 'Cosmos, Tendermint' },
    { ext: '.move', name: 'Move', icon: '🚀', description: 'Aptos, Sui' },
    { ext: '.wasm', name: 'WebAssembly', icon: '⚡', description: 'Polkadot, Cosmos' },
    { ext: '.cairo', name: 'Cairo', icon: '🏛️', description: 'StarkNet' }
  ];

  const handleExtensionToggle = (extension: string) => {
    const newExtensions = new Set(fileExtensions);
    if (newExtensions.has(extension)) {
      newExtensions.delete(extension);
    } else {
      newExtensions.add(extension);
    }
    setFileExtensions(newExtensions);
  };

  const handleSelectAllExtensions = () => {
    setFileExtensions(new Set(availableExtensions.map(e => e.ext)));
  };

  const handleSelectNoneExtensions = () => {
    setFileExtensions(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Repository Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            GitHub Repository URL
          </label>
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full pl-10 pr-4 py-2 bg-black/60 border border-neon-cyan/30 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={fetchRepository}
              disabled={isLoading || !repoUrl.trim()}
              className="px-6 py-2 bg-gradient-to-r from-neon-cyan to-neon-blue hover:from-neon-cyan/80 hover:to-neon-blue/80 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-neon-cyan/20 flex items-center space-x-2 border-2 border-neon-cyan/50 hover:border-neon-cyan shadow-lg"
            >
              {isLoading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>{isLoading ? "Fetching..." : "Fetch"}</span>
            </button>
          </div>
        </div>

        {/* Optional Path */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Subdirectory Path (Optional)
          </label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="contracts/ or src/contracts/"
            className="w-full px-4 py-2 bg-black/60 border border-neon-cyan/30 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-neon-cyan transition-all duration-300"
            disabled={isLoading}
          />
        </div>

        {/* Options */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeTests}
              onChange={(e) => setIncludeTests(e.target.checked)}
              className="w-4 h-4 text-neon-cyan bg-black/60 border-neon-cyan/30 rounded focus:ring-neon-cyan focus:ring-2"
              disabled={isLoading}
            />
            <span className="text-sm text-gray-300">Include test files</span>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* File Extension Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">File Types to Search</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleSelectAllExtensions}
              className="px-3 py-1 text-xs bg-neon-cyan/20 text-neon-cyan rounded hover:bg-neon-cyan/30 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleSelectNoneExtensions}
              className="px-3 py-1 text-xs bg-gray-600/20 text-gray-300 rounded hover:bg-gray-600/30 transition-colors"
            >
              Select None
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {availableExtensions.map((ext) => {
            const isSelected = fileExtensions.has(ext.ext);
            return (
              <button
                key={ext.ext}
                onClick={() => handleExtensionToggle(ext.ext)}
                className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                  isSelected
                    ? 'border-neon-cyan/60 bg-neon-cyan/10 text-white'
                    : 'border-gray-600/50 bg-black/20 text-gray-300 hover:border-neon-cyan/40 hover:bg-neon-cyan/5'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{ext.icon}</span>
                  <span className="font-medium text-sm">{ext.name}</span>
                </div>
                <div className="text-xs text-gray-400">{ext.description}</div>
                <div className="text-xs font-mono text-gray-500 mt-1">{ext.ext}</div>
              </button>
            );
          })}
        </div>
        
        <div className="text-sm text-gray-400">
          Selected: {fileExtensions.size} file type{fileExtensions.size !== 1 ? 's' : ''} • 
          {fileExtensions.size === 0 ? ' No files will be found' : ` Will search for: ${Array.from(fileExtensions).join(', ')}`}
        </div>
      </div>

      {/* Repository Info */}
      {repoInfo && (
        <div className="p-4 bg-black/20 border border-neon-cyan/20 rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {repoInfo.owner}/{repoInfo.name}
              </h3>
              {repoInfo.description && (
                <p className="text-sm text-gray-300 mt-1">{repoInfo.description}</p>
              )}
            </div>
            <a
              href={`https://github.com/${repoInfo.owner}/${repoInfo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-neon-cyan transition-colors duration-200"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            {repoInfo.language && (
              <span>Language: {repoInfo.language}</span>
            )}
            {repoInfo.stars !== undefined && (
              <span>⭐ {repoInfo.stars.toLocaleString()}</span>
            )}
            {repoInfo.forks !== undefined && (
              <span>🍴 {repoInfo.forks.toLocaleString()}</span>
            )}
          </div>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Smart Contract Files ({files.length})
            </h3>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                Total: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-xs bg-neon-cyan/20 text-neon-cyan rounded hover:bg-neon-cyan/30 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={handleSelectNone}
                  className="px-3 py-1 text-xs bg-gray-600/20 text-gray-300 rounded hover:bg-gray-600/30 transition-colors"
                >
                  Select None
                </button>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file, index) => {
              const isSelected = selectedFiles.has(file.path);
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-3 bg-black/40 border rounded-lg transition-all duration-300 ${
                    isSelected 
                      ? 'border-neon-cyan/60 bg-neon-cyan/10' 
                      : 'border-neon-cyan/20 hover:border-neon-cyan/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleFileSelect(file.path, e.target.checked)}
                    className="w-4 h-4 text-neon-cyan bg-black border-neon-cyan/30 rounded focus:ring-neon-cyan focus:ring-2"
                  />
                  
                  <div className="text-2xl">{getFileIcon(file.path)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-white truncate">
                        {file.path.split('/').pop()}
                      </p>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{file.content.split('\n').length} lines</span>
                      <span className="truncate">{file.path}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => openFileInGitHub(file.url)}
                    className="p-1 text-gray-400 hover:text-neon-cyan transition-colors duration-200"
                    title="Open in GitHub"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* File Stats */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-black/20 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-neon-cyan">{files.length}</div>
            <div className="text-xs text-gray-400">Total Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{selectedFiles.size}</div>
            <div className="text-xs text-gray-400">Selected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neon-blue">
              {files.reduce((sum, f) => sum + f.content.split('\n').length, 0)}
            </div>
            <div className="text-xs text-gray-400">Lines</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neon-purple">
              {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
            </div>
            <div className="text-xs text-gray-400">Size</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {files.filter(f => f.path.endsWith('.sol')).length}
            </div>
            <div className="text-xs text-gray-400">Solidity</div>
          </div>
        </div>
      )}
    </div>
  );
}
