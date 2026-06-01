// src/pages/RestaurantManagement.jsx
import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../api/client'
import { useToast } from '../hooks/useToast'

// ── Mock fallback data ────────────────────────────────────────────
const MOCK_DASHBOARD = {
  totalRestaurants: 24, activeSubscriptions: 18,
  expiredSubscriptions: 6, totalRevenue: 17982,
}
const MOCK_RESTAURANTS = [
  { id: 1, restaurantId: 'REST001', name: 'Truce Cafe',    ownerName: 'Abhinav Verma',  email: 'truce@gmail.com',   phone: '9876543210', city: 'Meerut',    planType: 'GROWTH',     isActive: true,  createdAt: '2024-01-15' },
  { id: 2, restaurantId: 'REST002', name: 'Spice Garden',  ownerName: 'Rahul Sharma',   email: 'spice@gmail.com',   phone: '9876543211', city: 'Delhi',     planType: 'STARTER',    isActive: true,  createdAt: '2024-02-20' },
  { id: 3, restaurantId: 'REST003', name: 'Mumbai Bites',  ownerName: 'Priya Patel',    email: 'mumbai@gmail.com',  phone: '9876543212', city: 'Mumbai',    planType: 'ENTERPRISE', isActive: true,  createdAt: '2024-03-10' },
  { id: 4, restaurantId: 'REST004', name: 'Royal Kitchen', ownerName: 'Suresh Kumar',   email: 'royal@gmail.com',   phone: '9876543213', city: 'Bangalore', planType: 'TRIAL',      isActive: false, createdAt: '2024-04-05' },
  { id: 5, restaurantId: 'REST005', name: 'Punjabi Dhaba', ownerName: 'Gurpreet Singh', email: 'punjabi@gmail.com', phone: '9876543214', city: 'Chandigarh',planType: 'GROWTH',     isActive: true,  createdAt: '2024-04-18' },
]

const PLAN_TYPES = ['TRIAL', 'FREE', 'STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']
const PLAN_CFG   = {
  TRIAL:      { color: '#f59e0b', bg: '#fef3c7' },
  FREE:       { color: '#16a34a', bg: '#dcfce7' },
  STARTER:    { color: '#6366f1', bg: '#ede9fe' },
  GROWTH:     { color: '#10b981', bg: '#d1fae5' },
  PRO:        { color: '#863bff', bg: '#f3e8ff' },
  ENTERPRISE: { color: '#e53e3e', bg: '#fee2e2' },
}

// ── Shared style tokens ───────────────────────────────────────────
const INP = {
  width: '100%', padding: '9px 12px', borderRadius: 7,
  border: '1.5px solid var(--border)',
  background: 'var(--bg-page)', color: 'var(--text)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .15s', fontFamily: 'inherit',
}
const BTN_PRIMARY = {
  padding: '9px 18px', borderRadius: 7, border: 'none',
  background: '#e53e3e', color: '#fff',
  fontWeight: 700, fontSize: 13, cursor: 'pointer',
}
const BTN_OUTLINE = {
  padding: '9px 16px', borderRadius: 7,
  border: '1.5px solid var(--border)',
  background: 'transparent', color: 'var(--text)',
  fontSize: 13, cursor: 'pointer',
}
const TH = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11,
  color: 'var(--text-muted)', fontWeight: 700,
  background: 'var(--bg-page)', borderBottom: '1.5px solid var(--border)',
  whiteSpace: 'nowrap',
}
const TD = {
  padding: '11px 14px', fontSize: 13,
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
}

// ── Controlled input with focus border ───────────────────────────
function FInput({ error, ...props }) {
  const [focus, setFocus] = useState(false)
  return (
    <input
      {...props}
      style={{
        ...INP,
        borderColor: error ? '#e53e3e' : focus ? '#e53e3e' : undefined,
        ...(props.style || {}),
      }}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
    />
  )
}

function FTextarea({ ...props }) {
  const [focus, setFocus] = useState(false)
  return (
    <textarea
      {...props}
      style={{
        ...INP, resize: 'vertical', fontFamily: 'inherit',
        borderColor: focus ? '#e53e3e' : undefined,
      }}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
    />
  )
}

function FSelect({ children, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <select {...props} style={{ ...INP, paddingRight: 28, cursor: 'pointer', appearance: 'none' }}>
        {children}
      </select>
      <span style={{
        position: 'absolute', right: 9, top: '50%',
        transform: 'translateY(-50%)', pointerEvents: 'none',
        fontSize: 10, color: 'var(--text-muted)',
      }}>▼</span>
    </div>
  )
}

// ── Form field wrapper ────────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>
        {label}
        {required && <span style={{ color: '#e53e3e', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 10, color: '#e53e3e', marginTop: 3 }}>{error}</div>}
    </div>
  )
}

// ── Section divider ───────────────────────────────────────────────
function Section({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '18px 0 12px',
    }}>
      <div style={{ height: 1, flex: 1, background: '#fee2e2' }} />
      <span style={{ fontSize: 10, fontWeight: 800, color: '#e53e3e', textTransform: 'uppercase', letterSpacing: 1 }}>
        {children}
      </span>
      <div style={{ height: 1, flex: 1, background: '#fee2e2' }} />
    </div>
  )
}

// ── Modal wrapper ─────────────────────────────────────────────────
// stopPropagation on inner box prevents click from bubbling to backdrop → no accidental close
function Modal({ onClose, width = 660, children }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 800,
          background: 'rgba(0,0,0,.45)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 900, width, maxWidth: 'calc(100vw - 32px)',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          background: 'var(--bg-card)',
          borderRadius: 14, border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,.22)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </>
  )
}

// ── Register / Edit Modal ─────────────────────────────────────────
function RestaurantModal({ initial, onClose, onSave }) {
  const toast  = useToast()
  const api = adminApi
  const isEdit = !!initial?.id

  const [form, setForm] = useState(() => ({
    name: '', ownerName: '', email: '', phone: '',
    address: '', city: '', state: '', pinCode: '',
    latitude: '', longitude: '',
    planType: 'STARTER', gstNumber: '', fssaiLicNo: '',
    upiId: '', upiName: '',
    loyaltyPointsPer100: 5, loyaltyExpiryDays: 365, vipThreshold: 10000,
    // Spread initial — null values ko '' se replace karo
    ...Object.fromEntries(
      Object.entries(initial || {}).map(([k, v]) => [k, v ?? ''])
    ),
  }))
  const [errors,  setErrors]  = useState({})
  const [saving,  setSaving]  = useState(false)

  // Universal change handler
  const upd = field => e => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    if (errors[field]) setErrors(p => ({ ...p, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim())       e.name      = 'Restaurant name required hai'
    if (!form.ownerName.trim())  e.ownerName = 'Owner name required hai'
    if (!form.phone.trim())      e.phone     = 'Phone required hai'
    else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, '')))
                                 e.phone     = '10 digit phone number chahiye'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        phone:               form.phone.replace(/\D/g, ''),
        loyaltyPointsPer100: Number(form.loyaltyPointsPer100),
        loyaltyExpiryDays:   Number(form.loyaltyExpiryDays),
        vipThreshold:        Number(form.vipThreshold),
        latitude:            form.latitude  ? Number(form.latitude)  : null,
        longitude:           form.longitude ? Number(form.longitude) : null,
        upiId:               form.upiId   || '',
        upiName:             form.upiName || '',
        gstNumber:           form.gstNumber   || null,
        fssaiLicNo:          form.fssaiLicNo  || null,
        pinCode:             form.pinCode     || null,
      }
      if (isEdit) await api.updateRestaurant(initial.id, payload)
      else        await api.createRestaurant(payload)
      toast.success(`✅ Restaurant ${isEdit ? 'update' : 'register'} ho gaya!`)
      onSave()
    } catch {
      toast.error('Save nahi hua — backend check karo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} width={660}>
      {/* Header */}
      <div style={{
        padding: '18px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        background: 'var(--bg-card)', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
            {isEdit ? `✏️ Edit — ${initial.name}` : '🏪 Register New Restaurant'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {isEdit ? 'Restaurant details update karo' : 'Naya restaurant platform pe add karo'}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: 'var(--text-muted)',
          }}
        >×</button>
      </div>

      {/* Body — scrollable */}
      <div style={{ overflowY: 'auto', padding: '6px 24px 12px', flex: 1 }}>
        <Section>Basic Details</Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Restaurant Name" required error={errors.name}>
            <FInput value={form.name} onChange={upd('name')} placeholder="e.g. Truce Cafe" error={errors.name} />
          </Field>
          <Field label="Owner Name" required error={errors.ownerName}>
            <FInput value={form.ownerName} onChange={upd('ownerName')} placeholder="Owner ka naam" error={errors.ownerName} />
          </Field>
          <Field label="Email">
            <FInput type="email" value={form.email} onChange={upd('email')} placeholder="email@example.com" />
          </Field>
          <Field label="Phone" required error={errors.phone}>
            <FInput value={form.phone} onChange={upd('phone')} placeholder="9876543210" error={errors.phone} />
          </Field>
        </div>

        <Section>Address</Section>
        <Field label="Full Address">
          <FTextarea value={form.address} onChange={upd('address')} rows={2} placeholder="Complete address" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="City">
            <FInput value={form.city}    onChange={upd('city')}    placeholder="Meerut" />
          </Field>
          <Field label="State">
            <FInput value={form.state}   onChange={upd('state')}   placeholder="Uttar Pradesh" />
          </Field>
          <Field label="PIN Code">
            <FInput value={form.pinCode} onChange={upd('pinCode')} placeholder="250001" />
          </Field>
        </div>

        {/* Location Picker */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            📍 GPS Location
            <span style={{ fontWeight: 400, marginLeft: 6, color: 'var(--text-muted)', fontSize: 10 }}>
              (Rider tracking aur map ke liye)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'flex-start' }}>
            <Field label="Latitude">
              <FInput
                type="number" step="any"
                value={form.latitude} onChange={upd('latitude')}
                placeholder="28.9845"
              />
            </Field>
            <Field label="Longitude">
              <FInput
                type="number" step="any"
                value={form.longitude} onChange={upd('longitude')}
                placeholder="77.7064"
              />
            </Field>
            <div style={{ paddingTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  if (!navigator.geolocation) return
                  navigator.geolocation.getCurrentPosition(
                    pos => setForm(p => ({
                      ...p,
                      latitude:  pos.coords.latitude.toFixed(6),
                      longitude: pos.coords.longitude.toFixed(6),
                    })),
                    () => alert('Location access nahi mili — manually enter karo')
                  )
                }}
                title="Current location use karo"
                style={{
                  padding: '9px 14px', borderRadius: 7, border: '1.5px solid var(--border)',
                  background: 'var(--bg-page)', cursor: 'pointer',
                  fontSize: 16, display: 'flex', alignItems: 'center', gap: 6,
                  color: 'var(--text)', whiteSpace: 'nowrap',
                }}
              >
                🎯 Meri Location
              </button>
            </div>
          </div>

          {/* Mini map preview */}
          {form.latitude && form.longitude && (
            <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <iframe
                title="location-preview"
                width="100%"
                height="180"
                style={{ display: 'block', border: 'none' }}
                src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&z=15&output=embed`}
                allowFullScreen
              />
              <div style={{
                padding: '6px 10px', background: 'var(--bg-page)',
                fontSize: 11, color: 'var(--text-muted)',
                borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between'
              }}>
                <span>📍 {Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}</span>
                <a
                  href={`https://maps.google.com/?q=${form.latitude},${form.longitude}`}
                  target="_blank" rel="noreferrer"
                  style={{ color: '#e53e3e', fontSize: 11, textDecoration: 'none', fontWeight: 600 }}
                >
                  Google Maps mein dekho →
                </a>
              </div>
            </div>
          )}

          {/* Helper tip */}
          {!form.latitude && (
            <div style={{
              marginTop: 6, padding: '8px 12px', borderRadius: 6,
              background: '#fef9c3', border: '1px solid #fde68a',
              fontSize: 11, color: '#92400e',
            }}>
              💡 <strong>Tip:</strong> "Meri Location" dabao ya Google Maps mein restaurant search karo → Share → Coordinates copy karo
            </div>
          )}
        </div>

        <Section>Plan & Legal</Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Plan Type">
            <FSelect value={form.planType} onChange={upd('planType')}>
              {PLAN_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            </FSelect>
          </Field>
          <Field label="GSTIN">
            <FInput value={form.gstNumber || ''} onChange={upd('gstNumber')} placeholder="22AAAAA0000A1Z5" />
          </Field>
          <Field label="FSSAI License No.">
            <FInput value={form.fssaiLicNo || ''} onChange={upd('fssaiLicNo')} placeholder="FSSAI number" />
          </Field>
        </div>

        <Section>UPI / Payment</Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="UPI ID">
            <FInput value={form.upiId || ''} onChange={upd('upiId')} placeholder="name@upi" />
          </Field>
          <Field label="UPI Display Name">
            <FInput value={form.upiName || ''} onChange={upd('upiName')} placeholder="Restaurant name on UPI" />
          </Field>
        </div>

        <Section>Loyalty Config</Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Points per ₹100">
            <FInput type="number" min={0} value={form.loyaltyPointsPer100} onChange={upd('loyaltyPointsPer100')} />
          </Field>
          <Field label="Expiry Days (0 = never)">
            <FInput type="number" min={0} value={form.loyaltyExpiryDays}   onChange={upd('loyaltyExpiryDays')} />
          </Field>
          <Field label="VIP Threshold (₹)">
            <FInput type="number" min={0} value={form.vipThreshold}         onChange={upd('vipThreshold')} />
          </Field>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 24px', borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'flex-end', gap: 10,
        background: 'var(--bg-page)', flexShrink: 0,
      }}>
        <button onClick={onClose} style={BTN_OUTLINE}>Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...BTN_PRIMARY, opacity: saving ? 0.6 : 1, minWidth: 160 }}
        >
          {saving ? '⏳ Saving...' : isEdit ? '✅ Update Restaurant' : '➕ Register Restaurant'}
        </button>
      </div>
    </Modal>
  )
}

// ── Stats + Subscription Modal ────────────────────────────────────
function StatsModal({ restaurant, onClose, onRefresh }) {
  const api               = adminApi
  const toast             = useToast()
  const [tab,     setTab]     = useState('stats')    // 'stats' | 'subscription' | 'addons'
  const [stats,   setStats]   = useState(null)
  const [sub,     setSub]     = useState(null)
  const [addons,  setAddons]  = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [grantingAddon, setGrantingAddon] = useState(null)

  // Subscription form
  const [selPlan, setSelPlan] = useState('GROWTH_MONTHLY')
  const [selDays, setSelDays] = useState(30)
  const [extDays, setExtDays] = useState(30)

  const PLAN_OPTIONS = [
    { value: 'TRIAL',              label: 'Trial (14 days free)' },
    { value: 'FREE',               label: 'Free (₹0 forever)' },
    { value: 'STARTER_MONTHLY',    label: 'Starter Monthly (₹799)' },
    { value: 'STARTER_YEARLY',     label: 'Starter Yearly (₹7,599)' },
    { value: 'GROWTH_MONTHLY',     label: 'Growth Monthly (₹1,999)' },
    { value: 'GROWTH_YEARLY',      label: 'Growth Yearly (₹17,999)' },
    { value: 'PRO_MONTHLY',        label: 'Pro Monthly (₹3,499)' },
    { value: 'PRO_YEARLY',         label: 'Pro Yearly (₹34,990) — 2 months FREE' },
    { value: 'ENTERPRISE_MONTHLY', label: 'Enterprise Monthly (₹4,999)' },
    { value: 'ENTERPRISE_YEARLY',  label: 'Enterprise Yearly (₹41,990)' },
  ]

  const planDefaultDays = {
    TRIAL: 14, FREE: 36500,
    STARTER_MONTHLY: 30, STARTER_YEARLY: 365,
    GROWTH_MONTHLY: 30, GROWTH_YEARLY: 365,
    PRO_MONTHLY: 30, PRO_YEARLY: 365,
    ENTERPRISE_MONTHLY: 30, ENTERPRISE_YEARLY: 365,
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getRestaurantStats(restaurant.id).catch(() => ({
        totalBills: 0, totalRevenue: 0, totalCustomers: 0,
        avgOrderValue: 0, activeStaff: 0, totalProducts: 0,
        todayBills: 0, todayRevenue: 0,
      })),
      api.getSubscription(restaurant.id).catch(() => null),
      api.getFeatureAddons(restaurant.id).catch(() => []),
    ]).then(([s, sub, ads]) => {
      setStats(s)
      setSub(sub)
      setAddons(Array.isArray(ads) ? ads : [])
    }).finally(() => setLoading(false))
  }, [restaurant.id])

  async function handleActivate() {
    if (!confirm(`${restaurant.name} ko ${selPlan} (${selDays} days) activate karo?`)) return
    setSaving(true)
    try {
      const res = await api.activateSub(restaurant.id, selPlan, selDays)
      toast.success(`✅ ${res.message}`)
      const newSub = await api.getSubscription(restaurant.id)
      setSub(newSub)
      onRefresh?.()
    } catch { toast.error('Activate nahi hua') }
    finally { setSaving(false) }
  }

  async function handleExtend() {
    if (!confirm(`${restaurant.name} ka subscription ${extDays} days extend karo?`)) return
    setSaving(true)
    try {
      const res = await api.extendSub(restaurant.id, extDays)
      toast.success(`✅ ${res.message} — New end: ${res.newEndDate}`)
      const newSub = await api.getSubscription(restaurant.id)
      setSub(newSub)
    } catch { toast.error('Extend nahi hua') }
    finally { setSaving(false) }
  }

  async function handleDeactivate() {
    if (!confirm(`${restaurant.name} ka subscription DEACTIVATE karo? Restaurant bhi band ho jayega.`)) return
    setSaving(true)
    try {
      await api.deactivateSub(restaurant.id)
      toast.success('Subscription deactivated')
      const newSub = await api.getSubscription(restaurant.id)
      setSub(newSub)
      onRefresh?.()
    } catch { toast.error('Deactivate nahi hua') }
    finally { setSaving(false) }
  }

  async function handleGrantAddon(addonId) {
    if (!confirm(`Grant "${addonId}" to ${restaurant.name} for 365 days (free)?`)) return
    setGrantingAddon(addonId)
    try {
      const res = await api.grantAddon(restaurant.id, addonId, 365)
      toast.success(`✅ ${res.addonName} granted till ${res.endDate}`)
      const ads = await api.getFeatureAddons(restaurant.id).catch(() => [])
      setAddons(Array.isArray(ads) ? ads : [])
    } catch (e) { toast.error(e.message || 'Grant failed') }
    finally { setGrantingAddon(null) }
  }

  const plan    = PLAN_CFG[restaurant.planType] || { color: '#888', bg: '#f3f4f6' }
  const subStatus = sub?.status || 'NONE'
  const statusColor = { ACTIVE: '#16a34a', EXPIRING_SOON: '#f59e0b', EXPIRED: '#ef4444', NONE: '#888' }

  return (
    <Modal onClose={onClose} width={620}>
      {/* Header */}
      <div style={{
        padding: '18px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{restaurant.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {restaurant.restaurantId} · {restaurant.city || '—'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Status badge */}
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: sub?.active ? '#dcfce7' : '#fee2e2',
            color: sub?.active ? '#16a34a' : '#ef4444',
          }}>
            {sub?.active ? `● ${sub.daysLeft}d left` : '● Inactive'}
          </span>
          <button onClick={onClose} style={{
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: 'var(--text-muted)',
          }}>×</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
        {[['stats', '📊 Stats'], ['subscription', '💳 Subscription'], ['addons', '🛍️ Add-ons']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: tab === key ? 'var(--bg-card)' : 'transparent',
            color: tab === key ? '#e53e3e' : 'var(--text-muted)',
            borderBottom: tab === key ? '2px solid #e53e3e' : '2px solid transparent',
          }}>{label}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>Loading...
          </div>
        ) : tab === 'stats' ? (
          // ── STATS TAB ──────────────────────────────────────────
          stats && <>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#e53e3e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Aaj</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[
                { label: "Today's Bills",   value: stats.todayBills, icon: '🧾', color: '#6366f1', bg: '#ede9fe' },
                { label: "Today's Revenue", value: `₹${(stats.todayRevenue || 0).toLocaleString('en-IN')}`, icon: '💰', color: '#10b981', bg: '#d1fae5' },
              ].map(({ label, value, icon, color, bg }) => (
                <div key={label} style={{ padding: '14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#e53e3e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>All Time</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { label: 'Total Bills',   value: stats.totalBills,    icon: '🧾' },
                { label: 'Revenue',       value: `₹${((stats.totalRevenue || 0)/1000).toFixed(1)}K`, icon: '💰' },
                { label: 'Customers',     value: stats.totalCustomers, icon: '👥' },
                { label: 'Avg Order',     value: `₹${stats.avgOrderValue || 0}`, icon: '📊' },
                { label: 'Active Staff',  value: stats.activeStaff,   icon: '👤' },
                { label: 'Menu Items',    value: stats.totalProducts,  icon: '🍽️' },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ padding: '12px 10px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--border)', background: 'var(--bg-page)' }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </>
        ) : tab === 'subscription' ? (
          // ── SUBSCRIPTION TAB ───────────────────────────────────
          <div>
            {/* Current status */}
            <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-page)', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Current Subscription</div>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusColor[subStatus] + '20', color: statusColor[subStatus] }}>
                  {subStatus}
                </span>
              </div>
              {sub?.active ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['Plan',       sub.planId],
                    ['Billing',    sub.billingCycle],
                    ['Start',      sub.startDate],
                    ['End',        sub.endDate],
                    ['Days Left',  `${Math.max(0, sub.daysLeft)} days`],
                    ['Price Paid', sub.pricePaid ? `₹${sub.pricePaid}` : 'Free'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 80 }}>{k}:</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Koi active subscription nahi hai. Niche se activate karo.
                </div>
              )}
            </div>

            {/* Activate new plan */}
            <div style={{ padding: '14px 16px', borderRadius: 10, border: '1.5px solid #bbf7d0', background: '#f0fdf4', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 12 }}>
                ✅ Naya Plan Activate Karo
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <Field label="Plan">
                  <FSelect value={selPlan} onChange={e => { setSelPlan(e.target.value); setSelDays(planDefaultDays[e.target.value] || 30) }}>
                    {PLAN_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </FSelect>
                </Field>
                <Field label="Days">
                  <FInput type="number" min={1} max={730} value={selDays} onChange={e => setSelDays(Number(e.target.value))} />
                </Field>
              </div>
              <button
                onClick={handleActivate}
                disabled={saving}
                style={{ ...BTN_PRIMARY, opacity: saving ? 0.6 : 1, width: '100%' }}
              >
                {saving ? '⏳ Activating...' : `✅ Activate ${selPlan} (${selDays} days)`}
              </button>
            </div>

            {/* Extend existing */}
            {sub?.active && (
              <div style={{ padding: '14px 16px', borderRadius: 10, border: '1.5px solid #bfdbfe', background: '#eff6ff', marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', marginBottom: 12 }}>
                  ➕ Existing Subscription Extend Karo
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <Field label="Extra Days" style={{ flex: 1, marginBottom: 0 }}>
                    <FInput type="number" min={1} max={365} value={extDays} onChange={e => setExtDays(Number(e.target.value))} />
                  </Field>
                  <button
                    onClick={handleExtend}
                    disabled={saving}
                    style={{ ...BTN_PRIMARY, background: '#3b82f6', opacity: saving ? 0.6 : 1, marginBottom: 14 }}
                  >
                    {saving ? '⏳...' : `+${extDays} days`}
                  </button>
                </div>
              </div>
            )}

            {/* Deactivate */}
            {sub?.active && (
              <div style={{ padding: '14px 16px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fff5f5' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>
                  ⚠️ Subscription Deactivate Karo
                </div>
                <div style={{ fontSize: 11, color: '#9a3412', marginBottom: 10 }}>
                  Yeh restaurant ko bhi inactive kar dega. Proceed carefully.
                </div>
                <button
                  onClick={handleDeactivate}
                  disabled={saving}
                  style={{ ...BTN_PRIMARY, background: '#ef4444', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? '⏳...' : '🚫 Deactivate Subscription'}
                </button>
              </div>
            )}

            {/* Restaurant ID helper */}
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-page)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
              🔑 Restaurant ID: <strong style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{restaurant.id}</strong>
              &nbsp;·&nbsp; Order page: <a href={`https://www.harmonybits.in/order/${restaurant.id}`} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>harmonybits.in/order/{restaurant.id}</a>
            </div>

            {/* History */}
            {sub?.history?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#e53e3e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  History
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  {sub.history.slice(0, 5).map((h, i) => (
                    <div key={i} style={{
                      padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                      borderBottom: i < sub.history.length - 1 ? '1px solid var(--border)' : 'none',
                      background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-card)',
                      fontSize: 11,
                    }}>
                      <span style={{ fontWeight: 600 }}>{h.planId}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{h.startDate} → {h.endDate}</span>
                      <span style={{ color: h.active ? '#16a34a' : '#ef4444', fontWeight: 700 }}>
                        {h.active ? 'Active' : 'Ended'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : tab === 'addons' ? (
          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Feature Add-ons</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Grant add-ons directly to this restaurant (no payment required)</div>
            </div>
            {addons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {addons.map(a => (
                  <div key={a.addonId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${a.isActive ? '#10b981' : 'var(--border)'}`, borderRadius: 10, background: a.isActive ? '#f0fdf4' : 'var(--bg-page)' }}>
                    <span style={{ fontSize: 22 }}>{a.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {a.isActive ? `✅ Active till ${a.endDate}` : `₹${a.priceYearly}/yr`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleGrantAddon(a.addonId)}
                      disabled={grantingAddon === a.addonId}
                      style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: a.isActive ? '#e5e7eb' : '#6366f1', color: a.isActive ? '#6b7280' : '#fff', fontWeight: 700, fontSize: 12, cursor: grantingAddon === a.addonId ? 'not-allowed' : 'pointer' }}
                    >
                      {grantingAddon === a.addonId ? '⏳' : a.isActive ? '🔄 Renew' : '🎁 Grant'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <ModalFooter>
        <button onClick={onClose} style={BTN_OUTLINE}>Close</button>
      </ModalFooter>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function RestaurantManagement() {
  const toast = useToast()
  const api = adminApi

  const [dashboard,    setDashboard]    = useState(null)
  const [restaurants,  setRestaurants]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [planFilter,   setPlanFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editItem,     setEditItem]     = useState(null)
  const [statsItem,    setStatsItem]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dash, rest] = await Promise.all([
        api.getDashboard().catch(()  => MOCK_DASHBOARD),
        api.getRestaurants().catch(() => MOCK_RESTAURANTS),
      ])
      setDashboard(dash || MOCK_DASHBOARD)
      setRestaurants(Array.isArray(rest) ? rest : (rest?.content || MOCK_RESTAURANTS))
    } catch {
      setDashboard(MOCK_DASHBOARD)
      setRestaurants(MOCK_RESTAURANTS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [])

  // Filtering
  const filtered = restaurants.filter(r => {
    const q  = search.toLowerCase()
    const ms = !search
      || r.name?.toLowerCase().includes(q)
      || r.ownerName?.toLowerCase().includes(q)
      || r.phone?.includes(search)
      || r.email?.toLowerCase().includes(q)
    const mp  = !planFilter   || r.planType === planFilter
    const mst = !statusFilter || (statusFilter === 'active' ? r.isActive : !r.isActive)
    return ms && mp && mst
  })

  async function toggleActive(r, e) {
    e.stopPropagation()
    try {
      await api.toggleActive(r.id, !r.isActive)
      setRestaurants(prev => prev.map(x => x.id === r.id ? { ...x, isActive: !r.isActive } : x))
      toast.success(`${r.name} ${!r.isActive ? 'activate' : 'deactivate'} ho gaya`)
    } catch {
      toast.error('Status update nahi hua')
    }
  }

  const openCreate = () => { setEditItem(null);  setShowModal(true) }
  const openEdit   = r  => { setEditItem(r);     setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditItem(null)  }
  const clearFilter = () => { setSearch(''); setPlanFilter(''); setStatusFilter('') }

  const hasFilter = search || planFilter || statusFilter

  return (
    <div style={{ color: 'var(--text)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Restaurant Management</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Naye restaurants register karo · reports dekho · subscriptions manage karo
          </p>
        </div>
        <button
          onClick={() => window.open('https://harmonybits.in/register', '_blank')}
          style={{ ...BTN_PRIMARY, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 12px rgba(229,62,62,.25)' }}
        >
          ＋ Register Restaurant
        </button>
      </div>

      {/* ── Dashboard stats ── */}
      {dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Restaurants', value: dashboard.totalRestaurants,    icon: '🏪', color: '#6366f1', bg: '#ede9fe' },
            { label: 'Active Subs',        value: dashboard.activeSubscriptions,  icon: '✅', color: '#10b981', bg: '#d1fae5' },
            { label: 'Expired Subs',       value: dashboard.expiredSubscriptions, icon: '⚠️', color: '#f59e0b', bg: '#fef3c7' },
            { label: 'Total Revenue',      value: `₹${((dashboard.totalRevenue || 0) / 1000).toFixed(1)}K`, icon: '💰', color: '#e53e3e', bg: '#fee2e2' },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Search</div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13 }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, owner, phone..."
                style={{ ...INP, paddingLeft: 34 }}
              />
            </div>
          </div>
          <div style={{ minWidth: 130 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Plan</div>
            <FSelect value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
              <option value="">All Plans</option>
              {PLAN_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            </FSelect>
          </div>
          <div style={{ minWidth: 120 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Status</div>
            <FSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </FSelect>
          </div>
          {hasFilter && (
            <button onClick={clearFilter} style={{ ...BTN_OUTLINE, alignSelf: 'flex-end' }}>Clear ×</button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Restaurant', 'Owner', 'Contact', 'City', 'Plan', 'Status', 'Actions'].map(col => (
                <th key={col} style={TH}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} style={TD}>
                      <div style={{ height: 13, background: 'var(--border)', borderRadius: 4, width: '70%', animation: 'pulse 1.4s ease-in-out infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '52px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🏪</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Koi restaurant nahi mila</div>
                  <div style={{ fontSize: 12 }}>Filter change karo ya naya restaurant add karo</div>
                  {hasFilter && (
                    <button onClick={clearFilter} style={{ marginTop: 12, ...BTN_OUTLINE, fontSize: 12 }}>
                      Filters hataao
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => {
                const plan = PLAN_CFG[r.planType] || { color: '#888', bg: '#f3f4f6' }
                return (
                  <tr
                    key={r.id}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ transition: 'background .1s' }}
                  >
                    <td style={{ ...TD, color: 'var(--text-muted)', fontSize: 12, width: 36 }}>{i + 1}</td>

                    <td style={TD}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>ID: {r.restaurantId}</div>
                    </td>

                    <td style={{ ...TD, fontSize: 13 }}>{r.ownerName}</td>

                    <td style={TD}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{r.phone}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.email}</div>
                    </td>

                    <td style={{ ...TD, fontSize: 12, color: 'var(--text-muted)' }}>{r.city || '—'}</td>

                    <td style={TD}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: plan.bg, color: plan.color }}>
                        {r.planType}
                      </span>
                    </td>

                    <td style={TD}>
                      <button
                        onClick={e => toggleActive(r, e)}
                        title={r.isActive ? 'Deactivate karo' : 'Activate karo'}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                          background: r.isActive ? '#dcfce7' : '#fee2e2',
                          color: r.isActive ? '#16a34a' : '#ef4444',
                          fontSize: 11, fontWeight: 700, transition: 'opacity .15s',
                        }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.isActive ? '#16a34a' : '#ef4444' }} />
                        {r.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td style={TD}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => setStatsItem(r)}
                          title="Stats dekho"
                          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 13 }}
                        >📊</button>
                        <button
                          onClick={() => openEdit(r)}
                          title="Edit karo"
                          style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 13 }}
                        >✏️</button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Table footer */}
        <div style={{
          padding: '9px 16px', borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-muted)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-page)',
        }}>
          <span>{filtered.length} of {restaurants.length} restaurants dikh rahe hain</span>
          {hasFilter && (
            <button onClick={clearFilter} style={{ background: 'none', border: 'none', color: '#e53e3e', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
              Filters hataao ×
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>

      {showModal && (
        <RestaurantModal
          initial={editItem}
          onClose={closeModal}
          onSave={() => { closeModal(); load() }}
        />
      )}
      {statsItem && (
        <StatsModal
          restaurant={statsItem}
          onClose={() => setStatsItem(null)}
          onRefresh={load}
        />
      )}
    </div>
  )
}
