import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

const PROVIDER_COLOR = {
  PINE_LABS:  { bg: '#ede9fe', color: '#6d28d9' },
  MSWIPE:     { bg: '#dbeafe', color: '#1d4ed8' },
  PAYTM_EDC:  { bg: '#cffafe', color: '#0e7490' },
}

const TXN_STATUS_COLOR = {
  PENDING: { bg: '#fef3c7', color: '#92400e' },
  SUCCESS: { bg: '#dcfce7', color: '#16A34A' },
  FAILED:  { bg: '#fee2e2', color: '#DC2626' },
}

function ProviderBadge({ provider }) {
  const c = PROVIDER_COLOR[provider] ?? { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ ...c, padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
      {provider}
    </span>
  )
}

function StatusBadge({ status }) {
  const c = TXN_STATUS_COLOR[status] ?? { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ ...c, padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
      {status}
    </span>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function EdcTerminals() {
  const [tab,          setTab]          = useState('terminals')
  const [terminals,    setTerminals]    = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [txnLoading,   setTxnLoading]   = useState(false)

  // Add/Edit modal
  const [modal,    setModal]    = useState(null)  // null | 'add' | 'edit'
  const [editing,  setEditing]  = useState(null)  // terminal object
  const [tForm,    setTForm]    = useState({ terminalId: '', label: '', provider: 'PINE_LABS' })
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)

  // Test payment modal
  const [testModal,    setTestModal]    = useState(null)  // terminal id
  const [testAmount,   setTestAmount]   = useState('')
  const [testOrderRef, setTestOrderRef] = useState('')
  const [testResult,   setTestResult]   = useState(null)
  const [testing,      setTesting]      = useState(false)

  const loadTerminals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/edc/terminals')
      setTerminals(Array.isArray(data) ? data : [])
    } catch (_) {}
    setLoading(false)
  }, [])

  const loadTransactions = useCallback(async () => {
    setTxnLoading(true)
    try {
      const data = await api.get('/edc/transactions')
      setTransactions(Array.isArray(data) ? data : [])
    } catch (_) {}
    setTxnLoading(false)
  }, [])

  useEffect(() => { loadTerminals() }, [loadTerminals])

  function openAdd() {
    setEditing(null)
    setTForm({ terminalId: '', label: '', provider: 'PINE_LABS' })
    setModal('add')
  }

  function openEdit(t) {
    setEditing(t)
    setTForm({ terminalId: t.terminalId, label: t.label, provider: t.provider })
    setModal('edit')
  }

  function closeModal() { setModal(null); setEditing(null) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'add') {
        await api.post('/edc/terminals', tForm)
      } else {
        await api.put(`/edc/terminals/${editing.id}`, { label: tForm.label, provider: tForm.provider, status: editing.status })
      }
      closeModal()
      loadTerminals()
    } catch (err) {
      alert(err.message ?? 'Save failed')
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Is terminal ko delete karein?')) return
    setDeleting(id)
    try {
      await api.delete(`/edc/terminals/${id}`)
      loadTerminals()
    } catch (err) {
      alert(err.message ?? 'Delete failed')
    }
    setDeleting(null)
  }

  function openTest(terminal) {
    setTestModal(terminal)
    setTestAmount('')
    setTestOrderRef('REF-' + Date.now())
    setTestResult(null)
  }

  async function handleTest(e) {
    e.preventDefault()
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.post(`/edc/terminals/${testModal.id}/initiate`, {
        amount: parseFloat(testAmount),
        merchantOrderRef: testOrderRef,
      })
      setTestResult(res)
    } catch (err) {
      setTestResult({ error: err.message ?? 'Initiation failed' })
    }
    setTesting(false)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', background: '#F7F8FA', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1C1C1C' }}>EDC Terminals</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>Manage card payment terminals connected to this restaurant</p>
        </div>
        {tab === 'terminals' && (
          <button onClick={openAdd} style={btnStyle('#FF5A00')}>+ Add Terminal</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', borderRadius: 10,
        padding: 4, width: 'fit-content', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
        {['terminals', 'transactions'].map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'transactions') loadTransactions() }} style={{
            padding: '7px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
            background: tab === t ? '#FF5A00' : 'transparent',
            color: tab === t ? '#fff' : '#666', cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {t === 'terminals' ? 'Terminals' : 'Transactions'}
          </button>
        ))}
      </div>

      {/* Terminals Tab */}
      {tab === 'terminals' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Label', 'Terminal ID', 'Provider', 'Status', 'Last Ping', 'Actions'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={emptyStyle}>Loading…</td></tr>
              ) : terminals.length === 0 ? (
                <tr><td colSpan={6} style={emptyStyle}>Koi terminal nahi. "Add Terminal" karo.</td></tr>
              ) : terminals.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}><span style={{ fontWeight: 600 }}>{t.label}</span></td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: '#666' }}>{t.terminalId}</td>
                  <td style={tdStyle}><ProviderBadge provider={t.provider} /></td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                      background: t.status === 'ACTIVE' ? '#dcfce7' : '#f3f4f6',
                      color: t.status === 'ACTIVE' ? '#16A34A' : '#6b7280',
                    }}>
                      {t.status ?? 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: '#666' }}>{fmtDate(t.lastPingAt)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(t)} style={outlineBtn('#6366f1')}>Edit</button>
                      <button onClick={() => openTest(t)} style={outlineBtn('#10b981')}>Test</button>
                      <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                        style={outlineBtn('#DC2626')}>{deleting === t.id ? '…' : 'Delete'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Terminal', 'Amount', 'Order Ref', 'Status', 'Initiated At'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txnLoading ? (
                <tr><td colSpan={5} style={emptyStyle}>Loading…</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={5} style={emptyStyle}>Koi transaction nahi mili.</td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>{tx.terminalLabel ?? tx.terminalId}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#1C1C1C' }}>₹{tx.amount?.toLocaleString()}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{tx.merchantOrderRef}</td>
                  <td style={tdStyle}><StatusBadge status={tx.status} /></td>
                  <td style={{ ...tdStyle, fontSize: 12, color: '#666' }}>{fmtDate(tx.initiatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div style={overlayStyle} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                {modal === 'add' ? 'Add Terminal' : 'Edit Terminal'}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>×</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {modal === 'add' && (
                <label style={labelStyle}>
                  Terminal ID *
                  <input required value={tForm.terminalId} onChange={e => setTForm(f => ({ ...f, terminalId: e.target.value }))}
                    placeholder="Device serial / terminal ID" style={inputStyle} />
                </label>
              )}
              <label style={labelStyle}>
                Label *
                <input required value={tForm.label} onChange={e => setTForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Counter 1" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Provider *
                <select required value={tForm.provider} onChange={e => setTForm(f => ({ ...f, provider: e.target.value }))} style={inputStyle}>
                  <option value="PINE_LABS">Pine Labs</option>
                  <option value="MSWIPE">mSwipe</option>
                  <option value="PAYTM_EDC">Paytm EDC</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="submit" disabled={saving} style={btnStyle('#FF5A00')}>
                  {saving ? 'Saving…' : modal === 'add' ? 'Add Terminal' : 'Save Changes'}
                </button>
                <button type="button" onClick={closeModal} style={btnStyle('#6b7280')}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Payment Modal */}
      {testModal && (
        <div style={overlayStyle} onClick={e => e.target === e.currentTarget && setTestModal(null)}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Test Payment — {testModal.label}</h3>
              <button onClick={() => setTestModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>×</button>
            </div>
            <form onSubmit={handleTest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>
                Amount (₹) *
                <input required type="number" min="1" step="0.01" value={testAmount}
                  onChange={e => setTestAmount(e.target.value)} placeholder="Enter amount" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Order Reference
                <input value={testOrderRef} onChange={e => setTestOrderRef(e.target.value)} style={inputStyle} />
              </label>
              <button type="submit" disabled={testing} style={btnStyle('#10b981')}>
                {testing ? 'Initiating…' : 'Initiate Payment'}
              </button>
            </form>
            {testResult && (
              <div style={{
                marginTop: 16, borderRadius: 8, padding: '12px 16px', fontSize: 13,
                background: testResult.error ? '#fee2e2' : '#dcfce7',
                color: testResult.error ? '#DC2626' : '#16A34A',
              }}>
                {testResult.error ? testResult.error : JSON.stringify(testResult, null, 2)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  padding: '12px 14px', textAlign: 'left', fontSize: 12,
  color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb',
}

const tdStyle = { padding: '10px 14px' }

const emptyStyle = { textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }

const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
})

const outlineBtn = (color) => ({
  background: 'none', border: `1px solid ${color}`, color, borderRadius: 6,
  padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
})

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151', fontWeight: 500,
}

const inputStyle = {
  padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14,
  outline: 'none', marginTop: 2, background: '#fff',
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: '#0007', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
}

const modalStyle = {
  background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460,
  boxShadow: '0 20px 60px rgba(0,0,0,.2)',
}
