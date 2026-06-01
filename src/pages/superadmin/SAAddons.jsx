import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../../api/client'

const ADDON_META = {
  WHATSAPP_NOTIFICATIONS: 'WhatsApp Notifications',
  ADVANCED_REPORTS:       'Advanced Reports',
  QR_ORDERING:            'QR Ordering',
  KITCHEN_DISPLAY:        'Kitchen Display System',
  RIDER_TRACKING:         'Rider Tracking',
  AGGREGATOR_SYNC:        'Aggregator Sync',
  LOYALTY_POINTS:         'Loyalty Points',
  GIFT_CARDS:             'Gift Cards',
}

const ALL_ADDONS = Object.keys(ADDON_META)

function formatDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
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

function AddonCard({ addon }) {
  const isActive = addon.isActive ?? addon.active ?? false
  const name = ADDON_META[addon.addonId] || addon.name || addon.addonId || '—'

  return (
    <div style={{
      background: '#0F0F1A',
      border: `1px solid ${isActive ? '#863bff44' : '#2a2a3e'}`,
      borderRadius: 10,
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{name}</div>
        <div style={{ fontSize: 11, color: '#666' }}>
          Granted {formatDate(addon.grantedAt)}
          {addon.expiresAt ? ` · Expires ${formatDate(addon.expiresAt)}` : ''}
        </div>
      </div>
      <span style={{
        flexShrink: 0,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: isActive ? '#10b98122' : '#ef444422',
        color: isActive ? '#10b981' : '#ef4444',
      }}>
        {isActive ? 'Active' : 'Expired'}
      </span>
    </div>
  )
}

function GrantModal({ restaurantId, onClose, onGranted }) {
  const [selectedAddon, setSelectedAddon] = useState(null)
  const [days, setDays] = useState(365)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleGrant() {
    if (!selectedAddon) return
    setLoading(true)
    setError(null)
    adminApi.grantAddon(restaurantId, selectedAddon, days)
      .then(() => onGranted())
      .catch(err => setError(err?.message || 'Failed to grant addon'))
      .finally(() => setLoading(false))
  }

  return (
    <div style={{
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
        maxWidth: 480,
        boxShadow: '0 24px 48px #00000099',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>Grant New Addon</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 0,
            }}
          >×</button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Select Addon
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ALL_ADDONS.map(id => (
              <button
                key={id}
                onClick={() => setSelectedAddon(id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${selectedAddon === id ? '#863bff' : '#2a2a3e'}`,
                  background: selectedAddon === id ? '#863bff22' : '#0F0F1A',
                  color: selectedAddon === id ? '#863bff' : '#aaa',
                  transition: 'all 0.15s',
                }}
              >
                {ADDON_META[id]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Duration (Days)
          </label>
          <input
            type="number"
            min={1}
            max={3650}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 8,
              padding: '10px 14px',
              background: '#0F0F1A',
              border: '1px solid #2a2a3e',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#ef444418', border: '1px solid #ef444440', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: '1px solid #2a2a3e',
              background: 'none',
              color: '#aaa',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGrant}
            disabled={!selectedAddon || loading}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: 'none',
              background: selectedAddon && !loading ? '#863bff' : '#3a3a5e',
              color: selectedAddon && !loading ? '#fff' : '#666',
              fontSize: 13,
              fontWeight: 700,
              cursor: selectedAddon && !loading ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Granting…' : 'Grant Addon'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SAAddons() {
  const [restaurants, setRestaurants] = useState([])
  const [restsLoading, setRestsLoading] = useState(true)
  const [restsError, setRestsError] = useState(null)

  const [selectedId, setSelectedId] = useState('')
  const [addons, setAddons] = useState([])
  const [addonsLoading, setAddonsLoading] = useState(false)
  const [addonsError, setAddonsError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setRestsLoading(true)
    adminApi.getRestaurants()
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.content || data?.restaurants || [])
        setRestaurants(list)
      })
      .catch(err => setRestsError(err?.message || 'Failed to load restaurants'))
      .finally(() => setRestsLoading(false))
  }, [])

  const loadAddons = useCallback((id) => {
    if (!id) return
    setAddonsLoading(true)
    setAddonsError(null)
    setAddons([])
    adminApi.getFeatureAddons(id)
      .then(data => setAddons(Array.isArray(data) ? data : []))
      .catch(err => setAddonsError(err?.message || 'Failed to load addons'))
      .finally(() => setAddonsLoading(false))
  }, [])

  function handleSelect(id) {
    setSelectedId(id)
    setSuccessMsg(null)
    loadAddons(id)
  }

  function handleGranted() {
    setShowModal(false)
    setSuccessMsg('Addon granted successfully!')
    loadAddons(selectedId)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const selectedRestaurant = restaurants.find(r => String(r.id) === String(selectedId))

  const filteredRests = searchTerm
    ? restaurants.filter(r =>
        (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.city || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : restaurants

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Feature Addons</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Grant premium features to restaurants</p>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{
          width: 280,
          flexShrink: 0,
          background: '#1A1A2E',
          borderRadius: 12,
          border: '1px solid #2a2a3e',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a2a3e' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Restaurants
            </div>
            <input
              type="text"
              placeholder="Search…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                background: '#0F0F1A',
                border: '1px solid #2a2a3e',
                borderRadius: 7,
                color: '#fff',
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {restsLoading && <Spinner />}
          {restsError && (
            <div style={{ padding: 16, color: '#ef4444', fontSize: 12 }}>{restsError}</div>
          )}

          {!restsLoading && !restsError && (
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {filteredRests.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#666', fontSize: 13 }}>No restaurants</div>
              )}
              {filteredRests.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(String(r.id))}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '11px 16px',
                    background: String(selectedId) === String(r.id) ? '#863bff18' : 'none',
                    border: 'none',
                    borderLeft: `3px solid ${String(selectedId) === String(r.id) ? '#863bff' : 'transparent'}`,
                    borderBottom: '1px solid #1e1e30',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.name || `Restaurant #${r.id}`}</div>
                  {r.city && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{r.city}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedId && (
            <div style={{
              background: '#1A1A2E',
              border: '1px solid #2a2a3e',
              borderRadius: 12,
              padding: 48,
              textAlign: 'center',
              color: '#555',
              fontSize: 14,
            }}>
              Select a restaurant to view and manage its feature addons
            </div>
          )}

          {selectedId && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    {selectedRestaurant?.name || `Restaurant #${selectedId}`}
                  </h2>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                    {addons.length} addon{addons.length !== 1 ? 's' : ''} granted
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    padding: '9px 18px',
                    background: '#863bff',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Grant New Addon
                </button>
              </div>

              {successMsg && (
                <div style={{
                  marginBottom: 16,
                  padding: '11px 16px',
                  background: '#10b98118',
                  border: '1px solid #10b98140',
                  borderRadius: 8,
                  color: '#10b981',
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  {successMsg}
                </div>
              )}

              {addonsLoading && <Spinner />}

              {addonsError && (
                <div style={{ padding: '12px 16px', background: '#ef444418', border: '1px solid #ef444440', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
                  {addonsError}
                </div>
              )}

              {!addonsLoading && !addonsError && addons.length === 0 && (
                <div style={{
                  background: '#1A1A2E',
                  border: '1px solid #2a2a3e',
                  borderRadius: 12,
                  padding: 40,
                  textAlign: 'center',
                  color: '#555',
                  fontSize: 14,
                }}>
                  No addons granted to this restaurant yet
                </div>
              )}

              {!addonsLoading && !addonsError && addons.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {addons.map((addon, idx) => (
                    <AddonCard key={addon.addonId || idx} addon={addon} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && selectedId && (
        <GrantModal
          restaurantId={selectedId}
          onClose={() => setShowModal(false)}
          onGranted={handleGranted}
        />
      )}
    </div>
  )
}
