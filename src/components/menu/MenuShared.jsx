export function fmt(n) { return '₹'+(Number(n)||0).toLocaleString('en-IN') }

export function Inp({ label, value, onChange, type='text', placeholder='', required=false, style={} }) {
  return (
    <div style={{ marginBottom:12, ...style }}>
      <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>
        {label}{required && <span style={{ color:'#ef4444' }}> *</span>}
      </label>
      <input type={type} value={value??''} onChange={onChange} placeholder={placeholder}
        style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
          background:'var(--bg-page)', color:'var(--text)', fontSize:13, boxSizing:'border-box' }} />
    </div>
  )
}

export function Sel({ label, value, onChange, options=[], required=false }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:'block', fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:500 }}>
        {label}{required && <span style={{ color:'#ef4444' }}> *</span>}
      </label>
      <select value={value??''} onChange={onChange}
        style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
          background:'var(--bg-page)', color:'var(--text)', fontSize:13 }}>
        {options.map(o => <option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
      </select>
    </div>
  )
}

export function Chk({ label, checked, onChange }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, cursor:'pointer', marginBottom:10 }}>
      <input type="checkbox" checked={!!checked} onChange={onChange} />
      {label}
    </label>
  )
}

export function Modal({ title, onClose, onSubmit, saving, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', borderRadius:14, width:'100%',
        maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border)' }}>
          <h3 style={{ fontWeight:700, fontSize:15 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20,
            cursor:'pointer', color:'var(--text-muted)' }}>✕</button>
        </div>
        <form onSubmit={onSubmit} style={{ padding:'1.25rem 1.5rem' }}>
          {children}
          <div style={{ display:'flex', gap:8, marginTop:'1rem', paddingTop:'1rem',
            borderTop:'1px solid var(--border)' }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'9px', borderRadius:8,
              border:'1px solid var(--border)', background:'transparent', color:'var(--text)', cursor:'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex:2, padding:'9px', borderRadius:8,
              border:'none', background:'var(--accent)', color:'#fff', fontWeight:600,
              cursor:saving?'not-allowed':'pointer' }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function StatusBadge({ active, labels=['Active','Inactive'] }) {
  return (
    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
      background: active ? '#10b98122' : '#ef444422',
      color: active ? '#10b981' : '#ef4444' }}>
      {active ? labels[0] : labels[1]}
    </span>
  )
}
