// src/pages/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, authApi } from '../api/client'
import { useAuthStore } from '../store/authStore'

/**
 * Login — 2-Step flow
 *
 * Step 1: Email ya Phone enter karo
 *         → Server se restaurantId + name auto-fetch
 *         → User se restaurantId kabhi nahi puchte
 *
 * Step 2: Password ya OTP enter karo → Login
 */
export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  // Step tracking
  const [step, setStep]       = useState(1) // 1 = identifier, 2 = auth

  // Form state
  const [identifier, setIdentifier] = useState('')  // email ya phone
  const [password, setPassword]     = useState('')
  const [otp, setOtp]               = useState('')
  const [useOtp, setUseOtp]         = useState(false)

  // Server-resolved data
  const [resolvedData, setResolvedData] = useState(null) // { restaurantId, name, found }

  // UI state
  const [loading, setLoading]   = useState(false)
  const [otpSent, setOtpSent]   = useState(false)
  const [error, setError]       = useState('')
  const [showPwd, setShowPwd]   = useState(false)

  const isEmail = identifier.includes('@')
  const isPhone = !isEmail && identifier.replace(/\D/g, '').length >= 10

  // ── Step 1: Lookup — restaurantId auto-fetch ─────────────────
  async function handleLookup(e) {
    e.preventDefault()
    if (!identifier.trim()) { setError('Email ya phone number enter karein'); return }
    setLoading(true); setError('')
    try {
      const body = isEmail
        ? { email: identifier.trim() }
        : { phone: identifier.trim().replace(/\D/g, '') }

      const res = await api.post('/auth/lookup', body)

      if (res?.found) {
        setResolvedData(res)
        setStep(2)
      } else {
        setError(res?.message || 'Koi account nahi mila. Pehle register karein.')
      }
    } catch (err) {
      // 403 ya koi bhi error — lookup optional hai
      // Seedha Step 2 pe jao, login attempt karega
      console.warn('Lookup skipped:', err.message)
      setResolvedData({ found: false, restaurantId: null })
      setStep(2)
    } finally { setLoading(false) }
  }

  // ── Send OTP ─────────────────────────────────────────────────
  async function handleSendOtp() {
    setLoading(true); setError('')
    try {
      const body = isEmail
        ? { email: identifier.trim() }
        : { phone: identifier.trim().replace(/\D/g, '') }
      await api.post('/auth/send-otp', body)
      setOtpSent(true)
      setUseOtp(true)
    } catch (_) {
      setOtpSent(true) // dev mode — assume sent
      setUseOtp(true)
    } finally { setLoading(false) }
  }

  // ── Step 2: Login — password ya OTP ──────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    if (useOtp && !otp.trim()) { setError('OTP enter karein'); return }
    if (!useOtp && !password.trim()) { setError('Password enter karein'); return }
    setLoading(true); setError('')
    try {
      const body = {
        ...(isEmail ? { email: identifier.trim() } : { phone: identifier.trim().replace(/\D/g, '') }),
        ...(useOtp ? { otp: otp.trim() } : { password }),
        ...(resolvedData?.restaurantId ? { restaurantId: resolvedData.restaurantId } : {}),
      }

      const res = await authApi.login(body)
      const token = res.token || res.accessToken
      if (!token) throw new Error('No token received')

      login(token, { id: res.id, name: res.name, role: res.role }, res.restaurantId)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('401') || msg.includes('403') || msg.includes('Invalid'))
        setError(useOtp ? 'OTP galat hai ya expire ho gaya' : 'Password galat hai')
      else if (msg.includes('404') || msg.includes('not found'))
        setError('Account nahi mila — register karein')
      else
        setError('Login failed — backend chalu hai?')
    } finally { setLoading(false) }
  }

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--bg-page)',
    color: 'var(--text)', fontSize: 14, boxSizing: 'border-box',
    outline: 'none', transition: 'border-color 0.15s',
  }

  const btn = (bg = 'var(--accent)', disabled = false) => ({
    width: '100%', padding: '12px', borderRadius: 10, border: 'none',
    background: disabled ? 'var(--border)' : bg,
    color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
      <div style={{ width: 400, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '2.5rem 2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🍽️</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>HarmoneyEats</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Admin Console</div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '1.5rem' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ width: 8, height: 8, borderRadius: '50%', background: step >= s ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* ── STEP 1: Identifier ── */}
        {step === 1 && (
          <form onSubmit={handleLookup}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                📧 Email ya 📱 Phone Number
              </label>
              <input
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setError('') }}
                placeholder="owner@restaurant.com ya 9876543210"
                autoFocus autoComplete="username"
                style={inp}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {isEmail ? '✅ Email detect hua' : isPhone ? '✅ Phone detect hua' : 'Email ya 10-digit phone enter karein'}
              </div>
            </div>

            {error && <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#ef444420', border: '1px solid #ef444440', fontSize: 13, color: '#ef4444' }}>{error}</div>}

            <button type="submit" disabled={loading || (!isEmail && !isPhone)} style={btn('var(--accent)', loading || (!isEmail && !isPhone))}>
              {loading ? 'Dhundh raha hai...' : 'Aage Baro →'}
            </button>
          </form>
        )}

        {/* ── STEP 2: Auth ── */}
        {step === 2 && (
          <form onSubmit={handleLogin}>
            {/* Resolved restaurant info */}
            {resolvedData?.found && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#10b98115', border: '1px solid #10b98130', marginBottom: '1.25rem', fontSize: 13 }}>
                <div style={{ color: '#10b981', fontWeight: 600 }}>✅ Account mila!</div>
                {resolvedData.name && <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>🏪 {resolvedData.name}</div>}
              </div>
            )}

            {/* Identifier (readonly) */}
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{isEmail ? '📧' : '📱'} {identifier}</span>
              <button type="button" onClick={() => { setStep(1); setError(''); setOtp(''); setPassword(''); setOtpSent(false); setUseOtp(false) }}
                style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Change
              </button>
            </div>

            {/* Auth method toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
              <button type="button" onClick={() => setUseOtp(false)} style={{
                flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border)', cursor: 'pointer',
                background: !useOtp ? 'var(--accent)' : 'transparent',
                color: !useOtp ? '#fff' : 'var(--text-muted)',
              }}>🔒 Password</button>
              <button type="button" onClick={() => { setUseOtp(true); if (!otpSent) handleSendOtp() }} style={{
                flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border)', cursor: 'pointer',
                background: useOtp ? 'var(--accent)' : 'transparent',
                color: useOtp ? '#fff' : 'var(--text-muted)',
              }}>📱 OTP</button>
            </div>

            {/* Password input */}
            {!useOtp && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="••••••••" autoFocus autoComplete="current-password"
                    style={{ ...inp, paddingRight: 52 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
                      color: 'var(--text-muted)', fontWeight: 600, padding: '2px 4px' }}>
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {/* OTP input */}
            {useOtp && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                    WhatsApp OTP {otpSent && <span style={{ color: '#10b981' }}>✅ Bhej diya</span>}
                  </label>
                  <button type="button" onClick={handleSendOtp} disabled={loading} style={{
                    fontSize: 11, color: 'var(--accent)', background: 'none',
                    border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  }}>{loading ? '...' : 'Resend OTP'}</button>
                </div>
                <input type="text" inputMode="numeric" maxLength={6} value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                  placeholder="6-digit OTP" autoFocus style={{ ...inp, letterSpacing: '0.3em', textAlign: 'center', fontSize: 20 }} />
              </div>
            )}

            {error && <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#ef444420', border: '1px solid #ef444440', fontSize: 13, color: '#ef4444' }}>{error}</div>}

            <button type="submit" disabled={loading} style={btn('var(--accent)', loading)}>
              {loading ? 'Login ho raha hai...' : '✅ Login'}
            </button>
          </form>
        )}

        {/* Dev hint */}
        <div style={{ marginTop: 16, textAlign: 'center', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>By using HarmoneyEats, you agree to our:</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://harmonybits.in/privacy-policy" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>Privacy Policy</a>
            <span style={{ color: 'var(--border)' }}>·</span>
            <a href="https://harmonybits.in/terms" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>Terms of Service</a>
            <span style={{ color: 'var(--border)' }}>·</span>
            <a href="https://harmonybits.in/refund-policy" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>Refund Policy</a>
          </div>
        </div>
      </div>
    </div>
  )
}
