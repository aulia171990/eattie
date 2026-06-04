// App info
export const APP_NAME = 'Bakery Management'
export const APP_VERSION = '1.0.0'

// Roles
export const ROLES = {
  OWNER: 'owner',
  CASHIER: 'cashier',
  BAKER: 'baker',
} as const

// Role labels
export const ROLE_LABELS = {
  id: {
    owner: 'Pemilik',
    cashier: 'Kasir',
    baker: 'Baker',
  },
  en: {
    owner: 'Owner',
    cashier: 'Cashier',
    baker: 'Baker',
  },
}

// Stock movement types
export const STOCK_MOVEMENT_TYPES = {
  PURCHASE_IN: 'purchase_in',
  PRODUCTION_OUT: 'production_out',
  ADJUSTMENT_IN: 'adjustment_in',
  ADJUSTMENT_OUT: 'adjustment_out',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  RETURN_OUT: 'return_out',
  WASTE: 'waste',
} as const

// Payment methods
export const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'qris'] as const

// Product categories
export const PRODUCT_CATEGORIES = [
  { value: 'bread', label: 'Roti', labelEn: 'Bread', emoji: '🍞' },
  { value: 'cake', label: 'Kue', labelEn: 'Cake', emoji: '🎂' },
  { value: 'pastry', label: 'Pastri', labelEn: 'Pastry', emoji: '🥐' },
  { value: 'cookies', label: 'Kue Kering', labelEn: 'Cookies', emoji: '🍪' },
  { value: 'other', label: 'Lainnya', labelEn: 'Other', emoji: '🧁' },
]

// Expense categories
export const EXPENSE_CATEGORIES = [
  { value: 'ingredients', label: 'Bahan Baku', labelEn: 'Ingredients' },
  { value: 'utilities', label: 'Utilitas', labelEn: 'Utilities' },
  { value: 'salary', label: 'Gaji', labelEn: 'Salary' },
  { value: 'rent', label: 'Sewa', labelEn: 'Rent' },
  { value: 'equipment', label: 'Peralatan', labelEn: 'Equipment' },
  { value: 'other', label: 'Lainnya', labelEn: 'Other' },
]

// Units for ingredients
export const BASE_UNITS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'pcs', label: 'Pcs / Butir' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'lembar', label: 'Lembar' },
  { value: 'botol', label: 'Botol' },
]

// Production status
export const PRODUCTION_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

// Purchase status
export const PURCHASE_STATUS = {
  DRAFT: 'draft',
  ORDERED: 'ordered',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
} as const

// Date formats
export const DATE_FORMAT = 'dd MMM yyyy'
export const DATETIME_FORMAT = 'dd MMM yyyy, HH:mm'
export const DATE_INPUT_FORMAT = 'yyyy-MM-dd'

// Pagination
export const DEFAULT_PAGE_SIZE = 20

// Low stock threshold (% below min_stock triggers warning)
export const LOW_STOCK_WARNING_PERCENT = 0.2

// Expiry warning days
export const EXPIRY_WARNING_DAYS = 7

// POS
export const POS_GRID_COLUMNS = 4
export const MAX_CART_ITEMS = 50

// Number prefix generators
export const generatePrefix = {
  invoice: () => 'INV',
  purchase: () => 'PO',
  batch: () => 'PRD',
  opname: () => 'OPN',
}
