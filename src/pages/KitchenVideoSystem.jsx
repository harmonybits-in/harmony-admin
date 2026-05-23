/**
 * Kitchen Video System — ADMIN page, auth required.
 * Route: /kitchen-video
 *
 * Manage IP cameras (RTSP / HLS) and view their live feeds.
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1/cameras'

const LOCATIONS = ['KITCHEN', 'ENTRANCE', 'BILLING', 'STORAGE', 'DINING']

const LOCATION_COLOR = {
  KITCHEN:  { bg: '#fef9c3', color: '#713f12' },
  ENTRANCE: { bg: '#dbeafe', color: '#1e3a8a' },
  BILLING:  { bg: '#f0fdf4', color: '#14532d' },
  STORAGE:  { bg: '#fdf4ff', color: '#581c87' },
  DINING:   { bg: '#fff7ed', color: '#7c2d12' },
}

const EMPTY_FORM = {
  name:      '',
  location:  'KITCHEN',
  streamUrl: '',
  isActive:  true,
}

function isHLS(url) {
  return url && url.toLowerCase().includes('.m3u8')
}

function isRTSP(url) {
  return url && url.toLowerCase().startsWith('rtsp://')
}

export default function KitchenVideoSystem() {
  const { token, restaurantId } = useAuthStore()

  const [cameras, setCameras]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // Modal state
  const [modal, setModal]         = useState(null) // null | 'add' | 'edit'
  const [editing, setEditing]     = useState(null) // camera object being edited
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState(null)

  // Delete confirmation
  const [deleteId, setDeleteId]   = useState(null)
  const [deleting, setDeleting]   = useState(false)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/`, { headers })
      if (!res.ok) throw new Error('Failed to load cameras')
      const data = await res.json()
      setCameras(Array.isArray(data) ? data : (data.content ?? []))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setFormError(null)
    setModal('add')
  }

  function openEdit(cam) {
    setForm({
      name:      cam.name ?? '',
      location:  cam.location ?? 'KITCHEN',
      streamUrl: cam.streamUrl ?? '',
      isActive:  cam.isActive ?? true,
    })
    setEditing(cam)
    setFormError(null)
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setEditing(null)
    setFormError(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Camera name is required.'); return }
    if (!form.streamUrl.trim()) { setFormError('Stream URL is required.'); return }
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        name:      form.name.trim(),
        location:  form.location,
        streamUrl: form.streamUrl.trim(),
        isActive:  form.isActive,
        restaurantId,
      }
      let res
      if (modal === 'edit' && editing) {
        res = await fetch(`${BASE}/${editing.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`${BASE}/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? 'Save failed')
      }
      await load()
      closeModal()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setDeleting(true)
    try {
      const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Delete failed')
      await load()
      setDeleteId(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  async function toggleActive(cam) {
    try {
      await fetch(`${BASE}/${cam.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...cam, isActive: !cam.isActive }),
      })
      setCameras(prev =>
        prev.map(c => c.id === cam.id ? { ...c, isActive: !c.isActive } : c)
      )
    } catch {
      alert('Failed to update camera status')
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const cardStyle = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }

  const btnPrimary = {
    padding: '9px 18px', borderRadius: 8, border: 'none',
    background: '#16a34a', color: '#fff', fontWeight: 600,
    fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  }

  const btnSecondary = {
    padding: '7px 14px', borderRadius: 8,
    border: '1px solid #e5e7eb', background: '#f9fafb',
    color: '#374151', fontWeight: 500, fontSize: 12, cursor: 'pointer',
  }

  const btnDanger = {
    padding: '7px 14px', borderRadius: 8,
    border: '1px solid #fecaca', background: '#fff1f2',
    color: '#b91c1c', fontWeight: 500, fontSize: 12, cursor: 'pointer',
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box',
    outline: 'none', background: '#fff',
  }

  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block',
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: '1.5rem 2rem',
      background: '#f8fafc',
      minHeight: '100vh',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Page header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>
            📹 Kitchen Video System
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            Monitor your restaurant with IP cameras via HLS or RTSP streams
          </p>
        </div>
        <button onClick={openAdd} style={btnPrimary}>
          <span style={{ fontSize: 16 }}>+</span> Add Camera
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: 10, padding: '12px 16px', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
        <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
          Add IP camera <strong>RTSP streams</strong> or <strong>HLS (.m3u8) streams</strong> to monitor your kitchen.
          Cameras must be on the same network or accessible via a public URL.
          HLS streams will play directly in the browser. RTSP streams can be viewed via VLC or your NVR system.
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
          <div>Loading cameras…</div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, padding: '1.5rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>⚠️</div>
          <div style={{ color: '#b91c1c', fontWeight: 600 }}>{error}</div>
          <button onClick={load} style={{ ...btnSecondary, marginTop: 12 }}>Retry</button>
        </div>
      )}

      {/* Camera grid */}
      {!loading && !error && (
        <>
          {cameras.length === 0 ? (
            <div style={{
              background: '#fff', border: '2px dashed #e5e7eb',
              borderRadius: 16, padding: '4rem 2rem',
              textAlign: 'center', color: '#9ca3af',
            }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🎥</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                No cameras added yet
              </div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>
                Click "Add Camera" to start monitoring your kitchen
              </div>
              <button onClick={openAdd} style={btnPrimary}>+ Add Your First Camera</button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}>
              {cameras.map(cam => (
                <CameraCard
                  key={cam.id}
                  cam={cam}
                  cardStyle={cardStyle}
                  btnSecondary={btnSecondary}
                  btnDanger={btnDanger}
                  onEdit={() => openEdit(cam)}
                  onDelete={() => setDeleteId(cam.id)}
                  onToggle={() => toggleActive(cam)}
                  restaurantId={restaurantId}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem',
        }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{
            background: '#fff', borderRadius: 16,
            width: '100%', maxWidth: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
                {modal === 'edit' ? '✏️ Edit Camera' : '📷 Add Camera'}
              </div>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Camera Name *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Main Kitchen, Grill Station"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Location *</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                >
                  {LOCATIONS.map(l => (
                    <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Stream URL *</label>
                <input
                  style={inputStyle}
                  placeholder="rtsp://192.168.1.100/stream  or  https://…/stream.m3u8"
                  value={form.streamUrl}
                  onChange={e => setForm(f => ({ ...f, streamUrl: e.target.value }))}
                  required
                />
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  HLS (.m3u8) streams play in browser. RTSP streams can be viewed via VLC or NVR.
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#f9fafb', borderRadius: 10, padding: '12px 14px',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Active</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Inactive cameras are hidden from the grid</div>
                </div>
                <div
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                    background: form.isActive ? '#16a34a' : '#d1d5db',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, borderRadius: '50%',
                    width: 20, height: 20, background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    left: form.isActive ? 22 : 2,
                    transition: 'left 0.2s',
                  }} />
                </div>
              </div>

              {formError && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 8, padding: '10px 12px',
                  color: '#b91c1c', fontSize: 13,
                }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button type="button" onClick={closeModal} style={btnSecondary}>Cancel</button>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Add Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem',
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '2rem',
            width: '100%', maxWidth: 360, textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 8 }}>
              Delete Camera?
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
              This will permanently remove the camera and its configuration.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} style={btnSecondary}>Cancel</button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                style={{ ...btnDanger, opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Camera Card Component ────────────────────────────────────────────────────
function CameraCard({ cam, cardStyle, btnSecondary, btnDanger, onEdit, onDelete, onToggle, restaurantId }) {
  const locStyle = LOCATION_COLOR[cam.location] ?? { bg: '#f3f4f6', color: '#374151' }
  const streamType = isHLS(cam.streamUrl) ? 'HLS' : isRTSP(cam.streamUrl) ? 'RTSP' : 'OTHER'

  return (
    <div style={{
      ...cardStyle,
      opacity: cam.isActive ? 1 : 0.6,
      transition: 'opacity 0.2s, box-shadow 0.2s',
      boxShadow: cam.isActive ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
    }}>
      {/* Feed area */}
      <div style={{
        background: '#0f172a',
        aspectRatio: '16/9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {streamType === 'HLS' ? (
          <video
            src={cam.streamUrl}
            autoPlay muted playsInline controls
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          // RTSP or unknown — placeholder
          <div style={{ textAlign: 'center', color: '#475569', padding: '1rem' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📡</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
              RTSP Stream
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 6, maxWidth: 200, lineHeight: 1.5 }}>
              View via VLC or NVR.<br />Open in VLC → Media → Open Network Stream
            </div>
          </div>
        )}

        {/* Status badge overlay */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: cam.isActive ? '#16a34a' : '#6b7280',
          color: '#fff', borderRadius: 20, padding: '3px 10px',
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#fff', opacity: cam.isActive ? 1 : 0.5,
          }} />
          {cam.isActive ? 'LIVE' : 'OFF'}
        </div>

        {/* Stream type badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: streamType === 'HLS' ? '#1d4ed8' : '#7c3aed',
          color: '#fff', borderRadius: 6, padding: '2px 8px',
          fontSize: 10, fontWeight: 700,
        }}>
          {streamType}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{cam.name}</div>
            <div style={{
              display: 'inline-block', marginTop: 4,
              background: locStyle.bg, color: locStyle.color,
              borderRadius: 20, padding: '2px 10px',
              fontSize: 11, fontWeight: 600,
            }}>
              {cam.location}
            </div>
          </div>

          {/* Active toggle */}
          <div
            title={cam.isActive ? 'Click to deactivate' : 'Click to activate'}
            onClick={onToggle}
            style={{
              width: 38, height: 21, borderRadius: 11, cursor: 'pointer',
              background: cam.isActive ? '#16a34a' : '#d1d5db',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 2.5, borderRadius: '50%',
              width: 16, height: 16, background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              left: cam.isActive ? 20 : 2,
              transition: 'left 0.2s',
            }} />
          </div>
        </div>

        {/* Stream URL */}
        <div style={{
          background: '#f8fafc', borderRadius: 6, padding: '6px 10px',
          fontSize: 11, color: '#6b7280', fontFamily: 'monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          border: '1px solid #e5e7eb',
        }}>
          {cam.streamUrl || '—'}
        </div>

        {/* Full-screen hint for HLS */}
        {streamType === 'HLS' && cam.isActive && (
          <a
            href={`/kitchen-video-live/${restaurantId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11, color: '#2563eb', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            🖥 Open full-screen view →
          </a>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button onClick={onEdit} style={{ ...btnSecondary, flex: 1 }}>✏️ Edit</button>
          <button onClick={onDelete} style={{ ...btnDanger, flex: 1 }}>🗑 Delete</button>
        </div>
      </div>
    </div>
  )
}
