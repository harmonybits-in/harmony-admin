import { useState, useEffect } from 'react'
import { erpEmployeeApi } from '../../api/client'

const VERTICALS = ['RESTAURANT', 'JEWELLERY', 'SOFTWARE']
const EMP_TYPES = ['FULL_TIME', 'PART_TIME', 'DAILY_WAGE']
const SAL_TYPES = ['FIXED', 'DAILY']

const EMPTY_FORM = {
  name: '', phone: '', email: '', aadhar: '', pan: '',
  bankAccount: '', ifsc: '', department: '', designation: '',
  vertical: 'RESTAURANT', employmentType: 'FULL_TIME', salaryType: 'FIXED',
  basicSalary: 0, hra: 0, otherAllowances: 0, pfApplicable: false, joiningDate: '',
}

function Modal({ title, form, onChange, onSave, onClose, saving }) {
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#0F0F1A', color: '#fff', fontSize: 13, boxSizing: 'border-box', outline: 'none' }
  const labelStyle = { display: 'block', fontSize: 12, color: '#888', marginBottom: 5, fontWeight: 600 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1A1A2E', border: '1px solid #2a2a3e', borderRadius: 14, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { key: 'name',         label: 'Full Name *',     type: 'text' },
            { key: 'phone',        label: 'Phone',           type: 'tel' },
            { key: 'email',        label: 'Email',           type: 'email' },
            { key: 'aadhar',       label: 'Aadhar No.',      type: 'text' },
            { key: 'pan',          label: 'PAN',             type: 'text' },
            { key: 'bankAccount',  label: 'Bank Account',    type: 'text' },
            { key: 'ifsc',         label: 'IFSC Code',       type: 'text' },
            { key: 'department',   label: 'Department',      type: 'text' },
            { key: 'designation',  label: 'Designation',     type: 'text' },
            { key: 'basicSalary',  label: 'Basic Salary',    type: 'number' },
            { key: 'hra',          label: 'HRA',             type: 'number' },
            { key: 'otherAllowances', label: 'Other Allowances', type: 'number' },
            { key: 'joiningDate',  label: 'Joining Date',    type: 'date' },
          ].map(f => (
            <div key={f.key} style={{ gridColumn: f.key === 'name' ? 'span 2' : '1' }}>
              <label style={labelStyle}>{f.label}</label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={e => onChange(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
          <div>
            <label style={labelStyle}>Business Vertical</label>
            <select value={form.vertical} onChange={e => onChange('vertical', e.target.value)} style={inputStyle}>
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Employment Type</label>
            <select value={form.employmentType} onChange={e => onChange('employmentType', e.target.value)} style={inputStyle}>
              {EMP_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Salary Type</label>
            <select value={form.salaryType} onChange={e => onChange('salaryType', e.target.value)} style={inputStyle}>
              {SAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
            <input type="checkbox" id="pf" checked={form.pfApplicable} onChange={e => onChange('pfApplicable', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <label htmlFor="pf" style={{ fontSize: 13, color: '#ccc', cursor: 'pointer' }}>PF Applicable</label>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #2a2a3e', background: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save Employee'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeMaster() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterVertical, setFilterVertical] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editEmp, setEditEmp] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    erpEmployeeApi.getAll(filterVertical || undefined)
      .then(data => setEmployees(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterVertical])

  function openAdd() {
    setEditEmp(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(emp) {
    setEditEmp(emp)
    setForm({
      name: emp.name || '',
      phone: emp.phone || '',
      email: emp.email || '',
      aadhar: emp.aadhar || '',
      pan: emp.pan || '',
      bankAccount: emp.bankAccount || '',
      ifsc: emp.ifsc || '',
      department: emp.department || '',
      designation: emp.designation || '',
      vertical: emp.vertical || 'RESTAURANT',
      employmentType: emp.employmentType || 'FULL_TIME',
      salaryType: emp.salaryType || 'FIXED',
      basicSalary: parseFloat(emp.basicSalary || 0),
      hra: parseFloat(emp.hra || 0),
      otherAllowances: parseFloat(emp.otherAllowances || 0),
      pfApplicable: !!emp.pfApplicable,
      joiningDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name) return setMsg({ type: 'error', text: 'Name is required.' })
    setSaving(true)
    try {
      if (editEmp) {
        await erpEmployeeApi.update(editEmp.id, form)
      } else {
        await erpEmployeeApi.create(form)
      }
      setMsg({ type: 'success', text: editEmp ? 'Employee updated.' : 'Employee created.' })
      setShowModal(false)
      load()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this employee?')) return
    try {
      await erpEmployeeApi.deactivate(id)
      setMsg({ type: 'success', text: 'Employee deactivated.' })
      load()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    }
  }

  const filtered = employees.filter(e => {
    if (filterActive === 'active' && e.active === false) return false
    if (filterActive === 'inactive' && e.active !== false) return false
    return true
  })

  const thStyle = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '12px 14px', fontSize: 13, color: '#ccc', borderBottom: '1px solid #2a2a3e' }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Employees</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>ERP employee master — all verticals</p>
        </div>
        <button onClick={openAdd} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Add Employee
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
        <div>
          <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Vertical</label>
          <select value={filterVertical} onChange={e => setFilterVertical(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }}>
            <option value="">All Verticals</option>
            {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Status</label>
          <select value={filterActive} onChange={e => setFilterActive(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading employees...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>No employees found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#2a2a3e' }}>
                  {['Name', 'Phone', 'Department', 'Designation', 'Vertical', 'Salary Type', 'Basic', 'PF', 'Status', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => (
                  <tr key={emp.id || idx}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...tdStyle, color: '#fff', fontWeight: 500 }}>{emp.name}</td>
                    <td style={tdStyle}>{emp.phone || '—'}</td>
                    <td style={tdStyle}>{emp.department || '—'}</td>
                    <td style={tdStyle}>{emp.designation || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '3px 9px', borderRadius: 20, background: '#863bff22', color: '#863bff', fontSize: 11, fontWeight: 700 }}>{emp.vertical || '—'}</span>
                    </td>
                    <td style={tdStyle}>{emp.salaryType || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                      {(parseFloat(emp.basicSalary) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: emp.pfApplicable ? '#10b981' : '#555', fontWeight: 500 }}>
                        {emp.pfApplicable ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: emp.active !== false ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: emp.active !== false ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                        {emp.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(emp)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2a3e', background: 'transparent', color: '#ccc', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => handleDeactivate(emp.id)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #ef444433', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>Deactivate</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          title={editEmp ? 'Edit Employee' : 'Add Employee'}
          form={form}
          onChange={(key, val) => setForm(f => ({ ...f, [key]: val }))}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}
    </div>
  )
}
