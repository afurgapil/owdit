import { POST, GET } from "../route";

function buildPost(body: any): any { return { json: async () => body } as any; }

describe("github/fetch-repo", () => {
  const base = "https://api.github.com";

  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.GITHUB_TOKEN;
  });

  test("POST 400 invalid body", async () => {
    const res = (await POST(buildPost({}))) as any;
    expect(res.status).toBe(400);
  });

  test("POST 400 invalid URL format", async () => {
    const res = (await POST(buildPost({ repoUrl: "not-a-url" }))) as any;
    expect(res.status).toBe(400);
  });

  test("POST 404 when no contract files found", async () => {
    const orig = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] } as any);
    const res = (await POST(buildPost({ repoUrl: "https://github.com/o/a", path: "", includeTests: false, maxFiles: 5 }))) as any;
    expect(res.status).toBe(404);
    global.fetch = orig as any;
  });

  test("POST 200 returns files and repoInfo; token header branch exercised", async () => {
    process.env.GITHUB_TOKEN = "t";
    const dirResp = [
      { type: 'file', name: 'A.sol', path: 'A.sol', size: 10, url: `${base}/repos/o/a/contents/A.sol`, html_url: 'https://github.com/o/a/A.sol' },
      { type: 'dir', name: 'test', path: 'test' },
    ];
    const fileContentResp = { content: Buffer.from("contract A{}", 'utf-8').toString('base64') };
    const repoInfoResp = { name: 'a', owner: { login: 'o' }, description: null, language: null, stargazers_count: 1, forks_count: 2 };

    const orig = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/contents/A.sol')) return Promise.resolve({ ok: true, json: async () => fileContentResp } as any);
      if (String(url).includes('/repos/o/a/contents/')) return Promise.resolve({ ok: true, json: async () => dirResp } as any);
      if (String(url).includes('/repos/o/a')) return Promise.resolve({ ok: true, json: async () => repoInfoResp } as any);
      return Promise.resolve({ ok: true, json: async () => ({}) } as any);
    });

    const res = (await POST(buildPost({ repoUrl: "https://github.com/o/a", path: "", includeTests: false, maxFiles: 5 }))) as any;
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.files.length).toBe(1);
    expect(body.data.repoInfo.owner).toBe('o');
    global.fetch = orig as any;
  });

  test("GET 400 when missing owner/repo", async () => {
    const res = (await GET({ url: "http://local/api/github/fetch-repo" } as any)) as any;
    expect(res.status).toBe(400);
  });

  test("GET 200 with directory 404 fallback to root", async () => {
    const orig = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/contents/src')) { return Promise.resolve({ ok: false, status: 404 } as any); }
      if (String(url).includes('/contents/')) {
        return Promise.resolve({ ok: true, json: async () => [] } as any);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as any);
    });
    const res = (await GET({ url: "http://local/api/github/fetch-repo?owner=o&repo=a&path=src" } as any)) as any;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.totalFiles).toBe(0);
    global.fetch = orig as any;
  });

  test("fetchDirectoryContents skips docs/scripts and handles file without content", async () => {
    const orig = global.fetch;
    const dirResp = [
      { type: 'dir', name: 'docs', path: 'docs' },
      { type: 'dir', name: 'scripts', path: 'scripts' },
      { type: 'file', name: 'B.sol', path: 'B.sol', size: 10, url: `${base}/repos/o/a/contents/B.sol`, html_url: 'https://github.com/o/a/B.sol' },
    ];
    const fileContentResp = { }; // missing content
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/contents/')) return Promise.resolve({ ok: true, json: async () => dirResp } as any);
      if (String(url).includes('/B.sol')) return Promise.resolve({ ok: true, json: async () => fileContentResp } as any);
      return Promise.resolve({ ok: true, json: async () => ({}) } as any);
    });
    const res = (await GET({ url: "http://local/api/github/fetch-repo?owner=o&repo=a&path=" } as any)) as any;
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalFiles).toBe(0);
    global.fetch = orig as any;
  });
});

/**
 * Tests for src/app/api/github/fetch-repo/route.ts
 */

// Shim NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: (init && init.status) || 200,
      async json() { return body; },
    }),
  },
}), { virtual: true });

const buildPOST = (body: any) => ({ json: async () => body }) as any;
const buildGET = (url: string) => ({ url }) as any;
const loadRoute = async () => { let m:any; jest.isolateModules(()=>{ m = require('../route'); }); return m; };

describe('github/fetch-repo route', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    global.fetch = jest.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch as any;
  });

  test('POST 400 on invalid body', async () => {
    const mod = await loadRoute();
    const res = await mod.POST(buildPOST({}));
    expect(res.status).toBe(400);
  });

  test('POST 400 on invalid github url format', async () => {
    const mod = await loadRoute();
    const res = await mod.POST(buildPOST({ repoUrl: 'https://example.com/notgithub', path: '', includeTests: false, maxFiles: 5 }));
    expect(res.status).toBe(400);
  });

  test('POST 404 when no smart contract files found', async () => {
    const mod = await loadRoute();
    // Mock directory listing to empty
    (global.fetch as unknown as jest.Mock).mockResolvedValue({ ok: true, json: async () => [] });
    const res = await mod.POST(buildPOST({ repoUrl: 'https://github.com/owner/repo', path: '', includeTests: false, maxFiles: 5 }));
    expect(res.status).toBe(404);
  });

  test('POST 200 returns files and repoInfo', async () => {
    const mod = await loadRoute();
    // First call: repo info (ok but not critical)
    // Second call: contents API listing returning one file
    // Third call: file content API
    (global.fetch as unknown as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'repo', owner: { login: 'owner' }, description: null, language: null, stargazers_count: 1, forks_count: 2 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ([{ type: 'file', name: 'A.sol', path: 'A.sol', size: 10, url: 'fileApi', html_url: 'html' }]) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: Buffer.from('contract A{}').toString('base64') }) });

    const res = await mod.POST(buildPOST({ repoUrl: 'https://github.com/owner/repo', path: '', includeTests: false, maxFiles: 5 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.files.length).toBe(1);
    expect(json.data.repoInfo.name).toBe('repo');
  });

  test('GET 200 returns directory files', async () => {
    const mod = await loadRoute();
    (global.fetch as unknown as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ([{ type: 'file', name: 'B.sol', path: 'contracts/B.sol', size: 1, url: 'fileApi', html_url: 'html' }]) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: Buffer.from('contract B{}').toString('base64') }) });

    const res = await mod.GET(buildGET('http://x/api?owner=owner&repo=repo&path=contracts'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.files[0].path).toBe('contracts/B.sol');
  });
});


