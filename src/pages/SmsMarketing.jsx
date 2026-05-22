import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { smsApi } from '../api/client'

const SEGMENTS = [
  { value: 'ALL',         label: 'All Customers',                hasParam: false },
  { value: 'INACTIVE',    label: 'Inactive Customers',           hasParam: true, paramLabel: 'Days since last visit',  defaultParam: 30 },
  { value: 'HIGH_VALUE',  label: 'High Value Customers',         hasParam: true, paramLabel: 'Min total spend (₹)',    defaultParam: 5000 },
  { value: 'NEW',         label: 'New Customers (recently joined)', hasParam: true, paramLabel: 'Joined in last N days', defaultParam: 7 },
  { value: 'LOYALTY',     label: 'Loyalty Points Members',       hasParam: true, paramLabel: 'Min loyalty points',    defaultParam: 100 },
  { value: 'GOLD_TIER',   label: 'Gold Tier Members',            hasParam: false },
  { value: 'SILVER_TIER', label: 'Silver Tier Members',          hasParam: false },
]

const STATUS_STYLE = {
  DRAFT:   { background: '#f3f4f6', color: '#4b5563' },
  SENDING: { background: '#fef3c7', color: '#92400e' },
  SENT:    { background: '#d1fae5', color: '#065f46' },
  FAILED:  { background: '#fee2e2', color: '#991b1b' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.DRAFT
  return (
    <span style={{ ...s, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {status === 'SENDING' ? '⏳ SENDING' : status}
    </span>
  )
}

export default function SmsMarketing() {
  const { restaurantId } = useAuthStore()
  const [campaigns,   setCampaigns]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [page,        setPage]        = useState(0)
  const [totalPages,  setTotalPages]  = useState(0)
  const [configured,  setConfigured]  = useState(null)
  const [showModal,   setShowModal]   = useState(false)
  const [error,       setError]       = useState('')
  const [sendingId,   setSendingId]   = useState(null)

  // form
  const BLANK = { name: '', message: '', templateId: '', segment: 'ALL', segmentParam: '' }
  const [form,          setForm]          = useState(BLANK)
  const [saving,        setSaving]        = useState(false)
  const [previewCount,  setPreviewCount]  = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const debounceRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await smsApi.list(page)
      setCampaigns(data.content || [])
      setTotalPages(data.totalPages || 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    smsApi.config()
      .then(c => setConfigured(c.configured))
      .catch(() => setConfigured(false))
  }, [])

  // Debounced segment preview
  useEffect(() => {
    clearTimeout(debounceRef.current)
    const seg   = form.segment
    const param = form.segmentParam !== '' ? parseInt(form.segmentParam) : undefined
    setPreviewLoading(true)
    debounceRef.current = setTimeout(() => {
      smsApi.preview(seg, param)
        .then(d => setPreviewCount(d.count))
        .catch(() => setPreviewCount(null))
        .finally(() => setPreviewLoading(false))
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [form.segment, form.segmentParam])

  function openModal() {
    setForm(BLANK)
    setPreviewCount(null)
    setError('')
    setShowModal(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.message.trim()) return
    setSaving(true)
    setError('')
    try {
      await smsApi.create({
        name:         form.name.trim(),
        message:      form.message.trim(),
        templateId:   form.templateId.trim() || null,
        segment:      form.segment,
        segmentParam: form.segmentParam !== '' ? parseInt(form.segmentParam) : null,
      })
      setShowModal(false)
      setPage(0)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSend(id) {
    if (!window.confirm('Is campaign ko send karna chahte ho? Sab recipients ko SMS jayega.')) return
    setSendingId(id)
    setError('')
    try {
      await smsApi.send(id)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSendingId(null)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Campaign permanently delete karo?')) return
    setError('')
    try {
      await smsApi.remove(id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const segInfo  = SEGMENTS.find(s => s.value === form.segment)
  const charCount = form.message.length
  const smsCount  = Math.ceil(charCount / 160) || 1

  const totalSent      = campaigns.reduce((s, c) => s + (c.sentCount || 0), 0)
  const totalRecipients = campaigns.reduce((s, c) => s + (c.totalRecipients || 0), 0)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>SMS Marketing</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>Customer segments ko bulk SMS bhejo</p>
        </div>
        <button onClick={openModal} style={{
          padding: '8px 16px', background: '#e53e3e', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
        }}>+ New Campaign</button>
      </div>

      {/* Config banner */}
      {configured === false && (
        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e',
        }}>
          ⚠️ <strong>Demo Mode:</strong> MSG91 auth key configure nahi hai. Campaigns simulate honge — actual SMS nahi jayega.
          Set <code style={{ background: '#fde68a', padding: '1px 4px', borderRadius: 3 }}>MSG91_AUTH_KEY</code> env var in Cloud Run.
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b',
        }}>{error}</div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Campaigns', value: campaigns.length },
          { label: 'Total Recipients', value: totalRecipients.toLocaleString('en-IN') },
          { label: 'Total Sent', value: totalSent.toLocaleString('en-IN') },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Campaign table */}
      <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaed' }}>
              {['Campaign', 'Segment', 'Recipients', 'Sent / Failed', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading campaigns...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Koi campaign nahi — pehla campaign banao!</td></tr>
            ) : campaigns.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.message}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151' }}>
                  {SEGMENTS.find(s => s.value === c.segment)?.label || c.segment}
                  {c.segmentParam && <span style={{ color: '#9ca3af', marginLeft: 4 }}>({c.segmentParam})</span>}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, color: '#1f2937' }}>
                  {(c.totalRecipients || 0).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13 }}>
                  <span style={{ color: '#065f46', fontWeight: 600 }}>{c.sentCount || 0}</span>
                  {' / '}
                  <span style={{ color: c.failedCount > 0 ? '#991b1b' : '#9ca3af' }}>{c.failedCount || 0}</span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <StatusBadge status={c.status} />
                </td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>
                  {c.sentAt
                    ? new Date(c.sentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                    : new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(c.status === 'DRAFT' || c.status === 'FAILED') && (
                      <button onClick={() => handleSend(c.id)} disabled={sendingId === c.id} style={{
                        padding: '4px 10px', background: '#10b981', color: '#fff',
                        border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        opacity: sendingId === c.id ? 0.6 : 1,
                      }}>{sendingId === c.id ? '...' : '📤 Send'}</button>
                    )}
                    {c.status !== 'SENDING' && (
                      <button onClick={() => handleDelete(c.id)} style={{
                        padding: '4px 10px', background: '#fee2e2', color: '#991b1b',
                        border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      }}>🗑</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 14px', borderTop: '1px solid #f3f4f6' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ padding: '4px 12px', borderRadius: 5, border: '1px solid #e8eaed', background: '#fff', cursor: 'pointer', fontSize: 12 }}>←</button>
            <span style={{ fontSize: 12, color: '#6b7280', lineHeight: '28px' }}>Page {page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ padding: '4px 12px', borderRadius: 5, border: '1px solid #e8eaed', background: '#fff', cursor: 'pointer', fontSize: 12 }}>→</button>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 540, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>New SMS Campaign</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>

            <form onSubmit={handleCreate}>

              {/* Name */}
              <Field label="Campaign Name *">
                <input
                  type="text" required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Weekend Special Offer"
                  style={inputStyle}
                />
              </Field>

              {/* Segment */}
              <Field label="Target Segment *">
                <select
                  value={form.segment}
                  onChange={e => setForm(f => ({ ...f, segment: e.target.value, segmentParam: '' }))}
                  style={inputStyle}
                >
                  {SEGMENTS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>

              {/* Segment param */}
              {segInfo?.hasParam && (
                <Field label={segInfo.paramLabel}>
                  <input
                    type="number" min="1"
                    value={form.segmentParam}
                    onChange={e => setForm(f => ({ ...f, segmentParam: e.target.value }))}
                    placeholder={String(segInfo.defaultParam)}
                    style={inputStyle}
                  />
                </Field>
              )}

              {/* Recipient preview */}
              <div style={{
                background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 7,
                padding: '9px 12px', marginBottom: 16, fontSize: 13, color: '#0369a1',
              }}>
                {previewLoading
                  ? '⏳ Recipients count kar rahe hain...'
                  : previewCount !== null
                    ? `📱 ${previewCount.toLocaleString('en-IN')} customers ko SMS milega`
                    : '—'}
              </div>

              {/* Message */}
              <Field label={
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SMS Message *</span>
                  <span style={{ fontWeight: 400, color: charCount > 160 ? '#e53e3e' : '#6b7280' }}>
                    {charCount} chars · {smsCount} SMS
                  </span>
                </div>
              }>
                <textarea
                  required
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="SMS content yahan likho. DLT template ke andar hona chahiye."
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </Field>

              {/* Template ID */}
              <Field label={
                <span>MSG91 Template ID <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional — DLT approved)</span></span>
              }>
                <input
                  type="text"
                  value={form.templateId}
                  onChange={e => setForm(f => ({ ...f, templateId: e.target.value }))}
                  placeholder="65f2a8b3d6fc0556..."
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }}
                />
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  MSG91 Dashboard → DLT → Templates → Template ID copy karo
                </div>
              </Field>

              {error && (
                <div style={{ background: '#fee2e2', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#991b1b' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: '8px 18px', border: '1px solid #e8eaed', borderRadius: 7,
                  background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151',
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  padding: '8px 18px', background: '#e53e3e', color: '#fff',
                  border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  opacity: saving ? 0.7 : 1,
                }}>{saving ? 'Saving...' : 'Save Campaign'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #e8eaed',
  borderRadius: 7, fontSize: 13, boxSizing: 'border-box', outline: 'none',
}
