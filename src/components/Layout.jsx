// src/components/Layout.jsx
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'

// ── Full-page routes (no padding wrapper) ────────────────────────
const FULL_PAGE_PATHS = [
  '/inventory/masters/raw',
  '/inventory/masters/units',
  '/inventory/masters/recipes',
  '/inventory/production/execution',
  '/inventory/production/master',
  '/inventory/production/barcode',
  '/inventory/purchase/stock',
  '/inventory/purchase/orders',
  '/inventory/purchase/return',
  '/inventory/masters/invoice',
]

// ── Non-inventory top nav ─────────────────────────────────────────
const NAV_TOP = [
  { to: '/',          icon: '⊞',  label: 'Dashboard'  },
  { to: '/bills',     icon: '🧾', label: 'Bills'       },
  { to: '/menu',      icon: '🍽️', label: 'Menu'        },
  { to: '/staff',     icon: '👤', label: 'Staff'       },
  { to: '/customers', icon: '👥', label: 'Customers'   },
  { to: '/payroll',   icon: '💰', label: 'Payroll'     },
  { to: '/reports',   icon: '📊', label: 'Reports'     },
  { to: '/promotions',   icon: '🎁', label: 'Promotions'         },
  { to: '/tax-config',   icon: '💰', label: 'Tax Config'         },
  { to: '/attendance',   icon: '📋', label: 'Attendance'         },
  { to: '/due-payments',   icon: '💳', label: 'Due Payments'     },
  { to: '/staff-payments', icon: '💸', label: 'Staff Payments'   },
  { to: '/delivery',       icon: '🛵', label: 'Delivery Orders'  },
  { to: '/loyalty',        icon: '⭐', label: 'Loyalty Points'   },
  { to: '/online-orders',  icon: '📱', label: 'Online Orders'    },
  { to: '/tables',         icon: '🪑', label: 'Table Management' },
  { to: '/menu-config',    icon: '🍕', label: 'Menu Config'      },
  { to: '/feedback',       icon: '💬', label: 'Feedback'         },
  { to: '/whatsapp',       icon: '📲', label: 'WhatsApp'         },
  { to: '/csv-import',     icon: '📥', label: 'CSV Import'       },
  { to: '/settings',     icon: '⚙️', label: 'Settings'          },
  { to: '/subscription', icon: '💳', label: 'Subscription'       },
  { to: '/restaurants',  icon: '🏪', label: 'Restaurants'        },
  { to: '/riders',       icon: '🛵', label: 'Rider Tracking'     },
]

// ── PetPooja-style Inventory sidebar tree ────────────────────────
const INVENTORY_TREE = [
  {
    key: 'dashboard',
    label: 'Dashboard', icon: '⊞',
    to: '/inventory',
  },
  {
    key: 'purchase',
    label: 'Purchase', icon: '🛒',
    children: [
      { to: '/inventory/purchase/stock',   label: 'Stock Purchase'   },
      { to: '/inventory/purchase/orders',  label: 'Purchase Order'   },
      { to: '/inventory/purchase/return',  label: 'Purchase Return'  },
    ],
  },
  {
    key: 'managestock',
    label: 'Manage Stock', icon: '📦',
    children: [
      { to: '/inventory/stock',            label: 'Current Stock'    },
      { to: '/inventory/stock/add',        label: 'Add Stock'        },
      { to: '/inventory/stock/low',        label: 'Low Stock Alert'  },
      { to: '/inventory/stock/opening',    label: 'Opening Stock'    },
    ],
  },
  {
    key: 'consumption',
    label: 'Consumption', icon: null, // section header — no icon, no collapse
    isSection: true,
    children: [
      { to: '/inventory/consumption/sales',    label: 'Sales',        icon: '📉' },
      { to: '/inventory/consumption/transfer', label: 'Transfer',     icon: '🔄' },
      { to: '/inventory/consumption/wastage',  label: 'Wastage',      icon: '🗑️' },
      { to: '/inventory/consumption/return',   label: 'Sales Return', icon: '↩️' },
    ],
  },
  {
    key: 'production',
    label: 'Production', icon: null,
    isSection: true,
    children: [
      { to: '/inventory/production/master',    label: 'Production Master',    icon: '🏭' },
      { to: '/inventory/production/execution', label: 'Production Execution', icon: '⚙️' },
      { to: '/inventory/production/barcode',   label: 'Barcode Generation',   icon: '📊' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports', icon: null,
    isSection: true,
    children: [
      { to: '/inventory/reports/stock',        label: 'Current Stock',         icon: '☑️' },
      { to: '/inventory/reports/summary',      label: 'Stock Summary',         icon: '📦' },
      { to: '/inventory/reports/consumption',  label: 'Orderwise Consumption', icon: '📋' },
      { to: '/inventory/reports/other',        label: 'Other Reports',         icon: '🕐' },
    ],
  },
  {
    key: 'masters',
    label: 'Masters', icon: null,
    isSection: true,
    children: [
      { to: '/inventory/masters/raw',       label: 'Raw Materials',     icon: '🌾' },
      { to: '/inventory/masters/recipes',   label: 'Item Recipes',      icon: '📝' },
      { to: '/inventory/masters/suppliers', label: 'Suppliers',         icon: '🏢', hasArrow: true },
      { to: '/inventory/masters/invoice',   label: 'Invoice Templates', icon: '📄' },
      { to: '/inventory/masters/units',     label: 'Units',             icon: '⚖️' },
    ],
  },
]

// ── Sidebar nav link style ────────────────────────────────────────
function sideLink(isActive, depth = 0) {
  return {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: depth === 0 ? '9px 14px' : '8px 14px 8px 20px',
    textDecoration: 'none', fontSize: 13,
    color: isActive ? '#e53e3e' : '#333',
    background: isActive ? '#fff5f5' : 'transparent',
    fontWeight: isActive ? 600 : 400,
    borderLeft: isActive && depth > 0 ? '2px solid #e53e3e' : '2px solid transparent',
    transition: 'all .12s',
    cursor: 'pointer',
  }
}

// ── Inventory Sidebar (only shown when /inventory) ────────────────
function InventorySidebar() {
  const location = useLocation()

  // Track which collapsible sections are open
  const [openKeys, setOpenKeys] = useState(() => {
    const open = new Set(['dashboard'])
    // Auto-open section that has active route
    INVENTORY_TREE.forEach(item => {
      if (item.children?.some(c => location.pathname.startsWith(c.to))) {
        open.add(item.key)
      }
    })
    return open
  })

  const [showAll, setShowAll] = useState(false)

  function toggle(key) {
    setOpenKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Masters children — show first 3, rest on "View More"
  const MASTERS_LIMIT = 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {INVENTORY_TREE.map(item => {
        // ── Direct link (Dashboard) ──
        if (!item.children && item.to) {
          return (
            <NavLink key={item.key} to={item.to} end
              style={({ isActive }) => sideLink(isActive, 0)}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          )
        }

        const isOpen   = openKeys.has(item.key)
        const hasActive = item.children?.some(c => location.pathname.startsWith(c.to))

        // ── Section header (Consumption / Production / Reports / Masters) ──
        if (item.isSection) {
          let children = item.children || []
          const isMasters = item.key === 'masters'
          const displayChildren = isMasters && !showAll
            ? children.slice(0, MASTERS_LIMIT)
            : children

          return (
            <div key={item.key} style={{ marginTop: 6 }}>
              {/* Section label */}
              <div style={{ padding: '8px 14px 4px',
                fontSize: 12, fontWeight: 700, color: '#333',
                letterSpacing: 0, }}>
                {item.label}
              </div>

              {/* Section children — always visible */}
              {displayChildren.map(child => {
                const isActive = location.pathname.startsWith(child.to)
                return (
                  <NavLink key={child.to} to={child.to}
                    style={() => ({
                      ...sideLink(isActive, 1),
                      paddingLeft: 14,
                    })}>
                    {child.icon && (
                      <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
                        {child.icon}
                      </span>
                    )}
                    <span style={{ flex: 1 }}>{child.label}</span>
                    {child.hasArrow && (
                      <span style={{ fontSize: 11, color: '#ccc' }}>›</span>
                    )}
                  </NavLink>
                )
              })}

              {/* View More / View Less for Masters */}
              {isMasters && (
                <button onClick={() => setShowAll(s => !s)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 14px 8px', fontSize: 12, color: '#e53e3e',
                  fontWeight: 600, textAlign: 'left', width: '100%',
                }}>
                  {showAll ? 'View Less' : 'View More'}
                </button>
              )}
            </div>
          )
        }

        // ── Collapsible group (Purchase, Manage Stock) ──
        return (
          <div key={item.key}>
            {/* Group header — clickable to expand */}
            <button onClick={() => toggle(item.key)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', border: 'none', cursor: 'pointer',
              background: hasActive ? '#fff5f5' : 'transparent',
              color: hasActive ? '#e53e3e' : '#333',
              fontSize: 13, fontWeight: hasActive ? 600 : 400,
              textAlign: 'left', transition: 'all .12s',
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: 12, color: '#aaa', transition: 'transform .2s',
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
            </button>

            {/* Children */}
            {isOpen && (
              <div style={{ borderLeft: '2px solid #f0f0f0', marginLeft: 22 }}>
                {item.children.map(child => {
                  const isActive = location.pathname.startsWith(child.to)
                  return (
                    <NavLink key={child.to} to={child.to}
                      style={() => ({
                        display: 'flex', alignItems: 'center',
                        padding: '8px 14px', textDecoration: 'none',
                        fontSize: 13, color: isActive ? '#e53e3e' : '#444',
                        fontWeight: isActive ? 600 : 400,
                        background: isActive ? '#fff5f5' : 'transparent',
                        transition: 'all .12s',
                      })}>
                      {child.label}
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── MainContent — padding zero for full-page routes ───────────────
function MainContent() {
  const location = useLocation()
  const isFullPage = FULL_PAGE_PATHS.some(p => location.pathname.startsWith(p))
  return (
    <div style={{ padding: isFullPage ? '0' : '1.5rem 2rem', minHeight: '100%' }}>
      <Outlet />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate  = useNavigate()
  const location  = useLocation()

  const isInventory = location.pathname.startsWith('/inventory')

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-page)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, minWidth: 220, background: '#fff', borderRight: '1px solid #e8eaed',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        height: '100vh', overflowY: 'auto', position: 'sticky', top: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1rem 0.75rem' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#e53e3e', letterSpacing: '-0.3px' }}>
            HarmoneyEats
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Admin Console</div>
        </div>

        {/* ── Main nav ── */}
        <nav style={{ flex: 1, padding: '0.25rem 0' }}>

          {/* Non-inventory links */}
          {NAV_TOP.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', textDecoration: 'none', fontSize: 13,
                color: isActive ? '#e53e3e' : '#333',
                background: isActive ? '#fff5f5' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                transition: 'all .12s',
              })}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              {label}
            </NavLink>
          ))}

          {/* ── Inventory parent link + expandable sidebar ── */}
          <div>
            {/* Inventory trigger */}
            <NavLink to="/inventory" end
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 14px', textDecoration: 'none', fontSize: 13,
                color: isInventory ? '#e53e3e' : '#333',
                background: isInventory ? '#fff5f5' : 'transparent',
                fontWeight: isInventory ? 600 : 400,
                transition: 'all .12s',
              })}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14 }}>📦</span>
                Inventory
              </span>
              <span style={{ fontSize: 12, color: '#aaa',
                transform: isInventory ? 'rotate(90deg)' : 'none',
                transition: 'transform .2s' }}>›</span>
            </NavLink>

            {/* Expandable inventory tree — only when in /inventory */}
            {isInventory && (
              <div style={{
                borderTop: '1px solid #f5f5f5',
                background: '#fafafa',
                borderBottom: '1px solid #f5f5f5',
              }}>
                <InventorySidebar />
              </div>
            )}
          </div>
        </nav>

        {/* ── User ── */}
        <div style={{
          padding: '0.75rem 1rem', borderTop: '1px solid #e8eaed',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{user?.name || 'Admin'}</div>
            <div style={{ fontSize: 10, color: '#aaa' }}>{user?.role || 'OWNER'}</div>
          </div>
          <button onClick={handleLogout} style={{
            fontSize: 11, padding: '4px 8px', borderRadius: 5,
            border: '1px solid #e8eaed', background: 'transparent',
            color: '#888', cursor: 'pointer',
          }}>Logout</button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'auto', height: '100vh' }}>
        <MainContent />
      </main>
    </div>
  )
}
