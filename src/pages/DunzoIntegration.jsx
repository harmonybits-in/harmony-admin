// src/pages/DunzoIntegration.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = () => (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function authHeaders() {
  const { token } = useAuthStore.getState()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return d }
}

// ── Status badge colours ────────────────────────────────────────────────────
const STATUS_META = {
  CREATED:        { color: '#60a5fa', bg: '#1e3a5f' },
  RUNNER_ACCEPTED:{ color: '#a78bfa', bg: '#2e1f5e' },
  REACHED_FOR_PICKUP:{ color: '#f59e0b', bg: '#451a03' },
  PICKED_UP:      { color: '#34d399', bg: '#052e16' },
  DELIVERED:      { color: '#22c55e', bg: '#052e16' },
  CANCELLED:      { color: '#ef4444', bg: '#450a0a' },
  FAILED:         { color: '#f87171', bg: '#450a0a' },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { color: '#94a3b8', bg: '#1e293b' }
  return (
    <span style={{
      fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
      background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
    }}>
      {status || 'UNKNOWN'}
    </span>
  )
}

// ── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0 }} />
      <span onClick={() => onChange(!value)} style={{
        position: 'absolute', inset: 0, borderRadius: 24,
        background: value ? '#3b82f6' : '#475569', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: value ? 22 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s',
        }} />
      </span>
    </label>
  )
}

// ── Create Delivery Modal ───────────────────────────────────────────────────
function CreateDeliveryModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    billId: '',
    pickupName: '', pickupPhone: '', pickupAddress: '',
    dropName: '', dropPhone: '', dropAddress: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.billId.trim()) { setErr('Bill ID is required'); return }
    if (!form.pickupAddress.trim() || !form.dropAddress.trim()) {
      setErr('Pickup and drop addresses are required'); return
    }
    setSaving(true); setErr('')
    try {
      const res = await fetch(`${BASE()}/dunzo/deliveries`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          billId: Number(form.billId),
          pickupDetails: { name: form.pickupName, phone: form.pickupPhone, address: form.pickupAddress },
          dropDetails:   { name: form.dropName,   phone: form.dropPhone,   address: form.dropAddress },
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.message || 'Failed to create delivery')
      }
      const data = await res.json()
      onCreated(data)
      onClose()
    } catch (e) { setErr(e.message || 'Error') }
    finally { setSaving(false) }
  }

  const inp = {
    background: '#334155', border: '1px solid #475569', color: '#fff',
    padding: '8px 12px', borderRadius: 6, width: '100%', fontSize: 13,
    boxSizing: 'border-box',
  }
  const lbl = { fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 4, letterSpacing: '0.05em' }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: '#0009', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 14, padding: '1.5rem',
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px #0008', border: '1px solid #334155',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Create Test Delivery</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>BILL ID</label>
            <input type="number" value={form.billId} onChange={e => set('billId', e.target.value)} placeholder="e.g. 1023" style={inp} />
          </div>

          <div style={{ color: '#60a5fa', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', marginTop: 4 }}>PICKUP DETAILS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>NAME</label><input value={form.pickupName} onChange={e => set('pickupName', e.target.value)} placeholder="Store name" style={inp} /></div>
            <div><label style={lbl}>PHONE</label><input value={form.pickupPhone} onChange={e => set('pickupPhone', e.target.value)} placeholder="+91..." style={inp} /></div>
          </div>
          <div><label style={lbl}>PICKUP ADDRESS</label><input value={form.pickupAddress} onChange={e => set('pickupAddress', e.target.value)} placeholder="Full address" style={inp} /></div>

          <div style={{ color: '#22c55e', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', marginTop: 4 }}>DROP DETAILS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>NAME</label><input value={form.dropName} onChange={e => set('dropName', e.target.value)} placeholder="Customer name" style={inp} /></div>
            <div><label style={lbl}>PHONE</label><input value={form.dropPhone} onChange={e => set('dropPhone', e.target.value)} placeholder="+91..." style={inp} /></div>
          </div>
          <div><label style={lbl}>DROP ADDRESS</label><input value={form.dropAddress} onChange={e => set('dropAddress', e.target.value)} placeholder="Full address" style={inp} /></div>

          {err && (
            <div style={{ background: '#450a0a', border: '1px solid #ef444440', borderRadius: 8, padding: '8px 12px', color: '#ef4444', fontSize: 12 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={handleSubmit} disabled={saving} style={{
              flex: 1, background: saving ? '#475569' : '#3b82f6', color: '#fff',
              border: 'none', borderRadius: 8, padding: '10px 16px',
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              {saving ? 'Creating...' : 'Create Delivery'}
            </button>
            <button onClick={onClose} style={{
              padding: '10px 16px', borderRadius: 8, border: '1px solid #475569',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
            }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Status Flow Visualization ───────────────────────────────────────────────
const FLOW_STEPS = ['CREATED', 'RUNNER_ACCEPTED', 'REACHED_FOR_PICKUP', 'PICKED_UP', 'DELIVERED']

function StatusFlow({ currentStatus }) {
  const currentIdx = FLOW_STEPS.indexOf(currentStatus)
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'FAILED'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
      {FLOW_STEPS.map((step, i) => {
        const done   = i < currentIdx
        const active = i === currentIdx && !isCancelled
        const color  = isCancelled ? '#475569' : done ? '#22c55e' : active ? '#3b82f6' : '#334155'
        const textColor = isCancelled ? '#64748b' : done ? '#22c55e' : active ? '#60a5fa' : '#64748b'
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < FLOW_STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? '#22c55e' : active ? '#3b82f620' : '#1e293b',
                border: `2px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: done ? '#fff' : color, fontWeight: 700,
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 9, color: textColor, whiteSpace: 'nowrap', fontWeight: active ? 700 : 400 }}>
                {step.replace(/_/g, ' ')}
              </span>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, background: done ? '#22c55e' : '#334155',
                margin: '0 4px', marginBottom: 20, minWidth: 20,
              }} />
            )}
          </div>
        )
      })}
      {isCancelled && (
        <div style={{ marginLeft: 12, padding: '4px 10px', borderRadius: 8,
          background: '#450a0a', color: '#ef4444', fontSize: 11, fontWeight: 700 }}>
          {currentStatus}
        </div>
      )}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function DunzoIntegration() {
  const { restaurantId } = useAuthStore()

  // Config state
  const [config, setConfig] = useState({
    clientId: '', clientSecret: '', webhookSecret: '',
    environment: 'STAGING', enabled: false,
  })
  const [showSecret, setShowSecret]     = useState(false)
  const [showWebhook, setShowWebhook]   = useState(false)
  const [configLoading, setConfigLoading] = useState(true)
  const [configSaving, setConfigSaving] = useState(false)
  const [configMsg, setConfigMsg]       = useState(null)  // {type:'success'|'error', text}

  // Deliveries state
  const [deliveries, setDeliveries]     = useState([])
  const [delLoading, setDelLoading]     = useState(true)
  const [showModal, setShowModal]       = useState(false)

  const loadConfig = useCallback(async () => {
    setConfigLoading(true)
    try {
      const res = await fetch(`${BASE()}/dunzo/config`, { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        setConfig(prev => ({ ...prev, ...d }))
      }
    } catch { /* ignore */ }
    finally { setConfigLoading(false) }
  }, [])

  const loadDeliveries = useCallback(async () => {
    setDelLoading(true)
    try {
      const res = await fetch(`${BASE()}/dunzo/deliveries`, { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        setDeliveries(Array.isArray(d) ? d : d.content || [])
      }
    } catch { /* ignore */ }
    finally { setDelLoading(false) }
  }, [])

  useEffect(() => {
    loadConfig()
    loadDeliveries()
  }, [loadConfig, loadDeliveries])

  async function handleSaveConfig() {
    setConfigSaving(true); setConfigMsg(null)
    try {
      const res = await fetch(`${BASE()}/dunzo/config`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.message || 'Save failed')
      }
      setConfigMsg({ type: 'success', text: 'Configuration saved!' })
    } catch (e) {
      setConfigMsg({ type: 'error', text: e.message || 'Error saving config' })
    } finally { setConfigSaving(false) }
  }

  function handleDeliveryCreated(d) {
    setDeliveries(prev => [d, ...prev])
  }

  const cardStyle = {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem',
  }
  const inp = {
    background: '#334155', border: '1px solid #475569', color: '#fff',
    padding: '8px 12px', borderRadius: 6, fontSize: 13, boxSizing: 'border-box',
  }
  const lbl = { fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 5, letterSpacing: '0.05em' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Dunzo Delivery Integration</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Configure Dunzo API and manage active deliveries</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
          padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          + Create Test Delivery
        </button>
      </div>

      {/* Config Card */}
      <div style={cardStyle}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 16 }}>
          DUNZO API CONFIGURATION
        </div>
        {configLoading ? (
          <div style={{ color: '#64748b', fontSize: 13 }}>Loading config...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>CLIENT ID</label>
                <input
                  value={config.clientId || ''}
                  onChange={e => setConfig(c => ({ ...c, clientId: e.target.value }))}
                  placeholder="Dunzo Client ID"
                  style={{ ...inp, width: '100%' }}
                />
              </div>
              <div>
                <label style={lbl}>CLIENT SECRET</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={config.clientSecret || ''}
                    onChange={e => setConfig(c => ({ ...c, clientSecret: e.target.value }))}
                    placeholder="Client Secret"
                    style={{ ...inp, width: '100%', paddingRight: 70 }}
                  />
                  <button onClick={() => setShowSecret(s => !s)} style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11,
                  }}>{showSecret ? 'Hide' : 'Show'}</button>
                </div>
              </div>
            </div>

            <div>
              <label style={lbl}>WEBHOOK SECRET</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showWebhook ? 'text' : 'password'}
                  value={config.webhookSecret || ''}
                  onChange={e => setConfig(c => ({ ...c, webhookSecret: e.target.value }))}
                  placeholder="Webhook Secret"
                  style={{ ...inp, width: '100%', maxWidth: 360, paddingRight: 70 }}
                />
                <button onClick={() => setShowWebhook(s => !s)} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11,
                }}>{showWebhook ? 'Hide' : 'Show'}</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Environment toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: config.environment === 'STAGING' ? '#f59e0b' : '#64748b', fontWeight: 600 }}>STAGING</span>
                <Toggle
                  value={config.environment === 'PRODUCTION'}
                  onChange={v => setConfig(c => ({ ...c, environment: v ? 'PRODUCTION' : 'STAGING' }))}
                />
                <span style={{ fontSize: 12, color: config.environment === 'PRODUCTION' ? '#22c55e' : '#64748b', fontWeight: 600 }}>PRODUCTION</span>
              </div>

              {/* Enable/Disable toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Toggle value={config.enabled} onChange={v => setConfig(c => ({ ...c, enabled: v }))} />
                <span style={{ fontSize: 13, color: config.enabled ? '#22c55e' : '#94a3b8' }}>
                  {config.enabled ? 'Integration Enabled' : 'Integration Disabled'}
                </span>
              </div>
            </div>

            {configMsg && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: configMsg.type === 'success' ? '#052e16' : '#450a0a',
                color: configMsg.type === 'success' ? '#22c55e' : '#ef4444',
                border: `1px solid ${configMsg.type === 'success' ? '#166534' : '#7f1d1d'}`,
              }}>
                {configMsg.text}
              </div>
            )}

            <div>
              <button onClick={handleSaveConfig} disabled={configSaving} style={{
                background: configSaving ? '#475569' : '#3b82f6', color: '#fff',
                border: 'none', borderRadius: 8, padding: '9px 20px',
                cursor: configSaving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
              }}>
                {configSaving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Flow */}
      <div style={cardStyle}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 14 }}>
          DELIVERY STATUS FLOW
        </div>
        <StatusFlow currentStatus="PICKED_UP" />
      </div>

      {/* Active Deliveries */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>ACTIVE DELIVERIES</div>
          <button onClick={loadDeliveries} style={{
            background: 'none', border: '1px solid #334155', borderRadius: 6,
            color: '#94a3b8', cursor: 'pointer', fontSize: 11, padding: '4px 10px',
          }}>Refresh</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Dunzo Order ID', 'Bill ID', 'Status', 'Rider Name', 'Rider Phone', 'Tracking', 'Created At'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: 11,
                    color: '#64748b', fontWeight: 700, borderBottom: '1px solid #334155', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {delLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '13px 16px', borderBottom: '1px solid #334155' }}>
                        <div style={{ height: 12, borderRadius: 4, background: '#334155', width: j === 0 ? 120 : 70 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🛵</div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>No active deliveries</div>
                    <div style={{ fontSize: 12 }}>Create a test delivery to get started</div>
                  </td>
                </tr>
              ) : deliveries.map(d => (
                <tr key={d.id || d.dunzoOrderId}
                  style={{ transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', color: '#60a5fa', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                    {d.dunzoOrderId || '—'}
                  </td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    {d.billId || '—'}
                  </td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155' }}>
                    <StatusBadge status={d.status} />
                  </td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', color: '#fff' }}>
                    {d.riderName || <span style={{ color: '#475569', fontStyle: 'italic' }}>Awaiting</span>}
                  </td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    {d.riderPhone || '—'}
                  </td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155' }}>
                    {d.trackingUrl ? (
                      <a href={d.trackingUrl} target="_blank" rel="noopener noreferrer" style={{
                        color: '#3b82f6', fontSize: 12, textDecoration: 'none',
                      }}>Track →</a>
                    ) : <span style={{ color: '#475569' }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', color: '#64748b', fontSize: 12 }}>
                    {fmtDate(d.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <CreateDeliveryModal
          onClose={() => setShowModal(false)}
          onCreated={handleDeliveryCreated}
        />
      )}
    </div>
  )
}
