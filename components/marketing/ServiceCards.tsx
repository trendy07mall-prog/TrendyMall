import Link from "next/link";
import type { ComponentType } from "react";
import { getMaxDiscountPercent } from "@/lib/data/products";
import { RATE_IN_ZONE, RATE_OUTSIDE_ZONE } from "@/lib/delivery-fee";
import { formatPrice } from "@/lib/utils";
import { BadgePercentIcon, GemIcon, TicketPercentIcon, TruckIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";

const CARD_CLASS =
  "flex h-full flex-col items-start gap-3 rounded-[18px] border border-[var(--border)] bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-in-out hover:-translate-y-1";

function IconBadge({
  icon: Icon,
  badgeClassName,
  iconClassName,
}: {
  icon: ComponentType<{ className?: string }>;
  badgeClassName: string;
  iconClassName: string;
}) {
  return (
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${badgeClassName}`}>
      <Icon className={`h-6 w-6 ${iconClassName}`} />
    </span>
  );
}

// Coupons and delivery rates are static facts about the store (a real,
// currently-active coupon and our real flat delivery zones) — Gems Rewards
// and the sale promotion are the two that must never overstate reality,
// so they're built to disappear/disable themselves rather than lie.
export async function ServiceCards() {
  const maxDiscount = await getMaxDiscountPercent();

  return (
    <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-12">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <FadeIn>
          <Link href="/cart" className={`${CARD_CLASS} group`}>
            <IconBadge
              icon={TicketPercentIcon}
              badgeClassName="bg-[var(--color-accent)]"
              iconClassName="text-white"
            />
            <h3 className="font-heading text-lg font-bold">Coupons</h3>
            <p className="flex-1 text-sm text-[var(--muted)]">
              Get 5% off your order — minimum spend Rs. 2,000.
            </p>
            <span className="text-sm font-semibold underline-offset-2 group-hover:underline">
              Explore Coupons →
            </span>
          </Link>
        </FadeIn>

        <FadeIn delay={0.05}>
          <Link href="/shipping" className={`${CARD_CLASS} group`}>
            <IconBadge
              icon={TruckIcon}
              badgeClassName="bg-[var(--color-btn-primary)]"
              iconClassName="text-white"
            />
            <h3 className="font-heading text-lg font-bold">Delivery Rates</h3>
            <p className="flex-1 text-sm text-[var(--muted)]">
              Colombo 1–15: {formatPrice(RATE_IN_ZONE)} · Other areas: {formatPrice(RATE_OUTSIDE_ZONE)}
            </p>
            <span className="text-sm font-semibold underline-offset-2 group-hover:underline">
              View Shipping Info →
            </span>
          </Link>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div
            aria-disabled="true"
            className={`${CARD_CLASS} cursor-not-allowed opacity-60`}
          >
            <div className="flex w-full items-start justify-between">
              <IconBadge
                icon={GemIcon}
                badgeClassName="bg-[var(--color-accent-secondary)]"
                iconClassName="text-[#111111]"
              />
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase">
                Coming Soon
              </span>
            </div>
            <h3 className="font-heading text-lg font-bold">Gems Rewards</h3>
            <p className="flex-1 text-sm text-[var(--muted)]">
              Earn Gems on every order and redeem them for discounts. Launching soon.
            </p>
            <span className="text-sm font-semibold text-[var(--muted)]">Learn More</span>
          </div>
        </FadeIn>

        {maxDiscount != null && (
          <FadeIn delay={0.15}>
            <Link href="/shop?onSale=1" className={`${CARD_CLASS} group`}>
              <IconBadge
                icon={BadgePercentIcon}
                badgeClassName="bg-[var(--color-accent)]"
                iconClassName="text-white"
              />
              <h3 className="font-heading text-lg font-bold">Special Price Sale</h3>
              <p className="flex-1 text-sm text-[var(--muted)]">
                Save up to {maxDiscount}% on selected products with exclusive Special Prices. Shop
                limited-time deals while stocks last.
              </p>
              <span className="text-sm font-semibold underline-offset-2 group-hover:underline">
                Shop Sale →
              </span>
            </Link>
          </FadeIn>
        )}
      </div>
    </section>
  );
}
