import type { Database, OrderStatus, ProductStatus } from "./database.types";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
export type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type { OrderStatus, ProductStatus };

// Product listing/card contexts (category grid, search, new arrivals, shop)
// need exactly one representative image; the base Product row carries no
// image reference at all now that images live in product_images.
export interface ProductWithPrimaryImage extends Product {
  image: string | null;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
}
