// src/pages/StockAudit.jsx
import { useState, useEffect, useCallback } from 'react'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function getToken() {
  return localStorage.getItem('harmoney_token') || ''
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
}

const STATUS_COLORS = {
  IN_PROGRESS: { bg: '#451a03', color: '#f59e0b', border: '#92400e' },
  COMPLETED:   { bg: '#052e16', color: '#22c55e', border: '#166534' },
  CANCELLED:   { bg: '#1e293b', color: '#64748b', border: '#334155' },
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return dateStr }
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return dateStr }
}

// ── Variance summary helpers ──────────────────────────────────────
function calcSummary(items) {
  const total    = items.length
  const counted  = items.filter(i => i.physicalQty !== null && i.physicalQty !== undefined).length
  let withVar    = 0, posVar = 0, negVar = 0
  items.forEach(i => {
    if (i.physicalQty === null || i.physicalQty === undefined) return
    const diff = (i.physicalQty ?? 0) - (i.systemQty ?? 0)
    if (diff !== 0) withVar++
    if (diff > 0)   posVar++
    if (diff < 0)   negVar++
  })
  return { total, counted, withVar, posVar, negVar }
}

export default function StockAudit() {
  const [view, setView]         = useState('list') // 'list' | 'detail'
  const [audits, setAudits]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [selectedAudit, setSelectedAudit] = useState(null)
  const [auditDetail, setAuditDetail]     = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // New audit modal
  const [showModal, setShowModal] = useState(false)
  const [newForm, setNewForm]     = useState({ auditName: '', notes: '' })
  const [creating, setCreating]   = useState(false)

  // Completing
  const [completing, setCompleting] = useState(false)

  // Per-item save tracking
  const [savingItem, setSavingItem] = useState(null)

  const loadAudits = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/stock-audits`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setAudits(Array.isArray(data) ? data : (data.content ?? []))
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadAudits() }, [loadAudits])

  async function loadAuditDetail(id) {
    setDetailLoading(true)
    try {
      const res = await fetch(`${API}/stock-audits/${id}`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setAuditDetail(data)
      }
    } catch { /* ignore */ }
    setDetailLoading(false)
  }

  function openDetail(audit) {
    setSelectedAudit(audit)
    setAuditDetail(null)
    setView('detail')
    loadAuditDetail(audit.id)
  }

  function backToList() {
    setView('list')
    setSelectedAudit(null)
    setAuditDetail(null)
  }

  async function handleCreateAudit(e) {
    e.preventDefault()
    if (!newForm.auditName.trim()) { alert('Audit name is required'); return }
    setCreating(true)
    try {
      const res = await fetch(`${API}/stock-audits`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ auditName: newForm.auditName.trim(), notes: newForm.notes || undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.message || 'Failed to create audit')
      } else {
        setShowModal(false)
        setNewForm({ auditName: '', notes: '' })
        await loadAudits()
      }
    } catch (e) { alert(e.message || 'Request failed') }
    setCreating(false)
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this audit? This cannot be undone.')) return
    try {
      const res = await fetch(`${API}/stock-audits/${id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.message || 'Failed to cancel audit')
      } else {
        await loadAudits()
      }
    } catch (e) { alert(e.message || 'Request failed') }
  }

  async function handleComplete() {
    if (!auditDetail) return
    if (!confirm('Complete audit and apply all adjustments? Raw material quantities will be updated to physical counts.')) return
    setCompleting(true)
    try {
      const res = await fetch(`${API}/stock-audits/${auditDetail.id}/complete`, {
        method: 'POST', headers: authHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.message || 'Failed to complete audit')
      } else {
        await loadAuditDetail(auditDetail.id)
        await loadAudits()
      }
    } catch (e) { alert(e.message || 'Request failed') }
    setCompleting(false)
  }

  async function handleItemUpdate(itemId, physicalQty) {
    if (!auditDetail) return
    setSavingItem(itemId)
    try {
      const res = await fetch(`${API}/stock-audits/${auditDetail.id}/items/${itemId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ physicalQty: parseFloat(physicalQty) }),
      })
      if (res.ok) {
        // Update local state
        setAuditDetail(prev => {
          if (!prev) return prev
          const items = (prev.items ?? []).map(it =>
            it.id === itemId ? { ...it, physicalQty: parseFloat(physicalQty) } : it
          )
          return { ...prev, items }
        })
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.message || 'Failed to save quantity')
      }
    } catch (e) { alert(e.message || 'Request failed') }
    setSavingItem(null)
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      {view === 'list' ? (
        <ListView
          audits={audits}
          loading={loading}
          showModal={showModal}
          setShowModal={setShowModal}
          newForm={newForm}
          setNewForm={setNewForm}
          creating={creating}
          onCreateSubmit={handleCreateAudit}
          onOpenDetail={openDetail}
          onCancel={handleCancel}
        />
      ) : (
        <DetailView
          audit={selectedAudit}
          detail={auditDetail}
          loading={detailLoading}
          completing={completing}
          savingItem={savingItem}
          onBack={backToList}
          onComplete={handleComplete}
          onItemBlur={handleItemUpdate}
        />
      )}
    </div>
  )
}

// ── List View ─────────────────────────────────────────────────────
function ListView({ audits, loading, showModal, setShowModal, newForm, setNewForm, creating, onCreateSubmit, onOpenDetail, onCancel }) {
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>Physical Stock Audit</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 14 }}>
            Cycle count — verify and adjust inventory
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
        }}>
          + New Audit
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 28, width: 420, maxWidth: '90vw', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Start New Audit</h3>
            <form onSubmit={onCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>
                Audit Name *
                <input
                  required
                  value={newForm.auditName}
                  onChange={e => setNewForm(f => ({ ...f, auditName: e.target.value }))}
                  placeholder="e.g. May 2026 Cycle Count"
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Notes
                <textarea
                  rows={3}
                  value={newForm.notes}
                  onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" disabled={creating} style={{
                  background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '9px 20px', cursor: creating ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 600, opacity: creating ? 0.7 : 1,
                }}>
                  {creating ? 'Creating…' : 'Create Audit'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: 8,
                  padding: '9px 18px', cursor: 'pointer', fontSize: 14,
                }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {['Audit Name', 'Status', 'Started', 'Completed', 'Adjustments Applied', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 700, borderBottom: '1px solid #334155' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>Loading…</td></tr>
            ) : audits.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>No audits yet. Start one to begin cycle counting.</td></tr>
            ) : audits.map(a => {
              const sc = STATUS_COLORS[a.status] ?? STATUS_COLORS.CANCELLED
              const isInProgress = a.status === 'IN_PROGRESS'
              return (
                <tr key={a.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f1f5f9' }}>
                    {isInProgress ? (
                      <button onClick={() => onOpenDetail(a)} style={{
                        background: 'none', border: 'none', color: '#60a5fa',
                        cursor: 'pointer', fontWeight: 700, fontSize: 14, padding: 0, textDecoration: 'underline',
                      }}>
                        {a.auditName || `Audit #${a.id}`}
                      </button>
                    ) : (
                      <span>{a.auditName || `Audit #${a.id}`}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                      borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                    }}>{a.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>{fmtDate(a.startedAt ?? a.createdAt)}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>{fmtDate(a.completedAt)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    {a.status === 'COMPLETED' ? (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>Yes</span>
                    ) : (
                      <span style={{ color: '#64748b' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isInProgress && (
                        <>
                          <button onClick={() => onOpenDetail(a)} style={{
                            background: '#1d4ed8', color: '#93c5fd', border: '1px solid #3b82f6',
                            borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          }}>
                            Open
                          </button>
                          <button onClick={() => onCancel(a.id)} style={{
                            background: '#450a0a', color: '#fca5a5', border: '1px solid #ef4444',
                            borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
                          }}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Detail View ───────────────────────────────────────────────────
function DetailView({ audit, detail, loading, completing, savingItem, onBack, onComplete, onItemBlur }) {
  // Local physical qty state for editing
  const [localQty, setLocalQty] = useState({})

  useEffect(() => {
    if (detail?.items) {
      const init = {}
      detail.items.forEach(i => {
        init[i.id] = i.physicalQty !== null && i.physicalQty !== undefined ? String(i.physicalQty) : ''
      })
      setLocalQty(init)
    }
  }, [detail])

  const items    = detail?.items ?? []
  const summary  = calcSummary(items)
  const isInProgress = (detail?.status ?? audit?.status) === 'IN_PROGRESS'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{
          background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
          borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 14,
        }}>
          &larr; Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>
            {detail?.auditName ?? audit?.auditName ?? 'Audit Detail'}
          </h1>
          {detail?.status && (() => {
            const sc = STATUS_COLORS[detail.status] ?? STATUS_COLORS.CANCELLED
            return (
              <span style={{
                background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                display: 'inline-block', marginTop: 4,
              }}>{detail.status}</span>
            )
          })()}
        </div>
        {isInProgress && (
          <button onClick={onComplete} disabled={completing} style={{
            background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 20px', cursor: completing ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 700, opacity: completing ? 0.7 : 1,
          }}>
            {completing ? 'Completing…' : 'Complete Audit (Apply Adjustments)'}
          </button>
        )}
      </div>

      {/* Warning */}
      {isInProgress && (
        <div style={{
          background: '#451a03', border: '1px solid #92400e', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#fcd34d',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16 }}>!</span>
          <span>Completing the audit will update all raw material quantities to physical counts. Ensure all items are counted before completing.</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading audit detail…</div>
      ) : (
        <>
          {/* Variance Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Items',        value: summary.total,   color: '#94a3b8' },
              { label: 'Counted',            value: summary.counted, color: '#60a5fa' },
              { label: 'With Variance',      value: summary.withVar, color: '#f59e0b' },
              { label: 'Positive Variance',  value: summary.posVar,  color: '#22c55e' },
              { label: 'Negative Variance',  value: summary.negVar,  color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
                padding: '14px 18px',
              }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Items Table */}
          <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  {['Material Name', 'Unit', 'System Qty', 'Physical Qty', 'Variance', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 700, borderBottom: '1px solid #334155', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>No items in this audit.</td></tr>
                ) : items.map(item => {
                  const hasPhy    = item.physicalQty !== null && item.physicalQty !== undefined
                  const diff      = hasPhy ? item.physicalQty - (item.systemQty ?? 0) : null
                  const isSaving  = savingItem === item.id

                  let varianceEl
                  if (diff === null) {
                    varianceEl = <span style={{ color: '#475569', fontStyle: 'italic' }}>—</span>
                  } else if (diff > 0) {
                    varianceEl = <span style={{ color: '#22c55e', fontWeight: 700 }}>+{diff.toFixed(3).replace(/\.?0+$/, '')}</span>
                  } else if (diff < 0) {
                    varianceEl = <span style={{ color: '#ef4444', fontWeight: 700 }}>{diff.toFixed(3).replace(/\.?0+$/, '')}</span>
                  } else {
                    varianceEl = <span style={{ color: '#64748b' }}>0</span>
                  }

                  const statusEl = diff === null
                    ? <span style={{ color: '#475569', fontStyle: 'italic', fontSize: 12 }}>Not counted</span>
                    : diff === 0
                      ? <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>Match</span>
                      : <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>Variance</span>

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '10px 16px', color: '#f1f5f9', fontWeight: 600 }}>
                        {item.rawMaterialName ?? item.materialName ?? `Material #${item.rawMaterialId ?? item.id}`}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{item.unit ?? '—'}</td>
                      <td style={{ padding: '10px 16px', color: '#94a3b8' }}>
                        {item.systemQty !== null && item.systemQty !== undefined ? item.systemQty : '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {isInProgress ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={localQty[item.id] ?? ''}
                              onChange={e => setLocalQty(prev => ({ ...prev, [item.id]: e.target.value }))}
                              onBlur={e => {
                                const val = e.target.value
                                if (val !== '' && !isNaN(parseFloat(val))) {
                                  onItemBlur(item.id, val)
                                }
                              }}
                              placeholder="Count"
                              style={{
                                background: '#334155', border: '1px solid #475569', color: '#fff',
                                padding: '5px 8px', borderRadius: 6, fontSize: 13, width: 90, outline: 'none',
                              }}
                            />
                            {isSaving && <span style={{ fontSize: 11, color: '#64748b' }}>Saving…</span>}
                          </div>
                        ) : (
                          <span style={{ color: hasPhy ? '#f1f5f9' : '#475569', fontStyle: hasPhy ? 'normal' : 'italic' }}>
                            {hasPhy ? item.physicalQty : 'Not counted'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px' }}>{varianceEl}</td>
                      <td style={{ padding: '10px 16px' }}>{statusEl}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────
const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 5,
  fontSize: 13, fontWeight: 600, color: '#94a3b8',
}

const inputStyle = {
  background: '#334155', border: '1px solid #475569', color: '#fff',
  padding: '8px 12px', borderRadius: 6, fontSize: 14, outline: 'none',
  marginTop: 2,
}
