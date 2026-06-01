// src/components/menu/XlsxMenuImport.jsx
import { useState, useRef, useMemo } from 'react'
import { useToast } from '../../hooks/useToast'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:2026') + '/api/v1'
const token = () => localStorage.getItem('harmoney_token') || ''

export default function XlsxMenuImport({ onClose, onImported }) {
  const toast = useToast()
  const fileRef = useRef()

  const [step,     setStep]     = useState('upload')   // upload | preview | done
  const [items,    setItems]    = useState([])
  const [selected, setSelected] = useState(new Set())
  const [catFilter,setCatFilter]= useState('ALL')
  const [search,   setSearch]   = useState('')
  const [busy,     setBusy]     = useState(false)
  const [result,   setResult]   = useState(null)

  const categories = useMemo(() =>
    ['ALL', ...new Set(items.map(i => i.category).filter(Boolean))], [items])

  const visible = useMemo(() => items.filter(i => {
    if (catFilter !== 'ALL' && i.category !== catFilter) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [items, catFilter, search])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch(`${BASE}/import/xlsx-preview`, {
        method: 'POST', body: form, headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Parse failed'); return }
      setItems(data.items)
      setSelected(new Set(data.items.map((_, i) => i)))   // all selected by default
      setStep('preview')
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  function toggleItem(idx) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  function toggleCat(cat) {
    const catIdxs = items.reduce((acc, item, i) => {
      if (item.category === cat) acc.push(i); return acc
    }, [])
    const allSel = catIdxs.every(i => selected.has(i))
    setSelected(prev => {
      const next = new Set(prev)
      catIdxs.forEach(i => allSel ? next.delete(i) : next.add(i))
      return next
    })
  }

  function selectVisible(val) {
    setSelected(prev => {
      const next = new Set(prev)
      visible.forEach((_, relIdx) => {
        const absIdx = items.indexOf(visible[relIdx])
        val ? next.add(absIdx) : next.delete(absIdx)
      })
      return next
    })
  }

  async function doImport() {
    const toImport = items.filter((_, i) => selected.has(i))
    if (!toImport.length) { toast.error('Koi item select nahi hai'); return }
    setBusy(true)
    try {
      const res  = await fetch(`${BASE}/import/xlsx-menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ items: toImport })
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Import failed'); return }
      setResult(data)
      setStep('done')
      onImported?.()
    } catch (err) {
      toast.error(err.message || 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  // ── Styles ──────────────────────────────────────────────────────
  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  }
  const modal = {
    background: 'var(--bg-card)', borderRadius: 14, width: '92vw', maxWidth: 860,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    overflow: 'hidden', color: 'var(--text)',
  }
  const hdr = {
    padding: '18px 24px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }
  const btn = (primary) => ({
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: primary ? 'none' : '1px solid var(--border)',
    background: primary ? 'var(--accent, #6366f1)' : 'transparent',
    color: primary ? '#fff' : 'var(--text)',
  })

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>

        {/* Header */}
        <div style={hdr}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>📥 XLSX Menu Import</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {step === 'upload' && 'Truce Cafe ya koi bhi XLSX file upload karo'}
              {step === 'preview' && `${items.length} items mila — filter karo aur select karo`}
              {step === 'done' && 'Import complete!'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
            <div style={{ fontSize: 48 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>XLSX file select karo</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 380 }}>
              PetPooja, Truce Cafe ya koi bhi restaurant menu Excel file upload karo.<br />
              Format auto-detect hoga.
            </div>
            <label style={{
              padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              background: 'var(--accent, #6366f1)', color: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}>
              {busy ? 'Parsing…' : '📁 File Choose Karo'}
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} disabled={busy} />
            </label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supported: .xlsx, .xls</div>
          </div>
        )}

        {/* ── STEP 2: Preview + Filter ── */}
        {step === 'preview' && (
          <>
            {/* Filter bar */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="🔍 Item search karo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: 13,
                  border: '1px solid var(--border)', background: 'var(--bg-page)',
                  color: 'var(--text)', outline: 'none', minWidth: 180, flex: 1,
                }}
              />
              <select
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: 13,
                  border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text)',
                }}
              >
                {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? '📂 Sab Categories' : c}</option>)}
              </select>
              <button onClick={() => selectVisible(true)}  style={btn(false)}>✅ Sab Select</button>
              <button onClick={() => selectVisible(false)} style={btn(false)}>⬜ Sab Deselect</button>
            </div>

            {/* Category quick-toggle pills */}
            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categories.filter(c => c !== 'ALL').map(cat => {
                const catIdxs = items.reduce((a, item, i) => { if (item.category === cat) a.push(i); return a }, [])
                const allSel  = catIdxs.every(i => selected.has(i))
                const noneSel = catIdxs.every(i => !selected.has(i))
                return (
                  <button key={cat} onClick={() => toggleCat(cat)} style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: allSel ? 'var(--accent, #6366f1)' : noneSel ? 'var(--bg-page)' : 'rgba(99,102,241,0.2)',
                    color: allSel ? '#fff' : 'var(--text)',
                  }}>
                    {cat} ({catIdxs.length})
                  </button>
                )
              })}
            </div>

            {/* Items table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              <div style={{ paddingTop: 12, paddingBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                {visible.length} items dikha rahe hain • {selected.size} selected
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                    <th style={{ width: 36, padding: '8px 4px', textAlign: 'center', color: 'var(--text-muted)' }}></th>
                    <th style={{ padding: '8px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Category</th>
                    <th style={{ padding: '8px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Item Name</th>
                    <th style={{ padding: '8px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Price / Variants</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => {
                    const absIdx = items.indexOf(item)
                    const isSel  = selected.has(absIdx)
                    return (
                      <tr key={absIdx} onClick={() => toggleItem(absIdx)}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isSel ? 'rgba(99,102,241,0.05)' : 'transparent' }}>
                        <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleItem(absIdx)} onClick={e => e.stopPropagation()} />
                        </td>
                        <td style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 12 }}>{item.category}</td>
                        <td style={{ padding: '8px 8px', fontWeight: isSel ? 500 : 400, color: 'var(--text)' }}>{item.name}</td>
                        <td style={{ padding: '8px 8px', color: 'var(--text-muted)', fontSize: 12 }}>
                          {item.variants?.length > 0
                            ? item.variants.map(v => `${v.name}: ₹${v.price}`).join(' | ')
                            : item.price > 0 ? `₹${item.price}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 'auto' }}>
                {selected.size} / {items.length} items selected
              </span>
              <button onClick={onClose} style={btn(false)}>Cancel</button>
              <button onClick={doImport} disabled={busy || selected.size === 0} style={{
                ...btn(true), opacity: (busy || selected.size === 0) ? 0.6 : 1,
                cursor: (busy || selected.size === 0) ? 'not-allowed' : 'pointer',
              }}>
                {busy ? 'Importing…' : `⬆️ Import ${selected.size} Items`}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 'done' && result && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Import Complete!</div>
            <div style={{ background: 'var(--bg-page)', borderRadius: 12, padding: '16px 28px', display: 'flex', gap: 32 }}>
              <Stat label="Items Import Hue" value={result.productsCreated} color="#10b981" />
              <Stat label="Categories Bani"  value={result.categoriesCreated} color="#6366f1" />
              <Stat label="Skip Kiye"         value={result.skipped}          color="#f59e0b" />
            </div>
            {result.errors?.length > 0 && (
              <div style={{ fontSize: 12, color: '#ef4444', maxWidth: 400, textAlign: 'center' }}>
                Errors: {result.errors.join(', ')}
              </div>
            )}
            <button onClick={onClose} style={btn(true)}>Done</button>
          </div>
        )}

      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
