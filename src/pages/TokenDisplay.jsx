/**
 * Token Display — PUBLIC full-screen TV display.
 * Route: /token/:restaurantId
 *
 * Shows current token being served + waiting queue.
 * Auto-refreshes every 10 seconds.
 * Beeps via Web Audio API when nowServing changes.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1/tokens/display'

// Web Audio API soft beep
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15)

    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)

    // play a second tone slightly after
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.2)
    osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.45)
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.2)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
    osc2.start(ctx.currentTime + 0.2)
    osc2.stop(ctx.currentTime + 0.7)

    setTimeout(() => ctx.close(), 1000)
  } catch (_) {
    // Web Audio not available — silent fail
  }
}

function useLiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

function fmt12(date) {
  let h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`
}

export default function TokenDisplay() {
  const { restaurantId } = useParams()
  const now = useLiveClock()

  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [highlight, setHighlight] = useState(false) // flash on change
  const prevServing               = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/${restaurantId}`)
      if (!res.ok) throw new Error('Display unavailable')
      const json = await res.json()

      // Beep + flash when nowServing changes
      if (
        prevServing.current !== null &&
        json.nowServing !== prevServing.current
      ) {
        playBeep()
        setHighlight(true)
        setTimeout(() => setHighlight(false), 1500)
      }
      prevServing.current = json.nowServing

      setData(json)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const prefix      = data?.config?.prefix ?? 'T'
  const nowServing  = data?.nowServing
  const waiting     = data?.waiting ?? []
  const restName    = data?.restaurantName ?? 'Token Display'

  // Format display token
  function fmtToken(num) {
    if (num == null) return '---'
    return `${prefix}-${String(num).padStart(3, '0')}`
  }

  return (
    <div style={{
      minHeight: '100vh', height: '100vh',
      background: '#0f172a',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', system-ui, sans-serif",
      userSelect: 'none', overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: error ? '#ef4444' : '#22c55e',
            boxShadow: `0 0 10px ${error ? '#ef4444' : '#22c55e'}`,
            animation: 'blink 2s ease-in-out infinite',
          }} />
          <span style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>LIVE</span>
        </div>

        <div style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
          {restName}
        </div>

        <div style={{ color: '#64748b', fontSize: 13, fontFamily: 'monospace' }}>
          {fmt12(now)}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#475569', fontSize: 20 }}>Loading display…</div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 60 }}>📡</div>
          <div style={{ color: '#ef4444', fontSize: 20, fontWeight: 600 }}>Display Unavailable</div>
          <div style={{ color: '#475569', fontSize: 14 }}>{error}</div>
        </div>
      )}

      {/* Main content */}
      {!loading && !error && data && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 40px 20px' }}>
          {/* NOW SERVING — hero section */}
          <div style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 0,
          }}>
            <div style={{
              fontSize: 16, fontWeight: 700, letterSpacing: 6,
              color: '#64748b', marginBottom: 12, textTransform: 'uppercase',
            }}>
              Now Serving
            </div>

            <div style={{
              fontSize: 'clamp(100px, 22vw, 220px)',
              fontWeight: 900,
              lineHeight: 1,
              color: highlight ? '#4ade80' : '#22c55e',
              textShadow: `0 0 ${highlight ? '60px' : '30px'} ${highlight ? '#4ade8088' : '#22c55e44'}`,
              letterSpacing: '-4px',
              transition: 'color 0.3s, text-shadow 0.3s',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {nowServing != null ? fmtToken(nowServing) : '---'}
            </div>

            {/* Service type of current token */}
            {nowServing != null && waiting.length === 0 && (
              <div style={{ marginTop: 20, color: '#475569', fontSize: 16 }}>
                No customers waiting
              </div>
            )}
          </div>

          {/* WAITING section */}
          {waiting.length > 0 && (
            <div style={{ flexShrink: 0, paddingBottom: 8 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, letterSpacing: 4,
                color: '#475569', marginBottom: 14, textTransform: 'uppercase',
                textAlign: 'center',
              }}>
                Waiting
              </div>
              <div style={{
                display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap',
              }}>
                {waiting.slice(0, 5).map((t, idx) => (
                  <div key={t.tokenNumber ?? idx} style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    padding: '14px 22px',
                    textAlign: 'center',
                    minWidth: 110,
                    transition: 'transform 0.2s',
                  }}>
                    <div style={{
                      fontSize: 'clamp(24px, 3vw, 38px)',
                      fontWeight: 800,
                      color: '#94a3b8',
                      letterSpacing: '-1px',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {t.displayToken ?? fmtToken(t.tokenNumber)}
                    </div>
                    {t.customerName && (
                      <div style={{
                        fontSize: 12, color: '#475569',
                        marginTop: 4, fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', maxWidth: 120,
                      }}>
                        {t.customerName}
                      </div>
                    )}
                    {t.serviceType && (
                      <div style={{
                        fontSize: 10, color: '#334155',
                        marginTop: 4, textTransform: 'uppercase', letterSpacing: 1,
                      }}>
                        {t.serviceType}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '10px 40px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        background: 'rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 500, letterSpacing: 1 }}>
          POWERED BY{' '}
          <span style={{ color: '#334155', fontWeight: 700 }}>HARMONY OS</span>
        </span>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
