// src/pages/DeliveryZones.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

const BASE_URL = () => (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function authHeaders() {
  const { token } = useAuthStore.getState()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN')
}

function Badge({ color, children }) {
  return (
    <span style={{
      fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
      background: (color || '#888') + '22', color: color || '#888',
    }}>
      {children}
    </span>
  )
}

// ── Zone Form Modal ───────────────────────────────────────────────────────
function ZoneModal({ zone, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    zoneName:         zone?.zoneName         || '',
    minKm:            zone?.minKm            ?? 0,
    maxKm:            zone?.maxKm            ?? 5,
    deliveryCharge:   zone?.deliveryCharge   ?? 0,
    estimatedMinutes: zone?.estimatedMinutes ?? 30,
    isActive:         zone?.isActive         ?? true,
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.zoneName.trim()) { toast.error('Zone name required hai'); return }
    if (Number(form.minKm) >= Number(form.maxKm)) {
      toast.error('Max KM, Min KM se zyada hona chahiye')
      return
    }
    setSaving(true)
    try {
      const url = zone?.id
        ? `${BASE_URL()}/delivery-zones/${zone.id}`
        : `${BASE_URL()}/delivery-zones`
      const res = await fetch(url, {
        method: zone?.id ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          minKm:            Number(form.minKm),
          maxKm:            Number(form.maxKm),
          deliveryCharge:   Number(form.deliveryCharge),
          estimatedMinutes: Number(form.estimatedMinutes),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Save nahi hua')
      }
      const saved = await res.json()
      toast.success(zone?.id ? 'Zone updated! ✅' : 'Zone created! ✅')
      onSaved(saved)
    } catch (e) {
      toast.error(e.message || 'Error hua')
    } finally {
      setSaving(false)
    }
  }

  function handleBackdrop(e) { if (e.target === e.currentTarget) onClose() }

  const inputStyle = {
    background: '#334155', border: '1px solid #475569', color: '#fff',
    padding: '8px 12px', borderRadius: 6, width: '100%', fontSize: 13,
    boxSizing: 'border-box',
  }
  const labelStyle = {
    fontSize: 11, color: '#94a3b8', fontWeight: 600,
    letterSpacing: '0.06em', display: 'block', marginBottom: 5,
  }

  return (
    <div onClick={handleBackdrop} style={{
      position: 'fixed', inset: 0, background: '#0009', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 14, padding: '1.5rem',
        width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px #0008',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {zone?.id ? '✏️ Edit Zone' : '➕ New Delivery Zone'}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: '#94a3b8',
          }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Zone Name */}
          <div>
            <label style={labelStyle}>ZONE NAME</label>
            <input
              type="text"
              placeholder="e.g. City Centre, Outer Ring..."
              value={form.zoneName}
              onChange={e => set('zoneName', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Min / Max KM */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>MIN KM</label>
              <input
                type="number" min={0} max={200} step={0.5}
                value={form.minKm}
                onChange={e => set('minKm', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>MAX KM</label>
              <input
                type="number" min={0} max={200} step={0.5}
                value={form.maxKm}
                onChange={e => set('maxKm', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Charge / ETA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>DELIVERY CHARGE (₹)</label>
              <input
                type="number" min={0} step={1}
                value={form.deliveryCharge}
                onChange={e => set('deliveryCharge', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>ETA (MINUTES)</label>
              <input
                type="number" min={1} max={180}
                value={form.estimatedMinutes}
                onChange={e => set('estimatedMinutes', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => set('isActive', e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span onClick={() => set('isActive', !form.isActive)} style={{
                position: 'absolute', inset: 0, borderRadius: 24, cursor: 'pointer',
                background: form.isActive ? '#22c55e' : '#475569',
                transition: 'background 0.2s',
              }}>
                <span style={{
                  position: 'absolute', top: 3, left: form.isActive ? 22 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </span>
            </label>
            <span style={{ fontSize: 13, color: form.isActive ? '#22c55e' : '#94a3b8' }}>
              {form.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Save / Cancel */}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={handleSave} disabled={saving} style={{
              flex: 1, background: saving ? '#475569' : '#3b82f6',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 16px', cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600,
            }}>
              {saving ? '⏳ Saving...' : zone?.id ? 'Update Zone' : 'Create Zone'}
            </button>
            <button onClick={onClose} style={{
              padding: '10px 16px', borderRadius: 8,
              border: '1px solid #475569', background: 'transparent',
              color: '#94a3b8', cursor: 'pointer', fontSize: 13,
            }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function DeliveryZones() {
  const toast = useToast()
  const [zones,       setZones]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modalZone,   setModalZone]   = useState(null)  // null=closed, {}=new, zone=edit
  const [showModal,   setShowModal]   = useState(false)
  const [deletingId,  setDeletingId]  = useState(null)

  // Zone checker state
  const [checkDist,   setCheckDist]   = useState('')
  const [checkResult, setCheckResult] = useState(null)
  const [checking,    setChecking]    = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL()}/delivery-zones`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Load failed')
      const data = await res.json()
      setZones(Array.isArray(data) ? data : data.content || [])
    } catch (e) {
      toast.error('Zones load nahi hue')
      setZones([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    if (!window.confirm('Zone delete karna chahte ho?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`${BASE_URL()}/delivery-zones/${id}`, {
        method: 'DELETE', headers: authHeaders(),
      })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Zone delete ho gaya!')
      setZones(prev => prev.filter(z => z.id !== id))
    } catch (e) {
      toast.error(e.message || 'Delete nahi hua')
    } finally {
      setDeletingId(null)
    }
  }

  function handleSaved(saved) {
    setZones(prev => {
      const idx = prev.findIndex(z => z.id === saved.id)
      if (idx >= 0) {
        const updated = [...prev]; updated[idx] = saved; return updated
      }
      return [...prev, saved]
    })
    setShowModal(false)
    setModalZone(null)
  }

  async function handleCheckZone() {
    const dist = parseFloat(checkDist)
    if (isNaN(dist) || dist < 0) { toast.error('Valid distance enter karo'); return }
    setChecking(true)
    setCheckResult(null)
    try {
      const res = await fetch(`${BASE_URL()}/delivery-zones/check`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ distanceKm: dist }),
      })
      if (!res.ok) {
        // If 404, treat as out of range
        setCheckResult({ outOfRange: true })
        return
      }
      const data = await res.json()
      setCheckResult(data)
    } catch (e) {
      // Fallback: check client-side
      const matched = zones
        .filter(z => z.isActive && dist >= z.minKm && dist <= z.maxKm)
        .sort((a, b) => a.deliveryCharge - b.deliveryCharge)[0]
      setCheckResult(matched ? matched : { outOfRange: true })
    } finally {
      setChecking(false)
    }
  }

  const cardStyle = {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 12, overflow: 'hidden',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            🛵 Delivery Zones
          </h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            Configure delivery radius and charges
          </p>
        </div>
        <button onClick={() => { setModalZone({}); setShowModal(true) }} style={{
          background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
          padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          + Add Zone
        </button>
      </div>

      {/* Check Zone Calculator */}
      <div style={{ ...cardStyle, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8',
          letterSpacing: '0.06em', marginBottom: 12 }}>
          📍 ZONE CHECKER
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number" min={0} step={0.1}
            placeholder="Distance in KM (e.g. 2.5)"
            value={checkDist}
            onChange={e => { setCheckDist(e.target.value); setCheckResult(null) }}
            style={{
              background: '#334155', border: '1px solid #475569', color: '#fff',
              padding: '8px 12px', borderRadius: 7, fontSize: 13, width: 220,
            }}
          />
          <button onClick={handleCheckZone} disabled={checking || !checkDist} style={{
            background: checking ? '#475569' : '#3b82f6', color: '#fff',
            border: 'none', borderRadius: 7, padding: '8px 16px',
            cursor: checking || !checkDist ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600,
          }}>
            {checking ? '⏳...' : '🔍 Check Zone'}
          </button>

          {checkResult && (
            checkResult.outOfRange ? (
              <div style={{ padding: '7px 14px', borderRadius: 7,
                background: '#ef444420', color: '#ef4444',
                fontSize: 13, fontWeight: 600 }}>
                ❌ Out of delivery range
              </div>
            ) : (
              <div style={{ padding: '7px 14px', borderRadius: 7,
                background: '#22c55e20', color: '#22c55e',
                fontSize: 13, fontWeight: 600 }}>
                ✅ {checkResult.zoneName} · {fmt(checkResult.deliveryCharge)} · ~{checkResult.estimatedMinutes} mins
              </div>
            )
          )}
        </div>
      </div>

      {/* Zones Table */}
      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {['Zone Name', 'Min KM', 'Max KM', 'Delivery Charge', 'ETA', 'Active', 'Actions'].map((h, i) => (
                <th key={h} style={{
                  textAlign: i === 0 ? 'left' : 'center',
                  padding: '11px 16px', fontSize: 11, color: '#94a3b8',
                  fontWeight: 600, borderBottom: '1px solid #334155',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '13px 16px', borderBottom: '1px solid #334155' }}>
                        <div style={{ height: 13, borderRadius: 4, background: '#334155',
                          width: j === 0 ? 120 : 60 }} />
                      </td>
                    ))}
                  </tr>
                ))
              : zones.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px',
                      color: '#94a3b8' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🛵</div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Koi zone nahi mila</div>
                      <div style={{ fontSize: 12 }}>
                        "+ Add Zone" button se pehla zone banao
                      </div>
                    </td>
                  </tr>
                )
              : zones.map(z => (
                  <tr key={z.id}
                    style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #334155',
                      fontWeight: 600, color: '#fff' }}>
                      {z.zoneName}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #334155',
                      textAlign: 'center', color: '#94a3b8' }}>
                      {z.minKm} km
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #334155',
                      textAlign: 'center', color: '#94a3b8' }}>
                      {z.maxKm} km
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #334155',
                      textAlign: 'center', fontWeight: 600, color: '#f59e0b' }}>
                      {fmt(z.deliveryCharge)}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #334155',
                      textAlign: 'center', color: '#94a3b8' }}>
                      ~{z.estimatedMinutes} min
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #334155',
                      textAlign: 'center' }}>
                      <Badge color={z.isActive ? '#22c55e' : '#ef4444'}>
                        {z.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #334155',
                      textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button onClick={() => { setModalZone(z); setShowModal(true) }} style={{
                          padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: '#3b82f620', color: '#3b82f6',
                          border: '1px solid #3b82f640', cursor: 'pointer',
                        }}>Edit</button>
                        <button
                          onClick={() => handleDelete(z.id)}
                          disabled={deletingId === z.id}
                          style={{
                            padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: '#ef444420', color: '#ef4444',
                            border: '1px solid #ef444440',
                            cursor: deletingId === z.id ? 'not-allowed' : 'pointer',
                            opacity: deletingId === z.id ? 0.5 : 1,
                          }}>
                          {deletingId === z.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <ZoneModal
          zone={modalZone}
          onClose={() => { setShowModal(false); setModalZone(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
