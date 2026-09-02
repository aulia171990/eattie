# Product Configurator Architecture

## Overview

Replace flat product model with option-group architecture (Shopify/Medusa pattern).

## Core Entities

```
products
  └── product_categories (normalized)
  └── product_gallery (multiple images)
  └── product_tags (filtering)
  └── product_option_groups
  │     └── product_option_values
  └── product_variants (SKUs with price)
  │     └── variant_option_values (junction)
  └── product_addons (optional extras)
  └── price_history (audit trail)
```

## How Options + Variants Work

**Option Groups** define what choices a product has:
- Burnt Cheesecake → groups: "Size", "Topping"
- Donut → groups: "Box Size"  
- Tiramisu → groups: "Type" (Cake/Dessert Box)

**Option Values** are the actual selectable values within a group:
- "Size" → "10 cm", "16 cm", "20 cm"
- "Topping" → "Original", "Lotus", "Strawberry Jam"

**Variants** are priceable SKUs. Each variant selects one value from each group via `variant_option_values`.

**Pricing**: Each variant has its own price (base price + adjustments rolled into variant price). Option groups are NOT priced individually — the variant price is the final price.

**Add-ons**: Always optional, always extra cost. Priced per-unit on the addon itself.

## Product Types Based on Configuration

| Product | Option Groups | Add-ons |
|---------|--------------|---------|
| Burnt Cheesecake | Size, Topping | Candle, Board, Topper, Knife |
| Strawberry Cheesecake | Size | Candle, Board, Topper |
| Fruit Cake | Size | Candle, Board |
| Choco Strawberry | Size | Candle, Board |
| Tiramisu | Type (Cake 16cm / Dessert Box) | Candle |
| Chocosaurus | Type (20x20 / 20x10 / Dessert Box) | Candle |
| Donut | Box Size (6 pcs / 12 pcs) | None |

## Cart + Order

Cart item stores:
- product_id
- variant_id (which SKU was picked)
- addon_ids[] (which add-ons were added)
- quantity
- unit_price (variant price + addon prices)
- subtotal
- custom_text (optional, for cakes)

Order item stores SNAPSHOT:
- product_name, variant_name, unit_price (snapshot — survives price changes)
- addon_detail JSONB (snapshot of add-on names + prices)
- custom_text (if any)

## Data Flow

```
Admin creates:
1. Product → 2. Option Groups → 3. Option Values → 4. Variants → 5. Add-ons

Customer:
1. Clicks product → 2. Sees option selectors → 3. Picks values → 4. Live price updates → 5. Chooses add-ons → 6. Adds to cart

Checkout:
1. Cart item → 2. Order item (with snapshot) → 3. Price locked
```

## Legacy Compatibility

Existing `products.selling_price` stays for non-configurable products.
Existing `product_variants` table is repurposed (now references option values).
Existing `product_addons` stays identical.
Existing `order_items.variant_id`, `variant_name`, `addon_ids`, `addon_detail` columns already added. 

Results:
- No existing table renamed or dropped
- No migration needed for order data
- New tables are additive
