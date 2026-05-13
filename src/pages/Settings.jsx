// src/pages/Settings.jsx
import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonLine } from '../components/Skeleton'

const TABS = ['🏪 Business Profile', '🔑 Login Credentials', '📜 Legal', '⭐ Loyalty & VIP', '🕐 Business Hours']

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const DAY_SHORT = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' }

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

  useEffect(() => { loadRestaurant() }, [])

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
      }
    } catch (_) { /* use defaults */ }
    finally { setLoading(false) }
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Input label="Opening Time" value={hours.openTime} type="time"
                    onChange={e => { setHours(h => ({ ...h, openTime: e.target.value })); setHoursDirty(true) }} />
                  <Input label="Closing Time" value={hours.closeTime} type="time"
                    onChange={e => { setHours(h => ({ ...h, closeTime: e.target.value })); setHoursDirty(true) }} />
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
    </div>
  )
}
