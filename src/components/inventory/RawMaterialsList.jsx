// src/components/inventory/RawMaterialsList.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { rawMaterialApi } from '../../api/inventoryApi'
import { useToast } from '../../hooks/useToast'
import { CATEGORIES } from './RawMaterialShared'

const TH = {
  padding:'10px 14px', textAlign:'left', fontSize:11, color:'#888',
  fontWeight:600, borderBottom:'1px solid #eee', background:'#fafafa',
  whiteSpace:'nowrap'
}
const TD = { padding:'10px 14px', fontSize:13, borderBottom:'1px solid #f5f5f5', verticalAlign:'middle' }

export default function RawMaterialsList({ rid, onAdd, onEdit }) {
  const toast = useToast()

  const [items,        setItems]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState('All categories')
  const [selectedIds,  setSelectedIds]  = useState(new Set())
  const [pendingEdits, setPendingEdits] = useState({})  // { [id]: { name, category } }
  const [bulkBusy,     setBulkBusy]     = useState(false)
  const [showFiles,    setShowFiles]    = useState(false)
  const [showAction,   setShowAction]   = useState(false)
  const [importing,    setImporting]    = useState(false)
  const filesRef  = useRef()
  const actionRef = useRef()
  const csvRef    = useRef()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await rawMaterialApi.getAll(rid, { size: 200 })
      setItems(Array.isArray(r) ? r : (r?.content || []))
    } catch (_) { setItems([]) } finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [load])

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e) {
      if (filesRef.current  && !filesRef.current.contains(e.target))  setShowFiles(false)
      if (actionRef.current && !actionRef.current.contains(e.target)) setShowAction(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Category tabs
  const cats = ['All categories', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))]
  const catCounts = cats.map(c => ({
    cat: c,
    count: c === 'All categories' ? items.length : items.filter(i => i.category === c).length
  }))

  const filtered = items.filter(item => {
    const ms = !search || (item.name || '').toLowerCase().includes(search.toLowerCase())
    const mc = catFilter === 'All categories' || item.category === catFilter
    return ms && mc
  })

  // ── Select All ────────────────────────────────────────────────────
  const allFilteredSelected = filtered.length > 0 && filtered.every(i => selectedIds.has(i.id))
  const someSelected        = filtered.some(i => selectedIds.has(i.id))

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filtered.forEach(i => next.delete(i.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filtered.forEach(i => next.add(i.id))
        return next
      })
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Inline edit tracking ──────────────────────────────────────────
  function onFieldChange(id, field, value) {
    setPendingEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }))
  }

  // ── Bulk actions ──────────────────────────────────────────────────
  async function bulkActivate(active) {
    if (selectedIds.size === 0) { toast.error('Koi item select nahi hai'); return }
    setShowAction(false)
    setBulkBusy(true)
    const results = await Promise.allSettled([...selectedIds].map(id => rawMaterialApi.toggleActive(id, active)))
    const ok = results.filter(r => r.status === 'fulfilled').length
    setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, active } : i))
    toast.success(`${ok} item${ok !== 1 ? 's' : ''} ${active ? 'activated' : 'deactivated'}`)
    setBulkBusy(false)
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) { toast.error('Koi item select nahi hai'); return }
    if (!confirm(`${selectedIds.size} item(s) delete karna chahte hain?`)) return
    setShowAction(false)
    setBulkBusy(true)
    const results = await Promise.allSettled([...selectedIds].map(id => rawMaterialApi.delete(id)))
    const ok = results.filter(r => r.status === 'fulfilled').length
    setItems(prev => prev.filter(i => !selectedIds.has(i.id)))
    setSelectedIds(new Set())
    toast.success(`${ok} item${ok !== 1 ? 's' : ''} deleted`)
    setBulkBusy(false)
  }

  async function applyChanges() {
    const ids = Object.keys(pendingEdits)
    if (ids.length === 0) { toast.error('Koi change nahi hua'); return }
    setShowAction(false)
    setBulkBusy(true)
    const results = await Promise.allSettled(
      ids.map(id => {
        const item = items.find(i => String(i.id) === String(id))
        return item ? rawMaterialApi.update(id, { ...item, ...pendingEdits[id] }) : Promise.reject()
      })
    )
    const ok = results.filter(r => r.status === 'fulfilled').length
    setPendingEdits({})
    toast.success(`${ok} item${ok !== 1 ? 's' : ''} updated`)
    load()
    setBulkBusy(false)
  }

  async function toggleActive(item) {
    try {
      await rawMaterialApi.toggleActive(item.id, !item.active)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i))
    } catch (_) { toast.error('Failed') }
  }

  async function toggleFav(item) {
    try {
      await rawMaterialApi.toggleFavourite(item.id, !item.favourite)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, favourite: !i.favourite } : i))
    } catch (_) {}
  }

  const hasPending = Object.keys(pendingEdits).length > 0

  function downloadTemplate() {
    const rows = [
      'Name,Category,Sub Category,Purchase Unit,Consumption Unit,Conversion Qty,Purchase Price,Tax Type,Tax(%),HSN,Min Stock Level,Min Stock Unit,Barcode/Short Code,Description,Active',
      'Tomato,Vegetables,,Kg,Kg,1,50,GST,5,,0,,TOM,,Yes',
      'Refined Oil,Pantry,,Ltr,Ltr,1,120,GST,0,,0,,,Cooking oil,Yes',
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'raw_materials_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCsvUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    if (!file.name.toLowerCase().endsWith('.csv')) { toast.error('Sirf .csv file allowed hai'); return }
    setImporting(true)
    setShowFiles(false)
    try {
      const token = localStorage.getItem('harmoney_token') || ''
      const fd = new FormData(); fd.append('file', file); fd.append('restaurantId', rid)
      const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
      const res = await fetch(`${BASE}/import/raw-materials`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `${res.status}`)
      toast.success(`✅ Import done — ${data.created ?? 0} created, ${data.updated ?? 0} updated, ${data.skipped ?? 0} skipped`)
      load()
    } catch (err) {
      toast.error('Import failed: ' + (err.message || 'Server error'))
    } finally { setImporting(false) }
  }

  return (
    <div style={{ background: '#f8f9fb', minHeight: '100%' }}>
      {/* ── Page header ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8eaed', padding: '16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', margin: 0, letterSpacing: '-0.3px' }}>
            Raw Materials Management
          </h1>
          {selectedIds.size > 0 && (
            <div style={{ fontSize: 12, color: '#e53e3e', fontWeight: 600, marginTop: 2 }}>
              {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>

          {/* Action dropdown */}
          <div ref={actionRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowAction(s => !s)} disabled={bulkBusy} style={{
              padding: '8px 16px', borderRadius: 7, border: '1px solid #dde1e7',
              background: '#fff', color: '#555', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: bulkBusy ? 0.6 : 1,
            }}>
              {bulkBusy ? '⏳' : 'Action'} <span style={{ fontSize: 10 }}>▼</span>
            </button>
            {showAction && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
                background: '#fff', border: '1px solid #e8eaed', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,.12)', minWidth: 180, overflow: 'hidden' }}>
                <button onClick={applyChanges} style={{
                  display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
                  border: 'none', background: hasPending ? '#f0fdf4' : 'none', fontSize: 13,
                  color: hasPending ? '#15803d' : '#333', cursor: 'pointer', fontWeight: hasPending ? 700 : 400,
                }}
                  onMouseEnter={e => e.target.style.background = hasPending ? '#dcfce7' : '#f5f5f5'}
                  onMouseLeave={e => e.target.style.background = hasPending ? '#f0fdf4' : 'none'}>
                  ✔ Apply Changes{hasPending ? ` (${Object.keys(pendingEdits).length})` : ''}
                </button>
                <button onClick={() => bulkActivate(true)} style={{
                  display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
                  border: 'none', background: 'none', fontSize: 13, color: '#333', cursor: 'pointer',
                }}
                  onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.target.style.background = 'none'}>
                  ✅ Bulk Activate
                </button>
                <button onClick={() => bulkActivate(false)} style={{
                  display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
                  border: 'none', background: 'none', fontSize: 13, color: '#333', cursor: 'pointer',
                }}
                  onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.target.style.background = 'none'}>
                  ⭕ Bulk Deactivate
                </button>
                <button onClick={bulkDelete} style={{
                  display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
                  border: 'none', background: 'none', fontSize: 13, color: '#e53e3e', cursor: 'pointer',
                }}
                  onMouseEnter={e => e.target.style.background = '#fff5f5'}
                  onMouseLeave={e => e.target.style.background = 'none'}>
                  🗑 Delete Selected
                </button>
              </div>
            )}
          </div>

          <button style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e53e3e',
            background: '#fff5f5', color: '#e53e3e', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            ＋ Quick Add
          </button>

          <button onClick={onAdd} style={{ padding: '8px 18px', borderRadius: 7, border: 'none',
            background: '#e53e3e', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(229,62,62,.3)' }}>
            ＋ Create New
          </button>

          {/* Files dropdown */}
          <div ref={filesRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowFiles(s => !s)} style={{
              padding: '8px 14px', borderRadius: 7, border: '1px solid #dde1e7',
              background: '#fff', color: '#555', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              📄 Files <span style={{ fontSize: 10 }}>▼</span>
            </button>
            {showFiles && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200,
                background: '#fff', border: '1px solid #e8eaed', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,.12)', minWidth: 200, overflow: 'hidden' }}>
                <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />
                <div style={{ padding: '8px 0' }}>
                  <div style={{ padding: '4px 16px 6px', fontSize: 11, color: '#aaa', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: .5 }}>Import</div>
                  {[
                    { label: 'Download Template', action: downloadTemplate },
                    { label: importing ? 'Importing…' : 'Upload CSV', action: () => csvRef.current?.click() },
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action} style={{ display: 'block', width: '100%', padding: '9px 16px 9px 24px',
                      textAlign: 'left', border: 'none', background: 'none', fontSize: 13, color: '#333', cursor: 'pointer' }}
                      onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                      onMouseLeave={e => e.target.style.background = 'none'}>
                      {label}
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />
                  <div style={{ padding: '4px 16px 6px', fontSize: 11, color: '#aaa', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: .5 }}>Export</div>
                  {['Export Current Page', 'Export All'].map(a => (
                    <button key={a} style={{ display: 'block', width: '100%', padding: '9px 16px 9px 24px',
                      textAlign: 'left', border: 'none', background: 'none', fontSize: 13, color: '#333', cursor: 'pointer' }}
                      onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                      onMouseLeave={e => e.target.style.background = 'none'}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        {/* ── Search + Filter bar ── */}
        <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10,
          padding: '14px 16px', marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#aaa', marginBottom: 4, fontWeight: 500 }}>Name</label>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search raw material..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #dde1e7',
                  fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#111' }} />
            </div>
            <div style={{ minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#aaa', marginBottom: 4, fontWeight: 500 }}>Category</label>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #dde1e7',
                  fontSize: 13, outline: 'none', background: '#fff', color: '#333', cursor: 'pointer' }}>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingTop: 20 }}>
            <button style={{ padding: '8px 18px', borderRadius: 6, border: 'none',
              background: '#e53e3e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Search
            </button>
            <button onClick={() => { setSearch(''); setCatFilter('All categories') }}
              style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #dde1e7',
                background: '#fff', color: '#666', fontSize: 13, cursor: 'pointer' }}>
              Clear
            </button>
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 14,
          background: '#fff', border: '1px solid #e8eaed', borderRadius: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,.04)', overflowX: 'auto' }}>
          {catCounts.map(({ cat, count }, idx) => {
            const active = cat === catFilter
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{
                flex: '0 0 auto', padding: '14px 20px', border: 'none', cursor: 'pointer',
                borderRight: idx < catCounts.length - 1 ? '1px solid #f0f0f0' : 'none',
                borderBottom: active ? '2px solid #e53e3e' : '2px solid transparent',
                background: active ? '#fff5f5' : '#fff', transition: 'all .15s',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#e53e3e' : '#333' }}>{cat}</div>
                <div style={{ fontSize: 11, color: active ? '#e53e3e' : '#aaa', marginTop: 2 }}>
                  {count} Ingredient{count !== 1 ? 's' : ''}
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Table ── */}
        <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 10,
          overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: 40 }}>
                  <input
                    type="checkbox"
                    style={{ accentColor: '#e53e3e', cursor: 'pointer', width: 15, height: 15 }}
                    checked={allFilteredSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allFilteredSelected }}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={TH}>Name</th>
                <th style={TH}>Category</th>
                <th style={TH}>Unit</th>
                <th style={TH}>Purchase Price</th>
                <th style={TH}>Current Stock</th>
                <th style={{ ...TH, textAlign: 'center' }}>Set As Favourite</th>
                <th style={{ ...TH, textAlign: 'center' }}>Active</th>
                <th style={TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} style={TD}>
                        <div style={{ height: 14, background: '#f0f0f0', borderRadius: 4, width: '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '48px 0', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                  No raw materials found.
                </td></tr>
              ) : filtered.map((item, i) => {
                const isSelected = selectedIds.has(item.id)
                const edit = pendingEdits[item.id] || {}
                const hasEdit = !!pendingEdits[item.id]
                return (
                  <tr key={item.id || i}
                    style={{ background: isSelected ? '#fff5f5' : hasEdit ? '#fffbeb' : '#fff' }}
                    onMouseEnter={e => { if (!isSelected && !hasEdit) e.currentTarget.style.background = '#fafafa' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#fff5f5' : hasEdit ? '#fffbeb' : '#fff' }}>

                    <td style={TD}>
                      <input
                        type="checkbox"
                        style={{ accentColor: '#e53e3e', cursor: 'pointer', width: 15, height: 15 }}
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>

                    {/* Name — inline editable */}
                    <td style={TD}>
                      <input
                        value={edit.name !== undefined ? edit.name : (item.name || '')}
                        onChange={e => onFieldChange(item.id, 'name', e.target.value)}
                        style={{ padding: '5px 8px', borderRadius: 5,
                          border: `1px solid ${hasEdit ? '#f59e0b' : '#e8eaed'}`,
                          fontSize: 13, color: '#111', background: 'transparent', width: '100%', fontWeight: 500 }}
                        onFocus={e => e.target.style.borderColor = '#e53e3e'}
                        onBlur={e => e.target.style.borderColor = hasEdit ? '#f59e0b' : '#e8eaed'}
                      />
                    </td>

                    {/* Category — inline editable */}
                    <td style={TD}>
                      <select
                        value={edit.category !== undefined ? edit.category : (item.category || '')}
                        onChange={e => onFieldChange(item.id, 'category', e.target.value)}
                        style={{ padding: '5px 8px', borderRadius: 5,
                          border: `1px solid ${hasEdit && edit.category !== undefined ? '#f59e0b' : '#e8eaed'}`,
                          fontSize: 13, color: '#555', background: 'transparent', cursor: 'pointer' }}>
                        <option value="">— Select —</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>

                    <td style={{ ...TD, color: '#777' }}>{item.purchaseUnit || item.consumptionUnit || item.unit || '—'}</td>

                    <td style={TD}>
                      <span style={{ fontWeight: 500 }}>
                        ₹{Number(item.purchasePrice || 0).toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td style={TD}>
                      <span style={{
                        fontWeight: 600,
                        color: Number(item.currentStock || 0) <= 2 ? '#e53e3e' :
                          Number(item.currentStock || 0) <= 5 ? '#f59e0b' : '#16a34a'
                      }}>
                        {Number(item.currentStock || 0).toFixed(1)} {item.purchaseUnit || item.unit || ''}
                      </span>
                    </td>

                    {/* Favourite */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <button onClick={() => toggleFav(item)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
                        color: item.favourite ? '#f59e0b' : '#ddd', transition: 'color .15s',
                      }}>★</button>
                    </td>

                    {/* Active toggle */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <div onClick={() => toggleActive(item)} style={{
                        width: 22, height: 22, borderRadius: 5, cursor: 'pointer',
                        border: `2px solid ${item.active ? '#16a34a' : '#ccc'}`,
                        background: item.active ? '#16a34a' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto', transition: 'all .15s',
                      }}>
                        {item.active && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button title="View Details" style={{
                          background: '#f5f5f5', border: '1px solid #e8eaed', borderRadius: 5,
                          padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: '#555' }}>📋</button>
                        <button onClick={() => onEdit(item)} title="Edit" style={{
                          background: '#f5f5f5', border: '1px solid #e8eaed', borderRadius: 5,
                          padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: '#555' }}>✏️</button>
                        <button title="Stock Ledger" style={{
                          background: '#f5f5f5', border: '1px solid #e8eaed', borderRadius: 5,
                          padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: '#555' }}>📊</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0',
            fontSize: 11, color: '#888', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Showing 1 to {filtered.length} of {filtered.length} records
              {selectedIds.size > 0 && <span style={{ color: '#e53e3e', fontWeight: 600 }}> · {selectedIds.size} selected</span>}
              {hasPending && <span style={{ color: '#f59e0b', fontWeight: 600 }}> · {Object.keys(pendingEdits).length} unsaved changes</span>}
            </span>
            <span>{items.length} total raw materials</span>
          </div>
        </div>
      </div>
    </div>
  )
}
