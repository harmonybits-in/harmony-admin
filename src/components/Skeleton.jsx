// src/components/Skeleton.jsx

/** Single skeleton line */
export function SkeletonLine({ width = '100%', height = 16, radius = 6, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'var(--border)',
      animation: 'pulse 1.5s ease-in-out infinite',
      ...style,
    }} />
  )
}

/** Table skeleton — n rows */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div style={{ padding: '0 0 8px' }}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12, padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          {[...Array(cols)].map((_, j) => (
            <SkeletonLine key={j} height={14} width={j === 0 ? '80%' : '60%'} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Card skeleton */
export function SkeletonCard({ height = 120 }) {
  return (
    <div style={{
      height, borderRadius: 12, background: 'var(--border)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

/** Grid of skeleton cards */
export function SkeletonGrid({ count = 4, height = 120 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
      {[...Array(count)].map((_, i) => <SkeletonCard key={i} height={height} />)}
    </div>
  )
}
