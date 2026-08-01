import Link from "next/link";
import type { ComponentType } from "react";
import { getMaxDiscountPercent } from "@/lib/data/products";
import { getFeaturedCoupon } from "@/lib/data/coupons";
import { formatCouponDiscount, formatCouponValidUntil } from "@/lib/coupon-display";
import { RATE_IN_ZONE, RATE_OUTSIDE_ZONE } from "@/lib/delivery-fee";
import { formatPrice } from "@/lib/utils";
import { BadgePercentIcon, GemIcon, TicketPercentIcon, TruckIcon } from "@/components/ui/Icon";
import { Carousel } from "@/components/marketing/Carousel";

// ~30% shorter than the first pass (p-6/h-12 icon/gap-3 -> p-4/h-10/gap-2)
// and now a carousel — 4 cards fit on desktop without scrolling, but the
// Carousel component works the same regardless of card count.
const CARD_CLASS =
  "flex h-full flex-col items-start gap-2 rounded-[18px] border border-[var(--border)] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-in-out hover:-translate-y-1";
const ITEM_CLASS = "w-[85%] sm:w-1/2 lg:w-1/4";

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
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${badgeClassName}`}>
      <Icon className={`h-5 w-5 ${iconClassName}`} />
    </span>
  );
}

// Coupons and delivery rates are static facts about the store (whatever
// the featured coupon and our real flat delivery zones currently are) —
// Gems Rewards and the sale promotion are the two that must never
// overstate reality, so they're built to disappear/disable themselves
// rather than lie. All four are dynamic now, not just the sale card.
export async function ServiceCards() {
  const [maxDiscount, coupon] = await Promise.all([getMaxDiscountPercent(), getFeaturedCoupon()]);
  const validUntil = coupon ? formatCouponValidUntil(coupon) : null;

  const cards: React.ReactNode[] = [];

  if (coupon) {
    cards.push(
      <Link key="coupon" href="/coupons" className={`${CARD_CLASS} group`}>
        <IconBadge icon={TicketPercentIcon} badgeClassName="bg-[var(--color-accent)]" iconClassName="text-white" />
        <h3 className="font-heading text-base font-bold">{coupon.title || "Coupons"}</h3>
        <p className="flex-1 text-sm text-[var(--muted)]">
          {coupon.description || formatCouponDiscount(coupon)}
          {validUntil ? ` — ${validUntil}` : ""}
        </p>
        <span className="text-sm font-semibold underline-offset-2 group-hover:underline">
          View Coupons →
        </span>
      </Link>,
    );
  }

  cards.push(
    <Link key="delivery" href="/shipping" className={`${CARD_CLASS} group`}>
      <IconBadge icon={TruckIcon} badgeClassName="bg-[var(--color-btn-primary)]" iconClassName="text-white" />
      <h3 className="font-heading text-base font-bold">Delivery Rates</h3>
      <p className="flex-1 text-sm text-[var(--muted)]">
        Colombo 1–15: {formatPrice(RATE_IN_ZONE)} · Other areas: {formatPrice(RATE_OUTSIDE_ZONE)}
      </p>
      <span className="text-sm font-semibold underline-offset-2 group-hover:underline">
        View Shipping Info →
      </span>
    </Link>,
  );

  cards.push(
    <div key="gems" aria-disabled="true" className={`${CARD_CLASS} cursor-not-allowed opacity-60`}>
      <div className="flex w-full items-start justify-between">
        <IconBadge icon={GemIcon} badgeClassName="bg-[var(--color-accent-secondary)]" iconClassName="text-[#111111]" />
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase">
          Coming Soon
        </span>
      </div>
      <h3 className="font-heading text-base font-bold">Gems Rewards</h3>
      <p className="flex-1 text-sm text-[var(--muted)]">
        Earn Gems on every order and redeem them for discounts.
      </p>
      <span className="text-sm font-semibold text-[var(--muted)]">Learn More</span>
    </div>,
  );

  if (maxDiscount != null) {
    cards.push(
      <Link key="sale" href="/shop?onSale=1" className={`${CARD_CLASS} group`}>
        <IconBadge icon={BadgePercentIcon} badgeClassName="bg-[var(--color-accent)]" iconClassName="text-white" />
        <h3 className="font-heading text-base font-bold">Special Price Sale</h3>
        <p className="flex-1 text-sm text-[var(--muted)]">
          Save up to {maxDiscount}% on selected products, while stocks last.
        </p>
        <span className="text-sm font-semibold underline-offset-2 group-hover:underline">
          Shop Sale →
        </span>
      </Link>,
    );
  }

  return (
    <section className="mx-auto w-full max-w-[var(--home-container-width)] px-6 py-[var(--home-section-padding-y)]">
      <Carousel ariaLabel="Promotions and services" itemClassName={ITEM_CLASS} showArrows={cards.length > 4}>
        {cards}
      </Carousel>
    </section>
  );
}
