import { useState, useEffect, useCallback } from 'react'
import { api, staffApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

const STATUS_CFG = {
  PENDING:    { label: 'Pending',    color: '#f59e0b', bg: '#f59e0b22' },
  ASSIGNED:   { label: 'Assigned',   color: '#6366f1', bg: '#6366f122' },
  PICKED_UP:  { label: 'Picked Up',  color: '#3b82f6', bg: '#3b82f622' },
  ON_THE_WAY: { label: 'On The Way', color: '#8b5cf6', bg: '#8b5cf622' },
  DELIVERED:  { label: 'Delivered',  color: '#10b981', bg: '#10b98122' },
  FAILED:     { label: 'Failed',     color: '#ef4444', bg: '#ef444422' },
}

const STATUS_FLOW = ['PENDING', 'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'FAILED']

const FILTER_TABS = [
  { key: 'ALL',        label: 'All'        },
  { key: 'PENDING',    label: 'Pending'    },
  { key: 'ASSIGNED',   label: 'Assigned'   },
  { key: 'ON_THE_WAY', label: 'On The Way' },
  { key: 'DELIVERED',  label: 'Delivered'  },
  { key: 'FAILED',     label: 'Failed'     },
]

// ── Shared UI ─────────────────────────────────────────────────────────────
function Badge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.PENDING
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
      background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ── Assign Rider Modal ────────────────────────────────────────────────────
function AssignModal({ order, riders, onClose, onDone, toast }) {
  const [riderId, setRiderId] = useState('')
  const [saving,  setSaving]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!riderId) return toast.error('Rider select karo')
    setSaving(true)
    try {
      await api.post('/delivery/assign', { orderId: order.deliveryId, riderId: Number(riderId) })
      toast.success('Rider assigned')
      onDone()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🛵 Assign Rider</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        <div style={{ background: 'var(--bg-page)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
          <div style={{ fontWeight: 600 }}>Order #{order.deliveryId}</div>
          {order.customerAddress && (
            <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 12 }}>📍 {order.customerAddress}</div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
              Rider <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select value={riderId} onChange={e => setRiderId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }}>
              <option value="">-- Select Rider --</option>
              {riders.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.phone || '—'})</option>
              ))}
            </select>
            {riders.length === 0 && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                Koi DELIVERY role staff nahi mila
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
                background: saving ? '#ccc' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Status Update Modal ───────────────────────────────────────────────────
function StatusModal({ order, onClose, onDone, toast }) {
  const [status,  setStatus]  = useState(order.status || 'PENDING')
  const [payMode, setPayMode] = useState('CASH')
  const [saving,  setSaving]  = useState(false)

  const isDelivering = status === 'DELIVERED'

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (isDelivering) {
        await api.patch(`/delivery/${order.deliveryId}/delivered?paymentMode=${payMode}`)
        toast.success('Order delivered!')
      } else {
        await api.patch(`/delivery/orders/${order.deliveryId}/status?status=${status}`)
        toast.success('Status updated')
      }
      onDone()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Update Status</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {STATUS_FLOW.map(s => {
              const cfg = STATUS_CFG[s]
              return (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${status === s ? cfg.color : 'var(--border)'}`,
                  background: status === s ? cfg.bg : 'transparent' }}>
                  <input type="radio" name="status" value={s}
                    checked={status === s} onChange={() => setStatus(s)}
                    style={{ accentColor: cfg.color }} />
                  <span style={{ fontSize: 13, fontWeight: status === s ? 700 : 400,
                    color: status === s ? cfg.color : 'var(--text)' }}>{cfg.label}</span>
                </label>
              )
            })}
          </div>

          {isDelivering && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
                Payment Mode
              </label>
              <select value={payMode} onChange={e => setPayMode(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }}>
                {['CASH', 'UPI', 'CARD', 'PREPAID'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
                background: saving ? '#ccc' : (isDelivering ? '#10b981' : 'var(--accent)'),
                color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Saving…' : isDelivering ? '✅ Mark Delivered' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function DeliveryOrders() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [orders,       setOrders]       = useState([])
  const [riders,       setRiders]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('ALL')
  const [assignModal,  setAssignModal]  = useState(null)
  const [statusModal,  setStatusModal]  = useState(null)
  const [dispatching,  setDispatching]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/delivery')
      setOrders(Array.isArray(data) ? data : [])
    } catch { setOrders([]) }
    finally { setLoading(false) }
  }, [])

  // Load riders (DELIVERY role staff)
  useEffect(() => {
    staffApi.getAll(rid).then(d => {
      const list = Array.isArray(d) ? d : (d?.content ?? [])
      setRiders(list.filter(s => s.isActive !== false &&
        (s.roles?.includes('DELIVERY') || s.role === 'DELIVERY')))
    }).catch(() => setRiders([]))
  }, [rid])

  useEffect(() => { load() }, [load])

  async function handleSmartDispatch() {
    if (!window.confirm('Saare pending orders ko nearest riders ko auto-assign karna chahte ho?')) return
    setDispatching(true)
    try {
      const result = await api.post(`/delivery/smart-dispatch?restaurantId=${rid}`)
      toast.success(`Smart dispatch complete — ${result?.assignments?.length ?? 0} orders assigned`)
      load()
    } catch (err) { toast.error(err.message || 'Smart dispatch failed') }
    finally { setDispatching(false) }
  }

  // Filter
  const visible = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)

  // Counts
  const counts = {}
  FILTER_TABS.forEach(t => { counts[t.key] = t.key === 'ALL' ? orders.length : orders.filter(o => o.status === t.key).length })

  // Stats
  const pending   = orders.filter(o => o.status === 'PENDING').length
  const active    = orders.filter(o => ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(o.status)).length
  const delivered = orders.filter(o => o.status === 'DELIVERED').length
  const failed    = orders.filter(o => o.status === 'FAILED').length

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🛵 Delivery Orders</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Delivery orders track karo, riders assign karo
          </p>
        </div>
        <button onClick={handleSmartDispatch} disabled={dispatching || pending === 0}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none',
            background: dispatching || pending === 0 ? 'var(--border)' : '#6366f1',
            color: dispatching || pending === 0 ? 'var(--text-muted)' : '#fff',
            cursor: dispatching || pending === 0 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
          {dispatching ? '⚡ Dispatching…' : '⚡ Smart Dispatch'}
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Pending',    value: pending,   color: '#f59e0b' },
          { label: 'Active',     value: active,    color: '#6366f1' },
          { label: 'Delivered',  value: delivered, color: '#10b981' },
          { label: 'Failed',     value: failed,    color: '#ef4444' },
          { label: 'Riders',     value: riders.length, color: '#3b82f6' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
          {FILTER_TABS.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                borderColor: filter === t.key ? 'var(--accent)' : 'var(--border)',
                background: filter === t.key ? '#e53e3e11' : 'transparent',
                color: filter === t.key ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 12, fontWeight: filter === t.key ? 700 : 400 }}>
              {t.label}
              {counts[t.key] > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({counts[t.key]})</span>}
            </button>
          ))}
        </div>

        {loading ? <SkeletonTable rows={5} /> : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛵</div>
            <div style={{ fontSize: 14 }}>
              {filter === 'ALL' ? 'Koi delivery order nahi' : `Koi ${STATUS_CFG[filter]?.label} order nahi`}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)',
                  fontSize: 11, textTransform: 'uppercase' }}>
                  {['Order ID', 'Address', 'Rider', 'Tracking', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(order => {
                  const assignedRider = riders.find(r => r.id === order.riderId)
                  const isActive = !['DELIVERED', 'FAILED'].includes(order.status)
                  return (
                    <tr key={order.deliveryId} style={{ borderBottom: '1px solid var(--border)',
                      opacity: isActive ? 1 : 0.65 }}>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{order.deliveryId}</span>
                        {order.kitchenOrderId && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>KOT #{order.kitchenOrderId}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                        <div style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.customerAddress || '—'}
                        </div>
                        {(order.latitude || order.longitude) && (
                          <a href={`https://maps.google.com/?q=${order.latitude},${order.longitude}`}
                            target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, color: '#6366f1' }}>📍 Map</a>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {assignedRider ? (
                          <div>
                            <div style={{ fontWeight: 600 }}>{assignedRider.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{assignedRider.phone}</div>
                          </div>
                        ) : order.riderId ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>ID: {order.riderId}</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: 12 }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {order.trackingId ? (
                          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{order.trackingId}</span>
                        ) : '—'}
                        {order.otp && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>OTP: <strong>{order.otp}</strong></div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge status={order.status} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {isActive && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {!order.assigned && (
                              <button onClick={() => setAssignModal(order)}
                                style={{ padding: '4px 10px', borderRadius: 6, border: 'none',
                                  background: '#6366f122', color: '#6366f1', cursor: 'pointer',
                                  fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                Assign
                              </button>
                            )}
                            <button onClick={() => setStatusModal(order)}
                              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                                background: 'transparent', color: 'var(--text)', cursor: 'pointer',
                                fontSize: 11, whiteSpace: 'nowrap' }}>
                              Status
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {assignModal && (
        <AssignModal order={assignModal} riders={riders} toast={toast}
          onClose={() => setAssignModal(null)}
          onDone={() => { setAssignModal(null); load() }} />
      )}

      {statusModal && (
        <StatusModal order={statusModal} toast={toast}
          onClose={() => setStatusModal(null)}
          onDone={() => { setStatusModal(null); load() }} />
      )}
    </div>
  )
}
