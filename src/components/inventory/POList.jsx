// src/components/inventory/POList.jsx
import { useState, useRef, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'
import POSettingsPanel from './POSettingsPanel'

const INP = { padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }
const SEL = { ...INP, cursor:'pointer', appearance:'none' }
const BTN_RED = { padding:'7px 16px', borderRadius:6, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }
const BTN_OUT = { padding:'7px 16px', borderRadius:6, border:'1px solid #dde1e7',
  background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }

export default function POList({ onAdd }) {
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
