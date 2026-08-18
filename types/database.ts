export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string; email: string; role: string; phone: string | null; avatar_url: string | null; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; full_name: string; email: string; role?: string; phone?: string | null; avatar_url?: string | null; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { full_name?: string; email?: string; role?: string; phone?: string | null; avatar_url?: string | null; is_active?: boolean; updated_at?: string }
        Relationships: []
      }
      customers: {
        Row: { id: string; name: string; phone: string; email: string | null; address: string | null; notes: string | null; tier: string; total_spending: number; total_orders: number; last_order_date: string | null; is_manual: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; phone: string; email?: string | null; address?: string | null; notes?: string | null; tier?: string; total_spending?: number; total_orders?: number; last_order_date?: string | null; is_manual?: boolean; created_at?: string; updated_at?: string }
        Update: { name?: string; email?: string | null; address?: string | null; notes?: string | null; tier?: string; total_spending?: number; total_orders?: number; last_order_date?: string | null; updated_at?: string }
        Relationships: []
      }
      products: {
        Row: { id: string; name: string; name_en: string | null; description: string | null; category: string | null; category_id: string | null; selling_price: number; cost_price: number; current_stock: number; min_stock: number; image_url: string | null; is_active: boolean; is_available_online: boolean; online_description: string | null; online_sort_order: number; is_featured: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; name_en?: string | null; description?: string | null; category?: string | null; category_id?: string | null; selling_price?: number; cost_price?: number; current_stock?: number; min_stock?: number; image_url?: string | null; is_active?: boolean; is_available_online?: boolean; online_description?: string | null; online_sort_order?: number; is_featured?: boolean; created_at?: string; updated_at?: string }
        Update: { name?: string; name_en?: string | null; description?: string | null; category?: string | null; category_id?: string | null; selling_price?: number; cost_price?: number; current_stock?: number; min_stock?: number; image_url?: string | null; is_active?: boolean; is_available_online?: boolean; online_description?: string | null; online_sort_order?: number; is_featured?: boolean; updated_at?: string }
        Relationships: [
          { foreignKeyName: "products_category_id_fkey"; columns: ["category_id"]; referencedRelation: "product_categories"; referencedColumns: ["id"] }
        ]
      }
      product_reviews: {
        Row: { id: string; product_id: string; order_id: string; customer_name: string; customer_phone: string; rating: number; comment: string | null; is_featured: boolean; created_at: string }
        Insert: { id?: string; product_id: string; order_id: string; customer_name: string; customer_phone: string; rating: number; comment?: string | null; is_featured?: boolean; created_at?: string }
        Update: { comment?: string | null; is_featured?: boolean }
        Relationships: [{ foreignKeyName: "product_reviews_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }]
      }
      product_categories: {
        Row: { id: string; name: string; name_en: string | null; emoji: string | null; description: string | null; sort_order: number; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; name_en?: string | null; emoji?: string | null; description?: string | null; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { name?: string; name_en?: string | null; emoji?: string | null; description?: string | null; sort_order?: number; is_active?: boolean; updated_at?: string }
        Relationships: []
      }
      product_variants: {
        Row: { id: string; product_id: string; name: string; option_text: string | null; price: number; cost_price: number; sort_order: number; is_active: boolean; image_url: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; product_id: string; name: string; option_text?: string | null; price?: number; cost_price?: number; sort_order?: number; is_active?: boolean; image_url?: string | null; created_at?: string; updated_at?: string }
        Update: { name?: string; option_text?: string | null; price?: number; cost_price?: number; sort_order?: number; is_active?: boolean; image_url?: string | null; updated_at?: string }
        Relationships: [{ foreignKeyName: "product_variants_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }]
      }
      product_addons: {
        Row: { id: string; product_id: string; name: string; price: number; sort_order: number; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; product_id: string; name: string; price?: number; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { name?: string; price?: number; sort_order?: number; is_active?: boolean; updated_at?: string }
        Relationships: [{ foreignKeyName: "product_addons_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }]
      }
      product_option_groups: {
        Row: { id: string; product_id: string; name: string; display_type: string; sort_order: number; is_required: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; product_id: string; name: string; display_type?: string; sort_order?: number; is_required?: boolean; created_at?: string; updated_at?: string }
        Update: { name?: string; display_type?: string; sort_order?: number; is_required?: boolean; updated_at?: string }
        Relationships: [{ foreignKeyName: "product_option_groups_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }]
      }
      product_option_values: {
        Row: { id: string; group_id: string; value: string; sort_order: number; image_url: string | null; is_active: boolean; created_at: string }
        Insert: { id?: string; group_id: string; value: string; sort_order?: number; image_url?: string | null; is_active?: boolean; created_at?: string }
        Update: { value?: string; sort_order?: number; image_url?: string | null; is_active?: boolean }
        Relationships: [{ foreignKeyName: "product_option_values_group_id_fkey"; columns: ["group_id"]; referencedRelation: "product_option_groups"; referencedColumns: ["id"] }]
      }
      variant_option_values: {
        Row: { id: string; variant_id: string; option_value_id: string }
        Insert: { id?: string; variant_id: string; option_value_id: string }
        Update: { variant_id?: string; option_value_id?: string }
        Relationships: [
          { foreignKeyName: "variant_option_values_variant_id_fkey"; columns: ["variant_id"]; referencedRelation: "product_variants"; referencedColumns: ["id"] },
          { foreignKeyName: "variant_option_values_option_value_id_fkey"; columns: ["option_value_id"]; referencedRelation: "product_option_values"; referencedColumns: ["id"] }
        ]
      }
      product_tags: {
        Row: { id: string; name: string; emoji: string | null; created_at: string }
        Insert: { id?: string; name: string; emoji?: string | null; created_at?: string }
        Update: { name?: string; emoji?: string | null }
        Relationships: []
      }
      product_tags_junction: {
        Row: { product_id: string; tag_id: string }
        Insert: { product_id: string; tag_id: string }
        Update: { product_id?: string; tag_id?: string }
        Relationships: [
          { foreignKeyName: "product_tags_junction_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "product_tags_junction_tag_id_fkey"; columns: ["tag_id"]; referencedRelation: "product_tags"; referencedColumns: ["id"] }
        ]
      }
      product_gallery: {
        Row: { id: string; product_id: string; variant_id: string | null; image_url: string; caption: string | null; sort_order: number; is_primary: boolean; created_at: string }
        Insert: { id?: string; product_id: string; variant_id?: string | null; image_url: string; caption?: string | null; sort_order?: number; is_primary?: boolean; created_at?: string }
        Update: { variant_id?: string | null; image_url?: string; caption?: string | null; sort_order?: number; is_primary?: boolean }
        Relationships: [{ foreignKeyName: "product_gallery_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }]
      }
      price_history: {
        Row: { id: string; product_id: string | null; variant_id: string | null; old_price: number; new_price: number; changed_by: string | null; reason: string | null; created_at: string }
        Insert: { id?: string; product_id?: string | null; variant_id?: string | null; old_price: number; new_price: number; changed_by?: string | null; reason?: string | null; created_at?: string }
        Update: { reason?: string | null }
        Relationships: [
          { foreignKeyName: "price_history_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "price_history_variant_id_fkey"; columns: ["variant_id"]; referencedRelation: "product_variants"; referencedColumns: ["id"] },
          { foreignKeyName: "price_history_changed_by_fkey"; columns: ["changed_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      orders: {
        Row: { id: string; order_number: string; customer_name: string; customer_phone: string; customer_email: string | null; customer_address: string | null; order_type: string; pickup_date: string | null; pickup_time: string | null; delivery_address: string | null; notes: string | null; subtotal: number; discount_amount: number; total_amount: number; status: string; payment_status: string; payment_proof_url: string | null; payment_confirmed_at: string | null; payment_confirmed_by: string | null; sale_id: string | null; source: string | null; created_at: string; updated_at: string; confirmed_at: string | null; confirmed_by: string | null }
        Insert: { id?: string; order_number: string; customer_name: string; customer_phone: string; customer_email?: string | null; customer_address?: string | null; order_type?: string; pickup_date?: string | null; pickup_time?: string | null; delivery_address?: string | null; notes?: string | null; subtotal?: number; discount_amount?: number; total_amount?: number; status?: string; payment_status?: string; payment_proof_url?: string | null; payment_confirmed_at?: string | null; payment_confirmed_by?: string | null; sale_id?: string | null; source?: string | null; created_at?: string; updated_at?: string; confirmed_at?: string | null; confirmed_by?: string | null }
        Update: { status?: string; payment_status?: string; payment_proof_url?: string | null; payment_confirmed_at?: string | null; payment_confirmed_by?: string | null; sale_id?: string | null; confirmed_at?: string | null; confirmed_by?: string | null; updated_at?: string; notes?: string | null }
        Relationships: [{ foreignKeyName: "orders_confirmed_by_fkey"; columns: ["confirmed_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      order_items: {
        Row: { id: string; order_id: string; product_id: string; product_name: string; quantity: number; unit_price: number; subtotal: number; notes: string | null; variant_id: string | null; variant_name: string | null; variant_price: number | null; addons: Json | null; created_at: string }
        Insert: { id?: string; order_id: string; product_id?: string; product_name: string; quantity: number; unit_price: number; subtotal: number; notes?: string | null; variant_id?: string | null; variant_name?: string | null; variant_price?: number | null; addons?: Json | null; created_at?: string }
        Update: { product_name?: string; quantity?: number; unit_price?: number; subtotal?: number; notes?: string | null; variant_id?: string | null; variant_name?: string | null; variant_price?: number | null; addons?: Json | null }
        Relationships: [
          { foreignKeyName: "order_items_order_id_fkey"; columns: ["order_id"]; referencedRelation: "orders"; referencedColumns: ["id"] },
          { foreignKeyName: "order_items_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }
        ]
      }
      sales: {
        Row: { id: string; invoice_number: string; subtotal: number; discount_amount: number; discount_percent: number; tax_amount: number; total: number; payment_method: string | null; payment_amount: number | null; change_amount: number | null; customer_name: string | null; notes: string | null; status: string; cashier_id: string | null; created_at: string; cogs: number | null; gross_profit: number | null; stock_deducted: boolean }
        Insert: { id?: string; invoice_number: string; subtotal: number; discount_amount?: number; discount_percent?: number; tax_amount?: number; total: number; payment_method?: string | null; payment_amount?: number | null; change_amount?: number | null; customer_name?: string | null; notes?: string | null; status?: string; cashier_id?: string | null; created_at?: string; cogs?: number | null; gross_profit?: number | null; stock_deducted?: boolean }
        Update: { status?: string; notes?: string | null; cogs?: number | null; gross_profit?: number | null; stock_deducted?: boolean }
        Relationships: [{ foreignKeyName: "sales_cashier_id_fkey"; columns: ["cashier_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      sale_items: {
        Row: { id: string; sale_id: string; product_id: string | null; batch_id: string | null; product_name: string; quantity: number; unit_price: number; subtotal: number; variant_name: string | null; variant_price: number | null; addons: Json | null; created_at: string }
        Insert: { id?: string; sale_id: string; product_id?: string | null; batch_id?: string | null; product_name: string; quantity: number; unit_price: number; subtotal: number; variant_name?: string | null; variant_price?: number | null; addons?: Json | null; created_at?: string }
        Update: { quantity?: number; unit_price?: number; subtotal?: number; variant_name?: string | null; variant_price?: number | null; addons?: Json | null }
        Relationships: [
          { foreignKeyName: "sale_items_sale_id_fkey"; columns: ["sale_id"]; referencedRelation: "sales"; referencedColumns: ["id"] },
          { foreignKeyName: "sale_items_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "sale_items_batch_id_fkey"; columns: ["batch_id"]; referencedRelation: "production_batches"; referencedColumns: ["id"] }
        ]
      }
      custom_cake_requests: {
        Row: { id: string; req_number: string; customer_name: string; customer_phone: string; size: string; flavor: string; color_theme: string | null; special_notes: string | null; reference_image_url: string | null; quoted_price: number | null; status: string; created_at: string; updated_at: string }
        Insert: { id?: string; req_number: string; customer_name: string; customer_phone: string; size: string; flavor: string; color_theme?: string | null; special_notes?: string | null; reference_image_url?: string | null; quoted_price?: number | null; status?: string; created_at?: string; updated_at?: string }
        Update: { quoted_price?: number | null; status?: string; updated_at?: string }
        Relationships: []
      }
      store_settings: {
        Row: { id: number; company_name: string; short_name: string; tagline: string; logo_url: string | null; logo_icon_url: string | null; favicon_url: string | null; primary_color: string; primary_color_hex: string; accent_color: string; sidebar_color: string; background_color: string; surface_color: string; text_color: string; text_muted_color: string; border_color: string; button_text_color: string; success_color: string; danger_color: string; warning_color: string; sidebar_text_color: string; footer_bg_color: string; footer_text_color: string; text_secondary_color: string; accent_foreground_color: string; surface_raised_color: string; email: string; phone: string; address: string; currency_code: string; locale: string; receipt_footer: string; business_hours: string; features: Json; whatsapp: string; instagram: string; facebook: string; updated_at: string; updated_by: string | null }
        Insert: { id?: number; company_name?: string; short_name?: string; tagline?: string; logo_url?: string | null; logo_icon_url?: string | null; favicon_url?: string | null; primary_color?: string; primary_color_hex?: string; accent_color?: string; sidebar_color?: string; background_color?: string; surface_color?: string; text_color?: string; text_muted_color?: string; text_secondary_color?: string; border_color?: string; button_text_color?: string; accent_foreground_color?: string; success_color?: string; danger_color?: string; warning_color?: string; sidebar_text_color?: string; footer_bg_color?: string; footer_text_color?: string; surface_raised_color?: string; email?: string; phone?: string; address?: string; currency_code?: string; locale?: string; receipt_footer?: string; business_hours?: string; features?: Json; whatsapp?: string; instagram?: string; facebook?: string; updated_at?: string; updated_by?: string | null }
        Update: { company_name?: string; short_name?: string; tagline?: string; logo_url?: string | null; logo_icon_url?: string | null; favicon_url?: string | null; primary_color?: string; primary_color_hex?: string; accent_color?: string; sidebar_color?: string; background_color?: string; surface_color?: string; text_color?: string; text_muted_color?: string; text_secondary_color?: string; border_color?: string; button_text_color?: string; accent_foreground_color?: string; success_color?: string; danger_color?: string; warning_color?: string; sidebar_text_color?: string; footer_bg_color?: string; footer_text_color?: string; surface_raised_color?: string; whatsapp?: string; instagram?: string; facebook?: string; updated_at?: string; updated_by?: string | null }
        Relationships: [{ foreignKeyName: "store_settings_updated_by_fkey"; columns: ["updated_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; endpoint: string; p256dh: string; auth: string; created_at?: string; updated_at?: string }
        Update: { endpoint?: string; p256dh?: string; auth?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "push_subscriptions_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      expenses: {
        Row: { id: string; category: string; description: string; amount: number; expense_date: string; receipt_url: string | null; created_by: string | null; created_at: string }
        Insert: { id?: string; category: string; description: string; amount: number; expense_date: string; receipt_url?: string | null; created_by?: string | null; created_at?: string }
        Update: { category?: string; description?: string; amount?: number; expense_date?: string; receipt_url?: string | null }
        Relationships: [{ foreignKeyName: "expenses_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      suppliers: {
        Row: { id: string; name: string; contact_person: string | null; phone: string | null; email: string | null; address: string | null; notes: string | null; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; contact_person?: string | null; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { name?: string; contact_person?: string | null; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null; is_active?: boolean; updated_at?: string }
        Relationships: []
      }
      ingredient_categories: {
        Row: { id: string; name: string; name_en: string | null; description: string | null; created_at: string }
        Insert: { id?: string; name: string; name_en?: string | null; description?: string | null; created_at?: string }
        Update: { name?: string; name_en?: string | null; description?: string | null }
        Relationships: []
      }
      ingredients: {
        Row: { id: string; code: string | null; category_id: string | null; name: string; name_en: string | null; base_unit: string; purchase_unit: string | null; conversion_rate: number; current_stock: number; min_stock: number; max_stock: number | null; reorder_point: number; price_per_unit: number; last_purchase_price: number | null; average_price: number | null; shelf_life_days: number | null; storage_location: string | null; preferred_supplier_id: string | null; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; code?: string | null; category_id?: string | null; name: string; name_en?: string | null; base_unit: string; purchase_unit?: string | null; conversion_rate?: number; current_stock?: number; min_stock?: number; max_stock?: number | null; reorder_point?: number | null; price_per_unit?: number; last_purchase_price?: number | null; average_price?: number | null; shelf_life_days?: number | null; storage_location?: string | null; preferred_supplier_id?: string | null; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { name?: string; name_en?: string | null; base_unit?: string; purchase_unit?: string | null; conversion_rate?: number; current_stock?: number; min_stock?: number; max_stock?: number | null; reorder_point?: number | null; price_per_unit?: number; last_purchase_price?: number | null; average_price?: number | null; shelf_life_days?: number | null; storage_location?: string | null; preferred_supplier_id?: string | null; is_active?: boolean; updated_at?: string }
        Relationships: [
          { foreignKeyName: "ingredients_category_id_fkey"; columns: ["category_id"]; referencedRelation: "ingredient_categories"; referencedColumns: ["id"] },
          { foreignKeyName: "ingredients_preferred_supplier_id_fkey"; columns: ["preferred_supplier_id"]; referencedRelation: "suppliers"; referencedColumns: ["id"] }
        ]
      }
      stock_purchases: {
        Row: { id: string; purchase_number: string; supplier_id: string | null; purchase_date: string; received_date: string | null; subtotal: number; tax_amount: number; discount_amount: number; total_amount: number; payment_status: string; payment_due_date: string | null; notes: string | null; invoice_number: string | null; status: string; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; purchase_number: string; supplier_id?: string | null; purchase_date: string; received_date?: string | null; subtotal?: number; tax_amount?: number; discount_amount?: number; total_amount?: number; payment_status?: string; payment_due_date?: string | null; notes?: string | null; invoice_number?: string | null; status?: string; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { received_date?: string | null; subtotal?: number; tax_amount?: number; discount_amount?: number; total_amount?: number; payment_status?: string; notes?: string | null; status?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "stock_purchases_supplier_id_fkey"; columns: ["supplier_id"]; referencedRelation: "suppliers"; referencedColumns: ["id"] }]
      }
      stock_purchase_items: {
        Row: { id: string; purchase_id: string; ingredient_id: string; quantity_ordered: number; quantity_received: number; unit: string; unit_price: number; discount_percent: number; subtotal: number; expiry_date: string | null; batch_code: string | null; created_at: string }
        Insert: { id?: string; purchase_id: string; ingredient_id: string; quantity_ordered: number; quantity_received?: number; unit: string; unit_price: number; discount_percent?: number; subtotal?: number; expiry_date?: string | null; batch_code?: string | null; created_at?: string }
        Update: { quantity_received?: number; unit_price?: number; discount_percent?: number; subtotal?: number; expiry_date?: string | null; batch_code?: string | null }
        Relationships: [
          { foreignKeyName: "stock_purchase_items_purchase_id_fkey"; columns: ["purchase_id"]; referencedRelation: "stock_purchases"; referencedColumns: ["id"] },
          { foreignKeyName: "stock_purchase_items_ingredient_id_fkey"; columns: ["ingredient_id"]; referencedRelation: "ingredients"; referencedColumns: ["id"] }
        ]
      }
      stock_movements: {
        Row: { id: string; ingredient_id: string; quantity: number; unit: string | null; movement_type: string; stock_before: number; stock_after: number; reason: string | null; reference_type: string | null; reference_id: string | null; notes: string | null; created_by: string | null; created_at: string }
        Insert: { id?: string; ingredient_id: string; quantity: number; unit?: string | null; movement_type: string; stock_before: number; stock_after: number; reason?: string | null; reference_type?: string | null; reference_id?: string | null; notes?: string | null; created_by?: string | null; created_at?: string }
        Update: { notes?: string | null }
        Relationships: [{ foreignKeyName: "stock_movements_ingredient_id_fkey"; columns: ["ingredient_id"]; referencedRelation: "ingredients"; referencedColumns: ["id"] }]
      }
      stock_opnames: {
        Row: { id: string; opname_number: string; opname_date: string; notes: string | null; status: string; created_by: string | null; approved_by: string | null; completed_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; opname_number: string; opname_date: string; notes?: string | null; status?: string; created_by?: string | null; approved_by?: string | null; completed_at?: string | null; created_at?: string; updated_at?: string }
        Update: { notes?: string | null; status?: string; approved_by?: string | null; completed_at?: string | null; updated_at?: string }
        Relationships: []
      }
      stock_opname_items: {
        Row: { id: string; opname_id: string; ingredient_id: string; system_stock: number; unit: string; actual_stock: number; difference: number; reason: string | null }
        Insert: { id?: string; opname_id: string; ingredient_id: string; system_stock?: number; unit?: string; actual_stock?: number; difference?: number; reason?: string | null }
        Update: { actual_stock?: number; difference?: number; reason?: string | null }
        Relationships: [
          { foreignKeyName: "stock_opname_items_opname_id_fkey"; columns: ["opname_id"]; referencedRelation: "stock_opnames"; referencedColumns: ["id"] },
          { foreignKeyName: "stock_opname_items_ingredient_id_fkey"; columns: ["ingredient_id"]; referencedRelation: "ingredients"; referencedColumns: ["id"] }
        ]
      }
      recipes: {
        Row: { id: string; product_id: string | null; variant_id: string | null; yield_quantity: number; instructions: string | null; prep_time_minutes: number | null; bake_time_minutes: number | null; bake_temperature: number | null; created_at: string; updated_at: string }
        Insert: { id?: string; product_id?: string | null; variant_id?: string | null; yield_quantity?: number; instructions?: string | null; prep_time_minutes?: number | null; bake_time_minutes?: number | null; bake_temperature?: number | null; created_at?: string; updated_at?: string }
        Update: { product_id?: string | null; variant_id?: string | null; yield_quantity?: number; instructions?: string | null; prep_time_minutes?: number | null; bake_time_minutes?: number | null; bake_temperature?: number | null; updated_at?: string }
        Relationships: [{ foreignKeyName: "recipes_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }]
      }
      recipe_ingredients: {
        Row: { id: string; recipe_id: string; ingredient_id: string; quantity: number; unit: string; notes: string | null; created_at: string }
        Insert: { id?: string; recipe_id: string; ingredient_id: string; quantity: number; unit: string; notes?: string | null; created_at?: string }
        Update: { quantity?: number; unit?: string; notes?: string | null }
        Relationships: [
          { foreignKeyName: "recipe_ingredients_recipe_id_fkey"; columns: ["recipe_id"]; referencedRelation: "recipes"; referencedColumns: ["id"] },
          { foreignKeyName: "recipe_ingredients_ingredient_id_fkey"; columns: ["ingredient_id"]; referencedRelation: "ingredients"; referencedColumns: ["id"] }
        ]
      }
      production_batches: {
        Row: { id: string; batch_number: string; product_id: string | null; recipe_id: string | null; quantity_planned: number; quantity_produced: number; quantity_defect: number; status: string; scheduled_date: string | null; started_at: string | null; completed_at: string | null; notes: string | null; created_by: string | null; created_at: string; updated_at: string; cost_per_unit: number | null; total_cost: number | null; stock_consumed: boolean }
        Insert: { id?: string; batch_number: string; product_id?: string | null; recipe_id?: string | null; quantity_planned: number; quantity_produced?: number; quantity_defect?: number; status?: string; scheduled_date?: string | null; started_at?: string | null; completed_at?: string | null; notes?: string | null; created_by?: string | null; created_at?: string; updated_at?: string; cost_per_unit?: number | null; total_cost?: number | null; stock_consumed?: boolean }
        Update: { quantity_produced?: number; quantity_defect?: number; status?: string; started_at?: string | null; completed_at?: string | null; notes?: string | null; updated_at?: string; cost_per_unit?: number | null; total_cost?: number | null; stock_consumed?: boolean }
        Relationships: [
          { foreignKeyName: "production_batches_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "production_batches_recipe_id_fkey"; columns: ["recipe_id"]; referencedRelation: "recipes"; referencedColumns: ["id"] },
          { foreignKeyName: "production_batches_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      product_inventory: {
        Row: { id: string; product_id: string; batch_id: string | null; quantity: number; expiry_date: string | null; created_at: string }
        Insert: { id?: string; product_id: string; batch_id?: string | null; quantity: number; expiry_date?: string | null; created_at?: string }
        Update: { quantity?: number; expiry_date?: string | null }
        Relationships: [
          { foreignKeyName: "product_inventory_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "product_inventory_batch_id_fkey"; columns: ["batch_id"]; referencedRelation: "production_batches"; referencedColumns: ["id"] }
        ]
      }
    }
    Views: {
      daily_sales_summary: {
        Row: { sale_date: string | null; total_transactions: number | null; total_revenue: number | null; total_discounts: number | null }
        Relationships: []
      }
    }
    Functions: {
      process_purchase: { Args: { p_purchase_id: string }; Returns: Json }
      complete_production_batch: { Args: { p_batch_id: string; p_quantity_produced: number; p_quantity_defect?: number }; Returns: Json }
      process_sale: { Args: { p_sale_id: string }; Returns: Json }
      process_stock_opname: { Args: { p_opname_id: string }; Returns: Json }
      generate_invoice_number: { Args: Record<string, never>; Returns: string }
      get_recipe_id_for_product: { Args: { p_product_id: string }; Returns: string }
      generate_order_number: { Args: Record<string, never>; Returns: string }
      confirm_order: { Args: { p_order_id: string; p_user_id: string }; Returns: Json }
      rpc_confirm_order: { Args: { p_order_id: string; p_user_id: string }; Returns: Json }
      rpc_cancel_order: { Args: { p_order_id: string; p_user_id: string }; Returns: Json }
      rpc_start_production: { Args: { p_order_id: string; p_user_id: string }; Returns: Json }
      rpc_ready_for_pickup: { Args: { p_order_id: string; p_user_id: string }; Returns: Json }
      rpc_deliver_order: { Args: { p_order_id: string; p_user_id: string }; Returns: Json }
      rpc_complete_order: { Args: { p_order_id: string; p_user_id: string }; Returns: Json }
      rpc_mark_paid: { Args: { p_order_id: string; p_user_id: string }; Returns: Json }
      void_sale: { Args: { p_sale_id: string; p_user_id: string; p_reason?: string }; Returns: Json }
      track_order: { Args: { p_order_number: string; p_phone: string }; Returns: Json }
      get_user_role: { Args: Record<string, never>; Returns: string }
    }
    Enums: Record<string, never>
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
