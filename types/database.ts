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
        Row: {
          id: string
          full_name: string
          role: 'owner' | 'cashier' | 'baker'
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          role: 'owner' | 'cashier' | 'baker'
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          role?: 'owner' | 'cashier' | 'baker'
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      ingredient_categories: {
        Row: {
          id: string
          name: string
          name_en: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          name_en?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          name_en?: string | null
          description?: string | null
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      ingredients: {
        Row: {
          id: string
          code: string | null
          name: string
          name_en: string | null
          category_id: string | null
          base_unit: string
          purchase_unit: string | null
          conversion_rate: number
          current_stock: number
          min_stock: number
          max_stock: number | null
          reorder_point: number | null
          price_per_unit: number
          last_purchase_price: number | null
          average_price: number | null
          shelf_life_days: number | null
          storage_location: string | null
          preferred_supplier_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code?: string | null
          name: string
          name_en?: string | null
          category_id?: string | null
          base_unit: string
          purchase_unit?: string | null
          conversion_rate?: number
          current_stock?: number
          min_stock?: number
          max_stock?: number | null
          reorder_point?: number | null
          price_per_unit?: number
          last_purchase_price?: number | null
          average_price?: number | null
          shelf_life_days?: number | null
          storage_location?: string | null
          preferred_supplier_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          name?: string
          name_en?: string | null
          category_id?: string | null
          base_unit?: string
          purchase_unit?: string | null
          conversion_rate?: number
          current_stock?: number
          min_stock?: number
          max_stock?: number | null
          reorder_point?: number | null
          price_per_unit?: number
          last_purchase_price?: number | null
          average_price?: number | null
          shelf_life_days?: number | null
          storage_location?: string | null
          preferred_supplier_id?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      stock_purchases: {
        Row: {
          id: string
          purchase_number: string
          supplier_id: string | null
          purchase_date: string
          received_date: string | null
          subtotal: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          payment_status: 'unpaid' | 'partial' | 'paid'
          payment_due_date: string | null
          notes: string | null
          invoice_number: string | null
          status: 'draft' | 'ordered' | 'received' | 'cancelled'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          purchase_number: string
          supplier_id?: string | null
          purchase_date: string
          received_date?: string | null
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          payment_status?: 'unpaid' | 'partial' | 'paid'
          payment_due_date?: string | null
          notes?: string | null
          invoice_number?: string | null
          status?: 'draft' | 'ordered' | 'received' | 'cancelled'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          received_date?: string | null
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          payment_status?: 'unpaid' | 'partial' | 'paid'
          payment_due_date?: string | null
          notes?: string | null
          invoice_number?: string | null
          status?: 'draft' | 'ordered' | 'received' | 'cancelled'
          updated_at?: string
        }
      }
      stock_purchase_items: {
        Row: {
          id: string
          purchase_id: string
          ingredient_id: string
          quantity_ordered: number
          quantity_received: number
          unit: string
          unit_price: number
          discount_percent: number
          subtotal: number
          expiry_date: string | null
          batch_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          purchase_id: string
          ingredient_id: string
          quantity_ordered: number
          quantity_received?: number
          unit: string
          unit_price: number
          discount_percent?: number
          subtotal: number
          expiry_date?: string | null
          batch_code?: string | null
          created_at?: string
        }
        Update: {
          quantity_received?: number
          expiry_date?: string | null
          batch_code?: string | null
        }
      }
      stock_movements: {
        Row: {
          id: string
          ingredient_id: string
          movement_type: 'purchase_in' | 'production_out' | 'adjustment_in' | 'adjustment_out' | 'transfer_in' | 'transfer_out' | 'return_out' | 'waste'
          quantity: number
          unit: string
          stock_before: number
          stock_after: number
          reference_type: string | null
          reference_id: string | null
          batch_code: string | null
          expiry_date: string | null
          reason: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          movement_type: 'purchase_in' | 'production_out' | 'adjustment_in' | 'adjustment_out' | 'transfer_in' | 'transfer_out' | 'return_out' | 'waste'
          quantity: number
          unit: string
          stock_before: number
          stock_after: number
          reference_type?: string | null
          reference_id?: string | null
          batch_code?: string | null
          expiry_date?: string | null
          reason?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          reason?: string | null
          notes?: string | null
        }
      }
      stock_opnames: {
        Row: {
          id: string
          opname_number: string
          opname_date: string
          status: 'draft' | 'in_progress' | 'completed' | 'cancelled'
          notes: string | null
          completed_at: string | null
          created_by: string | null
          approved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          opname_number: string
          opname_date: string
          status?: 'draft' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          completed_at?: string | null
          created_by?: string | null
          approved_by?: string | null
          created_at?: string
        }
        Update: {
          status?: 'draft' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          completed_at?: string | null
          approved_by?: string | null
        }
      }
      stock_opname_items: {
        Row: {
          id: string
          opname_id: string
          ingredient_id: string
          system_stock: number
          actual_stock: number | null
          difference: number | null
          unit: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          opname_id: string
          ingredient_id: string
          system_stock: number
          actual_stock?: number | null
          difference?: number | null
          unit: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          actual_stock?: number | null
          difference?: number | null
          reason?: string | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          name_en: string | null
          description: string | null
          category: string | null
          selling_price: number
          cost_price: number
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_en?: string | null
          description?: string | null
          category?: string | null
          selling_price: number
          cost_price?: number
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          name_en?: string | null
          description?: string | null
          category?: string | null
          selling_price?: number
          cost_price?: number
          image_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          product_id: string
          yield_quantity: number
          instructions: string | null
          prep_time_minutes: number | null
          bake_time_minutes: number | null
          bake_temperature: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          yield_quantity?: number
          instructions?: string | null
          prep_time_minutes?: number | null
          bake_time_minutes?: number | null
          bake_temperature?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          product_id?: string
          yield_quantity?: number
          instructions?: string | null
          prep_time_minutes?: number | null
          bake_time_minutes?: number | null
          bake_temperature?: number | null
          updated_at?: string
        }
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          ingredient_id: string
          quantity: number
          unit: string
          notes: string | null
        }
        Insert: {
          id?: string
          recipe_id: string
          ingredient_id: string
          quantity: number
          unit: string
          notes?: string | null
        }
        Update: {
          quantity?: number
          unit?: string
          notes?: string | null
        }
      }
      production_batches: {
        Row: {
          id: string
          batch_number: string
          product_id: string | null
          recipe_id: string | null
          quantity_planned: number
          quantity_produced: number
          quantity_defect: number
          status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_date: string | null
          started_at: string | null
          completed_at: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          batch_number: string
          product_id?: string | null
          recipe_id?: string | null
          quantity_planned: number
          quantity_produced?: number
          quantity_defect?: number
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_date?: string | null
          started_at?: string | null
          completed_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          quantity_produced?: number
          quantity_defect?: number
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          started_at?: string | null
          completed_at?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      product_inventory: {
        Row: {
          id: string
          product_id: string
          batch_id: string | null
          quantity: number
          expiry_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          batch_id?: string | null
          quantity: number
          expiry_date?: string | null
          created_at?: string
        }
        Update: {
          quantity?: number
          expiry_date?: string | null
        }
      }
      sales: {
        Row: {
          id: string
          invoice_number: string
          subtotal: number
          discount_amount: number
          discount_percent: number
          tax_amount: number
          total: number
          payment_method: 'cash' | 'card' | 'transfer' | 'qris' | null
          payment_amount: number | null
          change_amount: number | null
          customer_name: string | null
          notes: string | null
          status: 'pending' | 'completed' | 'cancelled' | 'refunded'
          cashier_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          subtotal: number
          discount_amount?: number
          discount_percent?: number
          tax_amount?: number
          total: number
          payment_method?: 'cash' | 'card' | 'transfer' | 'qris' | null
          payment_amount?: number | null
          change_amount?: number | null
          customer_name?: string | null
          notes?: string | null
          status?: 'pending' | 'completed' | 'cancelled' | 'refunded'
          cashier_id?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'completed' | 'cancelled' | 'refunded'
          notes?: string | null
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string | null
          batch_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id?: string | null
          batch_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
          subtotal: number
          created_at?: string
        }
        Update: {
          quantity?: number
          unit_price?: number
          subtotal?: number
        }
      }
      expenses: {
        Row: {
          id: string
          category: string
          description: string
          amount: number
          expense_date: string
          receipt_url: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category: string
          description: string
          amount: number
          expense_date: string
          receipt_url?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          category?: string
          description?: string
          amount?: number
          expense_date?: string
          receipt_url?: string | null
        }
      }
    }
    Views: {
      daily_sales_summary: {
        Row: {
          sale_date: string | null
          total_transactions: number | null
          total_revenue: number | null
          total_discounts: number | null
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ─── Helper types ─────────────────────────────────────────────────────────────

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
