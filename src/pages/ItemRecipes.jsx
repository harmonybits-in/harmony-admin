// src/pages/ItemRecipes.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

// ── Mock data ─────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  { id:1,  name:'Chat Spiral',               category:'French Fries'    },
  { id:2,  name:'Veg Noodles',               category:'Noodles'         },
  { id:3,  name:'Chef Special Full Loaded',  category:'Mr Chef Special' },
  { id:4,  name:'Corn Tomato',               category:'Double Topping'  },
  { id:5,  name:'Onion Corn',                category:'Double Topping'  },
  { id:6,  name:'Onion & Paneer',            category:'Basic Pizza'     },
  { id:7,  name:'Spl. Kur Kure Burger',      category:'Burger'         },
  { id:8,  name:'Special Mha Raja Burger',   category:'Burger'         },
  { id:9,  name:'Spl. Tandoori Paneer Burger',category:'Burger'        },
  { id:10, name:'Veg Momos',                 category:'Momos'          },
  { id:11, name:'Cheese Burst Pizza',        category:'Basic Pizza'    },
  { id:12, name:'Cold Coffee',               category:'Shakes'         },
]

const MOCK_RAW = [
  { id:1, name:'Potato',       units:['Piece','kg','gm'] },
  { id:2, name:'Maida',        units:['kg','gm','bag']   },
  { id:3, name:'Tomatoes',     units:['kg','gm','Piece'] },
  { id:4, name:'Paneer',       units:['kg','gm']         },
  { id:5, name:'Cheese',       units:['kg','gm','Piece'] },
  { id:6, name:'Oil',          units:['ltr','ml']        },
  { id:7, name:'Salt',         units:['gm','kg']         },
  { id:8, name:'Onion',        units:['kg','gm','Piece'] },
  { id:9, name:'Butter',       units:['kg','gm']         },
  { id:10,name:'Corn',         units:['kg','gm']         },
]

const MOCK_RECIPES = [
  { id:1, productId:1, productName:'Chat Spiral',    category:'French Fries', hasRecipe:true,  recentlyAdded:true  },
  { id:2, productId:2, productName:'Veg Noodles',    category:'Noodles',      hasRecipe:false, recentlyAdded:false },
  { id:3, productId:3, productName:'Chef Special Full Loaded', category:'Mr Chef Special', hasRecipe:false, recentlyAdded:false },
  { id:4, productId:4, productName:'Corn Tomato',    category:'Double Topping',hasRecipe:false, recentlyAdded:false },
  { id:5, productId:5, productName:'Onion Corn',     category:'Double Topping',hasRecipe:false, recentlyAdded:false },
  { id:6, productId:6, productName:'Onion & Paneer', category:'Basic Pizza',  hasRecipe:false, recentlyAdded:false },
  { id:7, productId:7, productName:'Spl. Kur Kure Burger', category:'Burger', hasRecipe:false, recentlyAdded:false },
  { id:8, productId:8, productName:'Special Mha Raja Burger', category:'Burger',hasRecipe:false,recentlyAdded:false},
  { id:9, productId:9, productName:'Spl. Tandoori Paneer Burger', category:'Burger',hasRecipe:false,recentlyAdded:false},
]

const AREAS = ['Home Delivery', 'Parcel', 'Dine In', 'Kitchen', 'Bar', 'Bakery', 'Cold Storage']

// ── Shared styles ─────────────────────────────────────────────────
const INP = {
  padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none',
  boxSizing:'border-box', width:'100%',
}
const SEL = { ...INP, cursor:'pointer', appearance:'none' }
const BTN_RED = {
  padding:'8px 18px', borderRadius:6, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
}
const BTN_OUT = {
  padding:'8px 18px', borderRadius:6, border:'1px solid #dde1e7',
  background:'#fff', color:'#555', fontSize:13, cursor:'pointer',
}
const TD = { padding:'12px 16px', fontSize:13, borderBottom:'1px solid #f0f0f0', verticalAlign:'middle' }
const TH = { padding:'11px 16px', textAlign:'left', fontSize:11, color:'#888', fontWeight:700,
  borderBottom:'2px solid #f0f0f0', background:'#fafafa', whiteSpace:'nowrap' }

// ── Searchable dropdown ───────────────────────────────────────────
function SearchSelect({ value, onChange, options, placeholder, getLabel=o=>o.name }) {
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
                  {o.category && <div style={{ fontSize:11, color:'#aaa' }}>{o.category}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ── Area Multi-Select — PetPooja style chips + checkbox dropdown ──
function AreaMultiSelect({ selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref     = useRef(null)
  const trigRef = useRef(null)
  const [dropPos, setDropPos] = useState({top:0,left:0,width:200})

  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function handleOpen() {
    if (trigRef.current) {
      const rect = trigRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + window.scrollY + 3, left: rect.left + window.scrollX, width: rect.width })
    }
    setOpen(o => !o)
  }

  function toggle(area) {
    const has = selected.includes(area)
    onChange(has ? selected.filter(a => a !== area) : [...selected, area])
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {/* Trigger — chips + arrow */}
      <div ref={trigRef} onClick={handleOpen} style={{
        display:'flex', alignItems:'center', flexWrap:'wrap', gap:4,
        minHeight:38, padding:'4px 30px 4px 8px', borderRadius:6,
        border:`1px solid ${open ? '#e53e3e' : '#dde1e7'}`,
        background:'#fff', cursor:'pointer', position:'relative',
        transition:'border-color .15s',
      }}>
        {selected.length === 0 ? (
          <span style={{ fontSize:13, color:'#aaa' }}></span>
        ) : (
          selected.map(area => (
            <span key={area} style={{
              display:'inline-flex', alignItems:'center', gap:4,
              padding:'2px 8px', borderRadius:4,
              background:'#f5f5f5', border:'1px solid #e0e0e0',
              fontSize:12, color:'#333', fontWeight:500,
            }}>
              <span style={{ fontSize:11, color:'#888' }}>×</span>
              {area}
            </span>
          ))
        )}
        {/* Arrow */}
        <span style={{
          position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
          fontSize:11, color:'#aaa', pointerEvents:'none',
        }}>▼</span>
      </div>

      {/* Dropdown — checkbox list */}
      {open && (
        <div style={{
          position:'fixed', top:dropPos.top, left:dropPos.left, width:dropPos.width, zIndex:9999,
          background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
          boxShadow:'0 8px 24px rgba(0,0,0,.13)', overflow:'hidden', minWidth:180,
        }}>
          {AREAS.map(area => {
            const sel = selected.includes(area)
            return (
              <div key={area}
                onMouseDown={e => { e.preventDefault(); toggle(area) }}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 14px', cursor:'pointer', fontSize:13,
                  background: sel ? '#fff5f5' : '#fff',
                  borderBottom:'1px solid #f8f8f8',
                  transition:'background .1s',
                }}
                onMouseEnter={e => { if(!sel) e.currentTarget.style.background='#fafafa' }}
                onMouseLeave={e => { if(!sel) e.currentTarget.style.background='#fff'   }}>
                {/* Checkbox */}
                <div style={{
                  width:18, height:18, borderRadius:4, flexShrink:0,
                  border:`2px solid ${sel ? '#e53e3e' : '#ccc'}`,
                  background: sel ? '#e53e3e' : '#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all .15s',
                }}>
                  {sel && <span style={{ color:'#fff', fontSize:11, fontWeight:700, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ color: sel ? '#e53e3e' : '#333', fontWeight: sel ? 600 : 400 }}>
                  {area}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// ADD RECIPE PAGE
// ════════════════════════════════════════════════════════════════
function AddRecipePage({ products, rawMaterials, editProduct, editRecipeId, rid, onSave, onCancel }) {
  const toast = useToast()
  const [selectedProductId, setSelectedProductId] = useState(editProduct?.id || null)
  const [saving, setSaving] = useState(false)

  const selectedProduct = products.find(p => p.id === selectedProductId)

  // Recipe rows: each = { rawMaterialId, quantity, unit, area }
  const [rows, setRows] = useState([
    { id:Date.now(), rawMaterialId:null, quantity:'', unit:'', areas:[] },
  ])

  function addRow() {
    setRows(rs => [...rs, { id:Date.now(), rawMaterialId:null, quantity:'', unit:'', areas:[] }])
  }

  function removeRow(id) {
    setRows(rs => rs.filter(r => r.id !== id))
  }

  function updRow(id, field, value) {
    setRows(rs => rs.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, [field]: value }
      // When raw material selected → auto-set first unit
      if (field === 'rawMaterialId') {
        const rm = rawMaterials.find(m => m.id === value)
        updated.unit = rm?.units?.[0] || ''
      }
      return updated
    }))
  }

  async function handleSave() {
    if (!selectedProductId) { toast.error('Menu item select karo'); return }
    const validRows = rows.filter(r => r.rawMaterialId && r.quantity)
    if (validRows.length === 0) { toast.error('Minimum 1 raw material add karo'); return }
    setSaving(true)
    try {
      const payload = {
        restaurantId: rid,
        productId: selectedProductId,
        ingredients: validRows.map(r => ({
          rawMaterialId: r.rawMaterialId,
          quantity: Number(r.quantity),
          unit: r.unit,
          areas: r.areas,
        })),
      }
      if (editRecipeId) {
        await api.put(`/inv/recipes/${editRecipeId}`, payload)
      } else {
        await api.post('/inv/recipes', payload)
      }
      toast.success(`Recipe saved for "${selectedProduct?.name}"!`)
      onSave()
    } catch (err) { toast.error(err.message || 'Save failed') }
    finally { setSaving(false) }
  }

  const usedRawIds = rows.map(r => r.rawMaterialId).filter(Boolean)

  return (
    <div style={{ background:'#f8f9fb', minHeight:'100%' }}>
      {/* ── Page header ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8eaed',
        padding:'16px 28px', marginBottom:20,
        display:'flex', alignItems:'center', gap:16 }}>
        <button onClick={onCancel} style={{ background:'none', border:'none',
          fontSize:20, cursor:'pointer', color:'#888', lineHeight:1, padding:4 }}>←</button>
        <h2 style={{ fontSize:18, fontWeight:800, color:'#1a1a2e', margin:0 }}>
          {editProduct ? `Edit Recipe — ${editProduct.name}` : 'Add Recipe'}
        </h2>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'0 24px 100px' }}>

        {/* ── Select Menu item ── */}
        {!editProduct && (
          <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
            padding:'20px 24px', marginBottom:18,
            boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:24 }}>
              <label style={{ fontSize:14, fontWeight:600, color:'#333', flexShrink:0 }}>
                Select Menu
              </label>
              <div style={{ flex:1, maxWidth:340 }}>
                <SearchSelect
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  options={products}
                  placeholder="Select menu item..."
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Recipe Table ── */}
        {selectedProductId && (
          <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
            overflow:'visible', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>

            {/* Table header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'14px 20px', borderBottom:'1px solid #f0f0f0', background:'#fafafa' }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#333' }}>
                Recipe For {selectedProduct?.name}
              </span>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={addRow} style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'7px 14px', borderRadius:6,
                  border:'1px solid #e53e3e', background:'#fff5f5',
                  color:'#e53e3e', fontSize:12, fontWeight:600, cursor:'pointer',
                }}>
                  ＋ Add New Raw-Material
                </button>
                <button onClick={handleSave} disabled={saving} style={{
                  ...BTN_OUT, padding:'7px 16px', fontSize:12, fontWeight:600,
                  borderColor:'#dde1e7',
                }}>
                  {saving ? 'Saving...' : 'Preserve'}
                </button>
              </div>
            </div>

            {/* Column headers */}
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Raw Material Name</th>
                  <th style={{ ...TH, width:130 }}>Quantity</th>
                  <th style={{ ...TH, width:160 }}>Unit</th>
                  <th style={{ ...TH, width:180 }}>Area</th>
                  <th style={{ ...TH, width:50 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const rm = rawMaterials.find(m => m.id === row.rawMaterialId)
                  const availableRaw = rawMaterials.filter(m =>
                    !usedRawIds.includes(m.id) || m.id === row.rawMaterialId
                  )
                  return (
                    <tr key={row.id}
                      style={{ background: idx%2===0?'#fff':'#fdfdfd' }}>

                      {/* Raw Material Name — searchable dropdown */}
                      <td style={{ ...TD, minWidth:200 }}>
                        <SearchSelect
                          value={row.rawMaterialId}
                          onChange={v => updRow(row.id, 'rawMaterialId', v)}
                          options={availableRaw}
                          placeholder="Select Raw Material"
                        />
                      </td>

                      {/* Quantity */}
                      <td style={TD}>
                        <input
                          type="number" min="0" value={row.quantity}
                          onChange={e => updRow(row.id, 'quantity', e.target.value)}
                          placeholder="0"
                          style={{
                            ...INP,
                            borderColor: row.quantity ? '#10b981' : '#dde1e7',
                            textAlign:'center', fontWeight: row.quantity?600:400,
                          }}
                        />
                      </td>

                      {/* Unit — auto-populated from raw material */}
                      <td style={TD}>
                        <div style={{ position:'relative' }}>
                          <select
                            value={row.unit}
                            onChange={e => updRow(row.id, 'unit', e.target.value)}
                            style={{
                              ...SEL,
                              borderColor: row.unit ? '#dde1e7' : '#dde1e7',
                              paddingRight:28,
                            }}
                            disabled={!row.rawMaterialId}
                          >
                            {!row.unit && <option value="">Unit</option>}
                            {(rm?.units || []).map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                          <span style={{ position:'absolute', right:8, top:'50%',
                            transform:'translateY(-50%)', pointerEvents:'none',
                            fontSize:10, color:'#aaa' }}>▼</span>
                        </div>
                      </td>

                      {/* Area — multi-select with chips */}
                      <td style={TD}>
                        <AreaMultiSelect
                          selected={row.areas||[]}
                          onChange={vals => updRow(row.id, 'areas', vals)}
                        />
                      </td>

                      {/* Delete row */}
                      <td style={{ ...TD, textAlign:'center' }}>
                        <button type="button" onClick={() => removeRow(row.id)}
                          style={{ background:'none', border:'none', cursor:'pointer',
                            color:'#ccc', fontSize:18, lineHeight:1, padding:4,
                            borderRadius:4, transition:'color .15s' }}
                          onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                          onMouseLeave={e=>e.currentTarget.style.color='#ccc'}>
                          🗑
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Add more row button */}
            <div style={{ padding:'12px 20px', borderTop:'1px solid #f8f8f8' }}>
              <button type="button" onClick={addRow} style={{
                background:'none', border:'1px dashed #dde1e7', borderRadius:6,
                padding:'7px 16px', fontSize:12, color:'#888', cursor:'pointer',
                display:'flex', alignItems:'center', gap:6, transition:'all .15s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#e53e3e';e.currentTarget.style.color='#e53e3e'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#dde1e7';e.currentTarget.style.color='#888'}}>
                ＋ Add Another Row
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedProductId && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#aaa' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>🍽️</div>
            <div style={{ fontSize:14, fontWeight:500 }}>Menu item select karo recipe add karne ke liye</div>
          </div>
        )}
      </div>

      {/* ── Sticky footer ── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100,
        background:'#fff5f5', borderTop:'1px solid #fecaca',
        padding:'12px 32px', display:'flex', justifyContent:'flex-end', gap:12 }}>
        <button onClick={onCancel} style={BTN_OUT}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{
          ...BTN_RED, opacity:saving?0.7:1,
          boxShadow:'0 2px 8px rgba(229,62,62,.3)',
        }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// RECIPE LIST PAGE
// ════════════════════════════════════════════════════════════════
function RecipeListPage({ products, rawMaterials, recipes, onAdd, onEdit, onDeleteRecipe }) {
  const toast = useToast()
  const [filterItem,   setFilterItem]   = useState('')
  const [filterCat,    setFilterCat]    = useState('')
  const [filterStatus, setFilterStatus] = useState('Created Recipes')
  const [selCat,       setSelCat]       = useState('All categories')
  const [autoConsume,  setAutoConsume]  = useState(false)
  const [catTabStart,  setCatTabStart]  = useState(0)

  // Category tabs
  const allCats = ['All categories', ...Array.from(new Set(recipes.map(r=>r.category)))]
  const catCounts = allCats.map(c=>({
    cat:c,
    count: c==='All categories'?recipes.length : recipes.filter(r=>r.category===c).length
  }))

  const filtered = recipes.filter(r => {
    const mc = selCat==='All categories' || r.category===selCat
    const ms = !filterItem || r.productName.toLowerCase().includes(filterItem.toLowerCase())
    const mcat = !filterCat || r.category.toLowerCase().includes(filterCat.toLowerCase())
    const mst = filterStatus==='Created Recipes'
      ? r.hasRecipe
      : filterStatus==='Pending Recipes'
      ? !r.hasRecipe
      : true
    return mc && ms && mcat && mst
  })

  async function deleteRecipe(id, recipeId) {
    if (!confirm('Delete this recipe?')) return
    try {
      if (recipeId) await api.delete(`/inv/recipes/${recipeId}`)
      toast.success('Recipe deleted')
      onDeleteRecipe()
    } catch (err) { toast.error(err.message || 'Delete failed') }
  }

  // Scroll category tabs
  function scrollCats(dir) {
    setCatTabStart(p => Math.max(0, Math.min(allCats.length-3, p+dir)))
  }

  return (
    <div>
      {/* ── AI Banner ── */}
      <div style={{ background:'linear-gradient(135deg,#eff6ff,#e0f2fe)',
        border:'1px solid #bfdbfe', borderRadius:10, padding:'14px 20px',
        marginBottom:18, display:'flex', alignItems:'center', gap:14 }}>
        <span style={{ fontSize:22 }}>✦</span>
        <p style={{ fontSize:13, color:'#1e40af', flex:1, margin:0, lineHeight:1.5 }}>
          <strong>Get AI-Powered Recipe Suggestions!</strong> Based On The Items You've Added
          To Your Menu, We'll Create Personalized Recipes Just For You.
        </p>
        <button style={{ padding:'7px 16px', borderRadius:6, border:'1px solid #3b82f6',
          background:'#fff', color:'#3b82f6', fontSize:12, fontWeight:600, cursor:'pointer',
          whiteSpace:'nowrap' }}>
          Explore Recipes
        </button>
      </div>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', margin:0 }}>
          Recipe Management
        </h1>
        <div style={{ display:'flex', gap:10 }}>
          <button style={{ ...BTN_OUT, display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
            More Actions ▾
          </button>
          <button style={{ ...BTN_OUT, display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
            📄 Files ▾
          </button>
          <button onClick={onAdd} style={{
            ...BTN_RED, display:'flex', alignItems:'center', gap:6, fontSize:13,
            boxShadow:'0 2px 8px rgba(229,62,62,.3)',
          }}>
            ＋ Create New
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
        padding:'14px 16px', marginBottom:14,
        boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
          {/* Select Item */}
          <div style={{ flex:1, minWidth:180 }}>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>Select Item</label>
            <SearchSelect value={null} onChange={()=>{}} options={products}
              placeholder="Select Item"/>
          </div>

          {/* Category */}
          <div style={{ flex:1, minWidth:160 }}>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>Category</label>
            <div style={{ position:'relative' }}>
              <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
                style={{ ...INP, paddingRight:28, cursor:'pointer' }}>
                <option value="">Select Category</option>
                {Array.from(new Set(recipes.map(r=>r.category))).map(c=>(
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
            </div>
          </div>

          {/* Status */}
          <div style={{ flex:1, minWidth:160 }}>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>Status</label>
            <div style={{ position:'relative' }}>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                style={{ ...INP, paddingRight:28, cursor:'pointer' }}>
                <option>Created Recipes</option>
                <option>Pending Recipes</option>
                <option>All</option>
              </select>
              <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button style={{ ...BTN_RED, padding:'8px 18px' }}>Search</button>
            <button onClick={()=>{setFilterItem('');setFilterCat('');setFilterStatus('Created Recipes')}}
              style={{ ...BTN_OUT, padding:'8px 14px' }}>Clear</button>
          </div>

          {/* Auto Consumption toggle */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto', paddingBottom:2 }}>
            <span style={{ fontSize:12, color:'#555', fontWeight:500 }}>Auto Consumption</span>
            <div onClick={()=>setAutoConsume(a=>!a)} style={{
              width:44, height:24, borderRadius:12, cursor:'pointer', transition:'background .2s',
              background: autoConsume?'#e53e3e':'#e0e0e0', position:'relative',
            }}>
              <div style={{
                width:20, height:20, borderRadius:50, background:'#fff',
                position:'absolute', top:2, transition:'left .2s',
                left: autoConsume?22:2,
                boxShadow:'0 1px 4px rgba(0,0,0,.2)',
              }}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Tabs (horizontal scrollable) ── */}
      <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
        marginBottom:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)',
        display:'flex', alignItems:'stretch' }}>

        {/* Left arrow */}
        {catTabStart > 0 && (
          <button onClick={()=>scrollCats(-1)} style={{
            padding:'0 10px', border:'none', background:'#fafafa',
            borderRight:'1px solid #f0f0f0', cursor:'pointer', color:'#888', fontSize:16 }}>
            ‹
          </button>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          {catCounts.slice(catTabStart, catTabStart+6).map(({cat,count}) => {
            const active = cat===selCat
            return (
              <button key={cat} onClick={()=>setSelCat(cat)} style={{
                flex:'0 0 auto', padding:'14px 20px', border:'none', cursor:'pointer',
                borderRight:'1px solid #f0f0f0',
                borderBottom: active?'2px solid #e53e3e':'2px solid transparent',
                background: active?'#fff5f5':'#fff', transition:'all .15s',
              }}>
                <div style={{ fontSize:13, fontWeight:600, color:active?'#e53e3e':'#333',
                  whiteSpace:'nowrap' }}>{cat}</div>
                <div style={{ fontSize:11, color:active?'#e53e3e':'#aaa', marginTop:2 }}>
                  {count} Item{count!==1?'s':''}
                </div>
              </button>
            )
          })}
        </div>

        {/* Right arrow */}
        {catTabStart + 6 < allCats.length && (
          <button onClick={()=>scrollCats(1)} style={{
            padding:'0 10px', border:'none', background:'#fafafa',
            borderLeft:'1px solid #f0f0f0', cursor:'pointer', color:'#888', fontSize:16 }}>
            ›
          </button>
        )}
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
              <th style={TH}></th>
              <th style={TH}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={5} style={{ padding:'48px 0', textAlign:'center', color:'#aaa', fontSize:13 }}>
                <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
                No recipes found
              </td></tr>
            ) : filtered.map((recipe,i) => (
              <tr key={recipe.id}
                onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>

                <td style={TD}><input type="checkbox" style={{accentColor:'#e53e3e'}}/></td>

                <td style={TD}>
                  <div style={{ fontWeight:500, fontSize:13 }}>{recipe.productName}</div>
                </td>

                <td style={{ ...TD, color:'#888', fontSize:12 }}>{recipe.category}</td>

                <td style={TD}>
                  {recipe.recentlyAdded && (
                    <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20,
                      background:'#dbeafe', color:'#2563eb', fontWeight:600 }}>
                      Recently Added
                    </span>
                  )}
                  {!recipe.hasRecipe && (
                    <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20,
                      background:'#fef3c7', color:'#d97706', fontWeight:600 }}>
                      Pending
                    </span>
                  )}
                </td>

                <td style={TD}>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {/* View */}
                    <button title="View" style={{ background:'#f5f5f5', border:'1px solid #e8eaed',
                      borderRadius:5, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'#555' }}>
                      📋
                    </button>
                    {/* Edit */}
                    <button onClick={()=>onEdit(recipe)} title="Edit"
                      style={{ background:'#f5f5f5', border:'1px solid #e8eaed',
                        borderRadius:5, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'#555' }}>
                      ✏️
                    </button>
                    {/* Delete */}
                    <button onClick={()=>deleteRecipe(recipe.id, recipe.recipeId)} title="Delete"
                      style={{ background:'#f5f5f5', border:'1px solid #e8eaed',
                        borderRadius:5, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'#ef4444' }}>
                      🗑
                    </button>
                    {/* Copy */}
                    <button title="Copy" style={{ background:'#f5f5f5', border:'1px solid #e8eaed',
                      borderRadius:5, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'#555' }}>
                      ⧉
                    </button>
                    {/* Create with AI */}
                    {!recipe.hasRecipe && (
                      <button onClick={()=>onEdit(recipe)} style={{
                        display:'flex', alignItems:'center', gap:5,
                        padding:'5px 12px', borderRadius:6, border:'none',
                        background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer',
                        whiteSpace:'nowrap',
                      }}>
                        ✦ Create with AI
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding:'10px 16px', borderTop:'1px solid #f0f0f0',
          fontSize:11, color:'#888', background:'#fafafa' }}>
          Showing 1 to {filtered.length} of {filtered.length} records
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════
export default function ItemRecipes() {
  const rid  = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [view,         setView]         = useState('list')
  const [editItem,     setEditItem]     = useState(null)
  const [editRecipeId, setEditRecipeId] = useState(null)

  const [products,     setProducts]     = useState(MOCK_PRODUCTS)
  const [rawMaterials, setRawMaterials] = useState(MOCK_RAW)
  const [recipes,      setRecipes]      = useState([])

  const loadData = useCallback(async () => {
    try {
      const [prods, raws, recs] = await Promise.all([
        api.get(`/products?restaurantId=${rid}&size=200`).catch(() => null),
        api.get(`/inv/raw-materials?restaurantId=${rid}`).catch(() => null),
        api.get(`/inv/recipes?restaurantId=${rid}`).catch(() => null),
      ])
      if (prods) {
        const list = Array.isArray(prods) ? prods : (prods?.content ?? [])
        if (list.length) setProducts(list)
      }
      if (raws) {
        const list = Array.isArray(raws) ? raws : (raws?.content ?? [])
        if (list.length) setRawMaterials(list.map(rm => ({
          ...rm,
          units: [rm.consumptionUnit, rm.purchaseUnit].filter(Boolean),
        })))
      }
      if (recs) {
        const list = Array.isArray(recs) ? recs : (recs?.content ?? [])
        setRecipes(list)
      }
    } catch (err) { toast.error('Data load failed') }
  }, [rid])

  useEffect(() => { loadData() }, [loadData])

  // Merge products + recipes → list for RecipeListPage
  const mergedRecipes = products.map(p => {
    const rec = recipes.find(r => r.productId === p.id)
    return {
      id:          p.id,
      productId:   p.id,
      productName: p.name,
      category:    p.category || p.categoryName || '',
      hasRecipe:   !!rec,
      recipeId:    rec?.id || null,
    }
  })

  function handleAdd()       { setEditItem(null); setEditRecipeId(null); setView('add') }
  function handleEdit(recipe){ setEditItem({ id: recipe.productId, name: recipe.productName }); setEditRecipeId(recipe.recipeId || null); setView('edit') }
  function handleBack()      { setView('list'); setEditItem(null); setEditRecipeId(null) }
  function handleSave()      { loadData(); setView('list'); setEditItem(null); setEditRecipeId(null) }

  if (view === 'add' || view === 'edit') {
    return (
      <AddRecipePage
        products={products}
        rawMaterials={rawMaterials}
        editProduct={editItem}
        editRecipeId={editRecipeId}
        rid={rid}
        onSave={handleSave}
        onCancel={handleBack}
      />
    )
  }

  return (
    <RecipeListPage
      products={products}
      rawMaterials={rawMaterials}
      recipes={mergedRecipes}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDeleteRecipe={loadData}
    />
  )
}
