import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useToast } from '../hooks/useToast'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return d }
}

// ── Style constants ──────────────────────────────────────────────────────────

const CARD = {
  background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '20px 22px',
}

const BTN = {
  background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
}

const SECTION_TITLE = {
  fontSize: 16, fontWeight: 700, color: '#e2e8f0', margin: '0 0 16px 0',
}

// ── Trend badge ──────────────────────────────────────────────────────────────

function TrendBadge({ trend }) {
  const map = {
    GROWING:   { bg: '#16a34a22', color: '#22c55e', icon: '↑', label: 'Growing'   },
    STABLE:    { bg: '#64748b22', color: '#94a3b8',  icon: '→', label: 'Stable'    },
    DECLINING: { bg: '#ef444422', color: '#ef4444',  icon: '↓', label: 'Declining' },
  }
  const s = map[trend] || map.STABLE
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
      background: s.bg, color: s.color }}>
      {s.icon} {s.label}
    </span>
  )
}

// ── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }) {
  const map = {
    HIGH:   { bg: '#16a34a22', color: '#22c55e' },
    MEDIUM: { bg: '#f59e0b22', color: '#f59e0b' },
    LOW:    { bg: '#ef444422', color: '#ef4444' },
  }
  const s = map[confidence] || map.MEDIUM
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
      background: s.bg, color: s.color }}>
      {confidence} Confidence
    </span>
  )
}

// ── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ risk }) {
  const map = {
    CRITICAL:     { bg: '#ef4444', color: '#fff'    },
    LOW:          { bg: '#f59e0b', color: '#fff'    },
    NO_THRESHOLD: { bg: '#334155', color: '#94a3b8' },
    ADEQUATE:     { bg: '#16a34a', color: '#fff'    },
  }
  const s = map[risk] || map.NO_THRESHOLD
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: s.bg, color: s.color }}>
      {risk}
    </span>
  )
}

// ── Section nav tab button ───────────────────────────────────────────────────

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontWeight: 600, fontSize: 13,
        background: active ? '#3b82f6' : '#1e293b',
        color: active ? '#fff' : '#64748b',
        transition: 'all .15s' }}>
      {label}
    </button>
  )
}

// ── Loading spinner ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 10 }}>
      <div style={{ width: 22, height: 22, border: '3px solid #334155',
        borderTopColor: '#3b82f6', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite' }} />
      <span style={{ color: '#64748b', fontSize: 13 }}>Loading predictions...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Section 1: Sales Forecast ─────────────────────────────────────────────────

function SalesForecast() {
  const toast = useToast()
  const [days,       setDays]       = useState(7)
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [fetched,    setFetched]    = useState(false)

  const load = useCallback(async (d) => {
    setLoading(true)
    try {
      const res = await api.get(`/analytics/predictions/sales?days=${d}`)
      setData(res)
      setFetched(true)
    } catch (err) {
      toast.error(err.message || 'Failed to load sales forecast')
      setData(null)
    } finally { setLoading(false) }
  }, [toast])

  useEffect(() => { load(days) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const predictions  = data?.predictions  || []
  const weeklyAvg    = data?.weeklyAverages || {}
  const maxRevenue   = Math.max(...predictions.map(p => p.predictedRevenue || 0), 1)

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Forecast for:</span>
        {[7, 14, 30].map(d => (
          <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#e2e8f0' }}>
            <input type="radio" name="days" checked={days === d} onChange={() => setDays(d)}
              style={{ accentColor: '#3b82f6' }} />
            {d} days
          </label>
        ))}
        <button onClick={() => load(days)} style={BTN}>Fetch Forecast</button>

        {data && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <TrendBadge trend={data.trend} />
            <ConfidenceBadge confidence={data.confidence} />
          </div>
        )}
      </div>

      {loading && <Spinner />}

      {!loading && fetched && predictions.length === 0 && (
        <div style={{ ...CARD, textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
          <div>No forecast data available for this range</div>
        </div>
      )}

      {!loading && predictions.length > 0 && (
        <>
          {/* Weekly averages */}
          {Object.keys(weeklyAvg).length > 0 && (
            <div style={{ ...CARD, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>
                Historical Weekly Averages
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(weeklyAvg).map(([day, avg]) => (
                  <div key={day} style={{ background: '#0f172a', border: '1px solid #1e3a5f',
                    borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 90 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                      {day.slice(0, 3)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>
                      {fmt(avg)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prediction table + bar chart */}
          <div style={CARD}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>
              {predictions.length}-day Prediction Table
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['Date', 'Day', 'Predicted Revenue', 'Predicted Orders', 'Revenue Bar'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b',
                        fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p, idx) => {
                    const barPct = maxRevenue > 0 ? (p.predictedRevenue / maxRevenue) * 100 : 0
                    return (
                      <tr key={idx}
                        style={{ borderBottom: '1px solid #1e293b', transition: 'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 12px', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                          {fmtDate(p.date)}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                          {p.dayOfWeek?.slice(0, 3) || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#22c55e', fontWeight: 700 }}>
                          {fmt(p.predictedRevenue)}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#06b6d4' }}>
                          {p.predictedOrders ?? '—'}
                        </td>
                        <td style={{ padding: '10px 12px', minWidth: 140 }}>
                          <div style={{ height: 8, borderRadius: 4, background: '#334155', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 4,
                              background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                              width: `${barPct}%`, transition: 'width .4s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#475569', marginTop: 2, display: 'block' }}>
                            {barPct.toFixed(0)}% of peak
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Section 2: Busy Hours ─────────────────────────────────────────────────────

const INTENSITY_COLOR = {
  QUIET:    '#1e293b',
  MODERATE: '#1d4ed8',
  BUSY:     '#f59e0b',
  PEAK:     '#ef4444',
}

function BusyHours() {
  const toast = useToast()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/predictions/busy-hours')
      .then(res => setData(res))
      .catch(err => toast.error(err.message || 'Failed to load busy hours'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner />
  if (!data)   return (
    <div style={{ ...CARD, textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
      <div style={{ fontSize: 32 }}>⏰</div>
      <div style={{ marginTop: 8 }}>No busy-hours data available</div>
    </div>
  )

  const hourlyMap = {}
  ;(data.hourlyPrediction || []).forEach(h => { hourlyMap[h.hour] = h })

  const peakHours  = data.peakHours  || []
  const busyDays   = data.busyDays   || []

  function hourLabel(h) {
    if (h === 0)  return '12 AM'
    if (h === 12) return '12 PM'
    return h < 12 ? `${h} AM` : `${h - 12} PM`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 24-cell heatmap */}
      <div style={CARD}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 14 }}>
          24-Hour Heatmap — Color intensity indicates busyness
        </div>

        {/* Hour cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 4, marginBottom: 10 }}>
          {Array.from({ length: 24 }, (_, h) => {
            const cell   = hourlyMap[h]
            const color  = INTENSITY_COLOR[cell?.intensity || 'QUIET']
            const isPeak = peakHours.includes(h)
            const orders = cell?.expectedOrders ?? 0
            return (
              <div key={h}
                title={`${hourLabel(h)}: ${cell?.intensity || 'QUIET'} — ~${orders} orders`}
                style={{ height: 44, borderRadius: 6, background: color,
                  border: isPeak ? '2px solid #ef4444' : '1px solid #334155',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', cursor: 'default', transition: 'transform .1s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scaleY(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scaleY(1)'}
              >
                <span style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1 }}>{h}</span>
                {orders > 0 && <span style={{ fontSize: 9, color: '#e2e8f0', fontWeight: 700, lineHeight: 1, marginTop: 2 }}>{orders}</span>}
              </div>
            )
          })}
        </div>

        {/* Hour labels (every 4h) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 4 }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} style={{ textAlign: 'center', fontSize: 9, color: '#475569' }}>
              {h % 4 === 0 ? hourLabel(h) : ''}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
          {Object.entries(INTENSITY_COLOR).map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: color,
                border: '1px solid #334155' }} />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#ef4444',
              border: '2px solid #ef4444' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Peak Hour (outlined)</span>
          </div>
        </div>
      </div>

      {/* Peak hours + Busy days */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={CARD}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>Peak Hours</div>
          {peakHours.length === 0 ? (
            <div style={{ color: '#475569', fontSize: 13 }}>No peak hours identified</div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {peakHours.map(h => (
                <span key={h} style={{ padding: '5px 12px', borderRadius: 20, background: '#ef444422',
                  color: '#ef4444', fontSize: 12, fontWeight: 700, border: '1px solid #ef444444' }}>
                  {hourLabel(h)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={CARD}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>Busiest Days</div>
          {busyDays.length === 0 ? (
            <div style={{ color: '#475569', fontSize: 13 }}>No busy days identified</div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {busyDays.map(d => (
                <span key={d} style={{ padding: '5px 12px', borderRadius: 20, background: '#f59e0b22',
                  color: '#f59e0b', fontSize: 12, fontWeight: 700, border: '1px solid #f59e0b44' }}>
                  {d.slice(0, 3)}
                </span>
              ))}
            </div>
          )}
          {data.dataSource && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#475569' }}>
              Data source: {data.dataSource}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Section 3: Inventory Risk ─────────────────────────────────────────────────

function InventoryRisk() {
  const toast = useToast()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/predictions/inventory-risk')
      .then(res => setData(res))
      .catch(err => toast.error(err.message || 'Failed to load inventory risk'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner />
  if (!data)   return (
    <div style={{ ...CARD, textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
      <div style={{ fontSize: 32 }}>📦</div>
      <div style={{ marginTop: 8 }}>No inventory risk data available</div>
    </div>
  )

  const items           = data.items           || []
  const recommendations = data.recommendations || []
  const critical  = data.criticalStock ?? items.filter(i => i.riskLevel === 'CRITICAL').length
  const lowStock  = data.lowStock      ?? items.filter(i => i.riskLevel === 'LOW').length
  const adequate  = items.filter(i => i.riskLevel === 'ADEQUATE').length

  const ROW_BG = {
    CRITICAL:     'rgba(239,68,68,.10)',
    LOW:          'rgba(245,158,11,.10)',
    NO_THRESHOLD: 'rgba(100,116,139,.05)',
    ADEQUATE:     'rgba(34,197,94,.07)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ ...CARD, borderColor: '#ef444444', borderLeftWidth: 4 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Critical Stock</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#ef4444' }}>{critical}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>items need immediate reorder</div>
        </div>
        <div style={{ ...CARD, borderColor: '#f59e0b44', borderLeftWidth: 4 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Low Stock</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#f59e0b' }}>{lowStock}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>items running low</div>
        </div>
        <div style={{ ...CARD, borderColor: '#22c55e44', borderLeftWidth: 4 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Adequate</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#22c55e' }}>{adequate}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>items well-stocked</div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ ...CARD, borderColor: '#f59e0b44' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠</span> Recommendations
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recommendations.map((rec, i) => (
              <li key={i} style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.55 }}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Items table */}
      {items.length > 0 && (
        <div style={CARD}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 14 }}>
            Inventory Risk Details — {items.length} items
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Item Name', 'Current Stock', 'Reorder Level', 'Unit', 'Risk'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b',
                      fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items
                  .sort((a, b) => {
                    const order = { CRITICAL: 0, LOW: 1, NO_THRESHOLD: 2, ADEQUATE: 3 }
                    return (order[a.riskLevel] ?? 9) - (order[b.riskLevel] ?? 9)
                  })
                  .map((item, idx) => (
                    <tr key={idx}
                      style={{ borderBottom: '1px solid #1e293b', background: ROW_BG[item.riskLevel] || 'transparent' }}>
                      <td style={{ padding: '11px 12px', color: '#e2e8f0', fontWeight: 600 }}>
                        {item.name}
                      </td>
                      <td style={{ padding: '11px 12px', color: item.riskLevel === 'CRITICAL' ? '#ef4444'
                        : item.riskLevel === 'LOW' ? '#f59e0b' : '#e2e8f0', fontWeight: 700 }}>
                        {item.currentStock != null ? Number(item.currentStock).toFixed(1) : '—'}
                      </td>
                      <td style={{ padding: '11px 12px', color: '#94a3b8' }}>
                        {item.reorderLevel != null ? Number(item.reorderLevel).toFixed(1) : '—'}
                      </td>
                      <td style={{ padding: '11px 12px', color: '#64748b' }}>
                        {item.unit || '—'}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <RiskBadge risk={item.riskLevel} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
export default function PredictiveAnalytics() {
  const [activeTab, setActiveTab] = useState('sales')

  const TABS = [
    { key: 'sales',     label: 'Sales Forecast'    },
    { key: 'busy',      label: 'Busy Hours'        },
    { key: 'inventory', label: 'Inventory Risk'    },
  ]

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#0f172a', color: '#fff' }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
          Predictive Analytics
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
          AI-powered forecasts based on your historical data
        </p>
      </div>

      {/* ── Info banner ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        background: '#1d4ed822', border: '1px solid #1d4ed855', borderRadius: 8, marginBottom: 22 }}>
        <span style={{ fontSize: 16 }}>ℹ</span>
        <span style={{ fontSize: 13, color: '#93c5fd' }}>
          Predictions based on last 90 days of sales data — updated daily
        </span>
      </div>

      {/* ── Tab nav ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#0f172a',
        borderBottom: '1px solid #334155', paddingBottom: 0 }}>
        {TABS.map(t => (
          <TabBtn key={t.key} label={t.label} active={activeTab === t.key}
            onClick={() => setActiveTab(t.key)} />
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────── */}
      {activeTab === 'sales' && (
        <section>
          <h2 style={SECTION_TITLE}>Sales Forecast</h2>
          <SalesForecast />
        </section>
      )}

      {activeTab === 'busy' && (
        <section>
          <h2 style={SECTION_TITLE}>Busy Hours Prediction</h2>
          <BusyHours />
        </section>
      )}

      {activeTab === 'inventory' && (
        <section>
          <h2 style={SECTION_TITLE}>Inventory Risk Analysis</h2>
          <InventoryRisk />
        </section>
      )}
    </div>
  )
}
