/**
 * Combo Builder — Create and manage meal combos/bundles.
 * Route: /combo-builder
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

// ── Shared sub-components ────────────────────────────────────────────────────

function Inp({ label, value, onChange, type = 'text', placeholder = '', hint = '', required = false }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg-page)',
          color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
        }}
      />
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

function Modal({ title, onClose, onSubmit, saving, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, padding: 24, width: '100%',
        maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
          >×</button>
        </div>
        <form onSubmit={onSubmit}>
          {children}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
              }}
            >Cancel</button>
            <button
              type="submit" disabled={saving}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: saving ? '#9ca3af' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onCancel}
    >
      <div
        style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '1.5rem', width: 320, textAlign: 'center' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🗑️</div>
        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>Delete this combo?</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          This action cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: 9, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13 }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function savings(original, combo) {
  const o = parseFloat(original)
  const c = parseFloat(combo)
  if (!o || !c || o <= 0 || c >= o) return null
  return Math.round(((o - c) / o) * 100)
}

const BLANK_FORM = { name: '', description: '', originalPrice: '', comboPrice: '', itemIds: '', active: true }

// ── Main Component ───────────────────────────────────────────────────────────

export default function ComboBuilder() {
  const { token, restaurantId } = useAuthStore()
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const [combos, setCombos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [modal, setModal]       = useState(null)   // null | { mode: 'create' | 'edit', id? }
  const [form, setForm]         = useState(BLANK_FORM)
  const [saving, setSaving]     = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/combos?restaurantId=${restaurantId}`, { headers })
      if (!res.ok) throw new Error(`Failed to load combos (${res.status})`)
      const data = await res.json()
      setCombos(Array.isArray(data) ? data : (data.content ?? []))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, token])

  useEffect(() => { load() }, [load])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function openCreate() {
    setForm({ ...BLANK_FORM })
    setModal({ mode: 'create' })
  }

  function openEdit(c) {
    setForm({
      name: c.name ?? '',
      description: c.description ?? '',
      originalPrice: c.originalPrice ?? '',
      comboPrice: c.comboPrice ?? '',
      itemIds: Array.isArray(c.itemIds) ? c.itemIds.join(', ') : (c.itemIds ?? ''),
      active: c.active ?? true,
    })
    setModal({ mode: 'edit', id: c.id })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { alert('Combo name is required'); return }
    if (!form.comboPrice)  { alert('Combo price is required'); return }
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        originalPrice: parseFloat(form.originalPrice) || 0,
        comboPrice: parseFloat(form.comboPrice),
        itemIds: form.itemIds.split(',').map(s => s.trim()).filter(Boolean).map(Number),
        active: form.active,
        restaurantId,
      }
      if (modal.mode === 'create') {
        const res = await fetch(`${BASE}/combos`, { method: 'POST', headers, body: JSON.stringify(body) })
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Create failed') }
      } else {
        const res = await fetch(`${BASE}/combos/${modal.id}`, { method: 'PUT', headers, body: JSON.stringify(body) })
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Update failed') }
      }
      setModal(null)
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${BASE}/combos/${id}`, { method: 'DELETE', headers })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Delete failed') }
      setDeleteId(null)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  const savingPct = savings(form.originalPrice, form.comboPrice)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Combo Builder</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Create and manage meal combos / bundles
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
          }}
        >+ New Combo</button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading combos…
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        ) : combos.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🍱</div>
            No combos yet — create your first one!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Name', 'Original Price', 'Combo Price', 'Savings', 'Items', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {combos.map(c => {
                const pct = savings(c.originalPrice, c.comboPrice)
                const itemCount = Array.isArray(c.itemIds) ? c.itemIds.length : 0
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      {c.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.description}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                      {c.originalPrice ? `₹${Number(c.originalPrice).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#16a34a' }}>
                      ₹{Number(c.comboPrice).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {pct != null ? (
                        <span style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 700,
                          background: '#10b98122', color: '#10b981',
                        }}>{pct}% off</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                        background: 'var(--accent)22', color: 'var(--accent)',
                      }}>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600,
                        background: c.active ? '#10b98122' : '#6b728022',
                        color: c.active ? '#10b981' : '#6b7280',
                      }}>{c.active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openEdit(c)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                            background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12,
                          }}
                        >Edit</button>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, border: 'none',
                            background: '#ef444422', color: '#ef4444', cursor: 'pointer', fontSize: 12,
                          }}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <Modal
          title={modal.mode === 'create' ? '+ New Combo' : 'Edit Combo'}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          saving={saving}
        >
          <Inp label="Combo Name" value={form.name} onChange={set('name')} placeholder="e.g. Family Feast" required />
          <Inp label="Description" value={form.description} onChange={set('description')} placeholder="Short description (optional)" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Inp label="Original Price (₹)" value={form.originalPrice} onChange={set('originalPrice')} type="number" placeholder="e.g. 599" />
            <div>
              <Inp label="Combo Price (₹)" value={form.comboPrice} onChange={set('comboPrice')} type="number" placeholder="e.g. 449" required />
              {savingPct != null && (
                <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: -6, marginBottom: 8 }}>
                  Customer saves {savingPct}%
                </div>
              )}
            </div>
          </div>

          <Inp
            label="Menu Item IDs (comma-separated)"
            value={form.itemIds}
            onChange={set('itemIds')}
            placeholder="e.g. 101, 205, 310"
            hint="Enter the numeric IDs of menu items included in this combo"
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            />
            Active (visible to customers)
          </label>
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <DeleteConfirm onConfirm={() => handleDelete(deleteId)} onCancel={() => setDeleteId(null)} />
      )}
    </div>
  )
}
