// src/pages/DirectAggregator.jsx — Direct Zomato/Swiggy integration (no UrbanPiper)
import { useState, useEffect } from 'react'
import { directAggregatorApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

const API_BASE = (import.meta.env.VITE_API_URL || 'https://api.harmonybits.in') + '/api/v1'

export default function DirectAggregator() {
  const { restaurantId } = useAuthStore()
  const { showToast } = useToast()

  const [config, setConfig] = useState({
    zomatoEnabled: false, zomatoRestaurantId: '', zomatoWebhookSecret: '',
    swiggyEnabled: false, swiggyRestaurantId: '', swiggyWebhookSecret: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const zomatoWebhookUrl = `${API_BASE}/direct-aggregator/${restaurantId}/zomato/webhook`
  const swiggyWebhookUrl = `${API_BASE}/direct-aggregator/${restaurantId}/swiggy/webhook`

  useEffect(() => {
    directAggregatorApi.getConfig(restaurantId)
      .then(d => setConfig({
        zomatoEnabled:      d.zomatoEnabled ?? false,
        zomatoRestaurantId: d.zomatoRestaurantId ?? '',
        zomatoWebhookSecret:d.zomatoWebhookSecret ?? '',
        swiggyEnabled:      d.swiggyEnabled ?? false,
        swiggyRestaurantId: d.swiggyRestaurantId ?? '',
        swiggyWebhookSecret:d.swiggyWebhookSecret ?? '',
      }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [restaurantId])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await directAggregatorApi.saveConfig(restaurantId, config)
      showToast('Direct aggregator settings saved!', 'success')
    } catch (err) {
      showToast(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const card  = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 20 }
  const label = { display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }
  const input = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 14, boxSizing: 'border-box', background: '#fafafa', outline: 'none' }

  const copyUrl = (url) => { navigator.clipboard.writeText(url); showToast('Copied!', 'success') }

  function ToggleSwitch({ value, onChange }) {
    return (
      <div onClick={onChange} style={{
        width: 48, height: 26, borderRadius: 13, cursor: 'pointer',
        background: value ? '#22c55e' : '#cbd5e1', position: 'relative', transition: 'background .2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 24 : 3,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }} />
      </div>
    )
  }

  function WebhookUrlRow({ label: lbl, url }) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 4 }}>{lbl}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <code style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: 11, color: '#334155', wordBreak: 'break-all' }}>
            {url}
          </code>
          <button type="button" onClick={() => copyUrl(url)}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            Copy
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ padding: 40, color: '#999', textAlign: 'center' }}>Loading…</div>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>⚡ Direct Aggregator Integration</div>
        <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          Connect Zomato &amp; Swiggy directly — no UrbanPiper required. Needs official API partnership with each platform.
        </div>
      </div>

      {/* Info */}
      <div style={{ ...card, background: '#fef9c3', border: '1px solid #fde68a' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>⚠️ Prerequisites</div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#78350f', lineHeight: 1.8 }}>
          <li>Apply for Zomato Partner API access at <strong>developer.zomato.com</strong></li>
          <li>Apply for Swiggy Merchant API at <strong>partner.swiggy.com</strong></li>
          <li>Get your Webhook Secret from their developer dashboard</li>
          <li>Enter the Webhook URLs below in their respective dashboards</li>
        </ul>
      </div>

      {/* Webhook URLs */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔗 Your Webhook URLs</div>
        <WebhookUrlRow label="Zomato Webhook URL" url={zomatoWebhookUrl} />
        <WebhookUrlRow label="Swiggy Webhook URL" url={swiggyWebhookUrl} />
      </div>

      <form onSubmit={handleSave}>
        {/* Zomato */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>🔴 Zomato Direct</div>
            <ToggleSwitch value={config.zomatoEnabled} onChange={() => setConfig(c => ({ ...c, zomatoEnabled: !c.zomatoEnabled }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={label}>Zomato Restaurant ID</label>
              <input style={input} placeholder="e.g. 12345678"
                value={config.zomatoRestaurantId}
                onChange={e => setConfig(c => ({ ...c, zomatoRestaurantId: e.target.value }))} />
            </div>
            <div>
              <label style={label}>Webhook Secret</label>
              <input style={input} type="password" placeholder="From Zomato developer dashboard"
                value={config.zomatoWebhookSecret}
                onChange={e => setConfig(c => ({ ...c, zomatoWebhookSecret: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Swiggy */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#f97316' }}>🟠 Swiggy Direct</div>
            <ToggleSwitch value={config.swiggyEnabled} onChange={() => setConfig(c => ({ ...c, swiggyEnabled: !c.swiggyEnabled }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={label}>Swiggy Restaurant ID</label>
              <input style={input} placeholder="e.g. SW-9876"
                value={config.swiggyRestaurantId}
                onChange={e => setConfig(c => ({ ...c, swiggyRestaurantId: e.target.value }))} />
            </div>
            <div>
              <label style={label}>Webhook Secret (HMAC)</label>
              <input style={input} type="password" placeholder="From Swiggy partner dashboard"
                value={config.swiggyWebhookSecret}
                onChange={e => setConfig(c => ({ ...c, swiggyWebhookSecret: e.target.value }))} />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} style={{
          width: '100%', padding: 14, borderRadius: 12, border: 'none',
          background: saving ? '#e0e0e0' : '#111', color: '#fff',
          fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
        }}>
          {saving ? 'Saving…' : 'Save Direct Aggregator Settings'}
        </button>
      </form>
    </div>
  )
}
