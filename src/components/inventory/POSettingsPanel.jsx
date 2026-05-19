// src/components/inventory/POSettingsPanel.jsx
import { useState, useRef, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'
import { Radio } from './POShared'

const MOCK_USERS = ['Abhinav Verma','Abhinav','Admin User','Manager']

const INP = { padding:'8px 10px', borderRadius:6, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }
const SEL = { ...INP, cursor:'pointer', appearance:'none' }
const BTN_RED = { padding:'7px 16px', borderRadius:6, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }
const BTN_OUT = { padding:'7px 16px', borderRadius:6, border:'1px solid #dde1e7',
  background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }

export default function POSettingsPanel({ onClose }) {
  const toast = useToast()
  const [approvalUsers, setApprovalUsers] = useState([])
  const [approvalInput, setApprovalInput] = useState('')
  const [showUserDrop,  setShowUserDrop]  = useState(false)
  const [lockPrices,    setLockPrices]    = useState('No')
  const [showStock,     setShowStock]     = useState('Yes')
  const [negativeStock, setNegativeStock] = useState('Yes')
  const [showTax,       setShowTax]       = useState('No')
  const [roundOff,      setRoundOff]      = useState('None')
  const [cessTax,       setCessTax]       = useState('No')
  const [restrictMoq,   setRestrictMoq]   = useState('No')
  const [deliverTo,     setDeliverTo]     = useState('')
  const [termsPayment,  setTermsPayment]  = useState('No')
  const [dateRestrict,  setDateRestrict]  = useState('None')
  const [includeImages, setIncludeImages] = useState('No')
  const [saving, setSaving] = useState(false)
  const dropRef = useRef(null)

  useEffect(()=>{
    function h(e){ if(dropRef.current&&!dropRef.current.contains(e.target)) setShowUserDrop(false) }
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  const filteredUsers = MOCK_USERS.filter(u=>
    u.toLowerCase().includes(approvalInput.toLowerCase()) &&
    !approvalUsers.includes(u)
  )

  function addUser(u) { setApprovalUsers(p=>[...p,u]); setApprovalInput(''); setShowUserDrop(false) }
  function removeUser(u) { setApprovalUsers(p=>p.filter(x=>x!==u)) }

  function YN(val,set,label) {
    return (
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:13, color:'#333', marginBottom:8, fontWeight:500 }}>{label}</div>
        <div>
          <Radio checked={val==='Yes'} onChange={()=>set('Yes')} label="Yes"/>
          <Radio checked={val==='No'}  onChange={()=>set('No')}  label="No"/>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.3)', zIndex:700 }} onClick={onClose}/>
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:660, zIndex:800,
        background:'#fff', boxShadow:'-4px 0 24px rgba(0,0,0,.15)',
        display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'16px 22px', borderBottom:'1px solid #e8eaed',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:16, fontWeight:700, color:'#1a1a2e' }}>Purchase Order Settings</span>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#888' }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'22px' }}>

          {/* Inventory Approval Flow */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:4 }}>
              Inventory approval flow
            </div>
            <div style={{ fontSize:12, color:'#888', marginBottom:12 }}>
              Select users from the list below who will work as an approval authority for raised purchase order :
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <label style={{ fontSize:13, color:'#333', fontWeight:500, flexShrink:0 }}>
                Approval Authority :
              </label>
              {/* Multi-select user input */}
              <div ref={dropRef} style={{ flex:1, position:'relative' }}>
                <div style={{ ...INP, display:'flex', flexWrap:'wrap', gap:6, minHeight:40,
                  cursor:'text', border:`1px solid ${showUserDrop?'#e53e3e':'#dde1e7'}` }}
                  onClick={()=>setShowUserDrop(true)}>
                  {approvalUsers.map(u=>(
                    <span key={u} style={{ display:'inline-flex', alignItems:'center', gap:4,
                      padding:'2px 8px', borderRadius:4, background:'#f0f0f0',
                      fontSize:12, color:'#333' }}>
                      <span>×</span> {u}
                      <button onClick={(e)=>{e.stopPropagation();removeUser(u)}}
                        style={{ background:'none', border:'none', cursor:'pointer',
                          color:'#aaa', fontSize:13, padding:0, lineHeight:1 }}>×</button>
                    </span>
                  ))}
                  <input value={approvalInput} onChange={e=>{setApprovalInput(e.target.value);setShowUserDrop(true)}}
                    onFocus={()=>setShowUserDrop(true)}
                    style={{ border:'none', outline:'none', fontSize:13, minWidth:80, flex:1, background:'transparent' }}/>
                </div>
                {showUserDrop && filteredUsers.length > 0 && (
                  <div style={{ position:'absolute', top:'calc(100% + 3px)', left:0, right:0, zIndex:999,
                    background:'#fff', border:'1px solid #e8eaed', borderRadius:8,
                    boxShadow:'0 8px 24px rgba(0,0,0,.12)', overflow:'hidden', maxHeight:200 }}>
                    {filteredUsers.map(u=>(
                      <div key={u} onMouseDown={e=>{e.preventDefault();addUser(u)}}
                        style={{ display:'flex', alignItems:'center', gap:8,
                          padding:'10px 14px', cursor:'pointer', fontSize:13, color:'#333',
                          borderBottom:'1px solid #f8f8f8' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <div style={{ width:18, height:18, borderRadius:4, border:'2px solid #ccc',
                          background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}/>
                        {u}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={()=>{ if(approvalInput) addUser(approvalInput) }}
                style={{ ...BTN_RED, padding:'7px 14px', flexShrink:0 }}>
                Add Users
              </button>
            </div>

            {approvalUsers.length === 0 ? (
              <div style={{ marginTop:12, fontSize:13, color:'#e53e3e', fontWeight:500 }}>
                No Approval Authority Added
              </div>
            ) : (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:12, color:'#555', marginBottom:6 }}>
                  Below are the individuals who has authority to approve :
                </div>
                {approvalUsers.map(u=>(
                  <span key={u} style={{ display:'inline-flex', alignItems:'center', gap:6,
                    marginRight:8, marginBottom:6, padding:'4px 10px', borderRadius:20,
                    background:'#dcfce7', color:'#16a34a', fontSize:12, fontWeight:500 }}>
                    ✓ {u}
                    <button onClick={()=>removeUser(u)} style={{ background:'none', border:'none',
                      cursor:'pointer', color:'#16a34a', fontSize:13 }}>×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Info box */}
            <div style={{ marginTop:12, padding:'12px 14px', background:'#fef9c3',
              borderRadius:8, border:'1px solid #fde68a', fontSize:12, color:'#555',
              display:'flex', gap:8 }}>
              <span>💡</span>
              <span>
                For approval, this user right must be assigned. "Allow inventory user to edit and cancel
                transactional data in Purchase order, Purchase, Sales, Transfer and Returns."
                <span style={{ color:'#e53e3e', cursor:'pointer', marginLeft:4 }}>Click Here.</span>
              </span>
            </div>
          </div>

          {/* Email Template Setting */}
          <div style={{ padding:'14px 16px', background:'#f8f9fb', borderRadius:8,
            border:'1px solid #e8eaed', marginBottom:20,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#333' }}>Email Template Setting</div>
              <div style={{ fontSize:12, color:'#888', marginTop:3 }}>
                You can add default email addresses with a custom header colour and icon by clicking here.
              </div>
            </div>
            <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#6366f1' }}>↗</button>
          </div>

          {/* Settings questions */}
          {YN(lockPrices, setLockPrices, 'Do you want to lock prices in Purchase and Consumption modules?')}
          {YN(showStock,  setShowStock,  'Do you want the current stock of sellers and restaurants to be displayed in the Purchase and Consumption modules?')}
          {YN(negativeStock, setNegativeStock, 'Allow the user to raise a Purchase Order when the stock at the kitchen/restaurant level is negative?')}
          {YN(showTax, setShowTax, 'Want to display Tax in Purchase Order?')}

          {/* Round off */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, color:'#333', marginBottom:8, fontWeight:500 }}>
              Want to round off or set the invoice total amount as a round figure?
            </div>
            <div>
              {['Normal','None','Round off up','Round off down'].map(r=>(
                <Radio key={r} checked={roundOff===r} onChange={()=>setRoundOff(r)} label={r}/>
              ))}
            </div>
          </div>

          {YN(cessTax, setCessTax, 'Would you like to activate cess tax on invoices?')}
          {YN(restrictMoq, setRestrictMoq, 'Restrict outlet to raise a purchase order below MoQ?')}

          {/* Deliver To */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, color:'#333', marginBottom:8, fontWeight:500 }}>
              In add Purchase Order "Deliver To"
            </div>
            <div style={{ position:'relative' }}>
              <select value={deliverTo} onChange={e=>setDeliverTo(e.target.value)}
                style={{ ...SEL, width:'100%', paddingRight:28 }}>
                <option value=""></option>
                <option>Main Kitchen</option>
                <option>Bar</option>
                <option>Bakery</option>
              </select>
              <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none', fontSize:10, color:'#aaa' }}>▼</span>
            </div>
          </div>

          {YN(termsPayment, setTermsPayment, 'Set standard Terms Of Payment & Terms Of Delivery in purchase order.')}

          {/* Date Restrict */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:13, color:'#333', marginBottom:8, fontWeight:500 }}>
              Do you want to restrict Purchase Order for a specific date selection?&gt;
            </div>
            <div>
              {['None',"Today's date","Future dates","Past dates (Last 60 days)"].map(d=>(
                <Radio key={d} checked={dateRestrict===d} onChange={()=>setDateRestrict(d)} label={d}/>
              ))}
            </div>
          </div>

          {YN(includeImages, setIncludeImages, 'Would you like to add an option to include images of raw materials in the Purchase Order, sales/transfer, and purchase?')}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 22px', borderTop:'1px solid #e8eaed',
          display:'flex', gap:10, justifyContent:'flex-end', background:'#fafafa' }}>
          <button onClick={onClose} style={BTN_OUT}>Cancel</button>
          <button onClick={async()=>{
            setSaving(true)
            await new Promise(r=>setTimeout(r,500))
            setSaving(false); toast.success('Settings saved!'); onClose()
          }} style={{ ...BTN_RED, boxShadow:'0 2px 8px rgba(229,62,62,.25)' }}>
            {saving?'Saving...':'Save'}
          </button>
        </div>
      </div>
    </>
  )
}
