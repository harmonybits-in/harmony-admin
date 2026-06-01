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

function fmt(n) {
  if (n == null) return '—'
  return '₹' + Number(n).toLocaleString('en-IN')
}

const TABS = [
  { key: 'theoretical', label: 'Theoretical' },
  { key: 'calculator',  label: 'Calculator'  },
  { key: 'weekly',      label: 'Weekly'      },
  { key: 'product',     label: 'Product-wise'},
]

export default function FoodCostReport() {
  const [from,         setFrom]        = useState(month1)
  const [to,           setTo]          = useState(today)
  const [data,         setData]        = useState(null)
  const [loading,      setLoading]     = useState(false)
  const [error,        setError]       = useState('')
  const [expanded,     setExpanded]    = useState(null)

  // new state
  const [tab,          setTab]         = useState('calculator')
  const [aggregatorPct,setAggregatorPct] = useState(0)
  const [calcData,     setCalcData]    = useState(null)
  const [calcLoading,  setCalcLoading] = useState(false)
  const [calcError,    setCalcError]   = useState('')

  // sort state for product table
  const [sortCol,      setSortCol]     = useState('foodCostPct')
  const [sortDir,      setSortDir]     = useState('desc')

  const load = useCallback(async () => {
    setLoading(true)
    setCalcLoading(true)
    setError('')
    setCalcError('')
    setData(null)
    setCalcData(null)
    setExpanded(null)
    try {
      const [theoreticalRes, calcRes] = await Promise.all([
        reportApi.foodCost(from, to),
        reportApi.foodCostCalculator(from, to, aggregatorPct),
      ])
      setData(theoreticalRes)
      setCalcData(calcRes)
    } catch (e) {
      setError(e.message)
      setCalcError(e.message)
    } finally {
      setLoading(false)
      setCalcLoading(false)
    }
  }, [from, to, aggregatorPct])

  const items  = data?.itemBreakdown || []
  const sorted = [...items].sort((a, b) => (b.foodCostPct ?? -1) - (a.foodCostPct ?? -1))

  // product-wise sort
  const productRows = calcData?.productBreakdown || []
  const sortedProducts = [...productRows].sort((a, b) => {
    const av = a[sortCol] ?? -Infinity
    const bv = b[sortCol] ?? -Infinity
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  function handleSortCol(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const s = calcData?.summary || {}

  // ── shared styles ────────────────────────────────────────────────
  const thStyle = {
    padding: '9px 14px', textAlign: 'left', fontSize: 11,
    fontWeight: 700, color: '#6b7280', textTransform: 'uppercase',
    letterSpacing: 0.4, background: '#f9fafb', borderBottom: '1px solid #e8eaed',
  }
  const tdStyle = { padding: '11px 14px', fontSize: 13, color: '#374151' }
  const sortableTh = (col, label) => (
    <th
      key={col}
      onClick={() => handleSortCol(col)}
      style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}
    >
      {label}{sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Food Cost % Report</h2>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
          Theoretical vs actual food cost — recipe-based item analysis
        </p>
      </div>

      {/* ── Shared date filter row ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
        {[['From', from, setFrom], ['To', to, setTo]].map(([label, val, set]) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>{label}</div>
            <input
              type="date" value={val} max={today}
              onChange={e => set(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid #e8eaed', borderRadius: 7, fontSize: 13 }}
            />
          </div>
        ))}

        {/* Aggregator % input */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
            Aggregator Commission %
          </div>
          <input
            type="number" min={0} max={100} step={0.5}
            value={aggregatorPct}
            placeholder="0"
            onChange={e => setAggregatorPct(Number(e.target.value))}
            style={{ padding: '7px 10px', border: '1px solid #e8eaed', borderRadius: 7, fontSize: 13, width: 90 }}
          />
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Zomato/Swiggy ka % (e.g. 20)</div>
        </div>

        <button
          onClick={load}
          disabled={loading || calcLoading}
          style={{
            padding: '8px 20px', background: '#e53e3e', color: '#fff',
            border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13,
            opacity: (loading || calcLoading) ? 0.7 : 1, alignSelf: 'flex-end',
          }}
        >
          {(loading || calcLoading) ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '7px 18px', borderRadius: 20, border: 'none',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
              background: tab === t.key ? '#863bff' : '#f3f4f6',
              color:      tab === t.key ? '#fff'    : '#6b7280',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Error banners ── */}
      {(error || calcError) && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>
          {error || calcError}
        </div>
      )}

      {/* ── Empty state ── */}
      {!data && !calcData && !loading && !calcLoading && (
        <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 10, padding: '60px 40px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
          Date range select karo aur "Generate Report" click karo
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 1 — THEORETICAL (existing content, unchanged)
      ══════════════════════════════════════════════════════════ */}
      {tab === 'theoretical' && data && (
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

      {/* ══════════════════════════════════════════════════════════
          TAB 2 — CALCULATOR
      ══════════════════════════════════════════════════════════ */}
      {tab === 'calculator' && calcData && (
        <>
          {/* Formula box */}
          <div style={{
            background: '#1a1a2e', border: '2px solid #863bff', borderRadius: 12,
            padding: '20px 24px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              Food Cost Formula
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 14, lineHeight: 2, color: '#e2e8f0' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Food Cost % = </span>
                <span style={{ color: '#fbbf24' }}>(Purchases − Left Over + Wastage)</span>
                <span style={{ color: '#94a3b8' }}> / </span>
                <span style={{ color: '#34d399' }}>Net Sales</span>
                <span style={{ color: '#94a3b8' }}> × 100</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>             = </span>
                <span style={{ color: '#fbbf24' }}>
                  ({fmt(s.totalPurchases)} − {fmt(s.leftoverValue)} + {fmt(s.totalWastage)})
                </span>
                <span style={{ color: '#94a3b8' }}> / </span>
                <span style={{ color: '#34d399' }}>{fmt(s.netSales)}</span>
                <span style={{ color: '#94a3b8' }}> × 100</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>             = </span>
                <span style={{
                  fontSize: 18, fontWeight: 700,
                  color:      pctColor(s.foodCostPct),
                  background: pctBg(s.foodCostPct),
                  padding: '2px 10px', borderRadius: 6,
                }}>
                  {s.foodCostPct != null ? `${s.foodCostPct}%` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Summary cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard label="Gross Sales"   value={fmt(s.grossSales)}   accent="#10b981" />
            <StatCard label="Discount"      value={fmt(s.totalDiscount)} accent="#f59e0b" />
            <StatCard
              label="Aggregator Commission"
              value={fmt(s.aggregatorCommission)}
              sub={`${calcData.aggregatorPct ?? aggregatorPct}% applied`}
              accent="#6366f1"
            />
            <StatCard label="Net Sales"            value={fmt(s.netSales)}      accent="#10b981" />
            <StatCard label="Left Over / Stock Val" value={fmt(s.leftoverValue)} accent="#8b5cf6" />
            <div style={{
              background: '#fff', border: '1px solid #e8eaed', borderRadius: 10,
              padding: '16px 18px', borderLeft: `4px solid ${pctColor(s.foodCostPct)}`,
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Food Cost %</div>
              <div style={{ marginTop: 8 }}>
                <span style={{
                  background: pctBg(s.foodCostPct), color: pctColor(s.foodCostPct),
                  padding: '4px 14px', borderRadius: 20, fontSize: 22, fontWeight: 800,
                }}>
                  {s.foodCostPct != null ? `${s.foodCostPct}%` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown table */}
          <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Cost Breakdown</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Component', 'Amount', 'Impact'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Total Purchases',       val: s.totalPurchases,   impact: '+ve (cost)',          bold: false, color: '#92400e' },
                  { label: 'Left Over (Current Stock)', val: s.leftoverValue, impact: '-ve (reduces cost)',  bold: false, color: '#065f46' },
                  { label: 'Wastage',                val: s.totalWastage,    impact: '+ve (cost)',          bold: false, color: '#92400e' },
                  { label: 'Net Food Cost',          val: s.foodCost,        impact: '—',                   bold: true,  color: '#111827' },
                  { label: 'Net Sales',              val: s.netSales,        impact: '—',                   bold: false, color: '#111827' },
                ].map(row => (
                  <tr key={row.label} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontWeight: row.bold ? 700 : 400 }}>{row.label}</td>
                    <td style={{ ...tdStyle, fontWeight: row.bold ? 700 : 400, color: row.color }}>{fmt(row.val)}</td>
                    <td style={{ ...tdStyle, color: '#9ca3af', fontSize: 12 }}>{row.impact}</td>
                  </tr>
                ))}
                <tr style={{ borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>Food Cost %</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      background: pctBg(s.foodCostPct), color: pctColor(s.foodCostPct),
                      padding: '2px 10px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                    }}>
                      {s.foodCostPct != null ? `${s.foodCostPct}%` : '—'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: '#9ca3af', fontSize: 12 }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'calculator' && !calcData && !calcLoading && (data || error) === null && null}

      {/* ══════════════════════════════════════════════════════════
          TAB 3 — WEEKLY
      ══════════════════════════════════════════════════════════ */}
      {tab === 'weekly' && (
        <>
          {calcLoading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', fontSize: 14 }}>
              Loading weekly data...
            </div>
          )}
          {!calcLoading && calcData && (
            <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Weekly Breakdown</span>
              </div>
              {(calcData.weeklyBreakdown || []).length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  No weekly data — select a date range with data
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
                    <thead>
                      <tr>
                        {[
                          ['Week',            null],
                          ['Gross Sales',     null],
                          ['Discount',        null],
                          ['Agg. Commission', null],
                          ['Net Sales',       null],
                          ['Purchases',       null],
                          ['Wastage',         null],
                          ['FC %',            null],
                        ].map(([h]) => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(calcData.weeklyBreakdown || []).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: 'nowrap' }}>{row.weekLabel}</td>
                          <td style={tdStyle}>{fmt(row.grossSales)}</td>
                          <td style={{ ...tdStyle, color: '#f59e0b' }}>{fmt(row.totalDiscount)}</td>
                          <td style={{ ...tdStyle, color: '#6366f1' }}>{fmt(row.aggregatorCommission)}</td>
                          <td style={{ ...tdStyle, color: '#10b981', fontWeight: 600 }}>{fmt(row.netSales)}</td>
                          <td style={{ ...tdStyle, color: '#92400e', fontWeight: 600 }}>{fmt(row.purchases)}</td>
                          <td style={{ ...tdStyle, color: '#f59e0b' }}>{fmt(row.wastage)}</td>
                          <td style={{ padding: '11px 14px' }}>
                            {row.foodCostPct != null
                              ? <span style={{ background: pctBg(row.foodCostPct), color: pctColor(row.foodCostPct), padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                  {row.foodCostPct}%
                                </span>
                              : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4 — PRODUCT-WISE
      ══════════════════════════════════════════════════════════ */}
      {tab === 'product' && (
        <>
          {calcLoading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', fontSize: 14 }}>
              Loading product data...
            </div>
          )}
          {!calcLoading && calcData && (
            <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Product-wise Breakdown</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{sortedProducts.length} products · click header to sort</span>
              </div>
              {sortedProducts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  No product data available for the selected date range
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                      <tr>
                        {sortableTh('productName',       'Product')}
                        {sortableTh('qtySold',           'Qty')}
                        {sortableTh('grossRevenue',      'Gross Rev')}
                        {sortableTh('discount',          'Discount')}
                        {sortableTh('aggregatorCommission', 'Agg. Comm')}
                        {sortableTh('netRevenue',        'Net Rev')}
                        {sortableTh('theoreticalCost',   'Theoretical Cost')}
                        {sortableTh('foodCostPct',       'FC %')}
                        <th style={thStyle}>Recipe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedProducts.map((prod, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{prod.productName}</td>
                          <td style={tdStyle}>{prod.qtySold}</td>
                          <td style={tdStyle}>{fmt(prod.grossRevenue)}</td>
                          <td style={{ ...tdStyle, color: '#f59e0b' }}>{fmt(prod.discount)}</td>
                          <td style={{ ...tdStyle, color: '#6366f1' }}>{fmt(prod.aggregatorCommission)}</td>
                          <td style={{ ...tdStyle, color: '#10b981', fontWeight: 600 }}>{fmt(prod.netRevenue)}</td>
                          <td style={tdStyle}>
                            {prod.hasRecipe && prod.theoreticalCost != null ? fmt(prod.theoreticalCost) : <span style={{ color: '#d1d5db' }}>—</span>}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            {prod.hasRecipe && prod.foodCostPct != null
                              ? <span style={{ background: pctBg(prod.foodCostPct), color: pctColor(prod.foodCostPct), padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                  {prod.foodCostPct}%
                                </span>
                              : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            {prod.hasRecipe
                              ? <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>Yes</span>
                              : <span style={{ color: '#f59e0b', fontSize: 11 }}>No Recipe</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
