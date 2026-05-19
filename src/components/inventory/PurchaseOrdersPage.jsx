// src/components/inventory/PurchaseOrdersPage.jsx
import { useState, useEffect } from 'react'
import { inventoryApi } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import { SkeletonTable } from '../Skeleton'
import { fmt, card, TH, TD, BTN_RED, BTN_OUT, FInp } from './InventoryShared'

export default function PurchaseOrdersPage({ rid }) {
  const toast   = useToast()
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [panel,   setPanel]   = useState(false)
  const [form,    setForm]    = useState({ supplierName:'', totalAmount:'', expectedDelivery:'', notes:'' })
  const [saving,  setSaving]  = useState(false)

  const STATUS_COLOR = { DRAFT:'#9e9e9e', SENT:'#6366f1', RECEIVED:'#10b981', CANCELLED:'#ef4444', PENDING:'#f59e0b' }

  async function load() {
    setLoading(true)
    try {
      const r = await inventoryApi.getPurchaseOrders(rid)
      setOrders(Array.isArray(r) ? r : [])
    } catch(_){} finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  async function save() {
    if(!form.supplierName){ toast.error('Supplier naam required'); return }
    setSaving(true)
    try {
      await inventoryApi.createPurchaseOrder({ ...form, restaurantId:rid,
        totalAmount:Number(form.totalAmount)||0 })
      toast.success('Purchase order created!')
      setPanel(false); load()
    } catch(_){ toast.error('Failed') } finally { setSaving(false) }
  }

  async function updateStatus(id, status) {
    try {
      await inventoryApi.updatePurchaseStatus(id, status, rid)
      toast.success(`Status: ${status}`)
      load()
    } catch(_){ toast.error('Failed') }
  }

  const upd = f => e => setForm(p=>({...p,[f]:e.target.value}))

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700 }}>Purchase Orders</h2>
          <p style={{ fontSize:12, color:'#888', marginTop:2 }}>Purchase orders track karo</p>
        </div>
        <button onClick={()=>{ setForm({supplierName:'',totalAmount:'',expectedDelivery:'',notes:''}); setPanel(true) }}
          style={BTN_RED}>+ New Order</button>
      </div>
      <div style={{ ...card, padding:0, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={4} cols={5}/> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Supplier','Order Date','Amount','Status','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {orders.length===0 ? (
                <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#aaa', fontSize:13 }}>
                  No orders. "+ New Order" click karo.
                </td></tr>
              ) : orders.map((o,i) => {
                const c = STATUS_COLOR[o.status||'DRAFT'] || '#888'
                return (
                  <tr key={o.id||i}
                    onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                    onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                    <td style={TD}><span style={{ fontWeight:500 }}>{o.supplierName||o.supplier?.name||'—'}</span></td>
                    <td style={{...TD, color:'#777'}}>{o.orderDate||o.createdAt?.slice(0,10)||'—'}</td>
                    <td style={{...TD, fontWeight:500}}>{fmt(o.totalAmount||0)}</td>
                    <td style={TD}>
                      <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600,
                        background:c+'22', color:c }}>
                        {o.status||'DRAFT'}
                      </span>
                    </td>
                    <td style={TD}>
                      <div style={{ display:'flex', gap:5 }}>
                        {o.status!=='RECEIVED' && (
                          <button onClick={()=>updateStatus(o.id,'RECEIVED')}
                            style={{ fontSize:11, padding:'3px 8px', borderRadius:4,
                              border:'1px solid #10b981', background:'#f0fdf4', color:'#10b981', cursor:'pointer' }}>
                            Mark Received
                          </button>
                        )}
                        {o.status==='DRAFT' && (
                          <button onClick={()=>updateStatus(o.id,'CANCELLED')}
                            style={{ fontSize:11, padding:'3px 8px', borderRadius:4,
                              border:'1px solid #fca5a5', background:'#fff5f5', color:'#e53e3e', cursor:'pointer' }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {panel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:500,
          display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e=>e.target===e.currentTarget&&setPanel(false)}>
          <div style={{ background:'#fff', borderRadius:'14px 14px 0 0', width:'100%',
            maxWidth:480, maxHeight:'75vh', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid #f0f0f0',
              display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, fontSize:14 }}>+ New Purchase Order</span>
              <button onClick={()=>setPanel(false)} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#aaa' }}>×</button>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:'1.25rem 1.5rem' }}>
              <FInp label="Supplier Name" value={form.supplierName} onChange={upd('supplierName')} required/>
              <FInp label="Total Amount (₹)" value={form.totalAmount} onChange={upd('totalAmount')} type="number"/>
              <FInp label="Expected Delivery" value={form.expectedDelivery} onChange={upd('expectedDelivery')} type="date"/>
              <FInp label="Notes" value={form.notes} onChange={upd('notes')}/>
            </div>
            <div style={{ padding:'12px 18px', borderTop:'1px solid #f0f0f0', display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setPanel(false)} style={BTN_OUT}>Cancel</button>
              <button onClick={save} disabled={saving} style={BTN_RED}>{saving?'Saving...':'Create Order'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
