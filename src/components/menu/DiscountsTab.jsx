import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { SkeletonTable } from '../Skeleton'
import { Inp, Sel, Chk, Modal, StatusBadge } from './MenuShared'

function CouponPanel({ discount, rid, onClose }) {
  const toast = useToast()
  const [coupons, setCoupons]   = useState([])
  const [allCoupons, setAll]    = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState({ code:'', title:'', discountType:'PERCENTAGE',
    discountValue:'', minOrderAmount:'', usageLimit:0, validFrom:'', validTo:'', isActive:true })
  const [saving, setSaving]     = useState(false)
  const [linkTab, setLinkTab]   = useState('new')

  useEffect(() => { loadCoupons(); loadAll() }, [])

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
      const created = await api.post('/coupons', {
        ...form,
        restaurantId:   rid,
        discountValue:  Number(form.discountValue) || 0,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        usageLimit:     Number(form.usageLimit) || 0,
        code:           form.code.trim().toUpperCase(),
      })
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

export default function DiscountsTab({ rid, categories, products }) {
  const toast = useToast()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [couponDiscount, setCouponDiscount] = useState(null)
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
                    {(d.applicableOn||[]).includes('ALL') ? '🌐 All' : (d.applicableOn||[]).join(' + ')}
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
