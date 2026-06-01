import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NAV_ITEMS = [
  { to: '/superadmin',               icon: '⊞',  label: 'Platform Dashboard', end: true },
  { to: '/superadmin/restaurants',   icon: '🏪', label: 'Restaurants'         },
  { to: '/superadmin/subscriptions', icon: '💳', label: 'Subscriptions'       },
  { to: '/superadmin/addons',        icon: '🔌', label: 'Feature Addons'      },
  { to: '/superadmin/riders',        icon: '🛵', label: 'Riders'              },
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
        padding: '10px 16px',
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
        if (!e.currentTarget.classList.contains('active-link')) {
          e.currentTarget.style.background = '#2a2a3e'
          e.currentTarget.style.color = '#ccc'
        }
      }}
      onMouseLeave={e => {
        const link = e.currentTarget
        const isActive = link.getAttribute('aria-current') === 'page'
        if (!isActive) {
          link.style.background = 'transparent'
          link.style.color = '#888'
        }
      }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {label}
    </NavLink>
  )
}

export default function SuperAdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0F0F1A' }}>

      <aside style={{
        width: 220,
        minWidth: 220,
        background: '#1A1A2E',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        overflowY: 'auto',
        position: 'sticky',
        top: 0,
        borderRight: '1px solid #2a2a3e',
      }}>

        <div style={{ padding: '20px 16px 14px' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            Harmony OS
          </div>
          <div style={{ fontSize: 11, color: '#863bff', marginTop: 3, fontWeight: 500 }}>
            Super Admin Console
          </div>
        </div>

        <div style={{ width: 'calc(100% - 32px)', height: 1, background: '#2a2a3e', margin: '0 16px 8px' }} />

        <nav style={{ flex: 1, paddingTop: 4 }}>
          {NAV_ITEMS.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

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

      <main style={{ flex: 1, overflow: 'auto', height: '100vh', background: '#0F0F1A' }}>
        <div style={{ padding: 24, minHeight: '100%' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
