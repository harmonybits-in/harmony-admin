// src/components/inventory/StockPage.jsx
import { useState, useEffect } from 'react'
import { inventoryApi } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { SkeletonTable } from '../Skeleton'
import { fmt, fmtN, card, TH, TD, BTN_RED, BTN_OUT, INP, FInp } from './InventoryShared'

export default function StockPage({ rid }) {
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
