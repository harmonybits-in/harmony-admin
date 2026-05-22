// src/pages/KitchenDisplay.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_API = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

const STATUS = {
  NEW:       { label: 'NEW',       color: '#ef4444', bg: '#1a0505', border: '#ef444440', colBg: '#140303' },
  PREPARING: { label: 'PREPARING', color: '#f59e0b', bg: '#1a1005', border: '#f59e0b40', colBg: '#110d03' },
  READY:     { label: 'READY',     color: '#22c55e', bg: '#041a09', border: '#22c55e40', colBg: '#031209' },
}

const ACTIVE_STATUSES = ['NEW', 'PREPARING', 'READY']

// ── API helpers ───────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('harmoney_token') || ''
}

async function kitchenFetch(path, opts = {}) {
  const res = await fetch(BASE_API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...opts.headers,
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

// ── Time helpers ──────────────────────────────────────────────────────────────
function timeElapsed(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)  return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`
}

function isUrgent(dateStr, thresholdMin = 15) {
  if (!dateStr) return false
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000 / 60)
  return diff >= thresholdMin
}

// returns elapsed seconds from dateStr to now
function elapsedSeconds(dateStr) {
  if (!dateStr) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000))
}

// formats seconds as "12m 30s" or "45s"
function formatCookTime(secs) {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s}s`
}

// color for cook timer: amber >10min, red >20min
function cookTimerColor(secs) {
  if (secs >= 20 * 60) return '#ef4444'
  if (secs >= 10 * 60) return '#f59e0b'
  return '#22c55e'
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, onAction, now }) {
  const [loading, setLoading] = useState(false)
  const cfg = STATUS[order.status] || STATUS.NEW
  const urgent = order.status === 'NEW' && isUrgent(order.createdAt)

  // Cook timer: PREPARING uses startedAt, NEW uses createdAt
  const timerBase = order.status === 'PREPARING' ? (order.startedAt || order.createdAt) : order.createdAt
  const cookSecs  = elapsedSeconds(timerBase)
  const timerColor = cookTimerColor(cookSecs)

  async function handleAction() {
    if (loading) return
    setLoading(true)
    try {
      await onAction(order)
    } finally {
      setLoading(false)
    }
  }

  const btnCfg = {
    NEW:       { label: 'Start Preparing', color: '#ef4444' },
    PREPARING: { label: 'Mark Ready',      color: '#f59e0b' },
    READY:     { label: 'Delivered',       color: '#22c55e' },
  }[order.status]

  return (
    <div style={{
      background: cfg.bg,
      border: `1.5px solid ${urgent ? cfg.color : cfg.border}`,
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      position: 'relative',
      boxShadow: urgent ? `0 0 12px ${cfg.color}33` : 'none',
      transition: 'box-shadow 0.3s',
    }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#f1f5f9',
          }}>
            #{order.id}
          </span>
          {order.isVip && (
            <span style={{
              background: '#78350f', color: '#fbbf24',
              fontSize: 10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 20, letterSpacing: 0.5,
            }}>
              ⭐ VIP
            </span>
          )}
          {urgent && (
            <span style={{
              background: '#450a0a', color: '#ef4444',
              fontSize: 10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 20, animation: 'kdsPulse 1.2s ease-in-out infinite',
            }}>
              URGENT
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {timeElapsed(order.createdAt)}
        </span>
      </div>

      {/* Section badge + cook timer row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        {order.sectionName ? (
          <span style={{
            background: '#1e1b4b',
            color: '#a5b4fc',
            border: '1px solid #4f46e544',
            borderRadius: 20,
            padding: '2px 10px',
            fontSize: 11,
            fontWeight: 600,
          }}>
            📍 {order.sectionName}
          </span>
        ) : (
          <span />
        )}
        {/* Cook timer — only for NEW and PREPARING */}
        {(order.status === 'NEW' || order.status === 'PREPARING') && (
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: timerColor,
            fontFamily: 'monospace',
            background: `${timerColor}18`,
            border: `1px solid ${timerColor}44`,
            borderRadius: 20,
            padding: '2px 10px',
          }}>
            ⏱ {formatCookTime(cookSecs)}
          </span>
        )}
      </div>

      {/* Items list */}
      <ul style={{ margin: 0, padding: '0 0 0 18px', listStyle: 'disc' }}>
        {(order.items || []).map((item, i) => (
          <li key={i} style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>
            {item}
          </li>
        ))}
        {(!order.items || order.items.length === 0) && (
          <li style={{ fontSize: 13, color: '#64748b' }}>No items</li>
        )}
      </ul>

      {/* Footer meta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {order.chefName && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Chef: <strong style={{ color: '#cbd5e1' }}>{order.chefName}</strong>
            </span>
          )}
          {order.estimatedTime && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Est: <strong style={{ color: '#cbd5e1' }}>{order.estimatedTime} min</strong>
            </span>
          )}
        </div>

        {btnCfg && (
          <button
            onClick={handleAction}
            disabled={loading}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: 'none',
              background: loading ? '#334155' : btnCfg.color,
              color: loading ? '#94a3b8' : '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            {loading ? 'Wait…' : btnCfg.label}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────
function KdsColumn({ statusKey, orders, onAction, now }) {
  const cfg = STATUS[statusKey]
  return (
    <div style={{
      flex: '1 1 0',
      minWidth: 260,
      background: cfg.colBg,
      borderRadius: 12,
      border: `1px solid ${cfg.border}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Column header */}
      <div style={{
        padding: '12px 16px',
        background: cfg.bg,
        borderBottom: `1px solid ${cfg.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: cfg.color,
            boxShadow: `0 0 8px ${cfg.color}`,
            display: 'inline-block',
            flexShrink: 0,
          }} />
          <span style={{ fontWeight: 800, fontSize: 14, color: cfg.color, letterSpacing: 0.5 }}>
            {cfg.label}
          </span>
        </div>
        <span style={{
          background: `${cfg.color}22`,
          color: cfg.color,
          borderRadius: 20,
          padding: '2px 10px',
          fontSize: 12,
          fontWeight: 700,
        }}>
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {orders.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 16px',
            color: '#475569', fontSize: 13,
          }}>
            No {cfg.label.toLowerCase()} orders
          </div>
        ) : (
          orders.map(order => (
            <OrderCard key={order.id} order={order} onAction={onAction} now={now} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  const bg = type === 'error' ? '#450a0a' : '#052e16'
  const color = type === 'error' ? '#fca5a5' : '#86efac'
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: bg, color, border: `1px solid ${color}40`,
      borderRadius: 10, padding: '12px 20px', fontSize: 14,
      fontWeight: 600, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      maxWidth: 320,
    }}>
      {msg}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KitchenDisplay() {
  const restaurantId = useAuthStore(s => s.restaurantId)

  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [now,     setNow]     = useState(Date.now())
  const [wsState, setWsState] = useState('connected') // connected always — hook auto-reconnects
  const [toast,   setToast]   = useState(null) // { msg, type }

  // ── Toast helper ──────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
  }, [])

  // ── Load orders ───────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    try {
      const data = await kitchenFetch(`/kitchen?restaurantId=${restaurantId}`)
      const list = Array.isArray(data) ? data : []
      setOrders(list.filter(o => ACTIVE_STATUSES.includes(o.status)))
    } catch (err) {
      showToast(err.message || 'Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }, [restaurantId, showToast])

  useEffect(() => { loadOrders() }, [loadOrders])

  // ── Auto-refresh timer (30s) ──────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now())
      loadOrders()
    }, 30000)
    return () => clearInterval(id)
  }, [loadOrders])

  // ── Tick every second for elapsed time display ────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // ── WebSocket — kitchen orders ────────────────────────────────────
  useWebSocket(`/topic/${restaurantId}/kitchen`, useCallback((order) => {
    setWsState('connected')
    setOrders(prev => {
      if (!ACTIVE_STATUSES.includes(order.status))
        return prev.filter(o => o.id !== order.id)
      const idx = prev.findIndex(o => o.id === order.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = order
        return updated
      }
      return [order, ...prev]
    })
  }, []))

  // ── WebSocket — auto-print on new KOT ────────────────────────────
  useWebSocket(`/topic/${restaurantId}/print`, useCallback((kot) => {
    if (!kot || !kot.kotRef) return
    const tableStr = kot.tableNumber > 0 ? `Table ${kot.tableNumber}` : kot.source || 'POS'
    const itemsHtml = (kot.items || []).map(i => `<tr><td style="padding:4px 8px;font-size:16px">${i}</td></tr>`).join('')
    const win = window.open('', '_blank', 'width=380,height=600')
    if (!win) return
    win.document.write(`
      <html><head><title>KOT</title>
      <style>body{font-family:monospace;margin:0;padding:16px}
      h2{text-align:center;font-size:20px;margin:0 0 4px}
      p{text-align:center;margin:2px 0;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      tr{border-bottom:1px dashed #ccc}
      .total{border-top:2px solid #000;font-weight:bold}
      </style></head>
      <body>
        <h2>${kot.kotRef}</h2>
        <p>${tableStr}</p>
        ${kot.billNumber ? `<p>Bill: ${kot.billNumber}</p>` : ''}
        <p>${new Date(kot.createdAt || Date.now()).toLocaleTimeString()}</p>
        <hr/>
        <table>${itemsHtml}</table>
        <hr/><p style="text-align:center;font-size:11px">** KOT **</p>
      </body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }, [restaurantId]))

  // ── Action handler ────────────────────────────────────────────────
  const handleAction = useCallback(async (order) => {
    try {
      if (order.status === 'NEW') {
        await kitchenFetch(`/kitchen/accept?orderId=${order.id}&chefName=Chef`, { method: 'POST' })
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'PREPARING', chefName: 'Chef' } : o))
        showToast(`Order #${order.id} is now PREPARING`)
      } else if (order.status === 'PREPARING') {
        await kitchenFetch(`/kitchen/status?orderId=${order.id}&status=READY`, { method: 'POST' })
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'READY' } : o))
        showToast(`Order #${order.id} is READY`)
      } else if (order.status === 'READY') {
        await kitchenFetch(`/kitchen/status?orderId=${order.id}&status=DELIVERED`, { method: 'POST' })
        setOrders(prev => prev.filter(o => o.id !== order.id))
        showToast(`Order #${order.id} delivered`)
      }
    } catch (err) {
      showToast(err.message || 'Action failed', 'error')
      throw err
    }
  }, [showToast])

  // ── Derived columns ───────────────────────────────────────────────
  const byStatus = {
    NEW:       orders.filter(o => o.status === 'NEW'),
    PREPARING: orders.filter(o => o.status === 'PREPARING'),
    READY:     orders.filter(o => o.status === 'READY'),
  }

  // ── Cook time stats ───────────────────────────────────────────────
  const readyWithTime = byStatus.READY.filter(o => o.actualTime > 0)
  const avgCookMin = readyWithTime.length > 0
    ? Math.round(readyWithTime.reduce((sum, o) => sum + o.actualTime, 0) / readyWithTime.length)
    : null

  const wsColor  = wsState === 'connected' ? '#22c55e' : wsState === 'error' ? '#ef4444' : '#f59e0b'
  const wsLabel  = wsState === 'connected' ? 'Live' : wsState === 'error' ? 'WS Error' : 'Connecting…'

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 24px',
      gap: 20,
      boxSizing: 'border-box',
    }}>
      {/* Keyframe for urgent pulse */}
      <style>{`
        @keyframes kdsPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
              Kitchen Display
            </h1>
            <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>
              Real-time KDS — {orders.length} active order{orders.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* WS status dot */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: 20, padding: '4px 12px',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: wsColor, display: 'inline-block',
              boxShadow: `0 0 6px ${wsColor}`,
            }} />
            <span style={{ fontSize: 12, color: wsColor, fontWeight: 600 }}>{wsLabel}</span>
          </div>
        </div>

        <button
          onClick={loadOrders}
          style={{
            padding: '9px 20px', borderRadius: 8, border: '1px solid #334155',
            background: '#1e293b', color: '#94a3b8',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 7,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#273548'}
          onMouseLeave={e => e.currentTarget.style.background = '#1e293b'}
        >
          <span>↻</span> Refresh
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {ACTIVE_STATUSES.map(s => {
          const cfg = STATUS[s]
          return (
            <div key={s} style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: 10, padding: '12px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{cfg.label}</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
                {byStatus[s].length}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Cook time stats bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Avg Cook Time</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>
            {avgCookMin !== null ? `${avgCookMin}m` : '—'}
          </span>
        </div>
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Orders in Queue</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
            {byStatus.NEW.length}
          </span>
        </div>
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 8,
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Preparing</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>
            {byStatus.PREPARING.length}
          </span>
        </div>
      </div>

      {/* ── Columns ── */}
      {loading ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#64748b', fontSize: 16, gap: 12,
        }}>
          <span style={{ fontSize: 24, animation: 'kdsPulse 1s ease-in-out infinite' }}>⊕</span>
          Loading kitchen orders…
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0, alignItems: 'flex-start' }}>
          {ACTIVE_STATUSES.map(s => (
            <KdsColumn
              key={s}
              statusKey={s}
              orders={byStatus[s]}
              onAction={handleAction}
              now={now}
            />
          ))}
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  )
}
