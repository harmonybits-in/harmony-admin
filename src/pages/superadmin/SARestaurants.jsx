import { useState, useEffect, useMemo } from 'react'
import { adminApi } from '../../api/client'

const PLAN_CFG = {
  TRIAL:      { bg: '#f59e0b33', color: '#f59e0b', label: 'Trial'      },
  FREE:       { bg: '#16a34a33', color: '#16a34a', label: 'Free'        },
  STARTER:    { bg: '#6366f133', color: '#6366f1', label: 'Starter'    },
  GROWTH:     { bg: '#10b98133', color: '#10b981', label: 'Growth'     },
  PRO:        { bg: '#863bff33', color: '#863bff', label: 'Pro'         },
  ENTERPRISE: { bg: '#ef444433', color: '#ef4444', label: 'Enterprise' },
}

const PLAN_OPTIONS = ['TRIAL', 'FREE', 'STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']

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

const btnBase = {
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
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

function StatusPill({ active }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      background: active ? '#10b98122' : '#ef444422',
      color: active ? '#10b981' : '#ef4444',
      fontSize: 11,
      fontWeight: 700,
    }}>
      {active ? 'Active' : 'Inactive'}
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

function StatsModal({ restaurant, onClose }) {
  const [stats, setStats] = useState(null)
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      adminApi.getStats(restaurant.id),
      adminApi.getSubscription(restaurant.id),
    ])
      .then(([s, subscription]) => {
        if (!cancelled) {
          setStats(s)
          setSub(subscription)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [restaurant.id])

  const subStatusColor = {
    ACTIVE: '#10b981',
    TRIAL: '#f59e0b',
    EXPIRED: '#ef4444',
    NONE: '#888',
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{
        background: '#1A1A2E',
        borderRadius: 16,
        border: '1px solid #2a2a3e',
        padding: 28,
        width: 480,
        maxWidth: '100%',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{restaurant.name}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{restaurant.city}</div>
          </div>
          <button
            onClick={onClose}
            style={{ ...btnBase, background: '#2a2a3e', color: '#fff', padding: '6px 14px' }}
          >
            ✕ Close
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading stats…</div>
        )}
        {error && (
          <div style={{ color: '#ef4444', textAlign: 'center', padding: 20 }}>{error}</div>
        )}
        {!loading && !error && stats && (
          <>
            <div style={{ fontSize: 11, color: '#863bff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
              Restaurant Stats
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Bills', value: stats.totalBills ?? '—', icon: '🧾' },
                { label: 'Total Revenue', value: stats.totalRevenue != null ? `₹${Number(stats.totalRevenue).toLocaleString('en-IN')}` : '—', icon: '💰' },
                { label: 'Staff Count', value: stats.totalStaff ?? '—', icon: '👥' },
                { label: 'Menu Items', value: stats.totalMenuItems ?? '—', icon: '🍽️' },
              ].map((s) => (
                <div key={s.label} style={{
                  background: '#0F0F1A',
                  borderRadius: 10,
                  padding: '14px 16px',
                  border: '1px solid #2a2a3e',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: '#863bff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
              Subscription
            </div>
            {sub ? (
              <div style={{ background: '#0F0F1A', borderRadius: 10, padding: '14px 16px', border: '1px solid #2a2a3e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <PlanBadge plan={sub.planType || sub.plan} />
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: subStatusColor[sub.status] || '#888',
                    background: (subStatusColor[sub.status] || '#888') + '22',
                    padding: '3px 9px',
                    borderRadius: 20,
                  }}>
                    {sub.status || '—'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  {[
                    ['Start Date', sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-IN') : '—'],
                    ['Expiry Date', sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-IN') : '—'],
                    ['Days Remaining', sub.daysRemaining ?? '—'],
                    ['Auto Renew', sub.autoRenew ? 'Yes' : 'No'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color: '#888', marginBottom: 2 }}>{k}</div>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ color: '#888', fontSize: 13 }}>No subscription data available.</div>
            )}
          </>
        )}
      </div>
    </ModalOverlay>
  )
}

function RestaurantForm({ initial, onSave, onClose, title, saving }) {
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    planType: 'TRIAL',
    ...initial,
  })

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{
        background: '#1A1A2E',
        borderRadius: 16,
        border: '1px solid #2a2a3e',
        padding: 28,
        width: 500,
        maxWidth: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{title}</div>
          <button onClick={onClose} style={{ ...btnBase, background: '#2a2a3e', color: '#fff', padding: '6px 14px' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { key: 'name', label: 'Restaurant Name', placeholder: 'e.g. The Grand Kitchen' },
            { key: 'ownerName', label: 'Owner Name', placeholder: 'e.g. Rahul Sharma' },
            { key: 'email', label: 'Email', placeholder: 'owner@example.com', type: 'email' },
            { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
            { key: 'city', label: 'City', placeholder: 'e.g. Mumbai' },
            { key: 'address', label: 'Address', placeholder: 'Full address' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                style={inputStyle}
                type={type || 'text'}
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}

          <div>
            <label style={labelStyle}>Plan Type</label>
            <select
              style={inputStyle}
              value={form.planType}
              onChange={(e) => set('planType', e.target.value)}
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ ...btnBase, background: '#2a2a3e', color: '#fff' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            style={{ ...btnBase, background: '#863bff', color: '#fff', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
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
          <button onClick={onCancel} style={{ ...btnBase, background: '#2a2a3e', color: '#fff' }}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{ ...btnBase, background: danger ? '#ef4444' : '#863bff', color: '#fff' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

export default function SARestaurants() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [statsFor, setStatsFor] = useState(null)
  const [editFor, setEditFor] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [rowHover, setRowHover] = useState(null)

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

  const filtered = useMemo(() => {
    let list = restaurants
    if (filter === 'ACTIVE') list = list.filter((r) => r.active)
    if (filter === 'INACTIVE') list = list.filter((r) => !r.active)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.city || '').toLowerCase().includes(q) ||
        (r.ownerName || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [restaurants, filter, search])

  async function handleCreate(form) {
    setSaving(true)
    try {
      await adminApi.createRestaurant(form)
      setShowAdd(false)
      load()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(form) {
    setSaving(true)
    try {
      await adminApi.updateRestaurant(editFor.id, form)
      setEditFor(null)
      load()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  function requestToggle(r) {
    setConfirm({
      message: `${r.active ? 'Deactivate' : 'Activate'} "${r.name}"?`,
      confirmLabel: r.active ? 'Deactivate' : 'Activate',
      danger: r.active,
      onConfirm: async () => {
        setConfirm(null)
        try {
          await adminApi.toggleActive(r.id, !r.active)
          load()
        } catch (e) {
          alert('Error: ' + e.message)
        }
      },
    })
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

  const filterPills = ['ALL', 'ACTIVE', 'INACTIVE']

  return (
    <div style={{ padding: 24, background: '#0F0F1A', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Restaurants</h1>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {restaurants.length} restaurants total
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ ...btnBase, background: '#863bff', color: '#fff', padding: '10px 20px', fontSize: 14 }}
        >
          + Add Restaurant
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          style={{ ...inputStyle, maxWidth: 360 }}
          placeholder="Search by name, city, owner, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {filterPills.map((pill) => (
          <button
            key={pill}
            onClick={() => setFilter(pill)}
            style={{
              ...btnBase,
              padding: '6px 16px',
              background: filter === pill ? '#863bff' : '#1A1A2E',
              color: filter === pill ? '#fff' : '#888',
              border: filter === pill ? 'none' : '1px solid #2a2a3e',
              fontSize: 12,
            }}
          >
            {pill}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading restaurants…</div>
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
                {['#', 'Name', 'Owner', 'Email', 'Phone', 'City', 'Plan', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: '#888', padding: 40 }}>
                    No restaurants found.
                  </td>
                </tr>
              )}
              {filtered.map((r, idx) => (
                <tr
                  key={r.id}
                  onMouseEnter={() => setRowHover(r.id)}
                  onMouseLeave={() => setRowHover(null)}
                  style={{
                    background: rowHover === r.id ? '#252540' : 'transparent',
                    borderTop: '1px solid #2a2a3e',
                    transition: 'background 0.15s',
                  }}
                >
                  <td style={{ ...tdStyle, color: '#888' }}>{idx + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#fff', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.name}
                  </td>
                  <td style={tdStyle}>{r.ownerName || '—'}</td>
                  <td style={{ ...tdStyle, color: '#888' }}>{r.email || '—'}</td>
                  <td style={tdStyle}>{r.phone || '—'}</td>
                  <td style={tdStyle}>{r.city || '—'}</td>
                  <td style={tdStyle}><PlanBadge plan={r.planType || r.plan} /></td>
                  <td style={tdStyle}><StatusPill active={r.active} /></td>
                  <td style={{ ...tdStyle, color: '#888' }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        title="View Stats"
                        onClick={() => setStatsFor(r)}
                        style={{
                          border: 'none',
                          background: '#863bff22',
                          color: '#863bff',
                          borderRadius: 7,
                          padding: '5px 10px',
                          cursor: 'pointer',
                          fontSize: 14,
                        }}
                      >
                        📊
                      </button>
                      <button
                        title={r.active ? 'Deactivate' : 'Activate'}
                        onClick={() => requestToggle(r)}
                        style={{
                          border: 'none',
                          background: r.active ? '#ef444422' : '#10b98122',
                          color: r.active ? '#ef4444' : '#10b981',
                          borderRadius: 7,
                          padding: '5px 10px',
                          cursor: 'pointer',
                          fontSize: 14,
                        }}
                      >
                        {r.active ? '🔴' : '🟢'}
                      </button>
                      <button
                        title="Edit"
                        onClick={() => setEditFor(r)}
                        style={{
                          border: 'none',
                          background: '#6366f122',
                          color: '#6366f1',
                          borderRadius: 7,
                          padding: '5px 10px',
                          cursor: 'pointer',
                          fontSize: 14,
                        }}
                      >
                        ✏️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {statsFor && (
        <StatsModal restaurant={statsFor} onClose={() => setStatsFor(null)} />
      )}

      {editFor && (
        <RestaurantForm
          title={`Edit — ${editFor.name}`}
          initial={editFor}
          saving={saving}
          onClose={() => setEditFor(null)}
          onSave={handleUpdate}
        />
      )}

      {showAdd && (
        <RestaurantForm
          title="Add Restaurant"
          initial={{}}
          saving={saving}
          onClose={() => setShowAdd(false)}
          onSave={handleCreate}
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
    </div>
  )
}
