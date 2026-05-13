// src/pages/Payroll.jsx
import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

const MOCK_STAFF = [
  { id:1, name:'Ramesh Kumar', role:'Chef',    salaryType:'FIXED',  baseSalary:18000, attendanceDays:26, totalDays:30, totalWorkingHours:0,   advance:2000, loanBalance:5000, commissionPercent:0, totalSales:0 },
  { id:2, name:'Sunita Devi',  role:'Waiter',  salaryType:'FIXED',  baseSalary:12000, attendanceDays:30, totalDays:30, totalWorkingHours:0,   advance:0,    loanBalance:0,    commissionPercent:0, totalSales:0 },
  { id:3, name:'Mohan Lal',    role:'Cashier', salaryType:'DAILY',  baseSalary:500,   attendanceDays:28, totalDays:30, totalWorkingHours:0,   advance:1500, loanBalance:2000, commissionPercent:0, totalSales:0 },
  { id:4, name:'Anita Singh',  role:'Helper',  salaryType:'HOURS',  baseSalary:42,    attendanceDays:26, totalDays:30, totalWorkingHours:192, advance:0,    loanBalance:0,    commissionPercent:0, totalSales:0 },
  { id:5, name:'Vikram Yadav', role:'Delivery',salaryType:'COMMISSION', baseSalary:0, attendanceDays:26, totalDays:30, totalWorkingHours:0,  advance:0,    loanBalance:0,    commissionPercent:5, totalSales:45000 },
]

/**
 * Gross Salary Calculation:
 *
 * FIXED      → baseSalary × (attendanceDays / totalDays)
 * DAILY      → baseSalary(daily rate) × attendanceDays
 * HOURS      → baseSalary(hourly rate) × totalWorkingHours
 * COMMISSION → commissionPercent % of totalSales
 */
function calcSalary(s) {
  let gross = 0
  const salaryType    = s.salaryType || 'FIXED'
  const base          = Number(s.baseSalary)          || 0
  const attendanceDays= Number(s.attendanceDays)      || 0
  const totalDays     = Number(s.totalDays)           || 30
  const workingHours  = Number(s.totalWorkingHours) || Number(s.monthlyHours) || 0
  const totalSales    = Number(s.totalSales)          || 0
  const commPct       = Number(s.commissionPercent)   || 0

  if (salaryType === 'FIXED') {
    // Pro-rata: monthly salary × (days present / total days)
    gross = base * (attendanceDays / totalDays)
  } else if (salaryType === 'DAILY') {
    // Daily rate × days present
    gross = base * attendanceDays
  } else if (salaryType === 'HOURS') {
    // Hourly rate × total working hours
    gross = base * workingHours
  } else if (salaryType === 'COMMISSION') {
    // Commission % of total sales
    gross = (totalSales * commPct) / 100
  }

  const deductions = (Number(s.advance) || 0) + (Number(s.loanBalance) || 0)
  return {
    gross:      Math.round(gross),
    deductions,
    net:        Math.round(gross) - deductions,
  }
}

function fmt(n) { return '₹'+(Number(n)||0).toLocaleString('en-IN') }

function pct(v, total) { return total ? Math.round((v/total)*100) : 0 }

export default function Payroll() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()
  const [staff, setStaff]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [month, setMonth]       = useState(new Date().toISOString().slice(0,7))
  const [selected, setSelected] = useState(null)
  const [paying, setPaying]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Staff list fetch
      const res = await api.get(`/staff?restaurantId=${rid}&size=50`)
      const list = res?.content || (Array.isArray(res) ? res : [])
      if (!list?.length) { setStaff(MOCK_STAFF); setLoading(false); return }

      // 2. Monthly attendance fetch — year & month from selected month
      const [yr, mo] = month.split('-').map(Number)
      let attendanceList = []
      try {
        const att = await api.get(`/attendance?restaurantId=${rid}&year=${yr}&month=${mo}`)
        attendanceList = Array.isArray(att) ? att : (att?.content || [])
      } catch (_) {}

      // 3. Per-staff hours sum from attendance
      // attendance record has: staffId, hoursWorked
      const hoursMap = {}
      attendanceList.forEach(a => {
        if (a.staffId && a.hoursWorked) {
          hoursMap[a.staffId] = (hoursMap[a.staffId] || 0) + Number(a.hoursWorked)
        }
      })

      // 4. Merge hours into staff list
      const merged = list.map(s => ({
        ...s,
        // Map backend field names → component field names
        baseSalary:       s.salaryType === 'HOURS' ? (s.hourlyRate || s.baseSalary || 0) : (s.baseSalary || 0),
        totalWorkingHours: hoursMap[s.id] || s.totalWorkingHours || 0,
        attendanceDays:   s.attendanceDays || 0,
        totalDays:        s.totalDays || 30,
        advance:          s.advance || s.advanceAmount || 0,
        loanBalance:      s.loanBalance || s.loanAmount || 0,
        commissionPercent:s.commissionPercent || 0,
        totalSales:       s.totalSales || 0,
      }))
      setStaff(merged)
    } catch (_) {
      setStaff(MOCK_STAFF)
    } finally { setLoading(false) }
  }, [rid, month])

  useEffect(() => { load() }, [month])

  // Mark as paid
  async function markPaid(s) {
    setPaying(s.id)
    try {
      await api.post('/payroll/pay', { staffId: s.id, month, amount: calcSalary(s).net, restaurantId: rid })
      toast.success(`✅ ${s.name} — ${fmt(calcSalary(s).net)} marked as paid!`)
    } catch (_) {
      toast.info(`${s.name} marked paid (offline mode)`)
    } finally { setPaying(null) }
  }

  // Generate salary slip PDF
  function downloadSlip(s) {
    const sal = calcSalary(s)
    const html = `
      <html><head><style>
        body{font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:auto}
        h2{text-align:center;color:#333}
        .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}
        .total{font-weight:bold;font-size:16px;color:#10b981}
        .header{background:#6366f1;color:white;padding:20px;border-radius:8px;margin-bottom:24px;text-align:center}
      </style></head><body>
        <div class="header">
          <h2>💼 Salary Slip</h2>
          <p>${month}</p>
        </div>
        <div class="row"><span>Employee Name</span><strong>${s.name}</strong></div>
        <div class="row"><span>Role</span><span>${s.role}</span></div>
        <div class="row"><span>Salary Type</span><span>${s.salaryType}</span></div>
        <div class="row"><span>Attendance</span><span>${s.attendanceDays||30}/${s.totalDays||30} days</span></div>
        <br/>
        <div class="row"><span>Base Salary</span><span>${fmt(s.baseSalary)}</span></div>
        <div class="row"><span>Gross Salary</span><span>${fmt(sal.gross)}</span></div>
        <div class="row"><span>Advance Deduction</span><span style="color:#ef4444">- ${fmt(s.advance||0)}</span></div>
        <div class="row"><span>Loan Deduction</span><span style="color:#ef4444">- ${fmt(s.loanBalance||0)}</span></div>
        <br/>
        <div class="row total"><span>Net Payable</span><span>${fmt(sal.net)}</span></div>
        <br/><p style="text-align:center;color:#999;font-size:12px">Generated by HarmoneyEats • ${new Date().toLocaleDateString()}</p>
      </body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `salary-slip-${s.name.replace(' ','-')}-${month}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`📄 Salary slip downloaded: ${s.name}`)
  }

  // Summary
  const totals = staff.reduce((acc, s) => {
    const sal = calcSalary(s)
    return { gross: acc.gross+sal.gross, net: acc.net+sal.net, advance: acc.advance+(s.advance||0), loan: acc.loan+(s.loanBalance||0) }
  }, { gross:0, net:0, advance:0, loan:0 })

  const StatCard = ({ label, value, color='var(--text)' }) => (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'1.25rem' }}>
      <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color }}>{value}</div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>💼 Payroll</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>Attendance-linked salary + salary slip PDF</p>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{
          padding:'8px 12px', borderRadius:8, border:'1px solid var(--border)',
          background:'var(--bg-page)', color:'var(--text)', fontSize:13,
        }} />
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12, marginBottom:'1.5rem' }}>
        <StatCard label="💰 Total Gross"   value={fmt(totals.gross)}   color="#10b981" />
        <StatCard label="🏦 Net Payable"   value={fmt(totals.net)}     color="#6366f1" />
        <StatCard label="📤 Total Advance" value={fmt(totals.advance)} color="#f59e0b" />
        <StatCard label="🔄 Loan Balance"  value={fmt(totals.loan)}    color="#ef4444" />
        <StatCard label="👥 Staff"         value={staff.length} />
      </div>

      {/* Staff table */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={4} cols={8} /> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Staff','Role','Attendance','Hours','Gross','Advance','Loan','Net','Actions'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s,i) => {
                const sal = calcSalary(s)
                const attPct = pct(s.attendanceDays||30, s.totalDays||30)
                return (
                  <tr key={s.id||i} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'12px 16px', fontSize:13, fontWeight:500 }}>{s.name}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-muted)' }}>{s.role}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontSize:12, marginBottom:4, color: attPct<80?'#ef4444':attPct<95?'#f59e0b':'#10b981' }}>
                        {s.attendanceDays||30}/{s.totalDays||30} days ({attPct}%)
                      </div>
                      <div style={{ height:4, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${attPct}%`, background: attPct<80?'#ef4444':attPct<95?'#f59e0b':'#10b981', borderRadius:2 }} />
                      </div>
                    </td>
                    {/* Hours column — HOURS type staff ke liye working hours, baki ke liye — */}
                    <td style={{ padding:'12px 16px', fontSize:13, color: s.salaryType==='HOURS'?'var(--text)':'var(--text-muted)' }}>
                      {s.salaryType==='HOURS'
                        ? <div>
                            <span style={{ fontWeight:600 }}>
                              {Number(s.totalWorkingHours)||Number(s.monthlyHours)||0} hrs
                            </span>
                            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                              ₹{s.baseSalary}/hr
                            </div>
                          </div>
                        : <span style={{ color:'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:13 }}>{fmt(sal.gross)}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color: s.advance?'#f59e0b':'var(--text-muted)' }}>{s.advance?fmt(s.advance):'—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color: s.loanBalance?'#ef4444':'var(--text-muted)' }}>{s.loanBalance?fmt(s.loanBalance):'—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#10b981' }}>{fmt(sal.net)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={() => setSelected(s)} style={{
                          fontSize:11, padding:'4px 8px', borderRadius:6,
                          border:'1px solid var(--border)', background:'transparent',
                          color:'var(--text-muted)', cursor:'pointer',
                        }}>Details</button>
                        <button onClick={() => downloadSlip(s)} style={{
                          fontSize:11, padding:'4px 8px', borderRadius:6,
                          border:'1px solid #6366f1', background:'transparent',
                          color:'#6366f1', cursor:'pointer',
                        }}>📄 Slip</button>
                        <button onClick={() => markPaid(s)} disabled={paying===s.id} style={{
                          fontSize:11, padding:'4px 8px', borderRadius:6,
                          border:'none', background:'#10b981',
                          color:'#fff', cursor:paying===s.id?'not-allowed':'pointer',
                          opacity: paying===s.id?0.6:1,
                        }}>{paying===s.id?'...':'Pay'}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:'var(--bg-page)', borderTop:'2px solid var(--border)' }}>
                <td colSpan={3} style={{ padding:'12px 16px', fontSize:13, fontWeight:700 }}>Total ({staff.length})</td>
                <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-muted)' }}>
                  {staff.filter(s=>s.salaryType==='HOURS').reduce((a,s)=>a+(Number(s.totalWorkingHours)||Number(s.monthlyHours)||0),0)||'—'}
                </td>
                <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700 }}>{fmt(totals.gross)}</td>
                <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#f59e0b' }}>{fmt(totals.advance)}</td>
                <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#ef4444' }}>{fmt(totals.loan)}</td>
                <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#10b981' }}>{fmt(totals.net)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Detail panel */}
      {selected && (() => {
        const sal = calcSalary(selected)
        return (
          <div style={{ position:'fixed', right:0, top:0, bottom:0, width:320, background:'var(--bg-card)', borderLeft:'1px solid var(--border)', padding:'1.5rem', overflowY:'auto', zIndex:100, boxShadow:'-4px 0 24px rgba(0,0,0,0.15)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1.5rem' }}>
              <h2 style={{ fontSize:16, fontWeight:700 }}>Payroll Detail</h2>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ fontWeight:600, fontSize:15, marginBottom:'1rem' }}>👤 {selected.name}</div>
            {[
              ['Role',       selected.role],
              ['Type',       selected.salaryType],
              ['Base',       fmt(selected.baseSalary)],
              ['Attendance', `${selected.attendanceDays||30}/${selected.totalDays||30} days`],
              ['Gross',      fmt(sal.gross)],
              ['Advance',    fmt(selected.advance||0)],
              ['Loan',       fmt(selected.loanBalance||0)],
              ['Net',        fmt(sal.net)],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{l}</span>
                <span style={{ fontSize:13, fontWeight:500 }}>{v}</span>
              </div>
            ))}
            <button onClick={() => downloadSlip(selected)} style={{ width:'100%', marginTop:'1rem', padding:'10px', background:'#6366f1', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              📄 Download Salary Slip
            </button>
            <button onClick={() => { markPaid(selected); setSelected(null) }} style={{ width:'100%', marginTop:8, padding:'10px', background:'#10b981', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              💳 Mark as Paid
            </button>
          </div>
        )
      })()}
    </div>
  )
}
