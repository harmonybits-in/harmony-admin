import { useNavigate } from 'react-router-dom'

const now = new Date()
const month = now.getMonth() // 0-indexed
const year = now.getFullYear()
const fyStart = month >= 3 ? year : year - 1
const fyEnd = fyStart + 1
const FY_LABEL = `FY ${fyStart}-${String(fyEnd).slice(2)}`
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CURRENT_MONTH = `${MONTH_NAMES[month]} ${year}`

const VERTICALS = [
  { name: 'Restaurant', code: 'RESTAURANT', gst: '5%',  icon: '🍽️', accent: '#10b981' },
  { name: 'Jewellery',  code: 'JEWELLERY',  gst: '3%',  icon: '💎', accent: '#f59e0b' },
  { name: 'Software',   code: 'SOFTWARE',   gst: '18%', icon: '💻', accent: '#863bff' },
]

const QUICK_LINKS = [
  { label: 'Chart of Accounts', to: '/erp/accounts',      icon: '📚' },
  { label: 'New Voucher',       to: '/erp/vouchers/new',  icon: '📝' },
  { label: 'Vouchers',          to: '/erp/vouchers',      icon: '📋' },
  { label: 'Trial Balance',     to: '/erp/trial-balance', icon: '📈' },
  { label: 'P&L Statement',     to: '/erp/pnl',           icon: '💰' },
  { label: 'Balance Sheet',     to: '/erp/balance-sheet', icon: '🏦' },
  { label: 'HSN/SAC Master',    to: '/erp/hsn-sac',       icon: '🔢' },
  { label: 'GSTR-1',            to: '/erp/gstr1',         icon: '📄' },
  { label: 'GSTR-3B',           to: '/erp/gstr3b',        icon: '📑' },
  { label: 'Employees',         to: '/erp/employees',     icon: '👥' },
  { label: 'Payroll Runs',      to: '/erp/payroll-runs',  icon: '💸' },
]

export default function ERPDashboard() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
          ERP System
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
          Harmony Bits Private Limited &mdash; {CURRENT_MONTH} &mdash; {FY_LABEL}
        </p>
      </div>

      {/* Company welcome card */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: 14,
        border: '1px solid #2a2a3e',
        padding: '24px 28px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#863bff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Company
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
            Harmony Bits Private Limited
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
            Multi-vertical ERP &bull; Phase 1 Accounting Module
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#555', fontWeight: 600, marginBottom: 4 }}>FINANCIAL YEAR</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#863bff' }}>{FY_LABEL}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{CURRENT_MONTH}</div>
        </div>
      </div>

      {/* Vertical cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {VERTICALS.map(v => (
          <div
            key={v.code}
            style={{
              flex: 1,
              minWidth: 220,
              background: '#1A1A2E',
              borderRadius: 12,
              border: '1px solid #2a2a3e',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 24,
                width: 44,
                height: 44,
                borderRadius: 10,
                background: v.accent + '22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {v.icon}
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{v.name}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Business Vertical</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>GST Rate</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: v.accent }}>{v.gst}</div>
              </div>
              <button
                onClick={() => navigate(`/erp/pnl?vertical=${v.code}`)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: `1px solid ${v.accent}`,
                  background: v.accent + '18',
                  color: v.accent,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = v.accent + '33' }}
                onMouseLeave={e => { e.currentTarget.style.background = v.accent + '18' }}
              >
                View P&L
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div style={{
        background: '#1A1A2E',
        borderRadius: 12,
        border: '1px solid #2a2a3e',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a3e' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Quick Links</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>Jump to any ERP section</p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 1,
          background: '#2a2a3e',
        }}>
          {QUICK_LINKS.map(link => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 18px',
                background: '#1A1A2E',
                border: 'none',
                color: '#ccc',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background .15s, color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2a2a3e'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1A1A2E'; e.currentTarget.style.color = '#ccc' }}
            >
              <span style={{ fontSize: 16 }}>{link.icon}</span>
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
