import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Report definitions ────────────────────────────────────────────────────────

const REPORTS = [
  // Sales
  { id: 1, icon: '📊', name: 'Daily Sales', desc: 'Revenue and order count by day', category: 'Sales', available: true, route: '/reports' },
  { id: 2, icon: '📈', name: 'Sales Summary', desc: 'Period-over-period revenue comparison', category: 'Sales', available: true, route: '/reports' },
  { id: 3, icon: '🕐', name: 'Hourly Heatmap', desc: 'Traffic intensity by hour of day', category: 'Sales', available: true, route: '/reports' },
  { id: 4, icon: '🏆', name: 'Top Selling Items', desc: 'Best-performing menu items by revenue', category: 'Sales', available: true, route: '/reports' },
  { id: 5, icon: '🗂️', name: 'Category-wise Sales', desc: 'Revenue breakdown by menu category', category: 'Sales', available: true, route: '/reports' },
  { id: 6, icon: '💳', name: 'Payment Mode Breakdown', desc: 'UPI, card, cash split analysis', category: 'Sales', available: true, route: '/reports' },
  { id: 7, icon: '👤', name: 'Waiter-wise Sales', desc: 'Revenue attributed per waiter/captain', category: 'Sales', available: true, route: '/reports' },
  { id: 8, icon: '🪑', name: 'Table-wise Revenue', desc: 'Earnings and turn time per table', category: 'Sales', available: true, route: '/reports' },
  { id: 9, icon: '🌙', name: 'Day-Part Analysis', desc: 'Breakfast, lunch, dinner segment revenue', category: 'Sales', available: true, route: '/reports' },
  { id: 10, icon: '📅', name: 'Weekly Revenue Trend', desc: '7-day rolling revenue chart', category: 'Sales', available: true, route: '/reports' },
  { id: 11, icon: '📆', name: 'Monthly Comparison', desc: 'Month-on-month revenue benchmarking', category: 'Sales', available: true, route: '/reports' },
  { id: 12, icon: '🎯', name: 'Shift-wise Sales', desc: 'Revenue broken down by staff shift', category: 'Sales', available: false },
  { id: 13, icon: '🔄', name: 'Revenue Forecast', desc: 'AI-powered sales predictions for next 30 days', category: 'Sales', available: true, route: '/predictive-analytics' },
  { id: 14, icon: '🛒', name: 'Order Type Breakdown', desc: 'Dine-in vs delivery vs takeaway mix', category: 'Sales', available: false },
  { id: 15, icon: '🏪', name: 'Channel Sales', desc: 'Dine-in / Delivery / Online breakdown', category: 'Sales', available: false },

  // Financial
  { id: 16, icon: '💰', name: 'P&L Report', desc: 'Profit & loss with revenue, COGS, expenses', category: 'Financial', available: true, route: '/pnl-report' },
  { id: 17, icon: '💵', name: 'Cash Flow Report', desc: 'Daily inflows and outflows summary', category: 'Financial', available: true, route: '/cash-flow-report' },
  { id: 18, icon: '🍽️', name: 'Food Cost %', desc: 'Ingredient cost as % of revenue', category: 'Financial', available: true, route: '/food-cost-report' },
  { id: 19, icon: '🧾', name: 'GST Summary', desc: 'CGST, SGST, IGST filing report', category: 'Financial', available: true, route: '/gst-reports' },
  { id: 20, icon: '🏷️', name: 'HSN Code Summary', desc: 'Item-wise HSN code tax breakdowns', category: 'Financial', available: false },
  { id: 21, icon: '📤', name: 'Tally Export', desc: 'Export journal entries for Tally ERP', category: 'Financial', available: true, route: '/reports' },
  { id: 22, icon: '📦', name: 'Stock Valuation', desc: 'Current inventory value at cost price', category: 'Financial', available: true, route: '/inventory' },
  { id: 23, icon: '🤝', name: 'Vendor Payments', desc: 'Outstanding and paid vendor invoices', category: 'Financial', available: true, route: '/vendor-comparison' },
  { id: 24, icon: '💸', name: 'Expense Breakdown', desc: 'Categorized expense analysis', category: 'Financial', available: true, route: '/expenses' },
  { id: 25, icon: '💡', name: 'Tips Summary', desc: 'Tips collected by staff and payment mode', category: 'Financial', available: true, route: '/tips' },
  { id: 26, icon: '📋', name: 'Discount Summary', desc: 'Discounts given by type, amount, reason', category: 'Financial', available: true, route: '/reports' },
  { id: 27, icon: '🔄', name: 'Refund Analysis', desc: 'Refund patterns, amounts, and reasons', category: 'Financial', available: true, route: '/refunds' },
  { id: 28, icon: '🏦', name: 'Cash Register Report', desc: 'Opening/closing balances and cash flow', category: 'Financial', available: true, route: '/cash-drawer' },
  { id: 29, icon: '💳', name: 'EDC Terminal Report', desc: 'Card terminal settlement and reconciliation', category: 'Financial', available: true, route: '/edc-terminals' },
  { id: 30, icon: '💰', name: 'Franchise Royalty', desc: 'Royalty fees owed and paid per outlet', category: 'Financial', available: true, route: '/franchise-royalty' },

  // Inventory
  { id: 31, icon: '📦', name: 'Stock Valuation', desc: 'Raw material stock value at current cost', category: 'Inventory', available: true, route: '/inventory' },
  { id: 32, icon: '🥣', name: 'Ingredient Consumption', desc: 'Raw material usage vs expected', category: 'Inventory', available: false },
  { id: 33, icon: '⚠️', name: 'Low Stock Alerts', desc: 'Items at or below reorder threshold', category: 'Inventory', available: true, route: '/inventory' },
  { id: 34, icon: '⏰', name: 'Expiry Alert', desc: 'Items nearing expiry date', category: 'Inventory', available: true, route: '/expiry-tracking' },
  { id: 35, icon: '🔄', name: 'FIFO Batch Status', desc: 'Batch rotation and FIFO compliance', category: 'Inventory', available: true, route: '/expiry-tracking' },
  { id: 36, icon: '📋', name: 'Purchase Order History', desc: 'All POs raised and their status', category: 'Inventory', available: true, route: '/inventory' },
  { id: 37, icon: '♻️', name: 'Waste Tracking', desc: 'Food waste logs and cost impact', category: 'Inventory', available: false },
  { id: 38, icon: '🧪', name: 'Raw Material Usage', desc: 'Consumption by recipe and menu item', category: 'Inventory', available: true, route: '/food-cost-report' },
  { id: 39, icon: '💲', name: 'Vendor Price History', desc: 'Price trends by vendor and material', category: 'Inventory', available: true, route: '/vendor-comparison' },
  { id: 40, icon: '📤', name: 'Stock Transfer Log', desc: 'Inter-outlet stock movement history', category: 'Inventory', available: true, route: '/stock-transfer' },
  { id: 41, icon: '🔍', name: 'Stock Audit History', desc: 'Physical count vs system stock', category: 'Inventory', available: true, route: '/stock-audit' },

  // Customer
  { id: 42, icon: '👥', name: 'New vs Repeat Customers', desc: 'Acquisition and retention breakdown', category: 'Customer', available: true, route: '/customers' },
  { id: 43, icon: '💎', name: 'Customer LTV', desc: 'Lifetime value calculation per customer', category: 'Customer', available: false },
  { id: 44, icon: '📊', name: 'Visit Frequency', desc: 'How often customers return', category: 'Customer', available: true, route: '/customers' },
  { id: 45, icon: '🎯', name: 'RFM Distribution', desc: 'Recency, frequency, monetary segmentation', category: 'Customer', available: true, route: '/customers' },
  { id: 46, icon: '🏅', name: 'Loyalty Points Ledger', desc: 'Points earned and redeemed per customer', category: 'Customer', available: true, route: '/loyalty' },
  { id: 47, icon: '🎂', name: 'Upcoming Birthdays', desc: 'Birthday reminders for marketing', category: 'Customer', available: true, route: '/customers' },
  { id: 48, icon: '📈', name: 'NPS Trend', desc: 'Net Promoter Score over time', category: 'Customer', available: true, route: '/nps' },
  { id: 49, icon: '⭐', name: 'Review Score Summary', desc: 'Aggregated ratings across platforms', category: 'Customer', available: true, route: '/review-management' },
  { id: 50, icon: '💬', name: 'Feedback Score Trend', desc: 'Customer satisfaction over time', category: 'Customer', available: true, route: '/feedback' },
  { id: 51, icon: '🎪', name: 'Segment Analysis', desc: 'Behaviour by customer segment', category: 'Customer', available: true, route: '/customer-segments' },

  // Staff
  { id: 52, icon: '✅', name: 'Attendance Report', desc: 'Daily attendance and punctuality logs', category: 'Staff', available: true, route: '/attendance' },
  { id: 53, icon: '🏆', name: 'Staff Performance', desc: 'KPIs and scores per staff member', category: 'Staff', available: true, route: '/staff-performance' },
  { id: 54, icon: '💰', name: 'Payroll Report', desc: 'Salary, deductions, and net pay summary', category: 'Staff', available: true, route: '/payroll' },
  { id: 55, icon: '💡', name: 'Tips by Waiter', desc: 'Tips earned per staff member', category: 'Staff', available: true, route: '/tips' },
  { id: 56, icon: '⏰', name: 'Overtime Report', desc: 'Hours worked beyond scheduled shifts', category: 'Staff', available: false },
  { id: 57, icon: '🕐', name: 'Shift Hours Summary', desc: 'Total hours per staff per period', category: 'Staff', available: false },
  { id: 58, icon: '📚', name: 'Training Progress', desc: 'Staff training completion status', category: 'Staff', available: true, route: '/staff-training' },
  { id: 59, icon: '📅', name: 'Roster Adherence', desc: 'Planned vs actual schedule adherence', category: 'Staff', available: true, route: '/roster' },
  { id: 60, icon: '🏖️', name: 'Leave Tracker', desc: 'Leave balances and approval history', category: 'Staff', available: true, route: '/leave' },
  { id: 61, icon: '🔄', name: 'Staff Turnover', desc: 'Attrition rate and tenure analysis', category: 'Staff', available: false },

  // Delivery
  { id: 62, icon: '⏱️', name: 'Delivery Time Analysis', desc: 'Average delivery time by zone and rider', category: 'Delivery', available: false },
  { id: 63, icon: '🛵', name: 'Rider Performance', desc: 'Orders delivered, rating, and timing', category: 'Delivery', available: true, route: '/riders' },
  { id: 64, icon: '🗺️', name: 'Zone-wise Revenue', desc: 'Revenue and order density by delivery zone', category: 'Delivery', available: true, route: '/delivery-zones' },
  { id: 65, icon: '🔄', name: 'Aggregator Comparison', desc: 'Swiggy vs Zomato vs direct orders', category: 'Delivery', available: true, route: '/aggregator-reconciliation' },
  { id: 66, icon: '🟢', name: 'Swiggy/Zomato Sales', desc: 'Aggregator-wise revenue and commission', category: 'Delivery', available: true, route: '/aggregator-reconciliation' },
  { id: 67, icon: '📦', name: 'ONDC Sales', desc: 'ONDC network order analytics', category: 'Delivery', available: true, route: '/ondc-config' },
  { id: 68, icon: '🛒', name: 'Abandoned Cart Recovery', desc: 'Lost orders and WhatsApp recovery rate', category: 'Delivery', available: true, route: '/abandoned-carts' },
  { id: 69, icon: '📅', name: 'Pre-order Fulfillment', desc: 'On-time rate for scheduled orders', category: 'Delivery', available: true, route: '/pre-orders' },

  // Marketing
  { id: 70, icon: '🎟️', name: 'Coupon Usage', desc: 'Redemption rate, discount amount by coupon', category: 'Marketing', available: true, route: '/coupons' },
  { id: 71, icon: '📣', name: 'Promo Effectiveness', desc: 'Revenue lift from promotions', category: 'Marketing', available: true, route: '/promotions' },
  { id: 72, icon: '📱', name: 'SMS Delivery Rate', desc: 'Campaign delivery and click-through rates', category: 'Marketing', available: true, route: '/sms-marketing' },
  { id: 73, icon: '💬', name: 'WhatsApp Delivery Rate', desc: 'Broadcast open and reply rates', category: 'Marketing', available: true, route: '/whatsapp' },
  { id: 74, icon: '🔔', name: 'Push Notification Stats', desc: 'Push send, delivery, and open rates', category: 'Marketing', available: true, route: '/push-notifications' },
  { id: 75, icon: '🛒', name: 'Abandoned Cart Recovery Rate', desc: 'Recovery funnel from reminder to order', category: 'Marketing', available: true, route: '/abandoned-carts' },
  { id: 76, icon: '🎯', name: 'RFM Campaign Response', desc: 'Campaign performance by RFM segment', category: 'Marketing', available: false },
  { id: 77, icon: '💰', name: 'Loyalty Program ROI', desc: 'Cost vs revenue from loyalty rewards', category: 'Marketing', available: true, route: '/loyalty' },

  // Operations
  { id: 78, icon: '🪑', name: 'Table Turn Time', desc: 'Average cover time and turnover rate', category: 'Operations', available: false },
  { id: 79, icon: '📋', name: 'Reservation Fulfillment', desc: 'Show rate and utilization of reservations', category: 'Operations', available: true, route: '/reservations' },
  { id: 80, icon: '❌', name: 'No-show Rate', desc: 'Reservation no-show trend and loss', category: 'Operations', available: true, route: '/reservations' },
  { id: 81, icon: '⏱️', name: 'Course Timing', desc: 'Time between courses per table', category: 'Operations', available: true, route: '/courses' },
  { id: 82, icon: '🍳', name: 'Kitchen Queue Analysis', desc: 'KDS order queue and prep time stats', category: 'Operations', available: true, route: '/kitchen-display' },
  { id: 83, icon: '🖨️', name: 'KOT by Printer', desc: 'Orders printed per kitchen printer', category: 'Operations', available: true, route: '/kot-printer-config' },
  { id: 84, icon: '⚙️', name: 'Menu Engineering Matrix', desc: 'Stars, plowhorses, puzzles, dogs chart', category: 'Operations', available: true, route: '/menu-engineering' },
  { id: 85, icon: '🚫', name: 'Item 86 Usage', desc: 'How often items get marked unavailable', category: 'Operations', available: true, route: '/item-86' },
  { id: 86, icon: '🎁', name: 'Combo Performance', desc: 'Bundle and combo conversion rates', category: 'Operations', available: true, route: '/combo-builder' },
  { id: 87, icon: '🖥️', name: 'Kiosk Order Volume', desc: 'Self-ordering kiosk usage analytics', category: 'Operations', available: true, route: '/kiosk' },
]

const CATEGORIES = ['All', 'Sales', 'Financial', 'Inventory', 'Customer', 'Staff', 'Delivery', 'Marketing', 'Operations']

const CATEGORY_COLOR = {
  Sales:      '#3b82f6',
  Financial:  '#22c55e',
  Inventory:  '#f59e0b',
  Customer:   '#a855f7',
  Staff:      '#06b6d4',
  Delivery:   '#f97316',
  Marketing:  '#ec4899',
  Operations: '#6366f1',
}

// ── Report Card ───────────────────────────────────────────────────────────────

function ReportCard({ report, onClick }) {
  const [hov, setHov] = useState(false)
  const catColor = CATEGORY_COLOR[report.category] || '#64748b'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#243447' : '#1e293b',
        border: `1px solid ${hov && report.available ? catColor + '66' : '#334155'}`,
        borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
        transition: 'all .15s', position: 'relative', overflow: 'hidden',
      }}>

      {/* Top accent line */}
      {report.available && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: catColor, borderRadius: '12px 12px 0 0', opacity: hov ? 1 : 0.4, transition: 'opacity .15s' }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 24 }}>{report.icon}</span>
        {report.available
          ? <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
              background: '#22c55e22', color: '#22c55e', whiteSpace: 'nowrap' }}>Available</span>
          : <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
              background: '#33415522', color: '#64748b', whiteSpace: 'nowrap' }}>Coming Soon</span>
        }
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 4, lineHeight: 1.3 }}>
        {report.name}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{report.desc}</div>

      <div style={{ marginTop: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
          background: catColor + '22', color: catColor }}>
          {report.category}
        </span>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
export default function ReportsHub() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  function handleClick(report) {
    if (!report.available) {
      showToast(`"${report.name}" is coming soon!`, 'info')
      return
    }
    navigate(report.route)
  }

  const filtered = REPORTS.filter(r => {
    const matchCat = activeCategory === 'All' || r.category === activeCategory
    const matchSearch = !search.trim() ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.desc.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const availableCount = filtered.filter(r => r.available).length

  // Group by category for display
  const groups = {}
  filtered.forEach(r => {
    if (!groups[r.category]) groups[r.category] = []
    groups[r.category].push(r)
  })

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#0f172a', color: '#fff' }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
          padding: '12px 20px', fontSize: 13, color: '#e2e8f0',
          boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          animation: 'fadeIn .2s ease' }}>
          ℹ️ {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
          Reports Hub — 87 Report Types
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
          Complete business intelligence for your restaurant
        </p>
      </div>

      {/* Count badge row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, marginTop: 16 }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 18px',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: '#3b82f6' }}>87</span>
          <span style={{ fontSize: 13, color: '#64748b' }}>Total Report Types</span>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #22c55e44', borderRadius: 10, padding: '10px 18px',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: '#22c55e' }}>
            {REPORTS.filter(r => r.available).length}
          </span>
          <span style={{ fontSize: 13, color: '#64748b' }}>Available Now</span>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 18px',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: '#64748b' }}>
            {REPORTS.filter(r => !r.available).length}
          </span>
          <span style={{ fontSize: 13, color: '#64748b' }}>Coming Soon</span>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 420 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 16 }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search reports by name or category..."
          style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff',
            padding: '10px 12px 10px 38px', borderRadius: 9, fontSize: 13, width: '100%',
            boxSizing: 'border-box', outline: 'none' }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>×</button>
        )}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {CATEGORIES.map(cat => {
          const active = activeCategory === cat
          const color = CATEGORY_COLOR[cat] || '#3b82f6'
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{ padding: '7px 16px', borderRadius: 20, border: `1px solid ${active ? color : '#334155'}`,
                background: active ? color + '22' : 'transparent',
                color: active ? color : '#94a3b8',
                cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'all .1s' }}>
              {cat}
              {cat !== 'All' && <span style={{ marginLeft: 6, opacity: 0.7 }}>
                ({REPORTS.filter(r => r.category === cat && (activeCategory === 'All' || true)).length})
              </span>}
            </button>
          )
        })}
      </div>

      {/* Results count */}
      {(search || activeCategory !== 'All') && (
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
          Showing {filtered.length} reports ({availableCount} available)
        </div>
      )}

      {/* Report groups */}
      {filtered.length === 0 ? (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
          padding: '60px 24px', textAlign: 'center', color: '#475569' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, color: '#64748b', fontWeight: 600 }}>No reports match your search</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Try a different keyword or category</div>
        </div>
      ) : activeCategory === 'All' && !search ? (
        // Show by category sections
        Object.entries(groups).map(([cat, reps]) => (
          <div key={cat} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, background: CATEGORY_COLOR[cat] || '#64748b' }} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{cat} Reports</h2>
              <span style={{ fontSize: 12, color: '#475569' }}>({reps.length} reports, {reps.filter(r => r.available).length} available)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {reps.map(r => (
                <ReportCard key={r.id} report={r} onClick={() => handleClick(r)} />
              ))}
            </div>
          </div>
        ))
      ) : (
        // Flat grid
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {filtered.map(r => (
            <ReportCard key={r.id} report={r} onClick={() => handleClick(r)} />
          ))}
        </div>
      )}
    </div>
  )
}
