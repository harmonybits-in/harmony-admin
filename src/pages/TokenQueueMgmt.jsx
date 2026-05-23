// src/pages/TokenQueueMgmt.jsx
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

function StatCard({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: '#fff', border: `1px solid ${color}33`,
      borderRadius: 12, padding: '18px 20px', textAlign: 'center',
      borderTop: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, fontWeight: 600 }}>{label}</div>
    </div>
  )
}

const SERVICE_TYPES = ['General', 'Billing', 'Complaint', 'Pickup', 'Consultation']

function IssueTokenModal({ onClose, onIssue, issuing }) {
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone]               = useState('')
  const [serviceType, setServiceType]   = useState('General')

  function handleSubmit(e) {
    e.preventDefault()
    if (!customerName.trim()) return
    onIssue({ customerName: customerName.trim(), customerPhone: phone.trim(), serviceType })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 14, padding: '28px 28px 24px',
        width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800, color: '#111827' }}>
          Issue New Token
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={labelStyle}>
            Customer Name *
            <input
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              required
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Phone Number
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="9876543210"
              type="tel"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Service Type
            <select value={serviceType} onChange={e => setServiceType(e.target.value)} style={inputStyle}>
              {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Cancel
            </button>
            <button
              type="submit" disabled={issuing || !customerName.trim()}
              style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: issuing || !customerName.trim() ? '#9ca3af' : '#3b82f6', color: '#fff', cursor: issuing || !customerName.trim() ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}>
              {issuing ? 'Issuing…' : 'Issue Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function timeAgo(isoDate) {
  if (!isoDate) return ''
  const diff = Math.floor((Date.now() - new Date(isoDate)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function TokenQueueMgmt() {
  const { token, restaurantId } = useAuthStore()

  const [queueData, setQueueData]     = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const [showIssueModal, setShowIssueModal] = useState(false)
  const [issuing, setIssuing]         = useState(false)
  const [callingNext, setCallingNext] = useState(false)
  const [showConfig, setShowConfig]   = useState(false)

  // Config form
  const [prefix, setPrefix]           = useState('T')
  const [resetDaily, setResetDaily]   = useState(true)
  const [savingCfg, setSavingCfg]     = useState(false)

  const [toast, setToast]             = useState(null)
  const timerRef                      = useRef(null)

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), [])

  const loadQueue = useCallback(async () => {
    try {
      const data = await apiFetch(`/tokens/?restaurantId=${restaurantId}`, token)
      setQueueData(data)
      if (data?.config) {
        setPrefix(data.config.prefix || 'T')
        setResetDaily(data.config.resetDaily !== false)
      }
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, token])

  useEffect(() => {
    loadQueue()
    timerRef.current = setInterval(loadQueue, 15000)
    return () => clearInterval(timerRef.current)
  }, [loadQueue])

  async function handleIssue(body) {
    setIssuing(true)
    try {
      await apiFetch(`/tokens/issue?restaurantId=${restaurantId}`, token, {
        method: 'POST', body: JSON.stringify(body),
      })
      showToast('Token issued')
      setShowIssueModal(false)
      loadQueue()
    } catch (err) {
      showToast(err.message || 'Failed to issue token', 'error')
    } finally {
      setIssuing(false)
    }
  }

  async function handleCallNext() {
    setCallingNext(true)
    try {
      await apiFetch(`/tokens/call-next?restaurantId=${restaurantId}`, token, { method: 'POST' })
      showToast('Called next token')
      loadQueue()
    } catch (err) {
      showToast(err.message || 'No tokens waiting', 'error')
    } finally {
      setCallingNext(false)
    }
  }

  async function handleCallSpecific(number) {
    try {
      await apiFetch(`/tokens/call/${number}?restaurantId=${restaurantId}`, token, { method: 'POST' })
      showToast(`Called token ${number}`)
      loadQueue()
    } catch (err) {
      showToast(err.message || 'Failed', 'error')
    }
  }

  async function handleComplete(number) {
    try {
      await apiFetch(`/tokens/${number}/complete?restaurantId=${restaurantId}`, token, { method: 'POST' })
      showToast('Token completed')
      loadQueue()
    } catch (err) {
      showToast(err.message || 'Failed', 'error')
    }
  }

  async function handleSkip(number) {
    try {
      await apiFetch(`/tokens/${number}/skip?restaurantId=${restaurantId}`, token, { method: 'POST' })
      showToast('Token skipped')
      loadQueue()
    } catch (err) {
      showToast(err.message || 'Failed', 'error')
    }
  }

  async function handleReset() {
    if (!window.confirm('Reset the entire queue? This cannot be undone.')) return
    try {
      await apiFetch(`/tokens/reset?restaurantId=${restaurantId}`, token, { method: 'POST' })
      showToast('Queue reset')
      loadQueue()
    } catch (err) {
      showToast(err.message || 'Reset failed', 'error')
    }
  }

  async function handleSaveConfig(e) {
    e.preventDefault()
    setSavingCfg(true)
    try {
      await apiFetch(`/tokens/config?restaurantId=${restaurantId}`, token, {
        method: 'PUT', body: JSON.stringify({ prefix, resetDaily }),
      })
      showToast('Config saved')
      loadQueue()
    } catch (err) {
      showToast(err.message || 'Save failed', 'error')
    } finally {
      setSavingCfg(false)
    }
  }

  const waiting  = queueData?.waiting  || []
  const serving  = Array.isArray(queueData?.serving) ? queueData.serving : (queueData?.serving ? [queueData.serving] : [])
  const current  = serving[0] || null
  const stats    = queueData?.stats || {}
  const totalToday = stats.totalToday ?? (queueData?.totalToday ?? '—')
  const waitingCount = waiting.length
  const servingNum  = current?.tokenNumber ?? '—'

  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center', color: '#6b7280' }}>
        Loading queue…
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>
            Token Queue Management
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Auto-refreshes every 15 seconds
          </p>
        </div>
        <a
          href={`/token/${restaurantId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '9px 16px', background: '#f3f4f6', color: '#374151',
            border: '1px solid #d1d5db', borderRadius: 8, textDecoration: 'none',
            fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          📺 Public Display ↗
        </a>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <StatCard label="Waiting" value={waitingCount} color="#f59e0b" />
        <StatCard label="Now Serving" value={servingNum} color="#10b981" />
        <StatCard label="Total Today" value={totalToday} color="#3b82f6" />
      </div>

      {/* Action Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowIssueModal(true)}
          style={actionBtn('#3b82f6')}
        >
          + Issue Token
        </button>
        <button
          onClick={handleCallNext}
          disabled={callingNext}
          style={{ ...actionBtn('#10b981'), fontSize: 15, padding: '10px 28px' }}
        >
          {callingNext ? 'Calling…' : '▶ Call Next'}
        </button>
        <button
          onClick={handleReset}
          style={{ ...actionBtn('#ef4444'), marginLeft: 'auto' }}
        >
          Reset Queue
        </button>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Now Serving */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Now Serving
          </div>
          {current ? (
            <>
              <div style={{
                fontSize: 80, fontWeight: 900, color: '#10b981', lineHeight: 1,
                background: '#f0fdf4', borderRadius: 16, padding: '20px 0', marginBottom: 12,
              }}>
                {current.tokenNumber}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                {current.customerName}
              </div>
              {current.serviceType && (
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>{current.serviceType}</div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => handleComplete(current.tokenNumber)}
                  style={actionBtn('#10b981')}
                >
                  Complete
                </button>
                <button
                  onClick={() => handleSkip(current.tokenNumber)}
                  style={{ ...actionBtn('#f59e0b') }}
                >
                  Skip
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '40px 0', color: '#9ca3af', fontSize: 15 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎫</div>
              No token currently being served
            </div>
          )}
        </div>

        {/* Waiting Queue */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
            Waiting Queue ({waiting.length})
          </div>
          {waiting.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
              No tokens waiting
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {waiting.map(t => (
                <div key={t.tokenNumber} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6',
                }}>
                  <span style={{
                    background: '#fef3c7', color: '#92400e', borderRadius: 8,
                    padding: '4px 10px', fontWeight: 800, fontSize: 15, flexShrink: 0,
                  }}>
                    {t.tokenNumber}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.customerName}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>
                      {t.serviceType} · {timeAgo(t.issuedAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCallSpecific(t.tokenNumber)}
                    style={{
                      padding: '5px 12px', background: '#eff6ff', color: '#3b82f6',
                      border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0,
                    }}
                  >
                    Call
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Config Section */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <button
          onClick={() => setShowConfig(v => !v)}
          style={{
            width: '100%', background: '#f9fafb', border: 'none', padding: '14px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#374151',
          }}
        >
          <span>Queue Configuration</span>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>{showConfig ? '▲ Collapse' : '▼ Expand'}</span>
        </button>
        {showConfig && (
          <form onSubmit={handleSaveConfig} style={{ padding: '20px', display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ ...labelStyle, minWidth: 140 }}>
              Token Prefix
              <input
                value={prefix}
                onChange={e => setPrefix(e.target.value)}
                placeholder="T"
                maxLength={3}
                style={{ ...inputStyle, width: 100 }}
              />
              <span style={{ fontSize: 11, color: '#9ca3af' }}>e.g. "T" → T001</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={resetDaily}
                onChange={e => setResetDaily(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Reset counter daily at midnight
            </label>

            <button
              type="submit"
              disabled={savingCfg}
              style={actionBtn(savingCfg ? '#9ca3af' : '#3b82f6')}
            >
              {savingCfg ? 'Saving…' : 'Save Config'}
            </button>
          </form>
        )}
      </div>

      {showIssueModal && (
        <IssueTokenModal
          onClose={() => setShowIssueModal(false)}
          onIssue={handleIssue}
          issuing={issuing}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

const actionBtn = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '9px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 700,
})

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151',
}

const inputStyle = {
  padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box',
}
