import { logger, genRequestId } from "../logger";

describe("Logger", () => {
  // Save original console methods
  const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  // Save original NODE_ENV
  const originalEnv = process.env.NODE_ENV;

  // Mock console methods
  let mockDebug: jest.SpyInstance;
  let mockInfo: jest.SpyInstance;
  let mockWarn: jest.SpyInstance;
  let mockError: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks before each test
    mockDebug = jest.spyOn(console, "debug").mockImplementation();
    mockInfo = jest.spyOn(console, "info").mockImplementation();
    mockWarn = jest.spyOn(console, "warn").mockImplementation();
    mockError = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    mockDebug.mockRestore();
    mockInfo.mockRestore();
    mockWarn.mockRestore();
    mockError.mockRestore();

    // Restore NODE_ENV
    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalEnv,
      writable: true,
      configurable: true,
    });
  });

  afterAll(() => {
    // Final restoration
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe("logger.debug", () => {
    it("should call console.debug in non-production", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
        configurable: true,
      });
      logger.debug("test message");
      expect(mockDebug).toHaveBeenCalledTimes(1);
    });

    it("should NOT call console.debug in production", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });
      logger.debug("test message");
      expect(mockDebug).not.toHaveBeenCalled();
    });

    it("should format message with timestamp", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
        configurable: true,
      });
      logger.debug("test message");
      expect(mockDebug).toHaveBeenCalled();
      const call = mockDebug.mock.calls[0][0];
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(call).toContain("DEBUG");
      expect(call).toContain("test message");
    });

    it("should include metadata in message", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
        configurable: true,
      });
      logger.debug("test", { key: "value" });
      const call = mockDebug.mock.calls[0][0];
      expect(call).toContain("key=value");
    });
  });

  describe("logger.info", () => {
    it("should call console.info", () => {
      logger.info("test message");
      expect(mockInfo).toHaveBeenCalledTimes(1);
    });

    it("should format message with timestamp", () => {
      logger.info("test message");
      const call = mockInfo.mock.calls[0][0];
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(call).toContain("INFO");
      expect(call).toContain("test message");
    });

    it("should include requestId when provided", () => {
      logger.info("test", { requestId: "req-123" });
      const call = mockInfo.mock.calls[0][0];
      expect(call).toContain("rid=req-123");
    });

    it("should include context when provided", () => {
      logger.info("test", { context: "TestContext" });
      const call = mockInfo.mock.calls[0][0];
      expect(call).toContain("INFO:TestContext");
    });

    it("should include both context and requestId", () => {
      logger.info("test", { context: "API", requestId: "req-456" });
      const call = mockInfo.mock.calls[0][0];
      expect(call).toContain("INFO:API");
      expect(call).toContain("rid=req-456");
    });

    it("should handle complex metadata", () => {
      logger.info("test", { foo: "bar", num: 42, bool: true });
      const call = mockInfo.mock.calls[0][0];
      expect(call).toContain("foo=bar");
      expect(call).toContain("num=42");
      expect(call).toContain("bool=true");
    });
  });

  describe("logger.warn", () => {
    it("should call console.warn", () => {
      logger.warn("warning message");
      expect(mockWarn).toHaveBeenCalledTimes(1);
    });

    it("should format message with WARN level", () => {
      logger.warn("warning");
      const call = mockWarn.mock.calls[0][0];
      expect(call).toContain("WARN");
      expect(call).toContain("warning");
    });

    it("should include metadata", () => {
      logger.warn("warning", { reason: "test" });
      const call = mockWarn.mock.calls[0][0];
      expect(call).toContain("reason=test");
    });
  });

  describe("logger.error", () => {
    it("should call console.error", () => {
      logger.error("error message");
      expect(mockError).toHaveBeenCalledTimes(1);
    });

    it("should format message with ERROR level", () => {
      logger.error("error");
      const call = mockError.mock.calls[0][0];
      expect(call).toContain("ERROR");
      expect(call).toContain("error");
    });

    it("should handle Error object in metadata", () => {
      const error = new Error("Test error");
      logger.error("Something failed", { error });
      const call = mockError.mock.calls[0][0];
      expect(call).toContain("errorMessage=Test error");
    });

    it("should log error stack trace", () => {
      const error = new Error("Test error");
      logger.error("Something failed", { error });
      expect(mockError).toHaveBeenCalledTimes(2); // Once for message, once for stack
      const stackCall = mockError.mock.calls[1][0];
      expect(stackCall).toContain("Error: Test error");
    });

    it("should handle non-Error objects", () => {
      logger.error("Failed", { error: "string error" });
      const call = mockError.mock.calls[0][0];
      expect(call).toContain("errorMessage=string error");
    });

    it("should not duplicate error in metadata", () => {
      const error = new Error("Test");
      logger.error("Failed", { error, other: "data" });
      const call = mockError.mock.calls[0][0];
      expect(call).not.toContain("error=");
      expect(call).toContain("errorMessage=Test");
      expect(call).toContain("other=data");
    });
  });

  describe("logger.with", () => {
    it("should create logger with context", () => {
      const contextLogger = logger.with("TestContext");
      contextLogger.info("test message");
      const call = mockInfo.mock.calls[0][0];
      expect(call).toContain("INFO:TestContext");
    });

    it("should create logger with context and requestId", () => {
      const contextLogger = logger.with("API", "req-789");
      contextLogger.info("test");
      const call = mockInfo.mock.calls[0][0];
      expect(call).toContain("INFO:API");
      expect(call).toContain("rid=req-789");
    });

    it("should have all log methods", () => {
      const contextLogger = logger.with("Test");
      expect(contextLogger.debug).toBeDefined();
      expect(contextLogger.info).toBeDefined();
      expect(contextLogger.warn).toBeDefined();
      expect(contextLogger.error).toBeDefined();
    });

    it("should allow additional metadata", () => {
      const contextLogger = logger.with("API", "req-123");
      contextLogger.info("test", { extra: "data" });
      const call = mockInfo.mock.calls[0][0];
      expect(call).toContain("INFO:API");
      expect(call).toContain("rid=req-123");
      expect(call).toContain("extra=data");
    });

    it("should work with debug in development", () => {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
        configurable: true,
      });
      const contextLogger = logger.with("Debug");
      contextLogger.debug("test");
      expect(mockDebug).toHaveBeenCalled();
      const call = mockDebug.mock.calls[0][0];
      expect(call).toContain("DEBUG:Debug");
    });

    it("should work with error and stack traces", () => {
      const contextLogger = logger.with("ErrorContext");
      const error = new Error("Context error");
      contextLogger.error("Failed", { error });
      expect(mockError).toHaveBeenCalled();
      const call = mockError.mock.calls[0][0];
      expect(call).toContain("ERROR:ErrorContext");
      expect(call).toContain("errorMessage=Context error");
    });
  });

  describe("genRequestId", () => {
    it("should generate a string", () => {
      const id = genRequestId();
      expect(typeof id).toBe("string");
    });

    it("should generate non-empty string", () => {
      const id = genRequestId();
      expect(id.length).toBeGreaterThan(0);
    });

    it("should generate unique IDs", () => {
      const id1 = genRequestId();
      const id2 = genRequestId();
      expect(id1).not.toBe(id2);
    });

    it("should have expected format (base36 timestamp + random)", () => {
      const id = genRequestId();
      // Should contain a hyphen separator
      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });

    it("should generate multiple unique IDs", () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(genRequestId());
      }
      expect(ids.size).toBe(100);
    });

    it("should fallback gracefully on error", () => {
      // Mock Date.now to throw
      const originalNow = Date.now;
      const originalRandom = Math.random;

      // Test successful case first
      const id1 = genRequestId();
      expect(id1).toMatch(/-/);

      // Mock Math.random to fail
      Math.random = jest.fn(() => {
        throw new Error("Random failed");
      });

      // Should still return a valid ID (fallback to Date.now())
      const id2 = genRequestId();
      expect(typeof id2).toBe("string");
      expect(id2.length).toBeGreaterThan(0);

      // Restore
      Math.random = originalRandom;
      Date.now = originalNow;
    });
  });

  describe("Message Formatting", () => {
    it("should include pipe separator when extras exist", () => {
      logger.info("test", { key: "value" });
      const call = mockInfo.mock.calls[0][0];
      expect(call).toContain(" | ");
    });

    it("should NOT include pipe separator when no extras", () => {
      logger.info("test");
      const call = mockInfo.mock.calls[0][0];
      expect(call).not.toContain(" | ");
    });

    it("should handle empty metadata object", () => {
      logger.info("test", {});
      const call = mockInfo.mock.calls[0][0];
      expect(call).toContain("test");
    });

    it("should handle null metadata", () => {
      logger.info("test", undefined);
      const call = mockInfo.mock.calls[0][0];
      expect(call).toContain("test");
    });

    it("should stringify complex values", () => {
      logger.info("test", { obj: { nested: "value" } });
      const call = mockInfo.mock.calls[0][0];
      expect(call).toContain("obj=");
      expect(call).toContain("nested");
    });
  });
});
