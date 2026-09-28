# S7-BE-03 uptime, errors and latency

Status: instrumented and locally tested; live monitoring and team alert delivery
pending confirmed project/origin, destination and an acknowledged test notification.

Every API response now emits a JSON `http_request` event to platform logs with a
generated requestId, route template, status, durationMs and aborted flag. 5xx events
use stderr; aborted connections are recorded as 499. Query strings, path parameter
values, credentials, request bodies, IP addresses and user identities are omitted.
Parser and guard failures are included. CDN cache hits are outside the origin event
stream. This telemetry does not replace persistent security/business audit records.

## Configure monitoring

1. Confirm the production Vercel project, Supabase project, service owner and alert
   destination. Use Vercel runtime logs to inspect `http_request`; configure retention
   and a log drain/error-monitor integration if available on the account. Aggregate
   request count, 5xx count/rate, and p50/p95/p99 duration by route and time window.
   Suggested starting alert: 5xx >1% with >=20 requests in 5 minutes, or p95 >2s for
   5 minutes. Tune against staging evidence and record the final thresholds.
2. Configure those traffic-based error/latency alerts in the selected monitoring
   service and route them to the team. The synthetic workflow below checks health
   endpoints only; it does not calculate production-wide error rates or percentiles.
3. Create GitHub environment `production-monitoring`, variable MONITOR_API_ORIGIN
   (HTTPS origin only), optional MONITOR_MAX_LATENCY_MS (default 2000), and secret
   MONITOR_ALERT_WEBHOOK. The endpoint must accept a JSON body with `text`, `event`,
   `checkedAt`, `ok`, and `results`. Validate its provider contract before enabling.
4. Set repository variable PRODUCTION_MONITOR_ENABLED=true only after staging
   failure delivery is acknowledged. The workflow is inert by default; no webhook
   or recipient is assumed. Keep this environment unattended so scheduled monitoring
   does not wait for deployment approval. The YAML must reach the default branch for
   schedules to run. GitHub schedules can be delayed; use a dedicated uptime service
   if the team requires a guaranteed check interval.
5. Trigger a staging-only readiness failure and latency breach, confirm workflow
   failure and team receipt, then restore service and verify success. Never break
   production to test alerts. The webhook is awaited; delivery failure fails the job.
   Each failing run sends one alert. Configure grouping/escalation/recovery in the
   receiving service; the workflow has no durable incident state or recovery notices.

## Smoke and response

Set MONITOR_API_ORIGIN then run `node scripts/monitor-production.mjs --smoke` for
non-alerting health verification. Both endpoints must return valid, uncached JSON,
200 and the expected state, including database readiness, within the threshold.
Redirects, SPA fallbacks, dependency failures, missing no-store, and timeouts fail.

On alert: inspect workflow results, then correlate 5xx/latency events with Vercel
deployment and Supabase logs. Use requestId, never citizen data, in incident notes.
Follow launch-migrations.md for rollback; verify readiness and the full smoke suite
before resolving an incident. A healthy probe alone is not full application E2E.

Record production monitor URL/ID, team destination/owner, thresholds, log retention,
failure/recovery timestamps and acknowledged test-delivery evidence before closing
S7-BE-03. Local mock delivery tests are not evidence that the team received alerts.

References: [runtime logs](https://vercel.com/docs/logs/runtime),
[drains](https://vercel.com/docs/drains).
