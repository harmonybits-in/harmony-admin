// src/pages/CashFlowReport.jsx
import { useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function getToday() { return new Date().toISOString().slice(0, 10) }
function get30DaysAgo() {
  const d = new Date(); d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const C = {
  bg: '#0f172a', card: '#1e293b', input: '#334155',
  border: '#475569', text: '#fff', muted: '#94a3b8',
  green: '#22c55e', red: '#ef4444', blue: '#3b82f6',
  amber: '#f59e0b',
}

const inputStyle = {
  background: C.input, border: `1px solid ${C.border}`, color: C.text,
  padding: '8px 12px', borderRadius: 6, fontSize: 13,
}
const btnStyle = (bg = C.blue) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
})

function SummaryCard({ label, value, accent, sub }) {
  return (
    <div style={{
      background: C.card, borderRadius: 10, padding: '20px 22px',
      borderLeft: `4px solid ${accent}`, flex: 1, minWidth: 160,
    }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function WaterfallRow({ label, amount, accent, bold, indent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
      paddingLeft: indent ? 32 : 16,
    }}>
      <span style={{ fontSize: 13, color: bold ? C.text : C.muted, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 500, color: accent || C.text }}>
        {amount != null ? fmt(amount) : '—'}
      </span>
    </div>
  )
}

export default function CashFlowReport() {
  const { restaurantId } = useAuthStore()
  const [from, setFrom]     = useState(get30DaysAgo())
  const [to, setTo]         = useState(getToday())
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setData(null)
    try {
      const token = localStorage.getItem('harmoney_token') || ''
      const res = await fetch(
        `${BASE}/reports/cash-flow?from=${from}&to=${to}`,
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

  const inflow  = data?.inflow  || {}
  const outflow = data?.outflow || {}
  const net     = data?.netCashFlow ?? null
  const status  = data?.cashFlowStatus
  const netColor = (status === 'POSITIVE' || (net != null && net >= 0)) ? C.green : C.red

  // For visual bars
  const totalIn  = inflow.total  || 0
  const totalOut = outflow.total || 0
  const maxBar   = Math.max(totalIn, totalOut, 1)
  const netPct   = totalIn > 0 ? ((net / totalIn) * 100).toFixed(1) : '0.0'

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'sans-serif', color: C.text }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Cash Flow Report</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>
          Track money coming in and going out of your restaurant
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
        <button onClick={load} disabled={loading} style={{ ...btnStyle(), opacity: loading ? 0.7 : 1 }}>
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
            <SummaryCard label="Total Inflow" value={fmt(totalIn)} accent={C.green}
              sub={`Sales & other income`} />
            <SummaryCard label="Total Outflow" value={fmt(totalOut)} accent={C.red}
              sub={`Expenses, stock, staff`} />
            <SummaryCard label="Net Cash Flow" value={fmt(net)} accent={netColor}
              sub={status || ''} />
            <SummaryCard
              label="Net Cash Flow %"
              value={`${netPct}%`}
              accent={parseFloat(netPct) >= 0 ? C.green : C.red}
              sub="Net as % of inflow"
            />
          </div>

          {/* Visual Comparison Bar */}
          <div style={{ background: C.card, borderRadius: 10, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Inflow vs Outflow
            </div>
            {[
              { label: 'Inflow', value: totalIn, color: C.green },
              { label: 'Outflow', value: totalOut, color: C.red },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: C.text }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color }}>{fmt(value)}</span>
                </div>
                <div style={{ background: C.input, borderRadius: 4, height: 10, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(value / maxBar) * 100}%`,
                    background: color, height: '100%', borderRadius: 4,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Waterfall Breakdown */}
          <div style={{ background: C.card, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Cash Flow Breakdown</span>
            </div>

            {/* Inflow section */}
            <div style={{ padding: '8px 16px 4px', background: '#0d2a1a' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Inflows
              </span>
            </div>
            <WaterfallRow label="Sales Revenue" amount={inflow.sales} indent accent={C.green} />
            <WaterfallRow label="Total Inflow" amount={inflow.total} bold accent={C.green} />

            {/* Outflow section */}
            <div style={{ padding: '8px 16px 4px', background: '#2a0d0d' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Outflows
              </span>
            </div>
            <WaterfallRow label="Expenses" amount={outflow.expenses} indent accent={C.red} />
            <WaterfallRow label="Stock Purchases" amount={outflow.stockPurchases} indent accent={C.red} />
            <WaterfallRow label="Staff Payments" amount={outflow.staffPayments} indent accent={C.red} />
            <WaterfallRow label="Total Outflow" amount={outflow.total} bold accent={C.red} />

            {/* Net */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 16px', background: netColor === C.green ? '#0d2a1a' : '#2a0d0d',
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Net Cash Flow</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: netColor }}>{fmt(net)}</span>
            </div>
          </div>

          {/* Period note */}
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
