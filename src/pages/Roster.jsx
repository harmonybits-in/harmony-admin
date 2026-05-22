// src/pages/Roster.jsx — Weekly Staff Shift Roster
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast }     from '../hooks/useToast'

const BASE = import.meta.env.VITE_API_URL || ''

function authHeaders() {
  const { token } = useAuthStore.getState()
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

// ── Shift type config ──────────────────────────────────────────────────────
const SHIFTS = {
  MORNING: { label: 'Morning',  icon: '🌅', color: '#f59e0b', times: '09:00–17:00' },
  EVENING: { label: 'Evening',  icon: '🌇', color: '#6366f1', times: '15:00–23:00' },
  NIGHT:   { label: 'Night',    icon: '🌙', color: '#1e3a5f', times: '22:00–06:00' },
  DAY_OFF: { label: 'Day Off',  icon: '🏖️', color: '#10b981', times: ''            },
  CUSTOM:  { label: 'Custom',   icon: '⚙️', color: '#ec4899', times: ''            },
}

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ── Monday of date's week ──────────────────────────────────────────────────
function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().slice(0, 10)
}

// ── Shift cell ─────────────────────────────────────────────────────────────
function ShiftCell({ shift, onClick, isWeekend }) {
  if (!shift) {
    return (
      <td onClick={onClick} style={{
        padding: '6px 4px', minWidth: 90, cursor: 'pointer',
        background: isWeekend ? 'var(--bg-secondary)' : 'transparent',
        verticalAlign: 'middle', textAlign: 'center',
        borderRight: '1px solid var(--border)',
      }}>
        <div style={{ height: 40, display: 'flex', alignItems: 'center',
          justifyContent: 'center', borderRadius: 6,
          border: '1px dashed var(--border)', color: 'var(--text-muted)',
          fontSize: 11 }}>
          +
        </div>
      </td>
    )
  }
  const cfg = SHIFTS[shift.shiftType] || SHIFTS.CUSTOM
  return (
    <td onClick={onClick} style={{
      padding: '6px 4px', minWidth: 90, cursor: 'pointer',
      background: isWeekend ? 'var(--bg-secondary)' : 'transparent',
      verticalAlign: 'middle', textAlign: 'center',
      borderRight: '1px solid var(--border)',
    }}>
      <div style={{
        padding: '5px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600,
        background: cfg.color + '20', color: cfg.color,
        border: `1px solid ${cfg.color}40`, lineHeight: 1.4,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
      }}>
        <span>{cfg.icon} {cfg.label}</span>
        {shift.startTime && shift.endTime && (
          <span style={{ fontSize: 9, opacity: 0.85, fontWeight: 400 }}>
            {shift.startTime}–{shift.endTime}
          </span>
        )}
      </div>
    </td>
  )
}

// ── Assign Shift Modal ─────────────────────────────────────────────────────
function AssignModal({ staffName, date, existing, onSave, onDelete, onClose }) {
  const toast  = useToast()
  const [type,      setType]      = useState(existing?.shiftType || 'MORNING')
  const [startTime, setStartTime] = useState(existing?.startTime || '')
  const [endTime,   setEndTime]   = useState(existing?.endTime   || '')
  const [notes,     setNotes]     = useState(existing?.notes     || '')
  const [loading,   setLoading]   = useState(false)

  const cfg = SHIFTS[type] || SHIFTS.CUSTOM

  function applyDefaults(t) {
    setType(t)
    const s = SHIFTS[t]
    if (s && s.times && !['CUSTOM','DAY_OFF'].includes(t)) {
      const [st, en] = s.times.split('–')
      setStartTime(st || '')
      setEndTime(en || '')
    } else if (t === 'DAY_OFF') {
      setStartTime(''); setEndTime('')
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      await onSave({ shiftType: type, startTime: startTime || null,
                     endTime: endTime || null, notes: notes || null })
    } catch (e) {
      toast.error(e.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!existing) return
    if (!confirm('Is shift ko remove karna chahte hain?')) return
    setLoading(true)
    try { await onDelete() }
    catch (e) { toast.error(e.message || 'Delete failed') }
    finally { setLoading(false) }
  }

  const inp = {
    padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, width: '100%',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0008', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '1.5rem',
        width: '100%', maxWidth: 400, boxShadow: '0 20px 60px #0005' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {existing ? '✏️ Edit Shift' : '➕ Assign Shift'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {staffName} · {fmtDate(date)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Shift type grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
          {Object.entries(SHIFTS).map(([key, s]) => (
            <button key={key} onClick={() => applyDefaults(key)} style={{
              padding: '8px 6px', borderRadius: 8, border: `2px solid ${type === key ? s.color : 'var(--border)'}`,
              background: type === key ? s.color + '20' : 'var(--bg-secondary)',
              color: type === key ? s.color : 'var(--text-muted)',
              fontSize: 11, fontWeight: type === key ? 700 : 400, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <span>{s.label}</span>
              {s.times && <span style={{ fontSize: 9, opacity: 0.7 }}>{s.times}</span>}
            </button>
          ))}
        </div>

        {/* Custom times */}
        {type !== 'DAY_OFF' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                display: 'block', marginBottom: 4 }}>START TIME</label>
              <input type="time" value={startTime}
                onChange={e => setStartTime(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                display: 'block', marginBottom: 4 }}>END TIME</label>
              <input type="time" value={endTime}
                onChange={e => setEndTime(e.target.value)} style={inp} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
            display: 'block', marginBottom: 4 }}>NOTES (optional)</label>
          <input type="text" placeholder="e.g. Counter duty" value={notes}
            onChange={e => setNotes(e.target.value)} style={inp} />
        </div>

        {/* Preview */}
        <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 14,
          background: cfg.color + '15', border: `1px solid ${cfg.color}40`,
          fontSize: 12, color: cfg.color, fontWeight: 600 }}>
          {cfg.icon} {cfg.label}
          {startTime && endTime ? ` · ${startTime} – ${endTime}` : ''}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {existing && (
            <button onClick={handleDelete} disabled={loading} style={{
              padding: '9px 14px', borderRadius: 8, border: '1px solid #ef4444',
              background: 'transparent', color: '#ef4444', fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600,
            }}>🗑️ Remove</button>
          )}
          <button onClick={onClose} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', fontSize: 13, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={{
            flex: 2, padding: '9px', borderRadius: 8, border: 'none',
            background: loading ? '#ccc' : cfg.color, color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          }}>{loading ? '⏳ Saving...' : existing ? 'Update' : 'Assign'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Roster() {
  const toast = useToast()
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()))
  const [roster,    setRoster]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null) // {staffId, staffName, date, existing}

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/v1/roster/week?weekStart=${weekStart}`,
        { headers: authHeaders() })
      if (!res.ok) throw new Error()
      setRoster(await res.json())
    } catch {
      toast.error('Roster load nahi hua')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { load() }, [load])

  const days = roster?.days || []

  function openModal(staffId, staffName, date, existing) {
    setModal({ staffId, staffName, date, existing })
  }

  async function handleSave({ shiftType, startTime, endTime, notes }) {
    const { staffId, date } = modal
    const res = await fetch(`${BASE}/api/v1/roster`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ staffId, date, shiftType, startTime, endTime, notes }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Save failed')
    }
    toast.success('Shift assign ho gaya!')
    setModal(null)
    load()
  }

  async function handleDelete() {
    const { existing } = modal
    const res = await fetch(`${BASE}/api/v1/roster/${existing.id}`,
      { method: 'DELETE', headers: authHeaders() })
    if (!res.ok) throw new Error('Delete failed')
    toast.success('Shift removed')
    setModal(null)
    load()
  }

  // Shift summary counts for header
  const shiftCounts = {}
  if (roster?.staff) {
    for (const st of roster.staff) {
      for (const shift of Object.values(st.shifts || {})) {
        if (shift) shiftCounts[shift.shiftType] = (shiftCounts[shift.shiftType] || 0) + 1
      }
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.25rem', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>📅 Weekly Roster</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            Staff shift schedule — cell click karo assign/edit karne ke liye
          </p>
        </div>

        {/* Week navigation */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}>← Prev</button>
          <button onClick={() => setWeekStart(getMondayOf(new Date()))} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', fontSize: 12, cursor: 'pointer',
            fontWeight: 600 }}>Today</button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} style={{
            padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer' }}>Next →</button>
        </div>
      </div>

      {/* Week range + shift legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {roster ? `${fmtDate(roster.weekStart)} – ${fmtDate(roster.weekEnd)}` : '...'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(SHIFTS).map(([k, s]) => (
            <span key={k} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20,
              background: s.color + '20', color: s.color, fontWeight: 600 }}>
              {s.icon} {s.label} {shiftCounts[k] ? `(${shiftCounts[k]})` : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Roster grid */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border)' }}>
              {/* Staff column */}
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11,
                fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em',
                minWidth: 150, borderRight: '1px solid var(--border)',
                position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                STAFF
              </th>
              {days.map((d, i) => (
                <th key={d} style={{
                  padding: '10px 8px', textAlign: 'center', minWidth: 95,
                  fontSize: 11, fontWeight: 700,
                  color: isToday(d) ? 'var(--accent)' : 'var(--text-muted)',
                  borderRight: '1px solid var(--border)',
                  background: isToday(d) ? 'var(--accent-bg)' : 'transparent',
                }}>
                  <div>{DAY_LABELS[i]}</div>
                  <div style={{ fontSize: 12, fontWeight: isToday(d) ? 700 : 400,
                    marginTop: 1 }}>{fmtDate(d)}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', borderRight: '1px solid var(--border)',
                      position: 'sticky', left: 0, background: 'var(--bg-card)' }}>
                      <div style={{ height: 16, width: 120, borderRadius: 4,
                        background: 'var(--border)' }} />
                    </td>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '12px 8px',
                        borderRight: '1px solid var(--border)' }}>
                        <div style={{ height: 40, borderRadius: 6,
                          background: 'var(--border)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : !roster?.staff?.length
              ? (
                  <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center',
                    color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
                    Koi active staff nahi mila
                  </td></tr>
                )
              : roster.staff.map(st => (
                  <tr key={st.id} style={{ borderBottom: '1px solid var(--border)',
                    transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>

                    {/* Staff name */}
                    <td style={{ padding: '10px 16px', verticalAlign: 'middle',
                      borderRight: '1px solid var(--border)',
                      position: 'sticky', left: 0, background: 'var(--bg-card)',
                      zIndex: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{st.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {st.role}
                      </div>
                    </td>

                    {days.map((d, i) => {
                      const shift = st.shifts?.[d]
                      const isWE  = i >= 5 // Sat/Sun
                      return (
                        <ShiftCell key={d} shift={shift} isWeekend={isWE}
                          onClick={() => openModal(st.id, st.name, d, shift)} />
                      )
                    })}
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Footer legend */}
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)',
        display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>💡 Cell click → shift assign/edit</span>
        <span>➕ Empty cell click → new shift</span>
        <span>Weekends shaded</span>
        {isToday(weekStart) && <span style={{ color: 'var(--accent)' }}>Today highlighted</span>}
      </div>

      {/* Assign/Edit Modal */}
      {modal && (
        <AssignModal
          staffName={modal.staffName}
          date={modal.date}
          existing={modal.existing}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
