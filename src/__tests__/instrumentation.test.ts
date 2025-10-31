/**
 * Tests for src/instrumentation.ts
 */

import type { Jest } from '@jest/environment';

// We will mutate env vars; keep originals to restore between tests
const ORIGINAL_ENV = { ...process.env };

// Mock @sentry/nextjs to verify re-exports
jest.mock('@sentry/nextjs', () => {
  return {
    captureRequestError: jest.fn(() => 'captureRequestError-called'),
  };
});

// Create side-effectful mocks for sentry server/edge configs to detect dynamic import execution
jest.mock('../../sentry.server.config', () => {
  // set a global flag when this module is imported
  (global as any).__sentry_server_config_imported =
    ((global as any).__sentry_server_config_imported || 0) + 1;
  return {};
}, { virtual: true });

jest.mock('../../sentry.edge.config', () => {
  (global as any).__sentry_edge_config_imported =
    ((global as any).__sentry_edge_config_imported || 0) + 1;
  return {};
}, { virtual: true });

describe('instrumentation.ts', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete (global as any).__sentry_server_config_imported;
    delete (global as any).__sentry_edge_config_imported;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('register() dynamically imports sentry.server.config for nodejs runtime', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    const mod = await import('../instrumentation');
    await mod.register();
    expect((global as any).__sentry_server_config_imported).toBe(1);
    expect((global as any).__sentry_edge_config_imported).toBeUndefined();
  });

  test('register() dynamically imports sentry.edge.config for edge runtime', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    const mod = await import('../instrumentation');
    await mod.register();
    expect((global as any).__sentry_edge_config_imported).toBe(1);
    expect((global as any).__sentry_server_config_imported).toBeUndefined();
  });

  test('onRequestError re-exports Sentry.captureRequestError', async () => {
    const mod = await import('../instrumentation');
    expect(typeof mod.onRequestError).toBe('function');
    // call to ensure it points to the mocked implementation
    // @ts-expect-error allow any args
    const result = mod.onRequestError();
    expect(result).toBe('captureRequestError-called');
  });
});


