// src/components/inventory/CategorySelect.jsx
import { useState, useRef, useEffect } from 'react'

const MOCK_CATEGORIES = ['Confectionery','Grocery','Dairy','Vagetable','Frozen','Backed']

const INP = { padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }

export default function CategorySelect({ value, onChange }) {
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
