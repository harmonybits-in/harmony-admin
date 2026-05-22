/**
 * Marketplace.jsx — Admin page for Feature Add-on marketplace.
 * Route: /marketplace (protected, inside Layout)
 *
 * API:
 *   GET  /api/v1/feature-addons/{restaurantId}         — all addons
 *   POST /api/v1/feature-addons/{restaurantId}/order   — create Razorpay order
 *   GET  /api/v1/feature-addons/{restaurantId}/active  — active addons
 */
import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { featureAddonApi } from '../api/client'

// ── Razorpay loader ────────────────────────────────────────────────
function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

// ── Styles ─────────────────────────────────────────────────────────
const S = {
  page: {
    padding: '0 0 80px',
    minHeight: '100vh',
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#fff',
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 12,
    padding: '14px 20px',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  summaryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#22c55e18',
    border: '1px solid #22c55e44',
    borderRadius: 20,
    padding: '5px 14px',
    fontSize: 13,
    fontWeight: 700,
    color: '#22c55e',
  },
  toggleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  toggleWrap: {
    display: 'flex',
    background: '#0f172a',
    borderRadius: 24,
    padding: 3,
    border: '1px solid #334155',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 18,
  },
  card: (active) => ({
    background: '#1e293b',
    border: `2px solid ${active ? '#22c55e' : '#334155'}`,
    borderRadius: 16,
    padding: '24px 20px',
    position: 'relative',
    transition: 'border-color .2s, box-shadow .2s',
    boxShadow: active ? '0 0 0 1px #22c55e22, 0 4px 20px #22c55e12' : 'none',
  }),
  activeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    background: '#22c55e',
    color: '#fff',
    fontSize: 10,
    fontWeight: 800,
    padding: '3px 10px',
    borderRadius: 20,
    letterSpacing: 0.5,
  },
  icon: {
    fontSize: 36,
    marginBottom: 12,
    lineHeight: 1,
  },
  addonName: {
    fontSize: 17,
    fontWeight: 800,
    color: '#fff',
    marginBottom: 6,
  },
  addonDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.55,
    marginBottom: 14,
  },
  featureList: {
    listStyle: 'none',
    margin: '0 0 16px',
    padding: 0,
  },
  featureItem: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 5,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
  },
  featureDot: {
    color: '#3b82f6',
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 1,
  },
  priceRow: {
    marginBottom: 16,
  },
  priceAmt: {
    fontSize: 26,
    fontWeight: 800,
    color: '#fff',
  },
  pricePer: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  priceYearlySub: {
    fontSize: 11,
    color: '#22c55e',
    marginTop: 3,
    fontWeight: 600,
  },
  btnGet: (loading) => ({
    width: '100%',
    padding: '11px',
    borderRadius: 10,
    border: 'none',
    background: loading ? '#334155' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'opacity .15s',
    opacity: loading ? 0.7 : 1,
  }),
  btnManage: {
    width: '100%',
    padding: '11px',
    borderRadius: 10,
    border: '1px solid #22c55e44',
    background: '#22c55e12',
    color: '#22c55e',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'not-allowed',
    opacity: 0.8,
  },
  msg: (type) => ({
    padding: '12px 16px',
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 13,
    fontWeight: 500,
    background: type === 'success' ? '#22c55e15' : '#ef444415',
    border: `1px solid ${type === 'success' ? '#22c55e40' : '#ef444440'}`,
    color: type === 'success' ? '#22c55e' : '#ef4444',
  }),
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
    fontSize: 15,
  },
  orderModal: {
    position: 'fixed',
    inset: 0,
    background: '#0009',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  orderBox: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 16,
    padding: '28px 24px',
    maxWidth: 400,
    width: '100%',
  },
}

export default function Marketplace() {
  const { restaurantId, user } = useAuthStore()

  const [addons, setAddons]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [billingCycle, setBilling]  = useState('MONTHLY')
  const [paying, setPaying]         = useState(null) // addonId being paid
  const [msg, setMsg]               = useState(null) // {type, text}
  const [pendingOrder, setPending]  = useState(null) // {addon, order} for fallback modal

  useEffect(() => { fetchAddons() }, [restaurantId])

  async function fetchAddons() {
    setLoading(true)
    try {
      const data = await featureAddonApi.getAddons(restaurantId)
      setAddons(Array.isArray(data) ? data : [])
    } catch {
      setAddons([])
    } finally {
      setLoading(false)
    }
  }

  async function handleBuy(addon) {
    setMsg(null)
    setPaying(addon.addonId)
    try {
      const loaded = await loadRazorpay()
      if (!loaded) {
        setMsg({ type: 'error', text: 'Razorpay load failed. Please check your internet connection.' })
        setPaying(null)
        return
      }

      const order = await featureAddonApi.createOrder(restaurantId, addon.addonId, billingCycle)

      // Mock order support (dev/test)
      if (order.mock) {
        try {
          const res = await featureAddonApi.verify({
            restaurantId,
            razorpayOrderId: order.orderId,
            razorpayPaymentId: 'pay_MOCK_' + Date.now(),
            razorpaySignature: 'mock_sig',
          })
          setMsg({ type: 'success', text: res.message || `${addon.name} activated!` })
          fetchAddons()
        } catch (e) {
          setMsg({ type: 'error', text: e.message || 'Verification failed' })
        }
        setPaying(null)
        return
      }

      // If Razorpay SDK not available, show fallback order details
      if (!window.Razorpay) {
        setPending({ addon, order })
        setPaying(null)
        return
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Harmony Bits Private Limited',
        description: `${addon.name} — ${billingCycle === 'YEARLY' ? '1 Year' : '30 Days'}`,
        order_id: order.orderId,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#3b82f6' },
        handler: async function (response) {
          try {
            const res = await featureAddonApi.verify({
              restaurantId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            setMsg({ type: 'success', text: res.message || `${addon.name} activated!` })
            fetchAddons()
          } catch (e) {
            setMsg({ type: 'error', text: e.message || 'Payment verification failed' })
          }
          setPaying(null)
        },
        modal: { ondismiss: () => setPaying(null) },
      }
      new window.Razorpay(options).open()
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Could not start payment. Please try again.' })
      setPaying(null)
    }
  }

  const activeAddons = useMemo(() => addons.filter(a => a.active), [addons])

  function displayPrice(addon) {
    if (billingCycle === 'YEARLY') {
      const yearly = Math.round(addon.priceYearlyPaise / 100)
      const monthly = Math.round(addon.priceYearlyPaise / 100 / 12)
      return { main: `₹${monthly}/mo`, sub: `₹${yearly} billed yearly` }
    }
    const monthly = Math.round(addon.priceMonthlyPaise / 100)
    return { main: `₹${monthly}/mo`, sub: null }
  }

  function parseFeatures(featStr) {
    if (!featStr) return []
    if (Array.isArray(featStr)) return featStr
    return featStr.split(',').map(f => f.trim()).filter(Boolean)
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.title}>App Marketplace</h1>
        <p style={S.subtitle}>Extend Harmony with powerful add-ons</p>
      </div>

      {/* Global message */}
      {msg && (
        <div style={S.msg(msg.type)} onClick={() => setMsg(null)}>
          {msg.text}
        </div>
      )}

      {/* Active addons summary bar */}
      <div style={S.summaryBar}>
        <div style={S.summaryBadge}>
          <span>✓</span>
          <span>{activeAddons.length} add-on{activeAddons.length !== 1 ? 's' : ''} active</span>
        </div>
        {activeAddons.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {activeAddons.map(a => (
              <span key={a.addonId} style={{ fontSize: 18 }} title={a.name}>{a.icon || '🔧'}</span>
            ))}
          </div>
        )}
        {activeAddons.length === 0 && !loading && (
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Get started by activating an add-on below
          </span>
        )}
        <button
          onClick={fetchAddons}
          style={{
            marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, fontSize: 12,
            border: '1px solid #334155', background: 'transparent', color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Billing cycle toggle */}
      <div style={S.toggleBar}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
          Available Add-ons
        </h2>
        <div style={S.toggleWrap}>
          {[
            { key: 'MONTHLY', label: 'Monthly' },
            { key: 'YEARLY', label: 'Yearly (Save ~17%)' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setBilling(key)}
              style={{
                padding: '7px 18px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                background: billingCycle === key ? '#3b82f6' : 'transparent',
                color: billingCycle === key ? '#fff' : '#64748b',
                transition: 'all .2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {billingCycle === 'YEARLY' && (
        <div style={{
          padding: '9px 14px', borderRadius: 8, marginBottom: 18,
          background: '#22c55e12', border: '1px solid #22c55e30',
          color: '#22c55e', fontSize: 12, fontWeight: 600,
        }}>
          Yearly billing saves approximately 2 months of cost vs monthly
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <Spinner />
          <p style={{ marginTop: 16 }}>Loading add-ons…</p>
        </div>
      ) : addons.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
          <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>No add-ons available</div>
          <div style={{ fontSize: 13 }}>Contact support to configure add-ons for your account.</div>
        </div>
      ) : (
        <div style={S.grid}>
          {[...addons].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)).map(addon => {
            const { main: priceMain, sub: priceSub } = displayPrice(addon)
            const features = parseFeatures(addon.features)
            const isActive = addon.active
            const isBuying = paying === addon.addonId

            return (
              <div key={addon.addonId} style={S.card(isActive)}>
                {isActive && (
                  <div style={S.activeBadge}>✓ ACTIVE</div>
                )}

                <div style={S.icon}>{addon.icon || '🔧'}</div>
                <div style={S.addonName}>{addon.name}</div>
                <div style={S.addonDesc}>{addon.description}</div>

                {features.length > 0 && (
                  <ul style={S.featureList}>
                    {features.map((f, i) => (
                      <li key={i} style={S.featureItem}>
                        <span style={S.featureDot}>›</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div style={S.priceRow}>
                  <span style={S.priceAmt}>{priceMain}</span>
                  {priceSub && <div style={S.priceYearlySub}>{priceSub}</div>}
                </div>

                {isActive ? (
                  <button style={S.btnManage} disabled>
                    ✓ Active — Manage in Settings
                  </button>
                ) : (
                  <button
                    style={S.btnGet(isBuying)}
                    onClick={() => handleBuy(addon)}
                    disabled={isBuying}
                  >
                    {isBuying ? 'Processing…' : 'Get Add-on →'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Fallback order modal (when Razorpay SDK fails to load) */}
      {pendingOrder && (
        <div style={S.orderModal} onClick={() => setPending(null)}>
          <div style={S.orderBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              {pendingOrder.addon.icon} {pendingOrder.addon.name}
            </h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
              Order created. Complete the payment to activate this add-on.
            </p>
            <div style={{ background: '#0f172a', borderRadius: 10, padding: '16px', marginBottom: 20 }}>
              <Row label="Order ID" value={pendingOrder.order.orderId} mono />
              <Row label="Amount" value={`₹${Math.round(pendingOrder.order.amount / 100)}`} />
              <Row label="Currency" value={pendingOrder.order.currency || 'INR'} />
            </div>
            <p style={{ fontSize: 12, color: '#f59e0b', marginBottom: 20 }}>
              Complete payment via Razorpay to activate. If payment window did not open,
              please refresh the page and try again.
            </p>
            <button
              onClick={() => setPending(null)}
              style={{
                width: '100%', padding: '10px', borderRadius: 9, border: 'none',
                background: '#334155', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 28, fontSize: 12, color: '#475569' }}>
        Add-ons are billed per the selected billing cycle. Contact{' '}
        <a href="mailto:admin@harmonybits.in" style={{ color: '#3b82f6' }}>
          admin@harmonybits.in
        </a>{' '}
        for enterprise licensing or bulk add-on queries.
      </div>
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ color: '#fff', fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? 11 : 13 }}>
        {value}
      </span>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 36, height: 36, border: '3px solid #334155', borderTopColor: '#3b82f6',
      borderRadius: '50%', animation: 'spin .8s linear infinite', display: 'inline-block',
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
