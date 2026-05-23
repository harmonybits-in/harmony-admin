/**
 * Nutrition Info — View and edit nutrition data for menu items.
 * Route: /nutrition
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

const ALLERGEN_OPTIONS = ['Gluten', 'Dairy', 'Eggs', 'Nuts', 'Peanuts', 'Soy', 'Shellfish', 'Fish', 'Sesame']

// ── Sub-components ────────────────────────────────────────────────────────────

function NutritionModal({ item, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    calories:    item.calories    ?? '',
    protein:     item.protein     ?? '',
    carbs:       item.carbs       ?? '',
    fat:         item.fat         ?? '',
    fiber:       item.fiber       ?? '',
    allergens:   item.allergens   ?? '',
    servingSize: item.servingSize ?? '',
  })

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ ...item, ...form })
  }

  const fieldStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-page)',
    color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500,
  }

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
        maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Edit Nutrition — {item.name}</h3>
            {item.categoryName && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.categoryName}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px' }}>
            {[
              { key: 'calories', label: 'Calories (kcal)' },
              { key: 'protein',  label: 'Protein (g)' },
              { key: 'carbs',    label: 'Carbs (g)' },
              { key: 'fat',      label: 'Fat (g)' },
              { key: 'fiber',    label: 'Fiber (g)' },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{label}</label>
                <input type="number" value={form[key]} onChange={set(key)} placeholder="—" style={fieldStyle} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Serving Size</label>
              <input value={form.servingSize} onChange={set('servingSize')} placeholder="e.g. 1 plate (250g)" style={fieldStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Allergens (comma-separated or select below)</label>
            <input value={form.allergens} onChange={set('allergens')} placeholder="e.g. Gluten, Dairy" style={fieldStyle} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {ALLERGEN_OPTIONS.map(a => {
                const active = form.allergens.toLowerCase().includes(a.toLowerCase())
                return (
                  <button
                    key={a} type="button"
                    onClick={() => {
                      setForm(f => {
                        const list = f.allergens ? f.allergens.split(',').map(s => s.trim()).filter(Boolean) : []
                        const exists = list.map(s => s.toLowerCase()).includes(a.toLowerCase())
                        const next = exists ? list.filter(s => s.toLowerCase() !== a.toLowerCase()) : [...list, a]
                        return { ...f, allergens: next.join(', ') }
                      })
                    }}
                    style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${active ? '#f59e0b' : 'var(--border)'}`,
                      background: active ? '#f59e0b22' : 'transparent',
                      color: active ? '#f59e0b' : 'var(--text-muted)',
                    }}
                  >{a}</button>
                )
              })}
            </div>
          </div>

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
            >{saving ? 'Saving…' : 'Save Nutrition'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function NutritionInfo() {
  const { token, restaurantId } = useAuthStore()
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')
  const [editing, setEditing] = useState(null) // item object
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/menu/items?restaurantId=${restaurantId}`, { headers })
      if (!res.ok) throw new Error(`Failed to load menu items (${res.status})`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.content ?? [])
      setItems(list)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, token])

  useEffect(() => { load() }, [load])

  async function handleSave(updatedItem) {
    setSaving(true)
    try {
      const body = {
        ...updatedItem,
        calories:    updatedItem.calories    !== '' ? Number(updatedItem.calories)    : null,
        protein:     updatedItem.protein     !== '' ? Number(updatedItem.protein)     : null,
        carbs:       updatedItem.carbs       !== '' ? Number(updatedItem.carbs)       : null,
        fat:         updatedItem.fat         !== '' ? Number(updatedItem.fat)         : null,
        fiber:       updatedItem.fiber       !== '' ? Number(updatedItem.fiber)       : null,
        allergens:   updatedItem.allergens   ?? null,
        servingSize: updatedItem.servingSize ?? null,
        restaurantId,
      }
      const res = await fetch(`${BASE}/menu/items/${updatedItem.id}`, {
        method: 'PUT', headers, body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Save failed') }
      setEditing(null)
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = items.filter(i =>
    !search || i.name?.toLowerCase().includes(search.toLowerCase())
  )

  function nutriVal(v) {
    return v != null && v !== '' ? v : <span style={{ color: 'var(--text-muted)' }}>—</span>
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Nutrition Info</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          View and edit nutrition data for your menu items
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items by name…"
          style={{
            width: '100%', maxWidth: 360, padding: '9px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-card)',
            color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading menu items…
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444', fontSize: 13 }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🥗</div>
            {search ? 'No items match your search' : 'No menu items found'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 780 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Item Name', 'Category', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Allergens', 'Serving Size', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{item.categoryName ?? '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{nutriVal(item.calories)}</td>
                  <td style={{ padding: '10px 12px' }}>{nutriVal(item.protein)}</td>
                  <td style={{ padding: '10px 12px' }}>{nutriVal(item.carbs)}</td>
                  <td style={{ padding: '10px 12px' }}>{nutriVal(item.fat)}</td>
                  <td style={{ padding: '10px 12px', maxWidth: 140 }}>
                    {item.allergens ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {item.allergens.split(',').map(a => a.trim()).filter(Boolean).map(a => (
                          <span key={a} style={{
                            fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600,
                            background: '#f59e0b22', color: '#f59e0b',
                          }}>{a}</span>
                        ))}
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{item.servingSize ?? '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      onClick={() => setEditing(item)}
                      style={{
                        padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12,
                      }}
                    >Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <NutritionModal
          item={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  )
}
