// src/pages/Reports.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { api } from '../api/client'
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

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function EmptyChart({ height = 180, message = 'Is period mein koi data nahi' }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)', fontSize: 13, flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 28 }}>📊</span>
      {message}
    </div>
  )
}

export default function Reports() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [from,       setFrom]       = useState(daysAgo(6))
  const [to,         setTo]         = useState(today())
  const [revenue,    setRevenue]    = useState([])
  const [expenses,   setExpenses]   = useState([])
  const [salesByType,setSalesByType]= useState([])
  const [topItems,   setTopItems]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [exporting,  setExporting]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rev, exp, sbt, items] = await Promise.allSettled([
        api.get(`/dashboard/revenue-chart?restaurantId=${rid}&from=${from}&to=${to}`),
        api.get(`/dashboard/expenses?restaurantId=${rid}&from=${from}&to=${to}`),
        api.get(`/dashboard/sales-by-type?restaurantId=${rid}&from=${from}&to=${to}`),
        api.get(`/dashboard/item-wise-sales?restaurantId=${rid}&from=${from}&to=${to}&limit=10`),
      ])

      // Revenue — array of { date, revenue, orders }
      setRevenue(rev.status === 'fulfilled' && Array.isArray(rev.value) ? rev.value : [])

      // Expenses — object { salary, purchases, totalExpense } → convert to chart array
      if (exp.status === 'fulfilled' && exp.value && typeof exp.value === 'object') {
        const e = exp.value
        const rows = []
        if (e.salary    > 0) rows.push({ category: 'Staff Salary',    amount: e.salary    })
        if (e.purchases > 0) rows.push({ category: 'Raw Material',    amount: e.purchases })
        if (e.utility   > 0) rows.push({ category: 'Utility',         amount: e.utility   })
        if (e.other     > 0) rows.push({ category: 'Other',           amount: e.other     })
        setExpenses(rows)
      } else { setExpenses([]) }

      // Sales by type — object { DINE_IN, TAKEAWAY, DELIVERY, ONLINE } or array
      if (sbt.status === 'fulfilled' && sbt.value) {
        const v = sbt.value
        if (Array.isArray(v)) {
          setSalesByType(v)
        } else {
          const rows = Object.entries(v)
            .filter(([, val]) => Number(val) > 0)
            .map(([type, amount]) => ({ type, amount: Number(amount) }))
          setSalesByType(rows)
        }
      } else { setSalesByType([]) }

      // Top items — array of { productName, quantity, revenue }
      setTopItems(items.status === 'fulfilled' && Array.isArray(items.value) ? items.value : [])

    } catch (err) {
      toast.error('Reports load nahi hue')
    } finally { setLoading(false) }
  }, [rid, from, to])

  useEffect(() => { load() }, [load])

  function exportCSV() {
    setExporting(true)
    try {
      const rows = [
        ['Date', 'Revenue (₹)', 'Orders'],
        ...revenue.map(r => [r.date, r.revenue, r.orders ?? '']),
      ]
      const csv  = rows.map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `revenue-${from}-to-${to}.csv`; a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported!')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const totalRevenue  = revenue.reduce((a, r) => a + (r.revenue || 0), 0)
  const totalOrders   = revenue.reduce((a, r) => a + (r.orders  || 0), 0)
  const totalExpenses = expenses.reduce((a, e) => a + (e.amount  || 0), 0)
  const avgPerDay     = revenue.length ? Math.round(totalRevenue / revenue.length) : 0
  const profit        = totalRevenue - totalExpenses

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>📊 Reports</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Revenue, expenses, orders — date range filter ke saath
          </p>
        </div>
        <button onClick={exportCSV} disabled={exporting || revenue.length === 0} style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: '#10b981', color: '#fff', border: 'none',
          cursor: exporting || revenue.length === 0 ? 'not-allowed' : 'pointer',
          opacity: exporting || revenue.length === 0 ? 0.6 : 1,
        }}>
          {exporting ? 'Exporting…' : '📥 Export CSV'}
        </button>
      </div>

      {/* Date filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to) }} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: '1px solid var(--border)',
            background: from === p.from && to === p.to ? 'var(--accent)' : 'transparent',
            color: from === p.from && to === p.to ? '#fff' : 'var(--text-muted)',
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {loading ? [...Array(5)].map((_, i) => <SkeletonCard key={i} height={90} />) : [
          { label: '💰 Revenue',    value: fmt(totalRevenue),  color: '#10b981' },
          { label: '🛒 Orders',     value: totalOrders,        color: '#6366f1' },
          { label: '📅 Avg/Day',    value: fmt(avgPerDay),     color: '#f59e0b' },
          { label: '💸 Expenses',   value: fmt(totalExpenses), color: '#ef4444' },
          { label: '📈 Profit',     value: fmt(profit),        color: profit >= 0 ? '#10b981' : '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Revenue trend */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>📈 Revenue Trend</div>
        {loading ? <SkeletonCard height={220} /> : revenue.length === 0 ? <EmptyChart height={220} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => '₹' + Math.round(v / 1000) + 'K'} />
              <Tooltip formatter={v => fmt(v)} labelFormatter={l => `Date: ${l}`}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Revenue" />
              <Line type="monotone" dataKey="orders"  stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom row — expenses + sales by type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* Expense breakdown */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>💸 Expense Breakdown</div>
          {loading ? <SkeletonCard height={180} /> : expenses.length === 0 ? <EmptyChart height={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={expenses} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={v => '₹' + Math.round(v / 1000) + 'K'} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={110} />
                <Tooltip formatter={v => fmt(v)}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="amount" fill="#ef4444" radius={[0, 4, 4, 0]} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sales by type */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>🍽️ Sales by Order Type</div>
          {loading ? <SkeletonCard height={180} /> : salesByType.length === 0 ? <EmptyChart height={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={salesByType} dataKey="amount" nameKey="type"
                  cx="50%" cy="50%" outerRadius={70} label={({ type, percent }) =>
                    `${type} ${(percent * 100).toFixed(0)}%`}>
                  {salesByType.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => fmt(v)}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top selling items */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>🏆 Top Selling Items</div>
        {loading ? <SkeletonCard height={200} /> : topItems.length === 0 ? <EmptyChart height={160} /> : (
          <div>
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
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-muted)', width: 36 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                        {item.productName || item.name || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6366f1', fontWeight: 700 }}>
                        {item.quantity ?? item.qty ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 700 }}>
                        {fmt(item.revenue || item.totalRevenue || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
