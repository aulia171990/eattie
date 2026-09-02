export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      accounts_payable: {
        Row: { id: string; invoice_number: string; supplier_name: string; supplier_id: string | null; amount: number; paid_amount: number | null; due_date: string; status: string | null; source: string; source_id: string | null; notes: string | null; created_by: string | null; created_at: string | null; updated_at: string | null }
        Insert: { id?: string; invoice_number?: string; supplier_name?: string; supplier_id?: string | null; amount?: number; paid_amount?: number | null; due_date?: string; status?: string | null; source?: string; source_id?: string | null; notes?: string | null; created_by?: string | null; created_at?: string | null; updated_at?: string | null }
        Update: { id?: string; invoice_number?: string; supplier_name?: string; supplier_id?: string | null; amount?: number; paid_amount?: number | null; due_date?: string; status?: string | null; source?: string; source_id?: string | null; notes?: string | null; created_by?: string | null; created_at?: string | null; updated_at?: string | null }
        Relationships: [ { foreignKeyName: "accounts_payable_supplier_id_fkey"; columns: ["supplier_id"]; referencedRelation: "suppliers"; referencedColumns: ["id"] }, { foreignKeyName: "accounts_payable_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      accounts_receivable: {
        Row: { id: string; invoice_number: string; customer_name: string; customer_phone: string | null; amount: number; paid_amount: number | null; due_date: string; status: string | null; source: string; source_id: string | null; notes: string | null; created_by: string | null; created_at: string | null; updated_at: string | null }
        Insert: { id?: string; invoice_number?: string; customer_name?: string; customer_phone?: string | null; amount?: number; paid_amount?: number | null; due_date?: string; status?: string | null; source?: string; source_id?: string | null; notes?: string | null; created_by?: string | null; created_at?: string | null; updated_at?: string | null }
        Update: { id?: string; invoice_number?: string; customer_name?: string; customer_phone?: string | null; amount?: number; paid_amount?: number | null; due_date?: string; status?: string | null; source?: string; source_id?: string | null; notes?: string | null; created_by?: string | null; created_at?: string | null; updated_at?: string | null }
        Relationships: [ { foreignKeyName: "accounts_receivable_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      audit_logs: {
        Row: { id: string; table_name: string; record_id: string; action: string; old_data: Json | null; new_data: Json | null; changed_by: string | null; created_at: string | null }
        Insert: { id?: string; table_name?: string; record_id?: string; action?: string; old_data?: Json | null; new_data?: Json | null; changed_by?: string | null; created_at?: string | null }
        Update: { id?: string; table_name?: string; record_id?: string; action?: string; old_data?: Json | null; new_data?: Json | null; changed_by?: string | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "audit_logs_changed_by_fkey"; columns: ["changed_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      chart_of_accounts: {
        Row: { id: string; code: string; name: string; type: string; parent_id: string | null; is_active: boolean | null; created_at: string | null }
        Insert: { id?: string; code?: string; name?: string; type?: string; parent_id?: string | null; is_active?: boolean | null; created_at?: string | null }
        Update: { id?: string; code?: string; name?: string; type?: string; parent_id?: string | null; is_active?: boolean | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "chart_of_accounts_parent_id_fkey"; columns: ["parent_id"]; referencedRelation: "chart_of_accounts"; referencedColumns: ["id"] } ]
      }
      custom_cake_requests: {
        Row: { id: string; req_number: string; customer_name: string; customer_phone: string; size: string; flavor: string; color_theme: string | null; special_notes: string | null; reference_image_url: string | null; quoted_price: number | null; status: string; created_at: string; updated_at: string }
        Insert: { id?: string; req_number?: string; customer_name?: string; customer_phone?: string; size?: string; flavor?: string; color_theme?: string | null; special_notes?: string | null; reference_image_url?: string | null; quoted_price?: number | null; status?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; req_number?: string; customer_name?: string; customer_phone?: string; size?: string; flavor?: string; color_theme?: string | null; special_notes?: string | null; reference_image_url?: string | null; quoted_price?: number | null; status?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      custom_cakes: {
        Row: { id: string; size: string; shape: string; flavor: string; filling: string; frosting: string; fondant_color: string | null; message: string | null; special_request: string | null; reference_image_url: string | null; price: number | null; created_at: string | null }
        Insert: { id?: string; size?: string; shape?: string; flavor?: string; filling?: string; frosting?: string; fondant_color?: string | null; message?: string | null; special_request?: string | null; reference_image_url?: string | null; price?: number | null; created_at?: string | null }
        Update: { id?: string; size?: string; shape?: string; flavor?: string; filling?: string; frosting?: string; fondant_color?: string | null; message?: string | null; special_request?: string | null; reference_image_url?: string | null; price?: number | null; created_at?: string | null }
        Relationships: []
      }
      custom_product_addons: {
        Row: { id: string; product_id: string; name: string; price: number; sort_order: number; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; product_id?: string; name?: string; price?: number; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; product_id?: string; name?: string; price?: number; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Relationships: [ { foreignKeyName: "custom_product_addons_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] } ]
      }
      customer_order_items: {
        Row: { id: string; customer_order_id: string; product_id: string; quantity: number; unit_price: number; subtotal: number; created_at: string }
        Insert: { id?: string; customer_order_id?: string; product_id?: string; quantity?: number; unit_price?: number; subtotal?: number; created_at?: string }
        Update: { id?: string; customer_order_id?: string; product_id?: string; quantity?: number; unit_price?: number; subtotal?: number; created_at?: string }
        Relationships: [ { foreignKeyName: "customer_order_items_customer_order_id_fkey"; columns: ["customer_order_id"]; referencedRelation: "customer_orders"; referencedColumns: ["id"] }, { foreignKeyName: "customer_order_items_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] } ]
      }
      customer_orders: {
        Row: { id: string; order_number: string; customer_name: string; customer_phone: string | null; table_number: string | null; notes: string | null; status: string; total_amount: number; created_at: string; updated_at: string }
        Insert: { id?: string; order_number?: string; customer_name?: string; customer_phone?: string | null; table_number?: string | null; notes?: string | null; status?: string; total_amount?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; order_number?: string; customer_name?: string; customer_phone?: string | null; table_number?: string | null; notes?: string | null; status?: string; total_amount?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      customers: {
        Row: { id: string; user_id: string | null; customer_code: string; name: string; phone: string; email: string | null; birth_date: string | null; gender: string | null; address: string | null; notes: string | null; tier: string | null; points: number | null; is_active: boolean | null; created_at: string | null; updated_at: string | null; total_spending: number; total_orders: number; last_order_date: string | null; is_manual: boolean }
        Insert: { id?: string; user_id?: string | null; customer_code?: string; name?: string; phone?: string; email?: string | null; birth_date?: string | null; gender?: string | null; address?: string | null; notes?: string | null; tier?: string | null; points?: number | null; is_active?: boolean | null; created_at?: string | null; updated_at?: string | null; total_spending?: number; total_orders?: number; last_order_date?: string | null; is_manual?: boolean }
        Update: { id?: string; user_id?: string | null; customer_code?: string; name?: string; phone?: string; email?: string | null; birth_date?: string | null; gender?: string | null; address?: string | null; notes?: string | null; tier?: string | null; points?: number | null; is_active?: boolean | null; created_at?: string | null; updated_at?: string | null; total_spending?: number; total_orders?: number; last_order_date?: string | null; is_manual?: boolean }
        Relationships: [ { foreignKeyName: "customers_user_id_fkey"; columns: ["user_id"]; referencedRelation: "auth.users"; referencedColumns: ["id"] } ]
      }
      daily_profitability: {
        Row: { sale_date: string | null; total_transactions: number | null; revenue: number | null; total_discount: number | null; cogs: number | null; gross_profit: number | null; gross_margin_pct: number | null }
        Insert: { sale_date?: string | null; total_transactions?: number | null; revenue?: number | null; total_discount?: number | null; cogs?: number | null; gross_profit?: number | null; gross_margin_pct?: number | null }
        Update: { sale_date?: string | null; total_transactions?: number | null; revenue?: number | null; total_discount?: number | null; cogs?: number | null; gross_profit?: number | null; gross_margin_pct?: number | null }
        Relationships: []
      }
      daily_sales_summary: {
        Row: { sale_date: string | null; total_transactions: number | null; total_revenue: number | null; total_discounts: number | null }
        Insert: { sale_date?: string | null; total_transactions?: number | null; total_revenue?: number | null; total_discounts?: number | null }
        Update: { sale_date?: string | null; total_transactions?: number | null; total_revenue?: number | null; total_discounts?: number | null }
        Relationships: []
      }
      dashboard_owner_stats: {
        Row: { today_revenue: number | null; today_cogs: number | null; today_gross_profit: number | null; today_transactions: number | null; month_revenue: number | null; month_gross_profit: number | null }
        Insert: { today_revenue?: number | null; today_cogs?: number | null; today_gross_profit?: number | null; today_transactions?: number | null; month_revenue?: number | null; month_gross_profit?: number | null }
        Update: { today_revenue?: number | null; today_cogs?: number | null; today_gross_profit?: number | null; today_transactions?: number | null; month_revenue?: number | null; month_gross_profit?: number | null }
        Relationships: []
      }
      expenses: {
        Row: { id: string; category: string; description: string; amount: number; expense_date: string; receipt_url: string | null; created_by: string | null; created_at: string | null; status: string | null; approved_by: string | null; approved_at: string | null; rejection_reason: string | null }
        Insert: { id?: string; category?: string; description?: string; amount?: number; expense_date?: string; receipt_url?: string | null; created_by?: string | null; created_at?: string | null; status?: string | null; approved_by?: string | null; approved_at?: string | null; rejection_reason?: string | null }
        Update: { id?: string; category?: string; description?: string; amount?: number; expense_date?: string; receipt_url?: string | null; created_by?: string | null; created_at?: string | null; status?: string | null; approved_by?: string | null; approved_at?: string | null; rejection_reason?: string | null }
        Relationships: [ { foreignKeyName: "expenses_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "expenses_approved_by_fkey"; columns: ["approved_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      fiscal_periods: {
        Row: { id: string; name: string; period_type: string; start_date: string; end_date: string; is_closed: boolean | null; closed_by: string | null; closed_at: string | null; created_at: string | null }
        Insert: { id?: string; name?: string; period_type?: string; start_date?: string; end_date?: string; is_closed?: boolean | null; closed_by?: string | null; closed_at?: string | null; created_at?: string | null }
        Update: { id?: string; name?: string; period_type?: string; start_date?: string; end_date?: string; is_closed?: boolean | null; closed_by?: string | null; closed_at?: string | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "fiscal_periods_closed_by_fkey"; columns: ["closed_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      ingredient_categories: {
        Row: { id: string; name: string; name_en: string | null; description: string | null; created_at: string | null }
        Insert: { id?: string; name?: string; name_en?: string | null; description?: string | null; created_at?: string | null }
        Update: { id?: string; name?: string; name_en?: string | null; description?: string | null; created_at?: string | null }
        Relationships: []
      }
      ingredients: {
        Row: { id: string; code: string | null; name: string; name_en: string | null; category_id: string | null; base_unit: string; purchase_unit: string | null; conversion_rate: number | null; current_stock: number; min_stock: number | null; max_stock: number | null; reorder_point: number | null; price_per_unit: number | null; last_purchase_price: number | null; average_price: number | null; shelf_life_days: number | null; storage_location: string | null; preferred_supplier_id: string | null; is_active: boolean | null; created_at: string | null; updated_at: string | null; average_cost: number | null }
        Insert: { id?: string; code?: string | null; name?: string; name_en?: string | null; category_id?: string | null; base_unit?: string; purchase_unit?: string | null; conversion_rate?: number | null; current_stock?: number; min_stock?: number | null; max_stock?: number | null; reorder_point?: number | null; price_per_unit?: number | null; last_purchase_price?: number | null; average_price?: number | null; shelf_life_days?: number | null; storage_location?: string | null; preferred_supplier_id?: string | null; is_active?: boolean | null; created_at?: string | null; updated_at?: string | null; average_cost?: number | null }
        Update: { id?: string; code?: string | null; name?: string; name_en?: string | null; category_id?: string | null; base_unit?: string; purchase_unit?: string | null; conversion_rate?: number | null; current_stock?: number; min_stock?: number | null; max_stock?: number | null; reorder_point?: number | null; price_per_unit?: number | null; last_purchase_price?: number | null; average_price?: number | null; shelf_life_days?: number | null; storage_location?: string | null; preferred_supplier_id?: string | null; is_active?: boolean | null; created_at?: string | null; updated_at?: string | null; average_cost?: number | null }
        Relationships: [ { foreignKeyName: "ingredients_category_id_fkey"; columns: ["category_id"]; referencedRelation: "ingredient_categories"; referencedColumns: ["id"] }, { foreignKeyName: "ingredients_preferred_supplier_id_fkey"; columns: ["preferred_supplier_id"]; referencedRelation: "suppliers"; referencedColumns: ["id"] } ]
      }
      inventory_movements: {
        Row: { id: string; item_type: string; item_id: string; movement_type: string; quantity: number; unit: string; stock_before: number; stock_after: number; unit_cost: number | null; total_cost: number | null; reference_type: string | null; reference_id: string | null; batch_code: string | null; expiry_date: string | null; reason: string | null; notes: string | null; created_by: string | null; created_at: string | null }
        Insert: { id?: string; item_type?: string; item_id?: string; movement_type?: string; quantity?: number; unit?: string; stock_before?: number; stock_after?: number; unit_cost?: number | null; total_cost?: number | null; reference_type?: string | null; reference_id?: string | null; batch_code?: string | null; expiry_date?: string | null; reason?: string | null; notes?: string | null; created_by?: string | null; created_at?: string | null }
        Update: { id?: string; item_type?: string; item_id?: string; movement_type?: string; quantity?: number; unit?: string; stock_before?: number; stock_after?: number; unit_cost?: number | null; total_cost?: number | null; reference_type?: string | null; reference_id?: string | null; batch_code?: string | null; expiry_date?: string | null; reason?: string | null; notes?: string | null; created_by?: string | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "inventory_movements_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      journal_entries: {
        Row: { id: string; entry_number: string; entry_date: string; description: string; source: string; source_id: string | null; total_debit: number; total_credit: number; is_posted: boolean | null; created_by: string | null; created_at: string | null }
        Insert: { id?: string; entry_number?: string; entry_date?: string; description?: string; source?: string; source_id?: string | null; total_debit?: number; total_credit?: number; is_posted?: boolean | null; created_by?: string | null; created_at?: string | null }
        Update: { id?: string; entry_number?: string; entry_date?: string; description?: string; source?: string; source_id?: string | null; total_debit?: number; total_credit?: number; is_posted?: boolean | null; created_by?: string | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "journal_entries_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      journal_lines: {
        Row: { id: string; entry_id: string; account_id: string; debit: number | null; credit: number | null; description: string | null; created_at: string | null }
        Insert: { id?: string; entry_id?: string; account_id?: string; debit?: number | null; credit?: number | null; description?: string | null; created_at?: string | null }
        Update: { id?: string; entry_id?: string; account_id?: string; debit?: number | null; credit?: number | null; description?: string | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "journal_lines_entry_id_fkey"; columns: ["entry_id"]; referencedRelation: "journal_entries"; referencedColumns: ["id"] }, { foreignKeyName: "journal_lines_account_id_fkey"; columns: ["account_id"]; referencedRelation: "chart_of_accounts"; referencedColumns: ["id"] } ]
      }
      low_stock_ingredients: {
        Row: { id: string | null; code: string | null; name: string | null; current_stock: number | null; min_stock: number | null; base_unit: string | null; reorder_point: number | null }
        Insert: { id?: string | null; code?: string | null; name?: string | null; current_stock?: number | null; min_stock?: number | null; base_unit?: string | null; reorder_point?: number | null }
        Update: { id?: string | null; code?: string | null; name?: string | null; current_stock?: number | null; min_stock?: number | null; base_unit?: string | null; reorder_point?: number | null }
        Relationships: []
      }
      low_stock_products: {
        Row: { id: string | null; name: string | null; category: string | null; current_stock: number | null; min_stock: number | null }
        Insert: { id?: string | null; name?: string | null; category?: string | null; current_stock?: number | null; min_stock?: number | null }
        Update: { id?: string | null; name?: string | null; category?: string | null; current_stock?: number | null; min_stock?: number | null }
        Relationships: []
      }
      loyalty_transactions: {
        Row: { id: string; customer_id: string | null; order_id: string | null; points: number; transaction_type: string; notes: string | null; created_at: string | null }
        Insert: { id?: string; customer_id?: string | null; order_id?: string | null; points?: number; transaction_type?: string; notes?: string | null; created_at?: string | null }
        Update: { id?: string; customer_id?: string | null; order_id?: string | null; points?: number; transaction_type?: string; notes?: string | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "loyalty_transactions_customer_id_fkey"; columns: ["customer_id"]; referencedRelation: "customers"; referencedColumns: ["id"] }, { foreignKeyName: "loyalty_transactions_order_id_fkey"; columns: ["order_id"]; referencedRelation: "orders"; referencedColumns: ["id"] } ]
      }
      module_permissions: {
        Row: { id: string; user_id: string; module: string; can_view: boolean | null; can_create: boolean | null; can_edit: boolean | null; can_delete: boolean | null; created_at: string | null }
        Insert: { id?: string; user_id?: string; module?: string; can_view?: boolean | null; can_create?: boolean | null; can_edit?: boolean | null; can_delete?: boolean | null; created_at?: string | null }
        Update: { id?: string; user_id?: string; module?: string; can_view?: boolean | null; can_create?: boolean | null; can_edit?: boolean | null; can_delete?: boolean | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "module_permissions_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      monthly_profitability: {
        Row: { month: string | null; revenue: number | null; total_discount: number | null; cogs: number | null; gross_profit: number | null; total_expenses: number | null; net_profit: number | null }
        Insert: { month?: string | null; revenue?: number | null; total_discount?: number | null; cogs?: number | null; gross_profit?: number | null; total_expenses?: number | null; net_profit?: number | null }
        Update: { month?: string | null; revenue?: number | null; total_discount?: number | null; cogs?: number | null; gross_profit?: number | null; total_expenses?: number | null; net_profit?: number | null }
        Relationships: []
      }
      order_items: {
        Row: { id: string; order_id: string | null; product_id: string | null; custom_cake_id: string | null; quantity: number; price: number | null; total: number | null; notes: string | null; created_at: string | null; product_name: string | null; unit_price: number | null; subtotal: number | null; variant_id: string | null; variant_name: string | null; addon_ids: string | null; addon_detail: Json | null; variant_price: number | null; addons: Json | null }
        Insert: { id?: string; order_id?: string | null; product_id?: string | null; custom_cake_id?: string | null; quantity?: number; price?: number | null; total?: number | null; notes?: string | null; created_at?: string | null; product_name?: string | null; unit_price?: number | null; subtotal?: number | null; variant_id?: string | null; variant_name?: string | null; addon_ids?: string | null; addon_detail?: Json | null; variant_price?: number | null; addons?: Json | null }
        Update: { id?: string; order_id?: string | null; product_id?: string | null; custom_cake_id?: string | null; quantity?: number; price?: number | null; total?: number | null; notes?: string | null; created_at?: string | null; product_name?: string | null; unit_price?: number | null; subtotal?: number | null; variant_id?: string | null; variant_name?: string | null; addon_ids?: string | null; addon_detail?: Json | null; variant_price?: number | null; addons?: Json | null }
        Relationships: [ { foreignKeyName: "order_items_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }, { foreignKeyName: "order_items_custom_cake_id_fkey"; columns: ["custom_cake_id"]; referencedRelation: "custom_cakes"; referencedColumns: ["id"] }, { foreignKeyName: "order_items_order_id_fkey"; columns: ["order_id"]; referencedRelation: "orders"; referencedColumns: ["id"] }, { foreignKeyName: "order_items_variant_id_fkey"; columns: ["variant_id"]; referencedRelation: "product_variants"; referencedColumns: ["id"] } ]
      }
      order_status_logs: {
        Row: { id: string; order_id: string; old_status: string | null; new_status: string; changed_by: string | null; note: string | null; created_at: string }
        Insert: { id?: string; order_id?: string; old_status?: string | null; new_status?: string; changed_by?: string | null; note?: string | null; created_at?: string }
        Update: { id?: string; order_id?: string; old_status?: string | null; new_status?: string; changed_by?: string | null; note?: string | null; created_at?: string }
        Relationships: [ { foreignKeyName: "order_status_logs_order_id_fkey"; columns: ["order_id"]; referencedRelation: "orders"; referencedColumns: ["id"] }, { foreignKeyName: "order_status_logs_changed_by_fkey"; columns: ["changed_by"]; referencedRelation: "auth.users"; referencedColumns: ["id"] } ]
      }
      order_valid_transitions: {
        Row: { from_status: string; to_status: string }
        Insert: { from_status?: string; to_status?: string }
        Update: { from_status?: string; to_status?: string }
        Relationships: []
      }
      orders: {
        Row: { id: string; order_number: string; customer_id: string | null; status: string | null; payment_status: string | null; order_type: string | null; pickup_date: string | null; delivery_date: string | null; delivery_address: string | null; subtotal: number | null; discount: number | null; tax: number | null; total: number | null; points_earned: number | null; points_redeemed: number | null; notes: string | null; created_at: string | null; updated_at: string | null; customer_email: string | null; customer_address: string | null; pickup_time: string | null; payment_confirmed_at: string | null; payment_confirmed_by: string | null; confirmed_at: string | null; confirmed_by: string | null; customer_name: string | null; customer_phone: string | null; total_amount: number | null; discount_amount: number | null; payment_proof_url: string | null; sale_id: string | null; source: string | null }
        Insert: { id?: string; order_number?: string; customer_id?: string | null; status?: string | null; payment_status?: string | null; order_type?: string | null; pickup_date?: string | null; delivery_date?: string | null; delivery_address?: string | null; subtotal?: number | null; discount?: number | null; tax?: number | null; total?: number | null; points_earned?: number | null; points_redeemed?: number | null; notes?: string | null; created_at?: string | null; updated_at?: string | null; customer_email?: string | null; customer_address?: string | null; pickup_time?: string | null; payment_confirmed_at?: string | null; payment_confirmed_by?: string | null; confirmed_at?: string | null; confirmed_by?: string | null; customer_name?: string | null; customer_phone?: string | null; total_amount?: number | null; discount_amount?: number | null; payment_proof_url?: string | null; sale_id?: string | null; source?: string | null }
        Update: { id?: string; order_number?: string; customer_id?: string | null; status?: string | null; payment_status?: string | null; order_type?: string | null; pickup_date?: string | null; delivery_date?: string | null; delivery_address?: string | null; subtotal?: number | null; discount?: number | null; tax?: number | null; total?: number | null; points_earned?: number | null; points_redeemed?: number | null; notes?: string | null; created_at?: string | null; updated_at?: string | null; customer_email?: string | null; customer_address?: string | null; pickup_time?: string | null; payment_confirmed_at?: string | null; payment_confirmed_by?: string | null; confirmed_at?: string | null; confirmed_by?: string | null; customer_name?: string | null; customer_phone?: string | null; total_amount?: number | null; discount_amount?: number | null; payment_proof_url?: string | null; sale_id?: string | null; source?: string | null }
        Relationships: [ { foreignKeyName: "orders_customer_id_fkey"; columns: ["customer_id"]; referencedRelation: "customers"; referencedColumns: ["id"] }, { foreignKeyName: "orders_sale_id_fkey"; columns: ["sale_id"]; referencedRelation: "sales"; referencedColumns: ["id"] } ]
      }
      payment_records: {
        Row: { id: string; ar_ap_type: string; ar_ap_id: string; amount: number; payment_date: string; payment_method: string | null; notes: string | null; recorded_by: string | null; created_at: string | null }
        Insert: { id?: string; ar_ap_type?: string; ar_ap_id?: string; amount?: number; payment_date?: string; payment_method?: string | null; notes?: string | null; recorded_by?: string | null; created_at?: string | null }
        Update: { id?: string; ar_ap_type?: string; ar_ap_id?: string; amount?: number; payment_date?: string; payment_method?: string | null; notes?: string | null; recorded_by?: string | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "payment_records_recorded_by_fkey"; columns: ["recorded_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      price_history: {
        Row: { id: string; product_id: string | null; variant_id: string | null; old_price: number; new_price: number; changed_by: string | null; reason: string | null; created_at: string }
        Insert: { id?: string; product_id?: string | null; variant_id?: string | null; old_price?: number; new_price?: number; changed_by?: string | null; reason?: string | null; created_at?: string }
        Update: { id?: string; product_id?: string | null; variant_id?: string | null; old_price?: number; new_price?: number; changed_by?: string | null; reason?: string | null; created_at?: string }
        Relationships: [ { foreignKeyName: "price_history_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }, { foreignKeyName: "price_history_variant_id_fkey"; columns: ["variant_id"]; referencedRelation: "product_variants"; referencedColumns: ["id"] }, { foreignKeyName: "price_history_changed_by_fkey"; columns: ["changed_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      product_addons: {
        Row: { id: string; product_id: string; name: string; price: number; sort_order: number; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; product_id?: string; name?: string; price?: number; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; product_id?: string; name?: string; price?: number; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Relationships: [ { foreignKeyName: "product_addons_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] } ]
      }
      product_categories: {
        Row: { id: string; name: string; name_en: string | null; emoji: string | null; description: string | null; sort_order: number; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; name?: string; name_en?: string | null; emoji?: string | null; description?: string | null; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; name_en?: string | null; emoji?: string | null; description?: string | null; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string }
        Relationships: []
      }
      product_gallery: {
        Row: { id: string; product_id: string; image_url: string; caption: string | null; sort_order: number; is_primary: boolean; created_at: string; variant_id: string | null }
        Insert: { id?: string; product_id?: string; image_url?: string; caption?: string | null; sort_order?: number; is_primary?: boolean; created_at?: string; variant_id?: string | null }
        Update: { id?: string; product_id?: string; image_url?: string; caption?: string | null; sort_order?: number; is_primary?: boolean; created_at?: string; variant_id?: string | null }
        Relationships: [ { foreignKeyName: "product_gallery_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }, { foreignKeyName: "product_gallery_variant_id_fkey"; columns: ["variant_id"]; referencedRelation: "product_variants"; referencedColumns: ["id"] } ]
      }
      product_inventory: {
        Row: { id: string; product_id: string | null; batch_id: string | null; quantity: number; expiry_date: string | null; created_at: string | null; variant_id: string | null }
        Insert: { id?: string; product_id?: string | null; batch_id?: string | null; quantity?: number; expiry_date?: string | null; created_at?: string | null; variant_id?: string | null }
        Update: { id?: string; product_id?: string | null; batch_id?: string | null; quantity?: number; expiry_date?: string | null; created_at?: string | null; variant_id?: string | null }
        Relationships: [ { foreignKeyName: "product_inventory_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }, { foreignKeyName: "product_inventory_batch_id_fkey"; columns: ["batch_id"]; referencedRelation: "production_batches"; referencedColumns: ["id"] }, { foreignKeyName: "product_inventory_variant_id_fkey"; columns: ["variant_id"]; referencedRelation: "product_variants"; referencedColumns: ["id"] } ]
      }
      product_option_groups: {
        Row: { id: string; product_id: string; name: string; display_type: string; sort_order: number; is_required: boolean; created_at: string; updated_at: string; is_active: boolean }
        Insert: { id?: string; product_id?: string; name?: string; display_type?: string; sort_order?: number; is_required?: boolean; created_at?: string; updated_at?: string; is_active?: boolean }
        Update: { id?: string; product_id?: string; name?: string; display_type?: string; sort_order?: number; is_required?: boolean; created_at?: string; updated_at?: string; is_active?: boolean }
        Relationships: [ { foreignKeyName: "product_option_groups_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] } ]
      }
      product_option_values: {
        Row: { id: string; group_id: string; value: string; sort_order: number; image_url: string | null; is_active: boolean; created_at: string }
        Insert: { id?: string; group_id?: string; value?: string; sort_order?: number; image_url?: string | null; is_active?: boolean; created_at?: string }
        Update: { id?: string; group_id?: string; value?: string; sort_order?: number; image_url?: string | null; is_active?: boolean; created_at?: string }
        Relationships: [ { foreignKeyName: "product_option_values_group_id_fkey"; columns: ["group_id"]; referencedRelation: "product_option_groups"; referencedColumns: ["id"] } ]
      }
      product_profitability: {
        Row: { product_id: string | null; product_name: string | null; category: string | null; total_transactions: number | null; total_qty_sold: number | null; total_revenue: number | null; total_cogs: number | null; total_gross_profit: number | null; gross_margin_pct: number | null; selling_price: number | null; cost_price: number | null; current_stock: number | null }
        Insert: { product_id?: string | null; product_name?: string | null; category?: string | null; total_transactions?: number | null; total_qty_sold?: number | null; total_revenue?: number | null; total_cogs?: number | null; total_gross_profit?: number | null; gross_margin_pct?: number | null; selling_price?: number | null; cost_price?: number | null; current_stock?: number | null }
        Update: { product_id?: string | null; product_name?: string | null; category?: string | null; total_transactions?: number | null; total_qty_sold?: number | null; total_revenue?: number | null; total_cogs?: number | null; total_gross_profit?: number | null; gross_margin_pct?: number | null; selling_price?: number | null; cost_price?: number | null; current_stock?: number | null }
        Relationships: []
      }
      product_review_summary: {
        Row: { product_id: string | null; review_count: number | null; avg_rating: number | null; five_star: number | null; four_star: number | null; three_star: number | null; low_star: number | null }
        Insert: { product_id?: string | null; review_count?: number | null; avg_rating?: number | null; five_star?: number | null; four_star?: number | null; three_star?: number | null; low_star?: number | null }
        Update: { product_id?: string | null; review_count?: number | null; avg_rating?: number | null; five_star?: number | null; four_star?: number | null; three_star?: number | null; low_star?: number | null }
        Relationships: []
      }
      product_reviews: {
        Row: { id: string; product_id: string; order_id: string; customer_name: string; customer_phone: string; rating: number; comment: string | null; created_at: string; is_featured: boolean }
        Insert: { id?: string; product_id?: string; order_id?: string; customer_name?: string; customer_phone?: string; rating?: number; comment?: string | null; created_at?: string; is_featured?: boolean }
        Update: { id?: string; product_id?: string; order_id?: string; customer_name?: string; customer_phone?: string; rating?: number; comment?: string | null; created_at?: string; is_featured?: boolean }
        Relationships: [ { foreignKeyName: "product_reviews_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }, { foreignKeyName: "product_reviews_order_id_fkey"; columns: ["order_id"]; referencedRelation: "orders"; referencedColumns: ["id"] } ]
      }
      product_tags: {
        Row: { id: string; name: string; emoji: string | null; created_at: string }
        Insert: { id?: string; name?: string; emoji?: string | null; created_at?: string }
        Update: { id?: string; name?: string; emoji?: string | null; created_at?: string }
        Relationships: []
      }
      product_tags_junction: {
        Row: { product_id: string; tag_id: string }
        Insert: { product_id?: string; tag_id?: string }
        Update: { product_id?: string; tag_id?: string }
        Relationships: [ { foreignKeyName: "product_tags_junction_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }, { foreignKeyName: "product_tags_junction_tag_id_fkey"; columns: ["tag_id"]; referencedRelation: "product_tags"; referencedColumns: ["id"] } ]
      }
      product_variants: {
        Row: { id: string; product_id: string; name: string; price: number; sort_order: number; is_active: boolean; created_at: string; updated_at: string; option_text: string | null; image_url: string | null; recipe_url: string | null; cost_price: number; stock: number }
        Insert: { id?: string; product_id?: string; name?: string; price?: number; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string; option_text?: string | null; image_url?: string | null; recipe_url?: string | null; cost_price?: number; stock?: number }
        Update: { id?: string; product_id?: string; name?: string; price?: number; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string; option_text?: string | null; image_url?: string | null; recipe_url?: string | null; cost_price?: number; stock?: number }
        Relationships: [ { foreignKeyName: "product_variants_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] } ]
      }
      production_batches: {
        Row: { id: string; batch_number: string; product_id: string | null; recipe_id: string | null; quantity_planned: number; quantity_produced: number | null; quantity_defect: number | null; status: string | null; scheduled_date: string | null; started_at: string | null; completed_at: string | null; notes: string | null; created_by: string | null; created_at: string | null; updated_at: string | null; cost_per_unit: number | null; total_cost: number | null; stock_consumed: boolean | null; variant_id: string | null }
        Insert: { id?: string; batch_number?: string; product_id?: string | null; recipe_id?: string | null; quantity_planned?: number; quantity_produced?: number | null; quantity_defect?: number | null; status?: string | null; scheduled_date?: string | null; started_at?: string | null; completed_at?: string | null; notes?: string | null; created_by?: string | null; created_at?: string | null; updated_at?: string | null; cost_per_unit?: number | null; total_cost?: number | null; stock_consumed?: boolean | null; variant_id?: string | null }
        Update: { id?: string; batch_number?: string; product_id?: string | null; recipe_id?: string | null; quantity_planned?: number; quantity_produced?: number | null; quantity_defect?: number | null; status?: string | null; scheduled_date?: string | null; started_at?: string | null; completed_at?: string | null; notes?: string | null; created_by?: string | null; created_at?: string | null; updated_at?: string | null; cost_per_unit?: number | null; total_cost?: number | null; stock_consumed?: boolean | null; variant_id?: string | null }
        Relationships: [ { foreignKeyName: "production_batches_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }, { foreignKeyName: "production_batches_recipe_id_fkey"; columns: ["recipe_id"]; referencedRelation: "recipes"; referencedColumns: ["id"] }, { foreignKeyName: "production_batches_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "production_batches_variant_id_fkey"; columns: ["variant_id"]; referencedRelation: "product_variants"; referencedColumns: ["id"] } ]
      }
      products: {
        Row: { id: string; name: string; name_en: string | null; description: string | null; category: string | null; selling_price: number; cost_price: number | null; image_url: string | null; is_active: boolean | null; created_at: string | null; updated_at: string | null; current_stock: number | null; min_stock: number | null; is_available_online: boolean | null; online_description: string | null; online_sort_order: number | null; category_id: string | null; is_featured: boolean }
        Insert: { id?: string; name?: string; name_en?: string | null; description?: string | null; category?: string | null; selling_price?: number; cost_price?: number | null; image_url?: string | null; is_active?: boolean | null; created_at?: string | null; updated_at?: string | null; current_stock?: number | null; min_stock?: number | null; is_available_online?: boolean | null; online_description?: string | null; online_sort_order?: number | null; category_id?: string | null; is_featured?: boolean }
        Update: { id?: string; name?: string; name_en?: string | null; description?: string | null; category?: string | null; selling_price?: number; cost_price?: number | null; image_url?: string | null; is_active?: boolean | null; created_at?: string | null; updated_at?: string | null; current_stock?: number | null; min_stock?: number | null; is_available_online?: boolean | null; online_description?: string | null; online_sort_order?: number | null; category_id?: string | null; is_featured?: boolean }
        Relationships: [ { foreignKeyName: "products_category_id_fkey"; columns: ["category_id"]; referencedRelation: "product_categories"; referencedColumns: ["id"] } ]
      }
      profiles: {
        Row: { id: string; full_name: string; role: string; phone: string | null; avatar_url: string | null; is_active: boolean | null; created_at: string | null; updated_at: string | null }
        Insert: { id?: string; full_name?: string; role?: string; phone?: string | null; avatar_url?: string | null; is_active?: boolean | null; created_at?: string | null; updated_at?: string | null }
        Update: { id?: string; full_name?: string; role?: string; phone?: string | null; avatar_url?: string | null; is_active?: boolean | null; created_at?: string | null; updated_at?: string | null }
        Relationships: [ { foreignKeyName: "profiles_id_fkey"; columns: ["id"]; referencedRelation: "auth.users"; referencedColumns: ["id"] } ]
      }
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; created_at: string; updated_at: string }
        Insert: { id?: string; user_id?: string; endpoint?: string; p256dh?: string; auth?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; endpoint?: string; p256dh?: string; auth?: string; created_at?: string; updated_at?: string }
        Relationships: [ { foreignKeyName: "push_subscriptions_user_id_fkey"; columns: ["user_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      recipe_cost_summary: {
        Row: { recipe_id: string | null; product_id: string | null; product_name: string | null; yield_quantity: number | null; total_recipe_cost: number | null; cost_per_unit: number | null }
        Insert: { recipe_id?: string | null; product_id?: string | null; product_name?: string | null; yield_quantity?: number | null; total_recipe_cost?: number | null; cost_per_unit?: number | null }
        Update: { recipe_id?: string | null; product_id?: string | null; product_name?: string | null; yield_quantity?: number | null; total_recipe_cost?: number | null; cost_per_unit?: number | null }
        Relationships: []
      }
      recipe_ingredients: {
        Row: { id: string; recipe_id: string | null; ingredient_id: string | null; quantity: number; unit: string; notes: string | null }
        Insert: { id?: string; recipe_id?: string | null; ingredient_id?: string | null; quantity?: number; unit?: string; notes?: string | null }
        Update: { id?: string; recipe_id?: string | null; ingredient_id?: string | null; quantity?: number; unit?: string; notes?: string | null }
        Relationships: [ { foreignKeyName: "recipe_ingredients_recipe_id_fkey"; columns: ["recipe_id"]; referencedRelation: "recipes"; referencedColumns: ["id"] }, { foreignKeyName: "recipe_ingredients_ingredient_id_fkey"; columns: ["ingredient_id"]; referencedRelation: "ingredients"; referencedColumns: ["id"] } ]
      }
      recipes: {
        Row: { id: string; product_id: string | null; yield_quantity: number | null; instructions: string | null; prep_time_minutes: number | null; bake_time_minutes: number | null; bake_temperature: number | null; created_at: string | null; updated_at: string | null; variant_id: string | null }
        Insert: { id?: string; product_id?: string | null; yield_quantity?: number | null; instructions?: string | null; prep_time_minutes?: number | null; bake_time_minutes?: number | null; bake_temperature?: number | null; created_at?: string | null; updated_at?: string | null; variant_id?: string | null }
        Update: { id?: string; product_id?: string | null; yield_quantity?: number | null; instructions?: string | null; prep_time_minutes?: number | null; bake_time_minutes?: number | null; bake_temperature?: number | null; created_at?: string | null; updated_at?: string | null; variant_id?: string | null }
        Relationships: [ { foreignKeyName: "recipes_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }, { foreignKeyName: "recipes_variant_id_fkey"; columns: ["variant_id"]; referencedRelation: "product_variants"; referencedColumns: ["id"] } ]
      }
      sale_items: {
        Row: { id: string; sale_id: string | null; product_id: string | null; batch_id: string | null; product_name: string; quantity: number; unit_price: number; subtotal: number; created_at: string | null; variant_name: string | null; variant_price: number | null; addons: Json | null; variant_id: string | null; addon_detail: Json | null }
        Insert: { id?: string; sale_id?: string | null; product_id?: string | null; batch_id?: string | null; product_name?: string; quantity?: number; unit_price?: number; subtotal?: number; created_at?: string | null; variant_name?: string | null; variant_price?: number | null; addons?: Json | null; variant_id?: string | null; addon_detail?: Json | null }
        Update: { id?: string; sale_id?: string | null; product_id?: string | null; batch_id?: string | null; product_name?: string; quantity?: number; unit_price?: number; subtotal?: number; created_at?: string | null; variant_name?: string | null; variant_price?: number | null; addons?: Json | null; variant_id?: string | null; addon_detail?: Json | null }
        Relationships: [ { foreignKeyName: "sale_items_sale_id_fkey"; columns: ["sale_id"]; referencedRelation: "sales"; referencedColumns: ["id"] }, { foreignKeyName: "sale_items_product_id_fkey"; columns: ["product_id"]; referencedRelation: "products"; referencedColumns: ["id"] }, { foreignKeyName: "sale_items_batch_id_fkey"; columns: ["batch_id"]; referencedRelation: "production_batches"; referencedColumns: ["id"] }, { foreignKeyName: "sale_items_variant_id_fkey"; columns: ["variant_id"]; referencedRelation: "product_variants"; referencedColumns: ["id"] } ]
      }
      sales: {
        Row: { id: string; invoice_number: string; subtotal: number; discount_amount: number | null; discount_percent: number | null; tax_amount: number | null; total: number; payment_method: string | null; payment_amount: number | null; change_amount: number | null; customer_name: string | null; notes: string | null; status: string | null; cashier_id: string | null; created_at: string | null; cogs: number | null; gross_profit: number | null; stock_deducted: boolean | null; customer_phone: string | null }
        Insert: { id?: string; invoice_number?: string; subtotal?: number; discount_amount?: number | null; discount_percent?: number | null; tax_amount?: number | null; total?: number; payment_method?: string | null; payment_amount?: number | null; change_amount?: number | null; customer_name?: string | null; notes?: string | null; status?: string | null; cashier_id?: string | null; created_at?: string | null; cogs?: number | null; gross_profit?: number | null; stock_deducted?: boolean | null; customer_phone?: string | null }
        Update: { id?: string; invoice_number?: string; subtotal?: number; discount_amount?: number | null; discount_percent?: number | null; tax_amount?: number | null; total?: number; payment_method?: string | null; payment_amount?: number | null; change_amount?: number | null; customer_name?: string | null; notes?: string | null; status?: string | null; cashier_id?: string | null; created_at?: string | null; cogs?: number | null; gross_profit?: number | null; stock_deducted?: boolean | null; customer_phone?: string | null }
        Relationships: [ { foreignKeyName: "sales_cashier_id_fkey"; columns: ["cashier_id"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      stock_movements: {
        Row: { id: string; ingredient_id: string | null; movement_type: string; quantity: number; unit: string; stock_before: number; stock_after: number; reference_type: string | null; reference_id: string | null; batch_code: string | null; expiry_date: string | null; reason: string | null; notes: string | null; created_by: string | null; created_at: string | null }
        Insert: { id?: string; ingredient_id?: string | null; movement_type?: string; quantity?: number; unit?: string; stock_before?: number; stock_after?: number; reference_type?: string | null; reference_id?: string | null; batch_code?: string | null; expiry_date?: string | null; reason?: string | null; notes?: string | null; created_by?: string | null; created_at?: string | null }
        Update: { id?: string; ingredient_id?: string | null; movement_type?: string; quantity?: number; unit?: string; stock_before?: number; stock_after?: number; reference_type?: string | null; reference_id?: string | null; batch_code?: string | null; expiry_date?: string | null; reason?: string | null; notes?: string | null; created_by?: string | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "stock_movements_ingredient_id_fkey"; columns: ["ingredient_id"]; referencedRelation: "ingredients"; referencedColumns: ["id"] }, { foreignKeyName: "stock_movements_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      stock_opname_items: {
        Row: { id: string; opname_id: string | null; ingredient_id: string | null; system_stock: number; actual_stock: number | null; difference: number | null; unit: string; reason: string | null; created_at: string | null }
        Insert: { id?: string; opname_id?: string | null; ingredient_id?: string | null; system_stock?: number; actual_stock?: number | null; difference?: number | null; unit?: string; reason?: string | null; created_at?: string | null }
        Update: { id?: string; opname_id?: string | null; ingredient_id?: string | null; system_stock?: number; actual_stock?: number | null; difference?: number | null; unit?: string; reason?: string | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "stock_opname_items_opname_id_fkey"; columns: ["opname_id"]; referencedRelation: "stock_opnames"; referencedColumns: ["id"] }, { foreignKeyName: "stock_opname_items_ingredient_id_fkey"; columns: ["ingredient_id"]; referencedRelation: "ingredients"; referencedColumns: ["id"] } ]
      }
      stock_opnames: {
        Row: { id: string; opname_number: string; opname_date: string; status: string | null; notes: string | null; completed_at: string | null; created_by: string | null; approved_by: string | null; created_at: string | null; submitted_by: string | null }
        Insert: { id?: string; opname_number?: string; opname_date?: string; status?: string | null; notes?: string | null; completed_at?: string | null; created_by?: string | null; approved_by?: string | null; created_at?: string | null; submitted_by?: string | null }
        Update: { id?: string; opname_number?: string; opname_date?: string; status?: string | null; notes?: string | null; completed_at?: string | null; created_by?: string | null; approved_by?: string | null; created_at?: string | null; submitted_by?: string | null }
        Relationships: [ { foreignKeyName: "stock_opnames_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "stock_opnames_approved_by_fkey"; columns: ["approved_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "stock_opnames_submitted_by_fkey"; columns: ["submitted_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      stock_purchase_items: {
        Row: { id: string; purchase_id: string | null; ingredient_id: string | null; quantity_ordered: number; quantity_received: number | null; unit: string; unit_price: number; discount_percent: number | null; subtotal: number; expiry_date: string | null; batch_code: string | null; created_at: string | null }
        Insert: { id?: string; purchase_id?: string | null; ingredient_id?: string | null; quantity_ordered?: number; quantity_received?: number | null; unit?: string; unit_price?: number; discount_percent?: number | null; subtotal?: number; expiry_date?: string | null; batch_code?: string | null; created_at?: string | null }
        Update: { id?: string; purchase_id?: string | null; ingredient_id?: string | null; quantity_ordered?: number; quantity_received?: number | null; unit?: string; unit_price?: number; discount_percent?: number | null; subtotal?: number; expiry_date?: string | null; batch_code?: string | null; created_at?: string | null }
        Relationships: [ { foreignKeyName: "stock_purchase_items_purchase_id_fkey"; columns: ["purchase_id"]; referencedRelation: "stock_purchases"; referencedColumns: ["id"] }, { foreignKeyName: "stock_purchase_items_ingredient_id_fkey"; columns: ["ingredient_id"]; referencedRelation: "ingredients"; referencedColumns: ["id"] } ]
      }
      stock_purchases: {
        Row: { id: string; purchase_number: string; supplier_id: string | null; purchase_date: string; received_date: string | null; subtotal: number | null; tax_amount: number | null; discount_amount: number | null; total_amount: number | null; payment_status: string | null; payment_due_date: string | null; notes: string | null; invoice_number: string | null; status: string | null; created_by: string | null; created_at: string | null; updated_at: string | null; received_by: string | null; approved_by: string | null; approved_at: string | null }
        Insert: { id?: string; purchase_number?: string; supplier_id?: string | null; purchase_date?: string; received_date?: string | null; subtotal?: number | null; tax_amount?: number | null; discount_amount?: number | null; total_amount?: number | null; payment_status?: string | null; payment_due_date?: string | null; notes?: string | null; invoice_number?: string | null; status?: string | null; created_by?: string | null; created_at?: string | null; updated_at?: string | null; received_by?: string | null; approved_by?: string | null; approved_at?: string | null }
        Update: { id?: string; purchase_number?: string; supplier_id?: string | null; purchase_date?: string; received_date?: string | null; subtotal?: number | null; tax_amount?: number | null; discount_amount?: number | null; total_amount?: number | null; payment_status?: string | null; payment_due_date?: string | null; notes?: string | null; invoice_number?: string | null; status?: string | null; created_by?: string | null; created_at?: string | null; updated_at?: string | null; received_by?: string | null; approved_by?: string | null; approved_at?: string | null }
        Relationships: [ { foreignKeyName: "stock_purchases_supplier_id_fkey"; columns: ["supplier_id"]; referencedRelation: "suppliers"; referencedColumns: ["id"] }, { foreignKeyName: "stock_purchases_created_by_fkey"; columns: ["created_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "stock_purchases_received_by_fkey"; columns: ["received_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "stock_purchases_approved_by_fkey"; columns: ["approved_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      store_settings: {
        Row: { id: number; company_name: string; short_name: string; tagline: string; logo_url: string | null; logo_icon_url: string | null; favicon_url: string | null; primary_color: string; primary_color_hex: string; accent_color: string; sidebar_color: string; whatsapp: string; instagram: string; facebook: string; updated_at: string; updated_by: string | null; email: string; phone: string; address: string; currency_code: string; locale: string; receipt_footer: string; business_hours: string; features: Json; background_color: string | null; surface_color: string | null; text_color: string | null; text_muted_color: string | null; border_color: string | null; button_text_color: string | null; success_color: string | null; danger_color: string | null; warning_color: string | null; sidebar_text_color: string | null; footer_bg_color: string | null; footer_text_color: string | null; text_secondary_color: string | null; accent_foreground_color: string | null; surface_raised_color: string | null; accent_subtle_color: string }
        Insert: { id?: number; company_name?: string; short_name?: string; tagline?: string; logo_url?: string | null; logo_icon_url?: string | null; favicon_url?: string | null; primary_color?: string; primary_color_hex?: string; accent_color?: string; sidebar_color?: string; whatsapp?: string; instagram?: string; facebook?: string; updated_at?: string; updated_by?: string | null; email?: string; phone?: string; address?: string; currency_code?: string; locale?: string; receipt_footer?: string; business_hours?: string; features?: Json; background_color?: string | null; surface_color?: string | null; text_color?: string | null; text_muted_color?: string | null; border_color?: string | null; button_text_color?: string | null; success_color?: string | null; danger_color?: string | null; warning_color?: string | null; sidebar_text_color?: string | null; footer_bg_color?: string | null; footer_text_color?: string | null; text_secondary_color?: string | null; accent_foreground_color?: string | null; surface_raised_color?: string | null; accent_subtle_color?: string }
        Update: { id?: number; company_name?: string; short_name?: string; tagline?: string; logo_url?: string | null; logo_icon_url?: string | null; favicon_url?: string | null; primary_color?: string; primary_color_hex?: string; accent_color?: string; sidebar_color?: string; whatsapp?: string; instagram?: string; facebook?: string; updated_at?: string; updated_by?: string | null; email?: string; phone?: string; address?: string; currency_code?: string; locale?: string; receipt_footer?: string; business_hours?: string; features?: Json; background_color?: string | null; surface_color?: string | null; text_color?: string | null; text_muted_color?: string | null; border_color?: string | null; button_text_color?: string | null; success_color?: string | null; danger_color?: string | null; warning_color?: string | null; sidebar_text_color?: string | null; footer_bg_color?: string | null; footer_text_color?: string | null; text_secondary_color?: string | null; accent_foreground_color?: string | null; surface_raised_color?: string | null; accent_subtle_color?: string }
        Relationships: [ { foreignKeyName: "store_settings_updated_by_fkey"; columns: ["updated_by"]; referencedRelation: "profiles"; referencedColumns: ["id"] } ]
      }
      suppliers: {
        Row: { id: string; name: string; contact_person: string | null; phone: string | null; email: string | null; address: string | null; notes: string | null; is_active: boolean | null; created_at: string | null; updated_at: string | null }
        Insert: { id?: string; name?: string; contact_person?: string | null; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null; is_active?: boolean | null; created_at?: string | null; updated_at?: string | null }
        Update: { id?: string; name?: string; contact_person?: string | null; phone?: string | null; email?: string | null; address?: string | null; notes?: string | null; is_active?: boolean | null; created_at?: string | null; updated_at?: string | null }
        Relationships: []
      }
      variant_option_values: {
        Row: { id: string; variant_id: string; option_value_id: string }
        Insert: { id?: string; variant_id?: string; option_value_id?: string }
        Update: { id?: string; variant_id?: string; option_value_id?: string }
        Relationships: [ { foreignKeyName: "variant_option_values_variant_id_fkey"; columns: ["variant_id"]; referencedRelation: "product_variants"; referencedColumns: ["id"] }, { foreignKeyName: "variant_option_values_option_value_id_fkey"; columns: ["option_value_id"]; referencedRelation: "product_option_values"; referencedColumns: ["id"] } ]
      }
    }
    Views: {
      daily_profitability: {
        Row: { sale_date: string | null; total_transactions: number | null; revenue: number | null; total_discount: number | null; cogs: number | null; gross_profit: number | null; gross_margin_pct: number | null }
        Insert: { }
        Update: { }
        Relationships: []
      }
      daily_sales_summary: {
        Row: { sale_date: string | null; total_transactions: number | null; total_revenue: number | null; total_discounts: number | null }
        Insert: { }
        Update: { }
        Relationships: []
      }
      dashboard_owner_stats: {
        Row: { today_revenue: number | null; today_cogs: number | null; today_gross_profit: number | null; today_transactions: number | null; month_revenue: number | null; month_gross_profit: number | null }
        Insert: { }
        Update: { }
        Relationships: []
      }
      low_stock_ingredients: {
        Row: { id: string | null; code: string | null; name: string | null; current_stock: number | null; min_stock: number | null; base_unit: string | null; reorder_point: number | null }
        Insert: { }
        Update: { }
        Relationships: []
      }
      low_stock_products: {
        Row: { id: string | null; name: string | null; category: string | null; current_stock: number | null; min_stock: number | null }
        Insert: { }
        Update: { }
        Relationships: []
      }
      monthly_profitability: {
        Row: { month: string | null; revenue: number | null; total_discount: number | null; cogs: number | null; gross_profit: number | null; total_expenses: number | null; net_profit: number | null }
        Insert: { }
        Update: { }
        Relationships: []
      }
      product_profitability: {
        Row: { product_id: string | null; product_name: string | null; category: string | null; total_transactions: number | null; total_qty_sold: number | null; total_revenue: number | null; total_cogs: number | null; total_gross_profit: number | null; gross_margin_pct: number | null; selling_price: number | null; cost_price: number | null; current_stock: number | null }
        Insert: { }
        Update: { }
        Relationships: []
      }
      product_review_summary: {
        Row: { product_id: string | null; review_count: number | null; avg_rating: number | null; five_star: number | null; four_star: number | null; three_star: number | null; low_star: number | null }
        Insert: { }
        Update: { }
        Relationships: []
      }
      recipe_cost_summary: {
        Row: { recipe_id: string | null; product_id: string | null; product_name: string | null; yield_quantity: number | null; total_recipe_cost: number | null; cost_per_unit: number | null }
        Insert: { }
        Update: { }
        Relationships: []
      }
    }
    Functions: {
      calculate_customer_tier: {
        Args: { p_total_spending: number }
        Returns: string
      }
      check_order_rate_limit: {
        Args: { p_phone: string }
        Returns: boolean
      }
      complete_production_batch: {
        Args: { p_batch_id: string, p_quantity_produced: number, p_quantity_defect: number }
        Returns: Json
      }
      confirm_order: {
        Args: { p_order_id: string, p_user_id: string }
        Returns: Json
      }
      convert_base_unit: {
        Args: { p_qty: number, p_from: string, p_to: string }
        Returns: number
      }
      decrement_variant_stock: {
        Args: { p_variant_id: string, p_qty: number }
        Returns: Json
      }
      fn_journalize_expense: {
        Args: {  }
        Returns: string
      }
      fn_journalize_purchase: {
        Args: {  }
        Returns: string
      }
      fn_journalize_sale: {
        Args: {  }
        Returns: string
      }
      fn_update_overdue_status: {
        Args: {  }
        Returns: string
      }
      generate_customer_code: {
        Args: {  }
        Returns: string
      }
      generate_invoice_number: {
        Args: {  }
        Returns: string
      }
      generate_order_number: {
        Args: {  }
        Returns: string
      }
      get_recipe_id_for_product: {
        Args: { p_product_id: string, p_variant_id?: string | null }
        Returns: string
      }
      get_user_role: {
        Args: {  }
        Returns: string
      }
      handle_audit_log: {
        Args: {  }
        Returns: string
      }
      handle_new_user: {
        Args: {  }
        Returns: string
      }
      has_module_access: {
        Args: { p_module: string, p_action: string }
        Returns: boolean
      }
      log_order_status_change: {
        Args: {  }
        Returns: string
      }
      next_doc_number: {
        Args: { p_prefix: string, p_table: string, p_column: string }
        Returns: string
      }
      process_purchase: {
        Args: { p_purchase_id: string }
        Returns: Json
      }
      process_sale: {
        Args: { p_sale_id: string }
        Returns: Json
      }
      process_stock_opname: {
        Args: { p_opname_id: string }
        Returns: Json
      }
      rpc_cancel_order: {
        Args: { p_order_id: string, p_user_id: string }
        Returns: Json
      }
      rpc_complete_order: {
        Args: { p_order_id: string, p_user_id: string }
        Returns: Json
      }
      rpc_confirm_order: {
        Args: { p_order_id: string, p_user_id: string }
        Returns: Json
      }
      rpc_deliver_order: {
        Args: { p_order_id: string, p_user_id: string }
        Returns: Json
      }
      rpc_mark_paid: {
        Args: { p_order_id: string, p_user_id: string }
        Returns: Json
      }
      rpc_ready_for_pickup: {
        Args: { p_order_id: string, p_user_id: string }
        Returns: Json
      }
      rpc_start_production: {
        Args: { p_order_id: string, p_user_id: string }
        Returns: Json
      }
      sync_order_total: {
        Args: {  }
        Returns: string
      }
      touch_custom_cake_updated_at: {
        Args: {  }
        Returns: string
      }
      touch_customer_updated_at: {
        Args: {  }
        Returns: string
      }
      track_order: {
        Args: { p_order_number: string, p_phone: string }
        Returns: Json
      }
      trg_sync_customer_from_order: {
        Args: {  }
        Returns: string
      }
      trg_sync_customer_from_sale: {
        Args: {  }
        Returns: string
      }
      upsert_customer_from_transaction: {
        Args: { p_name: string, p_phone: string, p_amount: number, p_order_date: string }
        Returns: undefined
      }
      validate_order_transition: {
        Args: { p_from: string, p_to: string }
        Returns: undefined
      }
      void_sale: {
        Args: { p_sale_id: string, p_user_id: string, p_reason?: string | null }
        Returns: Json
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]
export type CompositeTypes<T extends keyof Database["public"]["CompositeTypes"]> = Database["public"]["CompositeTypes"][T]
export type Functions<T extends keyof Database["public"]["Functions"]> = Database["public"]["Functions"][T]
