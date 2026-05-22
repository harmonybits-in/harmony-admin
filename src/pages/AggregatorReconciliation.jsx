import { useState, useEffect, useCallback } from 'react'
import { reconciliationApi } from '../api/client'

const PLATFORM_COLOR = {
  ZOMATO: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  SWIGGY:  { bg: '#fff7ed', color: '#92400e', dot: '#f97316' },
}

const STATUS_COLOR = {
  UPLOADED: { bg: '#eff6ff', color: '#1d4ed8' },
  REVIEWED: { bg: '#d1fae5', color: '#065f46' },
}

export default function AggregatorReconciliation() {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  // Upload form
  const [platform, setPlatform] = useState('ZOMATO')
  const [period, setPeriod]     = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [file, setFile]         = useState(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await reconciliationApi.list()
      setRecords(data)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return alert('Please select a CSV file')
    setUploading(true)
    try {
      await reconciliationApi.upload(platform, period, file)
      setShowUpload(false)
      setFile(null)
      load()
    } catch (err) {
      alert(err.message ?? 'Upload failed')
    }
    setUploading(false)
  }

  async function handleReview(id) {
    const notes = prompt('Reconciliation notes (optional):')
    if (notes === null) return
    try {
      await reconciliationApi.markReviewed(id, notes || null)
      load()
    } catch (err) {
      alert(err.message ?? 'Failed')
    }
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Aggregator Reconciliation</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Compare Zomato/Swiggy settlement CSV with your actual bills
          </p>
        </div>
        <button onClick={() => setShowUpload(v => !v)} style={btnStyle('#3b82f6')}>
          + Upload Settlement CSV
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Upload Settlement Report</h3>
          <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={labelStyle}>
              Platform
              <select value={platform} onChange={e => setPlatform(e.target.value)} style={inputStyle}>
                <option value="ZOMATO">Zomato</option>
                <option value="SWIGGY">Swiggy</option>
              </select>
            </label>
            <label style={labelStyle}>
              Settlement Period
              <input type="month" value={period} onChange={e => setPeriod(e.target.value)} style={inputStyle} required />
            </label>
            <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
              CSV File
              <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])}
                style={{ ...inputStyle, padding: '6px 10px' }} required />
              <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                Zomato: order_id, order_amount, commission, gst_on_commission, net_settlement · Swiggy: similar columns
              </span>
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
              <button type="submit" disabled={uploading} style={btnStyle('#10b981')}>
                {uploading ? 'Processing…' : 'Upload & Reconcile'}
              </button>
              <button type="button" onClick={() => setShowUpload(false)} style={btnStyle('#6b7280')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Records Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Platform', 'Period', 'Aggregator Orders', 'Aggregator GMV', 'Our Orders', 'Our GMV', 'Discrepancy', 'Commission', 'Net Settlement', 'Status', 'Action'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
                  <div style={{ fontSize: 32 }}>📊</div>
                  <div style={{ marginTop: 8 }}>No settlements uploaded yet.</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Download settlement CSV from Zomato/Swiggy partner portal and upload above.</div>
                </td>
              </tr>
            ) : records.map(r => {
              const disc = r.gmvDiscrepancy ?? 0
              const discColor = disc === 0 ? '#6b7280' : disc > 0 ? '#16a34a' : '#dc2626'
              const pc = PLATFORM_COLOR[r.platform] ?? {}
              const sc = STATUS_COLOR[r.status] ?? {}
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ ...pc, padding: '3px 10px', borderRadius: 4, fontSize: 12 }}>{r.platform}</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.period}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{r.csvOrders ?? '—'}</td>
                  <td style={{ padding: '10px 14px' }}>₹{r.csvGmv?.toLocaleString() ?? '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{r.ourOrders ?? '—'}</td>
                  <td style={{ padding: '10px 14px' }}>₹{r.ourGmv?.toLocaleString() ?? '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: discColor }}>
                    {disc === 0 ? '✅ Match' : `${disc > 0 ? '+' : ''}₹${disc.toLocaleString()}`}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#b45309' }}>₹{r.csvCommission?.toLocaleString() ?? '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#065f46', fontWeight: 600 }}>₹{r.csvNetSettlement?.toLocaleString() ?? '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ ...sc, padding: '3px 10px', borderRadius: 4, fontSize: 12 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {r.status === 'UPLOADED' && (
                      <button onClick={() => handleReview(r.id)}
                        style={{ background: 'none', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                        Mark Reviewed
                      </button>
                    )}
                    {r.notes && <span title={r.notes} style={{ color: '#9ca3af', marginLeft: 6, fontSize: 12 }}>📝</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280' }}>
        <strong>Discrepancy:</strong> Aggregator GMV − Your Bills GMV.
        Positive = aggregator counted more than us (check cancelled orders).
        Negative = you billed more than aggregator received (check returns/cancellations).
      </div>
    </div>
  )
}

const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 500,
})

const panelStyle = {
  background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12,
  padding: 20, marginBottom: 20,
}

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151', fontWeight: 500,
}

const inputStyle = {
  padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14,
  outline: 'none', marginTop: 2, background: '#fff',
}
