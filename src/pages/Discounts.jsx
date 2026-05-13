import { useState, useEffect, useCallback } from 'react'
import { discountApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN') }

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

const BLANK = {
  name: '', title: '', type: 'PERCENTAGE', platform: 'ALL',
  amount: '', percentage: '', minOrderAmount: '', maxDiscountCap: '',
  isActive: true,
}

const TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FLAT',       label: 'Flat Amount (₹)' },
  { value: 'BOGO',       label: 'Buy One Get One (BOGO)' },
]
const PLATFORMS    = ['ALL', 'POS', 'ONLINE']
const APPLICABLE   = ['ALL', 'DINE_IN', 'DELIVERY', 'TAKEAWAY', 'ONLINE']
const TYPE_COLOR   = { PERCENTAGE: '#6366f1', FLAT: '#f59e0b', BOGO: '#10b981' }

export default function Discounts() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState(BLANK)
  const [saving,  setSaving]  = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await discountApi.getAll(rid)
      setItems(Array.isArray(data) ? data : (data?.content ?? []))
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [load])

  const set    = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setChk = k => e => setForm(f => ({ ...f, [k]: e.target.checked }))

  function openCreate() { setForm({ ...BLANK, restaurantId: rid }); setModal({ mode: 'create' }) }
  function openEdit(d)  { setForm({ ...d }); setModal({ mode: 'edit', id: d.id }) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name?.trim()) { toast.error('Name required'); return }
    setSaving(true)
    try {
      const body = { ...form, restaurantId: rid }
      if (modal.mode === 'create') { await discountApi.create(body);       toast.success('Discount created!') }
      else                         { await discountApi.update(modal.id, body); toast.success('Discount updated!') }
      setModal(null); load()
    } catch (e) { toast.error(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try { await discountApi.delete(id); toast.success('Deleted'); load() }
    catch (e) { toast.error(e.message || 'Delete failed') }
    finally { setDeleteId(null) }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>🏷️ Discounts</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Discount rules banao — percentage, flat, ya BOGO
          </p>
        </div>
        <button onClick={openCreate} style={{
          padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
        }}>+ Add Discount</button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
        {loading ? <SkeletonTable rows={5} cols={7} /> : items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏷️</div>
            Koi discount nahi — pehla banao!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Name', 'Type', 'Value', 'Platform', 'Min Order', 'Cap', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600 }}>{d.name || d.title}</div>
                    {d.title && d.name !== d.title && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.title}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge text={d.type} color={TYPE_COLOR[d.type] || '#888'} />
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                    {d.type === 'PERCENTAGE' ? `${d.percentage ?? 0}%`
                      : d.type === 'FLAT' ? fmt(d.amount) : 'BOGO'}
                  </td>
                  <td style={{ padding: '10px 14px' }}><Badge text={d.platform || 'ALL'} color="#3b82f6" /></td>
                  <td style={{ padding: '10px 14px' }}>{d.minOrderAmount ? fmt(d.minOrderAmount) : '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{d.maxDiscountCap ? fmt(d.maxDiscountCap) : '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge text={d.isActive ? 'Active' : 'Inactive'}
                      color={d.isActive ? '#10b981' : '#ef4444'} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(d)} style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12,
                      }}>Edit</button>
                      <button onClick={() => setDeleteId(d.id)} style={{
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
        <Modal title={modal.mode === 'create' ? '+ New Discount' : 'Edit Discount'}
          onClose={() => setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Name" value={form.name} onChange={set('name')} required placeholder="e.g. Happy Hours" />
            <Inp label="Title (display)" value={form.title} onChange={set('title')} placeholder="e.g. 20% Off" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Sel label="Type *" value={form.type} onChange={set('type')} options={TYPES} />
            <Sel label="Platform" value={form.platform} onChange={set('platform')} options={PLATFORMS} />
          </div>
          {form.type === 'PERCENTAGE' && (
            <Inp label="Percentage (%)" value={form.percentage} onChange={set('percentage')}
              type="number" required placeholder="e.g. 20" />
          )}
          {form.type === 'FLAT' && (
            <Inp label="Flat Amount (₹)" value={form.amount} onChange={set('amount')}
              type="number" required placeholder="e.g. 50" />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Min Order (₹)" value={form.minOrderAmount} onChange={set('minOrderAmount')}
              type="number" placeholder="0 = no min" />
            <Inp label="Max Cap (₹)" value={form.maxDiscountCap} onChange={set('maxDiscountCap')}
              type="number" placeholder="0 = no cap" />
          </div>
          <Sel label="Applicable On" value={form.applicableOn} onChange={set('applicableOn')} options={APPLICABLE} />
          <Chk label="Active" checked={form.isActive} onChange={setChk('isActive')} />
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
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Discount delete karein?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Is discount se linked coupons affect ho sakte hain.
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
