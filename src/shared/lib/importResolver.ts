/**
 * Import resolution service for Solidity files
 * Handles relative imports and auto-fetches standard libraries
 */

export interface ImportInfo {
  path: string;
  type: 'relative' | 'npm' | 'github' | 'unknown';
  resolved: boolean;
  content?: string;
  error?: string;
}

export interface ResolvedImports {
  resolved: ImportInfo[];
  missing: ImportInfo[];
  autoFetched: ImportInfo[];
}

/**
 * Resolve all imports in a set of files
 */
export async function resolveImports(
  files: Array<{ path: string; content: string }>
): Promise<ResolvedImports> {
  const allImports = new Map<string, ImportInfo>();
  const resolved: ImportInfo[] = [];
  const missing: ImportInfo[] = [];
  const autoFetched: ImportInfo[] = [];

  // Extract all imports from all files
  for (const file of files) {
    const imports = extractImports(file.content);
    for (const importPath of imports) {
      if (!allImports.has(importPath)) {
        allImports.set(importPath, {
          path: importPath,
          type: classifyImport(importPath),
          resolved: false
        });
      }
    }
  }

  // Resolve each import
  for (const [importPath, importInfo] of allImports) {
    try {
      const resolvedImport = await resolveSingleImport(importPath, importInfo.type, files);
      if (resolvedImport.resolved) {
        resolved.push(resolvedImport);
        if (resolvedImport.type === 'npm' || resolvedImport.type === 'github') {
          autoFetched.push(resolvedImport);
        }
      } else {
        missing.push(resolvedImport);
      }
    } catch (error) {
      missing.push({
        ...importInfo,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { resolved, missing, autoFetched };
}

/**
 * Extract import statements from Solidity code
 */
function extractImports(content: string): string[] {
  const imports: string[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Match various import patterns
    const patterns = [
      /import\s+["']([^"']+)["']/,                    // import "path"
      /import\s+["']([^"']+)["']\s+as\s+\w+/,        // import "path" as Name
      /import\s+\*\s+as\s+\w+\s+from\s+["']([^"']+)["']/, // import * as Name from "path"
      /import\s+{[^}]+}\s+from\s+["']([^"']+)["']/,  // import {A, B} from "path"
    ];
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        imports.push(match[1]);
        break;
      }
    }
  }
  
  return [...new Set(imports)]; // Remove duplicates
}

/**
 * Classify import type based on path
 */
function classifyImport(importPath: string): ImportInfo['type'] {
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return 'relative';
  }
  
  if (importPath.startsWith('@openzeppelin/') || 
      importPath.startsWith('@chainlink/') ||
      importPath.startsWith('@uniswap/') ||
      importPath.startsWith('hardhat/') ||
      importPath.startsWith('forge-std/')) {
    return 'npm';
  }
  
  if (importPath.includes('github.com/') || importPath.includes('raw.githubusercontent.com/')) {
    return 'github';
  }
  
  return 'unknown';
}

/**
 * Resolve a single import
 */
async function resolveSingleImport(
  importPath: string, 
  type: ImportInfo['type'],
  existingFiles: Array<{ path: string; content: string }>
): Promise<ImportInfo> {
  const baseInfo: ImportInfo = {
    path: importPath,
    type,
    resolved: false
  };

  try {
    switch (type) {
      case 'relative':
        return await resolveRelativeImport(importPath, existingFiles);
      
      case 'npm':
        return await resolveNpmImport(importPath);
      
      case 'github':
        return await resolveGithubImport(importPath);
      
      default:
        return {
          ...baseInfo,
          error: 'Unknown import type'
        };
    }
  } catch (error) {
    return {
      ...baseInfo,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Resolve relative imports within uploaded files
 */
async function resolveRelativeImport(
  importPath: string,
  existingFiles: Array<{ path: string; content: string }>
): Promise<ImportInfo> {
  // This is a simplified implementation
  // In a real scenario, you'd need to handle proper path resolution
  const resolvedFile = existingFiles.find(file => 
    file.path.endsWith(importPath) || 
    file.path.includes(importPath.replace('./', '').replace('../', ''))
  );

  if (resolvedFile) {
    return {
      path: importPath,
      type: 'relative',
      resolved: true,
      content: resolvedFile.content
    };
  }

  return {
    path: importPath,
    type: 'relative',
    resolved: false,
    error: 'File not found in uploaded files'
  };
}

/**
 * Resolve NPM package imports (OpenZeppelin, etc.)
 */
async function resolveNpmImport(importPath: string): Promise<ImportInfo> {
  try {
    // This would typically fetch from a CDN or NPM registry
    // For now, we'll simulate with common OpenZeppelin contracts
    const commonContracts = getCommonOpenZeppelinContracts();
    
    if (commonContracts[importPath]) {
      return {
        path: importPath,
        type: 'npm',
        resolved: true,
        content: commonContracts[importPath]
      };
    }

    return {
      path: importPath,
      type: 'npm',
      resolved: false,
      error: 'Contract not found in common libraries'
    };
  } catch {
    return {
      path: importPath,
      type: 'npm',
      resolved: false,
      error: 'Failed to fetch from NPM'
    };
  }
}

/**
 * Resolve GitHub imports
 */
async function resolveGithubImport(importPath: string): Promise<ImportInfo> {
  try {
    // This would fetch from GitHub's raw content API
    // For now, return as unresolved
    return {
      path: importPath,
      type: 'github',
      resolved: false,
      error: 'GitHub imports not yet implemented'
    };
  } catch {
    return {
      path: importPath,
      type: 'github',
      resolved: false,
      error: 'Failed to fetch from GitHub'
    };
  }
}

/**
 * Get common OpenZeppelin contracts (simplified versions)
 */
function getCommonOpenZeppelinContracts(): Record<string, string> {
  return {
    '@openzeppelin/contracts/access/Ownable.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract Ownable {
    address private _owner;
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    constructor() {
        _transferOwnership(msg.sender);
    }
    
    function owner() public view virtual returns (address) {
        return _owner;
    }
    
    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }
    
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }
    
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }
    
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}`,
    
    '@openzeppelin/contracts/security/ReentrancyGuard.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    
    constructor() {
        _status = _NOT_ENTERED;
    }
    
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}`,
    
    '@openzeppelin/contracts/security/Pausable.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/Context.sol";

abstract contract Pausable is Context {
    bool private _paused;
    
    event Paused(address account);
    event Unpaused(address account);
    
    constructor() {
        _paused = false;
    }
    
    function paused() public view virtual returns (bool) {
        return _paused;
    }
    
    modifier whenNotPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }
    
    modifier whenPaused() {
        require(paused(), "Pausable: not paused");
        _;
    }
    
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }
    
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}`
  };
}

/**
 * Build a dependency graph from resolved imports
 */
export function buildImportDependencyGraph(
  files: Array<{ path: string; content: string }>,
  resolvedImports: ResolvedImports
): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  
  // Initialize with files
  for (const file of files) {
    graph[file.path] = [];
  }
  
  // Add resolved imports
  for (const importInfo of resolvedImports.resolved) {
    if (importInfo.content) {
      graph[importInfo.path] = [];
    }
  }
  
  // Build dependencies
  for (const file of files) {
    const imports = extractImports(file.content);
    for (const importPath of imports) {
      const resolvedImport = resolvedImports.resolved.find(imp => imp.path === importPath);
      if (resolvedImport && resolvedImport.resolved) {
        graph[file.path].push(importPath);
      }
    }
  }
  
  return graph;
}
