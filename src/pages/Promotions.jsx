import { useNavigate } from 'react-router-dom'

const CARDS = [
  {
    to:    '/promotion-rules',
    icon:  '⚡',
    title: 'Promotion Rules',
    desc:  'Rule-based automatic discounts. Min order, happy hour, day-of-week conditions set karo.',
    color: '#f59e0b',
    stats: ['Auto Apply', 'Happy Hour', 'Day-based'],
  },
  {
    to:    '/discounts',
    icon:  '🏷️',
    title: 'Discounts',
    desc:  'Percentage, flat, ya BOGO discount rules banao. Platform (POS/Online) ke hisaab se alag rules set karo.',
    color: '#6366f1',
    stats: ['PERCENTAGE', 'FLAT', 'BOGO'],
  },
  {
    to:    '/coupons',
    icon:  '🎟️',
    title: 'Coupons',
    desc:  'Coupon codes banao jaise SAVE20, DIWALI50. Usage limit, expiry date, aur visibility control karo.',
    color: '#10b981',
    stats: ['Usage Limit', 'Expiry Date', 'Public/Private'],
  },
]

export default function Promotions() {
  const navigate = useNavigate()

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>🎁 Promotions</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Discounts aur Coupons se sales badhao
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {CARDS.map(card => (
          <div key={card.to} onClick={() => navigate(card.to)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '1.75rem', cursor: 'pointer',
              transition: 'box-shadow .15s, transform .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px #0001'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{card.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: card.color }}>
              {card.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
              {card.desc}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {card.stats.map(s => (
                <span key={s} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  background: card.color + '15', color: card.color, fontWeight: 600 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '1.5rem' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>
          💡 Discount vs Coupon — Kya fark hai?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: 13 }}>
          <div style={{ padding: '14px 16px', borderRadius: 10,
            background: '#6366f115', border: '1px solid #6366f130' }}>
            <div style={{ fontWeight: 700, color: '#6366f1', marginBottom: 8 }}>🏷️ Discount Rule</div>
            <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--text-muted)', lineHeight: 1.8 }}>
              <li>Automatically apply hota hai (no code needed)</li>
              <li>Platform-based: POS, Online, ya All</li>
              <li>Coupon se link ho sakta hai</li>
              <li>Example: "Lunch Special — 15% off 12-3pm"</li>
            </ul>
          </div>
          <div style={{ padding: '14px 16px', borderRadius: 10,
            background: '#10b98115', border: '1px solid #10b98130' }}>
            <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 8 }}>🎟️ Coupon Code</div>
            <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--text-muted)', lineHeight: 1.8 }}>
              <li>Customer code enter karta hai (e.g. SAVE20)</li>
              <li>Usage limit aur expiry set kar sakte ho</li>
              <li>Public ya Private rakho</li>
              <li>Example: "DIWALI20 — 20% off, max ₹200"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
