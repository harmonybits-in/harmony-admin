import { useState } from 'react'
import { erpGstApi } from '../../api/client'

function fmt(n) {
  return (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Gstr3bReport() {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(defaultMonth)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    erpGstApi.gstr3b(month)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  const rows = data?.ratewiseBreakdown || data?.rows || data?.slabs || []
  const rowsArr = Array.isArray(rows) ? rows : []

  const totals = rowsArr.reduce((acc, r) => ({
    taxable: acc.taxable + (parseFloat(r.taxableValue || r.taxable) || 0),
    cgst:    acc.cgst    + (parseFloat(r.cgst) || 0),
    sgst:    acc.sgst    + (parseFloat(r.sgst) || 0),
    igst:    acc.igst    + (parseFloat(r.igst) || 0),
    total:   acc.total   + (parseFloat(r.totalTax || r.total) || 0),
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 })

  const netLiability = data?.netTaxLiability || totals.total

  const thStyle = { padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '12px 14px', fontSize: 13, color: '#ccc', borderBottom: '1px solid #2a2a3e', textAlign: 'right', fontFamily: 'monospace' }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>GSTR-3B</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Monthly Summary Return — Net Tax Liability</p>
        </div>
        {data && (
          <button onClick={() => downloadJson(data, `GSTR3B_${month}.json`)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #863bff', background: '#863bff18', color: '#863bff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Export JSON
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }} />
        </div>
        <button onClick={load} disabled={loading} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Loading...' : 'Load Report'}
        </button>
      </div>

      {error && <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: '#ef444422', color: '#ef4444', fontSize: 13 }}>{error}</div>}

      {data ? (
        <>
          {/* Rate-wise table */}
          <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #2a2a3e' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>Rate-wise Tax Summary</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2a2a3e' }}>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Rate Slab</th>
                    <th style={thStyle}>Taxable Value</th>
                    <th style={thStyle}>CGST</th>
                    <th style={thStyle}>SGST</th>
                    <th style={thStyle}>IGST</th>
                    <th style={thStyle}>Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsArr.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#555', fontSize: 13 }}>No data for this period.</td></tr>
                  ) : rowsArr.map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, textAlign: 'left', color: '#fff', fontWeight: 600 }}>{r.rateSlab || r.rate || r.gstRate}%</td>
                      <td style={tdStyle}>{fmt(r.taxableValue || r.taxable)}</td>
                      <td style={tdStyle}>{fmt(r.cgst)}</td>
                      <td style={tdStyle}>{fmt(r.sgst)}</td>
                      <td style={tdStyle}>{fmt(r.igst)}</td>
                      <td style={{ ...tdStyle, color: '#f59e0b', fontWeight: 600 }}>{fmt(r.totalTax || r.total)}</td>
                    </tr>
                  ))}
                  {rowsArr.length > 0 && (
                    <tr style={{ background: '#2a2a3e' }}>
                      <td style={{ ...tdStyle, textAlign: 'left', color: '#fff', borderBottom: 'none', fontWeight: 700 }}>Grand Total</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(totals.taxable)}</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(totals.cgst)}</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(totals.sgst)}</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(totals.igst)}</td>
                      <td style={{ ...tdStyle, color: '#10b981', borderBottom: 'none', fontWeight: 800, fontSize: 15 }}>{fmt(totals.total)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Tax Liability Card */}
          <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Net Tax Liability</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                ₹{fmt(netLiability)}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Total GST payable for {month}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Breakdown</div>
              {[
                { label: 'CGST', value: totals.cgst },
                { label: 'SGST', value: totals.sgst },
                { label: 'IGST', value: totals.igst },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>{item.label}:</span>
                  <span style={{ fontSize: 12, color: '#ccc', fontFamily: 'monospace' }}>₹{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : !loading && !error ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888', background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e' }}>
          Select a month and click "Load Report" to view GSTR-3B data.
        </div>
      ) : null}

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Generating GSTR-3B report...</div>}
    </div>
  )
}
