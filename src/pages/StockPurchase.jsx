// src/pages/StockPurchase.jsx
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

// ── Mock data ─────────────────────────────────────────────────────
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
const MOCK_PURCHASES = [
  { id:1, from:'Sherepunjab Agencies', invoiceDate:'26 Apr 2026',
    invoiceNo:'26-27RB00469', poRef:'', total:8995.080,
    payment:8995.080, paymentType:'Paid', createdBy:'Abhinav Verma', status:'Saved' },
]
const PAYMENT_MODES = ['Cash','Card','Cheque','Online','Other']

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

// ── Searchable dropdown (fixed position) ──────────────────────────
function SearchDrop({ value, onChange, options, placeholder, getLabel=o=>o.name, allowAdd=false }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref    = useRef(null)
  const trigRef= useRef(null)
  const [pos,  setPos]      = useState({top:0,left:0,width:260})

  useEffect(()=>{
    function h(e){ if(ref.current&&!ref.current.contains(e.target)){setOpen(false);setSearch('')} }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  function handleOpen(){
    if(trigRef.current){
      const r=trigRef.current.getBoundingClientRect()
      setPos({top:r.bottom+window.scrollY+3,left:r.left+window.scrollX,width:r.width})
    }
    setOpen(o=>!o)
  }

  const selected = options.find(o=>o.id===value)
  const filtered = options.filter(o=>getLabel(o).toLowerCase().includes(search.toLowerCase()))
  const canAdd   = allowAdd && search.trim() && !options.some(o=>getLabel(o).toLowerCase()===search.toLowerCase())

  return (
    <div ref={ref} style={{position:'relative',flex:1}}>
      <div ref={trigRef} onClick={handleOpen} style={{
        ...INP,display:'flex',alignItems:'center',justifyContent:'space-between',
        cursor:'pointer',border:`1px solid ${open?'#e53e3e':'#dde1e7'}`,
        color:selected?'#111':'#aaa',
      }}>
        <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {selected?getLabel(selected):placeholder}
        </span>
        <span style={{fontSize:11,color:'#aaa',marginLeft:6,flexShrink:0}}>▼</span>
      </div>
      {open&&(
        <div style={{position:'fixed',top:pos.top,left:pos.left,width:Math.max(pos.width,240),
          zIndex:9999,background:'#fff',border:'1px solid #e8eaed',borderRadius:8,
          boxShadow:'0 8px 28px rgba(0,0,0,.13)',overflow:'hidden',maxHeight:300}}>
          <div style={{padding:'8px 10px',borderBottom:'1px solid #f0f0f0'}}>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'#ccc',fontSize:13}}>🔍</span>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
                style={{...INP,paddingLeft:28,width:'100%'}}/>
            </div>
          </div>
          <div style={{overflowY:'auto',maxHeight:230}}>
            {canAdd&&(
              <div onMouseDown={e=>{e.preventDefault();onChange({id:Date.now(),name:search.trim()});setOpen(false);setSearch('')}}
                style={{padding:'10px 14px',cursor:'pointer',fontSize:13,color:'#e53e3e',
                  fontWeight:600,background:'#fff5f5',borderBottom:'1px solid #f0f0f0',
                  display:'flex',alignItems:'center',gap:6}}>
                <span>＋</span> Add "{search.trim()}"...
              </div>
            )}
            {filtered.map(o=>(
              <div key={o.id} onMouseDown={e=>{e.preventDefault();onChange(o);setOpen(false);setSearch('')}}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'10px 14px',cursor:'pointer',fontSize:13,
                  background:o.id===value?'#fff5f5':'#fff',
                  color:o.id===value?'#e53e3e':'#333',
                  borderBottom:'1px solid #f8f8f8'}}
                onMouseEnter={e=>{if(o.id!==value)e.currentTarget.style.background='#fafafa'}}
                onMouseLeave={e=>{if(o.id!==value)e.currentTarget.style.background='#fff'}}>
                {getLabel(o)}
                {o.id===value&&<span style={{color:'#e53e3e',fontSize:13}}>✓</span>}
              </div>
            ))}
            {filtered.length===0&&!canAdd&&(
              <div style={{padding:'14px',textAlign:'center',color:'#aaa',fontSize:12}}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Paid Amount Panel (slide-in from right) ───────────────────────
function PaidAmountPanel({ purchase, onClose, onSave }) {
  const [payType,   setPayType]   = useState('Paid')
  const [paidAmt,   setPaidAmt]   = useState('')
  const [payDate,   setPayDate]   = useState(new Date().toISOString().slice(0,10))
  const [payMode,   setPayMode]   = useState('Cash')
  const [payRef,    setPayRef]    = useState('')
  const toast = useToast()

  const existing = [
    { date:'26 Apr 2026', amount:8995.080, mode:'Cash', ref:'', status:'Active',
      createdBy:'Created : 06-May-2026 13:40:53 (by Abhinav Verma)' }
  ]

  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.3)',zIndex:700}}
        onClick={onClose}/>
      <div style={{position:'fixed',top:0,right:0,bottom:0,width:660,zIndex:800,
        background:'#fff',boxShadow:'-4px 0 24px rgba(0,0,0,.15)',
        display:'flex',flexDirection:'column'}}>
        {/* Header */}
        <div style={{padding:'16px 20px',borderBottom:'1px solid #e8eaed',
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:16,fontWeight:700,color:'#1a1a2e'}}>
            {purchase?.from || 'Sherepunjab Agencies'}
          </span>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#888'}}>×</button>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
          <div style={{fontSize:13,color:'#555',marginBottom:14}}>
            Remaining Amount : <strong>0.000</strong>
          </div>

          {/* Payment Type */}
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:11,color:'#555',fontWeight:600,marginBottom:8}}>
              Payment Type <span style={{color:'#e53e3e'}}>*</span>
            </label>
            {['Paid','Unpaid'].map(t=>(
              <label key={t} style={{display:'inline-flex',alignItems:'center',gap:8,
                marginRight:24,cursor:'pointer',fontSize:13}}>
                <div onClick={()=>setPayType(t)} style={{
                  width:18,height:18,borderRadius:50,cursor:'pointer',
                  border:`2px solid ${payType===t?'#10b981':'#ccc'}`,
                  background:payType===t?'#10b981':'#fff',
                  display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',
                }}>
                  {payType===t&&<div style={{width:6,height:6,borderRadius:50,background:'#fff'}}/>}
                </div>
                {t}
              </label>
            ))}
          </div>

          {/* Paid Amount + Date */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
            <div>
              <label style={{display:'block',fontSize:11,color:'#555',fontWeight:600,marginBottom:6}}>
                Paid Amount <span style={{color:'#e53e3e'}}>*</span>
              </label>
              <input type="number" value={paidAmt} onChange={e=>setPaidAmt(e.target.value)}
                placeholder="Enter amount"
                style={{...INP,width:'100%',border:'1.5px solid #e53e3e'}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:11,color:'#555',fontWeight:600,marginBottom:6}}>
                Payment Date <span style={{color:'#e53e3e'}}>*</span>
              </label>
              <div style={{display:'flex',alignItems:'center',gap:8,...INP}}>
                <span>📅</span>
                <input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}
                  style={{border:'none',outline:'none',fontSize:13,color:'#111',background:'transparent',flex:1}}/>
              </div>
            </div>
          </div>

          {/* Payment Mode */}
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:11,color:'#555',fontWeight:600,marginBottom:8}}>
              Payment Mode <span style={{color:'#e53e3e'}}>*</span>
            </label>
            <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
              {PAYMENT_MODES.map(m=>(
                <label key={m} style={{display:'inline-flex',alignItems:'center',gap:8,
                  cursor:'pointer',fontSize:13}}>
                  <div onClick={()=>setPayMode(m)} style={{
                    width:18,height:18,borderRadius:50,cursor:'pointer',
                    border:`2px solid ${payMode===m?'#10b981':'#ccc'}`,
                    background:payMode===m?'#10b981':'#fff',
                    display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',
                  }}>
                    {payMode===m&&<div style={{width:6,height:6,borderRadius:50,background:'#fff'}}/>}
                  </div>
                  {m}
                </label>
              ))}
            </div>
          </div>

          {/* Existing payments table */}
          <div style={{border:'1px solid #e8eaed',borderRadius:8,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'#f5f7fa'}}>
                {['Payment Date','Paid Amount','Payment Mode','Payment Ref No.','Status','Created By','Action'].map(h=>(
                  <th key={h} style={{...TH,fontSize:11}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {existing.map((e,i)=>(
                  <tr key={i}>
                    <td style={TD}>{e.date}</td>
                    <td style={{...TD,fontWeight:600}}>{e.amount.toFixed(3)}</td>
                    <td style={TD}>{e.mode}</td>
                    <td style={{...TD,color:'#aaa'}}>—</td>
                    <td style={TD}>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,
                        background:'#dcfce7',color:'#16a34a',fontWeight:600}}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{...TD,fontSize:11,color:'#888'}}>{e.createdBy}</td>
                    <td style={TD}>
                      <button style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:15}}
                        onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                        onMouseLeave={e=>e.currentTarget.style.color='#ccc'}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'12px 20px',borderTop:'1px solid #e8eaed',
          display:'flex',gap:10,justifyContent:'flex-end',background:'#fafafa'}}>
          <button onClick={onClose} style={BTN_OUT}>Cancel</button>
          <button onClick={()=>{
            if(!paidAmt){toast.error('Amount enter karo');return}
            toast.success('Payment saved!')
            onSave()
          }} style={{...BTN_RED,boxShadow:'0 2px 8px rgba(229,62,62,.25)'}}>
            Save Changes
          </button>
        </div>
      </div>
    </>
  )
}

// ── Add Purchase Form ─────────────────────────────────────────────
function AddPurchaseForm({ onSave, onCancel }) {
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

// ── Purchase List ─────────────────────────────────────────────────
function PurchaseList({ onAdd }) {
  const [startDate,   setStartDate]   = useState('2026-04-01')
  const [endDate,     setEndDate]     = useState(new Date().toISOString().slice(0,10))
  const [from,        setFrom]        = useState('All')
  const [invoiceNo,   setInvoiceNo]   = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [payment,     setPayment]     = useState('All')
  const [status,      setStatus]      = useState('All')
  const [type,        setType]        = useState('')
  const [moreMenu,    setMoreMenu]    = useState(null) // row id
  const [paidPanel,   setPaidPanel]   = useState(null)
  const moreRef = useRef(null)
  const toast = useToast()

  useEffect(()=>{
    function h(e){ if(moreRef.current&&!moreRef.current.contains(e.target)) setMoreMenu(null) }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  const filtered = MOCK_PURCHASES

  const totalInvoice  = filtered.reduce((a,p)=>a+p.total,0)
  const totalOutstand = filtered.filter(p=>p.paymentType==='Unpaid').reduce((a,p)=>a+p.total,0)
  const totalTax      = 315.480

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'#1a1a2e',margin:0}}>Purchase List</h1>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onAdd} style={{
            ...BTN_RED,display:'flex',alignItems:'center',gap:6,
            boxShadow:'0 2px 8px rgba(229,62,62,.3)'}}>
            ＋ Create New
          </button>
          <button style={{...BTN_OUT,display:'flex',alignItems:'center',gap:6,
            borderColor:'#e53e3e',color:'#e53e3e',background:'#fff5f5',fontWeight:600}}>
            📷 Scan & Purchase
          </button>
          <button style={{...BTN_OUT,display:'flex',alignItems:'center',gap:5,fontSize:12}}>
            📤 Export <span style={{fontSize:10}}>▾</span>
          </button>
          <button style={{...BTN_OUT,padding:'7px 10px'}}>☰</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{background:'#fff',border:'1px solid #e8eaed',borderRadius:10,
        padding:'14px 16px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
          {/* Start Date */}
          <div>
            <label style={{display:'block',fontSize:11,color:'#aaa',marginBottom:4,fontWeight:500}}>Start Date</label>
            <div style={{display:'flex',alignItems:'center',gap:6,...INP,minWidth:130}}>
              <span style={{fontSize:13}}>📅</span>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                style={{border:'none',outline:'none',fontSize:13,color:'#111',background:'transparent'}}/>
            </div>
          </div>
          {/* End Date */}
          <div>
            <label style={{display:'block',fontSize:11,color:'#aaa',marginBottom:4,fontWeight:500}}>End Date</label>
            <div style={{display:'flex',alignItems:'center',gap:6,...INP,minWidth:130}}>
              <span style={{fontSize:13}}>📅</span>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                style={{border:'none',outline:'none',fontSize:13,color:'#111',background:'transparent'}}/>
            </div>
          </div>
          {/* From */}
          <div>
            <label style={{display:'block',fontSize:11,color:'#aaa',marginBottom:4,fontWeight:500}}>From</label>
            <div style={{position:'relative'}}>
              <select value={from} onChange={e=>setFrom(e.target.value)}
                style={{...SEL,minWidth:100,paddingRight:24}}>
                {['All','Supplier','Restaurant','Kitchen'].map(o=><option key={o}>{o}</option>)}
              </select>
              <span style={{position:'absolute',right:7,top:'50%',transform:'translateY(-50%)',
                pointerEvents:'none',fontSize:9,color:'#aaa'}}>▼</span>
            </div>
          </div>
          {/* Invoice No */}
          <div>
            <label style={{display:'block',fontSize:11,color:'#aaa',marginBottom:4,fontWeight:500}}>Invoice No.</label>
            <input value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)}
              placeholder="" style={{...INP,width:140}}/>
          </div>

          {/* More filters */}
          {showFilters&&(
            <>
              {[['Payment',payment,setPayment,['All','Paid','Unpaid']],
                ['Status',status,setStatus,['All','Saved','Draft','Cancelled']]].map(([lbl,val,set,opts])=>(
                <div key={lbl}>
                  <label style={{display:'block',fontSize:11,color:'#aaa',marginBottom:4,fontWeight:500}}>{lbl}</label>
                  <div style={{position:'relative'}}>
                    <select value={val} onChange={e=>set(e.target.value)}
                      style={{...SEL,minWidth:100,paddingRight:24}}>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                    <span style={{position:'absolute',right:7,top:'50%',transform:'translateY(-50%)',
                      pointerEvents:'none',fontSize:9,color:'#aaa'}}>▼</span>
                  </div>
                </div>
              ))}
              <div>
                <label style={{display:'block',fontSize:11,color:'#aaa',marginBottom:4,fontWeight:500}}>Type</label>
                <div style={{position:'relative'}}>
                  <select value={type} onChange={e=>setType(e.target.value)}
                    style={{...SEL,minWidth:120,paddingRight:24}}>
                    <option value="">Select Type</option>
                    {['Direct','PO Based'].map(o=><option key={o}>{o}</option>)}
                  </select>
                  <span style={{position:'absolute',right:7,top:'50%',transform:'translateY(-50%)',
                    pointerEvents:'none',fontSize:9,color:'#aaa'}}>▼</span>
                </div>
              </div>
            </>
          )}

          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setShowFilters(s=>!s)} style={{...BTN_OUT,padding:'7px 12px',fontSize:12}}>
              {showFilters?'Hide Filters':'More Filters'}
            </button>
            <button style={{...BTN_RED,padding:'7px 18px',border:'1.5px solid #e53e3e'}}>Search</button>
            <button style={{...BTN_OUT,padding:'7px 14px'}}>Clear</button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:18}}>
        {[
          { label:'Total Purchase invoice amount recorded is', value:`₹ ${totalInvoice.toFixed(3)}`, color:'#e53e3e' },
          { label:'Total Outstanding Payment of',              value:`₹ ${totalOutstand.toFixed(3)}`,color:'#1a1a2e' },
          { label:'Tax paid to the seller',                    value:`₹ ${totalTax.toFixed(3)}`,     color:'#f59e0b' },
        ].map(({label,value,color})=>(
          <div key={label} style={{background:'#fff',border:'1px solid #e8eaed',borderRadius:10,
            padding:'16px 20px',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
            <div style={{fontSize:11,color:'#888',marginBottom:8,display:'flex',gap:5}}>
              <span style={{width:8,height:8,borderRadius:50,background:color,
                display:'inline-block',marginTop:2,flexShrink:0}}/>
              {label} <span style={{color:'#aaa',cursor:'help'}}>ⓘ</span>
            </div>
            <div style={{fontSize:20,fontWeight:800,color:'#1a1a2e'}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{background:'#fff',border:'1px solid #e8eaed',borderRadius:10,
        overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>
            {['From','Invoice Date','Invoice Number','PO Reference No.','Total (₹)','Payment','Created By','Status','Action'].map(h=>(
              <th key={h} style={TH}>{h}{h==='Invoice Date'&&<span style={{marginLeft:4,fontSize:10}}>↓</span>}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.length===0?(
              <tr><td colSpan={9} style={{padding:'40px',textAlign:'center',color:'#aaa',fontSize:13}}>
                No purchases. Click "+ Create New".
              </td></tr>
            ):filtered.map((p,i)=>(
              <tr key={p.id}
                onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <td style={TD}><span style={{fontWeight:500}}>{p.from}</span></td>
                <td style={TD}>{p.invoiceDate}</td>
                <td style={TD}>{p.invoiceNo||'—'}</td>
                <td style={{...TD,color:'#aaa'}}>{p.poRef||'—'}</td>
                <td style={{...TD,fontWeight:600,background:'#f0fdf4',color:'#111'}}>
                  {p.total.toFixed(3)}
                </td>
                <td style={TD}>
                  <div style={{fontSize:13}}>{p.payment.toFixed(3)}</div>
                  <div style={{fontSize:11,color:p.paymentType==='Paid'?'#16a34a':'#f59e0b',fontWeight:500}}>
                    {p.paymentType}
                  </div>
                </td>
                <td style={TD}>
                  <div style={{fontSize:12}}>{p.createdBy}</div>
                </td>
                <td style={TD}>
                  <span style={{fontSize:12,padding:'3px 10px',borderRadius:20,fontWeight:600,
                    background:'#dcfce7',color:'#16a34a'}}>
                    {p.status}
                  </span>
                </td>
                <td style={TD}>
                  <div style={{display:'flex',gap:5,alignItems:'center',position:'relative'}} ref={moreMenu===p.id?moreRef:null}>
                    {/* Edit */}
                    <button style={{background:'#f5f5f5',border:'1px solid #e8eaed',borderRadius:4,
                      padding:'4px 8px',cursor:'pointer',fontSize:13,color:'#555'}}>✏️</button>
                    {/* Copy */}
                    <button style={{background:'#f5f5f5',border:'1px solid #e8eaed',borderRadius:4,
                      padding:'4px 8px',cursor:'pointer',fontSize:13,color:'#555'}}>⧉</button>
                    {/* More (⋮) */}
                    <div style={{position:'relative'}}>
                      <button onClick={()=>setMoreMenu(m=>m===p.id?null:p.id)}
                        style={{background:'#f5f5f5',border:'1px solid #e8eaed',borderRadius:4,
                          padding:'4px 8px',cursor:'pointer',fontSize:16,color:'#555',fontWeight:700}}>
                        ⋮
                      </button>
                      {moreMenu===p.id&&(
                        <div style={{position:'absolute',top:'calc(100% + 4px)',right:0,zIndex:500,
                          background:'#fff',border:'1px solid #e8eaed',borderRadius:8,
                          boxShadow:'0 8px 24px rgba(0,0,0,.13)',overflow:'hidden',minWidth:160}}>
                          {[
                            {icon:'💳',label:'Paid Amount', action:()=>{setPaidPanel(p);setMoreMenu(null)}},
                            {icon:'📧',label:'Email',       action:()=>{toast.success('Email sent!');setMoreMenu(null)}},
                            {icon:'✕', label:'Cancel',      action:()=>{toast.success('Cancelled');setMoreMenu(null)}},
                            {icon:'📋',label:'View Log',    action:()=>{setMoreMenu(null)}},
                          ].map(({icon,label,action})=>(
                            <button key={label} onClick={action} style={{
                              display:'flex',alignItems:'center',gap:10,width:'100%',
                              padding:'10px 14px',border:'none',background:'#fff',
                              cursor:'pointer',fontSize:13,color:label==='Cancel'?'#ef4444':'#333',
                              textAlign:'left',borderBottom:'1px solid #f8f8f8'}}
                              onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                              <span style={{fontSize:14}}>{icon}</span>{label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{padding:'8px 16px',borderTop:'1px solid #f0f0f0',
          fontSize:11,color:'#888',background:'#fafafa'}}>
          Showing 1 to {filtered.length} of {filtered.length} records
        </div>
      </div>

      {/* Paid Amount Panel */}
      {paidPanel&&(
        <PaidAmountPanel
          purchase={paidPanel}
          onClose={()=>setPaidPanel(null)}
          onSave={()=>setPaidPanel(null)}
        />
      )}
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────
import React from 'react'

export default function StockPurchase() {
  const [view, setView] = useState('list')

  if (view==='add') return (
    <AddPurchaseForm
      onSave={()=>setView('list')}
      onCancel={()=>setView('list')}
    />
  )
  return <PurchaseList onAdd={()=>setView('add')}/>
}
