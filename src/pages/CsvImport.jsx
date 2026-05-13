import { useState, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'

function getToken() { return localStorage.getItem('harmoney_token') || '' }

// CSV columns with description
const CSV_COLUMNS = [
  { col: 'Name',                          req: true,  desc: 'Menu item name'                         },
  { col: 'Category',                      req: true,  desc: 'Category name (auto-created if missing)' },
  { col: 'Price',                         req: true,  desc: 'Selling price (number only)'             },
  { col: 'Online_Name',                   req: false, desc: 'Name shown on Zomato/Swiggy'             },
  { col: 'Description',                   req: false, desc: 'Item description'                        },
  { col: 'Short_Code',                    req: false, desc: 'Short code for POS'                      },
  { col: 'Parent_Category',               req: false, desc: 'Parent category (e.g. Dinner, Lunch)'    },
  { col: 'Attributes',                    req: false, desc: 'veg / non-veg / egg'                     },
  { col: 'Goods_Services',                req: false, desc: 'goods / services'                        },
  { col: 'GST% (Allowed only 5,18,40)',   req: false, desc: '5, 18, or 40'                            },
  { col: 'Unit',                          req: false, desc: 'Unit (plate, piece, kg)'                 },
  { col: 'Rank',                          req: false, desc: 'Display order (number)'                  },
  { col: 'Packing_Charges',               req: false, desc: 'Packing charge amount'                   },
  { col: 'Variation_group_name',          req: false, desc: 'Variant group name'                      },
  { col: 'Variation',                     req: false, desc: 'Variant name (e.g. Small)'               },
  { col: 'Variation_Price',               req: false, desc: 'Variant price'                           },
  { col: 'Addon_Group_Name',              req: false, desc: 'Addon group name'                        },
]

// Sample CSV data
const SAMPLE_ROWS = [
  'Name,Category,Price,Online_Name,Description,Attributes,GST% (Allowed only 5,18,40)',
  'Paneer Butter Masala,Main Course,280,PBM,Rich creamy gravy,veg,5',
  'Chicken Biryani,Rice,320,Chicken Biryani,Fragrant basmati rice,non-veg,5',
  'Cold Coffee,Beverages,120,Cold Coffee,Chilled coffee with milk,veg,18',
  'Veg Burger,Snacks,150,,Crispy veg patty burger,veg,5',
]

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_ROWS.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = 'harmony_menu_sample.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Result card ───────────────────────────────────────────────────────────
function ResultCard({ result, onReset }) {
  const success = result.success && (!result.errors || result.errors.length === 0)
  return (
    <div style={{ padding: '24px', borderRadius: 12,
      background: success ? '#f0fdf4' : '#fff7ed',
      border: `1px solid ${success ? '#86efac' : '#fed7aa'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: success ? '#15803d' : '#c2410c', marginBottom: 4 }}>
            {success ? '✅ Import Successful!' : '⚠️ Import Completed with Warnings'}
          </div>
          <div style={{ fontSize: 13, color: success ? '#166534' : '#9a3412' }}>
            CSV file process ho gayi
          </div>
        </div>
        <button onClick={onReset}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'white', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
          New Import
        </button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 12, marginBottom: result.errors?.length ? 20 : 0 }}>
        {[
          { label: 'Total Rows',          value: result.totalRows         ?? 0, color: '#6366f1' },
          { label: 'Products Created',    value: result.productsCreated   ?? 0, color: '#10b981' },
          { label: 'Categories Created',  value: result.categoriesCreated ?? 0, color: '#3b82f6' },
          { label: 'Skipped',             value: result.productsSkipped   ?? 0, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: 10,
            padding: '14px 16px', border: '1px solid rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Errors */}
      {result.errors?.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#c2410c', marginBottom: 8 }}>
            ⚠️ {result.errors.length} row(s) mein error tha:
          </div>
          <div style={{ background: 'white', borderRadius: 8, padding: '12px 16px',
            border: '1px solid #fed7aa', maxHeight: 180, overflowY: 'auto' }}>
            {result.errors.map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: '#c2410c', padding: '3px 0',
                borderBottom: i < result.errors.length - 1 ? '1px solid #fff7ed' : 'none' }}>
                {i + 1}. {e}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function CsvImport() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [dragging,   setDragging]   = useState(false)
  const [file,       setFile]       = useState(null)
  const [uploading,  setUploading]  = useState(false)
  const [result,     setResult]     = useState(null)
  const [showCols,   setShowCols]   = useState(false)
  const fileRef = useRef(null)

  function handleFile(f) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast.error('Sirf .csv file allowed hai')
      return
    }
    setFile(f)
    setResult(null)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }

  async function handleUpload() {
    if (!file) return toast.error('Pehle CSV file choose karo')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('restaurantId', rid)

      const res = await fetch(`${BASE}/import/menu-csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      })

      if (res.status === 401) {
        localStorage.removeItem('harmoney_token')
        window.location.href = '/login'
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      setResult(data)
      if (data.success) {
        toast.success(`${data.productsCreated} products import ho gaye!`)
      } else {
        toast.error('Import mein kuch errors aaye — result check karo')
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  function reset() { setFile(null); setResult(null) }

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📥 CSV Import</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Excel/CSV se bulk menu items import karo
        </p>
      </div>

      {result ? (
        <ResultCard result={result} onReset={reset} />
      ) : (
        <>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !file && fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : file ? '#10b981' : 'var(--border)'}`,
              borderRadius: 14, padding: '48px 32px', textAlign: 'center',
              background: dragging ? 'var(--accent-bg)' : file ? '#f0fdf4' : 'var(--bg-card)',
              cursor: file ? 'default' : 'pointer', transition: 'all .2s', marginBottom: 20,
            }}>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />

            {file ? (
              <div>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#15803d', marginBottom: 4 }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {(file.size / 1024).toFixed(1)} KB
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                    style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'white', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                    Change File
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleUpload() }} disabled={uploading}
                    style={{ padding: '8px 24px', borderRadius: 8, border: 'none',
                      background: uploading ? '#ccc' : 'var(--accent)', color: '#fff',
                      cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
                    {uploading ? 'Uploading…' : '⬆ Upload & Import'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
                  CSV file yahan drop karo
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
                  ya click karke file choose karo
                </div>
                <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'white',
                  fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                  Browse File
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                  Sirf .csv format — max 10MB
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button onClick={downloadSampleCsv}
              style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              ⬇ Download Sample CSV
            </button>
            <button onClick={() => setShowCols(s => !s)}
              style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600 }}>
              {showCols ? 'Hide' : 'View'} Column Format
            </button>
          </div>

          {/* Column reference */}
          {showCols && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)',
                fontWeight: 700, fontSize: 14 }}>
                CSV Column Reference
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-page)', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Column</th>
                      <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Required</th>
                      <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CSV_COLUMNS.map(c => (
                      <tr key={c.col} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>
                          {c.col}
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          {c.req ? (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px',
                              borderRadius: 20, background: '#fee2e2', color: '#dc2626' }}>Required</span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Optional</span>
                          )}
                        </td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                          {c.desc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tips */}
          <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 10,
            background: 'var(--accent-bg)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--text)' }}>💡 Tips:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
              <li>Pehle <strong>"Download Sample CSV"</strong> karo — usse format samjho</li>
              <li>Category column se automatically categories create ho jaati hain agar nahi hain</li>
              <li>Duplicate names skip ho jaate hain</li>
              <li>Excel mein banao → "Save As CSV" karo → phir upload karo</li>
              <li>Column names exactly match karne chahiye (case-sensitive nahi)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
