# Campaign Analytics — Architecture (Phase 10, design only)

Status: **not implemented**. This document describes what a future phase
would build. It commits to no schema, no tracking code, no admin UI — Phase
10 of the Campaign & Promotion Management System was explicitly scoped as
"architecture-only, lowest priority," and this is that architecture.

## Where things stand today

Confirmed by reading the code, not assumed:

- `app/admin/analytics/page.tsx` is a 12-line stub rendering `<ComingSoon>`.
  No queries, no data, matches the sidebar's "Soon" badge.
- `components/analytics/GoogleAnalytics.tsx` / `MetaPixel.tsx` are page-view
  only — a `gtag('config', ...)` call and an `fbq('track', 'PageView')`
  call, nothing else. No custom events anywhere in the app, campaign or
  otherwise.
- `campaigns` / `campaign_items` have no engagement columns (no view/click
  counters). The only `view_count` in the schema is on `products`, for the
  unrelated "Most Popular" sort — not reusable here.
- **`order_items.campaign_id`** (added in Phase 6's `create_order_atomic`
  rewrite) is already written correctly on every order line where a campaign
  actually won the price — and is read by literally nothing today. It just
  sits there, accurate, unused.

That last point is the most important finding in this document: the hardest
part of campaign analytics — knowing with certainty which purchases a
campaign actually caused — is **already solved**, as a side effect of Phase
6 doing pricing correctly. Nothing below has to solve attribution; it only
has to report on it, and optionally add the funnel stages that lead up to it.

## Goals

What a finished version of this should be able to answer:

- Revenue and order count attributable to a given campaign.
- Which products within a campaign actually sold, and how much.
- Conversion rate from "saw the campaign" to "bought something from it."
- Whether the homepage banner / shop badge is driving traffic to the
  campaign page at all.

## Phase 10a — the free one

A campaign revenue report needs **no new schema and no new tracking**. It's
a query over data that already exists:

```sql
select
  c.id, c.name, c.slug,
  count(distinct oi.order_id) as order_count,
  sum(oi.subtotal) as campaign_revenue
from order_items oi
join campaigns c on c.id = oi.campaign_id
join orders o on o.id = oi.order_id
where oi.campaign_id is not null
  and o.order_status not in ('cancelled', 'returned') -- same exclusion
                                                        -- app/admin/page.tsx's
                                                        -- own revenue cards
                                                        -- already use
group by c.id, c.name, c.slug
order by campaign_revenue desc;
```

This is deliberately called out as its own increment because it's
implementable in isolation, at any time, independent of everything else in
this document — a single query plus a page that replaces the `<ComingSoon>`
stub, following the same "parallel head-count/aggregate queries" pattern
`app/admin/page.tsx` already uses for its dashboard cards, and the
`getAdminOrderStatusCounts`-style pattern in `lib/admin/orders-query.ts`.

## Event taxonomy (beyond what's already free)

Everything past purchase requires new tracking. The events worth adding, in
priority order:

1. **Campaign click** — a banner (homepage) or badge (shop card) was
   clicked, navigating toward `/campaign/[slug]` or a product page.
2. **Campaign impression** — a banner or badge actually rendered in view.
3. **Campaign add-to-cart** — a campaign-priced variant was added to cart.

Purchase is intentionally not in this list — see Phase 10a above.

## Two collection paths — a real trade-off, not a default answer

**Path A: GA4 / Meta Pixel custom events.**
Lowest implementation cost — extend the existing `GoogleAnalytics.tsx` /
`MetaPixel.tsx` components (or fire events from the specific components that
already exist: `CampaignBanner.tsx`, the shop card, `AddToCartForm.tsx`) with
a few `gtag('event', ...)` / `fbq('trackCustom', ...)` calls carrying
`campaign_id`. The catch: this data lives in Google's and Meta's own
dashboards. `/admin/analytics` can't query it without integrating their
reporting APIs (GA4 Data API, Meta Marketing API) — a separate, materially
heavier piece of work than the tracking calls themselves, with its own auth
and quota concerns.

**Path B: a first-party `campaign_events` table.**
Enables real in-app reporting on `/admin/analytics`, which is what the
existing stub's placement (inside the same admin panel as everything else)
seems to intend. Sketch, not a migration:

```sql
-- NOT a migration -- illustrative only.
create table campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click', 'add_to_cart')),
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  session_id text, -- client-generated, not auth-bound -- most visitors are guests
  created_at timestamptz not null default now()
);
create index campaign_events_campaign_id_idx on campaign_events(campaign_id);
create index campaign_events_created_at_idx on campaign_events(created_at);
```

Cost: this is an append-only table that grows with traffic, needs its own
write path (a lightweight API route or server action, since these fire from
anonymous/guest sessions on public pages), and needs a retention/rollup
story once volume grows (raw events aren't meant to be queried forever —
eventually rolled up into daily per-campaign counts, the same shape the
Phase 10a query already returns for purchases).

Nothing here mandates one path over the other. A pragmatic reading: start
with 10a (free), add Path B's `click` and `add_to_cart` events next (cheap,
high-signal, low-volume relative to impressions), and only take on Path A or
impression-level Path B tracking if the funnel data actually gets used.

## Attribution rule

"Campaign-attributed" means exactly one thing in this system: an
`order_items` row where `campaign_id is not null` — i.e. the variant was
genuinely campaign-priced at the moment the order was placed, independently
re-derived server-side by `create_order_atomic` (never trusted from the
client, per the pricing-integrity principle this entire system was built on).

This deliberately avoids the fuzzy "last click wins," multi-touch, or
cross-session attribution problems typical marketing analytics has to solve
— there's no ambiguity about whether a purchase "counts," because the price
itself is the proof. Any future event-based funnel data (impression → click
→ add-to-cart) is additive context on top of this, never a replacement for
it, and never itself the source of a revenue number.

## Performance/reliability notes

If Path B is ever built, impression tracking specifically must not:
- Block page render or paint (fire after the page is interactive).
- Add a request-per-impression cost on high-traffic pages like the homepage
  or `/shop` — batch client-side and flush via `navigator.sendBeacon` (fire-
  and-forget, survives page unload) rather than one request per banner view.

Click and add-to-cart events are naturally much lower-volume (one per actual
interaction, not one per render) and don't need this treatment.

## Suggested phasing

1. **10a — revenue-by-campaign report.** Zero new schema. The query above,
   an admin page replacing the `<ComingSoon>` stub. Immediate value.
2. **10b — click + add-to-cart tracking.** Path B table, written from
   wherever `<CampaignBanner>` gets wrapped in a `<Link>` today (it has no
   click handling of its own — `app/page.tsx` supplies the `<Link>` for the
   homepage banner; the shop/PDP campaign badge would need the same
   treatment) and from `AddToCartForm.tsx`'s existing submit path.
   `AddToCartForm.tsx` itself only calls `getVariantPrice`
   today (the number, not the source) — but its parent,
   `ProductPurchaseSection.tsx`, already computes `priceBand` via
   `resolveEffectivePriceBand`, which does expose `campaignId`/`priceSource`.
   That value would need to be passed down as a prop rather than
   re-derived, so `AddToCartForm` never duplicates that logic itself. Low
   volume, high signal.
3. **10c — impression tracking.** The higher-effort, higher-volume piece —
   only worth it once 10b's data is actually informing decisions.
4. **10d — funnel/conversion reporting.** Impressions → clicks → add-to-cart
   → purchase (10a), as rates, on `/admin/analytics`. The payoff step; only
   possible once 10a–10c exist.

Each step stands alone and ships real value on its own — none of this
requires committing to the full pipeline up front.
