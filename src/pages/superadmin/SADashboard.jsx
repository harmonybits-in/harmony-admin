import { useState, useEffect } from 'react'
import { adminApi } from '../../api/client'
import { useAuthStore } from '../../store/authStore'

const PLAN_BADGE = {
  TRIAL:      { bg: '#f59e0b22', color: '#f59e0b', label: 'Trial'      },
  FREE:       { bg: '#16a34a22', color: '#16a34a', label: 'Free'        },
  STARTER:    { bg: '#6366f122', color: '#6366f1', label: 'Starter'    },
  GROWTH:     { bg: '#10b98122', color: '#10b981', label: 'Growth'     },
  PRO:        { bg: '#863bff22', color: '#863bff', label: 'Pro'         },
  ENTERPRISE: { bg: '#ef444422', color: '#ef4444', label: 'Enterprise' },
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      background: '#1A1A2E',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      border: '1px solid #2a2a3e',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
        <span style={{
          fontSize: 18,
          width: 36,
          height: 36,
          borderRadius: 8,
          background: accent + '22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

function PlanBadge({ plan }) {
  const cfg = PLAN_BADGE[plan] || { bg: '#33333322', color: '#888', label: plan || '—' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 9px',
      borderRadius: 20,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 11,
      fontWeight: 700,
    }}>
      {cfg.label}
    </span>
  )
}

function StatusDot({ active }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: active ? '#10b981' : '#ef4444',
        flexShrink: 0,
        display: 'inline-block',
      }} />
      <span style={{ fontSize: 12, color: active ? '#10b981' : '#ef4444', fontWeight: 500 }}>
        {active ? 'Active' : 'Inactive'}
      </span>
    </span>
  )
}

export default function SADashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      adminApi.getDashboard(),
      adminApi.getRestaurants(),
    ])
      .then(([dashboard, rests]) => {
        setStats(dashboard)
        const list = Array.isArray(rests) ? rests : (rests?.content || rests?.restaurants || [])
        const sorted = [...list].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5)
        setRestaurants(sorted)
      })
      .catch(err => setError(err?.message || 'Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <span style={{ color: '#fff', fontSize: 16 }}>Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <span style={{ color: '#ef4444', fontSize: 14 }}>{error}</span>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200 }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>
          Platform Dashboard
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
          Harmony OS — Live metrics
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard
          icon="🏪"
          label="Total Restaurants"
          value={stats?.totalRestaurants ?? '—'}
          accent="#863bff"
        />
        <StatCard
          icon="✅"
          label="Active Subscriptions"
          value={stats?.activeSubscriptions ?? '—'}
          accent="#10b981"
        />
        <StatCard
          icon="⚠️"
          label="Expired Subscriptions"
          value={stats?.expiredSubscriptions ?? '—'}
          accent="#f59e0b"
        />
        <StatCard
          icon="💰"
          label="Platform Revenue"
          value={stats?.totalRevenue != null ? `₹${stats.totalRevenue.toLocaleString('en-IN')}` : '—'}
          accent="#863bff"
        />
      </div>

      <div style={{
        background: '#1A1A2E',
        borderRadius: 12,
        border: '1px solid #2a2a3e',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a3e' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>
            Recent Restaurants
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>
            Last 5 onboarded restaurants
          </p>
        </div>

        {restaurants.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 14 }}>
            No restaurants found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#2a2a3e' }}>
                  {['Name', 'Owner', 'City', 'Plan', 'Status', 'Created At'].map(col => (
                    <th key={col} style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {restaurants.map((r, idx) => (
                  <tr
                    key={r.id || idx}
                    style={{ borderBottom: idx < restaurants.length - 1 ? '1px solid #2a2a3e' : 'none' }}
                  >
                    <td style={{ padding: '13px 16px', fontSize: 13, color: '#fff', fontWeight: 500 }}>
                      {r.name || '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: '#ccc' }}>
                      {r.ownerName || r.owner?.name || '—'}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: '#ccc' }}>
                      {r.city || '—'}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <PlanBadge plan={r.planType || r.subscriptionPlan} />
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <StatusDot active={r.isActive ?? r.active ?? false} />
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
