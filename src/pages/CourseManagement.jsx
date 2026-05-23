/**
 * Course Management — Define meal courses for organized dining.
 * Route: /courses
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

const PRESET_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
]

// ── Sub-components ────────────────────────────────────────────────────────────

function Modal({ title, onClose, onSubmit, saving, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, padding: 24, width: '100%',
        maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
          >×</button>
        </div>
        <form onSubmit={onSubmit}>
          {children}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
              }}
            >Cancel</button>
            <button
              type="submit" disabled={saving}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: saving ? '#9ca3af' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ courseName, onConfirm, onCancel }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onCancel}
    >
      <div
        style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '1.5rem', width: 320, textAlign: 'center' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🗑️</div>
        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>Delete "{courseName}"?</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          This action cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: 9, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13 }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── CoursePill ────────────────────────────────────────────────────────────────

function CoursePill({ course, onEdit, onDelete, onMove, total }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Sort order badge */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: course.color + '22', border: `2px solid ${course.color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800, color: course.color,
      }}>
        {course.sortOrder}
      </div>

      {/* Name pill */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: course.color + '18', border: `1px solid ${course.color}40`,
          borderRadius: 20, padding: '5px 14px',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: course.color, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: course.color }}>{course.name}</span>
        </div>
        {!course.active && (
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 20,
            background: '#6b728022', color: '#6b7280', fontWeight: 600,
          }}>Inactive</span>
        )}
      </div>

      {/* Up / Down arrows */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onMove(course, -1)}
          disabled={course.sortOrder <= 1}
          title="Move up"
          style={{
            width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', cursor: course.sortOrder <= 1 ? 'not-allowed' : 'pointer',
            fontSize: 14, color: course.sortOrder <= 1 ? 'var(--text-muted)' : 'var(--text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >↑</button>
        <button
          onClick={() => onMove(course, +1)}
          disabled={course.sortOrder >= total}
          title="Move down"
          style={{
            width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', cursor: course.sortOrder >= total ? 'not-allowed' : 'pointer',
            fontSize: 14, color: course.sortOrder >= total ? 'var(--text-muted)' : 'var(--text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >↓</button>
      </div>

      {/* Edit / Delete */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onEdit(course)}
          style={{
            padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12,
          }}
        >Edit</button>
        <button
          onClick={() => onDelete(course)}
          style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: '#ef444422', color: '#ef4444', cursor: 'pointer', fontSize: 12,
          }}
        >Delete</button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const BLANK = { name: '', sortOrder: '', color: PRESET_COLORS[0], active: true }

export default function CourseManagement() {
  const { token, restaurantId } = useAuthStore()
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const [courses, setCourses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [modal, setModal]       = useState(null)   // null | { mode: 'create' | 'edit', id? }
  const [form, setForm]         = useState(BLANK)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)   // course object

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}/courses?restaurantId=${restaurantId}`, { headers })
      if (!res.ok) throw new Error(`Failed to load courses (${res.status})`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.content ?? [])
      setCourses(list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, token])

  useEffect(() => { load() }, [load])

  function openCreate() {
    const nextOrder = courses.length > 0 ? Math.max(...courses.map(c => c.sortOrder ?? 0)) + 1 : 1
    setForm({ ...BLANK, sortOrder: nextOrder })
    setModal({ mode: 'create' })
  }

  function openEdit(course) {
    setForm({
      name:      course.name,
      sortOrder: course.sortOrder,
      color:     course.color ?? PRESET_COLORS[0],
      active:    course.active ?? true,
    })
    setModal({ mode: 'edit', id: course.id })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { alert('Course name is required'); return }
    setSaving(true)
    try {
      const body = {
        name:      form.name.trim(),
        sortOrder: parseInt(form.sortOrder) || 1,
        color:     form.color,
        active:    form.active,
        restaurantId,
      }
      if (modal.mode === 'create') {
        const res = await fetch(`${BASE}/courses`, { method: 'POST', headers, body: JSON.stringify(body) })
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Create failed') }
      } else {
        const res = await fetch(`${BASE}/courses/${modal.id}`, { method: 'PUT', headers, body: JSON.stringify(body) })
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Update failed') }
      }
      setModal(null)
      load()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(course) {
    try {
      const res = await fetch(`${BASE}/courses/${course.id}?restaurantId=${restaurantId}`, { method: 'DELETE', headers })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Delete failed') }
      setDeleting(null)
      load()
    } catch (e) { alert(e.message) }
  }

  async function handleMove(course, direction) {
    // Swap sort order with the adjacent course
    const sorted = [...courses].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const idx = sorted.findIndex(c => c.id === course.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const swapCourse = sorted[swapIdx]
    // Update both
    try {
      await Promise.all([
        fetch(`${BASE}/courses/${course.id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ ...course, sortOrder: swapCourse.sortOrder, restaurantId }),
        }),
        fetch(`${BASE}/courses/${swapCourse.id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ ...swapCourse, sortOrder: course.sortOrder, restaurantId }),
        }),
      ])
      load()
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Course Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Define meal courses for organized dining (Appetizers, Mains, Desserts, etc.)
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
        >+ Add Course</button>
      </div>

      <div style={{ marginBottom: '1.5rem' }} />

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Loading courses…
        </div>
      ) : error ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444', fontSize: 13 }}>{error}</div>
      ) : courses.length === 0 ? (
        <div style={{
          padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🍽️</div>
          No courses yet — add your first one!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {courses.map(course => (
            <CoursePill
              key={course.id}
              course={course}
              onEdit={openEdit}
              onDelete={c => setDeleting(c)}
              onMove={handleMove}
              total={courses.length}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <Modal
          title={modal.mode === 'create' ? '+ Add Course' : 'Edit Course'}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          saving={saving}
        >
          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
              Course Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Appetizers"
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Sort order */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
              Sort Order
            </label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
              placeholder="1"
              min="1"
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Color picker */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
              Color
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(color => (
                <div
                  key={color}
                  onClick={() => setForm(f => ({ ...f, color }))}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: color,
                    cursor: 'pointer',
                    border: form.color === color ? `3px solid var(--text)` : '3px solid transparent',
                    boxSizing: 'border-box',
                    boxShadow: form.color === color ? `0 0 0 2px ${color}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
              ))}
            </div>
            {/* Preview */}
            <div style={{ marginTop: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: form.color + '18', border: `1px solid ${form.color}40`,
                borderRadius: 20, padding: '5px 14px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: form.color }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: form.color }}>{form.name || 'Preview'}</span>
              </span>
            </div>
          </div>

          {/* Active toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            />
            Active
          </label>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleting && (
        <DeleteConfirm
          courseName={deleting.name}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
