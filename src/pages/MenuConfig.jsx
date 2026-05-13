import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN') }

// ════════════════════════════════════════════════════════════════════════════
// ADDON GROUPS TAB
// ════════════════════════════════════════════════════════════════════════════

function AddonGroupModal({ group, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    name:        group?.name        || '',
    description: group?.description || '',
    isRequired:  group?.isRequired  ?? false,
    isActive:    group?.isActive    ?? true,
    minSelect:   group?.minSelect   ?? 0,
    maxSelect:   group?.maxSelect   ?? 1,
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Group name dalo')
    setSaving(true)
    try {
      const payload = { ...form, minSelect: Number(form.minSelect), maxSelect: Number(form.maxSelect) }
      if (group?.id) {
        await api.put(`/addon-groups/${group.id}`, payload)
        toast.success('Addon group updated')
      } else {
        await api.post('/addon-groups', payload)
        toast.success('Addon group created')
      }
      onSaved()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 440,
        padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {group ? 'Edit Addon Group' : 'New Addon Group'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Group Name *</label>
            <input autoFocus value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Extra Toppings, Spice Level, Add-ons"
              style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Optional description"
              style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Min Select</label>
              <input type="number" min="0" value={form.minSelect} onChange={e => set('minSelect', e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-page)',
                  color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Max Select</label>
              <input type="number" min="1" value={form.maxSelect} onChange={e => set('maxSelect', e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-page)',
                  color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.isRequired} onChange={e => set('isRequired', e.target.checked)}
                style={{ accentColor: 'var(--accent)' }} />
              Required
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)}
                style={{ accentColor: 'var(--accent)' }} />
              Active
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: saving ? '#ccc' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Saving…' : group ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddonOptionModal({ groupId, option, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    name:     option?.name     || '',
    price:    option?.price    ?? 0,
    isVeg:    option?.isVeg    ?? true,
    isActive: option?.isActive ?? true,
    rank:     option?.rank     ?? 1,
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Option name dalo')
    setSaving(true)
    try {
      const payload = { ...form, price: Number(form.price), rank: Number(form.rank) }
      if (option?.id) {
        await api.put(`/addon-groups/${groupId}/options/${option.id}`, payload)
        toast.success('Option updated')
      } else {
        await api.post(`/addon-groups/${groupId}/options`, payload)
        toast.success('Option added')
      }
      onSaved()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1001,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 380,
        padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {option ? 'Edit Option' : 'Add Option'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Option Name *</label>
            <input autoFocus value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Extra Cheese, No Onion"
              style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Price (₹)</label>
            <input type="number" min="0" step="0.5" value={form.price}
              onChange={e => set('price', e.target.value)}
              style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.isVeg} onChange={e => set('isVeg', e.target.checked)}
                style={{ accentColor: '#22c55e' }} />
              <span style={{ color: '#22c55e', fontWeight: 600 }}>🟢 Veg</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)}
                style={{ accentColor: 'var(--accent)' }} />
              Active
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: saving ? '#ccc' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Saving…' : option ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddonGroupsTab() {
  const toast = useToast()
  const [groups,      setGroups]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [expanded,    setExpanded]    = useState(new Set())
  const [groupOpts,   setGroupOpts]   = useState({}) // groupId → options[]
  const [modal,       setModal]       = useState(null) // 'group' | 'option'
  const [editGroup,   setEditGroup]   = useState(null)
  const [optGroupId,  setOptGroupId]  = useState(null)
  const [editOption,  setEditOption]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/addon-groups')
      setGroups(Array.isArray(data) ? data : [])
    } catch { setGroups([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleExpand(groupId) {
    const next = new Set(expanded)
    if (next.has(groupId)) { next.delete(groupId); setExpanded(next); return }
    next.add(groupId); setExpanded(next)
    if (!groupOpts[groupId]) {
      try {
        const opts = await api.get(`/addon-groups/${groupId}/options`)
        setGroupOpts(prev => ({ ...prev, [groupId]: Array.isArray(opts) ? opts : [] }))
      } catch { setGroupOpts(prev => ({ ...prev, [groupId]: [] })) }
    }
  }

  async function deleteGroup(id) {
    if (!confirm('Delete this addon group?')) return
    try { await api.delete(`/addon-groups/${id}`); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.message || 'Failed') }
  }

  async function deleteOption(groupId, optId) {
    if (!confirm('Delete this option?')) return
    try {
      await api.delete(`/addon-groups/${groupId}/options/${optId}`)
      toast.success('Option deleted')
      const opts = await api.get(`/addon-groups/${groupId}/options`)
      setGroupOpts(prev => ({ ...prev, [groupId]: Array.isArray(opts) ? opts : [] }))
    } catch (err) { toast.error(err.message || 'Failed') }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => { setEditGroup(null); setModal('group') }}
          style={{ padding: '9px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + New Addon Group
        </button>
      </div>

      {loading ? <SkeletonTable rows={4} /> : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🍕</div>
          <div>Koi addon group nahi. "New Addon Group" se banao.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(g => (
            <div key={g.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
                cursor: 'pointer' }} onClick={() => toggleExpand(g.id)}>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', transition: 'transform .2s',
                  transform: expanded.has(g.id) ? 'rotate(90deg)' : 'rotate(0)' }}>›</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {g.name}
                    {g.isRequired && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20,
                        background: '#fef3c7', color: '#d97706', fontWeight: 700 }}>Required</span>
                    )}
                    {g.isActive === false && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20,
                        background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>Inactive</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {g.description || ''}{g.description ? ' · ' : ''}
                    Select {g.minSelect ?? 0}–{g.maxSelect ?? 1} options
                    {g.options?.length > 0 && ` · ${g.options.length} options`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditGroup(g); setModal('group') }}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                    Edit
                  </button>
                  <button onClick={() => { setOptGroupId(g.id); setEditOption(null); setModal('option'); toggleExpand(g.id) }}
                    style={{ padding: '5px 12px', borderRadius: 6, border: 'none',
                      background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
                    + Option
                  </button>
                  <button onClick={() => deleteGroup(g.id)}
                    style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #fee2e2',
                      background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                    🗑
                  </button>
                </div>
              </div>

              {/* Options expanded */}
              {expanded.has(g.id) && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px' }}>
                  {!groupOpts[g.id] ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
                  ) : groupOpts[g.id].length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      Koi option nahi. "+ Option" se add karo.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {groupOpts[g.id].map(opt => (
                        <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--bg-page)', fontSize: 13,
                          opacity: opt.isActive === false ? 0.5 : 1 }}>
                          <span style={{ fontSize: 10 }}>{opt.isVeg !== false ? '🟢' : '🔴'}</span>
                          <span style={{ fontWeight: 600 }}>{opt.name}</span>
                          {(opt.price || 0) > 0 && (
                            <span style={{ color: '#10b981', fontWeight: 700 }}>+{fmt(opt.price)}</span>
                          )}
                          <button onClick={() => { setOptGroupId(g.id); setEditOption(opt); setModal('option') }}
                            style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)',
                              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10 }}>
                            ✏
                          </button>
                          <button onClick={() => deleteOption(g.id, opt.id)}
                            style={{ padding: '2px 5px', borderRadius: 4, border: 'none',
                              background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal === 'group' && (
        <AddonGroupModal group={editGroup}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
          toast={toast} />
      )}
      {modal === 'option' && (
        <AddonOptionModal groupId={optGroupId} option={editOption}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null)
            const opts = await api.get(`/addon-groups/${optGroupId}/options`).catch(() => [])
            setGroupOpts(prev => ({ ...prev, [optGroupId]: Array.isArray(opts) ? opts : [] }))
          }}
          toast={toast} />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// VARIANTS TAB
// ════════════════════════════════════════════════════════════════════════════

function VariantModal({ variant, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    name:              variant?.name              || '',
    onlineDisplayName: variant?.onlineDisplayName || '',
    departmentType:    variant?.departmentType    || 'QUANTITY',
    price:             variant?.price             ?? 0,
    isActive:          variant?.isActive          ?? true,
    rank:              variant?.rank              ?? 1,
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Variant name dalo')
    setSaving(true)
    try {
      const payload = { ...form, price: Number(form.price), rank: Number(form.rank) }
      if (variant?.id) {
        await api.put(`/variants/${variant.id}`, payload)
        toast.success('Variant updated')
      } else {
        await api.post('/variants', payload)
        toast.success('Variant created')
      }
      onSaved()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 420,
        padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {variant ? 'Edit Variant' : 'New Variant'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Name *</label>
            <input autoFocus value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Small, Medium, Large"
              style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Online Display Name</label>
            <input value={form.onlineDisplayName} onChange={e => set('onlineDisplayName', e.target.value)}
              placeholder="Shown on Zomato/Swiggy"
              style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Type</label>
              <select value={form.departmentType} onChange={e => set('departmentType', e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-page)',
                  color: 'var(--text)', fontSize: 13, boxSizing: 'border-box', cursor: 'pointer' }}>
                <option value="QUANTITY">Quantity</option>
                <option value="CUSTOMISATION">Customisation</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Price (₹)</label>
              <input type="number" min="0" step="0.5" value={form.price}
                onChange={e => set('price', e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-page)',
                  color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Rank</label>
              <input type="number" min="1" value={form.rank} onChange={e => set('rank', e.target.value)}
                style={{ width: 80, marginTop: 6, padding: '9px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-page)',
                  color: 'var(--text)', fontSize: 13 }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 18 }}>
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)}
                style={{ accentColor: 'var(--accent)' }} />
              Active
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: saving ? '#ccc' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Saving…' : variant ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VariantsTab() {
  const toast = useToast()
  const [variants, setVariants] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [editV,    setEditV]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/variants')
      setVariants(Array.isArray(data) ? data : [])
    } catch { setVariants([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteVariant(id) {
    if (!confirm('Delete this variant?')) return
    try { await api.delete(`/variants/${id}`); toast.success('Deleted'); load() }
    catch (err) { toast.error(err.message || 'Failed') }
  }

  const TYPE_COLORS = {
    QUANTITY: { bg: '#dbeafe', text: '#2563eb' },
    CUSTOMISATION: { bg: '#ede9fe', text: '#7c3aed' },
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => { setEditV(null); setModal(true) }}
          style={{ padding: '9px 20px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + New Variant
        </button>
      </div>

      {loading ? <SkeletonTable rows={5} /> : variants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📐</div>
          <div>Koi variant nahi. "New Variant" se banao.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-page)' }}>
                {['Name', 'Online Display', 'Type', 'Price', 'Rank', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map(v => {
                const tc = TYPE_COLORS[v.departmentType] || TYPE_COLORS.QUANTITY
                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 600 }}>{v.name}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-muted)' }}>{v.onlineDisplayName || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                        background: tc.bg, color: tc.text }}>
                        {v.departmentType}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: (v.price || 0) > 0 ? '#10b981' : 'var(--text-muted)' }}>
                      {(v.price || 0) > 0 ? fmt(v.price) : 'Free'}
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-muted)' }}>{v.rank ?? 1}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                        background: v.isActive !== false ? '#d1fae5' : '#fee2e2',
                        color: v.isActive !== false ? '#059669' : '#dc2626' }}>
                        {v.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setEditV(v); setModal(true) }}
                          style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                            background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                          Edit
                        </button>
                        <button onClick={() => deleteVariant(v.id)}
                          style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #fee2e2',
                            background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <VariantModal variant={editV}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load() }}
          toast={toast} />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════════
export default function MenuConfig() {
  const [tab, setTab] = useState('addons')

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🍕 Menu Configuration</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Addon groups aur product variants manage karo
        </p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'addons',    label: 'Addon Groups' },
          { key: 'variants',  label: 'Variants'     },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '7px 22px', borderRadius: 7, border: 'none',
              background: tab === t.key ? 'var(--accent)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'addons'   && <AddonGroupsTab />}
      {tab === 'variants' && <VariantsTab />}
    </div>
  )
}
