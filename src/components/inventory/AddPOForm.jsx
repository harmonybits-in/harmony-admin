// src/components/inventory/AddPOForm.jsx
import { useState, useRef, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'
import { TimePicker } from './POShared'
import CategorySelect from './CategorySelect'
import SupplierSelect from './SupplierSelect'

const MOCK_RAW = [
  { id:1, name:'Bag M',       unit:'Pkts', stockQty:0  },
  { id:2, name:'Bag L',       unit:'Pkts', stockQty:0  },
  { id:3, name:'Bag S',       unit:'Pkts', stockQty:0  },
  { id:4, name:'Sweet Corn',  unit:'Pkts', stockQty:0  },
  { id:5, name:'Tikki',       unit:'Pkts', stockQty:0  },
  { id:6, name:'Maida',       unit:'Kg',   stockQty:15 },
  { id:7, name:'Paneer',      unit:'Kg',   stockQty:4  },
  { id:8, name:'Butter',      unit:'Kg',   stockQty:2  },
]
const UNITS = ['Pkts','Kg','Ltr','GM','ML','Piece','Box','Dozen','Bag']

const INP = { padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }
const SEL = { ...INP, cursor:'pointer', appearance:'none' }
const BTN_RED = { padding:'7px 16px', borderRadius:6, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }
const BTN_OUT = { padding:'7px 16px', borderRadius:6, border:'1px solid #dde1e7',
  background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }
const TH = { padding:'10px 12px', textAlign:'left', fontSize:11, color:'#888',
  fontWeight:700, background:'#f5f7fa', borderBottom:'1px solid #e8eaed', whiteSpace:'nowrap' }
const TD = { padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f0f0f0', verticalAlign:'middle' }

export default function AddPOForm({ onSave, onCancel }) {
  const toast = useToast()
  const [from,         setFrom]         = useState('Supplier')
  const [supplier,     setSupplier]      = useState('R.k Confectionery')
  const [deliveryDate, setDeliveryDate]  = useState(new Date().toISOString().slice(0,10))
  const [deliveryTime, setDeliveryTime]  = useState('')
  const [poNumber,     setPoNumber]      = useState('PO0000000001')
  const [category,     setCategory]      = useState('')
  const [canEdit,      setCanEdit]       = useState(true)
  const [saving,       setSaving]        = useState(false)
  const [showMoreAct,  setShowMoreAct]   = useState(false)
  const [showExcel,    setShowExcel]     = useState(false)
  const moreRef = useRef(null)
  const excelRef = useRef(null)

  useEffect(()=>{
    function h(e){
      if(moreRef.current&&!moreRef.current.contains(e.target)) setShowMoreAct(false)
      if(excelRef.current&&!excelRef.current.contains(e.target)) setShowExcel(false)
    }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  const blankRow = () => ({ id:Date.now(), rawId:null, rawName:'', qty:'', unit:'', price:'', amount:0 })
  const [rows, setRows] = useState([blankRow(), blankRow()])

  function updRow(id,f,v) {
    setRows(rs=>rs.map(r=>{
      if(r.id!==id) return r
      const up={...r,[f]:v}
      if(f==='qty'||f==='price') up.amount=(f==='qty'?Number(v):Number(r.qty))*(f==='price'?Number(v):Number(r.price))
      if(f==='rawId'){ const rm=MOCK_RAW.find(x=>x.id===v); if(rm){up.unit=rm.unit;up.rawName=rm.name} }
      return up
    }))
  }

  const subTotal    = rows.reduce((a,r)=>a+(Number(r.amount)||0),0)
  const [delivChg,  setDelivChg] = useState(0)
  const grandTotal  = subTotal + Number(delivChg)

  async function handleSave() {
    if(!supplier){ toast.error('Supplier select karo'); return }
    setSaving(true)
    await new Promise(r=>setTimeout(r,700))
    toast.success('✅ Purchase Order saved!')
    setSaving(false); onSave()
  }

  const TABS = ['Supplier','Restaurant','Kitchen']
  const TAB_ICONS = { Supplier:'🏢', Restaurant:'🍽️', Kitchen:'🍴' }

  return (
    <div style={{ background:'#fff', minHeight:'100%' }}>
      {/* Header */}
      <div style={{ padding:'16px 24px', borderBottom:'1px solid #e8eaed' }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', margin:0 }}>Add Purchase Order</h1>
      </div>

      <div style={{ padding:'20px 24px', paddingBottom:100 }}>
        {/* From tabs */}
        <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:22 }}>
          <span style={{ fontSize:13, fontWeight:500, color:'#555', marginRight:12 }}>From:</span>
          {TABS.map(tab=>{
            const active=from===tab
            return (
              <button key={tab} onClick={()=>setFrom(tab)} style={{
                display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
                border:'none', borderBottom:`2px solid ${active?'#e53e3e':'transparent'}`,
                background:'transparent', cursor:'pointer', fontSize:13,
                fontWeight:active?600:400, color:active?'#e53e3e':'#555',
              }}>
                <span>{TAB_ICONS[tab]}</span>{tab}
              </button>
            )
          })}
        </div>

        {/* Fields */}
        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr 1fr auto', gap:14, marginBottom:22, alignItems:'end' }}>
          {/* Supplier */}
          <div>
            <label style={{ display:'block', fontSize:11, color:'#555', fontWeight:600, marginBottom:6 }}>
              Supplier <span style={{ color:'#e53e3e' }}>*</span>
            </label>
            <div style={{ display:'flex', gap:6 }}>
              <SupplierSelect value={supplier} onChange={setSupplier}/>
              {/* Edit icon */}
              <button style={{ ...BTN_OUT, padding:'7px 10px', flexShrink:0 }}>✏️</button>
            </div>
          </div>
          {/* Delivery Date */}
          <div>
            <label style={{ display:'block', fontSize:11, color:'#555', fontWeight:600, marginBottom:6 }}>
              Delivery Date <span style={{ color:'#e53e3e' }}>*</span>
            </label>
            <div style={{ display:'flex', alignItems:'center', gap:6, ...INP }}>
              <span>📅</span>
              <input type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)}
                style={{ border:'none', outline:'none', fontSize:13, color:'#111', background:'transparent', flex:1 }}/>
            </div>
          </div>
          {/* Delivery Time */}
          <div>
            <label style={{ display:'block', fontSize:11, color:'#555', fontWeight:600, marginBottom:6 }}>
              Delivery Time
            </label>
            <TimePicker value={deliveryTime} onChange={setDeliveryTime}/>
          </div>
          {/* PO Number */}
          <div>
            <label style={{ display:'block', fontSize:11, color:'#555', fontWeight:600, marginBottom:6 }}>
              PO Number
            </label>
            <input value={poNumber} onChange={e=>setPoNumber(e.target.value)}
              style={{ ...INP, width:'100%' }}/>
          </div>
          {/* Other Details */}
          <div style={{ paddingBottom:2 }}>
            <button style={{ ...BTN_OUT, whiteSpace:'nowrap', padding:'8px 14px' }}>
              Other Details
            </button>
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:11, color:'#555', fontWeight:600, marginBottom:6 }}>
            Category
          </label>
          <CategorySelect value={category} onChange={setCategory}/>
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginBottom:14 }}>
          <button onClick={()=>setRows(p=>[...p,blankRow()])} style={{
            ...BTN_RED, display:'flex', alignItems:'center', gap:6,
            boxShadow:'0 2px 8px rgba(229,62,62,.25)' }}>
            ＋ Add New
          </button>

          {/* More Actions */}
          <div ref={moreRef} style={{ position:'relative' }}>
            <button onClick={()=>setShowMoreAct(s=>!s)} style={{
              ...BTN_OUT, display:'flex', alignItems:'center', gap:6 }}>
              More Actions <span style={{ fontSize:10 }}>▾</span>
            </button>
            {showMoreAct && (
              <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:500,
                background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
                boxShadow:'0 8px 24px rgba(0,0,0,.12)', overflow:'hidden', minWidth:160 }}>
                {['Clear all','Remove'].map(a=>(
                  <button key={a} onClick={()=>{
                    if(a==='Clear all') setRows([blankRow()])
                    setShowMoreAct(false)
                  }} style={{ display:'block', width:'100%', padding:'10px 14px',
                    border:'none', background:'#fff', cursor:'pointer',
                    fontSize:13, color:'#333', textAlign:'left',
                    borderBottom:'1px solid #f8f8f8' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload Via Excel */}
          <div ref={excelRef} style={{ position:'relative' }}>
            <button onClick={()=>setShowExcel(s=>!s)} style={{
              ...BTN_OUT, display:'flex', alignItems:'center', gap:6 }}>
              Upload Via Excel <span style={{ fontSize:10 }}>▾</span>
            </button>
            {showExcel && (
              <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:500,
                background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
                boxShadow:'0 8px 24px rgba(0,0,0,.12)', overflow:'hidden', minWidth:180 }}>
                {['Download raw materials','Import raw materials'].map(a=>(
                  <button key={a} style={{ display:'block', width:'100%', padding:'10px 14px',
                    border:'none', background:'#fff', cursor:'pointer',
                    fontSize:13, color:'#333', textAlign:'left', borderBottom:'1px solid #f8f8f8' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Line items table */}
        <div style={{ border:'1px solid #e8eaed', borderRadius:8, overflow:'visible', marginBottom:20 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              <th style={{ ...TH, width:36 }}><input type="checkbox" style={{ accentColor:'#e53e3e' }}/></th>
              <th style={{ ...TH, minWidth:220 }}>Raw Material <span style={{ color:'#e53e3e' }}>*</span></th>
              <th style={{ ...TH, width:120 }}>Qty <span style={{ color:'#e53e3e' }}>*</span></th>
              <th style={{ ...TH, width:130 }}>Unit <span style={{ color:'#e53e3e' }}>*</span></th>
              <th style={{ ...TH, width:110 }}>Price</th>
              <th style={{ ...TH, width:120 }}>Amount</th>
              <th style={{ ...TH, width:70 }}>Action</th>
            </tr></thead>
            <tbody>
              {rows.map((row,i)=>(
                <>
                  <tr key={row.id} style={{ background:i%2===0?'#fff':'#fdfdfd' }}>
                    <td style={TD}><input type="checkbox" style={{ accentColor:'#e53e3e' }}/></td>
                    {/* Raw Material */}
                    <td style={TD}>
                      <div style={{ position:'relative' }}>
                        <select value={row.rawId||''} onChange={e=>updRow(row.id,'rawId',Number(e.target.value))}
                          style={{ ...SEL, width:'100%', paddingRight:24 }}>
                          <option value="">Select/Add Raw Material</option>
                          {MOCK_RAW.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                          pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
                      </div>
                    </td>
                    <td style={TD}>
                      <input type="number" value={row.qty} onChange={e=>updRow(row.id,'qty',e.target.value)}
                        style={{ ...INP, width:'100%' }}/>
                    </td>
                    <td style={TD}>
                      <div style={{ position:'relative' }}>
                        <select value={row.unit} onChange={e=>updRow(row.id,'unit',e.target.value)}
                          style={{ ...SEL, width:'100%', paddingRight:24 }}>
                          <option value=""></option>
                          {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                        </select>
                        <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                          pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
                      </div>
                    </td>
                    <td style={TD}>
                      <input type="number" value={row.price} onChange={e=>updRow(row.id,'price',e.target.value)}
                        style={{ ...INP, width:'100%' }}/>
                    </td>
                    <td style={TD}>
                      <span style={{ fontSize:13, fontWeight:500 }}>{row.amount||''}</span>
                    </td>
                    <td style={TD}>
                      <div style={{ display:'flex', gap:5 }}>
                        <button style={{ background:'#f5f5f5', border:'1px solid #e8eaed', borderRadius:4,
                          padding:'3px 7px', cursor:'pointer', fontSize:13, color:'#6366f1' }}>📋</button>
                        {rows.length>1 && (
                          <button onClick={()=>setRows(rs=>rs.filter(r=>r.id!==row.id))}
                            style={{ background:'#f5f5f5', border:'1px solid #e8eaed', borderRadius:4,
                              padding:'3px 7px', cursor:'pointer', fontSize:13, color:'#ef4444' }}>🗑</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {row.rawId && (
                    <tr key={`${row.id}-stock`} style={{ background:'#fafafa' }}>
                      <td colSpan={7} style={{ padding:'3px 12px 8px', fontSize:11, color:'#888' }}>
                        Stock Qty: {MOCK_RAW.find(r=>r.id===row.rawId)?.stockQty??0}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <div style={{ width:380 }}>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0',
              borderBottom:'1px solid #f0f0f0' }}>
              <span style={{ fontSize:13, color:'#555' }}>Sub Total :</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:13, fontWeight:500 }}>{subTotal.toFixed(3)}</span>
                <span style={{ color:'#aaa', cursor:'pointer' }}>⋮</span>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'10px 0', borderBottom:'1px solid #f0f0f0' }}>
              <button style={{ display:'flex', alignItems:'center', gap:6, background:'none',
                border:'none', cursor:'pointer', fontSize:13, color:'#555', padding:0 }}>
                <span style={{ width:20, height:20, borderRadius:50, border:'1.5px solid #555',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:700 }}>+</span>
                Delivery Charges
              </button>
              <span style={{ fontSize:13 }}>{Number(delivChg).toFixed(3)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0' }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#333' }}>Grand Total :</span>
              <span style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>{grandTotal.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100,
        padding:'11px 24px', background:'#fff5f5', borderTop:'1px solid #fecaca',
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
          <div onClick={()=>setCanEdit(c=>!c)} style={{
            width:20, height:20, borderRadius:5, cursor:'pointer',
            border:`2px solid ${canEdit?'#10b981':'#ccc'}`,
            background:canEdit?'#10b981':'#fff',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            {canEdit && <span style={{ color:'#fff', fontSize:11, fontWeight:700 }}>✓</span>}
          </div>
          Recipient can edit the invoice
        </label>
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={onCancel} style={BTN_OUT}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            ...BTN_RED, opacity:saving?.7:1, boxShadow:'0 2px 8px rgba(229,62,62,.3)' }}>
            {saving?'Saving...':'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
