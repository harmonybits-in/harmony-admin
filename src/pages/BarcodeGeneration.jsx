// src/pages/BarcodeGeneration.jsx
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

const MOCK_RAW = [
  'Oil','Potato','Tomatoes','Paneer','Maida','Butter',
  'Salt','Onion','Cheese','Corn','Milk','Garlic',
]
const FIELD_OPTIONS = [
  'Custom Label','Sale Price','Unit','HSN','Batch Number',
  'Production Date','Expiry Date','Weight',
]
const ALIGN_OPT  = ['Left','Center','Right']
const POS_OPT    = ['Top','Bottom','Middle']
const WEIGHT_OPT = ['Normal','Bold','Light']
const PRINTER_TYPES = ['Label Printer','Thermal Printer','Inkjet Printer']
const LABEL_CONFIGS = [
  '1 Label (50 mm × 25 mm)',
  '2 Labels (50 mm × 25 mm)',
  '4 Labels (50 mm × 25 mm)',
]

const INP = { padding:'7px 10px', borderRadius:5, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }
const SEL = { ...INP, cursor:'pointer', appearance:'none' }
const BTN_RED = { padding:'7px 16px', borderRadius:5, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }
const BTN_OUT = { padding:'7px 16px', borderRadius:5, border:'1px solid #dde1e7',
  background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }

// ── Simple barcode SVG ────────────────────────────────────────────
function BarcodePreview({ height=50, width=130, label='1000001', subLabel='Truce Cafe | Karaswali Restaurant', topLabel='Raw Material: Potato' }) {
  const bars = Array.from({length:48},(_,i)=>({
    x:i*2.5+10, w: i%3===0?2:i%5===0?1.5:1,
    fill: i%7===0?'transparent':'#000'
  }))
  return (
    <svg width={width+40} height={height+60} style={{display:'block',margin:'0 auto'}}>
      <rect width={width+40} height={height+60} fill='#fff' rx={4}/>
      {topLabel&&<text x={(width+40)/2} y={14} textAnchor='middle' fontSize={7} fill='#555'>{topLabel}</text>}
      {bars.map((b,i)=>(
        <rect key={i} x={b.x} y={20} width={b.w} height={height} fill={b.fill}/>
      ))}
      <text x={(width+40)/2} y={height+36} textAnchor='middle' fontSize={8} fill='#111' fontWeight='bold'>{label}</text>
      {subLabel&&<text x={(width+40)/2} y={height+50} textAnchor='middle' fontSize={6} fill='#888'>{subLabel}</text>}
    </svg>
  )
}

// ── Printer Settings Panel ────────────────────────────────────────
function PrinterSettingsPanel({ onClose, onSave }) {
  const [printerType,    setPrinterType]    = useState('Label Printer')
  const [labelConfig,    setLabelConfig]    = useState('2 Labels (50 mm × 25 mm)')
  const [labelHeight,    setLabelHeight]    = useState('25')
  const [labelWidth,     setLabelWidth]     = useState('50')
  const [barcodeHeight,  setBarcodeHeight]  = useState('10')
  const [barcodeWidth,   setBarcodeWidth]   = useState('48')
  const [spaceTop,       setSpaceTop]       = useState('11')
  const [spaceLeft,      setSpaceLeft]      = useState('5')

  const S = (label,val,set,type='text') => (
    <div>
      <label style={{display:'block',fontSize:11,color:'#555',marginBottom:5,fontWeight:500}}>
        {label} <span style={{color:'#e53e3e'}}>*</span>
      </label>
      <input type={type} value={val} onChange={e=>set(e.target.value)}
        style={{...INP,width:'100%'}}/>
    </div>
  )

  return (
    <div style={{position:'fixed',top:0,right:0,bottom:0,width:440,zIndex:800,
      background:'#fff',boxShadow:'-4px 0 24px rgba(0,0,0,.15)',
      display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{padding:'16px 20px',borderBottom:'1px solid #e8eaed',
        display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:16,fontWeight:700,color:'#1a1a2e'}}>Printer Settings</span>
        <button onClick={onClose} style={{background:'none',border:'none',
          fontSize:20,cursor:'pointer',color:'#888'}}>×</button>
      </div>

      {/* Body */}
      <div style={{overflowY:'auto',flex:1,padding:'20px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
          {/* Printer type */}
          <div style={{gridColumn:'1/-1'}}>
            <label style={{display:'block',fontSize:11,color:'#555',marginBottom:5,fontWeight:500}}>
              Select Printer Type <span style={{color:'#e53e3e'}}>*</span>
            </label>
            <div style={{position:'relative'}}>
              <select value={printerType} onChange={e=>setPrinterType(e.target.value)}
                style={{...SEL,width:'100%',paddingRight:28,
                  border:`1.5px solid ${printerType?'#e53e3e':'#dde1e7'}`}}>
                {PRINTER_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <span style={{position:'absolute',right:9,top:'50%',transform:'translateY(-50%)',
                pointerEvents:'none',fontSize:10,color:'#aaa'}}>▼</span>
            </div>
          </div>
          {/* Label config */}
          <div style={{gridColumn:'1/-1'}}>
            <label style={{display:'block',fontSize:11,color:'#555',marginBottom:5,fontWeight:500}}>
              Label Configuration <span style={{color:'#e53e3e'}}>*</span>
            </label>
            <div style={{position:'relative'}}>
              <select value={labelConfig} onChange={e=>setLabelConfig(e.target.value)}
                style={{...SEL,width:'100%',paddingRight:28}}>
                {LABEL_CONFIGS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <span style={{position:'absolute',right:9,top:'50%',transform:'translateY(-50%)',
                pointerEvents:'none',fontSize:10,color:'#aaa'}}>▼</span>
            </div>
          </div>
          {S('Label Height *', labelHeight, setLabelHeight, 'number')}
          {S('Label Width *',  labelWidth,  setLabelWidth,  'number')}
          {S('Barcode Height *',barcodeHeight,setBarcodeHeight,'number')}
          {S('Barcode Width *', barcodeWidth, setBarcodeWidth, 'number')}
          {S('Space From Top *',spaceTop,    setSpaceTop,    'number')}
          {S('Space From Left *',spaceLeft,  setSpaceLeft,   'number')}
        </div>

        {/* Barcode Preview with dimensions */}
        <div style={{background:'#f8f9fb',borderRadius:10,padding:'20px',
          border:'1px solid #e8eaed',marginTop:8}}>
          <div style={{fontSize:13,fontWeight:600,color:'#333',marginBottom:14}}>Barcode Preview</div>
          <div style={{position:'relative',display:'inline-block',margin:'0 auto',display:'flex',
            justifyContent:'center'}}>
            {/* Dimension labels */}
            <div style={{position:'relative'}}>
              <div style={{textAlign:'center',marginBottom:4,fontSize:11,color:'#555'}}>{spaceTop}mm</div>
              <div style={{textAlign:'right',marginBottom:2,fontSize:11,color:'#555',paddingRight:8}}>
                {labelWidth}mm
              </div>
              <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:12}}>
                  <span style={{fontSize:11,color:'#555',writingMode:'vertical-lr',
                    transform:'rotate(180deg)'}}>{labelHeight}mm</span>
                </div>
                <div style={{border:'2px dashed #ccc',borderRadius:4,padding:'12px',background:'#fff'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:6}}>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:10}}>
                      <span style={{fontSize:10,color:'#555',writingMode:'vertical-lr',
                        transform:'rotate(180deg)'}}>{barcodeHeight}mm</span>
                    </div>
                    <div>
                      <div style={{textAlign:'right',fontSize:10,color:'#555',marginBottom:2}}>{barcodeWidth}mm</div>
                      <BarcodePreview height={50} width={100}/>
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:20}}>
                  <span style={{fontSize:11,color:'#555'}}>{spaceLeft}mm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:'12px 20px',borderTop:'1px solid #e8eaed',
        display:'flex',gap:10,justifyContent:'flex-end',background:'#fafafa'}}>
        <button onClick={onClose} style={BTN_OUT}>Cancel</button>
        <button onClick={()=>{onSave();onClose()}} style={BTN_RED}>Save</button>
      </div>
    </div>
  )
}

// ── Barcode Configuration page ────────────────────────────────────
export function BarcodeConfiguration() {
  const toast = useToast()
  const [bgColor,    setBgColor]    = useState('#FFFFFF')
  const [textColor,  setTextColor]  = useState('#000000')
  const [alignment,  setAlignment]  = useState('Column') // Column | Row
  const [saving,     setSaving]     = useState(false)

  // Field rows
  const [fields, setFields] = useState([
    { id:1, field:'Raw Material Name', label:'Raw Material', align:'Center', position:'Top', fontSize:5, weight:'Bold' },
    { id:2, field:'Outlet Name',       label:'Truce Cafe',   align:'Center', position:'Bottom',fontSize:5,weight:'Bold'},
  ])
  // New field row
  const [newField,   setNewField]   = useState('Custom Label')
  const [newLabel,   setNewLabel]   = useState('Custom Label')
  const [newAlign,   setNewAlign]   = useState('Center')
  const [newPos,     setNewPos]     = useState('Top')
  const [newSize,    setNewSize]    = useState('5')
  const [newWeight,  setNewWeight]  = useState('Normal')
  const [fieldOpen,  setFieldOpen]  = useState(false)
  const [fieldSearch,setFieldSearch]= useState('')
  const fieldRef = useRef(null)
  const trigRef  = useRef(null)
  const [dropPos,setDropPos] = useState({top:0,left:0,width:200})

  useEffect(()=>{
    function h(e){if(fieldRef.current&&!fieldRef.current.contains(e.target))setFieldOpen(false)}
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])

  function openFieldDrop(){
    if(trigRef.current){
      const r=trigRef.current.getBoundingClientRect()
      setDropPos({top:r.bottom+window.scrollY+3,left:r.left+window.scrollX,width:r.width})
    }
    setFieldOpen(o=>!o)
  }

  function addField(){
    setFields(p=>[...p,{
      id:Date.now(),field:newField,label:newLabel,
      align:newAlign,position:newPos,fontSize:Number(newSize)||5,weight:newWeight
    }])
    setNewField('Custom Label'); setNewLabel('Custom Label')
    setNewAlign('Center'); setNewPos('Top'); setNewSize('5'); setNewWeight('Normal')
  }

  function removeField(id){ setFields(p=>p.filter(f=>f.id!==id)) }
  function updField(id,k,v){ setFields(p=>p.map(f=>f.id===id?{...f,[k]:v}:f)) }

  const SS = (val,set,opts) => (
    <div style={{position:'relative'}}>
      <select value={val} onChange={e=>set(e.target.value)}
        style={{...SEL,width:'100%',paddingRight:20}}>
        {opts.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',
        pointerEvents:'none',fontSize:9,color:'#aaa'}}>▼</span>
    </div>
  )

  return (
    <div>
      <h1 style={{fontSize:20,fontWeight:800,color:'#1a1a2e',marginBottom:20}}>Barcode Configuration</h1>

      <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
        {/* Left — config */}
        <div style={{flex:1}}>
          {/* Colors + Alignment */}
          <div style={{background:'#fff',border:'1px solid #e8eaed',borderRadius:10,
            padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
            <div style={{display:'flex',gap:24,alignItems:'center',flexWrap:'wrap'}}>
              {/* BG Color */}
              <div>
                <div style={{fontSize:11,color:'#888',marginBottom:5,fontWeight:500}}>Background Color</div>
                <div style={{display:'flex',alignItems:'center',gap:8,border:'1px solid #dde1e7',
                  borderRadius:6,padding:'5px 10px',background:'#fff'}}>
                  <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}
                    style={{width:24,height:24,border:'none',padding:0,cursor:'pointer',borderRadius:3}}/>
                  <span style={{fontSize:13,color:'#111',fontFamily:'monospace'}}>{bgColor}</span>
                </div>
              </div>
              {/* Text Color */}
              <div>
                <div style={{fontSize:11,color:'#888',marginBottom:5,fontWeight:500}}>Text Color</div>
                <div style={{display:'flex',alignItems:'center',gap:8,border:'1px solid #dde1e7',
                  borderRadius:6,padding:'5px 10px',background:'#fff'}}>
                  <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}
                    style={{width:24,height:24,border:'none',padding:0,cursor:'pointer',borderRadius:3}}/>
                  <span style={{fontSize:13,color:'#111',fontFamily:'monospace'}}>{textColor}</span>
                </div>
              </div>
              {/* Alignment */}
              <div>
                <div style={{fontSize:11,color:'#888',marginBottom:5,fontWeight:500}}>Alignment of fields</div>
                <div style={{display:'flex',gap:16}}>
                  {['Column','Row'].map(a=>(
                    <label key={a} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13}}>
                      <div onClick={()=>setAlignment(a)} style={{
                        width:18,height:18,borderRadius:50,cursor:'pointer',transition:'all .15s',
                        border:`2px solid ${alignment===a?'#10b981':'#ccc'}`,
                        background:alignment===a?'#10b981':'#fff',
                        display:'flex',alignItems:'center',justifyContent:'center',
                      }}>
                        {alignment===a&&<div style={{width:6,height:6,borderRadius:50,background:'#fff'}}/>}
                      </div>
                      {a}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fields table */}
          <div style={{background:'#fff',border:'1px solid #e8eaed',borderRadius:10,
            overflow:'visible',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'#f5f7fa',borderBottom:'2px solid #e8eaed'}}>
                {['Field','Label','Align','Position','Font Size','Font Weight','Action'].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,
                    color:'#888',fontWeight:700,whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {/* Add row — first row */}
                <tr style={{borderBottom:'1px solid #f0f0f0',background:'#fafafa'}}>
                  <td style={{padding:'10px 12px'}}>
                    <div ref={fieldRef} style={{position:'relative'}}>
                      <div ref={trigRef} onClick={openFieldDrop} style={{
                        ...INP,display:'flex',alignItems:'center',justifyContent:'space-between',
                        cursor:'pointer',minWidth:140,border:`1px solid ${fieldOpen?'#e53e3e':'#dde1e7'}`}}>
                        <span style={{fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                          {newField}
                        </span>
                        <span style={{fontSize:10,color:'#aaa',marginLeft:4,flexShrink:0}}>▼</span>
                      </div>
                      {fieldOpen&&(
                        <div style={{position:'fixed',top:dropPos.top,left:dropPos.left,
                          width:Math.max(dropPos.width,200),zIndex:9999,
                          background:'#fff',border:'1px solid #e8eaed',borderRadius:8,
                          boxShadow:'0 8px 24px rgba(0,0,0,.13)',overflow:'hidden'}}>
                          <div style={{padding:'8px'}}>
                            <input autoFocus value={fieldSearch} onChange={e=>setFieldSearch(e.target.value)}
                              placeholder="Search..."
                              style={{...INP,width:'100%',padding:'6px 10px'}}/>
                          </div>
                          {FIELD_OPTIONS.filter(f=>f.toLowerCase().includes(fieldSearch.toLowerCase())).map(f=>(
                            <div key={f} onMouseDown={e=>{e.preventDefault();setNewField(f);setNewLabel(f);setFieldOpen(false);setFieldSearch('')}}
                              style={{padding:'9px 14px',cursor:'pointer',fontSize:13,
                                color:f===newField?'#e53e3e':'#333',
                                background:f===newField?'#fff5f5':'#fff',
                                borderBottom:'1px solid #f8f8f8'}}
                              onMouseEnter={e=>{if(f!==newField)e.currentTarget.style.background='#fafafa'}}
                              onMouseLeave={e=>{if(f!==newField)e.currentTarget.style.background='#fff'}}>
                              {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{padding:'10px 12px'}}>
                    <input value={newLabel} onChange={e=>setNewLabel(e.target.value)}
                      style={{...INP,width:110}}/>
                  </td>
                  <td style={{padding:'10px 12px',minWidth:90}}>{SS(newAlign,setNewAlign,ALIGN_OPT)}</td>
                  <td style={{padding:'10px 12px',minWidth:90}}>{SS(newPos,setNewPos,POS_OPT)}</td>
                  <td style={{padding:'10px 12px'}}>
                    <input type="number" value={newSize} onChange={e=>setNewSize(e.target.value)}
                      style={{...INP,width:55}}/>
                  </td>
                  <td style={{padding:'10px 12px',minWidth:100}}>{SS(newWeight,setNewWeight,WEIGHT_OPT)}</td>
                  <td style={{padding:'10px 12px'}}>
                    <button onClick={addField} style={{...BTN_RED,padding:'6px 14px',fontSize:12}}>Add</button>
                  </td>
                </tr>

                {/* Existing fields */}
                {fields.map((f,i)=>(
                  <tr key={f.id} style={{borderBottom:'1px solid #f0f0f0',
                    background:i%2===0?'#fff':'#fdfdfd'}}>
                    <td style={{padding:'10px 12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{color:'#ddd',cursor:'grab',fontSize:14}}>⋮⋮</span>
                        <span style={{fontSize:13,color:'#333'}}>{f.field}</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      <input value={f.label} onChange={e=>updField(f.id,'label',e.target.value)}
                        style={{...INP,width:110}}/>
                    </td>
                    <td style={{padding:'10px 12px',minWidth:90}}>
                      {SS(f.align,v=>updField(f.id,'align',v),ALIGN_OPT)}
                    </td>
                    <td style={{padding:'10px 12px',minWidth:90}}>
                      {SS(f.position,v=>updField(f.id,'position',v),POS_OPT)}
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      <input type="number" value={f.fontSize}
                        onChange={e=>updField(f.id,'fontSize',e.target.value)}
                        style={{...INP,width:55}}/>
                    </td>
                    <td style={{padding:'10px 12px',minWidth:100}}>
                      {SS(f.weight,v=>updField(f.id,'weight',v),WEIGHT_OPT)}
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      <button onClick={()=>removeField(f.id)} style={{
                        background:'#f5f5f5',border:'1px solid #e8eaed',borderRadius:5,
                        padding:'4px 8px',cursor:'pointer',color:'#ccc',fontSize:14}}
                        onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                        onMouseLeave={e=>e.currentTarget.style.color='#ccc'}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div style={{padding:'12px 16px',borderTop:'1px solid #f0f0f0',
              display:'flex',justifyContent:'flex-end',gap:10,background:'#fff5f5'}}>
              <button style={BTN_OUT}>Cancel</button>
              <button onClick={async()=>{
                setSaving(true)
                await new Promise(r=>setTimeout(r,500))
                setSaving(false)
                toast&&toast.success('Barcode configuration saved!')
              }} style={{...BTN_RED,boxShadow:'0 2px 8px rgba(229,62,62,.25)'}}>
                {saving?'Saving...':'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Right — Preview */}
        <div style={{width:240,flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:600,color:'#333',marginBottom:12}}>Barcode Preview</div>
          <div style={{background:'#fff',border:'1px solid #e8eaed',borderRadius:10,
            padding:'20px',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
            <BarcodePreview
              topLabel='Raw Material: Potato'
              label='1000001'
              subLabel='Truce Cafe | Karaswali Restaurant'
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Barcode Generation ───────────────────────────────────────
export default function BarcodeGeneration() {
  const toast = useToast()
  const [rawMaterial, setRawMaterial] = useState('')
  const [numPrints,   setNumPrints]   = useState(1)
  const [barcodeBatch,setBarcodeBatch]= useState('')
  const [summary,     setSummary]     = useState([])
  const [search,      setSearch]      = useState('')
  const [showPrinter, setShowPrinter] = useState(false)
  const [showConfig,  setShowConfig]  = useState(false)
  const [rawOpen,     setRawOpen]     = useState(false)
  const [rawSearch,   setRawSearch]   = useState('')
  const ref    = useRef(null)
  const trigRef= useRef(null)
  const [pos,  setPos] = useState({top:0,left:0,width:300})

  useEffect(()=>{
    function h(e){if(ref.current&&!ref.current.contains(e.target)){setRawOpen(false);setRawSearch('')}}
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])

  function openRaw(){
    if(trigRef.current){
      const r=trigRef.current.getBoundingClientRect()
      setPos({top:r.bottom+window.scrollY+3,left:r.left+window.scrollX,width:r.width})
    }
    setRawOpen(o=>!o)
  }

  function addToSummary(){
    if(!rawMaterial){toast.error('Raw material select karo');return}
    setSummary(p=>{
      const ex=p.find(x=>x.raw===rawMaterial)
      if(ex) return p.map(x=>x.raw===rawMaterial?{...x,prints:x.prints+Number(numPrints)}:x)
      return [...p,{raw:rawMaterial,prints:Number(numPrints),batch:barcodeBatch}]
    })
    setRawMaterial(''); setNumPrints(1); setBarcodeBatch('')
  }

  const totalBarcodes = summary.reduce((a,s)=>a+s.prints,0)
  const filteredSum   = summary.filter(s=>!search||s.raw.toLowerCase().includes(search.toLowerCase()))

  if (showConfig) return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button onClick={()=>setShowConfig(false)} style={{...BTN_OUT,padding:'6px 12px'}}>← Back</button>
        <h1 style={{fontSize:20,fontWeight:800,color:'#1a1a2e',margin:0}}>Barcode Configuration</h1>
      </div>
      <BarcodeConfiguration/>
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:20,fontWeight:800,color:'#1a1a2e',margin:0}}>Barcode Generation</h1>
        <button onClick={()=>setShowConfig(true)}
          style={{...BTN_OUT,fontSize:12,display:'flex',alignItems:'center',gap:6}}>
          ⚙️ Configure Barcodes
        </button>
      </div>

      {/* ── Select Raw Materials ── */}
      <div style={{background:'#fff',border:'1px solid #e8eaed',borderRadius:10,
        padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
        <h2 style={{fontSize:14,fontWeight:700,color:'#1a1a2e',marginBottom:14}}>
          Select Raw Materials
        </h2>

        <div style={{display:'grid',gridTemplateColumns:'1fr 120px 1fr',gap:'0 14px',
          alignItems:'end',marginBottom:4}}>
          {/* Headers */}
          <div style={{fontSize:11,color:'#888',fontWeight:600,marginBottom:5}}>
            Raw Material <span style={{color:'#e53e3e'}}>*</span>
            <span style={{marginLeft:6,color:'#aaa',fontSize:10}}>ⓘ</span>
          </div>
          <div style={{fontSize:11,color:'#888',fontWeight:600,marginBottom:5}}>
            Number of prints <span style={{color:'#e53e3e'}}>*</span>
            <span style={{marginLeft:6,color:'#aaa',fontSize:10}}>ⓘ</span>
          </div>
          <div style={{fontSize:11,color:'#888',fontWeight:600,marginBottom:5}}>
            Raw Material Batch
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 120px 1fr',gap:'0 14px',alignItems:'center'}}>
          {/* Raw material searchable dropdown */}
          <div ref={ref} style={{position:'relative'}}>
            <div ref={trigRef} onClick={openRaw} style={{
              ...INP,display:'flex',alignItems:'center',justifyContent:'space-between',
              cursor:'pointer',border:`1px solid ${rawOpen?'#e53e3e':'#dde1e7'}`,
              color:rawMaterial?'#111':'#aaa',
            }}>
              <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {rawMaterial||'Select Raw Material'}
              </span>
              <span style={{fontSize:11,color:'#aaa',marginLeft:6,flexShrink:0}}>▼</span>
            </div>
            {rawOpen&&(
              <div style={{position:'fixed',top:pos.top,left:pos.left,width:pos.width,zIndex:9999,
                background:'#fff',border:'1px solid #e8eaed',borderRadius:8,
                boxShadow:'0 8px 28px rgba(0,0,0,.13)',overflow:'hidden',maxHeight:280}}>
                <div style={{padding:'8px 10px',borderBottom:'1px solid #f0f0f0'}}>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'#ccc'}}>🔍</span>
                    <input autoFocus value={rawSearch} onChange={e=>setRawSearch(e.target.value)}
                      style={{...INP,paddingLeft:28,width:'100%'}}/>
                  </div>
                </div>
                <div style={{overflowY:'auto',maxHeight:220}}>
                  {MOCK_RAW.filter(r=>r.toLowerCase().includes(rawSearch.toLowerCase())).map(r=>(
                    <div key={r} onMouseDown={e=>{e.preventDefault();setRawMaterial(r);setRawOpen(false);setRawSearch('')}}
                      style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                        padding:'10px 14px',cursor:'pointer',fontSize:13,
                        background:r===rawMaterial?'#fff5f5':'#fff',
                        color:r===rawMaterial?'#e53e3e':'#333',
                        borderBottom:'1px solid #f8f8f8'}}
                      onMouseEnter={e=>{if(r!==rawMaterial)e.currentTarget.style.background='#fafafa'}}
                      onMouseLeave={e=>{if(r!==rawMaterial)e.currentTarget.style.background='#fff'}}>
                      {r}
                      {r===rawMaterial&&<span style={{color:'#e53e3e',fontSize:13}}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Number of prints */}
          <input type="number" min="1" max="500" value={numPrints}
            onChange={e=>setNumPrints(Number(e.target.value))}
            style={{...INP,textAlign:'center'}}/>

          {/* Batch */}
          <input value={barcodeBatch} onChange={e=>setBarcodeBatch(e.target.value)}
            placeholder="Batch number (optional)"
            style={INP}/>
        </div>
      </div>

      {/* ── Summary table ── */}
      <div style={{background:'#fff',border:'1px solid #e8eaed',borderRadius:10,
        overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.04)',marginBottom:16}}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid #f0f0f0',
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{fontSize:14,fontWeight:700,color:'#1a1a2e',margin:0}}>
            Selected Raw Material Summary
          </h2>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:12,color:'#555'}}>Search:</span>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                style={{...INP,padding:'5px 10px',width:160}}/>
            </div>
            <button onClick={addToSummary} style={{...BTN_RED,padding:'6px 14px',fontSize:12}}>
              + Add to List
            </button>
          </div>
        </div>

        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f5f7fa',borderBottom:'1px solid #e8eaed'}}>
            <th style={{padding:'10px 16px',textAlign:'left',fontSize:11,color:'#888',fontWeight:700}}>Raw Material</th>
            <th style={{padding:'10px 16px',textAlign:'left',fontSize:11,color:'#888',fontWeight:700}}>Number Of Prints</th>
            <th style={{padding:'10px 16px',textAlign:'left',fontSize:11,color:'#888',fontWeight:700}}>Batch</th>
            <th style={{padding:'10px 16px',width:50}}></th>
          </tr></thead>
          <tbody>
            {filteredSum.length===0?(
              <tr><td colSpan={4} style={{padding:'32px',textAlign:'center',color:'#aaa',fontSize:12}}>
                Raw material add karo upar se
              </td></tr>
            ):filteredSum.map((s,i)=>(
              <tr key={s.raw} style={{borderBottom:'1px solid #f5f5f5',
                background:i%2===0?'#fff':'#fdfdfd'}}>
                <td style={{padding:'11px 16px',fontSize:13,fontWeight:500}}>{s.raw}</td>
                <td style={{padding:'11px 16px',fontSize:13}}>{s.prints}</td>
                <td style={{padding:'11px 16px',fontSize:12,color:'#888'}}>{s.batch||'—'}</td>
                <td style={{padding:'11px 16px'}}>
                  <button onClick={()=>setSummary(p=>p.filter(x=>x.raw!==s.raw))}
                    style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:16}}
                    onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                    onMouseLeave={e=>e.currentTarget.style.color='#ccc'}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Info + Generate ── */}
      <div style={{background:'#fff5f5',border:'1px solid #fecaca',borderRadius:8,
        padding:'10px 16px',marginBottom:16,fontSize:12,color:'#555'}}>
        ⓘ A maximum of 500 barcodes can be generated at once.
        {totalBarcodes>0&&<span style={{marginLeft:12,fontWeight:600,color:totalBarcodes>500?'#ef4444':'#333'}}>
          Current: {totalBarcodes} barcodes
        </span>}
      </div>

      <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
        <button onClick={()=>setShowPrinter(true)}
          style={{...BTN_OUT,display:'flex',alignItems:'center',gap:6}}>
          🖨️ Printer Settings
        </button>
        <button onClick={()=>{
          if(summary.length===0){toast.error('Koi raw material select nahi');return}
          toast.success(`✅ ${totalBarcodes} barcodes generate ho rahe hain!`)
        }} style={{...BTN_RED,boxShadow:'0 2px 8px rgba(229,62,62,.3)',
          display:'flex',alignItems:'center',gap:6}}>
          📊 Generate Barcodes
        </button>
      </div>

      {/* Printer Settings slide panel */}
      {showPrinter&&(
        <>
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.3)',zIndex:700}}
            onClick={()=>setShowPrinter(false)}/>
          <PrinterSettingsPanel
            onClose={()=>setShowPrinter(false)}
            onSave={()=>toast.success('Printer settings saved!')}
          />
        </>
      )}
    </div>
  )
}
