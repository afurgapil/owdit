import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Request schema
const fetchRepoRequestSchema = z.object({
  repoUrl: z.string().url("Invalid GitHub repository URL"),
  path: z.string().default(""),
  includeTests: z.boolean().default(false),
  maxFiles: z.number().min(1).max(50).default(20),
  extensions: z.array(z.string()).optional().default(['.sol', '.vy', '.rs', '.py', '.ts', '.js'])
});

// Response schema
const fetchRepoResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      size: z.number(),
      url: z.string()
    })),
    totalFiles: z.number(),
    repoInfo: z.object({
      name: z.string(),
      owner: z.string(),
      description: z.string().nullable().optional(),
      language: z.string().nullable().optional(),
      stars: z.number().optional(),
      forks: z.number().optional()
    })
  }).optional(),
  error: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = fetchRepoRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        fetchRepoResponseSchema.parse({
          success: false,
          error: parsed.error.message
        }),
        { status: 400 }
      );
    }

    const { repoUrl, path, includeTests, maxFiles, extensions } = parsed.data;


    // Parse GitHub URL
    const repoInfo = parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      return NextResponse.json(
        fetchRepoResponseSchema.parse({
          success: false,
          error: "Invalid GitHub repository URL format"
        }),
        { status: 400 }
      );
    }

    // Fetch repository information (optional - don't fail if we can't get it)
    let repoData = null;
    try {
      repoData = await fetchRepositoryInfo(repoInfo.owner, repoInfo.repo);
    } catch (error) {
      // Continue without repository info
    }

    // Fetch smart contract files
    const smartContractFiles = await fetchSolidityFiles(
      repoInfo.owner,
      repoInfo.repo,
      path,
      includeTests,
      maxFiles,
      extensions
    );

      if (smartContractFiles.length === 0) {
        return NextResponse.json(
          fetchRepoResponseSchema.parse({
            success: false,
            error: "No smart contract files found in the repository"
          }),
          { status: 404 }
        );
      }


    return NextResponse.json(
      fetchRepoResponseSchema.parse({
        success: true,
        data: {
          files: smartContractFiles,
          totalFiles: smartContractFiles.length,
          repoInfo: {
            name: repoData?.name || repoInfo.repo,
            owner: repoData?.owner?.login || repoInfo.owner,
            description: repoData?.description || undefined,
            language: repoData?.language || undefined,
            stars: repoData?.stargazers_count,
            forks: repoData?.forks_count
          }
        }
      }),
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      fetchRepoResponseSchema.parse({
        success: false,
        error: "Failed to fetch repository from GitHub"
      }),
      { status: 500 }
    );
  }
}

interface GitHubRepoInfo {
  owner: string;
  repo: string;
}

interface RepositoryData {
  name: string;
  owner: {
    login: string;
  };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
}

interface SoliditFile {
  path: string;
  content: string;
  size: number;
  url: string;
}

function parseGitHubUrl(url: string): GitHubRepoInfo | null {
  // Support various GitHub URL formats
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
        repo: match[2].replace(/\.git$/, '') // Remove .git suffix if present
      };
    }
  }

  return null;
}

async function fetchRepositoryInfo(owner: string, repo: string): Promise<RepositoryData | null> {
  try {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'OWDIT-Contract-Analyzer'
    };
    
    // Add GitHub token if available
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Repository not found or private
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

async function fetchSolidityFiles(
  owner: string,
  repo: string,
  path: string,
  includeTests: boolean,
  maxFiles: number,
  extensions: string[] = ['.sol', '.vy', '.rs', '.py', '.ts', '.js']
): Promise<SoliditFile[]> {
  try {
    // Use GitHub's contents API instead of search API (no auth required for public repos)
    const files = await fetchDirectoryContents(owner, repo, path, extensions);
    
    // Files are already filtered by fetchDirectoryContents, so we can use them directly
    const smartContractFiles = files;

    // Apply test file filter
    const filteredFiles = includeTests 
      ? smartContractFiles 
      : smartContractFiles.filter(file => 
          !file.path.toLowerCase().includes('test') &&
          !file.path.toLowerCase().includes('spec') &&
          !file.path.toLowerCase().includes('__tests__')
        );

    // Limit to maxFiles
    return filteredFiles.slice(0, maxFiles);
  } catch (error) {
    return [];
  }
}

// Removed buildSearchQuery function as we're using contents API instead

async function fetchFileContent(fileUrl: string): Promise<string | null> {
  try {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'OWDIT-Contract-Analyzer'
    };
    
    // Add GitHub token if available
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const response = await fetch(fileUrl, { headers });

    if (!response.ok) {
      return null;
    }

    const fileData = await response.json();
    
    // Decode base64 content
    if (fileData.content) {
      return Buffer.from(fileData.content, 'base64').toString('utf-8');
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Alternative method using GitHub's contents API (for specific paths)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');
  const path = searchParams.get('path') || '';

  if (!owner || !repo) {
    return NextResponse.json(
      fetchRepoResponseSchema.parse({
        success: false,
        error: "Owner and repo parameters are required"
      }),
      { status: 400 }
    );
  }

  try {

    const files = await fetchDirectoryContents(owner, repo, path);
    
    return NextResponse.json(
      fetchRepoResponseSchema.parse({
        success: true,
        data: {
          files,
          totalFiles: files.length,
          repoInfo: {
            name: repo,
            owner,
            description: undefined,
            language: undefined,
            stars: undefined,
            forks: undefined
          }
        }
      }),
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      fetchRepoResponseSchema.parse({
        success: false,
        error: "Failed to fetch directory contents from GitHub"
      }),
      { status: 500 }
    );
  }
}

async function fetchDirectoryContents(owner: string, repo: string, path: string, extensions: string[] = ['.sol', '.vy', '.rs', '.py', '.ts', '.js']): Promise<SoliditFile[]> {
  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'OWDIT-Contract-Analyzer'
    };
    
    // Add GitHub token if available
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        // Try root directory if path not found
        if (path !== '') {
          return await fetchDirectoryContents(owner, repo, '');
        }
        return [];
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const contents = await response.json();
    const files: SoliditFile[] = [];

    // Process each item in the directory
    for (const item of contents) {
      const isSmartContractFile = extensions.some(extension => 
        item.name.toLowerCase().endsWith(extension.toLowerCase())
      );
      
      if (item.type === 'file' && isSmartContractFile) {
        try {
          const fileContent = await fetchFileContent(item.url);
          if (fileContent) {
            files.push({
              path: item.path,
              content: fileContent,
              size: item.size,
              url: item.html_url
            });
          }
        } catch (error) {
        }
      } else if (item.type === 'dir') {
        // Skip common non-contract directories
        const dirName = item.name.toLowerCase();
        if (dirName.includes('test') || dirName.includes('spec') || 
            dirName.includes('node_modules') || dirName.includes('.git') ||
            dirName.includes('docs') || dirName.includes('scripts')) {
          continue;
        }
        
        // Recursively fetch subdirectory contents
        const subFiles = await fetchDirectoryContents(owner, repo, item.path, extensions);
        files.push(...subFiles);
      }
    }

    return files;
  } catch (error) {
    return [];
  }
}
