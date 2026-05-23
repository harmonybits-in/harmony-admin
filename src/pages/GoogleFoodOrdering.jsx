// src/pages/GoogleFoodOrdering.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

async function apiFetch(path, token, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    let msg = `${res.status}`
    try {
      const ct = res.headers.get('content-type') || ''
      const body = ct.includes('application/json') ? await res.json() : await res.text()
      msg = body?.message || body?.error || (typeof body === 'string' && body) || msg
    } catch (_) {}
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

const STATUS_COLORS = {
  PENDING:    { bg: '#fff7ed', color: '#92400e' },
  CONFIRMED:  { bg: '#eff6ff', color: '#1d4ed8' },
  PREPARING:  { bg: '#fef3c7', color: '#92400e' },
  READY:      { bg: '#d1fae5', color: '#065f46' },
  COMPLETED:  { bg: '#f0fdf4', color: '#166534' },
  CANCELLED:  { bg: '#fee2e2', color: '#991b1b' },
}

function Toggle({ checked, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 48, height: 26, borderRadius: 13, border: 'none',
          background: checked ? '#10b981' : '#d1d5db',
          position: 'relative', cursor: 'pointer', padding: 0, transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: 3,
          left: checked ? 24 : 3,
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s', display: 'block',
        }} />
      </button>
      {label && <span style={{ fontSize: 14, color: '#374151' }}>{label}</span>}
    </div>
  )
}

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 300,
      background: type === 'error' ? '#fee2e2' : '#d1fae5',
      color: type === 'error' ? '#991b1b' : '#065f46',
      border: `1px solid ${type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
      borderRadius: 10, padding: '12px 20px', fontSize: 14,
      fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    }}>
      {msg}
    </div>
  )
}

const SETUP_STEPS = [
  { n: 1, title: 'Create Google Business Profile', desc: 'Go to business.google.com and verify your restaurant.' },
  { n: 2, title: 'Enable Food Ordering in Google My Business', desc: 'In your Business Profile, navigate to Food Ordering and opt in.' },
  { n: 3, title: 'Enter credentials above', desc: 'Fill in Merchant ID, Location ID, API Key and Webhook Secret in the config form.' },
  { n: 4, title: 'Enable integration and test', desc: 'Toggle the integration on, save, then click "Test Webhook" to verify connectivity.' },
]

export default function GoogleFoodOrdering() {
  const { token, restaurantId } = useAuthStore()

  // config state
  const [config, setConfig]         = useState(null)
  const [loadingCfg, setLoadingCfg] = useState(true)
  const [saving, setSaving]         = useState(false)

  // form fields
  const [merchantId, setMerchantId]         = useState('')
  const [locationId, setLocationId]         = useState('')
  const [apiKey, setApiKey]                 = useState('')
  const [webhookSecret, setWebhookSecret]   = useState('')
  const [showApiKey, setShowApiKey]         = useState(false)
  const [environment, setEnvironment]       = useState('SANDBOX')
  const [isEnabled, setIsEnabled]           = useState(false)

  // orders state
  const [orders, setOrders]         = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  // UI state
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [openStep, setOpenStep]     = useState(null)
  const [toast, setToast]           = useState(null)
  const [error, setError]           = useState(null)

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), [])

  const loadConfig = useCallback(async () => {
    setLoadingCfg(true)
    setError(null)
    try {
      const data = await apiFetch(`/google-food/config?restaurantId=${restaurantId}`, token)
      setConfig(data)
      setMerchantId(data.merchantId || '')
      setLocationId(data.locationId || '')
      setApiKey(data.apiKey || '')
      setWebhookSecret(data.webhookSecret || '')
      setEnvironment(data.environment || 'SANDBOX')
      setIsEnabled(!!data.isEnabled)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingCfg(false)
    }
  }, [restaurantId, token])

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const data = await apiFetch(`/google-food/orders?restaurantId=${restaurantId}`, token)
      setOrders(Array.isArray(data) ? data : [])
    } catch (_) {
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }, [restaurantId, token])

  useEffect(() => {
    loadConfig()
    loadOrders()
  }, [loadConfig, loadOrders])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch(`/google-food/config?restaurantId=${restaurantId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ merchantId, locationId, apiKey, webhookSecret, isEnabled, environment }),
      })
      showToast('Configuration saved')
      loadConfig()
    } catch (err) {
      showToast(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestWebhook() {
    setTestingWebhook(true)
    try {
      await apiFetch(`/google-food/test-webhook?restaurantId=${restaurantId}`, token, { method: 'POST' })
      showToast('Webhook test sent successfully')
    } catch (err) {
      showToast(err.message || 'Webhook test failed', 'error')
    } finally {
      setTestingWebhook(false)
    }
  }

  const statusBadge = (status) => {
    const sc = STATUS_COLORS[status] || { bg: '#f3f4f6', color: '#374151' }
    return (
      <span style={{ ...sc, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
        {status || 'UNKNOWN'}
      </span>
    )
  }

  if (loadingCfg) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center', color: '#6b7280' }}>
        Loading configuration…
      </div>
    )
  }

  if (error && !config) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 16, borderRadius: 10, fontSize: 14 }}>
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>
          Google Food Ordering
        </h1>
        <span style={{
          padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: isEnabled ? '#d1fae5' : '#f3f4f6',
          color: isEnabled ? '#065f46' : '#6b7280',
          border: `1px solid ${isEnabled ? '#6ee7b7' : '#d1d5db'}`,
        }}>
          {isEnabled ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>

      {/* Info Banner */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
        padding: '12px 16px', fontSize: 14, color: '#1e40af', marginBottom: 24,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
        <span>
          Connect your restaurant to Google Food Ordering to accept orders from Google Search and Maps.
          Requires Google Business Profile verification.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Config Form Card */}
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
            Configuration
          </h2>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <label style={labelStyle}>
              Merchant ID
              <input
                value={merchantId}
                onChange={e => setMerchantId(e.target.value)}
                placeholder="google-merchant-id"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Location ID
              <input
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                placeholder="location-id"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              API Key
              <div style={{ position: 'relative' }}>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  style={{ ...inputStyle, paddingRight: 80 }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <label style={labelStyle}>
              Webhook Secret
              <input
                type="password"
                value={webhookSecret}
                onChange={e => setWebhookSecret(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </label>

            {/* Environment Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Environment</span>
              <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid #d1d5db' }}>
                {['SANDBOX', 'PRODUCTION'].map(env => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setEnvironment(env)}
                    style={{
                      padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: environment === env ? (env === 'PRODUCTION' ? '#10b981' : '#3b82f6') : '#fff',
                      color: environment === env ? '#fff' : '#6b7280',
                      transition: 'background 0.15s',
                    }}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>

            {/* Enable Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Enable Integration</span>
              <Toggle checked={isEnabled} onChange={setIsEnabled} />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                background: saving ? '#9ca3af' : '#3b82f6', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 0', cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700, marginTop: 4,
              }}
            >
              {saving ? 'Saving…' : 'Save Configuration'}
            </button>
          </form>
        </div>

        {/* Integration Status Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Integration Status
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Merchant ID', value: config?.merchantId || '—' },
                { label: 'Location ID', value: config?.locationId || '—' },
                { label: 'Environment', value: config?.environment || 'SANDBOX' },
                { label: 'Status', value: config?.isEnabled ? 'Enabled' : 'Disabled' },
                { label: 'Last Synced', value: config?.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleString() : 'Never' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleTestWebhook}
                disabled={testingWebhook}
                style={{
                  flex: 1, background: testingWebhook ? '#f3f4f6' : '#fff', color: '#374151',
                  border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 0',
                  cursor: testingWebhook ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                {testingWebhook ? 'Sending…' : 'Test Webhook'}
              </button>
              <a
                href="https://business.google.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, background: '#fff', color: '#3b82f6', border: '1px solid #bfdbfe',
                  borderRadius: 8, padding: '9px 0', textDecoration: 'none',
                  fontSize: 13, fontWeight: 600, textAlign: 'center', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                Business Profile ↗
              </a>
            </div>
          </div>

          {/* Setup Guide Accordion */}
          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Setup Guide
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SETUP_STEPS.map(step => (
                <div key={step.n} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenStep(openStep === step.n ? null : step.n)}
                    style={{
                      width: '100%', background: openStep === step.n ? '#eff6ff' : '#f9fafb',
                      border: 'none', padding: '11px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                    }}
                  >
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', background: '#3b82f6',
                      color: '#fff', fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {step.n}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>
                      {step.title}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>{openStep === step.n ? '▲' : '▼'}</span>
                  </button>
                  {openStep === step.n && (
                    <div style={{ padding: '10px 14px 14px 48px', fontSize: 13, color: '#6b7280', background: '#fff' }}>
                      {step.desc}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
          Recent Orders via Google Food
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Placed At'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingOrders ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                    No orders received via Google Food yet.
                  </td>
                </tr>
              ) : orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>#{o.googleOrderId || o.id}</span>
                  </td>
                  <td style={tdStyle}>{o.customerName || '—'}</td>
                  <td style={tdStyle}>{o.itemCount ?? '—'} items</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>₹{o.total?.toLocaleString() ?? '—'}</td>
                  <td style={tdStyle}>{statusBadge(o.status)}</td>
                  <td style={{ ...tdStyle, color: '#6b7280' }}>
                    {o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

const cardStyle = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px',
}

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 600, color: '#374151',
}

const inputStyle = {
  padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 14, outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box',
}

const thStyle = {
  padding: '11px 14px', textAlign: 'left', fontSize: 12,
  color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '10px 14px',
}
