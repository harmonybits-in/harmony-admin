import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

function Stars({ rating, size = 16 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= rating ? '#f59e0b' : '#d1d5db' }}>★</span>
      ))}
    </span>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const CATEGORY_COLORS = {
  FOOD:      { bg: '#fef3c7', text: '#d97706' },
  SERVICE:   { bg: '#dbeafe', text: '#2563eb' },
  AMBIENCE:  { bg: '#ede9fe', text: '#7c3aed' },
  OVERALL:   { bg: '#d1fae5', text: '#059669' },
}

// ── Respond Modal ─────────────────────────────────────────────────────────
function RespondModal({ feedback, onClose, onSaved, toast }) {
  const [response, setResponse] = useState(feedback.staffResponse || '')
  const [saving, setSaving]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!response.trim()) return toast.error('Response likhna padega')
    setSaving(true)
    try {
      await api.patch(`/feedback/${feedback.id}/respond`, { response: response.trim() })
      toast.success('Response saved')
      onSaved()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 500,
        padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Respond to Feedback</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Original feedback */}
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-page)',
          border: '1px solid var(--border)', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{feedback.customerName || 'Anonymous'}</span>
            <Stars rating={feedback.rating} size={14} />
          </div>
          {feedback.category && (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, marginBottom: 8, display: 'inline-block',
              background: CATEGORY_COLORS[feedback.category]?.bg || '#f3f4f6',
              color: CATEGORY_COLORS[feedback.category]?.text || '#374151', fontWeight: 600 }}>
              {feedback.category}
            </span>
          )}
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
            {feedback.comment || '(No comment)'}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Your Response *</label>
            <textarea value={response} onChange={e => setResponse(e.target.value)}
              rows={4} placeholder="Customer ko response likho…"
              style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text)',
                fontSize: 13, boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: saving ? '#ccc' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Saving…' : 'Send Response'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function CustomerFeedback() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [feedbacks,  setFeedbacks]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('ALL') // ALL | PENDING | RESPONDED | 1-5
  const [selected,   setSelected]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/feedback')
      setFeedbacks(Array.isArray(data) ? data : [])
    } catch { setFeedbacks([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Stats
  const total      = feedbacks.length
  const responded  = feedbacks.filter(f => f.responded).length
  const pending    = total - responded
  const avgRating  = total > 0
    ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / total).toFixed(1)
    : '—'
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    r, count: feedbacks.filter(f => f.rating === r).length
  }))

  const filtered = feedbacks.filter(f => {
    if (filter === 'PENDING')   return !f.responded
    if (filter === 'RESPONDED') return !!f.responded
    if (/^[1-5]$/.test(filter)) return f.rating === Number(filter)
    return true
  })

  const FILTERS = [
    { key: 'ALL',       label: `All (${total})` },
    { key: 'PENDING',   label: `Pending (${pending})` },
    { key: 'RESPONDED', label: `Responded (${responded})` },
    { key: '5', label: '★★★★★' },
    { key: '4', label: '★★★★' },
    { key: '3', label: '★★★' },
    { key: '2', label: '★★' },
    { key: '1', label: '★' },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>💬 Customer Feedback</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Customer reviews dekhna aur respond karna
        </p>
      </div>

      {/* Summary row */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, marginBottom: 20 }}>
          {/* Rating overview card */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '20px 24px', minWidth: 200 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
              {avgRating}
            </div>
            <Stars rating={Math.round(Number(avgRating))} size={18} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              Based on {total} reviews
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ratingDist.map(({ r, count }) => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{ width: 8, color: 'var(--text-muted)' }}>{r}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: '#f59e0b',
                      width: total > 0 ? `${(count / total) * 100}%` : '0%' }} />
                  </div>
                  <span style={{ color: 'var(--text-muted)', width: 16 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 12 }}>
            {[
              { label: 'Total Reviews', value: total,     color: '#6366f1' },
              { label: 'Responded',     value: responded, color: '#10b981' },
              { label: 'Pending',       value: pending,   color: '#f59e0b' },
              { label: 'Avg Rating',    value: avgRating, color: '#f59e0b' },
            ].map(c => (
              <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)',
              background: filter === f.key ? 'var(--accent)' : 'transparent',
              color: filter === f.key ? '#fff' : 'var(--text)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Feedback list */}
      {loading ? <SkeletonTable rows={5} /> : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
          <div>Koi feedback nahi mila</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(f => {
            const catColors = CATEGORY_COLORS[f.category] || { bg: '#f3f4f6', text: '#374151' }
            return (
              <div key={f.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{f.customerName || 'Anonymous'}</span>
                      {f.customerPhone && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {f.customerPhone}
                        </span>
                      )}
                      <Stars rating={f.rating} size={14} />
                      {f.category && (
                        <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 700,
                          background: catColors.bg, color: catColors.text }}>
                          {f.category}
                        </span>
                      )}
                      {f.orderType && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.orderType}</span>
                      )}
                      {f.source && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>via {f.source}</span>
                      )}
                    </div>

                    {/* Comment */}
                    {f.comment && (
                      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>
                        "{f.comment}"
                      </div>
                    )}

                    {/* Staff response */}
                    {f.staffResponse && (
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-page)',
                        border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.5 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                          Your Response
                        </div>
                        {f.staffResponse}
                        {f.respondedAt && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {fmtDate(f.respondedAt)}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                      {fmtDate(f.createdAt)}
                    </div>
                  </div>

                  {/* Action */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    {f.responded ? (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                        background: '#d1fae5', color: '#059669' }}>✓ Responded</span>
                    ) : (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                        background: '#fef3c7', color: '#d97706' }}>Pending</span>
                    )}
                    <button onClick={() => setSelected(f)}
                      style={{ padding: '7px 16px', borderRadius: 8, border: 'none',
                        background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      {f.responded ? 'Edit Response' : 'Respond'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <RespondModal feedback={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load() }}
          toast={toast} />
      )}
    </div>
  )
}
