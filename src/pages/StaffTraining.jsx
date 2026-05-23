// src/pages/StaffTraining.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = () => (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function authHeaders() {
  const { token } = useAuthStore.getState()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

const CATEGORIES = ['ALL', 'FOOD_SAFETY', 'SERVICE', 'POS_USAGE', 'HR', 'GENERAL']
const CONTENT_TYPES = ['VIDEO', 'PDF', 'TEXT']

const CATEGORY_META = {
  FOOD_SAFETY: { color: '#ef4444', bg: '#450a0a' },
  SERVICE:     { color: '#3b82f6', bg: '#1e3a5f' },
  POS_USAGE:   { color: '#a78bfa', bg: '#2e1f5e' },
  HR:          { color: '#f59e0b', bg: '#451a03' },
  GENERAL:     { color: '#22c55e', bg: '#052e16' },
}

const CONTENT_ICONS = {
  VIDEO: 'VIDEO',
  PDF:   'PDF',
  TEXT:  'TEXT',
}

const STATUS_META = {
  NOT_STARTED: { color: '#64748b', bg: '#1e293b',  label: 'Not Started' },
  IN_PROGRESS: { color: '#f59e0b', bg: '#451a03',  label: 'In Progress' },
  COMPLETED:   { color: '#22c55e', bg: '#052e16',  label: 'Completed'   },
}

function CategoryPill({ cat, active, onClick }) {
  const meta = CATEGORY_META[cat] || { color: '#60a5fa', bg: '#1e3a5f' }
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
      background: active ? (cat === 'ALL' ? '#3b82f6' : meta.bg) : '#1e293b',
      color: active ? (cat === 'ALL' ? '#fff' : meta.color) : '#64748b',
      transition: 'all 0.15s',
    }}>
      {cat}
    </button>
  )
}

// ── Module Modal ────────────────────────────────────────────────────────────
function ModuleModal({ module, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: module?.title || '',
    description: module?.description || '',
    contentUrl: module?.contentUrl || '',
    contentType: module?.contentType || 'TEXT',
    category: module?.category || 'GENERAL',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.title.trim()) { setErr('Title is required'); return }
    setSaving(true); setErr('')
    try {
      const url = module?.id ? `${BASE()}/training/modules/${module.id}` : `${BASE()}/training/modules`
      const res = await fetch(url, {
        method: module?.id ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.message || 'Save failed')
      }
      const data = await res.json()
      onSaved(data, !!module?.id)
      onClose()
    } catch (e) { setErr(e.message || 'Error') }
    finally { setSaving(false) }
  }

  const inp = {
    background: '#334155', border: '1px solid #475569', color: '#fff',
    padding: '8px 12px', borderRadius: 6, width: '100%', fontSize: 13,
    boxSizing: 'border-box',
  }
  const lbl = { fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 4, letterSpacing: '0.05em' }
  const selStyle = { ...inp, appearance: 'none' }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, background: '#0009', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 14, padding: '1.5rem',
        width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px #0008', border: '1px solid #334155',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{module?.id ? 'Edit Module' : 'Add Training Module'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={lbl}>TITLE *</label><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Module title" style={inp} /></div>
          <div>
            <label style={lbl}>DESCRIPTION</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Brief description..." style={{ ...inp, resize: 'vertical' }} />
          </div>
          <div><label style={lbl}>CONTENT URL</label><input value={form.contentUrl} onChange={e => set('contentUrl', e.target.value)} placeholder="https://..." style={inp} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>CONTENT TYPE</label>
              <select value={form.contentType} onChange={e => set('contentType', e.target.value)} style={selStyle}>
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>CATEGORY</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} style={selStyle}>
                {CATEGORIES.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {err && (
            <div style={{ background: '#450a0a', border: '1px solid #ef444440', borderRadius: 8, padding: '8px 12px', color: '#ef4444', fontSize: 12 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={handleSubmit} disabled={saving} style={{
              flex: 1, background: saving ? '#475569' : '#3b82f6', color: '#fff',
              border: 'none', borderRadius: 8, padding: '10px 16px',
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              {saving ? 'Saving...' : module?.id ? 'Update Module' : 'Add Module'}
            </button>
            <button onClick={onClose} style={{
              padding: '10px 16px', borderRadius: 8, border: '1px solid #475569',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
            }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Module Card ─────────────────────────────────────────────────────────────
function ModuleCard({ module, onEdit, onDelete }) {
  const catMeta = CATEGORY_META[module.category] || { color: '#94a3b8', bg: '#1e293b' }
  const desc = module.description || ''
  const truncated = desc.length > 100 ? desc.slice(0, 100) + '...' : desc

  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '1rem',
      display: 'flex', flexDirection: 'column', gap: 10,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#475569'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 4 }}>{module.title}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700,
              background: catMeta.bg, color: catMeta.color,
            }}>{module.category}</span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700,
              background: '#334155', color: '#94a3b8',
            }}>
              {module.contentType === 'VIDEO' ? 'VIDEO' : module.contentType === 'PDF' ? 'PDF' : 'TEXT'}
            </span>
          </div>
        </div>
      </div>
      {truncated && (
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{truncated}</div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <button onClick={() => onEdit(module)} style={{
          flex: 1, padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f640', cursor: 'pointer',
        }}>Edit</button>
        <button onClick={() => onDelete(module.id)} style={{
          flex: 1, padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', cursor: 'pointer',
        }}>Delete</button>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function StaffTraining() {
  const [tab, setTab]             = useState('modules')
  const [modules, setModules]     = useState([])
  const [catFilter, setCatFilter] = useState('ALL')
  const [modLoading, setModLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editModule, setEditModule] = useState(null)

  // Progress tab
  const [staffIdInput, setStaffIdInput] = useState('')
  const [staffId, setStaffId]           = useState(null)
  const [progress, setProgress]         = useState([])
  const [progLoading, setProgLoading]   = useState(false)
  const [markingId, setMarkingId]       = useState(null)

  const loadModules = useCallback(async () => {
    setModLoading(true)
    try {
      const res = await fetch(`${BASE()}/training/modules`, { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        setModules(Array.isArray(d) ? d : d.content || [])
      }
    } catch { /* ignore */ }
    finally { setModLoading(false) }
  }, [])

  useEffect(() => { loadModules() }, [loadModules])

  async function handleDelete(id) {
    if (!window.confirm('Delete this training module?')) return
    try {
      await fetch(`${BASE()}/training/modules/${id}`, { method: 'DELETE', headers: authHeaders() })
      setModules(prev => prev.filter(m => m.id !== id))
    } catch { /* ignore */ }
  }

  function handleSaved(mod, isEdit) {
    setModules(prev => isEdit
      ? prev.map(m => m.id === mod.id ? mod : m)
      : [mod, ...prev]
    )
  }

  async function loadProgress(sid) {
    setProgLoading(true)
    try {
      const res = await fetch(`${BASE()}/training/progress/staff/${sid}`, { headers: authHeaders() })
      if (res.ok) {
        const d = await res.json()
        setProgress(Array.isArray(d) ? d : d.content || [])
      } else {
        setProgress([])
      }
    } catch { setProgress([]) }
    finally { setProgLoading(false) }
  }

  function handleLoadProgress() {
    if (!staffIdInput.trim()) return
    setStaffId(staffIdInput.trim())
    loadProgress(staffIdInput.trim())
  }

  async function handleMarkComplete(moduleId, progressId) {
    setMarkingId(progressId || moduleId)
    try {
      await fetch(`${BASE()}/training/progress`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ staffId, moduleId, status: 'COMPLETED' }),
      })
      setProgress(prev => prev.map(p =>
        (p.moduleId === moduleId || p.id === progressId) ? { ...p, status: 'COMPLETED' } : p
      ))
    } catch { /* ignore */ }
    finally { setMarkingId(null) }
  }

  const filteredModules = catFilter === 'ALL' ? modules : modules.filter(m => m.category === catFilter)

  const tabStyle = (active) => ({
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: active ? '#3b82f6' : 'transparent',
    color: active ? '#fff' : '#64748b',
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Staff Training Module</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Manage training content and track staff progress</p>
        </div>
        {tab === 'modules' && (
          <button onClick={() => { setEditModule(null); setShowModal(true) }} style={{
            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            + Add Module
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, background: '#1e293b', borderRadius: 10,
        padding: 4, marginBottom: '1.25rem', width: 'fit-content',
        border: '1px solid #334155',
      }}>
        <button onClick={() => setTab('modules')} style={tabStyle(tab === 'modules')}>Training Modules</button>
        <button onClick={() => setTab('progress')} style={tabStyle(tab === 'progress')}>Staff Progress</button>
      </div>

      {/* Modules Tab */}
      {tab === 'modules' && (
        <div>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {CATEGORIES.map(c => (
              <CategoryPill key={c} cat={c} active={catFilter === c} onClick={() => setCatFilter(c)} />
            ))}
          </div>

          {modLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '1rem', height: 140 }}>
                  <div style={{ height: 14, borderRadius: 4, background: '#334155', width: '70%', marginBottom: 10 }} />
                  <div style={{ height: 10, borderRadius: 4, background: '#334155', width: '40%', marginBottom: 14 }} />
                  <div style={{ height: 10, borderRadius: 4, background: '#334155', width: '90%', marginBottom: 6 }} />
                  <div style={{ height: 10, borderRadius: 4, background: '#334155', width: '60%' }} />
                </div>
              ))}
            </div>
          ) : filteredModules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No modules found</div>
              <div style={{ fontSize: 12 }}>
                {catFilter !== 'ALL' ? `No modules in category "${catFilter}"` : 'Add your first training module'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {filteredModules.map(m => (
                <ModuleCard
                  key={m.id}
                  module={m}
                  onEdit={mod => { setEditModule(mod); setShowModal(true) }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {tab === 'progress' && (
        <div>
          <div style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
            padding: '1rem 1.25rem', marginBottom: '1.25rem',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 12 }}>
              LOAD STAFF PROGRESS
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={staffIdInput}
                onChange={e => setStaffIdInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLoadProgress()}
                placeholder="Enter Staff ID..."
                type="number"
                style={{
                  background: '#334155', border: '1px solid #475569', color: '#fff',
                  padding: '8px 14px', borderRadius: 8, fontSize: 13, width: 200,
                }}
              />
              <button onClick={handleLoadProgress} disabled={!staffIdInput.trim()} style={{
                background: staffIdInput.trim() ? '#3b82f6' : '#334155',
                color: staffIdInput.trim() ? '#fff' : '#64748b',
                border: 'none', borderRadius: 8, padding: '8px 16px',
                cursor: staffIdInput.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600,
              }}>
                Load Progress
              </button>
            </div>
          </div>

          {staffId && (
            <div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: '1rem', fontWeight: 600 }}>
                Progress for Staff ID: <span style={{ color: '#60a5fa' }}>{staffId}</span>
              </div>
              {progLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading progress...</div>
              ) : progress.length === 0 ? (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, textAlign: 'center', padding: 40, color: '#64748b' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                  <div style={{ fontWeight: 600 }}>No progress records found for this staff member</div>
                </div>
              ) : (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#0f172a' }}>
                        {['Module', 'Category', 'Type', 'Status', 'Action'].map(h => (
                          <th key={h} style={{
                            padding: '10px 16px', textAlign: 'left', fontSize: 11,
                            color: '#64748b', fontWeight: 700, borderBottom: '1px solid #334155',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {progress.map(p => {
                        const sm = STATUS_META[p.status] || STATUS_META.NOT_STARTED
                        const catMeta = CATEGORY_META[p.category] || { color: '#94a3b8', bg: '#1e293b' }
                        const isInProgress = p.status === 'IN_PROGRESS'
                        const isMarking = markingId === (p.id || p.moduleId)
                        return (
                          <tr key={p.id || p.moduleId}
                            style={{ transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', fontWeight: 600, color: '#fff' }}>
                              {p.moduleTitle || p.title || `Module #${p.moduleId}`}
                            </td>
                            <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155' }}>
                              {p.category && (
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700, background: catMeta.bg, color: catMeta.color }}>
                                  {p.category}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155', color: '#64748b', fontSize: 12 }}>
                              {p.contentType || '—'}
                            </td>
                            <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155' }}>
                              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 700, background: sm.bg, color: sm.color }}>
                                {sm.label}
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px', borderBottom: '1px solid #334155' }}>
                              {isInProgress && (
                                <button
                                  onClick={() => handleMarkComplete(p.moduleId, p.id)}
                                  disabled={isMarking}
                                  style={{
                                    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                    background: '#052e16', color: '#22c55e',
                                    border: '1px solid #166534', cursor: isMarking ? 'not-allowed' : 'pointer',
                                    opacity: isMarking ? 0.6 : 1,
                                  }}>
                                  {isMarking ? '...' : 'Mark Complete'}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ModuleModal
          module={editModule}
          onClose={() => { setShowModal(false); setEditModule(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
