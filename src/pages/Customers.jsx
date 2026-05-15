// src/pages/Customers.jsx
import { useState, useEffect, useCallback } from 'react'
import { customerApi, api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'
import { SkeletonTable } from '../components/Skeleton'

// ── Constants ─────────────────────────────────────────────────────────────
const TIERS       = ['ALL', 'BRONZE', 'SILVER', 'GOLD']
const TIER_COLOR  = { BRONZE: '#cd7f32', SILVER: '#9e9e9e', GOLD: '#f59e0b' }
const PAY_COLORS  = { CASH: '#10b981', UPI: '#6366f1', CARD: '#f59e0b', ONLINE: '#ec4899' }
const ORDER_LABELS= { DINE_IN:'Dine In', PICKUP:'Pickup', DELIVERY:'Delivery', ONLINE:'Online' }
const CAT_COLOR   = { FOOD:'#d97706', SERVICE:'#2563eb', AMBIENCE:'#7c3aed', OVERALL:'#059669' }

const MOCK = [
  { id:1, name:'Rahul Sharma',   phone:'9876543210', tier:'GOLD',   totalVisits:24, totalSpend:12400, loyaltyPoints:620 },
  { id:2, name:'Priya Verma',    phone:'9812345678', tier:'SILVER', totalVisits:11, totalSpend:5500,  loyaltyPoints:275 },
  { id:3, name:'Amit Kumar',     phone:'9798765432', tier:'BRONZE', totalVisits:3,  totalSpend:1200,  loyaltyPoints:60  },
  { id:4, name:'Sunita Agarwal', phone:'9765432109', tier:'GOLD',   totalVisits:31, totalSpend:18700, loyaltyPoints:935 },
]

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(n)    { return '₹' + (Number(n)||0).toLocaleString('en-IN') }
function fmtDate(d){ if(!d) return '—'; return new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}) }

function Badge({ color, children, small }) {
  return (
    <span style={{ fontSize: small?10:11, padding: small?'2px 7px':'3px 10px', borderRadius:20,
      fontWeight:600, background:(color||'#888')+'22', color:color||'#888' }}>
      {children}
    </span>
  )
}

function Stars({ rating }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i<=rating ? '#f59e0b':'#d1d5db', fontSize:14 }}>★</span>
      ))}
    </span>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────
function OverviewTab({ customer, toast, rid }) {
  const [msg, setMsg]       = useState('')
  const [sending, setSending] = useState(false)

  const QUICK = ['Happy Birthday! 🎂','Special offer aapke liye! 🎁','Aapka intezaar hai! 🍽️']

  async function sendWA() {
    if (!msg.trim()) return
    setSending(true)
    try {
      await api.post('/whatsapp/send', { phone:customer.phone, message:msg, restaurantId:rid })
      toast.success('WhatsApp bheja!')
      setMsg('')
    } catch(_){ toast.error('WhatsApp send failed') }
    finally { setSending(false) }
  }

  const stats = [
    { label:'Total Visits',   value: customer.totalVisits||0,       icon:'🛒', color:'#6366f1' },
    { label:'Total Spend',    value: fmt(customer.totalSpend),       icon:'💰', color:'#10b981' },
    { label:'Loyalty Points', value:`⭐ ${customer.loyaltyPoints||0}`,icon:'🏆', color:'#f59e0b' },
    { label:'Tier',           value: customer.tier||'BRONZE',        icon:'🥇', color: TIER_COLOR[customer.tier]||'#cd7f32' },
  ]

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'1.5rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background:'var(--bg-secondary)', borderRadius:10,
            padding:'14px 16px', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize:18, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Info rows */}
      {[
        ['📱 Phone',      customer.phone],
        ['📧 Email',      customer.email || '—'],
        ['📅 Last Visit', fmtDate(customer.lastVisitAt)],
      ].map(([label,val]) => (
        <div key={label} style={{ display:'flex', justifyContent:'space-between',
          padding:'9px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
          <span style={{ color:'var(--text-muted)' }}>{label}</span>
          <span style={{ fontWeight:500 }}>{val}</span>
        </div>
      ))}

      {/* WhatsApp */}
      <div style={{ marginTop:'1.5rem' }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)',
          letterSpacing:'0.06em', marginBottom:8 }}>📱 SEND WHATSAPP</div>
        <textarea value={msg} onChange={e=>setMsg(e.target.value)}
          placeholder="Message type karo..." rows={3}
          style={{ width:'100%', padding:'9px 12px', borderRadius:8, fontSize:13,
            border:'1px solid var(--border)', background:'var(--bg-secondary)',
            color:'var(--text)', resize:'vertical', boxSizing:'border-box' }} />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', margin:'6px 0' }}>
          {QUICK.map(q=>(
            <button key={q} onClick={()=>setMsg(q)} style={{ fontSize:10, padding:'4px 8px',
              borderRadius:6, border:'1px solid var(--border)', background:'transparent',
              color:'var(--text-muted)', cursor:'pointer' }}>{q.slice(0,16)}…</button>
          ))}
        </div>
        <button onClick={sendWA} disabled={sending||!msg.trim()} style={{ width:'100%',
          padding:'10px', background: sending?'var(--border)':'#25D366',
          color:'#fff', border:'none', borderRadius:8, fontSize:13,
          fontWeight:600, cursor: sending?'not-allowed':'pointer' }}>
          {sending?'Sending…':'📱 Send WhatsApp'}
        </button>
      </div>
    </div>
  )
}

// ── Orders Tab ────────────────────────────────────────────────────────────
function OrdersTab({ customer }) {
  const [bills,   setBills]   = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(0)
  const [totalPg, setTotalPg] = useState(1)

  const load = useCallback(async () => {
    if (!customer.id) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await customerApi.getBills(customer.id, page)
      const list = res?.content || (Array.isArray(res)?res:[])
      setBills(list)
      setTotalPg(res?.totalPages||1)
    } catch(_){ setBills([]) }
    finally { setLoading(false) }
  }, [customer.id, page])

  useEffect(()=>{ load() }, [load])

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Loading orders…</div>

  if (bills.length === 0) return (
    <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
      <div style={{ fontSize:32, marginBottom:8 }}>🧾</div>
      <div>Koi order nahi mila</div>
    </div>
  )

  return (
    <div>
      <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)' }}>
              {['Bill #','Amount','Payment','Type','Date'].map(h=>(
                <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:600,
                  fontSize:11, color:'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bills.map((b,i)=>(
              <tr key={b.id} style={{ borderBottom: i<bills.length-1?'1px solid var(--border)':'none' }}>
                <td style={{ padding:'9px 12px', fontWeight:700, color:'var(--accent)' }}>
                  #{b.billNumber||b.id}
                </td>
                <td style={{ padding:'9px 12px', fontWeight:600 }}>
                  {fmt(b.finalAmount||b.total)}
                </td>
                <td style={{ padding:'9px 12px' }}>
                  <Badge color={PAY_COLORS[b.paymentMode]||'#888'} small>{b.paymentMode||'—'}</Badge>
                </td>
                <td style={{ padding:'9px 12px' }}>
                  <Badge color='#6366f1' small>{ORDER_LABELS[b.orderType]||b.orderType||'—'}</Badge>
                </td>
                <td style={{ padding:'9px 12px', color:'var(--text-muted)', fontSize:11 }}>
                  {b.createdAt?new Date(b.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPg > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:10 }}>
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
            style={{ padding:'5px 12px', borderRadius:6, border:'1px solid var(--border)',
              background:'transparent', fontSize:12, cursor:page===0?'not-allowed':'pointer',
              opacity:page===0?0.4:1 }}>← Prev</button>
          <span style={{ fontSize:12, color:'var(--text-muted)', padding:'5px 8px' }}>{page+1}/{totalPg}</span>
          <button onClick={()=>setPage(p=>Math.min(totalPg-1,p+1))} disabled={page>=totalPg-1}
            style={{ padding:'5px 12px', borderRadius:6, border:'1px solid var(--border)',
              background:'transparent', fontSize:12, cursor:page>=totalPg-1?'not-allowed':'pointer',
              opacity:page>=totalPg-1?0.4:1 }}>Next →</button>
        </div>
      )}
    </div>
  )
}

// ── Feedback Tab ──────────────────────────────────────────────────────────
function FeedbackTab({ customer, toast }) {
  const [feedbacks, setFeedbacks] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [respId,    setRespId]    = useState(null)   // which feedback is being replied to
  const [respText,  setRespText]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await customerApi.getFeedback(customer.phone)
      setFeedbacks(Array.isArray(res)?res:[])
    } catch(_){ setFeedbacks([]) }
    finally { setLoading(false) }
  }, [customer.phone])

  useEffect(()=>{ load() }, [load])

  async function handleRespond(fb) {
    if (!respText.trim()) { toast.error('Reply likhna padega'); return }
    setSaving(true)
    try {
      await api.patch(`/feedback/${fb.id}/respond`, { response: respText.trim() })
      toast.success('Reply bheja!')
      setRespId(null); setRespText(''); load()
    } catch(_){ toast.error('Reply save nahi hua') }
    finally { setSaving(false) }
  }

  async function handleAiReply(fb) {
    setAiLoading(fb.id)
    try {
      const res = await api.post(`/feedback/${fb.id}/ai-reply`, {})
      setRespText(res?.reply || '')
      toast.success('AI reply generate hua!')
    } catch(e){ toast.error(e.message||'AI reply failed — ANTHROPIC_API_KEY check karo') }
    finally { setAiLoading(null) }
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Loading feedback…</div>

  if (feedbacks.length === 0) return (
    <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
      <div style={{ fontSize:32, marginBottom:8 }}>💬</div>
      <div>Is customer ka koi feedback nahi</div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {feedbacks.map(fb => (
        <div key={fb.id} style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          {/* Feedback header */}
          <div style={{ padding:'12px 14px', background:'var(--bg-secondary)',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <Stars rating={fb.rating||0} />
              {fb.category && (
                <Badge color={CAT_COLOR[fb.category]||'#888'} small>{fb.category}</Badge>
              )}
            </div>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>
              {fmtDate(fb.createdAt)}
            </span>
          </div>

          {/* Comment */}
          {fb.comment && (
            <div style={{ padding:'10px 14px', fontSize:13, borderBottom:'1px solid var(--border)' }}>
              "{fb.comment}"
            </div>
          )}

          {/* Existing response */}
          {fb.staffResponse && (
            <div style={{ padding:'10px 14px', background:'#6366f115',
              borderBottom: respId===fb.id ? '1px solid var(--border)' : 'none',
              fontSize:12, color:'var(--text-muted)' }}>
              <span style={{ fontWeight:600, color:'var(--accent)' }}>✅ Staff reply: </span>
              {fb.staffResponse}
            </div>
          )}

          {/* Reply form */}
          {respId === fb.id ? (
            <div style={{ padding:'12px 14px' }}>
              <textarea value={respText} onChange={e=>setRespText(e.target.value)}
                placeholder="Customer ko reply likho…" rows={3}
                style={{ width:'100%', padding:'8px 10px', borderRadius:7, fontSize:12,
                  border:'1px solid var(--border)', background:'var(--bg-secondary)',
                  color:'var(--text)', resize:'vertical', boxSizing:'border-box',
                  marginBottom:8 }} />
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>handleAiReply(fb)}
                  disabled={aiLoading===fb.id}
                  style={{ padding:'7px 12px', borderRadius:7, fontSize:12, fontWeight:600,
                    border:'1px solid var(--border)', background:'#6366f115',
                    color:'#6366f1', cursor: aiLoading===fb.id?'not-allowed':'pointer',
                    opacity: aiLoading===fb.id?0.6:1, display:'flex', alignItems:'center', gap:4 }}>
                  {aiLoading===fb.id ? '⏳ Generating…' : '🤖 AI Suggest'}
                </button>
                <div style={{ flex:1 }}/>
                <button onClick={()=>{ setRespId(null); setRespText('') }}
                  style={{ padding:'7px 12px', borderRadius:7, fontSize:12,
                    border:'1px solid var(--border)', background:'transparent',
                    color:'var(--text-muted)', cursor:'pointer' }}>Cancel</button>
                <button onClick={()=>handleRespond(fb)} disabled={saving||!respText.trim()}
                  style={{ padding:'7px 14px', borderRadius:7, fontSize:12, fontWeight:600,
                    border:'none', background:'var(--accent)', color:'#fff',
                    cursor: saving?'not-allowed':'pointer', opacity: saving?0.7:1 }}>
                  {saving?'Saving…':'Send Reply'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding:'8px 14px' }}>
              <button onClick={()=>{ setRespId(fb.id); setRespText(fb.staffResponse||'') }}
                style={{ fontSize:11, padding:'5px 12px', borderRadius:7, fontWeight:600,
                  border:'1px solid var(--border)', background:'transparent',
                  color: fb.responded ? 'var(--text-muted)' : 'var(--accent)',
                  cursor:'pointer' }}>
                {fb.responded ? '✏️ Edit Reply' : '💬 Reply'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Customer Profile Modal ────────────────────────────────────────────────
function CustomerModal({ customer, onClose, rid, toast }) {
  const [tab, setTab] = useState('overview')

  const TABS = [
    { key:'overview',  label:'Overview',  icon:'👤' },
    { key:'orders',    label:'Orders',    icon:'🧾' },
    { key:'feedback',  label:'Feedback',  icon:'💬' },
  ]

  const tierColor = TIER_COLOR[customer.tier] || '#cd7f32'

  return (
    <div style={{ position:'fixed', inset:0, background:'#0009', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e=>e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', borderRadius:16, width:'100%', maxWidth:520,
        maxHeight:'90vh', display:'flex', flexDirection:'column',
        boxShadow:'0 24px 64px #0006', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'1.5rem 1.5rem 1rem', borderBottom:'1px solid var(--border)',
          background:'var(--bg-secondary)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ width:44, height:44, borderRadius:'50%', fontSize:20,
                background: tierColor+'22', display:'flex', alignItems:'center',
                justifyContent:'center', border:`2px solid ${tierColor}40` }}>
                {(customer.name||'?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700 }}>{customer.name||'—'}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  {customer.phone}
                  {customer.tier && (
                    <span style={{ marginLeft:8, fontSize:10, padding:'2px 7px', borderRadius:20,
                      fontWeight:700, background:tierColor+'22', color:tierColor }}>
                      {customer.tier}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22,
              cursor:'pointer', color:'var(--text-muted)', lineHeight:1 }}>×</button>
          </div>

          {/* Tab bar */}
          <div style={{ display:'flex', gap:4, marginTop:'1rem' }}>
            {TABS.map(t=>(
              <button key={t.key} onClick={()=>setTab(t.key)} style={{
                padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600,
                cursor:'pointer', border:'none',
                background: tab===t.key ? 'var(--accent)' : 'transparent',
                color:       tab===t.key ? '#fff' : 'var(--text-muted)',
              }}>{t.icon} {t.label}</button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding:'1.25rem 1.5rem', overflowY:'auto', flex:1 }}>
          {tab==='overview' && <OverviewTab customer={customer} toast={toast} rid={rid} />}
          {tab==='orders'   && <OrdersTab   customer={customer} />}
          {tab==='feedback' && <FeedbackTab customer={customer} toast={toast} />}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function Customers() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [customers, setCustomers] = useState([])
  const [page,      setPage]      = useState(0)
  const [totalPg,   setTotalPg]   = useState(1)
  const [loading,   setLoading]   = useState(true)
  const [tier,      setTier]      = useState('ALL')
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, size:20 })
      if (tier !== 'ALL') params.set('tier', tier)
      if (search)         params.set('search', search)
      const res  = await customerApi.getAll(rid, params.toString())
      const list = res?.content || (Array.isArray(res) ? res : null)
      setCustomers(list || MOCK)
      setTotalPg(res?.totalPages || 1)
    } catch (_) {
      setCustomers(MOCK); setTotalPg(1)
    } finally { setLoading(false) }
  }, [rid, page, tier, search])

  useEffect(()=>{ load() }, [page, tier])

  function handleSearch(e) {
    if (e.key === 'Enter') { setPage(0); load() }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700 }}>👥 Customers</h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
            Row click karo profile dekhne ke liye — orders, feedback, WhatsApp
          </p>
        </div>
        <button onClick={load} style={{ padding:'7px 14px', borderRadius:8, fontSize:12,
          border:'1px solid var(--border)', background:'transparent',
          color:'var(--text)', cursor:'pointer' }}>Refresh</button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={handleSearch}
          placeholder="🔍 Name ya phone... (Enter dabo)"
          style={{ flex:1, minWidth:200, padding:'8px 12px', borderRadius:8,
            border:'1px solid var(--border)', background:'var(--bg-page)',
            color:'var(--text)', fontSize:13 }} />
        {TIERS.map(t=>(
          <button key={t} onClick={()=>{ setTier(t); setPage(0) }} style={{
            padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600,
            cursor:'pointer', border:'1px solid var(--border)',
            background: tier===t ? 'var(--accent)' : 'transparent',
            color:       tier===t ? '#fff' : 'var(--text-muted)',
          }}>{t}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:12, overflow:'hidden' }}>
        {loading ? <SkeletonTable rows={5} cols={6} /> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Name','Phone','Tier','Visits','Total Spend','Points'].map(h=>(
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left',
                    fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c,i)=>(
                <tr key={c.id||i} onClick={()=>setSelected(c)}
                  style={{ borderBottom:'1px solid var(--border)', cursor:'pointer',
                    transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg-page)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600 }}>
                    {c.name||'—'}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-muted)' }}>
                    {c.phone}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <Badge color={TIER_COLOR[c.tier]||'#888'}>{c.tier||'BRONZE'}</Badge>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13 }}>{c.totalVisits||0}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'#10b981', fontWeight:600 }}>
                    {fmt(c.totalSpend)}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13 }}>
                    <span style={{ color:'#f59e0b', fontWeight:600 }}>⭐ {c.loyaltyPoints||0}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && customers.length===0 && (
          <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>👥</div>
            <div>Koi customer nahi mila</div>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:'1rem' }}>
        <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
          style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--border)',
            background:'transparent', color:'var(--text)',
            cursor:page===0?'not-allowed':'pointer', opacity:page===0?0.4:1 }}>← Prev</button>
        <span style={{ padding:'6px 14px', fontSize:13, color:'var(--text-muted)' }}>
          Page {page+1}/{totalPg}
        </span>
        <button onClick={()=>setPage(p=>Math.min(totalPg-1,p+1))} disabled={page>=totalPg-1}
          style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--border)',
            background:'transparent', color:'var(--text)',
            cursor:page>=totalPg-1?'not-allowed':'pointer', opacity:page>=totalPg-1?0.4:1 }}>Next →</button>
      </div>

      {/* Profile Modal */}
      {selected && (
        <CustomerModal
          customer={selected}
          rid={rid}
          toast={toast}
          onClose={()=>setSelected(null)}
        />
      )}
    </div>
  )
}
