import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable, SkeletonGrid } from '../components/Skeleton'

const TABS = [
  { key:'products',   icon:'🍽️', label:'Menu Items'  },
  { key:'categories', icon:'📋', label:'Categories'  },
  { key:'variants',   icon:'🔀', label:'Variants'    },
  { key:'addons',     icon:'➕', label:'Addons'      },
  { key:'discounts',  icon:'🏷️', label:'Discounts'   },
  { key:'tables',     icon:'🪑', label:'Tables/Area' },
]

function fmt(n) { return '₹'+(Number(n)||0).toLocaleString('en-IN') }

// ── Reusable UI ────────────────────────────────────────────────────────────
function Inp({ label, value, onChange, type='text', placeholder='', required=false, style={} }) {
  return (
    <div style={{ marginBottom:12, ...style }}>
      <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>
        {label}{required && <span style={{ color:'#ef4444' }}> *</span>}
      </label>
      <input type={type} value={value??''} onChange={onChange} placeholder={placeholder}
        style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
          background:'var(--bg-page)', color:'var(--text)', fontSize:13, boxSizing:'border-box' }} />
    </div>
  )
}

function Sel({ label, value, onChange, options=[], required=false }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>
        {label}{required && <span style={{ color:'#ef4444' }}> *</span>}
      </label>
      <select value={value??''} onChange={onChange}
        style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
          background:'var(--bg-page)', color:'var(--text)', fontSize:13 }}>
        {options.map(o => <option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
      </select>
    </div>
  )
}

function Chk({ label, checked, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, cursor:'pointer', marginBottom:10 }}>
      <input type="checkbox" checked={!!checked} onChange={onChange} />
      {label}
    </label>
  )
}

function Modal({ title, onClose, onSubmit, saving, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, width:'100%',
        maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border)' }}>
          <h3 style={{ fontWeight:700, fontSize:15 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20,
            cursor:'pointer', color:'var(--text-muted)' }}>✕</button>
        </div>
        <form onSubmit={onSubmit} style={{ padding:'1.25rem 1.5rem' }}>
          {children}
          <div style={{ display:'flex', gap:8, marginTop:'1rem', paddingTop:'1rem',
            borderTop:'1px solid var(--border)' }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'9px', borderRadius:8,
              border:'1px solid var(--border)', background:'transparent', color:'var(--text)', cursor:'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex:2, padding:'9px', borderRadius:8,
              border:'none', background:'var(--accent)', color:'#fff', fontWeight:600,
              cursor:saving?'not-allowed':'pointer' }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatusBadge({ active, labels=['Active','Inactive'] }) {
  return (
    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
      background: active ? '#10b98122' : '#ef444422',
      color: active ? '#10b981' : '#ef4444' }}>
      {active ? labels[0] : labels[1]}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════
// PRODUCTS TAB — PetPooja exact layout
// ════════════════════════════════════════════════════════════════

function groupProducts(items) {
  const groups = [], seen = new Set()
  items.forEach(p => {
    if (seen.has(p.id)) return
    const lastWord = p.name.trim().split(' ').pop()
    const siblings = items.filter(o =>
      !seen.has(o.id) && o.id !== p.id &&
      o.categoryId === p.categoryId &&
      o.name.trim().endsWith(lastWord)
    )
    if (siblings.length > 0) {
      const all = [p, ...siblings]
      all.forEach(x => seen.add(x.id))
      groups.push({ isGroup:true, baseName:lastWord, items:all })
    } else {
      seen.add(p.id)
      groups.push({ isGroup:false, items:[p] })
    }
  })
  return groups
}

function blankRow(categories, rid, catId) {
  return {
    name:'', shortCode:'', displayName:'', categoryId:catId||categories[0]?.id||'',
    price:'0', description:'', dietary:'VEG', gstType:'SERVICES',
    available:true, active:true,
    productVariants:[], addonGroupIds:[], restaurantId:rid,
    _variantId:'', _variantPrice:'', _addonGroupId:'',
  }
}

function productToForm(p) {
  return {
    ...p,
    price: String(p.price||'0'),
    stockQuantity: String(p.stockQuantity||''),
    productVariants:(p.productVariants||[]).map(pv=>({variantId:pv.variant?.id??pv.variantId,price:pv.price??0})),
    addonGroupIds:(p.addonGroups||[]).map(a=>a.id),
    _variantId:'', _variantPrice:'', _addonGroupId:'',
  }
}

function ProductsTab({ rid, categories }) {
  const toast = useToast()
  const [items,       setItems]       = useState([])
  const [variants,    setVariants]    = useState([])
  const [addonGroups, setAddonGroups] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [saving,      setSaving]      = useState(false)
  const [expanded,    setExpanded]    = useState(new Set())
  const [selCat,      setSelCat]      = useState('ALL')
  const [view,        setView]        = useState('list')  // 'list' | 'addItems'
  const [editItem,    setEditItem]    = useState(null)
  const [rows,        setRows]        = useState([])
  const [viewItem,    setViewItem]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r,v,a] = await Promise.allSettled([
        api.get(`/products?restaurantId=${rid}&size=200`),
        api.get(`/variants?restaurantId=${rid}`),
        api.get(`/addon-groups?restaurantId=${rid}`),
      ])
      setItems(r.value?.content||(Array.isArray(r.value)?r.value:[]))
      setVariants(Array.isArray(v.value)?v.value:[])
      setAddonGroups(Array.isArray(a.value)?a.value:[])
    } catch(_){setItems([])} finally{setLoading(false)}
  }, [rid])

  useEffect(()=>{ load() },[])

  function goAdd() {
    setEditItem(null)
    setRows([blankRow(categories,rid,selCat!=='ALL'?selCat:null),
             blankRow(categories,rid,selCat!=='ALL'?selCat:null)])
    setView('addItems')
  }
  function goEdit(p) { setEditItem(p); setRows([productToForm(p)]); setView('addItems') }
  function goBack() { setView('list'); setEditItem(null); setRows([]) }

  function upd(i,f,v){ setRows(rs=>rs.map((r,idx)=>idx===i?{...r,[f]:v}:r)) }

  function addVariantToRow(i, variantsList) {
    setRows(rs=>rs.map((r,idx)=>{
      if(idx!==i) return r
      const vid=Number(r._variantId)
      if(!vid) return r
      if((r.productVariants||[]).some(pv=>pv.variantId===vid)) return r
      const variantDefault = variantsList.find(v=>v.id===vid)?.price || 0
      const vp = r._variantPrice!==''&&r._variantPrice!=null
        ? Number(r._variantPrice)
        : variantDefault
      const pvs=[...(r.productVariants||[]),{variantId:vid,price:vp}]
      // Price blank when variants present — item price depends on variant
      return{...r,productVariants:pvs,price:'',_variantId:'',_variantPrice:''}
    }))
  }
  function removeVariantFromRow(i,vid){
    setRows(rs=>rs.map((r,idx)=>idx!==i?r:{...r,productVariants:(r.productVariants||[]).filter(pv=>pv.variantId!==vid)}))
  }
  function addAddonToRow(i){
    setRows(rs=>rs.map((r,idx)=>{
      if(idx!==i) return r
      const aid=Number(r._addonGroupId)
      if(!aid||(r.addonGroupIds||[]).includes(aid)) return r
      return{...r,addonGroupIds:[...(r.addonGroupIds||[]),aid],_addonGroupId:''}
    }))
  }
  function removeAddonFromRow(i,aid){
    setRows(rs=>rs.map((r,idx)=>idx!==i?r:{...r,addonGroupIds:(r.addonGroupIds||[]).filter(x=>x!==aid)}))
  }

  async function handleSave(exitAfter) {
    const invalid=rows.find(r=>!r.name?.trim())
    if(invalid){toast.error('Item naam required hai');return}
    const pendingVariant=rows.find(r=>r._variantId)
    if(pendingVariant){
      toast.error(`"${pendingVariant.name||'Item'}" mein variant select hua hai but Add nahi kiya — "+ Add Variation" click karo ya × se clear karo`)
      return
    }
    setSaving(true)
    try {
      if(editItem) {
        const r=rows[0]
        await api.put(`/products/${editItem.id}`,{
          name:r.name.trim(), description:r.description, price:Number(r.price)||0,
          shortCode:r.shortCode||'', displayName:r.displayName||'', gstType:r.gstType||'SERVICES',
          categoryId:Number(r.categoryId), available:r.available, restaurantId:rid,
          productVariants:(r.productVariants||[]).map(pv=>({variantId:Number(pv.variantId),price:Number(pv.price)||0})),
          addonGroupIds:(r.addonGroupIds||[]).map(Number),
        })
        toast.success('Updated!')
      } else {
        const valid=rows.filter(r=>r.name?.trim())
        await Promise.all(valid.map(r=>{
          const payload = {
            name:r.name.trim(), description:r.description, price:Number(r.price)||0,
            shortCode:r.shortCode||'', displayName:r.displayName||'', gstType:r.gstType||'SERVICES',
            categoryId:Number(r.categoryId), available:r.available, active:true, restaurantId:rid,
            productVariants:(r.productVariants||[]).map(pv=>({variantId:Number(pv.variantId),price:Number(pv.price)||0})),
            addonGroupIds:(r.addonGroupIds||[]).map(Number),
          }
          return api.post('/products', payload)
        }))
        toast.success(`${valid.length} items saved!`)
        if(!exitAfter){
          setRows([blankRow(categories,rid,selCat!=='ALL'?selCat:null),
                   blankRow(categories,rid,selCat!=='ALL'?selCat:null)])
          load(); return
        }
      }
      load(); goBack()
    } catch(_){toast.error('Save failed')} finally{setSaving(false)}
  }

  async function toggle(item) {
    try {
      await api.patch(`/products/${item.id}/availability?available=${!item.available}`)
      setItems(ps=>ps.map(p=>p.id===item.id?{...p,available:!p.available}:p))
    } catch(_){toast.error('Failed')}
  }
  async function del(item) {
    if(!confirm(`"${item.name}" delete karna chahte hain?`)) return
    try{await api.delete(`/products/${item.id}`);toast.success('Deleted');load()}
    catch(_){toast.error('Delete failed')}
  }

  const catMap=Object.fromEntries(categories.map(c=>[c.id,c.name]))
  const catCount={}
  items.forEach(p=>{catCount[p.categoryId]=(catCount[p.categoryId]||0)+1})
  const filtered=items.filter(p=>
    (!search||p.name?.toLowerCase().includes(search.toLowerCase()))&&
    (selCat==='ALL'||String(p.categoryId)===String(selCat))
  )
  const groups=groupProducts(filtered)

  const TH={padding:'9px 12px',textAlign:'left',fontSize:11,color:'#777',fontWeight:600,
    borderBottom:'1px solid #e5e7eb',background:'#f9fafb',whiteSpace:'nowrap'}
  const TD={padding:'9px 10px',fontSize:13,borderBottom:'1px solid #f0f0f0',verticalAlign:'top'}
  const INP={padding:'6px 8px',borderRadius:4,border:'1px solid #ddd',fontSize:13,
    color:'#111',background:'#fff',outline:'none',width:'100%',boxSizing:'border-box'}
  const SEL={...INP,cursor:'pointer'}
  const BTN_RED={padding:'7px 18px',borderRadius:4,border:'none',background:'#e53e3e',
    color:'#fff',fontWeight:600,fontSize:13,cursor:'pointer'}
  const BTN_OUT={padding:'7px 18px',borderRadius:4,border:'1px solid #ddd',
    background:'#fff',color:'#444',fontSize:13,cursor:'pointer'}
  const AB={background:'#fafafa',border:'1px solid #e5e7eb',borderRadius:3,
    padding:'3px 7px',cursor:'pointer',fontSize:12,color:'#555'}

  // ══════ ADD / EDIT PAGE ══════
  if (view==='addItems') return (
    <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'10px 16px',borderBottom:'1px solid #e5e7eb',background:'#fafafa',
        display:'flex',justifyContent:'flex-end',alignItems:'center',gap:10}}>
        <button onClick={()=>handleSave(true)} disabled={saving} style={BTN_RED}>
          {saving?'Saving...':'Save & Exit'}
        </button>
        {!editItem&&(
          <button onClick={()=>handleSave(false)} disabled={saving} style={BTN_OUT}>
            Save & Add Menu Items
          </button>
        )}
        <button onClick={goBack} style={BTN_OUT}>← Back</button>
      </div>

      {/* Column headers */}
      <div style={{overflowX:'auto',borderBottom:'1px solid #e5e7eb',background:'#f9fafb'}}>
        <div style={{display:'grid',
          gridTemplateColumns:'160px 100px 150px 160px 90px 160px 110px 120px 190px 70px 70px',
          minWidth:1400,padding:'0 16px'}}>
          {['Name *','Short Code *','Online Display Name','Category *','Price *',
            'Description','Dietary','GST Type','Order Type','Variation','Addon'].map(h=>(
            <div key={h} style={{...TH,borderBottom:'none',paddingBottom:8}}>{h}</div>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div style={{overflowY:'auto',maxHeight:'calc(100vh - 280px)'}}>
        {rows.map((row,i)=>(
          <div key={i} style={{borderBottom:'3px solid #f0f0f0'}}>
            {/* Main fields */}
            <div style={{overflowX:'auto',padding:'12px 16px 0'}}>
              <div style={{display:'grid',
                gridTemplateColumns:'160px 100px 150px 160px 90px 160px 110px 120px 190px 70px 70px',
                minWidth:1400,gap:'0 8px',alignItems:'start'}}>

                <input value={row.name} onChange={e=>upd(i,'name',e.target.value)}
                  placeholder="Item name"
                  style={{...INP,borderColor:row.name?'#e53e3e':'#ddd'}}/>

                <input value={row.shortCode||''} onChange={e=>upd(i,'shortCode',e.target.value)}
                  placeholder="Code" style={INP}/>

                <input value={row.displayName||''} onChange={e=>upd(i,'displayName',e.target.value)}
                  placeholder="Display name" style={INP}/>

                <select value={row.categoryId||''} onChange={e=>upd(i,'categoryId',e.target.value)} style={SEL}>
                  <option value="">Select Category</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <input type="number" value={row.price||'0'}
                  onChange={e=>upd(i,'price',e.target.value)}
                  disabled={(row.productVariants||[]).length>0}
                  title={(row.productVariants||[]).length>0?'Variant price se auto-set hoga':''}
                  min="0"
                  style={{...INP,
                    borderColor:(row.productVariants||[]).length>0?'#94a3b8':Number(row.price)>0?'#16a34a':'#ddd',
                    background:(row.productVariants||[]).length>0?'#f1f5f9':'#fff',
                    color:(row.productVariants||[]).length>0?'#64748b':'#111',
                    cursor:(row.productVariants||[]).length>0?'not-allowed':'text',
                  }}/>
                {(row.productVariants||[]).length>0&&(
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>★ Variant se set hoga</div>
                )}

                <input value={row.description||''} onChange={e=>upd(i,'description',e.target.value)}
                  placeholder="Description" style={INP}/>

                <select value={row.dietary||'VEG'} onChange={e=>upd(i,'dietary',e.target.value)} style={SEL}>
                  <option value="VEG">Veg</option>
                  <option value="NON_VEG">Non-Veg</option>
                  <option value="EGG">Egg</option>
                </select>

                <select value={row.gstType||'SERVICES'} onChange={e=>upd(i,'gstType',e.target.value)} style={SEL}>
                  <option value="SERVICES">Services</option>
                  <option value="GOODS">Goods</option>
                </select>

                {/* Order type checkboxes */}
                <div>
                  {['Home Delivery','Pick Up','Dine In','Online Expose'].map((ot,oi)=>(
                    <label key={ot} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,fontSize:12,cursor:'pointer',color:'#333'}}>
                      <input type="checkbox" defaultChecked={true}
                        style={{accentColor:'#e53e3e',width:14,height:14}}/>
                      {ot}
                    </label>
                  ))}
                </div>

                {/* Variation checkbox */}
                <div style={{display:'flex',justifyContent:'center',paddingTop:4}}>
                  <input type="checkbox" readOnly
                    checked={(row.productVariants||[]).length>0}
                    style={{accentColor:'#e53e3e',width:16,height:16}}/>
                </div>

                {/* Addon checkbox */}
                <div style={{display:'flex',justifyContent:'center',paddingTop:4}}>
                  <input type="checkbox" readOnly
                    checked={(row.addonGroupIds||[]).length>0}
                    style={{accentColor:'#e53e3e',width:16,height:16}}/>
                </div>
              </div>
            </div>

            {/* Variation & Addon section */}
            <div style={{padding:'12px 16px 0'}}>
              <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',color:'#333',marginBottom:10}}>
                <input type="checkbox" style={{accentColor:'#e53e3e',width:14,height:14}}/>
                Consider Addon on Item Variations
              </label>

              {/* Selected variant chips */}
              {(row.productVariants||[]).length>0&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                  {(row.productVariants||[]).map((pv,pi)=>{
                    const v=variants.find(x=>x.id===pv.variantId)
                    return (
                      <div key={pv.variantId} style={{display:'inline-flex',alignItems:'center',gap:6,
                        padding:'5px 10px',borderRadius:4,background:'#fff5f5',border:'1px solid #fca5a5',fontSize:12}}>
                        <span style={{fontWeight:500,color:'#111'}}>{v?.name}</span>
                        <span style={{color:'#16a34a',fontWeight:600}}>₹{pv.price}</span>
                        {pi===0&&<span style={{fontSize:10,color:'#e53e3e',fontWeight:600}}>★</span>}
                        <button type="button" onClick={()=>removeVariantFromRow(i,pv.variantId)}
                          style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:15,padding:0,lineHeight:1}}>×</button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add variation row — exact PetPooja layout */}
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10,flexWrap:'wrap'}}>
                <select value={row._variantId||''} onChange={e=>{
                    const vid = e.target.value
                    const defPrice = variants.find(v=>String(v.id)===vid)?.price||''
                    upd(i,'_variantId',vid)
                    // Auto-fill price from variant default if price not entered
                    if(defPrice) upd(i,'_variantPrice',String(defPrice))
                  }}
                  style={{...SEL,width:260,flex:'none',boxSizing:'border-box'}}>
                  <option value="">Select Variation</option>
                  {variants.filter(v=>!(row.productVariants||[]).some(pv=>pv.variantId===v.id)).map(v=>(
                    <option key={v.id} value={v.id}>{v.name}{v.price>0?` (₹${v.price})`:''}</option>
                  ))}
                </select>
                <div style={{display:'flex',alignItems:'center',gap:4,flex:'none'}}>
                  <span style={{fontSize:13,color:'#888'}}>₹</span>
                  <input type="number" value={row._variantPrice||''} onChange={e=>upd(i,'_variantPrice',e.target.value)}
                    placeholder={row._variantId?String(variants.find(v=>String(v.id)===String(row._variantId))?.price||'Price'):'Price'}
                    min="0"
                    style={{...INP,width:110,flex:'none',boxSizing:'border-box',
                      borderColor:row._variantPrice?'#16a34a':'#ddd'}}/>
                </div>
                <button type="button" onClick={()=>{upd(i,'_variantId','');upd(i,'_variantPrice','')}}
                  style={{...BTN_OUT,padding:'6px 10px',fontSize:13,flexShrink:0}}>×</button>
                <button type="button"
                  onClick={()=>{
                    if(!row._variantId){toast.error('Variation select karo');return}
                    addVariantToRow(i, variants)
                  }}
                  style={{...BTN_RED,padding:'6px 14px',fontSize:12,flexShrink:0,display:'flex',alignItems:'center',gap:4}}>
                  + Add Variation
                </button>
              </div>

              {/* Selected addon chips */}
              {(row.addonGroupIds||[]).length>0&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                  {(row.addonGroupIds||[]).map(aid=>{
                    const ag=addonGroups.find(x=>x.id===aid)
                    return (
                      <div key={aid} style={{display:'inline-flex',alignItems:'center',gap:6,
                        padding:'5px 10px',borderRadius:4,background:'#eff6ff',border:'1px solid #bfdbfe',fontSize:12}}>
                        <span style={{fontWeight:500,color:'#111'}}>{ag?.name}</span>
                        <button type="button" onClick={()=>removeAddonFromRow(i,aid)}
                          style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:15,padding:0,lineHeight:1}}>×</button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add addon row */}
              <div style={{display:'flex',gap:8,alignItems:'center',paddingBottom:14,flexWrap:'wrap'}}>
                <select value={row._addonGroupId||''} onChange={e=>upd(i,'_addonGroupId',e.target.value)}
                  style={{...SEL,width:300,flex:'none',boxSizing:'border-box'}}>
                  <option value="">Select AddonGroup</option>
                  {addonGroups.filter(ag=>!(row.addonGroupIds||[]).includes(ag.id)).map(ag=>(
                    <option key={ag.id} value={ag.id}>{ag.name}</option>
                  ))}
                </select>
                <button type="button"
                  onClick={()=>{
                    if(!row._addonGroupId){toast.error('AddonGroup select karo');return}
                    addAddonToRow(i)
                  }}
                  style={{...BTN_RED,padding:'6px 14px',fontSize:12,flexShrink:0,display:'flex',alignItems:'center',gap:4}}>
                  + Add Addon
                </button>
              </div>
            </div>

            {/* Remove row */}
            {!editItem&&rows.length>1&&(
              <div style={{padding:'0 16px 12px',textAlign:'right'}}>
                <button type="button" onClick={()=>setRows(rs=>rs.filter((_,idx)=>idx!==i))}
                  style={{fontSize:12,padding:'3px 10px',borderRadius:4,border:'1px solid #fca5a5',
                    background:'#fff5f5',color:'#e53e3e',cursor:'pointer'}}>
                  Remove Row
                </button>
              </div>
            )}
          </div>
        ))}

        {!editItem&&(
          <div style={{padding:'12px 16px'}}>
            <button type="button"
              onClick={()=>setRows(rs=>[...rs,blankRow(categories,rid,selCat!=='ALL'?selCat:null)])}
              style={{...BTN_OUT,fontSize:12,padding:'6px 14px'}}>
              + Add Another Item
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // ══════ LIST PAGE ══════
  return (
    <>
    <div style={{display:'flex',gap:0,height:'calc(100vh - 180px)',overflow:'hidden',
      border:'1px solid #e5e7eb',borderRadius:8,background:'#fff'}}>

      {/* LEFT SIDEBAR */}
      <div style={{width:210,flexShrink:0,borderRight:'1px solid #e5e7eb',
        display:'flex',flexDirection:'column',background:'#fff',overflowY:'auto'}}>
        <div style={{padding:'11px 14px',borderBottom:'1px solid #e5e7eb',background:'#f9fafb'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#111'}}>Categories</div>
        </div>
        <button onClick={()=>setSelCat('ALL')} style={{
          width:'100%',padding:'10px 14px',textAlign:'left',border:'none',cursor:'pointer',fontSize:13,
          background:selCat==='ALL'?'#fff5f5':'transparent',
          color:selCat==='ALL'?'#e53e3e':'#333',fontWeight:selCat==='ALL'?600:400,
          borderLeft:selCat==='ALL'?'3px solid #e53e3e':'3px solid transparent',
        }}>All Items<span style={{float:'right',fontSize:11,color:'#aaa'}}>{items.length}</span></button>
        {categories.map(cat=>{
          const active=String(selCat)===String(cat.id)
          return (
            <button key={cat.id} onClick={()=>setSelCat(cat.id)} style={{
              width:'100%',padding:'10px 14px',textAlign:'left',border:'none',cursor:'pointer',fontSize:13,
              background:active?'#fff5f5':'transparent',
              color:active?'#e53e3e':'#333',fontWeight:active?600:400,
              borderLeft:active?'3px solid #e53e3e':'3px solid transparent',
            }}>{cat.name}<span style={{float:'right',fontSize:11,color:'#aaa'}}>{catCount[cat.id]||0}</span></button>
          )
        })}
      </div>

      {/* RIGHT PANEL */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        {/* Toolbar */}
        <div style={{padding:'8px 12px',borderBottom:'1px solid #e5e7eb',
          display:'flex',gap:8,alignItems:'center',background:'#f9fafb',flexShrink:0,flexWrap:'wrap'}}>
          <button style={{...BTN_OUT,padding:'5px 9px',fontSize:13}}>←</button>
          <div style={{position:'relative',flex:1,minWidth:130,maxWidth:250}}>
            <span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'#aaa'}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search"
              style={{...INP,paddingLeft:28}}/>
          </div>
          <button style={{...BTN_OUT,padding:'5px 11px',fontSize:12}}>Action ▾</button>
          <button style={{...BTN_OUT,padding:'5px 11px',fontSize:12}}>Quick Actions ▾</button>
          <button style={{...BTN_OUT,padding:'5px 8px',fontSize:13}}>✈</button>
          <button style={{...BTN_RED,padding:'5px 14px'}}>Save</button>
          <span style={{fontSize:12,color:'#555',display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:12,height:12,borderRadius:50,border:'2px solid #ccc',display:'inline-block'}}/>Rank wise
          </span>
          <button onClick={goAdd} style={{...BTN_RED,padding:'5px 14px',display:'flex',alignItems:'center',gap:4}}>
            ＋ Add Items
          </button>
          <span style={{fontSize:12,color:'#555',display:'flex',alignItems:'center',gap:5}}>
            Available<span style={{width:10,height:10,borderRadius:50,background:'#16a34a',display:'inline-block'}}/>
          </span>
        </div>

        {/* Table */}
        <div style={{flex:1,overflowY:'auto'}}>
          {loading?<SkeletonTable rows={5} cols={8}/>:(
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
              <thead style={{position:'sticky',top:0,zIndex:10}}>
                <tr>
                  <th style={{...TH,width:40}}><input type="checkbox" style={{accentColor:'#e53e3e'}}/></th>
                  <th style={TH}>Name *</th>
                  <th style={TH}>Short Code*</th>
                  <th style={TH}>Online Display Name</th>
                  <th style={TH}>Price *</th>
                  <th style={TH}>Description</th>
                  <th style={TH}>Image</th>
                  <th style={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.length===0?(
                  <tr><td colSpan={8} style={{padding:'48px 0',textAlign:'center',color:'#aaa',fontSize:13}}>
                    No items. Click "+ Add Items" to add.
                  </td></tr>
                ):groups.map((group,gi)=>{
                  if(!group.isGroup){
                    const p=group.items[0]
                    return (
                      <tr key={p.id}
                        onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <td style={TD}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <div style={{width:3,height:32,borderRadius:2,flexShrink:0,
                              background:p.available?'#16a34a':'#ef4444'}}/>
                            <input type="checkbox" style={{accentColor:'#e53e3e'}}/>
                          </div>
                        </td>
                        <td style={TD}>
                          <div style={{fontWeight:500,color:'#111',fontSize:13}}>{p.name}</div>
                          <div style={{display:'flex',gap:3,marginTop:3}}>
                            {(p.productVariants?.length>0||p.variant)&&
                              <span title={p.productVariants?.map(pv=>`${pv.variant?.name} ₹${pv.price}`).join(', ')}
                                style={{fontSize:10,padding:'0 4px',borderRadius:2,fontWeight:700,color:'#e53e3e',border:'1px solid #fca5a5',background:'#fff5f5',cursor:'help'}}>V</span>}
                            {p.addonGroups?.length>0&&
                              <span title={p.addonGroups?.map(a=>a.name).join(', ')}
                                style={{fontSize:10,padding:'0 4px',borderRadius:2,fontWeight:700,color:'#2563eb',border:'1px solid #bfdbfe',background:'#eff6ff',cursor:'help'}}>A</span>}
                            <span style={{fontSize:10,padding:'0 4px',borderRadius:2,fontWeight:700,color:'#059669',border:'1px solid #6ee7b7',background:'#f0fdf4'}}>O</span>
                          </div>
                        </td>
                        <td style={{...TD,color:'#888',fontSize:12}}>{String(p.id).padStart(3,'0')}</td>
                        <td style={{...TD,color:'#555',fontSize:12}}>{p.name}</td>
                        <td style={{...TD,fontWeight:500}}>{p.price||0}</td>
                        <td style={{...TD,color:'#888',fontSize:12,maxWidth:140}}>{(p.description||'').slice(0,50)}</td>
                        <td style={TD}><button style={{...AB,fontSize:13}}>↑</button></td>
                        <td style={TD}>
                          <div style={{display:'flex',gap:5}}>
                            <button onClick={()=>goEdit(p)} style={AB} title="Edit">✏️</button>
                            <button onClick={()=>setViewItem(p)} style={AB} title="View Details">📋</button>
                            <button onClick={()=>toggle(p)} style={AB} title="Toggle">{p.available?'👁':'🚫'}</button>
                            <button style={AB} title="Copy">⧉</button>
                            <button onClick={()=>del(p)} style={{...AB,color:'#ef4444'}} title="Delete">🗑</button>
                          </div>
                        </td>
                      </tr>
                    )
                  }
                  const gkey=`g-${gi}`,isExp=expanded.has(gkey)
                  const prices=group.items.map(p=>p.price)
                  return [
                    <tr key={gkey} style={{background:'#fff8f1',cursor:'pointer'}}
                      onClick={()=>setExpanded(s=>{const ns=new Set(s);ns.has(gkey)?ns.delete(gkey):ns.add(gkey);return ns})}>
                      <td style={TD}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:3,height:32,borderRadius:2,background:'#f59e0b'}}/>
                          <input type="checkbox" style={{accentColor:'#e53e3e'}} onClick={e=>e.stopPropagation()}/>
                        </div>
                      </td>
                      <td style={TD}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:11,display:'inline-block',transform:isExp?'rotate(90deg)':'none',transition:'.15s'}}>▶</span>
                          <div>
                            <span style={{fontWeight:600}}>{group.baseName}</span>
                            <span style={{marginLeft:8,fontSize:11,padding:'1px 7px',borderRadius:20,background:'#fee2e2',color:'#e53e3e',fontWeight:600}}>{group.items.length} items</span>
                            <div style={{fontSize:11,color:'#888',marginTop:2}}>
                              {group.items.map(p=>p.name.replace(group.baseName,'').trim()).filter(Boolean).join(', ')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={TD}/><td style={TD}/>
                      <td style={{...TD,fontSize:12,color:'#555'}}>₹{Math.min(...prices)}–₹{Math.max(...prices)}</td>
                      <td style={TD}/><td style={TD}/><td style={TD}/>
                    </tr>,
                    ...(isExp?group.items.map((p,pi)=>(
                      <tr key={`${gkey}-${p.id}`} style={{background:pi%2?'#fafafa':'#fff'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
                        onMouseLeave={e=>e.currentTarget.style.background=pi%2?'#fafafa':'#fff'}>
                        <td style={{...TD,paddingLeft:20}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <div style={{width:3,height:32,borderRadius:2,background:p.available?'#16a34a':'#ef4444'}}/>
                            <input type="checkbox" style={{accentColor:'#e53e3e'}}/>
                          </div>
                        </td>
                        <td style={{...TD,paddingLeft:32}}>
                          <div style={{display:'flex',gap:5}}>
                            <span style={{color:'#ddd'}}>└</span>
                            <div>
                              <span style={{fontWeight:500}}>{p.name}</span>
                              <div style={{display:'flex',gap:3,marginTop:2}}>
                                {(p.productVariants?.length>0||p.variant)&&<span style={{fontSize:10,padding:'0 4px',borderRadius:2,fontWeight:700,color:'#e53e3e',border:'1px solid #fca5a5',background:'#fff5f5'}}>V</span>}
                                {p.addonGroups?.length>0&&<span style={{fontSize:10,padding:'0 4px',borderRadius:2,fontWeight:700,color:'#2563eb',border:'1px solid #bfdbfe',background:'#eff6ff'}}>A</span>}
                                <span style={{fontSize:10,padding:'0 4px',borderRadius:2,fontWeight:700,color:'#059669',border:'1px solid #6ee7b7',background:'#f0fdf4'}}>O</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{...TD,fontSize:12,color:'#888'}}>{String(p.id).padStart(3,'0')}</td>
                        <td style={{...TD,fontSize:12,color:'#555'}}>{p.name}</td>
                        <td style={{...TD,fontWeight:500}}>{p.price||0}</td>
                        <td style={{...TD,fontSize:12,color:'#888'}}>{(p.description||'').slice(0,50)}</td>
                        <td style={TD}><button style={{...AB,fontSize:13}}>↑</button></td>
                        <td style={TD}>
                          <div style={{display:'flex',gap:5}}>
                            <button onClick={()=>goEdit(p)} style={AB}>✏️</button>
                            <button onClick={()=>toggle(p)} style={AB}>{p.available?'👁':'🚫'}</button>
                            <button onClick={()=>del(p)} style={{...AB,color:'#ef4444'}}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    )):[])
                  ]
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        <div style={{padding:'7px 14px',borderTop:'1px solid #e5e7eb',background:'#f9fafb',
          fontSize:11,color:'#888',display:'flex',gap:16,flexShrink:0,flexWrap:'wrap'}}>
          <span><b style={{color:'#059669'}}>O</b> Expose in online order</span>
          <span><b style={{color:'#e53e3e'}}>V</b> Item having Variation</span>
          <span><b style={{color:'#2563eb'}}>A</b> Addon details</span>
          <span>Showing {filtered.length} of {items.length} records</span>
        </div>
      </div>
    </div>

    {/* ── Product Detail Modal ── */}
    {viewItem && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:400,
        display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
        onClick={e=>e.target===e.currentTarget&&setViewItem(null)}>
        <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:500,
          maxHeight:'88vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>

          {/* Header */}
          <div style={{padding:'16px 20px',borderBottom:'1px solid #e5e7eb',
            display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{fontSize:17,fontWeight:800,color:'#111'}}>{viewItem.name}</div>
              <div style={{fontSize:11,color:'#888',marginTop:2}}>
                ID #{viewItem.id} · {catMap[viewItem.categoryId]||'—'}
              </div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,fontWeight:700,
                background:viewItem.available?'#d1fae5':'#fee2e2',
                color:viewItem.available?'#059669':'#dc2626'}}>
                {viewItem.available?'Available':'Unavailable'}
              </span>
              <button onClick={()=>setViewItem(null)}
                style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#aaa',lineHeight:1}}>✕</button>
            </div>
          </div>

          {/* Body */}
          <div style={{padding:'16px 20px'}}>

            {/* Price / Variants */}
            {(viewItem.productVariants||[]).length>0 ? (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',marginBottom:8}}>Variants & Prices</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {viewItem.productVariants.map((pv,pi)=>{
                    const vName = pv.variant?.name || variants.find(v=>v.id===pv.variantId)?.name || `Variant ${pv.variantId}`
                    return (
                      <div key={pv.variantId??pi} style={{display:'flex',alignItems:'center',gap:8,
                        padding:'8px 14px',borderRadius:8,border:'1px solid #fca5a5',background:'#fff5f5'}}>
                        <span style={{fontSize:13,fontWeight:600,color:'#111'}}>{vName}</span>
                        <span style={{fontSize:14,fontWeight:800,color:'#e53e3e'}}>₹{pv.price}</span>
                        {pi===0&&<span style={{fontSize:10,color:'#e53e3e',fontWeight:700}}>★ Base</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase'}}>Price</div>
                <div style={{fontSize:22,fontWeight:800,color:'#16a34a'}}>₹{viewItem.price||0}</div>
              </div>
            )}

            {/* Info Grid */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 20px',marginBottom:16}}>
              {[
                ['Category',  catMap[viewItem.categoryId]||'—'],
                ['Dietary',   viewItem.dietary||'VEG'],
                ['GST Type',  viewItem.gstType||'—'],
                ['Short Code',viewItem.shortCode||'—'],
              ].map(([k,v])=>(
                <div key={k}>
                  <div style={{fontSize:10,color:'#888',fontWeight:600,textTransform:'uppercase'}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:600,marginTop:2}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            {viewItem.description&&(
              <div style={{marginBottom:16,padding:'10px 12px',background:'#f9fafb',
                borderRadius:8,border:'1px solid #e5e7eb'}}>
                <div style={{fontSize:10,color:'#888',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>Description</div>
                <div style={{fontSize:13,color:'#333'}}>{viewItem.description}</div>
              </div>
            )}

            {/* Addon Groups */}
            {(viewItem.addonGroups||[]).length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'#888',textTransform:'uppercase',marginBottom:8}}>Addon Groups</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {viewItem.addonGroups.map(ag=>(
                    <span key={ag.id} style={{fontSize:12,padding:'4px 12px',borderRadius:20,
                      background:'#eff6ff',border:'1px solid #bfdbfe',color:'#2563eb',fontWeight:600}}>
                      {ag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{display:'flex',gap:8,paddingTop:12,borderTop:'1px solid #e5e7eb'}}>
              <button onClick={()=>{setViewItem(null);goEdit(viewItem)}}
                style={{flex:1,padding:'9px',borderRadius:8,border:'none',
                  background:'#e53e3e',color:'#fff',fontWeight:600,cursor:'pointer',fontSize:13}}>
                ✏️ Edit
              </button>
              <button onClick={()=>{toggle(viewItem);setViewItem(v=>({...v,available:!v.available}))}}
                style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid #e5e7eb',
                  background:'transparent',color:'#555',cursor:'pointer',fontSize:13}}>
                {viewItem.available?'🚫 Mark Unavailable':'👁 Mark Available'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ════════════════════════════════════════════════════════════════
function CategoriesTab({ rid, onRefresh }) {
  const toast = useToast()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await api.get(`/categories/restaurant/${rid}`); setItems(Array.isArray(res)?res:[]) }
    catch (_) { setItems([]) } finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [])

  function openAdd() { setForm({ name:'', onlineDisplayName:'', rank:'', isActive:true }); setModal('add') }
  function openEdit(c) { setForm({ ...c }); setModal(c) }

  async function save(e) {
    e.preventDefault()
    if (!form.name) { toast.error('Name required'); return }
    setSaving(true)
    try {
      const body = { ...form, restaurantId:rid, rank:Number(form.rank)||0 }
      modal==='add' ? await api.post('/categories', body) : await api.put(`/categories/${modal.id}`, body)
      toast.success(`✅ Category ${modal==='add'?'added':'updated'}!`)
      setModal(null); load(); onRefresh()
    } catch (_) { toast.error('Save failed') } finally { setSaving(false) }
  }

  async function del(c) {
    if (!confirm(`"${c.name}" delete karna chahte hain?`)) return
    try { await api.delete(`/categories/${c.id}`); toast.success('Deleted'); load(); onRefresh() }
    catch (_) { toast.error('Delete failed — items ho sakte hain') }
  }

  const upd = f => e => setForm(s => ({ ...s, [f]: e.target.value }))

  return (
    <>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
        <button onClick={openAdd} style={{ padding:'8px 16px', borderRadius:8, fontSize:13,
          fontWeight:600, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>
          + Add Category
        </button>
      </div>
      {loading ? <SkeletonGrid count={4} height={110} /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12 }}>
          {items.map(c => (
            <div key={c.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'1.25rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>{c.name}</div>
                <StatusBadge active={c.isActive} />
              </div>
              {c.onlineDisplayName && c.onlineDisplayName!==c.name && (
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Online: {c.onlineDisplayName}</div>
              )}
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>Rank #{c.rank||'—'}</div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => openEdit(c)} style={{ flex:1, fontSize:12, padding:'6px', borderRadius:7,
                  border:'1px solid var(--border)', background:'transparent', color:'var(--accent)', cursor:'pointer' }}>✏️ Edit</button>
                <button onClick={() => del(c)} style={{ fontSize:12, padding:'6px 10px', borderRadius:7,
                  border:'1px solid #ef444440', background:'transparent', color:'#ef4444', cursor:'pointer' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal==='add'?'➕ Add Category':'✏️ Edit Category'} onClose={() => setModal(null)} onSubmit={save} saving={saving}>
          <Inp label="Category Name" value={form.name} onChange={upd('name')} required />
          <Inp label="Online Display Name" value={form.onlineDisplayName} onChange={upd('onlineDisplayName')} placeholder="Leave blank to use same name" />
          <Inp label="Sort Rank" value={form.rank} onChange={upd('rank')} type="number" placeholder="1, 2, 3..." />
          <Chk label="Active (POS mein visible)" checked={form.isActive} onChange={e => setForm(s=>({...s,isActive:e.target.checked}))} />
        </Modal>
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════
// VARIANTS TAB
// ════════════════════════════════════════════════════════════════
function VariantsTab({ rid }) {
  const toast = useToast()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await api.get(`/variants?restaurantId=${rid}`); setItems(Array.isArray(res)?res:[]) }
    catch (_) { setItems([]) } finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [])

  function openAdd() { setForm({ name:'', onlineDisplayName:'', departmentType:'CUSTOMISATION', price:'', rank:'', isActive:true }); setModal('add') }
  function openEdit(v) { setForm({ ...v }); setModal(v) }

  async function save(e) {
    e.preventDefault()
    if (!form.name) { toast.error('Name required'); return }
    setSaving(true)
    try {
      const body = { ...form, restaurantId:rid, price:Number(form.price)||0, rank:Number(form.rank)||1 }
      modal==='add' ? await api.post('/variants', body) : await api.put(`/variants/${modal.id}`, body)
      toast.success(`✅ Variant ${modal==='add'?'added':'updated'}!`)
      setModal(null); load()
    } catch (_) { toast.error('Save failed') } finally { setSaving(false) }
  }

  async function del(v) {
    if (!confirm(`"${v.name}" delete karna chahte hain?`)) return
    try { await api.delete(`/variants/${v.id}`); toast.success('Deleted'); load() }
    catch (_) { toast.error('Delete failed') }
  }

  const upd = f => e => setForm(s => ({ ...s, [f]: e.target.value }))

  return (
    <>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
        <button onClick={openAdd} style={{ padding:'8px 16px', borderRadius:8, fontSize:13,
          fontWeight:600, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>
          + Add Variant
        </button>
      </div>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={4} cols={5} /> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Name','Type','Price','Rank','Status','Actions'].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {items.map(v => (
                <tr key={v.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:500 }}>{v.name}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
                      background:'#6366f122', color:'#6366f1' }}>{v.departmentType||'—'}</span>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'#10b981', fontWeight:600 }}>{v.price?fmt(v.price):'Free'}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-muted)' }}>#{v.rank||'—'}</td>
                  <td style={{ padding:'12px 16px' }}><StatusBadge active={v.isActive} /></td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => openEdit(v)} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--accent)', cursor:'pointer' }}>✏️</button>
                      <button onClick={() => del(v)} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, border:'1px solid #ef444440', background:'transparent', color:'#ef4444', cursor:'pointer' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <Modal title={modal==='add'?'➕ Add Variant':'✏️ Edit Variant'} onClose={() => setModal(null)} onSubmit={save} saving={saving}>
          <Inp label="Variant Name" value={form.name} onChange={upd('name')} required placeholder="e.g. Half/Full, Small/Large" />
          <Inp label="Online Display Name" value={form.onlineDisplayName} onChange={upd('onlineDisplayName')} />
          <Sel label="Type" value={form.departmentType} onChange={upd('departmentType')}
            options={['CUSTOMISATION','QUANTITY'].map(o => ({ value:o, label:o }))} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
            <Inp label="Extra Price (₹)" value={form.price} onChange={upd('price')} type="number" placeholder="0 = free" />
            <Inp label="Rank" value={form.rank} onChange={upd('rank')} type="number" />
          </div>
          <Chk label="Active" checked={form.isActive} onChange={e => setForm(s=>({...s,isActive:e.target.checked}))} />
        </Modal>
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════
// ADDONS TAB
// ════════════════════════════════════════════════════════════════
function AddonsTab({ rid }) {
  const toast = useToast()
  const [groups, setGroups]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState({})
  const [options, setOptions]   = useState([{ name:'', price:0, isVeg:true, isActive:true }])
  const [saving, setSaving]     = useState(false)
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await api.get(`/addon-groups?restaurantId=${rid}`); setGroups(Array.isArray(res)?res:[]) }
    catch (_) { setGroups([]) } finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [])

  function openAdd() {
    setForm({ name:'', description:'', isRequired:false, minSelect:0, maxSelect:1, rank:'', isActive:true })
    setOptions([{ name:'', price:0, isVeg:true, isActive:true }])
    setModal('add')
  }
  function openEdit(g) {
    setForm({ ...g })
    setOptions(g.options?.length ? g.options : [{ name:'', price:0, isVeg:true, isActive:true }])
    setModal(g)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name) { toast.error('Name required'); return }
    setSaving(true)
    try {
      const validOptions = options.filter(o => o.name?.trim())

      // Group body — options NOT included (server saves group + options separately)
      const body = {
        name:        form.name,
        description: form.description || '',
        restaurantId: rid,
        rank:        Number(form.rank) || 1,
        minSelect:   Number(form.minSelect) || 0,
        maxSelect:   Number(form.maxSelect) || 1,
        isRequired:  !!form.isRequired,
        isActive:    form.isActive !== false,
      }

      if (modal === 'add') {
        // Step 1: Group create karo
        const created = await api.post('/addon-groups', body)
        const groupId = created?.id

        // Step 2: Options add karo (ek ek karke)
        if (groupId && validOptions.length > 0) {
          for (const opt of validOptions) {
            await api.post(`/addon-groups/${groupId}/options`, {
              name:     opt.name.trim(),
              price:    Number(opt.price) || 0,
              isVeg:    opt.isVeg !== false,
              isActive: opt.isActive !== false,
              rank:     1,
            })
          }
        }
      } else {
        // Update group only (options editing complex — skip for now)
        await api.put(`/addon-groups/${modal.id}`, body)
      }

      toast.success(`✅ Addon group ${modal==='add'?'added':'updated'}!`)
      setModal(null); load()
    } catch (err) {
      toast.error('Save failed: ' + (err.message || 'Server error'))
    } finally { setSaving(false) }
  }

  async function del(g) {
    if (!confirm(`"${g.name}" delete karna chahte hain?`)) return
    try { await api.delete(`/addon-groups/${g.id}`); toast.success('Deleted'); load() }
    catch (_) { toast.error('Delete failed') }
  }

  const updForm = f => e => setForm(s => ({ ...s, [f]: e.target.value }))
  const updOpt  = (i, f) => e => setOptions(os => os.map((o, idx) => idx===i ? { ...o, [f]: e.target.value } : o))
  const addOpt  = () => setOptions(os => [...os, { name:'', price:0, isVeg:true, isActive:true }])
  const remOpt  = i  => setOptions(os => os.filter((_, idx) => idx!==i))

  return (
    <>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
        <button onClick={openAdd} style={{ padding:'8px 16px', borderRadius:8, fontSize:13,
          fontWeight:600, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>
          + Add Addon Group
        </button>
      </div>
      {loading ? <SkeletonGrid count={3} height={120} /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {groups.map(g => (
            <div key={g.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{g.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                    {g.isRequired?'Required':'Optional'} · Select {g.minSelect||0}–{g.maxSelect||1} · {g.options?.length||0} options
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <StatusBadge active={g.isActive} />
                  <button onClick={() => setExpanded(expanded===g.id?null:g.id)}
                    style={{ fontSize:12, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)',
                      background:'transparent', color:'var(--text-muted)', cursor:'pointer' }}>
                    {expanded===g.id?'▲':'▼'}
                  </button>
                  <button onClick={() => openEdit(g)} style={{ fontSize:11, padding:'4px 10px', borderRadius:6,
                    border:'1px solid var(--border)', background:'transparent', color:'var(--accent)', cursor:'pointer' }}>✏️</button>
                  <button onClick={() => del(g)} style={{ fontSize:11, padding:'4px 10px', borderRadius:6,
                    border:'1px solid #ef444440', background:'transparent', color:'#ef4444', cursor:'pointer' }}>🗑️</button>
                </div>
              </div>
              {expanded===g.id && g.options?.length > 0 && (
                <div style={{ borderTop:'1px solid var(--border)', padding:'0.75rem 1.25rem' }}>
                  {g.options.map((o, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                      padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:13 }}>{o.isVeg?'🟢':'🔴'} {o.name}</span>
                      <span style={{ fontSize:13, color:'#10b981', fontWeight:600 }}>{o.price?fmt(o.price):'Free'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal==='add'?'➕ Add Addon Group':'✏️ Edit Addon Group'} onClose={() => setModal(null)} onSubmit={save} saving={saving}>
          <Inp label="Group Name" value={form.name} onChange={updForm('name')} required placeholder="e.g. Toppings, Sauces" />
          <Inp label="Description" value={form.description} onChange={updForm('description')} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
            <Inp label="Min Select" value={form.minSelect} onChange={updForm('minSelect')} type="number" />
            <Inp label="Max Select" value={form.maxSelect} onChange={updForm('maxSelect')} type="number" />
          </div>
          <div style={{ display:'flex', gap:16, marginBottom:12 }}>
            <Chk label="Required" checked={form.isRequired} onChange={e => setForm(s=>({...s,isRequired:e.target.checked}))} />
            <Chk label="Active" checked={form.isActive} onChange={e => setForm(s=>({...s,isActive:e.target.checked}))} />
          </div>

          {/* Options */}
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:8 }}>OPTIONS</div>
          {options.map((o, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 24px', gap:6, marginBottom:6, alignItems:'center' }}>
              <input value={o.name||''} onChange={updOpt(i,'name')} placeholder={`Option ${i+1}`}
                style={{ padding:'7px 10px', borderRadius:7, border:'1px solid var(--border)',
                  background:'var(--bg-page)', color:'var(--text)', fontSize:13 }} />
              <input type="number" value={o.price||0} onChange={updOpt(i,'price')} placeholder="₹0"
                style={{ padding:'7px 8px', borderRadius:7, border:'1px solid var(--border)',
                  background:'var(--bg-page)', color:'var(--text)', fontSize:13 }} />
              <button type="button" onClick={() => remOpt(i)}
                style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
          ))}
          <button type="button" onClick={addOpt} style={{ fontSize:12, padding:'6px 12px', borderRadius:7,
            border:'1px dashed var(--border)', background:'transparent',
            color:'var(--text-muted)', cursor:'pointer', width:'100%', marginBottom:8 }}>+ Add Option</button>
        </Modal>
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════
// DISCOUNTS TAB
// ════════════════════════════════════════════════════════════════

// ── Coupon Panel ─────────────────────────────────────────────────
function CouponPanel({ discount, rid, onClose }) {
  const toast = useToast()
  const [coupons, setCoupons]   = useState([])
  const [allCoupons, setAll]    = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState({ code:'', title:'', discountType:'PERCENTAGE',
    discountValue:'', minOrderAmount:'', usageLimit:0, validFrom:'', validTo:'', isActive:true })
  const [saving, setSaving]     = useState(false)
  const [linkTab, setLinkTab]   = useState('new') // 'new' | 'existing'

  useEffect(() => {
    loadCoupons()
    loadAll()
  }, [])

  async function loadCoupons() {
    setLoading(true)
    try {
      const res = await api.get(`/discounts/${discount.id}/coupons`)
      setCoupons(Array.isArray(res) ? res : [])
    } catch (err) {
      console.warn('loadCoupons failed:', err?.message || err)
      setCoupons([])
    } finally { setLoading(false) }
  }

  async function loadAll() {
    try {
      const res = await api.get(`/coupons?restaurantId=${rid}`)
      setAll(Array.isArray(res) ? res : (res?.content || []))
    } catch (err) {
      console.warn('loadAll coupons failed:', err?.message || err)
      setAll([])
    }
  }

  async function createAndLink(e) {
    e.preventDefault()
    if (!form.code || !form.title) { toast.error('Code aur title required'); return }
    setSaving(true)
    try {
      // Step 1: Coupon create karo
      const created = await api.post('/coupons', {
        ...form,
        restaurantId:   rid,
        discountValue:  Number(form.discountValue) || 0,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        usageLimit:     Number(form.usageLimit) || 0,
        code:           form.code.trim().toUpperCase(),
      })
      // Step 2: Discount se link karo
      if (created?.id) {
        await api.patch(`/discounts/${discount.id}/coupons/${created.id}/link`, {})
        toast.success(`✅ Coupon "${created.code}" created & linked!`)
        setShowAdd(false)
        setForm({ code:'', title:'', discountType:'PERCENTAGE', discountValue:'',
          minOrderAmount:'', usageLimit:0, validFrom:'', validTo:'', isActive:true })
        loadCoupons()
      }
    } catch (_) { toast.error('Coupon create failed') } finally { setSaving(false) }
  }

  async function linkExisting(coupon) {
    try {
      await api.patch(`/discounts/${discount.id}/coupons/${coupon.id}/link`, {})
      toast.success(`✅ "${coupon.code}" linked!`)
      loadCoupons()
    } catch (_) { toast.error('Link failed') }
  }

  async function unlink(coupon) {
    if (!confirm(`"${coupon.code}" unlink karna chahte hain?`)) return
    try {
      await api.patch(`/discounts/${discount.id}/coupons/${coupon.id}/unlink`, {})
      toast.success(`"${coupon.code}" unlinked`)
      loadCoupons()
    } catch (_) { toast.error('Unlink failed') }
  }

  async function toggleActive(coupon) {
    try {
      await api.patch(`/coupons/${coupon.id}/active`, { isActive: !coupon.isActive })
      loadCoupons()
    } catch (_) { toast.error('Update failed') }
  }

  const linkedIds = new Set(coupons.map(c => c.id))
  const unlinked  = allCoupons.filter(c => !linkedIds.has(c.id))
  const upd = f => e => setForm(s => ({ ...s, [f]: e.target.value }))

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:400,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, width:'100%',
        maxWidth:580, maxHeight:'90vh', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700 }}>🏷️ Coupons — {discount.name}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              Coupon ke saath yeh discount apply hoga
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none',
            fontSize:20, cursor:'pointer', color:'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ padding:'1.25rem 1.5rem' }}>

          {/* Linked coupons */}
          <div style={{ marginBottom:'1.25rem' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>
              ✅ Linked Coupons ({coupons.length})
            </div>
            {loading ? (
              <div style={{ padding:'1rem', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Loading...</div>
            ) : coupons.length === 0 ? (
              <div style={{ padding:'1rem', textAlign:'center', color:'var(--text-muted)', fontSize:13,
                borderRadius:8, border:'1px dashed var(--border)' }}>
                Koi coupon linked nahi — Add karo
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {coupons.map(c => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                    borderRadius:10, background:'var(--bg-page)', border:'1px solid var(--border)' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:'var(--accent)',
                          letterSpacing:'0.05em' }}>{c.code}</span>
                        <StatusBadge active={c.isActive} />
                        {c.usageLimit > 0 && (
                          <span style={{ fontSize:10, color:'var(--text-muted)' }}>
                            {c.usageCount||0}/{c.usageLimit} used
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{c.title}</div>
                      <div style={{ fontSize:11, color:'#10b981', marginTop:1 }}>
                        {c.discountType==='PERCENTAGE' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                        {c.minOrderAmount>0 && ` · Min ₹${c.minOrderAmount}`}
                        {c.validTo && ` · Expires ${c.validTo}`}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => toggleActive(c)} style={{ fontSize:10, padding:'3px 8px',
                        borderRadius:6, border:'1px solid var(--border)', background:'transparent',
                        color:'var(--text-muted)', cursor:'pointer' }}>
                        {c.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => unlink(c)} style={{ fontSize:10, padding:'3px 8px',
                        borderRadius:6, border:'1px solid #ef444430', background:'transparent',
                        color:'#ef4444', cursor:'pointer' }}>Unlink</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add coupon section */}
          {!showAdd ? (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setShowAdd(true); setLinkTab('new') }} style={{
                flex:1, padding:'9px', borderRadius:8, border:'1px solid var(--accent)',
                background:'transparent', color:'var(--accent)', fontWeight:600,
                fontSize:13, cursor:'pointer' }}>+ Create New Coupon</button>
              {unlinked.length > 0 && (
                <button onClick={() => { setShowAdd(true); setLinkTab('existing') }} style={{
                  flex:1, padding:'9px', borderRadius:8, border:'1px solid var(--border)',
                  background:'transparent', color:'var(--text)', fontSize:13, cursor:'pointer' }}>
                  Link Existing ({unlinked.length})
                </button>
              )}
            </div>
          ) : (
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:'1rem' }}>
              {/* Tab toggle */}
              <div style={{ display:'flex', gap:4, marginBottom:'1rem' }}>
                {[['new','✨ New Coupon'],['existing','🔗 Link Existing']].map(([k,l]) => (
                  <button key={k} onClick={() => setLinkTab(k)} style={{
                    padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600,
                    cursor:'pointer', border:'1px solid var(--border)',
                    background: linkTab===k ? 'var(--accent)' : 'transparent',
                    color: linkTab===k ? '#fff' : 'var(--text-muted)' }}>{l}</button>
                ))}
                <button onClick={() => setShowAdd(false)} style={{
                  marginLeft:'auto', padding:'6px 10px', borderRadius:8, fontSize:12,
                  border:'1px solid var(--border)', background:'transparent',
                  color:'var(--text-muted)', cursor:'pointer' }}>Cancel</button>
              </div>

              {/* New coupon form */}
              {linkTab === 'new' && (
                <form onSubmit={createAndLink}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
                    <Inp label="Coupon Code" value={form.code}
                      onChange={e => setForm(s=>({...s,code:e.target.value.toUpperCase()}))}
                      required placeholder="e.g. DIWALI20" />
                    <Inp label="Title" value={form.title} onChange={upd('title')} required placeholder="Diwali Offer" />
                    <Sel label="Discount Type" value={form.discountType} onChange={upd('discountType')}
                      options={['PERCENTAGE','FIXED'].map(o=>({value:o,label:o}))} />
                    <Inp label={form.discountType==='PERCENTAGE'?'Discount %':'Flat Amount (₹)'}
                      value={form.discountValue} onChange={upd('discountValue')} type="number" required />
                    <Inp label="Min Order (₹)" value={form.minOrderAmount} onChange={upd('minOrderAmount')} type="number" placeholder="0" />
                    <Inp label="Usage Limit (0=unlimited)" value={form.usageLimit} onChange={upd('usageLimit')} type="number" />
                    <Inp label="Valid From" value={form.validFrom} onChange={upd('validFrom')} type="date" />
                    <Inp label="Valid To" value={form.validTo} onChange={upd('validTo')} type="date" />
                  </div>
                  <Chk label="Active" checked={form.isActive} onChange={e=>setForm(s=>({...s,isActive:e.target.checked}))} />
                  <button type="submit" disabled={saving} style={{ width:'100%', padding:'10px',
                    borderRadius:8, border:'none', background:'var(--accent)', color:'#fff',
                    fontWeight:600, fontSize:13, cursor:saving?'not-allowed':'pointer', marginTop:4 }}>
                    {saving ? 'Creating...' : '✅ Create & Link Coupon'}
                  </button>
                </form>
              )}

              {/* Link existing */}
              {linkTab === 'existing' && (
                <div>
                  {unlinked.length === 0 ? (
                    <div style={{ padding:'1rem', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                      Koi unlinked coupon nahi hai
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:250, overflowY:'auto' }}>
                      {unlinked.map(c => (
                        <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10,
                          padding:'10px 14px', borderRadius:10, background:'var(--bg-page)',
                          border:'1px solid var(--border)' }}>
                          <div style={{ flex:1 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>{c.code}</span>
                            <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:8 }}>{c.title}</span>
                          </div>
                          <button onClick={() => linkExisting(c)} style={{ fontSize:11,
                            padding:'4px 12px', borderRadius:6, border:'none',
                            background:'var(--accent)', color:'#fff', cursor:'pointer', fontWeight:600 }}>
                            Link
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main DiscountsTab ─────────────────────────────────────────────
function DiscountsTab({ rid, categories, products }) {
  const toast = useToast()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [couponDiscount, setCouponDiscount] = useState(null) // which discount's coupons showing
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [applicableOn, setApplicableOn]     = useState(['ALL'])
  const [selCategories, setSelCategories]   = useState([])
  const [selProducts, setSelProducts]       = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await api.get(`/discounts?restaurantId=${rid}`); setItems(Array.isArray(res)?res:[]) }
    catch (_) { setItems([]) } finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [])

  function openAdd() {
    setForm({ name:'', title:'', type:'PERCENTAGE', platform:'ALL',
      amount:'', percentage:'', minOrderAmount:'', maxDiscountCap:'', isActive:true })
    setApplicableOn(['ALL']); setSelCategories([]); setSelProducts([])
    setModal('add')
  }

  function openEdit(d) {
    setForm({ ...d })
    setApplicableOn(d.applicableOn ? [...d.applicableOn] : ['ALL'])
    setSelCategories(d.categoryIds ? [...d.categoryIds] : [])
    setSelProducts(d.productIds ? [...d.productIds] : [])
    setModal(d)
  }

  function toggleApplicable(val) {
    if (val === 'ALL') { setApplicableOn(['ALL']); setSelCategories([]); setSelProducts([]); return }
    setApplicableOn(prev => {
      const without = prev.filter(v => v !== 'ALL')
      return prev.includes(val) ? without.filter(v => v!==val) : [...without, val]
    })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name || !form.type) { toast.error('Name aur type required'); return }
    setSaving(true)
    try {
      const body = { ...form, restaurantId:rid,
        amount: Number(form.amount)||0, percentage: Number(form.percentage)||0,
        minOrderAmount: Number(form.minOrderAmount)||0, maxDiscountCap: Number(form.maxDiscountCap)||0,
        applicableOn, categoryIds: applicableOn.includes('CATEGORY') ? selCategories : [],
        productIds: applicableOn.includes('PRODUCT') ? selProducts : [] }
      modal==='add' ? await api.post('/discounts', body) : await api.put(`/discounts/${modal.id}`, body)
      toast.success(`✅ Discount ${modal==='add'?'added':'updated'}!`)
      setModal(null); load()
    } catch (_) { toast.error('Save failed') } finally { setSaving(false) }
  }

  async function del(d) {
    if (!confirm(`"${d.name}" delete karna chahte hain?`)) return
    try { await api.delete(`/discounts/${d.id}`); toast.success('Deleted'); load() }
    catch (_) { toast.error('Delete failed') }
  }

  const upd = f => e => setForm(s => ({ ...s, [f]: e.target.value }))
  const TYPE_COLOR = { PERCENTAGE:'#6366f1', FLAT:'#10b981', BOGO:'#f59e0b' }

  return (
    <>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
        <button onClick={openAdd} style={{ padding:'8px 16px', borderRadius:8, fontSize:13,
          fontWeight:600, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>
          + Add Discount
        </button>
      </div>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={4} cols={7} /> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Name','Type','Value','Platform','Applicable','Coupons','Actions'].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:12,
                  color:'var(--text-muted)', fontWeight:600 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {items.map(d => (
                <tr key={d.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{d.name}</div>
                    {d.title && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{d.title}</div>}
                    <StatusBadge active={d.isActive} />
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
                      background:(TYPE_COLOR[d.type]||'#888')+'22', color:TYPE_COLOR[d.type]||'#888' }}>
                      {d.type}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'#10b981' }}>
                    {d.type==='PERCENTAGE' ? `${d.percentage||0}%` : `₹${d.amount||0}`}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-muted)' }}>{d.platform||'ALL'}</td>
                  <td style={{ padding:'12px 16px', fontSize:12 }}>
                    {(d.applicableOn||[]).includes('ALL') ? '🌐 All' :
                     (d.applicableOn||[]).join(' + ')}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <button onClick={() => setCouponDiscount(d)} style={{
                      fontSize:11, padding:'4px 12px', borderRadius:6, fontWeight:600,
                      border:'1px solid #6366f1', background:'transparent',
                      color:'#6366f1', cursor:'pointer' }}>
                      🏷️ Coupons
                    </button>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => openEdit(d)} style={{ fontSize:11, padding:'4px 10px',
                        borderRadius:6, border:'1px solid var(--border)', background:'transparent',
                        color:'var(--accent)', cursor:'pointer' }}>✏️</button>
                      <button onClick={() => del(d)} style={{ fontSize:11, padding:'4px 10px',
                        borderRadius:6, border:'1px solid #ef444440', background:'transparent',
                        color:'#ef4444', cursor:'pointer' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)' }}>
                  🏷️ Koi discount nahi — Add karo
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Discount Add/Edit Modal */}
      {modal && (
        <Modal title={modal==='add'?'➕ Add Discount':'✏️ Edit Discount'}
          onClose={() => setModal(null)} onSubmit={save} saving={saving}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
            <Inp label="Name" value={form.name} onChange={upd('name')} required style={{ gridColumn:'1/-1' }} />
            <Inp label="Display Title" value={form.title} onChange={upd('title')} style={{ gridColumn:'1/-1' }} />
            <Sel label="Type" value={form.type} onChange={upd('type')} required
              options={['PERCENTAGE','FLAT','BOGO'].map(o=>({value:o,label:o}))} />
            <Sel label="Platform" value={form.platform} onChange={upd('platform')}
              options={['ALL','POS','ONLINE'].map(o=>({value:o,label:o}))} />
            {form.type==='PERCENTAGE'
              ? <Inp label="Discount %" value={form.percentage} onChange={upd('percentage')} type="number" />
              : <Inp label="Flat Amount (₹)" value={form.amount} onChange={upd('amount')} type="number" />}
            <Inp label="Max Cap (₹)" value={form.maxDiscountCap} onChange={upd('maxDiscountCap')} type="number" placeholder="0 = no cap" />
            <Inp label="Min Order (₹)" value={form.minOrderAmount} onChange={upd('minOrderAmount')} type="number" style={{ gridColumn:'1/-1' }} />
          </div>
          <Chk label="Active" checked={form.isActive} onChange={e=>setForm(s=>({...s,isActive:e.target.checked}))} />
          <div style={{ marginTop:8, paddingTop:12, borderTop:'1px solid var(--border)' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:8 }}>📍 APPLICABLE ON</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
              {[['ALL','🌐 Sab pe'],['CATEGORY','📋 Categories'],['PRODUCT','🍽️ Specific Items']].map(([v,l]) => (
                <button key={v} type="button" onClick={() => toggleApplicable(v)} style={{
                  padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
                  border:'1px solid var(--border)',
                  background: applicableOn.includes(v)?'var(--accent)':'transparent',
                  color: applicableOn.includes(v)?'#fff':'var(--text-muted)' }}>{l}</button>
              ))}
            </div>
            {applicableOn.includes('CATEGORY') && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>Categories:</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {categories.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => setSelCategories(p => p.includes(c.id)?p.filter(x=>x!==c.id):[...p,c.id])}
                      style={{ padding:'4px 10px', borderRadius:20, fontSize:11, cursor:'pointer',
                        border:'1px solid var(--border)',
                        background: selCategories.includes(c.id)?'#6366f1':'transparent',
                        color: selCategories.includes(c.id)?'#fff':'var(--text-muted)' }}>{c.name}</button>
                  ))}
                </div>
              </div>
            )}
            {applicableOn.includes('PRODUCT') && (
              <div style={{ border:'1px solid var(--border)', borderRadius:8, maxHeight:160, overflowY:'auto' }}>
                {products.map(p => (
                  <label key={p.id} style={{ display:'flex', alignItems:'center', gap:8,
                    padding:'6px 10px', cursor:'pointer', borderBottom:'1px solid var(--border)',
                    background: selProducts.includes(p.id)?'var(--accent)15':'transparent' }}>
                    <input type="checkbox" checked={selProducts.includes(p.id)}
                      onChange={() => setSelProducts(prev => prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])} />
                    <span style={{ fontSize:12, flex:1 }}>{p.name}</span>
                    <span style={{ fontSize:11, color:'#10b981' }}>₹{p.price}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Coupon Panel */}
      {couponDiscount && (
        <CouponPanel
          discount={couponDiscount}
          rid={rid}
          onClose={() => { setCouponDiscount(null); load() }}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════
// TABLES/AREA TAB
// ════════════════════════════════════════════════════════════════
function TablesTab({ rid }) {
  const toast = useToast()
  const [areas, setAreas]     = useState([])
  const [tables, setTables]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // null | 'addArea' | 'addTable' | table
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)
  const [areaFilter, setAreaFilter] = useState('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ar, tb] = await Promise.allSettled([
        api.get(`/areas?restaurantId=${rid}`),
        api.get(`/tables?restaurantId=${rid}`),
      ])
      setAreas(Array.isArray(ar.value)?ar.value:[])
      setTables(Array.isArray(tb.value)?tb.value:[])
    } catch (_) {} finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [])

  async function saveArea(e) {
    e.preventDefault()
    if (!form.name) { toast.error('Area name required'); return }
    setSaving(true)
    try {
      await api.post('/areas', { name:form.name, restaurantId:rid, isActive:true })
      toast.success('✅ Area added!'); setModal(null); load()
    } catch (_) { toast.error('Save failed') } finally { setSaving(false) }
  }

  async function saveTable(e) {
    e.preventDefault()
    if (!form.tableNo) { toast.error('Table number required'); return }
    setSaving(true)
    try {
      const body = { tableNo:form.tableNo, capacity:Number(form.capacity)||4,
        areaId:form.areaId||null, restaurantId:rid, isActive:true }
      modal==='addTable' ? await api.post('/tables', body) : await api.put(`/tables/${modal.id}`, body)
      toast.success(`✅ Table ${modal==='addTable'?'added':'updated'}!`); setModal(null); load()
    } catch (_) { toast.error('Save failed') } finally { setSaving(false) }
  }

  async function delTable(t) {
    if (!confirm(`Table ${t.tableNo} delete karna chahte hain?`)) return
    try { await api.delete(`/tables/${t.id}`); toast.success('Deleted'); load() }
    catch (_) { toast.error('Delete failed') }
  }

  async function delArea(a) {
    if (!confirm(`Area "${a.name}" delete karna chahte hain?`)) return
    try { await api.delete(`/areas/${a.id}`); toast.success('Deleted'); load() }
    catch (_) { toast.error('Delete failed — tables ho sakti hain') }
  }

  const filteredTables = areaFilter==='ALL' ? tables
    : tables.filter(t => String(t.areaId)===String(areaFilter))

  const areaMap = Object.fromEntries(areas.map(a => [a.id, a.name]))

  return (
    <>
      {/* Areas */}
      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
          <div style={{ fontSize:14, fontWeight:600 }}>📍 Areas</div>
          <button onClick={() => { setForm({ name:'' }); setModal('addArea') }} style={{
            padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600,
            background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>+ Add Area</button>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {areas.map(a => (
            <div key={a.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
              borderRadius:20, background:'var(--bg-card)', border:'1px solid var(--border)', fontSize:13 }}>
              <span>{a.name}</span>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                ({tables.filter(t => String(t.areaId)===String(a.id)).length} tables)
              </span>
              <button onClick={() => delArea(a)} style={{ background:'none', border:'none',
                color:'#ef4444', cursor:'pointer', fontSize:14, lineHeight:1 }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Tables */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => setAreaFilter('ALL')} style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600,
            cursor:'pointer', border:'1px solid var(--border)',
            background:areaFilter==='ALL'?'var(--accent)':'transparent',
            color:areaFilter==='ALL'?'#fff':'var(--text-muted)' }}>All</button>
          {areas.map(a => (
            <button key={a.id} onClick={() => setAreaFilter(a.id)} style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600,
              cursor:'pointer', border:'1px solid var(--border)',
              background:String(areaFilter)===String(a.id)?'var(--accent)':'transparent',
              color:String(areaFilter)===String(a.id)?'#fff':'var(--text-muted)' }}>{a.name}</button>
          ))}
        </div>
        <button onClick={() => { setForm({ tableNo:'', capacity:4, areaId:areas[0]?.id||'' }); setModal('addTable') }}
          style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600,
            background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>+ Add Table</button>
      </div>

      {loading ? <SkeletonGrid count={8} height={80} /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:10 }}>
          {filteredTables.map(t => (
            <div key={t.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
              borderRadius:12, padding:'1rem', textAlign:'center', position:'relative' }}>
              <div style={{ fontSize:22, fontWeight:700, color:'var(--accent)', marginBottom:4 }}>
                {t.tableNo}
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>
                {areaMap[t.areaId]||'No Area'} · {t.capacity||4} seats
              </div>
              <StatusBadge active={t.isActive} />
              <div style={{ display:'flex', gap:4, marginTop:8, justifyContent:'center' }}>
                <button onClick={() => { setForm({ ...t }); setModal(t) }}
                  style={{ fontSize:10, padding:'3px 8px', borderRadius:5, border:'1px solid var(--border)',
                    background:'transparent', color:'var(--accent)', cursor:'pointer' }}>✏️</button>
                <button onClick={() => delTable(t)}
                  style={{ fontSize:10, padding:'3px 8px', borderRadius:5, border:'1px solid #ef444430',
                    background:'transparent', color:'#ef4444', cursor:'pointer' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Area Modal */}
      {modal==='addArea' && (
        <Modal title="➕ Add Area" onClose={() => setModal(null)} onSubmit={saveArea} saving={saving}>
          <Inp label="Area Name" value={form.name} onChange={e => setForm(s=>({...s,name:e.target.value}))}
            required placeholder="e.g. Ground Floor, Rooftop, AC Section" />
        </Modal>
      )}

      {/* Table Modal */}
      {(modal==='addTable' || (modal && modal.tableNo!==undefined)) && (
        <Modal title={modal==='addTable'?'➕ Add Table':'✏️ Edit Table'}
          onClose={() => setModal(null)} onSubmit={saveTable} saving={saving}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
            <Inp label="Table Number" value={form.tableNo} onChange={e => setForm(s=>({...s,tableNo:e.target.value}))} required placeholder="e.g. T1, A-5" />
            <Inp label="Capacity (seats)" value={form.capacity} onChange={e => setForm(s=>({...s,capacity:e.target.value}))} type="number" />
          </div>
          <Sel label="Area" value={form.areaId} onChange={e => setForm(s=>({...s,areaId:e.target.value}))}
            options={[{ value:'', label:'No Area' }, ...areas.map(a => ({ value:a.id, label:a.name }))]} />
          <Chk label="Active" checked={form.isActive!==false} onChange={e => setForm(s=>({...s,isActive:e.target.checked}))} />
        </Modal>
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function MenuManagement() {
  const { restaurantId } = useAuthStore()
  const [tab, setTab]           = useState('products')
  const [categories, setCategories] = useState([])
  const [products, setProducts]     = useState([])

  const loadCategories = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.allSettled([
        api.get(`/categories/restaurant/${restaurantId}`),
        api.get(`/products?restaurantId=${restaurantId}&size=200`),
      ])
      setCategories(Array.isArray(cats.value) ? cats.value : [])
      const pl = prods.value?.content || (Array.isArray(prods.value) ? prods.value : [])
      setProducts(pl)
    } catch (_) {}
  }, [restaurantId])

  useEffect(() => { loadCategories() }, [])

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:22, fontWeight:700 }}>🍽️ Menu Management</h1>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
          Items, categories, variants, addons, discounts, tables
        </p>
      </div>

      {/* Tab Bar */}
      <div style={{ display:'flex', gap:4, marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {TABS.map(({ key, icon, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600,
            cursor:'pointer', border:'1px solid var(--border)',
            background: tab===key ? 'var(--accent)' : 'transparent',
            color: tab===key ? '#fff' : 'var(--text-muted)',
          }}>{icon} {label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab==='products'   && <ProductsTab  rid={restaurantId} categories={categories} />}
      {tab==='categories' && <CategoriesTab rid={restaurantId} onRefresh={loadCategories} />}
      {tab==='variants'   && <VariantsTab  rid={restaurantId} />}
      {tab==='addons'     && <AddonsTab    rid={restaurantId} />}
      {tab==='discounts'  && <DiscountsTab rid={restaurantId} categories={categories} products={products} />}
      {tab==='tables'     && <TablesTab    rid={restaurantId} />}
    </div>
  )
}
