/**
 * Customer Facing Display (CFD) — second monitor / screen for the customer.
 * URL: /cfd/:restaurantId
 * No auth required — cashier opens this on second screen.
 *
 * Subscribe to /topic/cfd/{restaurantId} via WebSocket.
 * POS pushes cart updates via POST /api/v1/cfd/update.
 */
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/ws'

export default function CustomerFacingDisplay() {
  const { restaurantId } = useParams()
  const [cart, setCart]         = useState(null)
  const [billDone, setBillDone] = useState(null)
  const [wsOk, setWsOk]         = useState(false)
  const stompRef = useRef(null)

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      onConnect: () => {
        setWsOk(true)
        client.subscribe(`/topic/cfd/${restaurantId}`, (msg) => {
          try {
            const data = JSON.parse(msg.body)
            if (data.type === 'CLEAR') {
              setCart(null)
              setBillDone(null)
            } else if (data.type === 'CART_UPDATE') {
              setCart(data)
              setBillDone(null)
            } else if (data.type === 'BILL_DONE') {
              setBillDone(data)
              setCart(null)
              setTimeout(() => setBillDone(null), 8000)
            }
          } catch (_) {}
        })
      },
      onDisconnect: () => setWsOk(false),
    })
    client.activate()
    stompRef.current = client
    return () => client.deactivate()
  }, [restaurantId])

  // ── Bill Done splash ────────────────────────────────────────────
  if (billDone) {
    return (
      <div style={fullScreen('#0f2f1a')}>
        <div style={{ textAlign: 'center', color: '#4ade80' }}>
          <div style={{ fontSize: 100 }}>✅</div>
          <div style={{ fontSize: 48, fontWeight: 800, marginTop: 16 }}>Thank You!</div>
          <div style={{ fontSize: 32, marginTop: 12, color: '#bbf7d0' }}>
            Total: ₹{billDone.total?.toFixed(2)}
          </div>
          <div style={{ fontSize: 18, marginTop: 16, color: '#86efac' }}>
            {billDone.billNumber}
          </div>
          <div style={{ fontSize: 16, marginTop: 8, color: '#6ee7b7', opacity: 0.8 }}>
            Please visit again! 🙏
          </div>
        </div>
      </div>
    )
  }

  // ── Idle state ──────────────────────────────────────────────────
  if (!cart) {
    return (
      <div style={fullScreen('#0a0a0a')}>
        <div style={{ textAlign: 'center', color: '#fff', opacity: 0.5 }}>
          <div style={{ fontSize: 80 }}>🍽️</div>
          <div style={{ fontSize: 32, marginTop: 16, fontWeight: 300 }}>Welcome!</div>
          <div style={{ fontSize: 16, marginTop: 8 }}>Your order will appear here</div>
          <div style={{ fontSize: 11, marginTop: 32, color: wsOk ? '#4ade80' : '#ef4444' }}>
            {wsOk ? '● Live' : '○ Connecting…'}
          </div>
        </div>
      </div>
    )
  }

  // ── Active cart ─────────────────────────────────────────────────
  const items   = cart.items ?? []
  const subtotal = cart.subtotal ?? 0
  const discount = cart.discount ?? 0
  const total    = cart.total ?? 0

  return (
    <div style={{ ...fullScreen('#111827'), display: 'flex', flexDirection: 'column', padding: 0 }}>
      {/* Header */}
      <div style={{ background: '#1f2937', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#f9fafb', fontSize: 22, fontWeight: 700 }}>🧾 Your Order</div>
        <div style={{ color: '#4ade80', fontSize: 13 }}>● Live</div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
        {items.length === 0 ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: 40, fontSize: 18 }}>
            Items will appear as they're added…
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #374151' }}>
                <th style={{ color: '#9ca3af', textAlign: 'left', padding: '12px 0', fontSize: 14, fontWeight: 500 }}>Item</th>
                <th style={{ color: '#9ca3af', textAlign: 'right', padding: '12px 0', fontSize: 14, fontWeight: 500 }}>Qty</th>
                <th style={{ color: '#9ca3af', textAlign: 'right', padding: '12px 0', fontSize: 14, fontWeight: 500 }}>Price</th>
                <th style={{ color: '#9ca3af', textAlign: 'right', padding: '12px 0', fontSize: 14, fontWeight: 500 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ color: '#f3f4f6', padding: '14px 0', fontSize: 18 }}>{item.name}</td>
                  <td style={{ color: '#d1d5db', textAlign: 'right', padding: '14px 0', fontSize: 18 }}>{item.qty}</td>
                  <td style={{ color: '#d1d5db', textAlign: 'right', padding: '14px 0', fontSize: 18 }}>₹{item.price?.toFixed(2)}</td>
                  <td style={{ color: '#f9fafb', textAlign: 'right', padding: '14px 0', fontSize: 18, fontWeight: 600 }}>₹{((item.qty || 1) * (item.price || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Totals footer */}
      <div style={{ background: '#1f2937', padding: '20px 32px', borderTop: '2px solid #374151' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
          <TotalRow label="Subtotal" value={subtotal} color="#9ca3af" size={18} />
          {discount > 0 && <TotalRow label="Discount" value={-discount} color="#4ade80" size={18} />}
          <div style={{ width: '100%', maxWidth: 340, borderTop: '2px solid #374151', margin: '10px 0' }} />
          <TotalRow label="Total" value={total} color="#f9fafb" size={32} bold />
        </div>
      </div>
    </div>
  )
}

function TotalRow({ label, value, color, size, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 340, marginBottom: 4 }}>
      <span style={{ color: '#6b7280', fontSize: size, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ color, fontSize: size, fontWeight: bold ? 800 : 500 }}>
        {value < 0 ? '-' : ''}₹{Math.abs(value).toFixed(2)}
      </span>
    </div>
  )
}

const fullScreen = (bg) => ({
  width: '100vw', height: '100vh', background: bg,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: "'Segoe UI', sans-serif",
})
