import React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { NetworkProvider } from "../contexts/NetworkContext";
import { Web3Provider } from "../contexts/Web3Provider";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <Web3Provider>
      <NetworkProvider>
        <div className="min-h-screen bg-black flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </NetworkProvider>
    </Web3Provider>
  );
}
