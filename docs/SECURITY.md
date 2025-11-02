# Security

## Principles

- Validate inputs at API boundaries (e.g., address formats, pagination limits)
- Avoid caching upgradeable contracts to prevent stale risk profiles
- Fail safe: deterministic fallbacks if inference is unavailable
- Minimal privileges and external calls

## Data Handling

- Caching: MongoDB with TTL; non-upgradeable results only
- PII: No sensitive personal data stored
- Logging: Structured logs (server) with redaction best practices

## Error Handling

- Sentry for error and performance monitoring
- Clear user feedback via UI for retriable errors

## Threat Model (High Level)

- RPC/source resolver unavailability -> fallback and surface status
- Malformed contract metadata -> validation and safe parsing
- Cache poisoning -> unique constraints and server validation
