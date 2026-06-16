export type CustomCakeStatus =
  | 'pending'
  | 'quoted'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export interface CustomCakeRequest {
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
  status: CustomCakeStatus
  created_at: string
  updated_at: string
}

export const CUSTOM_CAKE_STATUS_LABEL: Record<CustomCakeStatus, string> = {
  pending:       'Menunggu',
  quoted:        'Harga Dikirim',
  confirmed:     'Dikonfirmasi',
  in_production: 'Sedang Dibuat',
  ready:         'Siap Diambil',
  delivered:     'Selesai',
  cancelled:     'Dibatalkan',
}

export const CUSTOM_CAKE_STATUS_COLOR: Record<CustomCakeStatus, string> = {
  pending:       'bg-yellow-100 text-yellow-800',
  quoted:        'bg-blue-100 text-blue-800',
  confirmed:     'bg-indigo-100 text-indigo-800',
  in_production: 'bg-orange-100 text-orange-800',
  ready:         'bg-green-100 text-green-800',
  delivered:     'bg-gray-100 text-gray-700',
  cancelled:     'bg-red-100 text-red-700',
}
