import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

const APPS = [
  { icon: '🧾', name: 'SwiftBill POS',    role: 'Cashier',         desc: 'Bill create karo, UPI QR, due payments' },
  { icon: '👨‍🍳', name: 'ChefView KDS',    role: 'Kitchen Display', desc: 'Kitchen orders, KOT management' },
  { icon: '🛵', name: 'RideTrack',         role: 'Delivery Rider',  desc: 'GPS tracking, delivery orders' },
  { icon: '🪑', name: 'TableMate',         role: 'Waiter / Captain',desc: 'Table management, dine-in orders' },
  { icon: '👤', name: 'HarmoneyAdmin',     role: 'Owner / Manager', desc: 'Full access admin app' },
  { icon: '📲', name: 'Attendance App',    role: 'All Staff',       desc: 'QR attendance scan karo' },
]

export default function DeviceManagement() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [restaurantCode, setRestaurantCode] = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [copied,         setCopied]         = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const r = await api.get(`/restaurants/${rid}`)
        setRestaurantCode(r?.restaurantId || r?.restaurantCode || null)
      } catch { toast.error('Restaurant info load nahi hua') }
      finally { setLoading(false) }
    }
    load()
  }, [rid])

  function copyCode() {
    if (!restaurantCode) return
    navigator.clipboard.writeText(restaurantCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>📱 Device Management</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Android apps ko apne restaurant se link karo
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* Restaurant Code Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>
            🔑 Restaurant Code
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Yeh code Android apps mein enter karo device ko link karne ke liye.
            Har app pehli baar open karne par yeh code maangti hai.
          </p>

          {loading ? (
            <div style={{ height: 60, background: 'var(--border)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                flex: 1, padding: '14px 18px', borderRadius: 10,
                background: 'var(--bg-page)', border: '2px solid var(--accent)',
                fontSize: 22, fontWeight: 800, fontFamily: 'monospace',
                letterSpacing: 3, color: 'var(--accent)', textAlign: 'center',
              }}>
                {restaurantCode || '—'}
              </div>
              <button onClick={copyCode} style={{
                padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)',
                background: copied ? '#d1fae5' : 'var(--bg-card)',
                color: copied ? '#065f46' : 'var(--text)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
          )}

          <div style={{ marginTop: '1rem', padding: '10px 12px', borderRadius: 8,
            background: '#fef3c715', border: '1px solid #f59e0b30',
            fontSize: 12, color: 'var(--text-muted)' }}>
            ⚠️ Yeh code kisi ke saath share mat karo — sirf apne staff devices ke liye hai
          </div>
        </div>

        {/* Staff Passcode Login */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>
            🔢 Staff Passcode Login
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Staff members app mein apna 4-digit passcode enter karke login karte hain —
            bina email/password ke.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            {[
              { icon: '1️⃣', text: 'Staff page pe staff member ka passcode set karo' },
              { icon: '2️⃣', text: 'App open karo → Restaurant Code enter karo' },
              { icon: '3️⃣', text: '4-digit passcode enter karo → Logged in!' },
            ].map(s => (
              <div key={s.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>{s.icon}</span>
                <span style={{ color: 'var(--text-muted)' }}>{s.text}</span>
              </div>
            ))}
          </div>
          <a href="/staff" style={{
            display: 'inline-block', marginTop: '1rem',
            padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'var(--accent)', color: '#fff', textDecoration: 'none',
          }}>
            👤 Staff Manage Karo →
          </a>
        </div>
      </div>

      {/* App List */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '1.5rem' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>
          📦 Available Apps
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {APPS.map(app => (
            <div key={app.name} style={{
              padding: '14px 16px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg-page)',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{app.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{app.name}</div>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
                  {app.role}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                  {app.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
