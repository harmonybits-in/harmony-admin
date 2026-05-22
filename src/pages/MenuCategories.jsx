// src/pages/MenuCategories.jsx
import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

// ── Styles ────────────────────────────────────────────────────────────────
const iStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
  boxSizing: 'border-box', border: '1px solid var(--border)',
  background: 'var(--bg-secondary)', color: 'var(--text)', outline: 'none',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
        color: 'var(--text-muted)', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────
function CategoryModal({ modal, onClose, onSaved, toast, rid }) {
  const isAdd = modal === 'add'
  const [form, setForm] = useState(() => ({
    name:              isAdd ? '' : (modal.name || ''),
    onlineDisplayName: isAdd ? '' : (modal.onlineDisplayName || ''),
    rank:              isAdd ? '' : String(modal.rank || ''),
    logoUrl:           isAdd ? '' : (modal.logoUrl || ''),
    isActive:          isAdd ? true : (modal.isActive ?? true),
    availableFrom:     isAdd ? '' : (modal.availableFrom || ''),
    availableTo:       isAdd ? '' : (modal.availableTo   || ''),
  }))
  const [saving, setSaving] = useState(false)

  function set(k) {
    return e => setForm(f => ({
      ...f,
      [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Category name dalo'); return }
    setSaving(true)
    try {
      const body = {
        ...form,
        restaurantId: rid,
        rank: Number(form.rank) || 0,
        availableFrom: form.availableFrom || null,
        availableTo:   form.availableTo   || null,
      }
      if (isAdd) {
        await api.post('/categories', body)
        toast.success('Category added!')
      } else {
        await api.put(`/categories/${modal.id}`, body)
        toast.success('Category updated!')
      }
      onSaved()
    } catch (_) {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0008', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '2rem',
        width: '100%', maxWidth: 460, boxShadow: '0 20px 60px #0004' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>
            {isAdd ? '➕ New Category' : '✏️ Edit Category'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Category Name *">
            <input value={form.name} onChange={set('name')} required
              placeholder="e.g. Starters, Main Course, Desserts"
              style={iStyle} autoFocus />
          </Field>

          <Field label="Online Display Name">
            <input value={form.onlineDisplayName} onChange={set('onlineDisplayName')}
              placeholder="Blank rakhne par name hi use hoga"
              style={iStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Sort Rank">
              <input value={form.rank} onChange={set('rank')} type="number" min="0"
                placeholder="1 = pehle dikhega"
                style={iStyle} />
            </Field>
            <Field label="Logo / Image URL">
              <input value={form.logoUrl} onChange={set('logoUrl')}
                placeholder="https://..."
                style={iStyle} />
            </Field>
          </div>

          {form.logoUrl && (
            <img src={form.logoUrl} alt="preview"
              style={{ height: 48, width: 48, objectFit: 'cover', borderRadius: 8,
                border: '1px solid var(--border)' }}
              onError={e => { e.target.style.display = 'none' }} />
          )}

          {/* Time-based scheduling */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
              letterSpacing: '0.06em', marginBottom: 8 }}>⏰ TIME SCHEDULE (optional)</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              Khali chhodo = hamesha available. Set karo to sirf us time window mein dikhega.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Available From">
                <input type="time" value={form.availableFrom} onChange={set('availableFrom')}
                  style={iStyle} />
              </Field>
              <Field label="Available To">
                <input type="time" value={form.availableTo} onChange={set('availableTo')}
                  style={iStyle} />
              </Field>
            </div>
            {form.availableFrom && form.availableTo && (
              <div style={{ marginTop: 8, fontSize: 11, padding: '6px 10px',
                background: 'var(--accent-bg)', borderRadius: 6, color: 'var(--accent)' }}>
                ⏰ Sirf {form.availableFrom} – {form.availableTo} ke beech dikhega
                {form.availableFrom > form.availableTo ? ' (overnight)' : ''}
              </div>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')}
              style={{ width: 16, height: 16 }} />
            <span>Active (POS aur online menu mein visible)</span>
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 600,
              fontSize: 13, background: 'var(--accent)', color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Saving...' : isAdd ? 'Add Category' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function MenuCategories() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null) // null | 'add' | category object
  const [toggling, setToggling] = useState(null) // id being toggled

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await api.get(`/categories/restaurant/${rid}`)
      const cats = Array.isArray(res) ? res : []
      cats.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
      setItems(cats)
    } catch (_) {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [rid])

  useEffect(() => { load() }, [load])

  function openAdd() {
    const nextRank = items.length > 0 ? Math.max(...items.map(c => c.rank || 0)) + 1 : 1
    setModal({ _isAdd: true, _nextRank: nextRank })
  }

  async function toggleActive(c) {
    setToggling(c.id)
    try {
      await api.patch(`/categories/${c.id}/active?active=${!c.isActive}`)
      toast.success(`${c.name} ${!c.isActive ? 'activated' : 'deactivated'}`)
      load()
    } catch (_) {
      toast.error('Toggle failed')
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(c) {
    if (!confirm(`"${c.name}" delete karna chahte hain?\n\nIs category ke products unassigned ho jayenge.`)) return
    try {
      await api.delete(`/categories/${c.id}`)
      toast.success('Category deleted')
      load()
    } catch (_) {
      toast.error('Delete failed — kuch items assigned ho sakte hain')
    }
  }

  const active   = items.filter(c => c.isActive).length
  const inactive = items.filter(c => !c.isActive).length

  // Normalize modal prop for CategoryModal
  const modalProp = modal
    ? (modal._isAdd ? 'add' : modal)
    : null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>📋 Menu Categories</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Categories banao, rank se order set karo — POS aur online menu dono par reflect hoga
          </p>
        </div>
        <button onClick={openAdd} style={{
          padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}>+ Add Category</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Categories', value: items.length, color: '#6366f1' },
          { label: 'Active',           value: active,       color: '#10b981' },
          { label: 'Inactive',         value: inactive,     color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 20px', minWidth: 110 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={6} /> : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 15 }}>Koi category nahi mili</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Pehli category banao — POS menu organize ho jayega</div>
          <button onClick={openAdd} style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13,
            fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            + Add Category
          </button>
        </div>
      ) : (
        <>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  {['Rank', 'Category', 'Online Name', '⏰ Schedule', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600,
                      fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((c, i) => (
                  <tr key={c.id} style={{
                    borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    {/* Rank */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>
                        {c.rank != null ? `#${c.rank}` : '—'}
                      </span>
                    </td>

                    {/* Name + logo */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {c.logoUrl ? (
                          <img src={c.logoUrl} alt=""
                            style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover',
                              border: '1px solid var(--border)', flexShrink: 0 }}
                            onError={e => { e.target.style.display = 'none' }} />
                        ) : (
                          <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                            background: 'var(--bg-secondary)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📋</div>
                        )}
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>

                    {/* Online Display Name */}
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {c.onlineDisplayName && c.onlineDisplayName !== c.name
                        ? c.onlineDisplayName : '—'}
                    </td>

                    {/* Schedule */}
                    <td style={{ padding: '12px 16px' }}>
                      {c.availableFrom && c.availableTo ? (
                        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20,
                          background: '#6366f122', color: '#6366f1', fontWeight: 600,
                          whiteSpace: 'nowrap' }}>
                          ⏰ {c.availableFrom}–{c.availableTo}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Always</span>
                      )}
                    </td>

                    {/* Status toggle */}
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => toggleActive(c)}
                        disabled={toggling === c.id}
                        style={{
                          fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 600,
                          cursor: toggling === c.id ? 'not-allowed' : 'pointer', border: 'none',
                          background: c.isActive ? '#10b98120' : '#ef444420',
                          color: c.isActive ? '#10b981' : '#ef4444',
                          opacity: toggling === c.id ? 0.6 : 1,
                          transition: 'opacity 0.15s',
                        }}>
                        {toggling === c.id ? '...' : c.isActive ? '● Active' : '○ Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setModal(c)} style={{
                          fontSize: 12, padding: '5px 12px', borderRadius: 7, fontWeight: 600,
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--accent)', cursor: 'pointer',
                        }}>✏️ Edit</button>
                        <button onClick={() => handleDelete(c)} style={{
                          fontSize: 12, padding: '5px 10px', borderRadius: 7,
                          border: '1px solid #ef444440', background: 'transparent',
                          color: '#ef4444', cursor: 'pointer',
                        }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, paddingLeft: 4 }}>
            💡 Rank se POS aur online menu mein order decide hota hai — 1 sabse pehle dikhega
          </p>
        </>
      )}

      {/* Modal */}
      {modal && (
        <CategoryModal
          modal={modalProp}
          rid={rid}
          toast={toast}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
