// src/pages/CashRegister.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast }     from '../hooks/useToast'

const BASE = import.meta.env.VITE_API_URL || ''

function authHeaders() {
  const { token } = useAuthStore.getState()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

// ── Variance badge ─────────────────────────────────────────────────────────
function VarianceBadge({ variance }) {
  if (variance == null) return null
  const v = Number(variance)
  const color  = v > 0 ? '#10b981' : v < 0 ? '#ef4444' : '#6b7280'
  const label  = v > 0 ? `+${fmt(v)} excess` : v < 0 ? `${fmt(v)} shortage` : 'Balanced ✓'
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: color + '22', color }}>
      {label}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '1rem 1.25rem', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
        letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Open Shift Form ────────────────────────────────────────────────────────
function OpenShiftForm({ onOpened }) {
  const toast = useToast()
  const { name, email } = useAuthStore(s => ({ name: s.name, email: s.email }))
  const [balance, setBalance] = useState('')
  const [notes,   setNotes]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleOpen() {
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/v1/shifts/open`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          openingBalance: parseFloat(balance) || 0,
          staffName: name || email || 'Cashier',
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Shift open nahi hua')
      }
      const shift = await res.json()
      toast.success('Shift open ho gayi! 🟢')
      onOpened(shift)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, width: '100%',
  }

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', background: 'var(--bg-card)',
      border: '1px solid var(--border)', borderRadius: 14, padding: '2rem' }}>
      <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>🏪</div>
      <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
        Shift Kholein
      </h2>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
        Cash drawer mein kitna cash hai abhi?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
            display: 'block', marginBottom: 4 }}>OPENING BALANCE (₹)</label>
          <input type="number" min="0" step="0.01" placeholder="e.g. 5000"
            value={balance} onChange={e => setBalance(e.target.value)}
            style={{ ...inp, fontSize: 20, fontWeight: 700 }} autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
            display: 'block', marginBottom: 4 }}>NOTES (optional)</label>
          <input type="text" placeholder="e.g. Morning shift"
            value={notes} onChange={e => setNotes(e.target.value)} style={inp} />
        </div>
        <button onClick={handleOpen} disabled={loading} style={{
          marginTop: 6, padding: '11px', borderRadius: 8, border: 'none',
          background: loading ? '#ccc' : '#10b981', color: '#fff',
          fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? '⏳ Opening...' : '🟢 Shift Kholein'}
        </button>
      </div>
    </div>
  )
}

// ── Active Shift View ──────────────────────────────────────────────────────
function ActiveShiftView({ data, onClose }) {
  const toast = useToast()
  const { shift } = data
  const [tab,            setTab]            = useState('overview') // 'overview' | 'close'
  const [closingBalance, setClosingBalance] = useState('')
  const [closeNotes,     setCloseNotes]     = useState('')
  const [loading,        setLoading]        = useState(false)

  const cashSales    = data.cashSalesLive    || 0
  const upiSales     = data.upiSalesLive     || 0
  const cardSales    = data.cardSalesLive    || 0
  const totalSales   = data.totalSalesLive   || 0
  const totalBills   = data.totalBillsLive   || 0
  const expectedCash = data.expectedCashLive || 0

  const previewVariance = closingBalance !== ''
    ? Number(closingBalance) - expectedCash : null

  async function handleClose() {
    if (closingBalance === '') { toast.error('Closing balance enter karo'); return }
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/v1/shifts/${shift.id}/close`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          closingBalance: parseFloat(closingBalance) || 0,
          notes: closeNotes.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Shift close nahi hua')
      }
      const closed = await res.json()
      toast.success('Shift close ho gayi! 🔴')
      onClose(closed)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-card)', color: 'var(--text)', fontSize: 14, width: '100%',
  }

  return (
    <div>
      {/* Shift header */}
      <div style={{ background: '#10b98120', border: '1px solid #10b981',
        borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981',
            letterSpacing: '0.06em' }}>🟢 SHIFT OPEN</span>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>
            #{shift.id} — {shift.staffName || 'Cashier'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
            Started: {fmtDt(shift.openedAt)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Opening Balance</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(shift.openingBalance)}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <StatCard label="CASH SALES"   value={fmt(cashSales)}  color="#10b981"
          sub={`Expected in drawer: ${fmt(expectedCash)}`} />
        <StatCard label="UPI SALES"    value={fmt(upiSales)}   color="#6366f1" />
        <StatCard label="CARD SALES"   value={fmt(cardSales)}  color="#f59e0b" />
        <StatCard label="TOTAL BILLS"  value={totalBills}      />
        <StatCard label="TOTAL SALES"  value={fmt(totalSales)} color="var(--accent)" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1rem' }}>
        {[['overview','📊 Overview'], ['close','🔴 Close Shift']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 13,
            fontWeight: tab === t ? 700 : 400, cursor: 'pointer',
            background: tab === t ? 'var(--accent)' : 'var(--bg-secondary)',
            color: tab === t ? '#fff' : 'var(--text)',
          }}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '1.25rem' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
            letterSpacing: '0.06em', marginBottom: 12 }}>PAYMENT BREAKDOWN</div>
          {[
            ['💵 Cash',  cashSales,  '#10b981'],
            ['📱 UPI',   upiSales,   '#6366f1'],
            ['💳 Card',  cardSales,  '#f59e0b'],
            ['🌐 Other', Math.max(0, totalSales - cashSales - upiSales - cardSales), '#888'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '8px 0',
              borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <span>{label}</span>
              <span style={{ fontWeight: 600, color }}>{fmt(val)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '10px 0', fontSize: 15, fontWeight: 700 }}>
            <span>Total</span>
            <span>{fmt(totalSales)}</span>
          </div>
          <div style={{ marginTop: 10, padding: '10px 12px',
            background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cash in drawer (expected)</span>
              <span style={{ fontWeight: 600 }}>{fmt(expectedCash)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              = Opening {fmt(shift.openingBalance)} + Cash sales {fmt(cashSales)}
            </div>
          </div>
        </div>
      )}

      {tab === 'close' && (
        <div style={{ background: 'var(--bg-card)', border: '2px solid #ef4444',
          borderRadius: 10, padding: '1.25rem', maxWidth: 440 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444',
            letterSpacing: '0.06em', marginBottom: 14 }}>🔴 SHIFT BAND KAREIN</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                display: 'block', marginBottom: 4 }}>ACTUAL CASH IN DRAWER (₹)</label>
              <input type="number" min="0" step="0.01"
                placeholder="Drawer mein actually kitna cash hai?"
                value={closingBalance} onChange={e => setClosingBalance(e.target.value)}
                style={{ ...inp, fontSize: 18, fontWeight: 700 }} autoFocus />
            </div>

            {/* Live variance preview */}
            {previewVariance !== null && (
              <div style={{ padding: '10px 12px', borderRadius: 8,
                background: previewVariance >= 0 ? '#10b98115' : '#ef444415',
                border: `1px solid ${previewVariance >= 0 ? '#10b981' : '#ef4444'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Expected</span>
                  <span style={{ fontWeight: 600 }}>{fmt(expectedCash)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Actual</span>
                  <span style={{ fontWeight: 600 }}>{fmt(closingBalance)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: 14, fontWeight: 700, borderTop: '1px dashed var(--border)',
                  paddingTop: 6, marginTop: 4 }}>
                  <span>Variance</span>
                  <VarianceBadge variance={previewVariance} />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                display: 'block', marginBottom: 4 }}>NOTES (optional)</label>
              <input type="text" placeholder="Closing note..."
                value={closeNotes} onChange={e => setCloseNotes(e.target.value)} style={inp} />
            </div>

            <button onClick={handleClose} disabled={loading} style={{
              padding: '11px', borderRadius: 8, border: 'none',
              background: loading ? '#ccc' : '#ef4444', color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? '⏳ Closing...' : '🔴 Shift Band Karein'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shift History ──────────────────────────────────────────────────────────
function ShiftHistory() {
  const toast  = useToast()
  const [shifts,   setShifts]   = useState([])
  const [page,     setPage]     = useState(0)
  const [totalPg,  setTotalPg]  = useState(1)
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${BASE}/api/v1/shifts?page=${page}&size=15`,
        { headers: authHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setShifts(data.content || [])
      setTotalPg(data.totalPages || 1)
    } catch {
      toast.error('History load nahi hua')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-page)' }}>
              {['#', 'Cashier', 'Opened', 'Closed', 'Opening', 'Cash Sales',
                'Expected', 'Actual', 'Variance', 'Total Bills'].map(h => (
                <th key={h} style={{ padding: '10px 12px', fontSize: 11, textAlign: 'left',
                  color: 'var(--text-muted)', fontWeight: 600,
                  borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ height: 12, borderRadius: 4, background: 'var(--border)', width: 70 }} />
                    </td>
                  ))}</tr>
                ))
              : shifts.map(s => (
                  <tr key={s.id}
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent)' }}>
                      #{s.id}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{s.staffName || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)',
                      whiteSpace: 'nowrap' }}>{fmtDt(s.openedAt)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)',
                      whiteSpace: 'nowrap' }}>
                      {s.status === 'OPEN'
                        ? <span style={{ color: '#10b981', fontWeight: 600 }}>🟢 Open</span>
                        : fmtDt(s.closedAt)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{fmt(s.openingBalance)}</td>
                    <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 600 }}>{fmt(s.cashSales)}</td>
                    <td style={{ padding: '10px 12px' }}>{fmt(s.expectedCash)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {s.closingBalance != null ? fmt(s.closingBalance) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {s.status === 'CLOSED' ? <VarianceBadge variance={s.variance} /> : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{s.totalBills ?? '—'}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {!loading && shifts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏪</div>
            Abhi tak koi shift close nahi hua
          </div>
        )}

        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Page {page + 1} of {totalPg}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--bg-card)', cursor: page === 0 ? 'not-allowed' : 'pointer',
                fontSize: 12, opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
            <button disabled={page >= totalPg - 1} onClick={() => setPage(p => p + 1)}
              style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--bg-card)', cursor: page >= totalPg - 1 ? 'not-allowed' : 'pointer',
                fontSize: 12, opacity: page >= totalPg - 1 ? 0.4 : 1 }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CashRegister() {
  const toast = useToast()
  const [tab,        setTab]        = useState('shift')  // 'shift' | 'history'
  const [activeData, setActiveData] = useState(null)     // null = loading, {active:false} = no shift
  const [loading,    setLoading]    = useState(true)

  const loadActive = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/v1/shifts/active`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      setActiveData(await res.json())
    } catch {
      setActiveData({ active: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadActive() }, [loadActive])

  const isOpen = activeData?.active === true

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>🏪 Cash Register</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Shift management — opening balance, closing balance, cash variance
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          ['shift',   isOpen ? '🟢 Current Shift' : '🏪 Open Shift'],
          ['history', '📋 History'],
        ].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 18px', borderRadius: '8px 8px 0 0', border: 'none',
            fontSize: 13, fontWeight: tab === t ? 700 : 400, cursor: 'pointer',
            background: tab === t ? 'var(--bg-card)' : 'transparent',
            color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: '-1px',
          }}>{l}</button>
        ))}
      </div>

      {tab === 'shift' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Loading...
          </div>
        ) : isOpen ? (
          <ActiveShiftView
            data={activeData}
            onClose={closed => {
              setActiveData({ active: false })
              setTab('history')
            }}
          />
        ) : (
          <OpenShiftForm onOpened={shift => {
            setActiveData({ active: true, shift, cashSalesLive: 0, upiSalesLive: 0,
              cardSalesLive: 0, totalSalesLive: 0, totalBillsLive: 0,
              expectedCashLive: shift.openingBalance || 0 })
          }} />
        )
      )}

      {tab === 'history' && <ShiftHistory />}
    </div>
  )
}
