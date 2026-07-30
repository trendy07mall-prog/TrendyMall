import type {
  Database,
  OrderStatus,
  PaymentStatus,
  OrderFulfillmentStatus,
  DeliveryMethod,
  PaymentGateway,
  CouponType,
  ProductStatus,
} from "./database.types";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
export type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type ShippingAddress = Database["public"]["Tables"]["shipping_addresses"]["Row"];
export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type CouponRedemption = Database["public"]["Tables"]["coupon_redemptions"]["Row"];
export type OrderStatusHistoryEntry = Database["public"]["Tables"]["order_status_history"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CustomerAddress = Database["public"]["Tables"]["customer_addresses"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type SiteBanner = Database["public"]["Tables"]["site_banner"]["Row"];
export type BankTransferSettings = Database["public"]["Tables"]["bank_transfer_settings"]["Row"];
export type ProductRatingSummary = Database["public"]["Views"]["product_rating_summary"]["Row"];
export type ProductSalesSummary = Database["public"]["Views"]["product_sales_summary"]["Row"];
export type {
  OrderStatus,
  PaymentStatus,
  OrderFulfillmentStatus,
  DeliveryMethod,
  PaymentGateway,
  CouponType,
  ProductStatus,
};

// Product listing/card contexts (category grid, search, new arrivals, shop)
// need exactly one representative image plus a rating summary for the card's
// star display; the base Product row carries neither since images live in
// product_images and ratings are aggregated from reviews.
export interface ProductWithPrimaryImage extends Product {
  image: string | null;
  avgRating: number;
  reviewCount: number;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
}

// The jsonb shape returned by both track_order and get_guest_order_by_id
// (sql/033) — a guest has no session, so both bypass RLS via a narrow,
// single-order-scoped security-definer function rather than a table read.
// get_guest_order_by_id's result is a strict superset of track_order's
// (adds orderId/customerName/customerEmail/customerPhone), hence those
// fields being optional here rather than two near-identical interfaces.
export interface GuestOrderItem {
  productName: string;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
}

export interface GuestOrderAddressDetail {
  street: string;
  city: string;
  district: string;
  postalCode: string | null;
}

export interface GuestOrderDetail {
  orderId?: string;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderFulfillmentStatus;
  paymentMethod: string;
  deliveryMethod: DeliveryMethod;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  notes?: string | null;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  createdAt: string;
  shippingAddress: string;
  shippingAddressDetail: GuestOrderAddressDetail | null;
  items: GuestOrderItem[];
}
