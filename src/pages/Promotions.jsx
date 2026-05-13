import { useState, useEffect, useCallback } from 'react'
import { discountApi, couponApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN') }
function fmtDate(s) { return s ? new Date(s).toLocaleDateString('en-IN') : '—' }

// ── Shared UI ─────────────────────────────────────────────────────────────────
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

function Modal({ title, onClose, onSubmit, saving, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, width: '100%',
        maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
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

function Badge({ text, color = '#6366f1', bg }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
      background: bg || color + '22', color }}>
      {text}
    </span>
  )
}

function Toggle({ active, onToggle, loading }) {
  return (
    <button onClick={onToggle} disabled={loading}
      style={{ padding: '4px 12px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        background: active ? '#10b98122' : '#ef444422',
        color: active ? '#10b981' : '#ef4444' }}>
      {active ? 'Active' : 'Inactive'}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCOUNTS TAB
// ─────────────────────────────────────────────────────────────────────────────

const DISCOUNT_BLANK = {
  name: '', title: '', type: 'PERCENTAGE', platform: 'ALL',
  amount: '', percentage: '', minOrderAmount: '', maxDiscountCap: '',
  isActive: true, applicableOn: 'ALL',
}

const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FLAT',       label: 'Flat Amount (₹)' },
  { value: 'BOGO',       label: 'Buy One Get One (BOGO)' },
]
const PLATFORMS = ['ALL', 'POS', 'ONLINE']
const APPLICABLE_ON = ['ALL', 'FOOD', 'BEVERAGE', 'DESSERT']

function DiscountsTab({ rid, toast }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)   // null | { mode:'create'|'edit', data }
  const [form, setForm]       = useState(DISCOUNT_BLANK)
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await discountApi.getAll(rid)
      setItems(Array.isArray(data) ? data : (data?.content ?? []))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [rid])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm({ ...DISCOUNT_BLANK, restaurantId: rid })
    setModal({ mode: 'create' })
  }

  function openEdit(d) {
    setForm({ ...d })
    setModal({ mode: 'edit', id: d.id })
  }

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }
  function setChk(k) { return e => setForm(f => ({ ...f, [k]: e.target.checked })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { ...form, restaurantId: rid }
      if (modal.mode === 'create') {
        await discountApi.create(body)
        toast.success('Discount created')
      } else {
        await discountApi.update(modal.id, body)
        toast.success('Discount updated')
      }
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(d) {
    if (!window.confirm(`"${d.name}" delete karna chahte ho?`)) return
    try {
      await discountApi.delete(d.id)
      toast.success('Deleted')
      load()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  const typeColor = { PERCENTAGE: '#6366f1', FLAT: '#f59e0b', BOGO: '#10b981' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={openCreate}
          style={{ padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Add Discount
        </button>
      </div>

      {loading ? <SkeletonTable rows={4} /> : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Koi discount nahi mila. Pehla discount banao!
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                {['Name', 'Type', 'Value', 'Platform', 'Min Order', 'Cap', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{d.name || d.title}</div>
                    {d.title && d.name !== d.title && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.title}</div>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge text={d.type} color={typeColor[d.type] || '#888'} />
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                    {d.type === 'PERCENTAGE' ? `${d.percentage ?? 0}%`
                      : d.type === 'FLAT' ? fmt(d.amount)
                      : 'BOGO'}
                  </td>
                  <td style={{ padding: '10px 12px' }}><Badge text={d.platform || 'ALL'} color="#3b82f6" /></td>
                  <td style={{ padding: '10px 12px' }}>{d.minOrderAmount ? fmt(d.minOrderAmount) : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{d.maxDiscountCap ? fmt(d.maxDiscountCap) : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge text={d.isActive ? 'Active' : 'Inactive'} color={d.isActive ? '#10b981' : '#ef4444'} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(d)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(d)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: 'none',
                          background: '#ef444422', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Discount' : 'Edit Discount'}
          onClose={() => setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Name" value={form.name} onChange={set('name')} required placeholder="e.g. Happy Hours" />
            <Inp label="Title (display)" value={form.title} onChange={set('title')} placeholder="e.g. 20% Off" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Sel label="Type" value={form.type} onChange={set('type')} options={DISCOUNT_TYPES} required />
            <Sel label="Platform" value={form.platform} onChange={set('platform')} options={PLATFORMS} />
          </div>
          {form.type === 'PERCENTAGE' && (
            <Inp label="Percentage (%)" value={form.percentage} onChange={set('percentage')} type="number" required placeholder="e.g. 20" />
          )}
          {form.type === 'FLAT' && (
            <Inp label="Flat Amount (₹)" value={form.amount} onChange={set('amount')} type="number" required placeholder="e.g. 50" />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Min Order Amount (₹)" value={form.minOrderAmount} onChange={set('minOrderAmount')} type="number" placeholder="0 = no min" />
            <Inp label="Max Discount Cap (₹)" value={form.maxDiscountCap} onChange={set('maxDiscountCap')} type="number" placeholder="0 = no cap" />
          </div>
          <Sel label="Applicable On" value={form.applicableOn} onChange={set('applicableOn')} options={APPLICABLE_ON} />
          <Chk label="Active" checked={form.isActive} onChange={setChk('isActive')} />
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COUPONS TAB
// ─────────────────────────────────────────────────────────────────────────────

const COUPON_BLANK = {
  code: '', title: '', description: '',
  discountType: 'PERCENTAGE', discountValue: '',
  minOrderAmount: '', maxDiscount: '',
  usageLimit: '', perUserLimit: '',
  validFrom: '', validTo: '',
  applicableOn: 'ALL', isActive: true, isPublic: true,
}

const COUPON_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FIXED',      label: 'Fixed Amount (₹)' },
]

function CouponsTab({ rid, toast }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(COUPON_BLANK)
  const [saving, setSaving]   = useState(false)
  const [toggling, setToggling] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await couponApi.getAll(rid)
      setItems(Array.isArray(data) ? data : (data?.content ?? []))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [rid])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm({ ...COUPON_BLANK, restaurantId: rid })
    setModal({ mode: 'create' })
  }

  function openEdit(c) {
    setForm({
      ...c,
      validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
      validTo:   c.validTo   ? c.validTo.slice(0, 10)   : '',
    })
    setModal({ mode: 'edit', id: c.id })
  }

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }
  function setChk(k) { return e => setForm(f => ({ ...f, [k]: e.target.checked })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { ...form, restaurantId: rid,
        usageLimit: Number(form.usageLimit) || 0,
        perUserLimit: Number(form.perUserLimit) || 0,
      }
      if (modal.mode === 'create') {
        await couponApi.create(body)
        toast.success('Coupon created')
      } else {
        await couponApi.update(modal.id, body)
        toast.success('Coupon updated')
      }
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(c) {
    setToggling(c.id)
    try {
      await couponApi.toggleActive(c.id, !c.isActive)
      toast.success(`Coupon ${!c.isActive ? 'activated' : 'deactivated'}`)
      load()
    } catch (err) {
      toast.error(err.message || 'Toggle failed')
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`"${c.code}" coupon delete karna chahte ho?`)) return
    try {
      await couponApi.delete(c.id)
      toast.success('Deleted')
      load()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  function isExpired(c) {
    if (!c.validTo) return false
    return new Date(c.validTo) < new Date()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={openCreate}
          style={{ padding: '8px 18px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Add Coupon
        </button>
      </div>

      {loading ? <SkeletonTable rows={4} /> : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Koi coupon nahi mila. Pehla coupon banao!
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                {['Code', 'Discount', 'Min Order', 'Usage', 'Valid Till', 'Visibility', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)',
                  opacity: isExpired(c) ? 0.6 : 1 }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{c.code}</div>
                    {c.title && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.title}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                    {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : fmt(c.discountValue)}
                    {c.maxDiscount > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Max {fmt(c.maxDiscount)}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{c.minOrderAmount ? fmt(c.minOrderAmount) : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div>{c.usageCount ?? 0} / {c.usageLimit > 0 ? c.usageLimit : '∞'}</div>
                    {c.perUserLimit > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.perUserLimit}/user</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {c.validTo ? (
                      <div>
                        <div>{fmtDate(c.validTo)}</div>
                        {isExpired(c) && <Badge text="Expired" color="#ef4444" />}
                      </div>
                    ) : '∞'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge text={c.isPublic ? 'Public' : 'Private'} color={c.isPublic ? '#6366f1' : '#f59e0b'} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Toggle active={c.isActive} onToggle={() => handleToggle(c)} loading={toggling === c.id} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(c)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(c)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: 'none',
                          background: '#ef444422', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Coupon' : 'Edit Coupon'}
          onClose={() => setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Coupon Code" value={form.code} onChange={set('code')} required
              placeholder="e.g. SAVE20"
              hint="Uppercase recommended" />
            <Inp label="Title" value={form.title} onChange={set('title')} placeholder="e.g. 20% Off First Order" />
          </div>
          <Inp label="Description" value={form.description} onChange={set('description')} placeholder="Short description" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Sel label="Discount Type" value={form.discountType} onChange={set('discountType')} options={COUPON_TYPES} required />
            <Inp label={form.discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount (₹)'}
              value={form.discountValue} onChange={set('discountValue')} type="number" required placeholder="e.g. 20" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Min Order Amount (₹)" value={form.minOrderAmount} onChange={set('minOrderAmount')} type="number" placeholder="0 = no min" />
            <Inp label="Max Discount (₹)" value={form.maxDiscount} onChange={set('maxDiscount')} type="number" placeholder="0 = no cap" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Usage Limit" value={form.usageLimit} onChange={set('usageLimit')} type="number" placeholder="0 = unlimited" />
            <Inp label="Per User Limit" value={form.perUserLimit} onChange={set('perUserLimit')} type="number" placeholder="0 = unlimited" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Valid From" value={form.validFrom} onChange={set('validFrom')} type="date" />
            <Inp label="Valid To" value={form.validTo} onChange={set('validTo')} type="date" />
          </div>
          <Sel label="Applicable On" value={form.applicableOn} onChange={set('applicableOn')} options={APPLICABLE_ON} />
          <div style={{ display: 'flex', gap: 24 }}>
            <Chk label="Active" checked={form.isActive} onChange={setChk('isActive')} />
            <Chk label="Public (visible to customers)" checked={form.isPublic} onChange={setChk('isPublic')} />
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'discounts', icon: '🏷️', label: 'Discounts'  },
  { key: 'coupons',   icon: '🎟️', label: 'Coupons'    },
]

export default function Promotions() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()
  const [tab, setTab] = useState('discounts')

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🎁 Promotions</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Discounts aur coupons manage karo
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2, transition: 'color .15s',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content card */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20,
        border: '1px solid var(--border)' }}>
        {tab === 'discounts' && <DiscountsTab rid={rid} toast={toast} />}
        {tab === 'coupons'   && <CouponsTab   rid={rid} toast={toast} />}
      </div>
    </div>
  )
}
