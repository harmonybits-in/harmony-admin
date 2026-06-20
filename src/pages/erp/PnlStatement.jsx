import { useState } from 'react'
import { erpReportApi } from '../../api/client'

const VERTICALS = ['RESTAURANT', 'JEWELLERY', 'SOFTWARE']
const TABS = [
  { label: 'Consolidated', value: '' },
  { label: 'Restaurant', value: 'RESTAURANT' },
  { label: 'Jewellery', value: 'JEWELLERY' },
  { label: 'Software', value: 'SOFTWARE' },
]

function getFyDates() {
  const now = new Date()
  const m = now.getMonth()
  const y = now.getFullYear()
  const fyStartYear = m >= 3 ? y : y - 1
  return { from: `${fyStartYear}-04-01`, to: now.toISOString().slice(0, 10) }
}

function fmt(n) {
  return (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

function exportCsv(data) {
  const rows = [['Section', 'Group', 'Account', 'Amount']]
  ;(data?.income || []).forEach(grp => {
    grp.accounts?.forEach(a => rows.push(['Income', grp.group || grp.accountGroup, a.name, a.amount]))
  })
  ;(data?.expense || []).forEach(grp => {
    grp.accounts?.forEach(a => rows.push(['Expense', grp.group || grp.accountGroup, a.name, a.amount]))
  })
  rows.push(['', '', 'Gross Profit', data?.grossProfit || 0])
  rows.push(['', '', 'Net Profit', data?.netProfit || 0])
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'pnl.csv'; a.click()
  URL.revokeObjectURL(url)
}

function GroupSection({ title, groups, color }) {
  const total = (groups || []).reduce((s, g) => s + (parseFloat(g.total || g.amount || 0) + (g.accounts || []).reduce((sa, a) => sa + (parseFloat(a.amount) || 0), 0)), 0)
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ padding: '10px 16px', background: '#2a2a3e', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color, fontFamily: 'monospace' }}>{fmt(total)}</span>
      </div>
      <div style={{ border: '1px solid #2a2a3e', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        {(groups || []).map((grp, gi) => (
          <div key={gi}>
            <div style={{ padding: '9px 16px', background: '#1a1a2e', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a3e' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{grp.group || grp.accountGroup || grp.name}</span>
              <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
                {fmt(grp.total || grp.subtotal || (grp.accounts || []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0))}
              </span>
            </div>
            {(grp.accounts || []).map((acc, ai) => (
              <div key={ai} style={{ padding: '8px 16px 8px 28px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a3e', background: '#0F0F1A' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a1a2e'}
                onMouseLeave={e => e.currentTarget.style.background = '#0F0F1A'}
              >
                <span style={{ fontSize: 13, color: '#ccc' }}>{acc.name || acc.accountName}</span>
                <span style={{ fontSize: 13, color, fontFamily: 'monospace' }}>{fmt(acc.amount)}</span>
              </div>
            ))}
          </div>
        ))}
        {(!groups || groups.length === 0) && (
          <div style={{ padding: 20, textAlign: 'center', color: '#555', fontSize: 13 }}>No {title.toLowerCase()} accounts</div>
        )}
      </div>
    </div>
  )
}

export default function PnlStatement() {
  const fy = getFyDates()
  const [fromDate, setFromDate] = useState(fy.from)
  const [toDate, setToDate] = useState(fy.to)
  const [activeTab, setActiveTab] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function load(vertical) {
    setLoading(true)
    setError(null)
    const params = { from: fromDate, to: toDate }
    if (vertical) params.vertical = vertical
    erpReportApi.pnl(params)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  function handleTabClick(val) {
    setActiveTab(val)
    load(val)
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>P&L Statement</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Profit & Loss report by vertical</p>
        </div>
        {data && (
          <button onClick={() => exportCsv(data)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #863bff', background: '#863bff18', color: '#863bff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Export CSV
          </button>
        )}
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
        <button onClick={() => load(activeTab)} disabled={loading} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Loading...' : 'Load Report'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid ' + (activeTab === tab.value ? '#863bff' : '#2a2a3e'),
              background: activeTab === tab.value ? '#863bff' : 'transparent',
              color: activeTab === tab.value ? '#fff' : '#888',
              fontSize: 13,
              fontWeight: activeTab === tab.value ? 600 : 400,
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: '#ef444422', color: '#ef4444', fontSize: 13 }}>{error}</div>}

      {data ? (
        <div>
          <GroupSection title="Income" groups={data.income || data.incomeGroups || []} color="#10b981" />
          <GroupSection title="Expenses" groups={data.expense || data.expenseGroups || []} color="#ef4444" />

          {/* Profit rows */}
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #2a2a3e' }}>
            {[
              { label: 'Gross Profit', value: data.grossProfit, color: (parseFloat(data.grossProfit) || 0) >= 0 ? '#10b981' : '#ef4444' },
              { label: 'Net Profit',   value: data.netProfit,   color: (parseFloat(data.netProfit)   || 0) >= 0 ? '#10b981' : '#ef4444' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: i === 1 ? '#863bff18' : '#1A1A2E', borderBottom: i === 0 ? '1px solid #2a2a3e' : 'none' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{row.label}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: row.color, fontFamily: 'monospace' }}>
                  {fmt(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : !loading && !error ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888', background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e' }}>
          Select date range and click "Load Report" or a vertical tab to generate the P&L.
        </div>
      ) : null}

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Generating P&L report...</div>}
    </div>
  )
}
