# S6-BE-04: load test plan and results

Branch: `test/s6-be-04-performance-load`, based on `ce2998f`.
Parent: [S6-BE-04 / #56](https://github.com/rynzz22/Talibon-Official-Website-BetaTest-V1.5/issues/56).
The parent was already closed with unchecked acceptance criteria and no comments when inspected on 2026-09-27. This report establishes a local baseline; staging acceptance remains open.

## Scope and acceptance

Key public reads: `GET /api/pages?limit=20`, `/api/news?limit=20`, `/api/services?limit=20`, and `/api/search?q=permit&limit=10`, equally weighted. These exercise content discovery without writes, emails, payments, or AI provider charges. Authenticated APIs and frontend E2E are separate coverage; do not interpret this public-read benchmark as whole-system certification.

Operational interpretation of “under 200 ms”: **steady-state p95 strictly below 200 ms for every endpoint in every stage**, at least 20 samples per endpoint, zero failed responses, zero dropped arrivals. p50, p99, maximum, status counts, and achieved throughput are reported too. Initial request latency is reported separately, with initial errors still failing the run. Local initial requests do not measure serverless boot time because the fixture is ready before requests begin.

The dependency-free Node runner schedules a fixed arrival rate instead of waiting for each response before sending the next request. It caps in-flight requests at 100, records unsent/late arrivals as drops, applies a 5-second timeout, rejects redirects, consumes the full JSON body, and checks for nonempty data and pagination metadata. Fast 429/500 responses and empty mock results cannot pass. Timing includes network transfer and JSON decoding. A scheduling delay over one second fails through dropped-arrival accounting.

## Reproduce

From the repository root:

```powershell
npm run test:load --prefix backend
```

Default local run: 10 requests/s for 30 seconds, then 50 requests/s for 30 seconds, plus four initial requests. The Nest fixture runs in a separate process on an ephemeral loopback port and closes automatically. Real controllers, services, validation, auth/rate guards, error handling, audit and cache middleware run against a synthetic Supabase dependency. Each list returns 20 synthetic rows (roughly 2 KB content each), search returns 10, and metadata reports 1,000 total rows. This is a payload fixture, **not a database with 1,000 rows**. Database delay is fixed at 10 ms; filtering/indexing, external HTTP, RLS, connection pooling, and database CPU are not modeled.

The fixture alone trusts loopback forwarding and cycles 100 synthetic client IPs. This preserves the actual 120 public reads/minute/IP guard under multi-client load. There is no production bypass or change to proxy configuration. It also has no CDN, so all requests execute routes regardless of public cache headers.

JSON reports default to `backend/test/load/results/latest.json` when run through npm; generated reports are ignored by Git. The manual **Backend load benchmark** GitHub Actions workflow uploads them even on threshold failure. Run it after publishing the branch; it has not been executed remotely as part of this report. Hosted runner timing is a separate baseline from this Windows workstation.

### Staging gate (pending target)

Use a populated, non-production API origin with published pages/news/services and a search match for `permit`:

```powershell
$env:LOAD_BASE_URL='https://YOUR-STAGING-API.example'
$env:LOAD_RATES='1'
$env:LOAD_SECONDS='120'
npm run test:load --prefix backend
Remove-Item Env:LOAD_BASE_URL, Env:LOAD_RATES, Env:LOAD_SECONDS
```

Staging mode sends no synthetic forwarding headers. One request/s across all routes stays below the shared per-IP public limit. To test aggregate 10/50 requests/s, distribute this 1 request/s profile across 10/50 actual source IPs and preserve each report; require every endpoint on every generator to pass. Do not raise or disable production rate limits. Separate successful responses from cache hits/origin misses in platform telemetry, and record app revision, API/database region, dataset size, instance resources, cache state, source count and connection metrics alongside results.

Staging sequence: fresh-deployment initial requests; 120-second baseline; distributed 10 then 50 requests/s; 15-minute soak at the target rate; short 100 requests/s distributed spike followed by baseline recovery. Include representative 1k/10k/100k content datasets and deep-page/common-query checks when profiling database plans. This runner's fixed four-route mix does not cover those additional query variants; record them as separate measurements before closing PERF-02 below. Stop escalation if errors or latency increase. Archive JSON reports and server/database telemetry. The 200 ms result is currently unverified for staging and cold deployments.

## Measured results, 2026-09-27

Run started `2026-09-27T13:20:33.876Z`, Node `v24.18.0`, Windows x64, 8 logical CPUs. No live database or deployed API was contacted. Backend lint overlapped the beginning of the local run; the full regression suite ran afterward.

| Endpoint | Samples at 10 / 50 rps | p95 at 10 rps (ms) | p95 at 50 rps (ms) | p99 at 50 rps (ms) | Max at 50 rps (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pages | 75 / 375 | 18.80 | 17.49 | 18.81 | 29.23 |
| News | 75 / 375 | 18.95 | 17.49 | 19.04 | 20.08 |
| Services | 75 / 375 | 19.84 | 17.75 | 19.32 | 21.84 |
| Search | 75 / 375 | 18.31 | 17.37 | 19.47 | 29.66 |

**Local gate: PASS.** All 1,800 steady-state requests returned valid HTTP 200 responses; no drops or errors. Four initial requests also passed response checks. Raw timing is machine-specific and does not prove database or deployment performance.

Achieved throughput was 10.03 and 50.01 requests/s. Initial request times were 61.78 ms (pages), 19.38 ms (news), 15.05 ms (services), and 17.58 ms (search).

**Negative control: PASS (expected benchmark failure).** With `LOAD_MOCK_DELAY_MS=250`, `LOAD_SECONDS=8`, `LOAD_RATES=10`, the runner produced 20 samples per endpoint, p95 257.90–260.78 ms, no HTTP errors, and exited 1. Run this with a separate `LOAD_OUTPUT` to retain the baseline. Clear these environment variables afterward. This verifies a slow backend cannot receive a passing result just because HTTP status is 200.

Additional validation: backend lint passes; full backend suite passes 54 Jest and 57 Node HTTP/integration tests, with four existing payment webhook TODOs. The load-metric regression test passes, including the exact 200 ms boundary, errors, dropped arrivals, and insufficient samples.

A separate local HTTP server returning 429 exercised the external-target code path: all 80 measured requests were correctly recorded as failures and the runner exited 1 despite p95 below 6 ms. This is a throttle negative control, not staging performance evidence.

## Bottleneck and follow-up tickets

These are repository-local tracking tickets; no new GitHub issue or parent status change has been published.

| ID / owner | Evidence and status | Action / closure condition |
| --- | --- | --- |
| PERF-01 / QA + deployment | **Open: staging evidence missing.** No target supplied; fixed-delay results cannot establish the real dependency budget. | Run staging sequence above, attach raw results and topology, require all four endpoints below the p95 target with no failures/drops. Reconcile parent #56 status with this evidence. |
| PERF-02 / backend + database | **Open: candidate database bottleneck, not measured.** Content lists request exact counts plus full content fields and use offset pagination; search computes ranks/facets over matches. Local fixtures cannot expose table-size or deep-page costs. | Profile representative datasets with query plans and HTTP measurements; if over budget, optimize the demonstrated query/index/payload bottleneck without changing pagination or publication semantics. Close with measured results or linked implementation tickets. |
| PERF-03 / QA | **Handled in harness: rate-limit measurement trap.** All four routes share 120 public reads/minute/IP; a single-source high-rate test measures throttling. | Local multi-client fixture retains real guards; staging uses actual distributed sources. 429s remain failures and cannot inflate successful throughput. Revisit only if deployment proxy/IP attribution differs. |

No production performance change was justified by the local measurements. Full acceptance remains pending PERF-01 and PERF-02; local mock success alone must not close them.
