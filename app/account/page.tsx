import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getMyProfile } from "@/lib/profile";
import { getMyOrders } from "@/lib/account/orders-query";
import { getMyOrderDetail } from "@/lib/orders/order-detail";
import { getMyAddresses } from "@/lib/addresses";
import { getMyReviewCount } from "@/lib/reviews";
import { getWhatsAppUrl } from "@/lib/site";
import { formatPrice } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { AccountSectionError } from "@/components/account/AccountSectionError";
import { SummaryCardShell } from "@/components/account/SummaryCardShell";
import { WishlistSummaryCard } from "@/components/account/WishlistSummaryCard";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import {
  CartIcon,
  MapPinIcon,
  StarIcon,
  WhatsAppIcon,
  MailIcon,
  HeadsetIcon,
} from "@/components/ui/Icon";

export const metadata: Metadata = { title: "My Account — TrendyMall" };

const ALL_ORDERS_FILTER = { search: "", tab: "all" as const };

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[104px]" />
      ))}
    </div>
  );
}

// Wishlist count is client-only (context/WishlistContext.tsx is
// localStorage, no DB table) — every other card here is server-rendered
// from real counts, this one alone hydrates client-side.
//
// Data fetching stays inside try/catch; JSX is only constructed after it,
// outside the try block — JSX construction is lazy (React doesn't render
// it immediately), so a try/catch wrapped around JSX wouldn't actually
// catch anything thrown during rendering (react-hooks/error-boundaries).
async function SummaryCards() {
  let counts: { orderCount: number; addressCount: number; reviewCount: number };
  try {
    const [{ totalCount: orderCount }, addresses, reviewCount] = await Promise.all([
      getMyOrders(ALL_ORDERS_FILTER, 1, 1),
      getMyAddresses(),
      getMyReviewCount(),
    ]);
    counts = { orderCount, addressCount: addresses.length, reviewCount };
  } catch {
    return <AccountSectionError message="Unable to load your account summary." />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryCardShell
        icon={<CartIcon className="h-4 w-4" />}
        label="Orders"
        count={counts.orderCount}
        href="/account/orders"
      />
      <WishlistSummaryCard />
      <SummaryCardShell
        icon={<MapPinIcon className="h-4 w-4" />}
        label="Addresses"
        count={counts.addressCount}
        href="/account/addresses"
      />
      <SummaryCardShell
        icon={<StarIcon className="h-4 w-4" />}
        label="Reviews"
        count={counts.reviewCount}
        href="/account/reviews"
      />
    </div>
  );
}

function RecentOrderSkeleton() {
  return <Skeleton className="h-56" />;
}

async function RecentOrderCard() {
  let detail: Awaited<ReturnType<typeof getMyOrderDetail>> | "empty";
  try {
    const { orders } = await getMyOrders(ALL_ORDERS_FILTER, 1, 1);
    detail = orders.length === 0 ? "empty" : await getMyOrderDetail(orders[0].id);
  } catch {
    return <AccountSectionError message="Unable to load your recent order." />;
  }

  if (detail === "empty") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] py-12 text-center">
        <p className="text-sm text-[var(--muted)]">You haven&apos;t placed any orders yet.</p>
        <Link
          href="/shop"
          className="transition-brand rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  if (!detail) return <AccountSectionError message="Unable to load your recent order." />;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Order {detail.orderNumber}</p>
          <p className="text-xs text-[var(--muted)]">
            {new Date(detail.createdAt).toLocaleDateString()} · {formatPrice(detail.total)}
          </p>
        </div>
        <Link
          href={`/account/orders/${detail.orderId}`}
          className="transition-brand rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium hover:bg-black/5"
        >
          View Order
        </Link>
      </div>
      <div className="mt-4">
        <OrderTimeline
          status={detail.orderStatus}
          failureReason={detail.failureReason}
          deliveryAttemptCount={detail.deliveryAttemptCount}
          statusHistory={detail.statusHistory}
          createdAt={detail.createdAt}
          orderNumber={detail.orderNumber}
        />
      </div>
    </div>
  );
}

const NEED_HELP_LINKS = [
  { href: getWhatsAppUrl("Hi, I have a question about my account."), label: "WhatsApp Us", icon: WhatsAppIcon, external: true },
  { href: "/contact", label: "Contact Us", icon: MailIcon, external: false },
  { href: "/faq", label: "FAQ", icon: HeadsetIcon, external: false },
];

function NeedHelpSection() {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
      <h2 className="text-sm font-semibold">Need help?</h2>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {NEED_HELP_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            className="transition-brand flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--border)] px-3 text-sm font-medium hover:bg-black/5"
          >
            <link.icon className="h-4 w-4 shrink-0" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export default async function AccountOverviewPage() {
  const profile = await getMyProfile();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
      </h1>

      <Suspense fallback={<SummaryCardsSkeleton />}>
        <SummaryCards />
      </Suspense>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Recent order</h2>
        <Suspense fallback={<RecentOrderSkeleton />}>
          <RecentOrderCard />
        </Suspense>
      </div>

      <NeedHelpSection />
    </div>
  );
}
