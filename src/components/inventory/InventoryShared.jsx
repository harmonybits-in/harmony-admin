// src/components/inventory/InventoryShared.jsx

export function fmt(n)  { return '₹'+(Number(n)||0).toLocaleString('en-IN') }
export function fmtN(n) { return (Number(n)||0).toFixed(1) }

export const card = {
  background:'#fff', border:'1px solid #e5e7eb', borderRadius:10,
  padding:'1.25rem', boxShadow:'0 1px 3px rgba(0,0,0,.04)',
}
export const TH = { padding:'10px 14px', textAlign:'left', fontSize:11,
  color:'#777', fontWeight:600, borderBottom:'1px solid #f0f0f0',
  background:'#fafafa', whiteSpace:'nowrap' }
export const TD = { padding:'10px 14px', fontSize:13,
  borderBottom:'1px solid #f5f5f5', verticalAlign:'middle' }
export const BTN_RED = { padding:'7px 16px', borderRadius:5, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer' }
export const BTN_OUT = { padding:'7px 16px', borderRadius:5,
  border:'1px solid #ddd', background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }
export const INP = { padding:'8px 10px', borderRadius:6, border:'1px solid #ddd',
  fontSize:13, color:'#111', background:'#fff', width:'100%', boxSizing:'border-box', outline:'none' }

export function FInp({ label, value, onChange, type='text', placeholder='', required=false }) {
  return (
    <div style={{ marginBottom:12 }}>
      {label && <label style={{ display:'block', fontSize:11, color:'#666', marginBottom:4, fontWeight:500 }}>
        {label}{required&&<span style={{color:'#e53e3e'}}> *</span>}
      </label>}
      <input type={type} value={value??''} onChange={onChange} placeholder={placeholder} style={INP}/>
    </div>
  )
}
