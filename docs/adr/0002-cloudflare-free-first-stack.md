# ADR 0002 — Cloudflare free-first stack

- Status: Accepted for prototype; review before public alpha
- Date: 2026-08-19

## Context
The owner wants friends to play without initial hosting expense. The game is low-bandwidth and request/DB oriented.

## Decision
Use React/Vite, Hono on Cloudflare Workers, D1, and later R2 only if needed. Pin versions during bootstrap. Add usage budgets, rate limits, and normal/degraded/read-only/maintenance modes.

## Consequences
No always-on VM is required, but free tiers are not guarantees. D1 query/index discipline and operational caps are mandatory. Paid resource bindings require owner approval and an ADR.
