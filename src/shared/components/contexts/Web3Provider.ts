// Shim to satisfy tests importing "../contexts/Web3Provider" from components
import React from "react";

export const config = {} as unknown as {
  // shape not important for tests; they mock this module
};

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return React.createElement(
    "div",
    { "data-testid": "web3-provider" },
    children
  );
}


