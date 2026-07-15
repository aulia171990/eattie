'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { PRODUCT_CATEGORIES } from '@/lib/constants'
import { LayoutGrid, List, ArrowUpDown } from 'lucide-react'
import type { Product } from '@/types'

type ProductCardType = Product & { current_stock: number; min_stock: number }

type SortKey = 'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'
type ViewMode = 'tile' | 'list'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Nama (A-Z)' },
  { value: 'price_asc', label: 'Harga Terendah' },
  { value: 'price_desc', label: 'Harga Tertinggi' },
  { value: 'stock_asc', label: 'Stok Tersedikit' },
  { value: 'stock_desc', label: 'Stok Terbanyak' },
]

function sortProducts(products: ProductCardType[], sortKey: SortKey): ProductCardType[] {
  const sorted = [...products]
  switch (sortKey) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'price_asc':
      return sorted.sort((a, b) => a.selling_price - b.selling_price)
    case 'price_desc':
      return sorted.sort((a, b) => b.selling_price - a.selling_price)
    case 'stock_asc':
      return sorted.sort((a, b) => a.current_stock - b.current_stock)
    case 'stock_desc':
      return sorted.sort((a, b) => b.current_stock - a.current_stock)
    default:
      return sorted
  }
}

export function ProductListControls({ products }: { products: ProductCardType[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>('tile')
  const [sortKey, setSortKey] = useState<SortKey>('name')

  const sorted = useMemo(() => sortProducts(products, sortKey), [products, sortKey])

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} style={{ color: 'hsl(var(--text-muted))' }} />
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="text-sm px-3 py-1.5 rounded-lg border outline-none"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
          <button
            onClick={() => setViewMode('tile')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: viewMode === 'tile' ? 'hsl(var(--primary))' : 'white',
              color: viewMode === 'tile' ? 'white' : 'hsl(var(--text-secondary))',
            }}
          >
            <LayoutGrid size={14} /> Tile
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l"
            style={{
              background: viewMode === 'list' ? 'hsl(var(--primary))' : 'white',
              color: viewMode === 'list' ? 'white' : 'hsl(var(--text-secondary))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            <List size={14} /> List
          </button>
        </div>
      </div>

      {/* Product display */}
      {viewMode === 'tile' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map(p => <ProductTile key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
          {sorted.map((p, idx) => (
            <ProductListRow key={p.id} product={p} isLast={idx === sorted.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductTile({ product }: { product: ProductCardType }) {
  const p = product
  const margin = p.cost_price > 0 ? ((p.selling_price - p.cost_price) / p.selling_price * 100) : null
  const emoji = PRODUCT_CATEGORIES.find(c => c.value === p.category)?.emoji ?? '🧁'

  return (
    <div className="bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-all" style={{ borderColor: 'hsl(var(--border))' }}>
      <div className="relative w-full h-36" style={{ background: 'hsl(var(--text-muted))' }}>
        {p.image_url ? (
          <Image src={p.image_url} alt={p.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">{emoji}</div>
        )}
        <Link
          href={`/dashboard/products/${p.id}/edit`}
          className="absolute top-2 right-2 text-xs px-2 py-1 rounded-md font-medium backdrop-blur-sm"
          style={{ background: 'rgba(255,255,255,0.9)', color: 'hsl(var(--primary))' }}
        >
          Edit
        </Link>
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm leading-tight" style={{ color: 'hsl(var(--foreground))' }}>{p.name}</h3>
        {p.name_en && <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-muted))' }}>{p.name_en}</p>}
        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
          <p className="text-base font-bold" style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(p.selling_price)}</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>HPP: {formatCurrency(p.cost_price)}</p>
            {margin !== null && <span className="text-xs font-medium" style={{ color: 'hsl(var(--success))' }}>~{margin.toFixed(0)}%</span>}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>Stok</p>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: p.current_stock <= 0 ? 'hsl(var(--danger-bg))' : p.current_stock <= p.min_stock ? 'hsl(var(--primary-subtle))' : 'hsl(var(--success-bg))',
                color: p.current_stock <= 0 ? 'hsl(var(--danger))' : p.current_stock <= p.min_stock ? 'hsl(var(--primary-hover))' : 'hsl(var(--success))',
              }}
            >
              {p.current_stock <= 0 ? 'Habis' : `${p.current_stock} pcs`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductListRow({ product, isLast }: { product: ProductCardType; isLast: boolean }) {
  const p = product
  const margin = p.cost_price > 0 ? ((p.selling_price - p.cost_price) / p.selling_price * 100) : null
  const emoji = PRODUCT_CATEGORIES.find(c => c.value === p.category)?.emoji ?? '🧁'

  return (
    <div
      className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
      style={!isLast ? { borderBottom: '1px solid hsl(var(--border))' } : undefined}
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: 'hsl(var(--text-muted))' }}>
        {p.image_url ? (
          <Image src={p.image_url} alt={p.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">{emoji}</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm truncate" style={{ color: 'hsl(var(--foreground))' }}>{p.name}</h3>
        <p className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
          HPP: {formatCurrency(p.cost_price)}
          {margin !== null && <span style={{ color: 'hsl(var(--success))' }}> · ~{margin.toFixed(0)}%</span>}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(p.selling_price)}</p>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-0.5"
          style={{
            background: p.current_stock <= 0 ? 'hsl(var(--danger-bg))' : p.current_stock <= p.min_stock ? 'hsl(var(--primary-subtle))' : 'hsl(var(--success-bg))',
            color: p.current_stock <= 0 ? 'hsl(var(--danger))' : p.current_stock <= p.min_stock ? 'hsl(var(--primary-hover))' : 'hsl(var(--success))',
          }}
        >
          {p.current_stock <= 0 ? 'Habis' : `${p.current_stock} pcs`}
        </span>
      </div>

      <Link
        href={`/dashboard/products/${p.id}/edit`}
        className="text-xs px-3 py-1.5 rounded-md font-medium shrink-0"
        style={{ background: 'hsl(var(--primary-subtle))', color: 'hsl(var(--primary))' }}
      >
        Edit
      </Link>
    </div>
  )
}
