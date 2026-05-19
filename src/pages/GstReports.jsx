// src/pages/GstReports.jsx
import { useState } from 'react'
import { gstApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

// ── Helpers ───────────────────────────────────────────────────────
function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const MONTHS = [
  { value: 1,  label: 'January'   },
  { value: 2,  label: 'February'  },
  { value: 3,  label: 'March'     },
  { value: 4,  label: 'April'     },
  { value: 5,  label: 'May'       },
  { value: 6,  label: 'June'      },
  { value: 7,  label: 'July'      },
  { value: 8,  label: 'August'    },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October'   },
  { value: 11, label: 'November'  },
  { value: 12, label: 'December'  },
]

const YEAR_OPTIONS = (() => {
  const cur = new Date().getFullYear()
  return [cur - 1, cur, cur + 1]
})()

const GREEN = '#16a34a'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#bbf7d0'

// ── Sub-components ────────────────────────────────────────────────
function SummaryCard({ label, value, sub }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '18px 20px',
      boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
      borderTop: `3px solid ${GREEN}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginTop: 2 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        border: `3px solid ${GREEN_BORDER}`,
        borderTopColor: GREEN,
        animation: 'spin 0.7s linear infinite',
      }} />
      <span style={{ color: '#6b7280', fontSize: 14 }}>Generating report…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 0', gap: 12,
      color: '#9ca3af',
    }}>
      <span style={{ fontSize: 40 }}>🧾</span>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#6b7280' }}>No bills found for this period</div>
      <div style={{ fontSize: 13 }}>Try a different month, year, or date range.</div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function GstReports() {
  const { restaurantId } = useAuthStore()
  const toast = useToast()
  const now = new Date()

  const [mode, setMode] = useState('monthly')       // 'monthly' | 'range'
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)            // { summary, invoices }

  // ── API call ──────────────────────────────────────────────────
  async function generate() {
    if (mode === 'range') {
      if (!fromDate || !toDate) { toast.error('Please select both From and To dates'); return }
      if (fromDate > toDate)    { toast.error('"From" date cannot be after "To" date'); return }
    }
    setLoading(true)
    setData(null)
    try {
      let result
      if (mode === 'monthly') {
        result = await gstApi.monthly(restaurantId, year, month)
      } else {
        result = await gstApi.range(restaurantId, fromDate, toDate)
      }
      setData(result)
      if (!result?.invoices?.length) {
        toast.info('No bills found for this period')
      }
    } catch (e) {
      toast.error(e.message || 'Failed to load GST report')
    } finally {
      setLoading(false)
    }
  }

  // ── CSV download ──────────────────────────────────────────────
  function downloadCsv() {
    if (!data?.invoices?.length) return
    const header = 'Date,Bill Number,Customer Name,Customer Phone,Taxable,CGST,SGST,IGST,Total Tax,Gross,Payment Mode,Order Type\n'
    const rows = data.invoices.map(i =>
      [
        i.date,
        i.billNumber,
        `"${(i.customerName || '').replace(/"/g, '""')}"`,
        i.customerPhone || '',
        i.taxable,
        i.cgst,
        i.sgst,
        i.igst,
        i.totalTax,
        i.gross,
        i.paymentMode || '',
        i.orderType || '',
      ].join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `GST_Report_${data.summary?.period || 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded successfully')
  }

  // ── Derived values ────────────────────────────────────────────
  const s = data?.summary || {}
  const invoices = data?.invoices || []

  const taxBreakdown = [
    { rate: '5%',  cgst: s.cgst5  || 0, sgst: s.sgst5  || 0, igst: 0, total: (s.cgst5  || 0) + (s.sgst5  || 0) },
    { rate: '12%', cgst: s.cgst12 || 0, sgst: s.sgst12 || 0, igst: 0, total: (s.cgst12 || 0) + (s.sgst12 || 0) },
    { rate: '18%', cgst: s.cgst18 || 0, sgst: s.sgst18 || 0, igst: 0, total: (s.cgst18 || 0) + (s.sgst18 || 0) },
  ]

  // ── Styles ────────────────────────────────────────────────────
  const card = {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
    marginBottom: 16,
  }

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 13,
    color: '#111827',
    background: '#fff',
    outline: 'none',
    height: 36,
    boxSizing: 'border-box',
  }

  const selectStyle = { ...inputStyle, cursor: 'pointer' }

  const thStyle = {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    whiteSpace: 'nowrap',
    borderBottom: '2px solid #f3f4f6',
    background: '#fafafa',
  }

  const tdStyle = {
    padding: '10px 14px',
    fontSize: 13,
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>
            GST Report (GSTR-1)
          </h1>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047',
              borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600,
            }}>Note</span>
            For official GST filing, use ClearTax or the GSTIN portal. This report is for reference only.
          </p>
        </div>

        {data && invoices.length > 0 && (
          <button onClick={downloadCsv} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: GREEN, color: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(22,163,74,0.25)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 15 }}>⬇</span>
            Download CSV
          </button>
        )}
      </div>

      {/* ── Filter Card ─────────────────────────────────────────── */}
      <div style={card}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16,
          background: '#f3f4f6', borderRadius: 8, padding: 3, width: 'fit-content' }}>
          {[
            { val: 'monthly', label: 'Monthly'      },
            { val: 'range',   label: 'Custom Range'  },
          ].map(({ val, label }) => (
            <button key={val} onClick={() => setMode(val)} style={{
              padding: '6px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: mode === val ? '#fff' : 'transparent',
              color: mode === val ? GREEN : '#6b7280',
              boxShadow: mode === val ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all .15s',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Filter inputs */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {mode === 'monthly' ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Month</label>
                <select value={month} onChange={e => setMonth(Number(e.target.value))} style={selectStyle}>
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Year</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))} style={selectStyle}>
                  {YEAR_OPTIONS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </>
          )}

          <button
            onClick={generate}
            disabled={loading}
            style={{
              padding: '8px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: loading ? '#d1fae5' : GREEN,
              color: loading ? GREEN : '#fff',
              border: `1px solid ${loading ? GREEN_BORDER : GREEN}`,
              cursor: loading ? 'not-allowed' : 'pointer',
              height: 36, alignSelf: 'flex-end',
              transition: 'all .15s',
              flexShrink: 0,
            }}
          >
            {loading ? 'Loading…' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────────────── */}
      {loading && <div style={card}><LoadingSpinner /></div>}

      {/* ── Results ─────────────────────────────────────────────── */}
      {!loading && data && (
        <>
          {/* Period badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{
              background: GREEN_LIGHT, color: GREEN,
              border: `1px solid ${GREEN_BORDER}`,
              borderRadius: 6, padding: '3px 12px', fontSize: 12, fontWeight: 700,
            }}>
              Period: {s.period || '—'}
            </span>
            <span style={{ color: '#9ca3af', fontSize: 12 }}>
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Summary Cards ──────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}>
            <SummaryCard label="Total Bills"     value={s.billCount || 0}         sub="Invoices in period"        />
            <SummaryCard label="Taxable Value"   value={fmt(s.totalTaxable)}      sub="Before tax"                />
            <SummaryCard label="Total Discount"  value={fmt(s.totalDiscount)}     sub="Applied discounts"         />
            <SummaryCard label="CGST (5%)"       value={fmt(s.cgst5)}             sub="Central GST @ 5%"          />
            <SummaryCard label="SGST (5%)"       value={fmt(s.sgst5)}             sub="State GST @ 5%"            />
            <SummaryCard label="Total Tax"       value={fmt(s.totalTax)}          sub="CGST + SGST + IGST"        />
            <SummaryCard label="Gross Collection" value={fmt(s.totalGross)}       sub="Taxable + Tax"             />
          </div>

          {/* ── Tax Rate Breakdown Table ────────────────────────── */}
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
              Tax Rate Breakdown
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Tax Rate', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total Tax (₹)'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {taxBreakdown.map((row, i) => (
                    <tr key={row.rate} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: GREEN }}>{row.rate}</td>
                      <td style={tdStyle}>{fmt(row.cgst)}</td>
                      <td style={tdStyle}>{fmt(row.sgst)}</td>
                      <td style={tdStyle}>{fmt(row.igst)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(row.total)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr style={{ background: GREEN_LIGHT, borderTop: `2px solid ${GREEN_BORDER}` }}>
                    <td style={{ ...tdStyle, fontWeight: 800, color: GREEN }}>Total</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      {fmt((s.cgst5 || 0) + (s.cgst12 || 0) + (s.cgst18 || 0))}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      {fmt((s.sgst5 || 0) + (s.sgst12 || 0) + (s.sgst18 || 0))}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(0)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: GREEN }}>{fmt(s.totalTax)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Invoice Table ───────────────────────────────────── */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                Invoice Details
                <span style={{ fontSize: 12, fontWeight: 500, color: '#9ca3af', marginLeft: 8 }}>
                  ({invoices.length} records)
                </span>
              </div>
              {invoices.length > 0 && (
                <button onClick={downloadCsv} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: GREEN_LIGHT, color: GREEN,
                  border: `1px solid ${GREEN_BORDER}`, cursor: 'pointer',
                }}>
                  <span>⬇</span> Download CSV
                </button>
              )}
            </div>

            {invoices.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {[
                        'Date', 'Bill #', 'Customer', 'Phone',
                        'Taxable', 'CGST', 'SGST', 'IGST',
                        'Total Tax', 'Gross', 'Payment', 'Type',
                      ].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, i) => (
                      <tr key={i}
                        style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                        onMouseEnter={e => e.currentTarget.style.background = GREEN_LIGHT}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                      >
                        <td style={tdStyle}>{inv.date || '—'}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: GREEN }}>{inv.billNumber || '—'}</td>
                        <td style={{ ...tdStyle, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inv.customerName || '—'}
                        </td>
                        <td style={{ ...tdStyle, color: '#6b7280' }}>{inv.customerPhone || '—'}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(inv.taxable)}</td>
                        <td style={tdStyle}>{fmt(inv.cgst)}</td>
                        <td style={tdStyle}>{fmt(inv.sgst)}</td>
                        <td style={tdStyle}>{fmt(inv.igst)}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#f59e0b' }}>{fmt(inv.totalTax)}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: GREEN }}>{fmt(inv.gross)}</td>
                        <td style={{ ...tdStyle }}>
                          <span style={{
                            background: inv.paymentMode === 'UPI'  ? '#eff6ff'
                                       : inv.paymentMode === 'CASH' ? '#f0fdf4'
                                       : inv.paymentMode === 'CARD' ? '#faf5ff'
                                       : '#f3f4f6',
                            color: inv.paymentMode === 'UPI'  ? '#1d4ed8'
                                 : inv.paymentMode === 'CASH' ? '#15803d'
                                 : inv.paymentMode === 'CARD' ? '#7c3aed'
                                 : '#6b7280',
                            padding: '2px 8px', borderRadius: 4,
                            fontSize: 11, fontWeight: 700,
                          }}>
                            {inv.paymentMode || '—'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle }}>
                          <span style={{
                            background: '#f3f4f6', color: '#374151',
                            padding: '2px 8px', borderRadius: 4,
                            fontSize: 11, fontWeight: 600,
                          }}>
                            {(inv.orderType || '—').replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Footer totals */}
                  <tfoot>
                    <tr style={{ background: GREEN_LIGHT, borderTop: `2px solid ${GREEN_BORDER}` }}>
                      <td colSpan={4} style={{ ...tdStyle, fontWeight: 800, color: GREEN }}>
                        Total ({invoices.length} bills)
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        {fmt(invoices.reduce((a, v) => a + (v.taxable || 0), 0))}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        {fmt(invoices.reduce((a, v) => a + (v.cgst || 0), 0))}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        {fmt(invoices.reduce((a, v) => a + (v.sgst || 0), 0))}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        {fmt(invoices.reduce((a, v) => a + (v.igst || 0), 0))}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#f59e0b' }}>
                        {fmt(invoices.reduce((a, v) => a + (v.totalTax || 0), 0))}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 800, color: GREEN }}>
                        {fmt(invoices.reduce((a, v) => a + (v.gross || 0), 0))}
                      </td>
                      <td colSpan={2} style={tdStyle} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Initial empty state (no generate yet) ──────────────── */}
      {!loading && !data && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', gap: 12 }}>
          <span style={{ fontSize: 44 }}>📊</span>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>Select a period and click Generate Report</div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>CGST, SGST, IGST breakdowns will appear here</div>
        </div>
      )}
    </div>
  )
}
