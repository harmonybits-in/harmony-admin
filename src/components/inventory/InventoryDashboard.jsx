// src/components/inventory/InventoryDashboard.jsx
import { useState, useEffect } from 'react'
import { inventoryApi } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { fmt, fmtN, card, TH, TD, INP, BTN_RED } from './InventoryShared'

export default function InventoryDashboard({ rid }) {
  const toast = useToast()
  const [stock,     setStock]     = useState([])
  const [lowStock,  setLowStock]  = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [s, ls] = await Promise.allSettled([
          inventoryApi.getAll(rid),
          inventoryApi.getLowStock(rid),
        ])
        setStock(Array.isArray(s.value) ? s.value : (s.value?.content||[]))
        setLowStock(Array.isArray(ls.value) ? ls.value : [])
      } catch(_) {} finally { setLoading(false) }
    }
    load()
  }, [rid])

  const today = new Date()
  const days  = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate()
  const dayArr= Array.from({length:days},(_,i)=>i+1)

  const totalValue = stock.reduce((a,s)=>a+(Number(s.currentStock)||0)*(Number(s.costPerUnit)||0),0)
  const belowPar   = stock.filter(s=>Number(s.currentStock)<Number(s.reorderLevel||5)).length
  const belowMin   = stock.filter(s=>Number(s.currentStock)<=0).length

  return (
    <div>
      {/* ── Daily Stock Closing Tracker ── */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:'#111' }}>Daily Stock Closing Tracker</h2>
        <p style={{ fontSize:12, color:'#888', marginTop:4 }}>
          Track timely stock closing and monitor manual adjustments.
        </p>
        <div style={{ ...card, marginTop:12 }}>
          <div style={{ display:'flex', gap:32, alignItems:'flex-start', flexWrap:'wrap' }}>
            {/* Left — accuracy */}
            <div style={{ minWidth:220 }}>
              <div style={{ fontSize:28, fontWeight:800, color:'#111' }}>
                {stock.length > 0 ? '0%' : '0%'}
                <span style={{ fontSize:14, fontWeight:400, color:'#888', marginLeft:8 }}>Update Accuracy.</span>
              </div>
              <div style={{ color:'#e53e3e', fontSize:13, fontWeight:600, margin:'8px 0' }}>
                Stock records are not up to date.
              </div>
              <div style={{ fontSize:12, color:'#555', marginBottom:8 }}>
                Closing stock has been updated on <b>0 days</b> this month.
              </div>
              <div style={{ height:6, background:'#f0f0f0', borderRadius:3, overflow:'hidden', marginBottom:8 }}>
                <div style={{ height:'100%', width:'0%', background:'#e53e3e', borderRadius:3 }}/>
              </div>
              <div style={{ fontSize:12, color:'#e53e3e' }}>{today.getDate()} days missed.</div>
            </div>

            {/* Right — monthly calendar */}
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#333' }}>
                  {today.toLocaleString('default',{month:'long'})}'s {today.getFullYear()} Progress.
                </span>
                <button style={{ ...BTN_RED, padding:'5px 14px', fontSize:12 }}>
                  Update Today's Closing
                </button>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {dayArr.map(d => {
                  const isToday = d === today.getDate()
                  const isPast  = d < today.getDate()
                  return (
                    <div key={d} style={{
                      width:32, height:32, borderRadius:50,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:600, cursor:'pointer',
                      border: isToday ? '2px dashed #e53e3e' : '1px solid #e5e7eb',
                      background: isPast ? '#fee2e2' : isToday ? '#fff' : '#fafafa',
                      color: isPast ? '#e53e3e' : isToday ? '#e53e3e' : '#aaa',
                    }}>{d}</div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Current Inventory ── */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:'#111' }}>Current Inventory</h2>
        <p style={{ fontSize:12, color:'#888', marginTop:4 }}>Track your current inventory and identify items that need restocking.</p>

        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr 300px', gap:12, marginTop:12 }}>
          {/* Stat cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { label:'Worth of Stocks', value:fmt(totalValue), arrow:true },
              { label:'Stock getting wasted if not used', value:'40%', color:'#e53e3e', arrow:true },
              { label:'Raw Materials Below Par Level', value:belowPar, arrow:true },
              { label:'Raw Materials Below Min. Level', value:belowMin, arrow:true },
            ].map(({label,value,color,arrow}) => (
              <div key={label} style={{ ...card, padding:'12px 14px', display:'flex',
                justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, color:color||'#111' }}>{value}</div>
                  <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{label}</div>
                </div>
                {arrow && <span style={{ color:'#ccc', fontSize:14 }}>→</span>}
              </div>
            ))}
          </div>

          {/* Low Stock list */}
          <div style={{ ...card }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#333' }}>Low Stock Alert</span>
              <select style={{ ...INP, width:'auto', fontSize:12, padding:'4px 8px' }}>
                <option>All Categories</option>
              </select>
            </div>
            {loading ? <div style={{color:'#aaa',fontSize:12,textAlign:'center',padding:20}}>Loading...</div> : (
              stock.filter(s=>Number(s.currentStock)<Number(s.reorderLevel||5)).slice(0,8).map(s => {
                const pct = Math.min(100, (Number(s.currentStock)/(Number(s.reorderLevel)||5))*100)
                const days = Math.round(Number(s.currentStock)*2)
                return (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:12, color:'#333', minWidth:80 }}>{s.name||s.itemName}</span>
                    <div style={{ flex:1, height:6, background:'#f0f0f0', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`,
                        background: pct<20?'#ef4444':pct<50?'#f59e0b':'#10b981', borderRadius:3 }}/>
                    </div>
                    <span style={{ fontSize:11, color:'#888', minWidth:40, textAlign:'right' }}>{days} Days</span>
                  </div>
                )
              })
            )}
            {!loading && stock.filter(s=>Number(s.currentStock)<Number(s.reorderLevel||5)).length===0 && (
              <div style={{ textAlign:'center', padding:'20px 0', color:'#aaa', fontSize:12 }}>
                Sab stock adequate hai ✓
              </div>
            )}
          </div>

          {/* Donut chart placeholder */}
          <div style={{ ...card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:160, height:160, borderRadius:'50%',
              background:'conic-gradient(#e53e3e 0% 30%, #f59e0b 30% 55%, #10b981 55% 75%, #6366f1 75% 90%, #06b6d4 90% 100%)',
              marginBottom:12 }}/>
            <div style={{ fontSize:11, color:'#888', fontWeight:600 }}>Top 10 Raw Materials</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10, justifyContent:'center' }}>
              {['Vegetables','Grains','Oils','Spices','Dairy'].map((c,i) => (
                <span key={c} style={{ fontSize:10, display:'flex', alignItems:'center', gap:3 }}>
                  <span style={{ width:8,height:8,borderRadius:2,background:['#e53e3e','#f59e0b','#10b981','#6366f1','#06b6d4'][i],display:'inline-block'}}/>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── COGS Breakdown ── */}
      <div>
        <h2 style={{ fontSize:18, fontWeight:700, color:'#111' }}>COGS Breakdown</h2>
        <p style={{ fontSize:12, color:'#888', marginTop:4 }}>Track your current inventory and identify items that need restocking.</p>
        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:12, marginTop:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ ...card, padding:'12px 14px' }}>
              <div style={{ fontSize:20, fontWeight:700 }}>{fmt(totalValue*0.4)}</div>
              <div style={{ fontSize:11, color:'#888' }}>COGS</div>
            </div>
          </div>
          <div style={{ ...card }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#333', marginBottom:12 }}>Cost breakdown by item</div>
            {loading ? <div style={{color:'#aaa',textAlign:'center',padding:16}}>Loading...</div> : (
              stock.slice(0,6).map(s => {
                const cost = (Number(s.currentStock)||0)*(Number(s.costPerUnit)||0)
                const maxCost = Math.max(...stock.map(x=>(Number(x.currentStock)||0)*(Number(x.costPerUnit)||0)),1)
                return (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:12, color:'#333', minWidth:90 }}>{s.name||s.itemName}</span>
                    <div style={{ flex:1, height:18, background:'#dbeafe', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(cost/maxCost)*100}%`, background:'#3b82f6', borderRadius:3 }}/>
                    </div>
                    <span style={{ fontSize:12, fontWeight:500, minWidth:60, textAlign:'right' }}>{fmt(cost)}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
