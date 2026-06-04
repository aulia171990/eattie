import { z } from 'zod'

export const ingredientSchema = z.object({
  code: z.string().optional().nullable(),
  name: z.string().min(1, 'Nama wajib diisi'),
  name_en: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  base_unit: z.string().min(1, 'Satuan wajib diisi'),
  purchase_unit: z.string().optional().nullable(),
  conversion_rate: z.coerce.number().positive().default(1),
  current_stock: z.coerce.number().min(0).default(0),
  min_stock: z.coerce.number().min(0).default(0),
  max_stock: z.coerce.number().min(0).optional().nullable(),
  reorder_point: z.coerce.number().min(0).optional().nullable(),
  price_per_unit: z.coerce.number().min(0).default(0),
  shelf_life_days: z.coerce.number().int().positive().optional().nullable(),
  storage_location: z.string().optional().nullable(),
  preferred_supplier_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
})

export type IngredientInput = z.infer<typeof ingredientSchema>

export const supplierSchema = z.object({
  name: z.string().min(1, 'Nama supplier wajib diisi'),
  contact_person: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Email tidak valid').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

export type SupplierInput = z.infer<typeof supplierSchema>

export const stockPurchaseSchema = z.object({
  supplier_id: z.string().uuid().optional().nullable(),
  purchase_date: z.string().min(1, 'Tanggal pembelian wajib diisi'),
  payment_due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  invoice_number: z.string().optional().nullable(),
  status: z.enum(['draft', 'ordered', 'received', 'cancelled']).default('draft'),
})

export const stockAdjustmentSchema = z.object({
  ingredient_id: z.string().uuid('Pilih bahan baku'),
  movement_type: z.enum(['adjustment_in', 'adjustment_out', 'waste']),
  quantity: z.coerce.number().positive('Jumlah harus lebih dari 0'),
  reason: z.string().min(1, 'Alasan wajib diisi'),
  notes: z.string().optional().nullable(),
})
