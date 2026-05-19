// src/components/inventory/RawMaterialShared.jsx
import { useState, useEffect, useRef } from 'react'
import { categoryApi } from '../../api/inventoryApi'

export const UNITS = ['kg','gm','ltr','ml','pcs','dozen','box','bag','bottle','packet']
export const CATEGORIES = ['Drink','Vegetable','Dairy','Grocery','Sauces','Spices','Bakery','Meat','Seafood','Other']

export const BLANK_FORM = {
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

export const FRow = ({ label, required, children, hint }) => (
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

export const FInput = ({ value, onChange, type='text', placeholder='', disabled=false }) => (
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

export const FSelect = ({ value, onChange, options, placeholder='' }) => (
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

export function PurchaseUnitSelect({ selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)

  useEffect(()=>{
    function h(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return ()=>document.removeEventListener('mousedown', h)
  },[])

  return (
    <div ref={ref} style={{ position:'relative' }}>
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

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:300,
          background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
          boxShadow:'0 8px 24px rgba(0,0,0,.12)', overflow:'hidden', maxHeight:260, overflowY:'auto' }}>
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

export function CategoryInput({ value, onChange, options, restaurantId }) {
  const [open,      setOpen]      = useState(false)
  const [typed,     setTyped]     = useState(value || '')
  const [apiCats,   setApiCats]   = useState(options || [])
  const [creating,  setCreating]  = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!restaurantId) { setApiCats(options || []); return }
    categoryApi.getAll(restaurantId)
      .then(cats => setApiCats(cats.map(c => c.name)))
      .catch(() => setApiCats(options || []))
  }, [restaurantId])

  useEffect(() => { setTyped(value || '') }, [value])

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setTyped(value || '')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [value])

  const allCats = apiCats

  const filtered = typed.trim()
    ? allCats.filter(c => c.toLowerCase().includes(typed.trim().toLowerCase()))
    : allCats

  const exactMatch = allCats.some(c => c.toLowerCase() === typed.trim().toLowerCase())
  const canCreate  = typed.trim().length > 0 && !exactMatch

  function select(cat) {
    onChange(cat)
    setTyped(cat)
    setOpen(false)
  }

  async function createNew() {
    const nc = typed.trim()
    if (!nc || creating) return
    setCreating(true)
    try {
      if (restaurantId) {
        await categoryApi.create(restaurantId, nc, null)
        const cats = await categoryApi.getAll(restaurantId)
        setApiCats(cats.map(c => c.name))
      } else {
        setApiCats(prev => [...prev, nc])
      }
      onChange(nc)
      setTyped(nc)
      setOpen(false)
    } catch(_) {
      setApiCats(prev => [...prev, nc])
      onChange(nc); setTyped(nc); setOpen(false)
    } finally {
      setCreating(false)
    }
  }

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

      <div ref={inputRef} style={{ position:'relative' }}>
        <input
          value={typed}
          onChange={e => {
            setTyped(e.target.value)
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

        <div style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
          display:'flex', alignItems:'center', gap:4 }}>
          {value && (
            <span onClick={clear} style={{ fontSize:14, color:'#aaa', cursor:'pointer',
              lineHeight:1, padding:'0 2px' }}>×</span>
          )}
          {isSelected && (
            <span style={{ fontSize:10, padding:'1px 6px', borderRadius:20, fontWeight:700,
              background:'#dcfce7', color:'#16a34a' }}>✓</span>
          )}
          <span onClick={() => open ? setOpen(false) : openDrop()}
            style={{ fontSize:11, color:'#aaa', cursor:'pointer', userSelect:'none' }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </div>

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

export const Section = ({ icon, title, children, collapsible=false, defaultOpen=true }) => {
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
