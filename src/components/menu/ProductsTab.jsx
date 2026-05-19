import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { SkeletonTable } from '../Skeleton'
import { StatusBadge } from './MenuShared'

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

export default function ProductsTab({ rid, categories }) {
  const toast = useToast()
  const [items,       setItems]       = useState([])
  const [variants,    setVariants]    = useState([])
  const [addonGroups, setAddonGroups] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [saving,      setSaving]      = useState(false)
  const [expanded,    setExpanded]    = useState(new Set())
  const [selCat,      setSelCat]      = useState('ALL')
  const [view,        setView]        = useState('list')
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
                  {['Home Delivery','Pick Up','Dine In','Online Expose'].map((ot)=>(
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

              {/* Add variation row */}
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10,flexWrap:'wrap'}}>
                <select value={row._variantId||''} onChange={e=>{
                    const vid = e.target.value
                    const defPrice = variants.find(v=>String(v.id)===vid)?.price||''
                    upd(i,'_variantId',vid)
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

    {/* Product Detail Modal */}
    {viewItem && (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:400,
        display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
        onClick={e=>e.target===e.currentTarget&&setViewItem(null)}>
        <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:500,
          maxHeight:'88vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>

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

          <div style={{padding:'16px 20px'}}>
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

            {viewItem.description&&(
              <div style={{marginBottom:16,padding:'10px 12px',background:'#f9fafb',
                borderRadius:8,border:'1px solid #e5e7eb'}}>
                <div style={{fontSize:10,color:'#888',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>Description</div>
                <div style={{fontSize:13,color:'#333'}}>{viewItem.description}</div>
              </div>
            )}

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
