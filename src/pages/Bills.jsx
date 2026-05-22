// src/pages/Bills.jsx
import { useState, useEffect, useCallback } from 'react'
import { billApi, api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

const MODES = ['ALL', 'CASH', 'UPI', 'CARD', 'ONLINE']

const ORDER_LABELS = { DINE_IN: 'Dine In', PICKUP: 'Pickup', DELIVERY: 'Delivery', ONLINE: 'Online' }
const ORDER_COLORS = { DINE_IN: '#6366f1', PICKUP: '#f59e0b', DELIVERY: '#10b981', ONLINE: '#ec4899' }
const PAY_COLORS   = { CASH: '#10b981', UPI: '#6366f1', CARD: '#f59e0b', ONLINE: '#ec4899', CREDIT: '#ef4444' }

// ── Small UI Helpers ──────────────────────────────────────────────────────
function Badge({ color, children }) {
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
      background: (color || '#888') + '22', color: color || '#888' }}>
      {children}
    </span>
  )
}

function SumRow({ label, value, bold, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between',
      fontWeight: bold ? 700 : 400, fontSize: bold ? 15 : 13 }}>
      <span style={{ color: bold ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: color || (bold ? 'var(--text)' : 'var(--text-muted)') }}>{value}</span>
    </div>
  )
}

// ── Print Receipt ─────────────────────────────────────────────────────────
function printReceipt(bill, restaurant) {
  const items    = bill.items || []
  const rName    = restaurant?.name    || 'Restaurant'
  const rPhone   = restaurant?.phone   || ''
  const rAddress = restaurant?.address || ''
  const rGst     = restaurant?.gstNumber   || ''
  const rFssai   = restaurant?.fssaiLicNo  || ''

  const itemRows = items.map(it => {
    const name  = it.product?.name || '—'
    const qty   = it.quantity || 1
    const price = it.price    || 0
    const total = it.total    || (qty * price)
    return `<tr>
      <td style="padding:3px 0;vertical-align:top">${name}</td>
      <td style="text-align:center;padding:3px 4px;white-space:nowrap">${qty} × ${fmt(price)}</td>
      <td style="text-align:right;padding:3px 0;white-space:nowrap;font-weight:600">${fmt(total)}</td>
    </tr>`
  }).join('')

  const discRow = (bill.discount  || 0) > 0
    ? `<tr><td colspan="2" style="padding:2px 0">Discount</td><td style="text-align:right;color:#10b981;padding:2px 0">- ${fmt(bill.discount)}</td></tr>` : ''
  const taxRow  = (bill.taxAmount || 0) > 0
    ? `<tr><td colspan="2" style="padding:2px 0">Tax / GST</td><td style="text-align:right;padding:2px 0">${fmt(bill.taxAmount)}</td></tr>` : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Bill #${bill.billNumber || bill.id}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',Courier,monospace;font-size:12px;color:#000;width:302px;margin:0 auto;padding:8px}
  .c{text-align:center} .b{font-weight:700} .lg{font-size:16px}
  .div{border-top:1px dashed #000;margin:6px 0}
  table{width:100%;border-collapse:collapse;font-size:11px}
  .foot{text-align:center;font-size:11px;margin-top:8px;color:#555}
  @media print{body{width:100%}}
</style></head><body>
<div class="c b lg">${rName}</div>
${rAddress ? `<div class="c" style="font-size:11px;margin-top:2px">${rAddress}</div>` : ''}
${rPhone   ? `<div class="c" style="font-size:11px">Ph: ${rPhone}</div>` : ''}
${rGst     ? `<div class="c" style="font-size:10px">GSTIN: ${rGst}</div>` : ''}
${rFssai   ? `<div class="c" style="font-size:10px">FSSAI: ${rFssai}</div>` : ''}
<div class="div"></div>
<div style="display:flex;justify-content:space-between;font-size:11px">
  <span class="b">Bill #${bill.billNumber || bill.id}</span>
  <span>${fmtDate(bill.createdAt)}</span>
</div>
${bill.customerName  ? `<div style="font-size:11px">Customer: ${bill.customerName}</div>`  : ''}
${bill.customerPhone ? `<div style="font-size:11px">Phone: ${bill.customerPhone}</div>`    : ''}
${bill.tableNumber   ? `<div style="font-size:11px">Table: ${bill.tableNumber}</div>`      : ''}
<div style="font-size:11px">Type: ${ORDER_LABELS[bill.orderType] || bill.orderType || '—'}</div>
<div class="div"></div>
<table>
  <thead><tr style="border-bottom:1px solid #000">
    <th style="text-align:left;padding-bottom:3px">Item</th>
    <th style="text-align:center">Qty × Rate</th>
    <th style="text-align:right">Amt</th>
  </tr></thead>
  <tbody>${itemRows}</tbody>
</table>
<div class="div"></div>
<table style="font-size:12px">
  <tr><td colspan="2" style="padding:2px 0">Subtotal</td><td style="text-align:right;padding:2px 0">${fmt(bill.subtotal)}</td></tr>
  ${discRow}${taxRow}
  <tr><td colspan="2" style="padding:4px 0;font-weight:700;font-size:14px">TOTAL</td>
      <td style="text-align:right;padding:4px 0;font-weight:700;font-size:14px">${fmt(bill.finalAmount || bill.total)}</td></tr>
</table>
<div class="div"></div>
<div style="display:flex;justify-content:space-between;font-size:12px">
  <span class="b">Payment: ${bill.paymentMode || '—'}</span>
  <span style="color:${bill.paymentStatus === 'PENDING' ? '#c00' : '#080'}">${bill.paymentStatus || 'PAID'}</span>
</div>
${bill.notes ? `<div style="font-size:11px;margin-top:4px;color:#555">Note: ${bill.notes}</div>` : ''}
<div class="div"></div>
<div class="foot">Thank you for visiting!<br>Please come again ☺</div>
</body></html>`

  const w = window.open('', '_blank', 'width=420,height=640')
  if (!w) { alert('Popup blocked — browser mein popup allow karo'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 500)
}

// ── Split By Person Modal ─────────────────────────────────────────────────
function SplitByPersonModal({ bill, onClose }) {
  const toast = useToast()
  const [persons,     setPersons]     = useState(2)
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState(null)  // { perPerson, splits[] }

  const total = bill?.finalAmount || bill?.total || 0

  async function handleCalculate() {
    if (persons < 2 || persons > 20) { toast.error('Persons 2 se 20 ke beech hone chahiye'); return }
    setLoading(true)
    setResult(null)
    try {
      const { token } = useAuthStore.getState()
      const BASE = import.meta.env.VITE_API_URL || ''
      const res = await fetch(
        `${BASE}/api/v1/bills/${bill.id}/split-equal?persons=${persons}&paymentMode=${paymentMode}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Split calculate nahi hua')
      }
      const data = await res.json()
      // API returns array of splits or a summary object; handle both shapes
      if (Array.isArray(data)) {
        setResult({ perPerson: data[0]?.amount ?? (total / persons), splits: data })
      } else {
        const perPerson = data.perPersonAmount ?? data.perPerson ?? (total / persons)
        const splits = data.splits ?? Array.from({ length: persons }, (_, i) => ({
          personNumber: i + 1, amount: perPerson,
        }))
        setResult({ perPerson, splits })
      }
    } catch (e) {
      // Fallback: calculate client-side
      const perPerson = Math.ceil(total / persons)
      const splits = Array.from({ length: persons }, (_, i) => ({
        personNumber: i + 1, amount: perPerson,
      }))
      setResult({ perPerson, splits })
      toast.success('Calculated locally (API not reached)')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!result) return
    const lines = [
      `Bill #${bill.billNumber || bill.id} — Split by ${persons} persons`,
      `Total: ₹${total.toLocaleString('en-IN')} | Per Person: ₹${result.perPerson.toLocaleString('en-IN')}`,
      `Payment: ${paymentMode}`,
      '',
      ...result.splits.map(s => `Person ${s.personNumber}: ₹${Number(s.amount).toLocaleString('en-IN')}`),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    toast.success('Split breakdown copied!')
  }

  function handleBackdrop(e) { if (e.target === e.currentTarget) onClose() }

  return (
    <div onClick={handleBackdrop} style={{
      position: 'fixed', inset: 0, background: '#0009', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 14, padding: '1.5rem',
        width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 24px 64px #0008',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              👥 Split by Person
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              Bill #{bill?.billNumber || bill?.id} · Total: ₹{total.toLocaleString('en-IN')}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
            color: '#94a3b8', lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600,
              letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
              NUMBER OF PERSONS
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPersons(p => Math.max(2, p - 1))} style={{
                width: 34, height: 34, borderRadius: 8, border: '1px solid #475569',
                background: '#334155', color: '#fff', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>−</button>
              <input type="number" value={persons} min={2} max={20}
                onChange={e => setPersons(Math.min(20, Math.max(2, parseInt(e.target.value) || 2)))}
                style={{
                  width: 60, textAlign: 'center', padding: '7px 10px', borderRadius: 8,
                  border: '1px solid #475569', background: '#334155',
                  color: '#fff', fontSize: 16, fontWeight: 700,
                }} />
              <button onClick={() => setPersons(p => Math.min(20, p + 1))} style={{
                width: 34, height: 34, borderRadius: 8, border: '1px solid #475569',
                background: '#334155', color: '#fff', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>+</button>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>persons (max 20)</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600,
              letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
              PAYMENT MODE
            </label>
            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{
              background: '#334155', border: '1px solid #475569', color: '#fff',
              padding: '8px 12px', borderRadius: 8, width: '100%', fontSize: 13,
            }}>
              {['CASH', 'UPI', 'CARD'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Quick preview */}
          <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Estimated per person</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
              ₹{Math.ceil(total / persons).toLocaleString('en-IN')}
            </span>
          </div>

          <button onClick={handleCalculate} disabled={loading} style={{
            background: loading ? '#475569' : '#3b82f6', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 16px', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600,
          }}>
            {loading ? '⏳ Calculating...' : '🔢 Calculate Split'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div style={{ border: '1px solid #22c55e44', borderRadius: 10,
            background: '#22c55e0a', padding: '1rem' }}>
            {/* Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700,
                  letterSpacing: '0.06em' }}>SPLIT RESULT</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                  ₹{Number(result.perPerson).toLocaleString('en-IN')}
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}> / person</span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                  Total ₹{total.toLocaleString('en-IN')} · {persons} persons · {paymentMode}
                </div>
              </div>
              <button onClick={handleCopy} style={{
                background: '#1e293b', border: '1px solid #475569', color: '#94a3b8',
                borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 11,
              }}>📋 Copy</button>
            </div>

            {/* Per-person list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {result.splits.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 10px', borderRadius: 7,
                  background: i % 2 === 0 ? '#334155' : '#1e293b',
                  fontSize: 13,
                }}>
                  <span style={{ color: '#cbd5e1' }}>
                    👤 Person {s.personNumber || (i + 1)}
                  </span>
                  <span style={{ fontWeight: 700, color: '#22c55e' }}>
                    ₹{Number(s.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Print hint */}
            <div style={{ marginTop: 10, padding: '7px 10px', background: '#1e293b',
              borderRadius: 7, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
              💡 Print ke liye browser Ctrl+P use karo ya Copy karke share karo
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Bill Detail Modal ─────────────────────────────────────────────────────
function BillDetailModal({ billId, restaurant, onClose }) {
  const toast = useToast()
  const [bill,         setBill]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [sending,      setSending]      = useState(false)
  const [irnLoading,   setIrnLoading]   = useState(false)
  const [buyerGstin,   setBuyerGstin]   = useState('')
  const [eInvoice,     setEInvoice]     = useState(null)
  const [mode,         setMode]         = useState('view') // 'view' | 'split' | 'merge'
  const [splitItems,   setSplitItems]   = useState([])     // selected item ids for split
  const [splitTable,   setSplitTable]   = useState('')
  const [mergeBillId,  setMergeBillId]  = useState('')
  const [actionLoading,setActionLoading]= useState(false)
  const [showSplitByPerson, setShowSplitByPerson] = useState(false)

  async function handleSendWhatsApp() {
    setSending(true)
    try {
      await billApi.sendWhatsApp(billId)
      toast.success('Bill WhatsApp pe bhej diya! ✅')
    } catch (e) {
      toast.error(e.message || 'WhatsApp send nahi hua')
    } finally {
      setSending(false)
    }
  }

  async function handleGenerateIrn() {
    if (!restaurant?.gstNumber) {
      toast.error('Settings mein restaurant GSTIN pehle fill karo')
      return
    }
    setIrnLoading(true)
    try {
      const { token } = useAuthStore.getState()
      const BASE = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${BASE}/api/v1/bills/${billId}/e-invoice/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ buyerGstin: buyerGstin.trim().toUpperCase() || null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'IRN generate nahi hua')
      }
      const updated = await res.json()
      setBill(updated)
      setEInvoice({
        irn: updated.irn, ackNo: updated.ackNo, ackDate: updated.ackDate,
        buyerGstin: updated.buyerGstin, eInvoiceQr: updated.eInvoiceQr, generated: true,
      })
      toast.success('IRN generate ho gaya! ✅')
    } catch (e) {
      toast.error(e.message || 'IRN generation failed')
    } finally {
      setIrnLoading(false)
    }
  }

  async function handleSplit() {
    if (splitItems.length === 0) { toast.error('Koi item select nahi kiya'); return }
    if (splitItems.length === (bill.items || []).length) {
      toast.error('Saare items split nahi kar sakte')
      return
    }
    setActionLoading(true)
    try {
      const { token } = useAuthStore.getState()
      const BASE = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${BASE}/api/v1/bills/${billId}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemIds: splitItems, newTableNumber: splitTable ? parseInt(splitTable) : null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Split nahi hua')
      }
      const result = await res.json()
      toast.success(`Bill split ho gaya! New Bill: #${result.newBill?.billNumber || ''}`)
      setBill(result.originalBill)
      setMode('view')
      setSplitItems([])
    } catch (e) {
      toast.error(e.message || 'Split failed')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleMerge() {
    if (!mergeBillId.trim()) { toast.error('Source Bill ID enter karo'); return }
    setActionLoading(true)
    try {
      const { token } = useAuthStore.getState()
      const BASE = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${BASE}/api/v1/bills/${billId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sourceBillId: parseInt(mergeBillId) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Merge nahi hua')
      }
      const merged = await res.json()
      toast.success('Bills merge ho gaye! ✅')
      setBill(merged)
      setMode('view')
      setMergeBillId('')
    } catch (e) {
      toast.error(e.message || 'Merge failed')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    billApi.getById(billId)
      .then(b => {
        setBill(b)
        if (b.irn) {
          setEInvoice({ irn: b.irn, ackNo: b.ackNo, ackDate: b.ackDate,
            buyerGstin: b.buyerGstin, eInvoiceQr: b.eInvoiceQr, generated: true })
        }
      })
      .catch(() => { toast.error('Bill load nahi hua'); onClose() })
      .finally(() => setLoading(false))
  }, [billId])

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  const overlayStyle = {
    position: 'fixed', inset: 0, background: '#0009', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  }
  const cardStyle = {
    background: 'var(--bg-card)', borderRadius: 16, padding: '1.75rem',
    width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 24px 64px #0006',
  }

  if (loading) return (
    <div style={overlayStyle} onClick={handleBackdrop}>
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: 200 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</span>
      </div>
    </div>
  )

  if (!bill) return null

  const items   = bill.items || []
  const otColor = ORDER_COLORS[bill.orderType] || '#888'
  const pmColor = PAY_COLORS[bill.paymentMode] || '#888'
  const psColor = bill.paymentStatus === 'PENDING' ? '#ef4444'
                : bill.paymentStatus === 'PARTIAL'  ? '#f59e0b' : '#10b981'

  return (
    <div style={overlayStyle} onClick={handleBackdrop}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>
              Bill #{bill.billNumber || bill.id}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {fmtDate(bill.createdAt)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => printReceipt(bill, restaurant)} style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
            }}>🖨️ Print</button>
            {bill.customerPhone && (
              <button onClick={handleSendWhatsApp} disabled={sending} style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: sending ? '#ccc' : '#25d366', color: '#fff',
                border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
              }}>{sending ? '⏳ Sending...' : '📲 WhatsApp'}</button>
            )}
            <button onClick={() => setShowSplitByPerson(true)} style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'var(--bg-secondary)',
              color: 'var(--text)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}>👥 Split by Person</button>
            <button onClick={() => setMode(mode === 'split' ? 'view' : 'split')} style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: mode === 'split' ? '#f59e0b' : 'var(--bg-secondary)',
              color: mode === 'split' ? '#fff' : 'var(--text)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}>✂️ Split</button>
            <button onClick={() => setMode(mode === 'merge' ? 'view' : 'merge')} style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: mode === 'merge' ? '#6366f1' : 'var(--bg-secondary)',
              color: mode === 'merge' ? '#fff' : 'var(--text)',
              border: '1px solid var(--border)', cursor: 'pointer',
            }}>⊞ Merge</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none',
              fontSize: 24, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1,
              padding: '0 4px' }}>×</button>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <Badge color={otColor}>{ORDER_LABELS[bill.orderType] || bill.orderType}</Badge>
          {bill.tableNumber && <Badge color="#6366f1">Table {bill.tableNumber}</Badge>}
          <Badge color={pmColor}>{bill.paymentMode || '—'}</Badge>
          <Badge color={psColor}>{bill.paymentStatus || 'PAID'}</Badge>
        </div>

        {/* Customer */}
        {(bill.customerName || bill.customerPhone) && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8,
            padding: '10px 14px', marginBottom: '1.25rem', fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              {bill.customerName  && <span style={{ fontWeight: 600 }}>👤 {bill.customerName}</span>}
              {bill.customerPhone && <span style={{ color: 'var(--text-muted)' }}>📞 {bill.customerPhone}</span>}
            </div>
          </div>
        )}

        {/* Items */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            letterSpacing: '0.06em', marginBottom: 8 }}>
            ORDER ITEMS ({items.length})
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {items.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Items available nahi hain
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    {['Item', 'Qty', 'Rate', 'Amount'].map((h, j) => (
                      <th key={h} style={{ padding: '8px 12px', fontSize: 11,
                        color: 'var(--text-muted)', fontWeight: 600,
                        textAlign: j === 0 ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={it.id || i} style={{
                      borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 500 }}>
                        {it.product?.name || '—'}
                        {it.product?.shortCode && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)',
                            background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 4 }}>
                            {it.product.shortCode}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                        {it.quantity}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                        {fmt(it.price)}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {fmt(it.total || (it.quantity * it.price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Totals */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8,
          overflow: 'hidden', marginBottom: bill.notes ? '1.25rem' : 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <SumRow label="Subtotal" value={fmt(bill.subtotal)} />
          </div>
          {(bill.discount || 0) > 0 && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <SumRow label="Discount" value={`- ${fmt(bill.discount)}`} color="#10b981" />
            </div>
          )}
          {(bill.taxAmount || 0) > 0 && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <SumRow label="Tax / GST" value={fmt(bill.taxAmount)} />
            </div>
          )}
          <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)' }}>
            <SumRow label="Total" value={fmt(bill.finalAmount || bill.total)} bold />
          </div>
        </div>

        {/* Notes */}
        {bill.notes && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8,
            padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)',
            marginBottom: '1.25rem' }}>
            📝 {bill.notes}
          </div>
        )}

        {/* ── SPLIT PANEL ── */}
        {mode === 'split' && (
          <div style={{ border: '2px solid #f59e0b', borderRadius: 10,
            padding: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b',
              letterSpacing: '0.06em', marginBottom: 10 }}>
              ✂️ SPLIT BILL — items select karo jo naye table pe jaenge
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {(bill.items || []).map(it => {
                const checked = splitItems.includes(it.id)
                return (
                  <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
                    background: checked ? '#f59e0b22' : 'var(--bg-secondary)',
                    border: `1px solid ${checked ? '#f59e0b' : 'var(--border)'}`,
                    fontSize: 13 }}>
                    <input type="checkbox" checked={checked}
                      onChange={() => setSplitItems(prev =>
                        checked ? prev.filter(x => x !== it.id) : [...prev, it.id]
                      )} style={{ accentColor: '#f59e0b' }} />
                    <span style={{ flex: 1 }}>{it.product?.name || '—'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {it.quantity} × {fmt(it.price)}
                    </span>
                    <span style={{ fontWeight: 600 }}>{fmt(it.total || (it.quantity * it.price))}</span>
                  </label>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="number" placeholder="Naya Table # (optional)"
                value={splitTable} onChange={e => setSplitTable(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 7, width: 180,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text)', fontSize: 12 }} />
              <button onClick={handleSplit} disabled={actionLoading || splitItems.length === 0}
                style={{ padding: '7px 18px', borderRadius: 7, border: 'none',
                  background: actionLoading || splitItems.length === 0 ? '#ccc' : '#f59e0b',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: actionLoading || splitItems.length === 0 ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? '⏳...' : `✂️ Split ${splitItems.length} item${splitItems.length !== 1 ? 's' : ''}`}
              </button>
              <button onClick={() => { setMode('view'); setSplitItems([]); setSplitTable('') }}
                style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'none', fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── MERGE PANEL ── */}
        {mode === 'merge' && (
          <div style={{ border: '2px solid #6366f1', borderRadius: 10,
            padding: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1',
              letterSpacing: '0.06em', marginBottom: 8 }}>
              ⊞ MERGE INTO THIS BILL — dusre bill ke saare items yahan aa jaenge
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Source bill ka ID enter karo. Woh bill delete ho jaega, uske items is bill mein add honge.
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" placeholder="Source Bill ID"
                value={mergeBillId} onChange={e => setMergeBillId(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 7, width: 160,
                  border: '1px solid #6366f1', background: 'var(--bg-card)',
                  color: 'var(--text)', fontSize: 12 }} />
              <button onClick={handleMerge} disabled={actionLoading || !mergeBillId.trim()}
                style={{ padding: '7px 18px', borderRadius: 7, border: 'none',
                  background: actionLoading || !mergeBillId.trim() ? '#ccc' : '#6366f1',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: actionLoading || !mergeBillId.trim() ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? '⏳...' : '⊞ Merge Bills'}
              </button>
              <button onClick={() => { setMode('view'); setMergeBillId('') }}
                style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'none', fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Split By Person Modal — rendered inside BillDetailModal overlay */}
        {showSplitByPerson && (
          <SplitByPersonModal bill={bill} onClose={() => setShowSplitByPerson(false)} />
        )}

        {/* E-Invoice / IRN */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 10,
          padding: '1rem', marginTop: bill.notes ? 0 : '1.25rem' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
            letterSpacing: '0.06em', marginBottom: 10 }}>
            🧾 E-INVOICE (IRN)
          </div>

          {eInvoice?.generated ? (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>IRN</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all',
                    color: 'var(--text)', background: 'var(--bg-secondary)',
                    padding: '3px 6px', borderRadius: 4 }}>
                    {eInvoice.irn}
                  </span>
                  <button onClick={() => { navigator.clipboard.writeText(eInvoice.irn); toast.success('IRN copied!') }}
                    style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)',
                      background: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)',
                      flexShrink: 0 }}>Copy</button>
                </div>
                {eInvoice.ackNo && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>Ack No</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{eInvoice.ackNo}</span>
                  </div>
                )}
                {eInvoice.ackDate && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>Ack Date</span>
                    <span style={{ fontSize: 11 }}>{new Date(eInvoice.ackDate).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {eInvoice.buyerGstin && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>Buyer GSTIN</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{eInvoice.buyerGstin}</span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, padding: '8px 10px', background: '#10b98120',
                borderRadius: 6, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                ✅ IRN Generated — Valid for GST compliance
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                B2B invoices ₹5 lakh+ ke liye IRN mandatory hai (GSTN mandate).
                Seller GSTIN Settings mein set karo.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Buyer GSTIN (optional)"
                  value={buyerGstin}
                  onChange={e => setBuyerGstin(e.target.value.toUpperCase())}
                  maxLength={15}
                  style={{ padding: '7px 10px', borderRadius: 7,
                    border: '1px solid var(--border)', background: 'var(--bg-card)',
                    color: 'var(--text)', fontSize: 12, width: 200, fontFamily: 'monospace' }}
                />
                <button
                  onClick={handleGenerateIrn}
                  disabled={irnLoading}
                  style={{ padding: '7px 16px', borderRadius: 7, border: 'none',
                    background: irnLoading ? '#ccc' : '#7c3aed',
                    color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: irnLoading ? 'not-allowed' : 'pointer' }}>
                  {irnLoading ? '⏳ Generating...' : '🧾 Generate IRN'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function Bills() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [bills,      setBills]      = useState([])
  const [page,       setPage]       = useState(0)
  const [total,      setTotal]      = useState(0)
  const [totalPg,    setTotalPg]    = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [mode,       setMode]       = useState('ALL')
  const [from,       setFrom]       = useState('')
  const [to,         setTo]         = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [restaurant, setRestaurant] = useState(null)

  // Restaurant info for receipt header
  useEffect(() => {
    api.get(`/restaurants/${rid}`).then(setRestaurant).catch(() => {})
  }, [rid])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, size: 20 })
      if (mode !== 'ALL') params.set('paymentMode', mode)
      if (from) params.set('from', from)
      if (to)   params.set('to',   to)
      const res = await billApi.getAll(rid, params.toString())
      if (res?.content) {
        setBills(res.content)
        setTotal(res.totalElements || 0)
        setTotalPg(res.totalPages  || 1)
      }
    } catch (_) {
      setBills(MOCK_BILLS)
      setTotal(5); setTotalPg(1)
    } finally {
      setLoading(false)
    }
  }, [rid, page, mode, from, to])

  useEffect(() => { load() }, [load])

  function handleModeChange(m) { setMode(m); setPage(0) }
  function clearDates() { setFrom(''); setTo(''); setPage(0) }

  const inputStyle = {
    padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--bg-card)', color: 'var(--text)', fontSize: 12,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>🧾 Bills</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          {total.toLocaleString('en-IN')} bills · row click karo details dekhne ke liye
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        marginBottom: '1rem' }}>
        {/* Date range */}
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0) }}
          style={inputStyle} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
        <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(0) }}
          style={inputStyle} />
        {(from || to) && (
          <button onClick={clearDates} style={{ ...inputStyle, cursor: 'pointer',
            color: 'var(--text-muted)' }}>✕ Clear</button>
        )}

        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

        {/* Payment mode */}
        {MODES.map(m => (
          <button key={m} onClick={() => handleModeChange(m)} style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
            fontSize: 12, cursor: 'pointer', fontWeight: mode === m ? 600 : 400,
            background: mode === m ? 'var(--accent-bg)' : 'var(--bg-card)',
            color:      mode === m ? 'var(--accent)'    : 'var(--text-muted)',
          }}>{m}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-page)' }}>
              {['Bill #', 'Customer', 'Items', 'Amount', 'Payment', 'Type', 'Date'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11,
                  color: 'var(--text-muted)', fontWeight: 500,
                  borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '13px 16px',
                        borderBottom: '1px solid var(--border)' }}>
                        <div style={{ height: 13, borderRadius: 4, background: 'var(--border)',
                          width: j === 0 ? 50 : 90 }} />
                      </td>
                    ))}
                  </tr>
                ))
              : bills.map(b => (
                  <tr key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)',
                      fontWeight: 700, color: 'var(--accent)' }}>
                      #{b.billNumber || b.id}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      {b.customerName || b.customerPhone
                        || <span style={{ color: 'var(--text-muted)' }}>Guest</span>}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)',
                      color: 'var(--text-muted)' }}>
                      {b.itemCount ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)',
                      fontWeight: 600 }}>
                      {fmt(b.finalAmount || b.total)}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <Badge color={PAY_COLORS[b.paymentMode] || '#888'}>
                        {b.paymentMode || '—'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <Badge color={ORDER_COLORS[b.orderType] || '#888'}>
                        {ORDER_LABELS[b.orderType] || b.orderType?.replace('_', ' ') || '—'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)',
                      color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {b.createdAt
                        ? new Date(b.createdAt).toLocaleString('en-IN',
                            { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {!loading && bills.length === 0 && (
          <div style={{ textAlign: 'center', padding: '52px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Koi bill nahi mila</div>
            <div style={{ fontSize: 12 }}>Filter change karo ya date range clear karo</div>
          </div>
        )}

        {/* Pagination */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Page {page + 1} of {totalPg} · {total.toLocaleString('en-IN')} bills
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg-card)', cursor: page === 0 ? 'not-allowed' : 'pointer',
              fontSize: 12, color: 'var(--text-muted)', opacity: page === 0 ? 0.4 : 1,
            }}>← Prev</button>
            <button disabled={page >= totalPg - 1} onClick={() => setPage(p => p + 1)} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg-card)', cursor: page >= totalPg - 1 ? 'not-allowed' : 'pointer',
              fontSize: 12, color: 'var(--text-muted)', opacity: page >= totalPg - 1 ? 0.4 : 1,
            }}>Next →</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <BillDetailModal
          billId={selectedId}
          restaurant={restaurant}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

// ── Mock data (fallback when API unreachable) ─────────────────────────────
const MOCK_BILLS = [
  { id: 1001, billNumber: 'B-1001', customerName: 'Rahul Kumar',  itemCount: 4, total: 850,  finalAmount: 850,  paymentMode: 'UPI',  orderType: 'DINE_IN',  createdAt: new Date().toISOString() },
  { id: 1002, billNumber: 'B-1002', customerName: 'Priya Sharma', itemCount: 2, total: 320,  finalAmount: 320,  paymentMode: 'CASH', orderType: 'PICKUP',   createdAt: new Date().toISOString() },
  { id: 1003, billNumber: 'B-1003', customerName: 'Amit Verma',   itemCount: 6, total: 1450, finalAmount: 1450, paymentMode: 'CARD', orderType: 'DINE_IN',  createdAt: new Date().toISOString() },
  { id: 1004, billNumber: 'B-1004', customerName: 'Sneha Patel',  itemCount: 3, total: 560,  finalAmount: 560,  paymentMode: 'UPI',  orderType: 'DELIVERY', createdAt: new Date().toISOString() },
  { id: 1005, billNumber: 'B-1005', customerName: 'Ravi Singh',   itemCount: 1, total: 180,  finalAmount: 180,  paymentMode: 'CASH', orderType: 'PICKUP',   createdAt: new Date().toISOString() },
]
