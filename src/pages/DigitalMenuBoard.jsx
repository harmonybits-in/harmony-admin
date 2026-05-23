/**
 * Digital Menu Board — TV/kiosk-style public menu display.
 * Route: /menu-board/:restaurantId  (PUBLIC — no auth)
 *
 * Auto-rotates through categories every 8 seconds.
 */
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1/public/qr'

// ── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <>
      <style>{`@keyframes dmb-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        border: '5px solid #1e293b', borderTopColor: '#f59e0b',
        animation: 'dmb-spin 0.9s linear infinite',
      }} />
    </>
  )
}

// ── Veg / Non-veg indicator ───────────────────────────────────────────────────

function VegDot({ isVeg }) {
  const color = isVeg ? '#22c55e' : '#ef4444'
  return (
    <div style={{
      width: 14, height: 14, borderRadius: 2,
      border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
    </div>
  )
}

// ── Item Card ─────────────────────────────────────────────────────────────────

function ItemCard({ item }) {
  return (
    <div style={{
      background: '#1e293b',
      borderRadius: 16,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #334155',
    }}>
      {item.imageUrl && (
        <div style={{ height: 160, overflow: 'hidden', flexShrink: 0 }}>
          <img
            src={item.imageUrl}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {(item.isVeg != null) && <div style={{ marginTop: 3 }}><VegDot isVeg={item.isVeg} /></div>}
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3, flex: 1 }}>
            {item.name}
          </div>
        </div>
        {item.description && (
          <div style={{
            fontSize: 13, color: '#94a3b8', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.description}
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 8, fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>
          ₹{Number(item.price).toLocaleString('en-IN')}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DigitalMenuBoard() {
  const { restaurantId } = useParams()

  const [menu, setMenu]           = useState([])
  const [restName, setRestName]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [activeCat, setActiveCat] = useState(0) // index into menu[]
  const intervalRef               = useRef(null)

  // Load menu
  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(`${BASE}/${restaurantId}/menu`)
        if (!res.ok) throw new Error('Menu unavailable')
        const data = await res.json()
        const cats = (data.menu ?? []).filter(c => c.items && c.items.length > 0)
        setMenu(cats)
        setRestName(data.restaurantName ?? 'Our Menu')
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchMenu()
  }, [restaurantId])

  // Auto-rotate categories every 8 seconds
  useEffect(() => {
    if (menu.length < 2) return
    intervalRef.current = setInterval(() => {
      setActiveCat(prev => (prev + 1) % menu.length)
    }, 8000)
    return () => clearInterval(intervalRef.current)
  }, [menu.length])

  // When user manually picks a category, restart the timer
  function selectCat(idx) {
    setActiveCat(idx)
    clearInterval(intervalRef.current)
    if (menu.length >= 2) {
      intervalRef.current = setInterval(() => {
        setActiveCat(prev => (prev + 1) % menu.length)
      }, 8000)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f172a', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Segoe UI', sans-serif",
      }}>
        <Spinner />
        <div style={{ color: '#64748b', marginTop: 20, fontSize: 16 }}>Loading menu…</div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f172a', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Segoe UI', sans-serif",
      }}>
        <div style={{ fontSize: 56 }}>📋</div>
        <div style={{ color: '#ef4444', fontSize: 18, marginTop: 16 }}>{error}</div>
      </div>
    )
  }

  const currentCat = menu[activeCat] ?? { items: [] }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      fontFamily: "'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#f1f5f9', letterSpacing: -0.5 }}>
            {restName}
          </div>
          <div style={{ fontSize: 15, color: '#64748b', marginTop: 2 }}>Menu</div>
        </div>
        {/* Live clock */}
        <Clock />
      </div>

      {/* ── Category pills ── */}
      {menu.length > 0 && (
        <div style={{
          padding: '16px 40px',
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          flexShrink: 0,
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
        }}>
          {menu.map((cat, idx) => (
            <button
              key={cat.categoryId ?? idx}
              onClick={() => selectCat(idx)}
              style={{
                padding: '10px 22px',
                borderRadius: 40,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 15,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                background: activeCat === idx ? '#f59e0b' : '#1e293b',
                color:      activeCat === idx ? '#0f172a' : '#94a3b8',
                boxShadow:  activeCat === idx ? '0 4px 16px #f59e0b44' : 'none',
              }}
            >
              {cat.categoryName}
            </button>
          ))}
        </div>
      )}

      {/* ── Items grid ── */}
      <div style={{ flex: 1, padding: '28px 40px 16px', overflowY: 'auto' }}>
        {menu.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: 20, marginTop: 80 }}>
            Menu items coming soon…
          </div>
        ) : (
          <>
            <div style={{
              fontSize: 26, fontWeight: 800, color: '#f59e0b',
              marginBottom: 20, letterSpacing: 0.5,
            }}>
              {currentCat.categoryName}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 20,
            }}>
              {currentCat.items.map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '14px 40px',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        {/* Progress dots */}
        {menu.length > 1 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {menu.map((_, idx) => (
              <div
                key={idx}
                onClick={() => selectCat(idx)}
                style={{
                  width: activeCat === idx ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: activeCat === idx ? '#f59e0b' : '#334155',
                  cursor: 'pointer',
                  transition: 'width 0.3s, background 0.3s',
                }}
              />
            ))}
          </div>
        )}
        <div style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
          Powered by Harmony OS
        </div>
      </div>

      {/* Keyframe animation injected here for category transition */}
      <style>{`
        @keyframes dmb-spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

// ── Live clock component ──────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
        {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
      </div>
    </div>
  )
}
