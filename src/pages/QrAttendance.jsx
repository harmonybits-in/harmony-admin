import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import QRCode from 'qrcode'

const REFRESH_SECS = 60 // token auto-refresh every 60s

export default function QrAttendance() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [token,      setToken]      = useState(null)
  const [expiresAt,  setExpiresAt]  = useState(null)
  const [qrDataUrl,  setQrDataUrl]  = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [countdown,  setCountdown]  = useState(REFRESH_SECS)
  const timerRef = useRef(null)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/qr/generate?restaurantId=${rid}`)
      const tok = data?.token || data?.qrToken || JSON.stringify(data)
      setToken(tok)
      setExpiresAt(data?.expiresAt || null)
      setCountdown(REFRESH_SECS)

      // Render QR to canvas data URL
      const url = await QRCode.toDataURL(tok, {
        width: 280, margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      })
      setQrDataUrl(url)
    } catch (err) {
      toast.error(err.message || 'QR generate nahi ho saka')
    } finally { setLoading(false) }
  }, [rid])

  // Auto-refresh every REFRESH_SECS
  useEffect(() => {
    generate()
    return () => { clearInterval(timerRef.current) }
  }, [generate])

  useEffect(() => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { generate(); return REFRESH_SECS }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [generate])

  const pct = (countdown / REFRESH_SECS) * 100
  const circumference = 2 * Math.PI * 22
  const dashOffset = circumference * (1 - pct / 100)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📲 QR Attendance</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Staff apne mobile app se yeh QR scan karke check-in/out kar sakte hain
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'start' }}>

        {/* QR Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '28px 32px', textAlign: 'center', minWidth: 340 }}>

          {/* Countdown ring */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <div style={{ position: 'relative', width: 52, height: 52 }}>
              <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="26" cy="26" r="22" fill="none"
                  stroke="var(--border)" strokeWidth="3" />
                <circle cx="26" cy="26" r="22" fill="none"
                  stroke={countdown <= 10 ? '#ef4444' : 'var(--accent)'}
                  strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s' }} />
              </svg>
              <span style={{ position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800,
                color: countdown <= 10 ? '#ef4444' : 'var(--text)' }}>
                {countdown}
              </span>
            </div>
          </div>

          {/* QR Image */}
          <div style={{ width: 280, height: 280, margin: '0 auto', borderRadius: 12,
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--border)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Generating…</div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" style={{ width: 280, height: 280 }} />
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>QR unavailable</div>
            )}
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            Har {REFRESH_SECS}s mein auto-refresh hota hai
          </div>

          <button onClick={generate} disabled={loading}
            style={{ marginTop: 12, padding: '9px 28px', borderRadius: 8, border: 'none',
              background: loading ? '#ccc' : 'var(--accent)', color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
            {loading ? 'Generating…' : '🔄 Refresh Now'}
          </button>

          {token && (
            <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 8,
              background: 'var(--bg-page)', border: '1px solid var(--border)',
              fontSize: 10, color: 'var(--text-muted)', wordBreak: 'break-all',
              fontFamily: 'monospace', lineHeight: 1.6 }}>
              {token}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              Staff ke liye instructions
            </div>
            {[
              { step: 1, icon: '📱', title: 'App open karo', desc: 'HarmoneyAdmin ya Staff app open karo' },
              { step: 2, icon: '🔍', title: 'QR Scanner', desc: 'App mein "Scan QR" button dabao' },
              { step: 3, icon: '📸', title: 'Scan karo', desc: 'Is QR code ko phone camera se scan karo' },
              { step: 4, icon: '✅', title: 'Done!', desc: 'Check-in ya Check-out ho jaayega automatically' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.icon} {s.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>How it works</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              {[
                { icon: '🟢', text: 'Pehla scan = Check-In (session 1 shuru)' },
                { icon: '🔴', text: 'Doosra scan = Check-Out (session 1 khatam)' },
                { icon: '🔁', text: 'Baar baar aana-jaana supported (multi-session)' },
                { icon: '⏱️', text: 'Total hours automatically calculate hote hain' },
                { icon: '🔒', text: 'Token har 60 seconds mein badalta hai — secure' },
              ].map(r => (
                <div key={r.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span>{r.icon}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{r.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '14px 18px', borderRadius: 10,
            background: 'var(--accent-bg)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            💡 <strong>Attendance records</strong> dekhne ke liye{' '}
            <a href="/attendance" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              Attendance Reports
            </a>{' '}
            page pe jao. Wahan aaj ke check-ins, total hours, aur date-wise breakdown milega.
          </div>
        </div>
      </div>
    </div>
  )
}
