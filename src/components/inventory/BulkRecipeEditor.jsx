// src/components/inventory/BulkRecipeEditor.jsx
import { useState, useMemo } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import SearchSelect from './SearchSelect'

const INP = {
  padding:'7px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none',
  boxSizing:'border-box', width:'100%',
}
const SEL = { ...INP, cursor:'pointer', appearance:'none' }
const BTN_RED = {
  padding:'8px 20px', borderRadius:6, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
}
const BTN_OUT = {
  padding:'8px 18px', borderRadius:6, border:'1px solid #dde1e7',
  background:'#fff', color:'#555', fontSize:13, cursor:'pointer',
}
const TD = { padding:'11px 16px', fontSize:13, borderBottom:'1px solid #f0f0f0', verticalAlign:'middle' }
const TH = { padding:'10px 16px', textAlign:'left', fontSize:11, color:'#888', fontWeight:700,
  borderBottom:'2px solid #f0f0f0', background:'#fafafa', whiteSpace:'nowrap' }

export default function BulkRecipeEditor({ rawMaterials, recipes, rid, onBack, onSaved }) {
  const toast = useToast()
  const [selectedRmId, setSelectedRmId] = useState(null)
  const [rows, setRows] = useState([])           // { recipeId, productId, productName, variantId, variantName, restaurantId, ingredients, qty, unit, modified }
  const [saving, setSaving] = useState(false)

  const selectedRm = rawMaterials.find(r => r.id === selectedRmId)

  // When user picks a raw material — build rows from matching recipes
  function handleRmChange(rmId) {
    setSelectedRmId(rmId)
    if (!rmId) { setRows([]); return }
    const rm = rawMaterials.find(r => r.id === rmId)
    const matched = recipes
      .filter(rec => (rec.ingredients || []).some(ing => ing.rawMaterialId === rmId))
      .map(rec => {
        const ing = rec.ingredients.find(i => i.rawMaterialId === rmId)
        return {
          recipeId:    rec.id,
          productId:   rec.productId,
          productName: rec.productName,
          variantId:   rec.variantId   || null,
          variantName: rec.variantName || null,
          restaurantId:rec.restaurantId || rid,
          ingredients: rec.ingredients,   // full ingredient list for PUT
          qty:         String(ing.quantity ?? ''),
          unit:        ing.unit || (rm?.units?.[0] || ''),
          modified:    false,
        }
      })
    setRows(matched)
  }

  function updRow(recipeId, field, value) {
    setRows(rs => rs.map(r =>
      r.recipeId === recipeId ? { ...r, [field]: value, modified: true } : r
    ))
  }

  // Mark all rows with same value
  function applyToAll(field, value) {
    setRows(rs => rs.map(r => ({ ...r, [field]: value, modified: true })))
  }

  async function handleSave() {
    const toSave = rows.filter(r => r.modified)
    if (toSave.length === 0) { toast.error('Koi changes nahi kiye'); return }
    setSaving(true)
    let ok = 0, fail = 0
    try {
      await Promise.all(toSave.map(async row => {
        try {
          const updatedIngredients = row.ingredients.map(ing =>
            ing.rawMaterialId === selectedRmId
              ? { rawMaterialId: ing.rawMaterialId, quantity: Number(row.qty), unit: row.unit,
                  areas: Array.isArray(ing.areas) ? ing.areas.join(',') : (ing.areas || '') }
              : { rawMaterialId: ing.rawMaterialId, quantity: ing.quantity, unit: ing.unit,
                  areas: Array.isArray(ing.areas) ? ing.areas.join(',') : (ing.areas || '') }
          )
          await api.put(`/inv/recipes/${row.recipeId}`, {
            restaurantId: row.restaurantId,
            productId:    row.productId,
            variantId:    row.variantId,
            variantName:  row.variantName,
            ingredients:  updatedIngredients,
          })
          ok++
        } catch { fail++ }
      }))
      if (fail > 0) toast.error(`${ok} saved, ${fail} failed`)
      else toast.success(`${ok} recipe(s) updated successfully!`)
      // Refresh rows — mark all as unmodified
      setRows(rs => rs.map(r => ({ ...r, modified: false })))
      onSaved()
    } finally { setSaving(false) }
  }

  const modifiedCount = rows.filter(r => r.modified).length

  return (
    <div style={{ background:'#f8f9fb', minHeight:'100%' }}>

      {/* ── Header ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8eaed',
        padding:'16px 28px', marginBottom:20,
        display:'flex', alignItems:'center', gap:16 }}>
        <button onClick={onBack} style={{ background:'none', border:'none',
          fontSize:20, cursor:'pointer', color:'#888', lineHeight:1, padding:4 }}>←</button>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#1a1a2e', margin:0 }}>
            Bulk Recipe Editor
          </h2>
          <div style={{ fontSize:12, color:'#888', marginTop:2 }}>
            Ek ingredient select karo — us ingredient wale saare recipes ek saath edit karo
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:'0 auto', padding:'0 24px 100px' }}>

        {/* ── Raw Material Selector ── */}
        <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
          padding:'20px 24px', marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <label style={{ fontSize:14, fontWeight:600, color:'#333', flexShrink:0 }}>
              Select Ingredient
            </label>
            <div style={{ flex:1, maxWidth:360 }}>
              <SearchSelect
                value={selectedRmId}
                onChange={handleRmChange}
                options={rawMaterials}
                placeholder="Raw material choose karo..."
              />
            </div>
            {selectedRmId && rows.length > 0 && (
              <div style={{ fontSize:13, color:'#888' }}>
                <span style={{ fontWeight:700, color:'#e53e3e' }}>{rows.length}</span> recipes mein use ho raha hai
              </div>
            )}
          </div>
        </div>

        {/* ── Empty / no match state ── */}
        {selectedRmId && rows.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#aaa' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
            <div style={{ fontSize:14, fontWeight:500 }}>
              "{selectedRm?.name}" kisi bhi recipe mein use nahi ho raha
            </div>
          </div>
        )}

        {/* ── Recipe Table ── */}
        {rows.length > 0 && (
          <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
            overflow:'visible', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>

            {/* Table toolbar */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'14px 20px', borderBottom:'1px solid #f0f0f0', background:'#fafafa',
              borderRadius:'10px 10px 0 0' }}>
              <span style={{ fontSize:14, fontWeight:700, color:'#333', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ background:'#fff5f5', color:'#e53e3e', padding:'3px 10px',
                  borderRadius:20, fontSize:12, fontWeight:700, border:'1px solid #fecaca' }}>
                  {selectedRm?.name}
                </span>
                wale recipes
                {modifiedCount > 0 && (
                  <span style={{ fontSize:12, background:'#fffbe6', color:'#b45309',
                    padding:'2px 8px', borderRadius:10, border:'1px solid #fde68a', fontWeight:600 }}>
                    {modifiedCount} modified
                  </span>
                )}
              </span>

              {/* Apply to all */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, color:'#888' }}>Apply to all:</span>
                <input
                  type="number" min="0" placeholder="Qty"
                  style={{ ...INP, width:80 }}
                  onBlur={e => { if (e.target.value) applyToAll('qty', e.target.value) }}
                />
                <div style={{ position:'relative', width:110 }}>
                  <select
                    style={{ ...SEL, paddingRight:24 }}
                    defaultValue=""
                    onChange={e => { if (e.target.value) applyToAll('unit', e.target.value) }}
                  >
                    <option value="">Unit</option>
                    {(selectedRm?.units || []).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <span style={{ position:'absolute', right:7, top:'50%',
                    transform:'translateY(-50%)', pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
                </div>
              </div>
            </div>

            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Menu Item</th>
                  <th style={{ ...TH, width:110 }}>Variant</th>
                  <th style={{ ...TH, width:130 }}>Current Qty</th>
                  <th style={{ ...TH, width:130 }}>Current Unit</th>
                  <th style={{ ...TH, width:140 }}>New Qty</th>
                  <th style={{ ...TH, width:150 }}>New Unit</th>
                  <th style={{ ...TH, width:60 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const origIng = row.ingredients.find(i => i.rawMaterialId === selectedRmId)
                  const origQty  = origIng?.quantity ?? ''
                  const origUnit = origIng?.unit || ''
                  return (
                    <tr key={row.recipeId}
                      style={{ background: row.modified ? '#fffef0' : idx % 2 === 0 ? '#fff' : '#fdfdfd' }}>

                      {/* Product name */}
                      <td style={TD}>
                        <div style={{ fontWeight:500 }}>{row.productName}</div>
                      </td>

                      {/* Variant badge */}
                      <td style={TD}>
                        {row.variantName
                          ? <span style={{ fontSize:11, background:'#eff6ff', color:'#3b82f6',
                              padding:'2px 8px', borderRadius:10, fontWeight:600 }}>{row.variantName}</span>
                          : <span style={{ fontSize:11, color:'#ccc' }}>Base</span>
                        }
                      </td>

                      {/* Current qty (read-only) */}
                      <td style={{ ...TD, color:'#888' }}>{origQty}</td>

                      {/* Current unit (read-only) */}
                      <td style={{ ...TD, color:'#888' }}>{origUnit}</td>

                      {/* New qty */}
                      <td style={TD}>
                        <input
                          type="number" min="0"
                          value={row.qty}
                          onChange={e => updRow(row.recipeId, 'qty', e.target.value)}
                          placeholder="0"
                          style={{
                            ...INP,
                            borderColor: row.modified && row.qty !== String(origQty) ? '#f59e0b' : '#dde1e7',
                            fontWeight: row.modified ? 600 : 400,
                            textAlign: 'center',
                          }}
                        />
                      </td>

                      {/* New unit */}
                      <td style={TD}>
                        <div style={{ position:'relative' }}>
                          <select
                            value={row.unit}
                            onChange={e => updRow(row.recipeId, 'unit', e.target.value)}
                            style={{
                              ...SEL, paddingRight:24,
                              borderColor: row.modified && row.unit !== origUnit ? '#f59e0b' : '#dde1e7',
                            }}
                          >
                            {(selectedRm?.units || []).map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                          <span style={{ position:'absolute', right:7, top:'50%',
                            transform:'translateY(-50%)', pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
                        </div>
                      </td>

                      {/* Modified indicator */}
                      <td style={{ ...TD, textAlign:'center' }}>
                        {row.modified && (
                          <span style={{ fontSize:16, color:'#f59e0b' }} title="Modified">●</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Summary footer */}
            <div style={{ padding:'12px 20px', borderTop:'1px solid #f0f0f0',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'#fafafa', borderRadius:'0 0 10px 10px' }}>
              <span style={{ fontSize:12, color:'#888' }}>
                Total: {rows.length} recipes — {modifiedCount} modified
              </span>
              {modifiedCount > 0 && (
                <span style={{ fontSize:12, color:'#b45309', background:'#fffbe6',
                  padding:'4px 12px', borderRadius:8, border:'1px solid #fde68a' }}>
                  {modifiedCount} recipe(s) save hongi
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!selectedRmId && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#aaa' }}>
            <div style={{ fontSize:44, marginBottom:12 }}>✏️</div>
            <div style={{ fontSize:14, fontWeight:500 }}>
              Koi raw material select karo jise bulk edit karna hai
            </div>
            <div style={{ fontSize:12, marginTop:6, color:'#bbb' }}>
              Us RM wale saare recipes ek table mein dikhenge
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky footer ── */}
      {modifiedCount > 0 && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100,
          background:'#fff5f5', borderTop:'1px solid #fecaca',
          padding:'12px 32px', display:'flex', justifyContent:'flex-end', gap:12, alignItems:'center' }}>
          <span style={{ fontSize:13, color:'#888', marginRight:'auto' }}>
            {modifiedCount} recipe(s) mein changes hain
          </span>
          <button onClick={onBack} style={BTN_OUT}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            ...BTN_RED, opacity: saving ? 0.7 : 1,
            boxShadow:'0 2px 8px rgba(229,62,62,.3)',
          }}>
            {saving ? 'Saving...' : `Save ${modifiedCount} Recipe(s)`}
          </button>
        </div>
      )}
    </div>
  )
}
