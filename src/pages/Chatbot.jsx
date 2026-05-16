// src/pages/Chatbot.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { chatbotApi, referralApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// ── Helpers ──────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtRelative(d) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now()
}

// ── Modal ────────────────────────────────────────────────────────
function Modal({ onClose, children, maxWidth = 480 }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14, padding: 24,
        width: '100%', maxWidth, maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
      }}>
        {children}
      </div>
    </div>
  )
}

// ── Chat bubble ──────────────────────────────────────────────────
function ChatBubble({ role, content, accentColor }) {
  const isUser = role === 'USER'
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: accentColor || 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2,
        }}>🤖</div>
      )}
      <div style={{
        maxWidth: '75%', padding: '10px 14px', borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? (accentColor || 'var(--accent)') : 'var(--bg-card)',
        color: isUser ? '#fff' : 'var(--text)',
        fontSize: 13, lineHeight: 1.55,
        border: isUser ? 'none' : '1px solid var(--border)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      }}>
        {content}
      </div>
      {isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-page)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, marginLeft: 8, marginTop: 2,
        }}>👤</div>
      )}
    </div>
  )
}

// ── Typing indicator ─────────────────────────────────────────────
function TypingIndicator({ accentColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', background: accentColor || 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }}>🤖</div>
      <div style={{
        padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--text-muted)',
            animation: `bounce 1.2s ${i * 0.2}s infinite`,
            display: 'inline-block',
          }} />
        ))}
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Config Tab ───────────────────────────────────────────────────
function ConfigTab({ rid, toast }) {
  const [config, setConfig] = useState({
    enabled: false,
    provider: 'CLAUDE',
    openaiApiKey: '',
    widgetTitle: 'Chat with us',
    widgetColor: '#e53e3e',
    greetingMessage: 'Hello! How can I help you today?',
    systemPrompt: 'You are a helpful restaurant assistant. Answer questions about the menu, hours, and reservations politely.',
    alertPhone: '',
    googleReviewLink: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [embedCopied, setEmbedCopied] = useState(false)

  useEffect(() => {
    chatbotApi.getConfig(rid)
      .then(res => setConfig(c => ({ ...c, ...res })))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [rid])

  const upd = k => e => setConfig(c => ({ ...c, [k]: e.target.value }))
  const updBool = k => v => setConfig(c => ({ ...c, [k]: v }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await chatbotApi.updateConfig(rid, config)
      setConfig(c => ({ ...c, ...res }))
      setSaved(true)
      toast.success('Chatbot config saved!')
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      toast.error(err.message || 'Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  const embedSnippet = `<iframe src="${window.location.origin}/chat/${rid}" width="400" height="600" frameborder="0" style="border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);"></iframe>`

  function copyEmbed() {
    navigator.clipboard.writeText(embedSnippet).then(() => {
      setEmbedCopied(true)
      toast.success('Embed code copied!')
      setTimeout(() => setEmbedCopied(false), 2500)
    }).catch(() => toast.error('Copy failed'))
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600,
  }
  const sectionStyle = {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '20px 24px', marginBottom: 16,
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
        Loading config…
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 640 }}>

      {/* ── Enable / Disable ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Chatbot Status</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              Enable to let customers chat with your AI assistant
            </div>
          </div>
          {/* Big toggle */}
          <button
            type="button"
            onClick={() => updBool('enabled')(!config.enabled)}
            style={{
              width: 58, height: 30, borderRadius: 15, border: 'none', cursor: 'pointer',
              background: config.enabled ? '#10b981' : '#d1d5db',
              position: 'relative', transition: 'background .25s', flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: config.enabled ? 30 : 3,
              width: 24, height: 24, borderRadius: '50%', background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left .25s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11,
            }}>
              {config.enabled ? '✓' : '✕'}
            </span>
          </button>
        </div>
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 7,
          background: config.enabled ? '#10b98115' : '#88888815',
          border: `1px solid ${config.enabled ? '#10b98140' : '#88888830'}`,
          fontSize: 12, fontWeight: 600,
          color: config.enabled ? '#10b981' : '#888',
        }}>
          {config.enabled ? '🟢 Chatbot is ACTIVE — customers can chat' : '⚪ Chatbot is INACTIVE'}
        </div>
      </div>

      {/* ── AI Provider ── */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>AI Provider</div>

        <div style={{ display: 'flex', gap: 12, marginBottom: config.provider === 'OPENAI' ? 16 : 0 }}>
          {[
            { value: 'CLAUDE', label: 'Claude (Anthropic)', emoji: '🧠' },
            { value: 'OPENAI', label: 'ChatGPT (OpenAI)', emoji: '💡' },
          ].map(({ value, label, emoji }) => (
            <label key={value} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              padding: '12px 14px', borderRadius: 9,
              border: `2px solid ${config.provider === value ? 'var(--accent)' : 'var(--border)'}`,
              background: config.provider === value ? 'var(--accent)15' : 'var(--bg-page)',
              transition: '.15s',
            }}>
              <input
                type="radio" name="provider" value={value}
                checked={config.provider === value}
                onChange={upd('provider')}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
            </label>
          ))}
        </div>

        {config.provider === 'OPENAI' && (
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>OpenAI API Key</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={config.openaiApiKey}
                onChange={upd('openaiApiKey')}
                placeholder="sk-..."
                style={{ ...inputStyle, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowKey(s => !s)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, color: 'var(--text-muted)',
                }}
              >{showKey ? '🙈' : '👁️'}</button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Your key is stored securely on the server and never exposed to clients.
            </div>
          </div>
        )}
      </div>

      {/* ── Widget Appearance ── */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Widget Appearance</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0 16px', marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Widget Title</label>
            <input
              type="text" value={config.widgetTitle} onChange={upd('widgetTitle')}
              placeholder="Chat with us"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Brand Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color" value={config.widgetColor} onChange={upd('widgetColor')}
                style={{
                  width: 48, height: 40, borderRadius: 8, border: '1px solid var(--border)',
                  cursor: 'pointer', padding: 3,
                  background: 'var(--bg-page)',
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {config.widgetColor}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Greeting Message</label>
          <textarea
            value={config.greetingMessage} onChange={upd('greetingMessage')}
            placeholder="Hello! How can I help you today?"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        <div>
          <label style={labelStyle}>System Prompt</label>
          <textarea
            value={config.systemPrompt} onChange={upd('systemPrompt')}
            placeholder="You are a helpful restaurant assistant..."
            rows={6}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            This prompt shapes the AI's personality and knowledge. Include menu info, hours, location etc.
          </div>
        </div>

        <div>
          <label style={labelStyle}>📱 WhatsApp Alert Number</label>
          <input
            type="tel" value={config.alertPhone} onChange={upd('alertPhone')}
            placeholder="e.g. 9876543210"
            style={inputStyle}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Jab koi naya chat session start ho, iss number pe WhatsApp alert aayega. Blank chhodo agar alert nahi chahiye.
          </div>
        </div>

        <div>
          <label style={labelStyle}>⭐ Google Review Link</label>
          <input
            type="url" value={config.googleReviewLink} onChange={upd('googleReviewLink')}
            placeholder="https://g.page/r/YOUR_PLACE_ID/review"
            style={inputStyle}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Jab customer positive feedback de, chatbot automatically yeh link share karega Google review ke liye. Blank chhodo agar disable karna ho.
          </div>
        </div>
      </div>

      {/* ── Save button ── */}
      <button type="submit" disabled={saving} style={{
        padding: '10px 28px', borderRadius: 9, border: 'none', fontSize: 14, fontWeight: 700,
        background: saving ? 'var(--border)' : 'var(--accent)', color: '#fff',
        cursor: saving ? 'not-allowed' : 'pointer', marginBottom: 20,
      }}>
        {saving ? 'Saving…' : '💾 Save Config'}
      </button>

      {/* ── Embed snippet (shown after save) ── */}
      {saved && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '20px 24px',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📎 Embed Widget</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Paste this iframe into your website wherever you want the chat widget to appear.
          </div>
          <div style={{
            background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '12px 14px', fontFamily: 'monospace', fontSize: 11,
            color: 'var(--text)', overflowX: 'auto', marginBottom: 12,
            lineHeight: 1.6, wordBreak: 'break-all',
          }}>
            {embedSnippet}
          </div>
          <button
            type="button"
            onClick={copyEmbed}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
              background: embedCopied ? '#10b981' : 'transparent',
              color: embedCopied ? '#fff' : 'var(--text)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: '.2s',
            }}
          >
            {embedCopied ? '✅ Copied!' : '📋 Copy Code'}
          </button>
        </div>
      )}
    </form>
  )
}

// ── Preview Tab ──────────────────────────────────────────────────
function PreviewTab({ rid, toast }) {
  const [config, setConfig] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState(() => generateSessionId())
  const messagesEndRef = useRef(null)

  useEffect(() => {
    chatbotApi.getConfig(rid)
      .then(res => {
        setConfig(res)
        if (res?.greetingMessage) {
          setMessages([{ role: 'ASSISTANT', content: res.greetingMessage }])
        }
      })
      .catch(() => {})
  }, [rid])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  function startNew() {
    const newId = generateSessionId()
    setSessionId(newId)
    setMessages(config?.greetingMessage ? [{ role: 'ASSISTANT', content: config.greetingMessage }] : [])
    setInput('')
    setSending(false)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'USER', content: userMsg }])
    setSending(true)
    try {
      const res = await chatbotApi.sendMessage(rid, {
        message: userMsg,
        sessionId,
        customerName: 'Preview User',
        customerPhone: '0000000000',
      })
      const reply = res?.reply || res?.message || res?.content || 'Sorry, I could not process that.'
      setMessages(m => [...m, { role: 'ASSISTANT', content: reply }])
    } catch (err) {
      setMessages(m => [...m, {
        role: 'ASSISTANT',
        content: '⚠️ Error: ' + (err.message || 'Failed to get response'),
      }])
    } finally {
      setSending(false)
    }
  }

  const accentColor = config?.widgetColor || 'var(--accent)'

  return (
    <div style={{ maxWidth: 520 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{config?.widgetTitle || 'Chat Preview'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Session: <code style={{ fontSize: 10 }}>{sessionId.slice(0, 12)}…</code>
          </div>
        </div>
        <button
          onClick={startNew}
          style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ↺ New Conversation
        </button>
      </div>

      {/* Chat window */}
      <div style={{
        background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 14,
        overflow: 'hidden',
      }}>
        {/* Chat header bar */}
        <div style={{
          background: accentColor, padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🤖</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {config?.widgetTitle || 'AI Assistant'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Always here to help</div>
          </div>
          <div style={{
            marginLeft: 'auto', width: 9, height: 9, borderRadius: '50%',
            background: '#4ade80',
          }} />
        </div>

        {/* Messages area */}
        <div style={{
          height: 380, overflowY: 'auto', padding: '16px 14px',
          display: 'flex', flexDirection: 'column',
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <div>Start a conversation to test the chatbot</div>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} accentColor={accentColor} />
          ))}

          {sending && <TypingIndicator accentColor={accentColor} />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSend}
          style={{
            display: 'flex', gap: 8, padding: '12px 14px',
            borderTop: '1px solid var(--border)', background: 'var(--bg-card)',
          }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={sending}
            style={{
              flex: 1, padding: '9px 14px', borderRadius: 22, border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none',
              background: !input.trim() || sending ? 'var(--border)' : accentColor,
              color: '#fff', fontSize: 16, cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background .2s',
            }}
          >➤</button>
        </form>
      </div>

      {!config?.enabled && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 9,
          background: '#f59e0b15', border: '1px solid #f59e0b40',
          fontSize: 12, color: '#f59e0b',
        }}>
          ⚠️ Chatbot is currently disabled. Enable it in the Config tab to receive real responses.
        </div>
      )}
    </div>
  )
}

// ── Session Messages Modal ───────────────────────────────────────
function SessionModal({ rid, session, onClose }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chatbotApi.getSessionMessages(rid, session.sessionId || session.id)
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.messages || res?.content || [])
        setMessages(list)
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false))
  }, [rid, session])

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            💬 {session.customerName || 'Anonymous'}
          </h3>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {session.customerPhone || '—'} · {fmtDate(session.createdAt || session.startedAt)}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}
        >×</button>
      </div>

      <div style={{
        background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '14px', height: 420, overflowY: 'auto',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            <div>No messages in this session</div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role || msg.sender} content={msg.content || msg.message} />
          ))
        )}
      </div>
    </Modal>
  )
}

// ── Sessions Tab ─────────────────────────────────────────────────
function SessionsTab({ rid, toast }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [viewSession, setViewSession] = useState(null)

  const load = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const res = await chatbotApi.getSessions(rid, p)
      const list = Array.isArray(res) ? res : (res?.content || res?.sessions || [])
      const total = res?.totalElements || res?.total
      if (p === 0) setSessions(list)
      else setSessions(s => [...s, ...list])
      setHasMore(list.length === 20 || (total && (p + 1) * 20 < total))
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [rid])

  useEffect(() => { load(0) }, [load])

  function loadMore() {
    const next = page + 1
    setPage(next)
    load(next)
  }

  return (
    <div>
      {/* Table */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {loading && sessions.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading sessions…
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '56px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No chat sessions yet</div>
            <div style={{ fontSize: 12 }}>Sessions will appear here once customers start chatting</div>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-page)' }}>
                  {['Customer', 'Phone', 'Messages', 'Last Active', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontSize: 11,
                      color: 'var(--text-muted)', fontWeight: 700,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr
                    key={s.sessionId || s.id || i}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {s.customerName || 'Anonymous'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {(s.sessionId || s.id || '').slice(0, 10)}…
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13 }}>
                      {s.customerPhone || '—'}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: 'var(--accent)20', color: 'var(--accent)',
                      }}>
                        {s.messageCount || s.messagesCount || 0}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {fmtRelative(s.updatedAt || s.lastActiveAt || s.createdAt)}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <button
                        onClick={() => setViewSession(s)}
                        style={{
                          padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--text)', cursor: 'pointer',
                        }}
                      >
                        👁 View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {hasMore && (
              <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={loadMore}
                  disabled={loading}
                  style={{
                    padding: '7px 20px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text)', fontSize: 12,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}

            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      {viewSession && (
        <SessionModal
          rid={rid}
          session={viewSession}
          onClose={() => setViewSession(null)}
        />
      )}
    </div>
  )
}

// ── Add-on Packs Tab ─────────────────────────────────────────────
function AddonPacksTab({ rid, toast }) {
  const { user } = useAuthStore()
  const [packs, setPacks] = useState([])
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [paying, setPaying] = useState(null) // packType being paid

  useEffect(() => {
    chatbotApi.getAddonPacks(rid).then(res => setPacks(Array.isArray(res) ? res : [])).catch(() => {})
    chatbotApi.getStats(rid).then(res => setStats(res)).catch(() => {})
    chatbotApi.getAddonHistory(rid).then(res => setHistory(Array.isArray(res) ? res : [])).catch(() => {})
  }, [rid])

  async function buyPack(pack) {
    setPaying(pack.packType)
    try {
      const loaded = await loadRazorpay()
      if (!loaded) { toast.error('Razorpay load nahi hua'); setPaying(null); return }

      const order = await chatbotApi.createAddonOrder(rid, pack.packType)

      if (order.mock) {
        // Mock mode — directly apply (test/local)
        const verify = await chatbotApi.verifyAddon({
          restaurantId: rid,
          razorpayOrderId: order.orderId,
          razorpayPaymentId: 'pay_MOCK_' + Date.now(),
          razorpaySignature: 'mock_sig',
        })
        toast.success(verify.message || `${pack.credits} messages add ho gaye!`)
        chatbotApi.getStats(rid).then(setStats).catch(() => {})
        chatbotApi.getAddonHistory(rid).then(res => setHistory(Array.isArray(res) ? res : [])).catch(() => {})
        setPaying(null)
        return
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Harmony Bits Private Limited',
        description: `Chatbot Add-on: ${pack.label}`,
        order_id: order.orderId,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#6366f1' },
        handler: async function(response) {
          try {
            const verify = await chatbotApi.verifyAddon({
              restaurantId: rid,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            toast.success(verify.message || `${pack.credits} messages add ho gaye!`)
            chatbotApi.getStats(rid).then(setStats).catch(() => {})
            chatbotApi.getAddonHistory(rid).then(res => setHistory(Array.isArray(res) ? res : [])).catch(() => {})
          } catch (e) {
            toast.error(e.message || 'Payment verify nahi hua')
          }
          setPaying(null)
        },
        modal: { ondismiss: () => setPaying(null) },
      }
      new window.Razorpay(options).open()
    } catch (e) {
      toast.error(e.message || 'Payment start nahi hua')
      setPaying(null)
    }
  }

  const sectionStyle = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '20px 24px', marginBottom: 16,
  }

  return (
    <div style={{ maxWidth: 680 }}>

      {/* Current Usage Banner */}
      {stats && (
        <div style={{ ...sectionStyle, background: 'linear-gradient(135deg, #6366f115, #818cf815)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 This Month's Usage</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)' }}>
                {stats.monthlyUsed}
                <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>
                  {' '}/ {stats.monthlyLimit === 0 ? '∞' : stats.monthlyLimit}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Messages Used</div>
            </div>
            {stats.extraCredits > 0 && (
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#10b981' }}>+{stats.extraCredits}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Bonus Credits</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{stats.totalSessions}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Total Sessions</div>
            </div>
          </div>
          {stats.monthlyLimit > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{
                height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${Math.min(100, (stats.monthlyUsed / stats.monthlyLimit) * 100)}%`,
                  background: stats.monthlyUsed / stats.monthlyLimit > 0.9 ? '#ef4444' : 'var(--accent)',
                  transition: 'width .3s',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {Math.round((stats.monthlyUsed / stats.monthlyLimit) * 100)}% of monthly limit used
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pack Cards */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>💬 Buy Extra Message Credits</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Credits expire the month they're bought — but unused ones roll over. One-time purchase, no subscription.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
          {packs.map(pack => (
            <div key={pack.packType} style={{
              border: pack.popular ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 12, padding: '18px 16px', position: 'relative',
              background: pack.popular ? 'var(--accent)08' : 'var(--bg-page)',
              textAlign: 'center',
            }}>
              {pack.popular && (
                <div style={{
                  position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700,
                  padding: '2px 10px', borderRadius: 10,
                }}>BEST VALUE</div>
              )}
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>
                {pack.credits.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Messages</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>₹{pack.priceInr}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 14 }}>
                ₹{(pack.priceInr / pack.credits * 1000).toFixed(1)} per 1000 msgs
              </div>
              <button
                onClick={() => buyPack(pack)}
                disabled={paying === pack.packType}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                  background: paying === pack.packType ? 'var(--border)' : 'var(--accent)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: paying === pack.packType ? 'not-allowed' : 'pointer',
                }}
              >
                {paying === pack.packType ? '⏳ Processing…' : 'Buy Now'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase History */}
      {history.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🧾 Purchase History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((h, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8, background: 'var(--bg-page)',
                border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>+{h.credits} messages</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {h.packType?.replace('_', ' ')} · {new Date(h.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
                <div style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: h.applied ? '#10b98120' : '#f59e0b20',
                  color: h.applied ? '#10b981' : '#f59e0b',
                }}>
                  {h.applied ? 'Applied' : 'Pending'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Referral Tab ─────────────────────────────────────────────────
function ReferralTab({ rid, toast }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [refCode, setRefCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    referralApi.getStats(rid)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [rid])

  async function applyCode() {
    if (!refCode.trim()) return
    setApplying(true)
    try {
      const res = await referralApi.apply(rid, refCode.trim().toUpperCase())
      if (res.success) {
        toast.success(res.message || 'Referral applied! 500 credits dono ko mile.')
        referralApi.getStats(rid).then(setStats).catch(() => {})
        setRefCode('')
      } else {
        toast.error(res.message || 'Invalid code')
      }
    } catch (e) {
      toast.error(e.message || 'Referral apply nahi hua')
    } finally {
      setApplying(false)
    }
  }

  function copyCode() {
    if (!stats?.referralCode) return
    navigator.clipboard.writeText(stats.referralCode).then(() => {
      setCopied(true)
      toast.success('Referral code copied!')
      setTimeout(() => setCopied(false), 2500)
    }).catch(() => toast.error('Copy failed'))
  }

  function copyLink() {
    if (!stats?.shareLink) return
    navigator.clipboard.writeText(stats.shareLink).then(() => {
      toast.success('Share link copied!')
    }).catch(() => toast.error('Copy failed'))
  }

  const sectionStyle = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '20px 24px', marginBottom: 16,
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  )

  return (
    <div style={{ maxWidth: 580 }}>

      {/* How it works */}
      <div style={{ ...sectionStyle, background: 'linear-gradient(135deg, #10b98112, #34d39912)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🎁 Refer & Earn</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Apna referral code kisi aur restaurant owner ko do. Jab woh sign up karein aur code use karein —
          <strong style={{ color: 'var(--text)' }}> dono ko 500 chatbot messages (₹200 value)</strong> milenge!
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { step: '1', label: 'Share your code' },
            { step: '2', label: 'Friend signs up' },
            { step: '3', label: 'Both get 500 msgs' },
          ].map(({ step, label }) => (
            <div key={step} style={{ textAlign: 'center', flex: 1, minWidth: 80 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#10b981',
                color: '#fff', fontWeight: 800, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px',
              }}>{step}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Your Code */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Your Referral Code</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <div style={{
            flex: 1, padding: '12px 16px', borderRadius: 10,
            background: 'var(--bg-page)', border: '2px dashed var(--accent)',
            fontFamily: 'monospace', fontSize: 20, fontWeight: 800, letterSpacing: 3,
            color: 'var(--accent)', textAlign: 'center',
          }}>
            {stats?.referralCode || '—'}
          </div>
          <button
            onClick={copyCode}
            style={{
              padding: '12px 18px', borderRadius: 10, border: '1px solid var(--border)',
              background: copied ? '#10b981' : 'var(--bg-page)', color: copied ? '#fff' : 'var(--text)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: '.2s', whiteSpace: 'nowrap',
            }}
          >{copied ? '✅ Copied!' : '📋 Copy'}</button>
        </div>
        <button
          onClick={copyLink}
          style={{
            width: '100%', padding: '9px', borderRadius: 9, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔗 Copy Share Link
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Your Referral Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { value: stats.totalReferred, label: 'Restaurants Referred' },
              { value: stats.totalRewarded, label: 'Rewards Earned' },
              { value: `+${stats.creditsEarned}`, label: 'Total Credits Earned' },
            ].map(({ value, label }) => (
              <div key={label} style={{
                textAlign: 'center', padding: '14px 8px', borderRadius: 10,
                background: 'var(--bg-page)', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
          {stats.currentExtraCredits > 0 && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: '#10b98115', border: '1px solid #10b98140',
              fontSize: 12, color: '#10b981', fontWeight: 600,
            }}>
              ✅ Current Balance: <strong>+{stats.currentExtraCredits}</strong> extra chatbot credits active
            </div>
          )}
        </div>
      )}

      {/* Apply a referral code */}
      <div style={sectionStyle}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Apply a Referral Code</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Kisi aur ne aapko refer kiya? Unka code enter karo — dono ko 500 messages milenge.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={refCode}
            onChange={e => setRefCode(e.target.value.toUpperCase())}
            placeholder="e.g. HRM123"
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--text)', fontSize: 14, fontFamily: 'monospace',
              fontWeight: 700, letterSpacing: 2,
            }}
          />
          <button
            onClick={applyCode}
            disabled={applying || !refCode.trim()}
            style={{
              padding: '10px 20px', borderRadius: 9, border: 'none',
              background: applying || !refCode.trim() ? 'var(--border)' : '#10b981',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: applying || !refCode.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {applying ? '⏳ Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
export default function Chatbot() {
  const { restaurantId: rid } = useAuthStore()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('config')

  const tabs = [
    { key: 'config',   label: '⚙️ Config'   },
    { key: 'preview',  label: '🔍 Preview'  },
    { key: 'sessions', label: '📋 Sessions' },
    { key: 'addons',   label: '💳 Add-on Packs' },
    { key: 'referral', label: '🎁 Refer & Earn' },
  ]

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🤖 Chatbot</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0 }}>
          AI-powered customer feedback &amp; support widget for your restaurant
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border)', paddingBottom: 0,
        overflowX: 'auto',
      }}>
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: '9px 16px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            fontSize: 13, fontWeight: 600, background: 'transparent',
            color: activeTab === key ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1, transition: '.15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'config'   && <ConfigTab      rid={rid} toast={toast} />}
      {activeTab === 'preview'  && <PreviewTab     rid={rid} toast={toast} />}
      {activeTab === 'sessions' && <SessionsTab    rid={rid} toast={toast} />}
      {activeTab === 'addons'   && <AddonPacksTab  rid={rid} toast={toast} />}
      {activeTab === 'referral' && <ReferralTab    rid={rid} toast={toast} />}
    </div>
  )
}
