export interface ProductVariant {
  id: string
  product_id: string
  name: string
  price: number
  sort_order: number
  is_active: boolean
  image_url?: string | null
  created_at: string
  updated_at: string
}

export interface ProductAddon {
  id: string
  product_id: string
  name: string
  price: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductCategory {
  id: string
  name: string
  name_en?: string | null
  emoji?: string | null
  description?: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductTag {
  id: string
  name: string
  emoji?: string | null
  created_at: string
}

export interface ProductGallery {
  id: string
  product_id: string
  variant_id: string | null
  image_url: string
  caption?: string | null
  sort_order: number
  is_primary: boolean
  created_at: string
}

export interface ProductOptionGroup {
  id: string
  product_id: string
  name: string
  display_type: string
  sort_order: number
  is_required: boolean
  created_at: string
  updated_at: string
}

export interface ProductOptionValue {
  id: string
  group_id: string
  value: string
  sort_order: number
  image_url?: string | null
  is_active: boolean
  created_at: string
}

export interface VariantOptionValue {
  id: string
  variant_id: string
  option_value_id: string
}

export interface PriceHistory {
  id: string
  product_id?: string | null
  variant_id?: string | null
  old_price: number
  new_price: number
  changed_by?: string | null
  reason?: string | null
  created_at: string
}

export interface StoreProductDetail {
  id: string
  name: string
  description: string | null
  online_description: string | null
  category: string | null
  image_url: string | null
  online_sort_order: number
  variants: ProductVariant[]
  addons: ProductAddon[]
  gallery: ProductGallery[]
  min_price: number  // cheapest variant price for "Mulai dari RpX"
}

export interface CartVariantPick {
  variant_id: string
  variant_name: string
  variant_price: number
}

export interface CartAddonPick {
  addon_id: string
  name: string
  price: number
}

export interface ConfigurableCartItem {
  product_id: string
  product_name: string
  product_image: string | null
  variant: CartVariantPick
  addons: CartAddonPick[]
  quantity: number
  unit_price: number   // variant_price + addons sum
  subtotal: number     // unit_price * qty
}