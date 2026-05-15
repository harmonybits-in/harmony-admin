// src/pages/Inventory.jsx
import { useState, useEffect, useCallback } from 'react'
import RawMaterials from './RawMaterials'
import UnitManagement from './UnitManagement'
import ItemRecipes          from './ItemRecipes'
import ProductionExecution  from './ProductionExecution'
import ProductionMaster     from './ProductionMaster'
import BarcodeGeneration    from './BarcodeGeneration'
import StockPurchase       from './StockPurchase'
import PurchaseOrder       from './PurchaseOrder'
import PurchaseReturn      from './PurchaseReturn'
import InvoiceTemplates    from './InvoiceTemplates'
import { AvailableStockPage, ClosingStockPage } from './ManageStock'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { inventoryApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

function fmt(n)  { return '₹'+(Number(n)||0).toLocaleString('en-IN') }
function fmtN(n) { return (Number(n)||0).toFixed(1) }

// ── Shared style ──────────────────────────────────────────────────
const card = {
  background:'#fff', border:'1px solid #e5e7eb', borderRadius:10,
  padding:'1.25rem', boxShadow:'0 1px 3px rgba(0,0,0,.04)',
}
const TH = { padding:'10px 14px', textAlign:'left', fontSize:11,
  color:'#777', fontWeight:600, borderBottom:'1px solid #f0f0f0',
  background:'#fafafa', whiteSpace:'nowrap' }
const TD = { padding:'10px 14px', fontSize:13,
  borderBottom:'1px solid #f5f5f5', verticalAlign:'middle' }
const BTN_RED = { padding:'7px 16px', borderRadius:5, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer' }
const BTN_OUT = { padding:'7px 16px', borderRadius:5,
  border:'1px solid #ddd', background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }
const INP = { padding:'8px 10px', borderRadius:6, border:'1px solid #ddd',
  fontSize:13, color:'#111', background:'#fff', width:'100%', boxSizing:'border-box', outline:'none' }

function FInp({ label, value, onChange, type='text', placeholder='', required=false }) {
  return (
    <div style={{ marginBottom:12 }}>
      {label && <label style={{ display:'block', fontSize:11, color:'#666', marginBottom:4, fontWeight:500 }}>
        {label}{required&&<span style={{color:'#e53e3e'}}> *</span>}
      </label>}
      <input type={type} value={value??''} onChange={onChange} placeholder={placeholder} style={INP}/>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD — Daily Stock Closing Tracker + Current Inventory
// ════════════════════════════════════════════════════════════════
function InventoryDashboard({ rid }) {
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

// ════════════════════════════════════════════════════════════════
// CURRENT STOCK page
// ════════════════════════════════════════════════════════════════
function StockPage({ rid }) {
  const toast = useToast()
  const [stock,   setStock]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [panel,   setPanel]   = useState(false)
  const [form,    setForm]    = useState({ name:'', unit:'kg', currentStock:'', reorderLevel:'', costPerUnit:'', category:'' })
  const [saving,  setSaving]  = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await inventoryApi.getAll(rid)
      setStock(Array.isArray(r) ? r : (r?.content||[]))
    } catch(_){} finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  async function save() {
    if(!form.name){ toast.error('Item naam required'); return }
    setSaving(true)
    try {
      await inventoryApi.addPurchase({ ...form, restaurantId:rid,
        quantity:Number(form.currentStock)||0, productId:null })
      toast.success('Stock added!')
      setPanel(false)
      setForm({ name:'', unit:'kg', currentStock:'', reorderLevel:'', costPerUnit:'', category:'' })
      load()
    } catch(_){ toast.error('Failed') } finally { setSaving(false) }
  }

  const upd = f => e => setForm(p=>({...p,[f]:e.target.value}))
  const filtered = stock.filter(s => !search ||
    (s.name||s.itemName||'').toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700 }}>Current Stock</h2>
          <p style={{ fontSize:12, color:'#888', marginTop:2 }}>Inventory items aur unka current stock level</p>
        </div>
        <button onClick={()=>setPanel(true)} style={BTN_RED}>+ Add Stock</button>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search item..."
          style={{ ...INP, maxWidth:280 }}/>
      </div>

      <div style={{ ...card, padding:0, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={5} cols={6}/> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Item Name','Category','Unit','Current Stock','Reorder Level','Cost/Unit','Value','Status'].map(h=>(
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={8} style={{ padding:32, textAlign:'center', color:'#aaa', fontSize:13 }}>
                  No stock items. "+ Add Stock" click karo.
                </td></tr>
              ) : filtered.map((s,i) => {
                const curr = Number(s.currentStock)||0
                const rl   = Number(s.reorderLevel)||5
                const val  = curr * (Number(s.costPerUnit)||0)
                const isLow = curr < rl
                return (
                  <tr key={s.id||i}
                    onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={TD}><span style={{ fontWeight:500 }}>{s.name||s.itemName||'—'}</span></td>
                    <td style={{...TD, color:'#777'}}>{s.category||'—'}</td>
                    <td style={{...TD, color:'#777'}}>{s.unit||'—'}</td>
                    <td style={TD}>
                      <span style={{ fontWeight:600, color:isLow?'#e53e3e':'#111' }}>
                        {fmtN(curr)} {s.unit}
                      </span>
                    </td>
                    <td style={{...TD, color:'#777'}}>{fmtN(rl)} {s.unit}</td>
                    <td style={TD}>{fmt(s.costPerUnit||0)}</td>
                    <td style={{...TD, fontWeight:500}}>{fmt(val)}</td>
                    <td style={TD}>
                      <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600,
                        background:isLow?'#fee2e2':'#dcfce7', color:isLow?'#e53e3e':'#16a34a' }}>
                        {isLow ? '⚠ Low' : '✓ OK'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Stock Panel */}
      {panel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:500,
          display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setPanel(false)}>
          <div style={{ background:'#fff', borderRadius:'14px 14px 0 0', width:'100%',
            maxWidth:520, maxHeight:'85vh', display:'flex', flexDirection:'column',
            boxShadow:'0 -8px 32px rgba(0,0,0,.15)' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #f0f0f0',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:14 }}>+ Add Stock Item</span>
              <button onClick={()=>setPanel(false)} style={{ background:'none', border:'none',
                fontSize:20, cursor:'pointer', color:'#aaa' }}>×</button>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:'1.25rem 1.5rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <FInp label="Item Name" value={form.name} onChange={upd('name')} required placeholder="e.g. Tomatoes"/>
                </div>
                <FInp label="Category" value={form.category} onChange={upd('category')} placeholder="Vegetables"/>
                <FInp label="Unit" value={form.unit} onChange={upd('unit')} placeholder="kg / ltr / pcs"/>
                <FInp label="Current Stock" value={form.currentStock} onChange={upd('currentStock')} type="number" placeholder="0"/>
                <FInp label="Reorder Level" value={form.reorderLevel} onChange={upd('reorderLevel')} type="number" placeholder="5"/>
                <div style={{ gridColumn:'1/-1' }}>
                  <FInp label="Cost Per Unit (₹)" value={form.costPerUnit} onChange={upd('costPerUnit')} type="number" placeholder="0"/>
                </div>
              </div>
            </div>
            <div style={{ padding:'12px 18px', borderTop:'1px solid #f0f0f0',
              display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setPanel(false)} style={BTN_OUT}>Cancel</button>
              <button onClick={save} disabled={saving} style={BTN_RED}>
                {saving ? 'Saving...' : 'Add Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SUPPLIERS page
// ════════════════════════════════════════════════════════════════
function SuppliersPage({ rid }) {
  const toast   = useToast()
  const [suppliers, setSuppliers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [panel,     setPanel]     = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [form,      setForm]      = useState({ name:'', phone:'', email:'', category:'', address:'' })
  const [saving,    setSaving]    = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await inventoryApi.getSuppliers(rid)
      setSuppliers(Array.isArray(r) ? r : [])
    } catch(_){} finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  async function save() {
    if(!form.name){ toast.error('Supplier naam required'); return }
    setSaving(true)
    try {
      const body = { ...form, restaurantId:rid }
      if(editId) await inventoryApi.updateSupplier(editId, body)
      else       await inventoryApi.createSupplier(body)
      toast.success(editId ? 'Updated!' : 'Supplier added!')
      setPanel(false); setEditId(null); load()
    } catch(_){ toast.error('Failed') } finally { setSaving(false) }
  }

  function openEdit(s) {
    setForm({ name:s.name||'', phone:s.phone||'', email:s.email||'', category:s.category||'', address:s.address||'' })
    setEditId(s.id); setPanel(true)
  }

  const upd = f => e => setForm(p=>({...p,[f]:e.target.value}))

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700 }}>Suppliers</h2>
          <p style={{ fontSize:12, color:'#888', marginTop:2 }}>Vendors aur suppliers manage karo</p>
        </div>
        <button onClick={()=>{ setForm({name:'',phone:'',email:'',category:'',address:''}); setEditId(null); setPanel(true) }}
          style={BTN_RED}>+ Add Supplier</button>
      </div>
      <div style={{ ...card, padding:0, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={4} cols={5}/> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Supplier Name','Phone','Email','Category','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {suppliers.length===0 ? (
                <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#aaa', fontSize:13 }}>
                  No suppliers. "+ Add Supplier" click karo.
                </td></tr>
              ) : suppliers.map((s,i) => (
                <tr key={s.id||i}
                  onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <td style={TD}><span style={{ fontWeight:500 }}>{s.name}</span></td>
                  <td style={{...TD, color:'#777'}}>{s.phone||'—'}</td>
                  <td style={{...TD, color:'#777'}}>{s.email||'—'}</td>
                  <td style={TD}>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:12,
                      background:'#eff6ff', color:'#2563eb', fontWeight:600 }}>
                      {s.category||'General'}
                    </span>
                  </td>
                  <td style={TD}>
                    <button onClick={()=>openEdit(s)} style={{ ...BTN_OUT, padding:'4px 10px', fontSize:11 }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {panel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:500,
          display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setPanel(false)}>
          <div style={{ background:'#fff', borderRadius:'14px 14px 0 0', width:'100%',
            maxWidth:480, maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #f0f0f0',
              display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, fontSize:14 }}>{editId ? 'Edit Supplier' : '+ Add Supplier'}</span>
              <button onClick={()=>setPanel(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#aaa' }}>×</button>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:'1.25rem 1.5rem' }}>
              <FInp label="Supplier Name" value={form.name} onChange={upd('name')} required/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
                <FInp label="Phone" value={form.phone} onChange={upd('phone')} type="tel"/>
                <FInp label="Category" value={form.category} onChange={upd('category')} placeholder="Vegetables"/>
              </div>
              <FInp label="Email" value={form.email} onChange={upd('email')} type="email"/>
              <FInp label="Address" value={form.address} onChange={upd('address')}/>
            </div>
            <div style={{ padding:'12px 18px', borderTop:'1px solid #f0f0f0', display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setPanel(false)} style={BTN_OUT}>Cancel</button>
              <button onClick={save} disabled={saving} style={BTN_RED}>{saving?'Saving...':editId?'Update':'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PURCHASE ORDERS page
// ════════════════════════════════════════════════════════════════
function PurchaseOrdersPage({ rid }) {
  const toast   = useToast()
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [panel,   setPanel]   = useState(false)
  const [form,    setForm]    = useState({ supplierName:'', totalAmount:'', expectedDelivery:'', notes:'' })
  const [saving,  setSaving]  = useState(false)

  const STATUS_COLOR = { DRAFT:'#9e9e9e', SENT:'#6366f1', RECEIVED:'#10b981', CANCELLED:'#ef4444', PENDING:'#f59e0b' }

  async function load() {
    setLoading(true)
    try {
      const r = await inventoryApi.getPurchaseOrders(rid)
      setOrders(Array.isArray(r) ? r : [])
    } catch(_){} finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  async function save() {
    if(!form.supplierName){ toast.error('Supplier naam required'); return }
    setSaving(true)
    try {
      await inventoryApi.createPurchaseOrder({ ...form, restaurantId:rid,
        totalAmount:Number(form.totalAmount)||0 })
      toast.success('Purchase order created!')
      setPanel(false); load()
    } catch(_){ toast.error('Failed') } finally { setSaving(false) }
  }

  async function updateStatus(id, status) {
    try {
      await inventoryApi.updatePurchaseStatus(id, status, rid)
      toast.success(`Status: ${status}`)
      load()
    } catch(_){ toast.error('Failed') }
  }

  const upd = f => e => setForm(p=>({...p,[f]:e.target.value}))

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700 }}>Purchase Orders</h2>
          <p style={{ fontSize:12, color:'#888', marginTop:2 }}>Purchase orders track karo</p>
        </div>
        <button onClick={()=>{ setForm({supplierName:'',totalAmount:'',expectedDelivery:'',notes:''}); setPanel(true) }}
          style={BTN_RED}>+ New Order</button>
      </div>
      <div style={{ ...card, padding:0, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={4} cols={5}/> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Supplier','Order Date','Amount','Status','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {orders.length===0 ? (
                <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#aaa', fontSize:13 }}>
                  No orders. "+ New Order" click karo.
                </td></tr>
              ) : orders.map((o,i) => {
                const c = STATUS_COLOR[o.status||'DRAFT'] || '#888'
                return (
                  <tr key={o.id||i}
                    onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={TD}><span style={{ fontWeight:500 }}>{o.supplierName||o.supplier?.name||'—'}</span></td>
                    <td style={{...TD, color:'#777'}}>{o.orderDate||o.createdAt?.slice(0,10)||'—'}</td>
                    <td style={{...TD, fontWeight:500}}>{fmt(o.totalAmount||0)}</td>
                    <td style={TD}>
                      <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600,
                        background:c+'22', color:c }}>
                        {o.status||'DRAFT'}
                      </span>
                    </td>
                    <td style={TD}>
                      <div style={{ display:'flex', gap:5 }}>
                        {o.status!=='RECEIVED' && (
                          <button onClick={()=>updateStatus(o.id,'RECEIVED')}
                            style={{ fontSize:11, padding:'3px 8px', borderRadius:4,
                              border:'1px solid #10b981', background:'#f0fdf4', color:'#10b981', cursor:'pointer' }}>
                            Mark Received
                          </button>
                        )}
                        {o.status==='DRAFT' && (
                          <button onClick={()=>updateStatus(o.id,'CANCELLED')}
                            style={{ fontSize:11, padding:'3px 8px', borderRadius:4,
                              border:'1px solid #fca5a5', background:'#fff5f5', color:'#e53e3e', cursor:'pointer' }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {panel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:500,
          display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setPanel(false)}>
          <div style={{ background:'#fff', borderRadius:'14px 14px 0 0', width:'100%',
            maxWidth:480, maxHeight:'75vh', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #f0f0f0',
              display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, fontSize:14 }}>+ New Purchase Order</span>
              <button onClick={()=>setPanel(false)} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#aaa' }}>×</button>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:'1.25rem 1.5rem' }}>
              <FInp label="Supplier Name" value={form.supplierName} onChange={upd('supplierName')} required/>
              <FInp label="Total Amount (₹)" value={form.totalAmount} onChange={upd('totalAmount')} type="number"/>
              <FInp label="Expected Delivery" value={form.expectedDelivery} onChange={upd('expectedDelivery')} type="date"/>
              <FInp label="Notes" value={form.notes} onChange={upd('notes')}/>
            </div>
            <div style={{ padding:'12px 18px', borderTop:'1px solid #f0f0f0', display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setPanel(false)} style={BTN_OUT}>Cancel</button>
              <button onClick={save} disabled={saving} style={BTN_RED}>{saving?'Saving...':'Create Order'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// LOW STOCK page
// ════════════════════════════════════════════════════════════════
function LowStockPage({ rid }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    async function load() {
      setLoading(true)
      try {
        const r = await inventoryApi.getLowStock(rid)
        setItems(Array.isArray(r) ? r : [])
      } catch(_){} finally { setLoading(false) }
    }
    load()
  },[rid])

  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>⚠ Low Stock Alert</h2>
      <p style={{ fontSize:12, color:'#888', marginBottom:16 }}>Items jinका stock reorder level se neeche hai</p>
      <div style={{ ...card, padding:0, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={5} cols={5}/> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Item','Category','Current','Reorder Level','Status'].map(h=><th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.length===0 ? (
                <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#16a34a', fontSize:13 }}>
                  ✓ Sab items adequate stock mein hain!
                </td></tr>
              ) : items.map((s,i) => (
                <tr key={s.id||i}>
                  <td style={TD}><b>{s.name||s.itemName}</b></td>
                  <td style={{...TD,color:'#777'}}>{s.category||'—'}</td>
                  <td style={{ ...TD, color:'#e53e3e', fontWeight:600 }}>{fmtN(s.currentStock)} {s.unit}</td>
                  <td style={{...TD,color:'#777'}}>{fmtN(s.reorderLevel||5)} {s.unit}</td>
                  <td style={TD}>
                    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600,
                      background:'#fee2e2', color:'#e53e3e' }}>⚠ Low Stock</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PLACEHOLDER pages
// ════════════════════════════════════════════════════════════════
function PlaceholderPage({ title, icon }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>{icon}</div>
      <h2 style={{ fontSize:20, fontWeight:700, color:'#333', marginBottom:8 }}>{title}</h2>
      <p style={{ color:'#aaa', fontSize:13 }}>Yeh section coming soon hai.</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN INVENTORY COMPONENT — Routes
// ════════════════════════════════════════════════════════════════
export default function Inventory() {
  const rid      = useAuthStore(s => s.restaurantId)
  const location = useLocation()

  // These routes have their own full-page layout — no wrapper header
  const fullPageRoutes = ['/inventory/masters/raw', '/inventory/masters/units', '/inventory/masters/recipes', '/inventory/production/execution', '/inventory/production/master', '/inventory/production/barcode', '/inventory/purchase/stock', '/inventory/purchase/orders', '/inventory/purchase/return', '/inventory/masters/invoice']
  const isFullPage = fullPageRoutes.some(r => location.pathname.startsWith(r))

  if (isFullPage) {
    return (
      <Routes>
        <Route path="masters/raw"   element={<RawMaterials/>}/>
        <Route path="masters/units"   element={<UnitManagement/>}/>
        <Route path="masters/recipes"      element={<ItemRecipes/>}/>
        <Route path="production/execution" element={<ProductionExecution/>}/>
        <Route path="production/master"    element={<ProductionMaster/>}/>
        <Route path="production/barcode"   element={<BarcodeGeneration/>}/>
        <Route path="purchase/stock"        element={<StockPurchase/>}/>
        <Route path="purchase/orders"       element={<PurchaseOrder/>}/>
        <Route path="purchase/return"       element={<PurchaseReturn/>}/>
        <Route path="masters/invoice"       element={<InvoiceTemplates/>}/>
      </Routes>
    )
  }

  return (
    <div style={{ minHeight:'100%' }}>
      {/* Page header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:'#111' }}>📦 Inventory</h1>
        <p style={{ fontSize:12, color:'#888', marginTop:4 }}>
          Stock, purchases, suppliers aur COGS track karo
        </p>
      </div>

      {/* Nested routes */}
      <Routes>
        <Route index                         element={<InventoryDashboard rid={rid}/>}/>
        <Route path="stock/available"       element={<AvailableStockPage/>}/>
        <Route path="stock/closing"         element={<ClosingStockPage/>}/>
        <Route path="stock"                  element={<StockPage rid={rid}/>}/>
        <Route path="stock/add"              element={<StockPage rid={rid}/>}/>
        <Route path="stock/low"              element={<LowStockPage rid={rid}/>}/>
        <Route path="purchase/stock"         element={<StockPurchase/>}/>
        <Route path="purchase/vendors"       element={<SuppliersPage rid={rid}/>}/>
        <Route path="purchase/orders"        element={<PurchaseOrder/>}/>
        <Route path="purchase/return"        element={<PurchaseReturn/>}/>
        <Route path="masters/invoice"        element={<InvoiceTemplates/>}/>
        <Route path="purchase/history"       element={<PlaceholderPage title="Purchase History" icon="📜"/>}/>
        <Route path="masters/raw"            element={<RawMaterials/>}/>
        <Route path="masters/recipes"        element={<ItemRecipes/>}/>
        <Route path="masters/suppliers"      element={<SuppliersPage rid={rid}/>}/>
        <Route path="masters/units"          element={<UnitManagement/>}/>
        <Route path="stock/opening"          element={<PlaceholderPage title="Opening Stock" icon="📋"/>}/>
        <Route path="consumption/sales"      element={<PlaceholderPage title="Sales Consumption" icon="📉"/>}/>
        <Route path="consumption/transfer"   element={<PlaceholderPage title="Transfer" icon="🔄"/>}/>
        <Route path="consumption/wastage"    element={<PlaceholderPage title="Wastage" icon="🗑️"/>}/>
        <Route path="consumption/return"     element={<PlaceholderPage title="Sales Return" icon="↩️"/>}/>
        <Route path="production"             element={<PlaceholderPage title="Production" icon="🏭"/>}/>
        <Route path="reports/stock"          element={<PlaceholderPage title="Current Stock Report" icon="☑️"/>}/>
        <Route path="reports/summary"        element={<PlaceholderPage title="Stock Summary" icon="📦"/>}/>
        <Route path="reports/consumption"    element={<PlaceholderPage title="Orderwise Consumption" icon="📋"/>}/>
        <Route path="reports/other"          element={<PlaceholderPage title="Other Reports" icon="🕐"/>}/>
        <Route path="reports"                element={<PlaceholderPage title="Inventory Reports" icon="📊"/>}/>
      </Routes>
    </div>
  )
}
