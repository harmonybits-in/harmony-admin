// src/pages/Bills.jsx
import { useState, useEffect } from 'react'
import { billApi } from '../api/client'
import { useAuthStore } from '../store/authStore'

function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })
}

const MODES = ['ALL', 'CASH', 'UPI', 'CARD']

export default function Bills() {
  const rid = useAuthStore(s => s.restaurantId)
  const [bills, setBills]     = useState([])
  const [page, setPage]       = useState(0)
  const [total, setTotal]     = useState(0)
  const [totalPg, setTotalPg] = useState(1)
  const [loading, setLoading] = useState(true)
  const [mode, setMode]       = useState('ALL')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    load()
  }, [page, mode])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, size: 20 })
      if (mode !== 'ALL') params.set('paymentMode', mode)
      const res = await billApi.getAll(rid, params.toString())
      if (res?.content) {
        setBills(res.content)
        setTotal(res.totalElements || 0)
        setTotalPg(res.totalPages || 1)
      }
    } catch (_) {
      setBills(MOCK_BILLS)
      setTotal(5); setTotalPg(1)
    } finally {
      setLoading(false)
    }
  }

  const badge = (mode) => {
    const map = { CASH: '#10b981', UPI: '#6366f1', CARD: '#f59e0b' }
    const color = map[mode] || '#888'
    return (
      <span style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
        background: color + '20', color,
      }}>{mode || '—'}</span>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Bills</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>GET /api/v1/bills — paginated</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {MODES.map(m => (
            <button key={m} onClick={() => { setMode(m); setPage(0) }} style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
              fontSize: 12, cursor: 'pointer', fontWeight: mode === m ? 600 : 400,
              background: mode === m ? 'var(--accent-bg)' : 'var(--bg-card)',
              color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
            }}>{m}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Total */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)' }}>
          {total.toLocaleString('en-IN')} bills
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-page)' }}>
              {['Bill #', 'Customer', 'Items', 'Amount', 'Payment', 'Order Type', 'Date'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '10px 16px',
                  fontSize: 11, color: 'var(--text-muted)', fontWeight: 500,
                  borderBottom: '1px solid var(--border)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ height: 14, borderRadius: 4, background: 'var(--border)', width: j === 0 ? 40 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              : bills.map(b => (
                  <tr key={b.id} style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                      #{b.id}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      {b.customerName || b.phone || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {b.itemCount || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                      {fmt(b.total || b.finalAmount)}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      {badge(b.paymentMode)}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {b.orderType?.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page + 1} of {totalPg}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg-card)', cursor: page === 0 ? 'not-allowed' : 'pointer',
              fontSize: 12, color: 'var(--text-muted)', opacity: page === 0 ? 0.4 : 1,
            }}>← Prev</button>
            <button disabled={page >= totalPg - 1} onClick={() => setPage(p => p + 1)} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg-card)', cursor: page >= totalPg - 1 ? 'not-allowed' : 'pointer',
              fontSize: 12, color: 'var(--text-muted)', opacity: page >= totalPg - 1 ? 0.4 : 1,
            }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const MOCK_BILLS = [
  { id: 1001, customerName: 'Rahul Kumar', itemCount: 4, total: 850, paymentMode: 'UPI', orderType: 'DINE_IN', createdAt: new Date().toISOString() },
  { id: 1002, customerName: 'Priya Sharma', itemCount: 2, total: 320, paymentMode: 'CASH', orderType: 'PICKUP', createdAt: new Date().toISOString() },
  { id: 1003, customerName: 'Amit Verma', itemCount: 6, total: 1450, paymentMode: 'CARD', orderType: 'DINE_IN', createdAt: new Date().toISOString() },
  { id: 1004, customerName: 'Sneha Patel', itemCount: 3, total: 560, paymentMode: 'UPI', orderType: 'DELIVERY', createdAt: new Date().toISOString() },
  { id: 1005, customerName: 'Ravi Singh', itemCount: 1, total: 180, paymentMode: 'CASH', orderType: 'PICKUP', createdAt: new Date().toISOString() },
]
