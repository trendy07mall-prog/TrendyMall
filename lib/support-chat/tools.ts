import "server-only";
import { searchProducts, getProductDetailBySlug, getProductsByIds } from "@/lib/data/products";
import { getActiveCampaigns, getCampaignSections } from "@/lib/data/campaigns";
import { trackOrder } from "@/lib/track-order";
import { getVariantPrice } from "@/lib/utils";
import { htmlToPlainText } from "@/lib/support-chat/prompt";
import { formatStoreDateTime } from "@/lib/datetime";
import type { CardCollector, ProductCard } from "@/lib/support-chat/cards";
import type { ProductWithPrimaryImage } from "@/types";

// Tool parameters are plain JSON Schema; lib/support-chat/providers.ts
// adapts them to each model API's own shape.
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: "string" | "number"; description: string }>;
    required: string[];
  };
}

export const SUPPORT_TOOLS: ToolDefinition[] = [
  {
    name: "search_products",
    description:
      "Search the shop's live catalog. Returns up to 6 matching products with price, stock and link. The catalog search is English-only, so always pass English keywords (translate Sinhala/Tamil requests first), e.g. 'wireless earbuds', 'bluetooth speaker', 'type c charger'.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "English search keywords: product type, brand or model." },
        max_price: { type: "number", description: "Optional maximum price in LKR." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_product_details",
    description:
      "Full details of one product: description, colours/variants with price and stock, compatible devices, what's in the box, warranty, COD and free delivery. Use the slug from a search_products result.",
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The product's slug from search_products." },
      },
      required: ["slug"],
    },
  },
  {
    name: "get_offers",
    description:
      "Products in the campaigns and flash sales running right now, with their offer prices and stock. Use it when the customer asks what's on sale or what is in a campaign.",
    parameters: {
      type: "object",
      properties: {
        campaign: { type: "string", description: "Optional campaign name from CURRENT OFFERS, to show only that campaign." },
      },
      required: [],
    },
  },
  {
    name: "track_order",
    description:
      "Look up an order's status. Needs the order number AND the phone number or email the customer used at checkout.",
    parameters: {
      type: "object",
      properties: {
        order_number: { type: "string", description: "Order number, e.g. TM-000123." },
        contact: { type: "string", description: "Phone number or email used at checkout." },
      },
      required: ["order_number", "contact"],
    },
  },
];

const MAX_SEARCH_RESULTS = 6;
const MAX_DESCRIPTION_LENGTH = 1500;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toCard(p: ProductWithPrimaryImage): ProductCard {
  return {
    name: p.name,
    href: `/product/${p.slug}`,
    image: p.image,
    price: p.special_price ?? p.actual_price,
    regularPrice: p.special_price != null ? p.actual_price : undefined,
    priceVaries: p.hasMultiplePrices || undefined,
    inStock: p.stock > 0,
  };
}

function inStockFirst(cards: ProductCard[]): ProductCard[] {
  return [...cards].sort((a, b) => Number(b.inStock) - Number(a.inStock));
}

async function runSearchProducts(args: Record<string, unknown>, cards: CardCollector) {
  const query = str(args.query);
  if (!query) return { error: "A search query is required." };
  const maxPrice = typeof args.max_price === "number" && args.max_price > 0 ? args.max_price : undefined;

  const products = await searchProducts(query, { sort: "newest", maxPrice });
  if (products.length === 0) return { results: [], note: "No matching products found." };

  const top = products.slice(0, MAX_SEARCH_RESULTS);
  // In-stock first on the cards: a card the customer can't buy from is
  // the least useful thing to show at the top.
  cards.setSearchResults(inStockFirst(top.map(toCard)));

  // No links for the model: the widget shows each product as a card with
  // its own link, so the reply itself stays a short paragraph.
  return {
    results: top.map((p) => ({
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      price: p.special_price ?? p.actual_price,
      regular_price: p.special_price != null ? p.actual_price : undefined,
      price_varies_by_option: p.hasMultiplePrices || undefined,
      in_stock: p.stock > 0,
    })),
  };
}

const MAX_OFFER_PRODUCTS = 8;

async function runGetOffers(args: Record<string, unknown>, cards: CardCollector) {
  const wanted = str(args.campaign).toLowerCase();
  const active = await getActiveCampaigns();
  // A loose name match, so "big bang" finds "Big Bang Flash Sale"; when
  // nothing matches, every running campaign is a better answer than none.
  const matching = wanted
    ? active.filter((c) => c.name.toLowerCase().includes(wanted) || wanted.includes(c.name.toLowerCase()))
    : [];
  const campaigns = matching.length > 0 ? matching : active;
  if (campaigns.length === 0) return { campaigns: [], note: "No campaign is running right now." };

  const sections = await getCampaignSections(campaigns);
  const ids = [...new Set(sections.flatMap((s) => s.productIds))].slice(0, 40);
  const products = new Map((await getProductsByIds(ids)).map((p) => [p.id, p]));

  const shown: ProductWithPrimaryImage[] = [];
  const result = campaigns.map((campaign) => {
    const section = sections.find((s) => s.campaign.id === campaign.id);
    const items = (section?.productIds ?? [])
      .map((id) => products.get(id))
      .filter((p): p is ProductWithPrimaryImage => Boolean(p))
      .slice(0, MAX_OFFER_PRODUCTS);
    shown.push(...items);
    return {
      name: campaign.name,
      ends: campaign.end_at ? formatStoreDateTime(campaign.end_at) : undefined,
      free_delivery: campaign.free_shipping_enabled || undefined,
      product_count: section?.productIds.length ?? 0,
      products: items.map((p) => ({
        name: p.name,
        slug: p.slug,
        price: p.special_price ?? p.actual_price,
        regular_price: p.special_price != null ? p.actual_price : undefined,
        in_stock: p.stock > 0,
      })),
    };
  });

  cards.setSearchResults(inStockFirst(shown.map(toCard)));
  return { campaigns: result };
}

async function runGetProductDetails(args: Record<string, unknown>, cards: CardCollector) {
  const slug = str(args.slug);
  if (!slug) return { error: "A product slug is required." };

  const detail = await getProductDetailBySlug(slug);
  if (!detail) return { error: "Product not found." };
  const { product, variants, images } = detail;
  const options = variants.map((v) => {
    const price = getVariantPrice(v);
    return {
      colour: v.color_name,
      price,
      regular_price: price < v.regular_price ? v.regular_price : undefined,
      in_stock: v.stock == null ? product.stock > 0 : v.stock > 0,
      offer: v.campaign_name ?? undefined,
    };
  });

  if (options.length > 0) {
    const cheapest = options.reduce((a, b) => (b.price < a.price ? b : a));
    cards.addDetail({
      name: product.name,
      href: `/product/${product.slug}`,
      image: images[0]?.image_url ?? variants.find((v) => v.images.length > 0)?.images[0] ?? null,
      price: cheapest.price,
      regularPrice: cheapest.regular_price,
      priceVaries: new Set(options.map((o) => o.price)).size > 1 || undefined,
      inStock: product.stock > 0,
    });
  }

  return {
    name: product.name,
    brand: product.brand,
    model: product.model,
    description: htmlToPlainText(product.description).slice(0, MAX_DESCRIPTION_LENGTH),
    compatible_devices: product.compatible_devices,
    whats_in_box: product.whats_in_box,
    bluetooth: product.bluetooth,
    in_stock: product.stock > 0,
    cash_on_delivery: product.cod_available,
    free_delivery: product.free_delivery,
    warranty_available: product.warranty_available,
    options,
  };
}

async function runTrackOrder(args: Record<string, unknown>, cards: CardCollector) {
  // trackOrder applies the same order-number-plus-contact match and IP
  // rate limit as the /track-order page, so the chat can't be used to
  // probe other customers' orders any more than that page can.
  const result = await trackOrder(str(args.order_number), str(args.contact));
  if (!result.order) return { error: result.error ?? "Order not found." };
  const order = result.order;
  const items = order.items.map((item) => ({
    name: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
    quantity: item.quantity,
  }));
  cards.setOrder({
    orderNumber: order.orderNumber,
    status: order.orderStatus,
    paymentMethod: order.paymentMethod,
    total: order.total,
    items,
    trackingUrl: order.trackingUrl,
  });

  // Deliberately no name, phone, email or address: the model only needs
  // the order's progress to answer, and keeping personal details out of
  // the prompt keeps them out of the AI provider's hands too.
  return {
    order_number: order.orderNumber,
    order_status: order.orderStatus,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    delivery_method: order.deliveryMethod,
    placed_at: order.createdAt,
    total: order.total,
    items,
    courier: order.courier,
    tracking_number: order.trackingNumber,
    failure_reason: order.failureReason ?? undefined,
  };
}

export async function executeSupportTool(
  name: string,
  args: Record<string, unknown>,
  cards: CardCollector,
): Promise<unknown> {
  try {
    switch (name) {
      case "search_products":
        return await runSearchProducts(args, cards);
      case "get_product_details":
        return await runGetProductDetails(args, cards);
      case "get_offers":
        return await runGetOffers(args, cards);
      case "track_order":
        return await runTrackOrder(args, cards);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error(`[support-chat] tool ${name} failed`, error);
    return { error: "This lookup failed. Offer the customer WhatsApp support instead." };
  }
}
