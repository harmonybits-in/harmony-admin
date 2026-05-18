// src/pages/RiderTracking.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { useRiderWebSocket } from '../hooks/useRiderWebSocket'

// ── REST API ─────────────────────────────────────────────────────
function useRiderApi() {
  const token = useAuthStore(s => s.token)
  const rid   = useAuthStore(s => s.restaurantId)
  const BASE  = import.meta.env.VITE_API_URL || ''
  const h     = { Authorization: `Bearer ${token}` }
  return {
    getActiveRiders: () =>
      fetch(`${BASE}/api/v1/admin/riders/locations?restaurantId=${rid}`, { headers: h })
        .then(r => r.json()),
    getOptimizedRoute: (riderId) =>
      fetch(`${BASE}/api/v1/delivery/${riderId}/optimize-route`, { headers: h })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json() }),
  }
}

// ── Mock data ─────────────────────────────────────────────────────
const MOCK_RIDERS = [
  { id:1, name:'Ravi Kumar',   phone:'9876543210', available:true,  capacity:3,
    latitude:28.9845, longitude:77.7064, status:'ON_DELIVERY', currentOrders:2,
    totalDeliveries:142, todayDeliveries:8,  rating:4.7 },
  { id:2, name:'Amit Singh',   phone:'9876543211', available:true,  capacity:2,
    latitude:28.9912, longitude:77.7201, status:'AVAILABLE',   currentOrders:0,
    totalDeliveries:98,  todayDeliveries:5,  rating:4.5 },
  { id:3, name:'Suresh Yadav', phone:'9876543212', available:false, capacity:3,
    latitude:28.9778, longitude:77.6989, status:'OFFLINE',     currentOrders:0,
    totalDeliveries:67,  todayDeliveries:0,  rating:4.2 },
  { id:4, name:'Deepak Raj',   phone:'9876543213', available:true,  capacity:4,
    latitude:28.9856, longitude:77.7143, status:'ON_DELIVERY', currentOrders:1,
    totalDeliveries:213, todayDeliveries:11, rating:4.8 },
  { id:5, name:'Mohan Das',    phone:'9876543214', available:true,  capacity:2,
    latitude:28.9923, longitude:77.6876, status:'AVAILABLE',   currentOrders:0,
    totalDeliveries:54,  todayDeliveries:3,  rating:4.3 },
]

const STATUS_CFG = {
  AVAILABLE:   { label:'Available',   color:'#16a34a', bg:'#dcfce7', pin:'http://maps.google.com/mapfiles/ms/icons/green-dot.png'  },
  ON_DELIVERY: { label:'On Delivery', color:'#2563eb', bg:'#dbeafe', pin:'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'   },
  OFFLINE:     { label:'Offline',     color:'#6b7280', bg:'#f3f4f6', pin:'http://maps.google.com/mapfiles/ms/icons/grey-dot.png'   },
  BREAK:       { label:'On Break',    color:'#d97706', bg:'#fef3c7', pin:'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png' },
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || ''
const RESTAURANT_LAT  = 28.9845
const RESTAURANT_LNG  = 77.7064

// ── Load Google Maps ──────────────────────────────────────────────
let _gmapsPromise = null

function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (_gmapsPromise) return _gmapsPromise
  if (!GOOGLE_MAPS_KEY) return Promise.reject(new Error('NO_KEY'))

  _gmapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return }
    const cbName = '__gmInitCb'
    window[cbName] = () => { resolve(window.google.maps); delete window[cbName] }
    const s   = document.createElement('script')
    s.src     = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=${cbName}`
    s.async   = true
    s.defer   = true
    s.onerror = () => { _gmapsPromise = null; delete window[cbName]; reject(new Error('LOAD_FAILED')) }
    document.head.appendChild(s)
  })
  return _gmapsPromise
}

// ── Google Map Component ──────────────────────────────────────────
function GoogleMapView({ riders, selected, onSelect, optimizedRoute, onClearRoute }) {
  const mapRef         = useRef(null)
  const mapInstance    = useRef(null)
  const markersRef     = useRef({})
  const infoWinRef     = useRef(null)
  const pathsRef       = useRef({})
  const trailRef       = useRef({})
  const routeMarkersRef= useRef([])   // stop numbered markers
  const routePolyRef   = useRef(null) // route polyline

  // Init map
  useEffect(() => {
    let cancelled = false
    loadGoogleMaps().then(gmaps => {
      if (cancelled || mapInstance.current || !mapRef.current) return
      mapInstance.current = new gmaps.Map(mapRef.current, {
        center:             { lat: RESTAURANT_LAT, lng: RESTAURANT_LNG },
        zoom:               14,
        mapTypeControl:     false,
        streetViewControl:  false,
        fullscreenControl:  true,
        zoomControlOptions: { position: gmaps.ControlPosition.RIGHT_CENTER },
        styles: [
          { featureType:'poi',     stylers:[{ visibility:'off' }] },
          { featureType:'transit', stylers:[{ visibility:'off' }] },
        ],
      })
      infoWinRef.current = new gmaps.InfoWindow()
      new gmaps.Marker({
        map:      mapInstance.current,
        position: { lat: RESTAURANT_LAT, lng: RESTAURANT_LNG },
        title:    'Restaurant',
        icon:     { url:'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    scaledSize: new gmaps.Size(40, 40) },
        zIndex: 999,
      })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Update rider markers when riders change
  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps) return
    const gmaps = window.google.maps
    riders.forEach(rider => {
      const pos   = { lat: rider.latitude, lng: rider.longitude }
      const cfg   = STATUS_CFG[rider.status] || STATUS_CFG.OFFLINE
      const isSel = selected?.id === rider.id
      const icon  = { url: cfg.pin, scaledSize: new gmaps.Size(isSel ? 44 : 36, isSel ? 44 : 36) }

      if (markersRef.current[rider.id]) {
        animateMarker(markersRef.current[rider.id], pos, gmaps)
        markersRef.current[rider.id].setIcon(icon)
        updateTrail(rider.id, pos, gmaps)
      } else {
        const marker = new gmaps.Marker({
          map: mapInstance.current, position: pos, title: rider.name, icon,
          animation: rider.available ? gmaps.Animation.DROP : null,
          label: { text: rider.name.split(' ')[0][0], color:'#fff', fontWeight:'bold', fontSize:'12px' },
          zIndex: isSel ? 100 : 10,
        })
        marker.addListener('click', () => {
          onSelect(rider)
          infoWinRef.current.setContent(buildInfoContent(rider, cfg))
          infoWinRef.current.open(mapInstance.current, marker)
        })
        markersRef.current[rider.id] = marker
        trailRef.current[rider.id]   = [pos]
      }
    })
    Object.keys(markersRef.current).forEach(id => {
      if (!riders.find(r => r.id === Number(id))) {
        markersRef.current[id].setMap(null)
        if (pathsRef.current[id]) pathsRef.current[id].setMap(null)
        delete markersRef.current[id]
        delete pathsRef.current[id]
        delete trailRef.current[id]
      }
    })
  }, [riders, selected])

  // Pan to selected rider
  useEffect(() => {
    if (!selected || !mapInstance.current) return
    mapInstance.current.panTo({ lat: selected.latitude, lng: selected.longitude })
    mapInstance.current.setZoom(16)
  }, [selected?.id])

  // Draw / clear optimized route
  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps) return
    const gmaps = window.google.maps

    // Clear previous route
    routeMarkersRef.current.forEach(m => m.setMap(null))
    routeMarkersRef.current = []
    if (routePolyRef.current) { routePolyRef.current.setMap(null); routePolyRef.current = null }

    if (!optimizedRoute || !optimizedRoute.stops?.length) return

    const path = [
      { lat: optimizedRoute.riderLatitude, lng: optimizedRoute.riderLongitude },
      ...optimizedRoute.stops.map(s => ({ lat: s.latitude, lng: s.longitude })),
    ]

    // Orange dashed route polyline
    routePolyRef.current = new gmaps.Polyline({
      path,
      geodesic:      true,
      strokeColor:   '#f97316',
      strokeOpacity: 0.85,
      strokeWeight:  3,
      map:           mapInstance.current,
      zIndex:        5,
      icons: [{
        icon:   { path: gmaps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, strokeColor:'#f97316' },
        offset: '100%',
        repeat: '70px',
      }],
    })

    // Numbered stop markers
    optimizedRoute.stops.forEach(stop => {
      const marker = new gmaps.Marker({
        map:      mapInstance.current,
        position: { lat: stop.latitude, lng: stop.longitude },
        title:    `Stop ${stop.sequence}: ${stop.address}`,
        label: { text: String(stop.sequence), color:'#fff', fontWeight:'bold', fontSize:'11px' },
        icon: {
          path:         gmaps.SymbolPath.CIRCLE,
          scale:        13,
          fillColor:    '#f97316',
          fillOpacity:  1,
          strokeColor:  '#fff',
          strokeWeight: 2,
        },
        zIndex: 200,
      })
      routeMarkersRef.current.push(marker)
    })

    // Fit map to show full route
    const bounds = new gmaps.LatLngBounds()
    path.forEach(p => bounds.extend(p))
    mapInstance.current.fitBounds(bounds, { top:40, bottom:40, left:40, right:40 })
  }, [optimizedRoute])

  // ── Trail ────────────────────────────────────────────────────────
  function updateTrail(riderId, newPos, gmaps) {
    const trail = trailRef.current[riderId] || []
    trail.push(newPos)
    if (trail.length > 10) trail.shift()
    trailRef.current[riderId] = trail
    if (pathsRef.current[riderId]) {
      pathsRef.current[riderId].setPath(trail)
    } else {
      pathsRef.current[riderId] = new gmaps.Polyline({
        path, map: mapInstance.current, geodesic: true,
        strokeColor:'#2563eb', strokeOpacity:0.5, strokeWeight:2,
        icons: [{ icon:{ path:gmaps.SymbolPath.FORWARD_CLOSED_ARROW, scale:2 }, offset:'100%' }],
      })
    }
  }

  // ── Smooth animation ────────────────────────────────────────────
  function animateMarker(marker, targetPos, gmaps) {
    const startPos = marker.getPosition()
    if (!startPos) { marker.setPosition(targetPos); return }
    const startLat = startPos.lat(), startLng = startPos.lng()
    const deltaLat = targetPos.lat - startLat, deltaLng = targetPos.lng - startLng
    let step = 0
    const timer = setInterval(() => {
      step++
      const frac = step / 30
      marker.setPosition({ lat: startLat + deltaLat * easeInOut(frac), lng: startLng + deltaLng * easeInOut(frac) })
      if (step >= 30) clearInterval(timer)
    }, 16)
  }

  function easeInOut(t) { return t < .5 ? 2*t*t : -1+(4-2*t)*t }

  function buildInfoContent(rider, cfg) {
    return `
      <div style="padding:10px 12px;min-width:190px;font-family:sans-serif">
        <div style="font-weight:700;font-size:14px;margin-bottom:5px">🛵 ${rider.name}</div>
        <div style="font-size:12px;color:#555;margin-bottom:6px">📞 ${rider.phone}</div>
        <span style="padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;
          background:${cfg.bg};color:${cfg.color}">${cfg.label}</span>
        <div style="margin-top:8px;font-size:12px;color:#333">
          📦 <b>${rider.currentOrders||0}</b> orders &nbsp;⭐ <b>${rider.rating||'—'}</b> &nbsp;🔢 Cap: ${rider.capacity||'—'}
        </div>
        <div style="margin-top:4px;font-size:10px;color:#aaa;font-family:monospace">
          📍 ${rider.latitude.toFixed(5)}, ${rider.longitude.toFixed(5)}
        </div>
      </div>`
  }

  return (
    <div style={{ position:'relative', height:'100%', borderRadius:10,
      overflow:'hidden', border:'1px solid #e8eaed' }}>
      <div ref={mapRef} style={{ width:'100%', height:'100%' }}/>
      {!GOOGLE_MAPS_KEY && <NoKeyOverlay/>}

      {/* Route active overlay badge */}
      {optimizedRoute?.stopCount > 0 && (
        <div style={{ position:'absolute', top:10, left:10,
          background:'#fff', border:'2px solid #f97316', borderRadius:8,
          padding:'6px 12px', display:'flex', alignItems:'center', gap:8,
          boxShadow:'0 2px 8px rgba(249,115,22,.25)', fontSize:12, fontWeight:600 }}>
          <span style={{ color:'#f97316' }}>🗺 Route Active</span>
          <span style={{ color:'#aaa', fontWeight:400 }}>
            {optimizedRoute.stopCount} stops · {optimizedRoute.totalDistanceKm} km
          </span>
          <button onClick={onClearRoute}
            style={{ background:'none', border:'none', cursor:'pointer',
              color:'#aaa', fontSize:14, padding:0, lineHeight:1 }}>×</button>
        </div>
      )}
    </div>
  )
}

// ── No Key fallback ───────────────────────────────────────────────
function NoKeyOverlay() {
  return (
    <div style={{ position:'absolute', inset:0, background:'#eff6ff',
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:10 }}>
      <div style={{ fontSize:36 }}>🗺️</div>
      <div style={{ fontSize:14, fontWeight:600, color:'#1e40af' }}>Google Maps API Key Required</div>
      <div style={{ background:'#1e293b', color:'#10b981', padding:'8px 18px',
        borderRadius:6, fontSize:12, fontFamily:'monospace' }}>
        VITE_GOOGLE_MAPS_KEY=your_key_here
      </div>
    </div>
  )
}

// ── Status badge for delivery stop ───────────────────────────────
const STOP_STATUS = {
  ASSIGNED:   { label:'Assigned',   color:'#2563eb', bg:'#dbeafe' },
  PICKED_UP:  { label:'Picked Up',  color:'#d97706', bg:'#fef3c7' },
  ON_THE_WAY: { label:'On the Way', color:'#16a34a', bg:'#dcfce7' },
}

// ── Main Component ────────────────────────────────────────────────
export default function RiderTracking() {
  const api  = useRiderApi()
  const toast= useToast()

  const [riders,         setRiders]         = useState([])
  const [loading,        setLoading]        = useState(true)
  const [selected,       setSelected]       = useState(null)
  const [filter,         setFilter]         = useState('ALL')
  const [wsStatus,       setWsStatus]       = useState('connecting')
  const [lastUpdate,     setLastUpdate]     = useState(null)
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [routeLoading,   setRouteLoading]   = useState(false)
  const intervalRef = useRef(null)

  // ── Initial REST load ─────────────────────────────────────────
  const loadRiders = useCallback(async () => {
    try {
      const data = await api.getActiveRiders()
      const list = Array.isArray(data) ? data : MOCK_RIDERS
      setRiders(list.map(r => ({
        ...r,
        status:          r.status || (r.available ? 'AVAILABLE' : 'OFFLINE'),
        currentOrders:   r.currentOrders   ?? 0,
        todayDeliveries: r.todayDeliveries ?? 0,
        totalDeliveries: r.totalDeliveries ?? 0,
        rating:          r.rating          ?? 4.5,
        lastUpdated:     Date.now(),
      })))
    } catch(_) { setRiders(MOCK_RIDERS) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadRiders()
    intervalRef.current = setInterval(loadRiders, 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  // ── WebSocket ─────────────────────────────────────────────────
  const riderIds = riders.map(r => r.id)
  const { reconnect } = useRiderWebSocket(riderIds, (update) => {
    setRiders(prev => prev.map(r =>
      r.id === update.riderId
        ? { ...r, latitude:update.latitude, longitude:update.longitude, lastUpdated:update.timestamp }
        : r
    ))
    setSelected(prev =>
      prev?.id === update.riderId
        ? { ...prev, latitude:update.latitude, longitude:update.longitude }
        : prev
    )
    setWsStatus('live')
    setLastUpdate(new Date().toLocaleTimeString('en-IN',
      { hour:'2-digit', minute:'2-digit', second:'2-digit' }))
  }, () => setWsStatus('live'))

  // ── Route optimization ────────────────────────────────────────
  const optimizeRoute = async (riderId) => {
    setRouteLoading(true)
    try {
      const route = await api.getOptimizedRoute(riderId)
      if (route.stopCount === 0) {
        toast?.('No active deliveries for this rider', 'warning')
      } else {
        setOptimizedRoute(route)
      }
    } catch(e) {
      toast?.('Route optimization failed', 'error')
    } finally {
      setRouteLoading(false)
    }
  }

  const clearRoute = () => setOptimizedRoute(null)

  // Dismiss route when rider is deselected
  useEffect(() => { if (!selected) setOptimizedRoute(null) }, [selected])

  const filtered = riders.filter(r => filter === 'ALL' || r.status === filter)
  const stats = {
    total:      riders.length,
    available:  riders.filter(r => r.status === 'AVAILABLE').length,
    onDelivery: riders.filter(r => r.status === 'ON_DELIVERY').length,
    offline:    riders.filter(r => r.status === 'OFFLINE').length,
  }

  const WS_BADGE = {
    connecting: { label:'Connecting...', color:'#d97706', bg:'#fef3c7', dot:'#f59e0b' },
    live:       { label:'LIVE',          color:'#16a34a', bg:'#dcfce7', dot:'#16a34a' },
    error:      { label:'Reconnecting',  color:'#ef4444', bg:'#fee2e2', dot:'#ef4444' },
  }
  const badge = WS_BADGE[wsStatus] || WS_BADGE.connecting

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:14 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', margin:0 }}>Rider Tracking</h1>
          <p style={{ fontSize:12, color:'#aaa', marginTop:3 }}>
            Real-time location via WebSocket · Google Maps
            {lastUpdate && <span style={{ color:'#10b981', marginLeft:8 }}>↻ {lastUpdate}</span>}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
            borderRadius:20, background:badge.bg, border:`1px solid ${badge.dot}30` }}>
            <div style={{ width:8, height:8, borderRadius:50, background:badge.dot,
              animation: wsStatus==='live' ? 'blink 1.5s ease-in-out infinite' : 'none' }}/>
            <span style={{ fontSize:11, fontWeight:600, color:badge.color }}>{badge.label}</span>
          </div>
          {wsStatus === 'error' && (
            <button onClick={() => { reconnect(); setWsStatus('connecting') }}
              style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #fca5a5',
                background:'#fff', color:'#ef4444', fontSize:11, fontWeight:600, cursor:'pointer' }}>
              🔄 Reconnect
            </button>
          )}
          <button onClick={loadRiders} style={{ padding:'7px 14px', borderRadius:6,
            border:'1px solid #dde1e7', background:'#fff', color:'#555',
            fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'Total',       v:stats.total,      icon:'🛵', c:'#6366f1', bg:'#ede9fe', k:'ALL'         },
          { label:'Available',   v:stats.available,  icon:'✅', c:'#16a34a', bg:'#dcfce7', k:'AVAILABLE'   },
          { label:'On Delivery', v:stats.onDelivery, icon:'📦', c:'#2563eb', bg:'#dbeafe', k:'ON_DELIVERY'  },
          { label:'Offline',     v:stats.offline,    icon:'⭕', c:'#6b7280', bg:'#f3f4f6', k:'OFFLINE'     },
        ].map(({ label, v, icon, c, bg, k }) => (
          <div key={k} onClick={() => setFilter(f => f===k ? 'ALL' : k)}
            style={{ background:'#fff', border:`2px solid ${filter===k?c:'#e8eaed'}`,
              borderRadius:10, padding:'12px 14px', cursor:'pointer',
              boxShadow: filter===k ? `0 0 0 3px ${c}20` : '0 1px 4px rgba(0,0,0,.04)',
              display:'flex', alignItems:'center', gap:10, transition:'all .15s' }}>
            <div style={{ width:38, height:38, borderRadius:9, background:bg,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Map + Panels */}
      <div style={{ display:'flex', gap:14, flex:1, minHeight:0, height:460 }}>

        {/* Google Map */}
        <div style={{ flex:1, minWidth:0, height:'100%' }}>
          {loading ? (
            <div style={{ height:'100%', background:'#f0f9ff', borderRadius:10,
              display:'flex', alignItems:'center', justifyContent:'center',
              border:'1px solid #bfdbfe', color:'#aaa', fontSize:14,
              flexDirection:'column', gap:8 }}>
              <div style={{ fontSize:32 }}>🗺️</div>Loading map...
            </div>
          ) : (
            <GoogleMapView
              riders={filtered}
              selected={selected}
              onSelect={r => setSelected(s => s?.id===r.id ? null : r)}
              optimizedRoute={optimizedRoute}
              onClearRoute={clearRoute}
            />
          )}
        </div>

        {/* Right panel: route stops (if active) or rider list */}
        <div style={{ width:290, flexShrink:0, display:'flex', flexDirection:'column',
          background:'#fff', border:`1px solid ${optimizedRoute ? '#fed7aa' : '#e8eaed'}`,
          borderRadius:10, overflow:'hidden',
          boxShadow: optimizedRoute ? '0 2px 12px rgba(249,115,22,.15)' : '0 1px 4px rgba(0,0,0,.04)' }}>

          {optimizedRoute ? (
            /* ── Route stops panel ── */
            <>
              <div style={{ padding:'11px 14px', borderBottom:'1px solid #fed7aa',
                background:'#fff7ed', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <span style={{ fontSize:13, fontWeight:700, color:'#c2410c' }}>
                    🗺 Optimized Route
                  </span>
                  <div style={{ fontSize:10, color:'#9a3412', marginTop:1 }}>
                    {optimizedRoute.stopCount} stops · {optimizedRoute.totalDistanceKm} km total
                  </div>
                </div>
                <button onClick={clearRoute}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    color:'#f97316', fontSize:18, lineHeight:1 }}>×</button>
              </div>

              <div style={{ flex:1, overflowY:'auto' }}>
                {/* Rider start */}
                <div style={{ padding:'10px 14px', borderBottom:'1px solid #f5f5f5',
                  display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:26, height:26, borderRadius:50,
                    background:'#2563eb', display:'flex', alignItems:'center',
                    justifyContent:'center', flexShrink:0, fontSize:13 }}>🛵</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e' }}>
                      {selected?.name || 'Rider'}
                    </div>
                    <div style={{ fontSize:10, color:'#aaa', fontFamily:'monospace' }}>
                      {optimizedRoute.riderLatitude.toFixed(4)}, {optimizedRoute.riderLongitude.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Stops */}
                {optimizedRoute.stops.map(stop => {
                  const sc = STOP_STATUS[stop.status] || STOP_STATUS.ASSIGNED
                  return (
                    <div key={stop.deliveryId}
                      style={{ padding:'10px 14px', borderBottom:'1px solid #f5f5f5' }}>
                      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        {/* Sequence badge */}
                        <div style={{ width:26, height:26, borderRadius:50,
                          background:'#f97316', color:'#fff', fontSize:12,
                          fontWeight:700, display:'flex', alignItems:'center',
                          justifyContent:'center', flexShrink:0 }}>
                          {stop.sequence}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'#1a1a2e',
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {stop.address || 'Address N/A'}
                          </div>
                          <div style={{ display:'flex', gap:6, marginTop:3, alignItems:'center' }}>
                            <span style={{ fontSize:10, padding:'1px 7px', borderRadius:10,
                              background:sc.bg, color:sc.color, fontWeight:600 }}>
                              {sc.label}
                            </span>
                            <span style={{ fontSize:10, color:'#aaa' }}>
                              +{stop.distanceFromPrev} km
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Total */}
                <div style={{ padding:'10px 14px', background:'#fff7ed',
                  borderTop:'1px solid #fed7aa', display:'flex',
                  justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'#c2410c', fontWeight:600 }}>Total Distance</span>
                  <span style={{ fontSize:14, fontWeight:800, color:'#ea580c' }}>
                    {optimizedRoute.totalDistanceKm} km
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* ── Rider list panel ── */
            <>
              <div style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0',
                background:'#fafafa', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>
                  🛵 Riders ({filtered.length})
                </span>
                {filter !== 'ALL' && (
                  <button onClick={() => setFilter('ALL')} style={{ fontSize:10,
                    color:'#e53e3e', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                    Clear ×
                  </button>
                )}
              </div>

              <div style={{ flex:1, overflowY:'auto' }}>
                {filtered.map(rider => {
                  const cfg    = STATUS_CFG[rider.status] || STATUS_CFG.OFFLINE
                  const isSel  = selected?.id === rider.id
                  const isRecent = rider.lastUpdated && (Date.now() - rider.lastUpdated) < 3000
                  return (
                    <div key={rider.id}
                      onClick={() => setSelected(s => s?.id===rider.id ? null : rider)}
                      style={{ padding:'11px 14px', borderBottom:'1px solid #f5f5f5',
                        cursor:'pointer', transition:'all .2s',
                        background: isRecent ? '#f0fdf4' : isSel ? '#eff6ff' : '#fff',
                        borderLeft: `3px solid ${isSel?'#2563eb':isRecent?'#16a34a':'transparent'}` }}
                      onMouseEnter={e=>{ if(!isSel&&!isRecent) e.currentTarget.style.background='#fafafa' }}
                      onMouseLeave={e=>{ if(!isSel&&!isRecent) e.currentTarget.style.background='#fff' }}>

                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>{rider.name}</span>
                            {isRecent && <div style={{ width:7, height:7, borderRadius:50,
                              background:'#16a34a', flexShrink:0,
                              animation:'blink 1s ease-in-out infinite' }}/>}
                          </div>
                          <div style={{ fontSize:11, color:'#888' }}>{rider.phone}</div>
                        </div>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20,
                          fontWeight:600, background:cfg.bg, color:cfg.color, whiteSpace:'nowrap' }}>
                          {cfg.label}
                        </span>
                      </div>

                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',
                        gap:4, marginTop:8, textAlign:'center' }}>
                        {[
                          [rider.currentOrders  ||0, 'Orders', '#2563eb'],
                          [rider.todayDeliveries||0, 'Today',  '#10b981'],
                          [`${rider.rating||'—'}⭐`, 'Rating','#f59e0b'],
                          [rider.totalDeliveries||0, 'Total',  '#6366f1'],
                        ].map(([v,l,c]) => (
                          <div key={l}>
                            <div style={{ fontSize:12, fontWeight:700, color:c }}>{v}</div>
                            <div style={{ fontSize:9, color:'#aaa' }}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop:5, fontSize:10, color:'#aaa', fontFamily:'monospace' }}>
                        📍 {rider.latitude.toFixed(4)}, {rider.longitude.toFixed(4)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected rider bottom bar */}
      {selected && (
        <div style={{ background:'#fff', border:'1px solid #dbeafe', borderRadius:10,
          padding:'12px 18px', display:'flex', alignItems:'center',
          gap:16, flexWrap:'wrap', boxShadow:'0 2px 8px rgba(37,99,235,.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:50, fontSize:18,
              background: STATUS_CFG[selected.status]?.bg || '#f3f4f6',
              display:'flex', alignItems:'center', justifyContent:'center' }}>🛵</div>
            <div>
              <div style={{ fontSize:14, fontWeight:700 }}>{selected.name}</div>
              <div style={{ fontSize:11, color:'#888' }}>{selected.phone}</div>
            </div>
          </div>
          <div style={{ width:1, height:32, background:'#e8eaed' }}/>
          {[
            ['Status',   STATUS_CFG[selected.status]?.label],
            ['Orders',   selected.currentOrders],
            ['Today',    selected.todayDeliveries],
            ['Rating',   `${selected.rating}⭐`],
            ['Capacity', `${selected.currentOrders}/${selected.capacity}`],
            ['Location', `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize:10, color:'#aaa' }}>{label}</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#1a1a2e' }}>{value}</div>
            </div>
          ))}

          {/* Optimize Route button */}
          <button
            onClick={() => optimizeRoute(selected.id)}
            disabled={routeLoading}
            style={{ marginLeft:'auto', padding:'7px 16px', borderRadius:7,
              border:'none', cursor: routeLoading ? 'not-allowed' : 'pointer',
              background: optimizedRoute ? '#fff7ed' : '#f97316',
              color: optimizedRoute ? '#ea580c' : '#fff',
              fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6,
              border: optimizedRoute ? '1px solid #fed7aa' : 'none',
              transition:'all .15s',
              opacity: routeLoading ? 0.7 : 1 }}>
            {routeLoading ? '⏳ Optimizing...' : optimizedRoute ? '🔄 Re-optimize' : '🗺 Optimize Route'}
          </button>

          <button onClick={() => setSelected(null)} style={{ background:'none', border:'none',
            cursor:'pointer', color:'#aaa', fontSize:20 }}>×</button>
        </div>
      )}

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>
  )
}
