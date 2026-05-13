import { useState, useEffect, useCallback } from 'react'
import { api, staffApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }
function curMonth() { return new Date().toISOString().slice(0, 7) }

const TYPE_STYLE = {
  ADVANCE: { color: '#f59e0b', bg: '#f59e0b22', label: 'Advance' },
  LOAN:    { color: '#6366f1', bg: '#6366f122', label: 'Loan'    },
  SALARY:  { color: '#10b981', bg: '#10b98122', label: 'Salary'  },
  BONUS:   { color: '#ec4899', bg: '#ec489922', label: 'Bonus'   },
}
const STATUS_STYLE = {
  PENDING: { color: '#ef4444', label: 'Pending' },
  PAID:    { color: '#10b981', label: 'Paid'    },
  PARTIAL: { color: '#f59e0b', label: 'Partial' },
}

// ── Shared UI ─────────────────────────────────────────────────────────────
function Inp({ label, value, onChange, type = 'text', placeholder = '', required = false }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  )
}

function Modal({ title, onClose, onSubmit, saving, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          {children}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
                background: saving ? '#ccc' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Badge({ text, color, bg }) {
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
      background: bg || color + '22', color }}>
      {text}
    </span>
  )
}

// ── Advance Tab ───────────────────────────────────────────────────────────
function AdvanceTab({ staffId, rid, toast, onRefreshSummary }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState({ amount: '', reason: '', paymentDate: new Date().toISOString().slice(0,10) })
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/staff-payments/staff/${staffId}/type?type=ADVANCE`)
      setItems(Array.isArray(data) ? data : [])
    } catch { setItems([]) } finally { setLoading(false) }
  }, [staffId])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Valid amount enter karo')
    setSaving(true)
    try {
      await api.post('/staff-payments/advance', { staffId, amount: Number(form.amount), reason: form.reason, paymentDate: form.paymentDate })
      toast.success('Advance added')
      setModal(false)
      setForm({ amount: '', reason: '', paymentDate: new Date().toISOString().slice(0,10) })
      load(); onRefreshSummary()
    } catch (err) { toast.error(err.message || 'Failed') } finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => setModal(true)}
          style={{ padding: '7px 16px', borderRadius: 8, border: 'none',
            background: '#f59e0b', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Add Advance
        </button>
      </div>
      {loading ? <SkeletonTable rows={3} /> : items.length === 0 ? (
        <Empty text="Koi advance record nahi" />
      ) : (
        <PaymentTable items={items} />
      )}
      {modal && (
        <Modal title="Add Advance" onClose={() => setModal(false)} onSubmit={handleSubmit} saving={saving}>
          <Inp label="Amount (₹)" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} type="number" required placeholder="e.g. 2000" />
          <Inp label="Reason" value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} placeholder="e.g. Medical emergency" />
          <Inp label="Date" value={form.paymentDate} onChange={e => setForm(f => ({...f, paymentDate: e.target.value}))} type="date" />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
            💡 Ye advance agle salary generation mein automatically deduct hoga.
          </p>
        </Modal>
      )}
    </div>
  )
}

// ── Loan Tab ──────────────────────────────────────────────────────────────
function LoanTab({ staffId, rid, toast, onRefreshSummary }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null) // null | 'add' | { repay, item }
  const [form,    setForm]    = useState({ amount: '', reason: '', paymentDate: new Date().toISOString().slice(0,10) })
  const [repayAmt, setRepayAmt] = useState('')
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/staff-payments/staff/${staffId}/type?type=LOAN`)
      setItems(Array.isArray(data) ? data : [])
    } catch { setItems([]) } finally { setLoading(false) }
  }, [staffId])

  useEffect(() => { load() }, [load])

  async function handleAddLoan(e) {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Valid amount enter karo')
    setSaving(true)
    try {
      await api.post('/staff-payments/loan', { staffId, amount: Number(form.amount), reason: form.reason, paymentDate: form.paymentDate })
      toast.success('Loan added')
      setModal(null)
      setForm({ amount: '', reason: '', paymentDate: new Date().toISOString().slice(0,10) })
      load(); onRefreshSummary()
    } catch (err) { toast.error(err.message || 'Failed') } finally { setSaving(false) }
  }

  async function handleRepay(e) {
    e.preventDefault()
    if (!repayAmt || Number(repayAmt) <= 0) return toast.error('Valid amount enter karo')
    setSaving(true)
    try {
      await api.post('/staff-payments/loan/repay', { loanPaymentId: modal.item.id, repayAmount: Number(repayAmt) })
      toast.success('Repayment recorded')
      setModal(null); setRepayAmt('')
      load(); onRefreshSummary()
    } catch (err) { toast.error(err.message || 'Failed') } finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => setModal('add')}
          style={{ padding: '7px 16px', borderRadius: 8, border: 'none',
            background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Add Loan
        </button>
      </div>
      {loading ? <SkeletonTable rows={3} /> : items.length === 0 ? (
        <Empty text="Koi loan record nahi" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                {['Loan Amount', 'Remaining', 'Reason', 'Date', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const ss = STATUS_STYLE[item.status] || STATUS_STYLE.PENDING
                const isPaid = item.status === 'PAID'
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', opacity: isPaid ? 0.6 : 1 }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fmt(item.amount)}</td>
                    <td style={{ padding: '10px 12px', color: isPaid ? 'var(--text-muted)' : '#ef4444', fontWeight: 700 }}>
                      {isPaid ? '—' : fmt(item.remainingAmount ?? item.amount)}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{item.reason || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12 }}>{fmtDate(item.paymentDate || item.createdAt)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge text={ss.label} color={ss.color} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {!isPaid && (
                        <button onClick={() => { setRepayAmt(''); setModal({ repay: true, item }) }}
                          style={{ padding: '4px 12px', borderRadius: 6, border: 'none',
                            background: '#10b98122', color: '#10b981', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Repay
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'add' && (
        <Modal title="Add Loan" onClose={() => setModal(null)} onSubmit={handleAddLoan} saving={saving}>
          <Inp label="Loan Amount (₹)" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} type="number" required placeholder="e.g. 10000" />
          <Inp label="Purpose" value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} placeholder="e.g. Home repair" />
          <Inp label="Date" value={form.paymentDate} onChange={e => setForm(f => ({...f, paymentDate: e.target.value}))} type="date" />
        </Modal>
      )}

      {modal?.repay && (
        <Modal title="Loan Repayment" onClose={() => setModal(null)} onSubmit={handleRepay} saving={saving}>
          <div style={{ background: 'var(--bg-page)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
            <div>Total Loan: <strong>{fmt(modal.item.amount)}</strong></div>
            <div>Remaining: <strong style={{ color: '#ef4444' }}>{fmt(modal.item.remainingAmount ?? modal.item.amount)}</strong></div>
          </div>
          <Inp label="Repay Amount (₹)" value={repayAmt} onChange={e => setRepayAmt(e.target.value)} type="number" required
            placeholder={`Max ${fmt(modal.item.remainingAmount ?? modal.item.amount)}`} />
        </Modal>
      )}
    </div>
  )
}

// ── Salary Tab ────────────────────────────────────────────────────────────
function SalaryTab({ staffId, rid, toast }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [month,   setMonth]   = useState(curMonth())
  const [generating, setGenerating] = useState(false)
  const [markingId,  setMarkingId]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get(`/staff-payments/staff/${staffId}/type?type=SALARY`)
      setItems(Array.isArray(data) ? data : [])
    } catch { setItems([]) } finally { setLoading(false) }
  }, [staffId])

  useEffect(() => { load() }, [load])

  async function handleGenerate() {
    if (!window.confirm(`${month} ke liye salary generate karna chahte ho?`)) return
    setGenerating(true)
    try {
      await api.post(`/staff-payments/salary/generate?staffId=${staffId}&month=${month}`)
      toast.success('Salary generated')
      load()
    } catch (err) { toast.error(err.message || 'Failed') } finally { setGenerating(false) }
  }

  async function handleMarkPaid(id) {
    setMarkingId(id)
    try {
      await api.patch(`/staff-payments/salary/${id}/paid`)
      toast.success('Salary marked as paid')
      load()
    } catch (err) { toast.error(err.message || 'Failed') } finally { setMarkingId(null) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Month:</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }} />
        </div>
        <button onClick={handleGenerate} disabled={generating}
          style={{ padding: '7px 16px', borderRadius: 8, border: 'none',
            background: generating ? '#ccc' : '#10b981', color: '#fff',
            cursor: generating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
          {generating ? 'Generating…' : '⚡ Generate Salary'}
        </button>
      </div>

      {loading ? <SkeletonTable rows={3} /> : items.length === 0 ? (
        <Empty text="Koi salary record nahi — Generate Salary karo" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                {['Month', 'Gross', 'Advance Cut', 'Loan Cut', 'Net Salary', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.sort((a, b) => (b.month || '').localeCompare(a.month || '')).map(item => {
                const ss = STATUS_STYLE[item.status] || STATUS_STYLE.PENDING
                const isPaid = item.status === 'PAID'
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.month || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{fmt(item.grossSalary ?? item.amount)}</td>
                    <td style={{ padding: '10px 12px', color: '#f59e0b' }}>{item.advanceDeducted ? fmt(item.advanceDeducted) : '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#6366f1' }}>{item.loanDeducted ? fmt(item.loanDeducted) : '—'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#10b981', fontSize: 14 }}>{fmt(item.amount)}</td>
                    <td style={{ padding: '10px 12px' }}><Badge text={ss.label} color={ss.color} /></td>
                    <td style={{ padding: '10px 12px' }}>
                      {!isPaid && (
                        <button onClick={() => handleMarkPaid(item.id)} disabled={markingId === item.id}
                          style={{ padding: '4px 12px', borderRadius: 6, border: 'none',
                            background: '#10b98122', color: '#10b981', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            opacity: markingId === item.id ? 0.6 : 1 }}>
                          {markingId === item.id ? '…' : 'Mark Paid'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────
function HistoryTab({ staffId }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/staff-payments/staff/${staffId}`)
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [staffId])

  if (loading) return <SkeletonTable rows={5} />
  if (!items.length) return <Empty text="Koi transaction history nahi" />
  return <PaymentTable items={items} showType />
}

// ── Reusable table ────────────────────────────────────────────────────────
function PaymentTable({ items, showType = false }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
            {[showType && 'Type', 'Amount', 'Reason', 'Date', 'Status'].filter(Boolean).map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const ts = TYPE_STYLE[item.paymentType] || TYPE_STYLE.ADVANCE
            const ss = STATUS_STYLE[item.status]    || STATUS_STYLE.PENDING
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                {showType && (
                  <td style={{ padding: '10px 12px' }}>
                    <Badge text={ts.label} color={ts.color} bg={ts.bg} />
                  </td>
                )}
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fmt(item.amount)}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{item.reason || item.notes || '—'}</td>
                <td style={{ padding: '10px 12px', fontSize: 12 }}>{fmtDate(item.paymentDate || item.createdAt)}</td>
                <td style={{ padding: '10px 12px' }}><Badge text={ss.label} color={ss.color} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
      {text}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
const TABS = [
  { key: 'advance', label: '💵 Advance' },
  { key: 'loan',    label: '🏦 Loan'    },
  { key: 'salary',  label: '💰 Salary'  },
  { key: 'history', label: '📜 History' },
]

export default function StaffPayments() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [staffList,    setStaffList]    = useState([])
  const [selectedId,   setSelectedId]   = useState('')
  const [summary,      setSummary]      = useState(null)
  const [tab,          setTab]          = useState('advance')
  const [loadingStaff, setLoadingStaff] = useState(true)

  // Load staff list
  useEffect(() => {
    staffApi.getAll(rid)
      .then(d => {
        const list = Array.isArray(d) ? d : (d?.content ?? [])
        const active = list.filter(s => s.isActive !== false)
        setStaffList(active)
        if (active.length) setSelectedId(String(active[0].id))
      })
      .catch(() => setStaffList([]))
      .finally(() => setLoadingStaff(false))
  }, [rid])

  const loadSummary = useCallback(async () => {
    if (!selectedId) return
    try {
      const s = await api.get(`/staff-payments/staff/${selectedId}/summary`)
      setSummary(s)
    } catch { setSummary(null) }
  }, [selectedId])

  useEffect(() => { loadSummary() }, [loadSummary])

  const selected = staffList.find(s => String(s.id) === selectedId)

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>💸 Staff Payments</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Advance, loan, aur salary manage karo
        </p>
      </div>

      {/* Staff selector */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Staff:</label>
          {loadingStaff ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</div>
          ) : (
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setTab('advance') }}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-page)', color: 'var(--text)', fontSize: 14, fontWeight: 600, minWidth: 200 }}>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.roles?.[0] || s.role || '—'}</option>
              ))}
            </select>
          )}
        </div>

        {/* Summary chips */}
        {summary && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ padding: '6px 14px', borderRadius: 20, background: '#f59e0b22',
              color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>
              Pending Advance: {fmt(summary.pendingAdvance)}
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 20, background: '#6366f122',
              color: '#6366f1', fontSize: 12, fontWeight: 600 }}>
              Loan Balance: {fmt(summary.loanBalance)}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      {selectedId && (
        <>
          <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
                  color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -2, transition: 'color .15s' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
            {tab === 'advance' && <AdvanceTab staffId={Number(selectedId)} rid={rid} toast={toast} onRefreshSummary={loadSummary} />}
            {tab === 'loan'    && <LoanTab    staffId={Number(selectedId)} rid={rid} toast={toast} onRefreshSummary={loadSummary} />}
            {tab === 'salary'  && <SalaryTab  staffId={Number(selectedId)} rid={rid} toast={toast} />}
            {tab === 'history' && <HistoryTab staffId={Number(selectedId)} />}
          </div>
        </>
      )}

      {!loadingStaff && staffList.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Koi active staff nahi mila. Pehle staff add karo.
        </div>
      )}
    </div>
  )
}
