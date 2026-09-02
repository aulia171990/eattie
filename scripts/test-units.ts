import { convertBaseUnit, toIngredientBaseUnit } from '../lib/units'

let pass = 0
let fail = 0
function eq(actual: unknown, expected: unknown, msg: string) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    pass++
    console.log(`  ok  ${msg}`)
  } else {
    fail++
    console.log(`FAIL  ${msg}  → got ${a}, expected ${e}`)
  }
}

// mass
eq(convertBaseUnit(500, 'g', 'kg'), 0.5, '500 g -> kg')
eq(convertBaseUnit(2, 'kg', 'g'), 2000, '2 kg -> g')
eq(convertBaseUnit(1, 'kg', 'kg'), 1, 'same unit passthrough')
// volume
eq(convertBaseUnit(2, 'liter', 'ml'), 2000, '2 liter -> ml')
eq(convertBaseUnit(250, 'ml', 'liter'), 0.25, '250 ml -> liter')
// incompatible dimensions
eq(convertBaseUnit(1, 'kg', 'pcs'), null, 'kg -> pcs incompatible')
eq(convertBaseUnit(1, 'kg', 'liter'), null, 'kg -> liter incompatible')
// discrete exact match
eq(convertBaseUnit(3, 'pcs', 'pcs'), 3, 'pcs -> pcs passthrough')
eq(convertBaseUnit(3, 'pcs', 'sachet'), null, 'pcs -> sachet incompatible')
// unknown unit
eq(convertBaseUnit(1, 'karung', 'kg'), null, 'free-text unit unkonwn')

// toIngredientBaseUnit wrapper
eq(toIngredientBaseUnit(500, 'g', 'kg'), 0.5, 'recipe 500g, base kg')
eq(toIngredientBaseUnit(500, 'kg', 'g'), 500000, 'recipe 500kg, base g')

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
