// src/pages/inventory/UnitManagement.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { api } from '../api/client'

const MOCK_UNITS = [
  { id:1,  name:'kg',      symbol:'kg',   createdAt:'2024-04-24T17:20:08', updatedAt:'2024-04-24T17:20:08', deletable:true  },
  { id:2,  name:'Gram',    symbol:'gm',   createdAt:'2024-04-24T17:20:08', updatedAt:'2024-04-24T17:20:08', deletable:true  },
  { id:3,  name:'Litre',   symbol:'ltr',  createdAt:'2024-04-24T17:20:08', updatedAt:'2024-04-24T17:20:08', deletable:true  },
  { id:4,  name:'ML',      symbol:'ml',   createdAt:'2024-04-24T17:20:08', updatedAt:'2024-04-24T17:20:08', deletable:false },
  { id:5,  name:'Pieces',  symbol:'pcs',  createdAt:'2024-04-24T17:20:08', updatedAt:'2024-04-24T17:20:08', deletable:true  },
  { id:6,  name:'Bag',     symbol:'bag',  createdAt:'2024-04-24T17:20:08', updatedAt:'2024-04-24T17:20:08', deletable:false },
  { id:7,  name:'Box',     symbol:'box',  createdAt:'2024-04-24T17:20:08', updatedAt:'2024-04-24T17:20:08', deletable:true  },
  { id:8,  name:'Bottle',  symbol:'btl',  createdAt:'2024-04-24T17:20:08', updatedAt:'2024-04-24T17:20:08', deletable:true  },
  { id:9,  name:'Dozen',   symbol:'doz',  createdAt:'2024-04-24T17:20:08', updatedAt:'2024-04-24T17:20:08', deletable:false },
  { id:10, name:'25 kg bag',symbol:'25kg',createdAt:'2024-04-24T17:20:08', updatedAt:'2024-04-24T17:20:08', deletable:true  },
]

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:false })
}

// ── Icon buttons ──────────────────────────────────────────────────
function IconBtn({ icon, onClick, title, color='#666', bg='#f5f5f5', border='#e0e0e0', disabled=false }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        width:34, height:34, borderRadius:8, border:`1px solid ${hov&&!disabled?color:border}`,
        background: hov&&!disabled ? color+'15' : bg,
        color: disabled?'#ccc':color, fontSize:14, cursor:disabled?'not-allowed':'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all .15s', flexShrink:0,
      }}>
      {icon}
    </button>
  )
}

// ── Inline edit row ───────────────────────────────────────────────
function UnitRow({ unit, onSave, onDelete, index }) {
  const [editing, setEditing] = useState(false)
  const [name,    setName]    = useState(unit.name)
  const [symbol,  setSymbol]  = useState(unit.symbol||'')
  const [hov,     setHov]     = useState(false)

  function handleSave() {
    if (!name.trim()) return
    onSave(unit.id, { name: name.trim(), symbol: symbol.trim() })
    setEditing(false)
  }

  function handleCancel() {
    setName(unit.name)
    setSymbol(unit.symbol||'')
    setEditing(false)
  }

  const rowBg = hov ? '#fafafa' : index % 2 === 0 ? '#fff' : '#fdfdfd'

  return (
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:rowBg, transition:'background .1s' }}>

      {/* Index */}
      <td style={{ padding:'13px 16px', fontSize:12, color:'#bbb', width:44, textAlign:'center',
        borderBottom:'1px solid #f0f0f0' }}>
        {index + 1}
      </td>

      {/* Name */}
      <td style={{ padding:'10px 16px', borderBottom:'1px solid #f0f0f0' }}>
        {editing ? (
          <input value={name} onChange={e=>setName(e.target.value)}
            autoFocus
            onKeyDown={e=>{ if(e.key==='Enter') handleSave(); if(e.key==='Escape') handleCancel() }}
            style={{ padding:'6px 10px', borderRadius:6, border:'1.5px solid #e53e3e',
              fontSize:13, color:'#111', outline:'none', width:'100%', boxSizing:'border-box',
              background:'#fff5f5' }}/>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Color dot based on unit type */}
            <div style={{
              width:8, height:8, borderRadius:50, flexShrink:0,
              background: unit.deletable ? '#10b981' : '#6366f1',
            }}/>
            <span style={{ fontSize:13, fontWeight:500, color:'#111' }}>{unit.name}</span>
            {unit.symbol && unit.symbol !== unit.name && (
              <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20, fontWeight:600,
                background:'#f0f0f0', color:'#888' }}>
                {unit.symbol}
              </span>
            )}
          </div>
        )}
      </td>

      {/* Symbol */}
      <td style={{ padding:'10px 16px', borderBottom:'1px solid #f0f0f0', width:120 }}>
        {editing ? (
          <input value={symbol} onChange={e=>setSymbol(e.target.value)}
            placeholder="e.g. kg"
            onKeyDown={e=>{ if(e.key==='Enter') handleSave(); if(e.key==='Escape') handleCancel() }}
            style={{ padding:'6px 10px', borderRadius:6, border:'1.5px solid #e53e3e',
              fontSize:13, color:'#111', outline:'none', width:'100%', boxSizing:'border-box',
              background:'#fff5f5' }}/>
        ) : (
          <span style={{ fontSize:12, color:'#888' }}>{unit.symbol||'—'}</span>
        )}
      </td>

      {/* Created */}
      <td style={{ padding:'13px 16px', fontSize:12, color:'#aaa',
        borderBottom:'1px solid #f0f0f0', whiteSpace:'nowrap' }}>
        {fmtDate(unit.createdAt)}
      </td>

      {/* Modified */}
      <td style={{ padding:'13px 16px', fontSize:12, color:'#aaa',
        borderBottom:'1px solid #f0f0f0', whiteSpace:'nowrap' }}>
        {fmtDate(unit.updatedAt)}
      </td>

      {/* Actions */}
      <td style={{ padding:'10px 16px', borderBottom:'1px solid #f0f0f0' }}>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {editing ? (
            <>
              <button onClick={handleSave} style={{
                padding:'5px 14px', borderRadius:6, border:'none',
                background:'#e53e3e', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                Save
              </button>
              <button onClick={handleCancel} style={{
                padding:'5px 12px', borderRadius:6, border:'1px solid #ddd',
                background:'#fff', color:'#666', fontSize:12, cursor:'pointer' }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <IconBtn icon="📋" title="Duplicate" color="#6366f1"
                onClick={()=>onSave(null,{name:unit.name+' (copy)',symbol:unit.symbol})}/>
              <IconBtn icon="✏️" title="Edit" color="#f59e0b"
                onClick={()=>setEditing(true)}/>
              <IconBtn icon="✕" title={unit.deletable?'Delete':'System unit — cannot delete'}
                color="#ef4444" disabled={!unit.deletable}
                onClick={()=>unit.deletable && onDelete(unit.id)}/>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ════════════════════════════════════════════════════════════════
export default function UnitManagement() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [units,    setUnits]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [newName,  setNewName]  = useState('')
  const [newSym,   setNewSym]   = useState('')
  const [adding,   setAdding]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const PER_PAGE = 10

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/inventory/units?restaurantId=${rid}`)
      const list = Array.isArray(r) ? r : (r?.content || [])
      setUnits(list.length ? list : MOCK_UNITS)
    } catch(_) { setUnits(MOCK_UNITS) }
    finally { setLoading(false) }
  }, [rid])

  useEffect(()=>{ load() },[])

  const filtered = units.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.symbol||'').toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  async function handleSave(id, data) {
    setSaving(true)
    try {
      if (id) {
        // Update existing
        setUnits(prev => prev.map(u => u.id===id ? {...u,...data,updatedAt:new Date().toISOString()} : u))
        toast.success('Unit updated!')
      } else {
        // Create new
        const newUnit = {
          id: Date.now(), ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletable: true,
        }
        setUnits(prev => [newUnit, ...prev])
        toast.success('Unit added!')
        setNewName(''); setNewSym(''); setAdding(false)
      }
    } catch(_){ toast.error('Failed') } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this unit?')) return
    setUnits(prev => prev.filter(u => u.id !== id))
    toast.success('Unit deleted')
  }

  // ── Stats ─────────────────────────────────────────────────────
  const systemUnits = units.filter(u => !u.deletable).length
  const customUnits = units.filter(u => u.deletable).length

  return (
    <div style={{ padding:'0 0 40px' }}>

      {/* ── Page Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', margin:0, letterSpacing:'-0.4px' }}>
            Unit Management
          </h1>
          <p style={{ fontSize:12, color:'#aaa', marginTop:4 }}>
            Measurement units define karo — Raw Materials mein use honge
          </p>
        </div>
        <button onClick={()=>{ setAdding(true); setTimeout(()=>document.getElementById('new-unit-input')?.focus(),100) }}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 20px',
            borderRadius:8, border:'none', background:'#e53e3e', color:'#fff',
            fontSize:13, fontWeight:700, cursor:'pointer',
            boxShadow:'0 3px 10px rgba(229,62,62,.35)', transition:'transform .1s' }}
          onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
          onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
          ＋ Create New
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {[
          { label:'Total Units', value:units.length, icon:'📐', color:'#6366f1', bg:'#ede9fe' },
          { label:'Custom Units', value:customUnits,  icon:'✏️', color:'#10b981', bg:'#d1fae5' },
          { label:'System Units', value:systemUnits,  icon:'🔒', color:'#f59e0b', bg:'#fef3c7' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:12,
            padding:'12px 18px', borderRadius:10, background:'#fff',
            border:'1px solid #e8eaed', flex:1,
            boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ width:38, height:38, borderRadius:9, background:bg,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:11, color:'#aaa', marginTop:3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search bar ── */}
      <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
        padding:'14px 16px', marginBottom:14,
        display:'flex', gap:10, alignItems:'center',
        boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
        <div style={{ flex:1 }}>
          <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4, fontWeight:500 }}>
            Name
          </label>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
              fontSize:13, color:'#ccc' }}>🔍</span>
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }}
              placeholder="Unit naam search karo..."
              style={{ width:'100%', padding:'8px 10px 8px 32px', borderRadius:7,
                border:'1px solid #dde1e7', fontSize:13, outline:'none',
                boxSizing:'border-box', color:'#111' }}
              onKeyDown={e=>e.key==='Escape'&&setSearch('')}/>
            {search && (
              <button onClick={()=>{ setSearch(''); setPage(1) }}
                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:14 }}>
                ×
              </button>
            )}
          </div>
        </div>
        <div style={{ paddingTop:20, display:'flex', gap:8 }}>
          <button onClick={()=>setPage(1)} style={{ padding:'8px 18px', borderRadius:7,
            border:'none', background:'#e53e3e', color:'#fff', fontSize:13, fontWeight:600,
            cursor:'pointer' }}>
            Search
          </button>
          <button onClick={()=>{ setSearch(''); setPage(1) }} style={{ padding:'8px 14px',
            borderRadius:7, border:'1px solid #dde1e7', background:'#fff',
            color:'#666', fontSize:13, cursor:'pointer' }}>
            Clear
          </button>
        </div>
      </div>

      {/* ── Main table ── */}
      <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
        overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>

        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'linear-gradient(135deg,#fafafa 0%,#f5f5f5 100%)' }}>
              <th style={{ padding:'12px 16px', width:44, fontSize:11, color:'#ccc',
                borderBottom:'2px solid #eee', textAlign:'center' }}>#</th>
              <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11,
                color:'#888', fontWeight:700, borderBottom:'2px solid #eee',
                letterSpacing:.3 }}>NAME</th>
              <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11,
                color:'#888', fontWeight:700, borderBottom:'2px solid #eee',
                width:120, letterSpacing:.3 }}>SYMBOL</th>
              <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11,
                color:'#888', fontWeight:700, borderBottom:'2px solid #eee',
                letterSpacing:.3 }}>CREATED</th>
              <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11,
                color:'#888', fontWeight:700, borderBottom:'2px solid #eee',
                letterSpacing:.3 }}>MODIFIED</th>
              <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11,
                color:'#888', fontWeight:700, borderBottom:'2px solid #eee',
                letterSpacing:.3 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {/* ── Inline Add Row ── */}
            {adding && (
              <tr style={{ background:'#fff8f8', borderBottom:'2px solid #fecaca' }}>
                <td style={{ padding:'12px 16px', textAlign:'center', fontSize:12, color:'#e53e3e' }}>
                  ★
                </td>
                <td style={{ padding:'10px 16px' }}>
                  <input id="new-unit-input" value={newName} onChange={e=>setNewName(e.target.value)}
                    placeholder="Unit naam daalo *"
                    onKeyDown={e=>{ if(e.key==='Enter') { if(newName.trim()) handleSave(null,{name:newName.trim(),symbol:newSym.trim()}) } if(e.key==='Escape'){setAdding(false);setNewName('');setNewSym('')} }}
                    style={{ padding:'7px 10px', borderRadius:6, width:'100%',
                      border:'1.5px solid #e53e3e', fontSize:13, outline:'none',
                      boxSizing:'border-box', background:'#fff' }}/>
                </td>
                <td style={{ padding:'10px 16px' }}>
                  <input value={newSym} onChange={e=>setNewSym(e.target.value)}
                    placeholder="e.g. kg"
                    onKeyDown={e=>{ if(e.key==='Enter'&&newName.trim()) handleSave(null,{name:newName.trim(),symbol:newSym.trim()}) }}
                    style={{ padding:'7px 10px', borderRadius:6, width:'100%',
                      border:'1.5px solid #e53e3e', fontSize:13, outline:'none',
                      boxSizing:'border-box', background:'#fff' }}/>
                </td>
                <td colSpan={2} style={{ padding:'10px 16px', fontSize:11, color:'#e53e3e' }}>
                  Enter dabao to save · Esc to cancel
                </td>
                <td style={{ padding:'10px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>newName.trim()&&handleSave(null,{name:newName.trim(),symbol:newSym.trim()})}
                      disabled={!newName.trim()||saving}
                      style={{ padding:'6px 16px', borderRadius:6, border:'none',
                        background:newName.trim()?'#e53e3e':'#f0f0f0',
                        color:newName.trim()?'#fff':'#aaa',
                        fontSize:12, fontWeight:600, cursor:newName.trim()?'pointer':'not-allowed' }}>
                      {saving?'...':'Save'}
                    </button>
                    <button onClick={()=>{setAdding(false);setNewName('');setNewSym('')}}
                      style={{ padding:'6px 12px', borderRadius:6,
                        border:'1px solid #ddd', background:'#fff',
                        color:'#666', fontSize:12, cursor:'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* ── Data rows ── */}
            {loading ? (
              Array.from({length:6}).map((_,i) => (
                <tr key={i} style={{ background:i%2?'#fdfdfd':'#fff' }}>
                  {[44,200,100,180,180,120].map((w,j) => (
                    <td key={j} style={{ padding:'14px 16px', borderBottom:'1px solid #f0f0f0' }}>
                      <div style={{ height:12, background:'#f0f0f0', borderRadius:4,
                        width: j===0?'60%':'80%',
                        animation:'pulse 1.5s ease-in-out infinite' }}/>
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding:'48px 0', textAlign:'center' }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📐</div>
                  <div style={{ fontSize:14, color:'#aaa', fontWeight:500 }}>
                    {search ? `"${search}" nahi mila` : 'Koi unit nahi — Create New click karo'}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((unit, i) => (
                <UnitRow key={unit.id} unit={unit} index={(page-1)*PER_PAGE + i}
                  onSave={handleSave} onDelete={handleDelete}/>
              ))
            )}
          </tbody>
        </table>

        {/* ── Footer: count + pagination ── */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid #f0f0f0',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'#fafafa' }}>
          <span style={{ fontSize:12, color:'#aaa' }}>
            Showing {filtered.length === 0 ? 0 : (page-1)*PER_PAGE+1} to{' '}
            {Math.min(page*PER_PAGE, filtered.length)} of {filtered.length} records
          </span>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
              <PageBtn label="← Prev"  onClick={()=>setPage(p=>Math.max(1,p-1))}  disabled={page===1}/>
              {Array.from({length:totalPages},(_,i)=>i+1).map(p => (
                <PageBtn key={p} label={String(p)} active={p===page}
                  onClick={()=>setPage(p)}/>
              ))}
              <PageBtn label="Next →" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}/>
              <PageBtn label="Last"   onClick={()=>setPage(totalPages)} disabled={page===totalPages}/>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ marginTop:12, display:'flex', gap:16, fontSize:11, color:'#aaa' }}>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:8,height:8,borderRadius:50,background:'#10b981',display:'inline-block' }}/>
          Custom (deletable)
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:8,height:8,borderRadius:50,background:'#6366f1',display:'inline-block' }}/>
          System (protected)
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100%{opacity:1} 50%{opacity:.4}
        }
      `}</style>
    </div>
  )
}

function PageBtn({ label, onClick, disabled=false, active=false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minWidth:34, height:34, padding:'0 10px', borderRadius:7, fontSize:12, fontWeight:600,
      border: active ? 'none' : '1px solid #e0e0e0',
      background: active ? '#e53e3e' : disabled ? '#fafafa' : '#fff',
      color: active ? '#fff' : disabled ? '#ccc' : '#555',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition:'all .15s',
    }}>
      {label}
    </button>
  )
}
