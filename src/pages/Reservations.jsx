// src/pages/Reservations.jsx
import { useState, useEffect, useCallback } from 'react'
import { reservationApi } from '../api/client'
import { useToast } from '../hooks/useToast'
import { SkeletonCard } from '../components/Skeleton'

// ── Helpers ───────────────────────────────────────────────────────
const toDateStr = (d) => d.toISOString().slice(0, 10)
const todayStr  = ()  => toDateStr(new Date())

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hh = parseInt(h)
  return `${hh % 12 || 12}:${m} ${hh < 12 ? 'AM' : 'PM'}`
}

const STATUS_META = {
  PENDING:   { label: 'Pending',   color: '#f59e0b', bg: '#fef3c7' },
  CONFIRMED: { label: 'Confirmed', color: '#6366f1', bg: '#ede9fe' },
  SEATED:    { label: 'Seated',    color: '#10b981', bg: '#d1fae5' },
  COMPLETED: { label: 'Completed', color: '#64748b', bg: '#f1f5f9' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444', bg: '#fee2e2' },
  NO_SHOW:   { label: 'No Show',   color: '#dc2626', bg: '#fecaca' },
}

const TRANSITIONS = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SEATED',    'CANCELLED'],
  SEATED:    ['COMPLETED', 'NO_SHOW'],
}

// ── Mini Calendar ─────────────────────────────────────────────────
function MiniCalendar({ selected, onSelect, dotDates = new Set() }) {
  const [view, setView] = useState(() => {
    const d = new Date(selected)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const { year, month } = view
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setView(v => {
    const d = new Date(v.year, v.month - 1, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const nextMonth = () => setView(v => {
    const d = new Date(v.year, v.month + 1, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  const today = todayStr()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: '2px 6px' }}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{monthName}</span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: '2px 6px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, textAlign: 'center' }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, padding: '2px 0' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = dateStr === selected
          const isToday    = dateStr === today
          const hasDot     = dotDates.has(dateStr)
          return (
            <div key={day} onClick={() => onSelect(dateStr)} style={{
              position: 'relative', cursor: 'pointer', borderRadius: 6, padding: '5px 2px',
              fontSize: 12, fontWeight: isToday ? 700 : 400,
              background: isSelected ? 'var(--accent)' : isToday ? 'var(--bg-page)' : 'transparent',
              color: isSelected ? '#fff' : isToday ? 'var(--accent)' : 'var(--text)',
              border: isToday && !isSelected ? '1px solid var(--accent)' : '1px solid transparent',
            }}>
              {day}
              {hasDot && (
                <span style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%',
                  background: isSelected ? '#fff' : 'var(--accent)',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Reservation Card ──────────────────────────────────────────────
function ReservationCard({ res, onStatusChange, onEdit }) {
  const meta = STATUS_META[res.status] || STATUS_META.PENDING
  const transitions = TRANSITIONS[res.status] || []

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 14px', marginBottom: 8,
      borderLeft: `3px solid ${meta.color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{res.customerName}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              background: meta.bg, color: meta.color,
            }}>{meta.label}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>⏰ {fmtTime(res.reservationTime)}</span>
            <span>👥 {res.partySize} guests</span>
            {res.tableNo && <span>🪑 Table {res.tableNo}</span>}
            {res.customerPhone && <span>📞 {res.customerPhone}</span>}
          </div>
          {(res.bookingAmount > 0) && (() => {
            const balance = Math.max(0, (res.bookingAmount || 0) - (res.advancePaid || 0))
            return (
              <div style={{ fontSize: 11, marginTop: 5, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  💰 Booking: <strong>₹{res.bookingAmount?.toLocaleString('en-IN')}</strong>
                </span>
                <span style={{ color: '#10b981' }}>
                  ✓ Paid: <strong>₹{(res.advancePaid || 0).toLocaleString('en-IN')}</strong>
                  {res.paymentMode ? ` (${res.paymentMode})` : ''}
                </span>
                {balance > 0 && (
                  <span style={{ color: '#ef4444' }}>
                    Balance: <strong>₹{balance.toLocaleString('en-IN')}</strong>
                  </span>
                )}
              </div>
            )
          })()}
          {res.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>"{res.notes}"</div>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {transitions.map(st => {
            const m = STATUS_META[st]
            return (
              <button key={st} onClick={() => onStatusChange(res.id, st)} style={{
                padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: `1px solid ${m.color}`, background: 'transparent',
                color: m.color, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{m.label}</button>
            )
          })}
          <button onClick={() => onEdit(res)} style={{
            padding: '4px 8px', borderRadius: 6, fontSize: 11,
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>Edit</button>
        </div>
      </div>
    </div>
  )
}

// ── Booking Modal ─────────────────────────────────────────────────
const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'ONLINE']

const EMPTY_FORM = {
  customerName: '', customerPhone: '',
  reservationDate: todayStr(), reservationTime: '19:00',
  partySize: 2, tableId: '', notes: '',
  bookingAmount: '', advancePaid: '', paymentMode: '',
}

function BookingModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.customerName.trim()) { toast.error('Customer name zaroori hai'); return }
    if (!form.reservationDate)     { toast.error('Date select karo'); return }
    if (!form.reservationTime)     { toast.error('Time select karo'); return }
    if (!form.partySize || form.partySize < 1) { toast.error('Party size > 0 hona chahiye'); return }

    const bookingAmt = parseFloat(form.bookingAmount) || 0
    const advancePd  = parseFloat(form.advancePaid)   || 0
    if (advancePd > bookingAmt && bookingAmt > 0) {
      toast.error('Advance paid booking amount se zyada nahi ho sakta')
      return
    }

    setSaving(true)
    try {
      const body = {
        customerName:    form.customerName.trim(),
        customerPhone:   form.customerPhone || null,
        reservationDate: form.reservationDate,
        reservationTime: form.reservationTime,
        partySize:       parseInt(form.partySize),
        tableId:         form.tableId ? parseInt(form.tableId) : null,
        bookingAmount:   bookingAmt || null,
        advancePaid:     advancePd  || null,
        paymentMode:     form.paymentMode || null,
        notes:           form.notes || null,
      }
      await onSave(body)
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type='text', extra={}) => (
    <div style={{ marginBottom: '0.875rem' }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
        {...extra} />
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{initial ? 'Edit Reservation' : 'New Reservation'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {field('Customer Name *', 'customerName')}
          {field('Phone', 'customerPhone', 'tel')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {field('Date *', 'reservationDate', 'date')}
            {field('Time *', 'reservationTime', 'time')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {field('Party Size *', 'partySize', 'number', { min: 1, max: 100 })}
            {field('Table ID', 'tableId', 'number', { min: 1, placeholder: 'Optional' })}
          </div>
          {/* Payment section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem', marginBottom: '0.875rem' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              💰 Advance Payment (Optional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {field('Booking Amount (₹)', 'bookingAmount', 'number', { min: 0, step: '0.01', placeholder: '0' })}
              {field('Advance Paid (₹)',   'advancePaid',   'number', { min: 0, step: '0.01', placeholder: '0' })}
            </div>
            <div style={{ marginBottom: '0.875rem' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Payment Mode</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PAYMENT_MODES.map(m => (
                  <button key={m} type="button" onClick={() => set('paymentMode', form.paymentMode === m ? '' : m)} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: form.paymentMode === m ? 'var(--accent)' : 'transparent',
                    color:      form.paymentMode === m ? '#fff' : 'var(--text-muted)',
                  }}>{m}</button>
                ))}
              </div>
            </div>
            {parseFloat(form.bookingAmount) > 0 && (
              <div style={{ background: 'var(--bg-page)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Balance due: </span>
                <span style={{ fontWeight: 700, color: '#ef4444' }}>
                  ₹{Math.max(0, (parseFloat(form.bookingAmount)||0) - (parseFloat(form.advancePaid)||0)).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Special requests..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '10px', borderRadius: 8, border: 'none',
              background: saving ? '#a5b4fc' : 'var(--accent)', color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
            }}>{saving ? 'Saving…' : initial ? 'Save Changes' : 'Book Table'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function Reservations() {
  const toast = useToast()

  const [selectedDate,  setSelectedDate]  = useState(todayStr())
  const [reservations,  setReservations]  = useState([])
  const [summary,       setSummary]       = useState(null)
  const [dotDates,      setDotDates]      = useState(new Set())
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [editTarget,    setEditTarget]    = useState(null)

  // Load reservations for selected date
  const loadDate = useCallback(async (date) => {
    setLoading(true)
    try {
      const [resList, sumData] = await Promise.all([
        reservationApi.getByDate(date),
        reservationApi.getSummary(date),
      ])
      setReservations(Array.isArray(resList) ? resList : [])
      setSummary(sumData)
    } catch {
      toast.error('Reservations load nahi hue')
    } finally {
      setLoading(false) }
  }, [])

  // Load upcoming month dates that have reservations (for calendar dots)
  const loadDotDates = useCallback(async () => {
    try {
      const d = new Date(selectedDate)
      const from = new Date(d.getFullYear(), d.getMonth(), 1)
      const to   = new Date(d.getFullYear(), d.getMonth() + 2, 0)
      const res  = await reservationApi.getUpcoming(0, 100)
      const content = res?.content || []
      const dates = new Set(content.map(r => r.reservationDate))
      setDotDates(dates)
    } catch {}
  }, [selectedDate])

  useEffect(() => { loadDate(selectedDate) },  [selectedDate, loadDate])
  useEffect(() => { loadDotDates() }, [loadDotDates])

  const handleDateSelect = (date) => setSelectedDate(date)

  async function handleCreate(body) {
    try {
      await reservationApi.create(body)
      toast.success('Reservation created!')
      setShowModal(false)
      loadDate(body.reservationDate)
      if (body.reservationDate !== selectedDate) setSelectedDate(body.reservationDate)
    } catch (e) {
      toast.error(e.message || 'Create failed')
    }
  }

  async function handleUpdate(body) {
    try {
      await reservationApi.update(editTarget.id, body)
      toast.success('Reservation updated!')
      setEditTarget(null)
      loadDate(selectedDate)
    } catch (e) {
      toast.error(e.message || 'Update failed')
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await reservationApi.changeStatus(id, status)
      toast.success(`Status → ${STATUS_META[status]?.label}`)
      loadDate(selectedDate)
    } catch (e) {
      toast.error(e.message || 'Status change failed')
    }
  }

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const summaryCards = summary ? [
    { label: 'Total',     value: summary.total,     color: '#6366f1' },
    { label: 'Confirmed', value: summary.confirmed,  color: '#6366f1' },
    { label: 'Seated',    value: summary.seated,     color: '#10b981' },
    { label: 'Pending',   value: summary.pending,    color: '#f59e0b' },
    { label: 'Cancelled', value: summary.cancelled,  color: '#ef4444' },
  ] : []

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>📅 Reservations</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Table bookings aur walk-in reservations manage karo
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
          background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
        }}>+ New Booking</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Left — Calendar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <MiniCalendar selected={selectedDate} onSelect={handleDateSelect} dotDates={dotDates} />

          {/* Today shortcut */}
          {selectedDate !== todayStr() && (
            <button onClick={() => setSelectedDate(todayStr())} style={{
              padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--accent)', background: 'transparent',
              color: 'var(--accent)', cursor: 'pointer', width: '100%',
            }}>Today pe aao</button>
          )}

          {/* Day summary */}
          {summary && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Day Summary
              </div>
              {summaryCards.map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Reservations list */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{displayDate}</div>
              {summary && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{summary.total} bookings</div>}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} height={80} />)}
            </div>
          ) : reservations.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '3rem', textAlign: 'center', color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Is din koi booking nahi</div>
              <div style={{ fontSize: 12 }}>New Booking button se add karo</div>
            </div>
          ) : (
            <div>
              {reservations.map(res => (
                <ReservationCard
                  key={res.id}
                  res={res}
                  onStatusChange={handleStatusChange}
                  onEdit={(r) => setEditTarget(r)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New booking modal */}
      {showModal && (
        <BookingModal
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <BookingModal
          initial={{
            customerName:    editTarget.customerName,
            customerPhone:   editTarget.customerPhone || '',
            reservationDate: editTarget.reservationDate,
            reservationTime: editTarget.reservationTime,
            partySize:       editTarget.partySize,
            tableId:         editTarget.tableId || '',
            bookingAmount:   editTarget.bookingAmount || '',
            advancePaid:     editTarget.advancePaid   || '',
            paymentMode:     editTarget.paymentMode   || '',
            notes:           editTarget.notes || '',
          }}
          onSave={handleUpdate}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
