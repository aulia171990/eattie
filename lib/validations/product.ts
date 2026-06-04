import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi'),
  name_en: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.enum(['bread', 'cake', 'pastry', 'cookies', 'other']).optional().nullable(),
  selling_price: z.coerce.number().min(0, 'Harga harus positif'),
  cost_price: z.coerce.number().min(0).default(0),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
  is_active: z.boolean().default(true),
})

export type ProductInput = z.infer<typeof productSchema>

export const recipeIngredientSchema = z.object({
  ingredient_id: z.string().uuid('Pilih bahan baku'),
  quantity: z.coerce.number().positive('Jumlah harus lebih dari 0'),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  notes: z.string().optional().nullable(),
})

export const recipeSchema = z.object({
  product_id: z.string().uuid('Pilih produk'),
  yield_quantity: z.coerce.number().int().positive().default(1),
  instructions: z.string().optional().nullable(),
  prep_time_minutes: z.coerce.number().int().min(0).optional().nullable(),
  bake_time_minutes: z.coerce.number().int().min(0).optional().nullable(),
  bake_temperature: z.coerce.number().int().min(0).optional().nullable(),
  ingredients: z.array(recipeIngredientSchema).min(1, 'Tambahkan minimal 1 bahan'),
})

export type RecipeInput = z.infer<typeof recipeSchema>
