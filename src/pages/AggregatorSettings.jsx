// src/pages/AggregatorSettings.jsx — Zomato/Swiggy integration via UrbanPiper
import { useState, useEffect } from 'react'
import { aggregatorApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

const API_BASE = (import.meta.env.VITE_API_URL || 'https://api.harmonybits.in') + '/api/v1'

export default function AggregatorSettings() {
  const { restaurantId } = useAuthStore()
  const { showToast } = useToast()

  const [config, setConfig]   = useState({ enabled: false, upUsername: '', upApiKey: '', upBizLocationId: '', webhookSecret: '' })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [showKey, setShowKey] = useState(false)

  const webhookUrl = `${API_BASE}/aggregator/${restaurantId}/webhook`

  useEffect(() => {
    aggregatorApi.getConfig(restaurantId)
      .then(d => setConfig({
        enabled:         d.enabled ?? false,
        upUsername:      d.upUsername ?? '',
        upApiKey:        d.upApiKey ?? '',
        upBizLocationId: d.upBizLocationId ?? '',
        webhookSecret:   d.webhookSecret ?? '',
      }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [restaurantId])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await aggregatorApi.saveConfig(restaurantId, config)
      showToast('Aggregator settings saved!', 'success')
    } catch (err) {
      showToast(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const card = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 24 }
  const label = { display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }
  const input = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 14, boxSizing: 'border-box', color: '#222', background: '#fafafa', outline: 'none' }

  if (loading) return <div style={{ padding: 40, color: '#999', textAlign: 'center' }}>Loading…</div>

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>🍽️ Aggregator Integration</div>
        <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          Zomato &amp; Swiggy orders directly in HarmoneyEats — via UrbanPiper
        </div>
      </div>

      {/* How it works */}
      <div style={{ ...card, background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '1px solid #bae6fd' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0369a1', marginBottom: 12 }}>📋 Setup Steps</div>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#0c4a6e', lineHeight: 2 }}>
          <li>Sign up at <strong>urbanpiper.com</strong> — connect your Zomato &amp; Swiggy accounts there</li>
          <li>In UrbanPiper dashboard → Settings → POS Integration → enter the Webhook URL below</li>
          <li>Enter your UrbanPiper credentials below and save</li>
          <li>Orders from Zomato/Swiggy will now appear in <strong>Online Orders</strong> automatically</li>
          <li>Accept/Reject here → status pushed back to Zomato/Swiggy automatically</li>
        </ol>
      </div>

      {/* Webhook URL */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 12 }}>🔗 Your Webhook URL</div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          Copy this URL into UrbanPiper → POS Integration → Webhook URL
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <code style={{
            flex: 1, padding: '10px 14px', borderRadius: 10, background: '#f1f5f9',
            border: '1px solid #e2e8f0', fontSize: 12, color: '#334155',
            wordBreak: 'break-all', lineHeight: 1.6,
          }}>
            {webhookUrl}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(webhookUrl); showToast('Copied!', 'success') }}
            style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            Copy
          </button>
        </div>
      </div>

      {/* Config form */}
      <form onSubmit={handleSave}>
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>⚙️ UrbanPiper Credentials</div>

          {/* Enable toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: config.enabled ? '#f0fdf4' : '#f8fafc', border: `1.5px solid ${config.enabled ? '#86efac' : '#e2e8f0'}`, marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: config.enabled ? '#15803d' : '#475569' }}>
                {config.enabled ? '✅ Integration Active' : '⏸ Integration Disabled'}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {config.enabled ? 'Zomato/Swiggy orders will appear in Online Orders' : 'Enable to start receiving aggregator orders'}
              </div>
            </div>
            <div
              onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
              style={{
                width: 48, height: 26, borderRadius: 13, cursor: 'pointer', flexShrink: 0,
                background: config.enabled ? '#22c55e' : '#cbd5e1',
                position: 'relative', transition: 'background .2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: config.enabled ? 24 : 3,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={label}>UrbanPiper Username</label>
              <input style={input} placeholder="e.g. my_restaurant"
                value={config.upUsername}
                onChange={e => setConfig(c => ({ ...c, upUsername: e.target.value }))} />
            </div>
            <div>
              <label style={label}>UrbanPiper Business Location ID</label>
              <input style={input} placeholder="e.g. biz_loc_abc123"
                value={config.upBizLocationId}
                onChange={e => setConfig(c => ({ ...c, upBizLocationId: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={label}>UrbanPiper API Key</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...input, flex: 1 }} type={showKey ? 'text' : 'password'}
                placeholder="UrbanPiper API key"
                value={config.upApiKey}
                onChange={e => setConfig(c => ({ ...c, upApiKey: e.target.value }))} />
              <button type="button" onClick={() => setShowKey(v => !v)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e0e0e0', background: '#f8fafc', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={label}>Webhook Secret <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional — for signature verification)</span></label>
            <input style={input} type="password" placeholder="Leave blank to skip signature check"
              value={config.webhookSecret}
              onChange={e => setConfig(c => ({ ...c, webhookSecret: e.target.value }))} />
          </div>
        </div>

        <button type="submit" disabled={saving} style={{
          width: '100%', padding: 14, borderRadius: 12, border: 'none',
          background: saving ? '#e0e0e0' : '#e53e3e', color: '#fff',
          fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
        }}>
          {saving ? 'Saving…' : 'Save Aggregator Settings'}
        </button>
      </form>

      {/* Platform badges */}
      <div style={{ ...card, marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 14 }}>📦 Supported Platforms via UrbanPiper</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { name: 'Zomato', color: '#ef4444', icon: '🔴' },
            { name: 'Swiggy', color: '#f97316', icon: '🟠' },
            { name: 'Magicpin', color: '#8b5cf6', icon: '✨' },
            { name: 'EatSure', color: '#06b6d4', icon: '🟦' },
            { name: 'Thrive', color: '#10b981', icon: '🟢' },
          ].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: p.color + '15', border: `1px solid ${p.color}40`, fontSize: 13, fontWeight: 600, color: p.color }}>
              {p.icon} {p.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
