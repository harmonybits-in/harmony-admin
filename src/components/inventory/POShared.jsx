// src/components/inventory/POShared.jsx
import { useState, useRef, useEffect } from 'react'

const INP = { padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }
const BTN_RED = { padding:'7px 16px', borderRadius:6, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }

export function Radio({ checked, onChange, label }) {
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

export function TimePicker({ value, onChange }) {
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
