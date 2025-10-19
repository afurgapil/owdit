"use client";

import Link from "next/link";
import { Menu, X, Wallet, LogOut } from "lucide-react";
import { useState } from "react";
import logo from "../../../public/logo-withoutbg.png";
import Image from "next/image";
import { NetworkSelector } from "./NetworkSelector";
import { WalletSelector } from "./WalletSelector";
import { useAccount, useConnect } from "wagmi";
import { disconnect } from "@wagmi/core";
import { config } from "../contexts/Web3Provider";
export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleConnect = () => {
    setIsWalletSelectorOpen(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect(config);
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };



  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <nav className="bg-black/90 backdrop-blur-xl border-b border-neon-blue/40 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-4 group">
            <Image src={logo} alt="logo" width={64} height={64} />
            <div className="flex flex-col">
              <span className="text-3xl font-black text-white group-hover:text-neon-blue transition-colors duration-300 font-raleway">
                Owdit
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            <Link
              href="/analyze"
              className="text-gray-300 hover:text-neon-purple px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 hover:bg-neon-purple/10"
            >
              ANALYZE
            </Link>
            <Link
              href="/developers"
              className="text-gray-300 hover:text-neon-cyan px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 hover:bg-neon-cyan/10"
            >
              DEVELOPERS
            </Link>
            <Link
              href="/learn"
              className="text-gray-300 hover:text-neon-orange px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 hover:bg-neon-orange/10"
            >
              LEARN
            </Link>
            <Link
              href="/history"
              className="text-gray-300 hover:text-neon-green px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 hover:bg-neon-green/10"
            >
              HISTORY
            </Link>

            {/* Network Selector */}
            <NetworkSelector />

            {/* Wallet Connection */}
            <div className="ml-4">
              {isConnected ? (
                <div className="flex items-center space-x-2 px-4 py-2 bg-neon-green/10 border border-neon-green/30 rounded-lg group">
                  <Wallet className="h-4 w-4 text-neon-green" />
                  <span className="text-neon-green text-sm font-bold">
                    {formatAddress(address!)}
                  </span>
                  <button
                    onClick={handleDisconnect}
                    className="ml-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-all duration-200"
                    title="Disconnect wallet"
                  >
                    <LogOut className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-purple hover:to-neon-blue text-white font-bold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-neon-blue/25"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-300 hover:text-neon-blue p-3 rounded-lg transition-all duration-300 hover:bg-neon-blue/10"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-7 w-7" />
              ) : (
                <Menu className="h-7 w-7" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-4 pt-4 pb-6 space-y-2 sm:px-6 border-t border-neon-blue/40 bg-black/95 backdrop-blur-xl rounded-b-2xl">
              <Link
                href="/analyze"
                className="text-gray-300 hover:text-neon-purple block px-4 py-3 rounded-lg text-base font-bold transition-all duration-300 hover:bg-neon-purple/10"
                onClick={() => setIsMenuOpen(false)}
              >
                ANALYZE
              </Link>
              <Link
                href="/developers"
                className="text-gray-300 hover:text-neon-cyan block px-4 py-3 rounded-lg text-base font-bold transition-all duration-300 hover:bg-neon-cyan/10"
                onClick={() => setIsMenuOpen(false)}
              >
                DEVELOPERS
              </Link>
              <Link
                href="/learn"
                className="text-gray-300 hover:text-neon-orange block px-4 py-3 rounded-lg text-base font-bold transition-all duration-300 hover:bg-neon-orange/10"
                onClick={() => setIsMenuOpen(false)}
              >
                LEARN
              </Link>
              <Link
                href="/history"
                className="text-gray-300 hover:text-neon-green block px-4 py-3 rounded-lg text-base font-bold transition-all duration-300 hover:bg-neon-green/10"
                onClick={() => setIsMenuOpen(false)}
              >
                HISTORY
              </Link>

              {/* Mobile Network Selector */}
              <div className="pt-2 border-t border-neon-blue/20">
                <div className="px-4 py-3">
                  <NetworkSelector />
                </div>
              </div>

              {/* Mobile Wallet Connection */}
              <div className="pt-2 border-t border-neon-blue/20">
                <div className="px-4 py-3">
                  {isConnected ? (
                    <div className="flex items-center space-x-2 px-4 py-3 bg-neon-green/10 border border-neon-green/30 rounded-lg group">
                      <Wallet className="h-4 w-4 text-neon-green" />
                      <span className="text-neon-green text-sm font-bold flex-1">
                        {formatAddress(address!)}
                      </span>
                      <button
                        onClick={() => {
                          handleDisconnect();
                          setIsMenuOpen(false);
                        }}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-all duration-200"
                        title="Disconnect wallet"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        handleConnect();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple hover:from-neon-purple hover:to-neon-blue text-white font-bold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-neon-blue/25"
                    >
                      <Wallet className="h-4 w-4" />
                      <span>Connect Wallet</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Wallet Selector Modal */}
      <WalletSelector 
        isOpen={isWalletSelectorOpen} 
        onClose={() => setIsWalletSelectorOpen(false)} 
      />
    </nav>
  );
}
