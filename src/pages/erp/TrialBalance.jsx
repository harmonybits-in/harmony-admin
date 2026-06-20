import { useState } from 'react'
import { erpReportApi } from '../../api/client'

const VERTICALS = ['RESTAURANT', 'JEWELLERY', 'SOFTWARE']

function getFyDates() {
  const now = new Date()
  const m = now.getMonth()
  const y = now.getFullYear()
  const fyStartYear = m >= 3 ? y : y - 1
  return {
    from: `${fyStartYear}-04-01`,
    to: now.toISOString().slice(0, 10),
  }
}

const TYPE_ROW_COLORS = {
  ASSET:     '#10b98108',
  EXPENSE:   '#f59e0b08',
  LIABILITY: '#863bff08',
  EQUITY:    '#06b6d408',
  INCOME:    '#10b98108',
}

function fmt(n) {
  const v = parseFloat(n) || 0
  return v === 0 ? '—' : v.toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

export default function TrialBalance() {
  const fy = getFyDates()
  const [fromDate, setFromDate] = useState(fy.from)
  const [toDate, setToDate] = useState(fy.to)
  const [vertical, setVertical] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    const params = { from: fromDate, to: toDate }
    if (vertical) params.vertical = vertical
    erpReportApi.trialBalance(params)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  const rows = data?.rows || data?.accounts || data || []
  const rowsArr = Array.isArray(rows) ? rows : []

  const totals = rowsArr.reduce((acc, r) => ({
    openDr:  acc.openDr  + (parseFloat(r.openingDebit)  || 0),
    openCr:  acc.openCr  + (parseFloat(r.openingCredit) || 0),
    periodDr:acc.periodDr+ (parseFloat(r.periodDebit)   || 0),
    periodCr:acc.periodCr+ (parseFloat(r.periodCredit)  || 0),
    closeDr: acc.closeDr + (parseFloat(r.closingDebit)  || 0),
    closeCr: acc.closeCr + (parseFloat(r.closingCredit) || 0),
  }), { openDr: 0, openCr: 0, periodDr: 0, periodCr: 0, closeDr: 0, closeCr: 0 })

  const thStyle = { padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '11px 12px', fontSize: 13, borderBottom: '1px solid #2a2a3e', textAlign: 'right', fontFamily: 'monospace' }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Trial Balance</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>All accounts with opening, period, and closing balances</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {[
          { label: 'From Date', value: fromDate, set: setFromDate },
          { label: 'To Date',   value: toDate,   set: setToDate   },
        ].map(f => (
          <div key={f.label}>
            <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
            <input type="date" value={f.value} onChange={e => f.set(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }} />
          </div>
        ))}
        <div>
          <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Vertical</label>
          <select value={vertical} onChange={e => setVertical(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }}>
            <option value="">All Verticals</option>
            {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Loading...' : 'Load Report'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: '#ef444422', color: '#ef4444', fontSize: 13 }}>{error}</div>
      )}

      {data && (
        <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#2a2a3e' }}>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Code</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Account Name</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Type</th>
                  <th style={thStyle}>Opening Dr</th>
                  <th style={thStyle}>Opening Cr</th>
                  <th style={thStyle}>Period Dr</th>
                  <th style={thStyle}>Period Cr</th>
                  <th style={thStyle}>Closing Dr</th>
                  <th style={thStyle}>Closing Cr</th>
                </tr>
              </thead>
              <tbody>
                {rowsArr.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#888' }}>No data returned.</td></tr>
                ) : rowsArr.map((row, idx) => (
                  <tr key={idx} style={{ background: TYPE_ROW_COLORS[row.accountType] || 'transparent', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff10'}
                    onMouseLeave={e => e.currentTarget.style.background = TYPE_ROW_COLORS[row.accountType] || 'transparent'}
                  >
                    <td style={{ ...tdStyle, textAlign: 'left', color: '#863bff', fontFamily: 'monospace', fontWeight: 600 }}>{row.code || row.accountCode}</td>
                    <td style={{ ...tdStyle, textAlign: 'left', color: '#fff', fontWeight: 500 }}>{row.name || row.accountName}</td>
                    <td style={{ ...tdStyle, textAlign: 'left', color: '#888' }}>{row.accountType}</td>
                    <td style={{ ...tdStyle, color: '#10b981' }}>{fmt(row.openingDebit)}</td>
                    <td style={{ ...tdStyle, color: '#f59e0b' }}>{fmt(row.openingCredit)}</td>
                    <td style={{ ...tdStyle, color: '#10b981' }}>{fmt(row.periodDebit)}</td>
                    <td style={{ ...tdStyle, color: '#f59e0b' }}>{fmt(row.periodCredit)}</td>
                    <td style={{ ...tdStyle, color: '#10b981', fontWeight: 600 }}>{fmt(row.closingDebit)}</td>
                    <td style={{ ...tdStyle, color: '#f59e0b', fontWeight: 600 }}>{fmt(row.closingCredit)}</td>
                  </tr>
                ))}
                {/* Totals */}
                <tr style={{ background: '#2a2a3e', borderTop: '2px solid #3a3a4e' }}>
                  <td colSpan={3} style={{ ...tdStyle, textAlign: 'left', color: '#fff', fontWeight: 700, borderBottom: 'none' }}>TOTALS</td>
                  {[totals.openDr, totals.openCr, totals.periodDr, totals.periodCr, totals.closeDr, totals.closeCr].map((val, i) => (
                    <td key={i} style={{ ...tdStyle, fontWeight: 700, color: '#fff', borderBottom: 'none', fontFamily: 'monospace' }}>
                      {val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div style={{ padding: 40, textAlign: 'center', color: '#888', background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e' }}>
          Select date range and click "Load Report" to view the trial balance.
        </div>
      )}
    </div>
  )
}
