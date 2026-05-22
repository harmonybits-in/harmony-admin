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

export default function CustomerSegments() {
  const rid      = useAuthStore(s => s.restaurantId)
  const navigate = useNavigate()

  const [stats,    setStats]    = useState({})
  const [loading,  setLoading]  = useState(true)
  const [running,  setRunning]  = useState(false)
  const [lastRun,  setLastRun]  = useState(null)

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
              <div key={key}
                onClick={() => navigate(`/customers?segment=${key}`)}
                style={{
                  background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)',
                  padding: '18px 20px', cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s',
                  borderLeft: `4px solid ${meta.color}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.12)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.08)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 22 }}>{meta.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1C', marginTop: 6 }}>{meta.label}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{meta.desc}</div>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: meta.color }}>{count}</div>
                </div>
              </div>
            )
          })}
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
