import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

const TAX_TYPES = [
  { value: 'GST',            label: 'GST'            },
  { value: 'SERVICE_CHARGE', label: 'Service Charge' },
  { value: 'VAT',            label: 'VAT'            },
  { value: 'CUSTOM',         label: 'Custom'         },
]

const TYPE_COLOR = {
  GST:            { bg: '#6366f122', color: '#6366f1' },
  SERVICE_CHARGE: { bg: '#f59e0b22', color: '#f59e0b' },
  VAT:            { bg: '#10b98122', color: '#10b981' },
  CUSTOM:         { bg: '#ec489922', color: '#ec4899' },
}

const BLANK = { taxName: '', taxType: 'GST', taxPercent: '', isActive: true, isDefault: false }

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Inp({ label, value, onChange, type = 'text', placeholder = '', required = false }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
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
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Chk({ label, checked, onChange, hint = '' }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!checked} onChange={onChange} />
        {label}
      </label>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, marginLeft: 20 }}>{hint}</div>}
    </div>
  )
}

function Modal({ title, onClose, onSubmit, saving, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, width: '100%',
        maxWidth: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TaxConfig() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [taxes,   setTaxes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)   // null | { mode, id? }
  const [form,    setForm]    = useState(BLANK)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/taxes')
      setTaxes(Array.isArray(data) ? data : [])
    } catch {
      setTaxes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm({ ...BLANK })
    setModal({ mode: 'create' })
  }

  function openEdit(t) {
    setForm({ ...t })
    setModal({ mode: 'edit', id: t.id })
  }

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }
  function setChk(k) { return e => setForm(f => ({ ...f, [k]: e.target.checked })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.taxName?.trim()) return toast.error('Tax name required')
    if (!form.taxPercent || Number(form.taxPercent) < 0) return toast.error('Valid percentage required')
    setSaving(true)
    try {
      const body = { ...form, taxPercent: Number(form.taxPercent), restaurantId: rid }
      if (modal.mode === 'create') {
        await api.post('/taxes', body)
        toast.success('Tax created')
      } else {
        await api.put(`/taxes/${modal.id}`, body)
        toast.success('Tax updated')
      }
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(t) {
    if (!window.confirm(`"${t.taxName}" delete karna chahte ho?`)) return
    try {
      await api.delete(`/taxes/${t.id}`)
      toast.success('Deleted')
      load()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  const activeTaxes   = taxes.filter(t => t.isActive)
  const inactiveTaxes = taxes.filter(t => !t.isActive)

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>💰 Tax Configuration</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            GST, service charge, VAT aur custom taxes manage karo
          </p>
        </div>
        <button onClick={openCreate}
          style={{ padding: '9px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Add Tax
        </button>
      </div>

      {/* Summary cards */}
      {!loading && taxes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Taxes',  value: taxes.length,        color: '#6366f1' },
            { label: 'Active',       value: activeTaxes.length,  color: '#10b981' },
            { label: 'Default Tax',  value: taxes.find(t => t.isDefault)?.taxName || '—', color: '#f59e0b' },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
        {loading ? <SkeletonTable rows={3} /> : taxes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>Koi tax configure nahi hai</div>
            <div style={{ fontSize: 12 }}>Pehla tax add karo — GST, service charge, ya custom</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                  {['Tax Name', 'Type', 'Rate (%)', 'Default', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taxes.map(t => {
                  const tc = TYPE_COLOR[t.taxType] || { bg: '#88888822', color: '#888' }
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)',
                      opacity: t.isActive ? 1 : 0.5 }}>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 600 }}>{t.taxName}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                          background: tc.bg, color: tc.color }}>
                          {t.taxType}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: 15 }}>
                        {t.taxPercent}%
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {t.isDefault ? (
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                            background: '#f59e0b22', color: '#f59e0b' }}>Default</span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                          background: t.isActive ? '#10b98122' : '#ef444422',
                          color: t.isActive ? '#10b981' : '#ef4444' }}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openEdit(t)}
                            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
                              background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(t)}
                            style={{ padding: '4px 12px', borderRadius: 6, border: 'none',
                              background: '#ef444422', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'var(--accent-bg)',
        border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        💡 <strong>Default tax</strong> billing ke time automatically apply hota hai. Multiple taxes active ho sakti hain lekin default sirf ek hogi.
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={modal.mode === 'create' ? 'Add New Tax' : 'Edit Tax'}
          onClose={() => setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <Inp label="Tax Name" value={form.taxName} onChange={set('taxName')} required placeholder="e.g. GST 5%" />
          <Sel label="Tax Type" value={form.taxType} onChange={set('taxType')} options={TAX_TYPES} required />
          <Inp label="Tax Rate (%)" value={form.taxPercent} onChange={set('taxPercent')} type="number" required placeholder="e.g. 5" />
          <Chk label="Active" checked={form.isActive} onChange={setChk('isActive')}
            hint="Inactive taxes billing mein apply nahi honge" />
          <Chk label="Set as Default" checked={form.isDefault} onChange={setChk('isDefault')}
            hint="Default tax bills pe automatically apply hogi" />
        </Modal>
      )}
    </div>
  )
}
