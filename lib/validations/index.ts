import { z } from 'zod'

// ─── Ingredient ───────────────────────────────────────────────
export const ingredientSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  name_en: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
  base_unit: z.string().min(1, 'Satuan wajib diisi'),
  purchase_unit: z.string().optional(),
  conversion_rate: z.coerce.number().positive().default(1),
  current_stock: z.coerce.number().min(0).default(0),
  min_stock: z.coerce.number().min(0).default(0),
  max_stock: z.coerce.number().min(0).optional().nullable(),
  reorder_point: z.coerce.number().min(0).optional().nullable(),
  price_per_unit: z.coerce.number().min(0).default(0),
  shelf_life_days: z.coerce.number().int().positive().optional().nullable(),
  storage_location: z.string().optional(),
  preferred_supplier_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
})

export type IngredientFormData = z.infer<typeof ingredientSchema>

// ─── Supplier ─────────────────────────────────────────────────
export const supplierSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
})

export type SupplierFormData = z.infer<typeof supplierSchema>

// ─── Category ─────────────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  name_en: z.string().optional(),
  description: z.string().optional(),
})

export type CategoryFormData = z.infer<typeof categorySchema>

// ─── Stock Purchase ───────────────────────────────────────────
export const purchaseItemSchema = z.object({
  ingredient_id: z.string().uuid('Pilih bahan baku'),
  quantity_ordered: z.coerce.number().positive('Jumlah harus > 0'),
  unit: z.string().min(1),
  unit_price: z.coerce.number().min(0),
  discount_percent: z.coerce.number().min(0).max(100).default(0),
  expiry_date: z.string().optional().nullable(),
  batch_code: z.string().optional(),
})

export const stockPurchaseSchema = z.object({
  supplier_id: z.string().uuid().optional().nullable(),
  purchase_date: z.string().min(1, 'Tanggal wajib diisi'),
  payment_due_date: z.string().optional().nullable(),
  invoice_number: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'Tambahkan minimal 1 item'),
})

export type StockPurchaseFormData = z.infer<typeof stockPurchaseSchema>
export type PurchaseItemFormData = z.infer<typeof purchaseItemSchema>

// ─── Stock Adjustment ─────────────────────────────────────────
export const stockAdjustmentSchema = z.object({
  ingredient_id: z.string().uuid(),
  movement_type: z.enum(['adjustment_in', 'adjustment_out', 'waste']),
  quantity: z.coerce.number().positive('Jumlah harus > 0'),
  reason: z.string().min(3, 'Alasan wajib diisi'),
  notes: z.string().optional(),
})

export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>

// ─── Product ──────────────────────────────────────────────────
export const productSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  name_en: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(['bread', 'cake', 'pastry', 'cookies', 'other']).optional().nullable(),
  selling_price: z.coerce.number().positive('Harga jual harus > 0'),
  cost_price: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
})

export type ProductFormData = z.infer<typeof productSchema>

// ─── Recipe ───────────────────────────────────────────────────
export const recipeIngredientSchema = z.object({
  ingredient_id: z.string().uuid('Pilih bahan baku'),
  quantity: z.coerce.number().positive('Jumlah harus > 0'),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  notes: z.string().optional(),
})

export const recipeSchema = z.object({
  product_id: z.string().uuid('Pilih produk'),
  yield_quantity: z.coerce.number().int().positive().default(1),
  instructions: z.string().optional(),
  prep_time_minutes: z.coerce.number().int().min(0).optional().nullable(),
  bake_time_minutes: z.coerce.number().int().min(0).optional().nullable(),
  bake_temperature: z.coerce.number().int().min(0).optional().nullable(),
  ingredients: z.array(recipeIngredientSchema).min(1, 'Tambahkan minimal 1 bahan'),
})

export type RecipeFormData = z.infer<typeof recipeSchema>
export type RecipeIngredientFormData = z.infer<typeof recipeIngredientSchema>

// ─── Production Batch ─────────────────────────────────────────
export const productionBatchSchema = z.object({
  product_id: z.string().uuid('Pilih produk'),
  recipe_id: z.string().uuid('Pilih resep').optional().nullable(),
  quantity_planned: z.coerce.number().int().positive('Jumlah harus > 0'),
  scheduled_date: z.string().min(1, 'Tanggal wajib diisi'),
  notes: z.string().optional(),
})

export const updateBatchSchema = z.object({
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']),
  quantity_produced: z.coerce.number().int().min(0).optional(),
  quantity_defect: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
})

export type ProductionBatchFormData = z.infer<typeof productionBatchSchema>
export type UpdateBatchFormData = z.infer<typeof updateBatchSchema>
