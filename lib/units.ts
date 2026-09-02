/**
 * Unit conversion helpers for eattie.
 *
 * Two kinds of units exist in the system:
 *   1. Purchase units (free-text, e.g. "karung", "dus") → base unit via
 *      ingredients.conversion_rate  (1 purchase_unit = conversion_rate base_unit).
 *   2. Base units (kg, g, liter, ml, pcs, ...) which may appear in recipes with a
 *      unit DIFFERENT from the ingredient's base_unit. These are convertible via a
 *      fixed factor table (mass: kg<->g, volume: liter<->ml).
 *
 * The functions here handle case (2): converting a recipe quantity expressed in
 * some base unit into the ingredient's base_unit, so stock deduction and cost
 * accounting are always expressed in the ingredient's own base_unit.
 */

// Conversion factors to a common canonical base per dimension.
// mass: canonical = gram (g). volume: canonical = milliliter (ml).
const MASS_TO_GRAM: Record<string, number> = {
  kg: 1000,
  g: 1,
}
const VOLUME_TO_ML: Record<string, number> = {
  liter: 1000,
  ml: 1,
}

export type Dimension = 'mass' | 'volume' | 'discrete' | 'other'

/**
 * Classify a base unit into a convertible dimension.
 * Discrete units (pcs, sachet, lembar, botol) are only convertible if they match
 * exactly — same unit means factor 1, different discrete units are incompatible.
 */
export function getDimension(unit: string): Dimension {
  const u = (unit || '').toLowerCase().trim()
  if (u in MASS_TO_GRAM) return 'mass'
  if (u in VOLUME_TO_ML) return 'volume'
  if (['pcs', 'sachet', 'lembar', 'botol', 'butir', 'buah'].includes(u)) return 'discrete'
  return 'other'
}

/**
 * Convert a quantity expressed in `fromUnit` into the equivalent amount in
 * `toUnit`, when both belong to the same convertible dimension.
 *
 * Returns null when:
 *   - either unit is unknown, or
 *   - the units belong to different dimensions (truly incompatible, e.g. kg ↔ pcs).
 *
 * Examples:
 *   convertBaseUnit(500, 'g',    'kg')  -> 0.5
 *   convertBaseUnit(2,   'liter','ml')  -> 2000
 *   convertBaseUnit(3,   'pcs',  'pcs') -> 3
 *   convertBaseUnit(1,   'kg',   'pcs') -> null  (incompatible)
 */
export function convertBaseUnit(qty: number, fromUnit: string, toUnit: string): number | null {
  if (qty == null || isNaN(qty)) return null
  const from = (fromUnit || '').toLowerCase().trim()
  const to = (toUnit || '').toLowerCase().trim()
  if (!from || !to) return null
  if (from === to) return qty

  const dim = getDimension(from)
  if (dim === 'other' || getDimension(to) !== dim) return null
  if (dim === 'discrete') return null // exact-match handled above; otherwise incompatible

  if (dim === 'mass') {
    const grams = qty * (MASS_TO_GRAM[from] ?? 0)
    return grams / (MASS_TO_GRAM[to] ?? 1)
  }
  if (dim === 'volume') {
    const ml = qty * (VOLUME_TO_ML[from] ?? 0)
    return ml / (VOLUME_TO_ML[to] ?? 1)
  }
  return null
}

/**
 * Convert a recipe ingredient quantity into the ingredient's base_unit.
 *
 * - If the recipe unit equals the ingredient base_unit → unchanged.
 * - If convertible (same dimension) → scaled value in base_unit.
 * - If incompatible (different dimension, e.g. resep "g" tapi base "pcs",
 *   or unit "karung"/free-text) → returns null so the caller can surface a
 *   clear validation error instead of silently deducting the wrong amount.
 */
export function toIngredientBaseUnit(
  qty: number,
  recipeUnit: string,
  baseUnit: string
): number | null {
  return convertBaseUnit(qty, recipeUnit, baseUnit)
}
