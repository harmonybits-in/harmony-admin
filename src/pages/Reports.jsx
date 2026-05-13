// src/pages/Reports.jsx
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonCard } from '../components/Skeleton'

const MOCK_REVENUE = [
  { date:'2026-04-25', revenue:12400, orders:34 },
  { date:'2026-04-26', revenue:15200, orders:42 },
  { date:'2026-04-27', revenue:9800,  orders:28 },
  { date:'2026-04-28', revenue:18600, orders:51 },
  { date:'2026-04-29', revenue:22100, orders:63 },
  { date:'2026-04-30', revenue:19400, orders:55 },
  { date:'2026-05-01', revenue:24800, orders:71 },
]

const MOCK_EXPENSES = [
  { category:'Raw Materials', amount:45000 },
  { category:'Staff Salary',  amount:82000 },
  { category:'Electricity',   amount:8500  },
  { category:'Rent',          amount:25000 },
  { category:'Other',         amount:5200  },
]

function fmt(n) { return '₹'+(Number(n)||0).toLocaleString('en-IN') }

function today() { return new Date().toISOString().slice(0,10) }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10) }

const PRESETS = [
  { label:'Today',    from: today(),    to: today()    },
  { label:'7 Days',   from: daysAgo(6), to: today()    },
  { label:'30 Days',  from: daysAgo(29),to: today()    },
  { label:'This Month', from: new Date().toISOString().slice(0,7)+'-01', to: today() },
]

export default function Reports() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()
  const [from, setFrom]       = useState(daysAgo(6))
  const [to, setTo]           = useState(today())
  const [revenue, setRevenue] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { load() }, [from, to])

  async function load() {
    setLoading(true)
    try {
      const [rev, exp] = await Promise.allSettled([
        api.get(`/dashboard/revenue-chart?restaurantId=${rid}&from=${from}&to=${to}`),
        api.get(`/dashboard/expenses?restaurantId=${rid}&from=${from}&to=${to}`),
      ])
      setRevenue(rev.value?.length ? rev.value : MOCK_REVENUE)
      setExpenses(exp.value?.length ? exp.value : MOCK_EXPENSES)
    } catch (_) {
      setRevenue(MOCK_REVENUE); setExpenses(MOCK_EXPENSES)
    } finally { setLoading(false) }
  }

  // Export CSV
  function exportCSV() {
    setExporting(true)
    try {
      const rows = [
        ['Date', 'Revenue (₹)', 'Orders'],
        ...revenue.map(r => [r.date, r.revenue, r.orders || '—']),
      ]
      const csv = rows.map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `revenue-report-${from}-to-${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('📊 CSV exported!')
    } catch (_) {
      toast.error('Export failed')
    } finally { setExporting(false) }
  }

  const totalRevenue  = revenue.reduce((a, r) => a + (r.revenue || 0), 0)
  const totalOrders   = revenue.reduce((a, r) => a + (r.orders  || 0), 0)
  const totalExpenses = expenses.reduce((a, e) => a + (e.amount  || 0), 0)
  const avgPerDay     = revenue.length ? Math.round(totalRevenue / revenue.length) : 0

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>📊 Reports</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>Revenue trends, expenses, date range filter</p>
        </div>
        <button onClick={exportCSV} disabled={exporting} style={{
          padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600,
          background:'#10b981', color:'#fff', border:'none', cursor:exporting?'not-allowed':'pointer',
          opacity: exporting?0.7:1,
        }}>{exporting?'Exporting...':'📥 Export CSV'}</button>
      </div>

      {/* Date filters */}
      <div style={{ display:'flex', gap:8, marginBottom:'1.25rem', flexWrap:'wrap', alignItems:'center' }}>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to) }} style={{
            padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600,
            cursor:'pointer', border:'1px solid var(--border)',
            background: from===p.from && to===p.to ? 'var(--accent)' : 'transparent',
            color: from===p.from && to===p.to ? '#fff' : 'var(--text-muted)',
          }}>{p.label}</button>
        ))}
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{
          padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)',
          background:'var(--bg-page)', color:'var(--text)', fontSize:13,
        }} />
        <span style={{ color:'var(--text-muted)' }}>→</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{
          padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)',
          background:'var(--bg-page)', color:'var(--text)', fontSize:13,
        }} />
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12, marginBottom:'1.5rem' }}>
        {loading ? [...Array(4)].map((_,i) => <SkeletonCard key={i} height={90} />) : <>
          {[
            ['💰 Total Revenue', fmt(totalRevenue), '#10b981'],
            ['🛒 Total Orders',  totalOrders,       '#6366f1'],
            ['📅 Avg/Day',       fmt(avgPerDay),     '#f59e0b'],
            ['💸 Expenses',      fmt(totalExpenses), '#ef4444'],
          ].map(([l,v,c]) => (
            <div key={l} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'1.25rem' }}>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:700, color:c }}>{v}</div>
            </div>
          ))}
        </>}
      </div>

      {/* Revenue chart */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'1.5rem', marginBottom:'1rem' }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:'1rem' }}>📈 Revenue Trend</div>
        {loading ? <SkeletonCard height={220} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--text-muted)' }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} tickFormatter={v => '₹'+Math.round(v/1000)+'K'} />
              <Tooltip formatter={v => fmt(v)} labelFormatter={l => `Date: ${l}`} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill:'#10b981', r:4 }} name="Revenue" />
              <Line type="monotone" dataKey="orders"  stroke="#6366f1" strokeWidth={2} dot={{ fill:'#6366f1', r:4 }} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Expenses chart */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'1.5rem' }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:'1rem' }}>💸 Expense Breakdown</div>
        {loading ? <SkeletonCard height={180} /> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={expenses} layout="vertical">
              <XAxis type="number" tick={{ fontSize:11, fill:'var(--text-muted)' }} tickFormatter={v => '₹'+Math.round(v/1000)+'K'} />
              <YAxis dataKey="category" type="category" tick={{ fontSize:11, fill:'var(--text-muted)' }} width={120} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
              <Bar dataKey="amount" fill="#ef4444" radius={[0,4,4,0]} name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
