# 16 — Free-tier budget and zero-spend operating plan

> Snapshot verified against official documentation on 2026-08-19. Provider limits and billing change; recheck before deployment. The internal budgets below are deliberately lower than provider ceilings.

## Current external ceilings used for planning

### Cloudflare Workers Free

- 100,000 requests/day;
- 10 ms CPU time per HTTP request;
- 128 MB memory;
- 3 MB Worker size;
- 50 subrequests/request.

### Cloudflare D1 on Workers Free

- 5 million rows read/day;
- 100,000 rows written/day;
- 5 GB total storage.

Rows scanned count even when a query returns few results, so indexes and bounded queries are part of the cost model.

### Cloudflare R2 Standard free tier

- 10 GB-month storage/month;
- 1 million Class A operations/month;
- 10 million Class B operations/month;
- Internet egress listed as free.

R2 is deferred initially. Static delivery bundled with the Worker/build should be evaluated first.

### GitHub Free personal account

- unlimited public repositories and unlimited private repositories with a limited feature set;
- 2,000 GitHub Actions minutes/month;
- 500 MB shared Actions artifact/Packages storage;
- 10 GB Actions cache per repository.

Public standard-runner Actions are listed as free, but the project should remain private initially and keep CI small.

## Internal prototype budgets

| Resource               | Internal warning | Hard application action                                                   |
| ---------------------- | ---------------: | ------------------------------------------------------------------------- |
| Worker requests/day    |           50,000 | degrade non-core feeds at 65,000; read-only at 80,000                     |
| Worker CPU/request p95 |             5 ms | reject/optimize endpoints approaching 8 ms                                |
| D1 rows read/day       |        2,000,000 | disable broad search/feed at 3,000,000                                    |
| D1 rows written/day    |           40,000 | rate-limit social/low-value writes at 55,000; read-only economy at 70,000 |
| D1 storage             |             2 GB | archive/review at 3 GB; no uncontrolled event payloads                    |
| R2 storage             |             5 GB | no new upload path without review                                         |
| R2 Class B/month       |        2,000,000 | cache/resize/review before 5,000,000                                      |
| GitHub Actions/month   |          600 min | reduce matrix/E2E frequency before 1,000 min                              |
| Actions artifacts      |  100 MB retained | short retention; no bulky screenshots/videos by default                   |

The application cannot know all provider-account totals perfectly. Operational thresholds combine application counters, provider analytics, and manual dashboard checks.

The preview Worker intentionally uses a more conservative fast kill switch than the planning table:
50,000 requests and 40,000 writes per window, with degraded mode at 32,500/28,000 and read-only
mode at 40,000/36,000. These are per-isolate application safeguards, not a replacement for
account-wide Cloudflare analytics or D1 usage checks.

## Illustrative closed-alpha capacity model

For 200 daily active players:

- 100 Worker requests/player/day → 20,000 requests/day;
- 30 authoritative mutations/player/day;
- average 5 D1 written rows/mutation → 30,000 rows written/day;
- 100 bounded queries/player/day scanning average 20 rows → 400,000 rows read/day.

This is only an engineering scenario. Actual instrumentation must measure D1 metadata and request patterns. The write budget is the likely early constraint because idempotency, ledger, and state updates create multiple rows per mutation.

## Design tactics

- Cache immutable content and version manifests.
- Fetch one consolidated player-page view instead of many tiny API calls.
- Use indexed cursor pagination; never unbounded `SELECT *` feeds.
- Store bounded structured ledger metadata, not full response/log blobs.
- Batch non-critical analytics or omit them during alpha.
- Rate-limit by action class; expensive actions receive lower caps.
- Serve responsive compressed still images and avoid user uploads.
- Separate content reads from authoritative writes.
- Stop auto-repeat on inventory full/rare drop/low health to reduce accidental loops.
- Keep CI on Linux, cancel superseded runs, and run full E2E on key branches only.

## Operational modes

1. **Normal:** all approved features.
2. **Degraded:** core exploration/combat remains; discovery feed, broad search, nonessential telemetry reduced.
3. **Read-only:** players can view state/codex; all value/social mutations blocked safely.
4. **Maintenance:** static status and recovery information only.

Each mode is server-controlled, audited, tested, and visually explicit. The owner can force a mode without deploying code.

## Billing safety

- Do not attach paid plans, larger runners, extra storage, or third-party paid monitoring without explicit owner approval.
- Configure provider budgets/alerts where available.
- If no valid payment method is desired, verify provider behavior at quota exhaustion rather than assuming no charge.
- Recheck limits before invite alpha and public alpha, then record the date in this document.
