import { useState, useEffect, useCallback } from 'react'
import { giftCardApi } from '../api/client'

const STATUS_COLOR = {
  ACTIVE:    { bg: '#d1fae5', color: '#065f46' },
  EXHAUSTED: { bg: '#fee2e2', color: '#991b1b' },
  EXPIRED:   { bg: '#fef3c7', color: '#92400e' },
  CANCELLED: { bg: '#f3f4f6', color: '#6b7280' },
}

export default function GiftCards() {
  const [cards, setCards]     = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(0)
  const [loading, setLoading] = useState(true)
  const [showIssue, setShowIssue] = useState(false)
  const [showRedeem, setShowRedeem] = useState(false)
  const [showBalance, setShowBalance] = useState(false)

  // Issue form
  const [form, setForm] = useState({ amount: '', name: '', phone: '', expiryDate: '', notes: '' })
  const [issuing, setIssuing] = useState(false)
  const [issuedCard, setIssuedCard] = useState(null)

  // Redeem form
  const [redeemCode, setRedeemCode]     = useState('')
  const [redeemAmount, setRedeemAmount] = useState('')
  const [redeemResult, setRedeemResult] = useState(null)
  const [redeeming, setRedeeming]       = useState(false)

  // Balance check
  const [balanceCode, setBalanceCode] = useState('')
  const [balanceInfo, setBalanceInfo] = useState(null)
  const [checkingBal, setCheckingBal] = useState(false)

  const PAGE_SIZE = 20

  const load = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const data = await giftCardApi.list(p, PAGE_SIZE)
      setCards(data.content ?? [])
      setTotal(data.totalElements ?? 0)
      setPage(p)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load(0) }, [load])

  async function handleIssue(e) {
    e.preventDefault()
    setIssuing(true)
    try {
      const card = await giftCardApi.issue({
        amount:     parseFloat(form.amount),
        name:       form.name || null,
        phone:      form.phone || null,
        expiryDate: form.expiryDate || null,
        notes:      form.notes || null,
      })
      setIssuedCard(card)
      setForm({ amount: '', name: '', phone: '', expiryDate: '', notes: '' })
      load(0)
    } catch (err) {
      alert(err.message ?? 'Failed to issue gift card')
    }
    setIssuing(false)
  }

  async function handleRedeem(e) {
    e.preventDefault()
    setRedeeming(true)
    setRedeemResult(null)
    try {
      const res = await giftCardApi.redeem(redeemCode.trim().toUpperCase(), parseFloat(redeemAmount))
      setRedeemResult(res)
      load(0)
    } catch (err) {
      alert(err.message ?? 'Redemption failed')
    }
    setRedeeming(false)
  }

  async function handleBalance(e) {
    e.preventDefault()
    setCheckingBal(true)
    setBalanceInfo(null)
    try {
      const gc = await giftCardApi.balance(balanceCode.trim().toUpperCase())
      setBalanceInfo(gc)
    } catch (err) {
      alert(err.message ?? 'Not found')
    }
    setCheckingBal(false)
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this gift card?')) return
    try {
      await giftCardApi.cancel(id)
      load(page)
    } catch (err) {
      alert(err.message ?? 'Cancel failed')
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Gift Cards</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Issue, redeem, and manage gift cards
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setShowBalance(true); setShowIssue(false); setShowRedeem(false) }}
            style={btnStyle('#3b82f6')}>Check Balance</button>
          <button onClick={() => { setShowRedeem(true); setShowBalance(false); setShowIssue(false) }}
            style={btnStyle('#8b5cf6')}>Redeem</button>
          <button onClick={() => { setShowIssue(true); setShowRedeem(false); setShowBalance(false); setIssuedCard(null) }}
            style={btnStyle('#10b981')}>+ Issue Gift Card</button>
        </div>
      </div>

      {/* Issue Panel */}
      {showIssue && (
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Issue New Gift Card</h3>
          {issuedCard ? (
            <div style={{ background: '#d1fae5', borderRadius: 10, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#065f46', letterSpacing: 3 }}>
                {issuedCard.code}
              </div>
              <div style={{ color: '#065f46', marginTop: 8, fontSize: 15 }}>
                Gift card issued! Balance: ₹{issuedCard.currentBalance}
              </div>
              <button onClick={() => setIssuedCard(null)} style={{ ...btnStyle('#10b981'), marginTop: 14, fontSize: 13 }}>
                Issue Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleIssue} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={labelStyle}>
                Amount (₹) *
                <input type="number" min="1" step="0.01" required value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Customer Name
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Phone
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Expiry Date
                <input type="date" value={form.expiryDate}
                  onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} style={inputStyle} />
              </label>
              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                Notes
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
              </label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                <button type="submit" disabled={issuing} style={btnStyle('#10b981')}>
                  {issuing ? 'Issuing…' : 'Issue Gift Card'}
                </button>
                <button type="button" onClick={() => setShowIssue(false)} style={btnStyle('#6b7280')}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Redeem Panel */}
      {showRedeem && (
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Redeem Gift Card</h3>
          <form onSubmit={handleRedeem} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={labelStyle}>
              Gift Card Code
              <input required value={redeemCode} onChange={e => setRedeemCode(e.target.value)}
                placeholder="GC..." style={{ ...inputStyle, width: 200 }} />
            </label>
            <label style={labelStyle}>
              Amount to Redeem (₹)
              <input type="number" min="0.01" step="0.01" required value={redeemAmount}
                onChange={e => setRedeemAmount(e.target.value)} style={{ ...inputStyle, width: 140 }} />
            </label>
            <button type="submit" disabled={redeeming} style={btnStyle('#8b5cf6')}>
              {redeeming ? 'Processing…' : 'Redeem'}
            </button>
            <button type="button" onClick={() => { setShowRedeem(false); setRedeemResult(null) }} style={btnStyle('#6b7280')}>Close</button>
          </form>
          {redeemResult && (
            <div style={{ marginTop: 14, background: '#d1fae5', borderRadius: 8, padding: '12px 18px', fontSize: 14 }}>
              ✅ Redeemed ₹{redeemResult.redeemedAmount} — Remaining balance: ₹{redeemResult.remainingBalance} ({redeemResult.status})
            </div>
          )}
        </div>
      )}

      {/* Balance Check Panel */}
      {showBalance && (
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Check Balance</h3>
          <form onSubmit={handleBalance} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={labelStyle}>
              Gift Card Code
              <input required value={balanceCode} onChange={e => setBalanceCode(e.target.value)}
                placeholder="GC..." style={{ ...inputStyle, width: 220 }} />
            </label>
            <button type="submit" disabled={checkingBal} style={btnStyle('#3b82f6')}>
              {checkingBal ? 'Checking…' : 'Check'}
            </button>
            <button type="button" onClick={() => { setShowBalance(false); setBalanceInfo(null) }} style={btnStyle('#6b7280')}>Close</button>
          </form>
          {balanceInfo && (
            <div style={{ marginTop: 14, background: '#eff6ff', borderRadius: 8, padding: '12px 18px', fontSize: 14 }}>
              <strong>{balanceInfo.code}</strong> — Balance: ₹{balanceInfo.currentBalance} / ₹{balanceInfo.initialAmount}
              &nbsp;&nbsp;
              <span style={{ ...statusBadge(balanceInfo.status), padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                {balanceInfo.status}
              </span>
              {balanceInfo.expiryDate && <span style={{ color: '#6b7280', marginLeft: 10 }}>Expires: {balanceInfo.expiryDate}</span>}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Code', 'Issued To', 'Phone', 'Balance', 'Initial', 'Expiry', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading…</td></tr>
            ) : cards.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No gift cards yet. Issue one to get started.</td></tr>
            ) : cards.map(gc => (
              <tr key={gc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{gc.code}</td>
                <td style={{ padding: '10px 14px' }}>{gc.issuedToName ?? '—'}</td>
                <td style={{ padding: '10px 14px', color: '#6b7280' }}>{gc.issuedToPhone ?? '—'}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>₹{gc.currentBalance}</td>
                <td style={{ padding: '10px 14px', color: '#6b7280' }}>₹{gc.initialAmount}</td>
                <td style={{ padding: '10px 14px', color: '#6b7280' }}>{gc.expiryDate ?? '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ ...statusBadge(gc.status), padding: '3px 10px', borderRadius: 4, fontSize: 12 }}>
                    {gc.status}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {gc.status === 'ACTIVE' && (
                    <button onClick={() => handleCancel(gc.id)}
                      style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page === 0} onClick={() => load(page - 1)} style={paginBtn(page === 0)}>← Prev</button>
          <span style={{ lineHeight: '34px', fontSize: 13, color: '#6b7280' }}>Page {page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => load(page + 1)} style={paginBtn(page >= totalPages - 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}

function statusBadge(status) {
  return STATUS_COLOR[status] ?? { bg: '#f3f4f6', color: '#374151' }
}

const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 500,
})

const panelStyle = {
  background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12,
  padding: 20, marginBottom: 20,
}

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151', fontWeight: 500,
}

const inputStyle = {
  padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14,
  outline: 'none', marginTop: 2,
}

const paginBtn = (disabled) => ({
  padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db',
  background: disabled ? '#f3f4f6' : '#fff', color: disabled ? '#9ca3af' : '#374151',
  cursor: disabled ? 'default' : 'pointer', fontSize: 13,
})
