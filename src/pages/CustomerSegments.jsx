import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'

const SEGMENT_META = {
  CHAMPION:    { label: 'Champion',    icon: '⭐', color: '#f59e0b', desc: 'High spend + frequent + recent' },
  LOYAL:       { label: 'Loyal',       icon: '💚', color: '#16A34A', desc: 'Frequent visitors in last 30 days' },
  BIG_SPENDER: { label: 'Big Spender', icon: '💰', color: '#7c3aed', desc: 'High total spend (₹3000+)' },
  PROMISING:   { label: 'Promising',   icon: '📈', color: '#2563eb', desc: 'Growing customers, regular visits' },
  AT_RISK:     { label: 'At Risk',     icon: '⚠️',  color: '#FF5A00', desc: "Haven't visited in 30–60 days" },
  NEW:         { label: 'New',         icon: '✨', color: '#0891b2', desc: 'Joined in last 7 days' },
  LOST:        { label: 'Lost',        icon: '👻', color: '#DC2626', desc: 'Inactive for 60+ days' },
  OCCASIONAL:  { label: 'Occasional',  icon: '🌊', color: '#6b7280', desc: 'Visit rarely' },
}

const DEFAULT_MESSAGES = {
  CHAMPION:    'Aap hamare Star Customer hain, {{name}}! 🌟\nEk special thank you — aapki next visit pe 15% off.\nHamara pyaar aur respect hamesha aapke saath hai!',
  LOYAL:       'Hey {{name}}! 💚\nAap hamesha aate hain — bahut shukriya!\nAapke loyalty points: {{points}} 🎁\nAaj aajao, ek surprise wait kar raha hai!',
  BIG_SPENDER: 'Dear {{name}}, 💰\nAap hamare premium guest hain! Aapka total spend: {{spend}}.\nSpecial VIP offer: 20% off next order. Aajiye!',
  PROMISING:   'Hi {{name}}! 📈\nAap baar baar aate hain — hum notice karte hain!\nAapke {{points}} loyalty points hain. Aur kamaiye 🎯',
  AT_RISK:     'Hey {{name}}, hum aapko miss kar rahe hain! 😢\nKafi time ho gaya. Aajao wapas — 20% discount aapka intezaar kar raha hai.\nOffer sirf 7 din ke liye valid hai!',
  NEW:         'Welcome {{name}}! ✨\nHarmony mein aapka swagat hai!\nPehli visit pe special treatment milega — aajiye aur enjoy kariye 🎉',
  LOST:        '{{name}}, kahan ho aap? 👻\nBahut time ho gaya! Aapke {{points}} loyalty points expire hone wale hain.\nAajao wapas — 25% off sirf aapke liye! ❤️',
  OCCASIONAL:  'Hi {{name}}! 🌊\nAap kabhi kabhi aate hain — koi baat nahi!\nIs baar aajiye aur enjoy kariye special deal ke saath 😊',
}

export default function CustomerSegments() {
  const rid      = useAuthStore(s => s.restaurantId)
  const navigate = useNavigate()

  const [stats,    setStats]    = useState({})
  const [loading,  setLoading]  = useState(true)
  const [running,  setRunning]  = useState(false)
  const [lastRun,  setLastRun]  = useState(null)

  // Campaign modal state
  const [campaign,   setCampaign]   = useState(null)   // { segment, label, color, count }
  const [campMsg,    setCampMsg]    = useState('')
  const [sending,    setSending]    = useState(false)
  const [campResult, setCampResult] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    setLoading(true)
    try {
      const data = await api.get(`/customers/segment/stats?restaurantId=${rid}`)
      setStats(data ?? {})
    } catch (_) {}
    setLoading(false)
  }

  async function handleRunSegmentation() {
    setRunning(true)
    try {
      const res = await api.post('/customers/segment/run', { restaurantId: rid })
      setLastRun(res)
      if (res?.counts) setStats(res.counts)
      alert(`Segmentation complete! ${res?.segmented ?? 0} / ${res?.total ?? 0} customers segmented.`)
    } catch (err) {
      alert(err.message ?? 'Segmentation failed')
    }
    setRunning(false)
  }

  function openCampaign(key, meta, count) {
    setCampaign({ segment: key, label: meta.label, color: meta.color, icon: meta.icon, count })
    setCampMsg(DEFAULT_MESSAGES[key] || '')
    setCampResult(null)
  }

  async function sendCampaign() {
    if (!campMsg.trim()) return
    setSending(true)
    setCampResult(null)
    try {
      const res = await api.post(`/customers/segment/${campaign.segment}/whatsapp-campaign`, { message: campMsg })
      setCampResult(res)
    } catch (err) {
      setCampResult({ error: err.message || 'Campaign failed' })
    }
    setSending(false)
  }

  const total = Object.values(stats).reduce((a, b) => a + (b || 0), 0)

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: '#F7F8FA', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1C1C1C' }}>Customer Segments</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>AI-powered automatic customer categorization</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastRun && (
            <span style={{ fontSize: 12, color: '#666' }}>
              Last run: {lastRun.segmented}/{lastRun.total} segmented
            </span>
          )}
          <button onClick={handleRunSegmentation} disabled={running} style={{
            background: running ? '#e5e7eb' : '#FF5A00', color: running ? '#9ca3af' : '#fff',
            border: 'none', borderRadius: 8, padding: '9px 20px',
            fontSize: 14, fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {running ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #9ca3af',
                  borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Running…
              </>
            ) : 'Run Segmentation'}
          </button>
        </div>
      </div>

      {/* Stats summary */}
      {!loading && total > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)',
          padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666' }}>Total segmented customers:</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1C' }}>{total.toLocaleString()}</span>
        </div>
      )}

      {/* Segment cards grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading segments…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
          {Object.entries(SEGMENT_META).map(([key, meta]) => {
            const count = stats[key] ?? 0
            return (
              <div key={key} style={{
                background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)',
                padding: '18px 20px', borderLeft: `4px solid ${meta.color}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 22 }}>{meta.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1C', marginTop: 6 }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{meta.desc}</div>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: meta.color }}>{count}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => navigate(`/customers?segment=${key}`)}
                    style={{ flex: 1, padding: '7px 0', border: `1.5px solid ${meta.color}`, borderRadius: 8,
                      background: '#fff', color: meta.color, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    View Customers
                  </button>
                  <button onClick={() => openCampaign(key, meta, count)}
                    disabled={count === 0}
                    style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: 8,
                      background: count === 0 ? '#f3f4f6' : meta.color,
                      color: count === 0 ? '#9ca3af' : '#fff',
                      fontWeight: 600, fontSize: 12, cursor: count === 0 ? 'not-allowed' : 'pointer' }}>
                    📤 WhatsApp
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* WhatsApp Campaign Modal */}
      {campaign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => { if (!sending) { setCampaign(null); setCampResult(null) } }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
            padding: 28, boxShadow: '0 8px 40px rgba(0,0,0,.2)' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1C' }}>
                  {campaign.icon} {campaign.label} WhatsApp Campaign
                </div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 3 }}>
                  {campaign.count} customers ko message jayega
                </div>
              </div>
              <button onClick={() => { setCampaign(null); setCampResult(null) }}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32,
                  cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>

            {/* Variables hint */}
            <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '8px 12px', marginBottom: 14,
              fontSize: 12, color: '#16A34A', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600 }}>Variables:</span>
              {['{{name}}', '{{points}}', '{{spend}}'].map(v => (
                <code key={v} onClick={() => setCampMsg(m => m + v)}
                  style={{ background: '#DCFCE7', padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                    border: '1px solid #86EFAC', fontFamily: 'monospace' }}>
                  {v}
                </code>
              ))}
              <span style={{ color: '#888' }}>click to insert</span>
            </div>

            {/* Message textarea */}
            <textarea
              value={campMsg}
              onChange={e => setCampMsg(e.target.value)}
              disabled={sending || !!campResult?.sent}
              rows={7}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                border: '1.5px solid #E8E8E8', borderRadius: 10, fontSize: 14,
                fontFamily: 'system-ui, sans-serif', resize: 'vertical',
                outline: 'none', lineHeight: 1.6, color: '#1C1C1C' }}
              placeholder="Apna message yahan likhein…"
            />
            <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 4 }}>
              {campMsg.length} characters
            </div>

            {/* Result */}
            {campResult && !campResult.error && (
              <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '14px 16px', marginTop: 14,
                border: '1px solid #86EFAC' }}>
                <div style={{ fontWeight: 700, color: '#16A34A', marginBottom: 8 }}>✅ Campaign Sent!</div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                  <span>📤 Sent: <strong>{campResult.sent}</strong></span>
                  <span>❌ Failed: <strong>{campResult.failed}</strong></span>
                  <span>⏭️ Skipped: <strong>{campResult.skipped}</strong></span>
                </div>
              </div>
            )}
            {campResult?.error && (
              <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '12px 16px', marginTop: 14,
                border: '1px solid #FECACA', color: '#DC2626', fontSize: 13 }}>
                ⚠️ {campResult.error}
              </div>
            )}

            {/* Actions */}
            {!campResult?.sent && (
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button onClick={() => { setCampaign(null); setCampResult(null) }}
                  disabled={sending}
                  style={{ flex: 1, padding: '11px 0', border: '1.5px solid #E8E8E8', borderRadius: 10,
                    background: '#fff', color: '#666', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={sendCampaign}
                  disabled={sending || !campMsg.trim() || campaign.count === 0}
                  style={{ flex: 2, padding: '11px 0', border: 'none', borderRadius: 10,
                    background: sending ? '#e5e7eb' : campaign.color,
                    color: sending ? '#9ca3af' : '#fff',
                    fontWeight: 700, fontSize: 14, cursor: sending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {sending ? (
                    <>
                      <span style={{ width: 14, height: 14, border: '2px solid #9ca3af',
                        borderTopColor: 'transparent', borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                      Sending…
                    </>
                  ) : `📤 Send to ${campaign.count} customers`}
                </button>
              </div>
            )}
            {campResult?.sent && (
              <button onClick={() => { setCampaign(null); setCampResult(null) }}
                style={{ width: '100%', marginTop: 14, padding: '11px 0', border: 'none', borderRadius: 10,
                  background: '#1C1C1C', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* How it works */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1C', marginBottom: 10 }}>How it works — RFM Segmentation</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { letter: 'R', title: 'Recency', desc: 'Kitne din pehle aaya tha?' },
            { letter: 'F', title: 'Frequency', desc: 'Kitni baar aata hai?' },
            { letter: 'M', title: 'Monetary', desc: 'Kitna kharch karta hai?' },
          ].map(({ letter, title, desc }) => (
            <div key={letter} style={{ background: '#F7F8FA', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#FF5A00' }}>{letter}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1C', marginTop: 2 }}>{title}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{desc}</div>
            </div>
          ))}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 12, color: '#666' }}>
          Segmentation runs automatically every Sunday at midnight. Aap manually bhi trigger kar sakte hain.
        </p>
      </div>
    </div>
  )
}
