import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'
import QRCode from 'qrcode'

const DINE_BASE = 'https://zippli.in/dine'

// ── QR Code Modal ─────────────────────────────────────────────────────────
function QrModal({ table, onClose }) {
  const canvasRef = useRef(null)
  const qrUrl = `${DINE_BASE}/${table.qrToken}`

  useEffect(() => {
    if (canvasRef.current && table.qrToken) {
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 260, margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' }
      })
    }
  }, [table.qrToken, qrUrl])

  function handlePrint() {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Table QR — ${table.tableNo}</title>
      <style>body{text-align:center;font-family:sans-serif;padding:40px}
      h2{font-size:28px;margin-bottom:4px} p{color:#666;margin:4px 0}
      canvas{display:block;margin:20px auto;border:2px solid #eee;border-radius:8px}
      .url{font-size:11px;color:#999;margin-top:12px;word-break:break-all}</style>
      </head><body>
      <h2>Table ${table.tableNo}</h2>
      <p>${table.areaName || ''}</p>
      <p style="font-size:13px;color:#444">Scan to order & pay</p>
      <canvas id="qr"></canvas>
      <div class="url">${qrUrl}</div>
      <script>
        const QR = ${JSON.stringify(qrUrl)};
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        s.onload = () => { new QRCode(document.getElementById('qr'), {text:QR,width:240,height:240}); setTimeout(()=>window.print(),600); };
        document.head.appendChild(s);
      </script></body></html>
    `)
    win.document.close()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, maxWidth: 340, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,.3)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📱 Table QR Code</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              {table.tableNo}{table.areaName ? ` — ${table.areaName}` : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        <canvas ref={canvasRef} style={{ borderRadius: 10, border: '1px solid var(--border)' }} />

        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '10px 0 16px', wordBreak: 'break-all' }}>
          {qrUrl}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handlePrint}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            🖨️ Print QR
          </button>
          <button onClick={() => { navigator.clipboard.writeText(qrUrl) }}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            📋 Copy URL
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add/Edit Table Modal ──────────────────────────────────────────────────
function TableModal({ table, areas, onClose, onSaved, toast }) {
  const [form, setForm] = useState({
    tableNo:  table?.tableNo  || '',
    areaId:   table?.areaId   || '',
    areaName: table?.areaName || '',
    capacity: table?.capacity || 4,
    isActive: table?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleAreaChange(areaId) {
    const area = areas.find(a => String(a.id) === String(areaId))
    set('areaId', areaId)
    set('areaName', area?.name || '')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.tableNo.trim()) return toast.error('Table number dalo')
    setSaving(true)
    try {
      const payload = { ...form, capacity: Number(form.capacity) }
      if (table?.id) {
        await api.put(`/tables/${table.id}`, payload)
        toast.success('Table updated')
      } else {
        await api.post('/tables', payload)
        toast.success('Table added')
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
            {table ? 'Edit Table' : 'Add Table'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Table Number *</label>
            <input value={form.tableNo} onChange={e => set('tableNo', e.target.value)}
              placeholder="e.g. T1, A5, Table 3"
              style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Area</label>
            <select value={form.areaId} onChange={e => handleAreaChange(e.target.value)}
              style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box', cursor: 'pointer' }}>
              <option value="">No Area</option>
              {areas.filter(a => a.isActive !== false).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Capacity (seats)</label>
            <input type="number" min="1" max="50" value={form.capacity}
              onChange={e => set('capacity', e.target.value)}
              style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="tActive" checked={form.isActive}
              onChange={e => set('isActive', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            <label htmlFor="tActive" style={{ fontSize: 13, cursor: 'pointer' }}>Active</label>
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
              {saving ? 'Saving…' : table ? 'Update' : 'Add Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add Area Modal ────────────────────────────────────────────────────────
function AreaModal({ onClose, onSaved, toast }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Area name dalo')
    setSaving(true)
    try {
      await api.post('/areas', { name: name.trim(), isActive: true })
      toast.success('Area created')
      onSaved()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 360,
        padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add Area</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Area Name *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Ground Floor, Rooftop, AC Hall"
              style={{ width: '100%', marginTop: 6, padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg-page)',
                color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: saving ? '#ccc' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Creating…' : 'Create Area'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function TableManagement() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [tab,       setTab]       = useState('tables')
  const [tables,    setTables]    = useState([])
  const [areas,     setAreas]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null) // 'table' | 'area'
  const [editTable, setEditTable] = useState(null)
  const [qrTable,   setQrTable]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, a] = await Promise.all([
        api.get('/tables'),
        api.get('/areas'),
      ])
      setTables(Array.isArray(t) ? t : [])
      setAreas(Array.isArray(a) ? a : [])
    } catch { setTables([]); setAreas([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteTable(id) {
    if (!confirm('Delete this table?')) return
    try {
      await api.delete(`/tables/${id}`)
      toast.success('Table deleted')
      load()
    } catch (err) { toast.error(err.message || 'Delete failed') }
  }

  async function generateQr(table) {
    try {
      const res = await api.post(`/tables/${table.id}/generate-qr`, {})
      // Update local table state with qrToken
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, qrToken: res.qrToken } : t))
      setQrTable({ ...table, qrToken: res.qrToken })
    } catch (err) { toast.error(err.message || 'QR generate failed') }
  }

  async function deleteArea(id) {
    if (!confirm('Delete this area? Tables in this area will not be deleted.')) return
    try {
      await api.delete(`/areas/${id}`)
      toast.success('Area deleted')
      load()
    } catch (err) { toast.error(err.message || 'Delete failed') }
  }

  // Group tables by area
  const grouped = {}
  tables.forEach(t => {
    const key = t.areaName || 'No Area'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(t)
  })

  const activeTables  = tables.filter(t => t.isActive !== false).length
  const totalCapacity = tables.reduce((s, t) => s + (t.capacity || 0), 0)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🪑 Table Management</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Restaurant tables aur areas manage karo
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setModal('area') }}
            style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            + Add Area
          </button>
          <button onClick={() => { setEditTable(null); setModal('table') }}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            + Add Table
          </button>
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Tables',  value: tables.length,    color: '#6366f1' },
            { label: 'Active Tables', value: activeTables,     color: '#10b981' },
            { label: 'Total Capacity',value: totalCapacity,    color: '#f59e0b' },
            { label: 'Areas',         value: areas.length,     color: '#6366f1' },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {['tables', 'areas'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 20px', borderRadius: 7, border: 'none',
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
            {t === 'tables' ? `Tables (${tables.length})` : `Areas (${areas.length})`}
          </button>
        ))}
      </div>

      {loading ? <SkeletonTable rows={6} /> : tab === 'tables' ? (
        /* ── Tables view ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.keys(grouped).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)',
              background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🪑</div>
              <div style={{ fontSize: 14 }}>Koi table nahi hai. "Add Table" se pehla table banao.</div>
            </div>
          ) : Object.entries(grouped).map(([area, areaTable]) => (
            <div key={area} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', background: 'var(--bg-page)',
                borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{area}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{areaTable.length} tables</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, padding: 16 }}>
                {areaTable.map(t => (
                  <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: 10,
                    padding: '14px 16px', position: 'relative',
                    background: t.isActive === false ? '#f9f9f9' : 'var(--bg-page)',
                    opacity: t.isActive === false ? 0.6 : 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', marginBottom: 4 }}>
                      {t.tableNo}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      👥 {t.capacity || '—'} seats
                    </div>
                    {t.isActive === false && (
                      <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginTop: 4 }}>Inactive</div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button onClick={() => { setEditTable(t); setModal('table') }}
                        style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>
                        Edit
                      </button>
                      <button onClick={() => t.qrToken ? setQrTable(t) : generateQr(t)}
                        title={t.qrToken ? 'View QR Code' : 'Generate QR Code'}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #d1fae5',
                          background: t.qrToken ? '#d1fae5' : 'transparent',
                          color: '#059669', cursor: 'pointer', fontSize: 11 }}>
                        📱
                      </button>
                      <button onClick={() => deleteTable(t.id)}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #fee2e2',
                          background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}>
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Areas view ── */
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {areas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
              <div style={{ fontSize: 14 }}>Koi area nahi. "Add Area" se create karo.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-page)' }}>
                  {['Area Name', 'Tables', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {areas.map(a => {
                  const count = tables.filter(t => t.areaName === a.name).length
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{a.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{count} tables</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                          background: a.isActive !== false ? '#d1fae5' : '#fee2e2',
                          color: a.isActive !== false ? '#059669' : '#dc2626' }}>
                          {a.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => deleteArea(a.id)}
                          style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fee2e2',
                            background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {qrTable && <QrModal table={qrTable} onClose={() => setQrTable(null)} />}
      {modal === 'table' && (
        <TableModal table={editTable} areas={areas}
          onClose={() => { setModal(null); setEditTable(null) }}
          onSaved={() => { setModal(null); setEditTable(null); load() }}
          toast={toast} />
      )}
      {modal === 'area' && (
        <AreaModal
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
          toast={toast} />
      )}
    </div>
  )
}
