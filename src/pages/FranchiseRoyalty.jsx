import { useState, useEffect, useCallback } from 'react'
import { franchiseApi } from '../api/client'

const STATUS_COLOR = {
  PENDING: { bg: '#fef3c7', color: '#92400e' },
  PAID:    { bg: '#d1fae5', color: '#065f46' },
  WAIVED:  { bg: '#ede9fe', color: '#5b21b6' },
}

export default function FranchiseRoyalty() {
  const [summary, setSummary]   = useState(null)
  const [config, setConfig]     = useState(null)
  const [reports, setReports]   = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(0)
  const [loading, setLoading]   = useState(true)

  const [showConfig, setShowConfig]   = useState(false)
  const [showGen, setShowGen]         = useState(false)

  // Config form
  const [cfgForm, setCfgForm] = useState({ brandName: '', royaltyPct: '', parentRestaurantId: '', paymentDueDays: 15 })
  const [saving, setSaving]   = useState(false)

  // Generate form
  const [period, setPeriod]   = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [generating, setGenerating] = useState(false)

  const PAGE_SIZE = 12

  const loadAll = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const [sumData, histData, cfgData] = await Promise.all([
        franchiseApi.summary(),
        franchiseApi.history(p, PAGE_SIZE),
        franchiseApi.getConfig(),
      ])
      setSummary(sumData)
      setReports(histData.content ?? [])
      setTotal(histData.totalElements ?? 0)
      setPage(p)
      setConfig(cfgData)
      if (cfgData) {
        setCfgForm({
          brandName:          cfgData.brandName ?? '',
          royaltyPct:         cfgData.royaltyPct ?? '',
          parentRestaurantId: cfgData.parentRestaurantId ?? '',
          paymentDueDays:     cfgData.paymentDueDays ?? 15,
        })
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadAll(0) }, [loadAll])

  async function handleSaveConfig(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await franchiseApi.configure({
        brandName:          cfgForm.brandName,
        royaltyPct:         parseFloat(cfgForm.royaltyPct),
        parentRestaurantId: cfgForm.parentRestaurantId ? Number(cfgForm.parentRestaurantId) : null,
        paymentDueDays:     Number(cfgForm.paymentDueDays),
      })
      setShowConfig(false)
      loadAll(0)
    } catch (err) {
      alert(err.message ?? 'Failed to save config')
    }
    setSaving(false)
  }

  async function handleGenerate(e) {
    e.preventDefault()
    setGenerating(true)
    try {
      await franchiseApi.generate(period)
      setShowGen(false)
      loadAll(0)
    } catch (err) {
      alert(err.message ?? 'Failed to generate report')
    }
    setGenerating(false)
  }

  async function handleMarkPaid(id) {
    const notes = prompt('Payment notes (optional):')
    if (notes === null) return
    try {
      await franchiseApi.markPaid(id, notes || null)
      loadAll(page)
    } catch (err) {
      alert(err.message ?? 'Failed')
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const configured = summary?.configured === true

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Franchise Royalty</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            {configured ? `Brand: ${summary?.brandName} · ${summary?.royaltyPct}% royalty` : 'Configure franchise settings to get started'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setShowConfig(v => !v); setShowGen(false) }} style={btnStyle('#6b7280')}>
            ⚙️ Configure
          </button>
          {configured && (
            <button onClick={() => { setShowGen(v => !v); setShowConfig(false) }} style={btnStyle('#3b82f6')}>
              Generate Report
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {configured && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          <SummaryCard label="Pending Royalty" value={`₹${summary.pendingRoyalty}`} color="#f59e0b" />
          <SummaryCard label="Paid Royalty" value={`₹${summary.paidRoyalty}`} color="#10b981" />
          <SummaryCard label="Royalty Rate" value={`${summary.royaltyPct}%`} color="#3b82f6" />
        </div>
      )}

      {/* Config Panel */}
      {showConfig && (
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Franchise Configuration</h3>
          <form onSubmit={handleSaveConfig} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={labelStyle}>
              Brand Name *
              <input required value={cfgForm.brandName} onChange={e => setCfgForm(f => ({ ...f, brandName: e.target.value }))}
                style={inputStyle} placeholder="e.g. Biryani Express" />
            </label>
            <label style={labelStyle}>
              Royalty % *
              <input type="number" min="0" max="100" step="0.1" required
                value={cfgForm.royaltyPct} onChange={e => setCfgForm(f => ({ ...f, royaltyPct: e.target.value }))}
                style={inputStyle} placeholder="e.g. 5" />
            </label>
            <label style={labelStyle}>
              Parent Restaurant ID
              <input type="number" value={cfgForm.parentRestaurantId}
                onChange={e => setCfgForm(f => ({ ...f, parentRestaurantId: e.target.value }))}
                style={inputStyle} placeholder="Optional" />
            </label>
            <label style={labelStyle}>
              Payment Due Days
              <input type="number" min="1" value={cfgForm.paymentDueDays}
                onChange={e => setCfgForm(f => ({ ...f, paymentDueDays: e.target.value }))}
                style={inputStyle} />
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={btnStyle('#10b981')}>
                {saving ? 'Saving…' : 'Save Configuration'}
              </button>
              <button type="button" onClick={() => setShowConfig(false)} style={btnStyle('#6b7280')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Generate Panel */}
      {showGen && (
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Generate Monthly Report</h3>
          <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={labelStyle}>
              Period (YYYY-MM)
              <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
                style={{ ...inputStyle, width: 160 }} required />
            </label>
            <button type="submit" disabled={generating} style={btnStyle('#3b82f6')}>
              {generating ? 'Generating…' : 'Generate'}
            </button>
            <button type="button" onClick={() => setShowGen(false)} style={btnStyle('#6b7280')}>Cancel</button>
          </form>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#6b7280' }}>
            Re-generating an existing period recalculates with latest revenue data.
          </p>
        </div>
      )}

      {/* Not configured notice */}
      {!loading && !configured && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32 }}>🏢</div>
          <div style={{ fontWeight: 600, marginTop: 8 }}>Franchise not configured</div>
          <div style={{ color: '#92400e', fontSize: 14, marginTop: 4 }}>
            Click "Configure" to set up brand name and royalty percentage.
          </div>
        </div>
      )}

      {/* Table */}
      {configured && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Period', 'Brand', 'Revenue', 'Royalty %', 'Royalty Due', 'Due Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading…</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No reports yet. Generate a monthly report to start tracking.</td></tr>
              ) : reports.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.period}</td>
                  <td style={{ padding: '10px 14px' }}>{r.brandName}</td>
                  <td style={{ padding: '10px 14px' }}>₹{r.revenue?.toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{r.royaltyPct}%</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#b45309' }}>₹{r.royaltyAmount?.toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 13 }}>{r.dueDate}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ ...(STATUS_COLOR[r.status] ?? {}), padding: '3px 10px', borderRadius: 4, fontSize: 12 }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {r.status === 'PENDING' && (
                      <button onClick={() => handleMarkPaid(r.id)}
                        style={{ background: 'none', border: '1px solid #10b981', color: '#10b981', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                        Mark Paid
                      </button>
                    )}
                    {r.notes && <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 6 }} title={r.notes}>📝</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page === 0} onClick={() => loadAll(page - 1)} style={paginBtn(page === 0)}>← Prev</button>
          <span style={{ lineHeight: '34px', fontSize: 13, color: '#6b7280' }}>Page {page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => loadAll(page + 1)} style={paginBtn(page >= totalPages - 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
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
  outline: 'none', marginTop: 2,
}

const paginBtn = (disabled) => ({
  padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db',
  background: disabled ? '#f3f4f6' : '#fff', color: disabled ? '#9ca3af' : '#374151',
  cursor: disabled ? 'default' : 'pointer', fontSize: 13,
})
