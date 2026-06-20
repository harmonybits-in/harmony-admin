import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { erpPayrollApi } from '../../api/client'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function parseMonthLabel(month) {
  if (!month) return ''
  const parts = month.split('-')
  if (parts.length === 2) {
    const y = parts[0]; const m = parseInt(parts[1]) - 1
    return `${MONTH_NAMES[m] || month} ${y}`
  }
  return month
}

function fmt(n) {
  return (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

export default function PayslipView() {
  const { runId, empId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    erpPayrollApi.getPayslip(runId, empId)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [runId, empId])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading payslip...</div>
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>
  if (!data) return null

  const monthLabel = parseMonthLabel(data.month || data.run?.month || '')
  const totalGross = parseFloat(data.basic || data.basicSalary || 0) + parseFloat(data.hra || 0) + parseFloat(data.otherAllowances || 0)
  const totalDeductions = parseFloat(data.pfAmount || data.pf || 0)
  const netPayable = parseFloat(data.netPayable || data.net || 0) || (totalGross - totalDeductions)

  const tableStyle = { width: '100%', borderCollapse: 'collapse', marginBottom: 16 }
  const thStyle = { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', background: '#2a2a3e', textTransform: 'uppercase', letterSpacing: 0.5 }
  const tdStyle = { padding: '10px 14px', fontSize: 13, color: '#ccc', borderBottom: '1px solid #2a2a3e' }
  const tdAmtStyle = { ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #2a2a3e', background: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer' }}>
          ← Back
        </button>
        <button onClick={() => window.print()} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Print Payslip
        </button>
      </div>

      {/* Payslip card */}
      <div id="payslip-print" style={{ background: '#1A1A2E', borderRadius: 14, border: '1px solid #2a2a3e', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #863bff22, #1a1a2e)', borderBottom: '1px solid #2a2a3e', padding: '28px 28px 20px' }}>
          <div style={{ fontSize: 10, color: '#863bff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
            SALARY SLIP
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            HARMONY BITS PRIVATE LIMITED
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>Month</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 2 }}>{monthLabel || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>Pay Slip ID</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 2, fontFamily: 'monospace' }}>#{runId}-{empId}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Employee details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, padding: '16px 20px', background: '#0F0F1A', borderRadius: 10, border: '1px solid #2a2a3e' }}>
            {[
              { label: 'Employee Name', value: data.employeeName || data.name || '—' },
              { label: 'Department',    value: data.department  || '—' },
              { label: 'Designation',   value: data.designation || '—' },
              { label: 'Vertical',      value: data.vertical    || '—' },
              { label: 'Employee ID',   value: data.employeeId  || data.empId || empId },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Attendance</div>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>
                {data.presentDays ?? '—'} / {data.workingDays ?? '—'} days
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Earnings</div>
            <div style={{ background: '#0F0F1A', borderRadius: 8, border: '1px solid #2a2a3e', overflow: 'hidden' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Component</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Basic Salary',      value: data.basic || data.basicSalary },
                    { label: 'House Rent Allowance (HRA)', value: data.hra },
                    { label: 'Other Allowances',  value: data.otherAllowances },
                  ].map(row => (
                    <tr key={row.label}>
                      <td style={tdStyle}>{row.label}</td>
                      <td style={tdAmtStyle}>{fmt(row.value)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#10b98112' }}>
                    <td style={{ ...tdStyle, color: '#10b981', fontWeight: 700, borderBottom: 'none' }}>Total Gross Earnings</td>
                    <td style={{ ...tdAmtStyle, color: '#10b981', fontWeight: 700, fontSize: 15, borderBottom: 'none' }}>{fmt(totalGross)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Deductions */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Deductions</div>
            <div style={{ background: '#0F0F1A', borderRadius: 8, border: '1px solid #2a2a3e', overflow: 'hidden' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Component</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={tdStyle}>Provident Fund (PF)</td>
                    <td style={tdAmtStyle}>{fmt(data.pfAmount || data.pf)}</td>
                  </tr>
                  {data.otherDeductions > 0 && (
                    <tr>
                      <td style={tdStyle}>Other Deductions</td>
                      <td style={tdAmtStyle}>{fmt(data.otherDeductions)}</td>
                    </tr>
                  )}
                  <tr style={{ background: '#ef444412' }}>
                    <td style={{ ...tdStyle, color: '#ef4444', fontWeight: 700, borderBottom: 'none' }}>Total Deductions</td>
                    <td style={{ ...tdAmtStyle, color: '#ef4444', fontWeight: 700, fontSize: 15, borderBottom: 'none' }}>{fmt(totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Payable */}
          <div style={{ padding: '22px 24px', background: 'linear-gradient(135deg, #863bff22, #1a1a2e)', borderRadius: 12, border: '1px solid #863bff33', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Net Payable</div>
              <div style={{ fontSize: 11, color: '#555' }}>
                ({data.presentDays ?? '?'} present / {data.workingDays ?? '?'} working days)
              </div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#863bff', fontFamily: 'monospace', letterSpacing: -1 }}>
              ₹{fmt(netPayable)}
            </div>
          </div>

          <div style={{ marginTop: 20, fontSize: 11, color: '#555', textAlign: 'center' }}>
            This is a computer-generated salary slip and does not require a signature.
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body > * { display: none; }
          #payslip-print { display: block !important; background: white !important; color: black !important; border: none !important; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  )
}
