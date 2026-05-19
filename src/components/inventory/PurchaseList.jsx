// src/components/inventory/PurchaseList.jsx
import { useState, useRef, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'
import PaidAmountPanel from './PaidAmountPanel'

const MOCK_PURCHASES = [
  { id:1, from:'Sherepunjab Agencies', invoiceDate:'26 Apr 2026',
    invoiceNo:'26-27RB00469', poRef:'', total:8995.080,
    payment:8995.080, paymentType:'Paid', createdBy:'Abhinav Verma', status:'Saved' },
]

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

export default function PurchaseList({ onAdd }) {
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
