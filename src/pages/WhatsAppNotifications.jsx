import { useState } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

// ── Message templates ─────────────────────────────────────────────────────
const TEMPLATES = [
  {
    label: '🧾 Bill Receipt',
    message: 'Namaste [Name]! Aapka bill ready hai. Total: ₹[Amount]. Harmony Restaurant mein aane ke liye shukriya! 🙏',
  },
  {
    label: '⭐ Loyalty Update',
    message: 'Namaste [Name]! Aapke account mein [Points] loyalty points hain (₹[Points] ki discount). Jaldi redeem karo! 🎉',
  },
  {
    label: '🎁 Promotion',
    message: 'Namaste [Name]! Aaj special offer hai — [Offer]. Sirf aaj ke liye! Aayiye aur enjoy kijiye. 😊',
  },
  {
    label: '🎂 Birthday Wish',
    message: 'Namaste [Name]! Aapko birthday ki bahut bahut badhaai! 🎂 Aaj aayiye aur FREE dessert leke jaaiye. Happy Birthday!',
  },
  {
    label: '📦 Order Ready',
    message: 'Namaste [Name]! Aapka order ready hai. Please [Action] kijiye. Shukriya! 🙏',
  },
  {
    label: '✍️ Custom',
    message: '',
  },
]

const TIERS = [
  { value: '',         label: 'All Customers' },
  { value: 'GOLD',    label: '🥇 Gold Tier'   },
  { value: 'SILVER',  label: '🥈 Silver Tier' },
  { value: 'BRONZE',  label: '🥉 Bronze Tier' },
]

function CharCount({ text, max = 1000 }) {
  const len = text.length
  const color = len > max * 0.9 ? '#ef4444' : len > max * 0.7 ? '#f59e0b' : 'var(--text-muted)'
  return (
    <span style={{ fontSize: 11, color }}>{len}/{max}</span>
  )
}

// ── Single Message Tab ────────────────────────────────────────────────────
function SingleTab({ toast }) {
  const [phone,    setPhone]    = useState('')
  const [message,  setMessage]  = useState('')
  const [template, setTemplate] = useState(null)
  const [sending,  setSending]  = useState(false)
  const [result,   setResult]   = useState(null)

  function applyTemplate(t) {
    setTemplate(t.label)
    setMessage(t.message)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!phone.trim())   return toast.error('Phone number dalo')
    if (!message.trim()) return toast.error('Message likhna padega')
    setSending(true); setResult(null)
    try {
      const res = await api.post('/whatsapp/send', {
        toPhone: phone.trim().replace(/\D/g, ''),
        message: message.trim(),
      })
      if (res?.success) {
        toast.success('WhatsApp message bhej diya!')
        setResult({ success: true, phone: phone.trim() })
      } else {
        toast.error(res?.error || 'Send failed')
        setResult({ success: false, error: res?.error })
      }
    } catch (err) {
      toast.error(err.message || 'Send failed')
      setResult({ success: false, error: err.message })
    } finally { setSending(false) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
      {/* Template picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          Quick Templates
        </div>
        {TEMPLATES.map(t => (
          <button key={t.label} onClick={() => applyTemplate(t)}
            style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: template === t.label ? 'var(--accent-bg)' : 'transparent',
              color: template === t.label ? 'var(--accent)' : 'var(--text)',
              cursor: 'pointer', fontSize: 13, textAlign: 'left', fontWeight: template === t.label ? 600 : 400,
              transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div>
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Customer Phone Number
            </label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              type="tel" placeholder="e.g. 9876543210"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Message</label>
              <CharCount text={message} />
            </div>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              rows={6} placeholder="Yahan message likho… [Name], [Amount] jaise placeholders use karo"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
                resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              💡 Placeholders: [Name], [Amount], [Points], [Offer], [Action] — manually replace karo before sending
            </div>
          </div>

          {/* Preview */}
          {message && (
            <div style={{ padding: '14px 16px', borderRadius: 10,
              background: '#dcfce7', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                📱 Preview
              </div>
              <div style={{ fontSize: 13, color: '#15803d', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {message}
              </div>
            </div>
          )}

          <button type="submit" disabled={sending}
            style={{ padding: '12px', borderRadius: 8, border: 'none',
              background: sending ? '#ccc' : '#25d366',
              color: '#fff', cursor: sending ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8 }}>
            {sending ? 'Sending…' : '📤 Send WhatsApp'}
          </button>
        </form>

        {result && (
          <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10,
            background: result.success ? '#dcfce7' : '#fee2e2',
            border: `1px solid ${result.success ? '#86efac' : '#fca5a5'}`,
            fontSize: 13, color: result.success ? '#15803d' : '#dc2626', fontWeight: 600 }}>
            {result.success
              ? `✓ Message bhej diya — ${result.phone}`
              : `✗ Failed: ${result.error}`}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Bulk Campaign Tab ─────────────────────────────────────────────────────
function BulkTab({ rid, toast }) {
  const [message,  setMessage]  = useState('')
  const [tier,     setTier]     = useState('')
  const [template, setTemplate] = useState(null)
  const [sending,  setSending]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [confirm,  setConfirm]  = useState(false)

  function applyTemplate(t) {
    setTemplate(t.label)
    setMessage(t.message)
  }

  async function handleSend() {
    if (!message.trim()) return toast.error('Message likhna padega')
    setSending(true); setResult(null); setConfirm(false)
    try {
      const body = { message: message.trim() }
      if (tier) body.tier = tier
      const res = await api.post('/whatsapp/bulk', body)
      setResult(res)
      if (res?.success) {
        toast.success(`${res.sent} customers ko message bhej diya!`)
      } else {
        toast.error('Bulk send failed')
      }
    } catch (err) {
      toast.error(err.message || 'Bulk send failed')
      setResult({ success: false, error: err.message })
    } finally { setSending(false) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
      {/* Template picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          Quick Templates
        </div>
        {TEMPLATES.map(t => (
          <button key={t.label} onClick={() => applyTemplate(t)}
            style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: template === t.label ? 'var(--accent-bg)' : 'transparent',
              color: template === t.label ? 'var(--accent)' : 'var(--text)',
              cursor: 'pointer', fontSize: 13, textAlign: 'left', fontWeight: template === t.label ? 600 : 400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Audience */}
        <div style={{ padding: '14px 18px', borderRadius: 10, background: 'var(--bg-page)',
          border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Audience
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TIERS.map(t => (
              <button key={t.value} onClick={() => setTier(t.value)}
                style={{ padding: '7px 16px', borderRadius: 20, border: '1px solid var(--border)',
                  background: tier === t.value ? 'var(--accent)' : 'transparent',
                  color: tier === t.value ? '#fff' : 'var(--text)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Message</label>
            <CharCount text={message} />
          </div>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            rows={6} placeholder="Campaign message likho… [Name] replace hoga customer ke naam se"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-page)',
              color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
              resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
        </div>

        {/* Preview */}
        {message && (
          <div style={{ padding: '14px 16px', borderRadius: 10,
            background: '#dcfce7', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 6 }}>📱 Preview</div>
            <div style={{ fontSize: 13, color: '#15803d', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {message}
            </div>
          </div>
        )}

        {/* Warning */}
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef3c7',
          border: '1px solid #fde68a', fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
          ⚠️ <strong>Bulk message bhejne se pehle dhyan dena:</strong> Har customer ko ek message jayega.
          WhatsApp Business API rate limit hai — 5 msg/sec. Bahut saare customers hone pe time lag sakta hai.
        </div>

        {!confirm ? (
          <button onClick={() => message.trim() && setConfirm(true)} disabled={!message.trim()}
            style={{ padding: '12px', borderRadius: 8, border: 'none',
              background: !message.trim() ? '#ccc' : '#f59e0b',
              color: '#fff', cursor: !message.trim() ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 700 }}>
            📢 Send Bulk Campaign
          </button>
        ) : (
          <div style={{ padding: '16px', borderRadius: 10, background: '#fff7ed',
            border: '2px solid #f59e0b' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#92400e' }}>
              Confirm karo — {tier ? `${tier} tier` : 'sabhi'} customers ko message jayega
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={handleSend} disabled={sending}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                  background: sending ? '#ccc' : '#25d366', color: '#fff',
                  cursor: sending ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
                {sending ? 'Sending…' : '✓ Confirm Send'}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ padding: '16px 18px', borderRadius: 10,
            background: result.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${result.success ? '#86efac' : '#fca5a5'}` }}>
            {result.success ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { label: 'Sent',    value: result.sent,    color: '#059669' },
                  { label: 'Failed',  value: result.failed,  color: '#dc2626' },
                  { label: 'Total',   value: result.total,   color: '#6366f1' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value ?? 0}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                ✗ Failed: {result.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function WhatsAppNotifications() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()
  const [tab, setTab] = useState('single')

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          <span style={{ color: '#25d366' }}>💬</span> WhatsApp Notifications
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Single ya bulk WhatsApp messages bhejo customers ko
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'single', label: '👤 Single Message' },
          { key: 'bulk',   label: '📢 Bulk Campaign'  },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 22px', borderRadius: 7, border: 'none',
              background: tab === t.key ? '#25d366' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 24 }}>
        {tab === 'single' && <SingleTab toast={toast} />}
        {tab === 'bulk'   && <BulkTab rid={rid} toast={toast} />}
      </div>

      {/* Info footer */}
      <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8,
        background: 'var(--accent-bg)', border: '1px solid var(--border)',
        fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        💡 <strong>WhatsApp Business API</strong> ke through messages jaate hain.
        Template messages approved hone chahiye. &nbsp;·&nbsp;
        Rate limit: 5 msg/sec. &nbsp;·&nbsp;
        Opt-out customers ko message mat karo.
      </div>
    </div>
  )
}
