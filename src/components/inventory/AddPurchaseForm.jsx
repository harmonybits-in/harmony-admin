// src/components/inventory/AddPurchaseForm.jsx
import React, { useState } from 'react'
import { useToast } from '../../hooks/useToast'
import SearchDrop from './SearchDrop'

const MOCK_SUPPLIERS = [
  { id:1, name:'Sherepunjab Agencies' },
  { id:2, name:'Fresh Farms' },
  { id:3, name:'Metro Cash & Carry' },
  { id:4, name:'Reliance Smart' },
]
const MOCK_RAW = [
  { id:1,  name:'Sweet Corn',   unit:'Pkts', stockQty:0  },
  { id:2,  name:'Tikki',        unit:'Pkts', stockQty:0  },
  { id:3,  name:'French Fries', unit:'Pkts', stockQty:0  },
  { id:4,  name:'Basils',       unit:'Kg',   stockQty:0  },
  { id:5,  name:'Tomatoes',     unit:'Kg',   stockQty:12 },
  { id:6,  name:'Paneer',       unit:'Kg',   stockQty:4  },
  { id:7,  name:'Oil',          unit:'Ltr',  stockQty:8  },
  { id:8,  name:'Onion',        unit:'Kg',   stockQty:20 },
  { id:9,  name:'Maida',        unit:'Kg',   stockQty:15 },
  { id:10, name:'Salt',         unit:'Kg',   stockQty:3  },
]
const UNITS = ['Pkts','Kg','Ltr','GM','ML','Piece','Box','Dozen','Bag']

const INP = { padding:'7px 10px', borderRadius:5, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }
const SEL = { ...INP, cursor:'pointer', appearance:'none' }
const BTN_RED = { padding:'7px 16px', borderRadius:5, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }
const BTN_OUT = { padding:'7px 16px', borderRadius:5, border:'1px solid #dde1e7',
  background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }
const TH = { padding:'10px 12px', textAlign:'left', fontSize:11, color:'#888', fontWeight:700,
  background:'#f5f7fa', borderBottom:'1px solid #e8eaed', whiteSpace:'nowrap' }
const TD = { padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f0f0f0', verticalAlign:'middle' }

export default function AddPurchaseForm({ onSave, onCancel }) {
  const toast = useToast()
  const [purchaseFrom, setPurchaseFrom] = useState('Supplier') // Supplier | Restaurant | Kitchen
  const [supplierId,   setSupplierId]   = useState(null)
  const [supplierList, setSupplierList] = useState(MOCK_SUPPLIERS)
  const [invoiceDate,  setInvoiceDate]  = useState(new Date().toISOString().slice(0,10))
  const [invoiceNo,    setInvoiceNo]    = useState('')
  const [updateStock,  setUpdateStock]  = useState(true)
  const [saving,       setSaving]       = useState(false)

  // Line items
  const blankRow = () => ({ id:Date.now(), rawId:null, rawName:'', qty:'', unit:'',
    price:'', amount:0, cgst:'', sgst:'' })
  const [rows, setRows] = useState([blankRow()])

  // Summary
  const subTotal   = rows.reduce((a,r)=>a+(Number(r.amount)||0),0)
  const [discount, setDiscount]   = useState(0)
  const [otherChg, setOtherChg]   = useState(0)
  const [otherTax, setOtherTax]   = useState(0)
  const [payType,   setPayType]   = useState('Unpaid')
  const [payDate,   setPayDate]   = useState(new Date().toISOString().slice(0,10))
  const [paidAmt,   setPaidAmt]   = useState('')
  const [payMode,   setPayMode]   = useState('Cash')
  const grandTotal = subTotal - Number(discount) + Number(otherChg) + Number(otherTax)

  function updRow(id,f,v) {
    setRows(rs=>rs.map(r=>{
      if(r.id!==id) return r
      const updated={...r,[f]:v}
      // Auto-calc amount
      if(f==='qty'||f==='price'){
        const q=f==='qty'?Number(v):Number(r.qty)
        const p=f==='price'?Number(v):Number(r.price)
        updated.amount=q*p
      }
      // Auto-set unit from raw material
      if(f==='rawId'){
        const rm=MOCK_RAW.find(x=>x.id===v)
        if(rm) { updated.unit=rm.unit; updated.rawName=rm.name }
      }
      return updated
    }))
  }

  async function handleSave() {
    if(!supplierId){toast.error('Supplier select karo');return}
    const valid=rows.filter(r=>r.rawId&&r.qty)
    if(!valid.length){toast.error('Minimum 1 item add karo');return}
    setSaving(true)
    await new Promise(r=>setTimeout(r,700))
    toast.success('✅ Purchase saved!')
    setSaving(false); onSave()
  }

  const TABS = ['Supplier','Restaurant','Kitchen']

  return (
    <div style={{background:'#fff',minHeight:'100%'}}>
      {/* Header */}
      <div style={{padding:'16px 24px',borderBottom:'1px solid #e8eaed'}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'#1a1a2e',margin:0}}>Add Purchase</h1>
      </div>

      <div style={{padding:'20px 24px',paddingBottom:100}}>
        {/* Purchase From tabs */}
        <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:20}}>
          <span style={{fontSize:13,fontWeight:500,color:'#555',marginRight:16}}>Purchase From:</span>
          {TABS.map(tab=>{
            const icons={Supplier:'🏢',Restaurant:'🍽️',Kitchen:'🍴'}
            const active=purchaseFrom===tab
            return (
              <button key={tab} onClick={()=>setPurchaseFrom(tab)} style={{
                display:'flex',alignItems:'center',gap:7,padding:'9px 18px',
                border:'none',borderBottom:`2px solid ${active?'#e53e3e':'transparent'}`,
                background:'transparent',cursor:'pointer',fontSize:13,fontWeight:active?600:400,
                color:active?'#e53e3e':'#555',transition:'all .15s',
              }}>
                <span>{icons[tab]}</span>{tab}
              </button>
            )
          })}
          {/* Select Purchase Order/Sales */}
          <button style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,
            padding:'8px 14px',borderRadius:6,border:'1px solid #e8eaed',
            background:'#fafafa',cursor:'pointer',fontSize:12,color:'#555'}}>
            📋 Select Purchase Order/Sales <span style={{fontSize:11}}>›</span>
          </button>
        </div>

        {/* Supplier + Invoice fields */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
          <div>
            <label style={{display:'block',fontSize:11,color:'#555',fontWeight:600,marginBottom:6}}>
              Supplier <span style={{color:'#e53e3e'}}>*</span>
            </label>
            <SearchDrop
              value={supplierId}
              onChange={o=>{setSupplierId(o.id); if(!MOCK_SUPPLIERS.find(s=>s.id===o.id)) setSupplierList(p=>[...p,o])}}
              options={supplierList}
              placeholder="Select/Add Supplier"
              allowAdd
            />
          </div>
          <div>
            <label style={{display:'block',fontSize:11,color:'#555',fontWeight:600,marginBottom:6}}>
              Invoice Date <span style={{color:'#e53e3e'}}>*</span>
            </label>
            <div style={{display:'flex',alignItems:'center',gap:8,...INP}}>
              <span>📅</span>
              <input type="date" value={invoiceDate} onChange={e=>setInvoiceDate(e.target.value)}
                style={{border:'none',outline:'none',fontSize:13,color:'#111',background:'transparent',flex:1}}/>
            </div>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,color:'#555',fontWeight:600,marginBottom:6}}>
              Invoice Number
            </label>
            <input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)}
              placeholder="Invoice Number" style={{...INP,width:'100%'}}/>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginBottom:12}}>
          <button onClick={()=>setRows(p=>[...p,blankRow()])} style={{
            ...BTN_RED,display:'flex',alignItems:'center',gap:6,
            boxShadow:'0 2px 8px rgba(229,62,62,.25)'}}>
            ＋ Add New
          </button>
          <button style={{...BTN_OUT,display:'flex',alignItems:'center',gap:5}}>
            ⓘ At Invoice Level <span style={{fontSize:10}}>▾</span>
          </button>
          <button style={{...BTN_OUT,display:'flex',alignItems:'center',gap:5}}>
            More Action <span style={{fontSize:10}}>▾</span>
          </button>
          <button style={{...BTN_OUT,display:'flex',alignItems:'center',gap:5}}>
            ↑ Upload Invoice
          </button>
        </div>

        {/* Line items table */}
        <div style={{border:'1px solid #e8eaed',borderRadius:8,overflow:'visible',marginBottom:20}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>
              <th style={{...TH,width:36}}><input type="checkbox" style={{accentColor:'#e53e3e'}}/></th>
              <th style={{...TH,minWidth:200}}>Raw Material <span style={{color:'#e53e3e'}}>*</span></th>
              <th style={{...TH,width:100}}>Qty <span style={{color:'#e53e3e'}}>*</span></th>
              <th style={{...TH,width:110}}>Unit <span style={{color:'#e53e3e'}}>*</span></th>
              <th style={{...TH,width:100}}>Price</th>
              <th style={{...TH,width:110}}>Amount</th>
              <th style={{...TH,width:100}}>Tax (%)</th>
              <th style={{...TH,width:100}}></th>
              <th style={{...TH,width:60}}>Action</th>
            </tr></thead>
            <tbody>
              {rows.map((row,i)=>(
                <React.Fragment key={row.id}>
                  <tr style={{background:i%2===0?'#fff':'#fdfdfd'}}>
                    <td style={TD}><input type="checkbox" style={{accentColor:'#e53e3e'}}/></td>
                    <td style={TD}>
                      <SearchDrop
                        value={row.rawId}
                        onChange={o=>updRow(row.id,'rawId',o.id)}
                        options={MOCK_RAW}
                        placeholder="Select/Add Raw Material"
                        allowAdd
                      />
                    </td>
                    <td style={TD}>
                      <input type="number" value={row.qty}
                        onChange={e=>updRow(row.id,'qty',e.target.value)}
                        style={{...INP,width:'100%'}}/>
                    </td>
                    <td style={TD}>
                      <div style={{position:'relative'}}>
                        <select value={row.unit}
                          onChange={e=>updRow(row.id,'unit',e.target.value)}
                          style={{...SEL,width:'100%',paddingRight:22}}>
                          <option value=""></option>
                          {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                        </select>
                        <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',
                          pointerEvents:'none',fontSize:9,color:'#aaa'}}>▼</span>
                      </div>
                    </td>
                    <td style={TD}>
                      <input type="number" value={row.price}
                        onChange={e=>updRow(row.id,'price',e.target.value)}
                        style={{...INP,width:'100%'}}/>
                    </td>
                    <td style={TD}>
                      <input type="number" value={row.amount||''}
                        readOnly style={{...INP,width:'100%',background:'#f9fafb',color:'#555'}}/>
                    </td>
                    {/* Tax columns */}
                    <td style={TD}>
                      <input type="number" value={row.cgst||''}
                        onChange={e=>updRow(row.id,'cgst',e.target.value)}
                        placeholder="CGST %" style={{...INP,width:'100%'}}/>
                    </td>
                    <td style={TD}>
                      <input type="number" value={row.sgst||''}
                        onChange={e=>updRow(row.id,'sgst',e.target.value)}
                        placeholder="SGST %" style={{...INP,width:'100%'}}/>
                    </td>
                    <td style={TD}>
                      <div style={{display:'flex',gap:6}}>
                        <button style={{background:'#f5f5f5',border:'1px solid #e8eaed',borderRadius:4,
                          padding:'3px 7px',cursor:'pointer',fontSize:13,color:'#6366f1'}}>📋</button>
                        {rows.length>1&&(
                          <button onClick={()=>setRows(rs=>rs.filter(r=>r.id!==row.id))}
                            style={{background:'#f5f5f5',border:'1px solid #e8eaed',borderRadius:4,
                              padding:'3px 7px',cursor:'pointer',fontSize:13,color:'#ef4444'}}>🗑</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Stock Qty display */}
                  {row.rawId&&(
                    <tr style={{background:'#fafafa'}}>
                      <td colSpan={10} style={{padding:'3px 12px 8px',fontSize:11,color:'#888'}}>
                        Stock Qty: {MOCK_RAW.find(r=>r.id===row.rawId)?.stockQty??0}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary section */}
        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <div style={{width:400}}>
            <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',
              borderBottom:'1px solid #f0f0f0'}}>
              <span style={{fontSize:13,color:'#555'}}>Sub Total :</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500}}>{subTotal.toFixed(3)}</span>
                <span style={{color:'#aaa',cursor:'pointer',fontSize:16}}>⋮</span>
              </div>
            </div>
            {[
              ['+ Total Discount', discount, setDiscount, true],
              ['+ Add Other Charges', otherChg, setOtherChg, false],
              ['+ Other Taxes', otherTax, setOtherTax, false],
            ].map(([label,val,set,isDiscount])=>(
              <div key={label} style={{display:'flex',justifyContent:'space-between',
                alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f0f0f0'}}>
                <button style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',
                  cursor:'pointer',fontSize:13,color:'#555',padding:0}}>
                  <span style={{width:20,height:20,borderRadius:50,border:'1.5px solid #555',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:14,fontWeight:700,lineHeight:1}}>+</span>
                  {label.replace('+ ','')}
                </button>
                <span style={{fontSize:13,color:isDiscount?'#e53e3e':'#333'}}>
                  {isDiscount?'- ':''}{Number(val).toFixed(3)}
                </span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',
              padding:'12px 0',borderBottom:'2px solid #e8eaed'}}>
              <span style={{fontSize:14,fontWeight:700,color:'#333'}}>Grand Total :</span>
              <span style={{fontSize:14,fontWeight:700,color:'#1a1a2e'}}>{grandTotal.toFixed(3)}</span>
            </div>
            {/* Payment Type */}
            <div style={{padding:'12px 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <span style={{fontSize:13,color:'#555',fontWeight:500}}>Payment Type :</span>
                {['Unpaid','Paid'].map(t=>(
                  <button key={t} onClick={()=>setPayType(t)} style={{
                    padding:'5px 16px',borderRadius:20,fontSize:12,fontWeight:600,
                    cursor:'pointer',border:'none',transition:'all .15s',
                    background:payType===t?'#fee2e2':'#f0f0f0',
                    color:payType===t?'#e53e3e':'#666',
                  }}>
                    {t}
                  </button>
                ))}

                {/* Inline payment fields — only when Paid selected */}
                {payType==='Paid' && (
                  <>
                    {/* Payment Date */}
                    <div style={{display:'flex',alignItems:'center',gap:6,
                      ...INP, padding:'6px 10px', minWidth:160}}>
                      <span style={{fontSize:13}}>📅</span>
                      <input type="date" value={payDate}
                        onChange={e=>setPayDate(e.target.value)}
                        placeholder="Payment Date *"
                        style={{border:'none',outline:'none',fontSize:12,
                          color:'#111',background:'transparent',minWidth:120}}/>
                    </div>

                    {/* Paid Amount */}
                    <input type="number" value={paidAmt}
                      onChange={e=>setPaidAmt(e.target.value)}
                      placeholder="Paid Amount *"
                      style={{...INP, width:140,
                        borderColor: paidAmt?'#10b981':'#dde1e7'}}/>

                    {/* Payment Mode dropdown */}
                    <div style={{position:'relative'}}>
                      <select value={payMode} onChange={e=>setPayMode(e.target.value)}
                        style={{...INP, paddingRight:28, minWidth:120, cursor:'pointer',
                          appearance:'none'}}>
                        {['Cash','Card','Cheque','Online','Other'].map(m=>(
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <span style={{position:'absolute',right:8,top:'50%',
                        transform:'translateY(-50%)',pointerEvents:'none',
                        fontSize:10,color:'#aaa'}}>▼</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:100,
        padding:'11px 24px',background:'#fff5f5',borderTop:'1px solid #fecaca',
        display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:'#333'}}>
          <div onClick={()=>setUpdateStock(s=>!s)} style={{
            width:20,height:20,borderRadius:5,cursor:'pointer',
            border:`2px solid ${updateStock?'#10b981':'#ccc'}`,
            background:updateStock?'#10b981':'#fff',
            display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',
          }}>
            {updateStock&&<span style={{color:'#fff',fontSize:11,fontWeight:700}}>✓</span>}
          </div>
          Update Inventory Stock
        </label>
        <div style={{display:'flex',gap:12}}>
          <button onClick={onCancel} style={BTN_OUT}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            ...BTN_RED,opacity:saving?.7:1,boxShadow:'0 2px 8px rgba(229,62,62,.3)'}}>
            {saving?'Saving...':'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
