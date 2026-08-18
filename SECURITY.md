# Security policy

Until public alpha, report vulnerabilities privately to the repository owner rather than opening public issues.

## High-risk areas

- authentication/session fixation;
- replay and duplicate economy mutations;
- item or currency duplication;
- client-authoritative combat or loot;
- market escrow bypass;
- moderation evasion and stored XSS;
- content upload provenance;
- secrets in logs or preview deployments;
- cost-exhaustion attacks against free-tier infrastructure.

## Baseline controls

- server-authoritative state transitions;
- idempotency keys on mutations;
- rate limits by account, session, IP risk bucket, and action class;
- strict output encoding and sanitization for player text;
- append-only audit/ledger events;
- least-privilege service bindings;
- no production secrets in GitHub Actions logs;
- kill switches for exploration, market, posting, and asset upload.
