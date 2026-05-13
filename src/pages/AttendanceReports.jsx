import { useState, useEffect, useCallback, useRef } from 'react'
import { api, staffApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtTime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function fmtHours(h) {
  if (h == null) return '—'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}h ${mins}m`
}
function today() { return new Date().toISOString().slice(0, 10) }

// ── Shared UI ──────────────────────────────────────────────────────────────
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

function Badge({ text, color, bg }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
      background: bg || color + '22', color }}>
      {text}
    </span>
  )
}

const METHOD_COLOR = {
  MANUAL:    { color: '#6366f1' },
  QR_CODE:   { color: '#10b981' },
  BIOMETRIC: { color: '#f59e0b' },
  AUTO:      { color: '#888'    },
}
const STATUS_COLOR = {
  PRESENT:  { color: '#10b981' },
  ABSENT:   { color: '#ef4444' },
  HALF_DAY: { color: '#f59e0b' },
  LEAVE:    { color: '#6366f1' },
}

// ── Manual Check-in/out Modal ──────────────────────────────────────────────
function ManualModal({ rid, onClose, onDone, toast }) {
  const [staff,   setStaff]   = useState([])
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState('')
  const [action,  setAction]  = useState('CHECK_IN')
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
      await api.post(`/attendance/manual?staffId=${staffId}&restaurantId=${rid}&action=${action}`, {})
      toast.success(`${action === 'CHECK_IN' ? 'Check-in' : 'Check-out'} successful`)
      onDone()
    } catch (err) {
      toast.error(err.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Manual Attendance</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Action toggle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {['CHECK_IN', 'CHECK_OUT'].map(a => (
              <button key={a} type="button" onClick={() => setAction(a)}
                style={{ padding: '10px', borderRadius: 8, border: '1.5px solid',
                  borderColor: action === a ? 'var(--accent)' : 'var(--border)',
                  background: action === a ? '#e53e3e11' : 'transparent',
                  color: action === a ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                {a === 'CHECK_IN' ? '🟢 Check In' : '🔴 Check Out'}
              </button>
            ))}
          </div>

          {/* Staff select */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
              Staff <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {loading ? (
              <div style={{ padding: 8, color: 'var(--text-muted)', fontSize: 13 }}>Loading staff…</div>
            ) : (
              <select value={staffId} onChange={e => setStaffId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }}>
                <option value="">-- Select Staff --</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.roles?.join(', ') || s.role || '—'})</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none',
                background: saving ? '#ccc' : 'var(--accent)', color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Attendance Table ────────────────────────────────────────────────────────
function AttendanceTable({ records, loading }) {
  if (loading) return <SkeletonTable rows={5} />
  if (!records.length) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
      <div>Is din ka koi attendance record nahi mila</div>
    </div>
  )

  // Group by staffId — show latest session prominently
  const byStaff = {}
  records.forEach(r => {
    if (!byStaff[r.staffId]) byStaff[r.staffId] = []
    byStaff[r.staffId].push(r)
  })

  const rows = Object.values(byStaff).map(sessions => {
    const totalHours = sessions.reduce((sum, s) => sum + (s.hoursWorked || 0), 0)
    const isPresent  = sessions.some(s => s.checkOut == null)
    const latest     = sessions[sessions.length - 1]
    return { sessions, totalHours: Math.round(totalHours * 100) / 100, isPresent, latest, staffName: latest.staffName }
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
            {['Staff', 'Sessions', 'First In', 'Last Out', 'Total Hours', 'Method', 'Status', 'Live'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ sessions, totalHours, isPresent, latest, staffName }) => {
            const firstIn  = sessions[0]?.checkIn
            const lastOut  = sessions.find(s => s.checkOut == null) ? null : sessions[sessions.length - 1]?.checkOut
            const mc = METHOD_COLOR[latest.method] || METHOD_COLOR.AUTO
            const sc = STATUS_COLOR[latest.status] || STATUS_COLOR.PRESENT

            return (
              <tr key={latest.staffId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600 }}>{staffName || `Staff #${latest.staffId}`}</div>
                  {sessions.length > 1 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sessions.length} sessions</div>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {sessions.map((s, i) => (
                      <div key={s.id} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        S{i + 1}: {fmtTime(s.checkIn)} → {s.checkOut ? fmtTime(s.checkOut) : <span style={{ color: '#10b981', fontWeight: 600 }}>Present</span>}
                        {s.hoursWorked ? ` (${fmtHours(s.hoursWorked)})` : ''}
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
                  <Badge text={latest.method || 'MANUAL'} color={mc.color} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Badge text={latest.status || 'PRESENT'} color={sc.color} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {isPresent ? (
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                  ) : (
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--border)' }} />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
const TABS = [
  { key: 'today',   icon: '🟢', label: 'Today'     },
  { key: 'history', icon: '📅', label: 'By Date'   },
]

export default function AttendanceReports() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [tab,     setTab]     = useState('today')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [date,    setDate]    = useState(today())
  const [showManual, setShowManual] = useState(false)
  const intervalRef = useRef(null)

  const load = useCallback(async (selectedDate) => {
    setLoading(true)
    try {
      const isToday = selectedDate === today()
      const url = isToday
        ? `/attendance/today?restaurantId=${rid}`
        : `/attendance?restaurantId=${rid}&date=${selectedDate}`
      const data = await api.get(url)
      setRecords(Array.isArray(data) ? data : [])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [rid])

  // Today tab: auto-refresh every 60s
  useEffect(() => {
    if (tab === 'today') {
      load(today())
      intervalRef.current = setInterval(() => load(today()), 60000)
    } else {
      load(date)
    }
    return () => clearInterval(intervalRef.current)
  }, [tab, load])

  function handleDateChange(e) {
    setDate(e.target.value)
    load(e.target.value)
  }

  // Stats
  const presentNow   = records.filter(r => r.checkOut == null).length
  const totalStaff   = new Set(records.map(r => r.staffId)).size
  const totalHoursToday = records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0)

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📋 Attendance</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Staff attendance track karo, manual check-in/out karo
          </p>
        </div>
        <button onClick={() => setShowManual(true)}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          ✋ Manual Entry
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Present Now"    value={presentNow}  color="#10b981" sub="open sessions" />
        <StatCard label="Total Staff"    value={totalStaff}  color="#6366f1" sub="with records" />
        <StatCard label="Hours Today"    value={fmtHours(Math.round(totalHoursToday * 100) / 100)} color="#f59e0b" />
        {tab === 'today' && (
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2, transition: 'color .15s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Date picker for By Date tab */}
      {tab === 'history' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Date:</label>
          <input type="date" value={date} onChange={handleDateChange} max={today()}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }} />
          <button onClick={() => { setDate(today()); load(today()) }}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
            Today
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
        <AttendanceTable records={records} loading={loading} />
      </div>

      {/* Manual Modal */}
      {showManual && (
        <ManualModal rid={rid} toast={toast}
          onClose={() => setShowManual(false)}
          onDone={() => { setShowManual(false); load(tab === 'today' ? today() : date) }} />
      )}
    </div>
  )
}
