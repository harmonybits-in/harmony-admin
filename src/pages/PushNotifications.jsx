// src/pages/PushNotifications.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

const C = {
  bg: '#0f172a', card: '#1e293b', input: '#334155',
  border: '#475569', text: '#fff', muted: '#94a3b8',
  green: '#22c55e', red: '#ef4444', blue: '#3b82f6',
  amber: '#f59e0b', gray: '#6b7280',
}

const NOTIF_TYPES = [
  { value: 'GENERAL',       label: 'General',       color: C.gray,  bg: '#1f2937' },
  { value: 'PROMOTION',     label: 'Promotion',      color: C.blue,  bg: '#1e3a5f' },
  { value: 'ORDER_UPDATE',  label: 'Order Update',   color: C.amber, bg: '#451a03' },
  { value: 'OFFER',         label: 'Offer',          color: C.green, bg: '#052e16' },
]
const TYPE_META = Object.fromEntries(NOTIF_TYPES.map(t => [t.value, t]))

const inputStyle = {
  background: C.input, border: `1px solid ${C.border}`, color: C.text,
  padding: '8px 12px', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box',
}
const labelStyle = { fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: 600, display: 'block' }
const btnStyle   = (bg = C.blue) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
})

async function apiReq(path, opts = {}) {
  const token = localStorage.getItem('harmoney_token') || ''
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  })
  if (!res.ok) {
    let msg = `Error ${res.status}`
    try { const b = await res.json(); msg = b.message || b.error || msg } catch {}
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('json') ? res.json() : res.text()
}

function TypeBadge({ type }) {
  const m = TYPE_META[type] || {}
  return (
    <span style={{
      background: m.bg || '#1f2937', color: m.color || C.muted,
      border: `1px solid ${m.color || C.border}`,
      borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {m.label || type}
    </span>
  )
}

function CharCount({ value, max }) {
  const len = (value || '').length
  const color = len > max * 0.9 ? C.red : len > max * 0.7 ? C.amber : C.muted
  return <span style={{ fontSize: 11, color }}>{len} / {max}</span>
}

function NotifPreview({ title, body, type }) {
  return (
    <div style={{
      background: '#1a1a2e', border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '14px 16px', maxWidth: 320,
    }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        Notification Preview
      </div>
      <div style={{
        background: '#252545', borderRadius: 10, padding: '12px 14px',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: C.blue,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
        }}>
          🔔
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>
            {title || 'Notification Title'}
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4, wordBreak: 'break-word' }}>
            {body || 'Your message will appear here...'}
          </div>
          {type && (
            <div style={{ marginTop: 6 }}>
              <TypeBadge type={type} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PushNotifications() {
  const { restaurantId } = useAuthStore()
  const [activeTab, setActiveTab] = useState('send')

  // Tokens
  const [tokens, setTokens]       = useState([])
  const [tokensLoading, setTokensLoading] = useState(false)

  // Logs
  const [logs, setLogs]           = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Send form
  const [notifType, setNotifType] = useState('GENERAL')
  const [title, setTitle]         = useState('')
  const [body, setBody]           = useState('')
  const [sending, setSending]     = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [sendErr, setSendErr]     = useState('')

  const loadTokens = useCallback(async () => {
    setTokensLoading(true)
    try { setTokens(await apiReq('/push/tokens')) } catch { setTokens([]) }
    setTokensLoading(false)
  }, [])

  const loadLogs = useCallback(async () => {
    setLogsLoading(true)
    try { setLogs(await apiReq('/push/logs')) } catch { setLogs([]) }
    setLogsLoading(false)
  }, [])

  useEffect(() => {
    loadTokens()
    loadLogs()
  }, [loadTokens, loadLogs])

  async function handleSend(e) {
    e.preventDefault()
    if (!title.trim()) { setSendErr('Title is required'); return }
    if (!body.trim())  { setSendErr('Message body is required'); return }
    setSendErr('')
    setSendResult(null)
    setSending(true)
    try {
      const res = await apiReq('/push/send', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body: body.trim(), type: notifType }),
      })
      setSendResult(res)
      setTitle('')
      setBody('')
      loadLogs()
    } catch (err) { setSendErr(err.message) }
    setSending(false)
  }

  async function handleDeleteToken(token) {
    if (!confirm('Remove this device?')) return
    try {
      await apiReq(`/push/tokens/${encodeURIComponent(token)}`, { method: 'DELETE' })
      loadTokens()
    } catch (err) { alert(err.message) }
  }

  const deviceCount = Array.isArray(tokens) ? tokens.length : 0

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'sans-serif', color: C.text }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Push Notifications</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>Send to customer app devices</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}` }}>
        {[
          { key: 'send',    label: '📤 Send Notification' },
          { key: 'history', label: '📋 History' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 18px', fontSize: 13, fontWeight: 600,
            color: activeTab === tab.key ? C.blue : C.muted,
            borderBottom: `2px solid ${activeTab === tab.key ? C.blue : 'transparent'}`,
            marginBottom: -1,
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Send Tab ──────────────────────────────────────────────── */}
      {activeTab === 'send' && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Form */}
          <div style={{ flex: 2, minWidth: 300 }}>
            {/* Devices card */}
            <div style={{
              background: C.card, borderRadius: 10, padding: '16px 20px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 16,
              borderLeft: `4px solid ${C.blue}`,
            }}>
              <div style={{ fontSize: 28 }}>📱</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.blue }}>
                  {tokensLoading ? '...' : deviceCount}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  registered device{deviceCount !== 1 ? 's' : ''} will receive this notification
                </div>
              </div>
            </div>

            <form onSubmit={handleSend}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Notification Type</label>
                <select value={notifType} onChange={e => setNotifType(e.target.value)} style={inputStyle}>
                  {NOTIF_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Title</label>
                  <CharCount value={title} max={100} />
                </div>
                <input type="text" maxLength={100} placeholder="e.g. Today's Special Offer!"
                  value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Message</label>
                  <CharCount value={body} max={500} />
                </div>
                <textarea maxLength={500} rows={4}
                  placeholder="Write your notification message here..."
                  value={body} onChange={e => setBody(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              {sendErr && <div style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{sendErr}</div>}

              {sendResult && (
                <div style={{
                  background: '#052e16', border: `1px solid ${C.green}`, borderRadius: 8,
                  padding: '12px 14px', marginBottom: 16, fontSize: 13,
                }}>
                  <div style={{ color: C.green, fontWeight: 700, marginBottom: 4 }}>Notification Sent!</div>
                  <div style={{ color: C.muted }}>
                    Sent: <strong style={{ color: C.text }}>{sendResult.sentCount ?? sendResult.sent ?? '—'}</strong>
                    &nbsp;|&nbsp; Failed: <strong style={{ color: C.red }}>{sendResult.failedCount ?? sendResult.failed ?? '—'}</strong>
                  </div>
                </div>
              )}

              <button type="submit" disabled={sending || deviceCount === 0} style={{
                ...btnStyle(C.blue), opacity: (sending || deviceCount === 0) ? 0.7 : 1,
                width: '100%', padding: '10px 16px', fontSize: 14,
              }}>
                {sending ? 'Sending...' : `Send to ${deviceCount} Device${deviceCount !== 1 ? 's' : ''}`}
              </button>
            </form>
          </div>

          {/* Preview card */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Live Preview
            </div>
            <NotifPreview title={title} body={body} type={notifType} />

            {/* Device list mini */}
            {deviceCount > 0 && (
              <div style={{ background: C.card, borderRadius: 10, padding: 16, marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Registered Devices
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {tokens.map((t, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 0', borderBottom: i < tokens.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}>
                      <span style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                        {t.token || t.deviceToken || String(t).slice(0, 30) + '...'}
                      </span>
                      <button onClick={() => handleDeleteToken(t.token || t.deviceToken || t)}
                        style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 13 }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── History Tab ───────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          {logsLoading && <div style={{ color: C.muted, textAlign: 'center', padding: '40px 0' }}>Loading history...</div>}
          {!logsLoading && (
            <div style={{ background: C.card, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Date', 'Title', 'Type', 'Sent To', 'Success', 'Failed'].map(h => (
                      <th key={h} style={{
                        padding: '12px 14px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '40px 14px', textAlign: 'center', color: C.muted }}>
                      No notification history yet
                    </td></tr>
                  )}
                  {logs.map((log, i) => (
                    <tr key={log.id ?? i}
                      style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 1 ? '#172033' : 'transparent' }}>
                      <td style={{ padding: '10px 14px', color: C.muted, whiteSpace: 'nowrap' }}>
                        {log.sentAt ? new Date(log.sentAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.title || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}><TypeBadge type={log.type || log.notificationType} /></td>
                      <td style={{ padding: '10px 14px', color: C.muted }}>{log.sentTo ?? log.totalDevices ?? '—'}</td>
                      <td style={{ padding: '10px 14px', color: C.green, fontWeight: 600 }}>
                        {log.successCount ?? log.success ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: log.failedCount > 0 ? C.red : C.muted, fontWeight: 600 }}>
                        {log.failedCount ?? log.failed ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
