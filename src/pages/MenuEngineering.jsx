// src/pages/MenuEngineering.jsx
import { useState, useCallback, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function getToday() { return new Date().toISOString().slice(0, 10) }
function get30DaysAgo() {
  const d = new Date(); d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtDec(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const C = {
  bg: '#0f172a', card: '#1e293b', input: '#334155',
  border: '#475569', text: '#fff', muted: '#94a3b8',
  green: '#22c55e', red: '#ef4444', blue: '#3b82f6',
  amber: '#f59e0b', purple: '#8b5cf6',
}

const CATEGORIES = [
  { key: 'STAR',       label: 'STAR',        emoji: '⭐', color: C.green,  bg: '#052e16' },
  { key: 'PLOW_HORSE', label: 'PLOW HORSE',  emoji: '🐴', color: C.blue,   bg: '#1e3a5f' },
  { key: 'PUZZLE',     label: 'PUZZLE',      emoji: '🧩', color: C.amber,  bg: '#451a03' },
  { key: 'DOG',        label: 'DOG',         emoji: '🐕', color: C.red,    bg: '#2a0d0d' },
]

const CAT_META = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

const FILTERS = [
  { label: 'All',         value: '' },
  { label: '⭐ Stars',    value: 'STAR' },
  { label: '🐴 Plow Horses', value: 'PLOW_HORSE' },
  { label: '🧩 Puzzles',  value: 'PUZZLE' },
  { label: '🐕 Dogs',     value: 'DOG' },
]

const inputStyle = {
  background: C.input, border: `1px solid ${C.border}`, color: C.text,
  padding: '8px 12px', borderRadius: 6, fontSize: 13,
}

function CategoryBadge({ cat }) {
  const meta = CAT_META[cat] || {}
  return (
    <span style={{
      background: meta.bg || C.card, color: meta.color || C.muted,
      border: `1px solid ${meta.color || C.border}`,
      borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
    }}>
      {meta.emoji} {cat?.replace('_', ' ')}
    </span>
  )
}

export default function MenuEngineering() {
  const { restaurantId } = useAuthStore()
  const [from, setFrom]       = useState(get30DaysAgo())
  const [to, setTo]           = useState(getToday())
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [filter, setFilter]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setData(null)
    try {
      const token = localStorage.getItem('harmoney_token') || ''
      const res = await fetch(
        `${BASE}/reports/menu-engineering?from=${from}&to=${to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [from, to, restaurantId])

  const items = data?.items || []
  const summary = data?.summary || {}

  const filtered = useMemo(() =>
    filter ? items.filter(i => i.category === filter) : items,
    [items, filter]
  )

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0)),
    [filtered]
  )

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'sans-serif', color: C.text }}>
      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Menu Engineering Matrix</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>
          Stars = keep &amp; promote &nbsp;|&nbsp; Plow Horses = increase price &nbsp;|&nbsp;
          Puzzles = reposition &nbsp;|&nbsp; Dogs = consider removing
        </p>
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 24, marginTop: 16, flexWrap: 'wrap' }}>
        {[['From', from, setFrom], ['To', to, setTo]].map(([label, val, set]) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
            <input type="date" value={val} max={getToday()}
              onChange={e => set(e.target.value)} style={inputStyle} />
          </div>
        ))}
        <button onClick={load} disabled={loading} style={{
          background: C.blue, color: '#fff', border: 'none', borderRadius: 6,
          padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Loading...' : 'Fetch Report'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#450a0a', border: `1px solid ${C.red}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: C.red, fontSize: 13 }}>
          {error}
        </div>
      )}

      {!data && !loading && (
        <div style={{ textAlign: 'center', color: C.muted, padding: '60px 0', fontSize: 14 }}>
          Select a date range and click "Fetch Report"
        </div>
      )}

      {data && (
        <>
          {/* Category Summary Cards */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
            {CATEGORIES.map(cat => (
              <div key={cat.key} style={{
                background: cat.bg, border: `1px solid ${cat.color}`, borderRadius: 10,
                padding: '16px 20px', flex: 1, minWidth: 140, cursor: 'pointer',
                boxShadow: filter === cat.key ? `0 0 0 2px ${cat.color}` : 'none',
              }} onClick={() => setFilter(f => f === cat.key ? '' : cat.key)}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{cat.emoji}</div>
                <div style={{ fontSize: 11, color: cat.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {cat.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: cat.color, marginTop: 4 }}>
                  {summary[cat.key] ?? 0}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>items</div>
              </div>
            ))}
          </div>

          {/* Averages row */}
          {(data.avgQuantity != null || data.avgRevenue != null) && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ background: C.card, borderRadius: 8, padding: '10px 16px', fontSize: 13 }}>
                <span style={{ color: C.muted }}>Avg Qty Sold: </span>
                <span style={{ fontWeight: 700 }}>{(data.avgQuantity || 0).toFixed(1)}</span>
              </div>
              <div style={{ background: C.card, borderRadius: 8, padding: '10px 16px', fontSize: 13 }}>
                <span style={{ color: C.muted }}>Avg Revenue: </span>
                <span style={{ fontWeight: 700 }}>{fmtDec(data.avgRevenue)}</span>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)} style={{
                padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === f.value ? C.blue : C.border}`,
                background: filter === f.value ? C.blue : C.card,
                color: filter === f.value ? '#fff' : C.muted,
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}>
                {f.label}
              </button>
            ))}
            <span style={{ fontSize: 12, color: C.muted, alignSelf: 'center', marginLeft: 4 }}>
              {sorted.length} item{sorted.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Items table */}
          <div style={{ background: C.card, borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['#', 'Product Name', 'Orders Sold', 'Revenue', 'Revenue / Unit', 'Category'].map(h => (
                    <th key={h} style={{
                      padding: '12px 14px', textAlign: 'left', fontSize: 11,
                      fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '32px 14px', textAlign: 'center', color: C.muted }}>
                    No items found
                  </td></tr>
                )}
                {sorted.map((item, i) => (
                  <tr key={item.productId ?? i}
                    style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 1 ? '#172033' : 'transparent' }}>
                    <td style={{ padding: '11px 14px', color: C.muted }}>{i + 1}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 600 }}>{item.productName}</td>
                    <td style={{ padding: '11px 14px' }}>{(item.quantitySold || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 600 }}>{fmt(item.totalRevenue)}</td>
                    <td style={{ padding: '11px 14px', color: C.muted }}>{fmtDec(item.revenuePerUnit)}</td>
                    <td style={{ padding: '11px 14px' }}><CategoryBadge cat={item.category} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.period && (
            <div style={{ textAlign: 'right', color: C.muted, fontSize: 12, marginTop: 10 }}>
              Period: {data.period.from} to {data.period.to}
            </div>
          )}
        </>
      )}
    </div>
  )
}
