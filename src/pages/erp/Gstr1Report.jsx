import { useState } from 'react'
import { erpGstApi } from '../../api/client'

const VERTICALS = ['RESTAURANT', 'JEWELLERY', 'SOFTWARE']

function fmt(n) {
  return (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Gstr1Report() {
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth] = useState(defaultMonth)
  const [vertical, setVertical] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    erpGstApi.gstr1(month, vertical || null)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  const b2b = data?.b2bSupplies || data?.b2b || []
  const hsn = data?.hsnSummary || data?.b2c || []

  const b2bTotal = b2b.reduce((s, r) => ({
    taxable: s.taxable + (parseFloat(r.taxableValue || r.taxable) || 0),
    cgst:    s.cgst    + (parseFloat(r.cgst) || 0),
    sgst:    s.sgst    + (parseFloat(r.sgst) || 0),
    igst:    s.igst    + (parseFloat(r.igst) || 0),
    total:   s.total   + (parseFloat(r.total || r.invoiceValue) || 0),
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 })

  const hsnTotal = hsn.reduce((s, r) => ({
    taxable: s.taxable + (parseFloat(r.taxableValue || r.taxable) || 0),
    intTax:  s.intTax  + (parseFloat(r.integratedTax || r.igst) || 0),
    cenTax:  s.cenTax  + (parseFloat(r.centralTax || r.cgst) || 0),
    staTax:  s.staTax  + (parseFloat(r.stateTax || r.sgst) || 0),
  }), { taxable: 0, intTax: 0, cenTax: 0, staTax: 0 })

  const thStyle = { padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '11px 12px', fontSize: 13, color: '#ccc', borderBottom: '1px solid #2a2a3e', textAlign: 'right', fontFamily: 'monospace' }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>GSTR-1</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Outward Supplies Return</p>
        </div>
        {data && (
          <button onClick={() => downloadJson(data, `GSTR1_${month}.json`)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #863bff', background: '#863bff18', color: '#863bff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Export JSON
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Vertical</label>
          <select value={vertical} onChange={e => setVertical(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }}>
            <option value="">All Verticals</option>
            {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Loading...' : 'Load Report'}
        </button>
      </div>

      {error && <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: '#ef444422', color: '#ef4444', fontSize: 13 }}>{error}</div>}

      {data ? (
        <>
          {/* B2B Supplies */}
          <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #2a2a3e' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>B2B Supplies</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>Business-to-Business invoices</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: '#2a2a3e' }}>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Party GSTIN</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Invoice No</th>
                    <th style={thStyle}>Taxable Value</th>
                    <th style={thStyle}>CGST</th>
                    <th style={thStyle}>SGST</th>
                    <th style={thStyle}>IGST</th>
                    <th style={thStyle}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {b2b.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#555', fontSize: 13 }}>No B2B supplies for this period.</td></tr>
                  ) : b2b.map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, textAlign: 'left', fontFamily: 'monospace', color: '#fff', fontWeight: 500 }}>{r.partyGstin || r.gstin || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'left' }}>{r.invoiceNo || r.voucherNo || '—'}</td>
                      <td style={tdStyle}>{fmt(r.taxableValue || r.taxable)}</td>
                      <td style={tdStyle}>{fmt(r.cgst)}</td>
                      <td style={tdStyle}>{fmt(r.sgst)}</td>
                      <td style={tdStyle}>{fmt(r.igst)}</td>
                      <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>{fmt(r.total || r.invoiceValue)}</td>
                    </tr>
                  ))}
                  {b2b.length > 0 && (
                    <tr style={{ background: '#2a2a3e', fontWeight: 700 }}>
                      <td colSpan={2} style={{ ...tdStyle, textAlign: 'left', color: '#fff', borderBottom: 'none', fontWeight: 700 }}>Total</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(b2bTotal.taxable)}</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(b2bTotal.cgst)}</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(b2bTotal.sgst)}</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(b2bTotal.igst)}</td>
                      <td style={{ ...tdStyle, color: '#10b981', borderBottom: 'none', fontWeight: 800 }}>{fmt(b2bTotal.total)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* HSN Summary */}
          <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #2a2a3e' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>B2C / HSN Summary</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>Consumer supplies and HSN-wise summary</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
                <thead>
                  <tr style={{ background: '#2a2a3e' }}>
                    {['HSN/SAC Code', 'Rate', 'Taxable Value', 'Integrated Tax', 'Central Tax', 'State Tax'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hsn.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#555', fontSize: 13 }}>No HSN summary data.</td></tr>
                  ) : hsn.map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>{r.hsnSac || r.hsnCode || r.code || '—'}</td>
                      <td style={tdStyle}>{r.gstRate || r.rate || 0}%</td>
                      <td style={tdStyle}>{fmt(r.taxableValue || r.taxable)}</td>
                      <td style={tdStyle}>{fmt(r.integratedTax || r.igst)}</td>
                      <td style={tdStyle}>{fmt(r.centralTax || r.cgst)}</td>
                      <td style={tdStyle}>{fmt(r.stateTax || r.sgst)}</td>
                    </tr>
                  ))}
                  {hsn.length > 0 && (
                    <tr style={{ background: '#2a2a3e' }}>
                      <td colSpan={2} style={{ ...tdStyle, textAlign: 'right', color: '#fff', borderBottom: 'none', fontWeight: 700 }}>Total</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(hsnTotal.taxable)}</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(hsnTotal.intTax)}</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(hsnTotal.cenTax)}</td>
                      <td style={{ ...tdStyle, color: '#fff', borderBottom: 'none', fontWeight: 700 }}>{fmt(hsnTotal.staTax)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : !loading && !error ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888', background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e' }}>
          Select a month and click "Load Report" to view GSTR-1 data.
        </div>
      ) : null}

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Generating GSTR-1 report...</div>}
    </div>
  )
}
