import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NAV_SECTIONS = [
  {
    title: 'ACCOUNTING',
    items: [
      { to: '/erp',               icon: '📊', label: 'Dashboard',         end: true },
      { to: '/erp/accounts',      icon: '📚', label: 'Chart of Accounts'          },
      { to: '/erp/vouchers/new',  icon: '📝', label: 'Voucher Entry'              },
      { to: '/erp/vouchers',      icon: '📋', label: 'Vouchers'                   },
      { to: '/erp/trial-balance', icon: '📈', label: 'Trial Balance'              },
      { to: '/erp/pnl',           icon: '💰', label: 'P&L Statement'              },
      { to: '/erp/balance-sheet', icon: '🏦', label: 'Balance Sheet'              },
    ],
  },
  {
    title: 'GST',
    items: [
      { to: '/erp/hsn-sac', icon: '🔢', label: 'HSN/SAC Master' },
      { to: '/erp/gstr1',   icon: '📄', label: 'GSTR-1'         },
      { to: '/erp/gstr3b',  icon: '📑', label: 'GSTR-3B'        },
    ],
  },
  {
    title: 'PAYROLL',
    items: [
      { to: '/erp/employees',    icon: '👥', label: 'Employees'    },
      { to: '/erp/payroll-runs', icon: '💸', label: 'Payroll Runs' },
    ],
  },
]

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 14px',
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? '#fff' : '#888',
        background: isActive ? '#863bff' : 'transparent',
        borderRadius: 8,
        margin: '2px 8px',
        transition: 'background .15s, color .15s',
      })}
      onMouseEnter={e => {
        const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
        if (!isActive) {
          e.currentTarget.style.background = '#2a2a3e'
          e.currentTarget.style.color = '#ccc'
        }
      }}
      onMouseLeave={e => {
        const isActive = e.currentTarget.getAttribute('aria-current') === 'page'
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#888'
        }
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </NavLink>
  )
}

export default function ERPLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Build breadcrumb from path
  const pathMap = {
    '/erp': 'Dashboard',
    '/erp/accounts': 'Chart of Accounts',
    '/erp/vouchers': 'Vouchers',
    '/erp/vouchers/new': 'New Voucher',
    '/erp/trial-balance': 'Trial Balance',
    '/erp/pnl': 'P&L Statement',
    '/erp/balance-sheet': 'Balance Sheet',
    '/erp/hsn-sac': 'HSN/SAC Master',
    '/erp/gstr1': 'GSTR-1',
    '/erp/gstr3b': 'GSTR-3B',
    '/erp/employees': 'Employees',
    '/erp/payroll-runs': 'Payroll Runs',
  }
  const currentLabel = pathMap[location.pathname] || 'ERP'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0F0F1A' }}>

      {/* Sidebar */}
      <aside style={{
        width: 228,
        minWidth: 228,
        background: '#1a1a18',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        overflowY: 'auto',
        position: 'sticky',
        top: 0,
        borderRight: '1px solid #2a2a2e',
      }}>

        {/* Logo */}
        <div style={{ padding: '20px 16px 14px' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            Harmony Bits ERP
          </div>
          <div style={{ fontSize: 11, color: '#863bff', marginTop: 3, fontWeight: 500 }}>
            {currentLabel}
          </div>
        </div>

        <div style={{ width: 'calc(100% - 32px)', height: 1, background: '#2a2a3e', margin: '0 16px 8px' }} />

        {/* Nav sections */}
        <nav style={{ flex: 1, paddingTop: 4, paddingBottom: 8 }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.title}>
              <div style={{
                padding: '10px 24px 4px',
                fontSize: 10,
                fontWeight: 700,
                color: '#555',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}>
                {section.title}
              </div>
              {section.items.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          ))}
        </nav>

        {/* Back to admin + user footer */}
        <div style={{ padding: '8px 8px 4px' }}>
          <NavLink
            to="/superadmin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 14px',
              textDecoration: 'none',
              fontSize: 12,
              color: '#666',
              background: 'transparent',
              borderRadius: 8,
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2a2a3e'; e.currentTarget.style.color = '#aaa' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#666' }}
          >
            <span style={{ fontSize: 13 }}>←</span> Super Admin
          </NavLink>
        </div>

        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'Super Admin'}
            </div>
            <div style={{ fontSize: 10, color: '#863bff', marginTop: 2 }}>
              {user?.role || 'SUPER_ADMIN'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              fontSize: 11,
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid #ff4444',
              background: 'transparent',
              color: '#ff4444',
              cursor: 'pointer',
              fontWeight: 600,
              flexShrink: 0,
              transition: 'background .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ff444422' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', height: '100vh', background: '#0F0F1A' }}>
        <div style={{ padding: 24, minHeight: '100%' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
