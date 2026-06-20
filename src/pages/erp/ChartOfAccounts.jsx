import { useState, useEffect } from 'react'
import { erpAccountApi } from '../../api/client'

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']
const VERTICALS = ['RESTAURANT', 'JEWELLERY', 'SOFTWARE', 'COMMON']

const TYPE_COLORS = {
  ASSET:     { bg: '#10b98122', color: '#10b981' },
  LIABILITY: { bg: '#f59e0b22', color: '#f59e0b' },
  EQUITY:    { bg: '#863bff22', color: '#863bff' },
  INCOME:    { bg: '#06b6d422', color: '#06b6d4' },
  EXPENSE:   { bg: '#ef444422', color: '#ef4444' },
}

const EMPTY_FORM = {
  code: '', name: '', accountType: 'ASSET', accountGroup: '', vertical: 'COMMON', openingBalance: 0,
}

function Badge({ value, map }) {
  const cfg = map[value] || { bg: '#33333322', color: '#888' }
  return (
    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700 }}>
      {value}
    </span>
  )
}

function Modal({ title, form, onChange, onSave, onClose, saving }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1A1A2E', border: '1px solid #2a2a3e', borderRadius: 14, padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'code', label: 'Account Code', type: 'text' },
            { key: 'name', label: 'Account Name', type: 'text' },
            { key: 'accountGroup', label: 'Account Group', type: 'text' },
            { key: 'openingBalance', label: 'Opening Balance', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5, fontWeight: 600 }}>{f.label}</label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={e => onChange(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#0F0F1A', color: '#fff', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5, fontWeight: 600 }}>Account Type</label>
            <select
              value={form.accountType}
              onChange={e => onChange('accountType', e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#0F0F1A', color: '#fff', fontSize: 13 }}
            >
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 5, fontWeight: 600 }}>Business Vertical</label>
            <select
              value={form.vertical}
              onChange={e => onChange('vertical', e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#0F0F1A', color: '#fff', fontSize: 13 }}
            >
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #2a2a3e', background: 'transparent', color: '#888', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterType, setFilterType] = useState('All')
  const [filterVertical, setFilterVertical] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    erpAccountApi.getAll()
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditAccount(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(acc) {
    setEditAccount(acc)
    setForm({
      code: acc.code || '',
      name: acc.name || '',
      accountType: acc.accountType || 'ASSET',
      accountGroup: acc.accountGroup || '',
      vertical: acc.vertical || 'COMMON',
      openingBalance: acc.openingBalance || 0,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.code || !form.name) return setMsg({ type: 'error', text: 'Code and Name are required.' })
    setSaving(true)
    try {
      if (editAccount) {
        await erpAccountApi.update(editAccount.id, form)
      } else {
        await erpAccountApi.create(form)
      }
      setMsg({ type: 'success', text: editAccount ? 'Account updated.' : 'Account created.' })
      setShowModal(false)
      load()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this account?')) return
    try {
      await erpAccountApi.deactivate(id)
      setMsg({ type: 'success', text: 'Account deactivated.' })
      load()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    }
  }

  const filtered = accounts.filter(a => {
    if (filterType !== 'All' && a.accountType !== filterType) return false
    if (filterVertical !== 'All' && a.vertical !== filterVertical) return false
    return true
  })

  const thStyle = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '12px 14px', fontSize: 13, color: '#ccc', borderBottom: '1px solid #2a2a3e' }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>Chart of Accounts</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>Manage all GL accounts across verticals</p>
        </div>
        <button
          onClick={openAdd}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#863bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + Add Account
        </button>
      </div>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: msg.type === 'success' ? '#10b98122' : '#ef444422', color: msg.type === 'success' ? '#10b981' : '#ef4444', fontSize: 13, border: `1px solid ${msg.type === 'success' ? '#10b98133' : '#ef444433'}` }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Type</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }}
          >
            <option value="All">All Types</option>
            {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 4 }}>Vertical</label>
          <select
            value={filterVertical}
            onChange={e => setFilterVertical(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#1A1A2E', color: '#fff', fontSize: 13 }}
          >
            <option value="All">All Verticals</option>
            {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#1A1A2E', borderRadius: 12, border: '1px solid #2a2a3e', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading accounts...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>No accounts found. Add one to get started.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#2a2a3e' }}>
                  {['Code', 'Name', 'Type', 'Group', 'Vertical', 'Opening Bal', 'Active', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(acc => (
                  <tr key={acc.id} style={{ transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...tdStyle, color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>{acc.code}</td>
                    <td style={{ ...tdStyle, color: '#fff', fontWeight: 500 }}>{acc.name}</td>
                    <td style={tdStyle}><Badge value={acc.accountType} map={TYPE_COLORS} /></td>
                    <td style={tdStyle}>{acc.accountGroup || '—'}</td>
                    <td style={tdStyle}>{acc.vertical || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>
                      {(acc.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: acc.active !== false ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: acc.active !== false ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                        {acc.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => openEdit(acc)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2a3e', background: 'transparent', color: '#ccc', fontSize: 12, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeactivate(acc.id)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #ef444433', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                        >
                          Deactivate
                        </button>
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
          title={editAccount ? 'Edit Account' : 'Add Account'}
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
