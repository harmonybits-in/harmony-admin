// src/pages/ExpiryTracking.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = () => (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function authHeaders() {
  const { token } = useAuthStore.getState()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null
  const diff = new Date(expiryDate) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function ExpiryCell({ expiryDate }) {
  const days = daysUntilExpiry(expiryDate)
  let color = '#94a3b8', bg = 'transparent'
  if (days !== null && days < 7)  { color = '#ef4444'; bg = '#450a0a' }
  else if (days !== null && days < 30) { color = '#f59e0b'; bg = '#451a03' }
  return (
    <span style={{ padding: bg !== 'transparent' ? '3px 8px' : 0, borderRadius: 6, background: bg, color, fontWeight: days < 7 ? 700 : 400, fontSize: 12 }}>
      {fmtDate(expiryDate)}
      {days !== null && days >= 0 && days < 30 && (
        <span style={{ marginLeft: 6, fontSize: 10 }}>({days}d)</span>
      )}
      {days !== null && days < 0 && (
        <span style={{ marginLeft: 6, fontSize: 10, color: '#ef4444' }}>(EXPIRED)</span>
      )}
    </span>
  )
}

// ── Add Batch Modal ─────────────────────────────────────────────────────────
function AddBatchModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    rawMaterialId: '', rawMaterialName: '', batchNumber: '',
    quantity: '', unit: '', purchaseDate: '', expiryDate: '',
    vendorName: '', costPerUnit: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.rawMaterialId || !form.expiryDate || !form.quantity) {
      setErr('Raw Material ID, Quantity, and Expiry Date are required')
      return
    }
    setSaving(true); setErr('')
    try {
      const res = await fetch(`${BASE()}/inventory/batches`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          rawMaterialId: Number(form.rawMaterialId),
          quantity: parseFloat(form.quantity),
          costPerUnit: form.costPerUnit ? parseFloat(form.costPerUnit) : undefined,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.message || 'Failed to add batch')
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
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px #0008', border: '1px solid #334155',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Add Batch</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>RAW MATERIAL ID *</label><input type="number" value={form.rawMaterialId} onChange={e => set('rawMaterialId', e.target.value)} placeholder="e.g. 5" style={inp} /></div>
            <div><label style={lbl}>MATERIAL NAME</label><input value={form.rawMaterialName} onChange={e => set('rawMaterialName', e.target.value)} placeholder="e.g. Tomatoes" style={inp} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>BATCH NUMBER</label><input value={form.batchNumber} onChange={e => set('batchNumber', e.target.value)} placeholder="e.g. BT-001" style={inp} /></div>
            <div><label style={lbl}>VENDOR NAME</label><input value={form.vendorName} onChange={e => set('vendorName', e.target.value)} placeholder="Vendor" style={inp} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>QUANTITY *</label><input type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0.00" style={inp} /></div>
            <div><label style={lbl}>UNIT</label><input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="kg / L / pcs" style={inp} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>PURCHASE DATE</label><input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} style={inp} /></div>
            <div><label style={lbl}>EXPIRY DATE *</label><input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} style={inp} /></div>
          </div>
          <div><label style={lbl}>COST PER UNIT (₹)</label><input type="number" value={form.costPerUnit} onChange={e => set('costPerUnit', e.target.value)} placeholder="0.00" style={{ ...inp, maxWidth: 200 }} /></div>

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
              {saving ? 'Saving...' : 'Add Batch'}
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

// ── Batches Table ───────────────────────────────────────────────────────────
function BatchTable({ batches, loading, showExpireBtn, onMarkExpired }) {
  const cols = showExpireBtn
    ? ['Material', 'Batch #', 'Remaining Qty', 'Expiry Date', 'Vendor', 'Cost/Unit', 'Action']
    : ['Material', 'Batch #', 'Remaining Qty', 'Expiry Date', 'Vendor', 'Cost/Unit']

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {cols.map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left', fontSize: 11,
                  color: '#64748b', fontWeight: 700, borderBottom: '1px solid #334155', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {cols.map((_, j) => (
                    <td key={j} style={{ padding: '13px 16px', borderBottom: '1px solid #334155' }}>
                      <div style={{ height: 12, borderRadius: 4, background: '#334155', width: j === 0 ? 120 : 70 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={cols.length} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  No batches found
                </td>
              </tr>
            ) : batches.map(b => (
              <tr key={b.id}
                style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', fontWeight: 600, color: '#fff' }}>
                  {b.rawMaterialName || `Material #${b.rawMaterialId}`}
                </td>
                <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
                  {b.batchNumber || '—'}
                </td>
                <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', color: '#fff' }}>
                  {b.remainingQuantity ?? b.quantity ?? '—'} {b.unit || ''}
                </td>
                <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155' }}>
                  <ExpiryCell expiryDate={b.expiryDate} />
                </td>
                <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  {b.vendorName || '—'}
                </td>
                <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', color: '#f59e0b' }}>
                  {b.costPerUnit ? `₹${Number(b.costPerUnit).toLocaleString('en-IN')}` : '—'}
                </td>
                {showExpireBtn && (
                  <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155' }}>
                    <button onClick={() => onMarkExpired(b.id)} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: '#450a0a', color: '#ef4444',
                      border: '1px solid #ef444440', cursor: 'pointer',
                    }}>Mark Expired</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function ExpiryTracking() {
  const [tab, setTab]               = useState('expiring') // 'expiring' | 'all'
  const [days, setDays]             = useState(7)
  const [allBatches, setAllBatches] = useState([])
  const [expiring, setExpiring]     = useState([])
  const [allLoading, setAllLoading] = useState(true)
  const [expLoading, setExpLoading] = useState(true)
  const [filter, setFilter]         = useState('')
  const [showModal, setShowModal]   = useState(false)

  const loadAll = useCallback(async () => {
    setAllLoading(true)
    try {
      const res = await fetch(`${BASE()}/inventory/batches`, { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        setAllBatches(Array.isArray(d) ? d : d.content || [])
      }
    } catch { /* ignore */ }
    finally { setAllLoading(false) }
  }, [])

  const loadExpiring = useCallback(async (d) => {
    setExpLoading(true)
    try {
      const res = await fetch(`${BASE()}/inventory/batches/expiring?days=${d}`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setExpiring(Array.isArray(data) ? data : data.content || [])
      }
    } catch { /* ignore */ }
    finally { setExpLoading(false) }
  }, [])

  useEffect(() => {
    loadAll()
    loadExpiring(days)
  }, [loadAll, loadExpiring, days])

  async function handleMarkExpired(id) {
    if (!window.confirm('Mark this batch as expired?')) return
    try {
      await fetch(`${BASE()}/inventory/batches/${id}/expire`, {
        method: 'POST', headers: authHeaders(),
      })
      loadExpiring(days)
      loadAll()
    } catch { /* ignore */ }
  }

  function handleBatchAdded(b) {
    setAllBatches(prev => [b, ...prev])
  }

  // Alert counts
  const expiring7  = allBatches.filter(b => { const d = daysUntilExpiry(b.expiryDate); return d !== null && d >= 0 && d < 7 }).length
  const expiring30 = allBatches.filter(b => { const d = daysUntilExpiry(b.expiryDate); return d !== null && d >= 7 && d < 30 }).length

  const filteredAll = filter.trim()
    ? allBatches.filter(b => (b.rawMaterialName || '').toLowerCase().includes(filter.toLowerCase()))
    : allBatches

  const tabStyle = (active) => ({
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: active ? '#3b82f6' : 'transparent',
    color: active ? '#fff' : '#64748b',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Expiry Date / FIFO Tracking</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Monitor batch expiry dates and manage FIFO rotation</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
          padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          + Add Batch
        </button>
      </div>

      {/* Alert banners */}
      {(expiring7 > 0 || expiring30 > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.25rem' }}>
          {expiring7 > 0 && (
            <div style={{
              background: '#450a0a', border: '1px solid #ef444440', borderRadius: 10,
              padding: '10px 16px', color: '#ef4444', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>!</span>
              {expiring7} batch{expiring7 > 1 ? 'es' : ''} expiring within 7 days — immediate attention required
            </div>
          )}
          {expiring30 > 0 && (
            <div style={{
              background: '#451a03', border: '1px solid #f59e0b40', borderRadius: 10,
              padding: '10px 16px', color: '#f59e0b', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>!</span>
              {expiring30} batch{expiring30 > 1 ? 'es' : ''} expiring within 30 days
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, background: '#1e293b', borderRadius: 10,
        padding: 4, marginBottom: '1.25rem', width: 'fit-content',
        border: '1px solid #334155',
      }}>
        <button onClick={() => setTab('expiring')} style={tabStyle(tab === 'expiring')}>Expiring Soon</button>
        <button onClick={() => setTab('all')} style={tabStyle(tab === 'all')}>All Batches</button>
      </div>

      {/* Expiring Soon Tab */}
      {tab === 'expiring' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Show batches expiring within</span>
            <input
              type="range" min={1} max={90} value={days}
              onChange={e => setDays(Number(e.target.value))}
              style={{ width: 140, accentColor: '#3b82f6' }}
            />
            <input
              type="number" min={1} max={365} value={days}
              onChange={e => setDays(Math.max(1, Number(e.target.value)))}
              style={{
                background: '#334155', border: '1px solid #475569', color: '#fff',
                padding: '5px 10px', borderRadius: 6, fontSize: 13, width: 70,
              }}
            />
            <span style={{ fontSize: 13, color: '#94a3b8' }}>days</span>
          </div>
          <BatchTable
            batches={expiring}
            loading={expLoading}
            showExpireBtn={true}
            onMarkExpired={handleMarkExpired}
          />
        </div>
      )}

      {/* All Batches Tab */}
      {tab === 'all' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter by material name..."
              style={{
                background: '#1e293b', border: '1px solid #334155', color: '#fff',
                padding: '8px 14px', borderRadius: 8, fontSize: 13, width: 260,
              }}
            />
          </div>
          <BatchTable
            batches={filteredAll}
            loading={allLoading}
            showExpireBtn={false}
          />
        </div>
      )}

      {showModal && (
        <AddBatchModal onClose={() => setShowModal(false)} onSaved={handleBatchAdded} />
      )}
    </div>
  )
}
