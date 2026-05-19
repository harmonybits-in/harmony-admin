// src/components/inventory/PaidAmountPanel.jsx
import { useState } from 'react'
import { useToast } from '../../hooks/useToast'

const PAYMENT_MODES = ['Cash','Card','Cheque','Online','Other']

const INP = { padding:'7px 10px', borderRadius:5, border:'1px solid #dde1e7',
  fontSize:13, color:'#111', background:'#fff', outline:'none', boxSizing:'border-box' }
const BTN_RED = { padding:'7px 16px', borderRadius:5, border:'none',
  background:'#e53e3e', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }
const BTN_OUT = { padding:'7px 16px', borderRadius:5, border:'1px solid #dde1e7',
  background:'#fff', color:'#444', fontSize:13, cursor:'pointer' }
const TH = { padding:'10px 12px', textAlign:'left', fontSize:11, color:'#888', fontWeight:700,
  background:'#f5f7fa', borderBottom:'1px solid #e8eaed', whiteSpace:'nowrap' }
const TD = { padding:'10px 12px', fontSize:13, borderBottom:'1px solid #f0f0f0', verticalAlign:'middle' }

export default function PaidAmountPanel({ purchase, onClose, onSave }) {
  const [payType,   setPayType]   = useState('Paid')
  const [paidAmt,   setPaidAmt]   = useState('')
  const [payDate,   setPayDate]   = useState(new Date().toISOString().slice(0,10))
  const [payMode,   setPayMode]   = useState('Cash')
  const [payRef,    setPayRef]    = useState('')
  const toast = useToast()

  const existing = [
    { date:'26 Apr 2026', amount:8995.080, mode:'Cash', ref:'', status:'Active',
      createdBy:'Created : 06-May-2026 13:40:53 (by Abhinav Verma)' }
  ]

  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.3)',zIndex:700}}
        onClick={onClose}/>
      <div style={{position:'fixed',top:0,right:0,bottom:0,width:660,zIndex:800,
        background:'#fff',boxShadow:'-4px 0 24px rgba(0,0,0,.15)',
        display:'flex',flexDirection:'column'}}>
        {/* Header */}
        <div style={{padding:'16px 20px',borderBottom:'1px solid #e8eaed',
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:16,fontWeight:700,color:'#1a1a2e'}}>
            {purchase?.from || 'Sherepunjab Agencies'}
          </span>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#888'}}>×</button>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'20px'}}>
          <div style={{fontSize:13,color:'#555',marginBottom:14}}>
            Remaining Amount : <strong>0.000</strong>
          </div>

          {/* Payment Type */}
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:11,color:'#555',fontWeight:600,marginBottom:8}}>
              Payment Type <span style={{color:'#e53e3e'}}>*</span>
            </label>
            {['Paid','Unpaid'].map(t=>(
              <label key={t} style={{display:'inline-flex',alignItems:'center',gap:8,
                marginRight:24,cursor:'pointer',fontSize:13}}>
                <div onClick={()=>setPayType(t)} style={{
                  width:18,height:18,borderRadius:50,cursor:'pointer',
                  border:`2px solid ${payType===t?'#10b981':'#ccc'}`,
                  background:payType===t?'#10b981':'#fff',
                  display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',
                }}>
                  {payType===t&&<div style={{width:6,height:6,borderRadius:50,background:'#fff'}}/>}
                </div>
                {t}
              </label>
            ))}
          </div>

          {/* Paid Amount + Date */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
            <div>
              <label style={{display:'block',fontSize:11,color:'#555',fontWeight:600,marginBottom:6}}>
                Paid Amount <span style={{color:'#e53e3e'}}>*</span>
              </label>
              <input type="number" value={paidAmt} onChange={e=>setPaidAmt(e.target.value)}
                placeholder="Enter amount"
                style={{...INP,width:'100%',border:'1.5px solid #e53e3e'}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:11,color:'#555',fontWeight:600,marginBottom:6}}>
                Payment Date <span style={{color:'#e53e3e'}}>*</span>
              </label>
              <div style={{display:'flex',alignItems:'center',gap:8,...INP}}>
                <span>📅</span>
                <input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}
                  style={{border:'none',outline:'none',fontSize:13,color:'#111',background:'transparent',flex:1}}/>
              </div>
            </div>
          </div>

          {/* Payment Mode */}
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:11,color:'#555',fontWeight:600,marginBottom:8}}>
              Payment Mode <span style={{color:'#e53e3e'}}>*</span>
            </label>
            <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
              {PAYMENT_MODES.map(m=>(
                <label key={m} style={{display:'inline-flex',alignItems:'center',gap:8,
                  cursor:'pointer',fontSize:13}}>
                  <div onClick={()=>setPayMode(m)} style={{
                    width:18,height:18,borderRadius:50,cursor:'pointer',
                    border:`2px solid ${payMode===m?'#10b981':'#ccc'}`,
                    background:payMode===m?'#10b981':'#fff',
                    display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',
                  }}>
                    {payMode===m&&<div style={{width:6,height:6,borderRadius:50,background:'#fff'}}/>}
                  </div>
                  {m}
                </label>
              ))}
            </div>
          </div>

          {/* Existing payments table */}
          <div style={{border:'1px solid #e8eaed',borderRadius:8,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'#f5f7fa'}}>
                {['Payment Date','Paid Amount','Payment Mode','Payment Ref No.','Status','Created By','Action'].map(h=>(
                  <th key={h} style={{...TH,fontSize:11}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {existing.map((e,i)=>(
                  <tr key={i}>
                    <td style={TD}>{e.date}</td>
                    <td style={{...TD,fontWeight:600}}>{e.amount.toFixed(3)}</td>
                    <td style={TD}>{e.mode}</td>
                    <td style={{...TD,color:'#aaa'}}>—</td>
                    <td style={TD}>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,
                        background:'#dcfce7',color:'#16a34a',fontWeight:600}}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{...TD,fontSize:11,color:'#888'}}>{e.createdBy}</td>
                    <td style={TD}>
                      <button style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:15}}
                        onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                        onMouseLeave={e=>e.currentTarget.style.color='#ccc'}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:'12px 20px',borderTop:'1px solid #e8eaed',
          display:'flex',gap:10,justifyContent:'flex-end',background:'#fafafa'}}>
          <button onClick={onClose} style={BTN_OUT}>Cancel</button>
          <button onClick={()=>{
            if(!paidAmt){toast.error('Amount enter karo');return}
            toast.success('Payment saved!')
            onSave()
          }} style={{...BTN_RED,boxShadow:'0 2px 8px rgba(229,62,62,.25)'}}>
            Save Changes
          </button>
        </div>
      </div>
    </>
  )
}
