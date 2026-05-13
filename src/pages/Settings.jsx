// src/pages/Settings.jsx
import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonLine } from '../components/Skeleton'

const TABS = ['🏪 Business Profile', '🔑 Login Credentials', '🕐 Business Hours', '📜 Legal', '💰 Tax & Charges']

function Input({ label, value, onChange, type = 'text', placeholder = '', disabled = false }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 500 }}>{label}</label>
      <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} disabled={disabled}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: disabled ? 'var(--border)' : 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box', opacity: disabled ? 0.6 : 1 }} />
    </div>
  )
}

function Section({ title, children, onSave, saving, dirty }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        {onSave && (
          <button onClick={onSave} disabled={saving || !dirty} style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: dirty ? 'var(--accent)' : 'var(--border)', color: '#fff',
            border: 'none', cursor: dirty && !saving ? 'pointer' : 'not-allowed',
          }}>{saving ? 'Saving...' : 'Save'}</button>
        )}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { restaurantId, user } = useAuthStore()
  const toast = useToast()
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Business Profile
  const [profile, setProfile] = useState({ name: '', ownerName: '', phone: '', email: '', address: '', city: '', state: '', upiId: '', upiName: '' })
  const [profileDirty, setProfileDirty] = useState(false)

  // Login Credentials
  const [creds, setCreds] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  // Business Hours
  const [hours, setHours] = useState({ openTime: '09:00', closeTime: '23:00', closedDays: [] })
  const [hoursDirty, setHoursDirty] = useState(false)

  // Legal
  const [legal, setLegal] = useState({ gstNumber: '', fssaiNumber: '', panNumber: '', registrationNumber: '' })
  const [legalDirty, setLegalDirty] = useState(false)

  // Tax
  const [tax, setTax] = useState({ taxRate: 5, serviceCharge: 0, loyaltyPointsPer100: 5, loyaltyExpiryDays: 365 })
  const [taxDirty, setTaxDirty] = useState(false)

  useEffect(() => { loadRestaurant() }, [])

  async function loadRestaurant() {
    setLoading(true)
    try {
      const r = await api.get(`/restaurants/${restaurantId}`)
      if (r) {
        setProfile({ name: r.name || '', ownerName: r.ownerName || '', phone: r.phone || '', email: r.email || '', address: r.address || '', city: r.city || '', state: r.state || '', upiId: r.upiId || '', upiName: r.upiName || '' })
        setHours({ openTime: r.openTime || '09:00', closeTime: r.closeTime || '23:00', closedDays: r.closedDays || [] })
        setLegal({ gstNumber: r.gstNumber || '', fssaiNumber: r.fssaiNumber || '', panNumber: r.panNumber || '', registrationNumber: r.registrationNumber || '' })
        setTax({ taxRate: r.taxRate ?? 5, serviceCharge: r.serviceCharge ?? 0, loyaltyPointsPer100: r.loyaltyPointsPer100 ?? 5, loyaltyExpiryDays: r.loyaltyExpiryDays ?? 365 })
      }
    } catch (_) { /* use defaults */ }
    finally { setLoading(false) }
  }

  async function saveSection(data, setDirty) {
    setSaving(true)
    try {
      await api.put(`/restaurants/${restaurantId}`, data)
      toast.success('✅ Settings saved!')
      setDirty(false)
    } catch (_) { toast.error('Save failed — check server connection') }
    finally { setSaving(false) }
  }

  async function changePassword() {
    if (!creds.newPassword) { toast.error('New password enter karein'); return }
    if (creds.newPassword !== creds.confirmPassword) { toast.error('Passwords match nahi kar rahe'); return }
    if (creds.newPassword.length < 8) { toast.error('Password minimum 8 characters hona chahiye'); return }
    setSaving(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: creds.currentPassword,
        newPassword:     creds.newPassword,
        userId:          user?.id,
      })
      toast.success('✅ Password changed!')
      setCreds({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e) {
      toast.error(e.message?.includes('401') ? 'Current password galat hai' : 'Password change failed')
    } finally { setSaving(false) }
  }

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  function toggleDay(day) {
    setHours(h => ({
      ...h,
      closedDays: h.closedDays.includes(day)
        ? h.closedDays.filter(d => d !== day)
        : [...h.closedDays, day]
    }))
    setHoursDirty(true)
  }

  const upd = (setter, setDirty) => (field) => (e) => {
    setter(s => ({ ...s, [field]: e.target.value }))
    setDirty(true)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>⚙️ Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Restaurant profile, credentials, hours, legal, tax</p>
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

      {/* ── Business Profile ── */}
      {tab === 0 && (
        <Section title="🏪 Business Profile" dirty={profileDirty} saving={saving}
          onSave={() => saveSection(profile, setProfileDirty)}>
          {loading ? [...Array(4)].map((_, i) => <SkeletonLine key={i} height={38} style={{ marginBottom: 14 }} />) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Input label="Restaurant Name *" value={profile.name} onChange={upd(setProfile, setProfileDirty)('name')} />
                <Input label="Owner Name" value={profile.ownerName} onChange={upd(setProfile, setProfileDirty)('ownerName')} />
                <Input label="Phone" value={profile.phone} onChange={upd(setProfile, setProfileDirty)('phone')} type="tel" />
                <Input label="Email" value={profile.email} onChange={upd(setProfile, setProfileDirty)('email')} type="email" />
                <Input label="City" value={profile.city} onChange={upd(setProfile, setProfileDirty)('city')} />
                <Input label="State" value={profile.state} onChange={upd(setProfile, setProfileDirty)('state')} />
              </div>
              <Input label="Full Address" value={profile.address} onChange={upd(setProfile, setProfileDirty)('address')} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Input label="UPI ID" value={profile.upiId} onChange={upd(setProfile, setProfileDirty)('upiId')} placeholder="restaurant@upi" />
                <Input label="UPI Name" value={profile.upiName} onChange={upd(setProfile, setProfileDirty)('upiName')} />
              </div>
            </>
          )}
        </Section>
      )}

      {/* ── Login Credentials ── */}
      {tab === 1 && (
        <Section title="🔑 Login Credentials">
          <div style={{ maxWidth: 400 }}>
            <Input label="Current Password" value={creds.currentPassword} onChange={e => setCreds(c => ({ ...c, currentPassword: e.target.value }))} type="password" placeholder="••••••••" />
            <Input label="New Password" value={creds.newPassword} onChange={e => setCreds(c => ({ ...c, newPassword: e.target.value }))} type="password" placeholder="Min 8 characters" />
            <Input label="Confirm New Password" value={creds.confirmPassword} onChange={e => setCreds(c => ({ ...c, confirmPassword: e.target.value }))} type="password" placeholder="Dobara enter karein" />

            {creds.newPassword && creds.confirmPassword && creds.newPassword !== creds.confirmPassword && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>❌ Passwords match nahi kar rahe</div>
            )}
            {creds.newPassword && creds.newPassword.length >= 8 && creds.newPassword === creds.confirmPassword && (
              <div style={{ fontSize: 12, color: '#10b981', marginBottom: 12 }}>✅ Password match kar raha hai</div>
            )}

            <button onClick={changePassword} disabled={saving} style={{
              width: '100%', padding: '10px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>{saving ? 'Changing...' : '🔑 Change Password'}</button>

            <div style={{ marginTop: 16, padding: '12px', borderRadius: 8, background: '#f59e0b15', border: '1px solid #f59e0b30', fontSize: 12, color: 'var(--text-muted)' }}>
              ⚠️ Password change ke baad dobara login karna padega
            </div>
          </div>
        </Section>
      )}

      {/* ── Business Hours ── */}
      {tab === 2 && (
        <Section title="🕐 Business Hours" dirty={hoursDirty} saving={saving}
          onSave={() => saveSection({ openTime: hours.openTime, closeTime: hours.closeTime, closedDays: hours.closedDays }, setHoursDirty)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', maxWidth: 400 }}>
            <Input label="Opening Time" value={hours.openTime} onChange={e => { setHours(h => ({ ...h, openTime: e.target.value })); setHoursDirty(true) }} type="time" />
            <Input label="Closing Time" value={hours.closeTime} onChange={e => { setHours(h => ({ ...h, closeTime: e.target.value })); setHoursDirty(true) }} type="time" />
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 500 }}>Closed Days</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map(day => (
                <button key={day} onClick={() => toggleDay(day)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '1px solid var(--border)',
                  background: hours.closedDays.includes(day) ? '#ef4444' : 'transparent',
                  color: hours.closedDays.includes(day) ? '#fff' : 'var(--text-muted)',
                }}>{day.slice(0, 3)}</button>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ── Legal ── */}
      {tab === 3 && (
        <Section title="📜 Legal & Compliance" dirty={legalDirty} saving={saving}
          onSave={() => saveSection(legal, setLegalDirty)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Input label="GST Number" value={legal.gstNumber} onChange={upd(setLegal, setLegalDirty)('gstNumber')} placeholder="29ABCDE1234F1Z5" />
            <Input label="FSSAI Number" value={legal.fssaiNumber} onChange={upd(setLegal, setLegalDirty)('fssaiNumber')} placeholder="FSSAI123456" />
            <Input label="PAN Number" value={legal.panNumber} onChange={upd(setLegal, setLegalDirty)('panNumber')} placeholder="ABCDE1234F" />
            <Input label="Registration Number" value={legal.registrationNumber} onChange={upd(setLegal, setLegalDirty)('registrationNumber')} />
          </div>
        </Section>
      )}

      {/* ── Tax & Charges ── */}
      {tab === 4 && (
        <Section title="💰 Tax & Charges" dirty={taxDirty} saving={saving}
          onSave={() => saveSection(tax, setTaxDirty)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Input label="Tax Rate (%)" value={tax.taxRate} onChange={e => { setTax(t => ({ ...t, taxRate: e.target.value })); setTaxDirty(true) }} type="number" />
            <Input label="Service Charge (%)" value={tax.serviceCharge} onChange={e => { setTax(t => ({ ...t, serviceCharge: e.target.value })); setTaxDirty(true) }} type="number" />
            <Input label="Loyalty Points per ₹100" value={tax.loyaltyPointsPer100} onChange={e => { setTax(t => ({ ...t, loyaltyPointsPer100: e.target.value })); setTaxDirty(true) }} type="number" />
            <Input label="Loyalty Expiry (days)" value={tax.loyaltyExpiryDays} onChange={e => { setTax(t => ({ ...t, loyaltyExpiryDays: e.target.value })); setTaxDirty(true) }} type="number" />
          </div>
          <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-page)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
            💡 Tax rate sabhi bills pe automatically apply hoga. Loyalty points customers ko bill ke according milenge.
          </div>
        </Section>
      )}
    </div>
  )
}
