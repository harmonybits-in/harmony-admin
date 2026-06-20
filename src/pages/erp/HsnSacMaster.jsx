import { useState, useEffect } from 'react'
import { erpGstApi } from '../../api/client'

const VERTICALS = ['RESTAURANT', 'JEWELLERY', 'SOFTWARE', 'COMMON']
const TYPES = ['HSN', 'SAC']

const EMPTY_FORM = {
  code: '', description: '', type: 'HSN', gstRate: 0,
  cgstRate: 0, sgstRate: 0, igstRate: 0, vertical: 'COMMON',
}

function Modal({ title, form, onChange, onSave, onClose, saving }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1A1A2E', border: '1px solid #2a2a3e', borderRadius: 14, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {[
            { key: 'code', label: 'Code', type: 'text' },
            { key: 'description', label: 'Description', type: 'text' },
            { key: 'gstRate',  label: 'GST Rate (%)', type: 'number' },
            { key: 'cgstRate', label: 'CGST Rate (%)', type: 'number' },
            { key: 'sgstRate', label: 'SGST Rate (%)', type: 'number' },
            { key: 'igstRate', label: 'IGST Rate (%)', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5, fontWeight: 600 }}>{f.label}</label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={e => onChange(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#0F0F1A', color: '#fff', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5, fontWeight: 600 }}>Type</label>
            <select value={form.type} onChange={e => onChange('type', e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#0F0F1A', color: '#fff', fontSize: 13 }}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5, fontWeight: 600 }}>Business Vertical</label>
            <select value={form.vertical} onChange={e => onChange('vertical', e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#0F0F1A', color: '#fff', fontSize: 13 }}>
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #2a2a3e', background: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HsnSacMaster() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    erpGstApi.getHsnSac()
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      code: item.code || '',
      description: item.description || '',
      type: item.type || 'HSN',
      gstRate:  parseFloat(item.gstRate  || item.taxRate || 0),
      cgstRate: parseFloat(item.cgstRate || 0),
      sgstRate: parseFloat(item.sgstRate || 0),
      igstRate: parseFloat(item.igstRate || 0),
      vertical: item.vertical || 'COMMON',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.code) return setMsg({ type: 'error', text: 'Code is required.' })
    setSaving(true)
    try {
      if (editItem) {
        await erpGstApi.updateHsnSac(editItem.id, form)
      } else {
        await erpGstApi.createHsnSac(form)
      }
      setMsg({ type: 'success', text: editItem ? 'Updated successfully.' : 'Created successfully.' })
      setShowModal(false)
      load()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const thStyle = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '12px 14px', fontSize: 13, color: '#ccc', borderBottom: '1px solid #2a2a3e' }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>HSN/SAC Master</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Harmonised System of Nomenclature and Service Accounting Codes</p>
        </div>
        <button onClick={openAdd} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Add HSN/SAC
        </button>
      </div>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: msg.type === 'success' ? '#10b98122' : '#ef444422', color: msg.type === 'success' ? '#10b981' : '#ef4444', fontSize: 13, border: `1px solid ${msg.type === 'success' ? '#10b98133' : '#ef444433'}` }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading HSN/SAC codes...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>No HSN/SAC codes found. Add one to get started.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#2a2a3e' }}>
                  {['Code', 'Description', 'Type', 'GST%', 'CGST%', 'SGST%', 'IGST%', 'Vertical', 'Active', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id || idx}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...tdStyle, color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>{item.code}</td>
                    <td style={tdStyle}>{item.description}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '3px 9px', borderRadius: 20, background: item.type === 'HSN' ? '#10b98122' : '#863bff22', color: item.type === 'HSN' ? '#10b981' : '#863bff', fontSize: 11, fontWeight: 700 }}>
                        {item.type || '—'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{item.gstRate || item.taxRate || 0}%</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{item.cgstRate || 0}%</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{item.sgstRate || 0}%</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{item.igstRate || 0}%</td>
                    <td style={tdStyle}>{item.vertical || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: item.active !== false ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.active !== false ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                        {item.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => openEdit(item)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2a3e', background: 'transparent', color: '#ccc', fontSize: 12, cursor: 'pointer' }}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          title={editItem ? 'Edit HSN/SAC' : 'Add HSN/SAC'}
          form={form}
          onChange={(key, val) => setForm(f => ({ ...f, [key]: val }))}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}
    </div>
  )
}
