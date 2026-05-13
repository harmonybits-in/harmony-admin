// src/pages/PurchaseOrder.jsx
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

// ── Mock data ─────────────────────────────────────────────────────
const MOCK_SUPPLIERS = [
  'Harmony Bits Pvt Ltd','R.k Confectionery','Mannu Cake',
  'Perveen Jain','Pihu Cake','Ravi Dairy','Guglani',
]
const MOCK_CATEGORIES = ['Confectionery','Grocery','Dairy','Vagetable','Frozen','Backed']
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
const MOCK_USERS = ['Abhinav Verma','Abhinav','Admin User','Manager']

// ── Shared styles ─────────────────────────────────────────────────
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

// ── Radio button ──────────────────────────────────────────────────
function Radio({ checked, onChange, label }) {
  return (
    <label style={{ display:'inline-flex', alignItems:'center', gap:8,
      cursor:'pointer', fontSize:13, color:'#333', marginRight:20 }}>
      <div onClick={onChange} style={{
        width:18, height:18, borderRadius:50, cursor:'pointer',
        border:`2px solid ${checked?'#10b981':'#ccc'}`,
        background:checked?'#10b981':'#fff',
        display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s',
      }}>
        {checked && <div style={{ width:6, height:6, borderRadius:50, background:'#fff' }}/>}
      </div>
      {label}
    </label>
  )
}

// ── Time Picker (HH:MM spinner) ───────────────────────────────────
function TimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [hh,   setHh]   = useState(value?value.split(':')[0]:'14')
  const [mm,   setMm]   = useState(value?value.split(':')[1]:'05')
  const ref = useRef(null)

  useEffect(()=>{
    function h(e){ if(ref.current&&!ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  function confirm() { onChange(`${hh}:${mm}`); setOpen(false) }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={()=>setOpen(o=>!o)} style={{
        ...INP, display:'flex', alignItems:'center', gap:8, cursor:'pointer',
        border:`1px solid ${open?'#e53e3e':'#dde1e7'}`,
      }}>
        <span style={{ fontSize:14, color:'#888' }}>🕐</span>
        <span style={{ fontSize:13, color:value?'#111':'#aaa' }}>{value||'HH:MM'}</span>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:999,
          background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
          boxShadow:'0 8px 24px rgba(0,0,0,.13)', padding:'16px 20px', minWidth:140 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Hours */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <button onClick={()=>setHh(h=>String((Number(h)+1)%24).padStart(2,'0'))}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#555' }}>▲</button>
              <div style={{ fontSize:22, fontWeight:700, color:'#111', minWidth:36, textAlign:'center' }}>{hh}</div>
              <button onClick={()=>setHh(h=>String((Number(h)-1+24)%24).padStart(2,'0'))}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#555' }}>▼</button>
            </div>
            <span style={{ fontSize:22, fontWeight:700, color:'#555' }}>:</span>
            {/* Minutes */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <button onClick={()=>setMm(m=>String((Number(m)+5)%60).padStart(2,'0'))}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#555' }}>▲</button>
              <div style={{ fontSize:22, fontWeight:700, color:'#111', minWidth:36, textAlign:'center' }}>{mm}</div>
              <button onClick={()=>setMm(m=>String((Number(m)-5+60)%60).padStart(2,'0'))}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#555' }}>▼</button>
            </div>
          </div>
          <button onClick={confirm} style={{ ...BTN_RED, width:'100%', marginTop:10, padding:'6px' }}>OK</button>
        </div>
      )}
    </div>
  )
}

// ── Category searchable dropdown ──────────────────────────────────
function CategorySelect({ value, onChange }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref    = useRef(null)
  const trigRef= useRef(null)
  const [pos,  setPos]      = useState({top:0,left:0,width:280})

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

  const filtered = ['Please select category',...MOCK_CATEGORIES]
    .filter(c=>c.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} style={{ position:'relative', width:320 }}>
      <div ref={trigRef} onClick={handleOpen} style={{
        ...INP, display:'flex', alignItems:'center', justifyContent:'space-between',
        cursor:'pointer', border:`1px solid ${open?'#e53e3e':'#dde1e7'}`,
        color:value&&value!=='Please select category'?'#111':'#aaa',
      }}>
        <span style={{ flex:1 }}>{value||'Please select category'}</span>
        <span style={{ fontSize:11, color:'#aaa' }}>▼</span>
      </div>
      {open && (
        <div style={{ position:'fixed', top:pos.top, left:pos.left, width:pos.width,
          zIndex:9999, background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
          boxShadow:'0 8px 24px rgba(0,0,0,.13)', overflow:'hidden', maxHeight:280 }}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid #f0f0f0' }}>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#ccc' }}>🔍</span>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
                style={{ ...INP, paddingLeft:28, width:'100%' }}/>
            </div>
          </div>
          <div style={{ overflowY:'auto', maxHeight:220 }}>
            {filtered.map(c=>(
              <div key={c} onMouseDown={e=>{e.preventDefault();onChange(c);setOpen(false);setSearch('')}}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 14px', cursor:'pointer', fontSize:13,
                  background:c===value?'#fff5f5':'#fff',
                  color:c===value?'#e53e3e':c==='Please select category'?'#aaa':'#333',
                  borderBottom:'1px solid #f8f8f8' }}
                onMouseEnter={e=>{if(c!==value)e.currentTarget.style.background='#fafafa'}}
                onMouseLeave={e=>{if(c!==value)e.currentTarget.style.background='#fff'}}>
                {c} {c===value&&<span style={{color:'#e53e3e'}}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Supplier dropdown ─────────────────────────────────────────────
function SupplierSelect({ value, onChange }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(()=>{
    function h(e){ if(ref.current&&!ref.current.contains(e.target)){setOpen(false);setSearch('')} }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  const filtered = MOCK_SUPPLIERS.filter(s=>s.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} style={{ position:'relative', flex:1 }}>
      <div onClick={()=>setOpen(o=>!o)} style={{
        ...INP, display:'flex', alignItems:'center', gap:8, cursor:'pointer',
        border:`1px solid ${open?'#e53e3e':'#dde1e7'}`, color:value?'#111':'#aaa',
      }}>
        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {value||'Select Supplier'}
        </span>
        <span style={{ fontSize:11, color:'#aaa', flexShrink:0 }}>▼</span>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 3px)', left:0, right:0, zIndex:999,
          background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
          boxShadow:'0 8px 24px rgba(0,0,0,.13)', overflow:'hidden', maxHeight:280 }}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid #f0f0f0' }}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search..." style={{ ...INP, width:'100%' }}/>
          </div>
          <div style={{ overflowY:'auto', maxHeight:220 }}>
            {filtered.map(s=>(
              <div key={s} onMouseDown={e=>{e.preventDefault();onChange(s);setOpen(false);setSearch('')}}
                style={{ padding:'10px 14px', cursor:'pointer', fontSize:13,
                  background:s===value?'#fff5f5':'#fff', color:s===value?'#e53e3e':'#333',
                  borderBottom:'1px solid #f8f8f8',
                  display:'flex', justifyContent:'space-between' }}
                onMouseEnter={e=>{if(s!==value)e.currentTarget.style.background='#fafafa'}}
                onMouseLeave={e=>{if(s!==value)e.currentTarget.style.background='#fff'}}>
                {s} {s===value&&<span>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── PO Settings Panel ─────────────────────────────────────────────
function POSettingsPanel({ onClose }) {
  const toast = useToast()
  const [approvalUsers, setApprovalUsers] = useState([])
  const [approvalInput, setApprovalInput] = useState('')
  const [showUserDrop,  setShowUserDrop]  = useState(false)
  const [lockPrices,    setLockPrices]    = useState('No')
  const [showStock,     setShowStock]     = useState('Yes')
  const [negativeStock, setNegativeStock] = useState('Yes')
  const [showTax,       setShowTax]       = useState('No')
  const [roundOff,      setRoundOff]      = useState('None')
  const [cessTax,       setCessTax]       = useState('No')
  const [restrictMoq,   setRestrictMoq]   = useState('No')
  const [deliverTo,     setDeliverTo]     = useState('')
  const [termsPayment,  setTermsPayment]  = useState('No')
  const [dateRestrict,  setDateRestrict]  = useState('None')
  const [includeImages, setIncludeImages] = useState('No')
  const [saving, setSaving] = useState(false)
  const dropRef = useRef(null)

  useEffect(()=>{
    function h(e){ if(dropRef.current&&!dropRef.current.contains(e.target)) setShowUserDrop(false) }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  const filteredUsers = MOCK_USERS.filter(u=>
    u.toLowerCase().includes(approvalInput.toLowerCase()) &&
    !approvalUsers.includes(u)
  )

  function addUser(u) { setApprovalUsers(p=>[...p,u]); setApprovalInput(''); setShowUserDrop(false) }
  function removeUser(u) { setApprovalUsers(p=>p.filter(x=>x!==u)) }

  function YN(val,set,label) {
    return (
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, color:'#333', marginBottom:8, fontWeight:500 }}>{label}</div>
        <div>
          <Radio checked={val==='Yes'} onChange={()=>set('Yes')} label="Yes"/>
          <Radio checked={val==='No'}  onChange={()=>set('No')}  label="No"/>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.3)', zIndex:700 }} onClick={onClose}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:660, zIndex:800,
        background:'#fff', boxShadow:'-4px 0 24px rgba(0,0,0,.15)',
        display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'16px 22px', borderBottom:'1px solid #e8eaed',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>Purchase Order Settings</span>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#888' }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'22px' }}>

          {/* Inventory Approval Flow */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:4 }}>
              Inventory approval flow
            </div>
            <div style={{ fontSize:12, color:'#888', marginBottom:12 }}>
              Select users from the list below who will work as an approval authority for raised purchase order :
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <label style={{ fontSize:13, color:'#333', fontWeight:500, flexShrink:0 }}>
                Approval Authority :
              </label>
              {/* Multi-select user input */}
              <div ref={dropRef} style={{ flex:1, position:'relative' }}>
                <div style={{ ...INP, display:'flex', flexWrap:'wrap', gap:6, minHeight:40,
                  cursor:'text', border:`1px solid ${showUserDrop?'#e53e3e':'#dde1e7'}` }}
                  onClick={()=>setShowUserDrop(true)}>
                  {approvalUsers.map(u=>(
                    <span key={u} style={{ display:'inline-flex', alignItems:'center', gap:4,
                      padding:'2px 8px', borderRadius:4, background:'#f0f0f0',
                      fontSize:12, color:'#333' }}>
                      <span>×</span> {u}
                      <button onClick={(e)=>{e.stopPropagation();removeUser(u)}}
                        style={{ background:'none', border:'none', cursor:'pointer',
                          color:'#aaa', fontSize:13, padding:0, lineHeight:1 }}>×</button>
                    </span>
                  ))}
                  <input value={approvalInput} onChange={e=>{setApprovalInput(e.target.value);setShowUserDrop(true)}}
                    onFocus={()=>setShowUserDrop(true)}
                    style={{ border:'none', outline:'none', fontSize:13, minWidth:80, flex:1, background:'transparent' }}/>
                </div>
                {showUserDrop && filteredUsers.length > 0 && (
                  <div style={{ position:'absolute', top:'calc(100% + 3px)', left:0, right:0, zIndex:999,
                    background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
                    boxShadow:'0 8px 24px rgba(0,0,0,.12)', overflow:'hidden', maxHeight:200 }}>
                    {filteredUsers.map(u=>(
                      <div key={u} onMouseDown={e=>{e.preventDefault();addUser(u)}}
                        style={{ display:'flex', alignItems:'center', gap:8,
                          padding:'10px 14px', cursor:'pointer', fontSize:13, color:'#333',
                          borderBottom:'1px solid #f8f8f8' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <div style={{ width:18, height:18, borderRadius:4, border:'2px solid #ccc',
                          background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}/>
                        {u}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={()=>{ if(approvalInput) addUser(approvalInput) }}
                style={{ ...BTN_RED, padding:'7px 14px', flexShrink:0 }}>
                Add Users
              </button>
            </div>

            {approvalUsers.length === 0 ? (
              <div style={{ marginTop:12, fontSize:13, color:'#e53e3e', fontWeight:500 }}>
                No Approval Authority Added
              </div>
            ) : (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:12, color:'#555', marginBottom:6 }}>
                  Below are the individuals who has authority to approve :
                </div>
                {approvalUsers.map(u=>(
                  <span key={u} style={{ display:'inline-flex', alignItems:'center', gap:6,
                    marginRight:8, marginBottom:6, padding:'4px 10px', borderRadius:20,
                    background:'#dcfce7', color:'#16a34a', fontSize:12, fontWeight:500 }}>
                    ✓ {u}
                    <button onClick={()=>removeUser(u)} style={{ background:'none', border:'none',
                      cursor:'pointer', color:'#16a34a', fontSize:13 }}>×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Info box */}
            <div style={{ marginTop:12, padding:'12px 14px', background:'#fef9c3',
              borderRadius:8, border:'1px solid #fde68a', fontSize:12, color:'#555',
              display:'flex', gap:8 }}>
              <span>💡</span>
              <span>
                For approval, this user right must be assigned. "Allow inventory user to edit and cancel
                transactional data in Purchase order, Purchase, Sales, Transfer and Returns."
                <span style={{ color:'#e53e3e', cursor:'pointer', marginLeft:4 }}>Click Here.</span>
              </span>
            </div>
          </div>

          {/* Email Template Setting */}
          <div style={{ padding:'14px 16px', background:'#f8f9fb', borderRadius:8,
            border:'1px solid #e8eaed', marginBottom:20,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#333' }}>Email Template Setting</div>
              <div style={{ fontSize:12, color:'#888', marginTop:3 }}>
                You can add default email addresses with a custom header colour and icon by clicking here.
              </div>
            </div>
            <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#6366f1' }}>↗</button>
          </div>

          {/* Settings questions */}
          {YN(lockPrices, setLockPrices, 'Do you want to lock prices in Purchase and Consumption modules?')}
          {YN(showStock,  setShowStock,  'Do you want the current stock of sellers and restaurants to be displayed in the Purchase and Consumption modules?')}
          {YN(negativeStock, setNegativeStock, 'Allow the user to raise a Purchase Order when the stock at the kitchen/restaurant level is negative?')}
          {YN(showTax, setShowTax, 'Want to display Tax in Purchase Order?')}

          {/* Round off */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, color:'#333', marginBottom:8, fontWeight:500 }}>
              Want to round off or set the invoice total amount as a round figure?
            </div>
            <div>
              {['Normal','None','Round off up','Round off down'].map(r=>(
                <Radio key={r} checked={roundOff===r} onChange={()=>setRoundOff(r)} label={r}/>
              ))}
            </div>
          </div>

          {YN(cessTax, setCessTax, 'Would you like to activate cess tax on invoices?')}
          {YN(restrictMoq, setRestrictMoq, 'Restrict outlet to raise a purchase order below MoQ?')}

          {/* Deliver To */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, color:'#333', marginBottom:8, fontWeight:500 }}>
              In add Purchase Order "Deliver To"
            </div>
            <div style={{ position:'relative' }}>
              <select value={deliverTo} onChange={e=>setDeliverTo(e.target.value)}
                style={{ ...SEL, width:'100%', paddingRight:28 }}>
                <option value=""></option>
                <option>Main Kitchen</option>
                <option>Bar</option>
                <option>Bakery</option>
              </select>
              <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
            </div>
          </div>

          {YN(termsPayment, setTermsPayment, 'Set standard Terms Of Payment & Terms Of Delivery in purchase order.')}

          {/* Date Restrict */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, color:'#333', marginBottom:8, fontWeight:500 }}>
              Do you want to restrict Purchase Order for a specific date selection?&gt;
            </div>
            <div>
              {['None',"Today's date","Future dates","Past dates (Last 60 days)"].map(d=>(
                <Radio key={d} checked={dateRestrict===d} onChange={()=>setDateRestrict(d)} label={d}/>
              ))}
            </div>
          </div>

          {YN(includeImages, setIncludeImages, 'Would you like to add an option to include images of raw materials in the Purchase Order, sales/transfer, and purchase?')}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 22px', borderTop:'1px solid #e8eaed',
          display:'flex', gap:10, justifyContent:'flex-end', background:'#fafafa' }}>
          <button onClick={onClose} style={BTN_OUT}>Cancel</button>
          <button onClick={async()=>{
            setSaving(true)
            await new Promise(r=>setTimeout(r,500))
            setSaving(false); toast.success('Settings saved!'); onClose()
          }} style={{ ...BTN_RED, boxShadow:'0 2px 8px rgba(229,62,62,.25)' }}>
            {saving?'Saving...':'Save'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Add PO Form ───────────────────────────────────────────────────
function AddPOForm({ onSave, onCancel }) {
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

// ── PO List ───────────────────────────────────────────────────────
function POList({ onAdd }) {
  const toast = useToast()
  const [startDate,   setStartDate]   = useState('2026-04-29')
  const [endDate,     setEndDate]     = useState(new Date().toISOString().slice(0,10))
  const [to,          setTo]          = useState('All')
  const [poNumber,    setPoNumber]    = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showExport,  setShowExport]  = useState(false)
  const [showSettings,setShowSettings]= useState(false)
  const exportRef = useRef(null)

  useEffect(()=>{
    function h(e){ if(exportRef.current&&!exportRef.current.contains(e.target)) setShowExport(false) }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', margin:0 }}>Purchase Order List</h1>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onAdd} style={{ ...BTN_RED, display:'flex', alignItems:'center', gap:6,
            boxShadow:'0 2px 8px rgba(229,62,62,.3)' }}>
            ＋ Create New
          </button>
          <div ref={exportRef} style={{ position:'relative' }}>
            <button onClick={()=>setShowExport(s=>!s)} style={{
              ...BTN_OUT, display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
              📤 Export <span style={{ fontSize:10 }}>▾</span>
            </button>
            {showExport && (
              <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:500,
                background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
                boxShadow:'0 8px 24px rgba(0,0,0,.12)', overflow:'hidden', minWidth:180 }}>
                {['Export Current Page','Export All'].map(a=>(
                  <button key={a} style={{ display:'block', width:'100%', padding:'10px 14px',
                    border:'none', background:'#fff', cursor:'pointer', fontSize:13,
                    color:'#333', textAlign:'left', borderBottom:'1px solid #f8f8f8' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Settings gear */}
          <button onClick={()=>setShowSettings(true)}
            style={{ ...BTN_OUT, padding:'7px 10px' }}>⚙️</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
        padding:'14px 16px', marginBottom:18, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>Start Date</label>
            <div style={{ display:'flex', alignItems:'center', gap:6, ...INP, minWidth:140 }}>
              <span>📅</span>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                style={{ border:'none', outline:'none', fontSize:13, color:'#111', background:'transparent' }}/>
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>End Date</label>
            <div style={{ display:'flex', alignItems:'center', gap:6, ...INP, minWidth:140 }}>
              <span>📅</span>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                style={{ border:'none', outline:'none', fontSize:13, color:'#111', background:'transparent' }}/>
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>To</label>
            <div style={{ position:'relative' }}>
              <select value={to} onChange={e=>setTo(e.target.value)}
                style={{ ...SEL, minWidth:100, paddingRight:24 }}>
                {['All','Supplier','Restaurant','Kitchen'].map(o=><option key={o}>{o}</option>)}
              </select>
              <span style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none', fontSize:9, color:'#aaa' }}>▼</span>
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>PO Number</label>
            <input value={poNumber} onChange={e=>setPoNumber(e.target.value)}
              style={{ ...INP, width:140 }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setShowFilters(s=>!s)} style={{ ...BTN_OUT, padding:'7px 12px', fontSize:12 }}>
              {showFilters?'Hide Filters':'More Filters'}
            </button>
            <button style={{ ...BTN_RED, padding:'7px 18px', border:'1.5px solid #e53e3e' }}>Search</button>
            <button style={{ ...BTN_OUT, padding:'7px 14px' }}>Clear</button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
        padding:'80px 20px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
        <div style={{ fontSize:64, marginBottom:16, opacity:.4 }}>📋</div>
        <div style={{ fontSize:15, fontWeight:600, color:'#555' }}>No Purchase Found</div>
        <div style={{ fontSize:12, color:'#aaa', marginTop:6 }}>
          "+ Create New" click karke pehla purchase order create karo
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && <POSettingsPanel onClose={()=>setShowSettings(false)}/>}
    </div>
  )
}

export default function PurchaseOrder() {
  const [view, setView] = useState('list')
  if (view==='add') return <AddPOForm onSave={()=>setView('list')} onCancel={()=>setView('list')}/>
  return <POList onAdd={()=>setView('add')}/>
}
