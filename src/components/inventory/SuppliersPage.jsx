// src/components/inventory/SuppliersPage.jsx
import { useState, useEffect } from 'react'
import { inventoryApi } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { SkeletonTable } from '../Skeleton'
import { card, TH, TD, BTN_RED, BTN_OUT, FInp } from './InventoryShared'

export default function SuppliersPage({ rid }) {
  const toast   = useToast()
  const [suppliers, setSuppliers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [panel,     setPanel]     = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [form,      setForm]      = useState({ name:'', phone:'', email:'', category:'', address:'' })
  const [saving,    setSaving]    = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await inventoryApi.getSuppliers(rid)
      setSuppliers(Array.isArray(r) ? r : [])
    } catch(_){} finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  async function save() {
    if(!form.name){ toast.error('Supplier naam required'); return }
    setSaving(true)
    try {
      const body = { ...form, restaurantId:rid }
      if(editId) await inventoryApi.updateSupplier(editId, body)
      else       await inventoryApi.createSupplier(body)
      toast.success(editId ? 'Updated!' : 'Supplier added!')
      setPanel(false); setEditId(null); load()
    } catch(_){ toast.error('Failed') } finally { setSaving(false) }
  }

  function openEdit(s) {
    setForm({ name:s.name||'', phone:s.phone||'', email:s.email||'', category:s.category||'', address:s.address||'' })
    setEditId(s.id); setPanel(true)
  }

  const upd = f => e => setForm(p=>({...p,[f]:e.target.value}))

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700 }}>Suppliers</h2>
          <p style={{ fontSize:12, color:'#888', marginTop:2 }}>Vendors aur suppliers manage karo</p>
        </div>
        <button onClick={()=>{ setForm({name:'',phone:'',email:'',category:'',address:''}); setEditId(null); setPanel(true) }}
          style={BTN_RED}>+ Add Supplier</button>
      </div>
      <div style={{ ...card, padding:0, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={4} cols={5}/> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Supplier Name','Phone','Email','Category','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {suppliers.length===0 ? (
                <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#aaa', fontSize:13 }}>
                  No suppliers. "+ Add Supplier" click karo.
                </td></tr>
              ) : suppliers.map((s,i) => (
                <tr key={s.id||i}
                  onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <td style={TD}><span style={{ fontWeight:500 }}>{s.name}</span></td>
                  <td style={{...TD, color:'#777'}}>{s.phone||'—'}</td>
                  <td style={{...TD, color:'#777'}}>{s.email||'—'}</td>
                  <td style={TD}>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:12,
                      background:'#eff6ff', color:'#2563eb', fontWeight:600 }}>
                      {s.category||'General'}
                    </span>
                  </td>
                  <td style={TD}>
                    <button onClick={()=>openEdit(s)} style={{ ...BTN_OUT, padding:'4px 10px', fontSize:11 }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {panel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:500,
          display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setPanel(false)}>
          <div style={{ background:'#fff', borderRadius:'14px 14px 0 0', width:'100%',
            maxWidth:480, maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #f0f0f0',
              display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, fontSize:14 }}>{editId ? 'Edit Supplier' : '+ Add Supplier'}</span>
              <button onClick={()=>setPanel(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#aaa' }}>×</button>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:'1.25rem 1.5rem' }}>
              <FInp label="Supplier Name" value={form.name} onChange={upd('name')} required/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
                <FInp label="Phone" value={form.phone} onChange={upd('phone')} type="tel"/>
                <FInp label="Category" value={form.category} onChange={upd('category')} placeholder="Vegetables"/>
              </div>
              <FInp label="Email" value={form.email} onChange={upd('email')} type="email"/>
              <FInp label="Address" value={form.address} onChange={upd('address')}/>
            </div>
            <div style={{ padding:'12px 18px', borderTop:'1px solid #f0f0f0', display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setPanel(false)} style={BTN_OUT}>Cancel</button>
              <button onClick={save} disabled={saving} style={BTN_RED}>{saving?'Saving...':editId?'Update':'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
