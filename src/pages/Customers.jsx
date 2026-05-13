// src/pages/Customers.jsx
import { useState, useEffect, useCallback } from 'react'
import { customerApi, api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'
import { usePolling } from '../hooks/useWebSocket'

const TIERS = ['ALL', 'BRONZE', 'SILVER', 'GOLD']
const TIER_COLOR = { BRONZE: '#cd7f32', SILVER: '#9e9e9e', GOLD: '#f59e0b' }

const MOCK = [
  { id:1, name:'Rahul Sharma',   phone:'9876543210', tier:'GOLD',   totalVisits:24, totalSpend:12400, loyaltyPoints:620 },
  { id:2, name:'Priya Verma',    phone:'9812345678', tier:'SILVER', totalVisits:11, totalSpend:5500,  loyaltyPoints:275 },
  { id:3, name:'Amit Kumar',     phone:'9798765432', tier:'BRONZE', totalVisits:3,  totalSpend:1200,  loyaltyPoints:60  },
  { id:4, name:'Sunita Agarwal', phone:'9765432109', tier:'GOLD',   totalVisits:31, totalSpend:18700, loyaltyPoints:935 },
]

function fmt(n) { return '₹' + (Number(n)||0).toLocaleString('en-IN') }

export default function Customers() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [page, setPage]           = useState(0)
  const [totalPg, setTotalPg]     = useState(1)
  const [loading, setLoading]     = useState(true)
  const [tier, setTier]           = useState('ALL')
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [whatsappMsg, setWhatsappMsg] = useState('')
  const [sending, setSending]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, size: 20 })
      if (tier !== 'ALL') params.set('tier', tier)
      if (search) params.set('search', search)
      const res = await customerApi.getAll(rid, params.toString())
      const list = res?.content || (Array.isArray(res) ? res : null)
      setCustomers(list || MOCK)
      setTotalPg(res?.totalPages || 1)
    } catch (_) {
      setCustomers(MOCK); setTotalPg(1)
    } finally { setLoading(false) }
  }, [rid, page, tier, search])

  useEffect(() => { load() }, [page, tier])

  // Real-time polling — 30s
  usePolling(load, 30000)

  // WhatsApp blast
  async function sendWhatsApp() {
    if (!selected || !whatsappMsg.trim()) return
    setSending(true)
    try {
      await api.post('/whatsapp/send', {
        phone: selected.phone,
        message: whatsappMsg,
        restaurantId: rid,
      })
      toast.success(`✅ WhatsApp message bheja: ${selected.name}`)
      setWhatsappMsg('')
    } catch (_) {
      toast.error('WhatsApp send failed — check backend connection')
    } finally { setSending(false) }
  }

  const tierBadge = (t) => (
    <span style={{
      fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
      background: (TIER_COLOR[t]||'#888')+'22', color: TIER_COLOR[t]||'#888',
    }}>{t||'BRONZE'}</span>
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>👥 Customers</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>CRM — loyalty tiers, visit history, WhatsApp</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>🔄 Auto-refresh: 30s</span>
          <button onClick={load} style={{
            padding:'7px 14px', borderRadius:8, fontSize:12, border:'1px solid var(--border)',
            background:'transparent', color:'var(--text)', cursor:'pointer',
          }}>Refresh</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key==='Enter' && (setPage(0), load())}
          placeholder="🔍 Name ya phone..."
          style={{ flex:1, minWidth:200, padding:'8px 12px', borderRadius:8,
            border:'1px solid var(--border)', background:'var(--bg-page)',
            color:'var(--text)', fontSize:13 }} />
        <div style={{ display:'flex', gap:6 }}>
          {TIERS.map(t => (
            <button key={t} onClick={() => { setTier(t); setPage(0) }} style={{
              padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600,
              cursor:'pointer', border:'1px solid var(--border)',
              background: tier===t ? 'var(--accent)' : 'transparent',
              color: tier===t ? '#fff' : 'var(--text-muted)',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={5} cols={6} /> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Name','Phone','Tier','Visits','Total Spend','Points'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c,i) => (
                <tr key={c.id||i} onClick={() => setSelected(c)} style={{
                  borderBottom:'1px solid var(--border)', cursor:'pointer',
                  background: selected?.id===c.id ? 'var(--accent-bg)' : 'transparent',
                }}>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:500 }}>{c.name||'—'}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-muted)' }}>{c.phone}</td>
                  <td style={{ padding:'12px 16px' }}>{tierBadge(c.tier)}</td>
                  <td style={{ padding:'12px 16px', fontSize:13 }}>{c.totalVisits||0}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'#10b981', fontWeight:600 }}>{fmt(c.totalSpend)}</td>
                  <td style={{ padding:'12px 16px', fontSize:13 }}>
                    <span style={{ color:'#f59e0b', fontWeight:600 }}>⭐ {c.loyaltyPoints||0}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:'1rem' }}>
        <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0}
          style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--border)',
            background:'transparent', color:'var(--text)', cursor: page===0?'not-allowed':'pointer',
            opacity: page===0?0.4:1 }}>← Prev</button>
        <span style={{ padding:'6px 14px', fontSize:13, color:'var(--text-muted)' }}>Page {page+1}/{totalPg}</span>
        <button onClick={() => setPage(p => Math.min(totalPg-1,p+1))} disabled={page>=totalPg-1}
          style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--border)',
            background:'transparent', color:'var(--text)', cursor: page>=totalPg-1?'not-allowed':'pointer',
            opacity: page>=totalPg-1?0.4:1 }}>Next →</button>
      </div>

      {/* Detail panel with WhatsApp */}
      {selected && (
        <div style={{
          position:'fixed', right:0, top:0, bottom:0, width:340,
          background:'var(--bg-card)', borderLeft:'1px solid var(--border)',
          padding:'1.5rem', overflowY:'auto', zIndex:100,
          boxShadow:'-4px 0 24px rgba(0,0,0,0.15)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1.5rem' }}>
            <h2 style={{ fontSize:16, fontWeight:700 }}>Customer Detail</h2>
            <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--text-muted)' }}>✕</button>
          </div>

          {[
            ['👤 Name', selected.name],
            ['📱 Phone', selected.phone],
            ['🏆 Tier', selected.tier],
            ['🛒 Visits', selected.totalVisits],
            ['💰 Spend', fmt(selected.totalSpend)],
            ['⭐ Points', selected.loyaltyPoints],
            ['📅 Last Visit', selected.lastVisitAt||'—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>{label}</span>
              <span style={{ fontSize:13, fontWeight:500 }}>{value}</span>
            </div>
          ))}

          {/* WhatsApp section */}
          <div style={{ marginTop:'1.5rem' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>📱 WhatsApp Message</div>
            <textarea value={whatsappMsg} onChange={e => setWhatsappMsg(e.target.value)}
              placeholder="Message type karo..."
              rows={4} style={{
                width:'100%', padding:'10px 12px', borderRadius:8,
                border:'1px solid var(--border)', background:'var(--bg-page)',
                color:'var(--text)', fontSize:13, resize:'vertical',
                boxSizing:'border-box',
              }} />
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              {['Happy Birthday! 🎂', 'Special offer aapke liye! 🎁', 'Aapka intezaar hai! 🍽️'].map(msg => (
                <button key={msg} onClick={() => setWhatsappMsg(msg)} style={{
                  fontSize:10, padding:'4px 8px', borderRadius:6,
                  border:'1px solid var(--border)', background:'transparent',
                  color:'var(--text-muted)', cursor:'pointer',
                }}>{msg.slice(0,12)}...</button>
              ))}
            </div>
            <button onClick={sendWhatsApp} disabled={sending || !whatsappMsg.trim()} style={{
              width:'100%', marginTop:10, padding:'10px',
              background: sending ? 'var(--border)' : '#25D366',
              color:'#fff', border:'none', borderRadius:8,
              fontSize:13, fontWeight:600, cursor: sending?'not-allowed':'pointer',
            }}>{sending ? 'Sending...' : '📱 Send WhatsApp'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
