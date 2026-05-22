// src/pages/QrPaymentConfig.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

const C = {
  bg: '#0f172a', card: '#1e293b', input: '#334155',
  border: '#475569', text: '#fff', muted: '#94a3b8',
  green: '#22c55e', red: '#ef4444', blue: '#3b82f6',
  amber: '#f59e0b', purple: '#8b5cf6', orange: '#f97316',
}

const PROVIDERS = [
  { key: 'PAYTM',   label: 'PayTM',    color: C.blue,   icon: '💙' },
  { key: 'PHONEPE', label: 'PhonePe',  color: C.purple, icon: '💜' },
  { key: 'BHIM',    label: 'BHIM UPI', color: C.orange, icon: '🟠' },
]
const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map(p => [p.key, p]))

const inputStyle = {
  background: C.input, border: `1px solid ${C.border}`, color: C.text,
  padding: '8px 12px', borderRadius: 6, fontSize: 13, width: '100%',
  boxSizing: 'border-box',
}
const labelStyle = { fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: 600, display: 'block' }
const btnStyle   = (bg = C.blue) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
})

async function apiReq(path, opts = {}) {
  const token = localStorage.getItem('harmoney_token') || ''
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  })
  if (!res.ok) {
    let msg = `Error ${res.status}`
    try { const b = await res.json(); msg = b.message || b.error || msg } catch {}
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('json') ? res.json() : res.text()
}

const BLANK_FORM = { provider: 'PAYTM', merchantId: '', merchantKey: '', vpa: '', displayName: '', enabled: true }

export default function QrPaymentConfig() {
  const { restaurantId } = useAuthStore()
  const [configs, setConfigs]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState({ ...BLANK_FORM })
  const [saving, setSaving]         = useState(false)
  const [formErr, setFormErr]       = useState('')
  const [showKey, setShowKey]       = useState(false)

  // Test QR state
  const [testAmount, setTestAmount] = useState('')
  const [testProvider, setTestProvider] = useState('PAYTM')
  const [testOrderId, setTestOrderId]   = useState('')
  const [testResult, setTestResult]     = useState(null)
  const [testLoading, setTestLoading]   = useState(false)
  const [testErr, setTestErr]           = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiReq('/qr-payment/configs')
      setConfigs(Array.isArray(data) ? data : [])
    } catch { setConfigs([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(e) {
    e.preventDefault()
    setFormErr('')
    if (!form.vpa && !form.merchantId) { setFormErr('Enter VPA or Merchant ID'); return }
    setSaving(true)
    try {
      await apiReq('/qr-payment/configs', { method: 'POST', body: JSON.stringify(form) })
      setShowModal(false)
      setForm({ ...BLANK_FORM })
      load()
    } catch (err) { setFormErr(err.message) }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this config?')) return
    try {
      await apiReq(`/qr-payment/configs/${id}`, { method: 'DELETE' })
      load()
    } catch (err) { alert(err.message) }
  }

  async function handleTestQr(e) {
    e.preventDefault()
    setTestErr('')
    setTestResult(null)
    if (!testAmount || parseFloat(testAmount) <= 0) { setTestErr('Enter a valid amount'); return }
    setTestLoading(true)
    try {
      const res = await apiReq('/qr-payment/generate-qr', {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(testAmount), provider: testProvider, orderId: testOrderId || undefined }),
      })
      setTestResult(res)
    } catch (err) { setTestErr(err.message) }
    setTestLoading(false)
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'sans-serif', color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>PayTM / PhonePe Integration</h1>
          <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>
            Configure QR payment providers for your restaurant
          </p>
        </div>
        <button onClick={() => { setForm({ ...BLANK_FORM }); setFormErr(''); setShowModal(true) }}
          style={btnStyle()}>
          + Add Provider
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#1c1a03', border: `1px solid ${C.amber}`, borderRadius: 8,
        padding: '10px 14px', marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <span style={{ fontSize: 12, color: C.amber }}>
          Mock integration — connect real PayTM / PhonePe API credentials for production use.
        </span>
      </div>

      {/* Provider Cards */}
      {loading && <div style={{ color: C.muted, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Loading configs...</div>}

      {!loading && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
          {PROVIDERS.map(p => {
            const cfg = configs.find(c => c.provider === p.key)
            return (
              <div key={p.key} style={{
                background: C.card, border: `1px solid ${cfg ? p.color : C.border}`,
                borderRadius: 12, padding: '20px 22px', flex: 1, minWidth: 220,
                borderTop: `3px solid ${p.color}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>{p.icon}</span>
                    <span style={{ color: p.color }}>{p.label}</span>
                  </div>
                  {cfg && (
                    <span style={{
                      background: cfg.enabled ? '#052e16' : '#2a0d0d',
                      color: cfg.enabled ? C.green : C.red,
                      border: `1px solid ${cfg.enabled ? C.green : C.red}`,
                      borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      {cfg.enabled ? 'Active' : 'Disabled'}
                    </span>
                  )}
                </div>

                {cfg ? (
                  <>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                      VPA: <span style={{ color: C.text, fontWeight: 600 }}>{cfg.vpa || '—'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                      Merchant ID: <span style={{ color: C.text, fontWeight: 600 }}>{cfg.merchantId || '—'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
                      Display: <span style={{ color: C.text }}>{cfg.displayName || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => {
                        setForm({
                          provider: cfg.provider, merchantId: cfg.merchantId || '',
                          merchantKey: '', vpa: cfg.vpa || '',
                          displayName: cfg.displayName || '', enabled: cfg.enabled,
                        })
                        setFormErr('')
                        setShowModal(true)
                      }} style={{ ...btnStyle(p.color), padding: '6px 12px', fontSize: 12 }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(cfg.id)}
                        style={{ ...btnStyle(C.red), padding: '6px 12px', fontSize: 12 }}>
                        Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                    Not configured
                    <br />
                    <button onClick={() => { setForm({ ...BLANK_FORM, provider: p.key }); setFormErr(''); setShowModal(true) }}
                      style={{ ...btnStyle(p.color), padding: '6px 12px', fontSize: 12, marginTop: 10 }}>
                      + Configure
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Test QR Generator */}
      <div style={{ background: C.card, borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Test QR Generator</div>
        <p style={{ fontSize: 12, color: C.muted, margin: '0 0 16px' }}>
          Generate a UPI payment link to verify your integration
        </p>
        <form onSubmit={handleTestQr}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={labelStyle}>Amount (₹)</label>
              <input type="number" min="1" step="0.01" placeholder="100.00"
                value={testAmount} onChange={e => setTestAmount(e.target.value)}
                style={inputStyle} required />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={labelStyle}>Provider</label>
              <select value={testProvider} onChange={e => setTestProvider(e.target.value)} style={inputStyle}>
                {PROVIDERS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={labelStyle}>Order ID (optional)</label>
              <input type="text" placeholder="ORD-001"
                value={testOrderId} onChange={e => setTestOrderId(e.target.value)}
                style={inputStyle} />
            </div>
            <button type="submit" disabled={testLoading}
              style={{ ...btnStyle(C.green), opacity: testLoading ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              {testLoading ? 'Generating...' : 'Generate Payment Link'}
            </button>
          </div>
        </form>

        {testErr && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{testErr}</div>}

        {testResult && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              background: '#0d2a1a', border: `1px solid ${C.green}`, borderRadius: 8,
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Payment Link Generated
              </div>
              <div style={{
                background: C.input, borderRadius: 6, padding: '10px 12px',
                fontFamily: 'monospace', fontSize: 12, color: C.text, wordBreak: 'break-all',
                marginBottom: 8,
              }}>
                {testResult.upiLink || testResult.message || JSON.stringify(testResult)}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.muted }}>
                <span>Provider: <strong style={{ color: C.text }}>{testResult.provider}</strong></span>
                <span>Amount: <strong style={{ color: C.text }}>₹{testResult.amount}</strong></span>
                <span>Status: <strong style={{ color: testResult.status === 'SUCCESS' ? C.green : C.amber }}>
                  {testResult.status || 'OK'}
                </strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{ background: C.card, borderRadius: 12, padding: 28, width: 460, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Configure Provider</h2>
              <button onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Provider</label>
                <select value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                  style={inputStyle}>
                  {PROVIDERS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>VPA (UPI ID)</label>
                <input type="text" placeholder="merchant@paytm" value={form.vpa}
                  onChange={e => setForm(f => ({ ...f, vpa: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Merchant ID</label>
                <input type="text" placeholder="MID12345" value={form.merchantId}
                  onChange={e => setForm(f => ({ ...f, merchantId: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Merchant Key (API Secret)</label>
                <div style={{ position: 'relative' }}>
                  <input type={showKey ? 'text' : 'password'} placeholder="••••••••"
                    value={form.merchantKey}
                    onChange={e => setForm(f => ({ ...f, merchantKey: e.target.value }))}
                    style={{ ...inputStyle, paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowKey(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14 }}>
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Display Name</label>
                <input type="text" placeholder="My Restaurant" value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <input type="checkbox" id="enabled" checked={form.enabled}
                  onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: C.green }} />
                <label htmlFor="enabled" style={{ fontSize: 13, cursor: 'pointer' }}>Enable this provider</label>
              </div>
              {formErr && <div style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{formErr}</div>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ background: C.input, color: C.text, border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ ...btnStyle(C.green), opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : 'Save Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
