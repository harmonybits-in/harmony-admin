import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return d }
}

const PLATFORM_STYLE = {
  GOOGLE:      { bg: '#1d4ed8', text: '#fff', label: 'Google' },
  ZOMATO:      { bg: '#ef4444', text: '#fff', label: 'Zomato' },
  DINEOUT:     { bg: '#f97316', text: '#fff', label: 'Dineout' },
  TRIPADVISOR: { bg: '#22c55e', text: '#fff', label: 'TripAdvisor' },
  MANUAL:      { bg: '#64748b', text: '#fff', label: 'Manual' },
}

const SENTIMENT_STYLE = {
  POSITIVE: { bg: '#16a34a22', text: '#22c55e', label: 'Positive' },
  NEUTRAL:  { bg: '#f59e0b22', text: '#f59e0b', label: 'Neutral'  },
  NEGATIVE: { bg: '#ef444422', text: '#ef4444', label: 'Negative' },
}

const INPUT_STYLE = {
  background: '#334155', border: '1px solid #475569', color: '#fff',
  padding: '8px 12px', borderRadius: 6, width: '100%', fontSize: 13,
}
const BTN_STYLE = {
  background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
}
const CARD_STYLE = {
  background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '16px 20px',
}

// ── StarDisplay ───────────────────────────────────────────────────────────────

function StarDisplay({ rating = 0, size = 15 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= rating ? '#f59e0b' : '#475569' }}>★</span>
      ))}
    </span>
  )
}

// ── StarPicker ────────────────────────────────────────────────────────────────

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          style={{ fontSize: 26, cursor: 'pointer', color: i <= (hover || value) ? '#f59e0b' : '#475569', lineHeight: 1 }}
        >
          {i <= (hover || value) ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}

// ── Add Review Modal ──────────────────────────────────────────────────────────

function AddReviewModal({ onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    platform: 'GOOGLE', reviewerName: '', rating: 0,
    reviewDate: new Date().toISOString().slice(0, 10),
    reviewText: '', sourceUrl: '', isVerified: false,
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.reviewerName.trim()) return toast.error('Reviewer name required')
    if (!form.rating) return toast.error('Please select a rating')
    if (!form.reviewText.trim()) return toast.error('Review text required')
    setSaving(true)
    try {
      await api.post('/reviews', {
        platform:     form.platform,
        reviewerName: form.reviewerName.trim(),
        rating:       form.rating,
        reviewDate:   form.reviewDate,
        reviewText:   form.reviewText.trim(),
        sourceUrl:    form.sourceUrl.trim() || null,
        isVerified:   form.isVerified,
      })
      toast.success('Review added successfully')
      onSaved()
    } catch (err) { toast.error(err.message || 'Failed to add review') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1e293b', borderRadius: 14, width: '100%', maxWidth: 520,
        padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,.5)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>Add Review Manually</h3>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Platform */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
              Platform *
            </label>
            <select value={form.platform} onChange={e => set('platform', e.target.value)} style={INPUT_STYLE}>
              {Object.entries(PLATFORM_STYLE).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Reviewer Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
              Reviewer Name *
            </label>
            <input
              value={form.reviewerName}
              onChange={e => set('reviewerName', e.target.value)}
              placeholder="e.g. Rahul Sharma"
              style={INPUT_STYLE}
            />
          </div>

          {/* Star Rating */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>
              Rating *
            </label>
            <StarPicker value={form.rating} onChange={v => set('rating', v)} />
            {form.rating > 0 && (
              <span style={{ marginLeft: 10, fontSize: 13, color: '#94a3b8' }}>{form.rating} / 5</span>
            )}
          </div>

          {/* Review Date */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
              Review Date
            </label>
            <input
              type="date"
              value={form.reviewDate}
              onChange={e => set('reviewDate', e.target.value)}
              style={INPUT_STYLE}
            />
          </div>

          {/* Review Text */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
              Review Text *
            </label>
            <textarea
              value={form.reviewText}
              onChange={e => set('reviewText', e.target.value)}
              placeholder="Review content..."
              rows={4}
              style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }}
            />
          </div>

          {/* Source URL */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
              Source URL
            </label>
            <input
              value={form.sourceUrl}
              onChange={e => set('sourceUrl', e.target.value)}
              placeholder="https://..."
              style={INPUT_STYLE}
            />
          </div>

          {/* Verified toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.isVerified}
              onChange={e => set('isVerified', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#3b82f6' }}
            />
            <span style={{ fontSize: 13, color: '#e2e8f0' }}>Verified review</span>
          </label>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #475569',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ ...BTN_STYLE, flex: 1, padding: '10px',
              opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : 'Add Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Review Card ───────────────────────────────────────────────────────────────

function ReviewCard({ review, onDelete, onSaved, toast }) {
  const [expanded,     setExpanded]     = useState(false)
  const [replyOpen,    setReplyOpen]    = useState(false)
  const [replyText,    setReplyText]    = useState('')
  const [editingReply, setEditingReply] = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  const plt   = PLATFORM_STYLE[review.platform]   || PLATFORM_STYLE.MANUAL
  const senti = SENTIMENT_STYLE[review.sentiment] || null

  const TEXT_LIMIT = 200
  const isLong = review.reviewText && review.reviewText.length > TEXT_LIMIT

  async function submitReply() {
    if (!replyText.trim()) return toast.error('Reply cannot be empty')
    setSubmitting(true)
    try {
      await api.put(`/reviews/${review.id}/reply`, { reply: replyText.trim() })
      toast.success('Reply submitted')
      setReplyOpen(false)
      setEditingReply(false)
      onSaved()
    } catch (err) { toast.error(err.message || 'Failed to submit reply') }
    finally { setSubmitting(false) }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this review?')) return
    setDeleting(true)
    try {
      await api.delete(`/reviews/${review.id}`)
      toast.success('Review deleted')
      onSaved()
    } catch (err) { toast.error(err.message || 'Failed to delete') }
    finally { setDeleting(false) }
  }

  function openReply(editing = false) {
    setReplyText(review.ownerReply || '')
    setEditingReply(editing)
    setReplyOpen(true)
  }

  return (
    <div style={{ ...CARD_STYLE, position: 'relative' }}>

      {/* Top row: badges + delete */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Platform badge */}
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: plt.bg, color: plt.text }}>
            {plt.label}
          </span>

          {/* Verified */}
          {review.isVerified && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
              background: '#0ea5e922', color: '#06b6d4' }}>✓ Verified</span>
          )}

          {/* Sentiment */}
          {senti && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
              background: senti.bg, color: senti.text }}>
              {senti.label}
            </span>
          )}
        </div>

        {/* Delete button */}
        <button onClick={handleDelete} disabled={deleting}
          style={{ background: 'transparent', border: '1px solid #475569', color: '#ef4444',
            borderRadius: 6, padding: '4px 10px', cursor: deleting ? 'not-allowed' : 'pointer',
            fontSize: 12, opacity: deleting ? 0.5 : 1 }}>
          {deleting ? '...' : 'Delete'}
        </button>
      </div>

      {/* Reviewer + stars + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{review.reviewerName || 'Anonymous'}</span>
        <StarDisplay rating={review.rating} />
        <span style={{ fontSize: 11, color: '#64748b' }}>{fmtDate(review.reviewDate || review.createdAt)}</span>
        {review.sourceUrl && (
          <a href={review.sourceUrl} target="_blank" rel="noreferrer"
            style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none' }}>View Source →</a>
        )}
      </div>

      {/* Review text */}
      {review.reviewText && (
        <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 10 }}>
          {isLong && !expanded
            ? review.reviewText.slice(0, TEXT_LIMIT) + '...'
            : review.reviewText}
          {isLong && (
            <button onClick={() => setExpanded(x => !x)}
              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer',
                fontSize: 12, padding: '0 4px', fontWeight: 600 }}>
              {expanded ? ' Show less' : ' Read more'}
            </button>
          )}
        </div>
      )}

      {/* Owner reply */}
      {review.ownerReply && !replyOpen && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#0f172a',
          border: '1px solid #1e3a5f', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>
            Owner Reply
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.55 }}>{review.ownerReply}</div>
          <button onClick={() => openReply(true)}
            style={{ marginTop: 8, background: 'none', border: 'none', color: '#3b82f6',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
            Edit reply
          </button>
        </div>
      )}

      {/* Inline reply textarea */}
      {replyOpen && (
        <div style={{ marginBottom: 10 }}>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write your reply..."
            rows={3}
            autoFocus
            style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submitReply} disabled={submitting}
              style={{ ...BTN_STYLE, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Submitting...' : 'Submit Reply'}
            </button>
            <button onClick={() => setReplyOpen(false)}
              style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8',
                borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reply button (if no reply yet) */}
      {!review.ownerReply && !replyOpen && (
        <button onClick={() => openReply(false)}
          style={{ ...BTN_STYLE, background: '#1d4ed8', fontSize: 12, padding: '6px 14px' }}>
          Reply
        </button>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
export default function ReviewManagement() {
  const toast = useToast()

  const [reviews,        setReviews]        = useState([])
  const [stats,          setStats]          = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [platformFilter, setPlatformFilter] = useState('ALL')
  const [ratingFilter,   setRatingFilter]   = useState('ALL')
  const [showAddModal,   setShowAddModal]   = useState(false)
  const [syncing,        setSyncing]        = useState({})

  const PLATFORMS = ['ALL', 'GOOGLE', 'ZOMATO', 'DINEOUT', 'TRIPADVISOR', 'MANUAL']
  const RATINGS   = ['ALL', '5', '4', '3', '2', '1']

  // ── Load reviews ────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = []
      if (platformFilter !== 'ALL') params.push(`platform=${platformFilter}`)
      if (ratingFilter   !== 'ALL') params.push(`rating=${ratingFilter}`)
      const qs = params.length ? '?' + params.join('&') : ''

      const [rev, st] = await Promise.allSettled([
        api.get(`/reviews${qs}`),
        api.get('/reviews/stats'),
      ])
      setReviews(rev.status === 'fulfilled' ? (Array.isArray(rev.value) ? rev.value : []) : [])
      setStats(st.status   === 'fulfilled' ? st.value : null)
    } catch { setReviews([]) }
    finally { setLoading(false) }
  }, [platformFilter, ratingFilter])

  useEffect(() => { load() }, [load])

  // ── Sync platform ────────────────────────────────────────────────
  async function handleSync(platform) {
    setSyncing(s => ({ ...s, [platform]: true }))
    try {
      const result = await api.post(`/reviews/sync/${platform}`, {})
      toast.success(result?.message || `${platform} sync complete`)
      load()
    } catch (err) {
      toast.error(err.message || `${platform} sync failed`)
    } finally {
      setSyncing(s => ({ ...s, [platform]: false }))
    }
  }

  // ── Stats ────────────────────────────────────────────────────────
  const totalReviews   = stats?.totalReviews   ?? reviews.length
  const avgRating      = stats?.averageRating  ?? (reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null)
  const responseRate   = stats?.responseRate   ?? null
  const ratingDist     = stats?.ratingDistribution ?? (() => {
    const dist = {}
    reviews.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1 })
    return dist
  })()

  const maxDist = Math.max(...[5, 4, 3, 2, 1].map(r => ratingDist[r] || 0), 1)

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#0f172a', color: '#fff' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
            Review Management
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Google, Zomato, Dineout — all reviews in one place
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={BTN_STYLE}>
          + Add Review
        </button>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, marginBottom: 20 }}>

        {/* Avg rating big display */}
        <div style={{ ...CARD_STYLE, minWidth: 190, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>
            {avgRating ? Number(avgRating).toFixed(1) : '—'}
          </div>
          <StarDisplay rating={Math.round(Number(avgRating) || 0)} size={18} />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            {totalReviews} total reviews
          </div>

          {/* Rating distribution mini-bars */}
          <div style={{ marginTop: 14, width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[5, 4, 3, 2, 1].map(r => {
              const count = ratingDist[r] || 0
              const pct   = totalReviews > 0 ? (count / Math.max(totalReviews, 1)) * 100 : 0
              return (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ color: '#f59e0b', width: 14, textAlign: 'right' }}>{r}★</span>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#334155' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: '#f59e0b',
                      width: `${pct}%`, transition: 'width .3s' }} />
                  </div>
                  <span style={{ color: '#64748b', width: 20 }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Total Reviews',  value: totalReviews,                    color: '#6366f1' },
            { label: 'Response Rate',  value: responseRate != null ? `${responseRate}%` : '—', color: '#22c55e' },
            { label: '5-Star Reviews', value: ratingDist[5] || 0,              color: '#f59e0b' },
            { label: '1-Star Reviews', value: ratingDist[1] || 0,              color: '#ef4444' },
          ].map(c => (
            <div key={c.label} style={CARD_STYLE}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sync buttons ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {['GOOGLE', 'ZOMATO', 'DINEOUT'].map(p => {
          const plt = PLATFORM_STYLE[p]
          return (
            <button key={p} onClick={() => handleSync(p)} disabled={!!syncing[p]}
              style={{ background: plt.bg, color: plt.text, border: 'none', borderRadius: 8,
                padding: '8px 18px', cursor: syncing[p] ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: 13, opacity: syncing[p] ? 0.6 : 1 }}>
              {syncing[p] ? `Syncing ${plt.label}...` : `Sync ${plt.label}`}
            </button>
          )
        })}
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {PLATFORMS.map(p => {
          const active = platformFilter === p
          return (
            <button key={p} onClick={() => setPlatformFilter(p)}
              style={{ padding: '6px 14px', borderRadius: 20,
                border: `1px solid ${active ? '#3b82f6' : '#334155'}`,
                background: active ? '#3b82f6' : 'transparent',
                color: active ? '#fff' : '#94a3b8',
                cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {p === 'ALL' ? 'All' : (PLATFORM_STYLE[p]?.label || p)}
            </button>
          )
        })}
      </div>

      {/* Rating filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {RATINGS.map(r => {
          const active = ratingFilter === r
          return (
            <button key={r} onClick={() => setRatingFilter(r)}
              style={{ padding: '5px 12px', borderRadius: 20,
                border: `1px solid ${active ? '#f59e0b' : '#334155'}`,
                background: active ? '#f59e0b22' : 'transparent',
                color: active ? '#f59e0b' : '#94a3b8',
                cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {r === 'ALL' ? 'All Ratings' : '★'.repeat(Number(r))}
            </button>
          )
        })}
      </div>

      {/* ── Review list ────────────────────────────────────────── */}
      {loading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : reviews.length === 0 ? (
        <div style={{ ...CARD_STYLE, textAlign: 'center', padding: '60px 24px', color: '#475569' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>No reviews found</div>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
            Try changing filters or sync a platform
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              toast={toast}
              onDelete={() => {}}
              onSaved={load}
            />
          ))}
        </div>
      )}

      {/* ── Add Review Modal ────────────────────────────────────── */}
      {showAddModal && (
        <AddReviewModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); load() }}
          toast={toast}
        />
      )}
    </div>
  )
}
