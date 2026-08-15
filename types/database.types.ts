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
  | "returned"
  | "failed_delivery";

export type DeliveryMethod = "standard" | "pickup";

export type PaymentGateway = "cod" | "bank_transfer" | "payhere";

export type CouponType = "percentage" | "fixed" | "free_shipping";

export type ProductStatus = "draft" | "published";

export type CampaignStatus = "draft" | "published" | "disabled";

export type CampaignPromotionType = "product_discount" | "flash_sale" | "free_shipping" | "coupon";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          is_admin: boolean;
          email_notifications: boolean;
          preferred_payment_method: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          is_admin?: boolean;
          email_notifications?: boolean;
          preferred_payment_method?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          is_admin?: boolean;
          email_notifications?: boolean;
          preferred_payment_method?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      customer_addresses: {
        Row: {
          id: string;
          customer_id: string;
          address_label: string | null;
          first_name: string;
          last_name: string;
          phone: string;
          street: string;
          city: string;
          district: string;
          postal_code: string | null;
          is_default: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          address_label?: string | null;
          first_name: string;
          last_name: string;
          phone: string;
          street: string;
          city: string;
          district: string;
          postal_code?: string | null;
          is_default?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          address_label?: string | null;
          first_name?: string;
          last_name?: string;
          phone?: string;
          street?: string;
          city?: string;
          district?: string;
          postal_code?: string | null;
          is_default?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_error_log: {
        Row: {
          id: string;
          reference_code: string;
          error_code: string | null;
          error_message: string | null;
          error_detail: string | null;
          error_hint: string | null;
          context: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          reference_code: string;
          error_code?: string | null;
          error_message?: string | null;
          error_detail?: string | null;
          error_hint?: string | null;
          context?: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          reference_code?: string;
          error_code?: string | null;
          error_message?: string | null;
          error_detail?: string | null;
          error_hint?: string | null;
          context?: unknown;
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
          parent_id: string | null;
          depth: number;
          path: string;
          is_active: boolean;
          spec_template_id: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          image_path?: string | null;
          sort_order?: number;
          created_at?: string;
          parent_id?: string | null;
          depth?: number;
          path?: string;
          is_active?: boolean;
          spec_template_id?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          image_path?: string | null;
          sort_order?: number;
          created_at?: string;
          parent_id?: string | null;
          depth?: number;
          path?: string;
          is_active?: boolean;
          spec_template_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "categories_spec_template_id_fkey";
            columns: ["spec_template_id"];
            isOneToOne: false;
            referencedRelation: "spec_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      category_slug_redirects: {
        Row: {
          old_slug: string;
          category_id: string;
          created_at: string;
        };
        Insert: {
          old_slug: string;
          category_id: string;
          created_at?: string;
        };
        Update: {
          old_slug?: string;
          category_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_slug_redirects_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_path: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_path?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_path?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      product_tags: {
        Row: {
          product_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          product_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          product_id?: string;
          tag_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      attributes: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      attribute_values: {
        Row: {
          id: string;
          attribute_id: string;
          value: string;
          slug: string;
          color_hex: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          attribute_id: string;
          value: string;
          slug: string;
          color_hex?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          attribute_id?: string;
          value?: string;
          slug?: string;
          color_hex?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey";
            columns: ["attribute_id"];
            isOneToOne: false;
            referencedRelation: "attributes";
            referencedColumns: ["id"];
          },
        ];
      };
      product_attribute_values: {
        Row: {
          product_id: string;
          attribute_value_id: string;
          created_at: string;
        };
        Insert: {
          product_id: string;
          attribute_value_id: string;
          created_at?: string;
        };
        Update: {
          product_id?: string;
          attribute_value_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_attribute_values_attribute_value_id_fkey";
            columns: ["attribute_value_id"];
            isOneToOne: false;
            referencedRelation: "attribute_values";
            referencedColumns: ["id"];
          },
        ];
      };
      spec_templates: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      spec_fields: {
        Row: {
          id: string;
          template_id: string;
          label: string;
          field_key: string;
          field_type: string;
          unit: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          label: string;
          field_key: string;
          field_type?: string;
          unit?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          label?: string;
          field_key?: string;
          field_type?: string;
          unit?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spec_fields_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "spec_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      product_spec_values: {
        Row: {
          product_id: string;
          spec_field_id: string;
          value: string;
        };
        Insert: {
          product_id: string;
          spec_field_id: string;
          value: string;
        };
        Update: {
          product_id?: string;
          spec_field_id?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_spec_values_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_spec_values_spec_field_id_fkey";
            columns: ["spec_field_id"];
            isOneToOne: false;
            referencedRelation: "spec_fields";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          brand: string | null;
          brand_id: string | null;
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
          brand?: string | null;
          brand_id?: string | null;
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
          brand?: string | null;
          brand_id?: string | null;
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
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
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
          color_name: string | null;
          color_hex: string | null;
          stock: number | null;
          regular_price: number;
          sale_price: number | null;
          sku: string | null;
          variant_image_url: string | null;
          sort_order: number;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          color_name?: string | null;
          color_hex?: string | null;
          stock?: number | null;
          regular_price: number;
          sale_price?: number | null;
          sku?: string | null;
          variant_image_url?: string | null;
          sort_order?: number;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          color_name?: string | null;
          color_hex?: string | null;
          stock?: number | null;
          regular_price?: number;
          sale_price?: number | null;
          sku?: string | null;
          variant_image_url?: string | null;
          sort_order?: number;
          is_default?: boolean;
          is_active?: boolean;
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
      product_variant_images: {
        Row: {
          id: string;
          variant_id: string;
          image_url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          image_url: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          image_url?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variant_images_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variant_attribute_values: {
        Row: {
          variant_id: string;
          attribute_value_id: string;
          created_at: string;
        };
        Insert: {
          variant_id: string;
          attribute_value_id: string;
          created_at?: string;
        };
        Update: {
          variant_id?: string;
          attribute_value_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variant_attribute_values_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variant_attribute_values_attribute_value_id_fkey";
            columns: ["attribute_value_id"];
            isOneToOne: false;
            referencedRelation: "attribute_values";
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
      store_settings: {
        Row: {
          key: string;
          value: unknown;
          type: string;
          group_name: string;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: unknown;
          type: string;
          group_name: string;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: unknown;
          type?: string;
          group_name?: string;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      hero_slides: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          button_text: string | null;
          button_link: string | null;
          desktop_image_url: string;
          mobile_image_url: string;
          status: string;
          sort_order: number;
          start_at: string | null;
          end_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          button_text?: string | null;
          button_link?: string | null;
          desktop_image_url: string;
          mobile_image_url: string;
          status?: string;
          sort_order?: number;
          start_at?: string | null;
          end_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subtitle?: string | null;
          button_text?: string | null;
          button_link?: string | null;
          desktop_image_url?: string;
          mobile_image_url?: string;
          status?: string;
          sort_order?: number;
          start_at?: string | null;
          end_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      delivery_zones: {
        Row: {
          id: string;
          name: string;
          postal_code_start: string | null;
          postal_code_end: string | null;
          district_match: string | null;
          rate: number;
          is_default: boolean;
          status: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          postal_code_start?: string | null;
          postal_code_end?: string | null;
          district_match?: string | null;
          rate: number;
          is_default?: boolean;
          status?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          postal_code_start?: string | null;
          postal_code_end?: string | null;
          district_match?: string | null;
          rate?: number;
          is_default?: boolean;
          status?: string;
          sort_order?: number;
          created_at?: string;
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
          delivery_attempt_count: number;
          delivery_failure_reason: string | null;
          notes: string | null;
          deleted_at: string | null;
          idempotency_key: string | null;
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
          delivery_attempt_count?: number;
          delivery_failure_reason?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
          idempotency_key?: string | null;
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
          delivery_attempt_count?: number;
          delivery_failure_reason?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
          idempotency_key?: string | null;
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
          variant_id: string | null;
          variant_name: string | null;
          variant_color_hex: string | null;
          attribute_selections: unknown | null;
          campaign_id: string | null;
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
          variant_id?: string | null;
          variant_name?: string | null;
          variant_color_hex?: string | null;
          attribute_selections?: unknown | null;
          campaign_id?: string | null;
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
          variant_id?: string | null;
          variant_name?: string | null;
          variant_color_hex?: string | null;
          attribute_selections?: unknown | null;
          campaign_id?: string | null;
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
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
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
          source_address_id: string | null;
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
          source_address_id?: string | null;
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
          source_address_id?: string | null;
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
          title: string | null;
          description: string | null;
          type: CouponType;
          value: number;
          min_order_value: number;
          max_discount_amount: number | null;
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
          title?: string | null;
          description?: string | null;
          type: CouponType;
          value?: number;
          min_order_value?: number;
          max_discount_amount?: number | null;
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
          title?: string | null;
          description?: string | null;
          type?: CouponType;
          value?: number;
          min_order_value?: number;
          max_discount_amount?: number | null;
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
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          variant_id: string | null;
          variant_key: string;
          quantity: number;
          attribute_selections: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          variant_id?: string | null;
          quantity: number;
          attribute_selections?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          variant_id?: string | null;
          quantity?: number;
          attribute_selections?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          status: CampaignStatus;
          is_archived: boolean;
          promotion_type: CampaignPromotionType;
          start_at: string;
          end_at: string | null;
          free_shipping_enabled: boolean;
          desktop_banner_url: string | null;
          mobile_banner_url: string | null;
          thumbnail_url: string | null;
          show_on_homepage: boolean;
          show_in_shop: boolean;
          show_badge: boolean;
          badge_label: string | null;
          show_countdown: boolean;
          meta_title: string | null;
          meta_description: string | null;
          og_image_url: string | null;
          ending_soon_notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          status?: CampaignStatus;
          is_archived?: boolean;
          promotion_type: CampaignPromotionType;
          start_at: string;
          end_at?: string | null;
          free_shipping_enabled?: boolean;
          desktop_banner_url?: string | null;
          mobile_banner_url?: string | null;
          thumbnail_url?: string | null;
          show_on_homepage?: boolean;
          show_in_shop?: boolean;
          show_badge?: boolean;
          badge_label?: string | null;
          show_countdown?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          og_image_url?: string | null;
          ending_soon_notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          status?: CampaignStatus;
          is_archived?: boolean;
          promotion_type?: CampaignPromotionType;
          start_at?: string;
          end_at?: string | null;
          free_shipping_enabled?: boolean;
          desktop_banner_url?: string | null;
          mobile_banner_url?: string | null;
          thumbnail_url?: string | null;
          show_on_homepage?: boolean;
          show_in_shop?: boolean;
          show_badge?: boolean;
          badge_label?: string | null;
          show_countdown?: boolean;
          meta_title?: string | null;
          meta_description?: string | null;
          og_image_url?: string | null;
          ending_soon_notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_sections: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_sections_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_items: {
        Row: {
          id: string;
          campaign_id: string;
          section_id: string | null;
          product_id: string;
          variant_id: string;
          campaign_price: number;
          discount_percentage: number | null;
          reference_price_snapshot: number | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          section_id?: string | null;
          product_id: string;
          variant_id: string;
          campaign_price: number;
          discount_percentage?: number | null;
          reference_price_snapshot?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          section_id?: string | null;
          product_id?: string;
          variant_id?: string;
          campaign_price?: number;
          discount_percentage?: number | null;
          reference_price_snapshot?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_items_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "campaign_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          name: string;
          category: string;
          amount: number;
          expense_date: string;
          payment_method: string;
          note: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          amount: number;
          expense_date: string;
          payment_method: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          amount?: number;
          expense_date?: string;
          payment_method?: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      commission_category_rules: {
        Row: {
          id: string;
          category_id: string;
          commission_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          commission_percent: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          commission_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "commission_category_rules_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: true;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_settlements: {
        Row: {
          id: string;
          order_id: string;
          release_amount: number;
          commission: number;
          payment_fee: number;
          shipping_fee: number;
          release_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          release_amount?: number;
          commission?: number;
          payment_fee?: number;
          shipping_fee?: number;
          release_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          release_amount?: number;
          commission?: number;
          payment_fee?: number;
          shipping_fee?: number;
          release_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_settlements_order_id_fkey";
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
        Args: { p_order_number: string; p_contact: string };
        Returns: unknown;
      };
      get_guest_order_by_id: {
        Args: { p_order_id: string };
        Returns: unknown;
      };
      get_order_confirmation: {
        Args: { p_order_number: string; p_token?: string | null };
        Returns: unknown;
      };
      check_guest_lookup_rate_limit: {
        Args: { p_ip: string; p_max_attempts?: number; p_window_minutes?: number };
        Returns: boolean;
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
      cancel_order_atomic: {
        Args: {
          p_order_id: string;
          p_new_order_status: string;
          p_new_payment_status?: string | null;
          p_note?: string | null;
        };
        Returns: boolean;
      };
      mark_delivery_failed: {
        Args: { p_order_id: string; p_reason: string };
        Returns: boolean;
      };
      reattempt_delivery: {
        Args: { p_order_id: string };
        Returns: boolean;
      };
      cancel_own_order: {
        Args: { p_order_id: string };
        Returns: boolean;
      };
      is_my_email_subscribed: {
        Args: Record<string, never>;
        Returns: boolean;
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
          p_coupon_code?: string | null;
          p_source_address_id?: string | null;
          p_idempotency_key?: string | null;
          p_client_shipping_fee?: number | null;
        };
        Returns: { order_id: string; order_number: string }[];
      };
      set_default_address: {
        Args: { p_address_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
