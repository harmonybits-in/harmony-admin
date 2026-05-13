// src/pages/inventory/RawMaterials.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { inventoryApi } from '../api/client'
import { categoryApi } from '../api/inventoryApi'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

// ── Mock data ────────────────────────────────────────────────────
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

const UNITS = ['kg','gm','ltr','ml','pcs','dozen','box','bag','bottle','packet']
const CATEGORIES = ['Drink','Vegetable','Dairy','Grocery','Sauces','Spices','Bakery','Meat','Seafood','Other']

// ── Form initial state ────────────────────────────────────────────
const BLANK_FORM = {
  // Basic Details
  name:'', purchaseUnit:'', purchaseUnits:[], consumptionUnit:'', category:'', conversionFactor:'',
  exciseQuantity:'', exciseGtin:'', exciseBrand:'',
  // Prices
  purchasePrice:'', transferPrice:'', reconciliationPrice:'',
  // Taxes
  taxType:'GST', tax:'',
  // Set Levels
  minStockUnit:'', minStockLevel:'',
  atParUnit:'', atParLevel:'',
  closingStockFrequency:['Daily'],
  allowRestockLevel:false, addOpeningStock:false,
  // Max Stock Level (collapsed)
  maxStockUnit:'', maxStockLevel:'',
  // Related Codes
  barcode:'', hsnCode:'',
  // Other Details
  exclusive:'No', isExpiry:'No', allowDecimal:true,
  description:'', normalLoss:'',
}

// ── Shared input styles ───────────────────────────────────────────
const FRow = ({ label, required, children, hint }) => (
  <div style={{ display:'flex', alignItems:'flex-start', gap:24, padding:'14px 0',
    borderBottom:'1px solid #f5f5f5' }}>
    <div style={{ width:220, flexShrink:0, paddingTop:8 }}>
      <span style={{ fontSize:13, color:'#333', fontWeight:500 }}>
        {label}{required && <span style={{ color:'#e53e3e', marginLeft:3 }}>*</span>}
      </span>
      {hint && <p style={{ fontSize:11, color:'#aaa', marginTop:3, lineHeight:1.4 }}>{hint}</p>}
    </div>
    <div style={{ flex:1 }}>{children}</div>
  </div>
)

const FInput = ({ value, onChange, type='text', placeholder='', disabled=false }) => (
  <input type={type} value={value??''} onChange={onChange} placeholder={placeholder}
    disabled={disabled}
    style={{ width:'100%', padding:'9px 12px', borderRadius:6, fontSize:13,
      border:'1px solid #dde1e7', background:disabled?'#f9fafb':'#fff',
      color:'#111', outline:'none', boxSizing:'border-box',
      transition:'border-color .15s',
    }}
    onFocus={e=>e.target.style.borderColor='#e53e3e'}
    onBlur={e=>e.target.style.borderColor='#dde1e7'}
  />
)

const FSelect = ({ value, onChange, options, placeholder='' }) => (
  <div style={{ position:'relative' }}>
    <select value={value??''} onChange={onChange} style={{
      width:'100%', padding:'9px 36px 9px 12px', borderRadius:6, fontSize:13,
      border:'1px solid #dde1e7', background:'#fff', color: value?'#111':'#aaa',
      outline:'none', cursor:'pointer', appearance:'none', boxSizing:'border-box',
    }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
      pointerEvents:'none', color:'#aaa', fontSize:11 }}>▼</span>
  </div>
)



// ── Purchase Unit Select — PetPooja style dropdown with × chip ───
// Shows selected unit as "× Kg" chip inside a dropdown trigger
function PurchaseUnitSelect({ selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)

  useEffect(()=>{
    function h(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return ()=>document.removeEventListener('mousedown', h)
  },[])

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {/* Trigger — looks like PetPooja: [ × Kg   ▼ ] */}
      <div onClick={()=>setOpen(o=>!o)} style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'7px 12px', borderRadius:6, border:`1.5px solid ${open?'#e53e3e':'#dde1e7'}`,
        background:'#fff', cursor:'pointer', minHeight:40, transition:'border-color .15s',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, flexWrap:'wrap' }}>
          {selected ? (
            <span style={{ display:'inline-flex', alignItems:'center', gap:5,
              padding:'3px 10px', borderRadius:4, fontSize:13, fontWeight:500,
              background:'#f5f5f5', color:'#333', border:'1px solid #e0e0e0' }}>
              ×&nbsp;{selected}
            </span>
          ) : (
            <span style={{ fontSize:13, color:'#aaa' }}>Select multiple unit</span>
          )}
        </div>
        <span style={{ color:'#aaa', fontSize:12, marginLeft:8, flexShrink:0 }}>▼</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:300,
          background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
          boxShadow:'0 8px 24px rgba(0,0,0,.12)', overflow:'hidden', maxHeight:260, overflowY:'auto' }}>
          {/* Clear option */}
          {selected && (
            <button type="button" onClick={()=>{ onChange(''); setOpen(false) }} style={{
              display:'block', width:'100%', padding:'9px 14px', border:'none',
              borderBottom:'1px solid #f5f5f5', background:'#fff5f5',
              color:'#e53e3e', fontSize:12, fontWeight:600, textAlign:'left', cursor:'pointer' }}>
              ✕ Clear selection
            </button>
          )}
          {UNITS.map(unit => (
            <button key={unit} type="button"
              onClick={()=>{ onChange(unit); setOpen(false) }} style={{
              display:'flex', alignItems:'center', gap:10, width:'100%',
              padding:'10px 14px', border:'none',
              borderBottom:'1px solid #f9f9f9',
              background: selected===unit ? '#fff5f5' : '#fff',
              color: selected===unit ? '#e53e3e' : '#333',
              fontSize:13, fontWeight: selected===unit ? 600 : 400,
              textAlign:'left', cursor:'pointer',
            }}
            onMouseEnter={e=>{ if(selected!==unit) e.currentTarget.style.background='#fafafa' }}
            onMouseLeave={e=>{ if(selected!==unit) e.currentTarget.style.background='#fff' }}>
              <span style={{ width:16, color:'#e53e3e', fontSize:12 }}>
                {selected===unit ? '✓' : ''}
              </span>
              {unit}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Category Input — type to search/add new ──────────────────────
function CategoryInput({ value, onChange, options, restaurantId }) {
  // typed  = input box mein jo dikhta hai (search text)
  // value  = actually selected/confirmed category (form mein jata hai)
  const [open,      setOpen]      = useState(false)
  const [typed,     setTyped]     = useState(value || '')
  const [apiCats,   setApiCats]   = useState(options || [])  // from backend
  const [creating,  setCreating]  = useState(false)
  const ref = useRef(null)

  // Load categories from backend on mount
  useEffect(() => {
    if (!restaurantId) { setApiCats(options || []); return }
    categoryApi.getAll(restaurantId)
      .then(cats => setApiCats(cats.map(c => c.name)))
      .catch(() => setApiCats(options || []))
  }, [restaurantId])

  // Jab value bahar se change ho (e.g. edit mode mein pre-fill)
  useEffect(() => { setTyped(value || '') }, [value])

  // Outside click se close
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        // Input blur pe: agar typed valid category nahi hai to revert to last confirmed value
        setTyped(value || '')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [value])

  const allCats = apiCats

  // Filter: typed se match karo
  const filtered = typed.trim()
    ? allCats.filter(c => c.toLowerCase().includes(typed.trim().toLowerCase()))
    : allCats

  // "Create new" option: sirf tab jab exact match na ho
  const exactMatch = allCats.some(c => c.toLowerCase() === typed.trim().toLowerCase())
  const canCreate  = typed.trim().length > 0 && !exactMatch

  // Category select karo — form value set karo
  function select(cat) {
    onChange(cat)   // form mein confirmed value
    setTyped(cat)   // input mein bhi wahi dikhao
    setOpen(false)
  }

  // Naya category create karo — API call karo
  async function createNew() {
    const nc = typed.trim()
    if (!nc || creating) return
    setCreating(true)
    try {
      if (restaurantId) {
        await categoryApi.create(restaurantId, nc, null)
        // Refresh list from backend
        const cats = await categoryApi.getAll(restaurantId)
        setApiCats(cats.map(c => c.name))
      } else {
        setApiCats(prev => [...prev, nc])
      }
      onChange(nc)
      setTyped(nc)
      setOpen(false)
    } catch(_) {
      // Create failed — still add locally
      setApiCats(prev => [...prev, nc])
      onChange(nc); setTyped(nc); setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  // Clear selection
  function clear(e) {
    e.stopPropagation()
    onChange('')
    setTyped('')
    setOpen(true)
  }

  const isSelected = value && value === typed
  const inputRef   = useRef(null)
  const [dropPos,  setDropPos] = useState({top:0,left:0,width:300})

  function openDrop() {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect()
      setDropPos({
        top:   r.bottom + window.scrollY + 4,
        left:  r.left   + window.scrollX,
        width: r.width,
      })
    }
    setOpen(true)
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>

      {/* Input trigger */}
      <div ref={inputRef} style={{ position:'relative' }}>
        <input
          value={typed}
          onChange={e => {
            setTyped(e.target.value)
            // Typing ke dauran form value clear karo — sirf select/create pe confirm hoga
            if (e.target.value === '') onChange('')
            setOpen(true)
          }}
          onFocus={() => openDrop()}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); setTyped(value||'') }
            if (e.key === 'Enter') {
              e.preventDefault()
              if (canCreate) createNew()
              else if (filtered.length === 1) select(filtered[0])
            }
          }}
          placeholder="Select/Add Category"
          style={{
            width:'100%', padding:'9px 64px 9px 12px', borderRadius:6, fontSize:13,
            border:`1.5px solid ${isSelected ? '#10b981' : open ? '#e53e3e' : '#dde1e7'}`,
            outline:'none', boxSizing:'border-box', color:'#111', transition:'border-color .15s',
            background: isSelected ? '#f0fdf4' : '#fff',
          }}
        />

        {/* Right icons */}
        <div style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
          display:'flex', alignItems:'center', gap:4 }}>
          {/* Clear button — only when something selected */}
          {value && (
            <span onClick={clear} style={{ fontSize:14, color:'#aaa', cursor:'pointer',
              lineHeight:1, padding:'0 2px' }}>×</span>
          )}
          {/* Selected checkmark badge */}
          {isSelected && (
            <span style={{ fontSize:10, padding:'1px 6px', borderRadius:20, fontWeight:700,
              background:'#dcfce7', color:'#16a34a' }}>✓</span>
          )}
          {/* Arrow */}
          <span onClick={() => open ? setOpen(false) : openDrop()}
            style={{ fontSize:11, color:'#aaa', cursor:'pointer', userSelect:'none' }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Dropdown — position:fixed to escape Section overflow:hidden */}
      {open && (
        <div style={{
          position:'fixed',
          top:   dropPos.top,
          left:  dropPos.left,
          width: dropPos.width,
          zIndex:9999,
          background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
          boxShadow:'0 8px 32px rgba(0,0,0,.14)', maxHeight:240, overflowY:'auto',
        }}>

          {/* Create new — top mein */}
          {canCreate && (
            <button type="button" onMouseDown={e => { e.preventDefault(); createNew() }}
              style={{ display:'flex', alignItems:'center', gap:8, width:'100%',
                padding:'10px 14px', border:'none', borderBottom:'1px solid #f0f0f0',
                background:'#fff5f5', cursor:'pointer', fontSize:13,
                color:'#e53e3e', fontWeight:600, textAlign:'left' }}>
              <span style={{ fontSize:15 }}>＋</span>
              <span>"{typed.trim()}" — naya category banao</span>
            </button>
          )}

          {/* Existing options */}
          {filtered.length > 0 ? filtered.map(cat => {
            const isSel = cat === value
            return (
              <button key={cat} type="button"
                onMouseDown={e => { e.preventDefault(); select(cat) }}
                style={{
                  display:'flex', alignItems:'center', gap:10, width:'100%',
                  padding:'10px 14px', border:'none',
                  background: isSel ? '#f0fdf4' : '#fff',
                  cursor:'pointer', fontSize:13,
                  color: isSel ? '#16a34a' : '#333',
                  fontWeight: isSel ? 600 : 400,
                  textAlign:'left', borderBottom:'1px solid #f8f8f8',
                }}
                onMouseEnter={e => { if(!isSel) e.currentTarget.style.background='#fafafa' }}
                onMouseLeave={e => { if(!isSel) e.currentTarget.style.background='#fff' }}>
                <span style={{ width:16, fontSize:12, color:'#16a34a', flexShrink:0 }}>
                  {isSel ? '✓' : ''}
                </span>
                {cat}
              </button>
            )
          }) : (
            !canCreate && (
              <div style={{ padding:'16px', textAlign:'center', color:'#aaa', fontSize:12 }}>
                Koi category nahi mili
              </div>
            )
          )}
        </div>
      )}

      {/* Helper text */}
      {value && (
        <div style={{ marginTop:4, fontSize:11, color:'#16a34a', display:'flex', alignItems:'center', gap:4 }}>
          <span>✓</span> <span style={{ fontWeight:500 }}>{value}</span> selected
        </div>
      )}
      {!value && typed && !open && (
        <div style={{ marginTop:4, fontSize:11, color:'#f59e0b' }}>
          ⚠ Category confirm nahi hua — list se select karo ya Enter dabao
        </div>
      )}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────
const Section = ({ icon, title, children, collapsible=false, defaultOpen=true }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ border:'1px solid #e8eaed', borderRadius:10, overflow:'visible',
      marginBottom:14, background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
      <div onClick={collapsible?()=>setOpen(o=>!o):undefined}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px', borderBottom: open?'1px solid #f0f0f0':'none',
          cursor:collapsible?'pointer':'default',
          background: open?'#fff':'#fafafa',
        }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16 }}>{icon}</span>
          <span style={{ fontSize:14, fontWeight:700, color:'#1a1a2e' }}>{title}</span>
        </div>
        {collapsible && (
          <span style={{ fontSize:12, color:'#aaa', transform:open?'rotate(0)':'rotate(-90deg)',
            transition:'transform .2s' }}>▼</span>
        )}
      </div>
      {open && <div style={{ padding:'0 20px' }}>{children}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// ADD / EDIT FORM  (full page — PetPooja style)
// ════════════════════════════════════════════════════════════════
function RawMaterialForm({ initial, onSave, onCancel, rid }) {
  const [form, setForm] = useState(initial || BLANK_FORM)
  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const u = f => e => upd(f, e.target.value)

  return (
    <div style={{ background:'#f8f9fb', minHeight:'100%' }}>
      {/* Form header */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8eaed',
        padding:'16px 20px', marginBottom:20,
        display:'flex', alignItems:'center', gap:16 }}>
        <button onClick={onCancel} style={{ background:'none', border:'none',
          fontSize:20, cursor:'pointer', color:'#888', lineHeight:1 }}>←</button>
        <h2 style={{ fontSize:18, fontWeight:700, color:'#1a1a2e', margin:0 }}>
          {initial?.id ? 'Edit Raw Material' : 'Add Raw Material'}
        </h2>
      </div>

      <div style={{ maxWidth:780, margin:'0 auto', padding:'0 24px 100px' }}>

        {/* ── BASIC DETAILS ── */}
        <Section icon="📦" title="Basic Details">

          {/* Name */}
          <FRow label="Name" required>
            <FInput value={form.name} onChange={u('name')} placeholder="e.g. Tomatoes"/>
          </FRow>

          {/* Purchase Unit — PetPooja style: dropdown with × chip inside */}
          <FRow label="Purchase Unit" required>
            <PurchaseUnitSelect
              selected={form.purchaseUnit}
              onChange={val=>upd('purchaseUnit', val)}
            />
          </FRow>

          {/* Consumption Unit */}
          <FRow label="Consumption Unit" required>
            <FSelect value={form.consumptionUnit}
              onChange={e=>{
                const v = e.target.value
                setForm(p=>({...p, consumptionUnit:v, minStockUnit:v, atParUnit:v}))
              }}
              options={UNITS} placeholder="Select Unit"/>
            <p style={{ fontSize:11, color:'#888', marginTop:6, display:'flex', gap:6,
              alignItems:'flex-start' }}>
              <span style={{ color:'#888', fontSize:13, marginTop:1 }}>ⓘ</span>
              Transactional data may change if a purchase or consumption unit is changed.
            </p>
          </FRow>

          {/* Conversion box — only when Purchase Unit & Consumption Unit are both set AND different */}
          {form.purchaseUnit && form.consumptionUnit && form.purchaseUnit !== form.consumptionUnit && (
            <div style={{ margin:'4px 0 10px', padding:'16px 18px',
              border:'1px solid #e8eaed', borderRadius:8, background:'#fafafa' }}>
              <p style={{ fontSize:13, color:'#444', marginBottom:12, fontWeight:500 }}>
                Purchase unit and consumption unit of{' '}
                <strong>{form.name||'this item'}</strong> are related as follows:
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:13, color:'#333' }}>
                  One <strong>{form.purchaseUnit}</strong> (Purchase unit) of{' '}
                  <strong>{form.name||'item'}</strong> is equivalent to
                </span>
                <input
                  type="number"
                  value={form.conversionFactor||''}
                  onChange={e=>upd('conversionFactor', e.target.value)}
                  placeholder="e.g. 1000"
                  min="0"
                  style={{ width:120, padding:'7px 10px', borderRadius:6, fontSize:13,
                    border:'1px solid #dde1e7', outline:'none', textAlign:'center',
                    color:'#111', background:'#fff' }}
                  onFocus={e=>e.target.style.borderColor='#e53e3e'}
                  onBlur={e=>e.target.style.borderColor='#dde1e7'}
                />
                <span style={{ fontSize:13, color:'#333' }}>
                  <strong>{form.consumptionUnit}</strong> (consumption unit).
                </span>
              </div>
            </div>
          )}

          {/* Category */}
          <FRow label="Category">
            <CategoryInput
              value={form.category}
              onChange={val=>upd('category',val)}
              options={CATEGORIES}
              restaurantId={rid}
            />
          </FRow>

        </Section>

                {/* ── PRICES ── */}
        <Section icon="💰" title="Prices">
          <FRow label="Purchase Price">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:'#888', fontSize:14, fontWeight:500 }}>₹</span>
              <FInput type="number" value={form.purchasePrice} onChange={u('purchasePrice')} placeholder="0.00"/>
            </div>
          </FRow>
          <FRow label="Transfer Price">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:'#888', fontSize:14, fontWeight:500 }}>₹</span>
              <FInput type="number" value={form.transferPrice} onChange={u('transferPrice')} placeholder="0.00"/>
            </div>
          </FRow>
          <FRow label="Reconciliation Price">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:'#888', fontSize:14, fontWeight:500 }}>₹</span>
              <FInput type="number" value={form.reconciliationPrice} onChange={u('reconciliationPrice')} placeholder="0.00"/>
            </div>
          </FRow>
        </Section>

        {/* ── TAXES ── */}
        <Section icon="%" title="Taxes">
          <FRow label="TAX Type">
            <div style={{ display:'flex', gap:24 }}>
              {['GST','VAT'].map(t => (
                <label key={t} style={{ display:'flex', alignItems:'center', gap:8,
                  cursor:'pointer', fontSize:13, color:'#333' }}>
                  <div onClick={()=>upd('taxType',t)} style={{
                    width:18, height:18, borderRadius:50,
                    border:`2px solid ${form.taxType===t?'#e53e3e':'#ccc'}`,
                    background:form.taxType===t?'#e53e3e':'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', transition:'all .15s',
                  }}>
                    {form.taxType===t && <div style={{ width:6,height:6,borderRadius:50,background:'#fff' }}/>}
                  </div>
                  {t}
                </label>
              ))}
            </div>
          </FRow>
          <FRow label="Tax (%)">
            <FInput type="number" value={form.tax} onChange={u('tax')} placeholder="0"/>
          </FRow>
        </Section>

        {/* ── SET LEVELS ── */}
        <Section icon="📊" title="Set levels">
          {/* Min stock */}
          <FRow label="Minimum Stock Level Unit">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                {/* Synced from Consumption Unit — readonly display */}
                <div style={{ padding:'9px 12px', borderRadius:6, fontSize:13,
                  border:'1px solid #dde1e7', background:'#f8fafc',
                  color: form.minStockUnit ? '#111' : '#aaa',
                  display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span>{form.minStockUnit || 'Select Consumption Unit first'}</span>
                  {form.minStockUnit && (
                    <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20,
                      background:'#dbeafe', color:'#2563eb', fontWeight:600 }}>
                      auto
                    </span>
                  )}
                </div>
                <p style={{ fontSize:10, color:'#aaa', marginTop:4 }}>
                  Consumption Unit se auto-set hota hai
                </p>
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, color:'#888', marginBottom:4 }}>
                  Minimum Stock Level
                </label>
                <FInput type="number" value={form.minStockLevel} onChange={u('minStockLevel')} placeholder="0"/>
              </div>
            </div>
          </FRow>

          {/* At par stock */}
          <FRow label="At Par Stock Level Unit">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div style={{ padding:'9px 12px', borderRadius:6, fontSize:13,
                  border:'1px solid #dde1e7', background:'#f8fafc',
                  color: form.atParUnit ? '#111' : '#aaa',
                  display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span>{form.atParUnit || 'Select Consumption Unit first'}</span>
                  {form.atParUnit && (
                    <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20,
                      background:'#dbeafe', color:'#2563eb', fontWeight:600 }}>
                      auto
                    </span>
                  )}
                </div>
                <p style={{ fontSize:10, color:'#aaa', marginTop:4 }}>
                  Consumption Unit se auto-set hota hai
                </p>
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, color:'#888', marginBottom:4 }}>
                  At Par Stock Level
                </label>
                <FInput type="number" value={form.atParLevel} onChange={u('atParLevel')} placeholder="0"/>
              </div>
            </div>
          </FRow>

          {/* Closing stock frequency */}
          <FRow label="Closing stock being updated on">
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['Daily','Weekly','Monthly'].map(f => {
                const sel = (form.closingStockFrequency||[]).includes(f)
                return (
                  <button key={f} type="button" onClick={()=>{
                    const cur = form.closingStockFrequency||[]
                    upd('closingStockFrequency', sel ? cur.filter(x=>x!==f) : [...cur,f])
                  }} style={{
                    padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600,
                    cursor:'pointer', border:'none', transition:'all .15s',
                    background: sel?'#e53e3e':'#f0f0f0',
                    color: sel?'#fff':'#666',
                  }}>
                    {sel && '× '}{f}
                  </button>
                )
              })}
            </div>
          </FRow>

          {/* Checkboxes */}
          <div style={{ padding:'14px 0' }}>
            {[
              ['allowRestockLevel','Allow Restock Level','ⓘ'],
              ['addOpeningStock','Add opening stock and Avg purchase price',null],
            ].map(([field, label, info]) => (
              <label key={field} style={{ display:'flex', alignItems:'center', gap:10,
                cursor:'pointer', marginBottom:10 }}>
                <div onClick={()=>upd(field,!form[field])} style={{
                  width:18, height:18, borderRadius:4,
                  border:`2px solid ${form[field]?'#e53e3e':'#ccc'}`,
                  background:form[field]?'#e53e3e':'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', transition:'all .15s', flexShrink:0,
                }}>
                  {form[field] && <span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>✓</span>}
                </div>
                <span style={{ fontSize:13, color: form.addOpeningStock&&field==='addOpeningStock'?'#aaa':'#333' }}>
                  {label}
                </span>
                {info && <span style={{ fontSize:11, color:'#aaa' }}>{info}</span>}
              </label>
            ))}
            {form.addOpeningStock && (
              <p style={{ fontSize:11, color:'#aaa', marginLeft:28, lineHeight:1.5 }}>
                The "Opening Stock" and "Average Purchase Price" fields are already added
                and therefore cannot be edited.
              </p>
            )}
          </div>
        </Section>

        {/* ── MAX STOCK LEVEL (collapsible) ── */}
        <Section icon="📈" title="For Maximum Stock Level" collapsible defaultOpen={false}>
          <FRow label="Max Stock Level Unit">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <FSelect value={form.maxStockUnit} onChange={u('maxStockUnit')}
                options={UNITS} placeholder="Select Unit"/>
              <div>
                <label style={{ display:'block', fontSize:11, color:'#888', marginBottom:4 }}>Max Stock Level</label>
                <FInput type="number" value={form.maxStockLevel} onChange={u('maxStockLevel')} placeholder="0"/>
              </div>
            </div>
          </FRow>
        </Section>

        {/* ── RELATED CODES ── */}
        <Section icon="🔢" title="Related Codes">
          <FRow label="Barcode/Short Code:">
            <FInput value={form.barcode} onChange={u('barcode')} placeholder="Scan or type barcode"/>
          </FRow>
          <FRow label="HSN Code">
            <FInput value={form.hsnCode} onChange={u('hsnCode')} placeholder="e.g. 0702"/>
          </FRow>
        </Section>

        {/* ── OTHER DETAILS ── */}
        <Section icon="⚙️" title="Other Details">
          <FRow label="Exclusive to this restaurant"
            hint="This raw material is restricted for use only by this specific restaurant and not shared with others.">
            <FSelect value={form.exclusive} onChange={u('exclusive')} options={['No','Yes']}/>
          </FRow>
          <FRow label="Is Expiry">
            <FSelect value={form.isExpiry} onChange={u('isExpiry')} options={['No','Yes']}/>
          </FRow>
          <FRow label="Allow Decimal Quantity">
            <div style={{ display:'flex', gap:24 }}>
              {['Yes','No'].map(v => (
                <label key={v} style={{ display:'flex', alignItems:'center', gap:8,
                  cursor:'pointer', fontSize:13, color:'#333' }}>
                  <div onClick={()=>upd('allowDecimal', v==='Yes')} style={{
                    width:18, height:18, borderRadius:50,
                    border:`2px solid ${(form.allowDecimal&&v==='Yes')||(!form.allowDecimal&&v==='No')?'#e53e3e':'#ccc'}`,
                    background:(form.allowDecimal&&v==='Yes')||(!form.allowDecimal&&v==='No')?'#e53e3e':'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s',
                  }}>
                    {((form.allowDecimal&&v==='Yes')||(!form.allowDecimal&&v==='No')) &&
                      <div style={{ width:6,height:6,borderRadius:50,background:'#fff' }}/>}
                  </div>
                  {v}
                </label>
              ))}
            </div>
          </FRow>
          <FRow label="Description">
            <textarea value={form.description||''} onChange={u('description')}
              rows={4} placeholder="Optional description..."
              style={{ width:'100%', padding:'9px 12px', borderRadius:6, fontSize:13,
                border:'1px solid #dde1e7', resize:'vertical', outline:'none',
                boxSizing:'border-box', fontFamily:'inherit', color:'#111' }}
              onFocus={e=>e.target.style.borderColor='#e53e3e'}
              onBlur={e=>e.target.style.borderColor='#dde1e7'}
            />
          </FRow>
          <FRow label="Normal loss (%)">
            <FInput type="number" value={form.normalLoss} onChange={u('normalLoss')} placeholder="0"/>
          </FRow>
        </Section>

        {/* ── EXCISE REPORT (collapsible) ── */}
        <Section icon="📋" title="For Excise Report" collapsible defaultOpen={false}>
          <FRow label="Quantity (in gm/ml)">
            <FInput type="number" value={form.exciseQuantity||''} onChange={u('exciseQuantity')} placeholder="e.g. 750"/>
          </FRow>
          <FRow label="GTIN">
            <FInput value={form.exciseGtin||''} onChange={u('exciseGtin')} placeholder="Global Trade Item Number"/>
          </FRow>
          <FRow label="Brand">
            <FInput value={form.exciseBrand||''} onChange={u('exciseBrand')} placeholder="Brand name"/>
          </FRow>
        </Section>
      </div>

      {/* ── Sticky bottom bar ── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100,
        background:'#fff5f5', borderTop:'1px solid #fecaca',
        padding:'12px 32px', display:'flex', justifyContent:'flex-end', gap:12 }}>
        <button onClick={onCancel} style={{
          padding:'10px 24px', borderRadius:7, border:'1px solid #dde1e7',
          background:'#fff', color:'#555', fontSize:13, fontWeight:500, cursor:'pointer',
        }}>Cancel</button>
        <button onClick={()=>onSave(form)} style={{
          padding:'10px 28px', borderRadius:7, border:'none',
          background:'#e53e3e', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
          boxShadow:'0 2px 8px rgba(229,62,62,.35)',
        }}>Save Changes</button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// LIST VIEW — Raw Materials Management
// ════════════════════════════════════════════════════════════════
function RawMaterialsList({ rid, onAdd, onEdit }) {
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

  const TH = {
    padding:'10px 14px', textAlign:'left', fontSize:11, color:'#888',
    fontWeight:600, borderBottom:'1px solid #eee', background:'#fafafa',
    whiteSpace:'nowrap'
  }
  const TD = { padding:'10px 14px', fontSize:13, borderBottom:'1px solid #f5f5f5', verticalAlign:'middle' }

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

// ════════════════════════════════════════════════════════════════
// MAIN EXPORT — switches between List and Form
// ════════════════════════════════════════════════════════════════
export default function RawMaterials() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()
  const [view,    setView]    = useState('list')  // 'list' | 'add' | 'edit'
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)

  async function handleSave(form) {
    setSaving(true)
    try {
      // Map form to API payload
      const payload = {
        name:           form.name,
        category:       form.category,
        unit:           form.consumptionUnit || form.purchaseUnit,
        purchasePrice:  Number(form.purchasePrice)||0,
        costPerUnit:    Number(form.purchasePrice)||0,
        reorderLevel:   Number(form.minStockLevel)||5,
        restaurantId:   rid,
      }
      if (editing?.id) {
        // update
        toast.success('✅ Raw material updated!')
      } else {
        await inventoryApi.addPurchase({ ...payload, quantity:0, productId:null })
        toast.success('✅ Raw material added!')
      }
      setView('list'); setEditing(null)
    } catch(_) {
      toast.error('Save failed')
    } finally { setSaving(false) }
  }

  if (view === 'list') {
    return (
      <RawMaterialsList
        rid={rid}
        onAdd={()=>{ setEditing(null); setView('add') }}
        onEdit={item=>{ setEditing(item); setView('edit') }}
      />
    )
  }

  return (
    <RawMaterialForm
      initial={editing ? {
        ...BLANK_FORM,
        name:           editing.name||'',
        category:       editing.category||'',
        purchaseUnit:   editing.unit||editing.purchaseUnit||'',
        consumptionUnit:editing.unit||editing.consumptionUnit||'',
        purchasePrice:  String(editing.purchasePrice||editing.costPerUnit||''),
        minStockLevel:  String(editing.reorderLevel||''),
      } : null}
      onSave={handleSave}
      onCancel={()=>{ setView('list'); setEditing(null) }}
    />
  )
}
