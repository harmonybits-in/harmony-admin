// src/pages/ProductionMaster.jsx
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

const MOCK_RAW = [
  'Ajinomoto Salt','Bag L','Bag M','Bag S','Billing Roll',
  'Black Campa 500ml','Black Pepper','Butter','Cabbage','Carrot',
  'Cheese','Corn','Garlic','Ginger','Maida','Milk','Oil',
  'Onion','Paneer','Potato','Salt','Tomatoes','White Pepper','Yeast',
]
const UNITS = ['GM','KG','Milligram','Litre','ML','Piece','Dozen','Box']
const MOCK_PROCESSES = [
  { id:1, name:'Momos',    output:{raw:'Madda',qty:1500,unit:'GM'}, inputs:[
    {raw:'Ajinomoto Salt',qty:100,unit:'Milligram'},
    {raw:'Salt',qty:1,unit:'GM'},
    {raw:'Black Pepper',qty:100,unit:'Milligram'},
    {raw:'White Pepper',qty:100,unit:'Milligram'},
    {raw:'Cabbage',qty:500,unit:'GM'},
  ]},
  { id:2, name:'Dough',    output:{raw:'Maida',qty:500,unit:'GM'}, inputs:[
    {raw:'Maida',qty:500,unit:'GM'},
    {raw:'Milk',qty:100,unit:'ML'},
  ]},
]

const INP = { padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }
const SEL = { ...INP, cursor:'pointer', appearance:'none' }
const BTN_RED = { padding:'7px 16px', borderRadius:6, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }
const BTN_OUT = { padding:'7px 16px', borderRadius:6, border:'1px solid #dde1e7',
  background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }
const TH = { padding:'10px 14px', textAlign:'left', fontSize:11, color:'#888', fontWeight:700,
  background:'#f5f7fa', borderBottom:'1px solid #e8eaed' }
const TD = { padding:'10px 14px', fontSize:13, borderBottom:'1px solid #f0f0f0', verticalAlign:'middle' }

// ── Searchable Raw Material Select ────────────────────────────────
function RawSelect({ value, onChange, placeholder='Select Raw Material' }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref     = useRef(null)
  const trigRef = useRef(null)
  const [pos,   setPos]     = useState({top:0,left:0,width:300})

  useEffect(()=>{
    function h(e){ if(ref.current&&!ref.current.contains(e.target)){setOpen(false);setSearch('')} }
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])

  function handleOpen(){
    if(trigRef.current){
      const r=trigRef.current.getBoundingClientRect()
      setPos({top:r.bottom+window.scrollY+3,left:r.left+window.scrollX,width:r.width})
    }
    setOpen(o=>!o)
  }

  const filtered = MOCK_RAW.filter(r=>r.toLowerCase().includes(search.toLowerCase()))

  return (
    <div ref={ref} style={{position:'relative',flex:1}}>
      <div ref={trigRef} onClick={handleOpen} style={{
        ...INP, display:'flex', alignItems:'center', justifyContent:'space-between',
        cursor:'pointer', border:`1px solid ${open?'#e53e3e':'#dde1e7'}`,
        color: value?'#111':'#aaa',
      }}>
        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
          {value||placeholder}
        </span>
        <span style={{fontSize:11,color:'#aaa',marginLeft:6,flexShrink:0}}>▼</span>
      </div>
      {open && (
        <div style={{position:'fixed',top:pos.top,left:pos.left,width:pos.width,zIndex:9999,
          background:'#fff',border:'1px solid #e8eaed',borderRadius:8,
          boxShadow:'0 8px 28px rgba(0,0,0,.13)',overflow:'hidden',maxHeight:280}}>
          <div style={{padding:'8px 10px',borderBottom:'1px solid #f0f0f0'}}>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'#ccc'}}>🔍</span>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
                style={{...INP,paddingLeft:28,width:'100%'}}/>
            </div>
          </div>
          <div style={{overflowY:'auto',maxHeight:220}}>
            <div onMouseDown={e=>{e.preventDefault();onChange('');setOpen(false);setSearch('')}}
              style={{padding:'10px 14px',cursor:'pointer',fontSize:13,color:'#aaa',
                borderBottom:'1px solid #f5f5f5'}}
              onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              Select Raw Material
            </div>
            {filtered.map(r=>(
              <div key={r} onMouseDown={e=>{e.preventDefault();onChange(r);setOpen(false);setSearch('')}}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'10px 14px',cursor:'pointer',fontSize:13,
                  background:r===value?'#fff5f5':'#fff',
                  color:r===value?'#e53e3e':'#333',
                  borderBottom:'1px solid #f8f8f8'}}
                onMouseEnter={e=>{if(r!==value)e.currentTarget.style.background='#fafafa'}}
                onMouseLeave={e=>{if(r!==value)e.currentTarget.style.background='#fff'}}>
                <span>{r}</span>
                {r===value&&<span style={{color:'#e53e3e',fontSize:13}}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add Production Process Form ───────────────────────────────────
function AddProcessForm({ onSave, onCancel }) {
  const toast = useToast()
  const [prodName,   setProdName]   = useState('')
  const [toRaw,      setToRaw]      = useState('')
  const [toQty,      setToQty]      = useState('')
  const [toUnit,     setToUnit]     = useState('')
  const [savedItems, setSavedItems] = useState([]) // added "To" items
  const [fromRows,   setFromRows]   = useState([
    { id:Date.now(), raw:'', qty:'', unit:'' }
  ])
  const [saving, setSaving] = useState(false)

  function addToItem() {
    if (!toRaw||!toQty) { toast.error('Raw material aur quantity required'); return }
    setSavedItems(p=>[...p,{raw:toRaw,qty:toQty,unit:toUnit||'GM'}])
    setToRaw(''); setToQty(''); setToUnit('')
  }

  function addFromRow() {
    setFromRows(p=>[...p,{id:Date.now(),raw:'',qty:'',unit:''}])
  }
  function updFrom(id,f,v) {
    setFromRows(p=>p.map(r=>r.id===id?{...r,[f]:v}:r))
  }
  function removeFrom(id) { setFromRows(p=>p.filter(r=>r.id!==id)) }

  async function handleSave() {
    if (!prodName.trim()) { toast.error('Production naam required'); return }
    if (fromRows.filter(r=>r.raw&&r.qty).length===0) { toast.error('Minimum 1 from raw material'); return }
    setSaving(true)
    await new Promise(r=>setTimeout(r,600))
    toast.success(`✅ "${prodName}" production process saved!`)
    setSaving(false)
    onSave()
  }

  return (
    <div style={{background:'#fff',minHeight:'100%'}}>
      {/* Page header */}
      <div style={{padding:'20px 24px',borderBottom:'1px solid #e8eaed'}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'#1a1a2e',margin:0}}>Add Production Process</h1>
        <p style={{fontSize:12,color:'#888',marginTop:4,margin:'4px 0 0'}}>
          Create or modify production process you just need to add from and to raw material here
        </p>
      </div>

      <div style={{padding:'24px',maxWidth:900}}>

        {/* ── TO RAW MATERIAL ── */}
        <div style={{border:'1px solid #e8eaed',borderRadius:10,marginBottom:20,
          overflow:'visible',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',
            padding:'16px 20px',borderBottom:'1px solid #f0f0f0',background:'#fafafa',borderRadius:'10px 10px 0 0'}}>
            <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
              <span style={{fontSize:20,marginTop:2}}>📦</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:'#1a1a2e'}}>To Raw Material</div>
                <div style={{fontSize:12,color:'#888',marginTop:3}}>
                  This refers to the process where the raw material is the final output of a production or conversion activity.
                </div>
              </div>
            </div>
            <button style={{...BTN_OUT,fontSize:12,whiteSpace:'nowrap',flexShrink:0}}>More Option</button>
          </div>

          <div style={{padding:'16px 20px'}}>
            {/* Header row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 80px',
              gap:'0 12px',marginBottom:8}}>
              {['Production Name *','Raw Material','Quantity','Unit',''].map(h=>(
                <span key={h} style={{fontSize:11,color:'#888',fontWeight:600}}>{h}</span>
              ))}
            </div>
            {/* Input row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 80px',gap:'0 12px'}}>
              <input value={prodName} onChange={e=>setProdName(e.target.value)}
                placeholder="Production name"
                style={{...INP,borderColor:prodName?'#e53e3e':'#dde1e7'}}/>
              <RawSelect value={toRaw} onChange={setToRaw}/>
              <input type="number" value={toQty} onChange={e=>setToQty(e.target.value)}
                placeholder="Quantity" style={INP}/>
              <div style={{position:'relative'}}>
                <select value={toUnit} onChange={e=>setToUnit(e.target.value)}
                  style={{...SEL,width:'100%',paddingRight:24}}>
                  <option value="">Unit</option>
                  {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
                <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                  pointerEvents:'none',fontSize:10,color:'#aaa'}}>▼</span>
              </div>
              <button onClick={addToItem} style={{...BTN_RED,padding:'7px 14px'}}>Add</button>
            </div>

            {/* Added to items */}
            {savedItems.map((item,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                marginTop:10,padding:'10px 14px',background:'#fafafa',borderRadius:6,
                borderLeft:'3px solid #e53e3e'}}>
                <span style={{fontSize:13,fontWeight:500,color:'#333'}}>
                  {item.raw} [{item.qty} {item.unit}]
                </span>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <button style={{fontSize:12,color:'#6366f1',background:'none',border:'none',
                    cursor:'pointer',fontWeight:500}}>Basic Conversion</button>
                  <button onClick={()=>setSavedItems(p=>p.filter((_,idx)=>idx!==i))}
                    style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:16}}
                    onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                    onMouseLeave={e=>e.currentTarget.style.color='#ccc'}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FROM RAW MATERIAL ── */}
        <div style={{border:'1px solid #e8eaed',borderRadius:10,marginBottom:20,
          overflow:'visible',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',
            padding:'16px 20px',borderBottom:'1px solid #f0f0f0',background:'#fafafa',borderRadius:'10px 10px 0 0'}}>
            <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
              <span style={{fontSize:20,marginTop:2}}>📤</span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:'#1a1a2e'}}>From Raw Material</div>
                <div style={{fontSize:12,color:'#888',marginTop:3}}>
                  This indicates the raw material used to produce another product. These are inputs or consumables consumed in process
                </div>
              </div>
            </div>
            <button onClick={addFromRow} style={{...BTN_OUT,fontSize:12,
              display:'flex',alignItems:'center',gap:6,flexShrink:0,
              borderColor:'#e53e3e',color:'#e53e3e',background:'#fff5f5'}}>
              ＋ Add New
            </button>
          </div>

          <div style={{padding:'0 0 4px'}}>
            {/* Table header */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 140px 160px 44px',
              gap:'0',padding:'10px 20px',background:'#f5f7fa',borderBottom:'1px solid #e8eaed'}}>
              {['Raw Material *','Quantity *','Unit *',''].map((h,i)=>(
                <span key={i} style={{fontSize:11,color: h.includes('*')?'#e53e3e':'#888',fontWeight:700}}>
                  {h.replace(' *','')}
                  {h.includes('*')&&<span style={{color:'#e53e3e'}}> *</span>}
                </span>
              ))}
            </div>

            {/* Input rows */}
            {fromRows.map((row,i)=>(
              <div key={row.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 160px 44px',
                gap:'0',padding:'10px 20px',borderBottom:'1px solid #f5f5f5',
                background:i%2===0?'#fff':'#fdfdfd',alignItems:'center'}}>
                <div style={{paddingRight:12}}>
                  <RawSelect value={row.raw} onChange={v=>updFrom(row.id,'raw',v)}/>
                </div>
                <div style={{paddingRight:12}}>
                  <input type="number" value={row.qty} onChange={e=>updFrom(row.id,'qty',e.target.value)}
                    placeholder="Qty" style={{...INP,width:'100%',
                      borderColor:row.qty?'#10b981':'#dde1e7'}}/>
                </div>
                <div style={{paddingRight:12,position:'relative'}}>
                  <select value={row.unit} onChange={e=>updFrom(row.id,'unit',e.target.value)}
                    style={{...SEL,width:'100%',paddingRight:24}}>
                    <option value="">Select Unit</option>
                    {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                  <span style={{position:'absolute',right:20,top:'50%',transform:'translateY(-50%)',
                    pointerEvents:'none',fontSize:10,color:'#aaa'}}>▼</span>
                </div>
                <div style={{textAlign:'center'}}>
                  {fromRows.length>1&&(
                    <button onClick={()=>removeFrom(row.id)}
                      style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:16,padding:4}}
                      onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                      onMouseLeave={e=>e.currentTarget.style.color='#ccc'}>🗑</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save / Cancel */}
        <div style={{display:'flex',justifyContent:'flex-end',gap:12,paddingTop:8}}>
          <button onClick={onCancel} style={BTN_OUT}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{...BTN_RED,
            boxShadow:'0 2px 8px rgba(229,62,62,.3)',opacity:saving?0.7:1}}>
            {saving?'Saving...':'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Process List ──────────────────────────────────────────────────
function ProcessList({ onAdd, onEdit }) {
  const [search, setSearch] = useState('')
  const filtered = MOCK_PROCESSES.filter(p=>
    !search||p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:'#1a1a2e',margin:0}}>Production Master</h1>
          <p style={{fontSize:12,color:'#888',marginTop:4}}>
            Production processes create aur manage karo
          </p>
        </div>
        <button onClick={onAdd} style={{...BTN_RED,boxShadow:'0 2px 8px rgba(229,62,62,.3)',
          display:'flex',alignItems:'center',gap:6}}>
          ＋ Add Production Process
        </button>
      </div>

      {/* Search */}
      <div style={{background:'#fff',border:'1px solid #e8eaed',borderRadius:10,
        padding:'12px 16px',marginBottom:14,boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
        <div style={{position:'relative',maxWidth:300}}>
          <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#ccc'}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search processes..."
            style={{...INP,paddingLeft:30,width:'100%'}}/>
        </div>
      </div>

      {/* Table */}
      <div style={{background:'#fff',border:'1px solid #e8eaed',borderRadius:10,
        overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>
            {['Process Name','Output (To)','From Materials','Actions'].map(h=>(
              <th key={h} style={TH}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.length===0?(
              <tr><td colSpan={4} style={{padding:'40px',textAlign:'center',color:'#aaa',fontSize:13}}>
                No processes. Click "+ Add Production Process".
              </td></tr>
            ):filtered.map((p,i)=>(
              <tr key={p.id}
                onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <td style={TD}><span style={{fontWeight:600}}>{p.name}</span></td>
                <td style={TD}>
                  <span style={{fontSize:12,padding:'2px 8px',borderRadius:12,
                    background:'#dbeafe',color:'#2563eb',fontWeight:500}}>
                    {p.output.raw} [{p.output.qty} {p.output.unit}]
                  </span>
                </td>
                <td style={TD}>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {p.inputs.slice(0,3).map((inp,j)=>(
                      <span key={j} style={{fontSize:11,padding:'1px 7px',borderRadius:10,
                        background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0'}}>
                        {inp.raw}
                      </span>
                    ))}
                    {p.inputs.length>3&&(
                      <span style={{fontSize:11,color:'#888'}}>+{p.inputs.length-3} more</span>
                    )}
                  </div>
                </td>
                <td style={TD}>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>onEdit(p)} style={{background:'#f5f5f5',border:'1px solid #e8eaed',
                      borderRadius:5,padding:'4px 9px',cursor:'pointer',fontSize:13,color:'#555'}}>✏️</button>
                    <button style={{background:'#f5f5f5',border:'1px solid #e8eaed',
                      borderRadius:5,padding:'4px 9px',cursor:'pointer',fontSize:13,color:'#ef4444'}}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{padding:'8px 16px',borderTop:'1px solid #f0f0f0',
          fontSize:11,color:'#888',background:'#fafafa'}}>
          Showing {filtered.length} of {MOCK_PROCESSES.length} processes
        </div>
      </div>
    </div>
  )
}

export default function ProductionMaster() {
  const [view, setView] = useState('list')
  const [edit, setEdit] = useState(null)

  if (view==='add'||view==='edit') return (
    <AddProcessForm
      initial={edit}
      onSave={()=>{setView('list');setEdit(null)}}
      onCancel={()=>{setView('list');setEdit(null)}}
    />
  )
  return (
    <ProcessList
      onAdd={()=>{setEdit(null);setView('add')}}
      onEdit={p=>{setEdit(p);setView('edit')}}
    />
  )
}
