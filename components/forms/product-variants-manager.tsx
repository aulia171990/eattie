'use client'

import { useState, useEffect, useActionState } from 'react'
import {
  createVariant, updateVariant, deleteVariant,
  createAddon, updateAddon, deleteAddon,
  type ProductVariantRow, type ProductAddonRow,
} from '@/actions/product-variants'
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'

type ActionState = { success?: boolean; error?: string }

interface Props {
  productId: string
  initialVariants: ProductVariantRow[]
  initialAddons: ProductAddonRow[]
}

export function ProductVariantsManager({ productId, initialVariants, initialAddons }: Props) {
  const [variants, setVariants] = useState(initialVariants)
  const [addons, setAddons] = useState(initialAddons)

  return (
    <div className="space-y-6">
      <VariantSection productId={productId} variants={variants} onChange={setVariants} />
      <AddonSection productId={productId} addons={addons} onChange={setAddons} />
    </div>
  )
}

/* ─────────────────────────── VARIANTS ─────────────────────────── */

function VariantSection({
  productId, variants, onChange,
}: { productId: string; variants: ProductVariantRow[]; onChange: (v: ProductVariantRow[]) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Varian Produk</h3>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-muted))' }}>
            1 varian = 1 kombinasi lengkap yang bisa dijual (misal &quot;Mini 10cm Original&quot;)
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'hsl(var(--primary))' }}>
            <Plus size={13} /> Tambah Varian
          </button>
        )}
      </div>

      {showForm && (
        <VariantFormRow productId={productId} onDone={(v) => { onChange([...variants, v]); setShowForm(false) }} onCancel={() => setShowForm(false)} />
      )}

      {variants.length === 0 && !showForm ? (
        <p className="text-xs text-center py-6" style={{ color: 'hsl(var(--text-muted))' }}>
          Belum ada varian. Produk ini akan dijual dengan 1 harga tunggal seperti biasa.
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map(v => editingId === v.id ? (
            <VariantFormRow
              key={v.id}
              productId={productId}
              variant={v}
              onDone={(updated) => { onChange(variants.map(x => x.id === updated.id ? updated : x)); setEditingId(null) }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={v.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border"
              style={{ borderColor: 'hsl(var(--border))', opacity: v.is_active ? 1 : 0.5 }}>
              <div>
                <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{v.name}</span>
                {!v.is_active && <span className="ml-2 text-xs" style={{ color: 'hsl(var(--danger))' }}>(nonaktif)</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>{formatCurrency(v.price)}</span>
                <button onClick={() => setEditingId(v.id)} style={{ color: 'hsl(var(--text-muted))' }}>
                  <Pencil size={14} />
                </button>
                <DeleteVariantButton variantId={v.id} productId={productId}
                  onDeleted={() => onChange(variants.filter(x => x.id !== v.id))} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VariantFormRow({
  productId, variant, onDone, onCancel,
}: { productId: string; variant?: ProductVariantRow; onDone: (v: ProductVariantRow) => void; onCancel: () => void }) {
  const action = async (state: ActionState, formData: FormData) => {
    if (variant) return updateVariant(variant.id, productId, state, formData)
    return createVariant(productId, state, formData)
  }
  const [state, formAction, isPending] = useActionState(action, { success: false })
  const [name, setName] = useState(variant?.name ?? '')
  const [price, setPrice] = useState(variant?.price?.toString() ?? '')
  const [isActive, setIsActive] = useState(variant?.is_active ?? true)

  useEffect(() => {
    if (state?.success && name && price) {
      onDone({
        id: variant?.id ?? crypto.randomUUID(), // fallback sementara — akan konsisten setelah revalidate
        product_id: productId,
        name,
        price: Number(price),
        sort_order: variant?.sort_order ?? 0,
        is_active: isActive,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <form action={formAction} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'hsl(var(--surface-raised))' }}>
      <input
        name="name" value={name} onChange={e => setName(e.target.value)}
        placeholder="Nama varian, misal: Mini 10cm Original"
        className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
        style={{ borderColor: 'hsl(var(--border))' }}
        required
      />
      <input
        name="price" type="number" value={price} onChange={e => setPrice(e.target.value)}
        placeholder="Harga"
        className="w-28 px-3 py-2 rounded-lg border text-sm outline-none"
        style={{ borderColor: 'hsl(var(--border))' }}
        required min={0}
      />
      <input type="hidden" name="sort_order" value={variant?.sort_order ?? 0} />
      {variant && <input type="hidden" name="is_active" value={String(isActive)} />}
      {variant && (
        <button type="button" onClick={() => setIsActive(v => !v)}
          className="text-xs px-2 py-1 rounded-md font-medium shrink-0"
          style={{
            background: isActive ? 'hsl(var(--success-bg))' : 'hsl(var(--danger-bg))',
            color: isActive ? 'hsl(var(--success))' : 'hsl(var(--danger))',
          }}>
          {isActive ? 'Aktif' : 'Nonaktif'}
        </button>
      )}
      <button type="submit" disabled={isPending}
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'hsl(var(--success))' }}>
        <Check size={14} color="white" />
      </button>
      <button type="button" onClick={onCancel}
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'hsl(var(--border))' }}>
        <X size={14} />
      </button>
      {state?.error && <p className="text-xs w-full" style={{ color: 'hsl(var(--danger))' }}>{state.error}</p>}
    </form>
  )
}

function DeleteVariantButton({ variantId, productId, onDeleted }: { variantId: string; productId: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    const result = await deleteVariant(variantId, productId)
    if (result.error) { setError(result.error); setConfirming(false); return }
    onDeleted()
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button onClick={handleDelete} className="text-xs font-semibold" style={{ color: 'hsl(var(--danger))' }}>Yakin?</button>
        <button onClick={() => setConfirming(false)} className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>Batal</button>
      </span>
    )
  }

  return (
    <>
      <button onClick={() => setConfirming(true)} style={{ color: 'hsl(var(--danger))' }}>
        <Trash2 size={14} />
      </button>
      {error && <span className="text-xs" style={{ color: 'hsl(var(--danger))' }}>{error}</span>}
    </>
  )
}

/* ─────────────────────────── ADDONS ─────────────────────────── */

function AddonSection({
  productId, addons, onChange,
}: { productId: string; addons: ProductAddonRow[]; onChange: (a: ProductAddonRow[]) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: 'hsl(var(--border))' }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>Add-on</h3>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-muted))' }}>
            Tambahan opsional (lilin, kartu ucapan, dll) — bisa dipilih lebih dari satu
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'hsl(var(--primary))' }}>
            <Plus size={13} /> Tambah Add-on
          </button>
        )}
      </div>

      {showForm && (
        <AddonFormRow productId={productId} onDone={(a) => { onChange([...addons, a]); setShowForm(false) }} onCancel={() => setShowForm(false)} />
      )}

      {addons.length === 0 && !showForm ? (
        <p className="text-xs text-center py-6" style={{ color: 'hsl(var(--text-muted))' }}>
          Belum ada add-on untuk produk ini.
        </p>
      ) : (
        <div className="space-y-2">
          {addons.map(a => editingId === a.id ? (
            <AddonFormRow
              key={a.id}
              productId={productId}
              addon={a}
              onDone={(updated) => { onChange(addons.map(x => x.id === updated.id ? updated : x)); setEditingId(null) }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={a.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border"
              style={{ borderColor: 'hsl(var(--border))', opacity: a.is_active ? 1 : 0.5 }}>
              <div>
                <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{a.name}</span>
                {!a.is_active && <span className="ml-2 text-xs" style={{ color: 'hsl(var(--danger))' }}>(nonaktif)</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>+{formatCurrency(a.price)}</span>
                <button onClick={() => setEditingId(a.id)} style={{ color: 'hsl(var(--text-muted))' }}>
                  <Pencil size={14} />
                </button>
                <DeleteAddonButton addonId={a.id} productId={productId}
                  onDeleted={() => onChange(addons.filter(x => x.id !== a.id))} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AddonFormRow({
  productId, addon, onDone, onCancel,
}: { productId: string; addon?: ProductAddonRow; onDone: (a: ProductAddonRow) => void; onCancel: () => void }) {
  const action = addon ? updateAddon.bind(null, addon.id, productId) : createAddon.bind(null, productId)
  const [state, formAction, isPending] = useActionState(action, { success: false })
  const [name, setName] = useState(addon?.name ?? '')
  const [price, setPrice] = useState(addon?.price?.toString() ?? '')
  const [isActive, setIsActive] = useState(addon?.is_active ?? true)

  useEffect(() => {
    if (state?.success && name && price) {
      onDone({
        id: addon?.id ?? crypto.randomUUID(),
        product_id: productId,
        name,
        price: Number(price),
        sort_order: addon?.sort_order ?? 0,
        is_active: isActive,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <form action={formAction} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'hsl(var(--surface-raised))' }}>
      <input
        name="name" value={name} onChange={e => setName(e.target.value)}
        placeholder="Nama add-on, misal: Lilin Angka"
        className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
        style={{ borderColor: 'hsl(var(--border))' }}
        required
      />
      <input
        name="price" type="number" value={price} onChange={e => setPrice(e.target.value)}
        placeholder="Harga tambahan"
        className="w-28 px-3 py-2 rounded-lg border text-sm outline-none"
        style={{ borderColor: 'hsl(var(--border))' }}
        required min={0}
      />
      <input type="hidden" name="sort_order" value={addon?.sort_order ?? 0} />
      {addon && <input type="hidden" name="is_active" value={String(isActive)} />}
      {addon && (
        <button type="button" onClick={() => setIsActive(v => !v)}
          className="text-xs px-2 py-1 rounded-md font-medium shrink-0"
          style={{
            background: isActive ? 'hsl(var(--success-bg))' : 'hsl(var(--danger-bg))',
            color: isActive ? 'hsl(var(--success))' : 'hsl(var(--danger))',
          }}>
          {isActive ? 'Aktif' : 'Nonaktif'}
        </button>
      )}
      <button type="submit" disabled={isPending}
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'hsl(var(--success))' }}>
        <Check size={14} color="white" />
      </button>
      <button type="button" onClick={onCancel}
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'hsl(var(--border))' }}>
        <X size={14} />
      </button>
      {state?.error && <p className="text-xs w-full" style={{ color: 'hsl(var(--danger))' }}>{state.error}</p>}
    </form>
  )
}

function DeleteAddonButton({ addonId, productId, onDeleted }: { addonId: string; productId: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    const result = await deleteAddon(addonId, productId)
    if (result.error) { setError(result.error); setConfirming(false); return }
    onDeleted()
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button onClick={handleDelete} className="text-xs font-semibold" style={{ color: 'hsl(var(--danger))' }}>Yakin?</button>
        <button onClick={() => setConfirming(false)} className="text-xs" style={{ color: 'hsl(var(--text-muted))' }}>Batal</button>
      </span>
    )
  }

  return (
    <>
      <button onClick={() => setConfirming(true)} style={{ color: 'hsl(var(--danger))' }}>
        <Trash2 size={14} />
      </button>
      {error && <span className="text-xs" style={{ color: 'hsl(var(--danger))' }}>{error}</span>}
    </>
  )
}
