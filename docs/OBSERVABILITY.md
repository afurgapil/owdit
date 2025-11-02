# Observability

## Uptime & Incident Response

- UptimeRobot monitors the public URL (owdit.com)
- On downtime, alerts notify maintainers for immediate action

## Error & Performance Monitoring

- Sentry is integrated across edge and server
- Performance monitoring enabled to track slow endpoints and regressions
- Config files: `sentry.edge.config.ts`, `sentry.server.config.ts`

## Analytics

- Google Analytics integrated to measure usage and UX metrics
- Consider privacy-aware configuration (IP anonymization, consent mode)

## Dashboards

- Coverage: view `coverage/` reports from CI artifacts
- CI: GitHub Actions checks must pass before merge
