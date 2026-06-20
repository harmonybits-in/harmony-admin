import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { erpVoucherApi } from '../../api/client'

const VOUCHER_TYPES = ['SALES', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'JOURNAL']
const VERTICALS = ['RESTAURANT', 'JEWELLERY', 'SOFTWARE']

const STATUS_STYLE = {
  DRAFT:     { bg: '#55555522', color: '#aaa' },
  POSTED:    { bg: '#10b98122', color: '#10b981' },
  CANCELLED: { bg: '#ef444422', color: '#ef4444' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_STYLE[status] || { bg: '#33333322', color: '#888' }
  return (
    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700 }}>
      {status || '—'}
    </span>
  )
}

export default function VoucherList() {
  const navigate = useNavigate()
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)

  // Filters
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(firstOfMonth)
  const [toDate, setToDate] = useState(today)
  const [filterType, setFilterType] = useState('')
  const [filterVertical, setFilterVertical] = useState('')

  function load() {
    setLoading(true)
    setError(null)
    const params = {}
    if (fromDate) params.from = fromDate
    if (toDate)   params.to   = toDate
    if (filterType)     params.type     = filterType
    if (filterVertical) params.vertical = filterVertical
    erpVoucherApi.getAll(params)
      .then(data => setVouchers(Array.isArray(data) ? data : (data?.content || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [fromDate, toDate, filterType, filterVertical])

  async function handleCancel(id, e) {
    e.stopPropagation()
    if (!confirm('Cancel this voucher?')) return
    try {
      await erpVoucherApi.cancel(id)
      setMsg({ type: 'success', text: 'Voucher cancelled.' })
      load()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }

  const thStyle = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '12px 14px', fontSize: 13, color: '#ccc', borderBottom: '1px solid #2a2a3e' }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Vouchers</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>All accounting vouchers</p>
        </div>
        <button
          onClick={() => navigate('/erp/vouchers/new')}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + New Voucher
        </button>
      </div>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: msg.type === 'success' ? '#10b98122' : '#ef444422', color: msg.type === 'success' ? '#10b981' : '#ef4444', fontSize: 13, border: `1px solid ${msg.type === 'success' ? '#10b98133' : '#ef444433'}` }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'From Date', type: 'date', value: fromDate, set: setFromDate },
          { label: 'To Date',   type: 'date', value: toDate,   set: setToDate   },
        ].map(f => (
          <div key={f.label}>
            <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.label}</label>
            <input
              type={f.type}
              value={f.value}
              onChange={e => f.set(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }}
            />
          </div>
        ))}
        <div>
          <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Type</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }}>
            <option value="">All Types</option>
            {VOUCHER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Vertical</label>
          <select value={filterVertical} onChange={e => setFilterVertical(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }}>
            <option value="">All Verticals</option>
            {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading vouchers...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>
        ) : vouchers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>No vouchers found for selected filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#2a2a3e' }}>
                  {['Voucher No', 'Date', 'Type', 'Vertical', 'Party', 'Amount', 'GST Amount', 'Status', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v, idx) => (
                  <tr
                    key={v.id || idx}
                    onClick={() => navigate(`/erp/vouchers/${v.id}`)}
                    style={{ cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...tdStyle, color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>{v.voucherNo || v.number || `#${v.id}`}</td>
                    <td style={tdStyle}>{v.date ? new Date(v.date).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={tdStyle}>{v.voucherType || v.type || '—'}</td>
                    <td style={tdStyle}>{v.vertical || '—'}</td>
                    <td style={tdStyle}>{v.partyName || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                      {(v.totalAmount || v.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                      {(v.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={tdStyle}><StatusBadge status={v.status} /></td>
                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                      {v.status === 'POSTED' && (
                        <button
                          onClick={(e) => handleCancel(v.id, e)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #ef444433', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
