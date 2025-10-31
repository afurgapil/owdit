// Learn more: https://github.com/testing-library/jest-dom
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("@testing-library/jest-dom");

// Mock Next.js environment variables
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Not implemented: HTMLFormElement.prototype.submit"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Polyfill Fetch API globals for Next internals in tests
if (typeof global.Request === "undefined") {
  // @ts-ignore
  global.Request = (typeof window !== "undefined" && window.Request) ? window.Request : function () {};
}
if (typeof global.Response === "undefined") {
  // @ts-ignore
  global.Response = (typeof window !== "undefined" && window.Response) ? window.Response : function () {};
}
// Ensure Response.json static helper exists for NextResponse.json
// Provide a minimal shim that matches usage in tests
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof global.Response.json !== "function") {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.Response.json = (body, init) => {
    return {
      status: (init && init.status) || 200,
      async json() {
        return body;
      },
    };
  };
}
if (typeof global.Headers === "undefined") {
  // @ts-ignore
  global.Headers = (typeof window !== "undefined" && window.Headers) ? window.Headers : function () {};
}

// Provide default Google Analytics dataLayer for tests expecting it
if (typeof window !== "undefined" && typeof window.dataLayer === "undefined") {
  // @ts-ignore
  window.dataLayer = [];
}

// Ensure React is in global scope for components transpiled with classic JSX runtime
// eslint-disable-next-line @typescript-eslint/no-require-imports
global.React = require('react');
