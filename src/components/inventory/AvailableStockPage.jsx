// src/components/inventory/AvailableStockPage.jsx
import { useState, useRef, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'
import AddStockForm from './AddStockForm'

const CATEGORIES = ['All','No Category','Confectionery','Grocery','Dairy','Vagetable','Frozen','Backed','Disposal','Sauces']
const CLOSING_FREQ = ['Daily','Weekly','Monthly']

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

export default function AvailableStockPage() {
  const toast = useToast()
  const [rawSearch, setRawSearch] = useState('')
  const [category,  setCategory]  = useState('')
  const [date,      setDate]       = useState('2026-05-06')
  const [frequency, setFrequency]  = useState('Daily')
  const [showAdd,   setShowAdd]    = useState(false)
  const [showFiles, setShowFiles]  = useState(false)
  const [stockInputs, setStockInputs] = useState({})
  const filesRef = useRef(null)

  useEffect(()=>{
    function h(e){ if(filesRef.current&&!filesRef.current.contains(e.target)) setShowFiles(false) }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  if (showAdd) return <AddStockForm type="Available" onSave={()=>setShowAdd(false)} onCancel={()=>setShowAdd(false)}/>

  const filtered = MOCK_AVAILABLE.filter(r=>
    (!rawSearch || r.name.toLowerCase().includes(rawSearch.toLowerCase())) &&
    (!category || r.cat===category)
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', margin:0 }}>Available Stock</h1>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>setShowAdd(true)} style={{
            ...BTN_RED, display:'flex', alignItems:'center', gap:6,
            boxShadow:'0 2px 8px rgba(229,62,62,.25)' }}>
            ＋ Add Stock
          </button>
          <div ref={filesRef} style={{ position:'relative' }}>
            <button onClick={()=>setShowFiles(s=>!s)} style={{
              ...BTN_OUT, display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
              📄 Files <span style={{ fontSize:10 }}>▾</span>
            </button>
            {showFiles && (
              <div style={{ position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:500,
                background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
                boxShadow:'0 8px 24px rgba(0,0,0,.12)', overflow:'hidden', minWidth:180 }}>
                <div style={{ padding:'6px 14px 4px', fontSize:10, color:'#aaa', fontWeight:700 }}>IMPORT</div>
                {['Download','Upload'].map(a=>(
                  <button key={a} style={{ display:'block', width:'100%', padding:'8px 14px 8px 20px',
                    border:'none', background:'#fff', cursor:'pointer', fontSize:13, color:'#333',
                    textAlign:'left', borderBottom:'1px solid #f8f8f8' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>{a}</button>
                ))}
                <div style={{ padding:'6px 14px 4px', fontSize:10, color:'#aaa', fontWeight:700 }}>EXPORT</div>
                {['Download PDF','Uploaded Files'].map(a=>(
                  <button key={a} style={{ display:'block', width:'100%', padding:'8px 14px 8px 20px',
                    border:'none', background:'#fff', cursor:'pointer', fontSize:13, color:'#333',
                    textAlign:'left', borderBottom:'1px solid #f8f8f8' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>{a}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
        padding:'14px 16px', marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4 }}>Raw Material</label>
            <input value={rawSearch} onChange={e=>setRawSearch(e.target.value)}
              style={{ ...INP, width:160 }}/>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4 }}>Category</label>
            <div style={{ position:'relative' }}>
              <select value={category} onChange={e=>setCategory(e.target.value)}
                style={{ ...INP, minWidth:150, paddingRight:24, appearance:'none', cursor:'pointer' }}>
                {CATEGORIES.map(c=><option key={c} value={c==='All'?'':c}>{c}</option>)}
              </select>
              <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4 }}>Date</label>
            <div style={{ display:'flex', alignItems:'center', gap:6, ...INP }}>
              <span style={{ fontSize:13 }}>📅</span>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                style={{ border:'none', outline:'none', fontSize:13, color:'#111', background:'transparent' }}/>
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, color:'#aaa', marginBottom:4 }}>Closing stock being updated on</label>
            <div style={{ position:'relative' }}>
              <select value={frequency} onChange={e=>setFrequency(e.target.value)}
                style={{ ...INP, minWidth:120, paddingRight:24, appearance:'none', cursor:'pointer' }}>
                {CLOSING_FREQ.map(f=><option key={f}>{f}</option>)}
              </select>
              <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={{ ...BTN_RED, padding:'7px 18px' }}>Load</button>
            <button style={{ ...BTN_OUT, padding:'7px 14px' }}>Clear</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', border:'1px solid #e8eaed', borderRadius:10,
        overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Category</th>
              <th style={TH}>Raw Material</th>
              <th style={TH}>Available Stock</th>
              <th style={{ ...TH, textAlign:'center' }} colSpan={2}>Update Your Available Stock</th>
              <th style={TH}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item,i)=>(
              <tr key={item.id} style={{ background:i%2===0?'#fff':'#fdfdfd' }}
                onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#fff':'#fdfdfd'}>
                <td style={TD}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ color: item.cat?'#f59e0b':'#ccc', fontSize:14 }}>★</span>
                    <span style={{ fontSize:12, color:'#555' }}>{item.cat||''}</span>
                  </div>
                </td>
                <td style={TD}>
                  <div style={{ fontWeight:500 }}>{item.name}</div>
                  {item.convQty && (
                    <div style={{ fontSize:11, color:'#aaa' }}>[ Conversion Qty: {item.convQty} ]</div>
                  )}
                </td>
                <td style={{ ...TD, fontWeight:600, color:'#333' }}>{item.availStock}</td>
                {/* Update inputs */}
                {item.units.map((unit,ui)=>(
                  <td key={ui} style={TD}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <input type="number"
                        value={stockInputs[`${item.id}-${ui}`]||''}
                        onChange={e=>setStockInputs(p=>({...p,[`${item.id}-${ui}`]:e.target.value}))}
                        style={{ ...INP, width:90, textAlign:'center' }}/>
                      <span style={{ fontSize:12, color:'#888', whiteSpace:'nowrap' }}>/ {unit}</span>
                    </div>
                  </td>
                ))}
                {/* Pad if only 1 unit */}
                {item.units.length < 2 && <td style={TD}/>}
                <td style={TD}>
                  <input type="text" placeholder=""
                    style={{ ...INP, width:'100%' }}/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display:'flex', justifyContent:'flex-end', padding:'12px 16px',
          borderTop:'1px solid #f0f0f0', background:'#fafafa' }}>
          <button onClick={()=>toast.success('Stock saved!')}
            style={{ ...BTN_RED, boxShadow:'0 2px 8px rgba(229,62,62,.25)' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
