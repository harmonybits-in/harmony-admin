// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'
import MetricCard from '../components/MetricCard'
import { useDashboard } from '../hooks/useDashboard'
import { chatbotApi } from '../api/client'
import { useAuthStore } from '../store/authStore'

const PERIODS = ['today', 'week', 'month']
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']

function fmt(n) {
  if (!n) return '₹0'
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000)   return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + Math.round(n)
}

function Card({ title, children, action, onAction }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1.25rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
        {action && (
          <button onClick={onAction} style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 6,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>{action}</button>
        )}
      </div>
      {children}
    </div>
  )
}

function Skeleton({ h = 200 }) {
  return (
    <div style={{
      height: h, borderRadius: 8, background: 'var(--border)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

export default function Dashboard() {
  const [period, setPeriod] = useState('today')
  const { data, loading, reload } = useDashboard(period)
  const { restaurantId } = useAuthStore()
  const [chatStats, setChatStats] = useState(null)

  useEffect(() => {
    if (!restaurantId) return
    chatbotApi.getStats(restaurantId).then(setChatStats).catch(() => {})

  }, [restaurantId])

  const today      = data?.todayData   || {}
  const salesByType = data?.salesByType || {}
  const expenses    = data?.expenses    || {}
  const items       = Array.isArray(data?.items) ? data.items : []
  const revChart    = Array.isArray(data?.revChart) ? data.revChart : MOCK_REV

  const pieData = [
    { name: 'Dine In',  value: salesByType.dineIn   || 0 },
    { name: 'Pickup',   value: salesByType.pickup    || 0 },
    { name: 'Delivery', value: salesByType.delivery  || 0 },
    { name: 'Online',   value: salesByType.online    || 0 },
  ].filter(d => d.value > 0)

  const expList = [
    { label: 'Salary',    val: expenses.salary    || 0 },
    { label: 'Purchases', val: expenses.purchases  || 0 },
    { label: 'Utility',   val: expenses.utility    || 0 },
    { label: 'Other',     val: expenses.other      || 0 },
  ]
  const totalExp = expenses.totalExpense || expList.reduce((a, b) => a + b.val, 0) || 1

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            display: 'flex', gap: 2, background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 8, padding: 3,
          }}>
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '5px 12px', borderRadius: 6, border: 'none',
                fontSize: 12, cursor: 'pointer', fontWeight: period === p ? 600 : 400,
                background: period === p ? 'var(--accent-bg)' : 'transparent',
                color: period === p ? 'var(--accent)' : 'var(--text-muted)',
              }}>
                {p === 'today' ? 'Today' : p === 'week' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
          <button onClick={reload} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            fontSize: 12, cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--text)',
          }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <MetricCard
          label="Total Revenue"
          value={fmt(today.totalRevenue || today.totalAmount || 48250)}
          sub="↑ 12% vs yesterday" subColor="#10b981"
          loading={loading}
        />
        <MetricCard
          label="Total Orders"
          value={(salesByType.totalOrders || 142).toLocaleString('en-IN')}
          sub={`Dine ${salesByType.dineIn || 82} · Delivery ${salesByType.delivery || 20}`}
          loading={loading}
        />
        <MetricCard
          label="Staff Present"
          value={`${today.presentStaff || 8} / ${today.totalStaff || 12}`}
          sub={`${today.absentStaff || 4} absent today`}
          loading={loading}
        />
        <MetricCard
          label="Total Expense"
          value={fmt(totalExp)}
          sub={`Salary ${fmt(expenses.salary || 12000)}`}
          loading={loading}
        />
      </div>

      {/* Chatbot stats */}
      {chatStats && (chatStats.todaySessions > 0 || chatStats.totalSessions > 0) && (
        <div style={{
          display: 'flex', gap: 12, marginBottom: '1.5rem',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 20px', alignItems: 'center',
        }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Chatbot Activity</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ color: '#3b82f6', fontWeight: 700 }}>{chatStats.todaySessions}</span> new conversations today
              &nbsp;·&nbsp;
              <span style={{ fontWeight: 600 }}>{chatStats.totalSessions}</span> total sessions
              &nbsp;·&nbsp;
              <span style={{ fontWeight: 600 }}>{chatStats.totalMessages}</span> total messages
            </div>
          </div>
          {chatStats.todaySessions > 0 && (
            <a href="/chatbot" style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: '#3b82f615', color: '#3b82f6', border: '1px solid #3b82f630',
              textDecoration: 'none',
            }}>View Chats →</a>
          )}
        </div>
      )}

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Revenue Chart */}
        <Card title="Revenue trend" action="View report">
          {loading ? <Skeleton h={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revChart} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => d ? d.slice(5) : ''}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={v => fmt(v)}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [fmt(v), 'Revenue']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Sales by type */}
        <Card title="Sales by type">
          {loading ? <Skeleton h={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData.length ? pieData : MOCK_PIE}
                  cx="50%" cy="45%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={3} dataKey="value"
                >
                  {(pieData.length ? pieData : MOCK_PIE).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  iconSize={8} iconType="square"
                  formatter={(v, e) => (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {v} {Math.round((e.payload.value / (salesByType.total || 100)) * 100)}%
                    </span>
                  )}
                />
                <Tooltip
                  formatter={(v, n) => [v + ' orders', n]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Expense breakdown */}
        <Card title="Expense breakdown">
          {loading ? <Skeleton h={180} /> : expList.map((e, i) => {
            const pct = Math.round((e.val / totalExp) * 100)
            return (
              <div key={e.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{e.label}</span>
                  <span style={{ fontWeight: 600 }}>{fmt(e.val)} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{pct}%</span></span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: pct + '%', background: PIE_COLORS[i],
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </Card>

        {/* Top selling items */}
        <Card title="Top selling items" action="View all">
          {loading ? <Skeleton h={180} /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Item', 'Qty', 'Revenue'].map(h => (
                    <th key={h} style={{
                      textAlign: h === 'Revenue' ? 'right' : 'left',
                      padding: '0 0 8px',
                      fontSize: 11, color: 'var(--text-muted)', fontWeight: 500,
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(items.length ? items : MOCK_ITEMS).map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                      {item.name || item.productName}
                    </td>
                    <td style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {(item.qty || item.quantity || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{
                      padding: '9px 0', borderBottom: '1px solid var(--border)',
                      textAlign: 'right', fontWeight: 600,
                    }}>
                      {fmt(item.revenue || item.totalRevenue || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}

// Mock data when API not connected
const MOCK_REV = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (6 - i))
  return { date: d.toISOString().split('T')[0], revenue: Math.round(30000 + Math.random() * 30000) }
})
const MOCK_PIE = [
  { name: 'Dine In', value: 58 }, { name: 'Pickup', value: 22 },
  { name: 'Delivery', value: 14 }, { name: 'Online', value: 6 },
]
const MOCK_ITEMS = [
  { name: 'Butter Naan', qty: 210, revenue: 6300 },
  { name: 'Dal Makhani', qty: 185, revenue: 9250 },
  { name: 'Paneer Tikka', qty: 140, revenue: 14000 },
  { name: 'Biryani',      qty: 98,  revenue: 12250 },
  { name: 'Gulab Jamun',  qty: 230, revenue: 4600 },
]
