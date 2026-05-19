import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { useRiderWebSocket } from '../hooks/useRiderWebSocket'

// ── Constants ─────────────────────────────────────────────────────────────────
const APPS = [
  { icon: '🧾', name: 'SwiftBill POS',  role: 'Cashier',          desc: 'Bill create karo, UPI QR, due payments' },
  { icon: '👨‍🍳', name: 'ChefView KDS',  role: 'Kitchen Display',  desc: 'Kitchen orders, KOT management' },
  { icon: '🛵', name: 'RideTrack',       role: 'Delivery Rider',   desc: 'GPS tracking, delivery orders' },
  { icon: '🪑', name: 'TableMate',       role: 'Waiter / Captain', desc: 'Table management, dine-in orders' },
  { icon: '👤', name: 'HarmoneyAdmin',   role: 'Owner / Manager',  desc: 'Full access admin app' },
  { icon: '📲', name: 'Attendance App',  role: 'All Staff',        desc: 'QR attendance scan karo' },
]

const ROLE_CFG = {
  OWNER:    { icon: '👑', label: 'Owner',    color: '#7c3aed' },
  ADMIN:    { icon: '⚙️', label: 'Admin',    color: '#6366f1' },
  MANAGER:  { icon: '👤', label: 'Manager',  color: '#2563eb' },
  CASHIER:  { icon: '🧾', label: 'Cashier',  color: '#0891b2' },
  KITCHEN:  { icon: '👨‍🍳', label: 'Kitchen',  color: '#d97706' },
  DELIVERY: { icon: '🛵', label: 'Rider',    color: '#16a34a' },
  CAPTAIN:  { icon: '🪑', label: 'Captain',  color: '#db2777' },
}

const STATUS_CFG = {
  ONLINE:  { label: 'Online',  color: '#16a34a', bg: '#dcfce7', dot: '#16a34a' },
  AWAY:    { label: 'Away',    color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
  OFFLINE: { label: 'Offline', color: '#6b7280', bg: '#f3f4f6', dot: '#d1d5db' },
}

const MAP_PIN = {
  ONLINE:  'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
  AWAY:    'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  OFFLINE: 'http://maps.google.com/mapfiles/ms/icons/grey-dot.png',
}

const GOOGLE_MAPS_KEY    = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''
const RESTAURANT_LAT     = 28.9845
const RESTAURANT_LNG     = 77.7064
let   _gmapsPromise      = null

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (_gmapsPromise) return _gmapsPromise
  if (!GOOGLE_MAPS_KEY) return Promise.reject(new Error('NO_KEY'))
  _gmapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return }
    const cb = '__gmInitDev'
    window[cb] = () => { resolve(window.google.maps); delete window[cb] }
    const s = document.createElement('script')
    s.src   = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=${cb}`
    s.async = s.defer = true
    s.onerror = () => { _gmapsPromise = null; delete window[cb]; reject(new Error('LOAD_FAILED')) }
    document.head.appendChild(s)
  })
  return _gmapsPromise
}

// ── Relative time helper ──────────────────────────────────────────────────────
function relativeTime(isoStr) {
  if (!isoStr) return 'Never'
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Mini Rider Map ────────────────────────────────────────────────────────────
function RiderMap({ riders }) {
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const markersRef  = useRef({})

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps().then(gmaps => {
      if (cancelled || mapInstance.current || !mapRef.current) return
      mapInstance.current = new gmaps.Map(mapRef.current, {
        center:            { lat: RESTAURANT_LAT, lng: RESTAURANT_LNG },
        zoom:              13,
        mapTypeControl:    false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      })
      new gmaps.Marker({
        map:      mapInstance.current,
        position: { lat: RESTAURANT_LAT, lng: RESTAURANT_LNG },
        title:    'Restaurant',
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new gmaps.Size(36, 36) },
        zIndex: 999,
      })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps) return
    const gmaps = window.google.maps
    const infoWin = new gmaps.InfoWindow()

    riders.forEach(r => {
      if (!r.latitude || !r.longitude) return
      const pos  = { lat: r.latitude, lng: r.longitude }
      const icon = { url: MAP_PIN[r.status] || MAP_PIN.OFFLINE, scaledSize: new gmaps.Size(36, 36) }

      if (markersRef.current[r.staffId]) {
        markersRef.current[r.staffId].setPosition(pos)
        markersRef.current[r.staffId].setIcon(icon)
      } else {
        const marker = new gmaps.Marker({
          map: mapInstance.current, position: pos, title: r.name, icon,
          label: { text: r.name[0], color: '#fff', fontWeight: 'bold', fontSize: '11px' },
        })
        marker.addListener('click', () => {
          const cfg = STATUS_CFG[r.status] || STATUS_CFG.OFFLINE
          infoWin.setContent(`
            <div style="padding:8px 10px;font-family:sans-serif;min-width:160px">
              <div style="font-weight:700;font-size:13px">${r.name}</div>
              <div style="font-size:11px;color:#555;margin:3px 0">${r.phone || ''}</div>
              <span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${cfg.bg};color:${cfg.color}">${cfg.label}</span>
              <div style="font-size:10px;color:#aaa;margin-top:6px">📍 ${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}</div>
            </div>`)
          infoWin.open(mapInstance.current, marker)
        })
        markersRef.current[r.staffId] = marker
      }
    })

    Object.keys(markersRef.current).forEach(id => {
      if (!riders.find(r => r.staffId === Number(id))) {
        markersRef.current[id].setMap(null)
        delete markersRef.current[id]
      }
    })
  }, [riders])

  if (!GOOGLE_MAPS_KEY) return (
    <div style={{ height: '100%', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <div style={{ fontSize: 28 }}>🗺️</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>Google Maps Key Required</div>
      <code style={{ fontSize: 11, background: '#dbeafe', padding: '2px 8px', borderRadius: 4 }}>
        VITE_GOOGLE_MAPS_KEY=...
      </code>
    </div>
  )

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }} />
}

// ── Live Devices Tab ──────────────────────────────────────────────────────────
function LiveDevicesTab({ rid }) {
  const [staff,      setStaff]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [lastRefresh,setLastRefresh]= useState(null)
  const [wsStatus,   setWsStatus]   = useState('connecting')
  const intervalRef                 = useRef(null)

  const load = useCallback(async () => {
    try {
      const data = await api.get('/device/active-staff')
      setStaff(Array.isArray(data) ? data : [])
      setLastRefresh(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch (_) {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  // Live GPS updates for DELIVERY staff via WebSocket
  const riderStaff = staff.filter(s => s.role === 'DELIVERY' && s.staffId)
  const riderIds   = riderStaff.map(s => s.staffId)

  useRiderWebSocket(riderIds, (update) => {
    setStaff(prev => prev.map(s =>
      s.staffId === update.riderId
        ? { ...s, latitude: update.latitude, longitude: update.longitude, status: 'ONLINE', lastSeen: new Date().toISOString() }
        : s
    ))
    setWsStatus('live')
  }, () => setWsStatus('live'))

  const stats = {
    total:   staff.length,
    online:  staff.filter(s => s.status === 'ONLINE').length,
    away:    staff.filter(s => s.status === 'AWAY').length,
    offline: staff.filter(s => s.status === 'OFFLINE').length,
  }

  const ridersWithGps = staff.filter(s => s.role === 'DELIVERY' && s.latitude && s.longitude)

  const WS_BADGE = {
    connecting: { label: 'Connecting…', color: '#d97706', bg: '#fef3c7', dot: '#f59e0b' },
    live:       { label: 'Live GPS',    color: '#16a34a', bg: '#dcfce7', dot: '#16a34a' },
    error:      { label: 'No GPS',      color: '#ef4444', bg: '#fee2e2', dot: '#ef4444' },
  }
  const wsBadge = WS_BADGE[wsStatus] || WS_BADGE.connecting

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
            borderRadius: 20, background: wsBadge.bg, border: `1px solid ${wsBadge.dot}30` }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: wsBadge.dot,
              animation: wsStatus === 'live' ? 'blink 1.5s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: wsBadge.color }}>{wsBadge.label}</span>
          </div>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>↻ {lastRefresh}</span>
          )}
        </div>
        <button onClick={load} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Total',   value: stats.total,   color: '#6366f1', bg: '#ede9fe', icon: '👥' },
          { label: 'Online',  value: stats.online,  color: '#16a34a', bg: '#dcfce7', icon: '🟢' },
          { label: 'Away',    value: stats.away,    color: '#d97706', bg: '#fef3c7', icon: '🟡' },
          { label: 'Offline', value: stats.offline, color: '#6b7280', bg: '#f3f4f6', icon: '⭕' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-page)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: s.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Map + Staff list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, minHeight: 360 }}>

        {/* Rider map */}
        <div style={{ background: 'var(--bg-page)', borderRadius: 12, overflow: 'hidden',
          border: '1px solid var(--border)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10,
            background: 'rgba(255,255,255,.9)', borderRadius: 8, padding: '4px 10px',
            fontSize: 11, fontWeight: 700, color: '#333' }}>
            🛵 Rider Locations ({ridersWithGps.length})
          </div>
          <div style={{ height: '100%', minHeight: 360 }}>
            <RiderMap riders={ridersWithGps} />
          </div>
        </div>

        {/* Staff list */}
        <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
            fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
            Staff Status
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 340 }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
            ) : staff.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Koi staff nahi mila
              </div>
            ) : (
              staff.map(s => {
                const roleCfg   = ROLE_CFG[s.role]   || { icon: '👤', label: s.role,   color: '#6b7280' }
                const statusCfg = STATUS_CFG[s.status] || STATUS_CFG.OFFLINE
                return (
                  <div key={s.staffId} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Avatar */}
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: roleCfg.color + '20', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 16, position: 'relative' }}>
                      {roleCfg.icon}
                      <div style={{ position: 'absolute', bottom: 0, right: 0,
                        width: 9, height: 9, borderRadius: '50%',
                        background: statusCfg.dot, border: '2px solid var(--bg-page)' }} />
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: roleCfg.color, fontWeight: 600 }}>{roleCfg.label}</div>
                    </div>
                    {/* Status + time */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 600,
                        background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                        {relativeTime(s.lastSeen)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
    </div>
  )
}

// ── Setup Tab ─────────────────────────────────────────────────────────────────
function SetupTab({ rid }) {
  const toast = useToast()
  const [restaurantCode, setRestaurantCode] = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [copied,         setCopied]         = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const r = await api.get(`/restaurants/${rid}`)
        setRestaurantCode(r?.restaurantId || r?.restaurantCode || null)
      } catch { toast.error('Restaurant info load nahi hua') }
      finally { setLoading(false) }
    }
    load()
  }, [rid])

  function copyCode() {
    if (!restaurantCode) return
    navigator.clipboard.writeText(restaurantCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Restaurant Code */}
        <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>🔑 Restaurant Code</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Yeh code Android apps mein enter karo device ko link karne ke liye.
          </p>
          {loading ? (
            <div style={{ height: 52, background: 'var(--border)', borderRadius: 8 }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, padding: '14px 18px', borderRadius: 10,
                background: 'var(--bg-card)', border: '2px solid var(--accent)',
                fontSize: 22, fontWeight: 800, fontFamily: 'monospace',
                letterSpacing: 3, color: 'var(--accent)', textAlign: 'center' }}>
                {restaurantCode || '—'}
              </div>
              <button onClick={copyCode} style={{ padding: '14px 16px', borderRadius: 10,
                border: '1px solid var(--border)',
                background: copied ? '#d1fae5' : 'var(--bg-card)',
                color: copied ? '#065f46' : 'var(--text)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
          )}
          <div style={{ marginTop: '1rem', padding: '10px 12px', borderRadius: 8,
            background: '#fef3c715', border: '1px solid #f59e0b30',
            fontSize: 12, color: 'var(--text-muted)' }}>
            ⚠️ Sirf apne staff devices ke liye share karo
          </div>
        </div>

        {/* Staff Passcode */}
        <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>🔢 Staff Passcode Login</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
            Staff 4-digit passcode se login karte hain — bina email/password ke.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            {[
              { icon: '1️⃣', text: 'Staff page pe passcode set karo' },
              { icon: '2️⃣', text: 'App open karo → Restaurant Code enter karo' },
              { icon: '3️⃣', text: '4-digit passcode → Logged in!' },
            ].map(s => (
              <div key={s.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0 }}>{s.icon}</span>
                <span style={{ color: 'var(--text-muted)' }}>{s.text}</span>
              </div>
            ))}
          </div>
          <a href="/staff" style={{ display: 'inline-block', marginTop: '1rem', padding: '7px 14px',
            borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
            👤 Staff Manage Karo →
          </a>
        </div>
      </div>

      {/* App List */}
      <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>📦 Available Apps</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {APPS.map(app => (
            <div key={app.name} style={{ padding: '14px 16px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: 26, flexShrink: 0 }}>{app.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{app.name}</div>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>{app.role}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{app.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DeviceManagement() {
  const rid   = useAuthStore(s => s.restaurantId)
  const [tab, setTab] = useState('live')

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>📱 Device Management</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Live staff tracking aur Android app setup
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'live',  label: '📡 Live Devices' },
          { key: 'setup', label: '⚙️ Setup'         },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 22px', borderRadius: 7, border: 'none',
              background: tab === t.key ? 'var(--accent)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'live'  && <LiveDevicesTab rid={rid} />}
      {tab === 'setup' && <SetupTab rid={rid} />}
    </div>
  )
}
