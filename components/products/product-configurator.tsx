'use client'

import { useState, useEffect } from 'react'
import {
  getProductOptionGroups, saveOptionGroup, removeOptionGroup,
  getProductVariantsWithOptions, saveVariantWithOptions, removeVariantAction,
  updateVariantStockAction,
  getProductAddonsAction, saveProductAddons,
  getProductCategories,
  getProductGallery, addGalleryImage, removeGalleryImage,
} from '@/actions/products'
import type { ProductCategory } from '@/types/product-config'
import type { OptionGroupWithValues, VariantWithOptionIds, GalleryImage } from '@/actions/products'
import { Plus, X, Save, Trash2, ImageIcon } from 'lucide-react'

interface Props {
  productId: string
}

export function ProductConfigurator({ productId }: Props) {
  const [tab, setTab] = useState<'options' | 'variants' | 'addons' | 'gallery'>('options')
  const [groups, setGroups] = useState<OptionGroupWithValues[]>([])
  const [variants, setVariants] = useState<VariantWithOptionIds[]>([])
  const [addons, setAddons] = useState<{ name: string; price: number }[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  // New gallery image form
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImageVariant, setNewImageVariant] = useState('')

  // New group form
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupValues, setNewGroupValues] = useState('')

  // New variant form
  const [newVariantName, setNewVariantName] = useState('')
  const [newVariantPrice, setNewVariantPrice] = useState(0)
  const [newVariantStock, setNewVariantStock] = useState(0)
  const [newVariantValues, setNewVariantValues] = useState<string[]>([])

  const load = async () => {
    const [g, v, a, c, gal] = await Promise.all([
      getProductOptionGroups(productId),
      getProductVariantsWithOptions(productId),
      getProductAddonsAction(productId),
      getProductCategories(),
      getProductGallery(productId),
    ])
    setGroups(g)
    setVariants(v)
    setAddons(a.map(x => ({ name: x.name, price: x.price })))
    setCategories(c)
    setGallery(gal)
  }

  useEffect(() => { load() }, [productId])

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return
    setSaving(true)
    const values = newGroupValues.split(',').map(s => s.trim()).filter(Boolean).map((v, i) => ({ value: v, sort_order: i }))
    const r = await saveOptionGroup(productId, { name: newGroupName.trim(), values })
    if (r.error) { setMsg(r.error) } else {
      setNewGroupName(''); setNewGroupValues('')
    }
    await load()
    setSaving(false)
  }

  const handleRemoveGroup = async (id: string) => {
    await removeOptionGroup(id)
    await load()
  }

  const handleAddVariant = async () => {
    if (!newVariantName.trim()) return
    setSaving(true)
    const r = await saveVariantWithOptions(productId, {
      name: newVariantName.trim(),
      price: newVariantPrice,
      stock: newVariantStock,
      option_value_ids: newVariantValues.filter(Boolean),
    })
    if (r.error) { setMsg(r.error) } else {
      setNewVariantName(''); setNewVariantPrice(0); setNewVariantStock(0); setNewVariantValues([])
    }
    await load()
    setSaving(false)
  }

  const handleUpdateVariantStock = async (id: string, stock: number) => {
    setSaving(true)
    const r = await updateVariantStockAction(id, stock)
    if (r.error) setMsg(r.error)
    await load()
    setSaving(false)
  }

  const handleRemoveVariant = async (id: string) => {
    await removeVariantAction(id)
    await load()
  }

  const handleSaveAddons = async () => {
    setSaving(true); setMsg('')
    const r = await saveProductAddons(productId, addons.map((a, i) => ({ ...a, sort_order: i })))
    if (r.error) setMsg(r.error); else setMsg('Addon tersimpan')
    setSaving(false)
  }

  const handleAddImage = async () => {
    if (!newImageUrl.trim()) return
    setSaving(true); setMsg('')
    const r = await addGalleryImage(productId, {
      image_url: newImageUrl.trim(),
      variant_id: newImageVariant || null,
    })
    if (r.error) setMsg(r.error); else { setNewImageUrl(''); setNewImageVariant('') }
    await load()
    setSaving(false)
  }

  const handleRemoveImage = async (id: string) => {
    await removeGalleryImage(id)
    await load()
  }

  const variantName = (id: string | null) =>
    id ? variants.find(v => v.id === id)?.name ?? '?' : 'Produk'

  const allValues = groups.flatMap(g => g.values)

  return (
    <div className="bg-white rounded-xl border" style={{ borderColor: 'hsl(var(--border))' }}>
      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        {(['options', 'variants', 'addons', 'gallery'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'options' ? 'Opsi' : t === 'variants' ? 'Varian' : t === 'addons' ? 'Tambahan' : 'Galeri'}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">

        {/* ── TAB: OPTIONS ────────────────────────────────── */}
        {tab === 'options' && (
          <>
            <div className="text-xs text-gray-500">Buat grup opsi (contoh: Ukuran, Topping). Setiap grup punya nilai (contoh: 16 cm, Original).</div>

            {/* Existing groups */}
            {groups.map(g => (
              <div key={g.id} className="border rounded-lg p-3 space-y-2" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{g.name}</span>
                  <button onClick={() => handleRemoveGroup(g.id)} className="text-red-500 p-1">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.values.map(v => (
                    <span key={v.id} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                      {v.value}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* New group form */}
            <div className="border rounded-lg p-3 space-y-2" style={{ borderColor: 'hsl(var(--border))' }}>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                placeholder="Nama grup (contoh: Ukuran)" className="w-full px-2 py-1.5 text-sm border rounded-lg outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
              <input value={newGroupValues} onChange={e => setNewGroupValues(e.target.value)}
                placeholder="Nilai, pisahkan koma (contoh: 10 cm, 16 cm, 20 cm)" className="w-full px-2 py-1.5 text-sm border rounded-lg outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
              <button onClick={handleAddGroup} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-60"
                style={{ background: 'hsl(var(--primary))' }}>
                <Plus size={12} /> Tambah Grup
              </button>
            </div>
          </>
        )}

        {/* ── TAB: VARIANTS ──────────────────────────────── */}
        {tab === 'variants' && (
          <>
            <div className="text-xs text-gray-500">Setiap varian adalah kombinasi opsi + harga. Pilih nilai opsi yang sesuai.</div>

            {/* Existing variants */}
            {variants.map(v => (
              <div key={v.id} className="flex items-center justify-between border rounded-lg px-3 py-2" style={{ borderColor: 'hsl(var(--border))' }}>
                <div>
                  <span className="text-sm font-medium">{v.name}</span>
                  <span className="text-xs ml-2" style={{ color: 'hsl(var(--text-muted))' }}>
                    Rp{v.price.toLocaleString('id-ID')}
                  </span>
                  <span className={`text-xs ml-2 px-1.5 py-0.5 rounded-full ${v.stock <= 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {v.stock <= 0 ? 'Habis' : `${v.stock} pcs`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={0}
                    defaultValue={v.stock}
                    key={`${v.id}-${v.stock}`}
                    onBlur={e => {
                      const next = Number(e.target.value)
                      if (!Number.isNaN(next) && next !== v.stock) handleUpdateVariantStock(v.id, next)
                    }}
                    className="w-20 px-2 py-1 text-sm border rounded-lg outline-none text-right"
                    style={{ borderColor: 'hsl(var(--border))' }}
                    title="Stok varian"
                  />
                  <button onClick={() => handleRemoveVariant(v.id)} className="text-red-500 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* New variant form */}
            <div className="border rounded-lg p-3 space-y-2" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="flex gap-2">
                <input value={newVariantName} onChange={e => setNewVariantName(e.target.value)}
                  placeholder="Nama varian" className="flex-1 px-2 py-1.5 text-sm border rounded-lg outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
                <input value={newVariantPrice} onChange={e => setNewVariantPrice(Number(e.target.value))}
                  type="number" min={0} placeholder="Harga" className="w-24 px-2 py-1.5 text-sm border rounded-lg outline-none text-right" style={{ borderColor: 'hsl(var(--border))' }} />
                <input value={newVariantStock} onChange={e => setNewVariantStock(Number(e.target.value))}
                  type="number" min={0} placeholder="Stok" className="w-20 px-2 py-1.5 text-sm border rounded-lg outline-none text-right" style={{ borderColor: 'hsl(var(--border))' }} />
              </div>
              {/* Multi-select for option values */}
              {allValues.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {allValues.map(ov => (
                    <button key={ov.id}
                      onClick={() => setNewVariantValues(prev =>
                        prev.includes(ov.id) ? prev.filter(x => x !== ov.id) : [...prev, ov.id]
                      )}
                      className={`px-2 py-0.5 text-xs rounded-full border ${
                        newVariantValues.includes(ov.id) ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}>
                      {ov.value}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={handleAddVariant} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-60"
                style={{ background: 'hsl(var(--primary))' }}>
                <Plus size={12} /> Tambah Varian
              </button>
            </div>
          </>
        )}

        {/* ── TAB: ADDONS ────────────────────────────────── */}
        {tab === 'addons' && (
          <>
            <div className="text-xs text-gray-500">Add-on opsional yang bisa ditambahkan pelanggan (contoh: Lilin, Papan Ulang Tahun).</div>
            {addons.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={a.name} onChange={e => { const x = [...addons]; x[i].name = e.target.value; setAddons(x) }}
                  placeholder="Nama add-on" className="flex-1 px-2 py-1.5 text-sm border rounded-lg outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
                <input value={a.price} type="number" min={0} onChange={e => { const x = [...addons]; x[i].price = Number(e.target.value); setAddons(x) }}
                  placeholder="Harga" className="w-24 px-2 py-1.5 text-sm border rounded-lg outline-none text-right" style={{ borderColor: 'hsl(var(--border))' }} />
                <button onClick={() => setAddons(addons.filter((_, j) => j !== i))} className="text-red-500 p-1">
                  <X size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => setAddons([...addons, { name: '', price: 0 }])}
              className="flex items-center gap-1 text-xs font-medium" style={{ color: 'hsl(var(--primary))' }}>
              <Plus size={12} /> Tambah Add-on
            </button>
            <button onClick={handleSaveAddons} disabled={saving}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60"
              style={{ background: 'hsl(var(--primary))' }}>
              <Save size={14} /> Simpan Add-on
            </button>
          </>
        )}

        {/* ── TAB: GALLERY ───────────────────────────────── */}
        {tab === 'gallery' && (
          <>
            <div className="text-xs text-gray-500 mb-2">Upload multiple images per product or variant for carousel in storefront.</div>
            <div className="space-y-2">
              {gallery.map(g => (
                <div key={g.id} className="flex items-center gap-2 border rounded-lg p-2">
                  <img src={g.image_url} alt="Gallery" className="w-12 h-12 object-cover rounded" />
                  <span className="text-xs text-gray-600 flex-1 truncate">{g.image_url}</span>
                  {g.variant_id && (
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">Varian</span>
                  )}
                  <button onClick={() => handleRemoveImage(g.id)} className="text-red-500 p-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="border rounded-lg p-3 space-y-2 mt-4">
              <input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                placeholder="Gambar URL" className="w-full px-2 py-1.5 text-sm border rounded-lg outline-none" style={{ borderColor: 'hsl(var(--border))' }} />
              <select value={newImageVariant} onChange={e => setNewImageVariant(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded-lg outline-none" style={{ borderColor: 'hsl(var(--border))' }}>
                <option value="">Semua Produk</option>
                {variants.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <button onClick={handleAddImage} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-60"
                style={{ background: 'hsl(var(--primary))' }}>
                <ImageIcon size={12} /> Tambah Gambar
              </button>
            </div>
          </>
        )}

        {msg && <p className={`text-xs ${msg.includes('error') ? 'text-red-500' : 'text-green-600'}`}>{msg}</p>}
      </div>
    </div>
  )
}
