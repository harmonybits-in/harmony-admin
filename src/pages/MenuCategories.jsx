// src/pages/MenuCategories.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

const iStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
  boxSizing: 'border-box', border: '1px solid var(--border)',
  background: 'var(--bg-secondary)', color: 'var(--text)', outline: 'none',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
        color: 'var(--text-muted)', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

// ── Password Confirm Modal ────────────────────────────────────────────────
function PasswordConfirmModal({ category, warningText, onConfirm, onCancel }) {
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pwd.trim()) { setErr('Password daalo'); return }
    setBusy(true); setErr('')
    try {
      const BASE  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
      const token = localStorage.getItem('harmoney_token') || ''
      const res   = await fetch(`${BASE}/auth/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: pwd }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.valid) { onConfirm() } else { setErr('Galat password — dobara try karo') }
    } catch (_) {
      setErr('Galat password — dobara try karo')
    } finally { setBusy(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14, padding: '28px 28px 24px',
        width: 400, maxWidth: '90vw', border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)', color: 'var(--text)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(229,62,62,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🗑️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Category Delete</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Permanent action — undo nahi hogi</div>
          </div>
        </div>
        <div style={{
          background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.25)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13,
          color: 'var(--text)', lineHeight: 1.6,
        }}>
          <strong style={{ color: '#e53e3e' }}>"{category.name}"</strong> {warningText}
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            Confirm karne ke liye apna password daalo
          </div>
          <input
            type="password" value={pwd}
            onChange={e => { setPwd(e.target.value); setErr('') }}
            placeholder="Password" autoFocus
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
              boxSizing: 'border-box', background: 'var(--bg-page)', color: 'var(--text)',
              border: err ? '1.5px solid #e53e3e' : '1.5px solid var(--border)',
              outline: 'none', marginBottom: 8,
            }}
          />
          {err && <div style={{ fontSize: 12, color: '#e53e3e', marginBottom: 12 }}>⚠️ {err}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: err ? 0 : 8 }}>
            <button type="button" onClick={onCancel} style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)',
            }}>Cancel</button>
            <button type="submit" disabled={busy} style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer', border: 'none',
              background: busy ? '#c53030' : '#e53e3e', color: '#fff', opacity: busy ? 0.8 : 1,
            }}>{busy ? 'Verifying…' : 'Delete karo'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────
function CategoryModal({ modal, onClose, onSaved, toast, rid, allCategories }) {
  // modal can be: { _isAdd: true } | { _isAdd: true, _defaultParent: id } | CategoryObject(has .id)
  const isAdd = !modal.id
  const [form, setForm] = useState(() => ({
    name:              isAdd ? '' : (modal.name || ''),
    onlineDisplayName: isAdd ? '' : (modal.onlineDisplayName || ''),
    rank:              isAdd ? '' : String(modal.rank || ''),
    logoUrl:           isAdd ? '' : (modal.logoUrl || ''),
    isActive:          isAdd ? true : (modal.isActive ?? true),
    availableFrom:     isAdd ? '' : (modal.availableFrom || ''),
    availableTo:       isAdd ? '' : (modal.availableTo   || ''),
    parentId:          isAdd
      ? String(modal._defaultParent || '')
      : String(modal.parentId || ''),
  }))
  const [saving, setSaving] = useState(false)

  // Only top-level categories can be parents (no sub-sub), exclude self
  const parentOptions = allCategories.filter(c =>
    !c.parentId && (isAdd || c.id !== modal.id)
  )

  function set(k) {
    return e => setForm(f => ({
      ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Category name dalo'); return }
    setSaving(true)
    try {
      const body = {
        ...form,
        restaurantId: rid,
        rank:      Number(form.rank) || 0,
        availableFrom: form.availableFrom || null,
        availableTo:   form.availableTo   || null,
        parentId:      form.parentId ? Number(form.parentId) : null,
      }
      if (isAdd) {
        await api.post('/categories', body)
        toast.success(form.parentId ? 'Subcategory added!' : 'Category added!')
      } else {
        await api.put(`/categories/${modal.id}`, body)
        toast.success('Category updated!')
      }
      onSaved()
    } catch (_) {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0008', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '2rem',
        width: '100%', maxWidth: 460, boxShadow: '0 20px 60px #0004',
        maxHeight: '92vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>
            {isAdd
              ? form.parentId ? '📄 New Subcategory' : '📋 New Category'
              : '✏️ Edit Category'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Parent Category selector */}
          <Field label="Parent Category (optional)">
            <select value={form.parentId} onChange={set('parentId')} style={iStyle}>
              <option value="">— Top Level Category —</option>
              {parentOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          {/* Status badge — always visible */}
          {!form.parentId ? (
            <div style={{ fontSize: 11, padding: '8px 12px', borderRadius: 6,
              background: '#10b98115', color: '#10b981', border: '1px solid #10b98130',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>📁</span>
              <div>
                <strong>Parent / Top-Level Category banegi</strong>
                <div style={{ marginTop: 2, opacity: 0.85 }}>
                  Agar subcategory banana hai, toh upar se koi parent select karo.
                  {parentOptions.length === 0 && ' (Pehle yahi banao, phir iske andar subcategories add kar sakte ho)'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, padding: '8px 12px', borderRadius: 6,
              background: '#6366f115', color: '#6366f1', border: '1px solid #6366f130',
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>📄</span>
              <div>
                <strong>Subcategory banegi</strong>
                {' '}under <strong>"{parentOptions.find(c => String(c.id) === form.parentId)?.name || ''}"</strong>
              </div>
            </div>
          )}

          <Field label={form.parentId ? 'Subcategory Name *' : 'Category Name *'}>
            <input value={form.name} onChange={set('name')} required
              placeholder={form.parentId
                ? 'e.g. Veg Pizza, Aloo Paratha, Cold Coffee'
                : 'e.g. Starters, Main Course, Desserts'}
              style={iStyle} autoFocus />
          </Field>

          <Field label="Online Display Name">
            <input value={form.onlineDisplayName} onChange={set('onlineDisplayName')}
              placeholder="Blank rakhne par name hi use hoga"
              style={iStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Sort Rank">
              <input value={form.rank} onChange={set('rank')} type="number" min="0"
                placeholder="1 = pehle dikhega" style={iStyle} />
            </Field>
            <Field label="Logo / Image URL">
              <input value={form.logoUrl} onChange={set('logoUrl')}
                placeholder="https://..." style={iStyle} />
            </Field>
          </div>

          {form.logoUrl && (
            <img src={form.logoUrl} alt="preview"
              style={{ height: 48, width: 48, objectFit: 'cover', borderRadius: 8,
                border: '1px solid var(--border)' }}
              onError={e => { e.target.style.display = 'none' }} />
          )}

          {/* Time schedule */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
              letterSpacing: '0.06em', marginBottom: 8 }}>⏰ TIME SCHEDULE (optional)</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              Khali chhodo = hamesha available. Set karo to sirf us time window mein dikhega.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Available From">
                <input type="time" value={form.availableFrom} onChange={set('availableFrom')} style={iStyle} />
              </Field>
              <Field label="Available To">
                <input type="time" value={form.availableTo} onChange={set('availableTo')} style={iStyle} />
              </Field>
            </div>
            {form.availableFrom && form.availableTo && (
              <div style={{ marginTop: 8, fontSize: 11, padding: '6px 10px',
                background: 'var(--accent-bg)', borderRadius: 6, color: 'var(--accent)' }}>
                ⏰ Sirf {form.availableFrom} – {form.availableTo} ke beech dikhega
                {form.availableFrom > form.availableTo ? ' (overnight)' : ''}
              </div>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} style={{ width: 16, height: 16 }} />
            <span>Active (POS aur online menu mein visible)</span>
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 600,
              fontSize: 13, background: 'var(--accent)', color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Saving...' : isAdd ? (form.parentId ? 'Add Subcategory' : 'Add Category') : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function MenuCategories() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [items,         setItems]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState(null)
  const [toggling,      setToggling]      = useState(null)
  const [pwdConfirm,    setPwdConfirm]    = useState(null)
  const [selected,      setSelected]      = useState(new Set())
  const [bulkBusy,      setBulkBusy]      = useState(false)
  const [collapsedCats, setCollapsedCats] = useState(new Set())
  const [parentOrder,   setParentOrder]   = useState([])    // ordered parent IDs
  const [subOrders,     setSubOrders]     = useState({})    // { parentId: [id, ...] }
  const [dragItem,      setDragItem]      = useState(null)  // { type:'parent'|'sub', id, parentId? }
  const [dragOverId,    setDragOverId]    = useState(null)
  const selectAllRef = useRef(null)

  // Sync local order whenever items reload
  useEffect(() => {
    const sorted = [...items].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    setParentOrder(sorted.filter(c => !c.parentId).map(c => String(c.id)))
    const subs = {}
    sorted.filter(c => c.parentId).forEach(c => {
      const pid = String(c.parentId)
      if (!subs[pid]) subs[pid] = []
      subs[pid].push(String(c.id))
    })
    setSubOrders(subs)
  }, [items])

  function toggleCollapse(parentId) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(String(parentId)) ? next.delete(String(parentId)) : next.add(String(parentId))
      return next
    })
  }

  function onCatDragStart(e, type, id, parentId) {
    setDragItem({ type, id: String(id), parentId: parentId ? String(parentId) : null })
    e.dataTransfer.effectAllowed = 'move'
  }
  function onCatDragOver(e, id) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'
    setDragOverId(String(id))
  }
  function onCatDrop(e, targetId, targetParentId, catById) {
    e.preventDefault()
    if (!dragItem) return
    const fromId = dragItem.id
    const toId   = String(targetId)
    if (fromId === toId) { setDragItem(null); setDragOverId(null); return }

    if (dragItem.type === 'parent' && !targetParentId) {
      const newOrder = [...parentOrder]
      const fi = newOrder.indexOf(fromId), ti = newOrder.indexOf(toId)
      if (fi === -1 || ti === -1) return
      newOrder.splice(fi, 1); newOrder.splice(ti, 0, fromId)
      setParentOrder(newOrder)
      newOrder.forEach((id, idx) => {
        const cat = catById[id]
        if (cat) api.put(`/categories/${id}`, { ...cat, rank: idx + 1 }).catch(() => {})
      })
    } else if (dragItem.type === 'sub' && targetParentId && dragItem.parentId === String(targetParentId)) {
      const pid      = dragItem.parentId
      const newOrder = [...(subOrders[pid] || [])]
      const fi = newOrder.indexOf(fromId), ti = newOrder.indexOf(toId)
      if (fi === -1 || ti === -1) return
      newOrder.splice(fi, 1); newOrder.splice(ti, 0, fromId)
      setSubOrders(prev => ({ ...prev, [pid]: newOrder }))
      newOrder.forEach((id, idx) => {
        const cat = catById[id]
        if (cat) api.put(`/categories/${id}`, { ...cat, rank: idx + 1 }).catch(() => {})
      })
    }
    setDragItem(null); setDragOverId(null)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await api.get(`/categories/restaurant/${rid}`)
      const cats = Array.isArray(res) ? res : []
      cats.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
      setItems(cats)
      setSelected(new Set())
    } catch (_) {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [rid])

  useEffect(() => { load() }, [load])

  // Selection helpers
  const allIds      = items.map(c => c.id)
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someSelected = allIds.some(id => selected.has(id))

  function toggleSelectAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) { allIds.forEach(id => next.delete(id)) }
      else              { allIds.forEach(id => next.add(id)) }
      return next
    })
  }

  function toggleOne(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // Sync indeterminate state on select-all checkbox
  if (selectAllRef.current) {
    selectAllRef.current.indeterminate = someSelected && !allSelected
  }

  // Build lookup + ordered parent/sub maps (local drag order overrides item order)
  const { topLevel, subMap, catById } = useMemo(() => {
    const byId = Object.fromEntries(items.map(c => [String(c.id), c]))
    // Use local drag order if set, else fall back to items sorted by rank
    const pIds  = parentOrder.length ? parentOrder : [...items].filter(c => !c.parentId).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).map(c => String(c.id))
    const top   = pIds.map(id => byId[id]).filter(Boolean)
    const map   = {}
    top.forEach(p => {
      const pid    = String(p.id)
      const sIds   = subOrders[pid] || items.filter(c => String(c.parentId) === pid).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).map(c => String(c.id))
      map[p.id]   = sIds.map(id => byId[id]).filter(Boolean)
    })
    return { topLevel: top, subMap: map, catById: byId }
  }, [items, parentOrder, subOrders])

  const subcatCount = items.filter(c => !!c.parentId).length
  const active      = items.filter(c => c.isActive).length
  const inactive    = items.filter(c => !c.isActive).length

  async function bulkToggleActive(makeActive) {
    setBulkBusy(true)
    const ids = [...selected]
    try {
      await Promise.all(ids.map(id => api.patch(`/categories/${id}/active?active=${makeActive}`)))
      toast.success(`${ids.length} categories ${makeActive ? 'activated' : 'deactivated'}`)
      setSelected(new Set())
      load()
    } catch (_) {
      toast.error('Bulk toggle failed')
    } finally { setBulkBusy(false) }
  }

  async function bulkDelete() {
    const cascade = confirm(
      `${selected.size} categories delete karna chahte hain?\n\n` +
      `• "OK" → Cascade delete: subcategories aur unke items bhi delete honge\n` +
      `• "Cancel" → Sirf empty categories delete hongi`
    )
    setBulkBusy(true)
    const ids = [...selected]
    let deleted = 0, failed = 0
    for (const id of ids) {
      try {
        await api.delete(`/categories/${id}${cascade ? '?cascade=true' : ''}`)
        deleted++
      } catch (_) { failed++ }
    }
    if (deleted > 0) toast.success(`${deleted} ${cascade ? '(cascade)' : ''} categories deleted`)
    if (failed  > 0) toast.error(`${failed} delete nahi hui ${cascade ? '' : '(items ya subcategories hain — cascade try karo)'}`)
    setSelected(new Set())
    load()
    setBulkBusy(false)
  }

  function openAdd() { setModal({ _isAdd: true }) }

  async function toggleActive(c) {
    setToggling(c.id)
    try {
      await api.patch(`/categories/${c.id}/active?active=${!c.isActive}`)
      toast.success(`${c.name} ${!c.isActive ? 'activated' : 'deactivated'}`)
      load()
    } catch (_) {
      toast.error('Toggle failed')
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(c) {
    if (!confirm(`"${c.name}" delete karna chahte hain?`)) return
    try {
      await api.delete(`/categories/${c.id}`)
      toast.success('Category deleted')
      load()
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('item') || msg.includes('subcategor')) {
        // Extract what's blocking (e.g. "2 subcategories aur 5 items")
        const match = msg.match(/Is category mein (.+?) hain/)
        const warningText = match
          ? `ke saath ${match[1]} delete ho jayenge.`
          : 'aur uske contents delete ho jayenge.'
        setPwdConfirm({ category: c, warningText })
      } else {
        toast.error(msg || 'Delete failed')
      }
    }
  }

  async function doCascadeDelete(c) {
    setPwdConfirm(null)
    try {
      await api.delete(`/categories/${c.id}?cascade=true`)
      toast.success('Category aur uske contents delete ho gaye')
      load()
    } catch (e) {
      toast.error(e.message || 'Delete failed')
    }
  }

  // Import CSV
  async function handleImport(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    toast.info?.('Importing…')
    try {
      const BASE  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
      const token = localStorage.getItem('harmoney_token') || ''
      const res   = await fetch(`${BASE}/import/categories-csv`, {
        method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Import failed'); return }
      toast.success(`${data.categoriesCreated} categories import hui, ${data.categoriesSkipped} skip`)
      load()
    } catch (err) {
      toast.error(err.message || 'Import failed')
    }
  }

  // Export CSV
  async function handleExport() {
    try {
      const BASE  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
      const token = localStorage.getItem('harmoney_token') || ''
      const res   = await fetch(`${BASE}/import/categories-export`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { toast.error('Export failed'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'categories.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.message || 'Export failed')
    }
  }

  const modalProp = modal ? (modal._isAdd ? 'add' : modal) : null

  // Render a single category row
  function renderRow(c, isSubcat) {
    const subs        = subMap[c.id] || []
    const hasChildren = !isSubcat && subs.length > 0
    const isDragging  = dragItem?.id === String(c.id)
    const isDragOver  = dragOverId === String(c.id)
    return (
      <tr
        key={(isSubcat ? 's' : 'p') + c.id}
        draggable
        onDragStart={e => onCatDragStart(e, isSubcat ? 'sub' : 'parent', c.id, c.parentId)}
        onDragOver={e  => onCatDragOver(e, c.id)}
        onDrop={e      => onCatDrop(e, c.id, c.parentId, catById)}
        onDragEnd={() => { setDragItem(null); setDragOverId(null) }}
        style={{
          borderBottom: '1px solid var(--border)',
          borderTop: isDragOver ? '2px solid var(--accent)' : undefined,
          background: selected.has(c.id)
            ? 'rgba(99,102,241,0.06)'
            : isSubcat ? 'rgba(99,102,241,0.03)' : 'transparent',
          opacity: isDragging ? 0.4 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {/* Drag handle */}
        <td style={{ padding: '0 4px 0 10px', width: 24, cursor: 'grab', color: 'var(--text-muted)',
          fontSize: 13, userSelect: 'none', textAlign: 'center' }}>⠿</td>
        {/* Checkbox */}
        <td style={{ padding: '11px 16px', width: 40 }}>
          <input
            type="checkbox"
            checked={selected.has(c.id)}
            onChange={() => toggleOne(c.id)}
            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)' }}
          />
        </td>
        {/* Rank */}
        <td style={{ padding: '11px 16px', paddingLeft: isSubcat ? 36 : 16 }}>
          {isSubcat
            ? <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>↳</span>
            : <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>
                {c.rank != null ? `#${c.rank}` : '—'}
              </span>
          }
        </td>

        {/* Name + icon */}
        <td style={{ padding: '11px 12px', paddingLeft: isSubcat ? 4 : 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {/* Collapse toggle for parent rows with children */}
            {!isSubcat && hasChildren && (
              <button onClick={() => toggleCollapse(c.id)} style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                padding: '2px 4px', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1, flexShrink: 0,
              }}>
                <span style={{
                  display: 'inline-block',
                  transform: collapsedCats.has(String(c.id)) ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}>▾</span>
              </button>
            )}
            {!isSubcat && !hasChildren && (
              <span style={{ width: 20, flexShrink: 0 }} />
            )}
            {c.logoUrl ? (
              <img src={c.logoUrl} alt=""
                style={{ width: isSubcat ? 26 : 32, height: isSubcat ? 26 : 32,
                  borderRadius: 7, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
                onError={e => { e.target.style.display = 'none' }} />
            ) : (
              <div style={{ width: isSubcat ? 26 : 32, height: isSubcat ? 26 : 32,
                borderRadius: 7, flexShrink: 0,
                background: isSubcat ? 'var(--bg-page)' : 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isSubcat ? 12 : 15 }}>
                {isSubcat ? '📄' : '📋'}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontWeight: isSubcat ? 500 : 600, fontSize: isSubcat ? 12 : 13 }}>
                  {c.name}
                </span>
                {hasChildren && (
                  <span style={{ fontSize: 10, background: '#6366f115', color: '#6366f1',
                    border: '1px solid #6366f130', borderRadius: 10, padding: '2px 7px', fontWeight: 600 }}>
                    {subs.length} sub
                  </span>
                )}
                {isSubcat && (
                  <span style={{ fontSize: 10, background: 'var(--bg-secondary)', color: 'var(--text-muted)',
                    border: '1px solid var(--border)', borderRadius: 10, padding: '2px 7px', fontWeight: 500 }}>
                    subcategory
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>

        {/* Online Name */}
        <td style={{ padding: '11px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
          {c.onlineDisplayName && c.onlineDisplayName !== c.name ? c.onlineDisplayName : '—'}
        </td>

        {/* Schedule */}
        <td style={{ padding: '11px 16px' }}>
          {c.availableFrom && c.availableTo ? (
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20,
              background: '#6366f122', color: '#6366f1', fontWeight: 600, whiteSpace: 'nowrap' }}>
              ⏰ {c.availableFrom}–{c.availableTo}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Always</span>
          )}
        </td>

        {/* Status */}
        <td style={{ padding: '11px 16px' }}>
          <button onClick={() => toggleActive(c)} disabled={toggling === c.id} style={{
            fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 600,
            cursor: toggling === c.id ? 'not-allowed' : 'pointer', border: 'none',
            background: c.isActive ? '#10b98120' : '#ef444420',
            color: c.isActive ? '#10b981' : '#ef4444',
            opacity: toggling === c.id ? 0.6 : 1,
          }}>
            {toggling === c.id ? '...' : c.isActive ? '● Active' : '○ Inactive'}
          </button>
        </td>

        {/* Actions */}
        <td style={{ padding: '11px 16px' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {!isSubcat && (
              <button
                onClick={() => setModal({ _isAdd: true, _defaultParent: c.id })}
                title="Add subcategory"
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, fontWeight: 600,
                  border: '1px solid #6366f130', background: '#6366f108',
                  color: '#6366f1', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + Sub
              </button>
            )}
            <button onClick={() => setModal(c)} style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 7, fontWeight: 600,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--accent)', cursor: 'pointer',
            }}>✏️ Edit</button>
            <button onClick={() => handleDelete(c)} style={{
              fontSize: 12, padding: '5px 10px', borderRadius: 7,
              border: '1px solid #ef444440', background: 'transparent',
              color: '#ef4444', cursor: 'pointer',
            }}>🗑️</button>
          </div>
        </td>
      </tr>
    )
  }

  // Flatten rows: top-level then their subcategories (skip subs if parent is collapsed)
  const allRows = topLevel.flatMap(parent => [
    renderRow(parent, false),
    ...(collapsedCats.has(String(parent.id)) ? [] : (subMap[parent.id] || []).map(sub => renderRow(sub, true))),
  ])
  // Orphaned subcategories (parent deleted but child remains)
  const orphans = items
    .filter(c => c.parentId && !items.find(p => p.id === c.parentId))
    .map(c => renderRow(c, true))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>📋 Menu Categories</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Categories aur subcategories banao — rank se POS aur online menu par reflect hoga
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label title="PetPooja ya Harmony CSV import karo" style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: '1px solid var(--border)', background: 'var(--bg-card)',
            color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ⬆️ Import
            <input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button onClick={handleExport} style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: '1px solid var(--border)', background: 'var(--bg-card)',
            color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>⬇️ Export</button>
          <button onClick={openAdd} style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>+ Add Category</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',        value: items.length,   color: '#6366f1' },
          { label: 'Top Level',    value: topLevel.length, color: '#3b82f6' },
          { label: 'Subcategories', value: subcatCount,   color: '#8b5cf6' },
          { label: 'Active',       value: active,         color: '#10b981' },
          { label: 'Inactive',     value: inactive,       color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 18px', minWidth: 90 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? <SkeletonTable rows={6} /> : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 15 }}>Koi category nahi mili</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Pehli category banao — POS menu organize ho jayega</div>
          <button onClick={openAdd} style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13,
            fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            + Add Category
          </button>
        </div>
      ) : (
        <>
          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              background: 'var(--bg-card)', border: '1.5px solid var(--accent)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 10,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginRight: 4 }}>
                {selected.size} selected
              </span>
              <button onClick={() => bulkToggleActive(true)} disabled={bulkBusy} style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: '1px solid #10b98140', background: '#10b98112', color: '#10b981',
                cursor: bulkBusy ? 'not-allowed' : 'pointer', opacity: bulkBusy ? 0.6 : 1,
              }}>✓ Activate All</button>
              <button onClick={() => bulkToggleActive(false)} disabled={bulkBusy} style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: '1px solid #f5a62340', background: '#f5a62312', color: '#f5a623',
                cursor: bulkBusy ? 'not-allowed' : 'pointer', opacity: bulkBusy ? 0.6 : 1,
              }}>○ Deactivate All</button>
              <button onClick={bulkDelete} disabled={bulkBusy} style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: '1px solid #ef444440', background: '#ef444412', color: '#ef4444',
                cursor: bulkBusy ? 'not-allowed' : 'pointer', opacity: bulkBusy ? 0.6 : 1,
              }}>🗑️ Delete Selected</button>
              <button onClick={() => setSelected(new Set())} disabled={bulkBusy} style={{
                padding: '6px 12px', borderRadius: 7, fontSize: 12,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto',
              }}>✕ Clear</button>
            </div>
          )}

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0 4px 0 10px', width: 24 }} />
                  <th style={{ padding: '11px 16px', width: 40 }}>
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--accent)' }}
                    />
                  </th>
                  {['Rank', 'Category', 'Online Name', '⏰ Schedule', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600,
                      fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allRows}
                {orphans}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, paddingLeft: 4 }}>
            💡 Rank se POS aur online menu mein order decide hota hai — 1 sabse pehle dikhega &nbsp;·&nbsp;
            Subcategory add karne ke liye "+ Sub" button click karo
          </p>
        </>
      )}

      {/* Edit / Add Modal */}
      {modal && (
        <CategoryModal
          modal={modal}
          rid={rid}
          toast={toast}
          allCategories={items}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}

      {/* Password Confirm Modal */}
      {pwdConfirm && (
        <PasswordConfirmModal
          category={pwdConfirm.category}
          warningText={pwdConfirm.warningText}
          onConfirm={() => doCascadeDelete(pwdConfirm.category)}
          onCancel={() => setPwdConfirm(null)}
        />
      )}
    </div>
  )
}
