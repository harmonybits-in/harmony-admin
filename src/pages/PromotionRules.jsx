import { useState, useEffect, useCallback } from 'react'
import { promotionRuleApi } from '../api/client'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN']
const DAY_LABELS = { MON:'Mon', TUE:'Tue', WED:'Wed', THU:'Thu', FRI:'Fri', SAT:'Sat', SUN:'Sun' }

function fmt(n) { return '₹' + (Number(n) || 0).toLocaleString('en-IN') }

function Badge({ text, color = '#6366f1' }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
      background: color + '22', color }}>
      {text}
    </span>
  )
}

function Inp({ label, value, onChange, type = 'text', placeholder = '', required = false, hint, min, step }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} min={min} step={step}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

function Sel({ label, value, onChange, options = [], required = false }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <select value={value ?? ''} onChange={onChange}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13 }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  )
}

// Day picker
function DayPicker({ selected, onChange }) {
  const allSelected = selected.length === 7
  function toggle(d) {
    onChange(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d])
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
        Applicable Days
      </label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => onChange(allSelected ? [] : [...DAYS])}
          style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${allSelected ? 'var(--accent)' : 'var(--border)'}`,
            background: allSelected ? 'var(--accent)' : 'transparent',
            color: allSelected ? '#fff' : 'var(--text)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
          All
        </button>
        {DAYS.map(d => {
          const active = selected.includes(d)
          return (
            <button key={d} type="button" onClick={() => toggle(d)}
              style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
              {DAY_LABELS[d]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function rulesSummary(p) {
  const parts = []
  if (p.minOrderAmount) parts.push(`Min order ₹${p.minOrderAmount}`)
  if (p.applicableDays && p.applicableDays !== 'ALL') parts.push(`Days: ${p.applicableDays}`)
  if (p.startTime && p.endTime) parts.push(`${p.startTime}–${p.endTime}`)
  if (p.startDate) parts.push(`From ${p.startDate}`)
  if (p.endDate) parts.push(`Until ${p.endDate}`)
  return parts.length > 0 ? parts.join(' · ') : 'Always applies'
}

// Preview card
function RulePreview({ form, selectedDays }) {
  const hasRules = form.minOrderAmount || selectedDays.length > 0 || (form.startTime && form.endTime)
  const discLabel = form.discountType === 'PERCENTAGE'
    ? `${form.discountValue || 0}% off`
    : `₹${form.discountValue || 0} off`

  return (
    <div style={{ background: 'var(--accent)11', border: '1px solid var(--accent)33',
      borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>PREVIEW</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
        {form.name || 'Promotion Name'} — <span style={{ color: 'var(--accent)' }}>{discLabel}</span>
        {form.maxDiscountAmount ? ` (max ₹${form.maxDiscountAmount})` : ''}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
        {hasRules ? (
          <>
            {form.minOrderAmount && <span>Min order: ₹{form.minOrderAmount} · </span>}
            {selectedDays.length > 0 && selectedDays.length < 7 && <span>Days: {selectedDays.join(', ')} · </span>}
            {form.startTime && form.endTime && <span>Hours: {form.startTime}–{form.endTime}</span>}
          </>
        ) : 'Applies to all orders always'}
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  name: '', description: '', discountType: 'PERCENTAGE', discountValue: '',
  maxDiscountAmount: '', minOrderAmount: '', startTime: '', endTime: '',
  startDate: '', endDate: '', usageLimit: '', priority: '0', isActive: true,
}

function parseDays(str) {
  if (!str || str === 'ALL') return []
  return str.split(',').filter(Boolean)
}

function encodeDays(arr) {
  if (!arr || arr.length === 0 || arr.length === 7) return 'ALL'
  return arr.join(',')
}

function PromotionModal({ title, onClose, onSubmit, saving, form, setForm }) {
  const [selectedDays, setSelectedDays] = useState(parseDays(form.applicableDays))
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit() {
    onSubmit({ ...form, applicableDays: encodeDays(selectedDays) })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000, padding:16, overflowY:'auto' }}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, padding:24, width:'100%',
        maxWidth:540, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:20, color:'var(--text-muted)' }}>×</button>
        </div>

        <RulePreview form={form} selectedDays={selectedDays} />

        {/* Basic info */}
        <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, marginBottom:8, letterSpacing:0.5 }}>
          BASIC INFO
        </div>
        <Inp label="Promotion Name" value={form.name} onChange={set('name')} required placeholder="e.g. Happy Hour, Weekend Special" />
        <Inp label="Description" value={form.description} onChange={set('description')} placeholder="Optional customer-facing note" />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Sel label="Discount Type" value={form.discountType} onChange={set('discountType')} required
            options={[{ value:'PERCENTAGE', label:'Percentage (%)' }, { value:'FLAT', label:'Flat (₹)' }]} />
          <Inp label={form.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount ₹'}
            value={form.discountValue} onChange={set('discountValue')} type="number" min="0.01" step="0.01" required />
        </div>

        {form.discountType === 'PERCENTAGE' && (
          <Inp label="Max Discount Cap (₹)" value={form.maxDiscountAmount} onChange={set('maxDiscountAmount')}
            type="number" min="0" hint="Optional — caps the maximum discount amount" />
        )}

        {/* Rules */}
        <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, margin:'16px 0 8px', letterSpacing:0.5 }}>
          CONDITIONS (all must be met)
        </div>

        <Inp label="Min Order Amount (₹)" value={form.minOrderAmount} onChange={set('minOrderAmount')}
          type="number" min="0" hint="Leave blank for no minimum" />

        <DayPicker selected={selectedDays} onChange={setSelectedDays} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Inp label="Start Time" value={form.startTime} onChange={set('startTime')} type="time" hint="Happy hour start" />
          <Inp label="End Time"   value={form.endTime}   onChange={set('endTime')}   type="time" hint="Happy hour end" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Inp label="Valid From" value={form.startDate} onChange={set('startDate')} type="date" />
          <Inp label="Valid Until" value={form.endDate} onChange={set('endDate')} type="date" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <Inp label="Usage Limit" value={form.usageLimit} onChange={set('usageLimit')} type="number" min="1"
            hint="Total redemptions allowed (blank = unlimited)" />
          <Inp label="Priority" value={form.priority} onChange={set('priority')} type="number" min="0"
            hint="Higher = evaluated first" />
        </div>

        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', marginBottom:16 }}>
          <input type="checkbox" checked={!!form.isActive}
            onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
          Active (visible to POS)
        </label>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} disabled={saving}
            style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)',
              background:'transparent', color:'var(--text)', fontSize:13, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'var(--accent)',
              color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Evaluate tester widget
function EvaluateTester() {
  const [amount, setAmount] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function run() {
    if (!amount || Number(amount) <= 0) return toast.error('Enter a valid order amount')
    setLoading(true)
    try {
      const data = await promotionRuleApi.evaluate(Number(amount))
      setResults(data)
    } catch (e) { toast.error(e.message || 'Evaluation failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:12, padding:20, marginBottom:24 }}>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Test Promotions</div>
      <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>Order Amount (₹)</div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1500"
            style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
              background:'var(--bg-page)', color:'var(--text)', fontSize:13, boxSizing:'border-box' }} />
        </div>
        <button onClick={run} disabled={loading}
          style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'var(--accent)',
            color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
          {loading ? 'Testing…' : 'Test Now'}
        </button>
      </div>

      {results !== null && (
        <div style={{ marginTop:14 }}>
          {results.length === 0 ? (
            <div style={{ fontSize:13, color:'var(--text-muted)', fontStyle:'italic' }}>
              No promotions apply for this order amount right now.
            </div>
          ) : (
            results.map((r, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'10px 12px', background:'#10b98111', borderRadius:8, marginTop:8,
                border:'1px solid #10b98133' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{r.promotion.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{r.label}</div>
                </div>
                <div style={{ fontSize:16, fontWeight:800, color:'#10b981' }}>-{fmt(r.discountAmount)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function PromotionRules() {
  const toast = useToast()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)  // null | 'add' | row
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [toggling, setToggling] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await promotionRuleApi.getAll()) }
    catch (e) { toast.error(e.message || 'Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setForm({ ...EMPTY_FORM })
    setModal('add')
  }

  function openEdit(row) {
    setForm({
      name: row.name, description: row.description || '',
      discountType: row.discountType, discountValue: row.discountValue,
      maxDiscountAmount: row.maxDiscountAmount || '', minOrderAmount: row.minOrderAmount || '',
      applicableDays: row.applicableDays || 'ALL', startTime: row.startTime || '',
      endTime: row.endTime || '', startDate: row.startDate || '', endDate: row.endDate || '',
      usageLimit: row.usageLimit || '', priority: row.priority ?? 0,
      isActive: row.isActive !== false,
    })
    setModal(row)
  }

  async function handleSubmit(formWithDays) {
    if (!formWithDays.name.trim()) return toast.error('Name required')
    if (!formWithDays.discountValue || Number(formWithDays.discountValue) <= 0)
      return toast.error('Discount value required')
    setSaving(true)
    try {
      const body = {
        name: formWithDays.name.trim(),
        description: formWithDays.description || null,
        discountType: formWithDays.discountType,
        discountValue: Number(formWithDays.discountValue),
        maxDiscountAmount: formWithDays.maxDiscountAmount ? Number(formWithDays.maxDiscountAmount) : null,
        minOrderAmount: formWithDays.minOrderAmount ? Number(formWithDays.minOrderAmount) : null,
        applicableDays: formWithDays.applicableDays || 'ALL',
        startTime: formWithDays.startTime || null,
        endTime: formWithDays.endTime || null,
        startDate: formWithDays.startDate || null,
        endDate: formWithDays.endDate || null,
        usageLimit: formWithDays.usageLimit ? Number(formWithDays.usageLimit) : null,
        priority: Number(formWithDays.priority) || 0,
        isActive: formWithDays.isActive !== false,
      }
      if (modal === 'add') { await promotionRuleApi.create(body); toast.success('Promotion created') }
      else { await promotionRuleApi.update(modal.id, body); toast.success('Promotion updated') }
      setModal(null); load()
    } catch (e) { toast.error(e.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this promotion?')) return
    try { await promotionRuleApi.delete(id); toast.success('Deleted'); load() }
    catch (e) { toast.error(e.message || 'Failed to delete') }
  }

  async function handleToggle(row) {
    setToggling(row.id)
    try {
      await promotionRuleApi.toggleActive(row.id, !row.isActive)
      toast.success(row.isActive ? 'Deactivated' : 'Activated')
      load()
    } catch (e) { toast.error(e.message) }
    finally { setToggling(null) }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>Promotion Rules</h2>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
            Automatic discounts based on order rules
          </div>
        </div>
        <button onClick={openAdd}
          style={{ padding:'9px 18px', borderRadius:9, border:'none', background:'var(--accent)',
            color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          + New Promotion
        </button>
      </div>

      <EvaluateTester />

      <div style={{ background:'var(--bg-card)', borderRadius:12, overflow:'hidden' }}>
        {loading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : rows.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-muted)' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🎁</div>
            <div style={{ fontWeight:600 }}>No promotion rules yet</div>
            <div style={{ fontSize:13, marginTop:4 }}>Create your first automatic discount rule</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Name','Discount','Conditions','Usage','Priority','Status',''].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11,
                    color:'var(--text-muted)', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ borderBottom:'1px solid var(--border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  opacity: r.isActive ? 1 : 0.5 }}>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{r.name}</div>
                    {r.description && (
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{r.description}</div>
                    )}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <Badge
                      text={r.discountType === 'PERCENTAGE' ? `${r.discountValue}%` : `₹${r.discountValue}`}
                      color={r.discountType === 'PERCENTAGE' ? '#6366f1' : '#10b981'} />
                    {r.maxDiscountAmount && (
                      <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                        max {fmt(r.maxDiscountAmount)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)', maxWidth:200 }}>
                    {rulesSummary(r)}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12 }}>
                    {r.usageLimit ? `${r.usageCount}/${r.usageLimit}` : `${r.usageCount} / ∞`}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12 }}>{r.priority}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <button onClick={() => handleToggle(r)} disabled={toggling === r.id}
                      style={{ padding:'4px 12px', borderRadius:20, border:'none', fontSize:11,
                        cursor:'pointer', fontWeight:600,
                        background: r.isActive ? '#10b98122' : '#6b728022',
                        color: r.isActive ? '#10b981' : '#6b7280' }}>
                      {toggling === r.id ? '…' : r.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding:'11px 14px', whiteSpace:'nowrap' }}>
                    <button onClick={() => openEdit(r)}
                      style={{ background:'none', border:'1px solid var(--border)', borderRadius:6,
                        padding:'4px 10px', fontSize:11, cursor:'pointer', color:'var(--text)', marginRight:6 }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(r.id)}
                      style={{ background:'none', border:'1px solid #ef4444', borderRadius:6,
                        padding:'4px 10px', fontSize:11, cursor:'pointer', color:'#ef4444' }}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <PromotionModal
          title={modal === 'add' ? 'New Promotion Rule' : 'Edit Promotion Rule'}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          saving={saving}
          form={form}
          setForm={setForm}
        />
      )}
    </div>
  )
}
