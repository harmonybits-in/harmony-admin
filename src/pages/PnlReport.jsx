import { useState, useCallback } from 'react'
import { reportApi } from '../api/client'

const today  = new Date().toISOString().slice(0, 10)
const month1 = today.slice(0, 7) + '-01'

const ROW_STYLE = {
  income:  { color: '#065f46', bg: '#d1fae5', icon: '↑' },
  expense: { color: '#991b1b', bg: '#fee2e2', icon: '↓' },
  profit:  { color: '#1d4ed8', bg: '#dbeafe', icon: '=' },
  loss:    { color: '#7c3aed', bg: '#ede9fe', icon: '=' },
}

export default function PnlReport() {
  const [from,    setFrom]    = useState(month1)
  const [to,      setTo]      = useState(today)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await reportApi.pnl(from, to)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  const netPositive = data?.netProfit >= 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>P&L Statement</h2>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
          Revenue − Food Cost − Staff Cost − Expenses = Net Profit
        </p>
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap' }}>
        {[['From', from, setFrom], ['To', to, setTo]].map(([label, val, set]) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{label}</div>
            <input type="date" value={val} max={today}
              onChange={e => set(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid #e8eaed', borderRadius: 7, fontSize: 13 }} />
          </div>
        ))}
        <button onClick={load} disabled={loading} style={{
          padding: '8px 20px', background: '#e53e3e', color: '#fff',
          border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13,
          opacity: loading ? 0.7 : 1, alignSelf: 'flex-end',
        }}>
          {loading ? 'Loading...' : 'Generate P&L'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>
          {error}
        </div>
      )}

      {!data && !loading && (
        <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 10, padding: '60px 40px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
          Date range select karo aur "Generate P&L" click karo
        </div>
      )}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Waterfall statement */}
          <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden', gridColumn: '1 / -1' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, fontSize: 14 }}>
              Income Statement · {from} to {to}
            </div>
            <div style={{ padding: '8px 0' }}>
              {(data.breakdown || []).map((row, i) => {
                const s = ROW_STYLE[row.type] || ROW_STYLE.income
                const isLast = i === (data.breakdown?.length ?? 0) - 1
                const amt = Math.abs(row.amount)
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 18px',
                    borderTop: isLast ? '2px solid #e8eaed' : 'none',
                    background: isLast ? (netPositive ? '#f0fdf4' : '#fef2f2') : 'transparent',
                    marginTop: isLast ? 4 : 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: s.bg, color: s.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>{s.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: isLast ? 700 : 400, color: '#1f2937' }}>
                        {row.label}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: isLast ? 700 : 600, color: s.color }}>
                        {row.type === 'income' ? '+' : row.amount < 0 ? '−' : row.amount >= 0 ? '+' : ''}
                        ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </div>
                      {row.type !== 'income' && data.revenue > 0 && (
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>
                          {(Math.abs(row.amount) / data.revenue * 100).toFixed(1)}% of revenue
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Key metrics */}
          <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Cost Breakdown</div>
            {[
              { label: 'Food Cost',   pct: data.foodCostPct,  amt: data.foodCostForPnl,
                sub: data.actualFoodCost > 0 ? 'Actual purchases' : 'Theoretical (recipe-based)' },
              { label: 'Staff Cost',  pct: data.staffCostPct, amt: data.staffCost,
                sub: 'Salary payments this period' },
              { label: 'Other Expenses', pct: data.totalExpenses > 0 ? (data.totalExpenses / data.revenue * 100).toFixed(1) : 0, amt: data.totalExpenses,
                sub: 'Rent, utilities, misc.' },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>₹{(item.amt || 0).toLocaleString('en-IN')} <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>({item.pct || 0}%)</span></span>
                </div>
                <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(item.pct || 0, 100)}%`, background: '#e53e3e', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Net profit card */}
          <div style={{
            background: netPositive ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${netPositive ? '#86efac' : '#fca5a5'}`,
            borderRadius: 10, padding: '20px 18px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: netPositive ? '#166534' : '#991b1b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {netPositive ? '📈 Net Profit' : '📉 Net Loss'}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: netPositive ? '#166534' : '#991b1b', marginTop: 6 }}>
              ₹{Math.abs(data.netProfit || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 14, color: netPositive ? '#16a34a' : '#dc2626', marginTop: 4 }}>
              {data.profitMargin}% profit margin
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: netPositive ? '#166534' : '#991b1b', opacity: 0.7 }}>
              Revenue ₹{(data.revenue || 0).toLocaleString('en-IN')}
            </div>
          </div>

          {/* Expense category breakdown */}
          {(data.expenseBreakdown || []).length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, padding: '16px 18px', gridColumn: '1 / -1' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Other Expense Categories</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {data.expenseBreakdown.map(cat => (
                  <div key={cat.category} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', border: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{cat.category}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginTop: 2 }}>₹{(cat.amount || 0).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ gridColumn: '1 / -1', fontSize: 11, color: '#9ca3af', padding: '4px 0' }}>
            * Food cost: actual stock purchases used when available; falls back to theoretical (recipe-based) if no purchase data exists for this period.
            Staff cost includes salary payments recorded in months overlapping the selected range.
          </div>
        </div>
      )}
    </div>
  )
}
