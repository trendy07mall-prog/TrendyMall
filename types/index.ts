import type { Database, OrderStatus, ProductStatus } from "./database.types";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
export type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type SiteBanner = Database["public"]["Tables"]["site_banner"]["Row"];
export type ProductRatingSummary = Database["public"]["Views"]["product_rating_summary"]["Row"];
export type { OrderStatus, ProductStatus };

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
