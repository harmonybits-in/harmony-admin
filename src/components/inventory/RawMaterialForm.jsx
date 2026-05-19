// src/components/inventory/RawMaterialForm.jsx
import { useState } from 'react'
import { UNITS, BLANK_FORM, FRow, FInput, FSelect, PurchaseUnitSelect, CategoryInput, Section } from './RawMaterialShared'

export default function RawMaterialForm({ initial, onSave, onCancel, rid }) {
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
              options={['Drink','Vegetable','Dairy','Grocery','Sauces','Spices','Bakery','Meat','Seafood','Other']}
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
