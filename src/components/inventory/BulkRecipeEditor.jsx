// src/components/inventory/BulkRecipeEditor.jsx
import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'

const BTN_RED = {
  padding:'9px 24px', borderRadius:6, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
}
const BTN_OUT = {
  padding:'9px 20px', borderRadius:6, border:'1px solid #dde1e7',
  background:'#fff', color:'#555', fontSize:13, cursor:'pointer',
}
const INP_STYLE = {
  padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none',
  boxSizing:'border-box', width:'100%',
}
const INFO = {
  display:'flex', alignItems:'flex-start', gap:8, padding:'10px 14px',
  background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8,
  fontSize:12, color:'#0369a1', marginTop:8,
}

// ── Multi-select dropdown ─────────────────────────────────────────────────────
function MultiSelect({ options, value, onChange, placeholder }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef()

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(id) {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  const selectedLabels = options.filter(o => value.includes(o.id))

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding:'7px 10px', borderRadius:6, border:'1px solid #dde1e7',
        background:'#fff', cursor:'pointer', minHeight:38,
        display:'flex', flexWrap:'wrap', gap:4, alignItems:'center',
        boxSizing:'border-box',
      }}>
        {selectedLabels.length === 0
          ? <span style={{ color:'#aaa', fontSize:13 }}>{placeholder}</span>
          : selectedLabels.map(o => (
            <span key={o.id} style={{
              background:'#e8eaed', borderRadius:4, padding:'2px 6px',
              fontSize:12, display:'flex', alignItems:'center', gap:4, color:'#333',
            }}>
              {o.label}
              <span onClick={e => { e.stopPropagation(); toggle(o.id) }}
                style={{ cursor:'pointer', color:'#888', fontWeight:700, fontSize:14, lineHeight:1 }}>×</span>
            </span>
          ))
        }
        <span style={{ marginLeft:'auto', fontSize:10, color:'#aaa', flexShrink:0 }}>▼</span>
      </div>
      {open && (
        <div style={{
          position:'absolute', left:0, right:0, top:'calc(100% + 4px)', zIndex:400,
          background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
          boxShadow:'0 4px 20px rgba(0,0,0,.12)', overflow:'hidden', display:'flex', flexDirection:'column',
        }}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid #f0f0f0' }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." style={{ ...INP_STYLE, padding:'5px 8px', border:'none', outline:'none' }} />
          </div>
          <div style={{ overflowY:'auto', maxHeight:220 }}>
            {filtered.map(o => (
              <div key={o.id} onClick={() => toggle(o.id)} style={{
                padding:'9px 12px', fontSize:13, cursor:'pointer',
                display:'flex', alignItems:'center', gap:10,
                background: value.includes(o.id) ? '#f0f9ff' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = value.includes(o.id) ? '#e0f2fe' : '#f9fafb' }}
              onMouseLeave={e => { e.currentTarget.style.background = value.includes(o.id) ? '#f0f9ff' : 'transparent' }}>
                <input type="checkbox" readOnly checked={value.includes(o.id)}
                  style={{ cursor:'pointer', accentColor:'#2563eb', width:15, height:15 }} />
                <span>{o.label}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding:14, textAlign:'center', color:'#aaa', fontSize:13 }}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Single-select dropdown ────────────────────────────────────────────────────
function SingleSelect({ options, value, onChange, placeholder, required }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef()

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const selected = options.find(o => o.id === value)

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        ...INP_STYLE, cursor:'pointer', display:'flex',
        justifyContent:'space-between', alignItems:'center',
        borderColor: required && !value ? '#fca5a5' : '#dde1e7',
      }}>
        <span style={{ color: selected ? '#111' : '#aaa' }}>{selected?.label || placeholder}</span>
        <span style={{ fontSize:10, color:'#aaa' }}>▼</span>
      </div>
      {open && (
        <div style={{
          position:'absolute', left:0, right:0, top:'calc(100% + 4px)', zIndex:400,
          background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
          boxShadow:'0 4px 20px rgba(0,0,0,.12)', overflow:'hidden', display:'flex', flexDirection:'column',
        }}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid #f0f0f0' }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." style={{ ...INP_STYLE, padding:'5px 8px', border:'none', outline:'none' }} />
          </div>
          <div style={{ overflowY:'auto', maxHeight:220 }}>
            {filtered.map(o => (
              <div key={o.id} onClick={() => { onChange(o.id); setOpen(false); setSearch('') }} style={{
                padding:'9px 12px', fontSize:13, cursor:'pointer',
                display:'flex', justifyContent:'space-between', alignItems:'center',
                background: value === o.id ? '#f0f9ff' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb' }}
              onMouseLeave={e => { e.currentTarget.style.background = value === o.id ? '#f0f9ff' : 'transparent' }}>
                <span>{o.label}</span>
                {value === o.id && <span style={{ color:'#2563eb', fontSize:14 }}>✓</span>}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding:14, textAlign:'center', color:'#aaa', fontSize:13 }}>No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────
const getCatName = c => (typeof c === 'object' ? c?.name : c) || ''

// ── Main Component ────────────────────────────────────────────────────────────
export default function BulkRecipeEditor({ rawMaterials, recipes, products, catById, rid, onBack, onSaved }) {
  const toast = useToast()

  const [mode,        setMode]        = useState('update')   // 'update' | 'delete'
  const [selRmIds,    setSelRmIds]    = useState([])         // update mode: multi RM filter
  const [delRmId,     setDelRmId]     = useState(null)       // delete mode: single RM
  const [delUnit,     setDelUnit]     = useState(null)       // delete mode: unit required
  const [selCats,     setSelCats]     = useState([])         // multi category filter
  const [itemType,    setItemType]    = useState('all')      // all | item | variation | addon
  const [submitting,  setSubmitting]  = useState(false)

  // Derived options
  const rmOptions  = rawMaterials.map(r => ({ id: r.id, label: r.name }))
  const catOptions = [...new Set(
    products.map(p => getCatName(p.category)).filter(Boolean)
  )].map(c => ({ id: c, label: c }))

  const delRm    = rawMaterials.find(r => r.id === delRmId)
  const unitOpts = (delRm?.units || []).map(u => ({ id: u, label: u }))

  const itemTypeOpts = [
    { id:'all',       label:'All item' },
    { id:'item',      label:'Only item (no variants)' },
    { id:'variation', label:'Variations item' },
    { id:'addon',     label:'Addon items' },
  ]

  // ── Filter products matching current criteria ─────────────────────────────
  function filterProducts() {
    return products.filter(p => {
      // Category filter
      if (selCats.length > 0 && !selCats.includes(getCatName(p.category))) return false
      // Item type filter
      const hasVariants = (p.productVariants || []).length > 0
      if (itemType === 'item'      && hasVariants) return false
      if (itemType === 'variation' && !hasVariants) return false
      // No addon concept currently — treat same as 'item'
      return true
    })
  }

  // ── UPDATE MODE: Download XLSX sheet (Petpooja format) ───────────────────
  function downloadSheet() {
    const filteredProds = filterProducts()
    const MAX_RM = 15   // 15 groups × 3 cols = 45 + 3 info = 48 cols (matches Petpooja)

    // Header row — repeating RawMaterial | Qty | Unit
    const header = ['ItemID', 'ItemName', 'ItemType']
    for (let i = 0; i < MAX_RM; i++) {
      header.push('RawMaterial', 'Qty', 'Unit')
    }

    const dataRows = filteredProds.map(p => {
      const rec = recipes.find(r => r.productId === p.id && !r.variantId)
      let ings   = rec?.ingredients || []

      // If RM filter active → keep only matching ingredients first, then rest
      if (selRmIds.length > 0) {
        const matched   = ings.filter(ing => selRmIds.includes(ing.rawMaterialId))
        const unmatched = ings.filter(ing => !selRmIds.includes(ing.rawMaterialId))
        ings = [...matched, ...unmatched]
      }

      const row = [`0x${p.id}`, p.name, 'Item']
      for (let i = 0; i < MAX_RM; i++) {
        const ing = ings[i]
        row.push(
          ing?.rawMaterialName || '',
          ing ? Number(ing.quantity) : '',
          ing?.unit || '',
        )
      }
      return row
    })

    const wsData  = [header, ...dataRows]
    const ws      = XLSX.utils.aoa_to_sheet(wsData)

    // Column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 8 },
      ...Array.from({ length: MAX_RM * 3 }, (_, i) =>
        ({ wch: i % 3 === 0 ? 22 : i % 3 === 1 ? 8 : 10 })
      ),
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Recipes')
    XLSX.writeFile(wb, 'Bulk_Recipe_Edit.xlsx')

    toast.success(`Sheet downloaded — ${filteredProds.length} items`)
  }

  // ── DELETE MODE: Remove selected RM from all matching recipes ─────────────
  async function handleDelete() {
    if (!delRmId)  { toast.error('Raw material select karo'); return }
    if (!delUnit)  { toast.error('Unit select karo'); return }

    const filteredProds = filterProducts()
    const filteredProdIds = new Set(filteredProds.map(p => p.id))

    const toUpdate = recipes.filter(r =>
      filteredProdIds.has(r.productId) &&
      (r.ingredients || []).some(ing => ing.rawMaterialId === delRmId && ing.unit === delUnit)
    )

    if (toUpdate.length === 0) {
      toast.error('Matching recipes nahi mili — filters check karo')
      return
    }

    const confirmed = window.confirm(
      `"${delRm?.name}" (${delUnit}) ko ${toUpdate.length} recipe(s) se remove karna chahte hain?`
    )
    if (!confirmed) return

    setSubmitting(true)
    let ok = 0, fail = 0
    try {
      await Promise.all(toUpdate.map(async rec => {
        try {
          const updatedIngredients = (rec.ingredients || [])
            .filter(ing => !(ing.rawMaterialId === delRmId && ing.unit === delUnit))
            .map(ing => ({
              rawMaterialId: ing.rawMaterialId,
              quantity:      ing.quantity,
              unit:          ing.unit,
              areas:         Array.isArray(ing.areas) ? ing.areas.join(',') : (ing.areas || ''),
            }))

          await api.put(`/inv/recipes/${rec.id}`, {
            restaurantId: rec.restaurantId || rid,
            productId:    rec.productId,
            variantId:    rec.variantId || null,
            variantName:  rec.variantName || null,
            ingredients:  updatedIngredients,
          })
          ok++
        } catch { fail++ }
      }))

      if (fail > 0) toast.error(`${ok} updated, ${fail} failed`)
      else toast.success(`"${delRm?.name}" successfully removed from ${ok} recipe(s)!`)
      onSaved()
    } finally { setSubmitting(false) }
  }

  const filteredCount = filterProducts().length

  return (
    <div style={{ background:'#f8f9fb', minHeight:'100%' }}>

      {/* ── Header ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8eaed',
        padding:'16px 28px', marginBottom:24,
        display:'flex', alignItems:'center', gap:16 }}>
        <button onClick={onBack} style={{ background:'none', border:'none',
          fontSize:20, cursor:'pointer', color:'#888', lineHeight:1, padding:4 }}>←</button>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#1a1a2e', margin:0 }}>Bulk Recipe Editor</h2>
          <div style={{ fontSize:12, color:'#888', marginTop:2 }}>
            Raw materials bulk mein update karo ya recipes se remove karo
          </div>
        </div>
      </div>

      <div style={{ maxWidth:760, margin:'0 auto', padding:'0 24px 80px' }}>

        {/* ── Mode selector ── */}
        <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
          padding:'20px 24px', marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>

          <div style={{ marginBottom:12, fontSize:13, color:'#555', lineHeight:1.5 }}>
            {mode === 'update'
              ? 'Raw materials bulk mein update karo — items aur categories filter karke sheet download karo, fill karo, aur re-import karo.'
              : 'Ek raw material ko selected menu items ki recipes se ek click mein remove karo.'
            }
          </div>

          <div style={{ display:'flex', gap:24 }}>
            {[
              { id:'update', label:'Raw Material Update or Edit' },
              { id:'delete', label:'Bulk raw material delete from recipe in one click' },
            ].map(m => (
              <label key={m.id} style={{ display:'flex', alignItems:'center', gap:8,
                cursor:'pointer', fontSize:13, fontWeight: mode === m.id ? 600 : 400,
                color: mode === m.id ? '#2563eb' : '#333' }}>
                <input type="radio" name="mode" checked={mode === m.id}
                  onChange={() => { setMode(m.id); setSelRmIds([]); setDelRmId(null); setDelUnit(null) }}
                  style={{ accentColor:'#2563eb', cursor:'pointer' }} />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        {/* ── Filter fields ── */}
        <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
          padding:'24px', marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,.04)',
          display:'flex', flexDirection:'column', gap:20 }}>

          {/* ── UPDATE MODE: multi-select RMs ── */}
          {mode === 'update' && (
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:'#333', display:'block', marginBottom:6 }}>
                Select Raw Materials
                <span style={{ fontSize:11, color:'#aaa', fontWeight:400, marginLeft:6 }}>(optional — blank = all items)</span>
              </label>
              <MultiSelect
                options={rmOptions}
                value={selRmIds}
                onChange={setSelRmIds}
                placeholder="Select multiple raw materials"
              />
              <div style={INFO}>
                <span>ℹ</span>
                <span>Jinhe select karoge, unhe use karne wale menu items hi sheet mein aayenge. Blank chhodo toh saare items aayenge.</span>
              </div>
            </div>
          )}

          {/* ── DELETE MODE: single RM + Unit ── */}
          {mode === 'delete' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:600, color:'#333', display:'block', marginBottom:6 }}>
                  Select Raw Material <span style={{ color:'#e53e3e' }}>*</span>
                </label>
                <SingleSelect
                  options={rmOptions}
                  value={delRmId}
                  onChange={v => { setDelRmId(v); setDelUnit(null) }}
                  placeholder="Select Raw Material"
                  required={true}
                />
              </div>
              <div>
                <label style={{ fontSize:13, fontWeight:600, color:'#333', display:'block', marginBottom:6 }}>
                  Unit <span style={{ color:'#e53e3e' }}>*</span>
                </label>
                <SingleSelect
                  options={unitOpts}
                  value={delUnit}
                  onChange={setDelUnit}
                  placeholder="Select Unit"
                  required={true}
                />
              </div>
              <div style={{ gridColumn:'1/-1', ...INFO }}>
                <span>ℹ</span>
                <span>Jis raw material aur unit ko select karoge, woh saare matching recipes se remove ho jaayega. Yeh mandatory field hai kisi bhi action ke liye.</span>
              </div>
            </div>
          )}

          {/* ── Item Category (both modes) ── */}
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:'#333', display:'block', marginBottom:6 }}>
              Select Item Category
              <span style={{ fontSize:11, color:'#aaa', fontWeight:400, marginLeft:6 }}>(optional)</span>
            </label>
            <MultiSelect
              options={catOptions}
              value={selCats}
              onChange={setSelCats}
              placeholder="Select multiple item categories"
            />
            <div style={INFO}>
              <span>ℹ</span>
              <span>
                {mode === 'update'
                  ? 'Sirf selected categories ke items sheet mein aayenge. Blank chhodo toh saare items aayenge.'
                  : 'Sirf selected categories ke recipes mein changes honge. Blank chhodo toh saare items pe apply hoga.'
                }
              </span>
            </div>
          </div>

          {/* ── Item Type (both modes) ── */}
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:'#333', display:'block', marginBottom:6 }}>
              Select Menu Item Type
            </label>
            <SingleSelect
              options={itemTypeOpts}
              value={itemType}
              onChange={setItemType}
              placeholder="Select item type"
            />
            <div style={INFO}>
              <span>ℹ</span>
              <span>
                {mode === 'update'
                  ? 'Item type ke hisaab se sheet filter hogi: sirf Add-ons, sirf Variations, ya Sab.'
                  : 'Jis type ke items ke liye raw material delete karna hai woh choose karo.'
                }
              </span>
            </div>
          </div>

          {/* ── Matching count preview ── */}
          <div style={{ padding:'12px 16px', background:'#f8f9fb', borderRadius:8,
            border:'1px solid #e8eaed', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:13, color:'#555' }}>
              Current filters se matching items:
            </span>
            <span style={{ fontSize:15, fontWeight:700, color:'#e53e3e' }}>
              {filteredCount}
            </span>
          </div>

          {/* ── Action buttons ── */}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:12, paddingTop:4 }}>
            <button onClick={onBack} style={BTN_OUT}>Cancel</button>
            {mode === 'update' ? (
              <button onClick={downloadSheet} style={BTN_RED}>
                ⬇ Download Sheet
              </button>
            ) : (
              <button
                onClick={handleDelete}
                disabled={submitting || !delRmId || !delUnit}
                style={{ ...BTN_RED, opacity: (submitting || !delRmId || !delUnit) ? 0.6 : 1,
                  background:'#dc2626' }}>
                {submitting ? 'Deleting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>

        {/* ── How to use guide ── */}
        {mode === 'update' && (
          <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
            padding:'20px 24px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#333', marginBottom:12 }}>
              Update Mode — How to use:
            </div>
            <ol style={{ margin:0, paddingLeft:20, fontSize:13, color:'#555', lineHeight:2 }}>
              <li>Filters set karo (optional) aur <strong>Download Sheet</strong> click karo</li>
              <li>Sheet mein RawMaterial, Qty, Unit columns fill karo</li>
              <li>Recipe Management page pe wapas aao</li>
              <li><strong>More Actions → Upload Recipe File</strong> se sheet upload karo</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
