// src/components/inventory/RecipeListPage.jsx
import { useState, useRef, useEffect } from 'react'
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
  padding:'8px 14px', borderRadius:6, border:'1px solid #dde1e7',
  background:'#fff', color:'#555', fontSize:13, cursor:'pointer',
}
const TD = { padding:'12px 16px', fontSize:13, borderBottom:'1px solid #f0f0f0', verticalAlign:'middle' }
const TH = { padding:'11px 16px', textAlign:'left', fontSize:11, color:'#888', fontWeight:700,
  borderBottom:'2px solid #f0f0f0', background:'#fafafa', whiteSpace:'nowrap' }

// ── Dropdown component ────────────────────────────────────────────────────────
function Dropdown({ trigger, items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div style={{
          position:'absolute', right:0, top:'calc(100% + 4px)', zIndex:200,
          background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
          boxShadow:'0 4px 20px rgba(0,0,0,.12)', minWidth:220, overflow:'hidden',
        }} onClick={() => setOpen(false)}>
          {items.map((item, i) => item === 'divider'
            ? <div key={i} style={{ height:1, background:'#f0f0f0', margin:'4px 0' }} />
            : item.header
            ? <div key={i} style={{ padding:'8px 16px 4px', fontSize:11, color:'#aaa', fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>{item.header}</div>
            : (
              <div key={i} onClick={item.onClick} style={{
                padding:'10px 16px', fontSize:13, color: item.danger ? '#e53e3e' : '#333',
                cursor:'pointer', display:'flex', alignItems:'center', gap:8,
                transition:'background .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {item.icon && <span style={{ fontSize:15, width:20, textAlign:'center' }}>{item.icon}</span>}
                <div>
                  <div style={{ fontWeight: item.sub ? 400 : 500 }}>{item.label}</div>
                  {item.sub && <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>{item.sub}</div>}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

export default function RecipeListPage({
  products, rawMaterials, recipes, onAdd, onEdit, onDeleteRecipe,
  onDownloadTemplate, onImport, importing, onBulkEdit
}) {
  const toast = useToast()
  const [filterItem,   setFilterItem]   = useState('')
  const [filterCat,    setFilterCat]    = useState('')
  const [filterStatus, setFilterStatus] = useState('All')      // FIX: default 'All' so all items show
  const [selCat,       setSelCat]       = useState('All categories')
  const [autoConsume,  setAutoConsume]  = useState(false)
  const [catTabStart,  setCatTabStart]  = useState(0)
  const [selectedRows, setSelectedRows] = useState(new Set())

  const getCatName = c => typeof c === 'object' ? c?.name : c

  // Category tabs — count ALL items per category (not filtered by status)
  const allCats = ['All categories', ...Array.from(new Set(recipes.map(r => getCatName(r.category)).filter(Boolean)))]
  const catCounts = allCats.map(c => ({
    cat:   c,
    count: c === 'All categories' ? recipes.length : recipes.filter(r => getCatName(r.category) === c).length
  }))

  // Filter for table display
  const filtered = recipes.filter(r => {
    const mc   = selCat === 'All categories' || getCatName(r.category) === selCat
    const ms   = !filterItem || r.productName?.toLowerCase().includes(filterItem.toLowerCase())
    const mcat = !filterCat || (getCatName(r.category) || '').toLowerCase().includes(filterCat.toLowerCase())
    const mst  = filterStatus === 'Created Recipes'
      ? r.hasRecipe
      : filterStatus === 'Pending Recipes'
      ? !r.hasRecipe
      : true
    return mc && ms && mcat && mst
  })

  function scrollCats(dir) {
    setCatTabStart(p => Math.max(0, Math.min(allCats.length - 3, p + dir)))
  }

  async function deleteRecipe(id, recipeId) {
    if (!confirm('Delete this recipe?')) return
    try {
      if (recipeId) await api.delete(`/inv/recipes/${recipeId}`)
      toast.success('Recipe deleted')
      onDeleteRecipe()
    } catch (err) { toast.error(err.message || 'Delete failed') }
  }

  function toggleRow(id) {
    setSelectedRows(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleAll(e) {
    setSelectedRows(e.target.checked ? new Set(filtered.map(r => r.id)) : new Set())
  }

  async function deleteSelected() {
    if (!selectedRows.size) { toast.error('Pehle kuch items select karo'); return }
    const toDelete = filtered.filter(r => selectedRows.has(r.id) && r.recipeId)
    const pendingCount = selectedRows.size - toDelete.length

    if (toDelete.length === 0) {
      // All selected items are Pending — nothing in DB to delete
      toast.success(`${pendingCount} items already mein koi recipe nahi thi — selection clear kar diya`)
      setSelectedRows(new Set())
      return
    }

    const msg = toDelete.length === selectedRows.size
      ? `${toDelete.length} recipe(s) delete karna chahte hain?`
      : `${toDelete.length} recipe(s) delete hongi, ${pendingCount} Pending items skip honge. Continue?`

    if (!confirm(msg)) return

    const results = await Promise.allSettled(toDelete.map(r => api.delete(`/inv/recipes/${r.recipeId}`)))
    const failed  = results.filter(r => r.status === 'rejected').length
    const done    = toDelete.length - failed
    if (failed > 0) toast.error(`${done} deleted, ${failed} failed`)
    else toast.success(`${done} recipe(s) deleted successfully`)
    setSelectedRows(new Set())
    onDeleteRecipe()
  }

  // ── Files dropdown items ──────────────────────────────────────────
  const filesItems = [
    { header: 'Import Recipe' },
    {
      icon: '⬇', label: 'Download Template',
      sub: 'XLS format — fill & upload',
      onClick: onDownloadTemplate,
    },
    {
      icon: '📤', label: 'Upload Recipe File',
      sub: 'XLS / XLSX (Petpooja format supported)',
      onClick: onImport,
    },
    'divider',
    { header: 'Export Excel' },
    {
      icon: '📊', label: 'Export All Recipes',
      sub: 'Download current recipes as XLS',
      onClick: () => toast.error('Export coming soon'),
    },
    {
      icon: '📋', label: 'Active Menu Recipes',
      onClick: () => toast.error('Export coming soon'),
    },
  ]

  // ── More Actions dropdown items ───────────────────────────────────
  const moreItems = [
    {
      icon: '🎨', label: 'Recipe Customizer',
      sub: 'Customize recipe presentation',
      onClick: () => toast.error('Coming soon'),
    },
    {
      icon: '📍', label: 'Area Recipe',
      sub: 'Assign recipes to specific areas',
      onClick: () => toast.error('Coming soon'),
    },
    {
      icon: '✏️', label: 'Bulk Recipe Editor',
      sub: 'Ek ingredient ke saare recipes ek saath edit karo',
      onClick: onBulkEdit,
    },
    {
      icon: '⧉', label: 'Replicate Recipe',
      sub: 'Copy a recipe to another item',
      onClick: () => toast.error('Coming soon'),
    },
    'divider',
    {
      icon: '🗑', label: 'Delete Selected Recipes',
      danger: true,
      onClick: deleteSelected,
    },
  ]

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
        <h1 style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', margin:0 }}>Recipe Management</h1>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>

          {/* More Actions dropdown */}
          <Dropdown
            trigger={
              <button style={{ ...BTN_OUT, display:'flex', alignItems:'center', gap:6 }}>
                More Actions <span style={{ fontSize:10 }}>▾</span>
              </button>
            }
            items={moreItems}
          />

          {/* Files dropdown */}
          <Dropdown
            trigger={
              <button style={{ ...BTN_OUT, display:'flex', alignItems:'center', gap:6 }}
                disabled={importing}>
                {importing ? '⏳' : '📄'} Files <span style={{ fontSize:10 }}>▾</span>
              </button>
            }
            items={filesItems}
          />

          <button onClick={onAdd} style={{
            ...BTN_RED, display:'flex', alignItems:'center', gap:6,
            boxShadow:'0 2px 8px rgba(229,62,62,.3)',
          }}>
            ＋ Create New
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
        padding:'14px 16px', marginBottom:14, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>

          {/* Select Item */}
          <div style={{ flex:1, minWidth:180 }}>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>Select Item</label>
            <SearchSelect value={null} onChange={() => {}} options={products} placeholder="Select Item" />
          </div>

          {/* Category */}
          <div style={{ flex:1, minWidth:160 }}>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>Category</label>
            <div style={{ position:'relative' }}>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                style={{ ...INP, paddingRight:28, cursor:'pointer' }}>
                <option value="">Select Category</option>
                {Array.from(new Set(recipes.map(r => getCatName(r.category)).filter(Boolean))).map(c => (
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
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ ...INP, paddingRight:28, cursor:'pointer' }}>
                <option>All</option>
                <option>Created Recipes</option>
                <option>Pending Recipes</option>
              </select>
              <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button style={{ ...BTN_RED, padding:'8px 18px' }}>Search</button>
            <button onClick={() => { setFilterItem(''); setFilterCat(''); setFilterStatus('All') }}
              style={{ ...BTN_OUT, padding:'8px 14px' }}>Clear</button>
          </div>

          {/* Auto Consumption toggle */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto', paddingBottom:2 }}>
            <span style={{ fontSize:12, color:'#555', fontWeight:500 }}>Auto Consumption</span>
            <div onClick={() => setAutoConsume(a => !a)} style={{
              width:44, height:24, borderRadius:12, cursor:'pointer', transition:'background .2s',
              background: autoConsume ? '#e53e3e' : '#e0e0e0', position:'relative',
            }}>
              <div style={{
                width:20, height:20, borderRadius:50, background:'#fff',
                position:'absolute', top:2, transition:'left .2s',
                left: autoConsume ? 22 : 2,
                boxShadow:'0 1px 4px rgba(0,0,0,.2)',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
        marginBottom:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)',
        display:'flex', alignItems:'stretch' }}>

        {catTabStart > 0 && (
          <button onClick={() => scrollCats(-1)} style={{
            padding:'0 10px', border:'none', background:'#fafafa',
            borderRight:'1px solid #f0f0f0', cursor:'pointer', color:'#888', fontSize:16 }}>‹</button>
        )}

        <div style={{ display:'flex', flex:1, overflowX:'auto', scrollbarWidth:'none' }}>
          {catCounts.slice(catTabStart, catTabStart + 8).map(({ cat, count }) => {
            const active = cat === selCat
            return (
              <button key={cat} onClick={() => setSelCat(cat)} style={{
                flex:'0 0 auto', padding:'12px 20px', border:'none', cursor:'pointer',
                borderRight:'1px solid #f0f0f0',
                borderBottom: active ? '2px solid #e53e3e' : '2px solid transparent',
                background: active ? '#fff5f5' : '#fff', transition:'all .15s',
              }}>
                <div style={{ fontSize:13, fontWeight:600, color:active?'#e53e3e':'#333', whiteSpace:'nowrap' }}>{cat}</div>
                <div style={{ fontSize:11, color:active?'#e53e3e':'#aaa', marginTop:2 }}>
                  {count} Item{count !== 1 ? 's' : ''}
                </div>
              </button>
            )
          })}
        </div>

        {catTabStart + 8 < allCats.length && (
          <button onClick={() => scrollCats(1)} style={{
            padding:'0 10px', border:'none', background:'#fafafa',
            borderLeft:'1px solid #f0f0f0', cursor:'pointer', color:'#888', fontSize:16 }}>›</button>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
        overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...TH, width:40 }}>
                <input type="checkbox"
                  checked={filtered.length > 0 && selectedRows.size === filtered.length}
                  onChange={toggleAll}
                  style={{ accentColor:'#e53e3e' }} />
              </th>
              <th style={TH}>Name</th>
              <th style={TH}>Category</th>
              <th style={TH}></th>
              <th style={TH}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding:'48px 0', textAlign:'center', color:'#aaa', fontSize:13 }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
                  No items found
                </td>
              </tr>
            ) : filtered.map((recipe) => (
              <tr key={recipe.id}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = selectedRows.has(recipe.id) ? '#fef2f2' : '#fff'}
                style={{ background: selectedRows.has(recipe.id) ? '#fef2f2' : '#fff' }}>

                <td style={TD}>
                  <input type="checkbox"
                    checked={selectedRows.has(recipe.id)}
                    onChange={() => toggleRow(recipe.id)}
                    style={{ accentColor:'#e53e3e' }} />
                </td>

                <td style={TD}>
                  <div style={{ fontWeight:500, fontSize:13 }}>{recipe.productName}</div>
                  {recipe.variantName && (
                    <span style={{ fontSize:11, background:'#eff6ff', color:'#3b82f6',
                      padding:'1px 7px', borderRadius:10, fontWeight:600, marginTop:2, display:'inline-block' }}>
                      {recipe.variantName}
                    </span>
                  )}
                </td>

                <td style={{ ...TD, fontSize:12 }}>
                  {recipe.subCategory && recipe.subCategory !== getCatName(recipe.category) ? (
                    <>
                      <div style={{ color:'#555', fontWeight:500 }}>{recipe.subCategory}</div>
                      <div style={{ color:'#aaa', fontSize:11, marginTop:2 }}>{getCatName(recipe.category)}</div>
                    </>
                  ) : (
                    <span style={{ color:'#888' }}>{getCatName(recipe.category) || recipe.subCategory}</span>
                  )}
                </td>

                <td style={TD}>
                  {recipe.hasRecipe ? (
                    <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20,
                      background:'#dcfce7', color:'#16a34a', fontWeight:600 }}>
                      Recipe Added
                    </span>
                  ) : (
                    <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20,
                      background:'#fef3c7', color:'#d97706', fontWeight:600 }}>
                      Pending
                    </span>
                  )}
                </td>

                <td style={TD}>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <button onClick={() => onEdit(recipe)} title="Edit"
                      style={{ background:'#f5f5f5', border:'1px solid #e8eaed',
                        borderRadius:5, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'#555' }}>
                      ✏️
                    </button>
                    <button onClick={() => deleteRecipe(recipe.id, recipe.recipeId)} title="Delete"
                      style={{ background:'#f5f5f5', border:'1px solid #e8eaed',
                        borderRadius:5, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'#ef4444' }}>
                      🗑
                    </button>
                    <button title="Copy" style={{ background:'#f5f5f5', border:'1px solid #e8eaed',
                      borderRadius:5, padding:'4px 8px', cursor:'pointer', fontSize:13, color:'#555' }}>
                      ⧉
                    </button>
                    {!recipe.hasRecipe && (
                      <button onClick={() => onEdit(recipe)} style={{
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
          fontSize:11, color:'#888', background:'#fafafa',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>Showing 1 to {filtered.length} of {filtered.length} records</span>
          {selectedRows.size > 0 && (
            <span style={{ color:'#e53e3e', fontWeight:600 }}>
              {selectedRows.size} selected
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
