import React from "react";
import { Github } from "lucide-react";
import logo from "../../../public/logo-withoutbg.png";
import Image from "next/image";
export function Footer() {
  return (
    <footer className="bg-black/80 border-t border-neon-blue/40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="w-full flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0">
          {/* Logo and Description */}
          <div className="flex items-center space-x-4">
            <Image src={logo} alt="logo" width={64} height={64} />
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white">Owdit</span>
              <span className="text-xs text-gray-500 font-mono tracking-wider">
                THE WATCHFUL OWL
              </span>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex items-center space-x-6">
            <a
              href="https://github.com/afurgapil/owdit"
              target="_blank"
              className="text-gray-400 hover:text-neon-blue transition-all duration-300 p-3 rounded-xl hover:bg-neon-blue/10"
              aria-label="GitHub"
            >
              <Github className="h-7 w-7" />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="w-full mt-12  pt-8 border-t border-neon-blue/30 text-center">
          <p className="text-gray-400 font-mono">
            © 2025 Owdit - The Watchful Owl. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
