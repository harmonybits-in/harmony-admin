import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../../api/client'

const PLAN_CFG = {
  TRIAL:      { bg: '#f59e0b33', color: '#f59e0b', label: 'Trial',      price: null },
  FREE:       { bg: '#16a34a33', color: '#16a34a', label: 'Free',        price: '₹0' },
  STARTER:    { bg: '#6366f133', color: '#6366f1', label: 'Starter',    price: '₹799/mo' },
  GROWTH:     { bg: '#10b98133', color: '#10b981', label: 'Growth',     price: '₹1,999/mo' },
  PRO:        { bg: '#863bff33', color: '#863bff', label: 'Pro',         price: '₹3,499/mo' },
  ENTERPRISE: { bg: '#ef444433', color: '#ef4444', label: 'Enterprise', price: '₹4,999/mo' },
}

const SUB_STATUS_CFG = {
  ACTIVE:  { color: '#10b981', bg: '#10b98122', label: 'Active' },
  TRIAL:   { color: '#f59e0b', bg: '#f59e0b22', label: 'Trial' },
  EXPIRED: { color: '#ef4444', bg: '#ef444422', label: 'Expired' },
  NONE:    { color: '#888',    bg: '#88888822', label: 'None' },
}

const PAID_PLANS = [
  { id: 'STARTER',    label: 'Starter',    price: '₹799/mo'   },
  { id: 'GROWTH',     label: 'Growth',     price: '₹1,999/mo' },
  { id: 'PRO',        label: 'Pro',         price: '₹3,499/mo' },
  { id: 'ENTERPRISE', label: 'Enterprise', price: '₹4,999/mo' },
]

const btnBase = {
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 700,
}

const inputStyle = {
  width: '100%',
  background: '#0F0F1A',
  border: '1px solid #2a2a3e',
  borderRadius: 8,
  padding: '9px 12px',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 12,
  color: '#888',
  marginBottom: 4,
  display: 'block',
  fontWeight: 600,
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      right: 28,
      zIndex: 2000,
      background: type === 'error' ? '#ef4444' : '#10b981',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: 10,
      fontWeight: 700,
      fontSize: 14,
      boxShadow: '0 4px 24px #0008',
      maxWidth: 360,
    }}>
      {message}
    </div>
  )
}

function SubStatusPill({ status }) {
  const cfg = SUB_STATUS_CFG[status] || SUB_STATUS_CFG.NONE
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 11,
      fontWeight: 700,
    }}>
      {cfg.label}
    </span>
  )
}

function PlanBadge({ plan }) {
  const cfg = PLAN_CFG[plan] || { bg: '#33333333', color: '#888', label: plan || '—' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 9px',
      borderRadius: 20,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 11,
      fontWeight: 700,
    }}>
      {cfg.label}
    </span>
  )
}

function ModalOverlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}

function ConfirmDialog({ message, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <ModalOverlay onClose={onCancel}>
      <div style={{
        background: '#1A1A2E',
        borderRadius: 14,
        border: '1px solid #2a2a3e',
        padding: 28,
        width: 360,
        maxWidth: '100%',
      }}>
        <div style={{ fontSize: 15, color: '#fff', marginBottom: 24, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ ...btnBase, background: '#2a2a3e', color: '#fff', padding: '8px 16px', fontSize: 13 }}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{ ...btnBase, background: danger ? '#ef4444' : '#863bff', color: '#fff', padding: '8px 16px', fontSize: 13 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function ActivateModal({ restaurant, onClose, onSuccess }) {
  const [planId, setPlanId] = useState('STARTER')
  const [days, setDays] = useState(30)
  const [saving, setSaving] = useState(false)

  async function handleActivate() {
    setSaving(true)
    try {
      await adminApi.activateSub(restaurant.id, planId, Number(days))
      onSuccess(`Subscription activated for ${restaurant.name}`)
      onClose()
    } catch (e) {
      onSuccess('Error: ' + e.message, 'error')
      onClose()
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{
        background: '#1A1A2E',
        borderRadius: 16,
        border: '1px solid #2a2a3e',
        padding: 28,
        width: 420,
        maxWidth: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Activate Plan</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{restaurant.name}</div>
          </div>
          <button onClick={onClose} style={{ ...btnBase, background: '#2a2a3e', color: '#fff', padding: '6px 14px', fontSize: 13 }}>✕</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Select Plan</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PAID_PLANS.map((p) => (
              <label
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: planId === p.id ? '#863bff22' : '#0F0F1A',
                  border: planId === p.id ? '1px solid #863bff' : '1px solid #2a2a3e',
                  borderRadius: 8,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name="plan"
                    value={p.id}
                    checked={planId === p.id}
                    onChange={() => setPlanId(p.id)}
                    style={{ accentColor: '#863bff' }}
                  />
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{p.label}</span>
                </div>
                <span style={{ color: '#863bff', fontSize: 13, fontWeight: 700 }}>{p.price}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={labelStyle}>Duration (Days)</label>
          <input
            style={inputStyle}
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...btnBase, background: '#2a2a3e', color: '#fff', padding: '9px 18px', fontSize: 13 }}>Cancel</button>
          <button
            onClick={handleActivate}
            disabled={saving}
            style={{ ...btnBase, background: '#863bff', color: '#fff', padding: '9px 18px', fontSize: 13, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Activating…' : '⚡ Activate'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function SubDetailPanel({ restaurantId, onClose }) {
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminApi.getSubscription(restaurantId)
      .then((data) => { if (!cancelled) setSub(data) })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [restaurantId])

  return (
    <div style={{
      background: '#0F0F1A',
      borderTop: '1px solid #2a2a3e',
      padding: '16px 20px',
      position: 'relative',
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          ...btnBase,
          background: 'none',
          color: '#888',
          fontSize: 16,
          padding: '2px 6px',
        }}
      >
        ✕
      </button>

      {loading && <div style={{ color: '#888', fontSize: 13, padding: '8px 0' }}>Loading subscription…</div>}
      {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
      {!loading && !error && !sub && <div style={{ color: '#888', fontSize: 13 }}>No subscription data.</div>}
      {!loading && !error && sub && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {[
            ['Plan', <PlanBadge plan={sub.planType || sub.plan} />],
            ['Status', <SubStatusPill status={sub.status} />],
            ['Start', sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-IN') : '—'],
            ['Expiry', sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-IN') : '—'],
            ['Days Left', sub.daysRemaining ?? '—'],
            ['Auto Renew', sub.autoRenew ? 'Yes' : 'No'],
            ['Razorpay Sub ID', sub.razorpaySubId || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#1A1A2E', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a2a3e' }}>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{k}</div>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SASubscriptions() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [activateFor, setActivateFor] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState(null)
  const [rowHover, setRowHover] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  const dismissToast = useCallback(() => setToast(null), [])

  function load() {
    setLoading(true)
    setError(null)
    adminApi.getRestaurants()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.content || [])
        setRestaurants(list)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function handleRowClick(r) {
    setExpandedId((prev) => (prev === r.id ? null : r.id))
  }

  async function handleExtend(r) {
    try {
      await adminApi.extendSub(r.id, 30)
      showToast(`Extended 30 days for ${r.name}`)
      load()
    } catch (e) {
      showToast('Error: ' + e.message, 'error')
    }
  }

  function requestDeactivate(r) {
    setConfirm({
      message: `Deactivate subscription for "${r.name}"? This will expire their plan immediately.`,
      confirmLabel: 'Deactivate',
      danger: true,
      onConfirm: async () => {
        setConfirm(null)
        try {
          await adminApi.deactivateSub(r.id)
          showToast(`Subscription deactivated for ${r.name}`)
          load()
        } catch (e) {
          showToast('Error: ' + e.message, 'error')
        }
      },
    })
  }

  function getSubStatus(r) {
    if (r.subscription?.status) return r.subscription.status
    if (r.subscriptionStatus) return r.subscriptionStatus
    if (r.planType === 'TRIAL') return 'TRIAL'
    return null
  }

  function getPlan(r) {
    if (r.subscription?.planType) return r.subscription.planType
    if (r.subscription?.plan) return r.subscription.plan
    return r.planType || r.plan
  }

  function getExpiry(r) {
    const d = r.subscription?.endDate || r.subscriptionEndDate
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN')
  }

  const thStyle = {
    padding: '12px 14px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    whiteSpace: 'nowrap',
  }

  const tdStyle = {
    padding: '12px 14px',
    fontSize: 13,
    color: '#e0e0e0',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ padding: 24, background: '#0F0F1A', minHeight: '100vh', color: '#fff' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Subscriptions</h1>
        <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
          Manage restaurant subscription plans
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading…</div>
      )}
      {error && (
        <div style={{ color: '#ef4444', padding: 20, background: '#ef444411', borderRadius: 8, marginBottom: 16 }}>
          {error}
          <button onClick={load} style={{ marginLeft: 12, ...btnBase, background: '#ef4444', color: '#fff', padding: '4px 12px', fontSize: 12 }}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#2a2a3e' }}>
                {['Restaurant', 'Owner', 'City', 'Current Plan', 'Sub Status', 'Expiry', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {restaurants.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#888', padding: 40 }}>
                    No restaurants found.
                  </td>
                </tr>
              )}
              {restaurants.map((r) => {
                const subStatus = getSubStatus(r)
                const plan = getPlan(r)
                const expiry = getExpiry(r)
                const isExpanded = expandedId === r.id

                return (
                  <>
                    <tr
                      key={r.id}
                      onMouseEnter={() => setRowHover(r.id)}
                      onMouseLeave={() => setRowHover(null)}
                      onClick={() => handleRowClick(r)}
                      style={{
                        background: isExpanded ? '#252540' : rowHover === r.id ? '#252540' : 'transparent',
                        borderTop: '1px solid #2a2a3e',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 11,
                            color: '#863bff',
                            transition: 'transform 0.15s',
                            display: 'inline-block',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          }}>▶</span>
                          {r.name}
                        </div>
                      </td>
                      <td style={tdStyle}>{r.ownerName || '—'}</td>
                      <td style={tdStyle}>{r.city || '—'}</td>
                      <td style={tdStyle}><PlanBadge plan={plan} /></td>
                      <td style={tdStyle}>
                        {subStatus ? <SubStatusPill status={subStatus} /> : <span style={{ color: '#888', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, color: '#888' }}>{expiry}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <div
                          style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            title="Activate Plan"
                            onClick={() => setActivateFor(r)}
                            style={{
                              ...btnBase,
                              background: '#863bff22',
                              color: '#863bff',
                              padding: '5px 10px',
                              fontSize: 14,
                              borderRadius: 7,
                            }}
                          >
                            ⚡
                          </button>
                          <button
                            title="Extend 30 Days"
                            onClick={() => handleExtend(r)}
                            style={{
                              ...btnBase,
                              background: '#10b98122',
                              color: '#10b981',
                              padding: '5px 10px',
                              fontSize: 13,
                              borderRadius: 7,
                            }}
                          >
                            +30d
                          </button>
                          <button
                            title="Deactivate Subscription"
                            onClick={() => requestDeactivate(r)}
                            style={{
                              ...btnBase,
                              background: '#ef444422',
                              color: '#ef4444',
                              padding: '5px 10px',
                              fontSize: 14,
                              borderRadius: 7,
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={r.id + '-detail'}>
                        <td colSpan={7} style={{ padding: 0, borderTop: '1px solid #2a2a3e' }}>
                          <SubDetailPanel restaurantId={r.id} onClose={() => setExpandedId(null)} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {activateFor && (
        <ActivateModal
          restaurant={activateFor}
          onClose={() => setActivateFor(null)}
          onSuccess={(msg, type) => {
            showToast(msg, type)
            load()
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={dismissToast} />
      )}
    </div>
  )
}
