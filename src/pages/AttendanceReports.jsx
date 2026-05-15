import { useState, useEffect, useCallback, useRef } from 'react'
import { api, staffApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtTime(dt) {
  if (!dt) return '—'
  const d = Array.isArray(dt)
    ? new Date(dt[0], dt[1] - 1, dt[2], dt[3] || 0, dt[4] || 0)
    : new Date(dt)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function fmtHours(h) {
  if (h == null || h === 0) return '—'
  const hrs  = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}h ${mins}m`
}
function todayStr() { return new Date().toISOString().slice(0, 10) }
function daysAgoStr(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10)
}
function startOfWeek() {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
  return d.toISOString().slice(0, 10)
}
function startOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function lastMonthRange() {
  const d = new Date()
  const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear()
  const m = d.getMonth() === 0 ? 12 : d.getMonth()
  const last = new Date(y, m, 0).getDate()
  const mm   = String(m).padStart(2, '0')
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${last}` }
}

// hh:mm string to total minutes
function timeToMins(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
// Spring Boot LocalDateTime comes as array [y,mo,d,h,min,s] or ISO string
function parseDt(dt) {
  if (!dt) return null
  if (Array.isArray(dt)) return new Date(dt[0], dt[1] - 1, dt[2], dt[3] || 0, dt[4] || 0, dt[5] || 0)
  return new Date(dt)
}
function inTimeRange(dt, fromTime, toTime) {
  if (!dt) return false
  if (!fromTime && !toTime) return true
  const d    = parseDt(dt)
  if (!d || isNaN(d)) return true
  const mins = d.getHours() * 60 + d.getMinutes()
  const from = fromTime ? timeToMins(fromTime) : 0
  const to   = toTime   ? timeToMins(toTime)   : 24 * 60
  return mins >= from && mins <= to
}

// ── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = [
  { key: 'today',      label: 'Today',       icon: '🟢' },
  { key: 'yesterday',  label: 'Yesterday',   icon: '📅' },
  { key: 'week',       label: 'This Week',   icon: '🗓️' },
  { key: 'month',      label: 'This Month',  icon: '📆' },
  { key: 'lastmonth',  label: 'Last Month',  icon: '📂' },
  { key: 'custom',     label: 'Custom',      icon: '✏️' },
]

const TIME_SHIFTS = [
  { label: 'Morning',   from: '06:00', to: '12:00' },
  { label: 'Afternoon', from: '12:00', to: '18:00' },
  { label: 'Evening',   from: '18:00', to: '23:59' },
]

function presetDates(key) {
  const t = todayStr()
  if (key === 'today')     return { from: t,              to: t             }
  if (key === 'yesterday') return { from: daysAgoStr(1),  to: daysAgoStr(1) }
  if (key === 'week')      return { from: startOfWeek(),  to: t             }
  if (key === 'month')     return { from: startOfMonth(), to: t             }
  if (key === 'lastmonth') return lastMonthRange()
  return null
}

// ── Shared UI ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'var(--accent)', sub }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '14px 18px', minWidth: 120 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Badge({ text, color }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
      background: color + '22', color }}>
      {text}
    </span>
  )
}

const METHOD_COLOR = {
  MANUAL:    '#6366f1',
  QR_CODE:   '#10b981',
  BIOMETRIC: '#f59e0b',
  AUTO:      '#888',
}
const STATUS_COLOR = {
  PRESENT:  '#10b981',
  ABSENT:   '#ef4444',
  HALF_DAY: '#f59e0b',
  LEAVE:    '#6366f1',
}

// ── Manual Check-in Modal ─────────────────────────────────────────────────────
function nowTime() {
  const n = new Date()
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`
}

function ManualModal({ rid, onClose, onDone, toast, restOpenTime, restCloseTime }) {
  const [staff,   setStaff]   = useState([])
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState('')
  const [action,  setAction]  = useState('CHECK_IN')
  const [date,    setDate]    = useState(todayStr())
  const [time,    setTime]    = useState(nowTime())
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    staffApi.getAll(rid).then(d => {
      const list = Array.isArray(d) ? d : (d?.content ?? [])
      setStaff(list.filter(s => s.isActive !== false))
    }).catch(() => setStaff([])).finally(() => setLoading(false))
  }, [rid])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!staffId) return toast.error('Staff select karo')
    setSaving(true)
    try {
      await api.post(
        `/attendance/manual?staffId=${staffId}&restaurantId=${rid}&action=${action}&date=${date}&time=${time}`,
        {}
      )
      toast.success(`${action === 'CHECK_IN' ? '🟢 Check-in' : '🔴 Check-out'} recorded — ${date} ${time}`)
      onDone()
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally { setSaving(false) }
  }

  const inpStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>✋ Manual Attendance</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Action toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { key: 'CHECK_IN',  label: '🟢 Check In',  color: '#10b981' },
              { key: 'CHECK_OUT', label: '🔴 Check Out', color: '#ef4444' },
            ].map(a => (
              <button key={a.key} type="button" onClick={() => setAction(a.key)}
                style={{ padding: '10px', borderRadius: 8, border: '2px solid',
                  borderColor: action === a.key ? a.color : 'var(--border)',
                  background: action === a.key ? a.color + '18' : 'transparent',
                  color: action === a.key ? a.color : 'var(--text-muted)',
                  cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                {a.label}
              </button>
            ))}
          </div>

          {/* Staff */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
              Staff <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {loading ? (
              <div style={{ padding: 8, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
            ) : (
              <select value={staffId} onChange={e => setStaffId(e.target.value)} style={inpStyle}>
                <option value="">-- Select Staff --</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.roles?.join(', ') || s.role || '—'})</option>
                ))}
              </select>
            )}
          </div>

          {/* Date + Time row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
                📅 Date
              </label>
              <input type="date" value={date} max={todayStr()}
                onChange={e => setDate(e.target.value)} style={inpStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
                🕐 Time
              </label>
              <input type="time" value={time}
                min={restOpenTime || undefined}
                max={restCloseTime || undefined}
                onChange={e => setTime(e.target.value)} style={inpStyle} />
            </div>
          </div>

          {/* Preview */}
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--text-muted)' }}>
            {action === 'CHECK_IN' ? '🟢 Check-in' : '🔴 Check-out'} on{' '}
            <strong style={{ color: 'var(--text)' }}>{date}</strong> at{' '}
            <strong style={{ color: 'var(--accent)' }}>{time}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !staffId}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
                background: saving || !staffId ? 'var(--border)' : 'var(--accent)', color: '#fff',
                cursor: saving || !staffId ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit Attendance Modal ─────────────────────────────────────────────────────
function dtToDateStr(dt) {
  if (!dt) return todayStr()
  const d = parseDt(dt)
  if (!d || isNaN(d)) return todayStr()
  return d.toISOString().slice(0, 10)
}
function dtToTimeStr(dt) {
  if (!dt) return ''
  const d = parseDt(dt)
  if (!d || isNaN(d)) return ''
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function EditAttendanceModal({ record, rid, onClose, onDone, toast }) {
  const [inDate,  setInDate]  = useState(dtToDateStr(record.checkIn))
  const [inTime,  setInTime]  = useState(dtToTimeStr(record.checkIn))
  const [outDate, setOutDate] = useState(record.checkOut ? dtToDateStr(record.checkOut) : '')
  const [outTime, setOutTime] = useState(dtToTimeStr(record.checkOut))
  const [status,  setStatus]  = useState(record.status || 'PRESENT')
  const [saving,  setSaving]  = useState(false)

  const inpStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!inDate || !inTime) return toast.error('Check-in date aur time required hai')
    setSaving(true)
    const updates = {
      checkIn: `${inDate}T${inTime}:00`,
      status,
    }
    if (outDate && outTime) {
      updates.checkOut = `${outDate}T${outTime}:00`
    } else {
      updates.checkOut = null
    }
    try {
      await api.patch(`/attendance/${record.id}?restaurantId=${rid}`, updates)
      toast.success('Attendance record updated')
      onDone()
    } catch (err) {
      toast.error(err.message || 'Update failed')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>✏️ Edit Attendance</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          <strong style={{ color: 'var(--text)' }}>{record.staffName || `Staff #${record.staffId}`}</strong>
          {' — '}{record.date}
        </div>

        <form onSubmit={handleSave}>
          {/* Check-in */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#10b981', marginBottom: 6, fontWeight: 600 }}>
              🟢 Check-in *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="date" value={inDate} max={todayStr()} onChange={e => setInDate(e.target.value)} style={inpStyle} />
              <input type="time" value={inTime} onChange={e => setInTime(e.target.value)} style={inpStyle} />
            </div>
          </div>

          {/* Check-out */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#ef4444', marginBottom: 6, fontWeight: 600 }}>
              🔴 Check-out (optional — blank rakhne se "still present" hoga)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="date" value={outDate} min={inDate} max={todayStr()}
                onChange={e => setOutDate(e.target.value)} style={inpStyle} placeholder="—" />
              <input type="time" value={outTime} onChange={e => setOutTime(e.target.value)} style={inpStyle} />
            </div>
            {outDate && outTime && inDate && inTime && `${outDate}T${outTime}` < `${inDate}T${inTime}` && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                ⚠️ Check-out check-in se pehle nahi ho sakta
              </div>
            )}
          </div>

          {/* Status */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
              Status
            </label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inpStyle}>
              <option value="PRESENT">PRESENT</option>
              <option value="ABSENT">ABSENT</option>
              <option value="HALF_DAY">HALF_DAY</option>
              <option value="LEAVE">LEAVE</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
                background: saving ? 'var(--border)' : '#6366f1', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Saving…' : '💾 Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Attendance Table ──────────────────────────────────────────────────────────
function AttendanceTable({ records, loading, isMultiDay, canEdit, onEdit }) {
  if (loading) return <SkeletonTable rows={5} />
  if (!records.length) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
      <div>Is period mein koi attendance record nahi mila</div>
    </div>
  )

  // Group by staffId (and date if multi-day)
  const key   = r => isMultiDay ? `${r.staffId}_${r.date}` : String(r.staffId)
  const byKey = {}
  records.forEach(r => {
    const k = key(r)
    if (!byKey[k]) byKey[k] = []
    byKey[k].push(r)
  })

  const rows = Object.values(byKey).map(sessions => {
    const totalHours = sessions.reduce((s, r) => s + (r.hoursWorked || 0), 0)
    const isPresent  = sessions.some(s => s.checkOut == null)
    const latest     = sessions[sessions.length - 1]
    return { sessions, totalHours: Math.round(totalHours * 100) / 100, isPresent, latest,
      staffName: latest.staffName, date: latest.date }
  })

  const headers = ['Staff', ...(isMultiDay ? ['Date'] : []), 'Sessions', 'First In', 'Last Out',
    'Total Hours', 'Method', 'Status', 'Live', ...(canEdit ? ['Edit'] : [])]

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ sessions, totalHours, isPresent, latest, staffName, date }) => {
            const firstIn = sessions[0]?.checkIn
            const lastOut = isPresent ? null : sessions[sessions.length - 1]?.checkOut
            const mc = METHOD_COLOR[latest.method] || METHOD_COLOR.AUTO
            const sc = STATUS_COLOR[latest.status] || '#888'

            return (
              <tr key={`${latest.staffId}_${latest.date}_${latest.id}`}
                style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600 }}>{staffName || `Staff #${latest.staffId}`}</div>
                  {sessions.length > 1 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sessions.length} sessions</div>
                  )}
                </td>
                {isMultiDay && (
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {date}
                  </td>
                )}
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sessions.map((s, i) => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          S{i + 1}: {fmtTime(s.checkIn)} → {s.checkOut
                            ? fmtTime(s.checkOut)
                            : <span style={{ color: '#10b981', fontWeight: 600 }}>Present</span>}
                          {s.hoursWorked ? ` (${fmtHours(s.hoursWorked)})` : ''}
                        </span>
                        {canEdit && (
                          <button onClick={() => onEdit(s)}
                            title="Edit this session"
                            style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                              border: '1px solid #6366f1', background: 'transparent', color: '#6366f1',
                              cursor: 'pointer', flexShrink: 0, lineHeight: 1.4 }}>
                            ✏️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{fmtTime(firstIn)}</td>
                <td style={{ padding: '10px 12px' }}>
                  {lastOut ? fmtTime(lastOut) : <span style={{ color: '#10b981', fontWeight: 600 }}>Still In</span>}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                  {totalHours > 0 ? fmtHours(totalHours) : '—'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge text={latest.method || 'MANUAL'} color={mc} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge text={latest.status || 'PRESENT'} color={sc} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {isPresent
                    ? <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                    : <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--border)' }} />}
                </td>
                {canEdit && (
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => onEdit(latest)}
                      style={{ padding: '4px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                        border: '1px solid #6366f1', background: 'transparent', color: '#6366f1',
                        cursor: 'pointer' }}>
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AttendanceReports() {
  const rid   = useAuthStore(s => s.restaurantId)
  const user  = useAuthStore(s => s.user)
  const toast = useToast()

  const canEdit = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN'

  const [preset,        setPreset]        = useState('today')
  const [fromDate,      setFromDate]      = useState(todayStr())
  const [toDate,        setToDate]        = useState(todayStr())
  const [fromTime,      setFromTime]      = useState('')
  const [toTime,        setToTime]        = useState('')
  const [restOpenTime,  setRestOpenTime]  = useState('') // restaurant opening time
  const [restCloseTime, setRestCloseTime] = useState('') // restaurant closing time
  const [allRecords,    setAllRecords]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showManual,    setShowManual]    = useState(false)
  const [editRecord,    setEditRecord]    = useState(null)
  const [dateError,     setDateError]     = useState('')
  const intervalRef = useRef(null)

  // ── Validation ──────────────────────────────────────────────────
  function validate(from, to) {
    const today = todayStr()
    if (from > today)  return 'From date future mein nahi ho sakti'
    if (to < from)     return 'To date, From date se pehle nahi ho sakti'
    return ''
  }

  // ── Time validation ─────────────────────────────────────────────
  function validateTime(ft, tt) {
    if (ft && tt && ft > tt) return 'To time, From time se pehle nahi ho sakti'
    return ''
  }

  // ── Apply time filter on client ─────────────────────────────────
  const records = allRecords.filter(r => {
    if (!fromTime && !toTime) return true
    return inTimeRange(r.checkIn, fromTime, toTime)
  })

  // ── Fetch ────────────────────────────────────────────────────────
  const load = useCallback(async (from, to) => {
    setLoading(true)
    try {
      let data
      if (from === to && from === todayStr()) {
        data = await api.get(`/attendance/today?restaurantId=${rid}`)
      } else if (from === to) {
        data = await api.get(`/attendance?restaurantId=${rid}&date=${from}`)
      } else {
        data = await api.get(`/attendance/range?restaurantId=${rid}&from=${from}&to=${to}`)
      }
      setAllRecords(Array.isArray(data) ? data : [])
    } catch {
      setAllRecords([])
    } finally {
      setLoading(false)
    }
  }, [rid])

  // ── Preset change ────────────────────────────────────────────────
  function applyPreset(key) {
    setPreset(key)
    setDateError('')
    clearInterval(intervalRef.current)

    const dates = presetDates(key)
    if (!dates) return // custom — user will set dates manually

    setFromDate(dates.from)
    setToDate(dates.to)
    load(dates.from, dates.to)

    if (key === 'today') {
      intervalRef.current = setInterval(() => load(todayStr(), todayStr()), 60000)
    }
  }

  // ── Custom date change ───────────────────────────────────────────
  function handleFromChange(val) {
    setFromDate(val)
    const err = validate(val, toDate)
    setDateError(err)
    if (!err) load(val, toDate)
  }

  function handleToChange(val) {
    setToDate(val)
    const err = validate(fromDate, val)
    setDateError(err)
    if (!err) load(fromDate, val)
  }

  // ── Time change ──────────────────────────────────────────────────
  function handleFromTimeChange(val) {
    setFromTime(val)
    if (val && toTime && val > toTime) setToTime('')
  }

  function handleToTimeChange(val) {
    setToTime(val)
  }

  function applyShift(shift) {
    const active = fromTime === shift.from && toTime === shift.to
    if (active) { setFromTime(''); setToTime('') }
    else        { setFromTime(shift.from); setToTime(shift.to) }
  }

  // ── Fetch restaurant hours ───────────────────────────────────────
  useEffect(() => {
    api.get(`/restaurants/${rid}`).then(r => {
      if (!r) return
      const open  = r.openTime  || ''
      const close = r.closeTime || ''
      setRestOpenTime(open)
      setRestCloseTime(close)
      if (open)  setFromTime(open)
      if (close) setToTime(close)
    }).catch(() => {})
  }, [rid])

  // ── Init ─────────────────────────────────────────────────────────
  useEffect(() => {
    applyPreset('today')
    return () => clearInterval(intervalRef.current)
  }, [])

  // ── Stats ────────────────────────────────────────────────────────
  const isMultiDay  = fromDate !== toDate
  const presentNow  = records.filter(r => r.checkOut == null).length
  const uniqueStaff = new Set(records.map(r => r.staffId)).size
  const totalHours  = records.reduce((s, r) => s + (r.hoursWorked || 0), 0)
  const avgHours    = uniqueStaff ? Math.round((totalHours / uniqueStaff) * 10) / 10 : 0

  const inputStyle = {
    padding: '7px 11px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📋 Attendance</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Staff attendance track karo — date, time aur range ke saath filter karo
          </p>
        </div>
        <button onClick={() => setShowManual(true)}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          ✋ Manual Entry
        </button>
      </div>

      {/* Preset buttons */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {PRESETS.map(p => (
          <button key={p.key} onClick={() => applyPreset(p.key)}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--border)',
              background: preset === p.key ? 'var(--accent)' : 'transparent',
              color: preset === p.key ? '#fff' : 'var(--text-muted)',
              transition: 'all .15s' }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Date + Time filters */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>

        {/* Date range row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, minWidth: 60 }}>Date:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input type="date" value={fromDate}
              max={todayStr()}
              onChange={e => { setPreset('custom'); handleFromChange(e.target.value) }}
              style={inputStyle} />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>→</span>
            <input type="date" value={toDate}
              min={fromDate} max={todayStr()}
              onChange={e => { setPreset('custom'); handleToChange(e.target.value) }}
              style={inputStyle} />
          </div>
          {dateError && (
            <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>⚠️ {dateError}</span>
          )}
        </div>

        {/* Time range row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, minWidth: 60 }}>Time:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Restaurant hours quick button */}
            {restOpenTime && restCloseTime && (
              <button
                onClick={() => {
                  const active = fromTime === restOpenTime && toTime === restCloseTime
                  if (active) { setFromTime(''); setToTime('') }
                  else        { setFromTime(restOpenTime); setToTime(restCloseTime) }
                }}
                style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid #10b981',
                  background: fromTime === restOpenTime && toTime === restCloseTime ? '#10b981' : 'transparent',
                  color: fromTime === restOpenTime && toTime === restCloseTime ? '#fff' : '#10b981',
                  transition: 'all .15s' }}>
                🏪 Restaurant Hours ({restOpenTime}–{restCloseTime})
              </button>
            )}
            {/* Shift quick presets */}
            {TIME_SHIFTS.map(s => {
              const active = fromTime === s.from && toTime === s.to
              return (
                <button key={s.label} onClick={() => applyShift(s)}
                  style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: '1px solid var(--border)',
                    background: active ? '#6366f1' : 'transparent',
                    color: active ? '#fff' : 'var(--text-muted)',
                    transition: 'all .15s' }}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
        {/* Time inputs row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, minWidth: 60 }}></span>
          <input type="time" value={fromTime}
            min={restOpenTime || undefined}
            max={restCloseTime || undefined}
            onChange={e => handleFromTimeChange(e.target.value)}
            style={{ ...inputStyle, minWidth: 120 }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>→</span>
          <input type="time" value={toTime}
            min={fromTime || restOpenTime || undefined}
            max={restCloseTime || undefined}
            onChange={e => handleToTimeChange(e.target.value)}
            style={{ ...inputStyle, minWidth: 120,
              borderColor: toTime && fromTime && toTime < fromTime ? '#ef4444' : 'var(--border)' }} />
          {(fromTime || toTime) && (
            <button onClick={() => { setFromTime(''); setToTime('') }}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'transparent',
                color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
              ✕ Clear
            </button>
          )}
          {restOpenTime && restCloseTime && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Restaurant hours: {restOpenTime} – {restCloseTime}
            </span>
          )}
        </div>
        {/* Time filter status */}
        <div style={{ marginTop: 8, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
          {(fromTime || toTime) ? (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1',
                display: 'inline-block', boxShadow: '0 0 4px #6366f1' }} />
              <span style={{ color: '#6366f1', fontWeight: 600 }}>
                Time filter active: {fromTime || '00:00'} – {toTime || '23:59'}
              </span>
              {toTime && fromTime && toTime < fromTime && (
                <span style={{ color: '#ef4444', marginLeft: 8 }}>⚠️ To time, From time se pehle hai</span>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>Time filter off — sabhi check-in times dikh rahe hain</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Present / Open"  value={presentNow}               color="#10b981" sub="active sessions" />
        <StatCard label="Unique Staff"    value={uniqueStaff}              color="#6366f1" sub="with records" />
        <StatCard label="Total Hours"     value={fmtHours(Math.round(totalHours * 100) / 100)} color="#f59e0b" />
        <StatCard label="Avg Hours/Staff" value={avgHours ? `${avgHours}h` : '—'} color="#8b5cf6" />
        {preset === 'today' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981',
              boxShadow: '0 0 6px #10b981', display: 'inline-block', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Live</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Auto-refresh 60s</div>
            </div>
          </div>
        )}
      </div>

      {/* Records count + active filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {loading ? 'Loading…' : `${records.length} record${records.length !== 1 ? 's' : ''}`}
          {(fromTime || toTime) && ` (time filtered)`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
        <AttendanceTable records={records} loading={loading} isMultiDay={isMultiDay}
          canEdit={canEdit} onEdit={setEditRecord} />
      </div>

      {/* Manual Modal */}
      {showManual && (
        <ManualModal rid={rid} toast={toast}
          restOpenTime={restOpenTime} restCloseTime={restCloseTime}
          onClose={() => setShowManual(false)}
          onDone={() => {
            setShowManual(false)
            load(fromDate, toDate)
          }} />
      )}

      {/* Edit Attendance Modal */}
      {editRecord && (
        <EditAttendanceModal record={editRecord} rid={rid} toast={toast}
          onClose={() => setEditRecord(null)}
          onDone={() => {
            setEditRecord(null)
            load(fromDate, toDate)
          }} />
      )}
    </div>
  )
}
