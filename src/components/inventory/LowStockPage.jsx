// src/components/inventory/LowStockPage.jsx
import { useState, useEffect } from 'react'
import { inventoryApi } from '../../api/client'
import { SkeletonTable } from '../Skeleton'
import { fmtN, card, TH, TD } from './InventoryShared'

export default function LowStockPage({ rid }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    async function load() {
      setLoading(true)
      try {
        const r = await inventoryApi.getLowStock(rid)
        setItems(Array.isArray(r) ? r : [])
      } catch(_){} finally { setLoading(false) }
    }
    load()
  },[rid])

  return (
    <div>
      <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>⚠ Low Stock Alert</h2>
      <p style={{ fontSize:12, color:'#888', marginBottom:16 }}>Items jinका stock reorder level se neeche hai</p>
      <div style={{ ...card, padding:0, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={5} cols={5}/> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              {['Item','Category','Current','Reorder Level','Status'].map(h=><th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.length===0 ? (
                <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#16a34a', fontSize:13 }}>
                  ✓ Sab items adequate stock mein hain!
                </td></tr>
              ) : items.map((s,i) => (
                <tr key={s.id||i}>
                  <td style={TD}><b>{s.name||s.itemName}</b></td>
                  <td style={{...TD,color:'#777'}}>{s.category||'—'}</td>
                  <td style={{ ...TD, color:'#e53e3e', fontWeight:600 }}>{fmtN(s.currentStock)} {s.unit}</td>
                  <td style={{...TD,color:'#777'}}>{fmtN(s.reorderLevel||5)} {s.unit}</td>
                  <td style={TD}>
                    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:600,
                      background:'#fee2e2', color:'#e53e3e' }}>⚠ Low Stock</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
