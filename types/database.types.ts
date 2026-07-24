// Hand-written to match sql/001_schema.sql. Once you have a live Supabase
// project, regenerate this from the real schema with:
//   npx supabase gen types typescript --project-id <your-project-ref> > types/database.types.ts
// (see SETUP.md)

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type ProductStatus = "draft" | "published";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          image_path: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          image_path?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          image_path?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          actual_price: number;
          special_price: number | null;
          brand: string | null;
          model: string | null;
          compatible_devices: string[];
          bluetooth: boolean;
          sku: string | null;
          whats_in_box: string[];
          category_id: string;
          stock: number;
          status: ProductStatus;
          is_featured: boolean;
          meta_title: string | null;
          meta_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string;
          actual_price: number;
          special_price?: number | null;
          brand?: string | null;
          model?: string | null;
          compatible_devices?: string[];
          bluetooth?: boolean;
          sku?: string | null;
          whats_in_box?: string[];
          category_id: string;
          stock?: number;
          status?: ProductStatus;
          is_featured?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string;
          actual_price?: number;
          special_price?: number | null;
          brand?: string | null;
          model?: string | null;
          compatible_devices?: string[];
          bluetooth?: boolean;
          sku?: string | null;
          whats_in_box?: string[];
          category_id?: string;
          stock?: number;
          status?: ProductStatus;
          is_featured?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          image_url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          image_url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          image_url?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          color_name: string;
          color_hex: string;
          stock: number | null;
          variant_image_url: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          color_name: string;
          color_hex: string;
          stock?: number | null;
          variant_image_url?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          color_name?: string;
          color_hex?: string;
          stock?: number | null;
          variant_image_url?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_slug_redirects: {
        Row: {
          old_slug: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          old_slug: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          old_slug?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_slug_redirects_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_stock_notifications: {
        Row: {
          id: string;
          product_id: string;
          email: string;
          notified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          email: string;
          notified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          email?: string;
          notified?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_stock_notifications_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          shipping_address: string;
          status: OrderStatus;
          total: number;
          payment_method: string;
          payment_reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          shipping_address: string;
          status?: OrderStatus;
          total: number;
          payment_method?: string;
          payment_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          shipping_address?: string;
          status?: OrderStatus;
          total?: number;
          payment_method?: string;
          payment_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          unit_price: number;
          quantity: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          unit_price: number;
          quantity: number;
          subtotal: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          unit_price?: number;
          quantity?: number;
          subtotal?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
