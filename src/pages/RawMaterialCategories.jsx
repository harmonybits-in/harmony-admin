import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

const COLOR_SWATCHES = [
  '#ef4444','#f97316','#f59e0b','#84cc16','#10b981',
  '#06b6d4','#6366f1','#8b5cf6','#ec4899','#64748b',
]

function CategoryModal({ cat, onClose, onSave, saving }) {
  const [name,  setName]  = useState(cat?.name  || '')
  const [color, setColor] = useState(cat?.color || COLOR_SWATCHES[0])

  function submit() {
    if (!name.trim()) return
    onSave({ name: name.trim(), color })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '1.5rem',
        width: 360, boxShadow: '0 20px 60px #0003' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: '1.25rem' }}>
          {cat ? 'Category Edit Karo' : 'Naya Category'}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>
            Category Name *
          </label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Vegetables, Spices, Dairy"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-page)',
              color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Color
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLOR_SWATCHES.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 28, height: 28, borderRadius: '50%', background: c,
                border: color === c ? '3px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer', padding: 0,
              }} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
          }}>Cancel</button>
          <button onClick={submit} disabled={saving || !name.trim()} style={{
            flex: 2, padding: '9px', borderRadius: 8, border: 'none',
            background: !name.trim() ? 'var(--border)' : 'var(--accent)',
            color: '#fff', cursor: !name.trim() ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600,
          }}>
            {saving ? 'Saving…' : cat ? 'Save' : 'Add Category'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RawMaterialCategories() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [modal,      setModal]      = useState(null) // null | 'add' | category object
  const [deleteId,   setDeleteId]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/inv/categories?restaurantId=${rid}`)
      setCategories(Array.isArray(data) ? data : [])
    } catch { toast.error('Categories load nahi hue') }
    finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [load])

  async function handleSave(payload) {
    setSaving(true)
    try {
      if (modal?.id) {
        const updated = await api.put(`/inv/categories/${modal.id}`, { ...payload, restaurantId: rid })
        setCategories(cs => cs.map(c => c.id === modal.id ? updated : c))
        toast.success('Category updated!')
      } else {
        const created = await api.post('/inv/categories', { ...payload, restaurantId: rid })
        setCategories(cs => [...cs, created])
        toast.success('Category add ho gayi!')
      }
      setModal(null)
    } catch (e) { toast.error(e.message || 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/inv/categories/${id}`)
      setCategories(cs => cs.filter(c => c.id !== id))
      toast.success('Category delete ho gayi')
    } catch { toast.error('Delete failed') }
    finally { setDeleteId(null) }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>🗂️ Raw Material Categories</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Raw materials ko categories mein organize karo
          </p>
        </div>
        <button onClick={() => setModal('add')} style={{
          padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
        }}>
          + Add Category
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
        {loading ? <SkeletonTable rows={5} cols={3} /> : categories.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗂️</div>
            Koi category nahi — pehli add karo
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Color', 'Category Name', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%',
                      background: cat.color || '#6366f1',
                      border: '1px solid var(--border)' }} />
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{cat.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: cat.active !== false ? '#d1fae5' : '#fee2e2',
                      color: cat.active !== false ? '#065f46' : '#991b1b',
                    }}>
                      {cat.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setModal(cat)} style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text)', cursor: 'pointer',
                      }}>Edit</button>
                      <button onClick={() => setDeleteId(cat.id)} style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                        border: '1px solid #ef444440', background: 'transparent',
                        color: '#ef4444', cursor: 'pointer',
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <CategoryModal
          cat={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDeleteId(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '1.5rem',
            width: 340, textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗑️</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Category delete karein?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Is category se linked raw materials affect ho sakte hain.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteId(null)} style={{
                flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer', fontSize: 13,
              }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{
                flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                background: '#ef4444', color: '#fff', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
