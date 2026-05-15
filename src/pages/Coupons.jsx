import { useState, useEffect, useCallback } from 'react'
import { couponApi, discountApi, menuApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN') }
function fmtDate(s) { return s ? new Date(s).toLocaleDateString('en-IN') : '—' }
function isExpired(c) { return c.validTo && new Date(c.validTo) < new Date() }

function Inp({ label, value, onChange, type = 'text', placeholder = '', required = false, hint = '' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

function Sel({ label, value, onChange, options = [], required = false }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <select value={value ?? ''} onChange={onChange}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  )
}

function Chk({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
      <input type="checkbox" checked={!!checked} onChange={onChange} />
      {label}
    </label>
  )
}

// Multi-select checklist with scrollable box
function MultiCheckList({ label, items, selected, onChange, emptyText = 'Koi item nahi' }) {
  const toggle = id => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]
    onChange(next)
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>{label}</label>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 140, overflowY: 'auto', padding: '6px 8px', background: 'var(--bg-page)' }}>
        {items.length === 0
          ? <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>{emptyText}</div>
          : items.map(item => (
            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12,
              cursor: 'pointer', padding: '3px 0', color: 'var(--text)' }}>
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
              {item.name}
            </label>
          ))
        }
      </div>
      {selected.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>{selected.length} selected</div>
      )}
    </div>
  )
}

const ORDER_TYPES = ['ALL', 'DINE_IN', 'DELIVERY', 'PICKUP', 'ONLINE']

function Badge({ text, color = '#6366f1' }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
      background: color + '22', color }}>
      {text}
    </span>
  )
}

function Modal({ title, onClose, onSubmit, saving, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, width: '100%',
        maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          {children}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
                background: saving ? '#ccc' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const BLANK = {
  code: '', title: '', description: '',
  discountType: 'PERCENTAGE', discountValue: '',
  minOrderAmount: '', maxDiscount: '',
  usageLimit: '', perUserLimit: 1,
  validFrom: '', validTo: '',
  orderTypes: ['ALL'],
  categoryFilter: 'ALL',
  categoryIds: [],
  productFilter: 'ALL',
  productIds: [],
  isActive: true, isPublic: true,
  discountId: '',
}

const COUPON_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FIXED',      label: 'Fixed Amount (₹)' },
]

export default function Coupons() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [items,      setItems]      = useState([])
  const [discounts,  setDiscounts]  = useState([])
  const [categories, setCategories] = useState([])
  const [products,   setProducts]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [form,       setForm]       = useState(BLANK)
  const [saving,     setSaving]     = useState(false)
  const [toggling,   setToggling]   = useState(null)
  const [deleteId,   setDeleteId]   = useState(null)
  const [filter,     setFilter]     = useState('all') // all | active | expired

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cData, dData, catData, prodData] = await Promise.allSettled([
        couponApi.getAll(rid),
        discountApi.getAll(rid),
        menuApi.getCategories(rid),
        menuApi.getProducts(rid),
      ])
      setItems(cData.status === 'fulfilled' && Array.isArray(cData.value) ? cData.value : [])
      setDiscounts(dData.status === 'fulfilled' && Array.isArray(dData.value) ? dData.value : [])
      setCategories(catData.status === 'fulfilled' && Array.isArray(catData.value) ? catData.value : [])
      const prodVal = prodData.status === 'fulfilled' ? prodData.value : null
      setProducts(Array.isArray(prodVal) ? prodVal : (prodVal?.content ?? []))
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [load])

  const set    = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setChk = k => e => setForm(f => ({ ...f, [k]: e.target.checked }))

  function openCreate() { setForm({ ...BLANK, restaurantId: rid }); setModal({ mode: 'create' }) }
  function openEdit(c) {
    const existingTypes = Array.isArray(c.applicableOn) ? c.applicableOn : [c.applicableOn || 'ALL']
    const orderTypes = existingTypes.filter(a => ORDER_TYPES.includes(a))
    setForm({
      ...c,
      discountId:     c.discount?.id ?? '',
      validFrom:      c.validFrom ? c.validFrom.slice(0, 10) : '',
      validTo:        c.validTo   ? c.validTo.slice(0, 10)   : '',
      orderTypes:     orderTypes.length > 0 ? orderTypes : ['ALL'],
      categoryFilter: existingTypes.includes('CATEGORY') ? 'SPECIFIC' : 'ALL',
      categoryIds:    c.categoryIds ?? [],
      productFilter:  existingTypes.includes('PRODUCT') ? 'SPECIFIC' : 'ALL',
      productIds:     c.productIds ?? [],
    })
    setModal({ mode: 'edit', id: c.id })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.code?.trim())  { toast.error('Coupon code required'); return }
    if (!form.discountValue) { toast.error('Discount value required'); return }
    setSaving(true)
    try {
      const orderPart = form.orderTypes.includes('ALL') ? ['ALL'] : form.orderTypes
      const applicableOn = [
        ...orderPart,
        ...(form.categoryFilter === 'SPECIFIC' && form.categoryIds.length > 0 ? ['CATEGORY'] : []),
        ...(form.productFilter  === 'SPECIFIC' && form.productIds.length  > 0 ? ['PRODUCT']  : []),
      ]
      const body = {
        ...form,
        restaurantId: rid,
        usageLimit:   Number(form.usageLimit)   || 0,
        perUserLimit: Number(form.perUserLimit)  || 1,
        code: form.code.toUpperCase().trim(),
        applicableOn,
        categoryIds: form.categoryFilter === 'SPECIFIC' ? form.categoryIds : [],
        productIds:  form.productFilter  === 'SPECIFIC' ? form.productIds  : [],
      }
      if (modal.mode === 'create') { await couponApi.create(body);          toast.success('Coupon created!') }
      else                         { await couponApi.update(modal.id, body); toast.success('Coupon updated!') }
      setModal(null); load()
    } catch (e) { toast.error(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleToggle(c) {
    setToggling(c.id)
    try {
      await couponApi.toggleActive(c.id, !c.isActive)
      toast.success(c.isActive ? 'Deactivated' : 'Activated')
      load()
    } catch (e) { toast.error(e.message || 'Toggle failed') }
    finally { setToggling(null) }
  }

  async function handleDelete(id) {
    try { await couponApi.delete(id); toast.success('Deleted'); load() }
    catch (e) { toast.error(e.message || 'Delete failed') }
    finally { setDeleteId(null) }
  }

  const filtered = items.filter(c => {
    if (filter === 'active')  return c.isActive && !isExpired(c)
    if (filter === 'expired') return isExpired(c)
    return true
  })

  const stats = {
    total:   items.length,
    active:  items.filter(c => c.isActive && !isExpired(c)).length,
    expired: items.filter(c => isExpired(c)).length,
    used:    items.reduce((s, c) => s + (c.usageCount || 0), 0),
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>🎟️ Coupons</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Coupon codes manage karo — percentage ya fixed discount
          </p>
        </div>
        <button onClick={openCreate} style={{
          padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
        }}>+ Add Coupon</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Coupons', value: stats.total,   color: '#6366f1' },
          { label: 'Active',        value: stats.active,  color: '#10b981' },
          { label: 'Expired',       value: stats.expired, color: '#ef4444' },
          { label: 'Total Uses',    value: stats.used,    color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
        {['all', 'active', 'expired'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: '1px solid var(--border)',
            background: filter === f ? 'var(--accent)' : 'transparent',
            color: filter === f ? '#fff' : 'var(--text-muted)',
            textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
        {loading ? <SkeletonTable rows={5} cols={8} /> : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎟️</div>
            {filter === 'all' ? 'Koi coupon nahi — pehla banao!' : `Koi ${filter} coupon nahi`}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Code', 'Discount', 'Min Order', 'Usage', 'Valid Till', 'Visible', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', opacity: isExpired(c) ? 0.55 : 1 }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14,
                      letterSpacing: 1, color: 'var(--accent)' }}>{c.code}</div>
                    {c.title && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.title}</div>}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                    {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : fmt(c.discountValue)}
                    {c.maxDiscount > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Max {fmt(c.maxDiscount)}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>{c.minOrderAmount ? fmt(c.minOrderAmount) : '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600 }}>{c.usageCount ?? 0} / {c.usageLimit > 0 ? c.usageLimit : '∞'}</div>
                    {c.perUserLimit > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.perUserLimit}/user</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {c.validTo ? (
                      <>
                        <div>{fmtDate(c.validTo)}</div>
                        {isExpired(c) && <Badge text="Expired" color="#ef4444" />}
                      </>
                    ) : <span style={{ color: 'var(--text-muted)' }}>∞ No expiry</span>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge text={c.isPublic ? 'Public' : 'Private'} color={c.isPublic ? '#6366f1' : '#f59e0b'} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => handleToggle(c)} disabled={toggling === c.id} style={{
                      padding: '4px 10px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer',
                      background: c.isActive ? '#10b98122' : '#ef444422',
                      color: c.isActive ? '#10b981' : '#ef4444',
                    }}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(c)} style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12,
                      }}>Edit</button>
                      <button onClick={() => setDeleteId(c.id)} style={{
                        padding: '4px 10px', borderRadius: 6, border: 'none',
                        background: '#ef444422', color: '#ef4444', cursor: 'pointer', fontSize: 12,
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal.mode === 'create' ? '+ New Coupon' : 'Edit Coupon'}
          onClose={() => setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Coupon Code *" value={form.code} onChange={set('code')}
              placeholder="SAVE20" hint="Uppercase mein save hoga" />
            <Inp label="Title" value={form.title} onChange={set('title')} placeholder="e.g. 20% Off" />
          </div>
          <Inp label="Description" value={form.description} onChange={set('description')}
            placeholder="Short description (optional)" />

          {/* Link to existing discount */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
              Link to Discount Rule (optional)
            </label>
            <select value={form.discountId ?? ''} onChange={set('discountId')}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }}>
              <option value="">— No linked discount (use own values) —</option>
              {discounts.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              Linked discount ki value override karegi
            </div>
          </div>

          <div style={{ padding: '1px 0 8px', borderTop: '1px solid var(--border)', marginBottom: 4,
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>
            STANDALONE DISCOUNT VALUES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Sel label="Discount Type *" value={form.discountType} onChange={set('discountType')} options={COUPON_TYPES} />
            <Inp label={form.discountType === 'PERCENTAGE' ? 'Discount (%) *' : 'Discount (₹) *'}
              value={form.discountValue} onChange={set('discountValue')} type="number" placeholder="e.g. 20" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Min Order (₹)" value={form.minOrderAmount} onChange={set('minOrderAmount')}
              type="number" placeholder="0 = no min" />
            <Inp label="Max Discount (₹)" value={form.maxDiscount} onChange={set('maxDiscount')}
              type="number" placeholder="0 = no cap" />
          </div>

          <div style={{ padding: '1px 0 8px', borderTop: '1px solid var(--border)', marginBottom: 4,
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>
            LIMITS & VALIDITY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Total Usage Limit" value={form.usageLimit} onChange={set('usageLimit')}
              type="number" placeholder="0 = unlimited" />
            <Inp label="Per User Limit" value={form.perUserLimit} onChange={set('perUserLimit')}
              type="number" placeholder="1" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Valid From" value={form.validFrom} onChange={set('validFrom')} type="date" />
            <Inp label="Valid To" value={form.validTo} onChange={set('validTo')} type="date" />
          </div>
          {/* Order Type */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Order Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ORDER_TYPES.map(t => {
                const active = form.orderTypes.includes(t)
                return (
                  <button key={t} type="button" onClick={() => {
                    setForm(f => {
                      if (t === 'ALL') return { ...f, orderTypes: ['ALL'] }
                      const cur = f.orderTypes.filter(x => x !== 'ALL')
                      const next = cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]
                      return { ...f, orderTypes: next.length === 0 ? ['ALL'] : next }
                    })
                  }} style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? '#fff' : 'var(--text)',
                    cursor: 'pointer',
                  }}>{t}</button>
                )
              })}
            </div>
          </div>

          {/* Category Filter */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Categories</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              {['ALL', 'SPECIFIC'].map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                  <input type="radio" name="categoryFilter" value={v} checked={form.categoryFilter === v}
                    onChange={() => setForm(f => ({ ...f, categoryFilter: v, categoryIds: [] }))} />
                  {v === 'ALL' ? 'Sab Categories' : 'Specific Categories'}
                </label>
              ))}
            </div>
            {form.categoryFilter === 'SPECIFIC' && (
              <MultiCheckList label="" items={categories} selected={form.categoryIds}
                onChange={ids => setForm(f => ({ ...f, categoryIds: ids }))}
                emptyText="Koi category nahi mili" />
            )}
          </div>

          {/* Product Filter */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Products</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              {['ALL', 'SPECIFIC'].map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                  <input type="radio" name="productFilter" value={v} checked={form.productFilter === v}
                    onChange={() => setForm(f => ({ ...f, productFilter: v, productIds: [] }))} />
                  {v === 'ALL' ? 'Sab Products' : 'Specific Products'}
                </label>
              ))}
            </div>
            {form.productFilter === 'SPECIFIC' && (
              <MultiCheckList label="" items={products} selected={form.productIds}
                onChange={ids => setForm(f => ({ ...f, productIds: ids }))}
                emptyText="Koi product nahi mila" />
            )}
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <Chk label="Active" checked={form.isActive} onChange={setChk('isActive')} />
            <Chk label="Public (customers ko dikhega)" checked={form.isPublic} onChange={setChk('isPublic')} />
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDeleteId(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '1.5rem',
            width: 320, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🗑️</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Coupon delete karein?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Yeh action undo nahi ho sakta.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteId(null)} style={{
                flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer', fontSize: 13,
              }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{
                flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
