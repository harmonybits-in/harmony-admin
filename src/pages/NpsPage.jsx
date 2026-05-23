import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

// ── Style constants ───────────────────────────────────────────────────────────

const BG = '#0f172a'
const CARD = { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '18px 22px' }
const BTN = { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }
const INPUT = { background: '#334155', border: '1px solid #475569', color: '#fff', padding: '9px 12px', borderRadius: 7, fontSize: 13, width: '100%', boxSizing: 'border-box' }

const SOURCE_STYLE = {
  QR:     { bg: '#6366f122', color: '#818cf8' },
  ONLINE: { bg: '#0ea5e922', color: '#38bdf8' },
  KIOSK:  { bg: '#f59e0b22', color: '#fbbf24' },
  MANUAL: { bg: '#33415522', color: '#94a3b8' },
}

function npsColor(score) {
  if (score === null || score === undefined) return '#94a3b8'
  if (score >= 50) return '#22c55e'
  if (score >= 0) return '#f59e0b'
  return '#ef4444'
}

function scoreColor(s) {
  if (s >= 9) return '#22c55e'
  if (s >= 7) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(s) {
  if (s >= 9) return 'Promoter'
  if (s >= 7) return 'Passive'
  return 'Detractor'
}

// ── NPS Gauge ─────────────────────────────────────────────────────────────────

function NpsGauge({ score }) {
  const color = npsColor(score)
  const display = score != null ? (score > 0 ? `+${score}` : String(score)) : '—'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Outer ring */}
      <div style={{
        width: 160, height: 160, borderRadius: '50%',
        border: `10px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f172a',
        boxShadow: `0 0 40px ${color}44`,
        transition: 'all .4s',
      }}>
        <span style={{ fontSize: 42, fontWeight: 900, color, lineHeight: 1 }}>{display}</span>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: '0.08em' }}>NET PROMOTER SCORE</div>
      <div style={{ fontSize: 11, color: '#475569' }}>Scale: −100 to +100</div>
    </div>
  )
}

// ── Score Distribution Bar Chart ──────────────────────────────────────────────

function ScoreDistChart({ distribution }) {
  const maxCount = Math.max(...Object.values(distribution), 1)
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 14 }}>Score Distribution (0–10)</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => {
          const count = distribution[s] || 0
          const pct = (count / maxCount) * 100
          const color = s >= 9 ? '#22c55e' : s >= 7 ? '#f59e0b' : '#ef4444'
          return (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {count > 0 && (
                <span style={{ fontSize: 10, color: '#64748b' }}>{count}</span>
              )}
              <div style={{ width: '100%', height: `${Math.max(pct, 4)}%`, background: color,
                borderRadius: '3px 3px 0 0', minHeight: 4, transition: 'height .3s' }}
                title={`Score ${s}: ${count} responses`} />
              <span style={{ fontSize: 10, color: '#64748b' }}>{s}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {[
          { color: '#ef4444', label: 'Detractors (0–6)' },
          { color: '#f59e0b', label: 'Passives (7–8)' },
          { color: '#22c55e', label: 'Promoters (9–10)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Record NPS Modal ──────────────────────────────────────────────────────────

function RecordNpsModal({ restaurantId, onClose, onSaved }) {
  const [form, setForm] = useState({ customerName: '', customerPhone: '', score: null, feedback: '', source: 'MANUAL' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [hover, setHover] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!form.customerName.trim()) { setErr('Customer name is required'); return }
    if (form.score === null) { setErr('Please select a score (0–10)'); return }

    setSaving(true)
    try {
      await api.post(`/nps/submit?restaurantId=${restaurantId}`, {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || null,
        score: form.score,
        feedback: form.feedback.trim() || null,
        source: form.source,
      })
      onSaved()
    } catch (e) {
      setErr(e.message || 'Failed to record NPS')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1e293b', borderRadius: 14, width: '100%', maxWidth: 480,
        padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,.5)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>Record NPS Response</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        {err && (
          <div style={{ background: '#ef444422', border: '1px solid #ef444455', borderRadius: 7,
            color: '#ef4444', fontSize: 13, padding: '10px 14px', marginBottom: 14 }}>{err}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Customer Name *</label>
            <input value={form.customerName} onChange={e => set('customerName', e.target.value)} placeholder="e.g. Priya Sharma" style={INPUT} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Phone</label>
            <input value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} placeholder="+91 98765 43210" style={INPUT} />
          </div>

          {/* Score selector 0–10 */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>
              Score (0–10) * — How likely to recommend us?
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => {
                const active = form.score === s
                const isHov = hover === s
                const color = s >= 9 ? '#22c55e' : s >= 7 ? '#f59e0b' : '#ef4444'
                return (
                  <button key={s} type="button"
                    onClick={() => set('score', s)}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(null)}
                    style={{ width: 40, height: 40, borderRadius: 8, border: `2px solid ${active || isHov ? color : '#334155'}`,
                      background: active ? color : (isHov ? color + '22' : '#0f172a'),
                      color: active ? '#fff' : (isHov ? color : '#94a3b8'),
                      cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all .1s' }}>
                    {s}
                  </button>
                )
              })}
            </div>
            {form.score !== null && (
              <div style={{ marginTop: 8, fontSize: 12, color: scoreColor(form.score), fontWeight: 600 }}>
                {scoreLabel(form.score)} ({form.score >= 9 ? 'Very satisfied' : form.score >= 7 ? 'Satisfied' : 'Dissatisfied'})
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Feedback</label>
            <textarea value={form.feedback} onChange={e => set('feedback', e.target.value)}
              placeholder="What made you give this score?"
              rows={3}
              style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Source</label>
            <select value={form.source} onChange={e => set('source', e.target.value)} style={INPUT}>
              <option value="MANUAL">Manual</option>
              <option value="QR">QR</option>
              <option value="ONLINE">Online</option>
              <option value="KIOSK">Kiosk</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #475569',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ ...BTN, flex: 1, padding: 10, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : 'Record NPS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
export default function NpsPage() {
  const { restaurantId } = useAuthStore()

  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [st, en] = await Promise.allSettled([
        api.get(`/nps/stats?restaurantId=${restaurantId}`),
        api.get(`/nps/entries?restaurantId=${restaurantId}`),
      ])
      setStats(st.status === 'fulfilled' ? st.value : null)
      setEntries(en.status === 'fulfilled' ? (Array.isArray(en.value) ? en.value : []) : [])
    } finally { setLoading(false) }
  }, [restaurantId])

  useEffect(() => { load() }, [load])

  // Derive from entries if stats missing
  const npsScore = stats?.npsScore ?? (() => {
    if (!entries.length) return null
    const promoters = entries.filter(e => e.score >= 9).length
    const detractors = entries.filter(e => e.score <= 6).length
    return Math.round(((promoters - detractors) / entries.length) * 100)
  })()

  const promoterPct = stats?.promoterPercentage ?? (entries.length > 0
    ? Math.round((entries.filter(e => e.score >= 9).length / entries.length) * 100) : 0)
  const passivePct = stats?.passivePercentage ?? (entries.length > 0
    ? Math.round((entries.filter(e => e.score >= 7 && e.score <= 8).length / entries.length) * 100) : 0)
  const detractorPct = stats?.detractorPercentage ?? (entries.length > 0
    ? Math.round((entries.filter(e => e.score <= 6).length / entries.length) * 100) : 0)
  const totalResponses = stats?.totalResponses ?? entries.length

  const distribution = stats?.distribution ?? (() => {
    const d = {}
    entries.forEach(e => { d[e.score] = (d[e.score] || 0) + 1 })
    return d
  })()

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: BG, color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Net Promoter Score (NPS)</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Measure customer loyalty and satisfaction</p>
        </div>
        <button onClick={() => setShowModal(true)} style={BTN}>+ Record NPS</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <div style={{ width: 28, height: 28, border: '3px solid #334155', borderTopColor: '#3b82f6',
            borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Loading NPS data...
        </div>
      ) : (
        <>
          {/* Top section: gauge + stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, marginBottom: 20, alignItems: 'start', flexWrap: 'wrap' }}>
            <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 32px' }}>
              <NpsGauge score={npsScore} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Promoters (9–10)', value: `${promoterPct}%`, color: '#22c55e', desc: `${entries.filter(e => e.score >= 9).length} responses` },
                  { label: 'Passives (7–8)', value: `${passivePct}%`, color: '#f59e0b', desc: `${entries.filter(e => e.score >= 7 && e.score <= 8).length} responses` },
                  { label: 'Detractors (0–6)', value: `${detractorPct}%`, color: '#ef4444', desc: `${entries.filter(e => e.score <= 6).length} responses` },
                  { label: 'Total Responses', value: totalResponses, color: '#6366f1', desc: 'all time' },
                ].map(s => (
                  <div key={s.label} style={CARD}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              <div style={{ ...CARD }}>
                <ScoreDistChart distribution={distribution} />
              </div>
            </div>
          </div>

          {/* Responses table */}
          <div style={CARD}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>
              All Responses <span style={{ color: '#475569', fontWeight: 400, fontSize: 13 }}>({entries.length})</span>
            </div>

            {entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
                <div>No NPS responses yet. Record your first response!</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      {['Customer', 'Phone', 'Score', 'Feedback', 'Source', 'Date'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => {
                      const src = SOURCE_STYLE[e.source] || SOURCE_STYLE.MANUAL
                      return (
                        <tr key={e.id || idx}
                          style={{ borderBottom: '1px solid #1e293b' }}
                          onMouseEnter={ev => ev.currentTarget.style.background = '#0f172a'}
                          onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 12px', color: '#e2e8f0', fontWeight: 600 }}>{e.customerName || '—'}</td>
                          <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{e.customerPhone || '—'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontWeight: 800, fontSize: 15, color: scoreColor(e.score) }}>{e.score}</span>
                            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>{scoreLabel(e.score)}</span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#94a3b8', maxWidth: 220 }}>
                            {e.feedback
                              ? (e.feedback.length > 80 ? e.feedback.slice(0, 80) + '…' : e.feedback)
                              : <span style={{ color: '#334155' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                              background: src.bg, color: src.color }}>
                              {e.source || 'MANUAL'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {fmtDate(e.createdAt || e.date)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <RecordNpsModal
          restaurantId={restaurantId}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
