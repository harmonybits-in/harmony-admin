import { useState } from 'react'
import { erpReportApi } from '../../api/client'

const VERTICALS = ['RESTAURANT', 'JEWELLERY', 'SOFTWARE']

function fmt(n) {
  return (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

function SideSection({ title, groups, color }) {
  const total = (groups || []).reduce((s, g) => s + (parseFloat(g.total || g.subtotal) || (g.accounts || []).reduce((sa, a) => sa + (parseFloat(a.balance || a.amount) || 0), 0)), 0)
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: '12px 16px', background: '#2a2a3e', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color, fontFamily: 'monospace' }}>{fmt(total)}</span>
      </div>
      <div style={{ border: '1px solid #2a2a3e', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
        {(groups || []).map((grp, gi) => (
          <div key={gi}>
            <div style={{ padding: '9px 16px', background: '#1a1a2e', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a3e' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.4 }}>{grp.group || grp.accountGroup || grp.name}</span>
              <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
                {fmt(grp.total || grp.subtotal || (grp.accounts || []).reduce((s, a) => s + (parseFloat(a.balance || a.amount) || 0), 0))}
              </span>
            </div>
            {(grp.accounts || []).map((acc, ai) => (
              <div key={ai} style={{ padding: '8px 16px 8px 28px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a2a3e', background: '#0F0F1A', cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a1a2e'}
                onMouseLeave={e => e.currentTarget.style.background = '#0F0F1A'}
              >
                <span style={{ fontSize: 13, color: '#ccc' }}>{acc.name || acc.accountName}</span>
                <span style={{ fontSize: 13, color, fontFamily: 'monospace' }}>{fmt(acc.balance || acc.amount)}</span>
              </div>
            ))}
          </div>
        ))}
        {(!groups || groups.length === 0) && (
          <div style={{ padding: 20, textAlign: 'center', color: '#555', fontSize: 13 }}>No {title.toLowerCase()} data</div>
        )}
      </div>
    </div>
  )
}

export default function BalanceSheet() {
  const today = new Date().toISOString().slice(0, 10)
  const [asOfDate, setAsOfDate] = useState(today)
  const [vertical, setVertical] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    const params = { asOf: asOfDate }
    if (vertical) params.vertical = vertical
    erpReportApi.balanceSheet(params)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  const assets = data?.assets || data?.assetGroups || []
  const liabilities = data?.liabilities || data?.liabilityGroups || []
  const equity = data?.equity || data?.equityGroups || []
  const rightSide = [...liabilities, ...equity]

  const totalAssets = assets.reduce((s, g) => s + (parseFloat(g.total || g.subtotal) || (g.accounts || []).reduce((sa, a) => sa + (parseFloat(a.balance || a.amount) || 0), 0)), 0)
  const totalRight  = rightSide.reduce((s, g) => s + (parseFloat(g.total || g.subtotal) || (g.accounts || []).reduce((sa, a) => sa + (parseFloat(a.balance || a.amount) || 0), 0)), 0)
  const balanced = Math.abs(totalAssets - totalRight) < 1

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Balance Sheet</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Financial position as of a specific date</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>As of Date</label>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }} />
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

      {data && (
        <>
          {/* Balance check */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 18px', borderRadius: 10, background: balanced ? '#10b98112' : '#ef444412', border: `1px solid ${balanced ? '#10b98133' : '#ef444433'}` }}>
            <span style={{ fontSize: 20 }}>{balanced ? '✅' : '❌'}</span>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: balanced ? '#10b981' : '#ef4444' }}>
                {balanced ? 'Balance Sheet is Balanced' : 'Balance Sheet is Unbalanced'}
              </span>
              <span style={{ fontSize: 12, color: '#888', marginLeft: 10 }}>
                Assets: {fmt(totalAssets)} | Liabilities + Equity: {fmt(totalRight)}
              </span>
            </div>
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <SideSection title="Assets" groups={assets} color="#10b981" />
            <SideSection title="Liabilities & Equity" groups={rightSide} color="#863bff" />
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div style={{ padding: 40, textAlign: 'center', color: '#888', background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e' }}>
          Select a date and click "Load Report" to view the balance sheet.
        </div>
      )}

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Generating balance sheet...</div>}
    </div>
  )
}
