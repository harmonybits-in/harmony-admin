/**
 * Cash Drawer Management
 * Route: /cash-drawer
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

const ENTRY_TYPES = ['CASH_IN', 'CASH_OUT', 'SALE', 'REFUND', 'EXPENSE', 'ADJUSTMENT']

// ── Sub-components ────────────────────────────────────────────────────────────

function Inp({ label, value, onChange, type = 'text', placeholder = '', required = false }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--bg-page)',
          color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

function Modal({ title, onClose, children, onSubmit, saving, submitLabel = 'Save' }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, padding: 24, width: '100%',
        maxWidth: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
          >×</button>
        </div>
        <form onSubmit={onSubmit}>
          {children}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
              }}
            >Cancel</button>
            <button
              type="submit" disabled={saving}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: saving ? '#9ca3af' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >{saving ? 'Saving…' : submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Badge({ text, color }) {
  return (
    <span style={{
      fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600,
      background: color + '22', color,
    }}>{text}</span>
  )
}

function Rupee({ amount }) {
  return <span>₹{Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
}

function fmtTime(s) {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const ENTRY_COLORS = {
  CASH_IN:    '#10b981',
  SALE:       '#10b981',
  CASH_OUT:   '#ef4444',
  REFUND:     '#ef4444',
  EXPENSE:    '#f59e0b',
  ADJUSTMENT: '#6366f1',
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CashDrawerMgmt() {
  const { token, restaurantId } = useAuthStore()
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const [session, setSession]         = useState(null)   // current open session or null
  const [entries, setEntries]         = useState([])
  const [recon, setRecon]             = useState(null)
  const [sessions, setSessions]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // Modal state
  const [openModal, setOpenModal]     = useState(false)  // open drawer modal
  const [closeModal, setCloseModal]   = useState(false)  // close drawer modal
  const [entryModal, setEntryModal]   = useState(false)  // add entry modal
  const [saving, setSaving]           = useState(false)

  // Forms
  const [openForm, setOpenForm]       = useState({ openingBalance: '', staffId: '', notes: '' })
  const [closeForm, setCloseForm]     = useState({ closingBalance: '', notes: '' })
  const [entryForm, setEntryForm]     = useState({ type: 'CASH_IN', amount: '', note: '' })

  const [expandedSession, setExpanded] = useState(null)
  const [sessionEntries, setSessionEntries] = useState({})

  const loadCurrent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/cash-drawer/current?restaurantId=${restaurantId}`, { headers })
      if (res.status === 404 || res.status === 204) {
        setSession(null)
      } else if (!res.ok) {
        throw new Error(`Error ${res.status}`)
      } else {
        const data = await res.json()
        setSession(data)
        // Load entries and reconciliation for the open session
        const [eRes, rRes] = await Promise.allSettled([
          fetch(`${BASE}/cash-drawer/sessions/${data.id}/entries?restaurantId=${restaurantId}`, { headers }),
          fetch(`${BASE}/cash-drawer/sessions/${data.id}/reconcile?restaurantId=${restaurantId}`, { headers }),
        ])
        if (eRes.status === 'fulfilled' && eRes.value.ok) {
          const eData = await eRes.value.json()
          setEntries(Array.isArray(eData) ? eData : [])
        }
        if (rRes.status === 'fulfilled' && rRes.value.ok) {
          setRecon(await rRes.value.json())
        }
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, token])

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/cash-drawer/sessions?restaurantId=${restaurantId}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setSessions(Array.isArray(data) ? data : (data.content ?? []))
      }
    } catch { /* non-fatal */ }
  }, [restaurantId, token])

  useEffect(() => { loadCurrent(); loadSessions() }, [loadCurrent, loadSessions])

  // ── Open Drawer ────────────────────────────────────────────────────────────
  async function handleOpen(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${BASE}/cash-drawer/open`, {
        method: 'POST', headers,
        body: JSON.stringify({
          restaurantId,
          openingBalance: parseFloat(openForm.openingBalance) || 0,
          staffId: openForm.staffId || null,
          notes: openForm.notes || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Failed to open drawer') }
      setOpenModal(false)
      setOpenForm({ openingBalance: '', staffId: '', notes: '' })
      loadCurrent(); loadSessions()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  // ── Close Drawer ───────────────────────────────────────────────────────────
  async function handleClose(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${BASE}/cash-drawer/close`, {
        method: 'POST', headers,
        body: JSON.stringify({
          restaurantId,
          sessionId: session?.id,
          closingBalance: parseFloat(closeForm.closingBalance) || 0,
          notes: closeForm.notes || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Failed to close drawer') }
      setCloseModal(false)
      setCloseForm({ closingBalance: '', notes: '' })
      loadCurrent(); loadSessions()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  // ── Add Entry ──────────────────────────────────────────────────────────────
  async function handleAddEntry(e) {
    e.preventDefault()
    if (!entryForm.amount) { alert('Amount is required'); return }
    setSaving(true)
    try {
      const res = await fetch(`${BASE}/cash-drawer/sessions/${session.id}/entries?restaurantId=${restaurantId}`, {
        method: 'POST', headers,
        body: JSON.stringify({
          type: entryForm.type,
          amount: parseFloat(entryForm.amount),
          note: entryForm.note || null,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Failed to add entry') }
      setEntryModal(false)
      setEntryForm({ type: 'CASH_IN', amount: '', note: '' })
      loadCurrent()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  // ── Session history expand ─────────────────────────────────────────────────
  async function toggleSession(id) {
    if (expandedSession === id) { setExpanded(null); return }
    setExpanded(id)
    if (!sessionEntries[id]) {
      try {
        const res = await fetch(`${BASE}/cash-drawer/sessions/${id}/entries?restaurantId=${restaurantId}`, { headers })
        if (res.ok) {
          const data = await res.json()
          setSessionEntries(prev => ({ ...prev, [id]: Array.isArray(data) ? data : [] }))
        }
      } catch { /* ignore */ }
    }
  }

  const isOpen = session !== null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Cash Drawer Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Track cash in / out, sessions, and reconciliation
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Loading…
        </div>
      ) : error ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444', fontSize: 13 }}>{error}</div>
      ) : (
        <>
          {/* ── Status banner ──────────────────────────────────────────── */}
          <div style={{
            borderRadius: 12, padding: '18px 24px', marginBottom: '1.25rem',
            border: `1px solid ${isOpen ? '#10b98140' : 'var(--border)'}`,
            background: isOpen ? '#10b98110' : 'var(--bg-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: isOpen ? '#10b981' : '#6b7280',
                boxShadow: isOpen ? '0 0 0 4px #10b98130' : 'none',
                flexShrink: 0,
              }} />
              {isOpen ? (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#10b981' }}>Drawer is OPEN</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    Opening balance: <strong><Rupee amount={session.openingBalance} /></strong>
                    {session.openedAt && ` · Opened ${fmtTime(session.openedAt)}`}
                    {session.staffId && ` · By staff #${session.staffId}`}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-muted)' }}>Drawer Closed</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    No active session
                  </div>
                </div>
              )}
            </div>
            {isOpen ? (
              <button
                onClick={() => setCloseModal(true)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: '#ef4444', color: '#fff', fontWeight: 600, fontSize: 13,
                }}
              >Close Drawer</button>
            ) : (
              <button
                onClick={() => setOpenModal(true)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: '#10b981', color: '#fff', fontWeight: 600, fontSize: 13,
                }}
              >Open Drawer</button>
            )}
          </div>

          {/* ── Session entries + reconciliation ────────────────────────── */}
          {isOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start', marginBottom: '1.25rem' }}>
              {/* Entries table */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Session Entries</div>
                  <button
                    onClick={() => setEntryModal(true)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 12,
                    }}
                  >+ Add Entry</button>
                </div>
                {entries.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No entries yet in this session
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Type', 'Amount', 'Note', 'Time'].map(h => (
                          <th key={h} style={{
                            padding: '9px 12px', textAlign: 'left',
                            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((en, i) => (
                        <tr key={en.id ?? i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '9px 12px' }}>
                            <Badge text={en.type} color={ENTRY_COLORS[en.type] ?? '#6366f1'} />
                          </td>
                          <td style={{ padding: '9px 12px', fontWeight: 700, color: ENTRY_COLORS[en.type] ?? 'var(--text)' }}>
                            <Rupee amount={en.amount} />
                          </td>
                          <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{en.note ?? '—'}</td>
                          <td style={{ padding: '9px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtTime(en.createdAt ?? en.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Reconciliation card */}
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '16px 20px', minWidth: 240,
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Reconciliation</div>
                {[
                  { label: 'Opening Balance', value: recon?.openingBalance ?? session?.openingBalance, color: 'var(--text)' },
                  { label: 'Total Cash In',   value: recon?.totalCashIn,   color: '#10b981' },
                  { label: 'Total Cash Out',  value: recon?.totalCashOut,  color: '#ef4444' },
                  { label: 'Expected Closing', value: recon?.expectedClosingBalance, color: '#f59e0b', bold: true },
                ].map(r => (
                  <div key={r.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.label}</span>
                    <span style={{ fontSize: 14, fontWeight: r.bold ? 800 : 600, color: r.color }}>
                      <Rupee amount={r.value} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Session history ──────────────────────────────────────────── */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
              Session History
            </div>
            {sessions.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No past sessions found
              </div>
            ) : (
              sessions.map(s => (
                <div key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div
                    onClick={() => toggleSession(s.id)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                      <Badge
                        text={s.status ?? (s.closedAt ? 'CLOSED' : 'OPEN')}
                        color={s.closedAt ? '#6b7280' : '#10b981'}
                      />
                      <span>Opened: {fmtTime(s.openedAt)}</span>
                      {s.closedAt && <span style={{ color: 'var(--text-muted)' }}>Closed: {fmtTime(s.closedAt)}</span>}
                      <span style={{ color: 'var(--text-muted)' }}>Opening: <strong><Rupee amount={s.openingBalance} /></strong></span>
                      {s.closingBalance != null && (
                        <span style={{ color: 'var(--text-muted)' }}>Closing: <strong><Rupee amount={s.closingBalance} /></strong></span>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expandedSession === s.id ? '▲' : '▼'}</span>
                  </div>
                  {expandedSession === s.id && (
                    <div style={{ padding: '0 16px 14px' }}>
                      {!sessionEntries[s.id] ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>
                      ) : sessionEntries[s.id].length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No entries</div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              {['Type', 'Amount', 'Note', 'Time'].map(h => (
                                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sessionEntries[s.id].map((en, i) => (
                              <tr key={en.id ?? i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '6px 8px' }}><Badge text={en.type} color={ENTRY_COLORS[en.type] ?? '#6366f1'} /></td>
                                <td style={{ padding: '6px 8px', fontWeight: 600, color: ENTRY_COLORS[en.type] ?? 'var(--text)' }}><Rupee amount={en.amount} /></td>
                                <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{en.note ?? '—'}</td>
                                <td style={{ padding: '6px 8px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtTime(en.createdAt ?? en.timestamp)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── Open Drawer Modal ─────────────────────────────────────────────── */}
      {openModal && (
        <Modal title="Open Cash Drawer" onClose={() => setOpenModal(false)} onSubmit={handleOpen} saving={saving} submitLabel="Open Drawer">
          <Inp label="Opening Balance (₹)" value={openForm.openingBalance}
            onChange={e => setOpenForm(f => ({ ...f, openingBalance: e.target.value }))}
            type="number" placeholder="0.00" required />
          <Inp label="Staff ID (optional)" value={openForm.staffId}
            onChange={e => setOpenForm(f => ({ ...f, staffId: e.target.value }))}
            placeholder="Staff member ID" />
          <Inp label="Notes (optional)" value={openForm.notes}
            onChange={e => setOpenForm(f => ({ ...f, notes: e.target.value }))} />
        </Modal>
      )}

      {/* ── Close Drawer Modal ────────────────────────────────────────────── */}
      {closeModal && (
        <Modal title="Close Cash Drawer" onClose={() => setCloseModal(false)} onSubmit={handleClose} saving={saving} submitLabel="Close Drawer">
          <Inp label="Closing Balance (₹)" value={closeForm.closingBalance}
            onChange={e => setCloseForm(f => ({ ...f, closingBalance: e.target.value }))}
            type="number" placeholder="0.00" required />
          <Inp label="Notes (optional)" value={closeForm.notes}
            onChange={e => setCloseForm(f => ({ ...f, notes: e.target.value }))} />
        </Modal>
      )}

      {/* ── Add Entry Modal ───────────────────────────────────────────────── */}
      {entryModal && (
        <Modal title="Add Cash Entry" onClose={() => setEntryModal(false)} onSubmit={handleAddEntry} saving={saving} submitLabel="Add Entry">
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
              Entry Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={entryForm.type}
              onChange={e => setEntryForm(f => ({ ...f, type: e.target.value }))}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13,
              }}
            >
              {ENTRY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <Inp label="Amount (₹)" value={entryForm.amount}
            onChange={e => setEntryForm(f => ({ ...f, amount: e.target.value }))}
            type="number" placeholder="0.00" required />
          <Inp label="Note (optional)" value={entryForm.note}
            onChange={e => setEntryForm(f => ({ ...f, note: e.target.value }))}
            placeholder="e.g. Petty cash for supplies" />
        </Modal>
      )}
    </div>
  )
}
