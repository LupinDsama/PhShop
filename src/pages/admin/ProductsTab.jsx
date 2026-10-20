import { useState, useEffect, useCallback } from 'react'
import api from '../../lib/api'
import { formatPrice } from '../../lib/format'
import { Package, Plus, Pencil, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States'

const EMPTY_FORM = {
  id: null,
  name: '',
  slug: '',
  category: 'figure',
  description: '',
  basePrice: 100000,
  images: '',
  status: 'active',
  productionDays: 5,
  featured: false,
  variants: [{ sku: '', color: '', size: '10cm', price: 100000, stock: 10, minQty: 1, maxQty: 10, status: 'active' }],
}

export default function ProductsTab() {
  const [data, setData] = useState({ products: [], total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: '1', limit: '20' })
      if (search.trim()) params.set('q', search.trim())
      const result = await api.get(`/api/admin/products?${params.toString()}`)
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  const openCreate = () => {
    setEditing('new')
    setForm(EMPTY_FORM)
    setMessage(null)
  }

  const openEdit = (product) => {
    setEditing(product.id)
    setMessage(null)
    setForm({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      description: product.description,
      basePrice: product.basePrice,
      images: (product.images || []).join('\n'),
      status: product.status,
      productionDays: product.productionDays,
      featured: product.featured,
      variants: product.variants.map((v) => ({
        id: v.id, sku: v.sku, color: v.color, size: v.size, price: v.price,
        stock: v.stock, minQty: v.minQty, maxQty: v.maxQty, status: v.status,
      })),
    })
  }

  const updateVariant = (index, key, value) => {
    setForm((f) => {
      const variants = [...f.variants]
      variants[index] = { ...variants[index], [key]: value }
      return { ...f, variants }
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        category: form.category.trim(),
        description: form.description,
        basePrice: Number(form.basePrice),
        images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
        status: form.status,
        productionDays: Number(form.productionDays),
        featured: form.featured,
        variants: form.variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          sku: v.sku.trim(),
          color: v.color.trim(),
          size: v.size.trim(),
          price: Number(v.price),
          stock: Number(v.stock),
          minQty: Number(v.minQty),
          maxQty: Number(v.maxQty),
          status: v.status,
        })),
      }
      if (editing === 'new') {
        await api.post('/api/admin/products', payload)
      } else {
        await api.patch(`/api/admin/products/${editing}`, payload)
      }
      setEditing(null)
      setMessage({ type: 'success', text: 'Lưu sản phẩm thành công.' })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`Xoá sản phẩm "${product.name}"?`)) return
    setMessage(null)
    try {
      const result = await api.delete(`/api/admin/products/${product.id}`)
      setMessage({
        type: 'success',
        text: result.discontinued
          ? 'Sản phẩm đã có đơn hàng nên được chuyển sang trạng thái ngừng bán thay vì xoá.'
          : 'Đã xoá sản phẩm.',
      })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h3 className="font-bold text-dark-900">Quản lý sản phẩm ({data.total})</h3>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tìm sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
            aria-label="Tìm sản phẩm"
          />
          <Button onClick={openCreate}><Plus size={16} className="mr-1" /> Thêm sản phẩm</Button>
        </div>
      </div>

      {message && (
        <div role="status" className={`flex items-start gap-2 mb-4 p-3 rounded-xl text-sm ${
          message.type === 'success' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      {loading && <LoadingState />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && data.products.length === 0 && (
        <EmptyState icon={Package} title="Chưa có sản phẩm" description="Bấm “Thêm sản phẩm” để tạo sản phẩm đầu tiên." />
      )}

      {!loading && !error && data.products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.products.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-dark-100 flex-shrink-0">
                  {p.images?.[0] && <img src={p.images[0]} alt="" loading="lazy" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-grow">
                  <h4 className="font-semibold text-dark-900 truncate">{p.name}</h4>
                  <p className="text-xs text-dark-500">{p.slug}</p>
                  <p className="text-sm font-bold text-brand-600 mt-1">{formatPrice(p.basePrice)}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full h-fit ${
                  p.status === 'active' ? 'bg-green-100 text-green-700'
                    : p.status === 'hidden' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                }`}>
                  {p.status}
                </span>
              </div>
              <div className="mt-3 text-xs text-dark-500 space-y-1">
                {p.variants.map((v) => (
                  <div key={v.id} className="flex justify-between">
                    <span className="truncate">{v.sku} · {v.color} {v.size}</span>
                    <span className="whitespace-nowrap">còn {v.stock}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil size={14} className="mr-1" /> Sửa</Button>
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(p)}>
                  <Trash2 size={14} className="mr-1" /> Xoá
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-start justify-center overflow-y-auto p-4">
          <Card className="w-full max-w-3xl my-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-dark-900">{editing === 'new' ? 'Thêm sản phẩm' : 'Chỉnh sửa sản phẩm'}</h3>
                <button onClick={() => setEditing(null)} aria-label="Đóng"><X size={20} className="text-dark-400" /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-dark-700">Tên sản phẩm</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-dark-700">Slug</label>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-dark-700">Danh mục</label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-dark-700">Giá cơ sở (VNĐ)</label>
                    <Input type="number" min={0} value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-dark-700">Trạng thái</label>
                    <select className="w-full h-10 rounded-xl border border-dark-200 bg-white px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="active">active</option>
                      <option value="hidden">hidden</option>
                      <option value="discontinued">discontinued</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-dark-700">Thời gian sản xuất (ngày)</label>
                    <Input type="number" min={0} max={365} value={form.productionDays} onChange={(e) => setForm({ ...form, productionDays: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-dark-700">Mô tả</label>
                  <textarea className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-dark-700">Ảnh (mỗi dòng một URL)</label>
                  <textarea className="w-full rounded-xl border border-dark-200 bg-white px-3 py-2 text-sm" rows={2} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-dark-700">Biến thể</label>
                    <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, variants: [...form.variants, { sku: '', color: '', size: '10cm', price: form.basePrice, stock: 10, minQty: 1, maxQty: 10, status: 'active' }] })}>
                      <Plus size={14} className="mr-1" /> Thêm biến thể
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {form.variants.map((v, i) => (
                      <div key={i} className="grid grid-cols-2 md:grid-cols-7 gap-2 items-center">
                        <Input placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(i, 'sku', e.target.value)} required />
                        <Input placeholder="Màu" value={v.color} onChange={(e) => updateVariant(i, 'color', e.target.value)} />
                        <Input placeholder="Kích thước" value={v.size} onChange={(e) => updateVariant(i, 'size', e.target.value)} />
                        <Input type="number" min={0} placeholder="Giá" value={v.price} onChange={(e) => updateVariant(i, 'price', e.target.value)} required />
                        <Input type="number" min={0} placeholder="Kho" value={v.stock} onChange={(e) => updateVariant(i, 'stock', e.target.value)} required />
                        <Input type="number" min={1} max={99} placeholder="Max" value={v.maxQty} onChange={(e) => updateVariant(i, 'maxQty', e.target.value)} required />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, variants: form.variants.filter((_, idx) => idx !== i) })}
                          className="text-red-500 text-sm"
                        >
                          Xoá
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>Huỷ</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu sản phẩm'}</Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
