// src/components/inventory/RecipeListPage.jsx
import { useState } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import SearchSelect from './SearchSelect'

const INP = {
  padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none',
  boxSizing:'border-box', width:'100%',
}
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

export default function RecipeListPage({ products, rawMaterials, recipes, onAdd, onEdit, onDeleteRecipe }) {
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
