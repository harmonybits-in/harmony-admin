// src/components/inventory/SupplierSelect.jsx
import { useState, useRef, useEffect } from 'react'

const MOCK_SUPPLIERS = [
  'Harmony Bits Pvt Ltd','R.k Confectionery','Mannu Cake',
  'Perveen Jain','Pihu Cake','Ravi Dairy','Guglani',
]

const INP = { padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }

export default function SupplierSelect({ value, onChange }) {
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
