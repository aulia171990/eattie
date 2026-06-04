import { z } from 'zod'

export const productionBatchSchema = z.object({
  product_id: z.string().uuid('Pilih produk'),
  recipe_id: z.string().uuid('Pilih resep').optional().nullable(),
  quantity_planned: z.coerce.number().int().positive('Jumlah harus lebih dari 0'),
  scheduled_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const updateBatchStatusSchema = z.object({
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']),
  quantity_produced: z.coerce.number().int().min(0).optional(),
  quantity_defect: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
})

export type ProductionBatchInput = z.infer<typeof productionBatchSchema>
export type UpdateBatchStatusInput = z.infer<typeof updateBatchStatusSchema>
