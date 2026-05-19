import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { SkeletonGrid } from '../Skeleton'
import { Inp, Chk, Modal, StatusBadge } from './MenuShared'

export default function CategoriesTab({ rid, onRefresh }) {
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
