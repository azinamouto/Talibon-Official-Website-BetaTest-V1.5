# Public API latency investigation

Scope: local API against the already-approved staging runtime. No migrations,
production changes, security changes, or credential output.

## Request path and confirmed code-level overhead

`/api/news` and `/api/services` pass through `RateLimiterGuard`, then their
content controllers, `ContentService.list`, `PublicContentService.list`, and
`PostgresDatabase.transaction`. `/api/tourism/festivities` uses the same guard,
then `TourismService.getFestivities` and the same public content service.
All three read only the publication view. Public requests still update the
shared throttle; failed responses also await the durable audit write.

The guard and public content service each reuse a lazy, bounded pool (max 2).
Acquisition/connection timeout is 5 seconds; idle clients expire after 10
seconds. Each new physical connection verifies TLS/channel binding and the
restricted runtime role before checkout. The existing role hardening was
preserved. These are independent pools, not connections created per request.

Previously, each transaction awaited BEGIN and five SET LOCAL statements
separately, then two application queries and COMMIT: 9 exchanges, or 18 for
a successful public GET. The patch batches only the six fixed setup statements:
4 exchanges per transaction, 8 per GET. SQL, parameters, snapshot isolation,
timeout values, role checks, pool limits, and release/rollback behavior are
unchanged. This eliminates ten network waits per successful request and reduces
pool occupancy. It does not establish the cause of the reported intermittent
503s without the staging trace. Possible failure stages must be distinguished:
pool acquisition, role validation, rate-limit mutation, content reads and audit.

No transaction callback or ambiguous commit is automatically retried. Replaying
a whole public GET also replays its throttle write. Adding indiscriminate retries
would obscure pool saturation and can duplicate writes; no retry was added
without evidence of a specific safely retryable failure.

## Repeatable benchmark

From the repository root, in the existing PowerShell session containing the
approved staging credentials:

The benchmark now validates `DATABASE_URL` against the pinned staging target,
verified TLS and required channel binding before application bootstrap. This
guard matters because public requests write throttle/audit rows. It does not
authorize running the benchmark against staging; execution still needs approval.

```powershell
npm --prefix backend run build:tsc
node backend/scripts/benchmark-api.cjs backend/latency-before.json --legacy-setup
Start-Sleep -Seconds 60
node backend/scripts/benchmark-api.cjs backend/latency-after.json
```

`--legacy-setup` reconstructs the original six sequential setup exchanges; it
does not change files or database state. The other code is identical in both
runs. Each run starts a temporary loopback API on an ephemeral port and closes
it afterward. It performs 27 normal public GETs, including their existing
throttle/audit effects. It does not modify content, invoke CMS mutations,
object storage, e-services or payments. Allow the rate-limit window to reset
between runs; stop other load from the same client during comparison.

JSON contains only fixed endpoint labels, HTTP statuses, durations, pool counts,
numeric connection IDs and allowlisted failure codes. No SQL, query parameters,
hostnames, credentials, content bodies, or raw error messages are recorded.
Acquire time includes new-connection setup and role validation; individual
query time includes network time and is not server execution time. Pool counts
are sampled before acquisition; connection IDs show reuse.

First-pass measurements distinguish application-pool startup from steady state;
only the very first request is entirely process-cold. The final phase waits 11
seconds to exercise the existing idle eviction. Neither phase proves Neon
compute suspension. To measure actual compute-cold latency, independently
confirm staging compute suspension and absence of other traffic before running;
do not change compute settings. Concurrent bursts use three requests. Five
steady samples per endpoint provide a small diagnostic sample, not a capacity
or production SLO certification.

## Verification

- Build and ESLint/TypeScript: passed.
- Backend tests: 3 Jest and 78 Node tests passed, including TLS/channel binding,
  runtime role validation coverage, CMS contracts, and disabled routes.
- New transaction tests cover setup-before-work, parameterization, rollback,
  discard on rollback failure, and absence of callback/commit replay.
- Disposable PostgreSQL 18 (no migrations/schema changes): verified read/write
  modes, repeatable-read isolation, all four timeout values, statement timeout
  cancellation, transaction timeout termination, subsequent pool recovery, and
  absence of transaction-local setting leakage.
- Runtime artifact exclusion: 409 files passed.
- Hosted before/after benchmark completed in the credential-bearing terminal;
  results below. The exact intermittent 503 cause remains unverified.

## Staging results, 2026-11-10

Sources: `backend/latency-before.json` (09:55:45 Asia/Shanghai) and
`backend/latency-after.json` (09:57:45). The before run reconstructs the original
sequential setup on the same application; it is not a separately deployed build.

| Endpoint | Steady median before → after | Steady p95 before → after |
| --- | --- | --- |
| `/api/news` | 2999.5 → 1651.9 ms | 4905.7 → 2205.0 ms |
| `/api/services` | 2856.2 → 1313.7 ms | 2936.1 → 1735.4 ms |
| `/api/tourism/festivities` | 2855.7 → 1495.0 ms | 3311.0 → 2247.0 ms |

Across the 15 steady samples per run, median improved 2872.8 → 1523.8 ms
(47.0%) and p95 4905.7 → 2247.0 ms (54.2%). With five samples per endpoint,
each endpoint p95 is its maximum; this is a diagnostic comparison, not an SLO.
Both runs returned HTTP 200 for all 27 requests: zero 503s, transport failures,
or recorded database errors in either run. The reported intermittent failure
was therefore not reproduced, so its resolution cannot be claimed.

The traces confirm setup exchanges fell 324 → 54 across 54 transactions;
aggregate setup time fell 61611.7 → 10402.5 ms. These aggregate stage times
include network latency and concurrent work and must not be treated as total
wall-clock elapsed time. Public-content query time stayed similar
(9629.5 → 9121.7 ms across 54 queries), supporting setup round trips as the
specific latency contributor removed. Both runs reused six physical clients
across 54 acquisitions, including reconnects after the idle phase; there is no
evidence of a per-request connection leak in this sample.

First process-cold request improved 7507.5 → 4021.4 ms. First request after the
11-second idle gap improved only 5245.3 → 4745.3 ms; the after trace spent
3320.3 ms acquiring two fresh connections, including role validation. Concurrent
burst maximum improved 6692.5 → 4144.1 ms. Thus latency is substantially reduced
but multi-second cold/idle and concurrent responses remain. Neither run proves
Neon compute suspension or isolates server execution time from network RTT.

Both reports confirm pooled endpoints, verified TLS, mandatory channel binding,
max 2 connections per pool, 5-second acquisition timeout, 10-second idle eviction,
and 12-second client query timeout. No further pool/timeout/security changes are
justified solely by these small samples. Remaining work is to capture a failing
503 trace under the actual failing workload and assess idle reconnect costs;
do not classify the incident as fully resolved.

Pool lifetime semantics: [node-postgres Pool API](https://node-postgres.com/apis/pool).
Transaction pooling constraints: [Neon connection pooling](https://neon.com/docs/connect/connection-pooling).
