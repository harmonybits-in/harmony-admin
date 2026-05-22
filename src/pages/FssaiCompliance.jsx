import { useState, useEffect, useCallback } from 'react'
import { fssaiApi } from '../api/client'

// ── Safe temperature ranges for display ──────────────────────────
const UNIT_RANGES = {
  FRIDGE:   { label: 'Fridge',    range: '1°C – 4°C',   icon: '❄️' },
  FREEZER:  { label: 'Freezer',   range: '≤ −18°C',     icon: '🧊' },
  HOT_CASE: { label: 'Hot Case',  range: '≥ 63°C',      icon: '🔥' },
  AMBIENT:  { label: 'Ambient',   range: '15°C – 25°C', icon: '🌡️' },
}

const COMPLIANCE_COLOR = {
  COMPLIANT: { bg: '#d1fae5', color: '#065f46' },
  WARNING:   { bg: '#fef3c7', color: '#92400e' },
  VIOLATION: { bg: '#fee2e2', color: '#991b1b' },
}

const AREA_OPTIONS = ['KITCHEN', 'DINING', 'WASHROOM', 'STORAGE', 'COLD_ROOM', 'ENTRANCE', 'EQUIPMENT']
const RESPONSE_OPTIONS = ['', 'PASS', 'FAIL', 'NA']

export default function FssaiCompliance() {
  const [tab, setTab] = useState('dashboard')
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading]     = useState(true)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try { setDashboard(await fssaiApi.dashboard()) } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const TABS = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'license',   label: '📋 License'   },
    { key: 'temp',      label: '🌡️ Temperature' },
    { key: 'cleaning',  label: '🧹 Cleaning'   },
    { key: 'audit',     label: '✅ Self-Audit'  },
  ]

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>FSSAI Compliance</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
          Food safety documentation, temperature logs, and audit readiness
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? '#2563eb' : '#6b7280',
            borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: -2,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab data={dashboard} loading={loading} onRefresh={loadDashboard} />}
      {tab === 'license'   && <LicenseTab onSaved={loadDashboard} />}
      {tab === 'temp'      && <TemperatureTab />}
      {tab === 'cleaning'  && <CleaningTab />}
      {tab === 'audit'     && <AuditTab />}
    </div>
  )
}

// ── Dashboard Tab ─────────────────────────────────────────────────
function DashboardTab({ data, loading, onRefresh }) {
  if (loading) return <p style={{ color: '#9ca3af' }}>Loading…</p>
  if (!data)   return <p style={{ color: '#ef4444' }}>Could not load dashboard</p>

  const score = data.overallScore ?? 0
  const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626'

  return (
    <div>
      {/* Score ring */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, minWidth: 180, textAlign: 'center' }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: scoreColor }}>{score}</div>
          <div style={{ color: '#6b7280', fontSize: 13, fontWeight: 600 }}>COMPLIANCE SCORE</div>
          <div style={{ marginTop: 8, fontSize: 12, color: score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626' }}>
            {score >= 80 ? '✅ Good' : score >= 60 ? '⚠️ Needs Attention' : '🚨 Critical'}
          </div>
        </div>

        {/* License card */}
        {data.license ? (
          <ScoreCard
            title="FSSAI License"
            icon={data.license.status === 'ACTIVE' ? '✅' : '❌'}
            lines={[
              data.license.number,
              `${data.license.type} · ${data.license.status}`,
              `Expires: ${data.license.validTo}`,
              data.license.daysLeft >= 0 ? `${data.license.daysLeft} days left` : 'EXPIRED',
            ]}
            alert={data.license.alert}
            alertMsg={`Renew in ${data.license.daysLeft} days!`}
            ok={data.license.status === 'ACTIVE' && !data.license.alert}
          />
        ) : (
          <ScoreCard title="FSSAI License" icon="⚠️" lines={['Not configured']} ok={false} />
        )}

        {/* Temperature card */}
        <ScoreCard
          title="Today's Temp Logs"
          icon={data.temperature.ok ? '✅' : data.temperature.logsToday > 0 ? '⚠️' : '❌'}
          lines={[
            `${data.temperature.logsToday} readings logged`,
            data.temperature.violations > 0 ? `${data.temperature.violations} VIOLATION(S)!` : 'No violations',
          ]}
          ok={data.temperature.ok}
          alert={data.temperature.violations > 0}
          alertMsg={`${data.temperature.violations} temperature violation(s) today`}
        />

        {/* Cleaning card */}
        <ScoreCard
          title="Today's Cleaning"
          icon={data.cleaning.ok ? '✅' : '❌'}
          lines={[`${data.cleaning.logsToday} areas logged today`]}
          ok={data.cleaning.ok}
        />

        {/* Last audit card */}
        {data.lastAudit ? (
          <ScoreCard
            title="Last Self-Audit"
            icon={data.lastAudit.score >= 80 ? '✅' : data.lastAudit.score >= 60 ? '⚠️' : '❌'}
            lines={[
              `Score: ${data.lastAudit.score}%`,
              `${data.lastAudit.pass} PASS · ${data.lastAudit.fail} FAIL`,
              `Date: ${data.lastAudit.date}`,
            ]}
            ok={data.lastAudit.score >= 80}
          />
        ) : (
          <ScoreCard title="Self-Audit" icon="📋" lines={['No audit completed yet']} ok={false} />
        )}
      </div>

      {/* FSSAI compliance tips */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10, color: '#1e40af' }}>📌 FSSAI Inspector Checklist — Common Violations</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#374151', fontSize: 14, lineHeight: 2 }}>
          <li>FSSAI license not displayed prominently at premises</li>
          <li>No daily temperature logs for refrigerators/freezers</li>
          <li>Raw and cooked food stored together without separation</li>
          <li>Staff without hair nets or handling food with jewellery</li>
          <li>No pest control records or expired pest control contract</li>
          <li>Food items without labeling/date marking</li>
        </ul>
      </div>
    </div>
  )
}

function ScoreCard({ title, icon, lines, ok, alert, alertMsg }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${alert ? '#fca5a5' : ok ? '#bbf7d0' : '#e5e7eb'}`,
      borderRadius: 16, padding: '16px 20px', minWidth: 160, flex: '1 1 160px',
    }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 6 }}>{title}</div>
      {lines.map((l, i) => <div key={i} style={{ fontSize: 13, color: i === 0 ? '#111' : '#6b7280', marginBottom: 2 }}>{l}</div>)}
      {alert && alertMsg && (
        <div style={{ marginTop: 8, background: '#fee2e2', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#991b1b' }}>
          🚨 {alertMsg}
        </div>
      )}
    </div>
  )
}

// ── License Tab ───────────────────────────────────────────────────
function LicenseTab({ onSaved }) {
  const [lic, setLic]     = useState(null)
  const [form, setForm]   = useState({ licenseNumber: '', licenseType: 'STATE', holderName: '', fssaiRegion: '', validFrom: '', validTo: '', status: 'ACTIVE' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fssaiApi.getLicense().then(data => {
      if (data) {
        setLic(data)
        setForm({
          licenseNumber: data.licenseNumber ?? '',
          licenseType:   data.licenseType   ?? 'STATE',
          holderName:    data.holderName     ?? '',
          fssaiRegion:   data.fssaiRegion    ?? '',
          validFrom:     data.validFrom      ?? '',
          validTo:       data.validTo        ?? '',
          status:        data.status         ?? 'ACTIVE',
        })
      }
    }).catch(() => {})
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = await fssaiApi.saveLicense(form)
      setLic(saved)
      onSaved()
      alert('License saved!')
    } catch (err) {
      alert(err.message ?? 'Save failed')
    }
    setSaving(false)
  }

  const f = (key, label, type = 'text', opts = null) => (
    <label style={labelStyle}>
      {label}
      {opts ? (
        <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle}>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
      )}
    </label>
  )

  return (
    <div style={{ maxWidth: 680 }}>
      {/* FSSAI license display card */}
      {lic && (
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: 16, padding: 24, color: '#fff', marginBottom: 24, position: 'relative' }}>
          <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 2 }}>FOOD SAFETY AND STANDARDS AUTHORITY OF INDIA</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 3, marginTop: 8 }}>{lic.licenseNumber}</div>
          <div style={{ marginTop: 12, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14 }}>
            <div><div style={{ opacity: 0.7, fontSize: 11 }}>TYPE</div>{lic.licenseType}</div>
            <div><div style={{ opacity: 0.7, fontSize: 11 }}>HOLDER</div>{lic.holderName ?? '—'}</div>
            <div><div style={{ opacity: 0.7, fontSize: 11 }}>VALID TILL</div>{lic.validTo}</div>
            <div><div style={{ opacity: 0.7, fontSize: 11 }}>STATUS</div>
              <span style={{ background: lic.status === 'ACTIVE' ? '#4ade80' : '#f87171', color: '#111', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                {lic.status}
              </span>
            </div>
          </div>
          {lic.fssaiRegion && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>{lic.fssaiRegion}</div>}
        </div>
      )}

      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{lic ? 'Update FSSAI License' : 'Add FSSAI License'}</h3>
        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {f('licenseNumber', 'License Number *')}
          {f('licenseType', 'License Type', 'text', ['BASIC', 'STATE', 'CENTRAL'])}
          {f('holderName', 'License Holder Name')}
          {f('fssaiRegion', 'FSSAI Regional Office')}
          {f('validFrom', 'Valid From', 'date')}
          {f('validTo', 'Valid To *', 'date')}
          {f('status', 'Status', 'text', ['ACTIVE', 'RENEWAL_PENDING', 'SUSPENDED', 'EXPIRED'])}
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={saving} style={btnStyle('#2563eb')}>
              {saving ? 'Saving…' : 'Save License'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ background: '#fef3c7', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#92400e', marginTop: 16 }}>
        💡 <strong>Tip:</strong> FSSAI license must be renewed before expiry at <strong>foscos.fssai.gov.in</strong>.
        Harmony will send WhatsApp reminders 30, 15, 7, and 1 day before expiry to the restaurant owner's phone.
      </div>
    </div>
  )
}

// ── Temperature Tab ───────────────────────────────────────────────
function TemperatureTab() {
  const [logs, setLogs]   = useState([])
  const [days, setDays]   = useState(7)
  const [form, setForm]   = useState({ unitName: '', unitType: 'FRIDGE', tempCelsius: '', recordedBy: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (d) => {
    try { setLogs(await fssaiApi.getTempLogs(d)) } catch { /* ignore */ }
  }, [])

  useEffect(() => { load(days) }, [load, days])

  async function handleLog(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await fssaiApi.logTemperature({
        unitName:    form.unitName,
        unitType:    form.unitType,
        tempCelsius: parseFloat(form.tempCelsius),
        recordedBy:  form.recordedBy || null,
        notes:       form.notes || null,
      })
      setForm(f => ({ ...f, tempCelsius: '', notes: '' }))
      load(days)
    } catch (err) {
      alert(err.message ?? 'Failed to log')
    }
    setSaving(false)
  }

  return (
    <div>
      {/* Quick-entry form */}
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Log Temperature Reading</h3>
        <form onSubmit={handleLog} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={labelStyle}>
            Unit Name
            <input required value={form.unitName} onChange={e => setForm(f => ({ ...f, unitName: e.target.value }))}
              placeholder="e.g. Main Fridge" style={{ ...inputStyle, width: 160 }} />
          </label>
          <label style={labelStyle}>
            Type
            <select value={form.unitType} onChange={e => setForm(f => ({ ...f, unitType: e.target.value }))} style={{ ...inputStyle, width: 120 }}>
              {Object.entries(UNIT_RANGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Temp (°C)
            <input required type="number" step="0.1" value={form.tempCelsius}
              onChange={e => setForm(f => ({ ...f, tempCelsius: e.target.value }))}
              style={{ ...inputStyle, width: 100 }} />
          </label>
          <label style={labelStyle}>
            Recorded By
            <input value={form.recordedBy} onChange={e => setForm(f => ({ ...f, recordedBy: e.target.value }))}
              placeholder="Name" style={{ ...inputStyle, width: 130 }} />
          </label>
          <button type="submit" disabled={saving} style={{ ...btnStyle('#2563eb'), marginTop: 20 }}>
            {saving ? 'Logging…' : 'Log Reading'}
          </button>
        </form>
        {/* Safe range reference */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          {Object.entries(UNIT_RANGES).map(([k, v]) => (
            <div key={k} style={{ fontSize: 12, color: '#6b7280' }}>
              {v.icon} <strong>{v.label}:</strong> {v.range}
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Temperature History</h3>
        <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ ...inputStyle, width: 120 }}>
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Unit', 'Type', 'Temp (°C)', 'Compliance', 'Recorded By', 'Time', 'Notes'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>No logs in this period. Start logging daily readings.</td></tr>
            ) : logs.map(l => {
              const cc = COMPLIANCE_COLOR[l.compliance] ?? {}
              return (
                <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{l.unitName}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{UNIT_RANGES[l.unitType]?.icon} {l.unitType}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 16 }}>{l.tempCelsius}°C</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ ...cc, padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{l.compliance}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{l.recordedBy ?? '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{l.recordedAt ? new Date(l.recordedAt).toLocaleString('en-IN') : '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{l.notes ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Cleaning Tab ──────────────────────────────────────────────────
function CleaningTab() {
  const [logs, setLogs]   = useState([])
  const [days, setDays]   = useState(7)
  const [form, setForm]   = useState({ area: 'KITCHEN', frequency: 'DAILY', completedBy: '', verifiedBy: '', sanitizerUsed: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (d) => {
    try { setLogs(await fssaiApi.getCleaningLogs(d)) } catch { /* ignore */ }
  }, [])

  useEffect(() => { load(days) }, [load, days])

  async function handleLog(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await fssaiApi.logCleaning({ ...form })
      setForm(f => ({ ...f, completedBy: '', verifiedBy: '', sanitizerUsed: '', notes: '' }))
      load(days)
    } catch (err) {
      alert(err.message ?? 'Failed')
    }
    setSaving(false)
  }

  return (
    <div>
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Log Cleaning Activity</h3>
        <form onSubmit={handleLog} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={labelStyle}>
            Area *
            <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} style={inputStyle}>
              {AREA_OPTIONS.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Frequency
            <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} style={inputStyle}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </label>
          <label style={labelStyle}>
            Completed By *
            <input required value={form.completedBy} onChange={e => setForm(f => ({ ...f, completedBy: e.target.value }))} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Verified By
            <input value={form.verifiedBy} onChange={e => setForm(f => ({ ...f, verifiedBy: e.target.value }))} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Sanitizer Used
            <input value={form.sanitizerUsed} onChange={e => setForm(f => ({ ...f, sanitizerUsed: e.target.value }))} placeholder="e.g. Dettol, Phenyl" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Notes
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={saving} style={btnStyle('#2563eb')}>
              {saving ? 'Logging…' : 'Log Cleaning'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Cleaning History</h3>
        <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ ...inputStyle, width: 120 }}>
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Area', 'Frequency', 'Completed By', 'Verified By', 'Sanitizer', 'Time'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>No cleaning logs. Log activities daily for FSSAI compliance.</td></tr>
            ) : logs.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{l.area.replace('_', ' ')}</td>
                <td style={{ padding: '10px 14px', color: '#6b7280' }}>{l.frequency}</td>
                <td style={{ padding: '10px 14px' }}>{l.completedBy}</td>
                <td style={{ padding: '10px 14px', color: '#6b7280' }}>{l.verifiedBy ?? '—'}</td>
                <td style={{ padding: '10px 14px', color: '#6b7280' }}>{l.sanitizerUsed ?? '—'}</td>
                <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{l.completedAt ? new Date(l.completedAt).toLocaleString('en-IN') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Audit Tab ─────────────────────────────────────────────────────
function AuditTab() {
  const [history, setHistory]     = useState([])
  const [session, setSession]     = useState(null)
  const [items, setItems]         = useState([])
  const [auditedBy, setAuditedBy] = useState('')
  const [starting, setStarting]   = useState(false)
  const [saving, setSaving]       = useState(false)

  const loadHistory = useCallback(async () => {
    try { setHistory(await fssaiApi.getAuditHistory()) } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  async function handleStart(e) {
    e.preventDefault()
    setStarting(true)
    try {
      const s = await fssaiApi.startAudit({ auditedBy: auditedBy || null })
      const full = await fssaiApi.getAuditSession(s.id)
      setSession(full)
      setItems(JSON.parse(full.itemsJson || '[]'))
    } catch (err) {
      alert(err.message ?? 'Failed to start audit')
    }
    setStarting(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fssaiApi.updateAudit(session.id, items)
    } catch (err) {
      alert(err.message ?? 'Save failed')
    }
    setSaving(false)
  }

  async function handleComplete() {
    if (!confirm('Complete and lock this audit?')) return
    setSaving(true)
    try {
      await fssaiApi.updateAudit(session.id, items)
      await fssaiApi.completeAudit(session.id)
      setSession(null)
      setItems([])
      loadHistory()
    } catch (err) {
      alert(err.message ?? 'Failed')
    }
    setSaving(false)
  }

  function setResponse(key, value) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, response: value } : i))
  }

  function setNotes(key, value) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, notes: value } : i))
  }

  // Group by category
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const passCount = items.filter(i => i.response === 'PASS').length
  const failCount = items.filter(i => i.response === 'FAIL').length
  const answered  = passCount + failCount
  const pct       = answered > 0 ? Math.round(passCount / answered * 100) : 0

  if (session) {
    return (
      <div>
        {/* Live score bar */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Self-Audit — {session.auditDate}</div>
            {session.auditedBy && <div style={{ fontSize: 13, color: '#374151' }}>Audited by: {session.auditedBy}</div>}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: pct >= 80 ? '#16a34a' : pct >= 60 ? '#f59e0b' : '#dc2626' }}>
              {pct}%
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{passCount} PASS · {failCount} FAIL · {items.length - answered} pending</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={btnStyle('#6b7280')}>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button onClick={handleComplete} disabled={saving} style={btnStyle('#16a34a')}>
              Complete Audit
            </button>
          </div>
        </div>

        {/* Checklist */}
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', padding: '8px 0', borderBottom: '2px solid #e5e7eb', marginBottom: 10 }}>
              {cat}
            </div>
            {catItems.map((item, i) => (
              <div key={item.key} style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px',
                marginBottom: 8, borderLeft: `4px solid ${item.response === 'PASS' ? '#22c55e' : item.response === 'FAIL' ? '#ef4444' : item.response === 'NA' ? '#9ca3af' : '#e5e7eb'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, fontSize: 14, color: '#111', lineHeight: 1.5 }}>
                    <span style={{ color: '#9ca3af', marginRight: 6, fontSize: 12 }}>{i + 1}.</span>
                    {item.question}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {['PASS', 'FAIL', 'NA'].map(r => (
                      <button key={r} onClick={() => setResponse(item.key, item.response === r ? '' : r)}
                        style={{
                          padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: item.response === r
                            ? (r === 'PASS' ? '#22c55e' : r === 'FAIL' ? '#ef4444' : '#9ca3af')
                            : '#f3f4f6',
                          color: item.response === r ? '#fff' : '#374151',
                        }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                {(item.response === 'FAIL' || item.notes) && (
                  <input value={item.notes || ''} onChange={e => setNotes(item.key, e.target.value)}
                    placeholder="Add notes…"
                    style={{ marginTop: 8, width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // ── Audit list / start new ─────────────────────────────────────
  return (
    <div>
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Start New Self-Audit</h3>
        <p style={{ margin: '0 0 14px', fontSize: 14, color: '#6b7280' }}>
          24 standard FSSAI inspection questions across 6 categories. Takes ~10 minutes.
          Do this monthly or before expecting an inspection.
        </p>
        <form onSubmit={handleStart} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <label style={labelStyle}>
            Audited By
            <input value={auditedBy} onChange={e => setAuditedBy(e.target.value)}
              placeholder="Manager name" style={{ ...inputStyle, width: 200 }} />
          </label>
          <button type="submit" disabled={starting} style={btnStyle('#2563eb')}>
            {starting ? 'Starting…' : 'Start Audit →'}
          </button>
        </form>
      </div>

      {/* History */}
      <h3 style={{ fontSize: 16, marginBottom: 12 }}>Audit History</h3>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Date', 'Audited By', 'Score', 'Pass', 'Fail', 'Status', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>No audits yet. Conduct your first FSSAI self-audit above.</td></tr>
            ) : history.map(a => {
              const sc = a.score >= 80 ? '#16a34a' : a.score >= 60 ? '#f59e0b' : '#dc2626'
              return (
                <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{a.auditDate}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{a.auditedBy ?? '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontWeight: 800, fontSize: 18, color: sc }}>{a.score}%</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 600 }}>{a.passCount}</td>
                  <td style={{ padding: '10px 14px', color: '#dc2626', fontWeight: 600 }}>{a.failCount}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: a.status === 'COMPLETED' ? '#d1fae5' : '#fef3c7', color: a.status === 'COMPLETED' ? '#065f46' : '#92400e', padding: '3px 10px', borderRadius: 4, fontSize: 12 }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {a.status === 'DRAFT' && (
                      <button onClick={async () => {
                        const full = await fssaiApi.getAuditSession(a.id)
                        setSession(full)
                        setItems(JSON.parse(full.itemsJson || '[]'))
                      }} style={{ background: 'none', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                        Continue
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────
const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 8,
  padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 500,
})

const panelStyle = {
  background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12,
  padding: 20, marginBottom: 20,
}

const labelStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#374151', fontWeight: 500,
}

const inputStyle = {
  padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14,
  outline: 'none', marginTop: 2, background: '#fff',
}
