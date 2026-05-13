// src/pages/PurchaseReturn.jsx
import { useState } from 'react'
import { useToast } from '../hooks/useToast'

const MOCK_SUPPLIERS = ['Sherepunjab Agencies','R.k Confectionery','Fresh Farms','Metro Cash']
const MOCK_RAW = [
  { id:1, name:'Sweet Corn', unit:'Pkts' },
  { id:2, name:'Tikki',      unit:'Pkts' },
  { id:3, name:'French Fries',unit:'Pkts'},
  { id:4, name:'Basils',     unit:'Kg'   },
]
const UNITS = ['Pkts','Kg','Ltr','GM','ML','Piece']
const INP = { padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }
const BTN_RED = { padding:'7px 16px', borderRadius:6, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }
const BTN_OUT = { padding:'7px 16px', borderRadius:6, border:'1px solid #dde1e7',
  background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }
const TH = { padding:'10px 12px', textAlign:'left', fontSize:11, color:'#888', fontWeight:700,
  background:'#f5f7fa', borderBottom:'1px solid #e8eaed', whiteSpace:'nowrap' }
const TD = { padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f0f0f0', verticalAlign:'middle' }

export default function PurchaseReturn() {
  const toast = useToast()
  const [tab,         setTab]        = useState('Supplier')
  const [supplier,    setSupplier]    = useState('')
  const [debitDate,   setDebitDate]   = useState(new Date().toISOString().slice(0,10))
  const [debitNo,     setDebitNo]     = useState('1')
  const [invoiceNo,   setInvoiceNo]   = useState('')
  const [updateStock, setUpdateStock] = useState(true)
  const [canEdit,     setCanEdit]     = useState(true)
  const [payType,     setPayType]     = useState('Unpaid')
  const [saving,      setSaving]      = useState(false)

  const blankRow = () => ({ id:Date.now(), rawId:null, qty:'', unit:'', price:'', amount:0, cgst:'', sgst:'', igst:'' })
  const [rows, setRows] = useState([blankRow()])

  function updRow(id,f,v) {
    setRows(rs=>rs.map(r=>{
      if(r.id!==id) return r
      const up={...r,[f]:v}
      if(f==='qty'||f==='price') up.amount=(f==='qty'?Number(v):Number(r.qty))*(f==='price'?Number(v):Number(r.price))
      if(f==='rawId'){ const rm=MOCK_RAW.find(x=>x.id===v); if(rm) up.unit=rm.unit }
      return up
    }))
  }

  const subTotal   = rows.reduce((a,r)=>a+(Number(r.amount)||0), 0)
  const [discount, setDiscount]  = useState(0)
  const [otherChg, setOtherChg]  = useState(0)
  const [otherTax, setOtherTax]  = useState(0)
  const grandTotal = subTotal - Number(discount) + Number(otherChg) + Number(otherTax)

  const TABS = ['Supplier','Restaurant','Kitchen']
  const ICONS = { Supplier:'🏢', Restaurant:'🍽️', Kitchen:'🍴' }

  return (
    <div style={{ background:'#fff', minHeight:'100%' }}>
      <div style={{ padding:'16px 24px', borderBottom:'1px solid #e8eaed' }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', margin:0 }}>Add Purchase Return</h1>
      </div>

      <div style={{ padding:'20px 24px', paddingBottom:100 }}>
        {/* Tabs */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:22 }}>
          <span style={{ fontSize:13, fontWeight:500, color:'#555', marginRight:12 }}>To:</span>
          {TABS.map(t=>{
            const active=tab===t
            return (
              <button key={t} onClick={()=>setTab(t)} style={{
                display:'flex', alignItems:'center', gap:7, padding:'9px 18px',
                border:'none', borderBottom:`2px solid ${active?'#e53e3e':'transparent'}`,
                background:'transparent', cursor:'pointer', fontSize:13,
                fontWeight:active?600:400, color:active?'#e53e3e':'#555',
              }}>
                <span>{ICONS[t]}</span>{t}
              </button>
            )
          })}
        </div>

        {/* Fields */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:16, marginBottom:22, alignItems:'end' }}>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#555', fontWeight:600, marginBottom:6 }}>
              {tab} <span style={{ color:'#e53e3e' }}>*</span>
            </label>
            <div style={{ display:'flex', gap:6 }}>
              <div style={{ position:'relative', flex:1 }}>
                <select value={supplier} onChange={e=>setSupplier(e.target.value)}
                  style={{ ...INP, width:'100%', paddingRight:24, appearance:'none' }}>
                  <option value="">Please select</option>
                  {MOCK_SUPPLIERS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                  pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
              </div>
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#555', fontWeight:600, marginBottom:6 }}>
              Debit Note Date <span style={{ color:'#e53e3e' }}>*</span>
            </label>
            <div style={{ display:'flex', alignItems:'center', gap:6, ...INP }}>
              <span>📅</span>
              <input type="date" value={debitDate} onChange={e=>setDebitDate(e.target.value)}
                style={{ border:'none', outline:'none', fontSize:13, color:'#111', background:'transparent', flex:1 }}/>
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#555', fontWeight:600, marginBottom:6 }}>
              Debit Note No. <span style={{ color:'#e53e3e' }}>*</span>
            </label>
            <div style={{ display:'flex', gap:6 }}>
              <input value={debitNo} onChange={e=>setDebitNo(e.target.value)}
                style={{ ...INP, flex:1 }}/>
              <button style={{ ...BTN_OUT, padding:'7px 10px' }}>✏️</button>
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#555', fontWeight:600, marginBottom:6 }}>
              Purchase Invoice No. <span style={{ color:'#aaa', fontSize:10 }}>ⓘ</span>
            </label>
            <input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)}
              style={{ ...INP, width:'100%' }}/>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginBottom:14 }}>
          <button onClick={()=>setRows(p=>[...p,blankRow()])} style={{
            ...BTN_RED, display:'flex', alignItems:'center', gap:6,
            boxShadow:'0 2px 8px rgba(229,62,62,.25)' }}>
            ＋ Add New
          </button>
          <button style={{ ...BTN_OUT, display:'flex', alignItems:'center', gap:5 }}>
            ⓘ At Invoice Level <span style={{ fontSize:10 }}>▾</span>
          </button>
          <button style={{ ...BTN_OUT, display:'flex', alignItems:'center', gap:5 }}>
            More Actions <span style={{ fontSize:10 }}>▾</span>
          </button>
          <button style={{ ...BTN_OUT, display:'flex', alignItems:'center', gap:5 }}>
            ↑ Upload Invoice
          </button>
        </div>

        {/* Line items */}
        <div style={{ border:'1px solid #e8eaed', borderRadius:8, overflow:'visible', marginBottom:20 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              <th style={{ ...TH, width:36 }}><input type="checkbox" style={{ accentColor:'#e53e3e' }}/></th>
              <th style={{ ...TH, minWidth:200 }}>Raw Material <span style={{ color:'#e53e3e' }}>*</span></th>
              <th style={{ ...TH, width:100 }}>Qty <span style={{ color:'#e53e3e' }}>*</span></th>
              <th style={{ ...TH, width:120 }}>Unit <span style={{ color:'#e53e3e' }}>*</span></th>
              <th style={{ ...TH, width:100 }}>Price</th>
              <th style={{ ...TH, width:100 }}>Amount</th>
              <th style={{ ...TH, width:80 }}>CGST</th>
              <th style={{ ...TH, width:80 }}>SGST</th>
              <th style={{ ...TH, width:80 }}>IGST</th>
              <th style={{ ...TH, width:60 }}>Action</th>
            </tr></thead>
            <tbody>
              {rows.map((row,i)=>(
                <tr key={row.id} style={{ background:i%2===0?'#fff':'#fdfdfd' }}>
                  <td style={TD}><input type="checkbox" style={{ accentColor:'#e53e3e' }}/></td>
                  <td style={TD}>
                    <div style={{ position:'relative' }}>
                      <select value={row.rawId||''} onChange={e=>updRow(row.id,'rawId',Number(e.target.value))}
                        style={{ ...INP, width:'100%', paddingRight:24, appearance:'none' }}>
                        <option value="">Select/Add Raw Material</option>
                        {MOCK_RAW.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                        pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
                    </div>
                  </td>
                  <td style={TD}><input type="number" value={row.qty} onChange={e=>updRow(row.id,'qty',e.target.value)} style={{ ...INP, width:'100%' }}/></td>
                  <td style={TD}>
                    <div style={{ position:'relative' }}>
                      <select value={row.unit} onChange={e=>updRow(row.id,'unit',e.target.value)}
                        style={{ ...INP, width:'100%', paddingRight:24, appearance:'none' }}>
                        <option value=""></option>
                        {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                      </select>
                      <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                        pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
                    </div>
                  </td>
                  <td style={TD}><input type="number" value={row.price} onChange={e=>updRow(row.id,'price',e.target.value)} style={{ ...INP, width:'100%' }}/></td>
                  <td style={TD}><span style={{ fontSize:13, fontWeight:500 }}>{row.amount||''}</span></td>
                  <td style={TD}><input type="number" value={row.cgst||''} onChange={e=>updRow(row.id,'cgst',e.target.value)} placeholder="CGST" style={{ ...INP, width:'100%' }}/></td>
                  <td style={TD}><input type="number" value={row.sgst||''} onChange={e=>updRow(row.id,'sgst',e.target.value)} placeholder="SGST" style={{ ...INP, width:'100%' }}/></td>
                  <td style={TD}><input type="number" value={row.igst||''} onChange={e=>updRow(row.id,'igst',e.target.value)} placeholder="IGST" style={{ ...INP, width:'100%' }}/></td>
                  <td style={TD}>
                    <div style={{ display:'flex', gap:5 }}>
                      <button style={{ background:'#f5f5f5', border:'1px solid #e8eaed', borderRadius:4, padding:'3px 7px', cursor:'pointer', fontSize:13, color:'#6366f1' }}>📋</button>
                      {rows.length>1&&<button onClick={()=>setRows(rs=>rs.filter(r=>r.id!==row.id))} style={{ background:'#f5f5f5', border:'1px solid #e8eaed', borderRadius:4, padding:'3px 7px', cursor:'pointer', fontSize:13, color:'#ef4444' }}>🗑</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <div style={{ width:400 }}>
            {[['Sub Total :', subTotal, false],
              ['+ Total Discount', discount, true],
              ['+ Add Other Charges', otherChg, false],
              ['+ Other Taxes', otherTax, false]].map(([label,val,isDisc],i)=>(
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'10px 0', borderBottom:'1px solid #f0f0f0' }}>
                {i===0 ? (
                  <span style={{ fontSize:13, color:'#555' }}>{label}</span>
                ) : (
                  <button style={{ display:'flex', alignItems:'center', gap:6, background:'none',
                    border:'none', cursor:'pointer', fontSize:13, color:'#555', padding:0 }}>
                    <span style={{ width:20, height:20, borderRadius:50, border:'1.5px solid #555',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>+</span>
                    {label.replace('+ ','')}
                  </button>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, color:isDisc?'#e53e3e':'#333' }}>
                    {isDisc?'- ':''}{Number(val).toFixed(3)}
                  </span>
                  {i===0 && <span style={{ color:'#aaa', cursor:'pointer' }}>⋮</span>}
                </div>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0',
              borderBottom:'2px solid #e8eaed' }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#333' }}>Grand Total :</span>
              <span style={{ fontSize:14, fontWeight:700 }}>{grandTotal.toFixed(3)}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0' }}>
              <span style={{ fontSize:13, color:'#555', fontWeight:500 }}>Payment Type :</span>
              {['Unpaid','Paid'].map(t=>(
                <button key={t} onClick={()=>setPayType(t)} style={{
                  padding:'5px 16px', borderRadius:20, fontSize:12, fontWeight:600,
                  cursor:'pointer', border:'none', transition:'all .15s',
                  background:payType===t?'#fee2e2':'#f0f0f0',
                  color:payType===t?'#e53e3e':'#666',
                }}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100,
        padding:'11px 24px', background:'#fff5f5', borderTop:'1px solid #fecaca',
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', gap:20 }}>
          {[['updateStock','Update Inventory Stock'],['canEdit','Recipient can edit the invoice']].map(([field,label])=>(
            <label key={field} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
              <div onClick={()=>field==='updateStock'?setUpdateStock(s=>!s):setCanEdit(s=>!s)} style={{
                width:20, height:20, borderRadius:5, cursor:'pointer',
                border:`2px solid ${(field==='updateStock'?updateStock:canEdit)?'#10b981':'#ccc'}`,
                background:(field==='updateStock'?updateStock:canEdit)?'#10b981':'#fff',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {(field==='updateStock'?updateStock:canEdit)&&<span style={{ color:'#fff', fontSize:11, fontWeight:700 }}>✓</span>}
              </div>
              {label}
            </label>
          ))}
        </div>
        <div style={{ display:'flex', gap:12 }}>
          <button style={BTN_OUT}>Cancel</button>
          <button onClick={async()=>{
            setSaving(true); await new Promise(r=>setTimeout(r,600))
            toast.success('✅ Purchase Return saved!'); setSaving(false)
          }} style={{ ...BTN_RED, opacity:saving?.7:1, boxShadow:'0 2px 8px rgba(229,62,62,.3)' }}>
            {saving?'Saving...':'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
