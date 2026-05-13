// src/components/MetricCard.jsx
export default function MetricCard({ label, value, sub, subColor, loading }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1.25rem',
    }}>
      {/* Label */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>
        {label}
      </div>

      {/* Value */}
      {loading ? (
        <div style={{
          height: 32, width: '60%', borderRadius: 6,
          background: 'var(--border)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ) : (
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1 }}>
          {value}
        </div>
      )}

      {/* Sub */}
      {loading ? (
        <div style={{
          height: 14, width: '80%', borderRadius: 4, marginTop: 10,
          background: 'var(--border)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ) : sub ? (
        <div style={{
          fontSize: 12, marginTop: 8,
          color: subColor || 'var(--text-muted)',
        }}>
          {sub}
        </div>
      ) : null}
    </div>
  )
}
