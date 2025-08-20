// Application constants
export const APP_NAME = "Owdit";
export const APP_DESCRIPTION = "Smart Contract Security Score - On 0G Network";

// API endpoints
export const API_ENDPOINTS = {
  SCORE: "/api/score",
  ANALYZE: "/api/analyze",
} as const;

// Risk levels
export const RISK_LEVELS = {
  LOW: { min: 80, max: 100, label: "Low Risk", color: "green" },
  MEDIUM: { min: 60, max: 79, label: "Medium Risk", color: "yellow" },
  HIGH: { min: 40, max: 59, label: "High Risk", color: "orange" },
  CRITICAL: { min: 0, max: 39, label: "Critical Risk", color: "red" },
} as const;

// Severity levels for findings
export const SEVERITY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

// Common security vulnerabilities to check
export const SECURITY_VULNERABILITIES = [
  "Reentrancy",
  "Integer Overflow/Underflow",
  "Access Control",
  "Unchecked External Calls",
  "Front Running",
  "Timestamp Dependence",
  "Gas Limit Issues",
  "Unsafe Delegate Call",
  "Storage Collision",
  "Uninitialized Variables",
] as const;

// Mock data for development
export const MOCK_ANALYSIS_RESULTS = {
  pending: {
    address: "0x1234567890123456789012345678901234567890",
    score: 0,
    level: "low" as const,
    timestamp: new Date().toISOString(),
    findings: [],
    status: "pending" as const,
  },
  completed: {
    address: "0x1234567890123456789012345678901234567890",
    score: 78,
    level: "medium" as const,
    timestamp: new Date().toISOString(),
    findings: [
      {
        title: "Reentrancy Guard",
        detail: "Contract is protected against reentrancy attacks.",
        severity: "low" as const,
      },
      {
        title: "Access Control",
        detail: "Access control mechanism exists for admin functions.",
        severity: "low" as const,
      },
    ],
    status: "completed" as const,
  },
} as const;
