// src/pages/Reports.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import { reportApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonCard } from '../components/Skeleton'

function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN') }
function today()    { return new Date().toISOString().slice(0, 10) }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

const PRESETS = [
  { label: 'Today',      from: today(),     to: today()     },
  { label: '7 Days',     from: daysAgo(6),  to: today()     },
  { label: '30 Days',    from: daysAgo(29), to: today()     },
  { label: 'This Month', from: new Date().toISOString().slice(0, 7) + '-01', to: today() },
]

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

const TABS = ['Sales', 'Items', 'Staff', 'P&L']

function EmptyChart({ height = 180 }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)', fontSize: 13, flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 28 }}>📊</span>
      Is period mein koi data nahi
    </div>
  )
}

function SummaryCard({ label, value, color, sub }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1.25rem' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function Reports() {
  const toast = useToast()

  const [from, setFrom] = useState(daysAgo(6))
  const [to,   setTo]   = useState(today())
  const [tab,  setTab]  = useState('Sales')
  const [loading, setLoading] = useState(true)
  const [exporting,      setExporting]      = useState(false)
  const [tallyExporting, setTallyExporting] = useState(false)

  const [summary,     setSummary]     = useState(null)
  const [daily,       setDaily]       = useState([])
  const [hourly,      setHourly]      = useState([])
  const [topItems,    setTopItems]    = useState([])
  const [attendance,  setAttendance]  = useState([])
  const [performance, setPerformance] = useState([])
  const [pnl,         setPnl]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sum, day, hr, items, att, perf, pnlData] = await Promise.allSettled([
        reportApi.salesSummary(from, to),
        reportApi.salesDaily(from, to),
        reportApi.salesHourly(from, to),
        reportApi.topItems(from, to, 15),
        reportApi.staffAttendance(from, to),
        reportApi.staffPerformance(from, to),
        reportApi.pnl(from, to),
      ])
      if (sum.status  === 'fulfilled') setSummary(sum.value)
      if (day.status  === 'fulfilled') setDaily(day.value || [])
      if (hr.status   === 'fulfilled') setHourly(hr.value || [])
      if (items.status=== 'fulfilled') setTopItems(items.value || [])
      if (att.status  === 'fulfilled') setAttendance(att.value || [])
      if (perf.status === 'fulfilled') setPerformance(perf.value || [])
      if (pnlData.status==='fulfilled') setPnl(pnlData.value)
    } catch {
      toast.error('Reports load nahi hue')
    } finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { load() }, [load])

  async function exportTally() {
    setTallyExporting(true)
    try {
      const { token, restaurantId } = useAuthStore.getState()
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:2026'
      const res = await fetch(`${BASE}/api/v1/reports/tally-export?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `tally-export-${from}-to-${to}.xml`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Tally XML downloaded!')
    } catch { toast.error('Tally export failed') }
    finally { setTallyExporting(false) }
  }

  function exportCSV() {
    setExporting(true)
    try {
      const rows = [
        ['Date', 'Revenue (₹)', 'Bills'],
        ...daily.map(r => [r.date, r.revenue, r.billCount]),
      ]
      const csv  = rows.map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `report-${from}-to-${to}.csv`; a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported!')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const peakHour = hourly.length
    ? hourly.reduce((a, b) => b.billCount > a.billCount ? b : a, hourly[0])
    : null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>📊 Reports</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Sales · Items · Staff · P&L — date range ke saath
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportTally} disabled={tallyExporting} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: '#4f46e5', color: '#fff', border: 'none',
            cursor: tallyExporting ? 'not-allowed' : 'pointer',
            opacity: tallyExporting ? 0.6 : 1,
          }}>
            {tallyExporting ? 'Exporting…' : '📒 Tally Export'}
          </button>
          <button onClick={exportCSV} disabled={exporting || daily.length === 0} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: '#10b981', color: '#fff', border: 'none',
            cursor: exporting || daily.length === 0 ? 'not-allowed' : 'pointer',
            opacity: exporting || daily.length === 0 ? 0.6 : 1,
          }}>
            {exporting ? 'Exporting…' : '📥 Export CSV'}
          </button>
        </div>
      </div>

      {/* Date filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to) }} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: '1px solid var(--border)',
            background: from === p.from && to === p.to ? 'var(--accent)' : 'transparent',
            color:      from === p.from && to === p.to ? '#fff' : 'var(--text-muted)',
          }}>{p.label}</button>
        ))}
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{
          padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13,
        }} />
        <span style={{ color: 'var(--text-muted)' }}>→</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{
          padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13,
        }} />
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px,1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {loading ? [...Array(6)].map((_, i) => <SkeletonCard key={i} height={90} />) : [
          { label: '💰 Revenue',     value: fmt(summary?.totalRevenue   || 0), color: '#10b981' },
          { label: '🛒 Bills',       value: summary?.billCount || 0,           color: '#6366f1' },
          { label: '📅 Avg/Bill',    value: fmt(summary?.avgOrderValue  || 0), color: '#f59e0b' },
          { label: '💸 Discount',    value: fmt(summary?.totalDiscount  || 0), color: '#ef4444' },
          { label: '🏛️ Tax',         value: fmt(summary?.totalTax       || 0), color: '#8b5cf6' },
          { label: '📈 Avg/Day',     value: fmt(summary?.avgDailyRevenue|| 0), color: '#06b6d4' },
        ].map(({ label, value, color }) => (
          <SummaryCard key={label} label={label} value={value} color={color} />
        ))}
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', border: '1px solid var(--border)', borderBottom: 'none',
            background: tab === t ? 'var(--bg-card)' : 'transparent',
            color:      tab === t ? 'var(--accent)' : 'var(--text-muted)',
            marginBottom: tab === t ? -2 : 0,
          }}>{t}</button>
        ))}
      </div>

      {/* ── Sales Tab ─────────────────────────────────────────────── */}
      {tab === 'Sales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Revenue trend */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>📈 Revenue Trend</div>
            {loading ? <SkeletonCard height={220} /> : daily.length === 0 ? <EmptyChart height={220} /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => '₹' + Math.round(v / 1000) + 'K'} />
                  <Tooltip formatter={v => fmt(v)} labelFormatter={l => `Date: ${l}`}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Payment mode + Hourly */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            {/* Payment mode pie */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>💳 By Payment Mode</div>
              {loading ? <SkeletonCard height={180} /> : !summary?.byPaymentMode || Object.keys(summary.byPaymentMode).length === 0
                ? <EmptyChart height={180} />
                : (() => {
                    const data = Object.entries(summary.byPaymentMode).map(([type, amount]) => ({ type, amount }))
                    return (
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={data} dataKey="amount" nameKey="type" cx="50%" cy="50%" outerRadius={70}
                            label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}>
                            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={v => fmt(v)}
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )
                  })()
              }
            </div>

            {/* Hourly heatmap */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>⏰ Hourly Activity</div>
              {peakHour && !loading && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Peak: {peakHour.label} ({peakHour.billCount} bills)
                </div>
              )}
              {loading ? <SkeletonCard height={160} /> : hourly.filter(h => h.billCount > 0).length === 0
                ? <EmptyChart height={160} />
                : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={hourly.filter(h => h.billCount > 0)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <Tooltip formatter={(v, n) => n === 'revenue' ? fmt(v) : v}
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="billCount" fill="#6366f1" radius={[3,3,0,0]} name="Bills" />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Items Tab ─────────────────────────────────────────────── */}
      {tab === 'Items' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>🏆 Top Selling Items</div>
          {loading ? <SkeletonCard height={300} /> : topItems.length === 0 ? <EmptyChart height={200} /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['#', 'Item', 'Qty Sold', 'Revenue'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-muted)', width: 40 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.productName || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#6366f1', fontWeight: 700 }}>{item.quantity ?? '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 700 }}>{fmt(item.revenue || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Staff Tab ─────────────────────────────────────────────── */}
      {tab === 'Staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Performance */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>🏅 Staff Performance</div>
            {loading ? <SkeletonCard height={200} /> : performance.length === 0 ? <EmptyChart height={150} /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Staff', 'Bills', 'Total Revenue', 'Avg Bill'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left',
                          fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {performance.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '10px 12px', color: '#6366f1', fontWeight: 700 }}>{s.billCount}</td>
                        <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 700 }}>{fmt(s.totalRevenue)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{fmt(s.avgBillValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Attendance */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>📅 Attendance Summary</div>
            {loading ? <SkeletonCard height={200} /> : attendance.length === 0 ? <EmptyChart height={150} /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['Staff', 'Present Days', 'Absent Days', 'Total Hours'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left',
                          fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>{s.presentDays}</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ color: s.absentDays > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: s.absentDays > 0 ? 700 : 400 }}>
                            {s.absentDays}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{s.totalHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── P&L Tab ───────────────────────────────────────────────── */}
      {tab === 'P&L' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* P&L summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 12 }}>
            {loading ? [...Array(4)].map((_, i) => <SkeletonCard key={i} height={90} />) : pnl ? [
              { label: '💰 Revenue',      value: fmt(pnl.revenue),       color: '#10b981' },
              { label: '💸 Expenses',     value: fmt(pnl.totalExpenses), color: '#ef4444' },
              { label: '📈 Gross Profit', value: fmt(pnl.grossProfit),   color: pnl.grossProfit >= 0 ? '#10b981' : '#ef4444' },
              { label: '📊 Margin',       value: pnl.profitMargin + '%', color: pnl.profitMargin >= 0 ? '#6366f1' : '#ef4444' },
            ].map(({ label, value, color }) => (
              <SummaryCard key={label} label={label} value={value} color={color} />
            )) : null}
          </div>

          {/* P&L bar comparison */}
          {!loading && pnl && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>Revenue vs Expenses</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { name: 'Revenue',  amount: pnl.revenue },
                  { name: 'Expenses', amount: pnl.totalExpenses },
                  { name: 'Profit',   amount: Math.max(0, pnl.grossProfit) },
                ]}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => '₹' + Math.round(v / 1000) + 'K'} />
                  <Tooltip formatter={v => fmt(v)}
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="amount" radius={[6,6,0,0]}>
                    {[
                      { name: 'Revenue',  fill: '#10b981' },
                      { name: 'Expenses', fill: '#ef4444' },
                      { name: 'Profit',   fill: '#6366f1' },
                    ].map((c, i) => <Cell key={i} fill={c.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Expense breakdown */}
          {!loading && pnl?.expenseBreakdown?.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>💸 Expense Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '0.5rem' }}>
                {pnl.expenseBreakdown.map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--bg-page)', borderRadius: 8,
                    border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {e.category}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>
                      {fmt(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!loading && pnl?.expenseBreakdown?.length === 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '0.5rem' }}>💸 Expense Breakdown</div>
              <EmptyChart height={100} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
