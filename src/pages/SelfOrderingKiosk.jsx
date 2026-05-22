/**
 * SelfOrderingKiosk.jsx — Customer-facing, full-screen, touch-optimized self-ordering kiosk.
 * Route: /kiosk/:restaurantId  (public — no auth required)
 *
 * Steps: 1 Welcome → 2 Table → 3 Menu → 4 Cart → 5 Confirmation
 *
 * API (public, no auth):
 *   GET  /api/v1/public/{restaurantId}/menu
 *   POST /api/v1/public/{restaurantId}/order
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1/public'

// ── Palette ────────────────────────────────────────────────────────
const C = {
  bg:     '#0f172a',
  card:   '#1e293b',
  input:  '#334155',
  text:   '#fff',
  muted:  '#94a3b8',
  border: '#334155',
  blue:   '#3b82f6',
  green:  '#22c55e',
  red:    '#ef4444',
  amber:  '#f59e0b',
  purple: '#8b5cf6',
}

// ── Global CSS injected once ──────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59,130,246,.5); }
    50%       { transform: scale(1.06); box-shadow: 0 0 0 18px rgba(59,130,246,0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(.85); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes countdown {
    from { stroke-dashoffset: 0; }
    to   { stroke-dashoffset: 126; }
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; overscroll-behavior: none; }
`

function GlobalStyles() {
  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = GLOBAL_CSS
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])
  return null
}

// ── Spinner ───────────────────────────────────────────────────────
function Spinner({ size = 40, color = C.blue }) {
  return (
    <div style={{
      width: size, height: size,
      border: `${size / 10}px solid ${C.border}`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin .8s linear infinite',
      display: 'inline-block',
    }} />
  )
}

// ── Veg/NonVeg indicator dot ──────────────────────────────────────
function VegDot({ isVeg }) {
  const color = isVeg ? C.green : C.red
  return (
    <div style={{
      width: 16, height: 16, borderRadius: 3,
      border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
    </div>
  )
}

// ── Qty Stepper ───────────────────────────────────────────────────
function Stepper({ qty, onAdd, onRemove, large }) {
  const size = large ? 40 : 30
  const fs   = large ? 20 : 16
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: large ? 10 : 6 }}>
      <button
        onClick={onRemove}
        style={{
          width: size, height: size, borderRadius: '50%', border: 'none',
          background: '#334155', color: '#fff', fontSize: fs + 2, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >−</button>
      <span style={{ fontWeight: 800, fontSize: fs + 2, minWidth: large ? 28 : 20, textAlign: 'center', color: C.text }}>
        {qty}
      </span>
      <button
        onClick={onAdd}
        style={{
          width: size, height: size, borderRadius: '50%', border: 'none',
          background: C.blue, color: '#fff', fontSize: fs + 2, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// STEP 1 — Welcome screen
// ════════════════════════════════════════════════════════════════════
function WelcomeStep({ restaurantName, onStart }) {
  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
      animation: 'fadeIn .5s ease',
    }}>
      <div style={{ fontSize: 56, marginBottom: 24 }}>🍽️</div>

      <h1 style={{
        fontSize: 'clamp(28px, 5vw, 52px)',
        fontWeight: 900, color: C.text, margin: 0, lineHeight: 1.15,
        letterSpacing: -1,
      }}>
        {restaurantName || 'Welcome'}
      </h1>

      <p style={{ fontSize: 18, color: C.muted, marginTop: 10, marginBottom: 48 }}>
        Self-Order Kiosk
      </p>

      <button
        onClick={onStart}
        style={{
          padding: '22px 64px',
          fontSize: 22,
          fontWeight: 800,
          borderRadius: 100,
          border: 'none',
          background: C.blue,
          color: '#fff',
          cursor: 'pointer',
          animation: 'pulse 2s ease-in-out infinite',
          letterSpacing: 0.5,
        }}
      >
        Tap to Start
      </button>

      <p style={{ fontSize: 13, color: '#475569', marginTop: 24 }}>
        Browse menu &amp; place your order
      </p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// STEP 2 — Select Table
// ════════════════════════════════════════════════════════════════════
function TableStep({ onContinue }) {
  const [table, setTable]       = useState(null)
  const [name, setName]         = useState('')
  const [customTable, setCustom] = useState('')
  const TABLES = Array.from({ length: 30 }, (_, i) => i + 1)

  function handleContinue() {
    const t = table || (customTable ? Number(customTable) : null)
    if (!t) return
    onContinue(t, name.trim())
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, padding: '40px 24px',
      animation: 'fadeIn .4s ease',
    }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: C.text, textAlign: 'center', marginBottom: 8 }}>
        Which table are you at?
      </h2>
      <p style={{ textAlign: 'center', color: C.muted, marginBottom: 32 }}>
        Select your table number
      </p>

      {/* Table grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
        gap: 12, maxWidth: 640, margin: '0 auto 28px',
      }}>
        {TABLES.map(t => (
          <button
            key={t}
            onClick={() => setTable(t)}
            style={{
              height: 80, borderRadius: 14, border: 'none',
              background: table === t ? C.blue : C.card,
              color: table === t ? '#fff' : C.text,
              fontSize: 22, fontWeight: 800,
              cursor: 'pointer',
              boxShadow: table === t ? `0 0 0 3px ${C.blue}55` : 'none',
              transition: 'all .15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Optional name field */}
      <div style={{ maxWidth: 400, margin: '0 auto 28px' }}>
        <label style={{ fontSize: 14, color: C.muted, display: 'block', marginBottom: 8 }}>
          Your name (optional)
        </label>
        <input
          type="text"
          placeholder="Enter your name…"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            width: '100%', padding: '14px 16px',
            background: C.input, border: '1px solid #475569',
            borderRadius: 12, color: C.text, fontSize: 16,
            outline: 'none',
          }}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleContinue}
          disabled={!table}
          style={{
            padding: '16px 56px', fontSize: 18, fontWeight: 800,
            borderRadius: 14, border: 'none',
            background: table ? C.blue : '#334155',
            color: '#fff', cursor: table ? 'pointer' : 'not-allowed',
            transition: 'background .2s',
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// STEP 3 — Browse Menu
// ════════════════════════════════════════════════════════════════════
function MenuStep({ restaurantName, categories, tableNumber, cart, onAdd, onRemove, onViewCart }) {
  const [activeCategory, setActiveCategory] = useState('ALL')
  const tabsRef = useRef(null)

  const allCats = [{ id: 'ALL', name: 'All' }, ...categories]

  const displayedProducts = activeCategory === 'ALL'
    ? categories.flatMap(c => c.products || [])
    : (categories.find(c => String(c.id) === String(activeCategory))?.products || [])

  const cartCount = Object.values(cart).reduce((s, v) => s + v.qty, 0)
  const cartTotal = Object.values(cart).reduce((s, v) => s + v.product.price * v.qty, 0)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        background: C.card, borderBottom: `1px solid ${C.border}`,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{restaurantName}</div>
          <div style={{ fontSize: 12, color: C.muted }}>Table {tableNumber}</div>
        </div>
        <button
          onClick={onViewCart}
          disabled={cartCount === 0}
          style={{
            position: 'relative', padding: '10px 18px',
            borderRadius: 12, border: 'none',
            background: cartCount > 0 ? C.blue : '#334155',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: cartCount > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          🛒 Cart
          {cartCount > 0 && (
            <span style={{
              position: 'absolute', top: -8, right: -8,
              background: C.red, color: '#fff',
              width: 20, height: 20, borderRadius: '50%',
              fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Category tabs */}
      <div
        ref={tabsRef}
        style={{
          display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px',
          background: C.bg, borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
          scrollbarWidth: 'none',
        }}
      >
        {allCats.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(String(cat.id))}
            style={{
              padding: '8px 18px', borderRadius: 24, border: 'none',
              background: String(activeCategory) === String(cat.id) ? C.blue : C.card,
              color: String(activeCategory) === String(cat.id) ? '#fff' : C.muted,
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              cursor: 'pointer', transition: 'all .15s',
              flexShrink: 0,
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: cartCount > 0 ? 100 : 24 }}>
        {displayedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
            No items in this category
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 14,
          }}>
            {displayedProducts.map(product => {
              const inCart = cart[product.id]
              const qty    = inCart?.qty ?? 0
              const unavailable = !product.isAvailable

              return (
                <div
                  key={product.id}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14, padding: '16px',
                    position: 'relative',
                    opacity: unavailable ? 0.5 : 1,
                    animation: 'fadeIn .3s ease',
                  }}
                >
                  {unavailable && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 14,
                      background: '#0f172aaa',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: C.red, zIndex: 1,
                    }}>
                      Not Available
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <VegDot isVeg={product.isVeg} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>
                        {product.name}
                      </div>
                    </div>
                  </div>

                  {product.description && (
                    <p style={{
                      fontSize: 12, color: C.muted, margin: '0 0 12px',
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      lineHeight: 1.5,
                    }}>
                      {product.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: C.green }}>
                      ₹{product.price}
                    </span>

                    {!unavailable && (
                      qty > 0 ? (
                        <Stepper
                          qty={qty}
                          onAdd={() => onAdd(product)}
                          onRemove={() => onRemove(product.id)}
                        />
                      ) : (
                        <button
                          onClick={() => onAdd(product)}
                          style={{
                            padding: '8px 20px', borderRadius: 10, border: 'none',
                            background: C.blue, color: '#fff',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          + Add
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart summary bottom bar */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: C.blue, padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', zIndex: 50,
        }}
          onClick={onViewCart}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {cartCount} item{cartCount !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
            View Cart →
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            ₹{cartTotal.toFixed(0)}
          </span>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// STEP 4 — Cart / Review Order
// ════════════════════════════════════════════════════════════════════
function CartStep({ cart, tableNumber, onAdd, onRemove, onDelete, onBack, onPlaceOrder, placing }) {
  const [paymentMode, setPaymentMode] = useState('CASH')

  const cartItems = Object.values(cart)
  const total     = cartItems.reduce((s, v) => s + v.product.price * v.qty, 0)

  const PAYMENT_MODES = [
    { key: 'CASH',  label: 'Cash',  icon: '💵' },
    { key: 'UPI',   label: 'UPI',   icon: '📱' },
    { key: 'CARD',  label: 'Card',  icon: '💳' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: C.card, borderBottom: `1px solid ${C.border}`,
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px', borderRadius: 10, border: '1px solid #475569',
            background: 'transparent', color: C.muted, fontSize: 14, cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>Review Order</div>
          <div style={{ fontSize: 12, color: C.muted }}>Table {tableNumber}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 24 }}>
        {/* Cart items */}
        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted }}>
            Your cart is empty
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {cartItems.map(({ product, qty }) => (
              <div
                key={product.id}
                style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <VegDot isVeg={product.isVeg} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>₹{product.price} each</div>
                </div>
                <Stepper
                  qty={qty}
                  onAdd={() => onAdd(product)}
                  onRemove={() => onRemove(product.id)}
                />
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, minWidth: 56, textAlign: 'right' }}>
                  ₹{(product.price * qty).toFixed(0)}
                </div>
                <button
                  onClick={() => onDelete(product.id)}
                  style={{
                    padding: '6px 10px', borderRadius: 8, border: 'none',
                    background: '#ef444420', color: C.red,
                    fontSize: 16, cursor: 'pointer',
                  }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Total</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: C.green }}>₹{total.toFixed(0)}</span>
        </div>

        {/* Payment mode */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 12 }}>
            Select Payment Mode
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {PAYMENT_MODES.map(m => (
              <button
                key={m.key}
                onClick={() => setPaymentMode(m.key)}
                style={{
                  flex: 1, padding: '16px 8px',
                  borderRadius: 14,
                  border: `2px solid ${paymentMode === m.key ? C.blue : C.border}`,
                  background: paymentMode === m.key ? `${C.blue}18` : C.card,
                  color: paymentMode === m.key ? C.blue : C.muted,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: 26 }}>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Place order button */}
        <button
          onClick={() => onPlaceOrder(paymentMode)}
          disabled={placing || cartItems.length === 0}
          style={{
            width: '100%', padding: '18px',
            borderRadius: 14, border: 'none',
            background: placing || cartItems.length === 0 ? '#334155' : C.green,
            color: '#fff', fontSize: 18, fontWeight: 800,
            cursor: placing || cartItems.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'background .2s',
          }}
        >
          {placing ? 'Placing Order…' : `Place Order — ₹${total.toFixed(0)}`}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// STEP 5 — Order Confirmation
// ════════════════════════════════════════════════════════════════════
function ConfirmationStep({ orderResult, tableNumber, onRestart }) {
  const [countdown, setCountdown] = useState(30)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current); onRestart(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [onRestart])

  // SVG circle countdown: r=20 → circumference = 2π×20 ≈ 126
  const CIRC = 126
  const dashOffset = CIRC - (countdown / 30) * CIRC

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
      animation: 'fadeIn .5s ease',
    }}>
      {/* Checkmark */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: `${C.green}18`, border: `3px solid ${C.green}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 52, marginBottom: 24,
        animation: 'popIn .4s ease',
      }}>
        ✓
      </div>

      <h1 style={{ fontSize: 36, fontWeight: 900, color: C.text, margin: 0 }}>
        Order Placed!
      </h1>

      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: '24px 32px',
        marginTop: 24, marginBottom: 28, minWidth: 280,
      }}>
        {orderResult?.kotRef && (
          <>
            <div style={{ fontSize: 30, fontWeight: 900, color: C.blue, letterSpacing: 2 }}>
              {orderResult.kotRef}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 16 }}>
              KOT Reference
            </div>
          </>
        )}
        <div style={{ fontSize: 16, color: C.text, marginBottom: 4 }}>
          Table {tableNumber}
        </div>
        <div style={{ fontSize: 14, color: C.muted }}>
          {orderResult?.message || 'Your order is being prepared'}
        </div>
      </div>

      <p style={{ fontSize: 18, color: C.muted, marginBottom: 32 }}>
        Thank you! Your order is being prepared.
      </p>

      <button
        onClick={onRestart}
        style={{
          padding: '16px 48px', fontSize: 16, fontWeight: 800,
          borderRadius: 14, border: 'none',
          background: C.blue, color: '#fff', cursor: 'pointer',
          marginBottom: 24,
        }}
      >
        Start New Order
      </button>

      {/* Countdown ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 13 }}>
        <svg width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={22} cy={22} r={20} fill="none" stroke={C.border} strokeWidth={3} />
          <circle
            cx={22} cy={22} r={20} fill="none"
            stroke={C.blue} strokeWidth={3}
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span>Auto-reset in {countdown}s</span>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ════════════════════════════════════════════════════════════════════
export default function SelfOrderingKiosk() {
  const { restaurantId } = useParams()

  // ── State ─────────────────────────────────────────────────────────
  const [step,         setStep]       = useState(1)           // 1-5
  const [restaurant,   setRestaurant] = useState(null)        // {name, logoUrl}
  const [categories,   setCategories] = useState([])          // [{id, name, products}]
  const [menuLoading,  setMenuLoading] = useState(true)
  const [menuError,    setMenuError]  = useState(null)
  const [tableNumber,  setTableNumber] = useState(null)
  const [customerName, setCustomerName] = useState('')
  // cart: { [productId]: { product, qty } }
  const [cart,         setCart]       = useState({})
  const [placing,      setPlacing]    = useState(false)
  const [orderResult,  setOrderResult] = useState(null)

  // ── Fetch menu on mount ───────────────────────────────────────────
  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(`${BASE}/${restaurantId}/menu`)
        if (!res.ok) throw new Error('Menu unavailable')
        const data = await res.json()
        setRestaurant(data.restaurant || { name: data.restaurantName || 'Restaurant' })
        setCategories(Array.isArray(data.categories) ? data.categories : [])
      } catch (e) {
        setMenuError(e.message)
      } finally {
        setMenuLoading(false)
      }
    }
    fetchMenu()
  }, [restaurantId])

  // ── Cart helpers ──────────────────────────────────────────────────
  const addItem = useCallback((product) => {
    setCart(c => ({
      ...c,
      [product.id]: { product, qty: (c[product.id]?.qty ?? 0) + 1 },
    }))
  }, [])

  const removeItem = useCallback((productId) => {
    setCart(c => {
      const qty = (c[productId]?.qty ?? 0) - 1
      if (qty <= 0) {
        const next = { ...c }
        delete next[productId]
        return next
      }
      return { ...c, [productId]: { ...c[productId], qty } }
    })
  }, [])

  const deleteItem = useCallback((productId) => {
    setCart(c => {
      const next = { ...c }
      delete next[productId]
      return next
    })
  }, [])

  // ── Place order ───────────────────────────────────────────────────
  async function placeOrder(paymentMode) {
    setPlacing(true)
    try {
      const cartItems = Object.values(cart)
      const items = cartItems.map(({ product, qty }) => ({
        productId: product.id,
        name:      product.name,
        qty,
        price:     product.price,
      }))
      const totalAmount = cartItems.reduce((s, { product, qty }) => s + product.price * qty, 0)

      const res = await fetch(`${BASE}/${restaurantId}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName || null,
          tableNumber,
          items,
          totalAmount,
          paymentMode,
          notes: 'Self-ordering kiosk',
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Order failed')
      }

      const result = await res.json()
      setOrderResult(result)
      setStep(5)
    } catch (e) {
      alert(e.message || 'Could not place order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────
  function restart() {
    setStep(1)
    setTableNumber(null)
    setCustomerName('')
    setCart({})
    setOrderResult(null)
  }

  // ── Loading / Error states ────────────────────────────────────────
  if (menuLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <GlobalStyles />
        <Spinner size={48} />
        <p style={{ color: C.muted, fontSize: 16 }}>Loading menu…</p>
      </div>
    )
  }

  if (menuError) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32,
        textAlign: 'center',
      }}>
        <GlobalStyles />
        <div style={{ fontSize: 56 }}>😕</div>
        <p style={{ color: C.red, fontSize: 18, fontWeight: 700 }}>{menuError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: C.blue, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  const restaurantName = restaurant?.name || 'Restaurant'

  // ── Render step ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", userSelect: 'none' }}>
      <GlobalStyles />

      {step === 1 && (
        <WelcomeStep
          restaurantName={restaurantName}
          onStart={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <TableStep
          onContinue={(t, name) => {
            setTableNumber(t)
            setCustomerName(name)
            setStep(3)
          }}
        />
      )}

      {step === 3 && (
        <MenuStep
          restaurantName={restaurantName}
          categories={categories}
          tableNumber={tableNumber}
          cart={cart}
          onAdd={addItem}
          onRemove={removeItem}
          onViewCart={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <CartStep
          cart={cart}
          tableNumber={tableNumber}
          onAdd={addItem}
          onRemove={removeItem}
          onDelete={deleteItem}
          onBack={() => setStep(3)}
          onPlaceOrder={placeOrder}
          placing={placing}
        />
      )}

      {step === 5 && (
        <ConfirmationStep
          orderResult={orderResult}
          tableNumber={tableNumber}
          onRestart={restart}
        />
      )}
    </div>
  )
}
