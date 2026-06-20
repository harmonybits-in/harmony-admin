import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { erpVoucherApi, erpAccountApi, erpGstApi } from '../../api/client'

const VOUCHER_TYPES = ['SALES', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'JOURNAL']
const VERTICALS = ['RESTAURANT', 'JEWELLERY', 'SOFTWARE', 'COMMON']

const EMPTY_LINE = { accountId: '', accountName: '', debit: 0, credit: 0, hsnSac: '', gstRate: 0, narration: '' }

function fmt(n) {
  return (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

export default function VoucherEntry() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const today = new Date().toISOString().slice(0, 10)
  const [header, setHeader] = useState({
    voucherType: 'JOURNAL',
    date: today,
    vertical: 'COMMON',
    partyName: '',
    partyGstin: '',
    narration: '',
  })
  const [lines, setLines] = useState([{ ...EMPTY_LINE }, { ...EMPTY_LINE }])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [acSearch, setAcSearch] = useState({}) // {lineIdx: searchTerm}
  const [acOpen, setAcOpen] = useState(null)

  useEffect(() => {
    erpAccountApi.getAll().then(data => setAccounts(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isNew) {
      setLoading(true)
      erpVoucherApi.getById(id)
        .then(v => {
          if (!v) return
          setHeader({
            voucherType: v.voucherType || v.type || 'JOURNAL',
            date: v.date ? v.date.slice(0, 10) : today,
            vertical: v.vertical || 'COMMON',
            partyName: v.partyName || '',
            partyGstin: v.partyGstin || '',
            narration: v.narration || '',
          })
          if (Array.isArray(v.lines) && v.lines.length > 0) {
            setLines(v.lines.map(l => ({
              accountId: l.accountId || l.account?.id || '',
              accountName: l.accountName || l.account?.name || '',
              debit: parseFloat(l.debitAmount || l.debit || 0),
              credit: parseFloat(l.creditAmount || l.credit || 0),
              hsnSac: l.hsnSac || l.hsnCode || '',
              gstRate: parseFloat(l.gstRate || 0),
              narration: l.narration || '',
            })))
          }
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, [id])

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  function updateLine(idx, key, val) {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, [key]: val } : l))
  }

  function addLine() {
    setLines(ls => [...ls, { ...EMPTY_LINE }])
  }

  function removeLine(idx) {
    if (lines.length <= 2) return
    setLines(ls => ls.filter((_, i) => i !== idx))
  }

  function selectAccount(idx, acc) {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, accountId: acc.id, accountName: acc.name } : l))
    setAcOpen(null)
    setAcSearch(s => ({ ...s, [idx]: '' }))
  }

  async function handleSave() {
    if (!balanced) return setError('Voucher is not balanced. Total debits must equal total credits.')
    const dto = {
      ...header,
      lines: lines.map(l => ({
        accountId: l.accountId,
        debitAmount: parseFloat(l.debit) || 0,
        creditAmount: parseFloat(l.credit) || 0,
        hsnSac: l.hsnSac,
        gstRate: parseFloat(l.gstRate) || 0,
        narration: l.narration,
      })),
    }
    setSaving(true)
    setError(null)
    try {
      await erpVoucherApi.create(dto)
      setSuccessMsg('Voucher saved successfully!')
      setTimeout(() => navigate('/erp/vouchers'), 1500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredAccounts = (idx) => {
    const q = (acSearch[idx] || '').toLowerCase()
    if (!q) return accounts.slice(0, 20)
    return accounts.filter(a => a.name?.toLowerCase().includes(q) || a.code?.toLowerCase().includes(q)).slice(0, 20)
  }

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#0F0F1A', color: '#fff', fontSize: 13, boxSizing: 'border-box', outline: 'none' }
  const labelStyle = { display: 'block', fontSize: 12, color: '#888', marginBottom: 5, fontWeight: 600 }

  if (loading) return <div style={{ padding: 40, color: '#888', textAlign: 'center' }}>Loading voucher...</div>

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
          {isNew ? 'New Voucher Entry' : `Voucher #${id}`}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Double-entry accounting voucher</p>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: '#ef444422', color: '#ef4444', fontSize: 13, border: '1px solid #ef444433' }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: '#10b98122', color: '#10b981', fontSize: 13, border: '1px solid #10b98133' }}>
          {successMsg}
        </div>
      )}

      {/* Header section */}
      <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', padding: 22, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#fff' }}>Voucher Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          <div>
            <label style={labelStyle}>Voucher Type</label>
            <select value={header.voucherType} onChange={e => setHeader(h => ({ ...h, voucherType: e.target.value }))} style={inputStyle}>
              {VOUCHER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={header.date} onChange={e => setHeader(h => ({ ...h, date: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Business Vertical</label>
            <select value={header.vertical} onChange={e => setHeader(h => ({ ...h, vertical: e.target.value }))} style={inputStyle}>
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Party Name</label>
            <input type="text" value={header.partyName} onChange={e => setHeader(h => ({ ...h, partyName: e.target.value }))} placeholder="Party / Customer / Vendor" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Party GSTIN</label>
            <input type="text" value={header.partyGstin} onChange={e => setHeader(h => ({ ...h, partyGstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" style={inputStyle} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Narration</label>
            <input type="text" value={header.narration} onChange={e => setHeader(h => ({ ...h, narration: e.target.value }))} placeholder="Brief description of this voucher" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a3e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>Line Items</h3>
          <button onClick={addLine} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #863bff', background: '#863bff18', color: '#863bff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            + Add Line
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#2a2a3e' }}>
                {['Account', 'Debit (Dr)', 'Credit (Cr)', 'HSN/SAC', 'GST %', 'Narration', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #2a2a3e' }}>
                  {/* Account dropdown */}
                  <td style={{ padding: '8px 10px', minWidth: 200, position: 'relative' }}>
                    <input
                      type="text"
                      value={acOpen === idx ? (acSearch[idx] || '') : (line.accountName || '')}
                      onFocus={() => { setAcOpen(idx); setAcSearch(s => ({ ...s, [idx]: line.accountName || '' })) }}
                      onChange={e => { setAcSearch(s => ({ ...s, [idx]: e.target.value })); setAcOpen(idx) }}
                      placeholder="Search account..."
                      style={{ ...inputStyle, minWidth: 180 }}
                    />
                    {acOpen === idx && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1A2E', border: '1px solid #2a2a3e', borderRadius: 8, zIndex: 100, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                        {filteredAccounts(idx).length === 0 ? (
                          <div style={{ padding: '10px 14px', color: '#888', fontSize: 13 }}>No accounts found</div>
                        ) : filteredAccounts(idx).map(acc => (
                          <div
                            key={acc.id}
                            onClick={() => selectAccount(idx, acc)}
                            style={{ padding: '9px 14px', fontSize: 13, color: '#ccc', cursor: 'pointer', borderBottom: '1px solid #2a2a3e' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#2a2a3e'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ color: '#863bff', fontFamily: 'monospace', fontSize: 11 }}>{acc.code}</span> {acc.name}
                          </div>
                        ))}
                        <div
                          onClick={() => setAcOpen(null)}
                          style={{ padding: '8px 14px', fontSize: 12, color: '#555', cursor: 'pointer', textAlign: 'center' }}
                        >
                          Close
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <input
                      type="number"
                      value={line.debit || ''}
                      onChange={e => updateLine(idx, 'debit', e.target.value)}
                      placeholder="0.00"
                      style={{ ...inputStyle, minWidth: 100, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <input
                      type="number"
                      value={line.credit || ''}
                      onChange={e => updateLine(idx, 'credit', e.target.value)}
                      placeholder="0.00"
                      style={{ ...inputStyle, minWidth: 100, textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <input type="text" value={line.hsnSac} onChange={e => updateLine(idx, 'hsnSac', e.target.value)} placeholder="HSN/SAC" style={{ ...inputStyle, minWidth: 90 }} />
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <input type="number" value={line.gstRate || ''} onChange={e => updateLine(idx, 'gstRate', e.target.value)} placeholder="0" style={{ ...inputStyle, minWidth: 60, textAlign: 'center' }} />
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <input type="text" value={line.narration} onChange={e => updateLine(idx, 'narration', e.target.value)} placeholder="Line note" style={{ ...inputStyle, minWidth: 140 }} />
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <button
                      onClick={() => removeLine(idx)}
                      disabled={lines.length <= 2}
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #ef444433', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: lines.length <= 2 ? 'not-allowed' : 'pointer', opacity: lines.length <= 2 ? 0.4 : 1 }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr style={{ background: balanced ? '#10b98112' : '#ef444412', borderTop: '2px solid ' + (balanced ? '#10b98133' : '#ef444433') }}>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#fff' }}>Totals</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: balanced ? '#10b981' : '#ef4444' }}>
                  {fmt(totalDebit)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: balanced ? '#10b981' : '#ef4444' }}>
                  {fmt(totalCredit)}
                </td>
                <td colSpan={4} style={{ padding: '10px 12px', fontSize: 12, color: balanced ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {balanced ? 'Balanced' : `Difference: ${fmt(Math.abs(totalDebit - totalCredit))}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={() => navigate('/erp/vouchers')}
          style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #2a2a3e', background: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!balanced || saving}
          style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: balanced ? '#863bff' : '#444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: !balanced || saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving...' : 'Save Voucher'}
        </button>
      </div>
    </div>
  )
}
