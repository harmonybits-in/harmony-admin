import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

const PLATFORM_COLORS = {
  ZOMATO:   { bg: '#ef4444', text: '#fff' },
  SWIGGY:   { bg: '#f97316', text: '#fff' },
  OWN:      { bg: '#6366f1', text: '#fff' },
  WHATSAPP: { bg: '#22c55e', text: '#fff' },
  PHONE:    { bg: '#64748b', text: '#fff' },
}
const STATUS_COLORS = {
  PENDING:          { bg: '#fef3c7', text: '#d97706' },
  ACCEPTED:         { bg: '#dbeafe', text: '#2563eb' },
  PREPARING:        { bg: '#ede9fe', text: '#7c3aed' },
  READY:            { bg: '#d1fae5', text: '#059669' },
  OUT_FOR_DELIVERY: { bg: '#cffafe', text: '#0891b2' },
  DELIVERED:        { bg: '#f0fdf4', text: '#16a34a' },
  REJECTED:         { bg: '#fee2e2', text: '#dc2626' },
}
const STATUSES = ['PENDING','ACCEPTED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','REJECTED']
const PLATFORMS = ['ALL','ZOMATO','SWIGGY','OWN','WHATSAPP','PHONE']

function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN') }
function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' +
    dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function Badge({ label, colors }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
      background: colors?.bg || '#e5e7eb', color: colors?.text || '#374151', letterSpacing: 0.3 }}>
      {label}
    </span>
  )
}

// ── Order detail / action modal ───────────────────────────────────────────
function OrderModal({ order, onClose, onRefresh, toast }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason]       = useState('')
  const [saving, setSaving]       = useState(false)

  if (!order) return null

  const items = (() => {
    try { return JSON.parse(order.itemsJson || '[]') } catch { return [] }
  })()

  async function accept() {
    setSaving(true)
    try {
      await api.patch(`/online-orders/${order.id}/accept`)
      toast.success('Order accepted')
      onRefresh(); onClose()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }

  async function reject() {
    if (!reason.trim()) return toast.error('Rejection reason dalo')
    setSaving(true)
    try {
      await api.patch(`/online-orders/${order.id}/reject?reason=${encodeURIComponent(reason)}`)
      toast.success('Order rejected')
      onRefresh(); onClose()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }

  async function updateStatus(status) {
    setSaving(true)
    try {
      await api.patch(`/online-orders/${order.id}/status?status=${status}`)
      toast.success(`Status → ${status}`)
      onRefresh(); onClose()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }

  const nextStatuses = {
    ACCEPTED:   ['PREPARING'],
    PREPARING:  ['READY'],
    READY:      ['OUT_FOR_DELIVERY'],
    OUT_FOR_DELIVERY: ['DELIVERED'],
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 520,
        padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Order #{order.id}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <Badge label={order.platform} colors={PLATFORM_COLORS[order.platform]} />
              <Badge label={order.status} colors={STATUS_COLORS[order.status]} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

        {/* Customer */}
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-page)',
          border: '1px solid var(--border)', marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{order.customerName || '—'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{order.customerPhone || '—'}</div>
          {order.deliveryAddress && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
              📍 {order.deliveryAddress}
            </div>
          )}
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8,
              textTransform: 'uppercase', letterSpacing: 0.5 }}>Items</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span>{item.name || item.itemName} × {item.qty || item.quantity || 1}</span>
                <span style={{ fontWeight: 600 }}>{fmt((item.price || 0) * (item.qty || item.quantity || 1))}</span>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-page)',
          border: '1px solid var(--border)', marginBottom: 16, fontSize: 13 }}>
          {[
            { label: 'Subtotal', value: fmt(order.subtotal) },
            order.discount > 0 && { label: 'Discount', value: `-${fmt(order.discount)}`, color: '#10b981' },
            order.deliveryCharge > 0 && { label: 'Delivery', value: fmt(order.deliveryCharge) },
            order.tax > 0 && { label: 'Tax', value: fmt(order.tax) },
            order.platformCommission > 0 && { label: 'Platform Fee', value: fmt(order.platformCommission), color: '#ef4444' },
          ].filter(Boolean).map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
              <span style={{ color: r.color }}>{r.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0',
            borderTop: '1px solid var(--border)', marginTop: 6, fontWeight: 700, fontSize: 15 }}>
            <span>Total</span>
            <span style={{ color: '#10b981' }}>{fmt(order.total)}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: order.isPaid ? '#10b981' : '#ef4444', fontWeight: 600 }}>
            {order.paymentMode} · {order.isPaid ? '✓ Paid' : 'Unpaid'}
          </div>
        </div>

        {/* Actions */}
        {order.status === 'PENDING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={accept} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#10b981',
                color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              ✓ Accept Order
            </button>
            {!rejecting ? (
              <button onClick={() => setRejecting(true)}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ef4444',
                  background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                ✗ Reject Order
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Rejection reason…"
                  style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={reject} disabled={saving}
                    style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                      background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    Confirm Reject
                  </button>
                  <button onClick={() => { setRejecting(false); setReason('') }}
                    style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {nextStatuses[order.status] && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {nextStatuses[order.status].map(s => (
              <button key={s} onClick={() => updateStatus(s)} disabled={saving}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: STATUS_COLORS[s]?.bg || '#6366f1', color: STATUS_COLORS[s]?.text || '#fff',
                  cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                → {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function OnlineOrders() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [platform, setPlatform] = useState('ALL')
  const [status,   setStatus]   = useState('ALL')
  const [page,     setPage]     = useState(0)
  const [total,    setTotal]    = useState(0)
  const [selected, setSelected] = useState(null)
  const PAGE_SIZE = 20

  const load = useCallback(async (p = 0, plt = platform, st = status) => {
    setLoading(true)
    try {
      let params = `page=${p}&size=${PAGE_SIZE}&restaurantId=${rid}`
      if (plt !== 'ALL') params += `&platform=${plt}`
      if (st  !== 'ALL') params += `&status=${st}`
      const data = await api.get(`/online-orders?${params}`)
      const list = Array.isArray(data) ? data : (data?.content ?? [])
      setOrders(list)
      setTotal(data?.totalElements ?? list.length)
    } catch { setOrders([]) }
    finally { setLoading(false) }
  }, [rid, platform, status])

  useEffect(() => { load(0, platform, status) }, [rid])

  function applyFilter(plt, st) {
    setPlatform(plt); setStatus(st); setPage(0)
    load(0, plt, st)
  }

  // Summary counts
  const pending  = orders.filter(o => o.status === 'PENDING').length
  const active   = orders.filter(o => ['ACCEPTED','PREPARING','READY','OUT_FOR_DELIVERY'].includes(o.status)).length
  const today    = orders.filter(o => o.status === 'DELIVERED').length
  const revenue  = orders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + (o.total || 0), 0)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📱 Online Orders</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Zomato, Swiggy, aur baaki platforms ke orders manage karo
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Pending',    value: pending,         color: '#d97706' },
          { label: 'Active',     value: active,          color: '#6366f1' },
          { label: 'Delivered',  value: today,           color: '#10b981' },
          { label: 'Revenue',    value: fmt(revenue),    color: '#10b981', big: true },
          { label: 'Total',      value: total,           color: '#6366f1' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: c.big ? 16 : 20, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Platform</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PLATFORMS.map(p => (
              <button key={p} onClick={() => applyFilter(p, status)}
                style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)',
                  background: platform === p ? 'var(--accent)' : 'transparent',
                  color: platform === p ? '#fff' : 'var(--text)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {p === 'ALL' ? 'All Platforms' : p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Status</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['ALL', ...STATUSES].map(s => (
              <button key={s} onClick={() => applyFilter(platform, s)}
                style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)',
                  background: status === s
                    ? (STATUS_COLORS[s]?.bg || 'var(--accent)')
                    : 'transparent',
                  color: status === s
                    ? (STATUS_COLORS[s]?.text || '#fff')
                    : 'var(--text)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {s === 'ALL' ? 'All Status' : s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        {loading ? <SkeletonTable rows={6} /> : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Koi order nahi mila
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)',
                    fontSize: 11, textTransform: 'uppercase' }}>
                    {['Order', 'Platform', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Time', ''].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setSelected(o)}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 12, color: 'var(--text-muted)' }}>
                        #{o.id}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge label={o.platform} colors={PLATFORM_COLORS[o.platform]} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{o.customerName || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {o.customerPhone || ''}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                        {o.itemsCount ?? '—'} items
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#10b981' }}>
                        {fmt(o.total)}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12 }}>
                        <div>{o.paymentMode || '—'}</div>
                        <div style={{ color: o.isPaid ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: 11 }}>
                          {o.isPaid ? '✓ Paid' : 'Unpaid'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge label={o.status?.replace(/_/g, ' ')} colors={STATUS_COLORS[o.status]} />
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fmtDate(o.createdAt || o.orderTime)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {o.status === 'PENDING' && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706',
                            background: '#fef3c7', padding: '3px 8px', borderRadius: 20 }}>
                            Action needed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <button disabled={page === 0}
                  onClick={() => { const p = page-1; setPage(p); load(p, platform, status) }}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text)',
                    cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, fontSize: 13 }}>
                  ← Prev
                </button>
                <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
                </span>
                <button disabled={(page+1)*PAGE_SIZE >= total}
                  onClick={() => { const p = page+1; setPage(p); load(p, platform, status) }}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text)',
                    cursor: (page+1)*PAGE_SIZE >= total ? 'not-allowed' : 'pointer',
                    opacity: (page+1)*PAGE_SIZE >= total ? 0.4 : 1, fontSize: 13 }}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <OrderModal order={selected} onClose={() => setSelected(null)}
          onRefresh={() => load(page, platform, status)} toast={toast} />
      )}
    </div>
  )
}
