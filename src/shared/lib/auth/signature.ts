import { ethers } from "ethers";

// Simple in-memory nonce store (replace with Redis for prod)
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const nonces = new Map<string, { nonce: string; expiresAt: number; used: boolean }>();

export function createNonce(address: string): string {
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const key = address.toLowerCase();
  nonces.set(key, { nonce, expiresAt: Date.now() + NONCE_TTL_MS, used: false });
  return nonce;
}

export function consumeNonce(address: string, nonce: string): boolean {
  const key = address.toLowerCase();
  const entry = nonces.get(key);
  if (!entry) return false;
  if (entry.used) return false;
  if (entry.nonce !== nonce) return false;
  if (Date.now() > entry.expiresAt) return false;
  entry.used = true;
  nonces.set(key, entry);
  return true;
}

export function buildSignMessage(params: {
  action: string;
  address: string;
  ref: string; // contract address or commentId depending on action
  timestamp: number;
  nonce: string;
}): string {
  return [
    "Owdit Sign:",
    `action:${params.action}`,
    `addr:${params.address.toLowerCase()}`,
    `ref:${params.ref}`,
    `ts:${params.timestamp}`,
    `nonce:${params.nonce}`,
  ].join("\n");
}

export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}


