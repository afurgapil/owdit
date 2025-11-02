# Deployment

This app can be deployed to any Node.js host. Vercel is recommended for simplicity.

## Steps (Vercel)

1. Fork/clone the repo
2. Create a new Vercel project and import the repository
3. Set environment variables from README (MongoDB, Etherscan optional, 0G broker vars)
4. Deploy. Ensure build command `npm run build` and output `Next.js` defaults

## Environment Variables

- `MONGODB_URI` (required)
- `ETHERSCAN_API_KEY` (optional)
- `NEXT_PUBLIC_BASE_URL` (optional)
- `RPC_URL_{CHAIN_ID}` (optional per-chain overrides)
- `PRIVATE_KEY`, `RPC_0G` (optional; 0G Serving Broker)

## MongoDB Indexes

- Unique index on `address + chainId`
- TTL index for result expiration (~24h)
- Upgradeable contracts are not cached

## CI/CD & Coverage

- Workflow: `.github/workflows/unit-tests.yml`
- Commands: `npm run test`, `npm run test:coverage`
- Gates: >1000 tests executed; coverage >80% before merge

## Observability

- UptimeRobot monitors the public URL for availability
- Sentry error and performance monitoring enabled
- Google Analytics for UX metrics

See also `docs/OBSERVABILITY.md`.
