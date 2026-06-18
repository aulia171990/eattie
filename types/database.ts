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
      customers: {
        Row: {
          id: string
          name: string
          phone: string
          email: string | null
          address: string | null
          notes: string | null
          tier: string
          total_spending: number
          total_orders: number
          last_order_date: string | null
          is_manual: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email?: string | null
          address?: string | null
          notes?: string | null
          tier?: string
          total_spending?: number
          total_orders?: number
          last_order_date?: string | null
          is_manual?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          email?: string | null
          address?: string | null
          notes?: string | null
          tier?: string
          total_spending?: number
          total_orders?: number
          last_order_date?: string | null
          is_manual?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      custom_cake_requests: {
        Row: {
          id: string
          req_number: string
          customer_name: string
          customer_phone: string
          size: string
          flavor: string
          color_theme: string | null
          special_notes: string | null
          reference_image_url: string | null
          quoted_price: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          req_number: string
          customer_name: string
          customer_phone: string
          size: string
          flavor: string
          color_theme?: string | null
          special_notes?: string | null
          reference_image_url?: string | null
          quoted_price?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: string
          quoted_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'ingredients_category_id_fkey'
            columns: ['category_id']
            referencedRelation: 'ingredient_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ingredients_preferred_supplier_id_fkey'
            columns: ['preferred_supplier_id']
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'stock_purchases_supplier_id_fkey'
            columns: ['supplier_id']
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_purchases_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'stock_purchase_items_purchase_id_fkey'
            columns: ['purchase_id']
            referencedRelation: 'stock_purchases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_purchase_items_ingredient_id_fkey'
            columns: ['ingredient_id']
            referencedRelation: 'ingredients'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'stock_movements_ingredient_id_fkey'
            columns: ['ingredient_id']
            referencedRelation: 'ingredients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'stock_opnames_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_opnames_approved_by_fkey'
            columns: ['approved_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'stock_opname_items_opname_id_fkey'
            columns: ['opname_id']
            referencedRelation: 'stock_opnames'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_opname_items_ingredient_id_fkey'
            columns: ['ingredient_id']
            referencedRelation: 'ingredients'
            referencedColumns: ['id']
          },
        ]
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
          current_stock: number
          min_stock: number
          image_url: string | null
          is_active: boolean
          is_available_online: boolean
          online_description: string | null
          online_sort_order: number
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
          current_stock?: number
          min_stock?: number
          image_url?: string | null
          is_active?: boolean
          is_available_online?: boolean
          online_description?: string | null
          online_sort_order?: number
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
          current_stock?: number
          min_stock?: number
          image_url?: string | null
          is_active?: boolean
          is_available_online?: boolean
          online_description?: string | null
          online_sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'recipes_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'recipe_ingredients_recipe_id_fkey'
            columns: ['recipe_id']
            referencedRelation: 'recipes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recipe_ingredients_ingredient_id_fkey'
            columns: ['ingredient_id']
            referencedRelation: 'ingredients'
            referencedColumns: ['id']
          },
        ]
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
          cost_per_unit: number | null
          total_cost: number | null
          stock_consumed: boolean
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
          cost_per_unit?: number | null
          total_cost?: number | null
          stock_consumed?: boolean
        }
        Update: {
          quantity_produced?: number
          quantity_defect?: number
          status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'
          started_at?: string | null
          completed_at?: string | null
          notes?: string | null
          updated_at?: string
          cost_per_unit?: number | null
          total_cost?: number | null
          stock_consumed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'production_batches_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'production_batches_recipe_id_fkey'
            columns: ['recipe_id']
            referencedRelation: 'recipes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'production_batches_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'product_inventory_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_inventory_batch_id_fkey'
            columns: ['batch_id']
            referencedRelation: 'production_batches'
            referencedColumns: ['id']
          },
        ]
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
          cogs: number | null
          gross_profit: number | null
          stock_deducted: boolean
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
          cogs?: number | null
          gross_profit?: number | null
          stock_deducted?: boolean
        }
        Update: {
          status?: 'pending' | 'completed' | 'cancelled' | 'refunded'
          notes?: string | null
          cogs?: number | null
          gross_profit?: number | null
          stock_deducted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'sales_cashier_id_fkey'
            columns: ['cashier_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'sale_items_sale_id_fkey'
            columns: ['sale_id']
            referencedRelation: 'sales'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_items_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_items_batch_id_fkey'
            columns: ['batch_id']
            referencedRelation: 'production_batches'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_name: string
          customer_phone: string
          customer_email: string | null
          customer_address: string | null
          order_type: 'PICKUP' | 'DELIVERY' | 'CUSTOM_CAKE' | 'PREORDER' | string
          pickup_date: string | null
          pickup_time: string | null
          delivery_address: string | null
          notes: string | null
          subtotal: number
          discount_amount: number
          total_amount: number
          status: 'pending' | 'confirmed' | 'in_production' | 'ready' | 'delivered' | 'completed' | 'cancelled' | string
          payment_status: string
          payment_proof_url: string | null
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          sale_id: string | null
          source: string | null
          created_at: string
          updated_at: string
          confirmed_at: string | null
          confirmed_by: string | null
        }
        Insert: {
          id?: string
          order_number: string
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          customer_address?: string | null
          order_type?: string
          pickup_date?: string | null
          pickup_time?: string | null
          delivery_address?: string | null
          notes?: string | null
          subtotal?: number
          discount_amount?: number
          total_amount?: number
          status?: string
          payment_status?: string
          payment_proof_url?: string | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          sale_id?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
        }
        Update: {
          status?: string
          payment_status?: string
          payment_proof_url?: string | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          sale_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          updated_at?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'orders_confirmed_by_fkey'
            columns: ['confirmed_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          subtotal: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          subtotal: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          quantity?: number
          unit_price?: number
          subtotal?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: 'expenses_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: []
      }
    }
    Functions: {
      process_purchase: {
        Args: { p_purchase_id: string }
        Returns: Json
      }
      complete_production_batch: {
        Args: {
          p_batch_id: string
          p_quantity_produced: number
          p_quantity_defect?: number
        }
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
      generate_invoice_number: {
        Args: Record<string, never>
        Returns: string
      }
      get_recipe_id_for_product: {
        Args: { p_product_id: string }
        Returns: string
      }
      generate_order_number: {
        Args: Record<string, never>
        Returns: string
      }
      confirm_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      rpc_confirm_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      rpc_cancel_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      rpc_start_production: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      rpc_ready_for_pickup: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      rpc_deliver_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      rpc_complete_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      rpc_mark_paid: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: Json
      }
      track_order: {
        Args: { p_order_number: string; p_phone: string }
        Returns: Json
      }
    }
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
