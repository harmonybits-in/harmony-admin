import { useState, useEffect, useRef, useCallback } from 'react'

const STATUS_CFG = {
  AVAILABLE:   { bg: '#10b98122', color: '#10b981', label: 'Available'    },
  ON_DELIVERY: { bg: '#f59e0b22', color: '#f59e0b', label: 'On Delivery'  },
  OFFLINE:     { bg: '#44444422', color: '#888',     label: 'Offline'      },
}

function authHeaders() {
  const token = localStorage.getItem('harmoney_token') || ''
  return { Authorization: `Bearer ${token}` }
}

async function apiFetch(path) {
  const res = await fetch(path, { headers: authHeaders() })
  if (!res.ok) {
    let msg = `${res.status}`
    try {
      const body = await res.json()
      msg = body?.message || body?.error || msg
    } catch {}
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <div style={{
        width: 32,
        height: 32,
        border: '3px solid #2a2a3e',
        borderTop: '3px solid #863bff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function StatChip({ label, value, accent }) {
  return (
    <div style={{
      background: '#1A1A2E',
      border: '1px solid #2a2a3e',
      borderRadius: 10,
      padding: '14px 22px',
      minWidth: 130,
    }}>
      <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent || '#fff' }}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.OFFLINE
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      background: cfg.bg,
      color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function ActivePill({ active }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      background: active ? '#863bff22' : '#2a2a3e',
      color: active ? '#863bff' : '#666',
    }}>
      {active ? 'Yes' : 'No'}
    </span>
  )
}

function LocationModal({ rider, onClose }) {
  const hasCoords = rider.currentLat != null && rider.currentLng != null
  const lat = rider.currentLat
  const lng = rider.currentLng

  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000088',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#1A1A2E',
        border: '1px solid #2a2a3e',
        borderRadius: 14,
        padding: 28,
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 24px 48px #00000099',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>Rider Location</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{rider.name || '—'}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{rider.phone || '—'}</div>
        </div>

        {hasCoords ? (
          <div style={{ background: '#0F0F1A', borderRadius: 10, padding: 16, border: '1px solid #2a2a3e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Latitude</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#863bff' }}>{lat}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Longitude</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#863bff' }}>{lng}</div>
              </div>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '9px 0',
                background: '#863bff',
                borderRadius: 7,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Open in Google Maps
            </a>
          </div>
        ) : (
          <div style={{ background: '#0F0F1A', borderRadius: 10, padding: 20, textAlign: 'center', color: '#555', fontSize: 13, border: '1px solid #2a2a3e' }}>
            Location not available
          </div>
        )}
      </div>
    </div>
  )
}

export default function SARiders() {
  const [allRiders, setAllRiders] = useState([])
  const [activeRiders, setActiveRiders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('ALL')
  const [locationRider, setLocationRider] = useState(null)

  const intervalRef = useRef(null)

  const fetchAll = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v1/admin/riders')
      setAllRiders(Array.isArray(data) ? data : (data?.content || []))
    } catch (err) {
      setError(err?.message || 'Failed to load riders')
    }
  }, [])

  const fetchActive = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v1/admin/riders/active')
      setActiveRiders(Array.isArray(data) ? data : (data?.content || []))
    } catch {}
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchAll(), fetchActive()])
      .finally(() => setLoading(false))

    intervalRef.current = setInterval(() => {
      fetchActive()
    }, 30000)

    return () => clearInterval(intervalRef.current)
  }, [fetchAll, fetchActive])

  const displayRiders = tab === 'ACTIVE' ? activeRiders : allRiders

  const restaurantSet = new Set(allRiders.map(r => r.restaurantId).filter(Boolean))
  const totalRestaurants = restaurantSet.size

  const COL_HEADERS = ['#', 'Name', 'Phone', 'Restaurant', 'Status', 'Active', 'Actions']

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Rider Network</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>All riders across all restaurants</p>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatChip label="Total Riders" value={allRiders.length} accent="#fff" />
        <StatChip label="Active Now" value={activeRiders.length} accent="#10b981" />
        <StatChip label="Restaurants" value={totalRestaurants} accent="#863bff" />
      </div>

      <div style={{
        background: '#1A1A2E',
        border: '1px solid #2a2a3e',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'ACTIVE'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: tab === t ? '#863bff' : '#0F0F1A',
                  color: tab === t ? '#fff' : '#888',
                  transition: 'background 0.12s',
                }}
              >
                {t === 'ALL' ? `All (${allRiders.length})` : `Active (${activeRiders.length})`}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#555' }}>Active refreshes every 30s</div>
        </div>

        {loading && <Spinner />}

        {!loading && error && (
          <div style={{ padding: 24, color: '#ef4444', fontSize: 13 }}>{error}</div>
        )}

        {!loading && !error && displayRiders.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#555', fontSize: 14 }}>
            No riders found
          </div>
        )}

        {!loading && !error && displayRiders.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0F0F1A' }}>
                  {COL_HEADERS.map(col => (
                    <th key={col} style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#666',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRiders.map((rider, idx) => (
                  <tr
                    key={rider.id || idx}
                    style={{
                      borderTop: '1px solid #2a2a3e',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#0F0F1A' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#555', fontWeight: 600 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {rider.name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#ccc', whiteSpace: 'nowrap' }}>
                      {rider.phone || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#aaa', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rider.restaurantName || (rider.restaurantId ? `#${rider.restaurantId}` : '—')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={rider.status} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ActivePill active={rider.isActive ?? rider.active ?? false} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => setLocationRider(rider)}
                        style={{
                          padding: '6px 13px',
                          background: '#863bff18',
                          border: '1px solid #863bff44',
                          borderRadius: 7,
                          color: '#863bff',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        View Location
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {locationRider && (
        <LocationModal rider={locationRider} onClose={() => setLocationRider(null)} />
      )}
    </div>
  )
}
