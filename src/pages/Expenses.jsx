import { useState, useEffect, useCallback } from 'react'
import { expenseApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

const CATEGORIES = [
  'RENT','SALARY','UTILITIES','RAW_MATERIAL','SUPPLIES',
  'MARKETING','MAINTENANCE','TRANSPORT','STAFF_WELFARE','MISCELLANEOUS',
]
const PAYMENT_MODES = ['CASH','ONLINE','CHEQUE','CARD']

const CATEGORY_COLORS = {
  RENT: '#6366f1', SALARY: '#8b5cf6', UTILITIES: '#f59e0b',
  RAW_MATERIAL: '#10b981', SUPPLIES: '#06b6d4', MARKETING: '#ec4899',
  MAINTENANCE: '#f97316', TRANSPORT: '#3b82f6', STAFF_WELFARE: '#a855f7',
  MISCELLANEOUS: '#6b7280',
}

const PAYMENT_COLORS = {
  CASH: '#10b981', ONLINE: '#6366f1', CHEQUE: '#f59e0b', CARD: '#3b82f6',
}

function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }) }
function fmtDate(s) { return s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—' }
function today() { return new Date().toISOString().slice(0, 10) }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

function Badge({ text, color = '#6366f1' }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
      background: color + '22', color }}>
      {text}
    </span>
  )
}

function Inp({ label, value, onChange, type = 'text', placeholder = '', required = false, min, step }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} min={min} step={step}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  )
}

function Sel({ label, value, onChange, options = [], required = false }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <select value={value ?? ''} onChange={onChange}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  )
}

const EMPTY_FORM = {
  title: '', category: 'MISCELLANEOUS', amount: '', paymentMode: 'CASH',
  expenseDate: today(), notes: '',
}

function Modal({ title, onClose, onSubmit, saving, form, setForm }) {
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000, padding: 16 }}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, padding:24, width:'100%',
        maxWidth:460, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:20, color:'var(--text-muted)', lineHeight:1 }}>×</button>
        </div>

        <Inp label="Title" value={form.title} onChange={set('title')} required placeholder="e.g. Monthly Rent" />
        <Sel label="Category" value={form.category} onChange={set('category')} required
          options={CATEGORIES.map(c => ({ value: c, label: c.replace(/_/g, ' ') }))} />
        <Inp label="Amount (₹)" value={form.amount} onChange={set('amount')} type="number" min="0.01" step="0.01" required />
        <Sel label="Payment Mode" value={form.paymentMode} onChange={set('paymentMode')} required
          options={PAYMENT_MODES.map(p => ({ value: p, label: p }))} />
        <Inp label="Date" value={form.expenseDate} onChange={set('expenseDate')} type="date" required />
        <div style={{ marginBottom: 12 }}>
          <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>Notes</label>
          <textarea value={form.notes ?? ''} onChange={set('notes')} rows={3} placeholder="Optional..."
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
    </div>
  )
}

function SummaryCards({ summary, loading }) {
  if (loading) {
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background:'var(--bg-card)', borderRadius:12, padding:'16px 18px', height:72,
            animation:'pulse 1.5s ease-in-out infinite', opacity:0.6 }} />
        ))}
      </div>
    )
  }
  if (!summary) return null

  const topCats = Object.entries(summary.byCategory || {})
    .sort(([,a],[,b]) => b - a).slice(0, 3)

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
          <div style={{ fontSize:10, color: CATEGORY_COLORS[cat] || '#6366f1', fontWeight:700, marginBottom:4 }}>
            {cat.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>{fmt(amt)}</div>
        </div>
      ))}
    </div>
  )
}

export default function Expenses() {
  const { restaurantId } = useAuthStore()
  const { showToast } = useToast()

  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  const [summary, setSummary]         = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [from, setFrom]       = useState(monthStart())
  const [to, setTo]           = useState(today())
  const [category, setCategory] = useState('')

  const [modal, setModal]     = useState(null) // null | 'add' | {id, ...form}
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null) // id being deleted

  const rid = restaurantId

  const load = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const data = await expenseApi.getAll(rid, { from, to, category: category || undefined, page: p })
      setRows(data.content || [])
      setTotalPages(data.totalPages || 1)
      setTotalElements(data.totalElements || 0)
      setPage(p)
    } catch (e) {
      showToast(e.message || 'Failed to load expenses', 'error')
    } finally {
      setLoading(false)
    }
  }, [rid, from, to, category])

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const data = await expenseApi.getSummary(rid, { from, to })
      setSummary(data)
    } catch {
      // summary is non-critical
    } finally {
      setSummaryLoading(false)
    }
  }, [rid, from, to])

  useEffect(() => { load(0); loadSummary() }, [load, loadSummary])

  function openAdd() {
    setForm({ ...EMPTY_FORM, expenseDate: today() })
    setModal('add')
  }

  function openEdit(row) {
    setForm({
      title: row.title, category: row.category, amount: row.amount,
      paymentMode: row.paymentMode, expenseDate: row.expenseDate, notes: row.notes || '',
    })
    setModal(row)
  }

  async function handleSubmit() {
    if (!form.title.trim()) return showToast('Title required', 'error')
    if (!form.amount || Number(form.amount) <= 0) return showToast('Valid amount required', 'error')
    if (!form.expenseDate) return showToast('Date required', 'error')

    setSaving(true)
    try {
      const body = {
        title: form.title.trim(), category: form.category, amount: Number(form.amount),
        paymentMode: form.paymentMode, expenseDate: form.expenseDate,
        notes: form.notes || null,
      }
      if (modal === 'add') {
        await expenseApi.create(rid, body)
        showToast('Expense added', 'success')
      } else {
        await expenseApi.update(rid, modal.id, body)
        showToast('Expense updated', 'success')
      }
      setModal(null)
      load(0)
      loadSummary()
    } catch (e) {
      showToast(e.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return
    setDeleting(id)
    try {
      await expenseApi.delete(rid, id)
      showToast('Deleted', 'success')
      load(page)
      loadSummary()
    } catch (e) {
      showToast(e.message || 'Failed to delete', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const filterStyle = {
    padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13,
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>Expenses</h2>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Track all your restaurant costs</div>
        </div>
        <button onClick={openAdd}
          style={{ padding:'9px 18px', borderRadius:9, border:'none', background:'var(--accent)',
            color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          + Add Expense
        </button>
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
          <select value={category} onChange={e => setCategory(e.target.value)} style={filterStyle}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <button onClick={() => load(0)}
          style={{ padding:'7px 16px', borderRadius:8, border:'1px solid var(--accent)',
            background:'transparent', color:'var(--accent)', fontSize:13, cursor:'pointer', fontWeight:600, alignSelf:'flex-end' }}>
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
                  <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600, maxWidth:180, overflow:'hidden',
                    textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <Badge text={r.category.replace(/_/g, ' ')} color={CATEGORY_COLORS[r.category] || '#6366f1'} />
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
        <Modal
          title={modal === 'add' ? 'Add Expense' : 'Edit Expense'}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          saving={saving}
          form={form}
          setForm={setForm}
        />
      )}
    </div>
  )
}
