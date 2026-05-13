import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

export default function Referrals() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [myCode,    setMyCode]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [copied,    setCopied]    = useState(false)

  // Apply referral
  const [applyCode, setApplyCode] = useState('')
  const [applying,  setApplying]  = useState(false)
  const [applied,   setApplied]   = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const code = await api.get(`/referral/generate?restaurantId=${rid}`)
        setMyCode(typeof code === 'string' ? code : code?.code || String(code))
      } catch { toast.error('Referral code load nahi hua') }
      finally { setLoading(false) }
    }
    load()
  }, [rid])

  function copyCode() {
    if (!myCode) return
    navigator.clipboard.writeText(myCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function applyReferral() {
    if (!applyCode.trim()) { toast.error('Referral code dalo'); return }
    setApplying(true)
    try {
      await api.post('/referral/apply', {
        referralCode:    applyCode.trim(),
        newRestaurantId: rid,
      })
      toast.success('Referral apply ho gaya! Dono restaurants ko bonus mila 🎉')
      setApplied(true)
      setApplyCode('')
    } catch (e) {
      toast.error(e.message || 'Invalid referral code')
    } finally { setApplying(false) }
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>🎁 Referrals</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Doosre restaurants ko refer karo aur bonus subscription paao
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* My Code */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
            🏷️ Tera Referral Code
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Yeh code kisi naye restaurant owner ko do. Jab woh is code se sign up kare
            toh dono ko subscription bonus milega.
          </p>

          {loading ? (
            <div style={{ height: 60, background: 'var(--border)', borderRadius: 8 }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                flex: 1, padding: '14px 18px', borderRadius: 10,
                background: 'var(--bg-page)', border: '2px solid #10b981',
                fontSize: 20, fontWeight: 800, fontFamily: 'monospace',
                letterSpacing: 3, color: '#10b981', textAlign: 'center',
              }}>
                {myCode || '—'}
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
        </div>

        {/* Apply Code */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
            🔗 Referral Code Apply Karo
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Kisi ne tujhe refer kiya hai? Unka referral code yahan enter karo
            aur dono ko bonus milega.
          </p>

          {applied ? (
            <div style={{ padding: '20px', borderRadius: 10, background: '#d1fae5',
              border: '1px solid #10b981', textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>🎉</div>
              <div style={{ fontWeight: 700, color: '#065f46', marginTop: 6 }}>Referral Applied!</div>
              <div style={{ fontSize: 12, color: '#065f46', marginTop: 4 }}>Dono accounts ko bonus mil gaya</div>
            </div>
          ) : (
            <>
              <input value={applyCode} onChange={e => setApplyCode(e.target.value)}
                placeholder="e.g. REF12345"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-page)',
                  color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
                  marginBottom: 10 }} />
              <button onClick={applyReferral} disabled={applying || !applyCode.trim()} style={{
                width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                background: !applyCode.trim() ? 'var(--border)' : '#10b981',
                color: '#fff', cursor: !applyCode.trim() ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600,
              }}>
                {applying ? 'Applying…' : '🎁 Apply Referral'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '1.5rem' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>
          ℹ️ Referral Program kaise kaam karta hai
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { icon: '📤', step: '1', title: 'Share karo', desc: 'Apna referral code kisi naye restaurant owner ko share karo' },
            { icon: '📝', step: '2', title: 'Signup',     desc: 'Woh apna account banate waqt tera code enter kare' },
            { icon: '✅', step: '3', title: 'Apply karo', desc: 'Uske account mein code apply hota hai' },
            { icon: '🎁', step: '4', title: 'Bonus!',     desc: 'Dono accounts ko subscription bonus milta hai' },
          ].map(s => (
            <div key={s.step} style={{ padding: '14px 16px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg-page)' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                marginBottom: 4, textTransform: 'uppercase' }}>Step {s.step}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
