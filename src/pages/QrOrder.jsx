/**
 * QR Table Ordering — public page, no auth required.
 * URL: /qr/:restaurantId/t/:tableId
 *
 * Customer scans QR on table → browses menu → places order.
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1/public/qr'

export default function QrOrder() {
  const { restaurantId, tableId } = useParams()

  const [menu, setMenu]           = useState(null)
  const [restName, setRestName]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const [cart, setCart]           = useState({})  // { productId: { name, price, qty } }
  const [placing, setPlacing]     = useState(false)
  const [orderResult, setOrderResult] = useState(null)
  const [step, setStep]           = useState('menu') // menu | cart | done
  const [search, setSearch]       = useState('')

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(`${API}/${restaurantId}/menu`)
        if (!res.ok) throw new Error('Menu unavailable')
        const data = await res.json()
        setMenu(data.menu)
        setRestName(data.restaurantName)
      } catch (e) {
        setError(e.message)
      }
      setLoading(false)
    }
    fetchMenu()
  }, [restaurantId])

  const cartItems = useMemo(() => Object.values(cart).filter(i => i.qty > 0), [cart])
  const cartTotal = useMemo(() => cartItems.reduce((s, i) => s + i.price * i.qty, 0), [cartItems])
  const cartCount = useMemo(() => cartItems.reduce((s, i) => s + i.qty, 0), [cartItems])

  function addItem(id, name, price) {
    setCart(c => ({ ...c, [id]: { name, price, qty: (c[id]?.qty ?? 0) + 1 } }))
  }

  function removeItem(id) {
    setCart(c => {
      const qty = (c[id]?.qty ?? 0) - 1
      if (qty <= 0) { const n = { ...c }; delete n[id]; return n }
      return { ...c, [id]: { ...c[id], qty } }
    })
  }

  async function placeOrder() {
    setPlacing(true)
    try {
      const items = cartItems.map(i => ({ name: i.name, qty: i.qty, price: i.price }))
      const res = await fetch(`${API}/${restaurantId}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber: tableId ? Number(tableId) : null, items }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Order failed')
      }
      const result = await res.json()
      setOrderResult(result)
      setStep('done')
    } catch (e) {
      alert(e.message)
    }
    setPlacing(false)
  }

  if (loading) return <Page bg="#fff"><Center><Spinner /><p style={{ color: '#6b7280', marginTop: 16 }}>Loading menu…</p></Center></Page>
  if (error)   return <Page bg="#fff"><Center><div style={{ fontSize: 48 }}>😕</div><p style={{ color: '#ef4444' }}>{error}</p></Center></Page>

  // ── Order placed screen ─────────────────────────────────────────
  if (step === 'done' && orderResult) {
    return (
      <Page bg="#f0fdf4">
        <Center>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 80 }}>🎉</div>
            <h2 style={{ color: '#15803d', marginTop: 12 }}>Order Placed!</h2>
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginTop: 16, boxShadow: '0 2px 12px #0001' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#166534', letterSpacing: 1 }}>{orderResult.kotRef}</div>
              <div style={{ color: '#6b7280', marginTop: 4, fontSize: 14 }}>KOT Reference</div>
              {tableId && <div style={{ marginTop: 12, color: '#374151', fontSize: 16 }}>Table {tableId}</div>}
              <div style={{ marginTop: 8, color: '#6b7280', fontSize: 14 }}>{orderResult.message}</div>
            </div>
            <button onClick={() => { setCart({}); setStep('menu'); setOrderResult(null) }}
              style={{ ...btnStyle('#3b82f6'), marginTop: 20, padding: '12px 28px', fontSize: 16 }}>
              Order More
            </button>
          </div>
        </Center>
      </Page>
    )
  }

  // ── Cart review screen ──────────────────────────────────────────
  if (step === 'cart') {
    return (
      <Page bg="#f9fafb">
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 120px' }}>
          <Header restName={restName} tableId={tableId} />
          <h2 style={{ padding: '16px 16px 4px', fontSize: 20, fontWeight: 700 }}>Review Order</h2>
          {cartItems.map(item => (
            <div key={item.name} style={cartRowStyle}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{item.name}</div>
                <div style={{ color: '#6b7280', fontSize: 14 }}>₹{item.price} × {item.qty}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>₹{(item.price * item.qty).toFixed(2)}</div>
            </div>
          ))}
          <div style={{ padding: '16px', borderTop: '2px solid #e5e7eb', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 20 }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: 22, color: '#15803d' }}>₹{cartTotal.toFixed(2)}</span>
          </div>
        </div>
        {/* Bottom bar */}
        <div style={bottomBar}>
          <button onClick={() => setStep('menu')} style={{ ...btnStyle('#6b7280'), flex: 1 }}>← Back</button>
          <button onClick={placeOrder} disabled={placing} style={{ ...btnStyle('#16a34a'), flex: 2, fontSize: 16 }}>
            {placing ? 'Placing…' : `Place Order — ₹${cartTotal.toFixed(2)}`}
          </button>
        </div>
      </Page>
    )
  }

  // ── Menu screen ─────────────────────────────────────────────────
  const filtered = (menu ?? []).map(cat => ({
    ...cat,
    items: cat.items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())),
  })).filter(cat => cat.items.length > 0)

  return (
    <Page bg="#f9fafb">
      <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 120 }}>
        <Header restName={restName} tableId={tableId} />
        {/* Search */}
        <div style={{ padding: '8px 16px' }}>
          <input placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 15, boxSizing: 'border-box' }} />
        </div>

        {filtered.map(cat => (
          <div key={cat.categoryId} style={{ marginBottom: 8 }}>
            <div style={{ background: '#f3f4f6', padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#374151', letterSpacing: 0.5 }}>
              {cat.categoryName.toUpperCase()}
            </div>
            {cat.items.map(item => {
              const qty = cart[item.id]?.qty ?? 0
              return (
                <div key={item.id} style={{ display: 'flex', gap: 12, padding: '14px 16px', background: '#fff', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{item.name}</div>
                    {item.description && <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{item.description}</div>}
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#16a34a', marginTop: 4 }}>₹{item.price}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {qty > 0 ? (
                      <>
                        <QtyBtn onClick={() => removeItem(item.id)}>−</QtyBtn>
                        <span style={{ fontWeight: 700, fontSize: 18, minWidth: 20, textAlign: 'center' }}>{qty}</span>
                        <QtyBtn onClick={() => addItem(item.id, item.name, item.price)} green>+</QtyBtn>
                      </>
                    ) : (
                      <button onClick={() => addItem(item.id, item.name, item.price)} style={{ ...btnStyle('#16a34a'), padding: '8px 18px', fontSize: 15 }}>
                        ADD
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No items found</div>
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div style={bottomBar}>
          <button onClick={() => setStep('cart')} style={{ ...btnStyle('#16a34a'), width: '100%', fontSize: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ background: '#fff2', borderRadius: 20, padding: '2px 10px', fontSize: 14 }}>{cartCount} items</span>
            <span>View Cart →</span>
            <span>₹{cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </Page>
  )
}

function Header({ restName, tableId }) {
  return (
    <div style={{ background: '#16a34a', padding: '20px 16px 16px', color: '#fff' }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{restName}</div>
      {tableId && <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>Table {tableId} · Scan & Order</div>}
    </div>
  )
}

function QtyBtn({ onClick, green, children }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, borderRadius: '50%', border: 'none',
      background: green ? '#16a34a' : '#e5e7eb', color: green ? '#fff' : '#374151',
      fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  )
}

const Page = ({ children, bg }) => (
  <div style={{ minHeight: '100vh', background: bg, fontFamily: "'Segoe UI', sans-serif" }}>
    {children}
  </div>
)

const Center = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
    {children}
  </div>
)

const Spinner = () => (
  <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 10,
  padding: '10px 20px', cursor: 'pointer', fontWeight: 600,
})

const bottomBar = {
  position: 'fixed', bottom: 0, left: 0, right: 0,
  background: '#fff', padding: '12px 16px',
  boxShadow: '0 -2px 12px #0002',
  display: 'flex', gap: 10, maxWidth: 480, margin: '0 auto',
}

const cartRowStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 16px', background: '#fff', borderBottom: '1px solid #f3f4f6',
}
