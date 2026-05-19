// src/components/inventory/RawMaterialsList.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { inventoryApi } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { CATEGORIES } from './RawMaterialShared'

const MOCK = [
  { id:1, name:'Black Campa 500ml', category:'Drink',     unit:'pcs', purchasePrice:18, currentStock:120, active:true,  favourite:false },
  { id:2, name:'Sprite 750ml',      category:'Drink',     unit:'pcs', purchasePrice:25, currentStock:85,  active:true,  favourite:true  },
  { id:3, name:'Tomatoes',          category:'Vegetable', unit:'kg',  purchasePrice:40, currentStock:12,  active:true,  favourite:true  },
  { id:4, name:'Paneer',            category:'Dairy',     unit:'kg',  purchasePrice:320,currentStock:4.5, active:true,  favourite:false },
  { id:5, name:'Refined Oil',       category:'Grocery',   unit:'ltr', purchasePrice:110,currentStock:18,  active:false, favourite:false },
  { id:6, name:'Red Chilli Powder', category:'Sauces',    unit:'kg',  purchasePrice:220,currentStock:2.1, active:true,  favourite:false },
  { id:7, name:'Butter',            category:'Dairy',     unit:'kg',  purchasePrice:450,currentStock:3,   active:true,  favourite:true  },
  { id:8, name:'Maida',             category:'Grocery',   unit:'kg',  purchasePrice:35, currentStock:25,  active:true,  favourite:false },
]

const TH = {
  padding:'10px 14px', textAlign:'left', fontSize:11, color:'#888',
  fontWeight:600, borderBottom:'1px solid #eee', background:'#fafafa',
  whiteSpace:'nowrap'
}
const TD = { padding:'10px 14px', fontSize:13, borderBottom:'1px solid #f5f5f5', verticalAlign:'middle' }

export default function RawMaterialsList({ rid, onAdd, onEdit }) {
  const toast   = useToast()
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('All categories')
  const [showFiles,  setShowFiles]  = useState(false)
  const [showAction, setShowAction] = useState(false)
  const filesRef   = useRef()
  const actionRef  = useRef()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await inventoryApi.getAll(rid)
      const list = Array.isArray(r) ? r : (r?.content||[])
      setItems(list.length ? list : MOCK)
    } catch(_){ setItems(MOCK) } finally { setLoading(false) }
  }, [rid])

  useEffect(()=>{ load() },[])

  // Close dropdowns on outside click
  useEffect(()=>{
    function handle(e) {
      if(filesRef.current && !filesRef.current.contains(e.target)) setShowFiles(false)
      if(actionRef.current && !actionRef.current.contains(e.target)) setShowAction(false)
    }
    document.addEventListener('mousedown', handle)
    return ()=>document.removeEventListener('mousedown', handle)
  },[])

  // Category tabs
  const cats = ['All categories', ...Array.from(new Set(items.map(i=>i.category).filter(Boolean)))]
  const catCounts = cats.map(c => ({
    cat: c,
    count: c==='All categories' ? items.length : items.filter(i=>i.category===c).length
  }))

  const filtered = items.filter(item => {
    const ms = !search || (item.name||'').toLowerCase().includes(search.toLowerCase())
    const mc = catFilter==='All categories' || item.category===catFilter
    return ms && mc
  })

  async function toggleActive(item) {
    setItems(prev => prev.map(i => i.id===item.id ? {...i, active:!i.active} : i))
    toast.success(`${item.name} ${!item.active?'activated':'deactivated'}`)
  }

  function toggleFav(item) {
    setItems(prev => prev.map(i => i.id===item.id ? {...i, favourite:!i.favourite} : i))
  }

  return (
    <div style={{ background:'#f8f9fb', minHeight:'100%' }}>
      {/* ── Page header ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8eaed', padding:'16px 24px',
        display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', margin:0, letterSpacing:'-0.3px' }}>
          Raw Materials Management
        </h1>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {/* Action dropdown */}
          <div ref={actionRef} style={{ position:'relative' }}>
            <button onClick={()=>setShowAction(s=>!s)} style={{
              padding:'8px 16px', borderRadius:7, border:'1px solid #dde1e7',
              background:'#fff', color:'#555', fontSize:13, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6 }}>
              Action <span style={{fontSize:10}}>▼</span>
            </button>
            {showAction && (
              <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:200,
                background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
                boxShadow:'0 8px 24px rgba(0,0,0,.12)', minWidth:180, overflow:'hidden' }}>
                {['Apply Changes','Bulk Activate','Bulk Deactivate','Delete Selected'].map(a=>(
                  <button key={a} style={{ display:'block', width:'100%', padding:'10px 16px',
                    textAlign:'left', border:'none', background:'none', fontSize:13,
                    color: a.includes('Delete')?'#e53e3e':'#333', cursor:'pointer' }}
                    onMouseEnter={e=>e.target.style.background='#f5f5f5'}
                    onMouseLeave={e=>e.target.style.background='none'}>
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Add */}
          <button style={{ padding:'8px 16px', borderRadius:7, border:'1px solid #e53e3e',
            background:'#fff5f5', color:'#e53e3e', fontSize:13, fontWeight:600,
            cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            ＋ Quick Add
          </button>

          {/* Create New */}
          <button onClick={onAdd} style={{ padding:'8px 18px', borderRadius:7, border:'none',
            background:'#e53e3e', color:'#fff', fontSize:13, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center', gap:6,
            boxShadow:'0 2px 8px rgba(229,62,62,.3)' }}>
            ＋ Create New
          </button>

          {/* Files dropdown */}
          <div ref={filesRef} style={{ position:'relative' }}>
            <button onClick={()=>setShowFiles(s=>!s)} style={{
              padding:'8px 14px', borderRadius:7, border:'1px solid #dde1e7',
              background:'#fff', color:'#555', fontSize:13, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6 }}>
              📄 Files <span style={{fontSize:10}}>▼</span>
            </button>
            {showFiles && (
              <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:200,
                background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
                boxShadow:'0 8px 24px rgba(0,0,0,.12)', minWidth:200, overflow:'hidden' }}>
                <div style={{ padding:'8px 0' }}>
                  <div style={{ padding:'4px 16px 6px', fontSize:11, color:'#aaa', fontWeight:600,
                    textTransform:'uppercase', letterSpacing:.5 }}>Import</div>
                  {['Download Template','Upload CSV'].map(a=>(
                    <button key={a} style={{ display:'block', width:'100%', padding:'9px 16px 9px 24px',
                      textAlign:'left', border:'none', background:'none', fontSize:13, color:'#333', cursor:'pointer' }}
                      onMouseEnter={e=>e.target.style.background='#f5f5f5'}
                      onMouseLeave={e=>e.target.style.background='none'}>
                      {a}
                    </button>
                  ))}
                  <div style={{ borderTop:'1px solid #f0f0f0', margin:'4px 0' }}/>
                  <div style={{ padding:'4px 16px 6px', fontSize:11, color:'#aaa', fontWeight:600,
                    textTransform:'uppercase', letterSpacing:.5 }}>Export</div>
                  {['Export Current Page','Export All'].map(a=>(
                    <button key={a} style={{ display:'block', width:'100%', padding:'9px 16px 9px 24px',
                      textAlign:'left', border:'none', background:'none', fontSize:13, color:'#333', cursor:'pointer' }}
                      onMouseEnter={e=>e.target.style.background='#f5f5f5'}
                      onMouseLeave={e=>e.target.style.background='none'}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding:'0 24px' }}>
        {/* ── Search + Filter bar ── */}
        <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
          padding:'14px 16px', marginBottom:14, display:'flex', gap:10, alignItems:'center',
          boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ display:'flex', gap:10, flex:1, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:180 }}>
              <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>Name</label>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search raw material..."
                style={{ width:'100%', padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
                  fontSize:13, outline:'none', boxSizing:'border-box', color:'#111' }}/>
            </div>
            <div style={{ minWidth:180 }}>
              <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>Category</label>
              <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
                style={{ width:'100%', padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
                  fontSize:13, outline:'none', background:'#fff', color:'#333', cursor:'pointer' }}>
                {cats.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end', paddingTop:20 }}>
            <button style={{ padding:'8px 18px', borderRadius:6, border:'none',
              background:'#e53e3e', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Search
            </button>
            <button onClick={()=>{ setSearch(''); setCatFilter('All categories') }}
              style={{ padding:'8px 14px', borderRadius:6, border:'1px solid #dde1e7',
                background:'#fff', color:'#666', fontSize:13, cursor:'pointer' }}>
              Clear
            </button>
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div style={{ display:'flex', gap:0, marginBottom:14, overflowX:'auto',
          background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
          boxShadow:'0 1px 4px rgba(0,0,0,.04)', overflow:'hidden' }}>
          {catCounts.map(({ cat, count }, idx) => {
            const active = cat === catFilter
            return (
              <button key={cat} onClick={()=>setCatFilter(cat)} style={{
                flex:'0 0 auto', padding:'14px 20px', border:'none', cursor:'pointer',
                borderRight: idx<catCounts.length-1?'1px solid #f0f0f0':'none',
                borderBottom: active?'2px solid #e53e3e':'2px solid transparent',
                background: active?'#fff5f5':'#fff',
                transition:'all .15s',
              }}>
                <div style={{ fontSize:13, fontWeight:600, color:active?'#e53e3e':'#333' }}>{cat}</div>
                <div style={{ fontSize:11, color:active?'#e53e3e':'#aaa', marginTop:2 }}>
                  {count} Ingredient{count!==1?'s':''}
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Table ── */}
        <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
          overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={{...TH,width:40}}><input type="checkbox" style={{accentColor:'#e53e3e'}}/></th>
                <th style={TH}>Name</th>
                <th style={TH}>Category</th>
                <th style={TH}>Unit</th>
                <th style={TH}>Purchase Price</th>
                <th style={TH}>Current Stock</th>
                <th style={{...TH,textAlign:'center'}}>Set As Favourite</th>
                <th style={{...TH,textAlign:'center'}}>Active</th>
                <th style={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:5}).map((_,i)=>(
                  <tr key={i}>
                    {Array.from({length:9}).map((_,j)=>(
                      <td key={j} style={TD}>
                        <div style={{ height:14, background:'#f0f0f0', borderRadius:4, width:'80%' }}/>
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length===0 ? (
                <tr><td colSpan={9} style={{ padding:'48px 0', textAlign:'center', color:'#aaa', fontSize:13 }}>
                  No raw materials found.
                </td></tr>
              ) : filtered.map((item, i) => (
                <tr key={item.id||i}
                  onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>

                  <td style={TD}><input type="checkbox" style={{accentColor:'#e53e3e'}}/></td>

                  {/* Name — inline editable like PetPooja */}
                  <td style={TD}>
                    <input defaultValue={item.name||''}
                      style={{ padding:'5px 8px', borderRadius:5, border:'1px solid #e8eaed',
                        fontSize:13, color:'#111', background:'transparent', width:'100%',
                        fontWeight:500 }}
                      onFocus={e=>e.target.style.borderColor='#e53e3e'}
                      onBlur={e=>e.target.style.borderColor='#e8eaed'}
                    />
                  </td>

                  {/* Category — inline editable dropdown */}
                  <td style={TD}>
                    <select defaultValue={item.category||''}
                      style={{ padding:'5px 8px', borderRadius:5, border:'1px solid #e8eaed',
                        fontSize:13, color:'#555', background:'transparent', cursor:'pointer' }}>
                      {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>

                  <td style={{...TD,color:'#777'}}>{item.unit||item.consumptionUnit||'—'}</td>

                  <td style={TD}>
                    <span style={{ fontWeight:500 }}>
                      ₹{Number(item.purchasePrice||item.costPerUnit||0).toLocaleString('en-IN')}
                    </span>
                  </td>

                  <td style={TD}>
                    <span style={{
                      fontWeight:600,
                      color: Number(item.currentStock||0)<=2?'#e53e3e':
                             Number(item.currentStock||0)<=5?'#f59e0b':'#16a34a'
                    }}>
                      {Number(item.currentStock||0).toFixed(1)} {item.unit||''}
                    </span>
                  </td>

                  {/* Favourite */}
                  <td style={{...TD,textAlign:'center'}}>
                    <button onClick={()=>toggleFav(item)} style={{
                      background:'none', border:'none', cursor:'pointer', fontSize:18,
                      color: item.favourite?'#f59e0b':'#ddd', transition:'color .15s',
                    }}>★</button>
                  </td>

                  {/* Active toggle — green checkbox like PetPooja */}
                  <td style={{...TD,textAlign:'center'}}>
                    <div onClick={()=>toggleActive(item)} style={{
                      width:22, height:22, borderRadius:5, cursor:'pointer',
                      border:`2px solid ${item.active?'#16a34a':'#ccc'}`,
                      background: item.active?'#16a34a':'#fff',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      margin:'0 auto', transition:'all .15s',
                    }}>
                      {item.active && <span style={{ color:'#fff', fontSize:12, fontWeight:700 }}>✓</span>}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={TD}>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      {/* View details */}
                      <button title="View Details" style={{
                        background:'#f5f5f5', border:'1px solid #e8eaed', borderRadius:5,
                        padding:'4px 8px', cursor:'pointer', fontSize:14, color:'#555' }}>📋</button>
                      {/* Edit */}
                      <button onClick={()=>onEdit(item)} title="Edit" style={{
                        background:'#f5f5f5', border:'1px solid #e8eaed', borderRadius:5,
                        padding:'4px 8px', cursor:'pointer', fontSize:14, color:'#555' }}>✏️</button>
                      {/* Stock ledger */}
                      <button title="Stock Ledger" style={{
                        background:'#f5f5f5', border:'1px solid #e8eaed', borderRadius:5,
                        padding:'4px 8px', cursor:'pointer', fontSize:14, color:'#555' }}>📊</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ padding:'10px 16px', borderTop:'1px solid #f0f0f0',
            fontSize:11, color:'#888', display:'flex', justifyContent:'space-between' }}>
            <span>Showing 1 to {filtered.length} of {filtered.length} records</span>
            <span>{items.length} total raw materials</span>
          </div>
        </div>
      </div>
    </div>
  )
}
