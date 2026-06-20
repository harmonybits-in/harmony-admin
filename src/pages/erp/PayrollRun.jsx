import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { erpPayrollApi } from '../../api/client'

const STATUS_STYLE = {
  DRAFT:    { bg: '#55555522', color: '#aaa' },
  APPROVED: { bg: '#10b98122', color: '#10b981' },
  PAID:     { bg: '#06b6d422', color: '#06b6d4' },
}

const PAYMENT_STATUS_STYLE = {
  PAID:    { bg: '#10b98122', color: '#10b981' },
  PENDING: { bg: '#f59e0b22', color: '#f59e0b' },
}

function StatusBadge({ status, map }) {
  const cfg = (map || STATUS_STYLE)[status] || { bg: '#33333322', color: '#888' }
  return (
    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700 }}>
      {status || '—'}
    </span>
  )
}

function fmt(n) {
  return (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })
}

function MonthModal({ onClose, onCreate }) {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [creating, setCreating] = useState(false)

  async function handle() {
    setCreating(true)
    try {
      await onCreate(month)
      onClose()
    } catch (e) {
      alert(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1A1A2E', border: '1px solid #2a2a3e', borderRadius: 14, padding: 28, width: 360, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>Create Payroll Run</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5, fontWeight: 600 }}>Month</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#0F0F1A', color: '#fff', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #2a2a3e', background: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handle} disabled={creating} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
            {creating ? 'Creating...' : 'Create Run'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PayrollRun() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedRun, setExpandedRun] = useState(null)
  const [payslips, setPayslips] = useState({})
  const [payslipsLoading, setPayslipsLoading] = useState({})

  function load() {
    setLoading(true)
    setError(null)
    erpPayrollApi.getRuns()
      .then(data => setRuns(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleCreate(month) {
    await erpPayrollApi.createRun(month)
    setMsg({ type: 'success', text: 'Payroll run created.' })
    load()
  }

  async function handleCompute(id) {
    try {
      await erpPayrollApi.computeRun(id)
      setMsg({ type: 'success', text: 'Payroll computed.' })
      load()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    }
  }

  async function handleApprove(id) {
    if (!confirm('Approve this payroll run?')) return
    try {
      await erpPayrollApi.approveRun(id)
      setMsg({ type: 'success', text: 'Payroll approved.' })
      load()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    }
  }

  async function togglePayslips(run) {
    if (expandedRun === run.id) { setExpandedRun(null); return }
    setExpandedRun(run.id)
    if (!payslips[run.id]) {
      setPayslipsLoading(p => ({ ...p, [run.id]: true }))
      try {
        const full = await erpPayrollApi.getRun(run.id)
        setPayslips(p => ({ ...p, [run.id]: full?.payslips || full?.employees || [] }))
      } catch (e) {
        setMsg({ type: 'error', text: e.message })
      } finally {
        setPayslipsLoading(p => ({ ...p, [run.id]: false }))
      }
    }
  }

  const thStyle = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '12px 14px', fontSize: 13, color: '#ccc', borderBottom: '1px solid #2a2a3e' }
  const psThStyle = { padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', background: '#1a1a1a' }
  const psTdStyle = { padding: '9px 12px', fontSize: 12, color: '#aaa', borderBottom: '1px solid #1a1a1a' }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Payroll Runs</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Monthly payroll processing for all ERP employees</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Create New Run
        </button>
      </div>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: msg.type === 'success' ? '#10b98122' : '#ef444422', color: msg.type === 'success' ? '#10b981' : '#ef4444', fontSize: 13, border: `1px solid ${msg.type === 'success' ? '#10b98133' : '#ef444433'}` }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading payroll runs...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>
        ) : runs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>No payroll runs yet. Create one to get started.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#2a2a3e' }}>
                  {['Month', 'Status', 'Total Gross', 'Total Net', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run, idx) => (
                  <>
                    <tr key={run.id || idx}
                      onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ ...tdStyle, color: '#fff', fontWeight: 600 }}>{run.month || '—'}</td>
                      <td style={tdStyle}><StatusBadge status={run.status} /></td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                        {run.totalGross != null ? `₹${fmt(run.totalGross)}` : '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#10b981', fontWeight: 600 }}>
                        {run.totalNet != null ? `₹${fmt(run.totalNet)}` : '—'}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {run.status === 'DRAFT' && (
                            <>
                              <button onClick={() => handleCompute(run.id)} style={{ padding: '5px 11px', borderRadius: 6, border: '1px solid #f59e0b33', background: 'transparent', color: '#f59e0b', fontSize: 12, cursor: 'pointer' }}>Compute</button>
                              <button onClick={() => handleApprove(run.id)} style={{ padding: '5px 11px', borderRadius: 6, border: '1px solid #10b98133', background: 'transparent', color: '#10b981', fontSize: 12, cursor: 'pointer' }}>Approve</button>
                            </>
                          )}
                          <button onClick={() => togglePayslips(run)} style={{ padding: '5px 11px', borderRadius: 6, border: '1px solid #2a2a3e', background: 'transparent', color: '#ccc', fontSize: 12, cursor: 'pointer' }}>
                            {expandedRun === run.id ? 'Hide' : 'View Payslips'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded payslips */}
                    {expandedRun === run.id && (
                      <tr key={`${run.id}-payslips`}>
                        <td colSpan={5} style={{ padding: 0, background: '#0F0F1A', borderBottom: '1px solid #2a2a3e' }}>
                          {payslipsLoading[run.id] ? (
                            <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 13 }}>Loading payslips...</div>
                          ) : (payslips[run.id] || []).length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: '#555', fontSize: 13 }}>No payslip data. Run "Compute" first.</div>
                          ) : (
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr>
                                    {['Employee', 'Vertical', 'Working Days', 'Present Days', 'Basic', 'HRA', 'Gross', 'PF', 'Net Payable', 'Payment Status'].map(h => (
                                      <th key={h} style={psThStyle}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {payslips[run.id].map((ps, pi) => (
                                    <tr key={pi}
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => navigate(`/erp/payroll-runs/${run.id}/payslip/${ps.employeeId || ps.empId || ps.id}`)}
                                      onMouseEnter={e => e.currentTarget.style.background = '#1a1a2e'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <td style={{ ...psTdStyle, color: '#fff', fontWeight: 500 }}>{ps.employeeName || ps.name || '—'}</td>
                                      <td style={psTdStyle}>{ps.vertical || '—'}</td>
                                      <td style={{ ...psTdStyle, textAlign: 'center' }}>{ps.workingDays || '—'}</td>
                                      <td style={{ ...psTdStyle, textAlign: 'center' }}>{ps.presentDays || '—'}</td>
                                      <td style={{ ...psTdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(ps.basic || ps.basicSalary)}</td>
                                      <td style={{ ...psTdStyle, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(ps.hra)}</td>
                                      <td style={{ ...psTdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#fff' }}>{fmt(ps.grossSalary || ps.gross)}</td>
                                      <td style={{ ...psTdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#f59e0b' }}>{fmt(ps.pfAmount || ps.pf)}</td>
                                      <td style={{ ...psTdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#10b981', fontWeight: 700 }}>{fmt(ps.netPayable || ps.net)}</td>
                                      <td style={psTdStyle}>
                                        <StatusBadge status={ps.paymentStatus || 'PENDING'} map={PAYMENT_STATUS_STYLE} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <MonthModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
