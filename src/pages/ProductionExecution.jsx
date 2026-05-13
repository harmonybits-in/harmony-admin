// src/pages/ProductionExecution.jsx
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

const MOCK_PROCESSES = [
  { id:1, name:'Momos', unit:'GM',    defaultQty:3,
    rawMaterials:[
      {name:'Madda',         qty:24.414, unit:'GM'},
      {name:'Ajinomoto Salt',qty:0.2,    unit:'Milligram'},
      {name:'Salt',          qty:0.002,  unit:'GM'},
      {name:'Black Pepper',  qty:0.2,    unit:'Milligram'},
      {name:'White Pepper',  qty:0.2,    unit:'Milligram'},
      {name:'Cabbage',       qty:5,      unit:'GM'},
      {name:'Carrot',        qty:0.2,    unit:'GM'},
      {name:'Ginger',        qty:0.02,   unit:'GM'},
    ]},
  { id:2, name:'Dough', unit:'Piece', defaultQty:3,
    rawMaterials:[
      {name:'Maida', qty:50,  unit:'GM'},
      {name:'Milk',  qty:2.344,unit:'GM'},
    ]},
  { id:3, name:'Pizza Base',  unit:'Piece', defaultQty:5,
    rawMaterials:[{name:'Maida',qty:80,unit:'GM'},{name:'Yeast',qty:2,unit:'GM'}]},
  { id:4, name:'Tomato Sauce',unit:'Litre', defaultQty:2,
    rawMaterials:[{name:'Tomatoes',qty:1.5,unit:'kg'},{name:'Garlic',qty:50,unit:'GM'}]},
]

const PROD_TYPES = ['Direct Production','Production against PO']

const INP = { padding:'7px 10px', borderRadius:5, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }
const BTN_RED = { padding:'7px 16px', borderRadius:5, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }
const BTN_OUT = { padding:'7px 16px', borderRadius:5, border:'1px solid #dde1e7',
  background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }

// ── Production Type searchable dropdown ──────────────────────────
function ProdTypeSelect({ value, onChange }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(()=>{
    function h(e){ if(ref.current&&!ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  const filtered = PROD_TYPES.filter(t=>t.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} style={{position:'relative'}}>
      <div onClick={()=>setOpen(o=>!o)} style={{
        ...INP, display:'flex', alignItems:'center', gap:8, cursor:'pointer',
        minWidth:180, border:`1px solid ${open?'#e53e3e':'#dde1e7'}`, padding:'7px 12px',
      }}>
        <span style={{flex:1,fontSize:13}}>{value}</span>
        <span style={{fontSize:11,color:'#aaa'}}>▼</span>
      </div>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:999,
          background:'#fff',border:'1px solid #e8eaed',borderRadius:8,
          boxShadow:'0 8px 24px rgba(0,0,0,.13)',overflow:'hidden',minWidth:240}}>
          <div style={{padding:'8px 10px',borderBottom:'1px solid #f0f0f0'}}>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'#ccc'}}>🔍</span>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
                style={{...INP,paddingLeft:28,width:'100%'}}/>
            </div>
          </div>
          {filtered.map(t=>(
            <div key={t} onMouseDown={e=>{e.preventDefault();onChange(t);setOpen(false);setSearch('')}}
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'11px 14px',cursor:'pointer',fontSize:13,
                background:t===value?'#fff5f5':'#fff',borderBottom:'1px solid #f8f8f8'}}
              onMouseEnter={e=>{if(t!==value)e.currentTarget.style.background='#fafafa'}}
              onMouseLeave={e=>{if(t!==value)e.currentTarget.style.background='#fff'}}>
              <span style={{color:t===value?'#e53e3e':'#333'}}>{t}</span>
              {t===value&&<span style={{color:'#e53e3e',fontSize:14}}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProductionExecution() {
  const toast = useToast()
  const [prodType,    setProdType]    = useState('Direct Production')
  const [showFilters, setShowFilters] = useState(false)
  const [searchProc,  setSearchProc]  = useState('')
  const [withPrice,   setWithPrice]   = useState(false)
  const [converting,  setConverting]  = useState(false)

  // selected: { [id]: qty }
  const [selected,  setSelected]  = useState({})
  // right panel: which items are expanded (showing raw materials)
  const [expanded,  setExpanded]  = useState({})

  const filtered = MOCK_PROCESSES.filter(p=>
    !searchProc||p.name.toLowerCase().includes(searchProc.toLowerCase()))

  // ── Left panel actions ──────────────────────────────────────────
  function toggleSelect(proc) {
    setSelected(prev => {
      const next = {...prev}
      if (next[proc.id]) {
        delete next[proc.id]
        // Also collapse in right panel
        setExpanded(e=>{ const ne={...e}; delete ne[proc.id]; return ne })
      } else {
        next[proc.id] = proc.defaultQty
        // Auto-expand first added item
        setExpanded(e=>Object.keys(next).length===1?{[proc.id]:true}:e)
      }
      return next
    })
  }

  function selectAll() {
    if (Object.keys(selected).length === filtered.length) {
      setSelected({}); setExpanded({})
    } else {
      const all = {}
      filtered.forEach(p=>{ all[p.id]=p.defaultQty })
      setSelected(all)
      // Expand first
      if (filtered.length>0) setExpanded({[filtered[0].id]:true})
    }
  }

  function updQty(id, val) {
    setSelected(prev=>({...prev,[id]:Number(val)||0}))
  }

  // ── Right panel actions ─────────────────────────────────────────
  function toggleExpand(id) {
    setExpanded(prev=>({...prev,[id]:!prev[id]}))
  }

  function removeFromRight(id) {
    setSelected(prev=>{const n={...prev};delete n[id];return n})
    setExpanded(prev=>{const n={...prev};delete n[id];return n})
  }

  // ── Save actions ────────────────────────────────────────────────
  async function handleSendToProduction() {
    const cnt = Object.keys(selected).length
    if (!cnt) { toast.error('Koi process select nahi kiya'); return }
    toast.success(`📤 ${cnt} process${cnt>1?'es':''} production ko bheja!`)
  }

  async function handleConvert() {
    const cnt = Object.keys(selected).length
    if (!cnt) { toast.error('Pehle process select karo'); return }
    setConverting(true)
    await new Promise(r=>setTimeout(r,700))
    toast.success(`✅ ${cnt} process convert ho gaye!`)
    setConverting(false); setSelected({}); setExpanded({})
  }

  const selectedIds  = Object.keys(selected).map(Number)
  const selectedProcs= MOCK_PROCESSES.filter(p=>selectedIds.includes(p.id))
  const selCount     = selectedIds.length
  const allSelected  = filtered.length>0 && selCount===filtered.length

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#f8f9fb'}}>

      {/* ── Top filter bar ── */}
      <div style={{background:'#fff',borderBottom:'1px solid #e8eaed',padding:'12px 20px',flexShrink:0}}>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div>
            <span style={{display:'block',fontSize:11,color:'#888',marginBottom:4,fontWeight:600}}>
              Production Type
            </span>
            <ProdTypeSelect value={prodType} onChange={setProdType}/>
          </div>

          {showFilters && (
            <div>
              <span style={{display:'block',fontSize:11,color:'#888',marginBottom:4,fontWeight:600}}>
                Category
              </span>
              <div style={{position:'relative'}}>
                <select style={{...INP,minWidth:130,paddingRight:24,cursor:'pointer',appearance:'none'}}>
                  <option>All</option>
                </select>
                <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                  pointerEvents:'none',fontSize:10,color:'#aaa'}}>▼</span>
              </div>
            </div>
          )}

          <button onClick={()=>setShowFilters(s=>!s)} style={{
            ...BTN_OUT, padding:'7px 14px',
            color:showFilters?'#e53e3e':'#555',
            borderColor:showFilters?'#fca5a5':'#dde1e7',
          }}>
            {showFilters?'Hide Filters':'More Filters'}
          </button>

          <button style={{...BTN_RED,borderColor:'#e53e3e',border:'1.5px solid #e53e3e'}}>
            Search
          </button>

          <div style={{marginLeft:'auto',display:'flex',gap:10}}>
            <button style={{...BTN_OUT,fontSize:12,display:'flex',alignItems:'center',gap:5}}>
              📄 Production Via Excel <span style={{fontSize:10}}>▾</span>
            </button>
            <button style={{...BTN_OUT,fontSize:12,display:'flex',alignItems:'center',gap:5}}>
              📋 Generate Production Plan <span style={{fontSize:10}}>▾</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Split panels ── */}
      <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>

        {/* ════ LEFT PANEL ════ */}
        <div style={{flex:1,display:'flex',flexDirection:'column',
          borderRight:'1px solid #e8eaed',background:'#fff',minWidth:0}}>

          {/* Panel header */}
          <div style={{padding:'13px 18px',borderBottom:'1px solid #f0f0f0',
            display:'flex',alignItems:'center',gap:12,flexShrink:0,background:'#fafafa'}}>
            <span style={{fontSize:18,color:'#e53e3e'}}>📦</span>
            <span style={{fontSize:14,fontWeight:700,color:'#1a1a2e',flex:1}}>
              Select Production Processes
            </span>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',
                color:'#ccc',fontSize:12}}>🔍</span>
              <input value={searchProc} onChange={e=>setSearchProc(e.target.value)}
                placeholder="Search" style={{...INP,paddingLeft:26,width:170}}/>
            </div>
          </div>

          {/* Column header */}
          <div style={{display:'flex',alignItems:'center',padding:'10px 16px',
            borderBottom:'1px solid #f0f0f0',background:'#fafafa',flexShrink:0}}>
            {/* Select all checkbox */}
            <div onClick={selectAll} style={{
              width:20,height:20,borderRadius:5,cursor:'pointer',marginRight:10,flexShrink:0,
              border:`2px solid ${allSelected?'#e53e3e':'#ccc'}`,
              background:allSelected?'#e53e3e':'#fff',
              display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',
            }}>
              {allSelected&&<span style={{color:'#fff',fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>}
            </div>
            <span style={{flex:1,fontSize:11,color:'#888',fontWeight:700}}>Production Process Name</span>
            <span style={{fontSize:11,color:'#888',fontWeight:700,minWidth:160,textAlign:'center'}}>Quantity</span>
          </div>

          {/* Process rows */}
          <div style={{flex:1,overflowY:'auto'}}>
            {filtered.length===0 ? (
              <div style={{padding:'40px',textAlign:'center',color:'#aaa',fontSize:13}}>
                No processes found
              </div>
            ) : filtered.map(proc=>{
              const isSel = !!selected[proc.id]
              return (
                <div key={proc.id} style={{
                  display:'flex',alignItems:'center',padding:'13px 16px',
                  borderBottom:'1px solid #f5f5f5',
                  background:isSel?'#fff5f5':'#fff',transition:'background .12s',
                }}
                onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='#fafafa'}}
                onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='#fff'}}>

                  {/* Checkbox */}
                  <div onClick={()=>toggleSelect(proc)} style={{
                    width:20,height:20,borderRadius:5,cursor:'pointer',marginRight:10,flexShrink:0,
                    border:`2px solid ${isSel?'#10b981':'#ccc'}`,
                    background:isSel?'#10b981':'#fff',
                    display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',
                  }}>
                    {isSel&&<span style={{color:'#fff',fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>}
                  </div>

                  {/* Name */}
                  <span style={{flex:1,fontSize:13,fontWeight:isSel?600:400,
                    color:isSel?'#333':'#444'}}>
                    {proc.name}
                  </span>

                  {/* Qty input + unit + arrow */}
                  <div style={{display:'flex',alignItems:'center',gap:6,minWidth:180}}>
                    <input type="number" min="0"
                      value={isSel ? selected[proc.id] : proc.defaultQty}
                      onChange={e=>isSel&&updQty(proc.id,e.target.value)}
                      disabled={!isSel}
                      style={{
                        width:90,padding:'7px 10px',borderRadius:5,textAlign:'center',
                        fontSize:13,fontWeight:500,
                        border:`1px solid ${isSel?'#dde1e7':'#eee'}`,
                        background:isSel?'#fff':'#f9f9f9',
                        color:isSel?'#111':'#aaa',outline:'none',
                      }}/>
                    <span style={{fontSize:12,color:'#888',minWidth:40}}>/ {proc.unit}</span>
                    {/* Arrow to expand in right panel */}
                    <button onClick={()=>{
                      if(!isSel) toggleSelect(proc)
                      toggleExpand(proc.id)
                    }} style={{
                      width:28,height:28,borderRadius:5,border:'1px solid #e8eaed',
                      background:'#f5f5f5',cursor:'pointer',display:'flex',
                      alignItems:'center',justifyContent:'center',flexShrink:0,
                      transition:'all .15s',
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background='#e53e3e22'}
                    onMouseLeave={e=>e.currentTarget.style.background='#f5f5f5'}>
                      <span style={{fontSize:13,color:'#888'}}>›</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom send button */}
          <div style={{padding:'12px 18px',borderTop:'1px solid #e8eaed',
            background:'#fff',flexShrink:0}}>
            <button onClick={handleSendToProduction} style={{
              width:'100%',padding:'10px',borderRadius:6,fontSize:13,fontWeight:600,
              border:`1.5px solid ${selCount>0?'#e53e3e':'#dde1e7'}`,
              background:'#fff',cursor:selCount>0?'pointer':'not-allowed',
              color:selCount>0?'#e53e3e':'#aaa',transition:'all .15s',
            }}>
              {selCount>0
                ? `Send ${selCount} Selected To Production`
                : 'Send Selected To Production'}
            </button>
          </div>
        </div>

        {/* ════ RIGHT PANEL ════ */}
        <div style={{width:460,flexShrink:0,display:'flex',flexDirection:'column',
          background:'#fff',minWidth:0}}>

          {/* Panel header */}
          <div style={{padding:'13px 18px',borderBottom:'1px solid #f0f0f0',
            display:'flex',alignItems:'center',justifyContent:'space-between',
            flexShrink:0,background:'#fafafa'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:18}}>🔥</span>
              <span style={{fontSize:14,fontWeight:700,color:'#1a1a2e'}}>Ready For Production</span>
            </div>
            {/* With Price toggle */}
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <span style={{fontSize:12,color:'#555',fontWeight:500}}>With Price</span>
              <div onClick={()=>setWithPrice(w=>!w)} style={{
                width:42,height:23,borderRadius:12,cursor:'pointer',position:'relative',
                background:withPrice?'#e53e3e':'#ddd',transition:'background .2s',
              }}>
                <div style={{
                  width:19,height:19,borderRadius:50,background:'#fff',
                  position:'absolute',top:2,left:withPrice?21:2,
                  transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.2)',
                }}/>
              </div>
            </label>
          </div>

          {/* Right panel content — all selected items */}
          <div style={{flex:1,overflowY:'auto'}}>
            {selectedProcs.length===0 ? (
              <div style={{padding:'60px 20px',textAlign:'center',color:'#aaa'}}>
                <div style={{fontSize:40,marginBottom:12}}>🏭</div>
                <div style={{fontSize:13,fontWeight:500}}>
                  Left se process select karo
                </div>
              </div>
            ) : selectedProcs.map((proc,pi)=>{
              const isExp = !!expanded[proc.id]
              const qty   = selected[proc.id] ?? proc.defaultQty

              return (
                <div key={proc.id} style={{borderBottom:'1px solid #e8eaed'}}>
                  {/* Item header row */}
                  <div style={{
                    display:'flex',alignItems:'center',justifyContent:'space-between',
                    padding:'13px 16px',background:'#fafafa',
                  }}>
                    {/* Name */}
                    <span style={{fontSize:13,fontWeight:700,color:'#1a1a2e',flex:1}}>
                      {proc.name}
                    </span>

                    {/* Qty input + unit */}
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <input type="number" value={qty}
                        onChange={e=>updQty(proc.id,e.target.value)}
                        style={{
                          width:90,padding:'6px 10px',borderRadius:5,textAlign:'center',
                          fontSize:13,fontWeight:600,
                          border:'1px solid #dde1e7',
                          background:'#fff',outline:'none',
                        }}/>
                      <span style={{fontSize:12,color:'#888',minWidth:50}}>/ {proc.unit}</span>

                      {/* Delete */}
                      <button onClick={()=>removeFromRight(proc.id)} style={{
                        background:'none',border:'none',cursor:'pointer',
                        color:'#ccc',fontSize:16,padding:'2px 4px',lineHeight:1,
                        transition:'color .15s',
                      }}
                      onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                      onMouseLeave={e=>e.currentTarget.style.color='#ccc'}>🗑</button>

                      {/* Expand/Collapse */}
                      <button onClick={()=>toggleExpand(proc.id)} style={{
                        background:'none',border:'none',cursor:'pointer',
                        color:'#aaa',fontSize:16,padding:'2px 4px',lineHeight:1,
                        transition:'transform .2s',
                        transform:isExp?'rotate(0deg)':'rotate(180deg)',
                      }}>▲</button>
                    </div>
                  </div>

                  {/* Raw materials breakdown — visible when expanded */}
                  {isExp && (
                    <div style={{background:'#fff'}}>
                      {proc.rawMaterials.map((rm,i)=>(
                        <div key={i} style={{
                          display:'flex',alignItems:'center',
                          padding:'11px 16px',
                          borderTop:'1px solid #f5f5f5',
                          background:i%2===0?'#fff':'#fafafa',
                        }}>
                          {/* Raw material name */}
                          <span style={{flex:1,fontSize:13,color:'#333'}}>{rm.name}</span>

                          {/* Quantity */}
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <span style={{
                              display:'inline-block',minWidth:80,padding:'5px 10px',
                              background:'#f5f7fa',borderRadius:5,
                              fontSize:13,fontWeight:600,color:'#111',textAlign:'center',
                              border:'1px solid #eee',
                            }}>
                              {rm.qty}
                            </span>
                            <span style={{fontSize:12,color:'#888',minWidth:70}}>/ {rm.unit}</span>

                            {/* Price — only when withPrice toggled */}
                            {withPrice && (
                              <span style={{fontSize:11,color:'#16a34a',fontWeight:500,minWidth:50}}>
                                ₹{(rm.qty*45).toFixed(0)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Bottom Cancel + Convert */}
          <div style={{padding:'12px 18px',borderTop:'1px solid #e8eaed',
            display:'flex',gap:10,justifyContent:'flex-end',background:'#fff',flexShrink:0}}>
            <button onClick={()=>{setSelected({});setExpanded({})}} style={BTN_OUT}>
              Cancel
            </button>
            <button onClick={handleConvert} disabled={converting||selCount===0} style={{
              ...BTN_RED,
              opacity:selCount===0?0.5:1,
              cursor:selCount===0?'not-allowed':'pointer',
              boxShadow:selCount>0?'0 2px 8px rgba(229,62,62,.3)':'none',
            }}>
              {converting?'Converting...':'Convert To Production'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
