// src/pages/Settings.jsx
import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonLine } from '../components/Skeleton'

const TABS = ['🏪 Business Profile', '🔑 Login Credentials', '📜 Legal', '⭐ Loyalty & VIP', '🕐 Business Hours', '🔗 ONDC']

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const DAY_SHORT = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' }

// hh:mm (24h) → "9:00 AM"
function to12h(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

const OPEN_PRESETS  = ['05:00','06:00','07:00','08:00','09:00','10:00','11:00']
const CLOSE_PRESETS = ['18:00','19:00','20:00','21:00','22:00','23:00','23:59']

function TimePicker({ label, value, onChange, presets }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      {/* Preset chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {presets.map(t => (
          <button key={t} type="button" onClick={() => onChange(t)}
            style={{ padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: '1.5px solid',
              borderColor: value === t ? 'var(--accent)' : 'var(--border)',
              background: value === t ? 'var(--accent)' : 'transparent',
              color: value === t ? '#fff' : 'var(--text-muted)',
              transition: 'all .15s' }}>
            {to12h(t)}
          </button>
        ))}
      </div>
      {/* Native time input for custom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="time" value={value ?? ''} onChange={e => onChange(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, minWidth: 130 }} />
        {value && (
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
            {to12h(value)}
          </span>
        )}
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder = '', disabled = false, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 500 }}>
        {label}
      </label>
      <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} disabled={disabled}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8,
          border: '1px solid var(--border)',
          background: disabled ? 'var(--border)' : 'var(--bg-page)',
          color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
          opacity: disabled ? 0.6 : 1 }} />
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>
      )}
    </div>
  )
}

function Section({ title, children, onSave, saving, dirty }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.25rem', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        {onSave && (
          <button onClick={onSave} disabled={saving || !dirty} style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: dirty ? 'var(--accent)' : 'var(--border)', color: '#fff',
            border: 'none', cursor: dirty && !saving ? 'pointer' : 'not-allowed',
          }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { restaurantId, user } = useAuthStore()
  const toast = useToast()
  const [tab,     setTab]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  // ── Business Profile ──
  const [profile, setProfile] = useState({
    name: '', ownerName: '', phone: '', email: '',
    address: '', city: '', state: '', pinCode: '',
    upiId: '', upiName: '',
  })
  const [profileDirty, setProfileDirty] = useState(false)

  // ── Login Credentials ──
  const [creds, setCreds] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  // ── Legal ──
  const [legal, setLegal] = useState({
    gstNumber:         '',
    fssaiLicNo:        '',
    panNumber:         '',
    registrationNumber:'',
    taxRate:           '',
    serviceCharge:     '',
  })
  const [legalDirty, setLegalDirty] = useState(false)

  // ── Business Hours ──
  const [hours, setHours] = useState({
    openTime:   '09:00',
    closeTime:  '22:00',
    closedDays: [],
  })
  const [hoursDirty, setHoursDirty] = useState(false)

  // ── Loyalty & VIP — only fields that exist in backend ──
  const [loyalty, setLoyalty] = useState({
    loyaltyPointsPer100: 5,
    loyaltyExpiryDays:   365,
    vipThreshold:        10000,  // FIX: was missing, exists in backend
  })
  const [loyaltyDirty, setLoyaltyDirty] = useState(false)

  // ── Device Sync Code ──
  const [syncCode, setSyncCode] = useState('')
  const [syncCodeEdit, setSyncCodeEdit] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [savingCode, setSavingCode] = useState(false)

  // ── White-Label Store ──
  const [restaurantCode, setRestaurantCode] = useState('')
  const [storeLinkCopied, setStoreLinkCopied] = useState(false)

  // ── ONDC ──
  const [ondc, setOndc] = useState({ subscriberId: '', bppId: '', bppUri: '', uniqueKeyId: '', enabled: false })
  const [ondcDirty, setOndcDirty] = useState(false)
  const [ondcSaving, setOndcSaving] = useState(false)

  useEffect(() => { loadRestaurant(); loadOndcConfig() }, [])

  async function loadRestaurant() {
    setLoading(true)
    try {
      const r = await api.get(`/restaurants/${restaurantId}`)
      if (r) {
        setProfile({
          name:      r.name      || '',
          ownerName: r.ownerName || '',
          phone:     r.phone     || '',
          email:     r.email     || '',
          address:   r.address   || '',
          city:      r.city      || '',
          state:     r.state     || '',
          pinCode:   r.pinCode   || '',   // FIX: was missing from form
          upiId:     r.upiId     || '',
          upiName:   r.upiName   || '',
        })
        setLegal({
          gstNumber:          r.gstNumber          || '',
          fssaiLicNo:         r.fssaiLicNo         || '',
          panNumber:          r.panNumber          || '',
          registrationNumber: r.registrationNumber || '',
          taxRate:            r.taxRate            ?? '',
          serviceCharge:      r.serviceCharge      ?? '',
        })
        setHours({
          openTime:   r.openTime   || '09:00',
          closeTime:  r.closeTime  || '22:00',
          closedDays: r.closedDays ? (typeof r.closedDays === 'string' ? r.closedDays.split(',').filter(Boolean) : r.closedDays) : [],
        })
        setLoyalty({
          loyaltyPointsPer100: r.loyaltyPointsPer100 ?? 5,
          loyaltyExpiryDays:   r.loyaltyExpiryDays   ?? 365,
          vipThreshold:        r.vipThreshold         ?? 10000,
        })
        if (r.restaurantId) { setSyncCode(r.restaurantId); setSyncCodeEdit(r.restaurantId) }
        if (r.restaurantCode) setRestaurantCode(r.restaurantCode)
      }
    } catch (_) { /* use defaults */ }
    finally { setLoading(false) }
  }

  async function loadOndcConfig() {
    try {
      const r = await api.get('/ondc/admin/config')
      if (r) setOndc({ subscriberId: r.subscriberId || '', bppId: r.bppId || '', bppUri: r.bppUri || '', uniqueKeyId: r.uniqueKeyId || '', enabled: r.enabled || false })
    } catch (_) { /* use defaults */ }
  }

  async function saveOndcConfig() {
    setOndcSaving(true)
    try {
      await api.post('/ondc/admin/config', ondc)
      toast.success('ONDC config saved!')
      setOndcDirty(false)
    } catch (_) { toast.error('ONDC save failed') }
    finally { setOndcSaving(false) }
  }

  async function saveSection(data, setDirty) {
    setSaving(true)
    try {
      await api.put(`/restaurants/${restaurantId}`, data)
      toast.success('Settings saved!')
      setDirty(false)
    } catch (_) { toast.error('Save failed — check server connection') }
    finally { setSaving(false) }
  }

  async function changePassword() {
    if (!creds.currentPassword)  { toast.error('Current password dalo'); return }
    if (!creds.newPassword)      { toast.error('New password dalo'); return }
    if (creds.newPassword !== creds.confirmPassword) { toast.error('Passwords match nahi kar rahe'); return }
    if (creds.newPassword.length < 8) { toast.error('Password minimum 8 characters hona chahiye'); return }
    setSaving(true)
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: creds.currentPassword,
        newPassword:     creds.newPassword,
      })
      if (res?.success === false) {
        toast.error(res.message || 'Password change failed')
      } else {
        toast.success('Password changed! Dobara login karo.')
        setCreds({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (e) {
      toast.error(e.message?.includes('401') ? 'Current password galat hai' : 'Password change failed')
    } finally { setSaving(false) }
  }

  const upd = (setter, setDirty) => (field) => (e) => {
    setter(s => ({ ...s, [field]: e.target.value }))
    setDirty(true)
  }

  function copySyncCode() {
    if (!syncCode) return
    navigator.clipboard.writeText(syncCode).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  function generateSyncCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setSyncCodeEdit(code)
  }

  async function saveSyncCode() {
    const code = syncCodeEdit.trim().toUpperCase()
    if (!code || code.length < 4) { toast.error('Code minimum 4 characters hona chahiye'); return }
    if (code.length > 10)         { toast.error('Code maximum 10 characters (e.g. HMB001)'); return }
    setSavingCode(true)
    try {
      await api.put(`/restaurants/${restaurantId}`, { restaurantId: code })
      setSyncCode(code)
      toast.success('Sync code updated! Purane devices dobara link karne honge.')
    } catch (_) { toast.error('Code save failed') }
    finally { setSavingCode(false) }
  }

  const passwordsMatch  = creds.newPassword && creds.newPassword === creds.confirmPassword
  const passwordTooShort = creds.newPassword && creds.newPassword.length < 8

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>⚙️ Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Restaurant profile, credentials, legal info, loyalty config
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: '1px solid var(--border)',
            background: tab === i ? 'var(--accent)' : 'transparent',
            color: tab === i ? '#fff' : 'var(--text-muted)',
          }}>{t}</button>
        ))}
      </div>

      {/* ── Your Online Store Card ── */}
      {restaurantCode && (
        <div style={{ background: 'linear-gradient(135deg, #fff7ed, #fff)',
          border: '1.5px solid #fed7aa', borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>🌐</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#111' }}>Your Online Store</div>
              <div style={{ fontSize: 12, color: '#888' }}>Share this URL with your customers</div>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '10px 14px', fontSize: 13, fontFamily: 'monospace', color: '#f97316',
            wordBreak: 'break-all', marginBottom: 12 }}>
            https://zippli.in/store/{restaurantCode}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => {
              navigator.clipboard.writeText(`https://zippli.in/store/${restaurantCode}`)
              setStoreLinkCopied(true)
              setTimeout(() => setStoreLinkCopied(false), 2000)
            }} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              border: '1.5px solid #f97316', background: storeLinkCopied ? '#f97316' : '#fff',
              color: storeLinkCopied ? '#fff' : '#f97316', cursor: 'pointer', transition: 'all .2s' }}>
              {storeLinkCopied ? '✓ Copied!' : 'Copy Link'}
            </button>
            <a href={`https://zippli.in/store/${restaurantCode}`} target="_blank" rel="noreferrer"
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: '1.5px solid #e5e7eb', background: '#fff', color: '#555',
                cursor: 'pointer', textDecoration: 'none' }}>
              Open ↗
            </a>
          </div>
        </div>
      )}

      {/* ── Tab 0: Business Profile ── */}
      {tab === 0 && (
        <Section title="🏪 Business Profile" dirty={profileDirty} saving={saving}
          onSave={() => saveSection(profile, setProfileDirty)}>
          {loading
            ? [...Array(5)].map((_, i) => <SkeletonLine key={i} height={38} style={{ marginBottom: 14 }} />)
            : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Input label="Restaurant Name *" value={profile.name}
                    onChange={upd(setProfile, setProfileDirty)('name')} />
                  <Input label="Owner Name" value={profile.ownerName}
                    onChange={upd(setProfile, setProfileDirty)('ownerName')} />
                  <Input label="Phone" value={profile.phone} type="tel"
                    onChange={upd(setProfile, setProfileDirty)('phone')} />
                  <Input label="Email" value={profile.email} type="email"
                    onChange={upd(setProfile, setProfileDirty)('email')} />
                </div>
                <Input label="Full Address" value={profile.address}
                  onChange={upd(setProfile, setProfileDirty)('address')} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
                  <Input label="City" value={profile.city}
                    onChange={upd(setProfile, setProfileDirty)('city')} />
                  <Input label="State" value={profile.state}
                    onChange={upd(setProfile, setProfileDirty)('state')} />
                  <Input label="PIN Code" value={profile.pinCode}
                    onChange={upd(setProfile, setProfileDirty)('pinCode')} placeholder="110001" />
                </div>
                <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
                    💳 UPI Details (for QR payment on bills)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                    <Input label="UPI ID" value={profile.upiId}
                      onChange={upd(setProfile, setProfileDirty)('upiId')}
                      placeholder="restaurant@upi" />
                    <Input label="UPI Display Name" value={profile.upiName}
                      onChange={upd(setProfile, setProfileDirty)('upiName')}
                      placeholder="Restaurant Name" />
                  </div>
                </div>

                {/* Device Sync Code */}
                <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                    📱 Device Sync Code
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Staff ke Android device ko link karne ka code — 4–10 chars, uppercase (e.g. HMB001). Change karne ke baad purane devices dobara link karne honge.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      value={syncCodeEdit}
                      onChange={e => setSyncCodeEdit(e.target.value.toUpperCase())}
                      maxLength={10}
                      placeholder="HMB001"
                      style={{
                        fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
                        letterSpacing: 2, padding: '10px 14px', width: 160,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--accent)', outline: 'none',
                        textTransform: 'uppercase',
                      }}
                    />
                    <button onClick={generateSyncCode} style={{
                      padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                    }}>
                      🎲 Generate
                    </button>
                    <button onClick={saveSyncCode} disabled={savingCode} style={{
                      padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', border: 'none',
                      background: 'var(--accent)', color: '#fff',
                    }}>
                      {savingCode ? '...' : '💾 Save'}
                    </button>
                    {syncCode && (
                      <button onClick={copySyncCode} style={{
                        padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', border: '1px solid var(--border)',
                        background: codeCopied ? '#22c55e' : 'var(--bg-secondary)',
                        color: codeCopied ? '#fff' : 'var(--text-muted)',
                      }}>
                        {codeCopied ? '✅ Copied!' : '📋 Copy'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
        </Section>
      )}

      {/* ── Tab 1: Login Credentials ── */}
      {tab === 1 && (
        <Section title="🔑 Login Credentials">
          <div style={{ maxWidth: 400 }}>
            <Input label="Current Password" value={creds.currentPassword} type="password"
              placeholder="••••••••"
              onChange={e => setCreds(c => ({ ...c, currentPassword: e.target.value }))} />
            <Input label="New Password" value={creds.newPassword} type="password"
              placeholder="Min 8 characters"
              onChange={e => setCreds(c => ({ ...c, newPassword: e.target.value }))} />
            <Input label="Confirm New Password" value={creds.confirmPassword} type="password"
              placeholder="Dobara enter karo"
              onChange={e => setCreds(c => ({ ...c, confirmPassword: e.target.value }))} />

            {/* Inline validation */}
            {passwordTooShort && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>
                ❌ Password kam se kam 8 characters ka hona chahiye
              </div>
            )}
            {!passwordTooShort && creds.newPassword && creds.confirmPassword && !passwordsMatch && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>
                ❌ Passwords match nahi kar rahe
              </div>
            )}
            {!passwordTooShort && passwordsMatch && (
              <div style={{ fontSize: 12, color: '#10b981', marginBottom: 10 }}>
                ✅ Password match kar raha hai
              </div>
            )}

            <button onClick={changePassword} disabled={saving} style={{
              width: '100%', padding: '10px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Changing…' : '🔑 Change Password'}
            </button>

            <div style={{ marginTop: 14, padding: '12px', borderRadius: 8,
              background: '#fef3c715', border: '1px solid #f59e0b30',
              fontSize: 12, color: 'var(--text-muted)' }}>
              ⚠️ Password change ke baad dobara login karna padega
            </div>
          </div>
        </Section>
      )}

      {/* ── Tab 2: Legal ── */}
      {tab === 2 && (
        <Section title="📜 Legal & Compliance" dirty={legalDirty} saving={saving}
          onSave={() => saveSection(legal, setLegalDirty)}>
          {loading
            ? [...Array(4)].map((_, i) => <SkeletonLine key={i} height={38} style={{ marginBottom: 14 }} />)
            : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Input label="GST Number" value={legal.gstNumber}
                    onChange={upd(setLegal, setLegalDirty)('gstNumber')}
                    placeholder="29ABCDE1234F1Z5"
                    hint="Bills pe print hoga" />
                  <Input label="FSSAI License No." value={legal.fssaiLicNo}
                    onChange={upd(setLegal, setLegalDirty)('fssaiLicNo')}
                    placeholder="10020042001234" />
                  <Input label="PAN Number" value={legal.panNumber}
                    onChange={upd(setLegal, setLegalDirty)('panNumber')}
                    placeholder="ABCDE1234F" />
                  <Input label="Registration Number" value={legal.registrationNumber}
                    onChange={upd(setLegal, setLegalDirty)('registrationNumber')}
                    placeholder="CIN / Shop Act number" />
                </div>
                <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
                    💰 Default Tax & Charges
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                    <Input label="Default Tax Rate (%)" value={legal.taxRate} type="number"
                      onChange={upd(setLegal, setLegalDirty)('taxRate')}
                      placeholder="5"
                      hint="e.g. 5 for 5% GST" />
                    <Input label="Service Charge (%)" value={legal.serviceCharge} type="number"
                      onChange={upd(setLegal, setLegalDirty)('serviceCharge')}
                      placeholder="10"
                      hint="e.g. 10 for 10%" />
                  </div>
                </div>
              </>
            )}
        </Section>
      )}

      {/* ── Tab 3: Loyalty & VIP ── */}
      {tab === 3 && (
        <Section title="⭐ Loyalty & VIP Settings" dirty={loyaltyDirty} saving={saving}
          onSave={() => saveSection(loyalty, setLoyaltyDirty)}>
          {loading
            ? [...Array(3)].map((_, i) => <SkeletonLine key={i} height={38} style={{ marginBottom: 14 }} />)
            : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
                  <Input label="Points per ₹100 spend" value={loyalty.loyaltyPointsPer100}
                    type="number"
                    onChange={e => { setLoyalty(l => ({ ...l, loyaltyPointsPer100: e.target.value })); setLoyaltyDirty(true) }}
                    hint="e.g. 5 = ₹100 pe 5 points" />
                  <Input label="Points Expiry (days)" value={loyalty.loyaltyExpiryDays}
                    type="number"
                    onChange={e => { setLoyalty(l => ({ ...l, loyaltyExpiryDays: e.target.value })); setLoyaltyDirty(true) }}
                    hint="0 = kabhi expire nahi" />
                  <Input label="VIP Threshold (₹)" value={loyalty.vipThreshold}
                    type="number"
                    onChange={e => { setLoyalty(l => ({ ...l, vipThreshold: e.target.value })); setLoyaltyDirty(true) }}
                    hint="Itna spend karne pe VIP" />
                </div>

                {/* Live preview */}
                <div style={{ padding: '14px 16px', borderRadius: 10, marginTop: 8,
                  background: 'var(--bg-page)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)' }}>
                    Preview
                  </div>
                  <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      ₹100 kharch karne pe →{' '}
                      <strong style={{ color: '#f59e0b' }}>{loyalty.loyaltyPointsPer100 || 0} points</strong>
                    </div>
                    <div>
                      1000 points = →{' '}
                      <strong style={{ color: '#10b981' }}>₹1,000 discount</strong>
                    </div>
                    <div>
                      Points expire hote hain →{' '}
                      <strong>{loyalty.loyaltyExpiryDays > 0 ? `${loyalty.loyaltyExpiryDays} din baad` : 'Kabhi nahi'}</strong>
                    </div>
                    <div>
                      VIP customer banta hai →{' '}
                      <strong style={{ color: '#6366f1' }}>₹{Number(loyalty.vipThreshold || 0).toLocaleString('en-IN')} spend karne pe</strong>
                    </div>
                  </div>
                </div>
              </>
            )}
        </Section>
      )}

      {/* ── Tab 4: Business Hours ── */}
      {tab === 4 && (
        <Section title="🕐 Business Hours" dirty={hoursDirty} saving={saving}
          onSave={() => saveSection(hours, setHoursDirty)}>
          {loading
            ? [...Array(2)].map((_, i) => <SkeletonLine key={i} height={38} style={{ marginBottom: 14 }} />)
            : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                  <TimePicker
                    label="🌅 Opening Time"
                    value={hours.openTime}
                    presets={OPEN_PRESETS}
                    onChange={v => { setHours(h => ({ ...h, openTime: v })); setHoursDirty(true) }}
                  />
                  <TimePicker
                    label="🌙 Closing Time"
                    value={hours.closeTime}
                    presets={CLOSE_PRESETS}
                    onChange={v => { setHours(h => ({ ...h, closeTime: v })); setHoursDirty(true) }}
                  />
                </div>

                <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
                    🚫 Closed Days
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {DAYS.map(day => {
                      const active = hours.closedDays.includes(day)
                      return (
                        <button key={day} onClick={() => {
                          setHours(h => ({
                            ...h,
                            closedDays: active
                              ? h.closedDays.filter(d => d !== day)
                              : [...h.closedDays, day],
                          }))
                          setHoursDirty(true)
                        }} style={{
                          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', border: '1px solid var(--border)',
                          background: active ? '#ef4444' : 'transparent',
                          color: active ? '#fff' : 'var(--text-muted)',
                        }}>
                          {DAY_SHORT[day]}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    Red = band rehta hai us din
                  </div>
                </div>

                <div style={{ padding: '14px 16px', borderRadius: 10, marginTop: 12,
                  background: 'var(--bg-page)', border: '1px solid var(--border)', fontSize: 13 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Preview</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>
                      ⏰ Timing:{' '}
                      <strong>{hours.openTime || '--'} – {hours.closeTime || '--'}</strong>
                    </div>
                    <div>
                      🚫 Closed:{' '}
                      <strong>
                        {hours.closedDays.length === 0
                          ? 'Koi band din nahi'
                          : hours.closedDays.map(d => DAY_SHORT[d]).join(', ')}
                      </strong>
                    </div>
                  </div>
                </div>
              </>
            )}
        </Section>
      )}

      {/* ── Tab 5: ONDC ── */}
      {tab === 5 && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #fff)', border: '1.5px solid #bbf7d0',
            borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#111', marginBottom: 6 }}>
              🔗 ONDC — Open Network for Digital Commerce
            </div>
            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
              Government ka free digital commerce network. Customers Paytm, PhonePe, ONDC apps se aapke restaurant pe order kar sakte hain — bina commission ke.
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 20 }}>✓ Zero Commission</span>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 20 }}>✓ Government Backed</span>
              <span style={{ background: '#fef9c3', color: '#854d0e', fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 20 }}>⏳ Registration Required</span>
            </div>
          </div>

          <Section title="ONDC Network Config" dirty={ondcDirty} saving={ondcSaving} onSave={saveOndcConfig}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div style={{ position: 'relative', width: 44, height: 24, borderRadius: 12,
                  background: ondc.enabled ? '#16a34a' : '#d1d5db', transition: 'background .2s' }}
                  onClick={() => { setOndc(o => ({ ...o, enabled: !o.enabled })); setOndcDirty(true) }}>
                  <div style={{ position: 'absolute', top: 3, left: ondc.enabled ? 22 : 3, width: 18, height: 18,
                    borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>
                  {ondc.enabled ? 'ONDC Enabled ✓' : 'ONDC Disabled'}
                </span>
              </label>
            </div>
            <Input label="Subscriber ID" value={ondc.subscriberId} placeholder="e.g. yourrestaurant.harmonybits.in"
              hint="ONDC se registration ke baad milega"
              onChange={e => { setOndc(o => ({ ...o, subscriberId: e.target.value })); setOndcDirty(true) }} />
            <Input label="BPP ID" value={ondc.bppId} placeholder="e.g. yourrestaurant.harmonybits.in"
              onChange={e => { setOndc(o => ({ ...o, bppId: e.target.value })); setOndcDirty(true) }} />
            <Input label="BPP URI" value={ondc.bppUri} placeholder="https://api.harmonybits.in/api/v1/ondc"
              hint="Yahi URL ONDC Gateway pe register karni hogi"
              onChange={e => { setOndc(o => ({ ...o, bppUri: e.target.value })); setOndcDirty(true) }} />
            <Input label="Unique Key ID" value={ondc.uniqueKeyId} placeholder="Ed25519 signing key ID"
              hint="ONDC registration ke baad milega"
              onChange={e => { setOndc(o => ({ ...o, uniqueKeyId: e.target.value })); setOndcDirty(true) }} />

            <div style={{ marginTop: 20, padding: 16, background: '#fafafa', borderRadius: 12,
              border: '1px solid #e5e7eb', fontSize: 13, color: '#555' }}>
              <div style={{ fontWeight: 700, color: '#111', marginBottom: 8 }}>Registration Steps:</div>
              <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
                <li>ondcnetwork.org pe Network Participant apply karo</li>
                <li>BPP URL: <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>https://api.harmonybits.in/api/v1/ondc</code></li>
                <li>Ed25519 key pair generate karo, public key ONDC ko do</li>
                <li>Staging test pass karo → Production approval</li>
                <li>Subscriber ID + Key ID yahan fill karo aur Enable karo</li>
              </ol>
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}
