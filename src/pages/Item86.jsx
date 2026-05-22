// src/pages/Item86.jsx — Item 86: instant sold-out toggle per item
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast }     from '../hooks/useToast'

const BASE = import.meta.env.VITE_API_URL || ''

function authHeaders() {
  const { token } = useAuthStore.getState()
  return { Authorization: `Bearer ${token}` }
}

// ── Item card ──────────────────────────────────────────────────────────────
function ItemCard({ item, onToggle, toggling }) {
  const busy = toggling === item.id
  const available = item.available !== false

  return (
    <button
      onClick={() => !busy && onToggle(item)}
      disabled={busy}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 10, width: '100%', textAlign: 'left',
        border: `2px solid ${available ? '#10b98140' : '#ef444450'}`,
        background: available ? 'var(--bg-card)' : '#ef444408',
        cursor: busy ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', opacity: busy ? 0.6 : 1,
        position: 'relative', overflow: 'hidden',
      }}>

      {/* Availability dot */}
      <div style={{
        width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
        background: available ? '#10b981' : '#ef4444',
        boxShadow: available ? '0 0 6px #10b98160' : '0 0 6px #ef444460',
      }} />

      {/* Name + price */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, lineHeight: 1.3,
          color: available ? 'var(--text)' : 'var(--text-muted)',
          textDecoration: available ? 'none' : 'line-through',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.name}
        </div>
        {item.price != null && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            ₹{Number(item.price).toLocaleString('en-IN')}
          </div>
        )}
      </div>

      {/* Status label */}
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
        background: available ? '#10b98120' : '#ef444420',
        color: available ? '#10b981' : '#ef4444',
        flexShrink: 0, letterSpacing: '0.04em',
      }}>
        {busy ? '...' : available ? '● IN' : '86'}
      </span>
    </button>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Item86() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [products,  setProducts]  = useState([])   // flat list
  const [loading,   setLoading]   = useState(true)
  const [toggling,  setToggling]  = useState(null)  // product id being toggled
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState('all') // 'all' | 'available' | '86d'
  const localRef = useRef({})                        // id → latest available (optimistic)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${BASE}/api/v1/products?restaurantId=${rid}&size=500`,
        { headers: authHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list = Array.isArray(data) ? data
                 : Array.isArray(data?.content) ? data.content : []
      // Apply optimistic overrides
      const merged = list.map(p => ({
        ...p,
        available: localRef.current[p.id] !== undefined
          ? localRef.current[p.id] : (p.available !== false),
      }))
      setProducts(merged)
    } catch {
      toast.error('Items load nahi hue')
    } finally {
      setLoading(false)
    }
  }, [rid])

  useEffect(() => { load() }, [load])

  async function handleToggle(item) {
    const newAvail = item.available === false ? true : false
    // Optimistic update
    localRef.current[item.id] = newAvail
    setProducts(prev => prev.map(p => p.id === item.id ? { ...p, available: newAvail } : p))
    setToggling(item.id)
    try {
      const res = await fetch(
        `${BASE}/api/v1/products/${item.id}/availability?available=${newAvail}`,
        { method: 'PATCH', headers: authHeaders() })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Toggle failed')
      }
      toast.success(newAvail
        ? `✅ ${item.name} — back in stock`
        : `🔴 ${item.name} — Item 86'd`)
    } catch (e) {
      // Rollback
      localRef.current[item.id] = !newAvail
      setProducts(prev => prev.map(p => p.id === item.id ? { ...p, available: !newAvail } : p))
      toast.error(e.message || 'Toggle failed')
    } finally {
      setToggling(null)
    }
  }

  async function restoreAll() {
    const sold = products.filter(p => p.available === false)
    if (sold.length === 0) { toast.error('Koi item 86 nahi hai'); return }
    if (!confirm(`${sold.length} item(s) ko wapas available mark karna chahte hain?`)) return
    for (const item of sold) await handleToggle(item)
  }

  // Filter + search
  const q = search.toLowerCase().trim()
  const filtered = products.filter(p => {
    if (!Boolean(p.active !== false)) return false
    if (q && !p.name?.toLowerCase().includes(q)) return false
    if (filter === 'available' && p.available === false) return false
    if (filter === '86d'       && p.available !== false) return false
    return true
  })

  // Group by category
  const byCategory = {}
  filtered.forEach(p => {
    const key = p.categoryName || p.categoryId || 'Uncategorized'
    if (!byCategory[key]) byCategory[key] = []
    byCategory[key].push(p)
  })

  const total86d    = products.filter(p => p.active !== false && p.available === false).length
  const totalActive = products.filter(p => p.active !== false).length

  const btnStyle = (active) => ({
    padding: '6px 14px', borderRadius: 7, border: 'none', fontSize: 12,
    fontWeight: active ? 700 : 400, cursor: 'pointer',
    background: active ? 'var(--accent)' : 'var(--bg-secondary)',
    color: active ? '#fff' : 'var(--text)',
  })

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem', display: 'flex',
        justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>🔴 Item 86</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Tap karo — instantly sold out. Sab platforms pe reflect hoga.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {total86d > 0 && (
            <div style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12,
              fontWeight: 700, background: '#ef444420', color: '#ef4444' }}>
              🔴 {total86d} item{total86d !== 1 ? 's' : ''} 86'd
            </div>
          )}
          <button onClick={restoreAll} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', color: 'var(--text)',
          }}>✅ Restore All</button>
          <button onClick={load} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', fontSize: 12, cursor: 'pointer',
          }}>↻ Refresh</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Items', value: totalActive, color: 'var(--text)' },
          { label: 'Available',   value: totalActive - total86d, color: '#10b981' },
          { label: "86'd / Sold Out", value: total86d, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 10,
            padding: '10px 18px', minWidth: 110 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
              letterSpacing: '0.06em' }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem',
        alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="text" placeholder="🔍 Item search..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, width: 200 }} />
        <button onClick={() => setFilter('all')}       style={btnStyle(filter === 'all')}>All</button>
        <button onClick={() => setFilter('available')} style={btnStyle(filter === 'available')}>
          ● Available
        </button>
        <button onClick={() => setFilter('86d')}       style={btnStyle(filter === '86d')}>
          🔴 86'd
        </button>
      </div>

      {/* Item grid by category */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ height: 56, borderRadius: 10, background: 'var(--border)',
              animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : Object.keys(byCategory).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
          <div style={{ fontWeight: 600 }}>Koi item nahi mila</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Filter change karo ya refresh karo</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(byCategory).map(([catName, items]) => {
            const cat86d = items.filter(i => i.available === false).length
            return (
              <div key={catName}>
                {/* Category header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                  marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                    letterSpacing: '0.06em' }}>
                    {String(catName).toUpperCase()}
                  </div>
                  {cat86d > 0 && (
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20,
                      background: '#ef444420', color: '#ef4444', fontWeight: 700 }}>
                      {cat86d} 86'd
                    </span>
                  )}
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                {/* Items grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 8,
                }}>
                  {items.map(item => (
                    <ItemCard key={item.id} item={item}
                      onToggle={handleToggle} toggling={toggling} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
