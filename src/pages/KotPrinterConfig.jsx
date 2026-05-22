// src/pages/KotPrinterConfig.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE_API = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function getToken() {
  return localStorage.getItem('harmoney_token') || ''
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(BASE_API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...opts.headers,
    },
  })
  if (!res.ok) {
    let msg = `${res.status}`
    try {
      const ct = res.headers.get('content-type') || ''
      const body = ct.includes('application/json') ? await res.json() : await res.text()
      msg = body?.message || body?.error || (typeof body === 'string' && body) || msg
    } catch (_) {}
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

const EMPTY_FORM = { name: '', ipAddress: '', port: 9100, printSections: '', enabled: true }

// ── Section Badge ─────────────────────────────────────────────────────────────
function SectionBadge({ label, color = '#3b82f6' }) {
  return (
    <span style={{
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      borderRadius: 20,
      padding: '2px 10px',
      fontSize: 11,
      fontWeight: 600,
    }}>
      {label}
    </span>
  )
}

// ── Printer Card ──────────────────────────────────────────────────────────────
function PrinterCard({ printer, onEdit, onDelete }) {
  const sections = Array.isArray(printer.printSections) ? printer.printSections.filter(Boolean) : []

  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: 12,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
            {printer.name}
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
            {printer.ipAddress}:{printer.port}
          </span>
        </div>
        <span style={{
          background: printer.enabled ? '#05260e' : '#1e293b',
          color: printer.enabled ? '#22c55e' : '#64748b',
          border: `1px solid ${printer.enabled ? '#22c55e44' : '#33415544'}`,
          borderRadius: 20,
          padding: '3px 12px',
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {printer.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#64748b', marginRight: 2 }}>Sections:</span>
        {sections.length === 0 ? (
          <SectionBadge label="All Sections" color="#8b5cf6" />
        ) : (
          sections.map((sec, i) => (
            <SectionBadge key={i} label={sec} color="#3b82f6" />
          ))
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          onClick={() => onEdit(printer)}
          style={{
            flex: 1,
            padding: '7px 0',
            borderRadius: 8,
            border: '1px solid #3b82f644',
            background: '#3b82f611',
            color: '#3b82f6',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#3b82f622'}
          onMouseLeave={e => e.currentTarget.style.background = '#3b82f611'}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(printer)}
          style={{
            flex: 1,
            padding: '7px 0',
            borderRadius: 8,
            border: '1px solid #ef444444',
            background: '#ef444411',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#ef444422'}
          onMouseLeave={e => e.currentTarget.style.background = '#ef444411'}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function PrinterModal({ form, setForm, onSave, onCancel, saving, isEdit }) {
  function handleToggle() {
    setForm(f => ({ ...f, enabled: !f.enabled }))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 14,
        padding: '28px 28px 24px',
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>
          {isEdit ? 'Edit Printer' : 'Add New Printer'}
        </h2>

        {/* Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Printer Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Main Kitchen Printer"
            style={inputStyle}
          />
        </div>

        {/* IP + Port row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>IP Address</label>
            <input
              type="text"
              value={form.ipAddress}
              onChange={e => setForm(f => ({ ...f, ipAddress: e.target.value }))}
              placeholder="192.168.1.10"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Port</label>
            <input
              type="number"
              value={form.port}
              onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) || 9100 }))}
              style={{ ...inputStyle, width: 90 }}
            />
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Sections</label>
          <textarea
            value={form.printSections}
            onChange={e => setForm(f => ({ ...f, printSections: e.target.value }))}
            placeholder={'Enter section names, one per line\n(leave blank to print all KOTs)'}
            rows={4}
            style={{
              ...inputStyle,
              resize: 'vertical',
              fontFamily: 'monospace',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          />
          <span style={{ fontSize: 11, color: '#475569' }}>
            Leave blank to receive all KOTs. One section name per line.
          </span>
        </div>

        {/* Enabled toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>Enabled</span>
          <button
            onClick={handleToggle}
            style={{
              width: 48,
              height: 26,
              borderRadius: 13,
              border: 'none',
              background: form.enabled ? '#22c55e' : '#334155',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 3,
              left: form.enabled ? 24 : 3,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
              display: 'block',
            }} />
          </button>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#94a3b8',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !form.name.trim() || !form.ipAddress.trim()}
            style={{
              flex: 2,
              padding: '10px 0',
              borderRadius: 8,
              border: 'none',
              background: saving || !form.name.trim() || !form.ipAddress.trim() ? '#334155' : '#3b82f6',
              color: saving || !form.name.trim() || !form.ipAddress.trim() ? '#64748b' : '#fff',
              cursor: saving || !form.name.trim() || !form.ipAddress.trim() ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 700,
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Saving…' : isEdit ? 'Update Printer' : 'Add Printer'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: '9px 12px',
  color: '#f1f5f9',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 200,
      background: type === 'error' ? '#450a0a' : '#052e16',
      color: type === 'error' ? '#fca5a5' : '#86efac',
      border: `1px solid ${type === 'error' ? '#fca5a540' : '#86efac40'}`,
      borderRadius: 10, padding: '12px 20px', fontSize: 14,
      fontWeight: 600, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      maxWidth: 320,
    }}>
      {msg}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function KotPrinterConfig() {
  const restaurantId = useAuthStore(s => s.restaurantId)

  const [printers,    setPrinters]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [editPrinter, setEditPrinter] = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [saving,      setSaving]      = useState(false)
  const [toast,       setToast]       = useState(null)

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), [])

  // ── Fetch printers ────────────────────────────────────────────────
  const loadPrinters = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/kot-printers?restaurantId=${restaurantId}`)
      setPrinters(Array.isArray(data) ? data : [])
    } catch (err) {
      showToast(err.message || 'Failed to load printers', 'error')
    } finally {
      setLoading(false)
    }
  }, [restaurantId, showToast])

  useEffect(() => { loadPrinters() }, [loadPrinters])

  // ── Open modal ────────────────────────────────────────────────────
  function openAdd() {
    setEditPrinter(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(printer) {
    setEditPrinter(printer)
    const sections = Array.isArray(printer.printSections) ? printer.printSections.join('\n') : ''
    setForm({
      name:          printer.name || '',
      ipAddress:     printer.ipAddress || '',
      port:          printer.port || 9100,
      printSections: sections,
      enabled:       printer.enabled !== false,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditPrinter(null)
    setForm(EMPTY_FORM)
  }

  // ── Save (create or update) ───────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      const sectionsArr = form.printSections
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)

      const body = {
        name:          form.name.trim(),
        ipAddress:     form.ipAddress.trim(),
        port:          Number(form.port) || 9100,
        printSections: sectionsArr,
        enabled:       form.enabled,
        restaurantId,
      }

      if (editPrinter) {
        await apiFetch(`/kot-printers/${editPrinter.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
        showToast(`"${body.name}" updated successfully`)
      } else {
        await apiFetch(`/kot-printers`, {
          method: 'POST',
          body: JSON.stringify(body),
        })
        showToast(`"${body.name}" added successfully`)
      }

      closeModal()
      loadPrinters()
    } catch (err) {
      showToast(err.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────
  async function handleDelete(printer) {
    if (!window.confirm(`Delete printer "${printer.name}"? This cannot be undone.`)) return
    try {
      await apiFetch(`/kot-printers/${printer.id}`, { method: 'DELETE' })
      showToast(`"${printer.name}" deleted`)
      loadPrinters()
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error')
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      padding: '24px 28px',
      boxSizing: 'border-box',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 28,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
            KOT Printer Configuration
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Multiple printers, section-based routing
          </p>
        </div>

        <button
          onClick={openAdd}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
          onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
        >
          + Add Printer
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          paddingTop: 80, color: '#64748b', fontSize: 15, gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>⊕</span> Loading printers…
        </div>
      ) : printers.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          paddingTop: 80, gap: 14,
        }}>
          <span style={{ fontSize: 48 }}>🖨</span>
          <p style={{ margin: 0, color: '#475569', fontSize: 15 }}>
            No KOT printers configured yet.
          </p>
          <button
            onClick={openAdd}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: '1px dashed #3b82f688',
              background: 'transparent',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            + Add your first printer
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {printers.map(printer => (
            <PrinterCard
              key={printer.id}
              printer={printer}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <PrinterModal
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={closeModal}
          saving={saving}
          isEdit={!!editPrinter}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  )
}
