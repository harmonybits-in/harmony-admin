// src/pages/StockTransfer.jsx
import { useState, useEffect, useCallback } from 'react'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function getToken() {
  return localStorage.getItem('harmoney_token') || ''
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
}

const STATUS_COLORS = {
  PENDING:   { bg: '#451a03', color: '#f59e0b', border: '#92400e' },
  APPROVED:  { bg: '#052e16', color: '#22c55e', border: '#166534' },
  REJECTED:  { bg: '#450a0a', color: '#ef4444', border: '#991b1b' },
  COMPLETED: { bg: '#172554', color: '#60a5fa', border: '#1e40af' },
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']

function fmt(dateStr) {
  if (!dateStr) return '—'
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return dateStr }
}

export default function StockTransfer() {
  const [tab, setTab]           = useState('list') // 'list' | 'new'
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('ALL')
  const [actionLoading, setActionLoading] = useState(null)

  // Form state
  const [form, setForm] = useState({
    toRestaurantId: '',
    rawMaterialId: '',
    rawMaterialName: '',
    quantity: '',
    unit: '',
    requestedBy: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/stock-transfers`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setTransfers(Array.isArray(data) ? data : (data.content ?? []))
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleStatusUpdate(id, status) {
    setActionLoading(id + '_' + status)
    try {
      const res = await fetch(`${API}/stock-transfers/${id}/status`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.message || `Failed to update status`)
      } else {
        await load()
      }
    } catch (e) {
      alert(e.message || 'Request failed')
    }
    setActionLoading(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.toRestaurantId || !form.rawMaterialId || !form.quantity || !form.unit) {
      alert('To Restaurant ID, Raw Material ID, Quantity and Unit are required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/stock-transfers`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          toRestaurantId:  Number(form.toRestaurantId),
          rawMaterialId:   Number(form.rawMaterialId),
          rawMaterialName: form.rawMaterialName || undefined,
          quantity:        parseFloat(form.quantity),
          unit:            form.unit,
          requestedBy:     form.requestedBy || undefined,
          notes:           form.notes || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.message || 'Failed to create transfer')
      } else {
        setForm({ toRestaurantId: '', rawMaterialId: '', rawMaterialName: '', quantity: '', unit: '', requestedBy: '', notes: '' })
        setTab('list')
        await load()
      }
    } catch (e) {
      alert(e.message || 'Request failed')
    }
    setSubmitting(false)
  }

  const filtered = filter === 'ALL' ? transfers : transfers.filter(t => t.status === filter)

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', background: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>Stock Transfer</h1>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 14 }}>
          Transfer raw materials between branches
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #334155', marginBottom: 24 }}>
        {[{ key: 'list', label: 'Transfers' }, { key: 'new', label: '+ New Transfer' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? '#3b82f6' : '#94a3b8',
            borderBottom: tab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Transfers Tab ── */}
      {tab === 'list' && (
        <div>
          {/* Filter row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: filter === f ? 700 : 400,
                background: filter === f ? '#3b82f6' : '#1e293b',
                color: filter === f ? '#fff' : '#94a3b8',
              }}>{f}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
              No transfers found{filter !== 'ALL' ? ` with status ${filter}` : ''}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(t => {
                const sc = STATUS_COLORS[t.status] ?? { bg: '#1e293b', color: '#94a3b8', border: '#334155' }
                return (
                  <div key={t.id} style={{
                    background: '#1e293b', borderRadius: 12, padding: '16px 20px',
                    border: '1px solid #334155',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        {/* Branch route */}
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>
                          Branch #{t.fromRestaurantId ?? '—'} &rarr; Branch #{t.toRestaurantId ?? '—'}
                        </div>

                        {/* Material info */}
                        <div style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{t.rawMaterialName || `Material #${t.rawMaterialId}`}</span>
                          {' — '}
                          <span>{t.quantity} {t.unit}</span>
                        </div>

                        {/* Meta */}
                        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 2 }}>
                          {t.requestedBy && <span>Requested by: <span style={{ color: '#94a3b8' }}>{t.requestedBy}</span></span>}
                          <span>Date: <span style={{ color: '#94a3b8' }}>{fmt(t.createdAt ?? t.transferDate)}</span></span>
                          {t.notes && <span>Notes: <span style={{ color: '#94a3b8' }}>{t.notes}</span></span>}
                        </div>
                      </div>

                      {/* Right side: badge + actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <span style={{
                          background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                          borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                        }}>{t.status}</span>

                        <div style={{ display: 'flex', gap: 8 }}>
                          {t.status === 'PENDING' && (
                            <>
                              <button
                                disabled={!!actionLoading}
                                onClick={() => handleStatusUpdate(t.id, 'APPROVED')}
                                style={actionBtn('#22c55e', '#052e16')}
                              >
                                {actionLoading === t.id + '_APPROVED' ? '…' : 'Approve'}
                              </button>
                              <button
                                disabled={!!actionLoading}
                                onClick={() => handleStatusUpdate(t.id, 'REJECTED')}
                                style={actionBtn('#ef4444', '#450a0a')}
                              >
                                {actionLoading === t.id + '_REJECTED' ? '…' : 'Reject'}
                              </button>
                            </>
                          )}
                          {t.status === 'APPROVED' && (
                            <button
                              disabled={!!actionLoading}
                              onClick={() => handleStatusUpdate(t.id, 'COMPLETED')}
                              style={actionBtn('#3b82f6', '#172554')}
                            >
                              {actionLoading === t.id + '_COMPLETED' ? '…' : 'Mark Completed'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── New Transfer Tab ── */}
      {tab === 'new' && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 24, border: '1px solid #334155' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
              Create Stock Transfer
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={labelStyle}>
                  To Restaurant ID *
                  <input
                    type="number" min="1" required
                    value={form.toRestaurantId}
                    onChange={e => setForm(f => ({ ...f, toRestaurantId: e.target.value }))}
                    placeholder="e.g. 2"
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Raw Material ID *
                  <input
                    type="number" min="1" required
                    value={form.rawMaterialId}
                    onChange={e => setForm(f => ({ ...f, rawMaterialId: e.target.value }))}
                    placeholder="e.g. 101"
                    style={inputStyle}
                  />
                </label>
              </div>

              <label style={labelStyle}>
                Raw Material Name (snapshot)
                <input
                  value={form.rawMaterialName}
                  onChange={e => setForm(f => ({ ...f, rawMaterialName: e.target.value }))}
                  placeholder="e.g. Tomatoes"
                  style={inputStyle}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={labelStyle}>
                  Quantity *
                  <input
                    type="number" min="0.001" step="any" required
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="e.g. 5"
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  Unit *
                  <input
                    required
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="kg, L, pcs, etc."
                    style={inputStyle}
                  />
                </label>
              </div>

              <label style={labelStyle}>
                Requested By
                <input
                  value={form.requestedBy}
                  onChange={e => setForm(f => ({ ...f, requestedBy: e.target.value }))}
                  placeholder="Staff name"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes about this transfer"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" disabled={submitting} style={{
                  background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 24px', cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 600, opacity: submitting ? 0.7 : 1,
                }}>
                  {submitting ? 'Submitting…' : 'Submit Transfer'}
                </button>
                <button type="button" onClick={() => setTab('list')} style={{
                  background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: 8,
                  padding: '10px 20px', cursor: 'pointer', fontSize: 14,
                }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 5,
  fontSize: 13, fontWeight: 600, color: '#94a3b8',
}

const inputStyle = {
  background: '#334155', border: '1px solid #475569', color: '#fff',
  padding: '8px 12px', borderRadius: 6, fontSize: 14, outline: 'none',
  marginTop: 2,
}

function actionBtn(color, bgColor) {
  return {
    background: bgColor, color: color, border: `1px solid ${color}`,
    borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
    fontSize: 12, fontWeight: 600,
  }
}
