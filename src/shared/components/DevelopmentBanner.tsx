"use client";

import { AlertTriangle, X, Info, Code, TestTube } from "lucide-react";
import { useState } from "react";

export function DevelopmentBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="relative bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-b border-amber-500/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-center text-center">
          <AlertTriangle className="h-5 w-5 text-amber-400 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-100 font-medium">
              <span className="font-bold text-amber-300">
                🚧 UNDER DEVELOPMENT
              </span>{" "}
              - This system is currently in testing phase and does not work with
              real data.
            </p>

            {isExpanded && (
              <div className="mt-2 text-xs text-amber-200/80 space-y-1">
                <div className="flex items-center justify-center space-x-4">
                  <span className="flex items-center">
                    <Code className="h-3 w-3 mr-1" />
                    Demo data is being used
                  </span>
                  <span className="flex items-center">
                    <TestTube className="h-3 w-3 mr-1" />
                    Test analysis only
                  </span>
                  <span className="flex items-center">
                    <Info className="h-3 w-3 mr-1" />
                    Not real results
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 rounded-full transition-all duration-200 flex-shrink-0"
              aria-label={isExpanded ? "Hide details" : "Show details"}
            >
              <Info className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 rounded-full transition-all duration-200 flex-shrink-0"
              aria-label="Close warning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Animated border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-60"></div>
    </div>
  );
}
