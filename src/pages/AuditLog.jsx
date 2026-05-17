// src/pages/AuditLog.jsx
import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/useToast'

// ── Action badge colours ─────────────────────────────────────────
const ACTION_COLORS = {
  STAFF_CREATED:            { bg: '#d1fae5', color: '#065f46' },
  STAFF_UPDATED:            { bg: '#dbeafe', color: '#1e40af' },
  STAFF_DELETED:            { bg: '#fee2e2', color: '#991b1b' },
  SALARY_GENERATED:         { bg: '#ede9fe', color: '#5b21b6' },
  SALARY_PAID:              { bg: '#d1fae5', color: '#065f46' },
  ADVANCE_PAID:             { bg: '#fef3c7', color: '#92400e' },
  LOAN_PAID:                { bg: '#fef3c7', color: '#92400e' },
  SUBSCRIPTION_ACTIVATED:   { bg: '#d1fae5', color: '#065f46' },
  SUBSCRIPTION_DEACTIVATED: { bg: '#fee2e2', color: '#991b1b' },
  PRODUCT_DELETED:          { bg: '#fee2e2', color: '#991b1b' },
  CATEGORY_DELETED:         { bg: '#fee2e2', color: '#991b1b' },
  COUPON_DELETED:           { bg: '#fee2e2', color: '#991b1b' },
  DISCOUNT_DELETED:         { bg: '#fee2e2', color: '#991b1b' },
  SETTINGS_UPDATED:         { bg: '#dbeafe', color: '#1e40af' },
  RESTAURANT_DELETED:       { bg: '#fee2e2', color: '#991b1b' },
}

const ALL_ACTIONS = Object.keys(ACTION_COLORS)

const ENTITY_TYPES = ['STAFF', 'SALARY', 'SUBSCRIPTION', 'PRODUCT', 'CATEGORY',
                      'COUPON', 'DISCOUNT', 'RESTAURANT']

function ActionBadge({ action }) {
  const style = ACTION_COLORS[action] || { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.03em',
      background: style.bg,
      color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

function RoleBadge({ role }) {
  const colors = {
    OWNER:       { bg: '#ede9fe', color: '#5b21b6' },
    MANAGER:     { bg: '#dbeafe', color: '#1e40af' },
    CASHIER:     { bg: '#fef3c7', color: '#92400e' },
    SUPER_ADMIN: { bg: '#fee2e2', color: '#991b1b' },
    SYSTEM:      { bg: '#f3f4f6', color: '#374151' },
  }
  const s = colors[role] || colors.SYSTEM
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 10,
      fontSize: 10, fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {role || 'SYSTEM'}
    </span>
  )
}

function fmt(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function SkeletonRow() {
  return (
    <tr>
      {[120, 160, 80, 60, 60, 200, 100].map((w, i) => (
        <td key={i} style={{ padding: '10px 12px' }}>
          <div style={{
            height: 14, width: w, borderRadius: 6,
            background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        </td>
      ))}
    </tr>
  )
}

export default function AuditLog() {
  const rid   = useAuthStore(s => s.restaurantId)
  const toast = useToast()

  const [logs,       setLogs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [action,     setAction]     = useState('')
  const [entityType, setEntityType] = useState('')
  const [search,     setSearch]     = useState('')

  const load = useCallback(async (p = 0, act = action, ent = entityType) => {
    setLoading(true)
    try {
      let url = `/audit/${rid}?page=${p}`
      if (act)  url += `&action=${act}`
      if (ent)  url += `&entityType=${ent}`
      const data = await api.get(url)
      setLogs(data.content || [])
      setTotalPages(data.totalPages || 1)
      setPage(p)
    } catch (e) {
      toast.error('Audit log load failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [rid, action, entityType])

  useEffect(() => { load(0) }, [rid])

  function handleFilter() { load(0, action, entityType) }
  function handleReset() {
    setAction('')
    setEntityType('')
    setSearch('')
    load(0, '', '')
  }

  const displayed = search
    ? logs.filter(l =>
        (l.action || '').includes(search.toUpperCase()) ||
        (l.details || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.entityType || '').includes(search.toUpperCase()) ||
        String(l.entityId || '').includes(search)
      )
    : logs

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200 }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        .audit-table tbody tr:hover { background: #f9fafb; }
        .audit-table tbody tr { transition: background 0.1s; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
          Audit Log
        </h2>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Sensitive operations ka complete trail — staff changes, payments, subscriptions
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        marginBottom: '1rem', padding: '12px 16px',
        background: 'var(--card-bg, #fff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 10,
      }}>
        <select
          value={action}
          onChange={e => setAction(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Actions</option>
          {ALL_ACTIONS.map(a => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select
          value={entityType}
          onChange={e => setEntityType(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Entities</option>
          {ENTITY_TYPES.map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        <input
          placeholder="Search action / details / ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...selectStyle, minWidth: 220, flex: 1 }}
        />

        <button onClick={handleFilter} style={btnPrimary}>Apply</button>
        <button onClick={handleReset}  style={btnSecondary}>Reset</button>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--card-bg, #fff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="audit-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Timestamp', 'Action', 'Entity', 'ID', 'Role', 'Details', 'IP'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left',
                    fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', fontSize: 12,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                : displayed.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} style={{
                        padding: '3rem', textAlign: 'center',
                        color: 'var(--text-muted)', fontSize: 14,
                      }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                        Is filter ke liye koi log nahi mili
                      </td>
                    </tr>
                  )
                  : displayed.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#6b7280', fontSize: 12 }}>
                        {fmt(log.createdAt)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <ActionBadge action={log.action} />
                      </td>
                      <td style={{ padding: '10px 12px', color: '#374151', fontWeight: 500 }}>
                        {log.entityType || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', fontFamily: 'monospace' }}>
                        {log.entityId ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <RoleBadge role={log.userRole} />
                      </td>
                      <td style={{ padding: '10px 12px', color: '#374151', maxWidth: 320 }}>
                        <span title={log.details} style={{
                          display: 'block', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {log.details || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid #e5e7eb',
            color: '#6b7280', fontSize: 13,
          }}>
            <span>Page {page + 1} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => load(page - 1)}
                disabled={page === 0}
                style={{ ...btnSecondary, opacity: page === 0 ? 0.4 : 1 }}
              >← Prev</button>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages - 1}
                style={{ ...btnSecondary, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shared styles ────────────────────────────────────────────────
const selectStyle = {
  padding: '7px 10px',
  borderRadius: 7,
  border: '1px solid var(--border, #e5e7eb)',
  background: 'var(--input-bg, #fff)',
  color: 'var(--text, #111)',
  fontSize: 13,
  outline: 'none',
  cursor: 'pointer',
}

const btnPrimary = {
  padding: '7px 16px', borderRadius: 7, border: 'none',
  background: '#6366f1', color: '#fff', fontWeight: 600,
  fontSize: 13, cursor: 'pointer',
}

const btnSecondary = {
  padding: '7px 14px', borderRadius: 7,
  border: '1px solid var(--border, #e5e7eb)',
  background: 'var(--card-bg, #fff)', color: 'var(--text, #111)',
  fontWeight: 500, fontSize: 13, cursor: 'pointer',
}
