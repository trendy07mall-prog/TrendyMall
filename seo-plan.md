# TrendyMall — SEO Footer & On-Page Plan

**Status: discussion draft. Nothing has been implemented. No files were changed to produce this.**
Prepared 2 Oct 2026, from the live site and the production database — not from assumptions.

---

## 0. Read this first: three findings that change the plan

Before any footer design, three facts from the actual project override parts of your brief.

### Finding 1 — Your category links are invisible to Google on almost every page

The header "Categories" mega-menu is a client component gated behind React state
(`components/layout/NavbarClient.tsx:482` — `{categoriesOpen && ...}`). Its links only exist
after a click. They are **not in the HTML Google receives**.

Count of `/category/...` links present in the raw server HTML:

| Page | Crawlable category links |
|---|---|
| `/` (homepage) | **8** — the "Explore by Category" carousel, root categories only |
| `/about` | 5 |
| `/product/...` | 2 (breadcrumb only) |
| `/category/...` | 1 |
| `/shop` | **0** |
| `/new-arrivals` | **0** |
| `/faq`, policy pages | **0** |

So the eight categories that actually hold your products — earbuds, headphones, neckband
earphones, portable speakers, power banks, trimmers, mouse, tool sets — have **zero crawlable
internal links from anywhere on the site**. Google only finds them through `sitemap.xml`.
Worse, `/shop`, the natural hub for categories, links to none of them.

**This is the single strongest argument for your footer idea, and it is a real bug, not a
theory.** Your instinct is correct.

### Finding 2 — You have 23 category pages for 20 products

More shelves than stock. Published products: **20**. Categories: **23**. The real tree:

```
electronic ............................ 12 products (hub)
  earphones ...........................  8
    earbuds ...........................  4
    headsets-headphones ...............  3
    neck-band-in-ear-earbuds ..........  1
  speakers ............................  4
    portable-speakers .................  4
mobile-accessories ....................  3
  power-bank ..........................  3
health-beauty .........................  3
  men-s-care ..........................  3
    shaving-grooming ..................  3
      trimmers-groomers-clippers ......  3
computers-laptops .....................  1
  computer-accessories ................  1
    mouse .............................  1
tools-diy-outdoor .....................  1
  hand-tools ..........................  1
    tools-set .........................  1
digital-goods .........................  0   <- empty, indexable, in sitemap
mobiles-tablets .......................  0   <- empty, indexable, in sitemap
watches-sunglasses-jewellery ..........  0   <- empty, indexable, in sitemap
  watches .............................  0   <- empty, indexable, in sitemap
```

Read the chains. `health-beauty`, `men-s-care`, `shaving-grooming` and
`trimmers-groomers-clippers` are **four separate indexable URLs showing the same three
trimmers**. `mobile-accessories` and `power-bank` show the same three power banks.
`speakers` and `portable-speakers` show the same four speakers. That is classic
duplicate/thin content, and it exists today.

**Adding footer links to these pages before fixing them would make the problem worse, not
better** — you would be pointing Google at the duplicates more firmly. This is why your
instinct to do the on-page work first is right.

### Finding 3 — Your brief's product list does not match the catalogue

You listed chargers, cables, gaming accessories and "tools" as focus areas. In the database:

| You listed | Reality |
|---|---|
| Earbuds / headphones | ✅ 8 products — your strongest area |
| Bluetooth speakers | ✅ 4 products |
| Power banks | ✅ 3 products |
| Trimmers & grooming | ✅ 3 products |
| **Chargers** | ❌ no category, no products |
| **Cables** | ❌ no category, no products |
| **Gaming accessories** | ❌ no category (two headsets are named "gaming") |
| Tools | ⚠️ 1 product (a socket set) |
| Mobile accessories (as a whole) | ⚠️ the root category holds **only power banks** |

Your live homepage meta description currently promises **"chargers … phone cases"**. You sell
neither. Under your own Truth Rule (D) that has to change regardless of the footer.

Audio is 12 of your 20 products — **60% of the catalogue**. That is where you can realistically
win, and the plan below leans into it.

---

## 1. Current architecture analysis

### 1.1 Public routes (actual, from the file system)

| Type | Routes |
|---|---|
| Home / browse | `/`, `/shop`, `/new-arrivals`, `/combo-deals`, `/search` |
| Category | `/category/[...slug]` — catch-all, 23 categories |
| Product | `/product/[slug]` — 20 published |
| Brand | `/brands`, `/brand/[slug]` — 13 brands (3 now empty) |
| Campaign | `/campaign/[slug]` — **1 published** (`big-bang-flash-sale`, ends 9 Oct 2026) |
| Content | `/about`, `/contact`, `/faq`, `/track-order`, `/coupons` |
| Policy | `/shipping`, `/returns`, `/warranty`, `/privacy`, `/terms` |
| Account / funnel | `/cart`, `/checkout`, `/login`, `/signup`, `/wishlist`, `/account/*`, `/order-confirmation/*` |
| Admin | `/admin/*` (56 routes, disallowed in robots) |

There is **no** `/best-sellers` route, **no** `/tag/[slug]` route, and **no** buying-guide or
blog route. Tags exist in the DB (`best-seller`, `featured`, `new-arrival`, `flash-sale`) but
only as filters (`?tag=`), not as pages.

### 1.2 Category URL and canonical behaviour (this part is well built)

`app/category/[...slug]/page.tsx` resolves on the **last** URL segment only, and always emits
a single-segment canonical:

- `/category/health-beauty/men-s-care/shaving-grooming/trimmers-groomers-clippers`
- → canonical `/category/trimmers-groomers-clippers`

The sitemap emits the same single-segment form. Filters and pagination self-canonicalise
correctly — verified live:

| URL | Canonical |
|---|---|
| `/category/power-bank?sort=price_asc` | `/category/power-bank` |
| `/category/power-bank?page=2` | `/category/power-bank` |
| `/shop?sort=newest` | `/shop` |
| `/search?q=earbuds` | `/search` |

**No action needed here.** This is already correct and we must not break it.

### 1.3 How titles and descriptions are generated today

Three layers, in priority order:

1. **Site-wide default — database.** `app/layout.tsx` `generateMetadata()` reads
   `getCachedSeoSettings()`. Current DB values (`store_settings`):
   - `seo.site_title_default` = `Premium Mobile Phone Accessories | TrendyMall Sri Lanka`
   - `seo.title_template` = `%s | TrendyMall`
   - `seo.meta_description` = `Shop premium mobile phone accessories in Sri Lanka including chargers, earphones, power banks, phone cases, and more. Fast islandwide delivery and Cash on Delivery available.`
   - `seo.og_image_url` = *(empty — falls back to the generated `opengraph-image`)*

   **These are editable in the admin UI at `/admin/settings/seo` — no deploy needed.**

2. **Per-page static exports — code.** `/shop`, `/new-arrivals`, `/combo-deals`, `/about`,
   `/faq`, `/search`, `/brands`, `/coupons`, `/track-order` and all five policy pages use
   `export const metadata` (or a small `generateMetadata`). **Changing these needs a deploy.**

3. **Per-item templates — code + database.** Product, category, brand and campaign pages build
   their metadata in `generateMetadata` from DB columns:
   - Product: `products.meta_title`, `meta_description` (admin-editable per product)
   - Category: `categories.description` only — **the title is hard-coded as
     `` `${category.name} Accessories` `` ** (`app/category/[...slug]/page.tsx:42`)
   - Campaign: DB fields, already good

**Safe-change summary:** homepage and product-level text can be changed from the admin UI with
no deploy. Category titles, `/shop`, and the H1 structure need code changes.

### 1.4 Current on-page state (measured live, 2 Oct 2026)

| Page | Title (len) | Desc (len) | H1 | Problem |
|---|---|---|---|---|
| `/` | Premium Mobile Phone Accessories \| TrendyMall Sri Lanka (55) | 174 | **none (H1×0)** | No H1 at all; desc too long and names products you don't sell |
| `/shop` | Shop All Accessories \| TrendyMall (33) | 114 | **none (H1×0)** | No H1; zero category links |
| `/new-arrivals` | New Arrivals \| TrendyMall (25) | 56 | New Arrivals | Desc very thin |
| `/combo-deals` | Combo Deals \| TrendyMall (24) | 189 | Combo Deals | Desc over 155, will truncate |
| `/category/power-bank` | **Power Bank Accessories** \| TrendyMall (35) | 42 | Power Bank | Wrong phrasing; boilerplate desc |
| `/category/mobile-accessories` | **Mobile Accessories Accessories** \| TrendyMall (43) | 50 | Mobile Accessories | Duplicated word — visible in Google |
| `/category/mouse` | **Mouse Accessories** \| TrendyMall (30) | 37 | Mouse | Nonsense phrasing |
| `/category/earbuds` | Earbuds Accessories \| TrendyMall (32) | 39 | Earbuds | Boilerplate desc, no "Sri Lanka" |
| `/product/...power-bank-5000mah` | 5000mAh Magnetic Wireless Power Bank **\| TrendyMall \| TrendyMall** (62) | 131 | product name | **Suffix duplicated** |
| `/campaign/big-bang-flash-sale` | Big Bang Flash Sale \| Power Banks & Trimmers \| TrendyMall (61) | 150 | Big Bang Flash Sale | Slightly over 60 |
| `/about` | About TrendyMall \| Fair Pricing & Trusted Online Shopping in Sri Lanka \| TrendyMall (87) | 147 | Built for better value… | Title far too long; H1 has no keyword |
| `/search?q=…` | Search Results \| TrendyMall (27) | *(site default)* | Search results for "…" | **Indexable** — should not be |
| `/brand/vendens` | Vendens Accessories in Sri Lanka \| TrendyMall (45) | 108 | Vendens | `noindex, follow` (deliberate) |

Every category description except two (`electronic`, `speakers`) is the same auto-generated
sentence: *"Shop {name} accessories at TrendyMall."* — 20 near-identical descriptions.

### 1.5 Sitemap (`app/sitemap.ts`)

Includes: `/`, `/shop`, `/new-arrivals`, `/combo-deals`, `/about`, `/contact`, `/faq`,
`/track-order`, the 5 policy pages, **all 23 categories**, all products, all campaigns.
Uses real `lastModified` where a real timestamp exists — well built.

**Gaps:** `/brands` and `/coupons` are missing. All 4 empty categories and all 9
duplicate-chain categories *are* included, so the sitemap is actively pushing Google toward
thin pages.

### 1.6 robots.txt (`app/robots.ts`)

Allows everything except `/admin`, `/account`, `/checkout`, `/cart`. `/search` is **not**
disallowed and has no `noindex`. `/wishlist` is neither disallowed nor noindexed.

### 1.7 Structured data (JSON-LD)

| Schema | Where | Status |
|---|---|---|
| `Organization` + `ContactPoint` | root layout, every page | ✅ good |
| `Product` + `Offer` + `Brand` + `AggregateRating` | product pages | ✅ good |
| `BreadcrumbList` | `components/product/Breadcrumbs.tsx` (product, category, shop) | ✅ good |
| `CollectionPage` | campaign pages | ✅ ok |
| `WebSite` + `SearchAction` | — | ❌ missing (sitelinks search box) |
| `FAQPage` | `/faq` has 4 H2 question groups | ❌ missing — a free rich result |
| `ItemList` | category / shop grids | ❌ missing |
| `LocalBusiness` / `Store` | you have a real pickup address | ❌ missing |

### 1.8 Current footer (`components/layout/Footer.tsx`, 247 lines)

Server component, async, already reads 5 data sources in one `Promise.all`. Four columns:

1. Logo, tagline, three trust lines (COD / islandwide / 48-hour returns), social icons
2. **Company** — 9 links: About, Contact, Shipping, Returns, Warranty, FAQ, Track Order, Privacy, Terms
3. **Customer Service** — WhatsApp, phone, email, address, hours
4. **Stay Updated** — newsletter (the one client component)

Plus copyright and payment badges. Navy gradient `#0F2D52 → #173f70`.

**There is not a single category or product link in the footer.** That is the gap.

### 1.9 Internal link volume (live)

| Page | Total internal links | Unique | Category | Product |
|---|---|---|---|---|
| `/` | 111 | 67 | 8 | 22 |
| `/shop` | 97 | 47 | **0** | 20 |
| `/category/power-bank` | 40 | 26 | 1 | 3 |
| `/product/...` | 42 | 26 | 2 | 2 |

Healthy numbers — we have room to add ~12 footer links without bloat.

### 1.10 Related defect found while checking (relevant to any restructure)

`/category/tools` is supposed to redirect to `/category/tools-diy-outdoor`. It returns
**HTTP 200 with a `<meta http-equiv="refresh">`**, not a 301/308 — the same defect just fixed
for product URLs in commit `9bcb8ca`, same cause (`loading.tsx` makes the route stream before
the status code can be set). There are 2 rows in `category_slug_redirects`.

**This matters because if you ever restructure categories, the old URLs will not pass their
ranking to the new ones until this is fixed the same way.** Fix is small and already proven.

---

## 2. Primary keyword & on-page work (Addition A) — do this BEFORE the footer

Why first: the footer's job is to send authority to category pages. Sending authority to pages
with broken titles, no H1 and duplicate twins wastes it.

### 2.1 Homepage primary keyword — a caveat on your suggestion

You suggested **"mobile accessories Sri Lanka"**. I recommend keeping it, with one warning:

It collides with `/category/mobile-accessories`, which holds **only 3 power banks**. Two URLs
competing for one phrase is keyword cannibalisation, and the weaker page (a 3-product category)
can outrank the homepage, which looks broken to a shopper.

Two ways out — your call (see §12, Decision 1):

- **Option A (recommended, no URL changes):** homepage owns "mobile accessories Sri Lanka";
  `/category/mobile-accessories` is set to `noindex, follow` because it duplicates
  `/category/power-bank` anyway. One line of code, zero risk.
- **Option B (bigger, better long term):** restructure so Mobile Accessories is a genuine hub
  containing audio, power banks and future chargers/cables. This changes category URLs, needs
  the redirect fix from §1.10 first, and is a content decision, not a code one.

Also honest: with 20 products, "mobile accessories Sri Lanka" is a head term you will not rank
for soon — Daraz, ikman and Singer sit on it. The homepage should target it for brand/topical
clarity, while **the realistic traffic comes from the four category pages below.**

### 2.2 Proposed titles, descriptions and H1s

Title template is `%s | TrendyMall` (13 characters), so each page's own title must be ≤47
characters to stay under 60 total. All proposals below respect that, respect your Brand Rule (B)
and your Truth Rule (D).

| Page | Primary keyword | Proposed title (full length) | Proposed meta description (len) | Proposed H1 |
|---|---|---|---|---|
| `/` | mobile accessories Sri Lanka | `Mobile Accessories Sri Lanka \| TrendyMall` (41) | Shop wireless earbuds, Bluetooth speakers, power banks and hair trimmers in Sri Lanka. Cash on Delivery and islandwide delivery from Rs 255. (139) | **Add:** `Mobile Accessories in Sri Lanka` |
| `/shop` | buy mobile accessories online Sri Lanka | `Shop All Products \| TrendyMall` (30) | Browse every TrendyMall product — earbuds, headphones, Bluetooth speakers, power banks, trimmers and more, with islandwide delivery. (131) | **Promote existing H2 →** `Shop All Products` |
| `/category/earbuds` | wireless earbuds price in Sri Lanka | `Wireless Earbuds Price in Sri Lanka \| TrendyMall` (48) | Buy wireless Bluetooth earbuds in Sri Lanka with charging cases, touch controls and built-in mics. Cash on Delivery, islandwide delivery. (136) | `Wireless Earbuds in Sri Lanka` |
| `/category/portable-speakers` | bluetooth speaker price in Sri Lanka | `Bluetooth Speaker Price in Sri Lanka \| TrendyMall` (49) | Buy portable Bluetooth speakers in Sri Lanka — deep bass, rechargeable battery, and models with a wireless mic for karaoke. (122) | `Bluetooth Speakers in Sri Lanka` |
| `/category/power-bank` | power bank price in Sri Lanka | `Power Bank Price in Sri Lanka \| TrendyMall` (42) | Buy power banks in Sri Lanka from 5000mAh to 10000mAh, including fast-charging and magnetic wireless models. Cash on Delivery available. (135) | `Power Banks in Sri Lanka` |
| `/category/headsets-headphones` | headphones price in Sri Lanka | `Headphones Price in Sri Lanka \| TrendyMall` (42) | Buy wireless Bluetooth headphones in Sri Lanka — foldable over-ear designs with a built-in mic for calls and gaming. (115) | `Headphones in Sri Lanka` |
| `/category/trimmers-groomers-clippers` | hair trimmer price in Sri Lanka | `Hair Trimmer Price in Sri Lanka \| TrendyMall` (44) | Buy rechargeable hair trimmers and clippers in Sri Lanka for beard, hair and body grooming. Cash on Delivery and islandwide delivery. (132) | `Hair Trimmers & Clippers in Sri Lanka` |
| `/category/earphones` | earphones Sri Lanka | `Earphones and Earbuds in Sri Lanka \| TrendyMall` (47) | Browse every earphone at TrendyMall — wireless earbuds, over-ear headphones and magnetic neckband models, with islandwide delivery. (130) | `Earphones & Earbuds in Sri Lanka` |
| `/category/electronic` | electronics Sri Lanka | `Audio and Electronics in Sri Lanka \| TrendyMall` (47) | Earbuds, headphones and Bluetooth speakers at TrendyMall Sri Lanka. Cash on Delivery, islandwide delivery, 48-hour return window. (128) | `Audio & Electronics` |
| `/combo-deals` | combo deals Sri Lanka | `Combo Deals and Bundle Offers \| TrendyMall` (42) | Handpicked product bundles priced lower than buying the items separately. Cash on Delivery and islandwide delivery in Sri Lanka. (127) | keep `Combo Deals` |
| `/new-arrivals` | new arrivals | `New Arrivals \| TrendyMall` (25) keep | The newest earbuds, speakers, power banks and grooming products added to TrendyMall, with islandwide delivery across Sri Lanka. (125) | keep |
| `/campaign/[slug]` | per campaign | DB-driven; **cap the template at 47 chars** | DB-driven (current one is fine) | keep campaign name |
| `/product/[slug]` | product name + "price in Sri Lanka" | **Fix the double `\| TrendyMall`** — strip the suffix from `products.meta_title` or stop applying the template | keep DB value | keep product name |
| `/about` | about TrendyMall | shorten to `About TrendyMall \| TrendyMall` (29) | keep (147, fine) | `About TrendyMall` as H1, move the slogan to H2 |

**Category title pattern.** Rather than hard-coding 23 titles, change the one line that builds
them. Recommended rule:

```
title = category.seo_title ?? `${category.name} Price in Sri Lanka`
```

…but **only after** the "Accessories" suffix is removed, and with a per-category override so
"Mouse Price in Sri Lanka" and "Mobiles & Tablets Price in Sri Lanka" can be set sensibly or
noindexed. The cleanest version adds two optional columns to `categories`
(`seo_title`, `seo_description`), admin-editable, falling back to the pattern — same approach
`products` already uses. No existing logic changes.

### 2.3 Homepage H1 — two options

The homepage has **no H1**. The top of the page is an image carousel, so adding a visible
heading changes the design.

- **Option A (recommended, zero visual change):** a screen-reader-only H1
  (`class="sr-only"`) reading *"Mobile Accessories in Sri Lanka"*. Google reads it, nothing moves.
- **Option B (slightly stronger):** a small visible H1 above "Explore by Category".

An `sr-only` H1 is legitimate and common; it is only risky if the text contradicts the visible
page, which it would not here.

---

## 3. Thin-page & duplicate triage (Addition C) — the noindex list

Your Thin-Page Rule says ~5 live products minimum. Applied honestly to what exists:

**No collection page qualifies today.** Best leaf categories are earbuds (4) and portable
speakers (4). Power banks total **3**, so *10,000mAh Power Banks*, *20,000mAh Power Banks* and
*Fast-Charging Power Banks* are all **out** — a 1–2 product page is exactly the fake SEO page
you said you don't want. Revisit when any group passes 5.

Recommended treatment of the 23 existing category pages:

| Keep indexable (7) | Products | Why |
|---|---|---|
| `electronic` | 12 | genuine hub, most products on site |
| `earphones` | 8 | genuine hub over 3 distinct children |
| `earbuds` | 4 | distinct product type, real demand |
| `portable-speakers` | 4 | distinct product type, real demand |
| `power-bank` | 3 | distinct product type, strong keyword |
| `headsets-headphones` | 3 | distinct product type |
| `trimmers-groomers-clippers` | 3 | distinct product type, different audience |

| Set `noindex, follow` (12) | Reason |
|---|---|
| `mobile-accessories` | duplicate of `power-bank` (same 3 products) |
| `speakers` | duplicate of `portable-speakers` (same 4 products) |
| `health-beauty`, `men-s-care`, `shaving-grooming` | three duplicates of `trimmers-groomers-clippers` |
| `computers-laptops`, `computer-accessories` | duplicates of `mouse` (1 product) |
| `tools-diy-outdoor`, `hand-tools` | duplicates of `tools-set` (1 product) |
| `mouse`, `tools-set`, `neck-band-in-ear-earbuds` | 1 product each — too thin to rank, fine to keep live for shoppers |

| Set `noindex` + remove from sitemap (4) | Reason |
|---|---|
| `digital-goods`, `mobiles-tablets`, `watches-sunglasses-jewellery`, `watches` | **zero products** |

`noindex, follow` is the right choice (not `nofollow`, not removal): shoppers keep using the
pages and link equity still flows through them, but Google stops indexing near-identical copies.
Pair it with removing those URLs from `sitemap.ts`.

Also: **`/search` should be `noindex, follow`** and **`/wishlist` should be `noindex`**.
Search-result pages are the classic infinite-thin-page trap. Your canonical already points them
all at `/search`, which is good, but `noindex` is the correct signal.

---

## 4. Recommended SEO footer architecture

Given 20 products, the right answer is a footer **smaller and sharper than Daraz's**, in three
distinct layers. Daraz needs a keyword wall because it has millions of SKUs; copying that shape
at 20 SKUs reads as spam.

### Layer 1 — Category links inside the existing `<footer>`, on every page
The actual fix for Finding 1. One new column, ~10 links, server-rendered. Every page gains
crawlable paths to the seven commercial category pages.

### Layer 2 — A short prose block, homepage only
One natural paragraph plus 3–4 topic groups with a real link each. **Homepage only** — the same
paragraph on 50 pages is duplicate content and adds nothing.

### Layer 3 — Unique copy on each category page (the real lever)
150–250 unique words per category page, in the existing `categories.description` field. This is
worth more than the entire footer, because it is unique on-page content on the page you want to
rank, not boilerplate repeated site-wide. It is also where "power bank price in Sri Lanka",
"10000mAh", "fast charging" can appear **naturally**, in sentences, on the right page.

**Priority if you only do one thing: Layer 3, then Layer 1, then Layer 2.**

---

## 5. Internal-linking map

### Today (the problem)

```
Homepage ──► 8 ROOT categories (carousel)
   │              │
   │              └─► (roots are mostly empty pass-throughs)
   │
   ├──► /shop ──────► 20 products        [0 category links]
   ├──► /new-arrivals ─► products        [0 category links]
   └──► 22 products directly

The 7 categories that hold stock:  reachable only via sitemap.xml
                                   + 1 breadcrumb link from a product page
```

### Proposed

```
                              HOMEPAGE
                     (H1: Mobile Accessories in Sri Lanka)
                                  │
      ┌───────────────────────────┼───────────────────────────┐
      ▼                           ▼                           ▼
  FOOTER (every page)        HERO / CAROUSELS           /shop  /new-arrivals
  Shop by Category                 │                    /combo-deals
      │                            ▼                    /campaign/...
      │                      22 products
      ▼
  ┌──────────────────────────────────────────────────────────┐
  │  electronic (12) ─► earphones (8) ─┬─► earbuds (4)       │
  │                                    ├─► headphones (3)    │
  │                                    └─► neckband (1)      │
  │                  ─► portable-speakers (4)                │
  │  power-bank (3)                                          │
  │  trimmers-groomers-clippers (3)                          │
  └──────────────────────────────────────────────────────────┘
      │                              ▲
      ▼                              │
   PRODUCTS ───── breadcrumb ────────┘
      │
      └──► related products (same category)
```

**Why each edge exists:**

| Edge | Purpose |
|---|---|
| Footer → 7 categories, every page | Fixes Finding 1. Gives every category page a crawlable inbound link from ~35 pages instead of 0. |
| Footer → `/shop`, `/new-arrivals`, `/combo-deals` | Already exist in nav but not in HTML on all pages; cheap to make consistent. |
| Footer → policy pages | Already there. Trust signals Google associates with real shops. |
| Category → child category | Already there (`CategoryCard` on category pages). Defines the hierarchy. |
| Product → category (breadcrumb) | Already there. The single most valuable existing signal — it tells Google the product belongs to that category. |
| Category page prose → sibling category | **New, Layer 3.** In-content links carry far more weight than footer links. |
| Campaign → products | Already there. |

**Deliberately NOT linked:** `/cart`, `/checkout`, `/login`, `/signup`, `/wishlist`,
`/account/*` (no SEO value, already robots-disallowed), `/search?q=...` URLs, and the 16
noindexed category pages.

---

## 6. Keyword / topic strategy (your "Popular Searches" list, answered)

| Your keyword | Verdict | Where it goes |
|---|---|---|
| Power Banks in Sri Lanka | ✅ use | `/category/power-bank` |
| Power Bank **Price** in Sri Lanka | ⚠️ **don't link separately** | Same URL as the row above. Put it in the page **title** instead — done in §2.2 |
| Earbuds in Sri Lanka | ✅ use | `/category/earbuds` |
| Bluetooth Speakers in Sri Lanka | ✅ use | `/category/portable-speakers` |
| **Mobile Chargers in Sri Lanka** | ❌ **do not use** | No products. Advertising it is a dead end and, under your Truth Rule, dishonest. |
| **USB-C Cables in Sri Lanka** | ❌ **do not use** | No products. |
| Trimmers in Sri Lanka | ✅ use | `/category/trimmers-groomers-clippers` |
| Mobile Accessories in Sri Lanka | ⚠️ redirect intent | Homepage, **not** `/category/mobile-accessories` (only power banks there) |

### The honest recommendation: drop the "Popular Searches" section

After filtering against the real catalogue, every surviving keyword points to a URL the
"Shop by Category" column **already links to**. A second block of links to the same five URLs,
with keyword-stuffed anchors, is exactly the keyword wall you said you don't want — and
repeated site-wide it is the shape Google's spam systems look for.

**Instead:** the keyword variants live in the page titles, H1s and the Layer-3 category prose,
where they are content rather than anchors. Revisit a Popular Searches block when you have 100+
products across 10+ real categories.

### Anchor-text rule

Use plain human names in footer links — *"Power Banks"*, *"Wireless Earbuds"*,
*"Bluetooth Speakers"*. **Not** *"Power Bank Price in Sri Lanka"*. A keyword-exact anchor
repeated on every page of a 20-product site is an over-optimisation signal, and the ranking
benefit of site-wide footer anchors is small anyway. Keywords belong in titles and body copy.

### Brand Rule compliance (Addition B)

Never in footer copy, anchors, titles or new pages: **AirPods, Apple, Marshall, JBL, MagSafe,
Samsung, iPhone, Huawei, Airdots, EarPods**, or Lenovo applied to lookalike products.

Genuine brands that are safe to name: **Ven-Dens / Vendens** (2 products), **Geemy** (2),
**Lenovo** (2 — genuine HE05X and M20 only), **AIWA** (1), **GTS** (1), **KTS /
Budget-Oriented House** (1), **Vintage T9** (1), **Music** (1), **TWS** (3), **No Brand** (5).

Note: `Apple`, `JBL` and `Marshall` still exist as brand rows with **0 products** after last
week's cleanup. `/brand/apple`, `/brand/jbl` and `/brand/marshall` are live, empty pages
carrying those names. They are `noindex` already, but **I recommend deleting or hiding those
three brand rows** — an empty page titled "Apple Accessories in Sri Lanka" on your domain is
the exact association Google Ads flagged.

---

## 7. Missing SEO opportunities

Ranked by value for effort, given a 20-product catalogue:

| # | Opportunity | Effort | Value | Note |
|---|---|---|---|---|
| 1 | **Unique copy on the 7 real category pages** (Layer 3) | Medium (writing) | **Highest** | Field already exists (`categories.description`). No code needed for 5 of 7. |
| 2 | Fix category titles / add H1s / fix product double-suffix | Small | High | §2.2 |
| 3 | `noindex` the 16 thin/duplicate categories + `/search` | Small | High | Stops Google wasting crawl on duplicates |
| 4 | Footer category links (Layer 1) | Small | Medium-High | Fixes Finding 1 |
| 5 | `FAQPage` schema on `/faq` | Small | Medium | You already have 4 Q&A groups — free rich result |
| 6 | `WebSite` + `SearchAction` schema | Small | Low-Medium | Sitelinks search box |
| 7 | `ItemList` schema on category pages | Small | Low-Medium | |
| 8 | `LocalBusiness` schema + Google Business Profile | Small | Medium | You have a real address and pickup hours |
| 9 | Add `/brands`, `/coupons` to sitemap | Tiny | Low | |
| 10 | Fix the category redirect 200 bug (§1.10) | Small | Medium | Prerequisite for any restructure |
| 11 | **More products** | Large | **Highest of all** | See §8 |
| 12 | Buying guides / content pages | Large | Medium-High | **Addition F — later phase, not a dependency** |
| 13 | `/best-sellers` page | Small | Low **now** | `best-seller` tag exists but no route. Only worth it once you have enough products that "best sellers" differs meaningfully from "all products". At 20 products it would duplicate `/shop`. |

**Future collection pages — hold until the counts justify them:**

| Candidate page | Products today | Needed | Status |
|---|---|---|---|
| 10,000mAh Power Banks | 1 | 5 | ❌ not yet |
| 20,000mAh Power Banks | 0 | 5 | ❌ not yet |
| Fast-Charging Power Banks | 2 | 5 | ❌ not yet |
| Gaming Headsets | 2 | 5 | ❌ not yet — closest to viable |
| Karaoke / Mic Speakers | 1 | 5 | ❌ not yet |
| Chargers | 0 | 5 | ❌ no products at all |
| USB Cables | 0 | 5 | ❌ no products at all |

---

## 8. SEO risks, and what this footer *cannot* do

### What could go wrong

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Keyword-stuffed footer reads as spam** | High if done Daraz-style | Plain-name anchors, ~10 links, prose on homepage only |
| **Amplifying duplicate pages** | **High if footer ships before §3** | Do the noindex work first. This is the main reason for your ordering. |
| **Site-wide anchor over-optimisation** | Medium | Never use "…Price in Sri Lanka" as a footer anchor |
| Link dilution | Low | 67 → ~80 unique links per page is fine |
| Linking to empty categories | Medium | Footer list is explicit, and empty categories get noindexed |
| Campaign links 404 when a campaign ends | **Real** — only 1 campaign, ends 9 Oct 2026 | Render campaign links **dynamically**, hide the block when none is active. Never hard-code `big-bang-flash-sale`. |
| Mobile PageSpeed regression | Low | Server component, no client JS, no images — see §10 |
| Breaking the working canonical setup | Low but costly | Footer work touches no metadata; keep them separate commits |

### What the footer cannot do — plainly

1. **It will not make you rank.** Site-wide footer links are the weakest kind of internal link;
   Google discounts boilerplate repeated on every page. Realistically this is worth a few
   percent, not a jump in position.
2. **It cannot fix a 20-product catalogue.** Your biggest SEO constraint is inventory. A
   "Bluetooth Speakers in Sri Lanka" page with 4 products will struggle against a competitor
   with 200, no matter how the footer is built.
3. **It cannot create authority.** You have no backlinks strategy. Internal linking
   redistributes authority you already have; it does not create any.
4. **It cannot replace unique page content.** A footer link to `/category/power-bank` doesn't
   help if that page has 42 characters of boilerplate description.
5. **It will not beat Daraz or ikman on head terms.** Aim at specific long-tail intent
   ("rechargeable hair trimmer price Sri Lanka"), not "mobile accessories".
6. **It cannot fix off-site factors**: Google Business Profile, reviews, social proof, delivery
   reputation.

**Honest ranking of what will actually move TrendyMall's traffic:**
1. More products in the categories you already have
2. Unique, genuinely useful copy on category and product pages
3. Backlinks and a Google Business Profile
4. Technical fixes (titles, H1, noindex, schema) ← *this plan*
5. Footer internal links ← *this plan*

This plan does #4 and #5 well. They are necessary and cheap, but they are not the main event,
and I don't want you to expect more than they give.

---

## 9. Final proposed footer structure

### Facts available for the copy (Addition D — confirm these)

Everything below is from the live site/database. **Please confirm before I write copy using it:**

| Fact | Source | Current value |
|---|---|---|
| Delivery — Colombo 1–15 | `delivery_zones` | **Rs 255** |
| Delivery — Wellampitiya | `delivery_zones` | **Rs 255** |
| Delivery — rest of Sri Lanka | `delivery_zones` (default) | **Rs 400** |
| Free shipping | `shipping.free_shipping_enabled` | **DISABLED** (Rs 3,000 threshold configured but off) |
| Store pickup | `shipping.pickup_*` | **Enabled** — TrendyMall Store, Salawatta Road, Wellampitiya, Daily 10am–4pm |
| Cash on Delivery | `payment.cod_enabled` | **Enabled** |
| Bank transfer | `payment.bank_transfer_enabled` | **Enabled** |
| Card / online payment | `payment.online_payment_enabled` | **Enabled** (footer also gates on PayHere being configured) |
| Returns | live `/returns` | **48-hour** window; damaged items reported within 48 hrs |
| Warranty | live `/warranty` | Varies by product — no blanket claim |
| Business hours | `general.business_hours` | Daily, 10 AM – 4 PM |
| Address | `general.address` | Salawatta Road, Wellampitiya, Sri Lanka |

⚠️ **"Islandwide delivery" is already claimed in the current footer and is supported** by the
default Rs 400 zone. ✅
⚠️ **"Free delivery" must NOT be claimed** — it is switched off.
⚠️ The homepage meta description's **"chargers"** and **"phone cases"** are **not true**.

### Layer 1 — the footer column (every page)

Added as a 5th column, reusing the existing navy/white styling. No new colours, no new design
system — `#0F2D52` background, white text, `white/70` links, same uppercase `h3` as "Company".

```
SHOP BY CATEGORY
  Wireless Earbuds          → /category/earbuds
  Headphones                → /category/headsets-headphones
  Bluetooth Speakers        → /category/portable-speakers
  Power Banks               → /category/power-bank
  Hair Trimmers & Clippers  → /category/trimmers-groomers-clippers
  Earphones & Earbuds       → /category/earphones
  Audio & Electronics       → /category/electronic
  ──────────────────────────
  All Products              → /shop
  New Arrivals              → /new-arrivals
  Combo Deals               → /combo-deals
```

10 links. Plain anchors. Column heading is an `<h3>`, matching the three existing columns.

Dropped from your draft list, with reasons:
- **Best Sellers** — no such route exists; would duplicate `/shop` at 20 products
- **Active Campaigns / Flash Sale** — only 1 campaign, ending 9 Oct 2026. If you want it,
  it must be rendered dynamically and the block hidden when nothing is active.
- **About / Contact / Delivery / Returns / FAQs** — already in the Company column; don't duplicate

### Layer 2 — prose block, homepage only

Placed as a `<section>` **above** `<footer>`, on `#FAFAFA`, white cards, `#E5E7EB` borders —
your existing tokens, no new ones.

> ## Online Shopping in Sri Lanka
>
> TrendyMall is a Sri Lankan online store for everyday technology — wireless earbuds and
> headphones, Bluetooth speakers, power banks, and rechargeable grooming tools. We deliver
> islandwide with Cash on Delivery, and you can collect from our Wellampitiya store if that's
> easier. Every order is covered by a 48-hour return window on damaged items.

Then 3–4 topic cards, exactly the natural shape you asked for:

> **WIRELESS EARBUDS & HEADPHONES**
> True wireless earbuds with charging cases, foldable over-ear headphones with a built-in mic,
> and magnetic neckband earphones for everyday use.
> → **Explore Earphones**  `/category/earphones`
>
> **BLUETOOTH SPEAKERS**
> Portable wireless speakers with deep bass and rechargeable batteries, including models with a
> wireless mic for karaoke.
> → **Explore Bluetooth Speakers**  `/category/portable-speakers`
>
> **POWER BANKS**
> Portable chargers from 5000mAh to 10000mAh, including fast-charging and magnetic wireless
> models for phones and tablets.
> → **Explore Power Banks**  `/category/power-bank`
>
> **TRIMMERS & GROOMING**
> Rechargeable hair clippers and beard trimmers for home grooming, cordless and mains-powered.
> → **Explore Trimmers**  `/category/trimmers-groomers-clippers`

Every claim above is true against the current 20 products. No brand names. No price claims
beyond the confirmed Rs 255 / Rs 400.

### Link types

| Link | Element | Why |
|---|---|---|
| Internal category / page links | `next/link` `<Link>` | Renders a real `<a href>` in the HTML — fully crawlable, and keeps client-side navigation |
| "Explore …" CTAs | `next/link` `<Link>` | same |
| Social, WhatsApp, tel:, mailto: | plain `<a>` | external / protocol links, as today |

`<Link>` is correct here — it outputs a standard `<a href="/category/earbuds">` in the server
HTML. Google sees it exactly as a normal link.

---

## 10. Technical SEO questions — answered

| Your question | Answer |
|---|---|
| Should the content be inside `<footer>`? | **Links yes** (navigation belongs in `<footer>`). **Prose no** — put the homepage paragraph in a `<section>` above `<footer>`. A long marketing essay inside `<footer>` is a weaker signal than the same text in page content. |
| Separate section above the footer? | **Yes, for Layer 2 only, homepage only.** |
| Heading hierarchy? | Page gets exactly one `<h1>`. Layer-2 section heading = `<h2>`, its topic cards = `<h3>`. Footer column headings stay `<h3>` (matching the three existing columns). Never skip levels. |
| Which links should be normal `<a href>`? | All of them effectively are — `next/link` emits `<a href>`. Use plain `<a>` only for external/protocol links. **Never** a `<button>` or `onClick` for navigation. |
| Should category links be generated dynamically? | **Recommended: an explicit curated list of 7 slugs, validated against the DB at render.** Fully dynamic would pull in all 23 categories including the 4 empty ones. Curated keeps editorial control; validating means a renamed or deactivated category can't become a dead footer link. |
| Use existing category data? | **Yes.** `getCachedCategories()` is already called in `components/layout/Navbar.tsx:21` in the same render pass, so the footer reuses the cached result — **zero extra database queries**. |
| Include campaign links? | **Only dynamically, and hidden when none is active.** One published campaign, ending 9 Oct 2026. A hard-coded flash-sale link becomes a 404 that week. |
| Link search-result URLs? | **No.** Never link `/search?q=...` from the footer. |
| Should search pages be indexable? | **No — set `noindex, follow` on `/search`.** Canonical already collapses them to `/search`; `noindex` is the proper signal. |
| Create dedicated SEO landing pages? | **Not yet — zero qualify** under your 5-product rule (§3, §7). Revisit per the count table. |
| How many links is reasonable? | **~10 new footer links.** Total goes from 67 to ~80 unique per page. Daraz-style 150+ is what to avoid. |
| Should the section appear on every page? | **Category links: yes** (that's the whole point). **Prose: no** — homepage only, or it becomes duplicate content on 35+ pages. |
| Should product pages have the same SEO content? | **No.** Product pages get the footer link column and nothing more. Their unique content is the product description. |
| Should category pages get extra contextual links? | **Yes — this is Layer 3 and the highest-value item in the plan.** 150–250 unique words per category plus 2–3 in-content links to sibling categories. In-content links are worth far more than footer links. |
| How to avoid duplicate / thin content? | (a) prose on one page only; (b) unique copy per category, never templated; (c) `noindex` the 16 duplicate/empty categories; (d) keep the existing self-canonicalisation untouched. |
| How does this interact with the sitemap? | Footer links need no sitemap change. Separately: **remove the 4 empty categories**, **add `/brands` and `/coupons`**. Footer links and the sitemap should agree — both pointing at the same 7 indexable categories. |

### Performance (Addition E)

| Requirement | How it's met |
|---|---|
| Server-rendered | `Footer.tsx` is already an async server component |
| No new client JS | Zero `useState`/`useEffect`/`onClick`. Pure links and text. The only existing client component in the footer (`NewsletterSignup`) is untouched. |
| No extra queries | Reuses `getCachedCategories()` already fetched by `Navbar` in the same pass |
| No PageSpeed regression | No images, no fonts, no scripts. ~2–3 KB of HTML. Footer is below the fold, so no LCP impact; no JS, so no TBT impact. |
| Verification | Lighthouse mobile before/after on `/`, a product page and `/category/power-bank`, median of 3 runs — the same method used for the mobile-performance work |

---

## 11. Implementation plan (after you approve the strategy)

Five small, independently revertible commits. Nothing touches pricing, stock, checkout, the
order function, cart, campaigns or promotion settings.

**Phase 1 — On-page fixes (no new UI)**
- Homepage title + meta description via `/admin/settings/seo` (**admin UI, no deploy**) — removes the untrue "chargers / phone cases"
- Fix the product-page double `| TrendyMall`
- Replace the hard-coded `` `${category.name} Accessories` `` title rule
- Add the missing H1 on `/` (sr-only) and promote `/shop`'s heading to H1
- Shorten the `/about` title
- *Touches: metadata only. No layout, no logic.*

**Phase 2 — Indexation hygiene**
- `noindex, follow` on the 12 duplicate + 4 empty categories, `/search`, `/wishlist`
- Remove the 4 empty categories from `sitemap.ts`; add `/brands` and `/coupons`
- *Touches: metadata + sitemap. No UI.*

**Phase 3 — Footer Layer 1**
- Add the "Shop by Category" column to `Footer.tsx`, reusing `getCachedCategories()`
- Curated 7 slugs, validated at render so a deactivated category can't become a dead link
- Mobile check: the footer grid becomes 5 columns on desktop; verify the 1-col / 2-col / 5-col stacking at 390px, 768px, 1440px
- *Touches: `Footer.tsx` only.*

**Phase 4 — Footer Layer 2 (homepage only)**
- New server component, rendered only from `app/page.tsx`, above `<Footer />`
- Existing design tokens only
- *Touches: one new file + one line in `app/page.tsx`.*

**Phase 5 — Category copy (Layer 3)**
- Write 150–250 unique words for each of the 7 categories
- 5 of 7 need **no code at all** — the `categories.description` field already exists and renders
- *This is a writing task, and the highest-value item. You may want to write these yourself, or I can draft them for your review.*

**Separately, and worth doing:** fix the category slug-redirect 200 bug (§1.10) — same one-file
fix as commit `9bcb8ca`, and a prerequisite if you ever restructure categories.

**Later (Addition F, not a dependency):** buying guides — *"How to choose a power bank"*,
*"Wireless earbuds buying guide for Sri Lanka"*. These need a new route and real writing. Noted
as an opportunity; nothing in Phases 1–5 depends on them.

**Testing per phase:** `npm run lint`, `npm test` (258 tests), production build, live
title/description/canonical/H1 re-check with the same script used for §1.4, Lighthouse mobile
median-of-3 for Phases 3–4.

---

## 12. Open decisions for you

1. **`/category/mobile-accessories`** — Option A (`noindex`, keep homepage on "mobile
   accessories Sri Lanka") or Option B (restructure the tree)? **I recommend A** for now.
2. **Homepage H1** — `sr-only` (no visual change) or a visible heading?
3. **Empty brand pages** — delete/hide the `Apple`, `JBL` and `Marshall` brand rows? They now
   have 0 products but still generate pages carrying those names.
4. **Campaign links in the footer** — include dynamically, or leave out entirely?
5. **Category copy (Phase 5)** — do you want to write it, or shall I draft it for your review?
6. **Confirm the facts in §9** — especially Rs 255 / Rs 400 delivery, free shipping being off,
   and the 48-hour return window.
7. **Order of work** — confirm Phase 1 → 2 → 3 → 4 → 5. I recommend not shipping the footer
   before Phase 2.

---

## Appendix — verification commands used

- Routes: `find app -name "page.tsx"`
- Live on-page state: fetched `<title>`, `<meta name="description">`, `<link rel="canonical">`,
  `<meta name="robots">` and `<h1>` from 29 live URLs
- Category tree + product counts: `categories` joined to published, non-deleted `products`
- Crawlable link counts: `grep -oE 'href="/category/[^"]*"'` on raw server HTML
- Facts: `delivery_zones`, `store_settings` (`seo.*`, `general.*`, `payment.*`, `shipping.*`)
- Redirect status: `curl -o /dev/null -w '%{http_code} %{redirect_url}'`
