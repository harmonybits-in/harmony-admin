import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

const CATEGORIES = [
  { value: 'MARKETING', label: '📢 Marketing',  color: '#f59e0b' },
  { value: 'UTILITY',   label: '🔧 Utility',    color: '#6366f1' },
  { value: 'REMINDER',  label: '⏰ Reminder',   color: '#0ea5e9' },
  { value: 'OFFER',     label: '🎁 Offer',      color: '#10b981' },
  { value: 'WELCOME',   label: '👋 Welcome',    color: '#ec4899' },
]

const TIERS = [
  { value: '',        label: 'All Customers' },
  { value: 'GOLD',   label: '🥇 Gold Tier'   },
  { value: 'SILVER', label: '🥈 Silver Tier' },
  { value: 'BRONZE', label: '🥉 Bronze Tier' },
]

const CAT_COLOR = Object.fromEntries(CATEGORIES.map(c => [c.value, c.color]))

function CharCount({ text, max = 1500 }) {
  const len   = text.length
  const color = len > max * 0.9 ? '#ef4444' : len > max * 0.7 ? '#f59e0b' : 'var(--text-muted)'
  return <span style={{ fontSize: 11, color }}>{len}/{max}</span>
}

function MsgPreview({ message }) {
  if (!message) return null
  return (
    <div style={{ padding: '14px 16px', borderRadius: 10, background: '#dcfce7', border: '1px solid #bbf7d0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 6 }}>📱 Preview</div>
      <div style={{ fontSize: 13, color: '#15803d', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{message}</div>
    </div>
  )
}

// ── Templates Sidebar ─────────────────────────────────────────────────────────
function TemplatePicker({ templates, selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        Templates
      </div>
      {templates.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
          No templates — Templates tab mein banao
        </div>
      )}
      {templates.map(t => (
        <button key={t.id} onClick={() => onSelect(t)}
          style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: selected === t.id ? 'var(--accent-bg)' : 'transparent',
            color: selected === t.id ? 'var(--accent)' : 'var(--text)',
            cursor: 'pointer', fontSize: 12, textAlign: 'left',
            fontWeight: selected === t.id ? 600 : 400 }}>
          <div style={{ marginBottom: 2 }}>{t.name}</div>
          <div style={{ fontSize: 10, color: CAT_COLOR[t.category] || 'var(--text-muted)' }}>
            {CATEGORIES.find(c => c.value === t.category)?.label || t.category}
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Single Message Tab ────────────────────────────────────────────────────────
function SingleTab({ templates, toast }) {
  const [phone,      setPhone]      = useState('')
  const [message,    setMessage]    = useState('')
  const [selectedTpl, setSelectedTpl] = useState(null)
  const [sending,    setSending]    = useState(false)
  const [result,     setResult]     = useState(null)

  function applyTemplate(t) {
    setSelectedTpl(t.id)
    setMessage(t.body)
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
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
      <TemplatePicker templates={templates} selected={selectedTpl} onSelect={applyTemplate} />

      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            Customer Phone Number
          </label>
          <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
            placeholder="e.g. 9876543210"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-page)',
              color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }} />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Message</label>
            <CharCount text={message} />
          </div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
            placeholder="Yahan message likho… [Name], [Amount] jaise placeholders use karo"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-page)',
              color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
              resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            💡 Placeholders: [Name], [Amount], [Points] — manually replace karo before sending
          </div>
        </div>

        <MsgPreview message={message} />

        <button type="submit" disabled={sending}
          style={{ padding: '12px', borderRadius: 8, border: 'none',
            background: sending ? '#ccc' : '#25d366', color: '#fff',
            cursor: sending ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {sending ? 'Sending…' : '📤 Send WhatsApp'}
        </button>

        {result && (
          <div style={{ padding: '12px 16px', borderRadius: 10,
            background: result.success ? '#dcfce7' : '#fee2e2',
            border: `1px solid ${result.success ? '#86efac' : '#fca5a5'}`,
            fontSize: 13, color: result.success ? '#15803d' : '#dc2626', fontWeight: 600 }}>
            {result.success ? `✓ Message bhej diya — ${result.phone}` : `✗ Failed: ${result.error}`}
          </div>
        )}
      </form>
    </div>
  )
}

// ── Bulk Campaign Tab ─────────────────────────────────────────────────────────
function BulkTab({ templates, toast }) {
  const [message,     setMessage]     = useState('')
  const [tier,        setTier]        = useState('')
  const [selectedTpl, setSelectedTpl] = useState(null)
  const [sending,     setSending]     = useState(false)
  const [result,      setResult]      = useState(null)
  const [confirm,     setConfirm]     = useState(false)

  function applyTemplate(t) { setSelectedTpl(t.id); setMessage(t.body) }

  async function handleSend() {
    if (!message.trim()) return toast.error('Message likhna padega')
    setSending(true); setResult(null); setConfirm(false)
    try {
      const body = { message: message.trim() }
      if (tier) body.tier = tier
      const res = await api.post('/whatsapp/bulk', body)
      setResult(res)
      if (res?.success) toast.success(`${res.sent} customers ko message bhej diya!`)
      else              toast.error('Bulk send failed')
    } catch (err) {
      toast.error(err.message || 'Bulk send failed')
      setResult({ success: false, error: err.message })
    } finally { setSending(false) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
      <TemplatePicker templates={templates} selected={selectedTpl} onSelect={applyTemplate} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Audience */}
        <div style={{ padding: '14px 18px', borderRadius: 10, background: 'var(--bg-page)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: 0.5 }}>Audience</div>
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

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Message</label>
            <CharCount text={message} />
          </div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
            placeholder="Campaign message likho… [Name] replace hoga customer ke naam se"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-page)',
              color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
              resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
        </div>

        <MsgPreview message={message} />

        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef3c7',
          border: '1px solid #fde68a', fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
          ⚠️ <strong>Bulk message bhejne se pehle dhyan dena:</strong> Har customer ko ek message jayega.
          Rate limit: 5 msg/sec.
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
          <div style={{ padding: '16px', borderRadius: 10, background: '#fff7ed', border: '2px solid #f59e0b' }}>
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

        {result && (
          <div style={{ padding: '16px 18px', borderRadius: 10,
            background: result.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${result.success ? '#86efac' : '#fca5a5'}` }}>
            {result.success ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { label: 'Sent',   value: result.sent,   color: '#059669' },
                  { label: 'Failed', value: result.failed, color: '#dc2626' },
                  { label: 'Total',  value: result.total,  color: '#6366f1' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value ?? 0}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>✗ Failed: {result.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Template Manager Tab ──────────────────────────────────────────────────────
const BLANK = { name: '', category: 'MARKETING', body: '', variables: '', isActive: true }

function TemplatesTab({ templates, onRefresh, toast }) {
  const [modal,  setModal]  = useState(null)   // null | 'add' | template object
  const [form,   setForm]   = useState(BLANK)
  const [saving, setSaving] = useState(false)

  function openAdd()  { setForm(BLANK); setModal('add') }
  function openEdit(t) { setForm({ ...t }); setModal(t) }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name required')
    if (!form.body.trim()) return toast.error('Message body required')
    setSaving(true)
    try {
      if (modal === 'add') await api.post('/whatsapp/templates', form)
      else                 await api.put(`/whatsapp/templates/${modal.id}`, form)
      toast.success(modal === 'add' ? 'Template created!' : 'Template updated!')
      setModal(null); onRefresh()
    } catch (_) { toast.error('Save failed') } finally { setSaving(false) }
  }

  async function del(t) {
    if (!confirm(`"${t.name}" delete karna chahte hain?`)) return
    try { await api.delete(`/whatsapp/templates/${t.id}`); toast.success('Deleted'); onRefresh() }
    catch (_) { toast.error('Delete failed') }
  }

  const F = (label, key, opts = {}) => (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      {opts.type === 'textarea' ? (
        <div>
          <textarea value={form[key]} onChange={e => setForm(s => ({ ...s, [key]: e.target.value }))}
            rows={opts.rows || 5}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
              resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Placeholders: [Name], [Amount], [Points], [Offer], [Date]
            </span>
            <CharCount text={form[key]} max={1500} />
          </div>
        </div>
      ) : opts.type === 'select' ? (
        <select value={form[key]} onChange={e => setForm(s => ({ ...s, [key]: e.target.value }))}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }}>
          {opts.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input value={form[key]} onChange={e => setForm(s => ({ ...s, [key]: e.target.value }))}
          placeholder={opts.placeholder || ''}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
      )}
    </div>
  )

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Message Templates</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Reusable templates — Single ya Bulk tab mein select karo
          </div>
        </div>
        <button onClick={openAdd}
          style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#25d366',
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + New Template
        </button>
      </div>

      {/* Grid */}
      {templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Koi template nahi</div>
          <div style={{ fontSize: 12 }}>+ New Template pe click karo</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {templates.map(t => (
            <div key={t.id} style={{ background: 'var(--bg-page)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: (CAT_COLOR[t.category] || '#6b7280') + '20',
                    color: CAT_COLOR[t.category] || '#6b7280', marginTop: 4, display: 'inline-block' }}>
                    {CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(t)}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--accent)', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => del(t)}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #ef444430',
                      background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8,
                maxHeight: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre-wrap' }}>
                {t.body}
              </div>
              {t.variables && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Variables: <strong>{t.variables}</strong>
                </div>
              )}
              {t.isActive === false && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#ef4444', fontWeight: 600 }}>⛔ Inactive</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '24px',
            width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>
                {modal === 'add' ? '➕ New Template' : '✏️ Edit Template'}
              </div>
              <button onClick={() => setModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {F('Template Name', 'name', { placeholder: 'e.g. Bill Receipt, Birthday Wish' })}
              {F('Category', 'category', { type: 'select', options: CATEGORIES.map(c => ({ value: c.value, label: c.label })) })}
              {F('Message Body', 'body', { type: 'textarea', rows: 6 })}
              {F('Variables (comma separated)', 'variables', { placeholder: 'e.g. Name,Amount,Points' })}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="tpl-active" checked={form.isActive !== false}
                  onChange={e => setForm(s => ({ ...s, isActive: e.target.checked }))} />
                <label htmlFor="tpl-active" style={{ fontSize: 13, cursor: 'pointer' }}>Active</label>
              </div>

              {form.body && <MsgPreview message={form.body} />}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setModal(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                    background: saving ? '#ccc' : '#25d366', color: '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
                  {saving ? 'Saving…' : '✓ Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function WhatsAppNotifications() {
  const toast = useToast()
  const [tab,       setTab]       = useState('single')
  const [templates, setTemplates] = useState([])

  const loadTemplates = useCallback(async () => {
    try {
      const data = await api.get('/whatsapp/templates')
      setTemplates(Array.isArray(data) ? data : [])
    } catch (_) { setTemplates([]) }
  }, [])

  useEffect(() => { loadTemplates() }, [])

  const TABS = [
    { key: 'single',    label: '👤 Single Message' },
    { key: 'bulk',      label: '📢 Bulk Campaign'  },
    { key: 'templates', label: '📋 Templates'      },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          <span style={{ color: '#25d366' }}>💬</span> WhatsApp
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Single message, bulk campaigns, aur template manager
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 22px', borderRadius: 7, border: 'none',
              background: tab === t.key ? '#25d366' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
        {tab === 'single'    && <SingleTab    templates={templates.filter(t => t.isActive !== false)} toast={toast} />}
        {tab === 'bulk'      && <BulkTab      templates={templates.filter(t => t.isActive !== false)} toast={toast} />}
        {tab === 'templates' && <TemplatesTab templates={templates} onRefresh={loadTemplates} toast={toast} />}
      </div>

      <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8,
        background: 'var(--accent-bg)', border: '1px solid var(--border)',
        fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        💡 <strong>WhatsApp Business API</strong> ke through messages jaate hain. &nbsp;·&nbsp;
        Rate limit: 5 msg/sec. &nbsp;·&nbsp;
        Opt-out customers ko message mat karo.
      </div>
    </div>
  )
}
