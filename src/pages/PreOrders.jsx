// src/pages/PreOrders.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

const BASE_URL = () => (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function authHeaders() {
  const { token } = useAuthStore.getState()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

// ── Status config ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING:    { color: '#f59e0b', bg: '#f59e0b22', label: 'Pending',    next: 'CONFIRMED' },
  CONFIRMED:  { color: '#3b82f6', bg: '#3b82f622', label: 'Confirmed',  next: 'PREPARING' },
  PREPARING:  { color: '#f97316', bg: '#f9731622', label: 'Preparing',  next: 'READY' },
  READY:      { color: '#22c55e', bg: '#22c55e22', label: 'Ready',      next: null },
  CANCELLED:  { color: '#6b7280', bg: '#6b728022', label: 'Cancelled',  next: null },
}

const ALL_STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'CANCELLED']

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN')
}

function fmtScheduled(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = d - now
  const oneDayMs = 86400000
  const options = { hour: '2-digit', minute: '2-digit', hour12: true }
  if (diff > 0 && diff < oneDayMs) {
    return 'Today ' + d.toLocaleTimeString('en-IN', options)
  }
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow ' + d.toLocaleTimeString('en-IN', options)
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('en-IN', options)
}

function isUrgent(iso) {
  if (!iso) return false
  const diff = new Date(iso) - new Date()
  return diff > 0 && diff < 3 * 3600000 // less than 3 hours away
}

// ── Create/Edit Modal ─────────────────────────────────────────────────────
function PreOrderModal({ onClose, onCreated }) {
  const toast = useToast()
  const today = new Date()
  const defaultDate = today.toISOString().split('T')[0]
  const defaultTime = '19:00'

  const [form, setForm] = useState({
    customerName:  '',
    customerPhone: '',
    scheduleDate:  defaultDate,
    scheduleTime:  defaultTime,
    itemsText:     '',
    totalAmount:   '',
    advanceAmount: '',
    tableNumber:   '',
    persons:       2,
    notes:         '',
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function buildPayload() {
    const scheduledFor = `${form.scheduleDate}T${form.scheduleTime}:00`
    // Parse items text into simple JSON array
    let items
    try {
      items = JSON.stringify([{ name: form.itemsText.trim() || 'Items as discussed', qty: 1, price: 0 }])
    } catch (_) {
      items = JSON.stringify([{ name: form.itemsText.trim(), qty: 1, price: 0 }])
    }
    return {
      customerName:  form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      scheduledFor,
      items,
      totalAmount:   Number(form.totalAmount) || 0,
      advanceAmount: Number(form.advanceAmount) || 0,
      tableNumber:   form.tableNumber ? Number(form.tableNumber) : null,
      persons:       Number(form.persons) || 1,
      notes:         form.notes.trim() || null,
    }
  }

  async function handleSave() {
    if (!form.customerName.trim())  { toast.error('Customer name required'); return }
    if (!form.customerPhone.trim()) { toast.error('Customer phone required'); return }
    if (!form.scheduleDate)         { toast.error('Schedule date required'); return }
    setSaving(true)
    try {
      const res = await fetch(`${BASE_URL()}/pre-orders`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Pre-order create nahi hua')
      }
      const created = await res.json()
      toast.success('Pre-order created! ✅')
      onCreated(created)
    } catch (e) {
      toast.error(e.message || 'Error hua')
    } finally {
      setSaving(false)
    }
  }

  function handleBackdrop(e) { if (e.target === e.currentTarget) onClose() }

  const inputStyle = {
    background: '#334155', border: '1px solid #475569', color: '#fff',
    padding: '8px 12px', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box',
  }
  const labelStyle = {
    fontSize: 11, color: '#94a3b8', fontWeight: 600,
    letterSpacing: '0.06em', display: 'block', marginBottom: 5,
  }

  return (
    <div onClick={handleBackdrop} style={{
      position: 'fixed', inset: 0, background: '#0009', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 14, padding: '1.5rem',
        width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 24px 64px #0008',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            📅 New Pre-Order
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: '#94a3b8',
          }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Customer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>CUSTOMER NAME *</label>
              <input type="text" placeholder="Rahul Kumar"
                value={form.customerName} onChange={e => set('customerName', e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>PHONE *</label>
              <input type="tel" placeholder="9876543210"
                value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          {/* Schedule date + time */}
          <div>
            <label style={labelStyle}>SCHEDULED FOR *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input type="date" value={form.scheduleDate}
                onChange={e => set('scheduleDate', e.target.value)}
                style={inputStyle} />
              <input type="time" value={form.scheduleTime}
                onChange={e => set('scheduleTime', e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          {/* Items */}
          <div>
            <label style={labelStyle}>ITEMS DESCRIPTION</label>
            <textarea
              placeholder="e.g. 2x Paneer Tikka, 1x Dal Makhni, 4x Naan..."
              value={form.itemsText}
              onChange={e => set('itemsText', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>TOTAL AMOUNT (₹)</label>
              <input type="number" min={0} placeholder="0"
                value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>ADVANCE PAID (₹)</label>
              <input type="number" min={0} placeholder="0"
                value={form.advanceAmount} onChange={e => set('advanceAmount', e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          {/* Table + Persons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>TABLE NUMBER (optional)</label>
              <input type="number" min={1} placeholder="—"
                value={form.tableNumber} onChange={e => set('tableNumber', e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>PERSONS</label>
              <input type="number" min={1} max={100} placeholder="2"
                value={form.persons} onChange={e => set('persons', e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>NOTES / SPECIAL REQUESTS</label>
            <textarea
              placeholder="Allergy info, preferences, occasion..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={handleSave} disabled={saving} style={{
              flex: 1, background: saving ? '#475569' : '#3b82f6',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 16px', cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
            }}>
              {saving ? '⏳ Creating...' : '📅 Create Pre-Order'}
            </button>
            <button onClick={onClose} style={{
              padding: '10px 16px', borderRadius: 8,
              border: '1px solid #475569', background: 'transparent',
              color: '#94a3b8', cursor: 'pointer', fontSize: 13,
            }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Pre-Order Card ─────────────────────────────────────────────────────────
function PreOrderCard({ order, onStatusUpdate, onCancel }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING
  const urgent = order.status !== 'CANCELLED' && isUrgent(order.scheduledFor)
  const [updating, setUpdating] = useState(false)

  async function handleStatusUpdate(newStatus) {
    setUpdating(true)
    await onStatusUpdate(order.id, newStatus)
    setUpdating(false)
  }

  // Parse items text for display
  let itemsSummary = ''
  try {
    const parsed = JSON.parse(order.items)
    if (Array.isArray(parsed)) {
      itemsSummary = parsed.map(it => `${it.qty || 1}× ${it.name}`).join(', ')
    } else {
      itemsSummary = order.items
    }
  } catch (_) {
    itemsSummary = order.items || '—'
  }

  return (
    <div style={{
      background: '#1e293b',
      border: `1px solid ${urgent ? '#f59e0b' : '#334155'}`,
      borderRadius: 12, padding: '1rem 1.1rem',
      display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: urgent ? '0 0 0 2px #f59e0b22' : 'none',
      position: 'relative',
    }}>
      {/* Urgent badge */}
      {urgent && (
        <div style={{
          position: 'absolute', top: -10, right: 12,
          background: '#f59e0b', color: '#000', fontSize: 10, fontWeight: 700,
          padding: '2px 10px', borderRadius: 20,
        }}>
          ⚡ SOON
        </div>
      )}

      {/* Scheduled time (prominent) */}
      <div style={{ fontSize: 20, fontWeight: 700, color: urgent ? '#f59e0b' : '#fff' }}>
        📅 {fmtScheduled(order.scheduledFor)}
      </div>

      {/* Customer info */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>
          👤 {order.customerName}
        </span>
        {order.customerPhone && (
          <span style={{ color: '#94a3b8', fontSize: 12 }}>
            📞 {order.customerPhone}
          </span>
        )}
        {order.persons && (
          <span style={{ color: '#94a3b8', fontSize: 12 }}>
            🧑‍🤝‍🧑 {order.persons} persons
          </span>
        )}
        {order.tableNumber && (
          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6,
            background: '#6366f122', color: '#818cf8' }}>
            Table {order.tableNumber}
          </span>
        )}
      </div>

      {/* Items */}
      {itemsSummary && (
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
          🍽️ {itemsSummary}
        </div>
      )}

      {/* Amount row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
        <span>
          <span style={{ color: '#94a3b8' }}>Total: </span>
          <span style={{ fontWeight: 700, color: '#fff' }}>
            {fmt(order.totalAmount)}
          </span>
        </span>
        {(order.advanceAmount > 0) && (
          <span>
            <span style={{ color: '#94a3b8' }}>Advance: </span>
            <span style={{ fontWeight: 600, color: '#22c55e' }}>
              {fmt(order.advanceAmount)}
            </span>
          </span>
        )}
        {(order.totalAmount > 0 && order.advanceAmount > 0) && (
          <span>
            <span style={{ color: '#94a3b8' }}>Balance: </span>
            <span style={{ fontWeight: 600, color: '#f59e0b' }}>
              {fmt(order.totalAmount - order.advanceAmount)}
            </span>
          </span>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <div style={{ fontSize: 12, color: '#94a3b8',
          background: '#0f172a', borderRadius: 6, padding: '6px 10px',
          borderLeft: '3px solid #475569' }}>
          📝 {order.notes}
        </div>
      )}

      {/* Status + Actions row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center',
        flexWrap: 'wrap', marginTop: 2 }}>
        {/* Status badge */}
        <span style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
          background: cfg.bg, color: cfg.color,
        }}>
          {cfg.label}
        </span>

        {/* Next status button */}
        {cfg.next && order.status !== 'CANCELLED' && (
          <button
            onClick={() => handleStatusUpdate(cfg.next)}
            disabled={updating}
            style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
              background: STATUS_CONFIG[cfg.next]?.color + '22',
              color: STATUS_CONFIG[cfg.next]?.color,
              border: `1px solid ${STATUS_CONFIG[cfg.next]?.color}44`,
              cursor: updating ? 'not-allowed' : 'pointer',
              opacity: updating ? 0.6 : 1,
            }}>
            {updating ? '...' : `→ Mark ${STATUS_CONFIG[cfg.next]?.label}`}
          </button>
        )}

        {/* Cancel button */}
        {order.status !== 'CANCELLED' && order.status !== 'READY' && (
          <button
            onClick={() => onCancel(order.id)}
            style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
              background: '#ef444418', color: '#ef4444',
              border: '1px solid #ef444430', cursor: 'pointer',
              marginLeft: 'auto',
            }}>
            Cancel Order
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function PreOrders() {
  const toast = useToast()
  const [orders,      setOrders]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [statusFilter,setStatusFilter]= useState('ALL')
  const [showModal,   setShowModal]   = useState(false)

  const load = useCallback(async (status) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status && status !== 'ALL') params.set('status', status)
      const res = await fetch(`${BASE_URL()}/pre-orders?${params}`, {
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error('Load failed')
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : data.content || [])
    } catch (e) {
      toast.error('Pre-orders load nahi hue')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(statusFilter) }, [load, statusFilter])

  async function handleStatusUpdate(id, newStatus) {
    try {
      const res = await fetch(`${BASE_URL()}/pre-orders/${id}/status`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Status update nahi hua')
      }
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o))
      toast.success(`Status → ${newStatus} ✅`)
    } catch (e) {
      toast.error(e.message || 'Update failed')
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('Is pre-order ko cancel karna chahte ho?')) return
    try {
      const res = await fetch(`${BASE_URL()}/pre-orders/${id}`, {
        method: 'DELETE', headers: authHeaders(),
      })
      if (!res.ok) throw new Error('Cancel failed')
      toast.success('Pre-order cancelled')
      setOrders(prev => prev.map(o =>
        o.id === id ? { ...o, status: 'CANCELLED' } : o
      ))
    } catch (e) {
      toast.error(e.message || 'Cancel nahi hua')
    }
  }

  function handleCreated(created) {
    setOrders(prev => [created, ...prev])
    setShowModal(false)
  }

  // Summary counts
  const counts = ALL_STATUSES.slice(1).reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length; return acc
  }, {})

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            📅 Pre-Orders / Advance Booking
          </h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            Schedule orders in advance
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
          padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          + New Pre-Order
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {ALL_STATUSES.map(s => {
          const active = statusFilter === s
          const cfg = STATUS_CONFIG[s]
          const count = s === 'ALL' ? orders.length : counts[s]
          return (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: active ? 700 : 500,
              cursor: 'pointer', border: '1px solid',
              borderColor: active ? (cfg?.color || '#3b82f6') : '#334155',
              background: active ? ((cfg?.color || '#3b82f6') + '22') : '#1e293b',
              color: active ? (cfg?.color || '#3b82f6') : '#94a3b8',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {s === 'ALL' ? 'All' : cfg?.label}
              {count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: active ? (cfg?.color || '#3b82f6') : '#334155',
                  color: active ? '#fff' : '#94a3b8',
                  borderRadius: 10, padding: '1px 6px',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#1e293b', border: '1px solid #334155',
              borderRadius: 12, padding: '1rem', height: 180 }}>
              {[80, 140, 100, 60].map((w, j) => (
                <div key={j} style={{ height: 14, borderRadius: 4,
                  background: '#334155', width: w, marginBottom: 12 }} />
              ))}
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 32px',
          background: '#1e293b', borderRadius: 12, border: '1px solid #334155' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            {statusFilter === 'ALL' ? 'Koi pre-order nahi hai' : `Koi ${statusFilter} pre-order nahi`}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
            "+ New Pre-Order" button se advance booking create karo
          </div>
          <button onClick={() => setShowModal(true)} style={{
            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            + New Pre-Order
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 14,
        }}>
          {orders.map(order => (
            <PreOrderCard
              key={order.id}
              order={order}
              onStatusUpdate={handleStatusUpdate}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PreOrderModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
