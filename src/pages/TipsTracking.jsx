import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { billApi, extReportsApi } from '../api/client'

const MODE_COLOR = {
  CASH: { bg: '#d1fae5', color: '#065f46' },
  UPI:  { bg: '#dbeafe', color: '#1e40af' },
  CARD: { bg: '#ede9fe', color: '#5b21b6' },
}

export default function TipsTracking() {
  const { token, restaurantId } = useAuthStore()

  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom]         = useState(today)
  const [to, setTo]             = useState(today)
  const [summary, setSummary]   = useState([])
  const [bills, setBills]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [loadingBills, setLoadingBills] = useState(true)

  // Record tip form
  const [billId, setBillId]     = useState('')
  const [tipAmt, setTipAmt]     = useState('')
  const [tipMode, setTipMode]   = useState('CASH')
  const [recording, setRecording] = useState(false)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch(
        `/api/v1/reports/tips?from=${from}&to=${to}`,
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      ).then(r => r.json())
      setSummary(Array.isArray(data) ? data : [])
    } catch { setSummary([]) }
    setLoading(false)
  }, [from, to, token])

  const loadBills = useCallback(async () => {
    setLoadingBills(true)
    try {
      const data = await billApi.getAll(restaurantId)
      const arr = Array.isArray(data) ? data : (data?.content ?? [])
      setBills(arr.filter(b => b.tipAmount > 0))
    } catch { setBills([]) }
    setLoadingBills(false)
  }, [restaurantId])

  useEffect(() => { loadBills() }, [loadBills])

  async function handleLoad(e) {
    e.preventDefault()
    loadSummary()
  }

  async function handleRecordTip(e) {
    e.preventDefault()
    if (!billId) return alert('Enter a Bill ID')
    setRecording(true)
    try {
      await fetch(`/api/v1/bills/${billId}/tip`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipAmount: parseFloat(tipAmt), tipMode }),
      })
      setBillId('')
      setTipAmt('')
      setTipMode('CASH')
      loadBills()
      loadSummary()
    } catch (err) {
      alert(err.message ?? 'Failed to record tip')
    }
    setRecording(false)
  }

  // Derive summary cards from API data or from bills
  function getStat(mode) {
    const found = summary.find(s => s.tipMode === mode)
    if (found) return found
    const filtered = bills.filter(b => b.tipMode === mode)
    return { count: filtered.length, total: filtered.reduce((a, b) => a + (b.tipAmount || 0), 0) }
  }

  const totalTips   = bills.reduce((a, b) => a + (b.tipAmount || 0), 0)
  const cashStat    = getStat('CASH')
  const upiStat     = getStat('UPI')
  const cardStat    = getStat('CARD')

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Tips Tracking</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
          Record and view tips collected on bills
        </p>
      </div>

      {/* Date Range Filter */}
      <div style={panelStyle}>
        <form onSubmit={handleLoad} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={labelStyle}>
            From
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            To
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
          </label>
          <button type="submit" disabled={loading} style={btnStyle('#3b82f6')}>
            {loading ? 'Loading…' : 'Load'}
          </button>
        </form>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Tips', count: bills.length, amount: totalTips, color: '#6366f1' },
          { label: 'Cash Tips', count: cashStat.count, amount: cashStat.total, color: '#10b981' },
          { label: 'UPI Tips',  count: upiStat.count,  amount: upiStat.total,  color: '#3b82f6' },
          { label: 'Card Tips', count: cardStat.count, amount: cardStat.total, color: '#8b5cf6' },
        ].map(card => (
          <div key={card.label} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
            padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
          }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: card.color }}>
              ₹{card.amount.toFixed(2)}
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
              {card.count} transaction{card.count !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Record Tip */}
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Record Tip</h3>
        <form onSubmit={handleRecordTip} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={labelStyle}>
            Bill ID
            <input
              required value={billId}
              onChange={e => setBillId(e.target.value)}
              placeholder="e.g. 1042"
              style={{ ...inputStyle, width: 120 }}
            />
          </label>
          <label style={labelStyle}>
            Tip Amount (₹)
            <input
              type="number" min="0.01" step="0.01" required
              value={tipAmt} onChange={e => setTipAmt(e.target.value)}
              style={{ ...inputStyle, width: 130 }}
            />
          </label>
          <label style={labelStyle}>
            Mode
            <select value={tipMode} onChange={e => setTipMode(e.target.value)} style={inputStyle}>
              <option value="CASH">CASH</option>
              <option value="UPI">UPI</option>
              <option value="CARD">CARD</option>
            </select>
          </label>
          <button type="submit" disabled={recording} style={btnStyle('#10b981')}>
            {recording ? 'Recording…' : 'Record Tip'}
          </button>
        </form>
      </div>

      {/* Recent Bills with Tips */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 15 }}>
          Bills with Tips
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Bill #', 'Final Amount', 'Tip Amount', 'Tip Mode', 'Date'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingBills ? (
              <tr><td colSpan={5} style={emptyCell}>Loading…</td></tr>
            ) : bills.length === 0 ? (
              <tr><td colSpan={5} style={emptyCell}>No bills with tips recorded yet.</td></tr>
            ) : bills.map(b => (
              <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={tdStyle}>#{b.billNumber ?? b.id}</td>
                <td style={tdStyle}>₹{(b.finalAmount ?? b.totalAmount ?? 0).toFixed(2)}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#065f46' }}>₹{(b.tipAmount).toFixed(2)}</td>
                <td style={tdStyle}>
                  <span style={{
                    ...(MODE_COLOR[b.tipMode] ?? { bg: '#f3f4f6', color: '#374151' }),
                    padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    background: (MODE_COLOR[b.tipMode] ?? {}).bg,
                    color: (MODE_COLOR[b.tipMode] ?? {}).color,
                  }}>
                    {b.tipMode ?? '—'}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>
                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const panelStyle = {
  background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12,
  padding: 20, marginBottom: 20,
}
const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 500,
})
const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151', fontWeight: 500,
}
const inputStyle = {
  padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none',
}
const thStyle = {
  padding: '11px 14px', textAlign: 'left', fontSize: 12,
  color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb',
}
const tdStyle = { padding: '10px 14px' }
const emptyCell = { textAlign: 'center', padding: 40, color: '#9ca3af' }
