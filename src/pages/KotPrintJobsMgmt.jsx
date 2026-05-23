// src/pages/KotPrintJobsMgmt.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

async function apiFetch(path, token, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    let msg = `${res.status}`
    try {
      const ct = res.headers.get('content-type') || ''
      const body = ct.includes('application/json') ? await res.json() : await res.text()
      msg = body?.message || body?.error || (typeof body === 'string' && body) || msg
    } catch (_) {}
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

const STATUS_STYLES = {
  PENDING:  { bg: '#fff7ed', color: '#92400e', border: '#fed7aa' },
  PRINTING: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  DONE:     { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  FAILED:   { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' }
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700,
    }}>
      {status}
    </span>
  )
}

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 300,
      background: type === 'error' ? '#fee2e2' : '#d1fae5',
      color: type === 'error' ? '#991b1b' : '#065f46',
      border: `1px solid ${type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
      borderRadius: 10, padding: '12px 20px', fontSize: 14,
      fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    }}>
      {msg}
    </div>
  )
}

function FailModal({ onConfirm, onCancel }) {
  const [msg, setMsg] = useState('')
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{
        background: '#fff', borderRadius: 12, padding: '24px 24px 20px',
        width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
          Mark as Failed
        </h3>
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Error message (optional)"
          rows={3}
          style={{ ...inputStyle, width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(msg)}
            style={{ flex: 2, padding: '9px 0', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
          >
            Mark Failed
          </button>
        </div>
      </div>
    </div>
  )
}

const HISTORY_FILTERS = ['All', 'DONE', 'FAILED']

export default function KotPrintJobsMgmt() {
  const { token, restaurantId } = useAuthStore()

  const [activeTab, setActiveTab]         = useState('Pending')
  const [pendingJobs, setPendingJobs]     = useState([])
  const [historyJobs, setHistoryJobs]     = useState([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [historyFilter, setHistoryFilter] = useState('All')

  const [triggerKoId, setTriggerKoId]     = useState('')
  const [triggering, setTriggering]       = useState(false)

  const [failModal, setFailModal]         = useState(null) // { jobId }
  const [toast, setToast]                 = useState(null)

  const pendingTimerRef = useRef(null)

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), [])

  const loadPending = useCallback(async () => {
    try {
      const data = await apiFetch(`/kot-print-jobs/pending?restaurantId=${restaurantId}`, token)
      setPendingJobs(Array.isArray(data) ? data : [])
    } catch (err) {
      showToast(err.message || 'Failed to load pending jobs', 'error')
    } finally {
      setLoadingPending(false)
    }
  }, [restaurantId, token, showToast])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const data = await apiFetch(`/kot-print-jobs/history?restaurantId=${restaurantId}`, token)
      setHistoryJobs(Array.isArray(data) ? data : [])
    } catch (err) {
      showToast(err.message || 'Failed to load history', 'error')
    } finally {
      setLoadingHistory(false)
    }
  }, [restaurantId, token, showToast])

  useEffect(() => {
    loadPending()
    pendingTimerRef.current = setInterval(loadPending, 10000)
    return () => clearInterval(pendingTimerRef.current)
  }, [loadPending])

  useEffect(() => {
    if (activeTab === 'History') loadHistory()
  }, [activeTab, loadHistory])

  async function handleMarkDone(jobId) {
    try {
      await apiFetch(`/kot-print-jobs/${jobId}/done`, token, { method: 'PUT' })
      showToast('Marked as done')
      loadPending()
    } catch (err) {
      showToast(err.message || 'Failed', 'error')
    }
  }

  async function handleMarkFailed(jobId, errorMessage) {
    try {
      await apiFetch(`/kot-print-jobs/${jobId}/failed`, token, {
        method: 'PUT',
        body: JSON.stringify({ errorMessage }),
      })
      showToast('Marked as failed')
      setFailModal(null)
      loadPending()
    } catch (err) {
      showToast(err.message || 'Failed', 'error')
    }
  }

  async function handleTrigger(e) {
    e.preventDefault()
    if (!triggerKoId.trim()) return
    setTriggering(true)
    try {
      await apiFetch(`/kot-print-jobs/trigger`, token, {
        method: 'POST',
        body: JSON.stringify({ kitchenOrderId: triggerKoId.trim() }),
      })
      showToast('Print job queued')
      setTriggerKoId('')
      loadPending()
    } catch (err) {
      showToast(err.message || 'Failed to queue print job', 'error')
    } finally {
      setTriggering(false)
    }
  }

  const filteredHistory = historyFilter === 'All'
    ? historyJobs
    : historyJobs.filter(j => j.status === historyFilter)

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>
          KOT Print Jobs
        </h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
          Manage the kitchen order ticket print job queue
        </p>
      </div>

      {/* Info Box */}
      <div style={{
        background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10,
        padding: '12px 16px', fontSize: 13, color: '#0c4a6e',
        display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>🖨</span>
        <span>
          Install the <strong>Harmony Print Agent</strong> on your local network to automatically pick up
          and print these jobs. The agent polls{' '}
          <code style={{ background: '#e0f2fe', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>
            GET /api/v1/kot-print-jobs/pending
          </code>{' '}
          every 10 seconds.
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 0 }}>
        {['Pending', 'History'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700, color: activeTab === tab ? '#3b82f6' : '#6b7280',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: -2, transition: 'color 0.15s',
            }}
          >
            {tab}
            {tab === 'Pending' && pendingJobs.length > 0 && (
              <span style={{
                marginLeft: 6, background: '#ef4444', color: '#fff',
                borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 800,
              }}>
                {pendingJobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pending Tab */}
      {activeTab === 'Pending' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0 0 12px 12px', borderTop: 'none' }}>

          {/* Trigger Form */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <label style={{ ...labelStyle, flex: 1, maxWidth: 320 }}>
              Kitchen Order ID
              <input
                value={triggerKoId}
                onChange={e => setTriggerKoId(e.target.value)}
                placeholder="Enter Kitchen Order ID"
                style={inputStyle}
              />
            </label>
            <button
              onClick={handleTrigger}
              disabled={triggering || !triggerKoId.trim()}
              style={{
                background: triggering || !triggerKoId.trim() ? '#9ca3af' : '#3b82f6',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '9px 20px', cursor: triggering || !triggerKoId.trim() ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}
            >
              {triggering ? 'Queuing…' : 'Queue Print'}
            </button>
          </div>

          {/* Pending Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Job ID', 'Printer Name', 'Printer IP', 'Kitchen Order ID', 'Status', 'Created At', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingPending ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Loading…</td></tr>
                ) : pendingJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                      No pending print jobs
                    </td>
                  </tr>
                ) : pendingJobs.map(job => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
                      #{job.id}
                    </td>
                    <td style={tdStyle}>{job.printerName || '—'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{job.printerIp || '—'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
                      {job.kitchenOrderId || '—'}
                    </td>
                    <td style={tdStyle}><StatusBadge status={job.status} /></td>
                    <td style={{ ...tdStyle, color: '#6b7280', fontSize: 12 }}>
                      {job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}
                    </td>
                    <td style={tdStyle}>
                      {job.status === 'PENDING' || job.status === 'PRINTING' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleMarkDone(job.id)}
                            style={smallBtn('#10b981')}
                          >
                            Mark Done
                          </button>
                          <button
                            onClick={() => setFailModal({ jobId: job.id })}
                            style={smallBtn('#ef4444')}
                          >
                            Mark Failed
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'History' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0 0 12px 12px', borderTop: 'none' }}>

          {/* Filter Row */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>Filter by status:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {HISTORY_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, border: '1px solid',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: historyFilter === f ? '#111827' : '#f9fafb',
                    color: historyFilter === f ? '#fff' : '#374151',
                    borderColor: historyFilter === f ? '#111827' : '#d1d5db',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={loadHistory}
              style={{ marginLeft: 'auto', padding: '5px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f9fafb', color: '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              Refresh
            </button>
          </div>

          {/* History Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Job ID', 'Printer Name', 'Printer IP', 'Kitchen Order ID', 'Status', 'Error', 'Created At'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Loading…</td></tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                      No history records found
                    </td>
                  </tr>
                ) : filteredHistory.map(job => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
                      #{job.id}
                    </td>
                    <td style={tdStyle}>{job.printerName || '—'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{job.printerIp || '—'}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
                      {job.kitchenOrderId || '—'}
                    </td>
                    <td style={tdStyle}><StatusBadge status={job.status} /></td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#dc2626', maxWidth: 200 }}>
                      {job.errorMessage ? (
                        <span title={job.errorMessage} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {job.errorMessage}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280', fontSize: 12 }}>
                      {job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {failModal && (
        <FailModal
          onConfirm={(msg) => handleMarkFailed(failModal.jobId, msg)}
          onCancel={() => setFailModal(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151',
}

const inputStyle = {
  padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 14, outline: 'none', background: '#fff',
}

const thStyle = {
  padding: '11px 14px', textAlign: 'left', fontSize: 12,
  color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 14px',
}

const smallBtn = (bg) => ({
  background: 'none', border: `1px solid ${bg}`, color: bg,
  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
})
