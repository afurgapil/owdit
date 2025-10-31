/**
 * Tests for src/instrumentation-client.ts
 */

const ORIGINAL_ENV = { ...process.env };

// Mock @sentry/nextjs to observe init and re-export
jest.mock('@sentry/nextjs', () => {
  return {
    init: jest.fn(),
    replayIntegration: jest.fn(() => ({ name: 'replay' })),
    captureRouterTransitionStart: jest.fn(() => 'captureRouterTransitionStart-called'),
  };
});

describe('instrumentation-client.ts', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('does NOT initialize Sentry when NODE_ENV is not production', async () => {
    process.env.NODE_ENV = 'test';
    const sentry = await import('@sentry/nextjs');
    await import('../instrumentation-client');
    expect(sentry.init).not.toHaveBeenCalled();
  });

  test('initializes Sentry when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    const sentry = await import('@sentry/nextjs');
    await import('../instrumentation-client');
    expect(sentry.init).toHaveBeenCalledTimes(1);
    const args = (sentry.init as jest.Mock).mock.calls[0][0];
    expect(args).toHaveProperty('dsn');
    expect(args).toHaveProperty('integrations');
  });

  test('onRouterTransitionStart re-exports Sentry.captureRouterTransitionStart', async () => {
    const mod = await import('../instrumentation-client');
    expect(typeof mod.onRouterTransitionStart).toBe('function');
    // @ts-expect-error allow any args
    const result = mod.onRouterTransitionStart();
    expect(result).toBe('captureRouterTransitionStart-called');
  });
});


