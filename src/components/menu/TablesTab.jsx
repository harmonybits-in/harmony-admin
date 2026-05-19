import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { SkeletonGrid } from '../Skeleton'
import { Inp, Sel, Chk, Modal, StatusBadge } from './MenuShared'

export default function TablesTab({ rid }) {
  const toast = useToast()
  const [areas, setAreas]     = useState([])
  const [tables, setTables]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
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

      {modal==='addArea' && (
        <Modal title="➕ Add Area" onClose={() => setModal(null)} onSubmit={saveArea} saving={saving}>
          <Inp label="Area Name" value={form.name} onChange={e => setForm(s=>({...s,name:e.target.value}))}
            required placeholder="e.g. Ground Floor, Rooftop, AC Section" />
        </Modal>
      )}

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
