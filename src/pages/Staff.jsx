import { useState, useEffect, useCallback } from 'react'
import { api, staffApi, staffRoleApi } from '../api/client'
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
  customRoleName:'',
  overtimeEnabled: false,
  overtimeMultiplier: 1.5,
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

// ── Manage Roles Modal ────────────────────────────────────────────
const COLOR_OPTIONS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6',
  '#8b5cf6','#ec4899','#06b6d4','#14b8a6','#84cc16',
]

function ManageRolesModal({ rid, onClose, toast }) {
  const [roles,    setRoles]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [newName,  setNewName]  = useState('')
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0])
  const [adding,   setAdding]   = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor,setEditColor]= useState('')
  const [saving,   setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRoles(await staffRoleApi.getAll(rid)) }
    catch { setRoles([]) }
    finally { setLoading(false) }
  }, [rid])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    try {
      await staffRoleApi.create({ name: newName.trim(), colorHex: newColor })
      toast.success(`Role "${newName.trim()}" added`)
      setNewName(''); load()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setAdding(false) }
  }

  function openEdit(r) { setEditId(r.id); setEditName(r.name); setEditColor(r.colorHex || COLOR_OPTIONS[0]) }

  async function handleSaveEdit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await staffRoleApi.update(editId, { name: editName.trim(), colorHex: editColor })
      toast.success('Role updated'); setEditId(null); load()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }

  async function toggle(r) {
    try {
      await staffRoleApi.toggleActive(r.id, !r.active)
      toast.success(r.active ? `"${r.name}" deactivated` : `"${r.name}" activated`); load()
    } catch { toast.error('Failed') }
  }

  const inpStyle = {
    padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:600,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', borderRadius:12, padding:24,
        width:'100%', maxWidth:480, maxHeight:'85vh', overflow:'auto',
        boxShadow:'0 8px 40px rgba(0,0,0,0.4)' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>🎭 Manage Staff Roles</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20,
            cursor:'pointer', color:'var(--text-muted)' }}>×</button>
        </div>

        {/* Add new role */}
        <form onSubmit={handleAdd} style={{ display:'flex', gap:8, marginBottom:20, alignItems:'flex-end' }}>
          <div style={{ flex:1 }}>
            <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:600 }}>
              New Role Name
            </label>
            <input value={newName} onChange={e=>setNewName(e.target.value)}
              placeholder="e.g. Barista, Receptionist…" style={{ ...inpStyle, width:'100%' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:600 }}>Color</label>
            <div style={{ display:'flex', gap:4 }}>
              {COLOR_OPTIONS.map(c => (
                <button key={c} type="button" onClick={()=>setNewColor(c)}
                  style={{ width:20, height:20, borderRadius:'50%', background:c, border:newColor===c?'2px solid #fff':'2px solid transparent',
                    cursor:'pointer', flexShrink:0, outline: newColor===c?`2px solid ${c}`:'none' }} />
              ))}
            </div>
          </div>
          <button type="submit" disabled={adding || !newName.trim()}
            style={{ padding:'8px 14px', borderRadius:7, border:'none', fontSize:12, fontWeight:600,
              background:adding||!newName.trim()?'var(--border)':'var(--accent)', color:'#fff',
              cursor:adding||!newName.trim()?'not-allowed':'pointer', whiteSpace:'nowrap' }}>
            {adding?'Adding…':'+ Add'}
          </button>
        </form>

        {/* List */}
        {loading ? (
          <div style={{ textAlign:'center', padding:24, color:'var(--text-muted)' }}>Loading…</div>
        ) : roles.length === 0 ? (
          <div style={{ textAlign:'center', padding:24, color:'var(--text-muted)', fontSize:13 }}>
            Koi custom role nahi hai — upar se add karo
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {roles.map(r => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'10px 12px', borderRadius:8, border:'1px solid var(--border)',
                background:'var(--bg-page)', opacity: r.active ? 1 : 0.5 }}>

                {editId === r.id ? (
                  <form onSubmit={handleSaveEdit} style={{ display:'flex', gap:8, flex:1, alignItems:'center' }}>
                    <input value={editName} onChange={e=>setEditName(e.target.value)}
                      style={{ ...inpStyle, flex:1 }} autoFocus />
                    <div style={{ display:'flex', gap:3 }}>
                      {COLOR_OPTIONS.map(c => (
                        <button key={c} type="button" onClick={()=>setEditColor(c)}
                          style={{ width:16, height:16, borderRadius:'50%', background:c, border:'none',
                            cursor:'pointer', outline: editColor===c?`2px solid ${c}`:'none' }} />
                      ))}
                    </div>
                    <button type="submit" disabled={saving}
                      style={{ padding:'5px 10px', borderRadius:6, border:'none', fontSize:11, fontWeight:600,
                        background:'var(--accent)', color:'#fff', cursor:'pointer' }}>
                      {saving?'…':'Save'}
                    </button>
                    <button type="button" onClick={()=>setEditId(null)}
                      style={{ padding:'5px 10px', borderRadius:6, border:'1px solid var(--border)',
                        background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:11 }}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <span style={{ width:12, height:12, borderRadius:'50%', background: r.colorHex||'#6366f1',
                      flexShrink:0, display:'inline-block' }} />
                    <span style={{ flex:1, fontSize:13, fontWeight:600,
                      textDecoration: r.active?'none':'line-through' }}>{r.name}</span>
                    {!r.active && <span style={{ fontSize:10, color:'#ef4444', fontWeight:600 }}>Inactive</span>}
                    <button onClick={()=>openEdit(r)}
                      style={{ padding:'4px 10px', borderRadius:6, fontSize:11, border:'1px solid var(--border)',
                        background:'transparent', color:'var(--text-muted)', cursor:'pointer' }}>Edit</button>
                    <button onClick={()=>toggle(r)}
                      style={{ padding:'4px 10px', borderRadius:6, fontSize:11, border:`1px solid ${r.active?'#ef444440':'#10b98140'}`,
                        background:'transparent', color: r.active?'#ef4444':'#10b981', cursor:'pointer' }}>
                      {r.active?'Deactivate':'Activate'}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Passcode Modal ────────────────────────────────────────────────
function PasscodeModal({ staff, onClose, onDone, toast }) {
  const [pin,     setPin]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [show,    setShow]    = useState(false)

  const valid = /^\d{4,6}$/.test(pin)
  const match = pin === confirm

  async function handleSave(e) {
    e.preventDefault()
    if (!valid)  return toast.error('Passcode 4-6 digit number hona chahiye')
    if (!match)  return toast.error('Dono passcode match nahi kar rahe')
    setSaving(true)
    try {
      await staffApi.setPasscode(staff.id, pin)
      toast.success(`🔑 Passcode set for ${staff.name}`)
      onDone()
    } catch (err) {
      toast.error(err.message || 'Failed to set passcode')
    } finally { setSaving(false) }
  }

  const inpStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-page)', color: 'var(--text)', fontSize: 20,
    letterSpacing: 8, textAlign: 'center', fontWeight: 700, boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 28,
        width: '100%', maxWidth: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🔑 Set Passcode</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>{staff.name}</strong> ke liye 4-6 digit passcode set karo.
          Yeh device login ke liye use hoga.
        </p>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
              New Passcode (4-6 digits)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={show ? 'text' : 'password'}
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                style={{ ...inpStyle, borderColor: pin && !valid ? '#ef4444' : 'var(--border)' }}
                autoFocus
              />
            </div>
            {pin && !valid && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>4 se 6 digits required</div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
              Confirm Passcode
            </label>
            <input
              type={show ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={6}
              value={confirm}
              onChange={e => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              style={{ ...inpStyle,
                borderColor: confirm && !match ? '#ef4444' : confirm && match ? '#10b981' : 'var(--border)' }}
            />
            {confirm && !match && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Passcode match nahi kar raha</div>
            )}
            {confirm && match && valid && (
              <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>✓ Match</div>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
            color: 'var(--text-muted)', marginBottom: 20, cursor: 'pointer' }}>
            <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />
            Show digits
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !valid || !match}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
                background: saving || !valid || !match ? 'var(--border)' : 'var(--accent)', color: '#fff',
                cursor: saving || !valid || !match ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving…' : '💾 Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
export default function Staff() {
  const { restaurantId: rid, user } = useAuthStore()
  const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN'
  const toast   = useToast()
  const [staff,    setStaff]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [roleFilt, setRoleFilt] = useState('ALL')
  const [panel,    setPanel]    = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [form,     setForm]     = useState(BLANK)
  const [saving,         setSaving]         = useState(false)
  const [tab,            setTab]            = useState('basic') // basic | salary | docs
  const [passcodeTarget, setPasscodeTarget] = useState(null)
  const [showRolesModal, setShowRolesModal] = useState(false)
  const [customRoles,    setCustomRoles]    = useState([]) // active custom roles
  const [restOpenTime,   setRestOpenTime]   = useState('09:00')
  const [restCloseTime,  setRestCloseTime]  = useState('21:00')

  // ── Load ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await staffApi.getAll(rid, 'size=100')
      setStaff(Array.isArray(res) ? res : (res?.content || []))
    } catch(_) { setStaff([]) }
    finally { setLoading(false) }
  }, [rid])

  const loadCustomRoles = useCallback(async () => {
    try { setCustomRoles(await staffRoleApi.getActive(rid)) }
    catch { setCustomRoles([]) }
  }, [rid])

  useEffect(() => {
    load(); loadCustomRoles()
    api.get(`/restaurants/${rid}`).then(r => {
      if (r?.openTime)  setRestOpenTime(r.openTime)
      if (r?.closeTime) setRestCloseTime(r.closeTime)
    }).catch(() => {})
  }, [])

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
      customRoleName:       s.customRoleName||'',
      overtimeEnabled:      s.overtimeEnabled||false,
      overtimeMultiplier:   s.overtimeMultiplier||1.5,
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
        customRoleName:       form.customRoleName||null,
        overtimeEnabled:      form.overtimeEnabled||false,
        overtimeMultiplier:   Number(form.overtimeMultiplier)||1.5,
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

  async function toggleAttendancePerm(s) {
    const newVal = !s.canEditAttendance
    const label  = newVal ? 'Grant' : 'Revoke'
    if (!confirm(`${s.name} ko attendance edit permission ${label.toLowerCase()} karna chahte hain?`)) return
    try {
      await staffApi.setAttendancePermission(s.id, newVal)
      toast.success(`${label}ed attendance edit permission for ${s.name}`)
      load()
    } catch(_) { toast.error('Permission update failed') }
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
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setShowRolesModal(true)}
            style={{ padding:'9px 16px', borderRadius:8, fontSize:13, fontWeight:600,
              background:'transparent', color:'var(--text)', border:'1px solid var(--border)', cursor:'pointer' }}>
            🎭 Manage Roles
          </button>
          <button onClick={openAdd} style={{ padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:600,
            background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>
            + Add Staff
          </button>
        </div>
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
                    {s.customRoleName && (
                      <div style={{ fontSize:11, marginTop:3 }}>
                        {(() => {
                          const cr = customRoles.find(r => r.name === s.customRoleName)
                          const col = cr?.colorHex || '#6366f1'
                          return (
                            <span style={{ padding:'1px 7px', borderRadius:10, fontSize:10, fontWeight:600,
                              background: col+'22', color: col }}>
                              {s.customRoleName}
                            </span>
                          )
                        })()}
                      </div>
                    )}
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
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button onClick={()=>openEdit(s)} style={{
                        fontSize:11, padding:'4px 10px', borderRadius:6,
                        border:'1px solid var(--border)', background:'transparent',
                        color:'var(--text-muted)', cursor:'pointer' }}>Edit</button>
                      {isOwnerOrAdmin && (
                        <button onClick={()=>toggleAttendancePerm(s)}
                          title={s.canEditAttendance ? 'Revoke attendance edit permission' : 'Grant attendance edit permission'}
                          style={{ fontSize:11, padding:'4px 10px', borderRadius:6,
                            border: `1px solid ${s.canEditAttendance ? '#10b981' : '#6366f1'}`,
                            background: s.canEditAttendance ? '#10b98118' : 'transparent',
                            color: s.canEditAttendance ? '#10b981' : '#6366f1',
                            cursor:'pointer', whiteSpace:'nowrap' }}>
                          {s.canEditAttendance ? '✓ Att.Edit' : '+ Att.Edit'}
                        </button>
                      )}
                      <button onClick={()=>setPasscodeTarget(s)}
                        title="Set device login passcode"
                        style={{ fontSize:11, padding:'4px 10px', borderRadius:6,
                          border:'1px solid #f59e0b', background:'transparent',
                          color:'#f59e0b', cursor:'pointer', whiteSpace:'nowrap' }}>
                        🔑 Passcode
                      </button>
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

                  {/* Custom Job Title */}
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:600 }}>
                      Job Title (Custom Role) <span style={{ fontSize:10, fontWeight:400 }}>— optional</span>
                    </label>
                    <select value={form.customRoleName||''}
                      onChange={e => setForm(f => ({ ...f, customRoleName: e.target.value }))}
                      style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
                        background:'var(--bg-page)', color:'var(--text)', fontSize:13, boxSizing:'border-box' }}>
                      <option value="">— None —</option>
                      {customRoles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                    {customRoles.length === 0 && (
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
                        Koi custom role nahi hai —{' '}
                        <button type="button" onClick={() => setShowRolesModal(true)}
                          style={{ background:'none', border:'none', color:'var(--accent)',
                            cursor:'pointer', fontSize:11, padding:0, fontWeight:600 }}>
                          Manage Roles
                        </button>{' '}se add karo
                      </div>
                    )}
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
              {tab==='salary' && (() => {
                // Restaurant timing → daily working hours
                function parseH(t, def) {
                  if (!t) return def
                  const [h, m] = t.split(':').map(Number)
                  return h + (m || 0) / 60
                }
                const openH   = parseH(restOpenTime,  9)
                const closeH  = parseH(restCloseTime, 21)
                const dailyH  = closeH > openH ? Math.round((closeH - openH) * 10) / 10 : 8
                const monthH  = Math.round(dailyH * 30 * 10) / 10  // 30 days

                const hrRate    = Number(form.hourlyRate  || 0)
                const dailyRate = Number(form.baseSalary  || 0)
                const fixedSal  = Number(form.baseSalary  || 0)
                const commPct   = Number(form.commissionPercent || 0)
                const otMult    = Number(form.overtimeMultiplier || 1.5)

                const regularPay = hrRate * monthH
                const otPayEst   = form.overtimeEnabled ? hrRate * otMult * 30 : 0 // 1 OT hr/day estimate
                const totalHours = form.overtimeEnabled ? monthH + 30 : monthH

                return (
                  <>
                    <FSelect label="Salary Type" value={form.salaryType}
                      onChange={upd('salaryType')} options={SAL_TYPES}
                      labels={{ FIXED:'Fixed Monthly', DAILY:'Daily Rate', HOURS:'Hourly Rate', COMMISSION:'Commission' }}/>

                    {form.salaryType==='FIXED' && (
                      <FInput label="Monthly Salary (₹)" value={form.baseSalary}
                        onChange={upd('baseSalary')} type="number"
                        hint="Full month ka fixed salary"/>
                    )}
                    {form.salaryType==='DAILY' && (
                      <FInput label="Daily Rate (₹/day)" value={form.baseSalary}
                        onChange={upd('baseSalary')} type="number"
                        hint={`Example: 500 = ₹500/day × attendance days`}/>
                    )}
                    {form.salaryType==='HOURS' && (
                      <FInput label="Hourly Rate (₹/hour)" value={form.hourlyRate}
                        onChange={upd('hourlyRate')} type="number"
                        hint={`Example: 50 = ₹50/hr × hours worked`}/>
                    )}
                    {form.salaryType==='COMMISSION' && (
                      <>
                        <FInput label="Base Salary (₹)" value={form.baseSalary}
                          onChange={upd('baseSalary')} type="number" hint="Optional fixed base"/>
                        <FInput label="Commission %" value={form.commissionPercent}
                          onChange={upd('commissionPercent')} type="number"
                          hint="Example: 5 = 5% of total sales"/>
                      </>
                    )}

                    {/* Overtime toggle — only for HOURS type */}
                    {form.salaryType==='HOURS' && (
                      <div style={{ marginBottom:14, padding:'12px 14px', borderRadius:10,
                        border:`1px solid ${form.overtimeEnabled?'#f59e0b':'var(--border)'}`,
                        background: form.overtimeEnabled?'#f59e0b0a':'var(--bg-page)' }}>
                        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                          <input type="checkbox" checked={!!form.overtimeEnabled}
                            onChange={e => setForm(f => ({ ...f, overtimeEnabled: e.target.checked }))}
                            style={{ width:16, height:16, cursor:'pointer' }} />
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color: form.overtimeEnabled?'#f59e0b':'var(--text)' }}>
                              ⏰ Overtime Pay
                            </div>
                            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                              Restaurant hours ({restOpenTime}–{restCloseTime}) ke baad kaam karne par extra pay
                            </div>
                          </div>
                        </label>
                        {form.overtimeEnabled && (
                          <div style={{ marginTop:10 }}>
                            <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:600 }}>
                              OT Rate Multiplier
                            </label>
                            <div style={{ display:'flex', gap:6 }}>
                              {[1.25, 1.5, 2.0, 2.5].map(m => (
                                <button key={m} type="button"
                                  onClick={() => setForm(f => ({ ...f, overtimeMultiplier: m }))}
                                  style={{ padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:700,
                                    cursor:'pointer', border:'1px solid',
                                    borderColor: Number(form.overtimeMultiplier)===m ? '#f59e0b' : 'var(--border)',
                                    background:  Number(form.overtimeMultiplier)===m ? '#f59e0b18' : 'transparent',
                                    color:       Number(form.overtimeMultiplier)===m ? '#f59e0b' : 'var(--text-muted)' }}>
                                  {m}×
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Salary preview — uses restaurant timing */}
                    <div style={{ padding:'14px 16px', borderRadius:10, background:'var(--bg-page)',
                      border:'1px solid var(--border)', fontSize:12, color:'var(--text-muted)' }}>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8, display:'flex', gap:6, alignItems:'center' }}>
                        <span>🏪</span>
                        <span>Restaurant hours: <strong style={{color:'var(--text)'}}>{restOpenTime} – {restCloseTime}</strong> ({dailyH}h/day)</span>
                      </div>
                      <div style={{ fontWeight:600, color:'var(--text)', marginBottom:8, fontSize:13 }}>Preview (30 days):</div>

                      {form.salaryType==='FIXED' && (
                        <div style={{ fontSize:13 }}>Monthly: <strong style={{color:'var(--accent)'}}>₹{fixedSal.toLocaleString('en-IN')}</strong></div>
                      )}
                      {form.salaryType==='DAILY' && (
                        <div style={{ fontSize:13 }}>
                          30 days × ₹{dailyRate.toLocaleString('en-IN')} = <strong style={{color:'var(--accent)'}}>₹{(30*dailyRate).toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                      {form.salaryType==='HOURS' && (
                        <>
                          <div style={{ fontSize:12, marginBottom:4 }}>
                            Regular: 30 days × {dailyH}h × ₹{hrRate} =
                            <strong style={{ color:'#10b981', marginLeft:4 }}>₹{regularPay.toLocaleString('en-IN', {maximumFractionDigits:2})}</strong>
                          </div>
                          {form.overtimeEnabled && (
                            <div style={{ fontSize:12, color:'#f59e0b', marginBottom:4 }}>
                              OT (est. 1h/day × 30 × {otMult}× × ₹{hrRate}) =
                              <strong style={{ marginLeft:4 }}>+₹{otPayEst.toLocaleString('en-IN', {maximumFractionDigits:2})}</strong>
                            </div>
                          )}
                          <div style={{ fontSize:13, borderTop:'1px solid var(--border)', paddingTop:6, marginTop:6 }}>
                            Total est. ({form.overtimeEnabled ? `${monthH}h regular + 30h OT` : `${monthH}h`}):{' '}
                            <strong style={{color:'var(--accent)', fontSize:15}}>
                              ₹{(regularPay + otPayEst).toLocaleString('en-IN', {maximumFractionDigits:2})}
                            </strong>
                          </div>
                        </>
                      )}
                      {form.salaryType==='COMMISSION' && (
                        <div style={{ fontSize:13 }}>
                          ₹50,000 sales × {commPct}% = <strong style={{color:'var(--accent)'}}>₹{(50000*commPct/100).toLocaleString('en-IN')}</strong>
                          <div style={{ fontSize:11, marginTop:4 }}>
                            {fixedSal > 0 && `+ Base ₹${fixedSal.toLocaleString('en-IN')} = ₹${(50000*commPct/100+fixedSal).toLocaleString('en-IN')}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}

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

      {/* Passcode Modal */}
      {passcodeTarget && (
        <PasscodeModal
          staff={passcodeTarget}
          toast={toast}
          onClose={() => setPasscodeTarget(null)}
          onDone={() => setPasscodeTarget(null)}
        />
      )}

      {/* Manage Roles Modal */}
      {showRolesModal && (
        <ManageRolesModal
          rid={rid}
          toast={toast}
          onClose={() => { setShowRolesModal(false); loadCustomRoles() }}
        />
      )}
    </div>
  )
}
