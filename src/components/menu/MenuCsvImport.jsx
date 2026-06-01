// src/components/menu/MenuCsvImport.jsx
import { useState, useRef, useCallback } from 'react'
import { useToast } from '../../hooks/useToast'

const BASE  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
const token = () => localStorage.getItem('harmoney_token') || ''

// ── Dietary badge helper ─────────────────────────────────────────────────────
function DietBadge({ value }) {
  const cfg = {
    VEG:     { color: '#10b981', bg: '#10b98118', label: 'VEG' },
    NON_VEG: { color: '#ef4444', bg: '#ef444418', label: 'NV'  },
    EGG:     { color: '#f59e0b', bg: '#f59e0b18', label: 'EGG' },
  }
  const c = cfg[value] || cfg.VEG
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
      background: c.bg, color: c.color, letterSpacing: '0.04em',
    }}>{c.label}</span>
  )
}

// ── Stat card used in the results view ───────────────────────────────────────
function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{
      flex: '1 1 130px', minWidth: 120,
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 18px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── Shared button style factory ───────────────────────────────────────────────
const mkBtn = (variant = 'secondary', disabled = false) => ({
  padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.55 : 1,
  border: variant === 'primary' ? 'none' : '1px solid var(--border)',
  background: variant === 'primary' ? 'var(--accent)' : variant === 'danger'
    ? 'transparent' : 'var(--bg-secondary)',
  color: variant === 'primary' ? '#fff' : variant === 'danger'
    ? 'var(--accent)' : 'var(--text)',
})

// ── Main component ────────────────────────────────────────────────────────────
export default function MenuCsvImport({ onClose }) {
  const toast = useToast()

  const [activeTab, setActiveTab] = useState('import')  // import | export

  // Import state
  const [importStep,   setImportStep]   = useState('idle')   // idle | previewing | previewed | importing | done
  const [previewRows,  setPreviewRows]  = useState([])
  const [importResult, setImportResult] = useState(null)
  const [dragOver,     setDragOver]     = useState(false)
  const [pendingFile,  setPendingFile]  = useState(null)

  // Export state
  const [exporting, setExporting] = useState(false)

  const fileInputRef = useRef()

  // ── Template download ────────────────────────────────────────────────────
  async function downloadTemplate() {
    try {
      const res = await fetch(`${BASE}/menu-csv/template`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) { toast.error('Template download failed'); return }
      const blob = await res.blob()
      triggerDownload(blob, 'harmony_menu_template.csv', 'text/csv')
      toast.success('Template downloaded!')
    } catch (err) {
      toast.error(err.message || 'Download failed')
    }
  }

  // ── CSV Export ───────────────────────────────────────────────────────────
  async function exportMenu() {
    setExporting(true)
    try {
      const res = await fetch(`${BASE}/menu-csv/export`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      if (!res.ok) { toast.error('Export failed'); return }
      const blob = await res.blob()
      triggerDownload(blob, 'harmony_menu_export.csv', 'text/csv')
      toast.success('Menu exported successfully!')
    } catch (err) {
      toast.error(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // ── File selection & preview ─────────────────────────────────────────────
  const handleFileChosen = useCallback(async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a .csv file')
      return
    }
    setPendingFile(file)
    setImportStep('previewing')
    setPreviewRows([])
    setImportResult(null)

    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch(`${BASE}/menu-csv/preview`, {
        method: 'POST', body: form,
        headers: { Authorization: `Bearer ${token()}` },
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Preview failed'); setImportStep('idle'); return }
      setPreviewRows(data.preview || [])
      setImportStep('previewed')
      if (data.errors?.length) {
        toast.error(`${data.errors.length} parse errors — check the table`)
      }
    } catch (err) {
      toast.error(err.message || 'Preview failed')
      setImportStep('idle')
    }
  }, [toast])

  function onFileInputChange(e) {
    handleFileChosen(e.target.files?.[0])
    e.target.value = ''
  }

  // ── Drag-and-drop handlers ───────────────────────────────────────────────
  function onDragOver(e)  { e.preventDefault(); setDragOver(true)  }
  function onDragLeave()  { setDragOver(false)  }
  function onDrop(e)      { e.preventDefault(); setDragOver(false); handleFileChosen(e.dataTransfer.files?.[0]) }

  // ── Full import ──────────────────────────────────────────────────────────
  async function runImport() {
    if (!pendingFile) { toast.error('No file selected'); return }
    setImportStep('importing')
    try {
      const form = new FormData()
      form.append('file', pendingFile)
      const res  = await fetch(`${BASE}/menu-csv/import`, {
        method: 'POST', body: form,
        headers: { Authorization: `Bearer ${token()}` },
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Import failed'); setImportStep('previewed'); return }
      setImportResult(data)
      setImportStep('done')
      toast.success(`Imported ${data.productsCreated} item(s)!`)
    } catch (err) {
      toast.error(err.message || 'Import failed')
      setImportStep('previewed')
    }
  }

  function resetImport() {
    setImportStep('idle')
    setPreviewRows([])
    setImportResult(null)
    setPendingFile(null)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function triggerDownload(blob, filename, mime) {
    const url = URL.createObjectURL(new Blob([blob], { type: mime }))
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const busy = importStep === 'previewing' || importStep === 'importing'

  // ── Styles ───────────────────────────────────────────────────────────────
  const S = {
    overlay: {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '16px',
    },
    modal: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      width: '100%', maxWidth: 900,
      maxHeight: '88vh',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
      color: 'var(--text)',
      overflow: 'hidden',
    },
    header: {
      padding: '18px 24px',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    },
    tabBar: {
      display: 'flex', gap: 4,
      padding: '10px 24px 0',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    },
    body: {
      flex: 1, overflowY: 'auto', padding: '24px',
    },
    footer: {
      padding: '14px 24px',
      borderTop: '1px solid var(--border)',
      display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center',
      flexShrink: 0,
    },
    dropZone: {
      border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 12,
      padding: '36px 24px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'border-color 0.2s, background 0.2s',
      background: dragOver ? 'rgba(99,102,241,0.06)' : 'var(--bg-secondary)',
    },
    table: {
      width: '100%', borderCollapse: 'collapse', fontSize: 12.5,
    },
    th: {
      padding: '8px 10px', textAlign: 'left',
      color: 'var(--text-muted)', fontWeight: 600, fontSize: 11,
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-card)',
      position: 'sticky', top: 0,
    },
    td: {
      padding: '8px 10px',
      borderBottom: '1px solid var(--border)',
      verticalAlign: 'middle',
    },
  }

  function Tab({ id, label }) {
    const active = activeTab === id
    return (
      <button onClick={() => setActiveTab(id)} style={{
        padding: '8px 18px', borderRadius: '8px 8px 0 0',
        border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        background: active ? 'var(--bg-card)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        marginBottom: -1,
      }}>{label}</button>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Menu CSV Import / Export</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Bulk import your menu from a CSV file or export the current menu
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1,
          }}>✕</button>
        </div>

        {/* ── Tab Bar ── */}
        <div style={S.tabBar}>
          <Tab id="import" label="Import" />
          <Tab id="export" label="Export" />
        </div>

        {/* ════════════════════════════════════════════════════════════
            IMPORT TAB
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'import' && (
          <>
            <div style={S.body}>

              {/* ── Step: idle — upload area ── */}
              {importStep === 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Template download card */}
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 12, padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <div style={{ fontSize: 28 }}>📄</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Download Template</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                        Get a pre-formatted CSV with example rows and column descriptions.
                      </div>
                    </div>
                    <button onClick={downloadTemplate} style={mkBtn('primary')}>
                      Download Template
                    </button>
                  </div>

                  {/* Drop zone */}
                  <div
                    style={S.dropZone}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div style={{ fontSize: 36, marginBottom: 8 }}>
                      {dragOver ? '⬇️' : '📂'}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                      {dragOver ? 'Drop your CSV here' : 'Drag & drop your CSV file here'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      or <span style={{ color: 'var(--accent)', fontWeight: 600 }}>click to browse</span>
                      {' '}— only .csv files accepted
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={onFileInputChange}
                    />
                  </div>

                  {/* CSV format hint */}
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10, padding: '12px 16px', fontSize: 12,
                    color: 'var(--text-muted)', lineHeight: 1.7,
                  }}>
                    <strong style={{ color: 'var(--text)' }}>Expected columns:</strong>{' '}
                    category_name, subcategory_name, item_name, short_code, display_name, price,
                    dietary, gst_type, description, variants, addon_groups, available
                    <br />
                    <strong style={{ color: 'var(--text)' }}>variants:</strong>{' '}
                    <code style={{ background: 'var(--bg-page)', padding: '1px 5px', borderRadius: 4 }}>
                      Half:150|Full:280
                    </code>
                    {'  '}
                    <strong style={{ color: 'var(--text)' }}>addon_groups:</strong>{' '}
                    <code style={{ background: 'var(--bg-page)', padding: '1px 5px', borderRadius: 4 }}>
                      Chutneys(Mint:10;Tamarind:5)|Extra Masala(None:0)
                    </code>
                  </div>
                </div>
              )}

              {/* ── Step: previewing — loading spinner ── */}
              {importStep === 'previewing' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '40px 0' }}>
                  <div style={{ fontSize: 36 }}>🔍</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Parsing your CSV file…</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {pendingFile?.name}
                  </div>
                </div>
              )}

              {/* ── Step: previewed — preview table ── */}
              {importStep === 'previewed' && previewRows.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Summary row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 10, border: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 18 }}>✅</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {previewRows.length} item{previewRows.length !== 1 ? 's' : ''} parsed
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>
                        from <strong>{pendingFile?.name}</strong>
                      </span>
                    </div>
                    <button onClick={resetImport} style={mkBtn('secondary')}>
                      Change File
                    </button>
                  </div>

                  {/* Preview table */}
                  <div style={{
                    border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
                  }}>
                    <div style={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto' }}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            {['#', 'Category', 'Subcategory', 'Item Name', 'Price', 'Dietary', 'Variants', 'Addons'].map(h => (
                              <th key={h} style={S.th}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, idx) => (
                            <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                              <td style={{ ...S.td, color: 'var(--text-muted)', width: 36 }}>{row.row}</td>
                              <td style={S.td}>{row.category || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                              <td style={{ ...S.td, color: 'var(--text-muted)' }}>
                                {row.subcategory || <span style={{ color: 'var(--border)' }}>—</span>}
                              </td>
                              <td style={{ ...S.td, fontWeight: 600 }}>{row.itemName}</td>
                              <td style={{ ...S.td, color: 'var(--text-muted)' }}>
                                {row.price > 0 ? `₹${row.price}` : '—'}
                              </td>
                              <td style={S.td}>
                                <DietBadge value={row.dietary} />
                              </td>
                              <td style={{ ...S.td, color: 'var(--text-muted)', maxWidth: 140 }}>
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                                  {row.variants || <span style={{ color: 'var(--border)' }}>none</span>}
                                </div>
                              </td>
                              <td style={{ ...S.td, color: 'var(--text-muted)', maxWidth: 140 }}>
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                                  {row.addonGroups || <span style={{ color: 'var(--border)' }}>none</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* ── Step: importing ── */}
              {importStep === 'importing' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '40px 0' }}>
                  <div style={{ fontSize: 36 }}>🚀</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Importing {previewRows.length} item(s)…</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Creating categories, variants, addon groups, and products
                  </div>
                  <div style={{ width: 200, height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
                    <div style={{
                      height: '100%', background: 'var(--accent)',
                      borderRadius: 4,
                      animation: 'harmonyCsvProgress 1.4s ease-in-out infinite',
                    }} />
                  </div>
                  <style>{`
                    @keyframes harmonyCsvProgress {
                      0%   { width: 10%; }
                      50%  { width: 80%; }
                      100% { width: 10%; }
                    }
                  `}</style>
                </div>
              )}

              {/* ── Step: done — results ── */}
              {importStep === 'done' && importResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Big success */}
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 44 }}>✅</div>
                    <div style={{ fontWeight: 700, fontSize: 17, marginTop: 10 }}>Import Complete!</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Your menu has been updated successfully.
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <StatCard icon="🍽️" label="Items Created"       value={importResult.productsCreated}      accent="var(--accent)" />
                    <StatCard icon="📂" label="Categories"          value={importResult.categoriesCreated}    accent="#10b981" />
                    <StatCard icon="📁" label="Subcategories"       value={importResult.subcategoriesCreated} accent="#06b6d4" />
                    <StatCard icon="🔀" label="Variants"            value={importResult.variantsCreated}      accent="#8b5cf6" />
                    <StatCard icon="➕" label="Addon Groups"        value={importResult.addonGroupsCreated}   accent="#f59e0b" />
                  </div>

                  {/* Errors (if any) */}
                  {importResult.errors?.length > 0 && (
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 10, padding: '14px 16px',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text)' }}>
                        ⚠️ {importResult.errors.length} row(s) had errors (all others imported successfully)
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button onClick={resetImport} style={mkBtn('secondary')}>
                      Import Another File
                    </button>
                    <button onClick={onClose} style={mkBtn('primary')}>
                      Done
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* ── Import footer ── */}
            {(importStep === 'idle' || importStep === 'previewed') && (
              <div style={S.footer}>
                {importStep === 'idle' && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
                    Start by downloading the template or uploading your CSV directly
                  </span>
                )}
                {importStep === 'previewed' && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
                    Review the preview above, then click Import All to proceed
                  </span>
                )}
                <button onClick={onClose} style={mkBtn('secondary')}>Cancel</button>
                {importStep === 'previewed' && (
                  <button
                    onClick={runImport}
                    disabled={busy || previewRows.length === 0}
                    style={mkBtn('primary', busy || previewRows.length === 0)}
                  >
                    Import All {previewRows.length > 0 ? `(${previewRows.length})` : ''}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            EXPORT TAB
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'export' && (
          <>
            <div style={S.body}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Main export card */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 14, padding: '28px 24px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textAlign: 'center', gap: 12,
                }}>
                  <div style={{ fontSize: 44 }}>📤</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Export Menu as CSV</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 500, lineHeight: 1.6 }}>
                    Download a complete CSV export of your active menu items.
                    The file can be re-imported into any Harmony Restaurant OS account
                    or used as a backup.
                  </div>
                  <button
                    onClick={exportMenu}
                    disabled={exporting}
                    style={{ ...mkBtn('primary', exporting), marginTop: 8, padding: '11px 28px', fontSize: 14 }}
                  >
                    {exporting ? 'Exporting…' : 'Export Menu CSV'}
                  </button>
                </div>

                {/* What's included */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 12, padding: '16px 20px',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
                    What gets exported
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {[
                      { icon: '🍽️', label: 'All active products' },
                      { icon: '📂', label: 'Category & subcategory names' },
                      { icon: '🔀', label: 'Variants with prices' },
                      { icon: '➕', label: 'Addon group names' },
                      { icon: '🥦', label: 'Dietary type (Veg/Non-Veg/Egg)' },
                      { icon: '🧾', label: 'GST type (Services/Goods)' },
                      { icon: '📝', label: 'Short code & display name' },
                      { icon: '✅', label: 'Availability status' },
                    ].map(item => (
                      <div key={item.label} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 12.5, color: 'var(--text-muted)',
                      }}>
                        <span style={{ fontSize: 15 }}>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    marginTop: 14, fontSize: 11, color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border)', paddingTop: 12,
                  }}>
                    Note: Addon group <em>options</em> (individual choices) are not included in the
                    export. Re-importing addon groups will create them as empty groups if they don't
                    already exist.
                  </div>
                </div>

              </div>
            </div>

            {/* ── Export footer ── */}
            <div style={S.footer}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
                Only active products are exported
              </span>
              <button onClick={onClose} style={mkBtn('secondary')}>Close</button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
