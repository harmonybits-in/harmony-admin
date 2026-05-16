// src/pages/ChatWidget.jsx  — PUBLIC standalone chat widget (no auth required)
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

async function publicRequest(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  })
  if (!res.ok) {
    let msg = `${res.status}`
    try {
      const ct = res.headers.get('content-type') || ''
      const body = ct.includes('application/json') ? await res.json() : await res.text()
      msg = body?.message || body?.error || (typeof body === 'string' && body) || msg
    } catch {}
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now()
}

// ── Typing indicator dots ─────────────────────────────────────────
function TypingDots({ color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0,
      }}>🤖</div>
      <div style={{
        padding: '8px 14px', borderRadius: '14px 14px 14px 4px',
        background: '#fff', border: '1px solid #e8eaed',
        display: 'flex', gap: 4, alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: '#bbb',
            display: 'inline-block',
            animation: `chatwidgetbounce 1.2s ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes chatwidgetbounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Render message text — markdown bold + URLs as buttons ────────
function renderContent(text) {
  // Split into lines, then process each line for bold + URLs
  return text.split('\n').map((line, li) => {
    const parts = line.split(/(https?:\/\/[^\s]+|\*\*[^*]+\*\*)/g)
    const rendered = parts.map((part, i) => {
      if (/^\*\*[^*]+\*\*$/.test(part))
        return <strong key={i}>{part.slice(2, -2)}</strong>
      if (/^https?:\/\//.test(part)) {
        const url = part.replace(/[.,!?:;'"]+$/, '')
        const trailing = part.slice(url.length)
        const isGoogle = /g\.page|google\.com\/maps|google\.com\/search/i.test(url)
        const isMaps = /maps\.google|google\.com\/maps|\?q=/.test(url)
        return (
          <span key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              margin: '4px 0 2px', padding: '7px 16px',
              borderRadius: 24, border: '1.5px solid #93c5fd',
              background: '#eff6ff', color: '#1d4ed8',
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>
              {isGoogle ? '⭐' : isMaps ? '📍' : '🔗'}
              {isGoogle ? 'Write a Google Review →' : isMaps ? 'Open in Maps →' : 'Open Link →'}
            </a>
            {trailing}
          </span>
        )
      }
      return part ? <span key={i}>{part}</span> : null
    })
    return <span key={li}>{rendered}{li < text.split('\n').length - 1 ? <br /> : null}</span>
  })
}

// ════════════════════════════════════════════════════════════════
export default function ChatWidget() {
  const { restaurantId } = useParams()

  const [config, setConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [configError, setConfigError] = useState(null)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sessionId] = useState(() => generateSessionId())
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [started, setStarted] = useState(false)
  const [confirmedOrderId, setConfirmedOrderId] = useState(null)

  const messagesEndRef = useRef(null)

  // Load public config
  useEffect(() => {
    publicRequest(`/chatbot/${restaurantId}/config/public`)
      .then(res => {
        setConfig(res)
        if (res?.greetingMessage && res?.enabled) {
          setMessages([{ role: 'ASSISTANT', content: res.greetingMessage }])
        }
      })
      .catch(err => setConfigError(err.message))
      .finally(() => setLoadingConfig(false))
  }, [restaurantId])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const accentColor = config?.widgetColor || '#e53e3e'
  const title       = config?.widgetTitle  || 'Chat with us'

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'USER', content: userMsg }])
    setSending(true)
    try {
      const res = await publicRequest(`/chatbot/${restaurantId}/message`, {
        method: 'POST',
        body: JSON.stringify({
          message: userMsg,
          sessionId,
          customerName: customerName || 'Guest',
          customerPhone: customerPhone || '',
        }),
      })
      const reply = res?.reply || res?.message || res?.content || 'Sorry, something went wrong.'
      setMessages(m => [...m, { role: 'ASSISTANT', content: reply }])
      if (res?.orderId) setConfirmedOrderId(res.orderId)
    } catch (err) {
      setMessages(m => [...m, {
        role: 'ASSISTANT',
        content: '⚠️ ' + (err.message || 'Failed to get response. Please try again.'),
      }])
    } finally {
      setSending(false)
    }
  }

  // ── Loading ──
  if (loadingConfig) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f7f8fa', fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center', color: '#999' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 14 }}>Loading chat…</div>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (configError) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f7f8fa', fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center', color: '#888', maxWidth: 320, padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Oops!</div>
          <div style={{ fontSize: 13 }}>{configError}</div>
        </div>
      </div>
    )
  }

  // ── Disabled ──
  if (!config?.enabled) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f7f8fa', fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          textAlign: 'center', color: '#666', padding: 32, borderRadius: 16,
          background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          maxWidth: 360,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Chat is not available</div>
          <div style={{ fontSize: 13, color: '#999' }}>
            The chat assistant is currently offline. Please contact us directly or try again later.
          </div>
        </div>
      </div>
    )
  }

  // ── Pre-chat form (collect name/phone before starting) ──
  if (!started) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#f7f8fa', fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: 16,
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, overflow: 'hidden',
          width: '100%', maxWidth: 400,
          boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
        }}>
          {/* Header */}
          <div style={{
            background: accentColor, padding: '28px 24px 24px',
            textAlign: 'center', color: '#fff',
          }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🤖</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
              We typically reply instantly
            </div>
          </div>

          {/* Pre-chat form */}
          <div style={{ padding: '24px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#222' }}>
              Let us know who you are
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 5, fontWeight: 600 }}>
                Your Name <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1px solid #e0e0e0', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                  color: '#222', background: '#fafafa',
                }}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 5, fontWeight: 600 }}>
                Phone Number <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="e.g. 98765 43210"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1px solid #e0e0e0', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                  color: '#222', background: '#fafafa',
                }}
              />
            </div>

            <button
              onClick={() => setStarted(true)}
              style={{
                width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                background: accentColor, color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Start Chat →
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: '#bbb' }}>
          Powered by Harmony Restaurant OS
        </div>
      </div>
    )
  }

  // ── Full chat UI ──
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: '#f7f8fa', fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: 520, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        background: accentColor, padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{title}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>
            {customerName ? `Hi, ${customerName}!` : 'Ask me anything'}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,0.2)', borderRadius: 20,
          padding: '4px 10px',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>Online</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px' }}>
        {messages.map((msg, i) => {
          const isUser = msg.role === 'USER'
          return (
            <div key={i} style={{
              display: 'flex',
              justifyContent: isUser ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end', gap: 8,
              marginBottom: 12,
            }}>
              {!isUser && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: accentColor, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 13, flexShrink: 0,
                }}>🤖</div>
              )}
              <div style={{
                maxWidth: '78%', padding: '10px 14px',
                borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isUser ? accentColor : '#fff',
                color: isUser ? '#fff' : '#222',
                fontSize: 13, lineHeight: 1.6,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                border: isUser ? 'none' : '1px solid #e8eaed',
              }}>
                {renderContent(msg.content)}
              </div>
              {isUser && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#e8eaed', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 13, flexShrink: 0,
                }}>👤</div>
              )}
            </div>
          )
        })}

        {sending && <TypingDots color={accentColor} />}

        {confirmedOrderId && (
          <div style={{
            margin: '8px 0 12px', padding: '14px 16px', borderRadius: 14,
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1.5px solid #86efac',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>✅</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#15803d' }}>Order Confirmed!</span>
            </div>
            <div style={{ fontSize: 13, color: '#166534' }}>
              Order ID: <strong>#{confirmedOrderId}</strong>
            </div>
            <div style={{ fontSize: 11, color: '#4ade80', marginTop: 4 }}>
              WhatsApp confirmation aapke number pe bheja ja raha hai.
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: '#fff', borderTop: '1px solid #e8eaed',
        padding: '10px 14px 12px',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
      }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={sending}
            autoFocus
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 24,
              border: '1px solid #e0e0e0', fontSize: 14,
              outline: 'none', background: '#fafafa', color: '#222',
              transition: 'border .15s',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none',
              background: !input.trim() || sending ? '#e0e0e0' : accentColor,
              color: '#fff', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
              flexShrink: 0, transition: 'background .2s',
            }}
          >➤</button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 10, color: '#ccc', marginTop: 8 }}>
          Powered by Harmony Restaurant OS
        </div>
      </div>
    </div>
  )
}
