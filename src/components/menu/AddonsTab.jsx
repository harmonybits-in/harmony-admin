import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { SkeletonGrid } from '../Skeleton'
import { fmt, Inp, Chk, Modal, StatusBadge } from './MenuShared'

export default function AddonsTab({ rid }) {
  const toast = useToast()
  const [groups,     setGroups]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [form,       setForm]       = useState({})
  const [options,    setOptions]    = useState([{ name:'', price:0, isVeg:true, isActive:true }])
  const [saving,     setSaving]     = useState(false)
  const [expanded,   setExpanded]   = useState(null)
  const [localOrder, setLocalOrder] = useState([])  // ordered group IDs
  const [dragId,     setDragId]     = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await api.get(`/addon-groups?restaurantId=${rid}`); setGroups(Array.isArray(res) ? res : []) }
    catch (_) { setGroups([]) } finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [])

  // Sync local order from groups (sorted by rank)
  useEffect(() => {
    const sorted = [...groups].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    setLocalOrder(sorted.map(g => String(g.id)))
  }, [groups])

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
      const body = {
        name:         form.name,
        description:  form.description || '',
        restaurantId: rid,
        rank:         Number(form.rank) || 1,
        minSelect:    Number(form.minSelect) || 0,
        maxSelect:    Number(form.maxSelect) || 1,
        isRequired:   !!form.isRequired,
        isActive:     form.isActive !== false,
      }
      if (modal === 'add') {
        const created = await api.post('/addon-groups', body)
        const groupId = created?.id
        if (groupId && validOptions.length > 0) {
          for (const opt of validOptions) {
            await api.post(`/addon-groups/${groupId}/options`, {
              name: opt.name.trim(), price: Number(opt.price) || 0,
              isVeg: opt.isVeg !== false, isActive: opt.isActive !== false, rank: 1,
            })
          }
        }
      } else {
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

  // Drag handlers
  function onDragStart(e, id) {
    setDragId(String(id)); e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e, id) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(String(id))
  }
  function onDrop(e, targetId) {
    e.preventDefault()
    const fromId = dragId, toId = String(targetId)
    if (!fromId || fromId === toId) { setDragId(null); setDragOverId(null); return }
    const newOrder = [...localOrder]
    const fi = newOrder.indexOf(fromId), ti = newOrder.indexOf(toId)
    if (fi === -1 || ti === -1) return
    newOrder.splice(fi, 1); newOrder.splice(ti, 0, fromId)
    setLocalOrder(newOrder)
    const byId = Object.fromEntries(groups.map(g => [String(g.id), g]))
    newOrder.forEach((id, idx) => {
      const g = byId[id]
      if (g) api.put(`/addon-groups/${id}`, { ...g, restaurantId: rid, rank: idx + 1 }).catch(() => {})
    })
    setDragId(null); setDragOverId(null)
  }

  const byId = Object.fromEntries(groups.map(g => [String(g.id), g]))
  const ordered = localOrder.map(id => byId[id]).filter(Boolean)

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
          {ordered.map(g => {
            const isDragging = dragId === String(g.id)
            const isDragOver = dragOverId === String(g.id)
            return (
              <div
                key={g.id}
                draggable
                onDragStart={e => onDragStart(e, g.id)}
                onDragOver={e  => onDragOver(e, g.id)}
                onDrop={e      => onDrop(e, g.id)}
                onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
                  borderTop: isDragOver ? '2px solid var(--accent)' : '1px solid var(--border)',
                  opacity: isDragging ? 0.4 : 1,
                  transition: 'opacity 0.15s, border-color 0.1s',
                }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {/* Drag handle */}
                    <span title="Drag to reorder" style={{
                      fontSize: 15, cursor: 'grab', color: 'var(--text-muted)', userSelect: 'none', flexShrink: 0,
                    }}>⠿</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{g.name}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                        {g.isRequired?'Required':'Optional'} · Select {g.minSelect||0}–{g.maxSelect||1} · {g.options?.length||0} options
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <StatusBadge active={g.isActive} />
                    <button onClick={() => setExpanded(expanded===g.id ? null : g.id)}
                      style={{ fontSize:12, padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)',
                        background:'transparent', color:'var(--text-muted)', cursor:'pointer' }}>
                      {expanded===g.id ? '▲' : '▼'}
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
                        <span style={{ fontSize:13, color:'#10b981', fontWeight:600 }}>{o.price ? fmt(o.price) : 'Free'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
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
