import { useState, useEffect, useCallback } from 'react'
import { refundApi } from '../api/client'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }) }
function fmtDt(s) { return s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—' }
function fmtDate(s) { return s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—' }

const STATUS_COLOR  = { PENDING: '#f59e0b', APPROVED: '#10b981', REJECTED: '#ef4444' }
const TYPE_COLOR    = { CASH: '#10b981', ONLINE: '#6366f1', CREDIT_NOTE: '#8b5cf6' }

function Badge({ text, color = '#6366f1' }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
      background: color + '22', color }}>
      {text}
    </span>
  )
}

function Inp({ label, value, onChange, type = 'text', placeholder = '', required = false, hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

// Create Refund Modal
function CreateRefundModal({ onClose, onSave }) {
  const toast = useToast()
  const [form, setForm] = useState({
    billId: '', refundAmount: '', reason: '', refundType: 'CASH',
    notes: '', creditNoteExpiry: '',
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit() {
    if (!form.billId) return toast.error('Bill ID required')
    if (!form.refundAmount || Number(form.refundAmount) <= 0) return toast.error('Valid amount required')
    if (!form.reason.trim()) return toast.error('Reason required')
    setSaving(true)
    try {
      const body = {
        billId: Number(form.billId),
        refundAmount: Number(form.refundAmount),
        reason: form.reason.trim(),
        refundType: form.refundType,
        notes: form.notes || null,
        creditNoteExpiry: form.creditNoteExpiry || null,
      }
      await refundApi.create(body)
      toast.success('Refund request created')
      onSave()
      onClose()
    } catch (e) { toast.error(e.message || 'Failed to create') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, padding:24, width:'100%',
        maxWidth:460, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>New Refund Request</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:20, color:'var(--text-muted)' }}>×</button>
        </div>

        <Inp label="Bill ID" value={form.billId} onChange={set('billId')} type="number" required
          hint="Enter the bill ID to refund" />
        <Inp label="Refund Amount (₹)" value={form.refundAmount} onChange={set('refundAmount')}
          type="number" min="0.01" step="0.01" required />

        <div style={{ marginBottom: 12 }}>
          <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>
            Refund Type <span style={{ color:'#ef4444' }}>*</span>
          </label>
          <div style={{ display:'flex', gap:8 }}>
            {['CASH','ONLINE','CREDIT_NOTE'].map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, refundType: t }))}
                style={{ flex:1, padding:'8px 0', borderRadius:8, fontSize:12, cursor:'pointer', fontWeight:600,
                  border: `1px solid ${form.refundType === t ? TYPE_COLOR[t] : 'var(--border)'}`,
                  background: form.refundType === t ? TYPE_COLOR[t] + '22' : 'transparent',
                  color: form.refundType === t ? TYPE_COLOR[t] : 'var(--text-muted)' }}>
                {t === 'CREDIT_NOTE' ? 'Credit Note' : t}
              </button>
            ))}
          </div>
        </div>

        {form.refundType === 'CREDIT_NOTE' && (
          <Inp label="Credit Note Expiry" value={form.creditNoteExpiry}
            onChange={set('creditNoteExpiry')} type="date" hint="Optional — leave blank for no expiry" />
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>
            Reason <span style={{ color:'#ef4444' }}>*</span>
          </label>
          <textarea value={form.reason} onChange={set('reason')} rows={3} placeholder="Why is this refund needed?"
            style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
              background:'var(--bg-page)', color:'var(--text)', fontSize:13, boxSizing:'border-box', resize:'vertical' }} />
        </div>
        <Inp label="Internal Notes" value={form.notes} onChange={set('notes')} placeholder="Optional" />

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text)', fontSize:13, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'var(--accent)',
              color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Reject Modal
function RejectModal({ refund, onClose, onSave }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!reason.trim()) return toast.error('Rejection reason required')
    setSaving(true)
    try {
      await refundApi.reject(refund.id, reason.trim())
      toast.success('Refund rejected')
      onSave(); onClose()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, padding:24, width:'100%',
        maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ margin:'0 0 16px', fontSize:16, fontWeight:700 }}>Reject Refund</h3>
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>
          Bill #{refund.billNumber} — {fmt(refund.refundAmount)}
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>
            Rejection Reason <span style={{ color:'#ef4444' }}>*</span>
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="Why is this refund being rejected?"
            style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
              background:'var(--bg-page)', color:'var(--text)', fontSize:13, boxSizing:'border-box', resize:'vertical' }} />
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text)', fontSize:13, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#ef4444',
              color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {saving ? '…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Credit Note Validator
function CreditNoteValidator() {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [applyAmt, setApplyAmt] = useState('')
  const [applying, setApplying] = useState(false)

  async function validate() {
    if (!code.trim()) return toast.error('Enter credit note code')
    setLoading(true); setResult(null)
    try { setResult(await refundApi.validateCN(code.trim().toUpperCase())) }
    catch (e) { toast.error(e.message || 'Not found') }
    finally { setLoading(false) }
  }

  async function apply() {
    if (!applyAmt || Number(applyAmt) <= 0) return toast.error('Enter amount to apply')
    setApplying(true)
    try {
      const updated = await refundApi.applyCN(result.id, Number(applyAmt))
      setResult(updated); setApplyAmt('')
      toast.success(`₹${applyAmt} applied from credit note`)
    } catch (e) { toast.error(e.message) }
    finally { setApplying(false) }
  }

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:12, padding:20, marginBottom:24 }}>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Validate & Apply Credit Note</div>
      <div style={{ display:'flex', gap:8 }}>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="CN-5-0001"
          onKeyDown={e => e.key === 'Enter' && validate()}
          style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
            background:'var(--bg-page)', color:'var(--text)', fontSize:13, fontFamily:'monospace', letterSpacing:1 }} />
        <button onClick={validate} disabled={loading}
          style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'var(--accent)',
            color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          {loading ? '…' : 'Check'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop:14, padding:'14px 16px', borderRadius:10,
          background: result.isActive && !result.isExpired ? '#10b98111' : '#ef444411',
          border: `1px solid ${result.isActive && !result.isExpired ? '#10b98133' : '#ef444433'}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div>
              <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, letterSpacing:1 }}>{result.code}</span>
              {result.customerName && <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:10 }}>{result.customerName}</span>}
            </div>
            <Badge text={result.isExpired ? 'EXPIRED' : result.isActive ? 'ACTIVE' : 'USED'}
              color={result.isExpired ? '#f59e0b' : result.isActive ? '#10b981' : '#6b7280'} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div><div style={{ fontSize:10, color:'var(--text-muted)' }}>TOTAL</div><div style={{ fontWeight:700 }}>{fmt(result.totalAmount)}</div></div>
            <div><div style={{ fontSize:10, color:'var(--text-muted)' }}>USED</div><div style={{ fontWeight:700, color:'#ef4444' }}>{fmt(result.usedAmount)}</div></div>
            <div><div style={{ fontSize:10, color:'var(--text-muted)' }}>REMAINING</div><div style={{ fontWeight:800, color:'#10b981', fontSize:15 }}>{fmt(result.remainingAmount)}</div></div>
          </div>
          {result.expiryDate && (
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>
              Expires: {fmtDate(result.expiryDate)}
            </div>
          )}
          {result.isActive && !result.isExpired && result.remainingAmount > 0 && (
            <div style={{ display:'flex', gap:8 }}>
              <input type="number" value={applyAmt} onChange={e => setApplyAmt(e.target.value)}
                placeholder={`Max ${fmt(result.remainingAmount)}`} min="0.01" step="0.01"
                style={{ flex:1, padding:'7px 10px', borderRadius:7, border:'1px solid var(--border)',
                  background:'var(--bg-page)', color:'var(--text)', fontSize:13 }} />
              <button onClick={apply} disabled={applying}
                style={{ padding:'7px 16px', borderRadius:7, border:'none', background:'#10b981',
                  color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                {applying ? '…' : 'Apply'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Refunds Tab
function RefundsTab() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [approving, setApproving] = useState(null)

  const load = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const params = `page=${p}&size=20${statusFilter ? `&status=${statusFilter}` : ''}`
      const data = await refundApi.getAll(params)
      setRows(data.content || []); setTotalPages(data.totalPages || 1); setPage(p)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { load(0) }, [load])

  async function handleApprove(r) {
    setApproving(r.id)
    try {
      await refundApi.approve(r.id)
      toast.success('Refund approved' + (r.refundType === 'CREDIT_NOTE' ? ' — Credit note created' : ''))
      load(page)
    } catch (e) { toast.error(e.message) }
    finally { setApproving(null) }
  }

  return (
    <>
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'flex-end', flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3, fontWeight:500 }}>Status</div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border)',
              background:'var(--bg-page)', color:'var(--text)', fontSize:13 }}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'var(--accent)',
            color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', alignSelf:'flex-end' }}>
          + New Refund
        </button>
      </div>

      <div style={{ background:'var(--bg-card)', borderRadius:12, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={6} cols={6} /> : rows.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>↩️</div>
            <div style={{ fontWeight:600 }}>No refunds found</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Bill','Customer','Amount','Type','Reason','Status','Created',''].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11,
                    color:'var(--text-muted)', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom:'1px solid var(--border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600 }}>
                    #{r.billNumber || r.billId}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12 }}>
                    <div>{r.customerName || '—'}</div>
                    {r.customerPhone && <div style={{ color:'var(--text-muted)', fontSize:11 }}>{r.customerPhone}</div>}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:'#ef4444' }}>
                    {fmt(r.refundAmount)}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <Badge text={r.refundType === 'CREDIT_NOTE' ? 'Credit Note' : r.refundType}
                      color={TYPE_COLOR[r.refundType]} />
                    {r.creditNoteCode && (
                      <div style={{ fontSize:10, color:'#8b5cf6', marginTop:3, fontFamily:'monospace' }}>
                        {r.creditNoteCode}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)',
                    maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {r.reason}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <Badge text={r.status} color={STATUS_COLOR[r.status]} />
                    {r.status === 'REJECTED' && r.rejectionReason && (
                      <div style={{ fontSize:10, color:'#ef4444', marginTop:3 }}>{r.rejectionReason}</div>
                    )}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                    {fmtDt(r.createdAt)}
                  </td>
                  <td style={{ padding:'11px 14px', whiteSpace:'nowrap' }}>
                    {r.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleApprove(r)} disabled={approving === r.id}
                          style={{ background:'#10b98122', border:'1px solid #10b98155', borderRadius:6,
                            padding:'4px 10px', fontSize:11, cursor:'pointer', color:'#10b981', marginRight:6 }}>
                          {approving === r.id ? '…' : 'Approve'}
                        </button>
                        <button onClick={() => setRejectTarget(r)}
                          style={{ background:'#ef444422', border:'1px solid #ef444455', borderRadius:6,
                            padding:'4px 10px', fontSize:11, cursor:'pointer', color:'#ef4444' }}>
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
          <button onClick={() => load(page - 1)} disabled={page === 0}
            style={{ padding:'6px 14px', borderRadius:7, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text)', fontSize:12, cursor:'pointer',
              opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
          <button onClick={() => load(page + 1)} disabled={page >= totalPages - 1}
            style={{ padding:'6px 14px', borderRadius:7, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text)', fontSize:12, cursor:'pointer',
              opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next →</button>
        </div>
      )}

      {showCreate && <CreateRefundModal onClose={() => setShowCreate(false)} onSave={() => load(0)} />}
      {rejectTarget && <RejectModal refund={rejectTarget} onClose={() => setRejectTarget(null)} onSave={() => load(page)} />}
    </>
  )
}

// Credit Notes Tab
function CreditNotesTab() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const data = await refundApi.getCreditNotes(`page=${p}`)
      setRows(data.content || []); setTotalPages(data.totalPages || 1); setPage(p)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(0) }, [load])

  return (
    <>
      <CreditNoteValidator />
      <div style={{ background:'var(--bg-card)', borderRadius:12, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={5} cols={6} /> : rows.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🎫</div>
            <div style={{ fontWeight:600 }}>No credit notes yet</div>
            <div style={{ fontSize:13, marginTop:4 }}>Approve refunds with Credit Note type to generate them</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Code','Customer','Total','Used','Remaining','Expiry','Status'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11,
                    color:'var(--text-muted)', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom:'1px solid var(--border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  opacity: r.isActive && !r.isExpired ? 1 : 0.5 }}>
                  <td style={{ padding:'11px 14px', fontFamily:'monospace', fontWeight:700, fontSize:13, letterSpacing:0.5 }}>
                    {r.code}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12 }}>
                    <div>{r.customerName || '—'}</div>
                    {r.customerPhone && <div style={{ color:'var(--text-muted)', fontSize:11 }}>{r.customerPhone}</div>}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:13 }}>{fmt(r.totalAmount)}</td>
                  <td style={{ padding:'11px 14px', fontSize:13, color:'#ef4444' }}>{fmt(r.usedAmount)}</td>
                  <td style={{ padding:'11px 14px', fontSize:14, fontWeight:800, color:'#10b981' }}>
                    {fmt(r.remainingAmount)}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)' }}>
                    {r.expiryDate ? fmtDate(r.expiryDate) : '—'}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <Badge
                      text={r.isExpired ? 'Expired' : r.isActive ? 'Active' : 'Used'}
                      color={r.isExpired ? '#f59e0b' : r.isActive ? '#10b981' : '#6b7280'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
          <button onClick={() => load(page - 1)} disabled={page === 0}
            style={{ padding:'6px 14px', borderRadius:7, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text)', fontSize:12, cursor:'pointer',
              opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
          <button onClick={() => load(page + 1)} disabled={page >= totalPages - 1}
            style={{ padding:'6px 14px', borderRadius:7, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text)', fontSize:12, cursor:'pointer',
              opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
    </>
  )
}

export default function Refunds() {
  const [tab, setTab] = useState('refunds')

  const tabStyle = active => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
  })

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>Refunds & Credit Notes</h2>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
            Manage customer refunds and credit note balances
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg-card)',
        padding:4, borderRadius:10, width:'fit-content' }}>
        <button style={tabStyle(tab === 'refunds')} onClick={() => setTab('refunds')}>↩️ Refunds</button>
        <button style={tabStyle(tab === 'credit-notes')} onClick={() => setTab('credit-notes')}>🎫 Credit Notes</button>
      </div>

      {tab === 'refunds' ? <RefundsTab /> : <CreditNotesTab />}
    </div>
  )
}
