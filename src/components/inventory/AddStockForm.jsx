// src/components/inventory/AddStockForm.jsx
import { useState } from 'react'
import { useToast } from '../../hooks/useToast'

const MOCK_AVAILABLE = [
  { id:1, cat:'Frozen',       name:'Sweet Corn',          convQty:1000, availStock:'30 Pkts', units:['Pkts','GM']  },
  { id:2, cat:'',             name:'Basil',               convQty:null, availStock:'0.5 Kg',  units:['Kg']         },
  { id:3, cat:'Confectionery',name:'Domix',               convQty:500,  availStock:'2 Pkts',  units:['Pkts','GM']  },
  { id:4, cat:'Frozen',       name:'French Fries',        convQty:2500, availStock:'10 Pkts', units:['Pkts','GM']  },
  { id:5, cat:'',             name:'Honey Mustard Dressing',convQty:null,availStock:'1 Pkts', units:['Pkts']       },
  { id:6, cat:'Sauces',       name:'Tandoori',            convQty:1000, availStock:'1 Pkts',  units:['Pkts','GM']  },
  { id:7, cat:'Frozen',       name:'Tikki',               convQty:28,   availStock:'16 Pkts', units:['Pkts','Piece']},
]

const INP = { padding:'7px 10px', borderRadius:5, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }
const BTN_RED = { padding:'7px 16px', borderRadius:5, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }
const BTN_OUT = { padding:'7px 16px', borderRadius:5, border:'1px solid #dde1e7',
  background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }
const TH = { padding:'10px 12px', fontSize:11, color:'#888', fontWeight:700, textAlign:'left',
  background: 'linear-gradient(#f8f9fb,#f0f2f5)', borderBottom:'2px solid #e8eaed', whiteSpace:'nowrap' }
const TD = { padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f5f5f5', verticalAlign:'middle' }

export default function AddStockForm({ type, onSave, onCancel }) {
  const toast = useToast()
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [rows, setRows] = useState([{ id:1, raw:'Bag L', stock:'', unit:'Pkts', comment:'' }])

  function addRow() {
    setRows(p=>[...p,{ id:Date.now(), raw:'', stock:'', unit:'', comment:'' }])
  }

  async function handleSave() {
    toast.success(`${type} stock updated!`)
    onSave()
  }

  return (
    <div style={{ background:'#fff', minHeight:'100%', padding:'24px' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:18, fontWeight:800, color:'#1a1a2e', margin:0 }}>
          Add {type} Stock
        </h1>
      </div>
      {/* Date */}
      <div style={{ marginBottom:20 }}>
        <label style={{ display:'block', fontSize:11, color:'#555', fontWeight:600, marginBottom:6 }}>
          Date <span style={{ color:'#e53e3e' }}>*</span>
        </label>
        <div style={{ display:'flex', alignItems:'center', gap:6, ...INP, width:200 }}>
          <span>📅</span>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}
            style={{ border:'none', outline:'none', fontSize:13, color:'#111', background:'transparent' }}/>
        </div>
      </div>
      {/* Action bar */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button onClick={addRow} style={{ ...BTN_RED, display:'flex', alignItems:'center', gap:6 }}>
          ＋ Add New
        </button>
      </div>
      {/* Table */}
      <div style={{ border:'1px solid #e8eaed', borderRadius:8, overflow:'hidden', marginBottom:20 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            {['Raw Material','Available Stock','Unit','Comments',''].map(h=>(
              <th key={h} style={TH}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((row,i)=>(
              <tr key={row.id} style={{ background:i%2===0?'#fff':'#fdfdfd' }}>
                <td style={TD}>
                  <div style={{ position:'relative' }}>
                    <select value={row.raw} onChange={e=>setRows(rs=>rs.map(r=>r.id===row.id?{...r,raw:e.target.value}:r))}
                      style={{ ...INP, width:'100%', paddingRight:24, appearance:'none' }}>
                      <option value="">Select Raw Material</option>
                      {MOCK_AVAILABLE.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                    <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                      pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
                  </div>
                </td>
                <td style={TD}>
                  <input value={row.stock} placeholder="Available Stock"
                    onChange={e=>setRows(rs=>rs.map(r=>r.id===row.id?{...r,stock:e.target.value}:r))}
                    style={{ ...INP, width:'100%' }}/>
                </td>
                <td style={TD}>
                  <div style={{ position:'relative' }}>
                    <select value={row.unit} onChange={e=>setRows(rs=>rs.map(r=>r.id===row.id?{...r,unit:e.target.value}:r))}
                      style={{ ...INP, width:'100%', paddingRight:24, appearance:'none' }}>
                      <option value="">Unit</option>
                      {['Pkts','Kg','GM','ltr','ml','Piece','NOS','Milligram'].map(u=><option key={u} value={u}>{u}</option>)}
                    </select>
                    <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                      pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
                  </div>
                </td>
                <td style={TD}>
                  <input value={row.comment} placeholder="Comments"
                    onChange={e=>setRows(rs=>rs.map(r=>r.id===row.id?{...r,comment:e.target.value}:r))}
                    style={{ ...INP, width:'100%' }}/>
                </td>
                <td style={{ ...TD, width:40 }}>
                  {rows.length>1 && (
                    <button onClick={()=>setRows(rs=>rs.filter(r=>r.id!==row.id))}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:16 }}
                      onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                      onMouseLeave={e=>e.currentTarget.style.color='#ccc'}>🗑</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:12 }}>
        <button onClick={onCancel} style={BTN_OUT}>Cancel</button>
        <button onClick={handleSave} style={{ ...BTN_RED, boxShadow:'0 2px 8px rgba(229,62,62,.25)' }}>
          Save Changes
        </button>
      </div>
    </div>
  )
}
