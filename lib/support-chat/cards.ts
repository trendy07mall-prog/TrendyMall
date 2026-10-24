// Structured extras shown under an assistant reply: product cards and an
// order card. Built server-side from the same tool results the model saw,
// so prices, stock and order status on a card are always the real data,
// never the model's retelling of it. Pure -- shared with the widget.

export interface ProductCard {
  name: string;
  // Path on this site, e.g. /product/ven-dens-power-bank.
  href: string;
  image: string | null;
  price: number;
  // Set only when the product is discounted.
  regularPrice?: number;
  // True when options are priced differently ("from Rs 1,849").
  priceVaries?: boolean;
  inStock: boolean;
}

export interface OrderCard {
  orderNumber: string;
  status: string;
  paymentMethod: string;
  total: number;
  items: { name: string; quantity: number }[];
  trackingUrl: string | null;
}

export interface ReplyCards {
  products?: ProductCard[];
  order?: OrderCard;
}

// Collected while one reply is being produced. The last product search
// wins, unless the model also opened specific products, which are what the
// reply is about.
export class CardCollector {
  private searched: ProductCard[] = [];
  private detailed: ProductCard[] = [];
  private order: OrderCard | undefined;

  setSearchResults(cards: ProductCard[]) {
    this.searched = cards;
  }

  addDetail(card: ProductCard) {
    if (!this.detailed.some((c) => c.href === card.href)) this.detailed.push(card);
  }

  setOrder(order: OrderCard) {
    this.order = order;
  }

  result(maxProducts = 4): ReplyCards {
    const products = (this.detailed.length > 0 ? this.detailed : this.searched).slice(0, maxProducts);
    return {
      ...(products.length > 0 ? { products } : {}),
      ...(this.order ? { order: this.order } : {}),
    };
  }
}

export const ORDER_STEPS = ["Placed", "Confirmed", "Shipped", "Delivered"] as const;

// How far along the four-step bar an order is, or null for orders that
// left the normal path (cancelled, returned, failed delivery), which show
// only their status badge.
export function orderProgress(status: string): number | null {
  switch (status) {
    case "pending":
      return 1;
    case "confirmed":
    case "packing":
      return 2;
    case "shipped":
    case "out_for_delivery":
      return 3;
    case "delivered":
      return 4;
    default:
      return null;
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Placed",
  confirmed: "Confirmed",
  packing: "Packing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  failed_delivery: "Delivery failed",
};

export function orderStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const PAYMENT_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  bank_transfer: "Bank transfer",
  card: "Card",
  payhere: "Card",
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method;
}
