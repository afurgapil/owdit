"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "../../../public/logo-withoutbg.png";
import Image from "next/image";
export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

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
              href="/"
              className="text-gray-300 hover:text-neon-blue px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 hover:bg-neon-blue/10"
            >
              HOME
            </Link>
            <Link
              href="/analyze"
              className="text-gray-300 hover:text-neon-purple px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 hover:bg-neon-purple/10"
            >
              ANALYZE
            </Link>
            <Link
              href="/history"
              className="text-gray-300 hover:text-neon-green px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 hover:bg-neon-green/10"
            >
              HISTORY
            </Link>
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
                href="/"
                className="text-gray-300 hover:text-neon-blue block px-4 py-3 rounded-lg text-base font-bold transition-all duration-300 hover:bg-neon-blue/10"
                onClick={() => setIsMenuOpen(false)}
              >
                HOME
              </Link>
              <Link
                href="/analyze"
                className="text-gray-300 hover:text-neon-purple block px-4 py-3 rounded-lg text-base font-bold transition-all duration-300 hover:bg-neon-purple/10"
                onClick={() => setIsMenuOpen(false)}
              >
                ANALYZE
              </Link>
              <Link
                href="/history"
                className="text-gray-300 hover:text-neon-green block px-4 py-3 rounded-lg text-base font-bold transition-all duration-300 hover:bg-neon-green/10"
                onClick={() => setIsMenuOpen(false)}
              >
                HISTORY
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
