import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function for combining Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format timestamp to readable format
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get risk level color based on score
export function getRiskLevelColor(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-100";
  if (score >= 60) return "text-yellow-600 bg-yellow-100";
  if (score >= 40) return "text-orange-600 bg-orange-100";
  return "text-red-600 bg-red-100";
}

// Get risk level text based on score
export function getRiskLevelText(score: number): string {
  if (score >= 80) return "Low Risk";
  if (score >= 60) return "Medium Risk";
  if (score >= 40) return "High Risk";
  return "Critical Risk";
}

// Shorten Ethereum address for display
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Validate Ethereum address format
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
