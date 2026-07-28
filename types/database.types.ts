// Hand-written to match sql/001_schema.sql. Once you have a live Supabase
// project, regenerate this from the real schema with:
//   npx supabase gen types typescript --project-id <your-project-ref> > types/database.types.ts
// (see SETUP.md)

// Legacy — still the type of orders.status, which Phase 1 of the payment/
// order-management rebuild (sql/020) deliberately keeps in place so the
// live checkout keeps working unmodified. Superseded by
// OrderFulfillmentStatus/PaymentStatus below once Phase 2's checkout
// rewrite cuts over; kept until that column is safe to drop.
export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "awaiting_verification"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type OrderFulfillmentStatus =
  | "pending"
  | "confirmed"
  | "packing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type DeliveryMethod = "standard" | "pickup";

export type PaymentGateway = "cod" | "bank_transfer" | "payhere";

export type CouponType = "percentage" | "fixed" | "free_shipping";

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
          keywords: string | null;
          view_count: number;
          cod_available: boolean;
          free_delivery: boolean;
          warranty_available: boolean;
          search_vector: unknown;
          is_deleted: boolean;
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
          keywords?: string | null;
          view_count?: number;
          cod_available?: boolean;
          free_delivery?: boolean;
          warranty_available?: boolean;
          is_deleted?: boolean;
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
          keywords?: string | null;
          view_count?: number;
          cod_available?: boolean;
          free_delivery?: boolean;
          warranty_available?: boolean;
          is_deleted?: boolean;
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
      subscribers: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      site_banner: {
        Row: {
          id: string;
          message: string;
          link_url: string | null;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          message: string;
          link_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          message?: string;
          link_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      bank_transfer_settings: {
        Row: {
          id: string;
          bank_name: string;
          account_name: string;
          account_number: string;
          branch: string;
          instructions: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bank_name: string;
          account_name: string;
          account_number: string;
          branch: string;
          instructions?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bank_name?: string;
          account_name?: string;
          account_number?: string;
          branch?: string;
          instructions?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          rating: number;
          title: string | null;
          comment: string | null;
          verified_purchase: boolean;
          status: "pending" | "approved" | "rejected";
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          rating: number;
          title?: string | null;
          comment?: string | null;
          verified_purchase?: boolean;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          rating?: number;
          title?: string | null;
          comment?: string | null;
          verified_purchase?: boolean;
          status?: "pending" | "approved" | "rejected";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey";
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
          user_id: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          shipping_address: string;
          status: OrderStatus;
          payment_status: PaymentStatus;
          order_status: OrderFulfillmentStatus;
          total: number;
          subtotal: number;
          shipping_fee: number;
          discount: number;
          delivery_method: DeliveryMethod;
          payment_method: string;
          payment_reference: string | null;
          order_number: string;
          courier: string | null;
          tracking_number: string | null;
          tracking_url: string | null;
          notes: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          shipping_address: string;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          order_status?: OrderFulfillmentStatus;
          total: number;
          subtotal?: number;
          shipping_fee?: number;
          discount?: number;
          delivery_method?: DeliveryMethod;
          payment_method?: string;
          payment_reference?: string | null;
          order_number?: string;
          courier?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          shipping_address?: string;
          status?: OrderStatus;
          payment_status?: PaymentStatus;
          order_status?: OrderFulfillmentStatus;
          total?: number;
          subtotal?: number;
          shipping_fee?: number;
          discount?: number;
          delivery_method?: DeliveryMethod;
          payment_method?: string;
          payment_reference?: string | null;
          order_number?: string;
          courier?: string | null;
          tracking_number?: string | null;
          tracking_url?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
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
          product_image_url: string | null;
          variant_name: string | null;
          variant_color_hex: string | null;
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
          product_image_url?: string | null;
          variant_name?: string | null;
          variant_color_hex?: string | null;
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
          product_image_url?: string | null;
          variant_name?: string | null;
          variant_color_hex?: string | null;
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
      payments: {
        Row: {
          id: string;
          order_id: string;
          gateway: PaymentGateway;
          transaction_id: string | null;
          reference_number: string | null;
          slip_url: string | null;
          amount: number;
          currency: string;
          status: PaymentStatus;
          raw_gateway_response: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          gateway: PaymentGateway;
          transaction_id?: string | null;
          reference_number?: string | null;
          slip_url?: string | null;
          amount: number;
          currency?: string;
          status?: PaymentStatus;
          raw_gateway_response?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          gateway?: PaymentGateway;
          transaction_id?: string | null;
          reference_number?: string | null;
          slip_url?: string | null;
          amount?: number;
          currency?: string;
          status?: PaymentStatus;
          raw_gateway_response?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      shipping_addresses: {
        Row: {
          id: string;
          order_id: string;
          first_name: string;
          last_name: string;
          phone: string;
          email: string;
          street: string;
          city: string;
          district: string;
          postal_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          first_name: string;
          last_name: string;
          phone: string;
          email: string;
          street: string;
          city: string;
          district: string;
          postal_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          first_name?: string;
          last_name?: string;
          phone?: string;
          email?: string;
          street?: string;
          city?: string;
          district?: string;
          postal_code?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shipping_addresses_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          type: CouponType;
          value: number;
          min_order_value: number;
          usage_limit: number | null;
          usage_limit_per_customer: number | null;
          usage_count: number;
          starts_at: string | null;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          type: CouponType;
          value?: number;
          min_order_value?: number;
          usage_limit?: number | null;
          usage_limit_per_customer?: number | null;
          usage_count?: number;
          starts_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          type?: CouponType;
          value?: number;
          min_order_value?: number;
          usage_limit?: number | null;
          usage_limit_per_customer?: number | null;
          usage_count?: number;
          starts_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coupon_redemptions: {
        Row: {
          id: string;
          coupon_id: string;
          order_id: string;
          user_id: string | null;
          discount_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          order_id: string;
          user_id?: string | null;
          discount_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          order_id?: string;
          user_id?: string | null;
          discount_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          changed_by: string | null;
          field: "order_status" | "payment_status";
          old_value: string | null;
          new_value: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          changed_by?: string | null;
          field: "order_status" | "payment_status";
          old_value?: string | null;
          new_value: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          changed_by?: string | null;
          field?: "order_status" | "payment_status";
          old_value?: string | null;
          new_value?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      product_rating_summary: {
        Row: {
          product_id: string;
          avg_rating: number;
          review_count: number;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_sales_summary: {
        Row: {
          product_id: string;
          units_sold: number;
        };
        Relationships: [
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
    Functions: {
      track_order: {
        Args: { p_order_number: string; p_phone: string };
        Returns: {
          order_number: string;
          status: OrderStatus;
          total: number;
          created_at: string;
        }[];
      };
      increment_product_view_count: {
        Args: { p_product_id: string };
        Returns: undefined;
      };
      reduce_stock: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: boolean;
      };
      restore_stock: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: undefined;
      };
      create_order_atomic: {
        Args: {
          p_customer_name: string;
          p_customer_email: string;
          p_customer_phone: string;
          p_shipping_first_name: string;
          p_shipping_last_name: string;
          p_shipping_street: string;
          p_shipping_city: string;
          p_shipping_district: string;
          p_shipping_postal_code: string | null;
          p_delivery_method: string;
          p_payment_method: string;
          p_notes: string | null;
          p_items: { product_id: string; quantity: number }[];
          p_client_total: number | null;
          p_payment_reference?: string | null;
          p_slip_url?: string | null;
        };
        Returns: { order_id: string; order_number: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
