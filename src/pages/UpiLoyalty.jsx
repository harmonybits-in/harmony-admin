import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const BASE = (typeof window !== 'undefined' && window.__VITE_API_URL__)
  || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  || 'http://localhost:2026'

function apiFetch(path, opts = {}) {
  return fetch(BASE + path, opts).then(async r => {
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      throw new Error(body.message || r.statusText)
    }
    const ct = r.headers.get('content-type') || ''
    return ct.includes('application/json') ? r.json() : r.text()
  })
}

export default function UpiLoyalty() {
  const { token, restaurantId } = useAuthStore()

  const authH = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  // Config
  const [config, setConfig]       = useState({
    merchantVpa: '', rewardRatePer100: 1, redemptionPointsPerRupee: 10,
    minRedemptionPoints: 100, isEnabled: false,
  })
  const [configOpen, setConfigOpen]   = useState(false)
  const [savingCfg, setSavingCfg]     = useState(false)

  // Earn
  const [earnForm, setEarnForm] = useState({ customerPhone: '', customerVpa: '', billId: '', billAmount: '' })
  const [earnResult, setEarnResult] = useState(null)
  const [earning, setEarning]       = useState(false)

  // Redeem / Balance
  const [balPhone, setBalPhone]       = useState('')
  const [balData, setBalData]         = useState(null)
  const [checkingBal, setCheckingBal] = useState(false)
  const [redeemPts, setRedeemPts]     = useState('')
  const [redeemResult, setRedeemResult] = useState(null)
  const [redeeming, setRedeeming]     = useState(false)

  // Transactions
  const [txns, setTxns]               = useState([])
  const [loadingTxns, setLoadingTxns] = useState(true)

  const loadConfig = useCallback(async () => {
    try {
      const d = await apiFetch(`/api/v1/upi-loyalty/config`, { headers: authH })
      if (d) setConfig(d)
    } catch { /* ignore */ }
  }, [token])

  const loadTxns = useCallback(async () => {
    setLoadingTxns(true)
    try {
      const d = await apiFetch(`/api/v1/upi-loyalty/transactions`, { headers: authH })
      setTxns(Array.isArray(d) ? d : (d?.content ?? []))
    } catch { setTxns([]) }
    setLoadingTxns(false)
  }, [token])

  useEffect(() => { loadConfig(); loadTxns() }, [loadConfig, loadTxns])

  async function handleSaveConfig(e) {
    e.preventDefault()
    setSavingCfg(true)
    try {
      await apiFetch(`/api/v1/upi-loyalty/config`, {
        method: 'PUT', headers: authH, body: JSON.stringify(config),
      })
      alert('Config saved')
    } catch (err) { alert(err.message) }
    setSavingCfg(false)
  }

  async function handleEarn(e) {
    e.preventDefault()
    setEarning(true)
    setEarnResult(null)
    try {
      const res = await apiFetch(`/api/v1/upi-loyalty/earn`, {
        method: 'POST', headers: authH,
        body: JSON.stringify({
          customerPhone: earnForm.customerPhone,
          customerVpa:   earnForm.customerVpa,
          billId:        earnForm.billId ? parseInt(earnForm.billId) : null,
          billAmount:    parseFloat(earnForm.billAmount),
        }),
      })
      setEarnResult(res)
      setEarnForm({ customerPhone: '', customerVpa: '', billId: '', billAmount: '' })
      loadTxns()
    } catch (err) { alert(err.message) }
    setEarning(false)
  }

  async function handleCheckBalance(e) {
    e.preventDefault()
    setCheckingBal(true)
    setBalData(null)
    setRedeemResult(null)
    try {
      const d = await apiFetch(`/api/v1/upi-loyalty/balance?phone=${encodeURIComponent(balPhone)}`, { headers: authH })
      setBalData(d)
    } catch (err) { alert(err.message) }
    setCheckingBal(false)
  }

  async function handleRedeem(e) {
    e.preventDefault()
    setRedeeming(true)
    setRedeemResult(null)
    try {
      const res = await apiFetch(`/api/v1/upi-loyalty/redeem`, {
        method: 'POST', headers: authH,
        body: JSON.stringify({ customerPhone: balPhone, points: parseInt(redeemPts) }),
      })
      setRedeemResult(res)
      setRedeemPts('')
      loadTxns()
      // Refresh balance
      const d = await apiFetch(`/api/v1/upi-loyalty/balance?phone=${encodeURIComponent(balPhone)}`, { headers: authH })
      setBalData(d)
    } catch (err) { alert(err.message) }
    setRedeeming(false)
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>UPI Loyalty Program</h1>
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
          padding: '12px 18px', marginTop: 12, color: '#1e40af', fontSize: 14,
        }}>
          Earn &amp; redeem loyalty points on every UPI payment
        </div>
      </div>

      {/* Config Card (Collapsible) */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 20 }}>
        <button
          onClick={() => setConfigOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 15, fontWeight: 600,
          }}
        >
          <span>Program Configuration</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{configOpen ? '▲ Collapse' : '▼ Expand'}</span>
        </button>
        {configOpen && (
          <form onSubmit={handleSaveConfig} style={{ padding: '0 18px 18px', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <label style={labelStyle}>
                Merchant VPA
                <input value={config.merchantVpa}
                  onChange={e => setConfig(c => ({ ...c, merchantVpa: e.target.value }))}
                  placeholder="merchant@upi" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Reward Rate (points per ₹100)
                <input type="number" min="0" step="0.1" value={config.rewardRatePer100}
                  onChange={e => setConfig(c => ({ ...c, rewardRatePer100: parseFloat(e.target.value) }))}
                  style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Redemption (points per ₹1)
                <input type="number" min="1" value={config.redemptionPointsPerRupee}
                  onChange={e => setConfig(c => ({ ...c, redemptionPointsPerRupee: parseInt(e.target.value) }))}
                  style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Min Redemption Points
                <input type="number" min="0" value={config.minRedemptionPoints}
                  onChange={e => setConfig(c => ({ ...c, minRedemptionPoints: parseInt(e.target.value) }))}
                  style={inputStyle} />
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={config.isEnabled}
                  onChange={e => setConfig(c => ({ ...c, isEnabled: e.target.checked }))} />
                Program Enabled
              </label>
              <button type="submit" disabled={savingCfg} style={btnStyle('#6366f1')}>
                {savingCfg ? 'Saving…' : 'Save Config'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Two columns: Earn | Check & Redeem */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Left: Earn */}
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600 }}>Earn Points</h3>
          <form onSubmit={handleEarn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={labelStyle}>
              Customer Phone *
              <input required value={earnForm.customerPhone}
                onChange={e => setEarnForm(f => ({ ...f, customerPhone: e.target.value }))}
                placeholder="9876543210" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Customer VPA
              <input value={earnForm.customerVpa}
                onChange={e => setEarnForm(f => ({ ...f, customerVpa: e.target.value }))}
                placeholder="customer@upi" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Bill ID
              <input type="number" value={earnForm.billId}
                onChange={e => setEarnForm(f => ({ ...f, billId: e.target.value }))}
                placeholder="Optional" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Bill Amount (₹) *
              <input type="number" min="0.01" step="0.01" required value={earnForm.billAmount}
                onChange={e => setEarnForm(f => ({ ...f, billAmount: e.target.value }))}
                style={inputStyle} />
            </label>
            <button type="submit" disabled={earning} style={btnStyle('#10b981')}>
              {earning ? 'Processing…' : 'Process'}
            </button>
          </form>
          {earnResult && (
            <div style={{ marginTop: 14, background: '#d1fae5', borderRadius: 8, padding: '12px 16px', fontSize: 14 }}>
              Points earned: <strong>{earnResult.pointsEarned ?? earnResult.points ?? 0}</strong>
              {earnResult.newBalance != null && <span style={{ color: '#065f46', marginLeft: 8 }}>
                (Balance: {earnResult.newBalance})
              </span>}
            </div>
          )}
        </div>

        {/* Right: Check Balance & Redeem */}
        <div style={panelStyle}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600 }}>Check Balance &amp; Redeem</h3>
          <form onSubmit={handleCheckBalance} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
            <label style={{ ...labelStyle, flex: 1 }}>
              Customer Phone
              <input required value={balPhone} onChange={e => setBalPhone(e.target.value)}
                placeholder="9876543210" style={inputStyle} />
            </label>
            <button type="submit" disabled={checkingBal} style={btnStyle('#3b82f6')}>
              {checkingBal ? 'Checking…' : 'Check'}
            </button>
          </form>
          {balData && (
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 16px', fontSize: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Balance: <span style={{ color: '#1d4ed8', fontSize: 18 }}>{balData.points ?? balData.balance ?? 0}</span> pts</div>
              {balData.amountEquivalent != null && (
                <div style={{ color: '#6b7280' }}>Equivalent: ₹{balData.amountEquivalent}</div>
              )}
            </div>
          )}
          {balData && (
            <form onSubmit={handleRedeem} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <label style={{ ...labelStyle, flex: 1 }}>
                Redeem Points
                <input type="number" min="1" required value={redeemPts}
                  onChange={e => setRedeemPts(e.target.value)} placeholder="Points to redeem" style={inputStyle} />
              </label>
              <button type="submit" disabled={redeeming} style={btnStyle('#f59e0b')}>
                {redeeming ? 'Redeeming…' : 'Redeem'}
              </button>
            </form>
          )}
          {redeemResult && (
            <div style={{ marginTop: 12, background: '#fef3c7', borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>
              Redeemed {redeemResult.pointsRedeemed ?? redeemPts} pts
              {redeemResult.rupeeValue != null && <span> = ₹{redeemResult.rupeeValue}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 15 }}>
          Recent Transactions
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Customer Phone', 'Type', 'Points', 'Amount Equivalent', 'Date'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingTxns ? (
              <tr><td colSpan={5} style={emptyCell}>Loading…</td></tr>
            ) : txns.length === 0 ? (
              <tr><td colSpan={5} style={emptyCell}>No transactions yet.</td></tr>
            ) : txns.map((t, i) => (
              <tr key={t.id ?? i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={tdStyle}>{t.customerPhone}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    background: t.type === 'EARN' ? '#d1fae5' : '#fef3c7',
                    color: t.type === 'EARN' ? '#065f46' : '#92400e',
                  }}>
                    {t.type}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{t.points}</td>
                <td style={tdStyle}>{t.amountEquivalent != null ? `₹${t.amountEquivalent}` : '—'}</td>
                <td style={{ ...tdStyle, color: '#6b7280' }}>
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
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
  background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20,
}
const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
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
