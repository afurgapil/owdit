# Roadmap (Sprint-based)

Two-week sprints with clear goals and deliverables. Themes continue as ongoing workstreams.

## Sprint 1 (Weeks 1–2)

Goals
- 0G Broker mainnet readiness (baseline): cost meter in UI, request logs, basic quotas
- Explainability foundations: per‑finding evidence and confidence scores
- Reliability: p95 latency budgets; caching tweaks; public status link + incident playbooks
- Verification kickoff: Sourcify verify flow (MVP) with link‑out, status badges; one‑click source check

Deliverables
- UI cost meter and request log view (minimal)
- Evidence panels on results (selectors/opcodes/lines shown where applicable)
- UptimeRobot status link in footer + runbook docs
- “Verify on Sourcify” actions and badges in results

## Sprint 2 (Weeks 3–4)

Goals
- Developer tooling: VS Code extension (MVP) for contract checks and quick‑fix suggestions
- CI integration: GitHub App for PR checks (analyze changed contracts, annotate diffs)
- Browser extension: spec + prototype (Chrome) to surface risk on explorer pages
- Learn v2: interactive guides and curated user submissions (basic)

Deliverables
- VS Code extension preview release
- GitHub App beta with PR annotations
- Chrome extension prototype (risk badge + deep‑link)
- Interactive Learn modules + submission pipeline (curated)

## Sprint 3 (Weeks 5–6)

Goals
- Analysis extensibility: pluggable analyzer interface + initial community plugins
- Provenance: on‑chain attestations (EAS/EIP‑712) for signed analysis hashes
- Sourcify integration v2: submit/verify wizard; verification diff and provenance views

Deliverables
- Plugin SDK + 2–3 reference plugins
- Attestation service and signed report hashes
- End‑to‑end Sourcify verify wizard

## Sprint 4 (Weeks 7–8)

Goals
- Discovery: knowledge graph + vector search (similarity/risk clusters)
- Partners: API alpha for integrators (rate limits, usage analytics)
- Storage: optional 0G Storage for long‑term report archiving

Deliverables
- Graph + vector search UI in app
- Partners API keys + dashboards (alpha)
- Archival pipeline with retrieval UI (optional)

## Backlog (to pull into upcoming sprints)

- Multi‑chain enhancements and additional networks
- Deeper heuristics and signatures for unverified bytecode
- Expanded 0G usage and model choices via broker
- Accessibility and localization (WCAG) polish

