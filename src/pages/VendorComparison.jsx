// src/pages/VendorComparison.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = () => (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function authHeaders() {
  const { token } = useAuthStore.getState()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

// ── Log Price Modal ─────────────────────────────────────────────────────────
function LogPriceModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    rawMaterialId: '', rawMaterialName: '',
    vendorName: '', price: '', unit: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.rawMaterialId || !form.vendorName || !form.price) {
      setErr('Raw Material ID, Vendor Name, and Price are required')
      return
    }
    setSaving(true); setErr('')
    try {
      const res = await fetch(`${BASE()}/vendors/prices`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          rawMaterialId: Number(form.rawMaterialId),
          price: parseFloat(form.price),
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.message || 'Failed to log price')
      }
      const data = await res.json()
      onSaved(data)
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
        width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px #0008', border: '1px solid #334155',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Log Vendor Price</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>RAW MATERIAL ID *</label><input type="number" value={form.rawMaterialId} onChange={e => set('rawMaterialId', e.target.value)} placeholder="e.g. 5" style={inp} /></div>
            <div><label style={lbl}>MATERIAL NAME</label><input value={form.rawMaterialName} onChange={e => set('rawMaterialName', e.target.value)} placeholder="e.g. Tomatoes" style={inp} /></div>
          </div>
          <div><label style={lbl}>VENDOR NAME *</label><input value={form.vendorName} onChange={e => set('vendorName', e.target.value)} placeholder="Vendor / Supplier name" style={inp} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>PRICE (₹) *</label><input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" style={inp} /></div>
            <div><label style={lbl}>UNIT</label><input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="kg / L / pcs" style={inp} /></div>
          </div>
          <div><label style={lbl}>NOTES</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" rows={2} style={{ ...inp, resize: 'vertical' }} /></div>

          {err && (
            <div style={{ background: '#450a0a', border: '1px solid #ef444440', borderRadius: 8, padding: '8px 12px', color: '#ef4444', fontSize: 12 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={handleSubmit} disabled={saving} style={{
              flex: 1, background: saving ? '#475569' : '#3b82f6', color: '#fff',
              border: 'none', borderRadius: 8, padding: '10px 16px',
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              {saving ? 'Saving...' : 'Log Price'}
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

// ── Main Page ───────────────────────────────────────────────────────────────
export default function VendorComparison() {
  const [allPrices, setAllPrices]       = useState([])
  const [comparison, setComparison]     = useState([])
  const [materials, setMaterials]       = useState([])
  const [pricesLoading, setPricesLoading] = useState(true)
  const [cmpLoading, setCmpLoading]     = useState(false)

  const [selectedMaterialId, setSelectedMaterialId]   = useState('')
  const [selectedMaterialName, setSelectedMaterialName] = useState('')
  const [searchText, setSearchText]     = useState('')
  const [monthlyQty, setMonthlyQty]     = useState('')
  const [showModal, setShowModal]       = useState(false)

  const loadPrices = useCallback(async () => {
    setPricesLoading(true)
    try {
      const res = await fetch(`${BASE()}/vendors/prices`, { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        setAllPrices(Array.isArray(d) ? d : d.content || [])
      }
    } catch { /* ignore */ }
    finally { setPricesLoading(false) }
  }, [])

  const loadMaterials = useCallback(async () => {
    try {
      const res = await fetch(`${BASE()}/vendors/prices/vendors`, { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        setMaterials(Array.isArray(d) ? d : [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadPrices()
    loadMaterials()
  }, [loadPrices, loadMaterials])

  async function loadComparison(materialId) {
    if (!materialId) { setComparison([]); return }
    setCmpLoading(true)
    try {
      const res = await fetch(`${BASE()}/vendors/prices/compare/${materialId}`, { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        const arr = Array.isArray(d) ? d : d.prices || d.content || []
        setComparison([...arr].sort((a, b) => (a.price || 0) - (b.price || 0)))
      } else {
        setComparison([])
      }
    } catch { setComparison([]) }
    finally { setCmpLoading(false) }
  }

  function handleSelectMaterial(id, name) {
    setSelectedMaterialId(id)
    setSelectedMaterialName(name)
    setSearchText(name || id)
    loadComparison(id)
  }

  function handlePriceLogged(p) {
    setAllPrices(prev => [p, ...prev])
    if (selectedMaterialId && String(p.rawMaterialId) === String(selectedMaterialId)) {
      loadComparison(selectedMaterialId)
    }
  }

  // Potential savings calculation
  const cheapest  = comparison.length > 0 ? comparison[0].price : 0
  const expensive = comparison.length > 0 ? comparison[comparison.length - 1].price : 0
  const savings   = monthlyQty ? (expensive - cheapest) * parseFloat(monthlyQty) : null

  // Filtered materials for search dropdown
  const filteredMaterials = materials.filter(m =>
    !searchText || (m.rawMaterialName || '').toLowerCase().includes(searchText.toLowerCase()) ||
    String(m.rawMaterialId || '').includes(searchText)
  ).slice(0, 10)

  const cardStyle = {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Vendor Price Comparison</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Compare vendor quotes and find the best deal for each raw material</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
          padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          + Log Price
        </button>
      </div>

      {/* Material Search */}
      <div style={cardStyle}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 12 }}>
          SELECT RAW MATERIAL TO COMPARE
        </div>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <input
            value={searchText}
            onChange={e => {
              setSearchText(e.target.value)
              if (!e.target.value) { setSelectedMaterialId(''); setComparison([]) }
            }}
            placeholder="Type material name or ID..."
            style={{
              background: '#334155', border: '1px solid #475569', color: '#fff',
              padding: '9px 14px', borderRadius: 8, width: '100%', fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
          {searchText && filteredMaterials.length > 0 && !selectedMaterialId && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
              marginTop: 4, boxShadow: '0 8px 24px #0006', maxHeight: 200, overflowY: 'auto',
            }}>
              {filteredMaterials.map(m => (
                <div key={m.rawMaterialId}
                  onClick={() => handleSelectMaterial(m.rawMaterialId, m.rawMaterialName)}
                  style={{
                    padding: '9px 14px', cursor: 'pointer', color: '#fff', fontSize: 13,
                    borderBottom: '1px solid #334155', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ color: '#60a5fa', fontWeight: 600, marginRight: 8 }}>#{m.rawMaterialId}</span>
                  {m.rawMaterialName}
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedMaterialId && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#1d4ed820', color: '#60a5fa', fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
              ID: {selectedMaterialId} — {selectedMaterialName}
            </span>
            <button onClick={() => { setSelectedMaterialId(''); setSelectedMaterialName(''); setSearchText(''); setComparison([]) }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      {selectedMaterialId && (
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 12 }}>
            VENDOR COMPARISON — {selectedMaterialName || `Material #${selectedMaterialId}`}
          </div>
          {cmpLoading ? (
            <div style={{ color: '#64748b', fontSize: 13, padding: '20px 0' }}>Loading comparison...</div>
          ) : comparison.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13, padding: '20px 0' }}>
              No price data found for this material. Log prices using the "+ Log Price" button.
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0f172a' }}>
                      {['Rank', 'Vendor Name', 'Price', 'Unit', 'Date Quoted', 'Notes'].map(h => (
                        <th key={h} style={{
                          padding: '9px 16px', textAlign: 'left', fontSize: 11,
                          color: '#64748b', fontWeight: 700, borderBottom: '1px solid #334155',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((v, i) => {
                      const isCheapest = i === 0
                      const rowBg = isCheapest ? '#052e16' : 'transparent'
                      return (
                        <tr key={v.id || v.vendorName + i}
                          style={{ background: rowBg, transition: 'background 0.1s' }}
                          onMouseEnter={e => { if (!isCheapest) e.currentTarget.style.background = '#0f172a' }}
                          onMouseLeave={e => { if (!isCheapest) e.currentTarget.style.background = 'transparent' }}>
                          <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155' }}>
                            {isCheapest ? (
                              <span style={{ background: '#166534', color: '#22c55e', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                                CHEAPEST
                              </span>
                            ) : (
                              <span style={{ color: '#64748b' }}>#{i + 1}</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155', fontWeight: 600, color: isCheapest ? '#22c55e' : '#fff' }}>
                            {v.vendorName}
                          </td>
                          <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155', fontWeight: 700, color: isCheapest ? '#22c55e' : '#f59e0b' }}>
                            {fmt(v.price)}
                          </td>
                          <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                            {v.unit || '—'}
                          </td>
                          <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155', color: '#64748b', fontSize: 12 }}>
                            {fmtDate(v.createdAt || v.quotedAt)}
                          </td>
                          <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 12, maxWidth: 200 }}>
                            {v.notes || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Potential Savings */}
              {comparison.length >= 2 && (
                <div style={{ marginTop: 16, background: '#0f172a', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 10 }}>
                    POTENTIAL SAVINGS CALCULATOR
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Price spread: </span>
                    <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 13 }}>{fmt(expensive)}</span>
                    <span style={{ color: '#64748b' }}>→</span>
                    <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 13 }}>{fmt(cheapest)}</span>
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>
                      (diff: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{fmt(expensive - cheapest)}</span> per unit)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Estimated monthly quantity:</span>
                    <input
                      type="number" value={monthlyQty} onChange={e => setMonthlyQty(e.target.value)}
                      placeholder="e.g. 50"
                      style={{
                        background: '#334155', border: '1px solid #475569', color: '#fff',
                        padding: '5px 10px', borderRadius: 6, fontSize: 13, width: 100,
                      }}
                    />
                    {savings !== null && (
                      <div style={{ background: '#052e16', borderRadius: 8, padding: '6px 14px', color: '#22c55e', fontWeight: 700, fontSize: 14 }}>
                        Potential saving: {fmt(savings)}/month
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* All Price Logs */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' }}>ALL PRICE LOGS</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                {['Material', 'Vendor', 'Price', 'Unit', 'Notes', 'Logged On'].map(h => (
                  <th key={h} style={{
                    padding: '9px 16px', textAlign: 'left', fontSize: 11,
                    color: '#64748b', fontWeight: 700, borderBottom: '1px solid #334155',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
                        <div style={{ height: 12, borderRadius: 4, background: '#334155', width: j === 0 ? 120 : 70 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : allPrices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                    No price logs yet. Click "+ Log Price" to add one.
                  </td>
                </tr>
              ) : allPrices.map((p, i) => (
                <tr key={p.id || i}
                  style={{ transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155', fontWeight: 600, color: '#fff' }}>
                    {p.rawMaterialName || `Material #${p.rawMaterialId}`}
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    {p.vendorName}
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155', fontWeight: 600, color: '#f59e0b' }}>
                    {fmt(p.price)}
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155', color: '#64748b' }}>
                    {p.unit || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: 12, maxWidth: 180 }}>
                    {p.notes || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #334155', color: '#64748b', fontSize: 12 }}>
                    {fmtDate(p.createdAt || p.quotedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <LogPriceModal onClose={() => setShowModal(false)} onSaved={handlePriceLogged} />
      )}
    </div>
  )
}
