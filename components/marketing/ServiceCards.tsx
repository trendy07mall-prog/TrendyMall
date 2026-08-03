import Link from "next/link";
import type { ComponentType } from "react";
import { getMaxDiscountPercent } from "@/lib/data/products";
import { getFeaturedCoupon } from "@/lib/data/coupons";
import { formatCouponDiscount, formatCouponValidUntil } from "@/lib/coupon-display";
import { RATE_IN_ZONE, RATE_OUTSIDE_ZONE } from "@/lib/delivery-fee";
import { formatPrice } from "@/lib/utils";
import { BadgePercentIcon, GemIcon, TicketPercentIcon, TruckIcon } from "@/components/ui/Icon";
import { Carousel } from "@/components/marketing/Carousel";

// ~20% shorter than the previous pass. Icon + title sit on one row (not
// stacked) specifically so a 44px icon badge doesn't, on its own, blow
// through the ~140-150px height target once a 2-line description and a
// CTA line are added below it.
const CARD_CLASS =
  "relative flex h-full min-h-[140px] flex-col items-start gap-2 rounded-[18px] border border-[var(--border)] bg-white p-[18px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-in-out hover:-translate-y-1.5 sm:p-6";
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
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${badgeClassName}`}>
      <Icon className={`h-[22px] w-[22px] ${iconClassName}`} />
    </span>
  );
}

function CardHeader({
  icon,
  badgeClassName,
  iconClassName,
  title,
}: {
  icon: ComponentType<{ className?: string }>;
  badgeClassName: string;
  iconClassName: string;
  title: string;
}) {
  return (
    <div className="flex w-full items-center gap-3">
      <IconBadge icon={icon} badgeClassName={badgeClassName} iconClassName={iconClassName} />
      <h3 className="font-heading text-xl font-bold">{title}</h3>
    </div>
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
        <CardHeader
          icon={TicketPercentIcon}
          badgeClassName="bg-[var(--color-accent)]"
          iconClassName="text-white"
          title={coupon.title || "Coupons"}
        />
        <p className="line-clamp-2 flex-1 text-sm leading-[1.5] text-[var(--muted)]">
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
      <CardHeader
        icon={TruckIcon}
        badgeClassName="bg-[var(--color-btn-primary)]"
        iconClassName="text-white"
        title="Delivery Rates"
      />
      <p className="line-clamp-2 flex-1 text-sm leading-[1.5] text-[var(--muted)]">
        Colombo 1–15: {formatPrice(RATE_IN_ZONE)} · Other areas: {formatPrice(RATE_OUTSIDE_ZONE)}
      </p>
      <span className="text-sm font-semibold underline-offset-2 group-hover:underline">
        View Shipping Info →
      </span>
    </Link>,
  );

  cards.push(
    <div key="gems" aria-disabled="true" className={`${CARD_CLASS} cursor-not-allowed opacity-60`}>
      <span className="absolute top-3 right-3 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase">
        Coming Soon
      </span>
      <CardHeader
        icon={GemIcon}
        badgeClassName="bg-[var(--color-accent-secondary)]"
        iconClassName="text-[#111111]"
        title="Gems Rewards"
      />
      <p className="line-clamp-2 flex-1 text-sm leading-[1.5] text-[var(--muted)]">
        Earn Gems on every order and redeem them for discounts.
      </p>
      <span className="text-sm font-semibold text-[var(--muted)]">Learn More</span>
    </div>,
  );

  if (maxDiscount != null) {
    cards.push(
      <Link key="sale" href="/shop?onSale=1" className={`${CARD_CLASS} group`}>
        <CardHeader
          icon={BadgePercentIcon}
          badgeClassName="bg-[var(--color-accent)]"
          iconClassName="text-white"
          title="Special Price Sale"
        />
        <p className="line-clamp-2 flex-1 text-sm leading-[1.5] text-[var(--muted)]">
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
