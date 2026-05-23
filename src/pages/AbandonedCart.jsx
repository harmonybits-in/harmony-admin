import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function parseItems(items) {
  if (!items) return '—'
  if (Array.isArray(items)) {
    if (items.length === 0) return '0 items'
    const names = items.map(i => i.name || i.itemName || i.item || JSON.stringify(i)).filter(Boolean)
    return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2} more` : names.join(', ')
  }
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items)
      return parseItems(parsed)
    } catch {
      return items.length > 60 ? items.slice(0, 60) + '…' : items
    }
  }
  return String(items)
}

// ── Style constants ───────────────────────────────────────────────────────────

const BG = '#0f172a'
const CARD = { background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '18px 20px' }
const BTN = { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }
const BTN_SM = { ...BTN, padding: '6px 12px', fontSize: 12 }
const INPUT = { background: '#334155', border: '1px solid #475569', color: '#fff', padding: '9px 12px', borderRadius: 7, fontSize: 13, width: '100%', boxSizing: 'border-box' }

const SOURCE_COLOR = {
  QR:     { bg: '#6366f122', color: '#818cf8' },
  ONLINE: { bg: '#0ea5e922', color: '#38bdf8' },
  KIOSK:  { bg: '#f59e0b22', color: '#fbbf24' },
}

// ── Source Badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }) {
  const s = SOURCE_COLOR[source] || { bg: '#33415522', color: '#94a3b8' }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color }}>
      {source || 'UNKNOWN'}
    </span>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...CARD, flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || '#e2e8f0' }}>{value ?? '—'}</div>
    </div>
  )
}

// ── Log Cart Modal ────────────────────────────────────────────────────────────

function LogCartModal({ restaurantId, token, onClose, onSaved }) {
  const [form, setForm] = useState({
    customerName: '', phone: '', tableNumber: '', source: 'QR', items: '', totalAmount: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!form.customerName.trim()) { setErr('Customer name is required'); return }
    if (!form.phone.trim()) { setErr('Phone number is required'); return }
    if (!form.totalAmount) { setErr('Total amount is required'); return }

    let itemsParsed = form.items.trim()
    try {
      if (itemsParsed) JSON.parse(itemsParsed)
    } catch {
      itemsParsed = JSON.stringify([{ name: itemsParsed }])
    }

    setSaving(true)
    try {
      await api.post(`/abandoned-carts?restaurantId=${restaurantId}`, {
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        tableNumber: form.tableNumber.trim() || null,
        source: form.source,
        items: itemsParsed || '[]',
        totalAmount: parseFloat(form.totalAmount),
      })
      onSaved()
    } catch (e) {
      setErr(e.message || 'Failed to log cart')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1e293b', borderRadius: 14, width: '100%', maxWidth: 480,
        padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,.5)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>Log Abandoned Cart</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        {err && (
          <div style={{ background: '#ef444422', border: '1px solid #ef444455', borderRadius: 7,
            color: '#ef4444', fontSize: 13, padding: '10px 14px', marginBottom: 14 }}>{err}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Customer Name *</label>
            <input value={form.customerName} onChange={e => set('customerName', e.target.value)} placeholder="e.g. Rahul Sharma" style={INPUT} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Phone *</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" style={INPUT} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Table Number</label>
            <input value={form.tableNumber} onChange={e => set('tableNumber', e.target.value)} placeholder="e.g. T5" style={INPUT} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Source</label>
            <select value={form.source} onChange={e => set('source', e.target.value)} style={INPUT}>
              <option value="QR">QR</option>
              <option value="ONLINE">ONLINE</option>
              <option value="KIOSK">KIOSK</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
              Items (comma-separated names or JSON array)
            </label>
            <textarea value={form.items} onChange={e => set('items', e.target.value)}
              placeholder='Paneer Butter Masala, Naan, Lassi  (or JSON array)'
              rows={3}
              style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Total Amount (₹) *</label>
            <input type="number" value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)} placeholder="e.g. 450" style={INPUT} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #475569',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ ...BTN, flex: 1, padding: 10, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : 'Log Cart'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Cart Card ─────────────────────────────────────────────────────────────────

function CartCard({ cart, restaurantId, onRefresh }) {
  const [reminding, setReminding] = useState(false)
  const [recovering, setRecovering] = useState(false)

  async function sendReminder() {
    setReminding(true)
    try {
      await api.post(`/abandoned-carts/${cart.id}/remind?restaurantId=${restaurantId}`, {})
      onRefresh()
    } catch (e) {
      alert(e.message || 'Failed to send reminder')
    } finally { setReminding(false) }
  }

  async function markRecovered() {
    setRecovering(true)
    try {
      await api.post(`/abandoned-carts/${cart.id}/recover?restaurantId=${restaurantId}`, {})
      onRefresh()
    } catch (e) {
      alert(e.message || 'Failed to mark recovered')
    } finally { setRecovering(false) }
  }

  const isRecovered = cart.recovered || cart.status === 'RECOVERED'

  return (
    <div style={{ ...CARD, borderLeft: isRecovered ? '4px solid #22c55e' : '4px solid #f59e0b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>{cart.customerName || 'Unknown'}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{cart.phone || cart.customerPhone || '—'}</span>
            <SourceBadge source={cart.source} />
            {isRecovered && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: '#22c55e22', color: '#22c55e' }}>Recovered</span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>
            {cart.tableNumber && <span>Table: <span style={{ color: '#e2e8f0' }}>{cart.tableNumber}</span></span>}
            <span>Items: <span style={{ color: '#e2e8f0' }}>{parseItems(cart.items)}</span></span>
            <span>Total: <span style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(cart.totalAmount)}</span></span>
            <span>Reminded: <span style={{ color: '#f59e0b' }}>{cart.reminderCount ?? 0} times</span></span>
            <span style={{ color: '#475569' }}>{timeAgo(cart.createdAt)}</span>
          </div>
        </div>

        {!isRecovered && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={sendReminder} disabled={reminding}
              style={{ ...BTN_SM, background: '#1d4ed8', opacity: reminding ? 0.6 : 1, cursor: reminding ? 'not-allowed' : 'pointer' }}>
              {reminding ? 'Sending...' : 'Send Reminder'}
            </button>
            <button onClick={markRecovered} disabled={recovering}
              style={{ ...BTN_SM, background: '#16a34a', opacity: recovering ? 0.6 : 1, cursor: recovering ? 'not-allowed' : 'pointer' }}>
              {recovering ? 'Saving...' : 'Mark Recovered'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
export default function AbandonedCart() {
  const { restaurantId, token } = useAuthStore()

  const [carts, setCarts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/abandoned-carts?restaurantId=${restaurantId}`
      if (filter === 'PENDING') url += '&pending=true'
      if (filter === 'RECOVERED') url += '&pending=false'

      const [cartsRes, statsRes] = await Promise.allSettled([
        api.get(url),
        api.get(`/abandoned-carts/stats?restaurantId=${restaurantId}`),
      ])
      setCarts(cartsRes.status === 'fulfilled' ? (Array.isArray(cartsRes.value) ? cartsRes.value : []) : [])
      setStats(statsRes.status === 'fulfilled' ? statsRes.value : null)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, filter])

  useEffect(() => { load() }, [load])

  const total = stats?.total ?? carts.length
  const recovered = stats?.recovered ?? carts.filter(c => c.recovered || c.status === 'RECOVERED').length
  const pending = stats?.pending ?? (total - recovered)
  const rate = stats?.recoveryRate != null
    ? `${Number(stats.recoveryRate).toFixed(1)}%`
    : (total > 0 ? `${((recovered / total) * 100).toFixed(1)}%` : '0%')

  const FILTERS = ['ALL', 'PENDING', 'RECOVERED']

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: BG, color: '#fff' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Abandoned Cart Recovery</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Track and recover abandoned orders via WhatsApp reminders</p>
        </div>
        <button onClick={() => setShowModal(true)} style={BTN}>+ Log Cart</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Total Abandoned" value={total} color="#e2e8f0" />
        <StatCard label="Recovered" value={recovered} color="#22c55e" />
        <StatCard label="Pending" value={pending} color="#f59e0b" />
        <StatCard label="Recovery Rate" value={rate} color="#3b82f6" />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: filter === f ? '#3b82f6' : '#1e293b',
              color: filter === f ? '#fff' : '#64748b' }}>
            {f === 'ALL' ? 'All' : f === 'PENDING' ? 'Pending' : 'Recovered'}
          </button>
        ))}
      </div>

      {/* Cart list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
          <div style={{ width: 28, height: 28, border: '3px solid #334155', borderTopColor: '#3b82f6',
            borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Loading...
        </div>
      ) : carts.length === 0 ? (
        <div style={{ ...CARD, textAlign: 'center', padding: '60px 24px', color: '#475569' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>No abandoned carts found</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            {filter === 'ALL' ? 'Log a cart manually or integrate with your ordering system.' : `No ${filter.toLowerCase()} carts found.`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {carts.map(cart => (
            <CartCard key={cart.id} cart={cart} restaurantId={restaurantId} onRefresh={load} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <LogCartModal
          restaurantId={restaurantId}
          token={token}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
