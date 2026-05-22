import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../hooks/useToast'
import { wasteApi, rawMaterialApi } from '../../api/inventoryApi'
import { SkeletonTable } from '../Skeleton'
import { fmt, fmtN, card, TH, TD, BTN_RED, BTN_OUT, INP, FInp } from './InventoryShared'

const WASTE_REASONS = ['EXPIRED', 'SPOILED', 'OVERCOOKED', 'DROPPED', 'DAMAGED', 'OTHER']
const REASON_COLORS = {
  EXPIRED:   '#f59e0b',
  SPOILED:   '#ef4444',
  OVERCOOKED:'#f97316',
  DROPPED:   '#8b5cf6',
  DAMAGED:   '#e53e3e',
  OTHER:     '#6b7280',
}

function today()      { return new Date().toISOString().slice(0, 10) }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }
function fmtDate(s) {
  if (!s) return '—'
  return new Date(s + 'T00:00:00').toLocaleDateString('en-IN',
    { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY_FORM = {
  itemName: '', rawMaterialId: '', quantity: '', unit: '',
  reason: 'EXPIRED', costPerUnit: '', notes: '', recordedBy: '',
  wasteDate: today(),
}

function SummaryCards({ summary, loading }) {
  const cardStyle = { ...card, minWidth: 140 }
  if (loading) return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ ...cardStyle, height: 80, background: '#f3f4f6' }} />
      ))}
    </div>
  )
  if (!summary) return null
  const cards = [
    {
      label: 'Total Waste Cost',
      value: fmt(summary.totalWasteCost || 0),
      sub: `${summary.totalEntries || 0} entries`,
      color: '#e53e3e',
    },
    ...(summary.topWastedItems || []).slice(0, 2).map((item, i) => ({
      label: `#${i + 1} Wasted Item`,
      value: item.itemName,
      sub: `${fmtN(item.totalQty)} ${item.unit}`,
      color: '#d97706',
    })),
  ]
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      {cards.map((c, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 500, marginBottom: 4 }}>{c.label}</div>
          <div style={{ fontSize: i === 0 ? 22 : 15, fontWeight: 800, color: c.color }}>{c.value}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

export default function WastagePage({ rid: ridProp }) {
  const ridStore = useAuthStore(s => s.restaurantId)
  const rid      = ridProp ?? ridStore
  const toast    = useToast()

  const [entries,    setEntries]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [summary,    setSummary]    = useState(null)
  const [sumLoading, setSumLoading] = useState(true)
  const [from,       setFrom]       = useState(monthStart())
  const [to,         setTo]         = useState(today())
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [showForm,   setShowForm]   = useState(true)
  const [rawMats,    setRawMats]    = useState([])

  useEffect(() => {
    rawMaterialApi.getAll(rid, { size: 200 })
      .then(r => setRawMats(r?.content || []))
      .catch(() => {})
  }, [rid])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await wasteApi.getAll(rid, { from, to })
      setEntries(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(e.message || 'Failed to load waste entries')
    } finally { setLoading(false) }
  }, [rid, from, to])

  const loadSummary = useCallback(async () => {
    setSumLoading(true)
    try { setSummary(await wasteApi.getSummary(rid, { from, to })) }
    catch {}
    finally { setSumLoading(false) }
  }, [rid, from, to])

  useEffect(() => { load(); loadSummary() }, [load, loadSummary])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // When a raw material is selected, auto-fill item name and unit
  function handleRmSelect(e) {
    const rmId = e.target.value
    setForm(f => {
      if (!rmId) return { ...f, rawMaterialId: '' }
      const rm = rawMats.find(r => String(r.id) === String(rmId))
      return {
        ...f,
        rawMaterialId: rmId,
        itemName: rm?.name || f.itemName,
        unit: rm?.purchaseUnit || rm?.consumptionUnit || f.unit,
        costPerUnit: rm?.purchasePrice ? String(rm.purchasePrice) : f.costPerUnit,
      }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.itemName.trim())                       return toast.error('Item name required')
    if (!form.quantity || Number(form.quantity) <= 0) return toast.error('Valid quantity required')
    if (!form.unit.trim())                            return toast.error('Unit required')
    if (!form.reason)                                 return toast.error('Reason required')
    if (!form.wasteDate)                              return toast.error('Date required')

    setSaving(true)
    try {
      await wasteApi.log({
        restaurantId:  rid,
        rawMaterialId: form.rawMaterialId ? Number(form.rawMaterialId) : null,
        itemName:      form.itemName.trim(),
        quantity:      Number(form.quantity),
        unit:          form.unit.trim(),
        reason:        form.reason,
        notes:         form.notes || null,
        wasteDate:     form.wasteDate,
        recordedBy:    form.recordedBy || null,
        costPerUnit:   form.costPerUnit ? Number(form.costPerUnit) : null,
      })
      toast.success('Waste entry logged')
      setForm(EMPTY_FORM)
      load(); loadSummary()
    } catch (err) {
      toast.error(err.message || 'Failed to log waste')
    } finally { setSaving(false) }
  }

  const filterStyle = { ...INP, width: 'auto' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Waste Tracking</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>Log aur track karo inventory waste</p>
        </div>
        <button onClick={() => setShowForm(f => !f)} style={BTN_OUT}>
          {showForm ? 'Hide Form' : '+ Log Waste'}
        </button>
      </div>

      <SummaryCards summary={summary} loading={sumLoading} />

      {/* Log Waste Form */}
      {showForm && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Log New Waste</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>

              {/* Optional raw material lookup */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, fontWeight: 500 }}>
                  Raw Material (optional)
                </label>
                <select value={form.rawMaterialId} onChange={handleRmSelect}
                  style={{ ...INP, width: '100%', marginBottom: 0 }}>
                  <option value="">— Manual entry —</option>
                  {rawMats.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                </select>
              </div>

              <FInp label="Item Name" value={form.itemName} onChange={set('itemName')}
                    placeholder="e.g. Chicken" required />
              <FInp label="Quantity" value={form.quantity} onChange={set('quantity')}
                    type="number" placeholder="0.0" required />
              <FInp label="Unit" value={form.unit} onChange={set('unit')}
                    placeholder="kg / litre / pcs" required />

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, fontWeight: 500 }}>
                  Reason <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <select value={form.reason} onChange={set('reason')}
                  style={{ ...INP, width: '100%', marginBottom: 0 }}>
                  {WASTE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <FInp label="Date" value={form.wasteDate} onChange={set('wasteDate')} type="date" required />
              <FInp label="Cost/Unit (₹)" value={form.costPerUnit} onChange={set('costPerUnit')}
                    type="number" placeholder="Optional" />
              <FInp label="Recorded By" value={form.recordedBy} onChange={set('recordedBy')}
                    placeholder="Staff name" />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 4, fontWeight: 500 }}>Notes</label>
              <textarea value={form.notes} onChange={set('notes')} rows={2}
                style={{ ...INP, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                placeholder="Optional…" />
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving}
                style={{ ...BTN_RED, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Log Waste'}
              </button>
              <button type="button" onClick={() => setForm(EMPTY_FORM)} style={BTN_OUT}>Reset</button>
            </div>
          </form>
        </div>
      )}

      {/* Date Filter */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 3, fontWeight: 500 }}>From</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={filterStyle} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 3, fontWeight: 500 }}>To</div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={filterStyle} />
        </div>
        <button onClick={() => { load(); loadSummary() }}
          style={{ ...BTN_OUT, alignSelf: 'flex-end' }}>Apply</button>
      </div>

      {/* History Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? <SkeletonTable rows={6} cols={7} /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Item', 'Qty', 'Reason', 'Cost/Unit', 'Total Cost', 'Recorded By'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 36, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                    No waste entries found for this period.
                  </td>
                </tr>
              ) : entries.map((e, i) => (
                <tr key={e.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(e.wasteDate)}</td>
                  <td style={TD}>
                    <b>{e.itemName}</b>
                    {e.notes && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{e.notes}</div>}
                  </td>
                  <td style={TD}>{fmtN(e.quantity)} {e.unit}</td>
                  <td style={TD}>
                    <span style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                      background: (REASON_COLORS[e.reason] || '#888') + '22',
                      color: REASON_COLORS[e.reason] || '#888',
                    }}>
                      {e.reason}
                    </span>
                  </td>
                  <td style={{ ...TD, color: '#777' }}>{e.costPerUnit ? fmt(e.costPerUnit) : '—'}</td>
                  <td style={{ ...TD, fontWeight: 600, color: '#e53e3e' }}>
                    {e.totalCost ? fmt(e.totalCost) : '—'}
                  </td>
                  <td style={{ ...TD, color: '#777' }}>{e.recordedBy || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
