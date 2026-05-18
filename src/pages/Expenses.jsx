import { useState, useEffect, useCallback } from 'react'
import { expenseApi, expenseCategoryApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

const PAYMENT_MODES = ['CASH', 'ONLINE', 'CHEQUE', 'CARD']

const CAT_PALETTE = [
  '#6366f1','#8b5cf6','#f59e0b','#10b981','#06b6d4',
  '#ec4899','#f97316','#3b82f6','#a855f7','#6b7280',
  '#14b8a6','#ef4444','#84cc16','#f43f5e','#0ea5e9',
]
function catColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return CAT_PALETTE[h % CAT_PALETTE.length]
}

const PAYMENT_COLORS = { CASH:'#10b981', ONLINE:'#6366f1', CHEQUE:'#f59e0b', CARD:'#3b82f6' }

function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }) }
function fmtDate(s) {
  return s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'
}
function today() { return new Date().toISOString().slice(0, 10) }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }
function displayName(name) { return name.replace(/_/g, ' ') }

function Badge({ text, color = '#6366f1' }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
      background: color + '22', color }}>
      {displayName(text)}
    </span>
  )
}

function Inp({ label, value, onChange, type = 'text', placeholder = '', required = false, min, step, autoFocus }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder}
        min={min} step={step} autoFocus={autoFocus}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  )
}

// Add Category inline mini-modal
function AddCategoryPopup({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) return toast.error('Category name required')
    setSaving(true)
    try {
      const cat = await expenseCategoryApi.create(trimmed)
      toast.success('Category added')
      onAdd(cat)
      onClose()
    } catch (e) {
      toast.error(e.message || 'Failed to add category')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1100 }}>
      <div style={{ background:'var(--bg-card)', borderRadius:12, padding:24, width:320,
        boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <h4 style={{ margin:'0 0 16px', fontSize:15 }}>Add New Category</h4>
        <Inp label="Category Name" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Equipment Repair" required autoFocus />
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding:'7px 16px', borderRadius:8, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text)', fontSize:13, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            style={{ padding:'7px 16px', borderRadius:8, border:'none', background:'var(--accent)',
              color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Manage Categories modal
function ManageCategoriesModal({ categories, onClose, onDelete, onAdd }) {
  const custom = categories.filter(c => !c.system)
  const system = categories.filter(c => c.system)
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const toast = useToast()

  async function handleDelete(cat) {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return
    setDeleting(cat.id)
    try {
      await expenseCategoryApi.delete(cat.id)
      toast.success('Category deleted')
      onDelete(cat.id)
    } catch (e) {
      toast.error(e.message || 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, padding:24, width:'100%',
        maxWidth:420, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>Manage Categories</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:20, color:'var(--text-muted)' }}>×</button>
        </div>

        <button onClick={() => setShowAdd(true)}
          style={{ width:'100%', padding:'9px', borderRadius:9, border:'2px dashed var(--accent)',
            background:'transparent', color:'var(--accent)', fontSize:13, fontWeight:600,
            cursor:'pointer', marginBottom:16 }}>
          + Add New Category
        </button>

        {custom.length > 0 && (
          <>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, marginBottom:8 }}>
              CUSTOM CATEGORIES
            </div>
            {custom.map(cat => (
              <div key={cat.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'9px 12px', borderRadius:8, background:'var(--bg-page)', marginBottom:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background: catColor(cat.name),
                    display:'inline-block', flexShrink:0 }} />
                  <span style={{ fontSize:13 }}>{displayName(cat.name)}</span>
                </div>
                <button onClick={() => handleDelete(cat)} disabled={deleting === cat.id}
                  style={{ background:'none', border:'1px solid #ef4444', borderRadius:6,
                    padding:'3px 10px', fontSize:11, cursor:'pointer', color:'#ef4444',
                    opacity: deleting === cat.id ? 0.5 : 1 }}>
                  {deleting === cat.id ? '…' : 'Delete'}
                </button>
              </div>
            ))}
            <div style={{ height:12 }} />
          </>
        )}

        <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, marginBottom:8 }}>
          DEFAULT CATEGORIES
        </div>
        {system.map(cat => (
          <div key={cat.name} style={{ display:'flex', alignItems:'center', gap:8,
            padding:'9px 12px', borderRadius:8, background:'var(--bg-page)', marginBottom:6 }}>
            <span style={{ width:10, height:10, borderRadius:'50%', background: catColor(cat.name),
              display:'inline-block', flexShrink:0 }} />
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>{displayName(cat.name)}</span>
            <span style={{ fontSize:10, color:'var(--text-muted)', marginLeft:'auto' }}>system</span>
          </div>
        ))}
      </div>

      {showAdd && (
        <AddCategoryPopup
          onAdd={cat => { onAdd(cat); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

const EMPTY_FORM = { title:'', category:'', amount:'', paymentMode:'CASH', expenseDate: today(), notes:'' }

function ExpenseModal({ title, onClose, onSubmit, saving, form, setForm, categories }) {
  const [showAddCat, setShowAddCat] = useState(false)
  const toast = useToast()
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function handleAddCategory(cat) {
    setForm(f => ({ ...f, category: cat.name }))
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, padding:24, width:'100%',
        maxWidth:460, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:20, color:'var(--text-muted)', lineHeight:1 }}>×</button>
        </div>

        <Inp label="Title" value={form.title} onChange={set('title')} required placeholder="e.g. Monthly Rent" />

        {/* Category with Add button */}
        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>
            Category <span style={{ color:'#ef4444' }}>*</span>
          </label>
          <div style={{ display:'flex', gap:6 }}>
            <select value={form.category} onChange={set('category')}
              style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
                background:'var(--bg-page)', color: form.category ? 'var(--text)' : 'var(--text-muted)', fontSize:13 }}>
              <option value="">— Select category —</option>
              {categories.filter(c => c.system).map(c => (
                <option key={c.name} value={c.name}>{displayName(c.name)}</option>
              ))}
              {categories.filter(c => !c.system).length > 0 && (
                <optgroup label="Custom">
                  {categories.filter(c => !c.system).map(c => (
                    <option key={c.id} value={c.name}>{displayName(c.name)}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <button type="button" onClick={() => setShowAddCat(true)}
              title="Add new category"
              style={{ padding:'8px 12px', borderRadius:8, border:'1px solid var(--accent)',
                background:'transparent', color:'var(--accent)', fontSize:16, cursor:'pointer',
                fontWeight:700, lineHeight:1 }}>
              +
            </button>
          </div>
        </div>

        <Inp label="Amount (₹)" value={form.amount} onChange={set('amount')} type="number" min="0.01" step="0.01" required />

        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>
            Payment Mode <span style={{ color:'#ef4444' }}>*</span>
          </label>
          <select value={form.paymentMode} onChange={set('paymentMode')}
            style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
              background:'var(--bg-page)', color:'var(--text)', fontSize:13 }}>
            {PAYMENT_MODES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <Inp label="Date" value={form.expenseDate} onChange={set('expenseDate')} type="date" required />

        <div style={{ marginBottom:12 }}>
          <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>Notes</label>
          <textarea value={form.notes ?? ''} onChange={set('notes')} rows={3} placeholder="Optional…"
            style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
              background:'var(--bg-page)', color:'var(--text)', fontSize:13, boxSizing:'border-box', resize:'vertical' }} />
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text)', fontSize:13, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={onSubmit} disabled={saving}
            style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'var(--accent)',
              color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {showAddCat && (
        <AddCategoryPopup
          onAdd={cat => { handleAddCategory(cat); setShowAddCat(false) }}
          onClose={() => setShowAddCat(false)}
        />
      )}
    </div>
  )
}

function SummaryCards({ summary, loading }) {
  if (loading) return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ background:'var(--bg-card)', borderRadius:12, padding:'16px 18px', height:72,
          animation:'pulse 1.5s ease-in-out infinite', opacity:0.6 }} />
      ))}
    </div>
  )
  if (!summary) return null
  const topCats = Object.entries(summary.byCategory || {}).sort(([,a],[,b]) => b - a).slice(0, 3)
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
      <div style={{ background:'var(--bg-card)', borderRadius:12, padding:'16px 18px', gridColumn:'span 2' }}>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500, marginBottom:4 }}>
          Total ({fmtDate(summary.from)} – {fmtDate(summary.to)})
        </div>
        <div style={{ fontSize:22, fontWeight:800, color:'var(--accent)' }}>{fmt(summary.totalAmount)}</div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{summary.totalCount} expenses</div>
      </div>
      {topCats.map(([cat, amt]) => (
        <div key={cat} style={{ background:'var(--bg-card)', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ fontSize:10, color: catColor(cat), fontWeight:700, marginBottom:4 }}>{displayName(cat)}</div>
          <div style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>{fmt(amt)}</div>
        </div>
      ))}
    </div>
  )
}

export default function Expenses() {
  const { restaurantId } = useAuthStore()
  const toast = useToast()
  const rid = restaurantId

  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(0)
  const [totalPages, setTotalPages]     = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  const [summary, setSummary]           = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [categories, setCategories]     = useState([])

  const [from, setFrom]         = useState(monthStart())
  const [to, setTo]             = useState(today())
  const [filterCat, setFilterCat] = useState('')

  const [modal, setModal]       = useState(null)   // null | 'add' | rowObject
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [manageOpen, setManageOpen] = useState(false)

  const loadCategories = useCallback(async () => {
    try {
      const data = await expenseCategoryApi.getAll()
      setCategories(data)
    } catch {}
  }, [])

  const load = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const data = await expenseApi.getAll(rid, { from, to, category: filterCat || undefined, page: p })
      setRows(data.content || [])
      setTotalPages(data.totalPages || 1)
      setTotalElements(data.totalElements || 0)
      setPage(p)
    } catch (e) {
      toast.error(e.message || 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [rid, from, to, filterCat])

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      setSummary(await expenseApi.getSummary(rid, { from, to }))
    } catch {} finally { setSummaryLoading(false) }
  }, [rid, from, to])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { load(0); loadSummary() }, [load, loadSummary])

  function openAdd() { setForm({ ...EMPTY_FORM, expenseDate: today() }); setModal('add') }
  function openEdit(row) {
    setForm({ title:row.title, category:row.category, amount:row.amount,
      paymentMode:row.paymentMode, expenseDate:row.expenseDate, notes:row.notes || '' })
    setModal(row)
  }

  async function handleSubmit() {
    if (!form.title.trim()) return toast.error('Title required')
    if (!form.category) return toast.error('Category required')
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Valid amount required')
    if (!form.expenseDate) return toast.error('Date required')
    setSaving(true)
    try {
      const body = { title:form.title.trim(), category:form.category, amount:Number(form.amount),
        paymentMode:form.paymentMode, expenseDate:form.expenseDate, notes:form.notes || null }
      if (modal === 'add') { await expenseApi.create(rid, body); toast.success('Expense added') }
      else { await expenseApi.update(rid, modal.id, body); toast.success('Expense updated') }
      setModal(null); load(0); loadSummary()
    } catch (e) { toast.error(e.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return
    setDeleting(id)
    try {
      await expenseApi.delete(rid, id)
      toast.success('Deleted')
      load(page); loadSummary()
    } catch (e) { toast.error(e.message || 'Failed to delete') }
    finally { setDeleting(null) }
  }

  const filterStyle = { padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)',
    background:'var(--bg-page)', color:'var(--text)', fontSize:13 }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>Expenses</h2>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Track all your restaurant costs</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setManageOpen(true)}
            style={{ padding:'9px 14px', borderRadius:9, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text)', fontWeight:600, fontSize:13, cursor:'pointer' }}>
            Manage Categories
          </button>
          <button onClick={openAdd}
            style={{ padding:'9px 18px', borderRadius:9, border:'none', background:'var(--accent)',
              color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            + Add Expense
          </button>
        </div>
      </div>

      <SummaryCards summary={summary} loading={summaryLoading} />

      {/* Filters */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16, alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3, fontWeight:500 }}>From</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={filterStyle} />
        </div>
        <div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3, fontWeight:500 }}>To</div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={filterStyle} />
        </div>
        <div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3, fontWeight:500 }}>Category</div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={filterStyle}>
            <option value="">All Categories</option>
            {categories.filter(c => c.system).map(c => (
              <option key={c.name} value={c.name}>{displayName(c.name)}</option>
            ))}
            {categories.filter(c => !c.system).map(c => (
              <option key={c.id} value={c.name}>{displayName(c.name)}</option>
            ))}
          </select>
        </div>
        <button onClick={() => load(0)}
          style={{ padding:'7px 16px', borderRadius:8, border:'1px solid var(--accent)',
            background:'transparent', color:'var(--accent)', fontSize:13, cursor:'pointer',
            fontWeight:600, alignSelf:'flex-end' }}>
          Apply
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg-card)', borderRadius:12, overflow:'hidden' }}>
        {loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-muted)' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>💸</div>
            <div style={{ fontWeight:600 }}>No expenses found</div>
            <div style={{ fontSize:13, marginTop:4 }}>Add your first expense to get started</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Date','Title','Category','Amount','Payment','Notes',''].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11,
                    color:'var(--text-muted)', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom:'1px solid var(--border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding:'11px 14px', fontSize:13, whiteSpace:'nowrap' }}>{fmtDate(r.expenseDate)}</td>
                  <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600, maxWidth:180,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <Badge text={r.category} color={catColor(r.category)} />
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:'var(--accent)' }}>
                    {fmt(r.amount)}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <Badge text={r.paymentMode} color={PAYMENT_COLORS[r.paymentMode] || '#6b7280'} />
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)',
                    maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {r.notes || '—'}
                  </td>
                  <td style={{ padding:'11px 14px', whiteSpace:'nowrap' }}>
                    <button onClick={() => openEdit(r)}
                      style={{ background:'none', border:'1px solid var(--border)', borderRadius:6,
                        padding:'4px 10px', fontSize:11, cursor:'pointer', color:'var(--text)', marginRight:6 }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                      style={{ background:'none', border:'1px solid #ef4444', borderRadius:6,
                        padding:'4px 10px', fontSize:11, cursor:'pointer', color:'#ef4444',
                        opacity: deleting === r.id ? 0.5 : 1 }}>
                      {deleting === r.id ? '…' : 'Del'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14 }}>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>
            {totalElements} total · Page {page + 1} of {totalPages}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => load(page - 1)} disabled={page === 0}
              style={{ padding:'6px 14px', borderRadius:7, border:'1px solid var(--border)',
                background:'transparent', color:'var(--text)', fontSize:12, cursor:'pointer',
                opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
            <button onClick={() => load(page + 1)} disabled={page >= totalPages - 1}
              style={{ padding:'6px 14px', borderRadius:7, border:'1px solid var(--border)',
                background:'transparent', color:'var(--text)', fontSize:12, cursor:'pointer',
                opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next →</button>
          </div>
        </div>
      )}

      {modal && (
        <ExpenseModal
          title={modal === 'add' ? 'Add Expense' : 'Edit Expense'}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          saving={saving}
          form={form}
          setForm={setForm}
          categories={categories}
        />
      )}

      {manageOpen && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setManageOpen(false)}
          onDelete={id => setCategories(prev => prev.filter(c => c.id !== id))}
          onAdd={cat => { setCategories(prev => [...prev, cat]); }}
        />
      )}
    </div>
  )
}
