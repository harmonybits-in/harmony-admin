// src/components/inventory/SearchSelect.jsx
import { useState, useEffect, useRef } from 'react'

const INP = {
  padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none',
  boxSizing:'border-box', width:'100%',
}

export default function SearchSelect({ value, onChange, options, placeholder, getLabel=o=>o.name }) {
  const [open,    setOpen]    = useState(false)
  const [search,  setSearch]  = useState('')
  const ref     = useRef(null)
  const trigRef = useRef(null)
  const [dropPos, setDropPos] = useState({top:0,left:0,width:200})

  const selected = options.find(o => o.id === value)

  useEffect(()=>{
    function h(e){ if(ref.current&&!ref.current.contains(e.target)){setOpen(false);setSearch('')} }
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])

  function handleOpen() {
    if (trigRef.current) {
      const rect = trigRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + window.scrollY + 3, left: rect.left + window.scrollX, width: rect.width })
    }
    setOpen(o => !o)
  }

  const filtered = options.filter(o=>getLabel(o).toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div ref={trigRef} onClick={handleOpen} style={{
        ...INP, display:'flex', alignItems:'center', justifyContent:'space-between',
        cursor:'pointer', color: selected?'#111':'#aaa',
        border:`1px solid ${open?'#e53e3e':'#dde1e7'}`,
        userSelect:'none',
      }}>
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {selected ? getLabel(selected) : placeholder}
        </span>
        <span style={{ fontSize:11, color:'#aaa', marginLeft:8, flexShrink:0 }}>▼</span>
      </div>
      {open && (
        <div style={{ position:'fixed', top:dropPos.top, left:dropPos.left, width:dropPos.width, zIndex:9999,
          background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
          boxShadow:'0 8px 28px rgba(0,0,0,.13)', overflow:'hidden', maxHeight:260 }}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid #f0f0f0' }}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search..."
              style={{ ...INP, padding:'6px 10px', border:'1px solid #e0e0e0' }}/>
          </div>
          <div style={{ overflowY:'auto', maxHeight:200 }}>
            {filtered.length===0 ? (
              <div style={{ padding:14, textAlign:'center', color:'#aaa', fontSize:12 }}>No results</div>
            ) : filtered.map(o=>(
              <button key={o.id} type="button"
                onMouseDown={e=>{e.preventDefault(); onChange(o.id); setOpen(false); setSearch('')}}
                style={{ display:'flex', alignItems:'center', gap:8, width:'100%',
                  padding:'10px 14px', border:'none', textAlign:'left', cursor:'pointer', fontSize:13,
                  background: o.id===value?'#fff5f5':'#fff',
                  color: o.id===value?'#e53e3e':'#333',
                  fontWeight: o.id===value?600:400,
                  borderBottom:'1px solid #f8f8f8',
                }}
                onMouseEnter={e=>{if(o.id!==value)e.currentTarget.style.background='#fafafa'}}
                onMouseLeave={e=>{if(o.id!==value)e.currentTarget.style.background='#fff'}}>
                <span style={{ width:14, fontSize:11, color:'#e53e3e' }}>{o.id===value?'✓':''}</span>
                <div>
                  <div style={{ fontSize:13 }}>{getLabel(o)}</div>
                  {o.category && <div style={{ fontSize:11, color:'#aaa' }}>{typeof o.category === 'object' ? o.category?.name : o.category}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
