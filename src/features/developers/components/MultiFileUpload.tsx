"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle } from "lucide-react";

interface FileWithPreview {
  file: File;
  id: string;
  content: string;
  size: number;
  path: string;
}

interface MultiFileUploadProps {
  onFilesChange: (files: FileWithPreview[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

export default function MultiFileUpload({
  onFilesChange,
  maxFiles = 10,
  maxSize = 5,
  acceptedTypes = ['.sol', '.vy', '.rs', '.py', '.ts', '.js']
}: MultiFileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File ${file.name} exceeds ${maxSize}MB limit`;
    }

    // Check file type
    const hasValidExtension = acceptedTypes.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    if (!hasValidExtension) {
      return `File ${file.name} has unsupported type. Allowed: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const addFiles = async (newFiles: FileList) => {
    const newFileList: FileWithPreview[] = [];
    const newErrors: string[] = [];

    // Check total file count
    if (files.length + newFiles.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
      setErrors(newErrors);
      return;
    }

    // Check total size
    const currentSize = files.reduce((sum, f) => sum + f.size, 0);
    const newSize = Array.from(newFiles).reduce((sum, f) => sum + f.size, 0);
    if (currentSize + newSize > maxSize * 1024 * 1024) {
      newErrors.push(`Total file size exceeds ${maxSize}MB limit`);
      setErrors(newErrors);
      return;
    }

    for (const file of Array.from(newFiles)) {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
        continue;
      }

      try {
        const content = await readFileContent(file);
        const fileWithPreview: FileWithPreview = {
          file,
          id: Math.random().toString(36).substr(2, 9),
          content,
          size: file.size,
          path: file.webkitRelativePath || file.name
        };
        newFileList.push(fileWithPreview);
      } catch (error) {
        newErrors.push(`Failed to read file ${file.name}`);
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
    }

    if (newFileList.length > 0) {
      const updatedFiles = [...files, ...newFileList];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);
      setErrors([]);
    }
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [files]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
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
        return '🔷'; // Solidity - Ethereum, Polygon, BSC
      case 'vy':
        return '🐍'; // Vyper - Ethereum alternative
      case 'rs':
        return '🦀'; // Rust - Solana, Near Protocol
      case 'py':
        return '🐍'; // Python - Algorand, Tezos
      case 'ts':
      case 'js':
        return '📜'; // TypeScript/JavaScript - Near Protocol, Cosmos
      default:
        return '📄';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-neon-cyan bg-neon-cyan/10'
            : 'border-gray-600 hover:border-neon-cyan/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        
        <div className="space-y-4">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div>
            <p className="text-lg font-medium text-white">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Upload up to {maxFiles} files, max {maxSize}MB total
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supported: {acceptedTypes.join(', ')}
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-neon-cyan/20"
          >
            Choose Files
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Selected Files ({files.length}/{maxFiles})
            </h3>
            <div className="text-sm text-gray-400">
              Total: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
            </div>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center space-x-3 p-3 bg-black/40 border border-neon-cyan/20 rounded-lg hover:border-neon-cyan/40 transition-all duration-300"
              >
                <div className="text-2xl">{getFileIcon(file.file.name)}</div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-white truncate">
                      {file.file.name}
                    </p>
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{file.content.split('\n').length} lines</span>
                    <span>{file.path}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Stats */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-black/20 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-neon-cyan">{files.length}</div>
            <div className="text-xs text-gray-400">Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neon-blue">
              {files.reduce((sum, f) => sum + f.content.split('\n').length, 0)}
            </div>
            <div className="text-xs text-gray-400">Lines</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {(files.reduce((sum, f) => sum + f.content.split('\n').length, 0) / files.length).toFixed(0)}
            </div>
            <div className="text-xs text-gray-400">Avg Lines</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
            </div>
            <div className="text-xs text-gray-400">Total Size</div>
          </div>
        </div>
      )}
    </div>
  );
}
