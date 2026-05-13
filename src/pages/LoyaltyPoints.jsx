import { useState, useEffect, useCallback } from 'react'
import { api, customerApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN') }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }

// ── Balance lookup card ───────────────────────────────────────────────────
function BalanceCard({ rid, toast }) {
  const [phone,   setPhone]   = useState('')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [redeem,  setRedeem]  = useState(false)
  const [points,  setPoints]  = useState('')
  const [saving,  setSaving]  = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true); setResult(null)
    try {
      const data = await api.get(`/loyalty/balance/${phone.trim()}`)
      setResult(data)
    } catch (err) {
      toast.error(err.message?.includes('404') || err.message?.includes('not found')
        ? 'Customer nahi mila is number pe'
        : err.message || 'Failed')
    } finally { setLoading(false) }
  }

  async function handleRedeem(e) {
    e.preventDefault()
    const pts = Number(points)
    if (!pts || pts <= 0) return toast.error('Valid points enter karo')
    if (pts > result.loyaltyPoints) return toast.error(`Max ${result.loyaltyPoints} points redeem ho sakte hain`)
    setSaving(true)
    try {
      const res = await api.post('/loyalty/redeem', { customerPhone: phone.trim(), pointsToRedeem: pts })
      toast.success(`${pts} points redeemed — ₹${res.discountAmount} discount`)
      setResult(r => ({ ...r, loyaltyPoints: res.availablePoints }))
      setRedeem(false); setPoints('')
    } catch (err) { toast.error(err.message || 'Redeem failed') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>🔍 Check Customer Balance</h3>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="Customer phone number…" type="tel"
          style={{ flex: 1, minWidth: 200, padding: '9px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-page)',
            color: 'var(--text)', fontSize: 13 }} />
        <button type="submit" disabled={loading}
          style={{ padding: '9px 20px', borderRadius: 8, border: 'none',
            background: loading ? '#ccc' : 'var(--accent)', color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 16, padding: '14px 18px', borderRadius: 10,
          background: 'var(--bg-page)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{result.name || 'Customer'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{result.phone}</div>
              <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loyalty Points</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{result.loyaltyPoints ?? 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>= {fmt(result.loyaltyPoints ?? 0)} discount</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Visits</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#6366f1' }}>{result.totalVisits ?? 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Spend</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{fmt(result.totalSpend)}</div>
                </div>
              </div>
            </div>
            {(result.loyaltyPoints ?? 0) > 0 && !redeem && (
              <button onClick={() => setRedeem(true)}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: '#f59e0b', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Redeem Points
              </button>
            )}
          </div>

          {redeem && (
            <form onSubmit={handleRedeem} style={{ marginTop: 14, padding: '12px 16px',
              borderRadius: 8, background: '#f59e0b11', border: '1px solid #f59e0b33' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#f59e0b' }}>
                Redeem Points (1 point = ₹1 discount)
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="number" value={points} onChange={e => setPoints(e.target.value)}
                  placeholder={`Max ${result.loyaltyPoints}`} min="1" max={result.loyaltyPoints}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg-page)', color: 'var(--text)', fontSize: 14, width: 140 }} />
                <button type="button" onClick={() => setPoints(String(result.loyaltyPoints))}
                  style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                  All ({result.loyaltyPoints})
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none',
                    background: saving ? '#ccc' : '#f59e0b', color: '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {saving ? 'Redeeming…' : 'Confirm Redeem'}
                </button>
                <button type="button" onClick={() => { setRedeem(false); setPoints('') }}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

// ── Top customers table ───────────────────────────────────────────────────
export default function LoyaltyPoints() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(0)
  const [total,     setTotal]     = useState(0)
  const PAGE_SIZE = 20

  const load = useCallback(async (p = 0, q = '') => {
    setLoading(true)
    try {
      const params = `page=${p}&size=${PAGE_SIZE}&sort=loyaltyPoints,desc${q ? `&search=${encodeURIComponent(q)}` : ''}`
      const data = await customerApi.getAll(rid, params)
      const list = Array.isArray(data) ? data : (data?.content ?? [])
      const totalEl = data?.totalElements ?? list.length
      setCustomers(list)
      setTotal(totalEl)
    } catch { setCustomers([]) }
    finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load(0, search) }, [load])

  function handleSearch(e) {
    e.preventDefault()
    setPage(0); load(0, search)
  }

  // Stats
  const totalPoints = customers.reduce((s, c) => s + (c.loyaltyPoints || 0), 0)
  const withPoints  = customers.filter(c => (c.loyaltyPoints || 0) > 0).length

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>⭐ Loyalty Points</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Customer loyalty points check karo aur redeem karo
        </p>
      </div>

      {/* Balance lookup */}
      <BalanceCard rid={rid} toast={toast} />

      {/* Summary */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Customers', value: total,       color: '#6366f1' },
            { label: 'With Points',     value: withPoints,  color: '#f59e0b' },
            { label: 'Points (Page)',   value: totalPoints, color: '#10b981' },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value.toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Customer list */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }} />
          <button type="submit"
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
            Search
          </button>
        </form>

        {loading ? <SkeletonTable rows={6} /> : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Koi customer nahi mila
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)',
                    fontSize: 11, textTransform: 'uppercase' }}>
                    {['Customer', 'Phone', 'Loyalty Points', 'Value', 'Visits', 'Total Spend', 'Last Visit'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.name || '—'}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{c.phone}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 16, fontWeight: 800,
                          color: (c.loyaltyPoints || 0) > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                          {c.loyaltyPoints ?? 0}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>pts</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#f59e0b', fontWeight: 600 }}>
                        {(c.loyaltyPoints || 0) > 0 ? fmt(c.loyaltyPoints) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{c.totalVisits ?? 0}</td>
                      <td style={{ padding: '10px 12px', color: '#10b981' }}>{fmt(c.totalSpend)}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {fmtDate(c.lastVisit || c.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <button disabled={page === 0} onClick={() => { setPage(p => p-1); load(page-1, search) }}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text)', cursor: page === 0 ? 'not-allowed' : 'pointer',
                    opacity: page === 0 ? 0.4 : 1, fontSize: 13 }}>
                  ← Prev
                </button>
                <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
                </span>
                <button disabled={(page + 1) * PAGE_SIZE >= total}
                  onClick={() => { setPage(p => p+1); load(page+1, search) }}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text)',
                    cursor: (page+1)*PAGE_SIZE >= total ? 'not-allowed' : 'pointer',
                    opacity: (page+1)*PAGE_SIZE >= total ? 0.4 : 1, fontSize: 13 }}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 14, padding: '10px 16px', borderRadius: 8,
        background: 'var(--accent-bg)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
        💡 <strong>1 point = ₹1 discount.</strong> Points automatically milte hain billing ke time. Earning rate Settings mein configure karo.
      </div>
    </div>
  )
}
