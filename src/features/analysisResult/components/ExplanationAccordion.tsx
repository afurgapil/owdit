import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  CheckCircle,
  Shield,
} from "lucide-react";

interface Finding {
  title: string;
  detail: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface ExplanationAccordionProps {
  items: Finding[];
  className?: string;
}

export function ExplanationAccordion({
  items,
  className,
}: ExplanationAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const getSeverityIcon = (severity: Finding["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-neon-pink" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-neon-orange" />;
      case "medium":
        return <Info className="h-5 w-5 text-neon-orange" />;
      case "low":
        return <CheckCircle className="h-5 w-5 text-neon-green" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: Finding["severity"]) => {
    switch (severity) {
      case "critical":
        return "border-neon-pink/40 bg-neon-pink/10";
      case "high":
        return "border-neon-orange/40 bg-neon-orange/10";
      case "medium":
        return "border-neon-orange/40 bg-neon-orange/10";
      case "low":
        return "border-neon-green/40 bg-neon-green/10";
      default:
        return "border-gray-400/40 bg-gray-400/10";
    }
  };

  const getSeverityText = (severity: Finding["severity"]) => {
    switch (severity) {
      case "critical":
        return "Critical";
      case "high":
        return "High";
      case "medium":
        return "Medium";
      case "low":
        return "Low";
      default:
        return "Unknown";
    }
  };

  const getSeverityBadgeColor = (severity: Finding["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-neon-pink/20 text-neon-pink border-neon-pink/40";
      case "high":
        return "bg-neon-orange/20 text-neon-orange border-neon-orange/40";
      case "medium":
        return "bg-neon-orange/20 text-neon-orange border-neon-orange/40";
      case "low":
        return "bg-neon-green/20 text-neon-green border-neon-green/40";
      default:
        return "bg-gray-400/20 text-gray-400 border-gray-400/40";
    }
  };

  if (items.length === 0) {
    return (
      <div
        className={`glass-card rounded-2xl border border-neon-green/30 p-8 text-center ${className}`}
      >
        <div className="p-4 bg-neon-green/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 glow-green">
          <CheckCircle className="h-12 w-12 text-neon-green" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-4 neon-text neon-green">
          No Security Findings
        </h3>
        <p className="text-gray-300 text-lg">
          This contract appears to be in good security condition.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-gradient-to-r from-neon-purple to-neon-pink rounded-full glow-purple">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white neon-text neon-purple">
          Security Findings ({items.length})
        </h3>
      </div>

      {items.map((item, index) => (
        <div
          key={index}
          className={`glass-card border-2 rounded-xl overflow-hidden transition-all duration-300 hover-glow ${getSeverityColor(
            item.severity
          )}`}
        >
          <button
            onClick={() => toggleItem(index)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-opacity-20 transition-all duration-300"
          >
            <div className="flex items-center space-x-4">
              {getSeverityIcon(item.severity)}
              <span className="font-bold text-white text-lg">{item.title}</span>
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full border ${getSeverityBadgeColor(
                  item.severity
                )}`}
              >
                {getSeverityText(item.severity)}
              </span>
            </div>
            {openItems.has(index) ? (
              <ChevronDown className="h-6 w-6 text-gray-400" />
            ) : (
              <ChevronRight className="h-6 w-6 text-gray-400" />
            )}
          </button>

          {openItems.has(index) && (
            <div className="px-6 pb-4 border-t border-current border-opacity-20 bg-black/20">
              <p className="text-gray-300 pt-4 leading-relaxed text-base">
                {item.detail}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
