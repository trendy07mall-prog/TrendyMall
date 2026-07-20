# TrendyMall — Setup Guide

Everything you need to do manually to get TrendyMall running locally and in
production. Follow the sections in order the first time.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com), sign in, and click **New project**.
2. Pick an organization, name the project (e.g. `trendymall`), set a database
   password (save it somewhere safe), choose a region close to your
   customers, and create the project. Wait for provisioning to finish (~2
   minutes).
3. In the project dashboard, go to **Project Settings → API**. You'll need:
   - **Project URL** (`https://<ref>.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠️ keep this secret — never expose it to the
     browser or commit it to git)

## 2. Run the database SQL

In the Supabase dashboard, open **SQL Editor → New query**, and run each file
in this repo's `sql/` folder **in order**, one at a time (each depends on the
previous one having run):

1. `sql/001_schema.sql` — tables, triggers, the `is_admin()` helper
2. `sql/002_rls_policies.sql` — row-level security policies
3. `sql/003_storage.sql` — the `product-images` storage bucket + its policies
4. `sql/004_seed_data.sql` — the 4 starter categories and products (LKR prices — edit later via `/admin`)
5. `sql/005_update_seed_content.sql` — updates those 4 products with their real names, prices, stock, and descriptions (run this once, after 004; it's an `UPDATE`, safe to skip if you've already customized these products via `/admin`)

Paste each file's contents into the SQL editor and click **Run**. If a script
errors partway through, check whether part of it already applied before
re-running (the schema script uses `create table`, which will fail if you run
it twice — that's expected and safe to ignore if you're only re-running
after a partial failure you've since fixed).

## 3. Set environment variables

In the project root, copy the example file:

```bash
cp .env.example .env.local
```

Fill in `.env.local` with the values from step 1:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local` is gitignored and will never be committed. `NEXT_PUBLIC_SITE_URL`
is used for SEO metadata, `sitemap.xml`, and `robots.txt` — set it to your
real production domain once deployed (step 8).

## 4. Install dependencies and run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the home
page with the 4 categories and, inside each, the seeded sample product.

### (Optional) Regenerate database types

`types/database.types.ts` is hand-written to match `sql/001_schema.sql`. Once
your Supabase project is live, you can regenerate it directly from the real
schema so it never drifts:

```bash
npx supabase login
npx supabase gen types typescript --project-id <your-project-ref> --schema public > types/database.types.ts
```

If you do this, keep the file's `OrderStatus` export and the `Relationships`
arrays intact (or re-add them) — the app's types in `types/index.ts` depend
on `OrderStatus`, and `@supabase/supabase-js`'s generics require every table
to declare a `Relationships` array to resolve query result types correctly.

## 5. Create your first admin account

1. With the app running locally, go to `/signup` and create an account with
   your real email (e.g. `trendy07mall@gmail.com`).
2. Check your email and confirm the account (Supabase sends a confirmation
   link by default — this uses Supabase's built-in email sending, which is
   rate-limited; that's fine for getting started).
3. Back in the Supabase dashboard, open **SQL Editor** and run:

   ```sql
   update public.profiles
   set is_admin = true
   where id = (select id from auth.users where email = 'trendy07mall@gmail.com');
   ```

4. Log out and back in on the site. You should now see an **Admin** link in
   the navbar, and `/admin` should load instead of redirecting you away.

To promote any other account to admin later, run the same `update` statement
with that account's email.

## 6. Adding, editing, and removing products

Once logged in as an admin:

- **Add a product**: `/admin/products/new` — fill in name, description,
  price (LKR), stock, category, and either upload image files directly
  (stored in the `product-images` Supabase Storage bucket) or paste image
  URLs.
- **Edit a product**: `/admin/products` → click a product → **Edit**. You can
  uncheck "Keep" under an existing image to remove it, add new images, and
  toggle **Active** to hide a product from the storefront without deleting it.
- **Delete a product**: open it for editing and click **Delete**.
- **Manage orders**: `/admin/orders` lists every order; open one to update
  its status (`pending payment → confirmed → shipped → delivered`, or
  `cancelled`). Customers see the same status on their `/account/orders`
  page.

## 7. Adding a real payment gateway later

Checkout currently collects order details and saves every order with
`status = 'pending_payment'` — no payment is actually charged. The single
integration point is `lib/payment.ts`:

```ts
export async function initiatePayment(order: { id: string; total: number }) {
  return { ok: true, reference: null };
}
```

To wire up a real gateway (Stripe, PayHere, Sampath IPG, etc.):

1. Replace the body of `initiatePayment` with a call to your provider's API,
   returning a reference/session id.
2. Store that reference on the order (`orders.payment_reference` already
   exists for this).
3. Only move an order's `status` past `pending_payment` once the provider
   confirms payment — either synchronously in `initiatePayment`, or
   asynchronously via a webhook. For a webhook, add a route handler at
   `app/api/webhooks/<provider>/route.ts` that verifies the provider's
   signature and updates the order.
4. `initiatePayment` is called from `lib/orders.ts` right after an order is
   created — that's the natural place to redirect the customer to a hosted
   checkout page if your provider requires one, instead of going straight to
   `/checkout/success`.

## 8. Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this after the
   initial setup — see the git remote below).
2. In [Vercel](https://vercel.com), click **Add New → Project**, and import
   the `trendy07mall-prog/TrendyMall` repository.
3. Framework preset should auto-detect as **Next.js** — leave the build
   command (`next build`) and output settings at their defaults.
4. Under **Environment Variables**, add the same variables from your
   `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (mark it as a server-only/secret variable —
     never expose it with a `NEXT_PUBLIC_` prefix)
   - `NEXT_PUBLIC_SITE_URL` — set this to your real Vercel URL (e.g.
     `https://trendymall.vercel.app`) or custom domain, so SEO metadata,
     `sitemap.xml`, and `robots.txt` point at the right place
5. Click **Deploy**.
6. In the Supabase dashboard, go to **Authentication → URL Configuration**
   and add your Vercel deployment URL (e.g. `https://trendymall.vercel.app`)
   to **Site URL** and **Redirect URLs** — otherwise email confirmation
   links will redirect back to `localhost`.

Once deployed, redo step 5 (create/promote an admin) against the production
database if you haven't already — local and production point at the same
Supabase project unless you created a separate one for each.

## Reference: project structure

- `app/` — Next.js App Router pages and route handlers
- `components/` — UI components, grouped by feature
- `context/CartContext.tsx`, `context/WishlistContext.tsx` — client-side cart/wishlist (backed by `localStorage`, no DB table)
- `lib/supabase/` — Supabase client factories (browser, server, admin/service-role)
- `lib/admin/` — admin-only Server Actions (product CRUD, order status updates)
- `lib/orders.ts`, `lib/payment.ts` — checkout order creation and the payment integration stub
- `proxy.ts` — Next.js 16's renamed `middleware.ts`; refreshes the auth session and gates `/admin`, `/account`, `/checkout` to logged-in users
- `sql/` — run these once in the Supabase SQL editor (see step 2)
- `types/database.types.ts` — hand-written to match `sql/001_schema.sql`; regenerate from Supabase once your project exists (see step 4)
