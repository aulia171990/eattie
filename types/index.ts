import type { Tables } from './database'

// ─── Row types from database ──────────────────────────────────────────────────
export type Profile              = Tables<'profiles'>
export type IngredientCategory   = Tables<'ingredient_categories'>
export type Supplier             = Tables<'suppliers'>
export type Ingredient           = Tables<'ingredients'>
export type StockPurchase        = Tables<'stock_purchases'>
export type StockPurchaseItem    = Tables<'stock_purchase_items'>
export type StockMovement        = Tables<'stock_movements'>
export type StockOpname          = Tables<'stock_opnames'>
export type StockOpnameItem      = Tables<'stock_opname_items'>
export type Product              = Tables<'products'>
export type Recipe               = Tables<'recipes'>
export type RecipeIngredient     = Tables<'recipe_ingredients'>
export type ProductionBatch      = Tables<'production_batches'>
export type ProductInventory     = Tables<'product_inventory'>
export type Sale                 = Tables<'sales'>
export type SaleItem             = Tables<'sale_items'>
export type Expense              = Tables<'expenses'>

// ─── Joined / extended types ──────────────────────────────────────────────────

export interface IngredientWithRelations extends Ingredient {
  ingredient_categories: IngredientCategory | null
  suppliers: Supplier | null
}

export interface StockMovementWithRelations extends StockMovement {
  ingredients: Pick<Ingredient, 'name' | 'base_unit'> | null
  profiles: Pick<Profile, 'full_name'> | null
}

export interface StockPurchaseItemWithIngredient extends StockPurchaseItem {
  ingredients: Pick<Ingredient, 'name' | 'base_unit'> | null
}

export interface StockPurchaseWithRelations extends StockPurchase {
  suppliers: Pick<Supplier, 'name'> | null
  stock_purchase_items: StockPurchaseItemWithIngredient[]
}

export interface StockOpnameItemWithIngredient extends StockOpnameItem {
  ingredients: Pick<Ingredient, 'id' | 'name' | 'base_unit'> | null
}

export interface StockOpnameWithRelations extends StockOpname {
  profiles: Pick<Profile, 'full_name'> | null
  stock_opname_items: StockOpnameItemWithIngredient[]
}

export interface RecipeIngredientWithIngredient extends RecipeIngredient {
  ingredients: Pick<Ingredient, 'id' | 'name' | 'base_unit' | 'price_per_unit'> | null
}

export interface RecipeWithRelations extends Recipe {
  products: Product | null
  recipe_ingredients: RecipeIngredientWithIngredient[]
}

export interface ProductionBatchWithRelations extends ProductionBatch {
  products: Pick<Product, 'name' | 'category' | 'selling_price'> | null
  profiles: Pick<Profile, 'full_name'> | null
}

export interface SaleItemWithProduct extends SaleItem {
  products: Pick<Product, 'name' | 'category'> | null
}

export interface SaleWithRelations extends Sale {
  profiles: Pick<Profile, 'full_name'> | null
  sale_items: SaleItemWithProduct[]
}

// ─── POS cart ─────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product
  quantity: number
  subtotal: number
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface IngredientFilters {
  search?: string
  categoryId?: string
  isActive?: boolean
  lowStock?: boolean
}

export interface SaleFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
  status?: string
}

export interface ProductionFilters {
  status?: string
  dateFrom?: string
  dateTo?: string
}

// ─── Action return types ──────────────────────────────────────────────────────

export type ActionState = { error: string } | { success: true } | null
