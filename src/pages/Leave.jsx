// src/pages/Leave.jsx
import { useState, useEffect, useCallback } from 'react'
import { leaveApi, staffApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

// ── Constants ────────────────────────────────────────────────────
const LEAVE_TYPES = ['SICK', 'CASUAL', 'EMERGENCY', 'UNPAID']
const LEAVE_TYPE_COLOR = {
  SICK:      { bg: '#ef444420', color: '#ef4444' },
  CASUAL:    { bg: '#3b82f620', color: '#3b82f6' },
  EMERGENCY: { bg: '#f59e0b20', color: '#f59e0b' },
  UNPAID:    { bg: '#88888820', color: '#888888' },
}
const STATUS_COLOR = {
  PENDING:   { bg: '#f59e0b20', color: '#f59e0b' },
  APPROVED:  { bg: '#10b98120', color: '#10b981' },
  REJECTED:  { bg: '#ef444420', color: '#ef4444' },
  CANCELLED: { bg: '#88888820', color: '#888888' },
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// ── Helpers ──────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function calcDays(start, end) {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 0
  return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── Small badge components ────────────────────────────────────────
function TypeBadge({ type }) {
  const c = LEAVE_TYPE_COLOR[type] || { bg: '#88888820', color: '#888' }
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
      background: c.bg, color: c.color, whiteSpace: 'nowrap',
    }}>{type}</span>
  )
}

function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || { bg: '#88888820', color: '#888' }
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
      background: c.bg, color: c.color, whiteSpace: 'nowrap',
    }}>{status}</span>
  )
}

// ── Modal backdrop wrapper ────────────────────────────────────────
function Modal({ onClose, children, maxWidth = 460 }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, padding: 24,
        width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)',
      }}>×</button>
    </div>
  )
}

// ── Form helpers ──────────────────────────────────────────────────
function FInput({ label, value, onChange, type = 'text', placeholder = '', required = false, hint = '' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
        }}
      />
      {hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

function FSelect({ label, value, onChange, options, labels = {}, placeholder = '' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>{label}</label>
      <select
        value={value ?? ''} onChange={onChange}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13,
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{labels[o] || o}</option>)}
      </select>
    </div>
  )
}

// ── Apply Leave Modal ────────────────────────────────────────────
function ApplyLeaveModal({ rid, staff, policy, onClose, onDone, toast }) {
  const [form, setForm] = useState({
    staffId: '', leaveType: 'CASUAL', startDate: '', endDate: '', reason: '',
  })
  const [saving, setSaving] = useState(false)

  const totalDays = calcDays(form.startDate, form.endDate)

  const upd = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const quota = policy
    ? { SICK: policy.sickLeaveQuota, CASUAL: policy.casualLeaveQuota, EMERGENCY: policy.emergencyLeaveQuota }
    : {}
  const showQuotaWarning =
    form.leaveType !== 'UNPAID' && quota[form.leaveType] && totalDays > quota[form.leaveType]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.staffId) { toast.error('Staff select karo'); return }
    if (!form.startDate || !form.endDate) { toast.error('Dates required hain'); return }
    if (totalDays < 1) { toast.error('End date start date se pehle nahi ho sakta'); return }
    if (!form.reason.trim()) { toast.error('Reason required hai'); return }
    setSaving(true)
    try {
      await leaveApi.applyLeave({
        restaurantId: rid,
        staffId: Number(form.staffId),
        type: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      })
      toast.success('Leave request submitted!')
      onDone()
    } catch (err) {
      toast.error(err.message || 'Failed to apply leave')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={500}>
      <ModalHeader title="📅 Apply Leave" onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <FSelect
          label="Staff Member" value={form.staffId} onChange={upd('staffId')}
          options={staff.map(s => s.id)} labels={Object.fromEntries(staff.map(s => [s.id, s.name]))}
          placeholder="— Select Staff —"
        />
        <FSelect
          label="Leave Type" value={form.leaveType} onChange={upd('leaveType')}
          options={LEAVE_TYPES}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <FInput label="Start Date" value={form.startDate} onChange={upd('startDate')} type="date" required />
          <FInput label="End Date" value={form.endDate} onChange={upd('endDate')} type="date" required />
        </div>

        {totalDays > 0 && (
          <div style={{
            marginBottom: 12, padding: '8px 12px', borderRadius: 7,
            background: 'var(--bg-page)', border: '1px solid var(--border)', fontSize: 12,
          }}>
            Total Days: <strong style={{ color: 'var(--accent)' }}>{totalDays} day{totalDays > 1 ? 's' : ''}</strong>
          </div>
        )}

        {showQuotaWarning && (
          <div style={{
            marginBottom: 12, padding: '8px 12px', borderRadius: 7,
            background: '#f59e0b15', border: '1px solid #f59e0b40', fontSize: 12, color: '#f59e0b',
          }}>
            ⚠️ Warning: {form.leaveType} quota is {quota[form.leaveType]} days/month — this request is for {totalDays} days.
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
            Reason <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            value={form.reason} onChange={upd('reason')} placeholder="Leave ka reason..."
            rows={3}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
          }}>Cancel</button>
          <button type="submit" disabled={saving} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
            background: saving ? 'var(--border)' : 'var(--accent)', color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}>{saving ? 'Submitting…' : 'Apply Leave'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Approve/Reject Modal ─────────────────────────────────────────
function ActionModal({ action, request, onClose, onDone, toast }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [conflictWarning, setConflictWarning] = useState(null)

  const isApprove = action === 'approve'
  const title = isApprove ? '✓ Approve Leave' : '✗ Reject Leave'
  const btnColor = isApprove ? '#10b981' : '#ef4444'

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = isApprove
        ? await leaveApi.approve(request.id, notes)
        : await leaveApi.reject(request.id, notes)
      if (isApprove && res?.conflictWarning) {
        setConflictWarning(res)
      } else {
        toast.success(isApprove ? 'Leave approved!' : 'Leave rejected!')
        onDone()
      }
    } catch (err) {
      toast.error(err.message || 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  if (conflictWarning) {
    return (
      <Modal onClose={onClose}>
        <ModalHeader title="Leave Approved" onClose={onClose} />
        <div style={{
          padding: '12px 14px', borderRadius: 8, background: '#f59e0b15',
          border: '1px solid #f59e0b50', marginBottom: 16,
        }}>
          <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>
            ⚠️ Conflict Warning
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>
            {conflictWarning.conflictCount || 'Some'} staff already on leave on those dates. Leave approved anyway.
          </div>
          {conflictWarning.conflictDates && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Conflict dates: {conflictWarning.conflictDates}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => { toast.success('Leave approved!'); onDone() }} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
            background: '#10b981', color: '#fff', cursor: 'pointer',
          }}>OK</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={title} onClose={onClose} />
      <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-page)', border: '1px solid var(--border)', fontSize: 13 }}>
        <strong>{request.staffName}</strong> — <TypeBadge type={request.type} /> {' '}
        {fmtDate(request.startDate)} → {fmtDate(request.endDate)}
        {' '}({calcDays(request.startDate, request.endDate)} days)
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
            Notes (optional)
          </label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={isApprove ? 'Approval notes...' : 'Rejection reason...'}
            rows={3}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
          }}>Cancel</button>
          <button type="submit" disabled={saving} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
            background: saving ? 'var(--border)' : btnColor, color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}>{saving ? '…' : (isApprove ? 'Approve' : 'Reject')}</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Tab: Requests ────────────────────────────────────────────────
function RequestsTab({ rid, user, policy, toast, pendingCount, setPendingCount }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [search, setSearch] = useState('')
  const [actionModal, setActionModal] = useState(null) // { action, request }
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [staff, setStaff] = useState([])

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = `&month=${month}${statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''}`
      const res = await leaveApi.getRequests(rid, params)
      const list = Array.isArray(res) ? res : (res?.content || res?.requests || [])
      setRequests(list)
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [rid, month, statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!staff.length) {
      staffApi.getAll(rid, 'size=100').then(res => {
        setStaff(Array.isArray(res) ? res : (res?.content || []))
      }).catch(() => {})
    }
  }, [rid])

  async function handleCancel(req) {
    if (!window.confirm('Cancel this leave request?')) return
    try {
      await leaveApi.cancel(req.id)
      toast.success('Leave cancelled!')
      load()
      leaveApi.getPendingCount(rid).then(r => setPendingCount(r?.count || r || 0)).catch(() => {})
    } catch (err) {
      toast.error(err.message || 'Cancel failed')
    }
  }

  function afterAction() {
    setActionModal(null)
    load()
    leaveApi.getPendingCount(rid).then(r => setPendingCount(r?.count || r || 0)).catch(() => {})
  }

  const filtered = requests.filter(r => {
    if (!search) return true
    return (r.staffName || '').toLowerCase().includes(search.toLowerCase())
  })

  const pending = requests.filter(r => r.status === 'PENDING').length
  const approvedThisMonth = requests.filter(r => r.status === 'APPROVED').length
  const rejectedThisMonth = requests.filter(r => r.status === 'REJECTED').length

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Pending', value: pending, color: '#f59e0b', bg: '#f59e0b15' },
          { label: 'Approved this month', value: approvedThisMonth, color: '#10b981', bg: '#10b98115' },
          { label: 'Rejected this month', value: rejectedThisMonth, color: '#ef4444', bg: '#ef444415' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{
            background: bg, border: `1px solid ${color}40`, borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(s => {
            const c = STATUS_COLOR[s] || {}
            const isActive = statusFilter === s
            return (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', border: '1px solid var(--border)',
                background: isActive ? (c.color || 'var(--accent)') : 'transparent',
                color: isActive ? '#fff' : 'var(--text-muted)',
                transition: '.15s',
              }}>{s}</button>
            )
          })}
        </div>
        <input
          type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'var(--bg-page)', color: 'var(--text)', fontSize: 12,
          }}
        />
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search staff..."
          style={{
            flex: 1, minWidth: 160, padding: '6px 12px', borderRadius: 7,
            border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13,
          }}
        />
        {canManage && (
          <button onClick={() => setShowApplyModal(true)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>+ Apply Leave</button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏖️</div>
            <div>Koi leave request nahi mili</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try changing filters</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Staff', 'Leave Type', 'Dates', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: 11,
                    color: 'var(--text-muted)', fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => {
                const days = calcDays(req.startDate, req.endDate)
                const canCancel = (req.status === 'PENDING' || req.status === 'APPROVED') && canManage
                return (
                  <tr
                    key={req.id || i}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{req.staffName || '—'}</div>
                      {req.staffRole && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{req.staffRole}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <TypeBadge type={req.type} />
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12 }}>
                      <div>{fmtDate(req.startDate)}</div>
                      {req.startDate !== req.endDate && (
                        <div style={{ color: 'var(--text-muted)' }}>→ {fmtDate(req.endDate)}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{days}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                        {req.reason || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={req.status} />
                      {req.notes && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {req.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {req.status === 'PENDING' && canManage && (
                          <>
                            <button
                              onClick={() => setActionModal({ action: 'approve', request: req })}
                              style={{
                                fontSize: 11, padding: '4px 9px', borderRadius: 6,
                                border: '1px solid #10b98150', background: '#10b98115',
                                color: '#10b981', cursor: 'pointer', fontWeight: 600,
                              }}
                            >✓ Approve</button>
                            <button
                              onClick={() => setActionModal({ action: 'reject', request: req })}
                              style={{
                                fontSize: 11, padding: '4px 9px', borderRadius: 6,
                                border: '1px solid #ef444450', background: '#ef444415',
                                color: '#ef4444', cursor: 'pointer', fontWeight: 600,
                              }}
                            >✗ Reject</button>
                          </>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => handleCancel(req)}
                            style={{
                              fontSize: 11, padding: '4px 9px', borderRadius: 6,
                              border: '1px solid var(--border)', background: 'transparent',
                              color: 'var(--text-muted)', cursor: 'pointer',
                            }}
                          >✕ Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
            Showing {filtered.length} request{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {actionModal && (
        <ActionModal
          action={actionModal.action}
          request={actionModal.request}
          onClose={() => setActionModal(null)}
          onDone={afterAction}
          toast={toast}
        />
      )}

      {showApplyModal && (
        <ApplyLeaveModal
          rid={rid}
          staff={staff}
          policy={policy}
          onClose={() => setShowApplyModal(false)}
          onDone={() => { setShowApplyModal(false); load() }}
          toast={toast}
        />
      )}
    </div>
  )
}

// ── Tab: Calendar ────────────────────────────────────────────────
function CalendarTab({ rid, toast }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12
  const [calMap, setCalMap] = useState({})      // { "2026-05-01": [{staffId,staffName,type,leaveId},...] }
  const [maxDaily, setMaxDaily] = useState(2)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cal = await leaveApi.getCalendar(rid, year, month)
      setCalMap(cal?.calendar || {})
      setMaxDaily(cal?.maxDailyLeaves ?? 2)
    } catch {
      setCalMap({})
    } finally {
      setLoading(false)
    }
  }, [rid, year, month])

  useEffect(() => { load() }, [load])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()

  function padDate(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  // Build grid cells — calMap keys are "YYYY-MM-DD", values are [{staffId,staffName,type,leaveId}]
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = padDate(year, month, d)
    cells.push({ day: d, key, staffOnLeave: calMap[key] || [] })
  }
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={prevMonth} style={{
          padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
        }}>← Prev</button>
        <span style={{ fontSize: 16, fontWeight: 700, minWidth: 160, textAlign: 'center' }}>
          {MONTHS[month - 1]} {year}
        </span>
        <button onClick={nextMonth} style={{
          padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
        }}>Next →</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading calendar…</div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{
                padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700,
                color: 'var(--text-muted)',
              }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', minHeight: 80, background: 'var(--bg-page)' }} />
              }
              const staffOnLeave = cell.staffOnLeave
              const count = staffOnLeave.length
              const isAtLimit = count >= maxDaily
              const isNearLimit = count === maxDaily - 1
              let borderColor = 'var(--border)'
              if (isAtLimit && count > 0) borderColor = '#ef4444'
              else if (isNearLimit && count > 0) borderColor = '#f59e0b'

              return (
                <div
                  key={cell.key}
                  style={{
                    minHeight: 80, padding: '6px', border: `1px solid ${borderColor}`,
                    position: 'relative', cursor: count > 0 ? 'pointer' : 'default',
                    background: isAtLimit && count > 0 ? '#ef444408' : 'transparent',
                  }}
                  onClick={() => count > 0 && setTooltip(t => t?.key === cell.key ? null : { key: cell.key, cell })}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{cell.day}</span>
                    {isAtLimit && count > 0 && <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>⚠️ Full</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {staffOnLeave.slice(0, 3).map((s, si) => {
                      const tc = LEAVE_TYPE_COLOR[s.type] || { bg: '#88888820', color: '#888' }
                      return (
                        <span key={si} style={{
                          fontSize: 9, padding: '1px 5px', borderRadius: 10, fontWeight: 700,
                          background: tc.bg, color: tc.color, whiteSpace: 'nowrap',
                        }}>
                          {getInitials(s.staffName)}
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: tc.color, display: 'inline-block', marginLeft: 2, verticalAlign: 'middle' }} />
                        </span>
                      )
                    })}
                    {staffOnLeave.length > 3 && (
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{staffOnLeave.length - 3}</span>
                    )}
                  </div>

                  {/* Tooltip */}
                  {tooltip?.key === cell.key && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, zIndex: 50,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '10px 12px', minWidth: 200,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)', fontSize: 12,
                    }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{fmtDate(cell.key)}</div>
                      {staffOnLeave.map((s, si) => {
                        const tc = LEAVE_TYPE_COLOR[s.type] || { color: '#888' }
                        return (
                          <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: tc.color, flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{s.staffName}</span>
                            <TypeBadge type={s.type} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', fontSize: 12 }}>
        {LEAVE_TYPES.map(t => {
          const c = LEAVE_TYPE_COLOR[t]
          return (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.bg, border: `1px solid ${c.color}` }} />
              <span style={{ color: 'var(--text-muted)' }}>{t}</span>
            </div>
          )
        })}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, border: '2px solid #ef4444' }} />
          <span style={{ color: 'var(--text-muted)' }}>At daily limit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, border: '2px solid #f59e0b' }} />
          <span style={{ color: 'var(--text-muted)' }}>Near limit</span>
        </div>
      </div>

      {/* Close tooltip on outside click */}
      {tooltip && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setTooltip(null)} />
      )}
    </div>
  )
}

// ── Tab: Balance ─────────────────────────────────────────────────
function BalanceTab({ rid, toast }) {
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await leaveApi.getBalance(rid, year)
      setBalances(Array.isArray(res) ? res : (res?.balances || []))
    } catch {
      setBalances([])
    } finally {
      setLoading(false)
    }
  }, [rid, year])

  useEffect(() => { load() }, [load])

  function ProgressCell({ used, quota }) {
    if (quota == null || quota === 0) {
      return (
        <div style={{ fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>{used} days</span>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>No quota</div>
        </div>
      )
    }
    const pct = Math.min(100, Math.round((used / quota) * 100))
    const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981'
    return (
      <div>
        <div style={{ fontSize: 12, marginBottom: 3, color }}>
          {used}/{quota} days ({pct}%)
        </div>
        <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', width: 100 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: '.3s' }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Year:</span>
        <select
          value={year} onChange={e => setYear(Number(e.target.value))}
          style={{
            padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13,
          }}
        >
          {[now - 1, now, now + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading balance…</div>
        ) : balances.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div>Koi balance data nahi mila for {year}</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Staff', 'Sick', 'Casual', 'Emergency', 'Unpaid'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balances.map((b, i) => (
                <tr key={b.staffId || i} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{b.staffName}</div>
                    {b.staffRole && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{b.staffRole}</div>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <ProgressCell used={b.sick?.used || 0} quota={b.sick?.quota} />
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <ProgressCell used={b.casual?.used || 0} quota={b.casual?.quota} />
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <ProgressCell used={b.emergency?.used || 0} quota={b.emergency?.quota} />
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {b.unpaid?.used || 0} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Tab: Policy ──────────────────────────────────────────────────
function PolicyTab({ rid, policy, setPolicy, user, toast }) {
  const [form, setForm] = useState({
    maxDailyLeaves: 2,
    sickLeaveQuota: 2,
    casualLeaveQuota: 2,
    emergencyLeaveQuota: 1,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (policy) {
      setForm({
        maxDailyLeaves:      policy.maxDailyLeaves      ?? 2,
        sickLeaveQuota:      policy.sickLeaveQuota      ?? 2,
        casualLeaveQuota:    policy.casualLeaveQuota    ?? 2,
        emergencyLeaveQuota: policy.emergencyLeaveQuota ?? 1,
      })
    }
  }, [policy])

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN'
  const upd = k => e => setForm(p => ({ ...p, [k]: Number(e.target.value) }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await leaveApi.updatePolicy(rid, form)
      setPolicy(res || form)
      toast.success('Leave policy saved!')
    } catch (err) {
      toast.error(err.message || 'Failed to save policy')
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-page)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Leave Policy</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Set monthly leave quotas per type and max staff on leave per day.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' }}>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
              Max Staff on Leave per Day
            </label>
            <input
              type="number" min={1} max={50} value={form.maxDailyLeaves}
              onChange={upd('maxDailyLeaves')} disabled={!canManage}
              style={fieldStyle}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Calendar cells will show warning when this limit is reached or near
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
            Monthly Quotas per Staff
          </div>

          {[
            { key: 'sickLeaveQuota', label: 'Sick Leave', color: '#ef4444' },
            { key: 'casualLeaveQuota', label: 'Casual Leave', color: '#3b82f6' },
            { key: 'emergencyLeaveQuota', label: 'Emergency Leave', color: '#f59e0b' },
          ].map(({ key, label, color }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 6, fontWeight: 600, color }}>
                {label} Quota (days/month)
              </label>
              <input
                type="number" min={0} max={30} value={form[key]}
                onChange={upd(key)} disabled={!canManage}
                style={{ ...fieldStyle, borderColor: color + '60' }}
              />
            </div>
          ))}

          <div style={{
            padding: '10px 14px', borderRadius: 8, background: '#88888815',
            border: '1px solid #88888830', fontSize: 12, color: 'var(--text-muted)',
          }}>
            <strong>Note:</strong> UNPAID leave has no quota limit — staff can apply for any number of unpaid days.
          </div>
        </div>

        {canManage && (
          <button type="submit" disabled={saving} style={{
            marginTop: 16, padding: '10px 24px', borderRadius: 8, border: 'none',
            fontSize: 13, fontWeight: 600,
            background: saving ? 'var(--border)' : '#10b981', color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving…' : '💾 Save Policy'}
          </button>
        )}
      </form>
    </div>
  )
}

// Year reference for balance year selector
const now = new Date().getFullYear()

// ═══════════════════════════════════════════════════════════════
export default function Leave() {
  const { restaurantId: rid, user } = useAuthStore()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('requests')
  const [policy, setPolicy] = useState(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!rid) return
    leaveApi.getPolicy(rid).then(setPolicy).catch(() => {})
    leaveApi.getPendingCount(rid).then(r => setPendingCount(r?.count || r || 0)).catch(() => {})
  }, [rid])

  const tabs = [
    { key: 'requests', label: '📋 Requests' },
    { key: 'calendar', label: '📅 Calendar' },
    { key: 'balance',  label: '📊 Balance'  },
    { key: 'policy',   label: '⚙️ Policy'   },
  ]

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>🏖️ Leave Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Staff leave requests, approvals, calendar and balance tracking
          </p>
        </div>
        {pendingCount > 0 && (
          <div style={{
            padding: '6px 14px', borderRadius: 20, background: '#f59e0b20',
            border: '1px solid #f59e0b50', fontSize: 12, fontWeight: 700, color: '#f59e0b',
          }}>
            ⏳ {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: '9px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: 'transparent',
            color: activeTab === key ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
            transition: '.15s',
          }}>
            {label}
            {key === 'requests' && pendingCount > 0 && (
              <span style={{
                marginLeft: 6, background: '#f59e0b', color: '#fff', borderRadius: '50%',
                width: 16, height: 16, fontSize: 9, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{pendingCount > 9 ? '9+' : pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'requests' && (
        <RequestsTab
          rid={rid}
          user={user}
          policy={policy}
          toast={toast}
          pendingCount={pendingCount}
          setPendingCount={setPendingCount}
        />
      )}
      {activeTab === 'calendar' && (
        <CalendarTab rid={rid} toast={toast} />
      )}
      {activeTab === 'balance' && (
        <BalanceTab rid={rid} toast={toast} />
      )}
      {activeTab === 'policy' && (
        <PolicyTab rid={rid} policy={policy} setPolicy={setPolicy} user={user} toast={toast} />
      )}
    </div>
  )
}
