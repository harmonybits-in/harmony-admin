/**
 * Order Tracking — PUBLIC page, no auth required.
 * Route: /track/:restaurantId/:orderId
 *
 * Customer-facing page to track delivery/online order status.
 * Auto-refreshes every 30 seconds.
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1/public'

// Order status pipeline
const STEPS = [
  { key: 'PLACED',            label: 'Order Placed',        icon: '🛒' },
  { key: 'CONFIRMED',         label: 'Confirmed',           icon: '✅' },
  { key: 'PREPARING',         label: 'Preparing',           icon: '👨‍🍳' },
  { key: 'OUT_FOR_DELIVERY',  label: 'Out for Delivery',    icon: '🛵', altKey: 'READY', altLabel: 'Ready' },
  { key: 'DELIVERED',         label: 'Delivered',           icon: '✅', altKey: 'COMPLETED' },
]

function getStepIndex(status) {
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i].key === status || STEPS[i].altKey === status) return i
  }
  return 0
}

function getStepLabel(step, status) {
  if (step.altKey === status) return step.altLabel ?? step.label
  return step.label
}

const GREEN    = '#16a34a'
const GREEN_BG = '#dcfce7'
const GRAY     = '#9ca3af'
const GRAY_BG  = '#f3f4f6'
const WHITE    = '#ffffff'

export default function OrderTracking() {
  const { restaurantId, orderId } = useParams()

  const [order, setOrder]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  async function fetchOrder() {
    try {
      const res = await fetch(`${BASE}/${restaurantId}/orders/${orderId}`)
      if (res.status === 404) throw new Error('Order not found')
      if (!res.ok) throw new Error('Failed to load order')
      const data = await res.json()
      setOrder(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 30_000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, orderId])

  const activeStep = order ? getStepIndex(order.status) : -1
  const isDone     = order && (order.status === 'DELIVERED' || order.status === 'COMPLETED')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{
          fontSize: 26, fontWeight: 800,
          background: 'linear-gradient(135deg, #16a34a, #059669)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px',
        }}>
          🍽 Harmony OS
        </div>
        <div style={{ fontSize: 13, color: GRAY, marginTop: 4 }}>Order Tracking</div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 500,
        background: WHITE, borderRadius: 20,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* Loading */}
        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: GRAY }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontWeight: 500 }}>Loading order details…</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>
              {error.includes('not found') ? '🔍' : '😕'}
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: '#111827' }}>
              {error.includes('not found') ? 'Order Not Found' : 'Something Went Wrong'}
            </div>
            <div style={{ color: GRAY, fontSize: 14, marginBottom: 24 }}>
              {error.includes('not found')
                ? 'We couldn\'t find this order. Please check your order number and try again.'
                : error}
            </div>
            <button
              onClick={fetchOrder}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: GREEN, color: WHITE, fontWeight: 600,
                fontSize: 14, cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Order content */}
        {!loading && !error && order && (
          <>
            {/* Header stripe */}
            <div style={{
              background: isDone
                ? 'linear-gradient(135deg, #16a34a, #059669)'
                : 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              padding: '1.5rem',
              color: WHITE,
            }}>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Order</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
                #{order.orderId ?? orderId}
              </div>
              {order.customerName && (
                <div style={{ fontSize: 14, marginTop: 6, opacity: 0.9 }}>
                  👤 {order.customerName}
                </div>
              )}
              {order.estimatedTime && (
                <div style={{
                  marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.2)', borderRadius: 20,
                  padding: '4px 12px', fontSize: 13,
                }}>
                  ⏱ Est. {order.estimatedTime}
                </div>
              )}
            </div>

            {/* Stepper */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Order Status
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {STEPS.map((step, i) => {
                  const isActive   = i === activeStep
                  const isComplete = i < activeStep || isDone
                  const isFuture   = i > activeStep && !isDone

                  return (
                    <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      {/* Icon column */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: 40, height: 40,
                          borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18,
                          background: isComplete || isActive ? GREEN_BG : GRAY_BG,
                          border: `2px solid ${isComplete || isActive ? GREEN : '#e5e7eb'}`,
                          flexShrink: 0,
                          transition: 'all 0.3s',
                          boxShadow: isActive ? `0 0 0 4px ${GREEN_BG}` : 'none',
                        }}>
                          {isComplete ? '✅' : step.icon}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div style={{
                            width: 2, height: 28,
                            background: isComplete ? GREEN : '#e5e7eb',
                            transition: 'background 0.3s',
                          }} />
                        )}
                      </div>

                      {/* Label */}
                      <div style={{
                        paddingTop: 8,
                        paddingBottom: i < STEPS.length - 1 ? 0 : 0,
                        flex: 1,
                      }}>
                        <div style={{
                          fontSize: 14,
                          fontWeight: isActive ? 700 : isComplete ? 600 : 400,
                          color: isActive ? GREEN : isComplete ? '#374151' : GRAY,
                        }}>
                          {getStepLabel(step, order.status)}
                          {isActive && (
                            <span style={{
                              marginLeft: 8, fontSize: 11,
                              background: GREEN, color: WHITE,
                              borderRadius: 20, padding: '2px 8px',
                              fontWeight: 600, verticalAlign: 'middle',
                            }}>
                              CURRENT
                            </span>
                          )}
                        </div>
                        {isFuture && (
                          <div style={{ fontSize: 12, color: '#d1d5db', marginTop: 1 }}>Pending</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#f3f4f6', margin: '0 1.5rem' }} />

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <div style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                  Items Ordered
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', fontSize: 14,
                    }}>
                      <span style={{ color: '#374151' }}>
                        {item.quantity || item.qty || 1}× {item.name ?? item.productName ?? item.itemName}
                      </span>
                      {item.price != null && (
                        <span style={{ color: '#6b7280', fontWeight: 500 }}>
                          ₹{((item.price) * (item.quantity || item.qty || 1)).toFixed(0)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            {(order.subtotal != null || order.total != null || order.finalAmount != null) && (
              <>
                <div style={{ height: 1, background: '#f3f4f6', margin: '0 1.5rem' }} />
                <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {order.subtotal != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
                      <span>Subtotal</span>
                      <span>₹{Number(order.subtotal).toFixed(2)}</span>
                    </div>
                  )}
                  {order.tax != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
                      <span>Tax &amp; Charges</span>
                      <span>₹{Number(order.tax).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 15, fontWeight: 700, color: '#111827',
                    paddingTop: 6, borderTop: '1px solid #f3f4f6',
                  }}>
                    <span>Total</span>
                    <span style={{ color: GREEN }}>
                      ₹{Number(order.finalAmount ?? order.total ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Order type tag */}
            {order.orderType && (
              <div style={{ padding: '0 1.5rem 1.25rem' }}>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  background: '#eff6ff', color: '#1d4ed8',
                  borderRadius: 20, padding: '4px 12px',
                }}>
                  {order.orderType === 'DELIVERY' ? '🛵 Delivery' :
                   order.orderType === 'TAKEAWAY' ? '🥡 Takeaway' : '🍽 Dine-In'}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Auto-refresh indicator */}
      {!loading && !error && (
        <div style={{ marginTop: 16, fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: GREEN, animation: 'pulse 2s ease-in-out infinite',
          }} />
          Auto-refreshes every 30 seconds
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, fontSize: 12, color: '#d1d5db', textAlign: 'center' }}>
        Powered by <strong style={{ color: '#9ca3af' }}>Harmony OS</strong>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
