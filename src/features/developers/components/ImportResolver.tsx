"use client";

import React, { useRef, useState } from "react";
import { AlertTriangle, CheckCircle, X, Download } from "lucide-react";

interface ImportInfo {
  path: string;
  type: 'relative' | 'npm' | 'github' | 'unknown';
  resolved: boolean;
  content?: string;
  error?: string;
}

interface ResolvedImports {
  resolved: ImportInfo[];
  missing: ImportInfo[];
  autoFetched: ImportInfo[];
}

interface ImportResolverProps {
  resolvedImports: ResolvedImports | null;
  onResolveImport: (importPath: string, content: string) => void;
  onIgnoreImport: (importPath: string) => void;
}

export default function ImportResolver({ 
  resolvedImports, 
  onResolveImport, 
  onIgnoreImport 
}: ImportResolverProps) {
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  if (!resolvedImports) {
    return null;
  }

  const { resolved, missing, autoFetched } = resolvedImports;

  const handleFileUpload = async (importPath: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFiles(prev => new Set(prev).add(importPath));

    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });

      onResolveImport(importPath, content);
    } catch (error) {
      console.error('Failed to read file:', error);
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(importPath);
        return newSet;
      });
    }
  };

  const handleIgnoreImport = (importPath: string) => {
    onIgnoreImport(importPath);
  };

  const getImportTypeIcon = (type: ImportInfo['type']) => {
    switch (type) {
      case 'npm':
        return '📦';
      case 'github':
        return '🐙';
      case 'relative':
        return '📁';
      default:
        return '❓';
    }
  };


  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Import Resolution</h2>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-black/20 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{resolved.length}</div>
          <div className="text-xs text-gray-400">Resolved</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{missing.length}</div>
          <div className="text-xs text-gray-400">Missing</div>
        </div>
        {autoFetched.length > 0 && (
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{autoFetched.length}</div>
            <div className="text-xs text-gray-400">Auto fetched</div>
        </div>
        )}
      </div>

      {/* Resolved Imports */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            Resolved Imports ({resolved.length})
          </h3>
          <div className="space-y-2">
            {resolved.map((importInfo, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg"
              >
                <div className="text-xl">⬇️</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-white truncate">
                      {importInfo.path}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400`}>
                      {importInfo.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {importInfo.content ? `${importInfo.content.length} characters` : 'Content available'}
                  </p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-fetched Imports */}
      {autoFetched.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Download className="h-5 w-5 text-blue-400 mr-2" />
            Auto-fetched Libraries ({autoFetched.length})
          </h3>
          <div className="space-y-2">
            {autoFetched.map((importInfo, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg"
              >
                <div className="text-xl">{getImportTypeIcon(importInfo.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-white truncate">
                      {importInfo.path}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400`}>
                      {importInfo.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Automatically fetched from {importInfo.type === 'npm' ? 'NPM' : 'GitHub'}
                  </p>
                </div>
                <CheckCircle className="h-4 w-4 text-blue-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Imports */}
      {missing.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            Missing Imports ({missing.length})
          </h3>
          <div className="space-y-2">
            {missing.map((importInfo, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg"
              >
                <div className="text-xl">{getImportTypeIcon(importInfo.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-white truncate">
                      {importInfo.path}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400`}>
                      {importInfo.type.toUpperCase()}
                    </span>
                  </div>
                  {importInfo.error && (
                    <p className="text-xs text-red-400">{importInfo.error}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {importInfo.type === 'relative' && (
                    <>
                      <input
                        ref={(el) => {
                          fileInputsRef.current[importInfo.path] = el;
                        }}
                        type="file"
                        accept=".sol,.vy,.rs,.py,.ts,.js"
                        onChange={(e) => handleFileUpload(importInfo.path, e)}
                        className="hidden"
                        disabled={uploadingFiles.has(importInfo.path)}
                      />
                      <button
                        onClick={() => fileInputsRef.current[importInfo.path]?.click()}
                        className="px-2 py-1 text-sm border border-neon-cyan/50 text-neon-cyan rounded hover:bg-neon-cyan/10"
                        disabled={uploadingFiles.has(importInfo.path)}
                      >
                        {uploadingFiles.has(importInfo.path) ? "Uploading..." : "Upload"}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleIgnoreImport(importInfo.path)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors duration-200"
                    title="Ignore this import"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Ignore</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      {missing.length > 0 && (
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">How to resolve missing imports:</h4>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• <strong>Relative imports:</strong> Use the button to add the missing file</li>
            <li>• <strong>NPM packages:</strong> These should be fetched automatically. If not, the package may not be available</li>
            <li>• <strong>GitHub imports:</strong> Currently not supported. Consider downloading and providing the file</li>
            <li>• <strong>Unknown imports:</strong> Add the file or skip if not needed for analysis</li>
          </ul>
        </div>
      )}
    </div>
  );
}
