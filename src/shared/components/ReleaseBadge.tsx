"use client";

import React, { useState } from "react";
import { ChevronDown, Zap, Clock, DollarSign } from "lucide-react";

export function ReleaseBadge() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative group">
      {/* Badge Trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                   bg-gradient-to-r from-neon-blue/10 to-neon-purple/10
                   border border-neon-blue/40 hover:border-neon-blue/60
                   text-neon-blue hover:text-neon-blue/80
                   transition-all duration-300
                   hover:shadow-lg hover:shadow-neon-blue/20"
        title="Release Phase Information"
      >
        <Zap className="w-4 h-4" />
        <span className="text-sm font-semibold">Free Release Phase</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded Info Panel */}
      {isExpanded && (
        <div className="absolute top-full mt-2 left-0 z-50 w-80 rounded-lg
                        bg-black/95 backdrop-blur-xl border border-neon-blue/40
                        shadow-2xl shadow-neon-blue/10 p-4 space-y-4">
          {/* Current Phase - Free */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-neon-green/10 mt-0.5">
                <Zap className="w-4 h-4 text-neon-green" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-neon-green">
                  🎉 Free Operations Now
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  All transaction fees and operations are covered by <span className="font-semibold text-neon-blue">Owdit</span> during the release phase.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-neon-blue/0 via-neon-blue/20 to-neon-blue/0" />

          {/* Future Phase - Paid */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-neon-orange/10 mt-0.5">
                <Clock className="w-4 h-4 text-neon-orange" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-neon-orange">
                  📅 After Release
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Users will be responsible for their own transaction fees and operational costs.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-neon-blue/0 via-neon-blue/20 to-neon-blue/0" />

          {/* Benefits List */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-neon-blue uppercase tracking-wider">
              Current Benefits
            </p>
            <ul className="space-y-1.5">
              <li className="text-xs text-gray-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                No gas fees during analysis
              </li>
              <li className="text-xs text-gray-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                Free transaction processing
              </li>
              <li className="text-xs text-gray-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                Unlimited operations
              </li>
              <li className="text-xs text-gray-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                Full feature access
              </li>
            </ul>
          </div>

          {/* Footer Info */}
          <div className="pt-2 border-t border-neon-blue/20">
            <p className="text-xs text-gray-400 text-center">
              Make the most of this opportunity! 🚀
            </p>
          </div>
        </div>
      )}

      {/* Hover tooltip on badge */}
      <div className="invisible group-hover:visible absolute top-full mt-1 left-0 
                      bg-black border border-neon-blue/40 rounded px-3 py-1.5 
                      text-xs text-gray-300 whitespace-nowrap z-40
                      shadow-lg shadow-neon-blue/10">
        Click to learn more about pricing
      </div>
    </div>
  );
}
