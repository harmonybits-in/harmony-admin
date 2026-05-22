import { useState, useCallback } from 'react'
import { reportApi } from '../api/client'

const today  = new Date().toISOString().slice(0, 10)
const month1 = today.slice(0, 7) + '-01'

function pctColor(pct) {
  if (pct == null) return '#9ca3af'
  if (pct <= 28)   return '#065f46'
  if (pct <= 35)   return '#92400e'
  return '#991b1b'
}
function pctBg(pct) {
  if (pct == null) return '#f3f4f6'
  if (pct <= 28)   return '#d1fae5'
  if (pct <= 35)   return '#fef3c7'
  return '#fee2e2'
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, padding: '16px 18px', borderLeft: `4px solid ${accent || '#e53e3e'}` }}>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function FoodCostReport() {
  const [from,      setFrom]      = useState(month1)
  const [to,        setTo]        = useState(today)
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [expanded,  setExpanded]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setData(null)
    setExpanded(null)
    try {
      const res = await reportApi.foodCost(from, to)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  const items = data?.itemBreakdown || []
  const sorted = [...items].sort((a, b) => (b.foodCostPct ?? -1) - (a.foodCostPct ?? -1))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Food Cost % Report</h2>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
          Theoretical vs actual food cost — recipe-based item analysis
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
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>
          {error}
        </div>
      )}

      {!data && !loading && (
        <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 10, padding: '60px 40px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
          Date range select karo aur "Generate Report" click karo
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard label="Revenue"         value={`₹${data.revenue?.toLocaleString('en-IN')}`} accent="#10b981" />
            <StatCard label="Theoretical FC"  value={`₹${data.theoreticalFoodCost?.toLocaleString('en-IN')}`}
                      sub={`${data.theoreticalFoodCostPct}% of revenue`} accent="#f59e0b" />
            <StatCard label="Actual FC (Purchases)" value={data.actualFoodCost > 0 ? `₹${data.actualFoodCost?.toLocaleString('en-IN')}` : '—'}
                      sub={data.actualFoodCost > 0 ? `${data.actualFoodCostPct}% of revenue` : 'No purchase data'} accent="#6366f1" />
            <StatCard label="Variance (Act−Theo)"
                      value={data.actualFoodCost > 0 ? `₹${Math.abs(data.variance)?.toLocaleString('en-IN')}` : '—'}
                      sub={data.actualFoodCost > 0 ? (data.variance > 0 ? '⬆ Over-spending' : '⬇ Under budget') : ''}
                      accent={data.variance > 0 ? '#ef4444' : '#10b981'} />
            <StatCard label="Recipe Coverage" value={`${data.recipeCoveragePct}%`}
                      sub={`${data.itemsWithRecipe} / ${data.itemsWithRecipe + data.itemsWithoutRecipe} items`} accent="#8b5cf6" />
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12 }}>
            {[['≤28%', '#065f46', '#d1fae5', 'Excellent'], ['29–35%', '#92400e', '#fef3c7', 'Acceptable'], ['>35%', '#991b1b', '#fee2e2', 'High — Review']].map(([label, color, bg, tip]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 28, height: 16, borderRadius: 4, background: bg, border: `1px solid ${color}20`, display: 'inline-block' }} />
                <span style={{ color, fontWeight: 600 }}>{label}</span>
                <span style={{ color: '#9ca3af' }}>{tip}</span>
              </div>
            ))}
          </div>

          {/* Item breakdown table */}
          <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Item-wise Breakdown</span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{items.length} items sold · sorted by food cost %</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e8eaed' }}>
                  {['Item', 'Qty Sold', 'Revenue', 'Cost / Unit', 'Total Cost', 'FC %', 'Recipe'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, i) => (
                  <>
                    <tr key={item.productId}
                      onClick={() => item.hasRecipe && setExpanded(expanded === i ? null : i)}
                      style={{ borderBottom: '1px solid #f3f4f6', cursor: item.hasRecipe ? 'pointer' : 'default', background: expanded === i ? '#f9fafb' : 'white' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.productName}</div>
                        {item.hasRecipe && expanded !== i && (
                          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>Click to see ingredients</div>
                        )}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: '#374151', fontWeight: 600 }}>{item.qtySold}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13 }}>₹{item.revenue?.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13 }}>
                        {item.costPerUnit != null ? `₹${item.costPerUnit.toLocaleString('en-IN')}` : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13 }}>
                        {item.totalTheoreticalCost != null ? `₹${item.totalTheoreticalCost.toLocaleString('en-IN')}` : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {item.foodCostPct != null
                          ? <span style={{ background: pctBg(item.foodCostPct), color: pctColor(item.foodCostPct), padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                              {item.foodCostPct}%
                            </span>
                          : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {item.hasRecipe
                          ? <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>✓ Yes</span>
                          : <span style={{ color: '#f59e0b', fontSize: 11 }}>No Recipe</span>}
                      </td>
                    </tr>
                    {/* Ingredient drill-down */}
                    {expanded === i && item.ingredients?.length > 0 && (
                      <tr key={`${item.productId}-ing`} style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                        <td colSpan={7} style={{ padding: '0 14px 12px 28px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Ingredients</div>
                          <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 600 }}>
                            <thead>
                              <tr>
                                {['Ingredient', 'Qty', 'Unit', 'Price/Unit', 'Cost'].map(h => (
                                  <th key={h} style={{ padding: '4px 10px', textAlign: 'left', fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {item.ingredients.map((ing, j) => (
                                <tr key={j}>
                                  <td style={{ padding: '4px 10px', fontSize: 12 }}>{ing.name}</td>
                                  <td style={{ padding: '4px 10px', fontSize: 12 }}>{ing.qty}</td>
                                  <td style={{ padding: '4px 10px', fontSize: 12, color: '#6b7280' }}>{ing.unit}</td>
                                  <td style={{ padding: '4px 10px', fontSize: 12 }}>{ing.price != null ? `₹${ing.price}` : '—'}</td>
                                  <td style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>₹{ing.cost?.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {items.filter(i => !i.hasRecipe).length > 0 && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#92400e', background: '#fef3c7' }}>
                ⚠️ {data.itemsWithoutRecipe} items ke recipes nahi hain — Inventory → Item Recipes mein add karo for better accuracy.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
