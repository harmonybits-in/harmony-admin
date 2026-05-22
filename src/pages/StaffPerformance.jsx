// src/pages/StaffPerformance.jsx
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

const inputStyle = {
  background: C.input, border: `1px solid ${C.border}`, color: C.text,
  padding: '8px 12px', borderRadius: 6, fontSize: 13,
}

function SummaryCard({ label, value, accent, sub }) {
  return (
    <div style={{
      background: C.card, borderRadius: 10, padding: '20px 22px',
      borderLeft: `4px solid ${accent}`, flex: 1, minWidth: 160,
    }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function StaffPerformance() {
  const { restaurantId } = useAuthStore()
  const [from, setFrom]       = useState(get30DaysAgo())
  const [to, setTo]           = useState(getToday())
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setData(null)
    try {
      const token = localStorage.getItem('harmoney_token') || ''
      const res = await fetch(
        `${BASE}/reports/staff/performance?from=${from}&to=${to}`,
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

  // Sorted list by totalRevenue desc
  const sorted = useMemo(() => {
    if (!Array.isArray(data)) return []
    return [...data].sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
  }, [data])

  const maxRevenue = useMemo(() =>
    sorted.reduce((m, s) => Math.max(m, s.totalRevenue || 0), 1),
    [sorted]
  )

  const totalBills = sorted.reduce((s, st) => s + (st.billCount || 0), 0)
  const totalRevenue = sorted.reduce((s, st) => s + (st.totalRevenue || 0), 0)
  const topPerformer = sorted[0]?.staffName || '—'

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'sans-serif', color: C.text }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Staff Performance Metrics</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>
          Revenue and billing performance by staff member
        </p>
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap' }}>
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
          {/* Summary Cards */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
            <SummaryCard
              label="Total Bills Processed" value={totalBills.toLocaleString('en-IN')}
              accent={C.blue} sub={`${sorted.length} staff member${sorted.length !== 1 ? 's' : ''}`}
            />
            <SummaryCard
              label="Total Revenue Generated" value={fmt(totalRevenue)}
              accent={C.green} sub="Combined sales"
            />
            <SummaryCard
              label="Top Performer" value={topPerformer}
              accent={C.amber}
              sub={sorted[0] ? `${fmt(sorted[0].totalRevenue)} revenue` : ''}
            />
          </div>

          {/* Leaderboard */}
          {sorted.length === 0 ? (
            <div style={{ background: C.card, borderRadius: 10, padding: '40px', textAlign: 'center', color: C.muted }}>
              No performance data for this period
            </div>
          ) : (
            <div style={{ background: C.card, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Leaderboard</span>
                <span style={{ fontSize: 12, color: C.muted }}>sorted by revenue</span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Rank', 'Staff Name', 'Bills Processed', 'Total Revenue', 'Avg Bill Value', 'Performance'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((staff, i) => {
                    const barPct = maxRevenue > 0 ? ((staff.totalRevenue || 0) / maxRevenue) * 100 : 0
                    const isFirst = i === 0
                    const barColor = i === 0 ? C.amber : i === 1 ? C.muted : i === 2 ? '#cd7f32' : C.blue

                    return (
                      <tr key={staff.staffId ?? i}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          background: isFirst ? '#1a1500' : i % 2 === 1 ? '#172033' : 'transparent',
                        }}>
                        {/* Rank */}
                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: '50%',
                            background: isFirst ? C.amber : i === 1 ? '#6b7280' : i === 2 ? '#92400e' : C.input,
                            color: isFirst || i === 1 || i === 2 ? '#fff' : C.muted,
                            fontSize: 12, fontWeight: 800,
                          }}>
                            {isFirst ? '🏆' : i + 1}
                          </span>
                        </td>

                        {/* Staff Name */}
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: isFirst ? C.amber : C.text }}>
                          {staff.staffName || `Staff #${staff.staffId}`}
                        </td>

                        {/* Bills */}
                        <td style={{ padding: '12px 16px' }}>
                          {(staff.billCount || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Revenue */}
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: C.green }}>
                          {fmt(staff.totalRevenue)}
                        </td>

                        {/* Avg bill */}
                        <td style={{ padding: '12px 16px', color: C.muted }}>
                          {fmtDec(staff.avgBillValue)}
                        </td>

                        {/* Performance bar */}
                        <td style={{ padding: '12px 16px', minWidth: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              flex: 1, background: C.input, borderRadius: 4, height: 8, overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${barPct}%`, background: barColor,
                                height: '100%', borderRadius: 4, transition: 'width 0.6s ease',
                              }} />
                            </div>
                            <span style={{ fontSize: 11, color: C.muted, width: 34, textAlign: 'right' }}>
                              {barPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ textAlign: 'right', color: C.muted, fontSize: 12, marginTop: 10 }}>
            Period: {from} to {to}
          </div>
        </>
      )}
    </div>
  )
}
