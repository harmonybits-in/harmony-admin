import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function OndcConfig() {
  const [config, setConfig]   = useState({ subscriberId: '', uniqueKeyId: '', bppId: '', bppUri: '', enabled: false })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    api.get('/ondc/admin/config')
      .then(data => { if (data) setConfig(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function set(key, val) { setConfig(c => ({ ...c, [key]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/ondc/admin/config', config)
      alert('ONDC config saved!')
    } catch (err) {
      alert(err.message ?? 'Save failed')
    }
    setSaving(false)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: '#F7F8FA', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1C1C1C' }}>ONDC Integration</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>Open Network for Digital Commerce configuration</p>
          </div>
          <span style={{
            padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: config.enabled ? '#dcfce7' : '#f3f4f6',
            color: config.enabled ? '#16A34A' : '#6b7280',
          }}>
            {config.enabled ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Info card */}
      <div style={{
        background: '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: 10,
        padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#1e40af', lineHeight: 1.6,
      }}>
        <strong>ONDC kya hai?</strong> ONDC aapke restaurant ko Beckn protocol network pe list karta hai.
        Ek baar configure karne ke baad customers Zomato/Swiggy se alag ek government-backed network se
        order kar sakte hain — zero commission.
      </div>

      {/* Config card */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading…</div>
        ) : (
          <form onSubmit={handleSave}>
            {/* Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
              paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1C' }}>ONDC Integration</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  {config.enabled ? 'Restaurant ONDC network pe live hai' : 'Abhi ONDC disabled hai'}
                </div>
              </div>
              <div onClick={() => set('enabled', !config.enabled)} style={{
                width: 52, height: 28, borderRadius: 14, cursor: 'pointer',
                background: config.enabled ? '#FF5A00' : '#d1d5db',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  position: 'absolute', top: 4, left: config.enabled ? 28 : 4,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left 0.2s',
                }} />
              </div>
            </div>

            {/* Fields — only when enabled */}
            {config.enabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <label style={labelStyle}>
                  Subscriber ID
                  <input value={config.subscriberId} onChange={e => set('subscriberId', e.target.value)}
                    placeholder="yourdomain.com/bpp" style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Unique Key ID
                  <input value={config.uniqueKeyId} onChange={e => set('uniqueKeyId', e.target.value)}
                    placeholder="Your Ed25519 key ID" style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  BPP ID
                  <input value={config.bppId} onChange={e => set('bppId', e.target.value)}
                    placeholder="bpp.harmonybits.in" style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  BPP URI
                  <input value={config.bppUri} onChange={e => set('bppUri', e.target.value)}
                    placeholder="https://api.harmonybits.in/api/v1/ondc" style={inputStyle} />
                </label>
              </div>
            )}

            <button type="submit" disabled={saving} style={{
              background: '#FF5A00', color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 22px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving…' : 'Save Config'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151', fontWeight: 500,
}

const inputStyle = {
  padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14,
  outline: 'none', marginTop: 2,
}
