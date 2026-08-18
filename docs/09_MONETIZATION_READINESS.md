# 09 — Monetization readiness without launch monetization

## Launch rule

All monetization is disabled:

```json
{
  "monetization.enabled": false,
  "ads.enabled": false,
  "supporterShop.enabled": false
}
```

No task may flip these flags without a dedicated ADR, owner approval, legal/privacy review, and platform-policy review.

## Architectural seam

Create a bounded `entitlements` capability that can answer presentation-only questions such as supporter badge, profile frame, extra cosmetic preset slots, or sponsor acknowledgment. It must not be imported by combat resolution, loot generation, drop rates, stat calculation, crafting power, market eligibility, or matchmaking.

## Acceptable future routes to evaluate

1. **Voluntary supporter membership** — profile badge, cosmetic themes, supporter credits, development posts.
2. **Direct cosmetic purchases** — non-tradeable frames, UI skins, general/suggestive-equivalent costumes with no stats.
3. **Sponsor/creator support** — transparent, limited, non-gameplay acknowledgments.
4. **Donations/crowdfunding** — clear that support does not buy power or ownership.
5. **Carefully placed advertising** — only after traffic, privacy, content classification, and network policy review.

## Prohibited routes

- paid random rare cards or loot boxes;
- premium-only combat stats, drop rate, stamina, inventory safety, or market priority;
- purchasing tradeable gameplay currency;
- selling scarcity that can be cashed out through player trade;
- sexual-content upsells;
- dark-pattern subscriptions, disguised ads, forced video, or accidental-click placement.

## Reserved UI areas

The layout may define named slots such as `supporter-callout` or `sponsor-footer`, but they render nothing when disabled and must not leave blank gaps. Core controls never move when monetization is toggled.

## Data isolation

- Payments, if added, use a processor-hosted flow; do not store card data.
- Store processor customer/transaction references separately from game balances.
- Entitlement grants are idempotent and append-only/audited.
- Refund/revocation does not mutate historical combat results.
- No purchase event enters player-to-player trade.

## Ad readiness checklist

Before ads:

- recheck current network publisher/content policies;
- classify general vs suggestive pages and guarantee safe asset selection;
- consent/privacy implementation for target regions;
- no ads near destructive or purchase-like controls;
- frequency and layout limits;
- accessibility labels and no deceptive styling;
- revenue/cost model showing ads are worth complexity;
- kill switch and fallback layout.

## Business success guardrail

A monetization proposal must state how it preserves fairness, nostalgia, low-friction play, adult-content boundaries, and market integrity. “It makes money” is not sufficient acceptance evidence.
