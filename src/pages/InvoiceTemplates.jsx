// src/pages/InvoiceTemplates.jsx
import { useState } from 'react'
import { useToast } from '../hooks/useToast'

const TABS = ['Purchase','Purchase Order','Sales','Transfer']

// Mock template previews using SVG placeholders
const TEMPLATES = {
  Purchase: [
    { id:'std', name:'Standard Template', selected:true },
    { id:'t1',  name:'Template 1' },
    { id:'t2',  name:'Template 2' },
    { id:'t3',  name:'Template 3' },
    { id:'t4',  name:'Template 4' },
    { id:'t5',  name:'Template 5' },
  ],
  'Purchase Order': [
    { id:'std', name:'Standard Template', selected:true },
    { id:'t1',  name:'Template 1' },
    { id:'t2',  name:'Template 2' },
    { id:'t3',  name:'Template 3' },
    { id:'t4',  name:'Template 4' },
    { id:'t5',  name:'Template 5' },
  ],
  Sales: [
    { id:'std', name:'Standard Template', selected:true },
    { id:'t1',  name:'Template 1' },
    { id:'t2',  name:'Template 2' },
    { id:'t3',  name:'Template 3' },
    { id:'t4',  name:'Template 4' },
    { id:'t5',  name:'Template 5' },
    { id:'t6',  name:'Template 6' },
    { id:'t7',  name:'Template 7' },
  ],
  Transfer: [
    { id:'std', name:'Standard Template', selected:true },
    { id:'t1',  name:'Template 1' },
    { id:'t2',  name:'Template 2' },
    { id:'t3',  name:'Template 3' },
    { id:'t4',  name:'Template 4' },
  ],
}

// Template thumbnail SVG
function TemplateThumbnail({ templateId, tab, isSelected, isStd }) {
  const colors = { Purchase:'#3b82f6', 'Purchase Order':'#8b5cf6', Sales:'#e53e3e', Transfer:'#10b981' }
  const accent = colors[tab] || '#6366f1'
  return (
    <svg viewBox="0 0 160 200" style={{ width:'100%', height:'100%', display:'block' }}>
      <rect width={160} height={200} fill="#fff"/>
      {/* Header bar */}
      <rect width={160} height={28} fill={isSelected ? accent : '#f0f0f0'}/>
      <text x={8} y={18} fontSize={8} fontWeight="bold" fill={isSelected?'#fff':'#555'}>
        {tab.toUpperCase()}
      </text>
      {/* Logo placeholder */}
      <rect x={130} y={4} width={20} height={20} rx={3} fill={isSelected?'rgba(255,255,255,.3)':'#ddd'}/>
      {/* Meta info rows */}
      {[36,46,56].map(y=>(
        <rect key={y} x={8} y={y} width={80} height={4} rx={2} fill="#e8e8e8"/>
      ))}
      <rect x={100} y={36} width={50} height={20} rx={3} fill="#f5f5f5"/>
      {/* Divider */}
      <line x1={8} y1={68} x2={152} y2={68} stroke="#eee" strokeWidth={1}/>
      {/* Table header */}
      <rect x={8} y={72} width={144} height={10} rx={1} fill={isSelected?`${accent}22`:'#f8f8f8'}/>
      {[4,14,28,42].map((x,i)=>(
        <rect key={i} x={8+x*3.3} y={74} width={20} height={5} rx={1} fill={isSelected?accent:'#ccc'}/>
      ))}
      {/* Table rows */}
      {[84,96,108,120,132,144,156].map((y,i)=>(
        <g key={y}>
          <rect x={8} y={y} width={144} height={9} rx={1} fill={i%2===0?'#fff':'#fafafa'}/>
          <rect x={10} y={y+2} width={15} height={4} rx={1} fill="#e8e8e8"/>
          <rect x={40} y={y+2} width={30} height={4} rx={1} fill="#e8e8e8"/>
          <rect x={90} y={y+2} width={20} height={4} rx={1} fill="#e8e8e8"/>
          <rect x={130} y={y+2} width={18} height={4} rx={1} fill="#e8e8e8"/>
        </g>
      ))}
      {/* Footer */}
      <rect x={90} y={168} width={62} height={5} rx={1} fill="#e8e8e8"/>
      <rect x={90} y={176} width={62} height={5} rx={1} fill="#e8e8e8"/>
      {/* Selected checkmark */}
      {isSelected && (
        <g>
          <circle cx={20} cy={28} r={10} fill={accent}/>
          <text x={15} y={32} fontSize={10} fill="#fff" fontWeight="bold">✓</text>
        </g>
      )}
    </svg>
  )
}

// Preview panel (slide from right)
function PreviewPanel({ template, tab, onClose, onSelect }) {
  const [previewIdx, setPreviewIdx] = useState(0)
  const allTemplates = TEMPLATES[tab] || []
  const currentIdx = allTemplates.findIndex(t => t.id === template.id)
  const colors = { Purchase:'#3b82f6', 'Purchase Order':'#8b5cf6', Sales:'#e53e3e', Transfer:'#10b981' }
  const accent = colors[tab] || '#6366f1'

  function prev() {
    const idx = allTemplates.findIndex(t=>t.id===template.id)
    if (idx > 0) onSelect(allTemplates[idx-1])
  }
  function next() {
    const idx = allTemplates.findIndex(t=>t.id===template.id)
    if (idx < allTemplates.length-1) onSelect(allTemplates[idx+1])
  }

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.2)', zIndex:700 }}
        onClick={onClose}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:660, zIndex:800,
        background:'#fff', boxShadow:'-4px 0 24px rgba(0,0,0,.15)',
        display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #e8eaed',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e' }}>
              Preview - {template.name}
            </div>
            <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{tab} PDF</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Prev/Next arrows */}
            <button onClick={prev} disabled={currentIdx===0}
              style={{ width:32, height:32, borderRadius:6, border:'1px solid #dde1e7',
                background:'#fff', cursor:currentIdx===0?'not-allowed':'pointer',
                color:currentIdx===0?'#ccc':'#555', fontSize:16,
                display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
            <button onClick={next} disabled={currentIdx===allTemplates.length-1}
              style={{ width:32, height:32, borderRadius:6, border:'1px solid #dde1e7',
                background:'#fff', cursor:currentIdx===allTemplates.length-1?'not-allowed':'pointer',
                color:currentIdx===allTemplates.length-1?'#ccc':'#555', fontSize:16,
                display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
            <button style={{ padding:'6px 12px', borderRadius:6, border:'1px solid #dde1e7',
              background:'#fff', cursor:'pointer', fontSize:12, color:'#555',
              display:'flex', alignItems:'center', gap:5 }}>
              ⤢ View Full Screen
            </button>
            <button onClick={onClose} style={{ background:'none', border:'none',
              fontSize:22, cursor:'pointer', color:'#888' }}>×</button>
          </div>
        </div>

        {/* Preview content */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px', background:'#f8f9fb' }}>
          <div style={{ background:'#fff', borderRadius:8, padding:'32px',
            boxShadow:'0 2px 12px rgba(0,0,0,.08)', maxWidth:520, margin:'0 auto' }}>

            {/* Mock invoice */}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:800, color:'#111' }}>{tab}</div>
              <div style={{ width:40, height:40, background:accent, borderRadius:6,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontSize:16, fontWeight:700 }}>H</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div>
                <div style={{ fontSize:10, color:'#aaa', marginBottom:2 }}>Challan Number</div>
                <div style={{ fontSize:11, color:'#333' }}>CHALLAN23</div>
                <div style={{ fontSize:10, color:'#aaa', marginTop:6, marginBottom:2 }}>Order Number</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:10, color:'#aaa', marginBottom:2 }}>Date</div>
                <div style={{ fontSize:11, color:'#333' }}>09-Oct-2024</div>
                <div style={{ fontSize:10, color:'#aaa', marginTop:6, marginBottom:2 }}>Place of Supply</div>
                <div style={{ fontSize:11, color:'#333' }}>Gujarat</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <div style={{ background:'#f8f9fb', borderRadius:6, padding:'10px' }}>
                <div style={{ fontSize:10, color:'#888', marginBottom:4, fontWeight:600 }}>INVOICE FROM:</div>
                <div style={{ fontSize:11, fontWeight:700 }}>Harshit Restaurant</div>
                <div style={{ fontSize:10, color:'#666' }}>K 503, gokul dham socity, Raman nagar</div>
                <div style={{ fontSize:10, color:'#666' }}>Gujarat, Ahmedabad</div>
                <div style={{ fontSize:10, color:'#888', marginTop:4 }}>Contact: 9913080780</div>
                <div style={{ fontSize:10, color:'#888' }}>Gstin No: 24AAACH7409R225</div>
              </div>
              <div style={{ background:'#f8f9fb', borderRadius:6, padding:'10px' }}>
                <div style={{ fontSize:10, color:'#888', marginBottom:4, fontWeight:600 }}>INVOICE TO:</div>
                <div style={{ fontSize:11, fontWeight:700 }}>Petpooja Harshit Joshi</div>
                <div style={{ fontSize:10, color:'#666' }}>8S GOPAL TOWER, address</div>
                <div style={{ fontSize:10, color:'#888', marginTop:4 }}>Contact: 9687874758</div>
                <div style={{ fontSize:10, color:'#888' }}>Gstin No: 24AAACH7409R225</div>
              </div>
            </div>

            {/* Table */}
            <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:12, fontSize:11 }}>
              <thead>
                <tr style={{ background:accent, color:'#fff' }}>
                  {['Sr.','Raw Materials','Category','HSN/SAC','Quantity','Rate/Unit','Amount'].map(h=>(
                    <th key={h} style={{ padding:'6px 8px', textAlign:'left', fontSize:9 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[['1','Bbq Sauce','','','12','100/ltr','1200'],
                  ['2','Chocolate','','','15','200/kg','3000'],
                  ['3','Fish','','','15','300/kg','4500'],
                  ['4','Coconut','','','14','150/Ltr','2100']].map((row,i)=>(
                  <tr key={i} style={{ background:i%2===0?'#fff':'#f9f9f9' }}>
                    {row.map((cell,j)=>(
                      <td key={j} style={{ padding:'5px 8px', borderBottom:'1px solid #f0f0f0',
                        fontSize:10, color:'#333' }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <table style={{ fontSize:11 }}>
                {[['Round off','0'],['Grand Total','10800.000'],['Total amount in words','Ten Thousands Eight Hundred Rupees']].map(([k,v])=>(
                  <tr key={k}>
                    <td style={{ padding:'4px 12px', color:'#888', textAlign:'right' }}>{k}</td>
                    <td style={{ padding:'4px 12px', fontWeight:600 }}>{v}</td>
                  </tr>
                ))}
              </table>
            </div>
            <div style={{ marginTop:16, fontSize:10, color:'#888' }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>Terms & Conditions</div>
              <div>SUBJECT TO AHMEDABAD JURISDICTION</div>
            </div>
          </div>
        </div>

        {/* Select button */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid #e8eaed',
          background:'#fafafa', display:'flex', justifyContent:'flex-end' }}>
          <button style={{ padding:'10px 24px', borderRadius:7, border:'none',
            background:accent, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
            boxShadow:`0 2px 8px ${accent}55` }}>
            Select For {tab} Pdf
          </button>
        </div>
      </div>
    </>
  )
}

export default function InvoiceTemplates() {
  const toast = useToast()
  const [activeTab,   setActiveTab]   = useState('Purchase')
  const [selected,    setSelected]    = useState({ Purchase:'std', 'Purchase Order':'std', Sales:'std', Transfer:'std' })
  const [preview,     setPreview]     = useState(null)
  const [hovering,    setHovering]    = useState(null)

  const templates = TEMPLATES[activeTab] || []
  const colors = { Purchase:'#3b82f6', 'Purchase Order':'#8b5cf6', Sales:'#e53e3e', Transfer:'#10b981' }

  function selectTemplate(t) {
    setSelected(p => ({ ...p, [activeTab]: t.id }))
    toast.success(`${t.name} selected for ${activeTab}!`)
  }

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#1a1a2e', margin:0 }}>Invoice Management</h1>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'2px solid #f0f0f0', marginBottom:24 }}>
        {TABS.map(tab => {
          const active = tab === activeTab
          return (
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{
              padding:'10px 20px', border:'none', background:'transparent',
              cursor:'pointer', fontSize:13, fontWeight: active?700:400,
              color: active ? colors[tab] : '#555',
              borderBottom: active ? `2px solid ${colors[tab]}` : '2px solid transparent',
              marginBottom:-2, transition:'all .15s',
            }}>
              {tab}
            </button>
          )
        })}
      </div>

      {/* Template grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',
        gap:20 }}>
        {templates.map(t => {
          const isSel = selected[activeTab] === t.id
          const isHov = hovering === t.id
          const accent = colors[activeTab]

          return (
            <div key={t.id}
              onMouseEnter={()=>setHovering(t.id)}
              onMouseLeave={()=>setHovering(null)}>

              {/* Thumbnail card */}
              <div
                onClick={()=>setPreview(t)}
                style={{
                  border: `2px solid ${isSel ? accent : isHov ? '#ddd' : '#e8eaed'}`,
                  borderRadius:10, overflow:'hidden', cursor:'pointer',
                  background:'#fff', aspectRatio:'4/5',
                  boxShadow: isSel ? `0 4px 16px ${accent}30` : isHov ? '0 2px 8px rgba(0,0,0,.08)' : 'none',
                  transition:'all .15s', position:'relative',
                }}>
                <TemplateThumbnail
                  templateId={t.id}
                  tab={activeTab}
                  isSelected={isSel}
                  isStd={t.id==='std'}
                />
                {/* Hover overlay */}
                {isHov && !isSel && (
                  <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.05)',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:11, color:'#fff', background:'rgba(0,0,0,.5)',
                      padding:'4px 10px', borderRadius:20 }}>Preview</span>
                  </div>
                )}
              </div>

              {/* Label + status */}
              <div style={{ marginTop:8, textAlign:'center' }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#333' }}>{t.name}</div>
                {isSel ? (
                  <div style={{ fontSize:11, color:'#16a34a', fontWeight:600, marginTop:2 }}>
                    Selected
                  </div>
                ) : isHov ? (
                  <button onClick={()=>selectTemplate(t)} style={{
                    marginTop:4, padding:'3px 12px', borderRadius:20,
                    border:`1px solid ${accent}`, background:'#fff',
                    color:accent, fontSize:11, fontWeight:600, cursor:'pointer',
                  }}>
                    Select
                  </button>
                ) : (
                  <div style={{ height:20 }}/>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview panel */}
      {preview && (
        <PreviewPanel
          template={preview}
          tab={activeTab}
          onClose={()=>setPreview(null)}
          onSelect={t=>setPreview(t)}
        />
      )}
    </div>
  )
}
