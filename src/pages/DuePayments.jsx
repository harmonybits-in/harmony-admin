import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

const STATUS_STYLE = {
  PENDING:  { color: '#ef4444', bg: '#ef444422', label: 'Pending'  },
  PARTIAL:  { color: '#f59e0b', bg: '#f59e0b22', label: 'Partial'  },
  CLEARED:  { color: '#10b981', bg: '#10b98122', label: 'Cleared'  },
}

const FILTER_TABS = [
  { key: 'ALL',     label: 'All'     },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PARTIAL', label: 'Partial' },
  { key: 'CLEARED', label: 'Cleared' },
]

// ── Collect Modal ─────────────────────────────────────────────────────────
function CollectModal({ due, onClose, onDone, toast }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const remaining = (due.dueAmount || 0)

  async function handleSubmit(e) {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) return toast.error('Valid amount enter karo')
    if (amt > remaining + 0.01) return toast.error(`Max collect kar sakte ho: ${fmt(remaining)}`)
    setSaving(true)
    try {
      await api.patch(`/due-payments/${due.id}/collect?amount=${amt}`)
      toast.success(`${fmt(amt)} collected`)
      onDone()
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>💵 Collect Payment</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Customer info */}
        <div style={{ background: 'var(--bg-page)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{due.customerName || 'Unknown'}</div>
          {due.customerPhone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{due.customerPhone}</div>}
          {due.billNo && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Bill #{due.billNo}</div>}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Total: </span><strong>{fmt(due.totalAmount)}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Paid: </span><strong style={{ color: '#10b981' }}>{fmt(due.paidAmount)}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Due: </span><strong style={{ color: '#ef4444' }}>{fmt(remaining)}</strong></div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
              Amount to Collect (₹) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder={`Max ${fmt(remaining)}`} min="0.01" step="0.01" autoFocus
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-page)', color: 'var(--text)', fontSize: 15, fontWeight: 600,
                boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[remaining, remaining / 2].filter(v => v > 0).map((v, i) => (
                <button key={i} type="button" onClick={() => setAmount(String(Math.round(v * 100) / 100))}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>
                  {i === 0 ? 'Full' : 'Half'} ({fmt(Math.round(v * 100) / 100)})
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
                background: saving ? '#ccc' : '#10b981', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Saving…' : 'Collect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function DuePayments() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [all,       setAll]       = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('ALL')
  const [search,    setSearch]    = useState('')
  const [summary,   setSummary]   = useState({ totalPending: 0, pendingCount: 0 })
  const [collecting, setCollecting] = useState(null) // due object

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, sum] = await Promise.all([
        api.get('/due-payments'),
        api.get('/due-payments/summary'),
      ])
      setAll(Array.isArray(list) ? list : [])
      setSummary(sum || { totalPending: 0, pendingCount: 0 })
    } catch {
      setAll([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Filter + search
  const visible = all.filter(d => {
    if (filter !== 'ALL' && d.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (d.customerName || '').toLowerCase().includes(q)
        || (d.customerPhone || '').includes(q)
        || String(d.billNo || '').includes(q)
    }
    return true
  })

  // Tab counts
  const counts = { ALL: all.length, PENDING: 0, PARTIAL: 0, CLEARED: 0 }
  all.forEach(d => { if (counts[d.status] != null) counts[d.status]++ })

  // Totals for visible
  const totalDue   = visible.filter(d => d.status !== 'CLEARED').reduce((s, d) => s + (d.dueAmount || 0), 0)
  const totalPaid  = visible.reduce((s, d) => s + (d.paidAmount || 0), 0)

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>💳 Due Payments</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Customers ke baaki payments track karo aur collect karo
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Outstanding</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{fmt(summary.totalPending)}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Pending Bills</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{summary.pendingCount}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Partial Payments</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#6366f1' }}>{counts.PARTIAL}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Cleared</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{counts.CLEARED}</div>
        </div>
      </div>

      {/* Filters + Search */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          {/* Status tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTER_TABS.map(t => (
              <button key={t.key} onClick={() => setFilter(t.key)}
                style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                  borderColor: filter === t.key ? 'var(--accent)' : 'var(--border)',
                  background: filter === t.key ? '#e53e3e11' : 'transparent',
                  color: filter === t.key ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 12, fontWeight: filter === t.key ? 700 : 400 }}>
                {t.label} {counts[t.key] > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({counts[t.key]})</span>}
              </button>
            ))}
          </div>
          {/* Search */}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, bill#…"
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, width: 240 }} />
        </div>

        {/* Visible totals */}
        {!loading && visible.length > 0 && filter !== 'CLEARED' && (
          <div style={{ display: 'flex', gap: 20, marginBottom: 14, fontSize: 13, color: 'var(--text-muted)' }}>
            <span>Showing <strong style={{ color: 'var(--text)' }}>{visible.length}</strong> records</span>
            <span>Total Due: <strong style={{ color: '#ef4444' }}>{fmt(totalDue)}</strong></span>
            <span>Total Collected: <strong style={{ color: '#10b981' }}>{fmt(totalPaid)}</strong></span>
          </div>
        )}

        {/* Table */}
        {loading ? <SkeletonTable rows={5} /> : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14 }}>
              {filter === 'CLEARED' ? 'Koi cleared payment nahi' :
               search ? 'Koi result nahi mila' : 'Koi due payment nahi — sab clear hai!'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)',
                  fontSize: 11, textTransform: 'uppercase' }}>
                  {['Customer', 'Bill', 'Total', 'Paid', 'Due', 'Date', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(d => {
                  const ss = STATUS_STYLE[d.status] || STATUS_STYLE.PENDING
                  const isCleared = d.status === 'CLEARED'
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', opacity: isCleared ? 0.6 : 1 }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{d.customerName || '—'}</div>
                        {d.customerPhone && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.customerPhone}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {d.billNo ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{d.billNo}</span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{fmt(d.totalAmount)}</td>
                      <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 500 }}>{fmt(d.paidAmount)}</td>
                      <td style={{ padding: '10px 12px', color: isCleared ? 'var(--text-muted)' : '#ef4444', fontWeight: 700 }}>
                        {isCleared ? <span style={{ fontSize: 11 }}>—</span> : fmt(d.dueAmount)}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                        <div>{fmtDate(d.createdAt)}</div>
                        {d.clearedAt && <div style={{ fontSize: 11 }}>Cleared: {fmtDate(d.clearedAt)}</div>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                          background: ss.bg, color: ss.color }}>
                          {ss.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {!isCleared && (
                          <button onClick={() => setCollecting(d)}
                            style={{ padding: '5px 14px', borderRadius: 6, border: 'none',
                              background: '#10b98122', color: '#10b981', cursor: 'pointer',
                              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Collect
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collect modal */}
      {collecting && (
        <CollectModal due={collecting} toast={toast}
          onClose={() => setCollecting(null)}
          onDone={() => { setCollecting(null); load() }} />
      )}
    </div>
  )
}
