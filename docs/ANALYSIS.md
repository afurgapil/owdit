# Contract Analysis Pipeline

## Overview

Owdit runs a two-track analysis pipeline depending on whether a contract is verified on public explorers or only discoverable via bytecode. Every analysis result is normalized into a single `UnifiedContractAnalysis` shape for consistent processing.

## High-Level Flow

1. **Request validation** – Incoming payloads are checked with `analyzeRequestSchema` or `contractSourceRequestSchema` to ensure `chainId` and `address` are valid.
2. **Source resolution** – `resolveContractSource` queries Sourcify first and, if needed, Etherscan (when `ETHERSCAN_API_KEY` is configured). On success it returns a `ContractSource` record.
3. **Risk fallback** – If verification data is unavailable, `/api/contract-source` triggers the `/api/risk` endpoint. `BytecodeAnalyzer.analyzeBytecode` inspects opcodes, selectors, and proxy patterns to generate a `RiskAnalysisResult`.
4. **Unification** – `transformToUnifiedFormat` maps either result type onto `UnifiedContractAnalysis`, aligning shared fields for downstream consumers.
5. **AI scoring** – Both `/api/contract-source` and `/api/analyze` optionally call `/api/infer`, forwarding either source metadata or bytecode heuristics to produce an AI score and explanation.

## Verified Contract Path

- `resolveContractSource` returns compiler metadata, ABI, and source files when the contract is verified on Sourcify or Etherscan.
- `transformContractSourceToUnified` fills the unified structure with source details (`contractInfo`, `sourceCode`).
- `/api/infer` receives a concise feature summary including contract name, compiler version, explicit file list, and a natural-language summary.
- `isContractUpgradable` scans concatenated source text for proxy-related keywords (e.g., `upgrade`, `proxy`, `transparent`, `uups`, `diamond`). If the contract looks upgradeable the storage step is skipped to avoid stale data.

## Unverified Contract Path

- `/api/risk` fetches bytecode via `eth_getCode` using the chain-specific RPC URL (`RPC_URL_{CHAIN_ID}` overrides are respected).
- `BytecodeAnalyzer` produces function selectors, opcode counters, complexity estimates, and a risk assessment that categorizes severity (`low`, `medium`, `high`, or `unknown`).
- Additional proxy checks include reading the EIP-1967 implementation slot (`eth_getStorageAt`) and scanning for the EIP-1167 minimal proxy pattern; `BytecodeAnalyzer.isUpgradeableContract` reports the final verdict.
- The AI inference payload is bytecode-centric—selectors, opcode histograms, proxy hints, and bytecode length feed the scoring engine.

## Supporting APIs

- **`GET /api/contract-source`** – Primary entry point. Handles source resolution, risk fallback, and AI scoring.
- **`GET /api/risk`** – Bytecode-only analyzer used as a fallback or standalone risk checker. Returns an `aiOutput` block when inference succeeds.
- **`POST /api/analyze`** – Lightweight scoring endpoint used by the UI. It reuses unified analysis data to call `/api/infer` and assembles a risk level from the numeric score.

## Failure Handling

- AI inference errors degrade gracefully; `/api/analyze` returns a default score of `50` and marks the risk level as `high` when no score is available.

## Environment Requirements

```bash
ETHERSCAN_API_KEY=optional_etherscan_key            # unlocks Etherscan source fallback
NEXT_PUBLIC_BASE_URL=http://localhost:3000          # base URL for server-to-server infer calls
RPC_URL_{CHAIN_ID}=https://...                      # optional per-chain RPC override for risk API
```

## Key Takeaways

- Verified and unverified contracts share the same response surface after `transformToUnifiedFormat`.
