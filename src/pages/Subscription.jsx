import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { featureAddonApi } from '../api/client'

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    billing: 'Forever',
    price: 0,
    color: '#16a34a',
    free: true,
    features: [
      '1 Device',
      '50 bills/month',
      'Basic POS + KOT',
      'Menu Management',
      'Basic Reports',
    ],
  },
  {
    id: 'STARTER_MONTHLY',
    name: 'Starter',
    billing: 'Monthly',
    price: 799,
    color: '#6366f1',
    features: [
      'Full POS Billing + GST',
      '1 Device',
      'Menu + Addons & Variants',
      'Promotions, Discounts & Coupons',
      'Table Management (Dine-in)',
      'Inventory Tracking',
      'Staff & Payroll',
      'QR Attendance',
    ],
  },
  {
    id: 'STARTER_YEARLY',
    name: 'Starter',
    billing: 'Yearly',
    price: 7599,
    color: '#6366f1',
    savings: 'Save ₹1,989',
    features: [
      'Full POS Billing + GST',
      '1 Device',
      'Menu + Addons & Variants',
      'Promotions, Discounts & Coupons',
      'Table Management (Dine-in)',
      'Inventory Tracking',
      'Staff & Payroll',
      'QR Attendance',
    ],
  },
  {
    id: 'GROWTH_MONTHLY',
    name: 'Growth',
    billing: 'Monthly',
    price: 1999,
    color: '#e53e3e',
    popular: true,
    features: [
      'Everything in Starter',
      '10 Devices',
      'Online Orders (Zomato/Swiggy)',
      'Rider GPS Tracking',
      'Customer CRM & Loyalty Points',
      'WhatsApp Integration',
      'AI Chatbot (Claude/GPT)',
      'Due Payments Tracking',
      'Advanced Reports & Analytics',
      'Multi-Branch (up to 3 outlets)',
    ],
  },
  {
    id: 'GROWTH_YEARLY',
    name: 'Growth',
    billing: 'Yearly',
    price: 17999,
    color: '#e53e3e',
    popular: true,
    savings: 'Save ₹5,989',
    features: [
      'Everything in Starter',
      '10 Devices',
      'Online Orders (Zomato/Swiggy)',
      'Rider GPS Tracking',
      'Customer CRM & Loyalty Points',
      'WhatsApp Integration',
      'AI Chatbot (Claude/GPT)',
      'Due Payments Tracking',
      'Advanced Reports & Analytics',
      'Multi-Branch (up to 3 outlets)',
    ],
  },
  {
    id: 'PRO_MONTHLY',
    name: 'Pro',
    billing: 'Monthly',
    price: 3499,
    color: '#863bff',
    features: [
      'Everything in Growth',
      'Unlimited Devices',
      'AI Chatbot (Claude/GPT)',
      'Advanced Analytics + Custom Reports',
      'Multi-Branch (up to 10 outlets)',
      'API Access',
      'Dedicated Account Manager',
      'Priority WhatsApp Support',
    ],
  },
  {
    id: 'PRO_YEARLY',
    name: 'Pro',
    billing: 'Yearly',
    price: 34990,
    color: '#863bff',
    savings: 'Save ₹6,998',
    offerTag: 'BEST VALUE',
    features: [
      'Everything in Growth',
      'Unlimited Devices',
      'AI Chatbot (Claude/GPT)',
      'Advanced Analytics + Custom Reports',
      'Multi-Branch (up to 10 outlets)',
      'API Access',
      'Dedicated Account Manager',
      'Priority WhatsApp Support',
      '2 Months FREE',
    ],
  },
  {
    id: 'ENTERPRISE_MONTHLY',
    name: 'Enterprise',
    billing: 'Monthly',
    price: 4999,
    color: '#d4af37',
    features: [
      'Everything in Pro',
      'Unlimited Devices',
      'Unlimited Branches + Full Franchise Control',
      'Custom Reports',
      'Dedicated Support',
      'Priority WhatsApp Support',
    ],
  },
  {
    id: 'ENTERPRISE_YEARLY',
    name: 'Enterprise',
    billing: 'Yearly',
    price: 41990,
    color: '#d4af37',
    savings: 'Save ₹17,998',
    features: [
      'Everything in Pro',
      'Unlimited Devices',
      'Unlimited Branches + Full Franchise Control',
      'Custom Reports',
      'Dedicated Support',
      'Priority WhatsApp Support',
    ],
  },
]

const RAZORPAY_KEY = 'rzp_test_SntT5NK28iBDsu'

const API = 'https://api.harmonybits.in/api/v1'

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// ── Feature Add-on Shop ──────────────────────────────────────────
function FeatureAddonShop({ restaurantId, token, user }) {
  const [addons, setAddons] = useState([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    featureAddonApi.getAddons(restaurantId)
      .then(res => setAddons(Array.isArray(res) ? res : []))
      .catch(() => setAddons([]))
      .finally(() => setLoading(false))
  }, [restaurantId])

  async function buyAddon(addon) {
    setMsg(null)
    setPaying(addon.addonId)
    try {
      const loaded = await new Promise(resolve => {
        if (window.Razorpay) { resolve(true); return }
        const s = document.createElement('script')
        s.src = 'https://checkout.razorpay.com/v1/checkout.js'
        s.onload = () => resolve(true); s.onerror = () => resolve(false)
        document.body.appendChild(s)
      })
      if (!loaded) { setMsg({ type: 'error', text: 'Razorpay load nahi hua' }); setPaying(null); return }

      const order = await featureAddonApi.createOrder(restaurantId, addon.addonId, 'MONTHLY')

      if (order.mock) {
        const res = await featureAddonApi.verify({
          restaurantId, razorpayOrderId: order.orderId,
          razorpayPaymentId: 'pay_MOCK_' + Date.now(),
          razorpaySignature: 'mock_sig',
        })
        setMsg({ type: 'success', text: res.message || addon.name + ' activated!' })
        featureAddonApi.getAddons(restaurantId).then(r => setAddons(Array.isArray(r) ? r : [])).catch(() => {})
        setPaying(null)
        return
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Harmony Bits Private Limited',
        description: addon.name + ' Add-on — 30 days',
        order_id: order.orderId,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#6366f1' },
        handler: async function(response) {
          try {
            const res = await featureAddonApi.verify({
              restaurantId,
              razorpayOrderId:  response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            setMsg({ type: 'success', text: res.message || addon.name + ' activated! 🎉' })
            featureAddonApi.getAddons(restaurantId).then(r => setAddons(Array.isArray(r) ? r : [])).catch(() => {})
          } catch (e) {
            setMsg({ type: 'error', text: e.message || 'Payment verify nahi hua' })
          }
          setPaying(null)
        },
        modal: { ondismiss: () => setPaying(null) },
      }
      new window.Razorpay(options).open()
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Payment start nahi hua' })
      setPaying(null)
    }
  }

  if (loading) return null

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>🛍️ Feature Add-on Shop</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Apne plan mein missing features individually khareed sakte ho — yearly fixed price
        </p>
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 9, marginBottom: 16,
          background: msg.type === 'success' ? '#10b98115' : '#ef444415',
          border: `1px solid ${msg.type === 'success' ? '#10b98140' : '#ef444440'}`,
          fontSize: 13, color: msg.type === 'success' ? '#10b981' : '#ef4444',
        }}>{msg.text}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {addons.map(addon => (
          <div key={addon.addonId} style={{
            border: addon.isActive ? '2px solid #10b981' : '1px solid var(--border)',
            borderRadius: 14, padding: '18px 16px', position: 'relative',
            background: addon.isActive ? '#10b98108' : 'var(--bg-card)',
            opacity: addon.canBuy || addon.isActive ? 1 : 0.55,
          }}>
            {addon.isActive && (
              <div style={{
                position: 'absolute', top: 12, right: 12,
                background: '#10b981', color: '#fff', fontSize: 9, fontWeight: 800,
                padding: '2px 8px', borderRadius: 10,
              }}>ACTIVE</div>
            )}

            <div style={{ fontSize: 28, marginBottom: 8 }}>{addon.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{addon.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
              {addon.description}
            </div>

            <ul style={{ margin: '0 0 14px', padding: '0 0 0 14px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
              {(Array.isArray(addon.features) ? addon.features : []).slice(0, 4).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            {/* Fixed yearly price */}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>₹{addon.priceYearly}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>/ year</span>
            </div>

            {addon.isActive ? (
              <div>
                <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                  ✅ Active till {addon.endDate}
                </div>
                {addon.addonId === 'ADDON_ORDER_WEBSITE' && (
                  <a
                    href={`https://www.harmonybits.in/order/${restaurantId}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, display: 'block', marginTop: 5, wordBreak: 'break-all' }}
                  >
                    🔗 Your order page
                  </a>
                )}
              </div>
            ) : addon.canBuy ? (
              <button
                onClick={() => buyAddon(addon)}
                disabled={paying === addon.addonId}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 9, border: 'none',
                  background: paying === addon.addonId ? 'var(--border)' : '#6366f1',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: paying === addon.addonId ? 'not-allowed' : 'pointer',
                }}
              >
                {paying === addon.addonId ? '⏳ Processing…' : 'Add to Plan →'}
              </button>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Included in your current plan
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
        * Add-ons 1 saal ke liye active rehte hain. Renew manually karo expiry ke baad.
        Growth plan users sirf Multi-Branch add-on le sakte hain. Enterprise mein sab included hai.
      </div>
    </div>
  )
}

export default function Subscription() {
  const { restaurantId, token, user } = useAuthStore()
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [activatingTrial, setActivatingTrial] = useState(false)
  const [activatingFree,  setActivatingFree]  = useState(false)
  const [msg, setMsg] = useState(null) // {type: 'success'|'error', text}
  const [billingCycle, setBillingCycle] = useState('MONTHLY')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => { fetchSub() }, [])

  async function fetchSub() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/subscription/${restaurantId}`, { headers })
      const data = await res.json()
      setSub(data)
    } catch {
      setSub(null)
    } finally {
      setLoading(false)
    }
  }

  async function activateFree() {
    setActivatingFree(true)
    setMsg(null)
    try {
      const res = await fetch(`${API}/subscription/${restaurantId}/free`, {
        method: 'POST', headers
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: '🎉 Free plan activate ho gaya! Ab unlimited use karo.' })
        fetchSub()
      } else {
        setMsg({ type: 'error', text: data.message || 'Free plan activate nahi hua' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Server error. Dobara try karo.' })
    } finally {
      setActivatingFree(false)
    }
  }

  async function activateTrial() {
    setActivatingTrial(true)
    setMsg(null)
    try {
      const res = await fetch(`${API}/subscription/${restaurantId}/trial`, {
        method: 'POST', headers
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ type: 'success', text: '🎉 14-day free trial activate ho gaya!' })
        fetchSub()
      } else {
        setMsg({ type: 'error', text: data.message || 'Trial activate nahi hua' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Server error. Dobara try karo.' })
    } finally {
      setActivatingTrial(false)
    }
  }

  async function startPayment(plan) {
    setMsg(null)
    setPaying(true)
    try {
      // Step 1: Load Razorpay script
      const loaded = await loadRazorpay()
      if (!loaded) {
        setMsg({ type: 'error', text: 'Razorpay load nahi hua. Internet check karo.' })
        setPaying(false)
        return
      }

      // Step 2: Create order on backend
      const orderRes = await fetch(`${API}/subscription/${restaurantId}/order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan: plan.id })
      })
      const order = await orderRes.json()
      if (!orderRes.ok) {
        setMsg({ type: 'error', text: order.message || 'Order create nahi hua' })
        setPaying(false)
        return
      }

      // Step 3: Open Razorpay Checkout
      const options = {
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Harmony Bits Private Limited',
        description: `HarmonyEats ${plan.name} ${plan.billing} Plan`,
        order_id: order.orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#e53e3e' },
        handler: async function(response) {
          // Step 4: Verify payment
          try {
            const verifyRes = await fetch(`${API}/subscription/verify`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                restaurantId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
            })
            const verified = await verifyRes.json()
            if (verifyRes.ok) {
              setMsg({ type: 'success', text: `🎉 ${plan.name} plan activate ho gaya! Valid till: ${verified.endDate}` })
              fetchSub()
            } else {
              setMsg({ type: 'error', text: verified.message || 'Payment verify nahi hua' })
            }
          } catch {
            setMsg({ type: 'error', text: 'Payment verify nahi hua. Support se contact karo.' })
          }
          setPaying(false)
        },
        modal: {
          ondismiss: () => setPaying(false)
        }
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch(e) {
      setMsg({ type: 'error', text: 'Payment start nahi hua. Dobara try karo.' })
      setPaying(false)
    }
  }

  const filteredPlans = PLANS.filter(p => p.free || p.id.endsWith(billingCycle))

  const statusColor = sub?.status === 'ACTIVE' ? '#16a34a'
    : sub?.status === 'EXPIRING_SOON' ? '#f59e0b'
    : sub?.status === 'EXPIRED' ? '#ef4444'
    : '#6b7280'

  return (
    <div style={{ padding: '0 0 60px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>💳 Subscription</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>HarmonyEats plan manage karo</p>
        </div>
        <button onClick={fetchSub} style={{ padding:'7px 14px', borderRadius:8, fontSize:12, border:'1px solid var(--border)', background:'transparent', color:'var(--text)', cursor:'pointer' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Message */}
      {msg && (
        <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:16, fontSize:13, fontWeight:500,
          background: msg.type==='success' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
          border: `1px solid ${msg.type==='success' ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
          color: msg.type==='success' ? '#10b981' : '#ef4444'
        }}>
          {msg.text}
        </div>
      )}

      {/* Current Status */}
      {loading ? (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'2rem', textAlign:'center', color:'var(--text-muted)', marginBottom:24 }}>
          Loading...
        </div>
      ) : (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'1.5rem', marginBottom:24 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.8, marginBottom:12 }}>Current Status</div>
          {sub?.active ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:52, height:52, borderRadius:14, background:`${statusColor}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
                  {sub.status==='ACTIVE'?'✅':sub.status==='EXPIRING_SOON'?'⚠️':'❌'}
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{sub.planId?.replace('_',' ')} Plan</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                    Valid till: <strong style={{ color:statusColor }}>{sub.endDate}</strong>
                  </div>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:28, fontWeight:800, color:statusColor }}>{sub.daysLeft}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>days left</div>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Koi active subscription nahi</div>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>Niche se plan choose karo ya free trial shuru karo</div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={activateFree} disabled={activatingFree}
                  style={{ padding:'10px 20px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', fontSize:13, fontWeight:700, cursor:activatingFree?'not-allowed':'pointer', opacity:activatingFree?.6:1 }}>
                  {activatingFree ? '⏳ Activating...' : '🆓 Free Forever'}
                </button>
                <button onClick={activateTrial} disabled={activatingTrial}
                  style={{ padding:'10px 20px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:13, fontWeight:700, cursor:activatingTrial?'not-allowed':'pointer', opacity:activatingTrial?.6:1 }}>
                  {activatingTrial ? '⏳ Activating...' : '✨ 30-Day Free Trial'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Billing Toggle */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h2 style={{ fontSize:16, fontWeight:700 }}>Plans</h2>
        <div style={{ display:'flex', background:'var(--bg-page)', borderRadius:24, padding:3, border:'1px solid var(--border)' }}>
          {['MONTHLY','YEARLY'].map(cycle => (
            <button key={cycle} onClick={() => setBillingCycle(cycle)}
              style={{ padding:'6px 18px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
                background: billingCycle===cycle ? 'var(--accent)' : 'transparent',
                color: billingCycle===cycle ? '#fff' : 'var(--text-muted)',
                transition:'all .2s'
              }}>
              {cycle === 'YEARLY' ? 'Yearly 🎁' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {billingCycle === 'YEARLY' && (
        <div style={{ padding:'8px 14px', borderRadius:8, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.25)', color:'#10b981', fontSize:12, fontWeight:600, marginBottom:16 }}>
          🎉 Yearly plan mein 2 months FREE milte hain!
        </div>
      )}

      {/* Plans Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
        {filteredPlans.map(plan => {
          const isActive = sub?.active && sub?.planId === plan.id
          return (
            <div key={plan.id} style={{
              background: plan.free
                ? 'linear-gradient(160deg,rgba(22,163,74,.06),var(--bg-card))'
                : plan.popular
                  ? 'linear-gradient(160deg,rgba(229,62,62,.08),var(--bg-card))'
                  : 'var(--bg-card)',
              border: `1.5px solid ${isActive ? '#10b981' : plan.free ? '#16a34a55' : plan.popular ? plan.color+'44' : 'var(--border)'}`,
              borderRadius:14, padding:'24px', position:'relative',
              boxShadow: plan.popular ? `0 4px 24px ${plan.color}15` : plan.free ? '0 4px 16px rgba(22,163,74,.1)' : ''
            }}>
              {plan.free && !isActive && (
                <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', padding:'2px 14px', borderRadius:20, background:'#16a34a', color:'#fff', fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>
                  🆓 Forever Free
                </div>
              )}
              {plan.popular && !isActive && (
                <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', padding:'2px 14px', borderRadius:20, background:'#e53e3e', color:'#fff', fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>
                  🔥 Most Popular
                </div>
              )}
              {isActive && (
                <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', padding:'2px 14px', borderRadius:20, background:'#10b981', color:'#fff', fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>
                  ✅ Current Plan
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:'var(--text)' }}>{plan.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{plan.billing}</div>
                </div>
                {plan.savings && (
                  <div style={{ padding:'2px 10px', borderRadius:20, background:'rgba(16,185,129,.15)', color:'#10b981', fontSize:10, fontWeight:700 }}>
                    {plan.savings}
                  </div>
                )}
              </div>

              <div style={{ marginBottom:20 }}>
                {plan.free ? (
                  <>
                    <span style={{ fontSize:38, fontWeight:800, color:'#16a34a', fontFamily:'Lora, serif' }}>FREE</span>
                    <div style={{ fontSize:11, color:'#16a34a', marginTop:4, fontWeight:600 }}>Always free · No credit card</div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize:13, color:'var(--text-muted)' }}>₹</span>
                    <span style={{ fontSize:36, fontWeight:800, color:isActive?'#10b981':plan.color, fontFamily:'Lora, serif' }}>
                      {billingCycle === 'YEARLY' ? Math.round(plan.price/12).toLocaleString('en-IN') : plan.price.toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>/mo</span>
                    {billingCycle === 'YEARLY' && (
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                        ₹{plan.price.toLocaleString('en-IN')} billed yearly
                      </div>
                    )}
                  </>
                )}
              </div>

              <div style={{ marginBottom:20 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>
                    <span style={{ color:'#10b981', fontWeight:700 }}>✓</span> {f}
                  </div>
                ))}
              </div>

              {isActive ? (
                <div style={{ textAlign:'center', padding:'10px', borderRadius:9, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.25)', color:'#10b981', fontSize:13, fontWeight:700 }}>
                  ✅ Active Plan
                </div>
              ) : plan.free ? (
                <button onClick={activateFree} disabled={activatingFree || !!sub?.active}
                  style={{ width:'100%', padding:'11px', borderRadius:9, border:'none',
                    background: (activatingFree || sub?.active) ? 'var(--border)' : `linear-gradient(135deg,${plan.color},#15803d)`,
                    color:'#fff', fontSize:13, fontWeight:700,
                    cursor:(activatingFree || sub?.active)?'not-allowed':'pointer',
                  }}>
                  {activatingFree ? '⏳ Activating...' : sub?.active ? 'Already Active' : '🆓 Start Free Forever'}
                </button>
              ) : (
                <button onClick={() => startPayment(plan)} disabled={paying}
                  style={{ width:'100%', padding:'11px', borderRadius:9, border:'none',
                    background: paying ? 'var(--border)' : `linear-gradient(135deg,${plan.color},${plan.color}cc)`,
                    color:'#fff', fontSize:13, fontWeight:700, cursor:paying?'not-allowed':'pointer',
                    boxShadow: paying ? '' : `0 4px 14px ${plan.color}35`
                  }}>
                  {paying ? '⏳ Processing...' : `Get ${plan.name} →`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Feature Add-on Shop */}
      <FeatureAddonShop restaurantId={restaurantId} token={token} user={user} />

      {/* History */}
      {sub?.history?.length > 0 && (
        <div style={{ marginTop:32 }}>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>📋 Payment History</h3>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Plan','Start','End','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, color:'var(--text-muted)', fontWeight:700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sub.history.map((h, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 16px', fontSize:13, fontWeight:600 }}>{h.planId}</td>
                    <td style={{ padding:'10px 16px', fontSize:12, color:'var(--text-muted)' }}>{h.startDate}</td>
                    <td style={{ padding:'10px 16px', fontSize:12, color:'var(--text-muted)' }}>{h.endDate}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
                        background: h.active ? 'rgba(16,185,129,.15)' : 'rgba(107,114,128,.15)',
                        color: h.active ? '#10b981' : '#6b7280'
                      }}>
                        {h.active ? 'Active' : 'Ended'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contact */}
      <div style={{ marginTop:24, padding:'14px 18px', borderRadius:10, background:'var(--bg-page)', border:'1px solid var(--border)', fontSize:13, color:'var(--text-muted)' }}>
        💬 Koi problem hai? <a href="mailto:admin@harmonybits.in" style={{ color:'var(--accent)', fontWeight:600 }}>admin@harmonybits.in</a> pe contact karo.
      </div>
    </div>
  )
}
