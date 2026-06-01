// src/pages/DataHub.jsx
import { useState, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { exportApi, dataImportApi } from '../api/client'
import XlsxMenuImport from '../components/menu/XlsxMenuImport'

// ── Shared utility: trigger CSV download from a fetch() promise ───
async function downloadFile(fetchPromise, filename) {
  const res = await fetchPromise
  if (res.status === 401) {
    localStorage.removeItem('harmoney_token')
    window.location.href = '/login'
    return
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── CSV templates for import cards ───────────────────────────────
const TEMPLATES = {
  rawMaterials:  'Name,Purchase Unit,Conversion Qty,Consumption Unit,Purchase Price,Transfer Price,Tax Type,Tax(%),Excise Duty(in Amount),HSN,Minimum Stock Level,Minimum Stock Level Unit,At Par Stock Level,At Par Stock Level Unit,Description,Category,Sub Category,Rank,Normal loss(%),Set as Favourite,Closing stock calculated on,Exclusive to this restaurant,Is Expiry,Best Before (In Days),Reconciliation price,Barcode/Short Code,Other Purchase Units,Quantity (in gm/ml),GTIN,Brand,Allow Decimal Quantity,Active,Restock Level,Restock Unit,Maximum Stock Level,Maximum Stock Unit\nPaneer,Kg,1000,Gm,300,0,GST,5,0,0402,1000,Gm,2000,Gm,Fresh dairy paneer,Dairy,,1,0,No,Daily,No,No,0,300,,Gm,,,,Yes,Yes,500,Gm,5000,Gm\nTomatoes,Kg,1,Kg,40,0,GST,5,0,,500,Gm,1000,Gm,,Vegetables,,2,0,No,Daily,No,No,0,40,,,,,,Yes,Yes,,,2000,Kg',
  customers:     'Name,Phone,Email,Loyalty Points,Wallet Balance\nRam Kumar,9876543210,ram@email.com,100,0',
  categories:    'Name,Online Display Name,Rank,Active\nMain Course,Mains,1,true\nBeverages,Drinks,2,true',
  rmCategories:  'Name,Active\nDairy,true\nVegetables,true\nSpices,true',
  units:         'Name,Symbol\nKilogram,kg\nLitre,L\nPiece,pcs',
  tables:        'Table No,Area Name,Capacity,Notes,Active\nT1,Ground Floor,4,,true\nT2,Ground Floor,2,Window seat,true\nT3,Terrace,6,,true',
  areas:         'Name,Active\nGround Floor,true\nTerrace,true\nAC Section,true',
  products:      'Name,Category,Price,Online_Name,Description,Attributes,GST% (Allowed only 5,18,40),Short_Code,Rank,Unit\nPaneer Butter Masala,Main Course,280,PBM,Rich creamy gravy,veg,5,,1,\nChicken Biryani,Rice,320,,Fragrant rice,non-veg,5,,,',
}

// ── Styles ────────────────────────────────────────────────────────
const card = {
  background: '#fff',
  border: '1px solid #e8eaed',
  borderRadius: 12,
  padding: 20,
}

const btnGreen = (disabled) => ({
  padding: '9px 20px',
  borderRadius: 8,
  border: 'none',
  background: disabled ? '#d1d5db' : '#10b981',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
})

const btnGhost = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid #e8eaed',
  background: '#fff',
  color: '#555',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 600,
}

// ─────────────────────────────────────────────────────────────────
// Export Card
// ─────────────────────────────────────────────────────────────────
function ExportCard({ icon, title, description, onDownload, children }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      await onDownload()
    } catch (e) {
      setError(e.message || 'Download failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
      </div>

      {/* Description */}
      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
        {description}
      </p>

      {/* Optional extras (date pickers, etc.) */}
      {children && (
        <div style={{ marginBottom: 14 }}>
          {children}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 10, fontSize: 12, color: '#dc2626',
          background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {/* Button */}
      <button style={btnGreen(loading)} onClick={handleClick} disabled={loading}>
        {loading
          ? <><Spinner /> Downloading…</>
          : <><span style={{ fontSize: 14 }}>⬇</span> Download CSV</>}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Import Card
// ─────────────────────────────────────────────────────────────────
function ImportCard({ icon, title, description, accept, onUpload, templateKey }) {
  const [file,      setFile]      = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState(null)
  const [dragging,  setDragging]  = useState(false)
  const fileRef = useRef(null)

  function handleFile(f) {
    if (!f) return
    setFile(f)
    setResult(null)
    setError(null)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    setResult(null)
    try {
      const res = await onUpload(file)
      if (res.status === 401) {
        localStorage.removeItem('harmoney_token')
        window.location.href = '/login'
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || `${res.status} ${res.statusText}`)
      setResult(data)
    } catch (e) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function downloadTemplate() {
    if (!templateKey || !TEMPLATES[templateKey]) return
    const blob = new Blob([TEMPLATES[templateKey]], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${templateKey}-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function reset() { setFile(null); setResult(null); setError(null) }

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
        {description}
      </p>

      {result ? (
        /* Result display */
        <div>
          <div style={{
            background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: 8, padding: '12px 16px', marginBottom: 10,
          }}>
            <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 6 }}>
              Import Complete
            </div>
            <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.8 }}>
              {result.created   != null && <div>Created: {result.created}</div>}
              {result.productsCreated != null && <div>Created: {result.productsCreated}</div>}
              {result.updated   != null && <div>Updated: {result.updated}</div>}
              {result.skipped   != null && <div>Skipped: {result.skipped}</div>}
              {result.productsSkipped != null && <div>Skipped: {result.productsSkipped}</div>}
              {result.errors?.length > 0 && (
                <div style={{ color: '#c2410c', marginTop: 4 }}>
                  Errors: {result.errors.length} row(s)
                  <div style={{ maxHeight: 100, overflowY: 'auto', marginTop: 4 }}>
                    {result.errors.map((e, i) => (
                      <div key={i} style={{ fontSize: 11 }}>{i + 1}. {e}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <button style={btnGhost} onClick={reset}>New Import</button>
        </div>
      ) : (
        <>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !file && fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#863bff' : file ? '#10b981' : '#d1d5db'}`,
              borderRadius: 10,
              padding: file ? '16px' : '24px 16px',
              textAlign: 'center',
              background: dragging ? '#f5f0ff' : file ? '#f0fdf4' : '#fafafa',
              cursor: file ? 'default' : 'pointer',
              transition: 'all .2s',
              marginBottom: 12,
            }}>
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />

            {file ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 4 }}>📄</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>{file.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{(file.size / 1024).toFixed(1)} KB</div>
                <button
                  onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                  style={{ ...btnGhost, marginTop: 8, fontSize: 11, padding: '4px 12px' }}>
                  Change File
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Drop file here or click to browse
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  Accepted: {accept}
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 10, fontSize: 12, color: '#dc2626',
              background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={btnGreen(!file || uploading)}
              onClick={handleUpload}
              disabled={!file || uploading}>
              {uploading
                ? <><Spinner /> Uploading…</>
                : <><span style={{ fontSize: 13 }}>⬆</span> Upload & Import</>}
            </button>
            {templateKey && TEMPLATES[templateKey] && (
              <button style={btnGhost} onClick={downloadTemplate}>
                ⬇ Template CSV
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 12, height: 12,
      border: '2px solid rgba(255,255,255,0.4)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

// ─────────────────────────────────────────────────────────────────
// DataHub page
// ─────────────────────────────────────────────────────────────────
export default function DataHub() {
  const rid = useAuthStore(s => s.restaurantId)
  const [tab, setTab] = useState('export')
  const [showXlsx, setShowXlsx] = useState(false)

  // Bills date range state
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0]
  const [billsFrom, setBillsFrom] = useState(firstOfMonth)
  const [billsTo,   setBillsTo]   = useState(today)

  const tabStyle = (active) => ({
    padding: '8px 20px',
    borderRadius: 20,
    border: 'none',
    background: active ? '#863bff' : '#f3f4f6',
    color: active ? '#fff' : '#6b7280',
    fontWeight: active ? 700 : 500,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all .15s',
  })

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>

      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>📊</span> Data Hub
        </h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
          Excel/CSV import aur export karein
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button style={tabStyle(tab === 'export')} onClick={() => setTab('export')}>
          Export
        </button>
        <button style={tabStyle(tab === 'import')} onClick={() => setTab('import')}>
          Import
        </button>
      </div>

      {/* ── Export Tab ── */}
      {tab === 'export' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>

          {/* 1. Sales / Bills */}
          <ExportCard
            icon="🧾"
            title="Sales Report"
            description="Bills with customer, payment, tax details"
            onDownload={() => downloadFile(exportApi.bills(billsFrom, billsTo), 'bills-export.csv')}
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  From
                </label>
                <input
                  type="date"
                  value={billsFrom}
                  onChange={e => setBillsFrom(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e8eaed', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  To
                </label>
                <input
                  type="date"
                  value={billsTo}
                  onChange={e => setBillsTo(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e8eaed', fontSize: 13 }}
                />
              </div>
            </div>
          </ExportCard>

          {/* 2. Menu Items */}
          <ExportCard
            icon="🍽️"
            title="Menu Items"
            description="Products, categories, pricing, GST%, attributes"
            onDownload={() => downloadFile(exportApi.menu(), 'menu-export.csv')}
          />

          {/* 3. Customers */}
          <ExportCard
            icon="👥"
            title="Customers"
            description="Customer list with loyalty points, wallet, visit count"
            onDownload={() => downloadFile(exportApi.customers(), 'customers-export.csv')}
          />

          {/* 4. Raw Materials */}
          <ExportCard
            icon="📦"
            title="Raw Materials"
            description="Stock levels, purchase prices, categories"
            onDownload={() => downloadFile(exportApi.rawMaterials(), 'raw-materials-export.csv')}
          />

          {/* 5. Staff */}
          <ExportCard
            icon="👤"
            title="Staff List"
            description="Staff names, roles, salary, contact"
            onDownload={() => downloadFile(exportApi.staff(), 'staff-export.csv')}
          />
        </div>
      )}

      {/* XLSX Menu Import Modal */}
      {showXlsx && (
        <XlsxMenuImport
          onClose={() => setShowXlsx(false)}
          onImported={() => setShowXlsx(false)}
        />
      )}

      {/* ── Import Tab ── */}
      {tab === 'import' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>

          {/* 0. XLSX Menu Import — full preview + filter */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>📊</span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>XLSX Menu Import</span>
              <span style={{ fontSize: 11, background: '#6366f115', color: '#6366f1', border: '1px solid #6366f130', borderRadius: 10, padding: '2px 8px', fontWeight: 600 }}>New</span>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
              PetPooja, Truce Cafe, ya koi bhi restaurant Excel menu import karo. Preview + category/item filter ke saath. Variants bhi support hain.
            </p>
            <button
              style={btnGreen(false)}
              onClick={() => setShowXlsx(true)}>
              <span style={{ fontSize: 14 }}>📥</span> Import XLSX
            </button>
          </div>

          {/* 1. Menu Items (CSV only) */}
          <ImportCard
            icon="🍽️"
            title="Menu Items (CSV)"
            description="Bulk import menu items from CSV. Download sample template first."
            accept=".csv"
            templateKey={null}
            onUpload={(file) => {
              const token = localStorage.getItem('harmoney_token') || ''
              const base  = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
              const fd    = new FormData()
              fd.append('file', file)
              fd.append('restaurantId', rid)
              return fetch(`${base}/import/menu-csv`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
              })
            }}
          />

          {/* 2. Raw Materials */}
          <ImportCard
            icon="📦"
            title="Raw Materials"
            description="Import raw materials / inventory items. Supports .csv and .xlsx"
            accept=".csv,.xlsx"
            templateKey="rawMaterials"
            onUpload={(file) => dataImportApi.importRawMaterials(file, rid)}
          />

          {/* 3. Customers */}
          <ImportCard
            icon="👥"
            title="Customers"
            description="Import customer database. Supports .csv and .xlsx"
            accept=".csv,.xlsx"
            templateKey="customers"
            onUpload={(file) => dataImportApi.importCustomers(file, rid)}
          />

          {/* 4. Menu Categories */}
          <ImportCard
            icon="📋"
            title="Menu Categories"
            description="Menu categories bulk import. CSV/XLSX supported."
            accept=".csv,.xlsx"
            templateKey="categories"
            onUpload={(file) => dataImportApi.importCategories(file, rid)}
          />

          {/* 5. Raw Material Categories */}
          <ImportCard
            icon="🗂️"
            title="RM Categories"
            description="Raw material categories. CSV/XLSX supported."
            accept=".csv,.xlsx"
            templateKey="rmCategories"
            onUpload={(file) => dataImportApi.importRmCategories(file, rid)}
          />

          {/* 6. Inventory Units */}
          <ImportCard
            icon="⚖️"
            title="Inventory Units"
            description="Units of measurement (kg, litre, piece). CSV/XLSX supported."
            accept=".csv,.xlsx"
            templateKey="units"
            onUpload={(file) => dataImportApi.importUnits(file, rid)}
          />

          {/* 7. Tables */}
          <ImportCard
            icon="🪑"
            title="Tables"
            description="Restaurant tables with capacity and area. CSV/XLSX supported."
            accept=".csv,.xlsx"
            templateKey="tables"
            onUpload={(file) => dataImportApi.importTables(file, rid)}
          />

          {/* 8. Areas / Sections */}
          <ImportCard
            icon="🏢"
            title="Areas / Sections"
            description="Restaurant areas or sections (Ground Floor, Terrace, etc.). CSV/XLSX supported."
            accept=".csv,.xlsx"
            templateKey="areas"
            onUpload={(file) => dataImportApi.importAreas(file, rid)}
          />

          {/* 9. Products (CSV + XLSX) */}
          <ImportCard
            icon="🍽️"
            title="Products (CSV + XLSX)"
            description={
              <>
                Bulk import products from CSV or XLSX. Same columns as Menu CSV import.
                <br />
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  Note: This creates new products only — existing products are skipped.
                </span>
              </>
            }
            accept=".csv,.xlsx"
            templateKey="products"
            onUpload={(file) => dataImportApi.importProducts(file, rid)}
          />
        </div>
      )}
    </div>
  )
}
