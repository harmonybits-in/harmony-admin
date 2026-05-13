import { useState, useEffect, useCallback } from 'react'
import { staffApi } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

// ── Constants ────────────────────────────────────────────────────
const ALL_ROLES = [
  'CASHIER', 'MANAGER', 'KITCHEN', 'DELIVERY',
  'WAITER', 'CAPTAIN', 'HOUSEKEEPING', 'SECURITY', 'OTHER'
]
const ROLE_COLOR = {
  MANAGER:      { bg:'#6366f122', color:'#6366f1' },
  KITCHEN:      { bg:'#f59e0b22', color:'#f59e0b' },
  DELIVERY:     { bg:'#10b98122', color:'#10b981' },
  CASHIER:      { bg:'#3b82f622', color:'#3b82f6' },
  WAITER:       { bg:'#8b5cf622', color:'#8b5cf6' },
  CAPTAIN:      { bg:'#ec489922', color:'#ec4899' },
  HOUSEKEEPING: { bg:'#06b6d422', color:'#06b6d4' },
  SECURITY:     { bg:'#ef444422', color:'#ef4444' },
  OTHER:        { bg:'#88888822', color:'#888888' },
}
const EMP_TYPES = ['FULL_TIME','PART_TIME','CONTRACT','DAILY_WAGE','INTERN']
const SAL_TYPES = ['FIXED','DAILY','HOURS','COMMISSION']

const SAL_LABEL = {
  FIXED:      'Monthly Fixed (₹/month)',
  DAILY:      'Daily Rate (₹/day)',
  HOURS:      'Hourly Rate (₹/hour)',
  COMMISSION: 'Commission (%)',
}

// ── Blank form ───────────────────────────────────────────────────
const BLANK = {
  name:'', phone:'', email:'', address:'', profilePhotoUrl:'',
  roles:['CASHIER'],
  employmentType:'FULL_TIME',
  salaryType:'FIXED',
  baseSalary:0, hourlyRate:0, commissionPercent:0,
  joiningDate: new Date().toISOString().slice(0,10),
  emergencyContactName:'', emergencyContactPhone:'',
  aadharNumber:'', panNumber:'',
  bankAccountNumber:'', ifscCode:'', bankName:'',
  notes:'',
}

// ── Role badge ────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const c = ROLE_COLOR[role] || { bg:'#88888822', color:'#888' }
  return (
    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:700,
      background:c.bg, color:c.color, marginRight:3, whiteSpace:'nowrap' }}>
      {role}
    </span>
  )
}

// ── Multi-role checkbox selector ──────────────────────────────────
function RoleSelector({ selected = [], onChange }) {
  function toggle(role) {
    const has = selected.includes(role)
    if (has && selected.length === 1) return  // minimum 1 role
    onChange(has ? selected.filter(r => r !== role) : [...selected, role])
  }
  return (
    <div>
      <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:6, fontWeight:500 }}>
        Roles <span style={{ color:'#ef4444' }}>*</span>
        <span style={{ marginLeft:6, fontWeight:400, color:'var(--text-muted)' }}>
          (multiple select kar sakte ho)
        </span>
      </label>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {ALL_ROLES.map(role => {
          const sel = selected.includes(role)
          const c   = ROLE_COLOR[role] || { bg:'#88888822', color:'#888' }
          return (
            <button key={role} type="button" onClick={() => toggle(role)} style={{
              padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600,
              cursor:'pointer', transition:'.15s',
              border:`1.5px solid ${sel ? c.color : 'var(--border)'}`,
              background: sel ? c.bg : 'transparent',
              color: sel ? c.color : 'var(--text-muted)',
            }}>
              {sel ? '✓ ' : ''}{role}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop:6, fontSize:11, color:'var(--text-muted)' }}>
          Selected: <strong style={{ color:'var(--text)' }}>{selected.join(', ')}</strong>
        </div>
      )}
    </div>
  )
}

// ── Form input helpers ────────────────────────────────────────────
function FInput({ label, value, onChange, type='text', placeholder='', required=false, hint='' }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>
        {label} {required && <span style={{ color:'#ef4444' }}>*</span>}
      </label>
      <input type={type} value={value??''} onChange={onChange} placeholder={placeholder}
        style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid var(--border)',
          background:'var(--bg-page)', color:'var(--text)', fontSize:13, boxSizing:'border-box' }}/>
      {hint && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>{hint}</div>}
    </div>
  )
}
function FSelect({ label, value, onChange, options, labels={} }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>{label}</label>
      <select value={value??''} onChange={onChange}
        style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid var(--border)',
          background:'var(--bg-page)', color:'var(--text)', fontSize:13 }}>
        {options.map(o => <option key={o} value={o}>{labels[o]||o}</option>)}
      </select>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
export default function Staff() {
  const { restaurantId: rid } = useAuthStore()
  const toast   = useToast()
  const [staff,    setStaff]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [roleFilt, setRoleFilt] = useState('ALL')
  const [panel,    setPanel]    = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [form,     setForm]     = useState(BLANK)
  const [saving,   setSaving]   = useState(false)
  const [tab,      setTab]      = useState('basic') // basic | salary | docs

  // ── Load ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await staffApi.getAll(rid, 'size=100')
      setStaff(Array.isArray(res) ? res : (res?.content || []))
    } catch(_) { setStaff([]) }
    finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [])

  // ── Filter ────────────────────────────────────────────────────
  const filtered = staff.filter(s => {
    const ms = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search)
    const mr = roleFilt==='ALL' || (s.roles||[]).includes(roleFilt)
    return ms && mr
  })

  // ── Panel open ────────────────────────────────────────────────
  function openAdd() {
    setForm({ ...BLANK })
    setEditId(null); setTab('basic'); setPanel(true)
  }
  function openEdit(s) {
    setForm({
      name:                 s.name||'',
      phone:                s.phone||'',
      email:                s.email||'',
      address:              s.address||'',
      profilePhotoUrl:      s.profilePhotoUrl||'',
      // roles: backend returns Set<StaffRole> as array
      roles:                Array.isArray(s.roles) ? s.roles : (s.role ? [s.role] : ['CASHIER']),
      employmentType:       s.employmentType||'FULL_TIME',
      salaryType:           s.salaryType||'FIXED',
      baseSalary:           s.baseSalary||0,
      hourlyRate:           s.hourlyRate||0,
      commissionPercent:    s.commissionPercent||0,
      joiningDate:          s.joiningDate||'',
      emergencyContactName: s.emergencyContactName||'',
      emergencyContactPhone:s.emergencyContactPhone||'',
      aadharNumber:         s.aadharNumber||'',
      panNumber:            s.panNumber||'',
      bankAccountNumber:    s.bankAccountNumber||'',
      ifscCode:             s.ifscCode||'',
      bankName:             s.bankName||'',
      notes:                s.notes||'',
    })
    setEditId(s.id); setTab('basic'); setPanel(true)
  }

  // ── Save ──────────────────────────────────────────────────────
  async function save() {
    if (!form.name?.trim()) { toast.error('Naam required hai'); return }
    if (!form.phone?.trim()) { toast.error('Phone required hai'); return }
    if (!form.roles?.length) { toast.error('Minimum 1 role select karo'); return }

    setSaving(true)
    try {
      const body = {
        name:                 form.name.trim(),
        phone:                form.phone.trim(),
        email:                form.email||null,
        address:              form.address||null,
        profilePhotoUrl:      form.profilePhotoUrl||null,
        roles:                form.roles,           // Set<StaffRole> — backend expects array of strings
        employmentType:       form.employmentType,
        salaryType:           form.salaryType,
        baseSalary:           Number(form.baseSalary)||0,
        hourlyRate:           Number(form.hourlyRate)||0,
        commissionPercent:    Number(form.commissionPercent)||0,
        joiningDate:          form.joiningDate||null,
        emergencyContactName: form.emergencyContactName||null,
        emergencyContactPhone:form.emergencyContactPhone||null,
        aadharNumber:         form.aadharNumber||null,
        panNumber:            form.panNumber||null,
        bankAccountNumber:    form.bankAccountNumber||null,
        ifscCode:             form.ifscCode||null,
        bankName:             form.bankName||null,
        notes:                form.notes||null,
      }

      if (editId) {
        await staffApi.update(editId, body)
        toast.success('✅ Staff updated!')
      } else {
        await staffApi.create(body)
        toast.success('✅ Staff added!')
      }
      setPanel(false); load()
    } catch(err) {
      toast.error(editId ? 'Update failed' : 'Add failed — check server')
    } finally { setSaving(false) }
  }

  async function deactivate(s) {
    if (!confirm(`${s.name} ko deactivate karna chahte hain?`)) return
    try { await staffApi.deactivate(s.id); toast.success('Deactivated'); load() }
    catch(_) { toast.error('Failed') }
  }

  const upd = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  // ── Stats ─────────────────────────────────────────────────────
  const active   = staff.filter(s => s.active !== false).length
  const inactive = staff.filter(s => s.active === false).length

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>👥 Staff Management</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
            Staff ke multiple roles assign karo — Cashier, Delivery, Kitchen etc.
          </p>
        </div>
        <button onClick={openAdd} style={{ padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:600,
          background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>
          + Add Staff
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:'flex', gap:10, marginBottom:'1rem' }}>
        {[
          ['Total', staff.length, 'var(--text)'],
          ['Active', active, '#10b981'],
          ['Inactive', inactive, '#ef4444'],
          ...ALL_ROLES.slice(0,5).map(r => [r, staff.filter(s=>(s.roles||[]).includes(r)).length, ROLE_COLOR[r]?.color||'#888']),
        ].map(([l,v,c]) => (
          <div key={l} style={{ padding:'8px 14px', borderRadius:8, background:'var(--bg-card)',
            border:'1px solid var(--border)', fontSize:12 }}>
            <span style={{ color:'var(--text-muted)' }}>{l}: </span>
            <span style={{ fontWeight:700, color:c }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Name ya phone..."
          style={{ flex:1, minWidth:200, padding:'8px 12px', borderRadius:8,
            border:'1px solid var(--border)', background:'var(--bg-page)', color:'var(--text)', fontSize:13 }}/>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {['ALL', ...ALL_ROLES].map(r => (
            <button key={r} onClick={()=>setRoleFilt(r)} style={{
              padding:'6px 11px', borderRadius:20, fontSize:11, fontWeight:600,
              cursor:'pointer', border:'1px solid var(--border)',
              background:roleFilt===r?(ROLE_COLOR[r]?.color||'var(--accent)'):'transparent',
              color:roleFilt===r?'#fff':'var(--text-muted)',
            }}>{r}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={5} cols={6}/> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Staff','Roles','Contact','Employment','Salary','Status','Actions'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11,
                    color:'var(--text-muted)', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                  {search||roleFilt!=='ALL' ? 'Koi staff nahi mila' : 'Koi staff nahi — "+ Add Staff" click karo'}
                </td></tr>
              ) : filtered.map((s,i) => (
                <tr key={s.id||i} style={{ borderBottom:'1px solid var(--border)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg-page)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>

                  {/* Staff */}
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{s.name}</div>
                    {s.joiningDate && (
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                        Joined: {s.joiningDate}
                      </div>
                    )}
                  </td>

                  {/* Roles — multiple badges */}
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                      {(Array.isArray(s.roles) ? s.roles : (s.role ? [s.role] : [])).map(r => (
                        <RoleBadge key={r} role={r}/>
                      ))}
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                      {s.employmentType}
                    </div>
                  </td>

                  {/* Contact */}
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-muted)' }}>
                    <div>{s.phone||'—'}</div>
                    <div>{s.email||''}</div>
                  </td>

                  {/* Employment */}
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-muted)' }}>
                    {s.employmentType||'—'}
                  </td>

                  {/* Salary */}
                  <td style={{ padding:'12px 16px', fontSize:12 }}>
                    <div style={{ fontWeight:600 }}>
                      {s.salaryType==='HOURS'
                        ? `₹${s.hourlyRate||0}/hr`
                        : s.salaryType==='COMMISSION'
                        ? `${s.commissionPercent||0}%`
                        : `₹${s.baseSalary||0}`}
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>{s.salaryType}</div>
                  </td>

                  {/* Status */}
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600,
                      background: s.active!==false ? '#10b98120' : '#ef444420',
                      color:      s.active!==false ? '#10b981'  : '#ef4444' }}>
                      {s.active!==false ? '● Active' : '○ Inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>openEdit(s)} style={{
                        fontSize:11, padding:'4px 10px', borderRadius:6,
                        border:'1px solid var(--border)', background:'transparent',
                        color:'var(--text-muted)', cursor:'pointer' }}>Edit</button>
                      <button onClick={()=>deactivate(s)} style={{
                        fontSize:11, padding:'4px 10px', borderRadius:6,
                        border:'1px solid #ef444440', background:'transparent',
                        color:'#ef4444', cursor:'pointer' }}>Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && (
          <div style={{ padding:'8px 16px', borderTop:'1px solid var(--border)',
            fontSize:11, color:'var(--text-muted)' }}>
            Showing {filtered.length} of {staff.length} staff
          </div>
        )}
      </div>

      {/* ════════════ ADD / EDIT PANEL ════════════ */}
      {panel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500,
          display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setPanel(false)}>
          <div style={{ background:'var(--bg-card)', borderRadius:'16px 16px 0 0',
            width:'100%', maxWidth:640, maxHeight:'90vh',
            display:'flex', flexDirection:'column', overflow:'hidden',
            boxShadow:'0 -8px 40px rgba(0,0,0,.2)' }}>

            {/* Panel header */}
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)',
              display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ fontWeight:700, fontSize:15 }}>
                {editId ? `✏️ Edit: ${form.name}` : '+ Add Staff'}
              </div>
              <button onClick={()=>setPanel(false)}
                style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--text-muted)' }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              {[['basic','📋 Basic'],['salary','💰 Salary'],['docs','📄 Documents']].map(([k,l]) => (
                <button key={k} onClick={()=>setTab(k)} style={{
                  padding:'10px 18px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                  background: tab===k ? 'var(--accent)' : 'transparent',
                  color:      tab===k ? '#fff'          : 'var(--text-muted)',
                }}>{l}</button>
              ))}
            </div>

            {/* Panel body */}
            <div style={{ overflowY:'auto', flex:1, padding:'1.25rem 1.5rem' }}>

              {/* ── BASIC TAB ── */}
              {tab==='basic' && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                    <FInput label="Full Name" value={form.name} onChange={upd('name')} required placeholder="Chetan Kumar"/>
                    <FInput label="Phone" value={form.phone} onChange={upd('phone')} required placeholder="9876543210" type="tel"/>
                    <FInput label="Email" value={form.email} onChange={upd('email')} placeholder="chetan@example.com" type="email"/>
                    <FInput label="Joining Date" value={form.joiningDate} onChange={upd('joiningDate')} type="date"/>
                  </div>

                  <FInput label="Address" value={form.address} onChange={upd('address')} placeholder="Full address"/>

                  {/* ── ROLES (multiple) ── */}
                  <div style={{ marginBottom:14, padding:'12px 14px', borderRadius:10,
                    border:'1px solid var(--border)', background:'var(--bg-page)' }}>
                    <RoleSelector
                      selected={form.roles||['CASHIER']}
                      onChange={roles => setForm(f => ({ ...f, roles }))}
                    />
                  </div>

                  <FSelect label="Employment Type" value={form.employmentType}
                    onChange={upd('employmentType')} options={EMP_TYPES}
                    labels={{ FULL_TIME:'Full Time', PART_TIME:'Part Time',
                      CONTRACT:'Contract', DAILY_WAGE:'Daily Wage', INTERN:'Intern' }}/>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                    <FInput label="Emergency Contact Name" value={form.emergencyContactName} onChange={upd('emergencyContactName')}/>
                    <FInput label="Emergency Phone" value={form.emergencyContactPhone} onChange={upd('emergencyContactPhone')} type="tel"/>
                  </div>
                  <FInput label="Notes" value={form.notes} onChange={upd('notes')} placeholder="Any special notes..."/>
                </>
              )}

              {/* ── SALARY TAB ── */}
              {tab==='salary' && (
                <>
                  <FSelect label="Salary Type" value={form.salaryType}
                    onChange={upd('salaryType')} options={SAL_TYPES}
                    labels={{ FIXED:'Fixed Monthly', DAILY:'Daily Rate', HOURS:'Hourly Rate', COMMISSION:'Commission' }}/>

                  {/* Salary input based on type */}
                  {form.salaryType==='FIXED' && (
                    <FInput label="Monthly Salary (₹)" value={form.baseSalary}
                      onChange={upd('baseSalary')} type="number"
                      hint="Example: 18000 = ₹18,000 per month"/>
                  )}
                  {form.salaryType==='DAILY' && (
                    <FInput label="Daily Rate (₹/day)" value={form.baseSalary}
                      onChange={upd('baseSalary')} type="number"
                      hint="Example: 500 = ₹500 per day × attendance days"/>
                  )}
                  {form.salaryType==='HOURS' && (
                    <FInput label="Hourly Rate (₹/hour)" value={form.hourlyRate}
                      onChange={upd('hourlyRate')} type="number"
                      hint="Example: 42 = ₹42 per hour × total hours worked"/>
                  )}
                  {form.salaryType==='COMMISSION' && (
                    <>
                      <FInput label="Base Salary (₹)" value={form.baseSalary}
                        onChange={upd('baseSalary')} type="number"
                        hint="Optional base salary"/>
                      <FInput label="Commission %" value={form.commissionPercent}
                        onChange={upd('commissionPercent')} type="number"
                        hint="Example: 5 = 5% of total sales"/>
                    </>
                  )}

                  {/* Salary preview */}
                  <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--bg-page)',
                    border:'1px solid var(--border)', fontSize:12, color:'var(--text-muted)' }}>
                    <div style={{ fontWeight:600, color:'var(--text)', marginBottom:6 }}>Preview:</div>
                    {form.salaryType==='FIXED' && (
                      <div>Monthly: <strong>₹{Number(form.baseSalary||0).toLocaleString('en-IN')}</strong></div>
                    )}
                    {form.salaryType==='DAILY' && (
                      <div>26 days × ₹{form.baseSalary||0} = <strong>₹{(26*(Number(form.baseSalary)||0)).toLocaleString('en-IN')}</strong></div>
                    )}
                    {form.salaryType==='HOURS' && (
                      <div>192 hrs × ₹{form.hourlyRate||0} = <strong>₹{(192*(Number(form.hourlyRate)||0)).toLocaleString('en-IN')}</strong></div>
                    )}
                    {form.salaryType==='COMMISSION' && (
                      <div>₹50,000 sales × {form.commissionPercent||0}% = <strong>₹{(50000*(Number(form.commissionPercent)||0)/100).toLocaleString('en-IN')}</strong></div>
                    )}
                  </div>
                </>
              )}

              {/* ── DOCUMENTS TAB ── */}
              {tab==='docs' && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                    <FInput label="Aadhar Number" value={form.aadharNumber} onChange={upd('aadharNumber')} placeholder="12 digit"/>
                    <FInput label="PAN Number" value={form.panNumber} onChange={upd('panNumber')} placeholder="ABCDE1234F"/>
                    <FInput label="Bank Account" value={form.bankAccountNumber} onChange={upd('bankAccountNumber')}/>
                    <FInput label="IFSC Code" value={form.ifscCode} onChange={upd('ifscCode')} placeholder="SBIN0001234"/>
                    <div style={{ gridColumn:'1/-1' }}>
                      <FInput label="Bank Name" value={form.bankName} onChange={upd('bankName')} placeholder="State Bank of India"/>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Panel footer */}
            <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)',
              display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0,
              background:'var(--bg-page)' }}>
              <button onClick={()=>setPanel(false)}
                style={{ padding:'9px 20px', borderRadius:8, border:'1px solid var(--border)',
                  background:'transparent', color:'var(--text)', cursor:'pointer', fontSize:13 }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                style={{ padding:'9px 24px', borderRadius:8, border:'none',
                  background:'var(--accent)', color:'#fff', fontWeight:600, fontSize:13,
                  cursor:saving?'not-allowed':'pointer', opacity:saving?.7:1 }}>
                {saving ? 'Saving...' : editId ? 'Update Staff' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
