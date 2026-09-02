import { z } from 'zod'

export const CustomCakeSchema = z.object({
  customer_name: z.string().min(1).max(100),
  customer_phone: z.string().min(8).max(20),
  size: z.enum(['16cm', '20cm', '24cm']),
  flavor: z.string().min(1),
  color_theme: z.string().optional(),
  special_notes: z.string().optional(),
  reference_image_url: z.string().url().optional().or(z.literal('')),
})
