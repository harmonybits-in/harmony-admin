import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function MenuSync() {
  const [restaurants, setRestaurants] = useState([])
  const [source,      setSource]      = useState('')
  const [target,      setTarget]      = useState('')
  const [preview,     setPreview]     = useState(null)
  const [result,      setResult]      = useState(null)
  const [previewing,  setPreviewing]  = useState(false)
  const [syncing,     setSyncing]     = useState(false)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    api.get('/admin/menu-sync/restaurants')
      .then(data => setRestaurants(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handlePreview() {
    if (!source) return
    setPreviewing(true)
    setPreview(null)
    setResult(null)
    try {
      const data = await api.get(`/admin/menu-sync/preview/${source}`)
      setPreview(data)
    } catch (err) {
      alert(err.message ?? 'Preview failed')
    }
    setPreviewing(false)
  }

  async function handleSync() {
    if (!source || !target || !preview) return
    if (!confirm(`"${rName(source)}" ka menu "${rName(target)}" pe copy karein?`)) return
    setSyncing(true)
    try {
      const data = await api.post(`/admin/menu-sync/${source}/to/${target}`, {})
      setResult(data)
      setPreview(null)
    } catch (err) {
      alert(err.message ?? 'Sync failed')
    }
    setSyncing(false)
  }

  function rName(id) {
    return restaurants.find(r => String(r.id) === String(id))?.name ?? id
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: '#F7F8FA', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1C1C1C' }}>Multi-Location Menu Sync</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>Copy menu from one restaurant to another</p>
      </div>

      {/* Warning */}
      <div style={{
        background: '#fefce8', border: '1px solid #fbbf24', borderRadius: 10,
        padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e',
      }}>
        <strong>SUPER_ADMIN only</strong> — Target restaurant ke existing items overwrite nahi honge. Sirf naye items add honge.
      </div>

      {/* Sync form */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', padding: 24, marginBottom: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Restaurants load ho rahe hain…</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <label style={labelStyle}>
                Source Restaurant (se copy karein)
                <select value={source} onChange={e => { setSource(e.target.value); setPreview(null); setResult(null) }} style={inputStyle}>
                  <option value="">— Select source —</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name} {r.city ? `(${r.city})` : ''}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                Target Restaurant (mein copy karein)
                <select value={target} onChange={e => { setTarget(e.target.value); setResult(null) }} style={inputStyle}>
                  <option value="">— Select target —</option>
                  {restaurants.filter(r => String(r.id) !== String(source)).map(r => (
                    <option key={r.id} value={r.id}>{r.name} {r.city ? `(${r.city})` : ''}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handlePreview} disabled={!source || previewing} style={btnStyle('#6366f1', !source || previewing)}>
                {previewing ? 'Loading…' : 'Preview'}
              </button>
              <button onClick={handleSync} disabled={!preview || !target || syncing} style={btnStyle('#FF5A00', !preview || !target || syncing)}>
                {syncing ? 'Syncing…' : 'Sync Menu'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Preview card */}
      {preview && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1C', marginBottom: 12 }}>
            Preview — {rName(source)}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={statCard('#6366f1')}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{preview.categories}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Categories</div>
            </div>
            <div style={statCard('#10b981')}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{preview.products}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Products</div>
            </div>
          </div>
          {!target && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#f59e0b' }}>Target restaurant select karo sync karne ke liye</p>
          )}
        </div>
      )}

      {/* Result card */}
      {result && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#16A34A', marginBottom: 12 }}>
            Sync Complete!
          </div>
          {result.message && (
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>{result.message}</p>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={statCard('#10b981')}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{result.categoriesSynced ?? 0}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Categories Synced</div>
            </div>
            <div style={statCard('#6366f1')}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{result.productsCreated ?? 0}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Products Created</div>
            </div>
            <div style={statCard('#f59e0b')}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{result.productsSkipped ?? 0}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Products Skipped</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151', fontWeight: 500,
}

const inputStyle = {
  padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14,
  outline: 'none', marginTop: 2, background: '#fff',
}

const btnStyle = (bg, disabled) => ({
  background: disabled ? '#e5e7eb' : bg, color: disabled ? '#9ca3af' : '#fff',
  border: 'none', borderRadius: 8, padding: '9px 20px',
  fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
})

const statCard = (color) => ({
  background: color + '15', border: `1px solid ${color}30`, borderRadius: 10,
  padding: '14px 20px', minWidth: 100, color,
})
