// src/components/inventory/SearchDrop.jsx
import { useState, useRef, useEffect } from 'react'

const INP = { padding:'7px 10px', borderRadius:5, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }

export default function SearchDrop({ value, onChange, options, placeholder, getLabel=o=>o.name, allowAdd=false }) {
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
