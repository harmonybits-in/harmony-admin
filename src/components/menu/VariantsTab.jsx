import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { SkeletonTable } from '../Skeleton'
import { fmt, Inp, Sel, Chk, Modal, StatusBadge } from './MenuShared'

export default function VariantsTab({ rid }) {
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
