// src/components/inventory/AddRecipePage.jsx
import { useState } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import SearchSelect from './SearchSelect'
import AreaMultiSelect from './AreaMultiSelect'

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

export default function AddRecipePage({ products, rawMaterials, editProduct, editRecipeId, rid, onSave, onCancel }) {
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
